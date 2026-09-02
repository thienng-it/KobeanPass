use tauri::AppHandle;

use crate::core::clipboard::copy_secure_secret;
use crate::core::errors::KobeanError;

#[tauri::command]
pub async fn cmd_copy_secure(
    app: AppHandle,
    text: String,
    timeout_secs: Option<u64>,
) -> Result<(), KobeanError> {
    copy_secure_secret(app, text, timeout_secs.unwrap_or(30)).await
}
