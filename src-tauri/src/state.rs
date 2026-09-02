use std::path::PathBuf;
use std::sync::Mutex;

use crate::core::vault::VaultHandle;

/// Thread-safe application state managing the active vault handle and active file path.
#[derive(Default)]
pub struct AppState {
    pub vault_handle: Mutex<Option<VaultHandle>>,
    pub default_vault_path: Mutex<Option<PathBuf>>,
    pub failed_attempts: Mutex<u32>,
    pub rate_limited_until: Mutex<Option<i64>>,
}
