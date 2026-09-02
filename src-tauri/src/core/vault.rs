use rusqlite::Connection;
use std::fs;
use std::path::{Path, PathBuf};
use uuid::Uuid;

use super::crypto::{
    derive_key_wrapping_key, derive_master_key, generate_salt, generate_vault_key,
    unwrap_vault_key, wrap_vault_key, EncryptedEnvelope, KdfParams, VaultKey,
};
use super::errors::KobeanError;
use super::memory::ProtectedMemory;
use super::models::VaultInfo;
use super::store::open_or_create_database;

const CURRENT_FORMAT_VERSION: u16 = 1;

/// Active, unlocked vault handle holding the SQLCipher connection and memory-pinned VaultKey.
pub struct VaultHandle {
    pub vault_id: String,
    pub vault_name: String,
    pub path: PathBuf,
    pub vault_key: ProtectedMemory<u8>,
    pub connection: Connection,
    pub created_at: i64,
    pub unlocked_at: i64,
}

// ============================================================================
// Vault Lifecycle (SQLCipher Page Encryption + XChaCha20-Poly1305 Payload Encryption)
// ============================================================================

/// Creates a new `.kbp` encrypted vault file and opens it.
pub fn create_vault(
    path: &Path,
    name: &str,
    password: &str,
) -> Result<VaultHandle, KobeanError> {
    if path.exists() {
        return Err(KobeanError::VaultAlreadyExists(path.display().to_string()));
    }

    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }

    let vault_uuid = Uuid::new_v4();
    let vault_id_str = vault_uuid.to_string();
    let salt = generate_salt();
    let kdf_params = KdfParams::default();

    // 1. Derive Keys with Argon2id & HKDF
    let mk = derive_master_key(password.as_bytes(), &salt, &kdf_params)?;
    let kwk = derive_key_wrapping_key(&mk)?;

    // 2. Generate random 256-bit Vault Key and wrap it
    let vk = generate_vault_key();
    let envelope = wrap_vault_key(&kwk, &vk)?;

    // 3. Open SQLCipher database with master password
    let conn = open_or_create_database(path, password)?;

    // 4. Initialize metadata row inside encrypted SQLCipher
    let now = chrono::Utc::now().timestamp();
    conn.execute(
        "INSERT OR REPLACE INTO vault_metadata (id, format_version, vault_id, vault_name, salt, kdf_memory_kib, kdf_iterations, kdf_parallelism, encrypted_vault_key, vault_key_nonce, created_at, updated_at, last_unlocked_at, item_count)
         VALUES ('vault', ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, 0)",
        rusqlite::params![
            CURRENT_FORMAT_VERSION,
            vault_id_str,
            name,
            salt,
            kdf_params.memory_kib,
            kdf_params.iterations,
            kdf_params.parallelism,
            envelope.ciphertext,
            envelope.nonce,
            now,
            now,
            now
        ],
    )?;

    // Store VK in protected memory
    let protected_vk = ProtectedMemory::from_slice(&vk.0);

    Ok(VaultHandle {
        vault_id: vault_id_str,
        vault_name: name.to_string(),
        path: path.to_path_buf(),
        vault_key: protected_vk,
        connection: conn,
        created_at: now,
        unlocked_at: now,
    })
}

/// Opens an existing `.kbp` vault file using the master password.
pub fn open_vault(path: &Path, password: &str) -> Result<VaultHandle, KobeanError> {
    if !path.exists() {
        return Err(KobeanError::VaultNotFound(path.display().to_string()));
    }

    // 1. Open SQLCipher database with password (fails immediately if wrong password)
    let conn = open_or_create_database(path, password)?;

    // 2. Read metadata and wrapped VEK in a scoped block
    let (vault_id, vault_name, salt, kdf_params, envelope, created_at) = {
        let mut stmt = conn.prepare(
            "SELECT vault_id, vault_name, salt, kdf_memory_kib, kdf_iterations, kdf_parallelism, encrypted_vault_key, vault_key_nonce, created_at FROM vault_metadata WHERE id = 'vault'",
        )?;

        let mut rows = stmt.query([])?;
        if let Some(r) = rows.next()? {
            let vault_id: String = r.get(0)?;
            let vault_name: String = r.get(1)?;
            let salt_vec: Vec<u8> = r.get(2)?;
            let memory_kib: u32 = r.get(3)?;
            let iterations: u32 = r.get(4)?;
            let parallelism: u32 = r.get(5)?;
            let ciphertext: Vec<u8> = r.get(6)?;
            let nonce_vec: Vec<u8> = r.get(7)?;
            let created_at: i64 = r.get(8)?;

            let mut salt = [0u8; 32];
            salt.copy_from_slice(&salt_vec);

            let mut nonce = [0u8; 24];
            nonce.copy_from_slice(&nonce_vec);

            let envelope = EncryptedEnvelope { nonce, ciphertext };
            let kdf_params = KdfParams {
                memory_kib,
                iterations,
                parallelism,
            };

            (vault_id, vault_name, salt, kdf_params, envelope, created_at)
        } else {
            return Err(KobeanError::InvalidVaultFormat("Missing metadata in vault".into()));
        }
    };

    // 3. Derive Keys and unwrap VEK
    let mk = derive_master_key(password.as_bytes(), &salt, &kdf_params)?;
    let kwk = derive_key_wrapping_key(&mk)?;
    let vk = unwrap_vault_key(&kwk, &envelope)?;

    let now = chrono::Utc::now().timestamp();
    let _ = conn.execute(
        "UPDATE vault_metadata SET last_unlocked_at = ?1 WHERE id = 'vault'",
        rusqlite::params![now],
    );

    let protected_vk = ProtectedMemory::from_slice(&vk.0);

    Ok(VaultHandle {
        vault_id,
        vault_name,
        path: path.to_path_buf(),
        vault_key: protected_vk,
        connection: conn,
        created_at,
        unlocked_at: now,
    })
}

/// Changes the master password by rekeying SQLCipher and re-wrapping the VaultKey.
pub fn change_master_password(
    handle: &VaultHandle,
    _old_password: &str,
    new_password: &str,
) -> Result<(), KobeanError> {
    // 1. Rekey SQLCipher database
    handle
        .connection
        .pragma_update(None, "rekey", new_password)?;

    // 2. Read existing metadata in a scoped block
    let kdf_params = {
        let mut stmt = handle.connection.prepare(
            "SELECT kdf_memory_kib, kdf_iterations, kdf_parallelism FROM vault_metadata WHERE id = 'vault'",
        )?;
        let mut rows = stmt.query([])?;
        if let Some(r) = rows.next()? {
            KdfParams {
                memory_kib: r.get(0)?,
                iterations: r.get(1)?,
                parallelism: r.get(2)?,
            }
        } else {
            KdfParams::default()
        }
    };

    // 3. Derive new KWK and re-wrap VEK
    let new_salt = generate_salt();
    let new_mk = derive_master_key(new_password.as_bytes(), &new_salt, &kdf_params)?;
    let new_kwk = derive_key_wrapping_key(&new_mk)?;

    let mut raw_vk = [0u8; 32];
    raw_vk.copy_from_slice(&handle.vault_key);
    let vk = VaultKey(raw_vk);
    let new_envelope = wrap_vault_key(&new_kwk, &vk)?;

    let now = chrono::Utc::now().timestamp();
    handle.connection.execute(
        "UPDATE vault_metadata SET salt = ?1, encrypted_vault_key = ?2, vault_key_nonce = ?3, updated_at = ?4 WHERE id = 'vault'",
        rusqlite::params![new_salt, new_envelope.ciphertext, new_envelope.nonce, now],
    )?;

    Ok(())
}

pub fn get_vault_info(handle: &VaultHandle) -> Result<VaultInfo, KobeanError> {
    let mut stmt = handle.connection.prepare(
        "SELECT vault_id, vault_name, created_at, last_unlocked_at, item_count FROM vault_metadata WHERE id = 'vault'",
    )?;
    let mut rows = stmt.query([])?;
    if let Some(r) = rows.next()? {
        Ok(VaultInfo {
            vault_id: r.get(0)?,
            vault_name: r.get(1)?,
            path: handle.path.display().to_string(),
            created_at: r.get(2)?,
            last_unlocked_at: r.get(3)?,
            item_count: r.get(4)?,
        })
    } else {
        Err(KobeanError::InvalidVaultFormat("Missing metadata row".into()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_vault_create_open_change_password() {
        let temp_dir = std::env::temp_dir().join(format!("kobean_test_{}", Uuid::new_v4()));
        let vault_path = temp_dir.join("test_vault.kbp");

        let password = "CorrectHorseBatteryStaple!";
        let new_password = "EvenBetterPassphrase99#";

        // 1. Create
        let handle = create_vault(&vault_path, "Personal Vault", password).unwrap();
        assert_eq!(handle.vault_name, "Personal Vault");
        drop(handle);

        // 2. Open with correct password
        let opened_handle = open_vault(&vault_path, password).unwrap();
        assert_eq!(opened_handle.vault_name, "Personal Vault");

        // 3. Change password
        change_master_password(&opened_handle, password, new_password).unwrap();
        drop(opened_handle);

        // 4. Old password must fail
        assert!(open_vault(&vault_path, password).is_err());

        // 5. New password must succeed
        let new_opened_handle = open_vault(&vault_path, new_password).unwrap();
        assert_eq!(new_opened_handle.vault_name, "Personal Vault");

        // Cleanup
        let _ = fs::remove_dir_all(&temp_dir);
    }
}
