use keyring::Entry;

use super::errors::KobeanError;

const SERVICE_NAME: &str = "com.kobean.pass";

/// Saves an encrypted token to the OS Keychain (macOS Keychain / Windows Credential Manager / Linux Secret Service).
pub fn save_keychain_secret(vault_id: &str, secret_b64: &str) -> Result<(), KobeanError> {
    let entry = Entry::new(SERVICE_NAME, vault_id)
        .map_err(|e| KobeanError::Keychain(e.to_string()))?;
    entry
        .set_password(secret_b64)
        .map_err(|e| KobeanError::Keychain(e.to_string()))?;
    Ok(())
}

/// Retrieves an encrypted token from the OS Keychain.
pub fn get_keychain_secret(vault_id: &str) -> Result<String, KobeanError> {
    let entry = Entry::new(SERVICE_NAME, vault_id)
        .map_err(|e| KobeanError::Keychain(e.to_string()))?;
    entry
        .get_password()
        .map_err(|e| KobeanError::Keychain(e.to_string()))
}

/// Deletes a secret from the OS Keychain.
pub fn delete_keychain_secret(vault_id: &str) -> Result<(), KobeanError> {
    let entry = Entry::new(SERVICE_NAME, vault_id)
        .map_err(|e| KobeanError::Keychain(e.to_string()))?;
    let _ = entry.delete_credential();
    Ok(())
}
