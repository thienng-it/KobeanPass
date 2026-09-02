use rusqlite::{params, Connection};
use std::path::Path;
use uuid::Uuid;

use super::crypto::{decrypt_record, encrypt_record, VaultKey};
use super::errors::KobeanError;
use super::models::{DecryptedItem, FolderInfo, ItemSummary, VaultRecordPayload};

/// SQLCipher connection initializer with production PRAGMAs.
pub fn open_or_create_database(
    db_path: &Path,
    db_key: &str,
) -> Result<Connection, KobeanError> {
    let conn = Connection::open(db_path)?;

    // Set SQLCipher encryption key
    conn.pragma_update(None, "key", db_key)?;

    // SQLCipher 4 configuration
    conn.pragma_update(None, "cipher_page_size", 4096)?;
    conn.pragma_update(None, "kdf_iter", 256000)?;
    conn.pragma_update(None, "cipher_hmac_algorithm", "HMAC_SHA512")?;
    conn.pragma_update(None, "cipher_kdf_algorithm", "PBKDF2_HMAC_SHA512")?;

    // Performance & safety settings
    conn.pragma_update(None, "journal_mode", "WAL")?;
    conn.pragma_update(None, "synchronous", "NORMAL")?;
    conn.pragma_update(None, "temp_store", "MEMORY")?;
    conn.pragma_update(None, "foreign_keys", "ON")?;

    // Validate key by running a test query
    conn.execute_batch("SELECT count(*) FROM sqlite_master;")
        .map_err(|_| KobeanError::Decryption)?;

    // Initialize tables if they don't exist
    init_schema(&conn)?;

    Ok(conn)
}

fn init_schema(conn: &Connection) -> Result<(), KobeanError> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS vault_metadata (
            id TEXT PRIMARY KEY DEFAULT 'vault',
            format_version INTEGER NOT NULL DEFAULT 1,
            vault_id TEXT NOT NULL,
            vault_name TEXT NOT NULL,
            salt BLOB NOT NULL,
            kdf_memory_kib INTEGER NOT NULL,
            kdf_iterations INTEGER NOT NULL,
            kdf_parallelism INTEGER NOT NULL,
            encrypted_vault_key BLOB NOT NULL,
            vault_key_nonce BLOB NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            last_unlocked_at INTEGER,
            item_count INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS items (
            id TEXT PRIMARY KEY,
            vault_id TEXT NOT NULL,
            item_type TEXT NOT NULL,
            title TEXT NOT NULL,
            subtitle TEXT,
            icon_hint TEXT,
            is_favorite INTEGER NOT NULL DEFAULT 0,
            is_trashed INTEGER NOT NULL DEFAULT 0,
            trashed_at INTEGER,
            encrypted_data BLOB NOT NULL,
            schema_version INTEGER NOT NULL DEFAULT 1,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS tags (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL UNIQUE COLLATE NOCASE,
            created_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS item_tags (
            item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
            tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
            PRIMARY KEY (item_id, tag_id)
        );

        CREATE INDEX IF NOT EXISTS idx_items_type ON items(item_type);
        CREATE INDEX IF NOT EXISTS idx_items_title ON items(title COLLATE NOCASE);
        CREATE INDEX IF NOT EXISTS idx_items_favorite ON items(is_favorite);
        CREATE INDEX IF NOT EXISTS idx_items_trashed ON items(is_trashed);
        CREATE INDEX IF NOT EXISTS idx_items_updated ON items(updated_at DESC);
        ",
    )?;
    Ok(())
}

fn build_aad(vault_id: &str, record_id: &str, schema_version: u32) -> Vec<u8> {
    format!("{}:{}:{}", vault_id, record_id, schema_version).into_bytes()
}

// ============================================================================
// CRUD Operations
// ============================================================================

pub fn insert_item(
    conn: &Connection,
    vault_key: &VaultKey,
    vault_id: &str,
    title: &str,
    item_type: &str,
    payload: &VaultRecordPayload,
    tags: &[String],
) -> Result<ItemSummary, KobeanError> {
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().timestamp();
    let schema_version = 1u32;

    let serialized = serde_json::to_vec(payload)?;
    let aad = build_aad(vault_id, &id, schema_version);
    let encrypted_data = encrypt_record(vault_key, &serialized, &aad)?;

    let subtitle = match payload {
        VaultRecordPayload::Login(l) => Some(l.username.clone()),
        VaultRecordPayload::CreditCard(c) => {
            if c.number.len() >= 4 {
                Some(format!("•••• {}", &c.number[c.number.len() - 4..]))
            } else {
                None
            }
        }
        VaultRecordPayload::Identity(i) => Some(i.email.clone()),
        VaultRecordPayload::ApiToken(a) => Some(a.service.clone()),
        _ => None,
    };

    conn.execute(
        "INSERT INTO items (id, vault_id, item_type, title, subtitle, icon_hint, is_favorite, is_trashed, encrypted_data, schema_version, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, 0, ?7, ?8, ?9, ?10)",
        params![
            id,
            vault_id,
            item_type,
            title,
            subtitle,
            None::<String>,
            encrypted_data,
            schema_version,
            now,
            now
        ],
    )?;

    for tag_name in tags {
        let tag_id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT OR IGNORE INTO tags (id, name, created_at) VALUES (?1, ?2, ?3)",
            params![tag_id, tag_name, now],
        )?;

        conn.execute(
            "INSERT OR IGNORE INTO item_tags (item_id, tag_id)
             SELECT ?1, id FROM tags WHERE name = ?2 COLLATE NOCASE",
            params![id, tag_name],
        )?;
    }

    conn.execute(
        "UPDATE vault_metadata SET item_count = item_count + 1 WHERE id = 'vault'",
        [],
    )?;

    Ok(ItemSummary {
        id,
        item_type: item_type.to_string(),
        title: title.to_string(),
        subtitle,
        icon_hint: None,
        is_favorite: false,
        is_trashed: false,
        tags: tags.to_vec(),
        created_at: now,
        updated_at: now,
    })
}

pub fn get_item(
    conn: &Connection,
    vault_key: &VaultKey,
    vault_id: &str,
    id: &str,
) -> Result<DecryptedItem, KobeanError> {
    let mut stmt = conn.prepare(
        "SELECT id, item_type, title, subtitle, icon_hint, is_favorite, is_trashed, encrypted_data, schema_version, created_at, updated_at
         FROM items WHERE id = ?1",
    )?;

    let mut rows = stmt.query(params![id])?;
    if let Some(row) = rows.next()? {
        let item_id: String = row.get(0)?;
        let item_type: String = row.get(1)?;
        let title: String = row.get(2)?;
        let subtitle: Option<String> = row.get(3)?;
        let icon_hint: Option<String> = row.get(4)?;
        let is_favorite: bool = row.get::<_, i32>(5)? == 1;
        let is_trashed: bool = row.get::<_, i32>(6)? == 1;
        let encrypted_data: Vec<u8> = row.get(7)?;
        let schema_version: u32 = row.get(8)?;
        let created_at: i64 = row.get(9)?;
        let updated_at: i64 = row.get(10)?;

        let aad = build_aad(vault_id, &item_id, schema_version);
        let decrypted = decrypt_record(vault_key, &encrypted_data, &aad)?;
        let payload: VaultRecordPayload = serde_json::from_slice(&decrypted)?;

        let mut tag_stmt = conn.prepare(
            "SELECT t.name FROM tags t
             JOIN item_tags it ON t.id = it.tag_id
             WHERE it.item_id = ?1",
        )?;
        let tag_rows = tag_stmt.query_map(params![id], |r| r.get::<_, String>(0))?;
        let mut tags = Vec::new();
        for t in tag_rows {
            tags.push(t?);
        }

        Ok(DecryptedItem {
            id: item_id,
            item_type,
            title,
            subtitle,
            icon_hint,
            is_favorite,
            is_trashed,
            tags,
            payload,
            created_at,
            updated_at,
        })
    } else {
        Err(KobeanError::ItemNotFound(id.to_string()))
    }
}

pub fn update_item(
    conn: &Connection,
    vault_key: &VaultKey,
    vault_id: &str,
    id: &str,
    title: &str,
    payload: &VaultRecordPayload,
    tags: &[String],
) -> Result<ItemSummary, KobeanError> {
    let now = chrono::Utc::now().timestamp();
    let schema_version = 1u32;

    let serialized = serde_json::to_vec(payload)?;
    let aad = build_aad(vault_id, id, schema_version);
    let encrypted_data = encrypt_record(vault_key, &serialized, &aad)?;

    let subtitle = match payload {
        VaultRecordPayload::Login(l) => Some(l.username.clone()),
        VaultRecordPayload::CreditCard(c) => {
            if c.number.len() >= 4 {
                Some(format!("•••• {}", &c.number[c.number.len() - 4..]))
            } else {
                None
            }
        }
        VaultRecordPayload::Identity(i) => Some(i.email.clone()),
        VaultRecordPayload::ApiToken(a) => Some(a.service.clone()),
        _ => None,
    };

    let rows_affected = conn.execute(
        "UPDATE items SET title = ?1, subtitle = ?2, encrypted_data = ?3, updated_at = ?4 WHERE id = ?5",
        params![title, subtitle, encrypted_data, now, id],
    )?;

    if rows_affected == 0 {
        return Err(KobeanError::ItemNotFound(id.to_string()));
    }

    conn.execute("DELETE FROM item_tags WHERE item_id = ?1", params![id])?;
    for tag_name in tags {
        let tag_id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT OR IGNORE INTO tags (id, name, created_at) VALUES (?1, ?2, ?3)",
            params![tag_id, tag_name, now],
        )?;
        conn.execute(
            "INSERT OR IGNORE INTO item_tags (item_id, tag_id)
             SELECT ?1, id FROM tags WHERE name = ?2 COLLATE NOCASE",
            params![id, tag_name],
        )?;
    }

    let mut stmt = conn.prepare("SELECT item_type, is_favorite, is_trashed, created_at FROM items WHERE id = ?1")?;
    let mut rows = stmt.query(params![id])?;
    if let Some(r) = rows.next()? {
        Ok(ItemSummary {
            id: id.to_string(),
            item_type: r.get(0)?,
            title: title.to_string(),
            subtitle,
            icon_hint: None,
            is_favorite: r.get::<_, i32>(1)? == 1,
            is_trashed: r.get::<_, i32>(2)? == 1,
            tags: tags.to_vec(),
            created_at: r.get(3)?,
            updated_at: now,
        })
    } else {
        Err(KobeanError::ItemNotFound(id.to_string()))
    }
}

pub fn list_items(
    conn: &Connection,
    filter_type: Option<&str>,
    tag: Option<&str>,
) -> Result<Vec<ItemSummary>, KobeanError> {
    let sql = match (filter_type, tag) {
        (Some("favorites"), _) => {
            "SELECT i.id, i.item_type, i.title, i.subtitle, i.icon_hint, i.is_favorite, i.is_trashed, i.created_at, i.updated_at,
                    (SELECT GROUP_CONCAT(tg.name, ',') FROM item_tags it JOIN tags tg ON it.tag_id = tg.id WHERE it.item_id = i.id)
             FROM items i WHERE i.is_favorite = 1 AND i.is_trashed = 0 ORDER BY i.title COLLATE NOCASE ASC".to_string()
        }
        (Some("trash"), _) => {
            "SELECT i.id, i.item_type, i.title, i.subtitle, i.icon_hint, i.is_favorite, i.is_trashed, i.created_at, i.updated_at,
                    (SELECT GROUP_CONCAT(tg.name, ',') FROM item_tags it JOIN tags tg ON it.tag_id = tg.id WHERE it.item_id = i.id)
             FROM items i WHERE i.is_trashed = 1 ORDER BY i.updated_at DESC".to_string()
        }
        (Some(t), _) => {
            format!(
                "SELECT i.id, i.item_type, i.title, i.subtitle, i.icon_hint, i.is_favorite, i.is_trashed, i.created_at, i.updated_at,
                        (SELECT GROUP_CONCAT(tg.name, ',') FROM item_tags it JOIN tags tg ON it.tag_id = tg.id WHERE it.item_id = i.id)
                 FROM items i WHERE i.item_type = '{}' AND i.is_trashed = 0 ORDER BY i.title COLLATE NOCASE ASC",
                t
            )
        }
        (None, Some(t)) => {
            format!(
                "SELECT i.id, i.item_type, i.title, i.subtitle, i.icon_hint, i.is_favorite, i.is_trashed, i.created_at, i.updated_at,
                        (SELECT GROUP_CONCAT(tg.name, ',') FROM item_tags it JOIN tags tg ON it.tag_id = tg.id WHERE it.item_id = i.id)
                 FROM items i
                 JOIN item_tags it ON i.id = it.item_id
                 JOIN tags tg ON it.tag_id = tg.id
                 WHERE (tg.name = '{0}' COLLATE NOCASE OR tg.name LIKE '{0}/%' COLLATE NOCASE) AND i.is_trashed = 0
                 GROUP BY i.id
                 ORDER BY i.title COLLATE NOCASE ASC",
                t
            )
        }
        _ => {
            "SELECT i.id, i.item_type, i.title, i.subtitle, i.icon_hint, i.is_favorite, i.is_trashed, i.created_at, i.updated_at,
                    (SELECT GROUP_CONCAT(tg.name, ',') FROM item_tags it JOIN tags tg ON it.tag_id = tg.id WHERE it.item_id = i.id)
             FROM items i WHERE i.is_trashed = 0 ORDER BY i.title COLLATE NOCASE ASC".to_string()
        }
    };

    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map([], |row| {
        let tags_str: Option<String> = row.get(9)?;
        let tags = tags_str
            .map(|s| {
                s.split(',')
                    .filter(|t| !t.trim().is_empty())
                    .map(|t| t.trim().to_string())
                    .collect()
            })
            .unwrap_or_default();

        Ok(ItemSummary {
            id: row.get(0)?,
            item_type: row.get(1)?,
            title: row.get(2)?,
            subtitle: row.get(3)?,
            icon_hint: row.get(4)?,
            is_favorite: row.get::<_, i32>(5)? == 1,
            is_trashed: row.get::<_, i32>(6)? == 1,
            tags,
            created_at: row.get(7)?,
            updated_at: row.get(8)?,
        })
    })?;

    let mut items = Vec::new();
    for item in rows {
        items.push(item?);
    }

    Ok(items)
}

pub fn search_items(conn: &Connection, query: &str) -> Result<Vec<ItemSummary>, KobeanError> {
    let q = format!("%{}%", query);
    let mut stmt = conn.prepare(
        "SELECT id, item_type, title, subtitle, icon_hint, is_favorite, is_trashed, created_at, updated_at,
                (SELECT GROUP_CONCAT(tg.name, ',') FROM item_tags it JOIN tags tg ON it.tag_id = tg.id WHERE it.item_id = items.id)
         FROM items
         WHERE (title LIKE ?1 OR subtitle LIKE ?1) AND is_trashed = 0
         ORDER BY title COLLATE NOCASE ASC",
    )?;

    let rows = stmt.query_map(params![q], |row| {
        let tags_str: Option<String> = row.get(9)?;
        let tags = tags_str
            .map(|s| {
                s.split(',')
                    .filter(|t| !t.trim().is_empty())
                    .map(|t| t.trim().to_string())
                    .collect()
            })
            .unwrap_or_default();

        Ok(ItemSummary {
            id: row.get(0)?,
            item_type: row.get(1)?,
            title: row.get(2)?,
            subtitle: row.get(3)?,
            icon_hint: row.get(4)?,
            is_favorite: row.get::<_, i32>(5)? == 1,
            is_trashed: row.get::<_, i32>(6)? == 1,
            tags,
            created_at: row.get(7)?,
            updated_at: row.get(8)?,
        })
    })?;

    let mut items = Vec::new();
    for item in rows {
        items.push(item?);
    }
    Ok(items)
}

pub fn list_folders(conn: &Connection) -> Result<Vec<FolderInfo>, KobeanError> {
    let mut stmt = conn.prepare(
        "SELECT tg.name, COUNT(DISTINCT CASE WHEN i.is_trashed = 0 THEN it.item_id END) as count
         FROM tags tg
         LEFT JOIN item_tags it ON tg.id = it.tag_id
         LEFT JOIN items i ON it.item_id = i.id AND i.is_trashed = 0
         GROUP BY tg.id, tg.name
         ORDER BY tg.name COLLATE NOCASE ASC",
    )?;

    let rows = stmt.query_map([], |row| {
        Ok(FolderInfo {
            name: row.get(0)?,
            item_count: row.get::<_, i64>(1)? as usize,
        })
    })?;

    let mut folders = Vec::new();
    for r in rows {
        folders.push(r?);
    }
    Ok(folders)
}

pub fn create_folder(conn: &Connection, name: &str) -> Result<(), KobeanError> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err(KobeanError::InvalidInput("Folder name cannot be empty".into()));
    }
    let now = chrono::Utc::now().timestamp();
    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT OR IGNORE INTO tags (id, name, created_at) VALUES (?1, ?2, ?3)",
        params![id, trimmed, now],
    )?;
    Ok(())
}

pub fn rename_folder(conn: &Connection, old_name: &str, new_name: &str) -> Result<(), KobeanError> {
    let trimmed = new_name.trim();
    if trimmed.is_empty() {
        return Err(KobeanError::InvalidInput("Folder name cannot be empty".into()));
    }
    conn.execute(
        "UPDATE tags SET name = ?1 WHERE name = ?2 COLLATE NOCASE",
        params![trimmed, old_name],
    )?;

    // Cascade rename to any nested child subfolders (e.g. OldName/Child -> NewName/Child)
    let prefix = format!("{}/", old_name);
    let mut stmt = conn.prepare("SELECT id, name FROM tags WHERE name LIKE ?1 || '%' COLLATE NOCASE")?;
    let matching_rows: Vec<(String, String)> = stmt
        .query_map(params![prefix], |row| Ok((row.get(0)?, row.get(1)?)))?
        .filter_map(|r| r.ok())
        .collect();

    for (id, name) in matching_rows {
        if name.to_lowercase().starts_with(&prefix.to_lowercase()) {
            let child_suffix = &name[prefix.len()..];
            let updated_child = format!("{}/{}", trimmed, child_suffix);
            let _ = conn.execute("UPDATE tags SET name = ?1 WHERE id = ?2", params![updated_child, id]);
        }
    }

    Ok(())
}

pub fn delete_folder(conn: &Connection, name: &str) -> Result<(), KobeanError> {
    let child_prefix = format!("{}/%", name);
    conn.execute(
        "DELETE FROM tags WHERE name = ?1 COLLATE NOCASE OR name LIKE ?2 COLLATE NOCASE",
        params![name, child_prefix],
    )?;
    Ok(())
}

pub fn toggle_favorite(conn: &Connection, id: &str) -> Result<bool, KobeanError> {
    conn.execute(
        "UPDATE items SET is_favorite = CASE WHEN is_favorite = 1 THEN 0 ELSE 1 END WHERE id = ?1",
        params![id],
    )?;

    let mut stmt = conn.prepare("SELECT is_favorite FROM items WHERE id = ?1")?;
    let mut rows = stmt.query(params![id])?;
    if let Some(r) = rows.next()? {
        Ok(r.get::<_, i32>(0)? == 1)
    } else {
        Err(KobeanError::ItemNotFound(id.to_string()))
    }
}

pub fn trash_item(conn: &Connection, id: &str) -> Result<(), KobeanError> {
    let now = chrono::Utc::now().timestamp();
    let rows = conn.execute(
        "UPDATE items SET is_trashed = 1, trashed_at = ?1 WHERE id = ?2",
        params![now, id],
    )?;
    if rows == 0 {
        Err(KobeanError::ItemNotFound(id.to_string()))
    } else {
        Ok(())
    }
}

pub fn restore_item(conn: &Connection, id: &str) -> Result<(), KobeanError> {
    let rows = conn.execute(
        "UPDATE items SET is_trashed = 0, trashed_at = NULL WHERE id = ?1",
        params![id],
    )?;
    if rows == 0 {
        Err(KobeanError::ItemNotFound(id.to_string()))
    } else {
        Ok(())
    }
}

pub fn delete_item(conn: &Connection, id: &str) -> Result<(), KobeanError> {
    let rows = conn.execute("DELETE FROM items WHERE id = ?1", params![id])?;
    if rows == 0 {
        Err(KobeanError::ItemNotFound(id.to_string()))
    } else {
        conn.execute(
            "UPDATE vault_metadata SET item_count = MAX(0, item_count - 1) WHERE id = 'vault'",
            [],
        )?;
        Ok(())
    }
}

/// Move an item to a target folder (or remove from folders if None).
pub fn move_item_to_folder(
    conn: &Connection,
    item_id: &str,
    folder: Option<&str>,
) -> Result<(), KobeanError> {
    let now_ts = chrono::Utc::now().timestamp();
    let now_iso = chrono::Utc::now().to_rfc3339();
    conn.execute("DELETE FROM item_tags WHERE item_id = ?1", params![item_id])?;

    if let Some(folder_name) = folder {
        let trimmed = folder_name.trim();
        if !trimmed.is_empty() {
            let tag_id = Uuid::new_v4().to_string();
            conn.execute(
                "INSERT OR IGNORE INTO tags (id, name, created_at) VALUES (?1, ?2, ?3)",
                params![tag_id, trimmed, now_iso],
            )?;
            conn.execute(
                "INSERT OR IGNORE INTO item_tags (item_id, tag_id)
                 SELECT ?1, id FROM tags WHERE name = ?2 COLLATE NOCASE",
                params![item_id, trimmed],
            )?;
        }
    }

    let rows_affected = conn.execute(
        "UPDATE items SET updated_at = ?1 WHERE id = ?2",
        params![now_ts, item_id],
    )?;

    if rows_affected == 0 {
        return Err(KobeanError::ItemNotFound(item_id.to_string()));
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::models::LoginPayload;

    #[test]
    fn test_move_item_to_folder_lifecycle() {
        let temp_dir = std::env::temp_dir().join(format!("kobean_store_test_{}", Uuid::new_v4()));
        std::fs::create_dir_all(&temp_dir).unwrap();
        let db_path = temp_dir.join("test.db");

        let conn = open_or_create_database(&db_path, "test_pass").unwrap();

        let vk = VaultKey([7u8; 32]);
        let vault_id = "test_vault";

        let payload = VaultRecordPayload::Login(LoginPayload {
            username: "user@example.com".into(),
            password: "secret123".into(),
            url: "https://example.com".into(),
            urls: vec![],
            totp_secret: None,
            totp_digits: None,
            totp_period: None,
            totp_algorithm: None,
            notes: "".into(),
            custom_fields: vec![],
        });

        // 1. Insert item without folder
        let item = insert_item(
            &conn,
            &vk,
            vault_id,
            "My Bank Login",
            "login",
            &payload,
            &[],
        ).unwrap();
        assert!(item.tags.is_empty());

        // 2. Move item to folder "Finance / Banking"
        move_item_to_folder(&conn, &item.id, Some("Finance/Banking")).unwrap();
        let items = list_items(&conn, None, Some("Finance/Banking")).unwrap();
        assert_eq!(items.len(), 1);
        assert_eq!(items[0].id, item.id);

        // 3. Move item back to Root Vault (None)
        move_item_to_folder(&conn, &item.id, None).unwrap();
        let items_in_folder = list_items(&conn, None, Some("Finance/Banking")).unwrap();
        assert_eq!(items_in_folder.len(), 0);

        let all_items = list_items(&conn, None, None).unwrap();
        assert_eq!(all_items.len(), 1);
        assert!(all_items[0].tags.is_empty());
    }
}
