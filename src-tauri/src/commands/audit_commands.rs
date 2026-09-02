use tauri::State;

use crate::core::audit::{audit_items, AuditReport};
use crate::core::crypto::VaultKey;
use crate::core::errors::KobeanError;
use crate::core::store::{get_item, list_items};
use crate::state::AppState;

fn extract_vault_key(handle: &crate::core::vault::VaultHandle) -> VaultKey {
    let mut key = [0u8; 32];
    key.copy_from_slice(&handle.vault_key);
    VaultKey(key)
}

#[tauri::command]
pub async fn cmd_run_audit(state: State<'_, AppState>) -> Result<AuditReport, KobeanError> {
    let guard = state
        .vault_handle
        .lock()
        .map_err(|_| KobeanError::VaultLocked)?;
    let handle = guard.as_ref().ok_or(KobeanError::VaultLocked)?;
    let vk = extract_vault_key(handle);

    let summaries = list_items(&handle.connection, None, None)?;
    let mut decrypted_items = Vec::with_capacity(summaries.len());

    for s in summaries {
        if let Ok(item) = get_item(&handle.connection, &vk, &handle.vault_id, &s.id) {
            decrypted_items.push(item);
        }
    }

    audit_items(&decrypted_items)
}
