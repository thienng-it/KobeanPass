use serde::{Deserialize, Serialize};
use zeroize::{Zeroize, ZeroizeOnDrop};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomField {
    pub label: String,
    pub value: String,
    pub field_type: String, // "text" | "hidden" | "url" | "email" | "date" | "otp"
}

// ============================================================================
// Record Payloads (Zeroize + ZeroizeOnDrop)
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, Default, Zeroize, ZeroizeOnDrop)]
pub struct LoginPayload {
    pub username: String,
    pub password: String,
    pub url: String,
    #[serde(default)]
    pub urls: Vec<String>,
    #[serde(default)]
    pub totp_secret: Option<String>,
    #[serde(default)]
    pub totp_digits: Option<u32>,
    #[serde(default)]
    pub totp_period: Option<u64>,
    #[serde(default)]
    pub totp_algorithm: Option<String>,
    #[serde(default)]
    pub notes: String,
    #[zeroize(skip)]
    #[serde(default)]
    pub custom_fields: Vec<CustomField>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, Zeroize, ZeroizeOnDrop)]
pub struct SecureNotePayload {
    pub content: String,
    #[serde(default)]
    pub notes: String,
    #[zeroize(skip)]
    #[serde(default)]
    pub custom_fields: Vec<CustomField>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, Zeroize, ZeroizeOnDrop)]
pub struct CreditCardPayload {
    pub cardholder: String,
    pub number: String,
    pub expiry_month: String,
    pub expiry_year: String,
    pub cvv: String,
    #[serde(default)]
    pub pin: Option<String>,
    #[serde(default)]
    pub brand: Option<String>,
    #[serde(default)]
    pub notes: String,
    #[zeroize(skip)]
    #[serde(default)]
    pub custom_fields: Vec<CustomField>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, Zeroize, ZeroizeOnDrop)]
pub struct IdentityPayload {
    pub first_name: String,
    pub last_name: String,
    pub email: String,
    pub phone: String,
    pub address_line1: String,
    #[serde(default)]
    pub address_line2: Option<String>,
    pub city: String,
    pub state: String,
    pub postal_code: String,
    pub country: String,
    #[serde(default)]
    pub company: Option<String>,
    #[serde(default)]
    pub job_title: Option<String>,
    #[serde(default)]
    pub notes: String,
    #[zeroize(skip)]
    #[serde(default)]
    pub custom_fields: Vec<CustomField>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, Zeroize, ZeroizeOnDrop)]
pub struct ApiTokenPayload {
    pub service: String,
    pub token: String,
    pub environment: String,
    #[serde(default)]
    pub expires_at: Option<String>,
    #[serde(default)]
    pub notes: String,
    #[zeroize(skip)]
    #[serde(default)]
    pub custom_fields: Vec<CustomField>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, Zeroize, ZeroizeOnDrop)]
pub struct SshKeyPayload {
    pub private_key: String,
    pub public_key: String,
    #[serde(default)]
    pub passphrase: Option<String>,
    #[serde(default)]
    pub fingerprint: Option<String>,
    #[serde(default)]
    pub notes: String,
    #[zeroize(skip)]
    #[serde(default)]
    pub custom_fields: Vec<CustomField>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, Zeroize, ZeroizeOnDrop)]
pub struct WifiPayload {
    pub ssid: String,
    pub password: String,
    pub security: String,
    #[serde(default)]
    pub hidden: bool,
    #[serde(default)]
    pub notes: String,
    #[zeroize(skip)]
    #[serde(default)]
    pub custom_fields: Vec<CustomField>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, Zeroize, ZeroizeOnDrop)]
pub struct SoftwareLicensePayload {
    pub license_key: String,
    pub version: String,
    pub publisher: String,
    pub email: String,
    #[serde(default)]
    pub purchased_at: Option<String>,
    #[serde(default)]
    pub expires_at: Option<String>,
    #[serde(default)]
    pub notes: String,
    #[zeroize(skip)]
    #[serde(default)]
    pub custom_fields: Vec<CustomField>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, Zeroize, ZeroizeOnDrop)]
pub struct OtpPayload {
    pub account: String,
    pub totp_secret: String,
    #[serde(default)]
    pub totp_digits: Option<u32>,
    #[serde(default)]
    pub totp_period: Option<u64>,
    #[serde(default)]
    pub totp_algorithm: Option<String>,
    #[serde(default)]
    pub issuer: Option<String>,
    #[serde(default)]
    pub notes: String,
    #[zeroize(skip)]
    #[serde(default)]
    pub custom_fields: Vec<CustomField>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "data")]
pub enum VaultRecordPayload {
    #[serde(rename = "login")]
    Login(LoginPayload),
    #[serde(rename = "otp")]
    Otp(OtpPayload),
    #[serde(rename = "secure_note")]
    SecureNote(SecureNotePayload),
    #[serde(rename = "credit_card")]
    CreditCard(CreditCardPayload),
    #[serde(rename = "identity")]
    Identity(IdentityPayload),
    #[serde(rename = "api_token")]
    ApiToken(ApiTokenPayload),
    #[serde(rename = "ssh_key")]
    SshKey(SshKeyPayload),
    #[serde(rename = "wifi")]
    Wifi(WifiPayload),
    #[serde(rename = "software_license")]
    SoftwareLicense(SoftwareLicensePayload),
}

// ============================================================================
// DTOs & Summaries
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FolderInfo {
    pub name: String,
    pub item_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ItemSummary {
    pub id: String,
    pub item_type: String,
    pub title: String,
    pub subtitle: Option<String>,
    pub icon_hint: Option<String>,
    pub is_favorite: bool,
    pub is_trashed: bool,
    pub tags: Vec<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DecryptedItem {
    pub id: String,
    pub item_type: String,
    pub title: String,
    pub subtitle: Option<String>,
    pub icon_hint: Option<String>,
    pub is_favorite: bool,
    pub is_trashed: bool,
    pub tags: Vec<String>,
    pub payload: VaultRecordPayload,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VaultInfo {
    pub vault_id: String,
    pub vault_name: String,
    pub path: String,
    pub item_count: u32,
    pub created_at: i64,
    pub last_unlocked_at: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppStatus {
    pub has_vault: boolean_status::BoolStatus,
    pub is_unlocked: bool,
    pub vault_info: Option<VaultInfo>,
    pub biometric_available: bool,
    pub rate_limited_until: Option<i64>,
}

pub mod boolean_status {
    pub type BoolStatus = bool;
}
