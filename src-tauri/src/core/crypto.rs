use argon2::{Algorithm, Argon2, Params, Version};
use chacha20poly1305::{
    aead::{Aead, KeyInit, Payload},
    Key, XChaCha20Poly1305, XNonce,
};
use hkdf::Hkdf;
use hmac::Mac;
use rand::rngs::OsRng;
use rand::RngCore;
use sha2::Sha256;
use zeroize::{Zeroize, ZeroizeOnDrop};

use super::errors::KobeanError;

// ============================================================================
// Cryptographic Types (Zeroize + ZeroizeOnDrop)
// ============================================================================

#[derive(Zeroize, ZeroizeOnDrop)]
pub struct MasterKey(pub [u8; 32]);

#[derive(Zeroize, ZeroizeOnDrop)]
pub struct KeyWrappingKey(pub [u8; 32]);

#[derive(Zeroize, ZeroizeOnDrop)]
pub struct VaultKey(pub [u8; 32]);

#[derive(Zeroize, ZeroizeOnDrop)]
pub struct AuthKey(pub [u8; 32]);

#[derive(Debug, Clone)]
pub struct KdfParams {
    pub memory_kib: u32,
    pub iterations: u32,
    pub parallelism: u32,
}

impl Default for KdfParams {
    fn default() -> Self {
        Self {
            memory_kib: 65536, // 64 MiB
            iterations: 3,
            parallelism: 4,
        }
    }
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct EncryptedEnvelope {
    pub nonce: [u8; 24],
    pub ciphertext: Vec<u8>,
}

// ============================================================================
// Key Derivation & Expansion (Argon2id + HKDF-SHA256)
// ============================================================================

pub fn derive_master_key(
    password: &[u8],
    salt: &[u8; 32],
    params: &KdfParams,
) -> Result<MasterKey, KobeanError> {
    let argon2_params = Params::new(
        params.memory_kib,
        params.iterations,
        params.parallelism,
        Some(32),
    )
    .map_err(|e| KobeanError::KeyDerivation(e.to_string()))?;

    let argon2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, argon2_params);
    let mut key_bytes = [0u8; 32];
    argon2
        .hash_password_into(password, salt, &mut key_bytes)
        .map_err(|e| KobeanError::KeyDerivation(e.to_string()))?;

    Ok(MasterKey(key_bytes))
}

pub fn derive_key_wrapping_key(master_key: &MasterKey) -> Result<KeyWrappingKey, KobeanError> {
    let hk = Hkdf::<Sha256>::new(None, &master_key.0);
    let mut kwk_bytes = [0u8; 32];
    hk.expand(b"kobean-kwrap", &mut kwk_bytes)
        .map_err(|e| KobeanError::KeyWrap(e.to_string()))?;
    Ok(KeyWrappingKey(kwk_bytes))
}

pub fn derive_auth_key(master_key: &MasterKey) -> Result<AuthKey, KobeanError> {
    let hk = Hkdf::<Sha256>::new(None, &master_key.0);
    let mut auth_bytes = [0u8; 32];
    hk.expand(b"kobean-auth", &mut auth_bytes)
        .map_err(|e| KobeanError::KeyWrap(e.to_string()))?;
    Ok(AuthKey(auth_bytes))
}

pub fn generate_vault_key() -> VaultKey {
    let mut key = [0u8; 32];
    OsRng.fill_bytes(&mut key);
    VaultKey(key)
}

pub fn generate_salt() -> [u8; 32] {
    let mut salt = [0u8; 32];
    OsRng.fill_bytes(&mut salt);
    salt
}

// ============================================================================
// Key Wrapping (XChaCha20-Poly1305)
// ============================================================================

pub fn wrap_vault_key(
    kwk: &KeyWrappingKey,
    vk: &VaultKey,
) -> Result<EncryptedEnvelope, KobeanError> {
    let cipher = XChaCha20Poly1305::new(Key::from_slice(&kwk.0));
    let mut nonce = [0u8; 24];
    OsRng.fill_bytes(&mut nonce);

    let ciphertext = cipher
        .encrypt(
            XNonce::from_slice(&nonce),
            Payload {
                msg: &vk.0,
                aad: b"kobean-vault-key-envelope",
            },
        )
        .map_err(|_| KobeanError::KeyWrap("Failed to wrap vault key".into()))?;

    Ok(EncryptedEnvelope { nonce, ciphertext })
}

pub fn unwrap_vault_key(
    kwk: &KeyWrappingKey,
    envelope: &EncryptedEnvelope,
) -> Result<VaultKey, KobeanError> {
    let cipher = XChaCha20Poly1305::new(Key::from_slice(&kwk.0));
    let plaintext = cipher
        .decrypt(
            XNonce::from_slice(&envelope.nonce),
            Payload {
                msg: &envelope.ciphertext,
                aad: b"kobean-vault-key-envelope",
            },
        )
        .map_err(|_| KobeanError::Decryption)?;

    if plaintext.len() != 32 {
        return Err(KobeanError::Decryption);
    }

    let mut key = [0u8; 32];
    key.copy_from_slice(&plaintext);
    Ok(VaultKey(key))
}

// ============================================================================
// Record Encryption (XChaCha20-Poly1305 with AAD)
// ============================================================================

pub fn encrypt_record(
    vk: &VaultKey,
    plaintext: &[u8],
    aad: &[u8],
) -> Result<Vec<u8>, KobeanError> {
    let cipher = XChaCha20Poly1305::new(Key::from_slice(&vk.0));
    let mut nonce = [0u8; 24];
    OsRng.fill_bytes(&mut nonce);

    let ciphertext = cipher
        .encrypt(
            XNonce::from_slice(&nonce),
            Payload {
                msg: plaintext,
                aad,
            },
        )
        .map_err(|e| KobeanError::Encryption(format!("{:?}", e)))?;

    let mut result = Vec::with_capacity(24 + ciphertext.len());
    result.extend_from_slice(&nonce);
    result.extend_from_slice(&ciphertext);
    Ok(result)
}

pub fn decrypt_record(
    vk: &VaultKey,
    encrypted: &[u8],
    aad: &[u8],
) -> Result<Vec<u8>, KobeanError> {
    if encrypted.len() < 24 + 16 {
        return Err(KobeanError::Decryption);
    }

    let (nonce, ciphertext) = encrypted.split_at(24);
    let cipher = XChaCha20Poly1305::new(Key::from_slice(&vk.0));

    cipher
        .decrypt(
            XNonce::from_slice(nonce),
            Payload {
                msg: ciphertext,
                aad,
            },
        )
        .map_err(|_| KobeanError::Decryption)
}

// ============================================================================
// Header HMAC (HMAC-SHA256)
// ============================================================================

type HmacSha256 = hmac::Hmac<Sha256>;

pub fn compute_header_hmac(auth_key: &AuthKey, header_bytes: &[u8]) -> [u8; 32] {
    let mut mac = <HmacSha256 as hmac::Mac>::new_from_slice(&auth_key.0).expect("HMAC can take key of any size");
    mac.update(header_bytes);
    mac.finalize().into_bytes().into()
}

pub fn verify_header_hmac(
    auth_key: &AuthKey,
    header_bytes: &[u8],
    expected: &[u8; 32],
) -> bool {
    let mut mac = <HmacSha256 as hmac::Mac>::new_from_slice(&auth_key.0).expect("HMAC can take key of any size");
    mac.update(header_bytes);
    mac.verify_slice(expected).is_ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_kdf_and_expansion() {
        let password = b"SuperSecretPassphrase123!";
        let salt = generate_salt();
        let params = KdfParams {
            memory_kib: 1024,
            iterations: 1,
            parallelism: 1,
        };

        let mk = derive_master_key(password, &salt, &params).unwrap();
        let kwk = derive_key_wrapping_key(&mk).unwrap();
        let auth_key = derive_auth_key(&mk).unwrap();

        assert_ne!(kwk.0, auth_key.0);
        assert_ne!(mk.0, kwk.0);
    }

    #[test]
    fn test_vault_key_wrapping_roundtrip() {
        let vk = generate_vault_key();
        let kwk = KeyWrappingKey([7u8; 32]);

        let envelope = wrap_vault_key(&kwk, &vk).unwrap();
        let unwrapped = unwrap_vault_key(&kwk, &envelope).unwrap();

        assert_eq!(vk.0, unwrapped.0);

        let wrong_kwk = KeyWrappingKey([8u8; 32]);
        assert!(unwrap_vault_key(&wrong_kwk, &envelope).is_err());
    }

    #[test]
    fn test_record_encryption_roundtrip() {
        let vk = generate_vault_key();
        let plaintext = b"Sensitive Password Data";
        let aad = b"vault-1:item-42:1";

        let encrypted = encrypt_record(&vk, plaintext, aad).unwrap();
        let decrypted = decrypt_record(&vk, &encrypted, aad).unwrap();
        assert_eq!(plaintext, decrypted.as_slice());

        let mut tampered = encrypted.clone();
        tampered[25] ^= 0xFF;
        assert!(decrypt_record(&vk, &tampered, aad).is_err());

        let wrong_aad = b"vault-1:item-99:1";
        assert!(decrypt_record(&vk, &encrypted, wrong_aad).is_err());
    }
}
