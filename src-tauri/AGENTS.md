# Rust Backend — Agent Rules

> These rules apply to ALL files within `src-tauri/`. They supplement the root `AGENTS.md`.

## Memory Safety & Cryptographic Hygiene

- Every `[u8; 32]` key type MUST derive `Zeroize, ZeroizeOnDrop`.
- Wrap all key material in `secrecy::Secret<T>` or `ProtectedMemory<T>`.
- Use `mlock()` for any buffer holding VEK, MK, or KWK.
- After deriving a sub-key (KWK from MK), zeroize the parent key immediately.
- Never return raw key bytes across the IPC boundary.

## Error Handling Contract

```rust
// ✅ Correct — typed error with thiserror
pub fn unlock(pw: &str) -> Result<VaultInfo, KobeanError> { ... }

// ❌ Wrong — String error, no type safety
pub fn unlock(pw: &str) -> Result<VaultInfo, String> { ... }

// ❌ Wrong — unwrap in production code
let key = derive_key(pw).unwrap();
```

## Tauri IPC Command Pattern

Every command handler in `commands/` must follow this exact pattern:

```rust
#[tauri::command]
pub async fn cmd_example(
    arg1: String,
    state: State<'_, AppState>,
) -> Result<ResponseType, KobeanError> {
    // 1. Acquire vault lock
    let vault = state.vault_handle.lock().map_err(|_| KobeanError::VaultLocked)?;
    let handle = vault.as_ref().ok_or(KobeanError::VaultLocked)?;

    // 2. Call core logic (never inline crypto here)
    let result = core::some_operation(handle, &arg1)?;

    // 3. Return typed result (never log secrets)
    Ok(result)
}
```

## Module Boundaries

| Module | Responsibility | Dependencies |
|:---|:---|:---|
| `core/crypto.rs` | KDF, encrypt, decrypt, key wrap | RustCrypto only |
| `core/memory.rs` | mlock, guard pages, anti-debug | libc/winapi |
| `core/vault.rs` | Vault lifecycle | crypto, memory, store |
| `core/store.rs` | SQLCipher CRUD | rusqlite |
| `core/models.rs` | Data structures | serde |
| `commands/*.rs` | IPC handlers | core (read-only calls) |

Commands NEVER contain business logic. They are thin wrappers around `core/`.

## Testing Requirements

- Every public function in `core/` MUST have at least one unit test.
- Crypto functions MUST have round-trip tests AND tamper-detection tests.
- Use `#[cfg(test)]` modules at bottom of each file.
- Test names: `test_<function>_<scenario>` (e.g., `test_encrypt_decrypt_roundtrip`).
