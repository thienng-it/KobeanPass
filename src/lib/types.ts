// ============================================================================
// KobeanPass TypeScript Data Models (Mirrors Rust core/models.rs)
// ============================================================================

export type ItemType =
  | "login"
  | "otp"
  | "secure_note"
  | "credit_card"
  | "identity"
  | "api_token"
  | "ssh_key"
  | "wifi"
  | "software_license";

export interface CustomField {
  label: string;
  value: string;
  field_type: "text" | "hidden" | "url" | "email" | "date" | "otp";
}

// ── Specific Payloads ──

export interface LoginPayload {
  username: string;
  password: string;
  url: string;
  urls: string[];
  totp_secret?: string;
  totp_digits?: number;
  totp_period?: number;
  totp_algorithm?: string;
  notes: string;
  custom_fields: CustomField[];
}

export interface OtpPayload {
  account: string;
  totp_secret: string;
  totp_digits?: number;
  totp_period?: number;
  totp_algorithm?: string;
  issuer?: string;
  notes: string;
  custom_fields: CustomField[];
}

export interface SecureNotePayload {
  content: string;
  notes?: string;
  custom_fields: CustomField[];
}

export interface CreditCardPayload {
  cardholder: string;
  number: string;
  expiry_month: string;
  expiry_year: string;
  cvv: string;
  pin?: string;
  brand?: string;
  notes: string;
  custom_fields: CustomField[];
}

export interface IdentityPayload {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  company?: string;
  job_title?: string;
  notes: string;
  custom_fields: CustomField[];
}

export interface ApiTokenPayload {
  service: string;
  token: string;
  environment: string;
  expires_at?: string;
  notes: string;
  custom_fields: CustomField[];
}

export interface SshKeyPayload {
  private_key: string;
  public_key: string;
  passphrase?: string;
  fingerprint?: string;
  notes: string;
  custom_fields: CustomField[];
}

export interface WifiPayload {
  ssid: string;
  password: string;
  security: string;
  hidden: boolean;
  notes: string;
  custom_fields: CustomField[];
}

export interface SoftwareLicensePayload {
  license_key: string;
  version: string;
  publisher: string;
  email: string;
  purchased_at?: string;
  expires_at?: string;
  notes: string;
  custom_fields: CustomField[];
}

export type VaultRecordPayload =
  | { type: "login"; data: LoginPayload }
  | { type: "otp"; data: OtpPayload }
  | { type: "secure_note"; data: SecureNotePayload }
  | { type: "credit_card"; data: CreditCardPayload }
  | { type: "identity"; data: IdentityPayload }
  | { type: "api_token"; data: ApiTokenPayload }
  | { type: "ssh_key"; data: SshKeyPayload }
  | { type: "wifi"; data: WifiPayload }
  | { type: "software_license"; data: SoftwareLicensePayload };

// ── Folders & Projects ──

export interface FolderInfo {
  name: string;
  item_count: number;
}

export interface FolderTreeNode {
  name: string;
  displayName: string;
  item_count: number;
  total_item_count: number;
  children: FolderTreeNode[];
  depth: number;
}

export function buildFolderTree(folders: FolderInfo[]): FolderTreeNode[] {
  const rootNodes: FolderTreeNode[] = [];
  const map = new Map<string, FolderTreeNode>();

  const sorted = [...folders].sort((a, b) => a.name.localeCompare(b.name));

  for (const f of sorted) {
    const parts = f.name.split("/").filter(Boolean);
    let currentPath = "";

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const prevPath = currentPath;
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      if (!map.has(currentPath)) {
        const isLeaf = currentPath === f.name;
        const node: FolderTreeNode = {
          name: currentPath,
          displayName: part,
          item_count: isLeaf ? f.item_count : 0,
          total_item_count: isLeaf ? f.item_count : 0,
          children: [],
          depth: i,
        };
        map.set(currentPath, node);

        if (i === 0) {
          rootNodes.push(node);
        } else if (map.has(prevPath)) {
          map.get(prevPath)!.children.push(node);
        }
      } else if (currentPath === f.name) {
        map.get(currentPath)!.item_count = f.item_count;
        map.get(currentPath)!.total_item_count = f.item_count;
      }
    }
  }

  function calculateTotal(node: FolderTreeNode): number {
    let sum = node.item_count;
    for (const child of node.children) {
      sum += calculateTotal(child);
    }
    node.total_item_count = sum;
    return sum;
  }

  for (const root of rootNodes) {
    calculateTotal(root);
  }

  return rootNodes;
}

// ── Item Summaries (For listing without full decryption) ──

export interface ItemSummary {
  id: string;
  item_type: ItemType;
  title: string;
  subtitle?: string;
  icon_hint?: string;
  is_favorite: boolean;
  is_trashed: boolean;
  tags: string[];
  created_at: number;
  updated_at: number;
}

export interface DecryptedItem {
  id: string;
  item_type: ItemType;
  title: string;
  subtitle?: string;
  icon_hint?: string;
  is_favorite: boolean;
  is_trashed: boolean;
  tags: string[];
  payload: VaultRecordPayload;
  created_at: number;
  updated_at: number;
}

// ── Vault Lifecycle & Status ──

export interface VaultInfo {
  vault_id: string;
  vault_name: string;
  path: string;
  item_count: number;
  created_at: number;
  last_unlocked_at?: number;
}

export interface AppStatus {
  has_vault: boolean;
  is_unlocked: boolean;
  vault_info?: VaultInfo;
  biometric_available: boolean;
  rate_limited_until?: number;
}

// ── Generator & Strength ──

export interface PasswordOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  digits: boolean;
  symbols: boolean;
  exclude_ambiguous: boolean;
  exclude_chars?: string;
  min_digits?: number;
  min_symbols?: number;
}

export interface PassphraseOptions {
  word_count: number;
  separator: string;
  capitalize: boolean;
  include_number: boolean;
}

export interface StrengthResult {
  score: number; // 0-4
  label: "Very Weak" | "Weak" | "Fair" | "Strong" | "Very Strong";
  crack_time: string;
  suggestions: string[];
}

export interface GeneratedPassword {
  password: string;
  strength: StrengthResult;
  entropy_bits: number;
}

// ── TOTP ──

export interface TotpConfig {
  secret: string;
  digits: number;
  period: number;
  algorithm: string;
  issuer?: string;
  account?: string;
}

export interface TotpCode {
  code: string;
  remaining_seconds: number;
  period: number;
}

// ── Audit ──

export interface AuditWarning {
  item_id: string;
  item_title: string;
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  recommendation: string;
}

export interface AuditReport {
  total_items: number;
  weak_passwords: AuditWarning[];
  reused_passwords: AuditWarning[];
  old_passwords: AuditWarning[];
  missing_2fa: AuditWarning[];
  breached_passwords: AuditWarning[];
  overall_score: number; // 0-100
}
