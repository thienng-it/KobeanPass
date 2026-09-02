use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};
use totp_rs::{Algorithm, Secret, TOTP};

use super::errors::KobeanError;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TotpConfig {
    pub secret: String,
    pub digits: usize,
    pub period: u64,
    pub algorithm: String,
    pub issuer: Option<String>,
    pub account: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TotpCode {
    pub code: String,
    pub remaining_seconds: u64,
    pub period: u64,
}

pub fn generate_totp(config: &TotpConfig) -> Result<TotpCode, KobeanError> {
    let algo = match config.algorithm.to_uppercase().as_str() {
        "SHA256" => Algorithm::SHA256,
        "SHA512" => Algorithm::SHA512,
        _ => Algorithm::SHA1,
    };

    let secret_clean = config.secret.trim().replace(' ', "");
    let secret_bytes = Secret::Encoded(secret_clean)
        .to_bytes()
        .map_err(|e| KobeanError::InvalidInput(format!("Invalid Base32 secret: {}", e)))?;

    let totp = TOTP::new(
        algo,
        config.digits,
        1,
        config.period,
        secret_bytes,
        config.issuer.clone(),
        config.account.clone().unwrap_or_default(),
    )
    .map_err(|e| KobeanError::InvalidInput(e.to_string()))?;

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();

    let code = totp
        .generate_current()
        .map_err(|e| KobeanError::InvalidInput(e.to_string()))?;

    let remaining_seconds = config.period - (now % config.period);

    Ok(TotpCode {
        code,
        remaining_seconds,
        period: config.period,
    })
}

pub fn parse_otpauth_uri(uri: &str) -> Result<TotpConfig, KobeanError> {
    let totp = TOTP::from_url(uri).map_err(|e| KobeanError::InvalidInput(e.to_string()))?;

    let algo_str = match totp.algorithm {
        Algorithm::SHA256 => "SHA256",
        Algorithm::SHA512 => "SHA512",
        _ => "SHA1",
    };

    Ok(TotpConfig {
        secret: totp.get_secret_base32(),
        digits: totp.digits,
        period: totp.step,
        algorithm: algo_str.to_string(),
        issuer: totp.issuer,
        account: Some(totp.account_name),
    })
}

/// Generate a base64-encoded PNG data URL QR code for TOTP setup with Google/Microsoft Authenticator.
pub fn generate_totp_qr(config: &TotpConfig) -> Result<String, KobeanError> {
    let algo = match config.algorithm.to_uppercase().as_str() {
        "SHA256" => Algorithm::SHA256,
        "SHA512" => Algorithm::SHA512,
        _ => Algorithm::SHA1,
    };

    let secret_clean = config.secret.trim().replace(' ', "");
    let secret_bytes = Secret::Encoded(secret_clean)
        .to_bytes()
        .map_err(|e| KobeanError::InvalidInput(format!("Invalid Base32 secret: {}", e)))?;

    let totp = TOTP::new(
        algo,
        config.digits,
        1,
        config.period,
        secret_bytes,
        config.issuer.clone(),
        config.account.clone().unwrap_or_default(),
    )
    .map_err(|e| KobeanError::InvalidInput(e.to_string()))?;

    let qr_base64 = totp
        .get_qr_base64()
        .map_err(|e| KobeanError::InvalidInput(format!("Failed to generate QR code: {}", e)))?;

    Ok(format!("data:image/png;base64,{}", qr_base64))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_totp_generation() {
        // Standard RFC test secret (20 bytes / 160 bits = 32 Base32 characters)
        let config = TotpConfig {
            secret: "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP".to_string(),
            digits: 6,
            period: 30,
            algorithm: "SHA1".to_string(),
            issuer: Some("KobeanPass".to_string()),
            account: Some("user@kobean.dev".to_string()),
        };

        let result = generate_totp(&config).unwrap();
        assert_eq!(result.code.len(), 6);
        assert!(result.remaining_seconds <= 30);
    }

    #[test]
    fn test_totp_qr_generation() {
        let config = TotpConfig {
            secret: "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP".to_string(),
            digits: 6,
            period: 30,
            algorithm: "SHA1".to_string(),
            issuer: Some("Google".to_string()),
            account: Some("user@gmail.com".to_string()),
        };

        let qr_data_uri = generate_totp_qr(&config).unwrap();
        assert!(qr_data_uri.starts_with("data:image/png;base64,"));
        assert!(qr_data_uri.len() > 100);
    }

    #[test]
    fn test_parse_otpauth_uri() {
        let uri = "otpauth://totp/GitHub:octocat?secret=JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP&issuer=GitHub&algorithm=SHA1&digits=6&period=30";
        let config = parse_otpauth_uri(uri).unwrap();
        assert_eq!(config.secret, "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP");
        assert_eq!(config.issuer, Some("GitHub".to_string()));
        assert_eq!(config.account, Some("octocat".to_string()));
        assert_eq!(config.digits, 6);
        assert_eq!(config.period, 30);
    }
}
