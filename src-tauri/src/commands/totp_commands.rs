use tauri::State;

use crate::core::crypto::VaultKey;
use crate::core::errors::KobeanError;
use crate::core::models::VaultRecordPayload;
use crate::core::store::get_item;
use crate::core::totp::{generate_totp, generate_totp_qr, parse_otpauth_uri, TotpCode, TotpConfig};
use crate::state::AppState;

fn extract_vault_key(handle: &crate::core::vault::VaultHandle) -> VaultKey {
    let mut key = [0u8; 32];
    key.copy_from_slice(&handle.vault_key);
    VaultKey(key)
}

/// Computes the current 6-digit TOTP rolling code for a vault login item.
#[tauri::command]
pub async fn cmd_get_totp_code(
    item_id: String,
    state: State<'_, AppState>,
) -> Result<TotpCode, KobeanError> {
    let guard = state
        .vault_handle
        .lock()
        .map_err(|_| KobeanError::VaultLocked)?;
    let handle = guard.as_ref().ok_or(KobeanError::VaultLocked)?;
    let vk = extract_vault_key(handle);

    let item = get_item(&handle.connection, &vk, &handle.vault_id, &item_id)?;

    if let VaultRecordPayload::Login(ref login) = item.payload {
        if let Some(ref secret) = login.totp_secret {
            if !secret.is_empty() {
                let config = TotpConfig {
                    secret: secret.clone(),
                    digits: login.totp_digits.unwrap_or(6) as usize,
                    period: login.totp_period.unwrap_or(30),
                    algorithm: login.totp_algorithm.clone().unwrap_or_else(|| "SHA1".into()),
                    issuer: None,
                    account: Some(login.username.clone()),
                };
                return generate_totp(&config);
            }
        }
    } else if let VaultRecordPayload::Otp(ref otp) = item.payload {
        if !otp.totp_secret.is_empty() {
            let config = TotpConfig {
                secret: otp.totp_secret.clone(),
                digits: otp.totp_digits.unwrap_or(6) as usize,
                period: otp.totp_period.unwrap_or(30),
                algorithm: otp.totp_algorithm.clone().unwrap_or_else(|| "SHA1".into()),
                issuer: otp.issuer.clone(),
                account: Some(otp.account.clone()),
            };
            return generate_totp(&config);
        }
    }

    Err(KobeanError::InvalidInput(
        "Item does not have TOTP configured".into(),
    ))
}

/// Generates a QR code image (data URI) for a stored vault login or OTP item's TOTP secret.
#[tauri::command]
pub async fn cmd_get_totp_qr(
    item_id: String,
    state: State<'_, AppState>,
) -> Result<String, KobeanError> {
    let guard = state
        .vault_handle
        .lock()
        .map_err(|_| KobeanError::VaultLocked)?;
    let handle = guard.as_ref().ok_or(KobeanError::VaultLocked)?;
    let vk = extract_vault_key(handle);

    let item = get_item(&handle.connection, &vk, &handle.vault_id, &item_id)?;

    if let VaultRecordPayload::Login(ref login) = item.payload {
        if let Some(ref secret) = login.totp_secret {
            if !secret.is_empty() {
                let config = TotpConfig {
                    secret: secret.clone(),
                    digits: login.totp_digits.unwrap_or(6) as usize,
                    period: login.totp_period.unwrap_or(30),
                    algorithm: login.totp_algorithm.clone().unwrap_or_else(|| "SHA1".into()),
                    issuer: Some(item.title),
                    account: Some(login.username.clone()),
                };
                return generate_totp_qr(&config);
            }
        }
    } else if let VaultRecordPayload::Otp(ref otp) = item.payload {
        if !otp.totp_secret.is_empty() {
            let config = TotpConfig {
                secret: otp.totp_secret.clone(),
                digits: otp.totp_digits.unwrap_or(6) as usize,
                period: otp.totp_period.unwrap_or(30),
                algorithm: otp.totp_algorithm.clone().unwrap_or_else(|| "SHA1".into()),
                issuer: otp.issuer.clone().or(Some(item.title)),
                account: Some(otp.account.clone()),
            };
            return generate_totp_qr(&config);
        }
    }

    Err(KobeanError::InvalidInput(
        "Item does not have TOTP configured".into(),
    ))
}

/// Generates a QR code image (data URI) directly from a TotpConfig.
#[tauri::command]
pub async fn cmd_generate_totp_qr(config: TotpConfig) -> Result<String, KobeanError> {
    generate_totp_qr(&config)
}

/// Parses an otpauth://totp/... URI string into a structured TotpConfig.
#[tauri::command]
pub async fn cmd_parse_totp_uri(uri: String) -> Result<TotpConfig, KobeanError> {
    parse_otpauth_uri(&uri)
}
