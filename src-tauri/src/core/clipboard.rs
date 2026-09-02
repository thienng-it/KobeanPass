use std::sync::atomic::{AtomicU64, Ordering};
use std::time::Duration;
use tauri::AppHandle;
use tauri_plugin_clipboard_manager::ClipboardExt;

use super::errors::KobeanError;

static COPY_GENERATION: AtomicU64 = AtomicU64::new(0);

/// Copies a sensitive secret to the OS clipboard and schedules an auto-clear task after `timeout_secs`.
pub async fn copy_secure_secret(
    app: AppHandle,
    text: String,
    timeout_secs: u64,
) -> Result<(), KobeanError> {
    let current_gen = COPY_GENERATION.fetch_add(1, Ordering::SeqCst) + 1;

    app.clipboard()
        .write_text(text.clone())
        .map_err(|e| KobeanError::InvalidInput(e.to_string()))?;

    if timeout_secs > 0 {
        let app_clone = app.clone();
        let expected_text = text;

        tauri::async_runtime::spawn(async move {
            tokio::time::sleep(Duration::from_secs(timeout_secs)).await;

            // Only clear if no newer copy operation happened in the meantime
            if COPY_GENERATION.load(Ordering::SeqCst) == current_gen {
                if let Ok(current_clip) = app_clone.clipboard().read_text() {
                    if current_clip == expected_text {
                        let _ = app_clone.clipboard().clear();
                    }
                }
            }
        });
    }

    Ok(())
}
