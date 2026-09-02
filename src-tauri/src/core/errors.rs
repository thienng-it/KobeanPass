use serde::{Serialize, Serializer};

/// Unified error types for KobeanPass.
#[derive(Debug, thiserror::Error)]
pub enum KobeanError {
    #[error("Key derivation failed: {0}")]
    KeyDerivation(String),

    #[error("Encryption failed: {0}")]
    Encryption(String),

    #[error("Decryption failed: authentication tag mismatch (wrong password or corrupted data)")]
    Decryption,

    #[error("Key wrapping failed: {0}")]
    KeyWrap(String),

    #[error("Vault not found at path: {0}")]
    VaultNotFound(String),

    #[error("Vault already exists at path: {0}")]
    VaultAlreadyExists(String),

    #[error("Vault is locked — master password required")]
    VaultLocked,

    #[error("Invalid vault file format: {0}")]
    InvalidVaultFormat(String),

    #[error("Unsupported vault format version: {0}")]
    UnsupportedVersion(u16),

    #[error("Vault header integrity verification failed (HMAC mismatch)")]
    HeaderIntegrity,

    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),

    #[error("Item not found with ID: {0}")]
    ItemNotFound(String),

    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),

    #[error("Keychain error: {0}")]
    Keychain(String),

    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Too many failed unlock attempts. Please wait {remaining_seconds}s.")]
    RateLimited { remaining_seconds: u64 },

    #[error("Invalid input: {0}")]
    InvalidInput(String),
}

impl Serialize for KobeanError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
