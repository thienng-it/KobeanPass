use tauri::State;

use crate::core::crypto::VaultKey;
use crate::core::errors::KobeanError;
use crate::core::models::{DecryptedItem, FolderInfo, ItemSummary, VaultRecordPayload};
use crate::core::store::{
    create_folder, delete_folder, delete_item, get_item, insert_item, list_folders, list_items,
    move_item_to_folder, rename_folder, restore_item, search_items, toggle_favorite, trash_item,
    update_item,
};
use crate::state::AppState;

fn extract_vault_key(handle: &crate::core::vault::VaultHandle) -> VaultKey {
    let mut key = [0u8; 32];
    key.copy_from_slice(&handle.vault_key);
    VaultKey(key)
}

#[tauri::command]
pub async fn cmd_list_items(
    filter_type: Option<String>,
    tag: Option<String>,
    state: State<'_, AppState>,
) -> Result<Vec<ItemSummary>, KobeanError> {
    let guard = state
        .vault_handle
        .lock()
        .map_err(|_| KobeanError::VaultLocked)?;
    let handle = guard.as_ref().ok_or(KobeanError::VaultLocked)?;
    list_items(&handle.connection, filter_type.as_deref(), tag.as_deref())
}

#[tauri::command]
pub async fn cmd_search_items(
    query: String,
    state: State<'_, AppState>,
) -> Result<Vec<ItemSummary>, KobeanError> {
    let guard = state
        .vault_handle
        .lock()
        .map_err(|_| KobeanError::VaultLocked)?;
    let handle = guard.as_ref().ok_or(KobeanError::VaultLocked)?;
    search_items(&handle.connection, &query)
}

#[tauri::command]
pub async fn cmd_get_item(
    id: String,
    state: State<'_, AppState>,
) -> Result<DecryptedItem, KobeanError> {
    let guard = state
        .vault_handle
        .lock()
        .map_err(|_| KobeanError::VaultLocked)?;
    let handle = guard.as_ref().ok_or(KobeanError::VaultLocked)?;
    let vk = extract_vault_key(handle);
    get_item(&handle.connection, &vk, &handle.vault_id, &id)
}

#[tauri::command]
pub async fn cmd_create_item(
    title: String,
    item_type: String,
    payload: VaultRecordPayload,
    tags: Vec<String>,
    state: State<'_, AppState>,
) -> Result<ItemSummary, KobeanError> {
    let guard = state
        .vault_handle
        .lock()
        .map_err(|_| KobeanError::VaultLocked)?;
    let handle = guard.as_ref().ok_or(KobeanError::VaultLocked)?;
    let vk = extract_vault_key(handle);
    insert_item(
        &handle.connection,
        &vk,
        &handle.vault_id,
        &title,
        &item_type,
        &payload,
        &tags,
    )
}

#[tauri::command]
pub async fn cmd_update_item(
    id: String,
    title: String,
    payload: VaultRecordPayload,
    tags: Vec<String>,
    state: State<'_, AppState>,
) -> Result<ItemSummary, KobeanError> {
    let guard = state
        .vault_handle
        .lock()
        .map_err(|_| KobeanError::VaultLocked)?;
    let handle = guard.as_ref().ok_or(KobeanError::VaultLocked)?;
    let vk = extract_vault_key(handle);
    update_item(
        &handle.connection,
        &vk,
        &handle.vault_id,
        &id,
        &title,
        &payload,
        &tags,
    )
}

#[tauri::command]
pub async fn cmd_delete_item(id: String, state: State<'_, AppState>) -> Result<(), KobeanError> {
    let guard = state
        .vault_handle
        .lock()
        .map_err(|_| KobeanError::VaultLocked)?;
    let handle = guard.as_ref().ok_or(KobeanError::VaultLocked)?;
    delete_item(&handle.connection, &id)
}

#[tauri::command]
pub async fn cmd_toggle_favorite(
    id: String,
    state: State<'_, AppState>,
) -> Result<bool, KobeanError> {
    let guard = state
        .vault_handle
        .lock()
        .map_err(|_| KobeanError::VaultLocked)?;
    let handle = guard.as_ref().ok_or(KobeanError::VaultLocked)?;
    toggle_favorite(&handle.connection, &id)
}

#[tauri::command]
pub async fn cmd_trash_item(id: String, state: State<'_, AppState>) -> Result<(), KobeanError> {
    let guard = state
        .vault_handle
        .lock()
        .map_err(|_| KobeanError::VaultLocked)?;
    let handle = guard.as_ref().ok_or(KobeanError::VaultLocked)?;
    trash_item(&handle.connection, &id)
}

#[tauri::command]
pub async fn cmd_restore_item(id: String, state: State<'_, AppState>) -> Result<(), KobeanError> {
    let guard = state
        .vault_handle
        .lock()
        .map_err(|_| KobeanError::VaultLocked)?;
    let handle = guard.as_ref().ok_or(KobeanError::VaultLocked)?;
    restore_item(&handle.connection, &id)
}

#[tauri::command]
pub async fn cmd_list_folders(state: State<'_, AppState>) -> Result<Vec<FolderInfo>, KobeanError> {
    let guard = state
        .vault_handle
        .lock()
        .map_err(|_| KobeanError::VaultLocked)?;
    let handle = guard.as_ref().ok_or(KobeanError::VaultLocked)?;
    list_folders(&handle.connection)
}

#[tauri::command]
pub async fn cmd_create_folder(name: String, state: State<'_, AppState>) -> Result<(), KobeanError> {
    let guard = state
        .vault_handle
        .lock()
        .map_err(|_| KobeanError::VaultLocked)?;
    let handle = guard.as_ref().ok_or(KobeanError::VaultLocked)?;
    create_folder(&handle.connection, &name)
}

#[tauri::command]
pub async fn cmd_rename_folder(
    old_name: String,
    new_name: String,
    state: State<'_, AppState>,
) -> Result<(), KobeanError> {
    let guard = state
        .vault_handle
        .lock()
        .map_err(|_| KobeanError::VaultLocked)?;
    let handle = guard.as_ref().ok_or(KobeanError::VaultLocked)?;
    rename_folder(&handle.connection, &old_name, &new_name)
}

#[tauri::command]
pub async fn cmd_delete_folder(name: String, state: State<'_, AppState>) -> Result<(), KobeanError> {
    let guard = state
        .vault_handle
        .lock()
        .map_err(|_| KobeanError::VaultLocked)?;
    let handle = guard.as_ref().ok_or(KobeanError::VaultLocked)?;
    delete_folder(&handle.connection, &name)
}

#[tauri::command]
pub async fn cmd_move_item_to_folder(
    id: String,
    folder: Option<String>,
    state: State<'_, AppState>,
) -> Result<(), KobeanError> {
    let guard = state
        .vault_handle
        .lock()
        .map_err(|_| KobeanError::VaultLocked)?;
    let handle = guard.as_ref().ok_or(KobeanError::VaultLocked)?;
    move_item_to_folder(&handle.connection, &id, folder.as_deref())
}
