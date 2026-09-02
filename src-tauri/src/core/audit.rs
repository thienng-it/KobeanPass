use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use super::errors::KobeanError;
use super::generator::estimate_strength;
use super::models::{DecryptedItem, VaultRecordPayload};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditWarning {
    pub item_id: String,
    pub item_title: String,
    pub severity: String, // "low" | "medium" | "high" | "critical"
    pub message: String,
    pub recommendation: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditReport {
    pub total_items: usize,
    pub weak_passwords: Vec<AuditWarning>,
    pub reused_passwords: Vec<AuditWarning>,
    pub old_passwords: Vec<AuditWarning>,
    pub missing_2fa: Vec<AuditWarning>,
    pub breached_passwords: Vec<AuditWarning>,
    pub overall_score: u8,
}

/// Runs a full in-memory security audit on all decrypted items.
pub fn audit_items(items: &[DecryptedItem]) -> Result<AuditReport, KobeanError> {
    let mut weak_passwords = Vec::new();
    let mut password_map: HashMap<String, Vec<&DecryptedItem>> = HashMap::new();
    let mut missing_2fa = Vec::new();
    let mut old_passwords = Vec::new();

    let now = chrono::Utc::now().timestamp();
    let ninety_days_ago = now - (90 * 86400);

    for item in items {
        if item.is_trashed {
            continue;
        }

        if let VaultRecordPayload::Login(ref login) = item.payload {
            // 1. Password Strength
            if !login.password.is_empty() {
                let strength = estimate_strength(&login.password);
                if strength.score < 3 {
                    weak_passwords.push(AuditWarning {
                        item_id: item.id.clone(),
                        item_title: item.title.clone(),
                        severity: if strength.score == 0 {
                            "critical".into()
                        } else {
                            "high".into()
                        },
                        message: format!("Password strength is {}", strength.label),
                        recommendation: "Use the password generator to create a strong passphrase."
                            .into(),
                    });
                }

                // Group for reuse detection
                password_map
                    .entry(login.password.clone())
                    .or_default()
                    .push(item);
            }

            // 2. 2FA Check
            if login.totp_secret.is_none() || login.totp_secret.as_ref().unwrap().is_empty() {
                missing_2fa.push(AuditWarning {
                    item_id: item.id.clone(),
                    item_title: item.title.clone(),
                    severity: "low".into(),
                    message: "Two-factor authentication (2FA) is not configured".into(),
                    recommendation: "Add a TOTP authenticator key if supported by the service."
                        .into(),
                });
            }

            // 3. Old Passwords Check
            if item.updated_at < ninety_days_ago {
                old_passwords.push(AuditWarning {
                    item_id: item.id.clone(),
                    item_title: item.title.clone(),
                    severity: "medium".into(),
                    message: "Password has not been rotated in over 90 days".into(),
                    recommendation: "Consider updating credentials periodically for high-risk accounts.".into(),
                });
            }
        }
    }

    // 4. Reused Passwords
    let mut reused_passwords = Vec::new();
    for (_pwd, instances) in password_map {
        if instances.len() > 1 {
            for item in instances {
                reused_passwords.push(AuditWarning {
                    item_id: item.id.clone(),
                    item_title: item.title.clone(),
                    severity: "high".into(),
                    message: "This password is used across multiple accounts".into(),
                    recommendation: "Every account should have a unique, generated password.".into(),
                });
            }
        }
    }

    // Calculate score (100 base, deductions for findings)
    let total_deductions = (weak_passwords.len() * 15)
        + (reused_passwords.len() * 10)
        + (old_passwords.len() * 3);

    let overall_score = (100i32.saturating_sub(total_deductions as i32)).clamp(0, 100) as u8;

    Ok(AuditReport {
        total_items: items.len(),
        weak_passwords,
        reused_passwords,
        old_passwords,
        missing_2fa,
        breached_passwords: Vec::new(),
        overall_score,
    })
}
