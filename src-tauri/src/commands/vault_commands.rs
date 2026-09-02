use std::path::PathBuf;
use tauri::{AppHandle, Manager, State};

use crate::core::errors::KobeanError;
use crate::core::keychain::{
    delete_keychain_secret, get_keychain_secret, save_keychain_secret,
};
use crate::core::models::{AppStatus, VaultInfo};
use crate::core::vault::{
    change_master_password as core_change_password, create_vault as core_create_vault,
    get_vault_info as core_get_vault_info, open_vault as core_open_vault,
};
use crate::state::AppState;

fn resolve_default_path(app: &AppHandle) -> Result<PathBuf, KobeanError> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| KobeanError::Io(std::io::Error::other(e.to_string())))?;
    Ok(app_dir.join("vault.kbp"))
}

#[tauri::command]
pub async fn cmd_get_app_status(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<AppStatus, KobeanError> {
    let default_path = resolve_default_path(&app)?;
    let has_vault = default_path.exists();

    let guard = state
        .vault_handle
        .lock()
        .map_err(|_| KobeanError::VaultLocked)?;

    let is_unlocked = guard.is_some();
    let vault_info = if let Some(ref handle) = *guard {
        Some(core_get_vault_info(handle)?)
    } else {
        None
    };

    let rate_limited_until = *state
        .rate_limited_until
        .lock()
        .map_err(|_| KobeanError::VaultLocked)?;

    Ok(AppStatus {
        has_vault,
        is_unlocked,
        vault_info,
        biometric_available: false,
        rate_limited_until,
    })
}

#[tauri::command]
pub async fn cmd_create_vault(
    app: AppHandle,
    path: Option<String>,
    name: String,
    password: String,
    state: State<'_, AppState>,
) -> Result<VaultInfo, KobeanError> {
    let vault_path = match path {
        Some(p) if !p.is_empty() => PathBuf::from(p),
        _ => resolve_default_path(&app)?,
    };

    let handle = core_create_vault(&vault_path, &name, &password)?;
    let info = core_get_vault_info(&handle)?;

    let mut guard = state
        .vault_handle
        .lock()
        .map_err(|_| KobeanError::VaultLocked)?;
    *guard = Some(handle);

    Ok(info)
}

#[tauri::command]
pub async fn cmd_open_vault(
    app: AppHandle,
    path: Option<String>,
    password: String,
    state: State<'_, AppState>,
) -> Result<VaultInfo, KobeanError> {
    // Check rate limit
    let now = chrono::Utc::now().timestamp();
    {
        let mut rate_guard = state
            .rate_limited_until
            .lock()
            .map_err(|_| KobeanError::VaultLocked)?;
        if let Some(until) = *rate_guard {
            if now < until {
                return Err(KobeanError::RateLimited {
                    remaining_seconds: (until - now) as u64,
                });
            } else {
                *rate_guard = None;
            }
        }
    }

    let vault_path = match path {
        Some(p) if !p.is_empty() => PathBuf::from(p),
        _ => resolve_default_path(&app)?,
    };

    match core_open_vault(&vault_path, &password) {
        Ok(handle) => {
            // Reset failed attempts on success
            if let Ok(mut attempts) = state.failed_attempts.lock() {
                *attempts = 0;
            }
            let info = core_get_vault_info(&handle)?;
            let mut guard = state
                .vault_handle
                .lock()
                .map_err(|_| KobeanError::VaultLocked)?;
            *guard = Some(handle);
            Ok(info)
        }
        Err(e) => {
            // Increment failed attempts & set backoff
            if let Ok(mut attempts) = state.failed_attempts.lock() {
                *attempts += 1;
                if *attempts >= 10 {
                    let mut rate_guard = state.rate_limited_until.lock().unwrap();
                    *rate_guard = Some(now + 300); // 5 min delay
                } else if *attempts >= 5 {
                    let mut rate_guard = state.rate_limited_until.lock().unwrap();
                    *rate_guard = Some(now + 30); // 30 sec delay
                } else if *attempts >= 3 {
                    let mut rate_guard = state.rate_limited_until.lock().unwrap();
                    *rate_guard = Some(now + 5); // 5 sec delay
                }
            }
            Err(e)
        }
    }
}

#[tauri::command]
pub async fn cmd_lock_vault(state: State<'_, AppState>) -> Result<(), KobeanError> {
    let mut guard = state
        .vault_handle
        .lock()
        .map_err(|_| KobeanError::VaultLocked)?;
    *guard = None;
    Ok(())
}

#[tauri::command]
pub async fn cmd_change_password(
    old_password: String,
    new_password: String,
    state: State<'_, AppState>,
) -> Result<(), KobeanError> {
    let guard = state
        .vault_handle
        .lock()
        .map_err(|_| KobeanError::VaultLocked)?;
    let handle = guard.as_ref().ok_or(KobeanError::VaultLocked)?;
    core_change_password(handle, &old_password, &new_password)
}

/// Saves an encrypted token or secret to the OS Keychain.
#[tauri::command]
pub async fn cmd_save_keychain_secret(key: String, secret: String) -> Result<(), KobeanError> {
    save_keychain_secret(&key, &secret)
}

/// Retrieves a secret from the OS Keychain.
#[tauri::command]
pub async fn cmd_get_keychain_secret(key: String) -> Result<String, KobeanError> {
    get_keychain_secret(&key)
}

/// Deletes a secret from the OS Keychain.
#[tauri::command]
pub async fn cmd_delete_keychain_secret(key: String) -> Result<(), KobeanError> {
    delete_keychain_secret(&key)
}
