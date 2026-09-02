import { invoke } from "@tauri-apps/api/core";
import type {
  AppStatus,
  VaultInfo,
  FolderInfo,
  ItemSummary,
  DecryptedItem,
  VaultRecordPayload,
  PasswordOptions,
  PassphraseOptions,
  GeneratedPassword,
  StrengthResult,
  TotpCode,
  TotpConfig,
  AuditReport,
} from "./types";

// ============================================================================
// Typed Tauri IPC Wrappers
// ============================================================================

// ── Vault Lifecycle ──

export async function getAppStatus(): Promise<AppStatus> {
  return invoke<AppStatus>("cmd_get_app_status");
}

export async function createVault(
  path: string,
  name: string,
  password: string
): Promise<VaultInfo> {
  return invoke<VaultInfo>("cmd_create_vault", { path, name, password });
}

export async function openVault(
  path: string,
  password: string
): Promise<VaultInfo> {
  return invoke<VaultInfo>("cmd_open_vault", { path, password });
}

export async function biometricUnlock(): Promise<VaultInfo> {
  return invoke<VaultInfo>("cmd_biometric_unlock");
}

export async function lockVault(): Promise<void> {
  return invoke<void>("cmd_lock_vault");
}

export async function changeMasterPassword(
  oldPassword: string,
  newPassword: string
): Promise<void> {
  return invoke<void>("cmd_change_password", {
    oldPassword,
    newPassword,
  });
}

export async function saveKeychainSecret(
  key: string,
  secret: string
): Promise<void> {
  return invoke<void>("cmd_save_keychain_secret", { key, secret });
}

export async function getKeychainSecret(key: string): Promise<string> {
  return invoke<string>("cmd_get_keychain_secret", { key });
}

export async function deleteKeychainSecret(key: string): Promise<void> {
  return invoke<void>("cmd_delete_keychain_secret", { key });
}

// ── Item CRUD ──

export async function listItems(
  filterType?: string,
  tag?: string
): Promise<ItemSummary[]> {
  return invoke<ItemSummary[]>("cmd_list_items", { filterType, tag });
}

export async function searchItems(query: string): Promise<ItemSummary[]> {
  return invoke<ItemSummary[]>("cmd_search_items", { query });
}

export async function getItem(id: string): Promise<DecryptedItem> {
  return invoke<DecryptedItem>("cmd_get_item", { id });
}

export async function createItem(
  title: string,
  itemType: string,
  payload: VaultRecordPayload,
  tags: string[] = []
): Promise<ItemSummary> {
  return invoke<ItemSummary>("cmd_create_item", {
    title,
    itemType,
    payload,
    tags,
  });
}

export async function updateItem(
  id: string,
  title: string,
  payload: VaultRecordPayload,
  tags: string[] = []
): Promise<ItemSummary> {
  return invoke<ItemSummary>("cmd_update_item", {
    id,
    title,
    payload,
    tags,
  });
}

export async function deleteItem(id: string): Promise<void> {
  return invoke<void>("cmd_delete_item", { id });
}

export async function toggleFavorite(id: string): Promise<boolean> {
  return invoke<boolean>("cmd_toggle_favorite", { id });
}

export async function trashItem(id: string): Promise<void> {
  return invoke<void>("cmd_trash_item", { id });
}

export async function restoreItem(id: string): Promise<void> {
  return invoke<void>("cmd_restore_item", { id });
}

// ── Folders / Projects ──

export async function listFolders(): Promise<FolderInfo[]> {
  return invoke<FolderInfo[]>("cmd_list_folders");
}

export async function createFolder(name: string): Promise<void> {
  return invoke<void>("cmd_create_folder", { name });
}

export async function renameFolder(oldName: string, newName: string): Promise<void> {
  return invoke<void>("cmd_rename_folder", { oldName, newName });
}

export async function deleteFolder(name: string): Promise<void> {
  return invoke<void>("cmd_delete_folder", { name });
}

export async function moveItemToFolder(
  id: string,
  folder: string | null
): Promise<void> {
  return invoke<void>("cmd_move_item_to_folder", { id, folder });
}

// ── Password Generation & Security ──

export async function generatePassword(
  options: PasswordOptions
): Promise<GeneratedPassword> {
  return invoke<GeneratedPassword>("cmd_generate_password", { options });
}

export async function generatePassphrase(
  options: PassphraseOptions
): Promise<GeneratedPassword> {
  return invoke<GeneratedPassword>("cmd_generate_passphrase", { options });
}

export async function checkPasswordStrength(
  password: string
): Promise<StrengthResult> {
  return invoke<StrengthResult>("cmd_check_strength", { password });
}

// ── TOTP & Audit ──

export async function getTotpCode(itemId: string): Promise<TotpCode> {
  return invoke<TotpCode>("cmd_get_totp_code", { itemId });
}

export async function getTotpQr(itemId: string): Promise<string> {
  return invoke<string>("cmd_get_totp_qr", { itemId });
}

export async function generateTotpQr(config: TotpConfig): Promise<string> {
  return invoke<string>("cmd_generate_totp_qr", { config });
}

export async function parseTotpUri(uri: string): Promise<TotpConfig> {
  return invoke<TotpConfig>("cmd_parse_totp_uri", { uri });
}

export async function runVaultAudit(): Promise<AuditReport> {
  return invoke<AuditReport>("cmd_run_audit");
}

// ── Secure Clipboard ──

export async function copySecure(
  text: string,
  timeoutSecs: number = 30
): Promise<void> {
  return invoke<void>("cmd_copy_secure", { text, timeoutSecs });
}
