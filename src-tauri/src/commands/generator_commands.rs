use crate::core::errors::KobeanError;
use crate::core::generator::{
    estimate_strength as core_estimate_strength, generate_passphrase as core_generate_passphrase,
    generate_password as core_generate_password, GeneratedPassword, PassphraseOptions,
    PasswordOptions, StrengthResult,
};

#[tauri::command]
pub fn cmd_generate_password(
    options: PasswordOptions,
) -> Result<GeneratedPassword, KobeanError> {
    core_generate_password(&options)
}

#[tauri::command]
pub fn cmd_generate_passphrase(
    options: PassphraseOptions,
) -> Result<GeneratedPassword, KobeanError> {
    core_generate_passphrase(&options)
}

#[tauri::command]
pub fn cmd_check_strength(password: String) -> StrengthResult {
    core_estimate_strength(&password)
}
