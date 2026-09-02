pub mod commands;
pub mod core;
pub mod state;

use state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize security hardening (anti-debug & disable core dumps)
    core::memory::init_security_hardening();

    tauri::Builder::default()
        .manage(AppState::default())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            // ── Vault Lifecycle ──
            commands::vault_commands::cmd_get_app_status,
            commands::vault_commands::cmd_create_vault,
            commands::vault_commands::cmd_open_vault,
            commands::vault_commands::cmd_lock_vault,
            commands::vault_commands::cmd_change_password,
            commands::vault_commands::cmd_save_keychain_secret,
            commands::vault_commands::cmd_get_keychain_secret,
            commands::vault_commands::cmd_delete_keychain_secret,
            // ── Item CRUD ──
            commands::item_commands::cmd_list_items,
            commands::item_commands::cmd_search_items,
            commands::item_commands::cmd_get_item,
            commands::item_commands::cmd_create_item,
            commands::item_commands::cmd_update_item,
            commands::item_commands::cmd_delete_item,
            commands::item_commands::cmd_toggle_favorite,
            commands::item_commands::cmd_trash_item,
            commands::item_commands::cmd_restore_item,
            commands::item_commands::cmd_list_folders,
            commands::item_commands::cmd_create_folder,
            commands::item_commands::cmd_rename_folder,
            commands::item_commands::cmd_delete_folder,
            commands::item_commands::cmd_move_item_to_folder,
            // ── Generator ──
            commands::generator_commands::cmd_generate_password,
            commands::generator_commands::cmd_generate_passphrase,
            commands::generator_commands::cmd_check_strength,
            // ── TOTP ──
            commands::totp_commands::cmd_get_totp_code,
            commands::totp_commands::cmd_get_totp_qr,
            commands::totp_commands::cmd_generate_totp_qr,
            commands::totp_commands::cmd_parse_totp_uri,
            // ── Audit ──
            commands::audit_commands::cmd_run_audit,
            // ── Clipboard ──
            commands::clipboard_commands::cmd_copy_secure,
        ])
        .run(tauri::generate_context!())
        .expect("error while running KobeanPass");
}
