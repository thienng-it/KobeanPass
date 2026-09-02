---
name: tauri-ipc-command
description: >-
  Use this skill when adding a new Tauri IPC command to KobeanPass. Covers
  the exact file-by-file checklist: Rust command handler, state guard,
  TypeScript typed wrapper, frontend hook integration, and capability
  permissions.
---

# Adding a New Tauri IPC Command

## Step-by-Step Checklist

### 1. Define the Response Type (`core/models.rs`)

```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct MyResponse {
    pub id: String,
    pub data: String,
}
```

### 2. Implement Core Logic (`core/<module>.rs`)

Business logic lives in `core/` — never in `commands/`.

```rust
pub fn my_core_operation(handle: &VaultHandle, input: &str) -> Result<MyResponse, KobeanError> {
    // Implementation here
}
```

### 3. Create Command Handler (`commands/<module>_commands.rs`)

```rust
#[tauri::command]
pub async fn cmd_my_operation(
    input: String,
    state: State<'_, AppState>,
) -> Result<MyResponse, KobeanError> {
    let guard = state.vault_handle.lock().map_err(|_| KobeanError::VaultLocked)?;
    let handle = guard.as_ref().ok_or(KobeanError::VaultLocked)?;
    core::my_module::my_core_operation(handle, &input)
}
```

### 4. Register in `lib.rs`

Add to `tauri::generate_handler![]`:

```rust
.invoke_handler(tauri::generate_handler![
    // ... existing commands
    commands::my_commands::cmd_my_operation,  // ← Add here
])
```

### 5. Add TypeScript Wrapper (`src/lib/tauri.ts`)

```typescript
export async function myOperation(input: string): Promise<MyResponse> {
  return invoke<MyResponse>('cmd_my_operation', { input });
}
```

### 6. Add TypeScript Type (`src/lib/types.ts`)

```typescript
export interface MyResponse {
  id: string;
  data: string;
}
```

### 7. Update Capabilities if Needed (`src-tauri/capabilities/default.json`)

Custom commands registered via `generate_handler!` are allowed by default for windows listed in the capability. Only add explicit permissions for Tauri plugin commands.

## Naming Convention

- Rust command function: `cmd_<verb>_<noun>` (e.g., `cmd_create_item`)
- TypeScript wrapper: `<verbNoun>` camelCase (e.g., `createItem`)
- Always prefix Rust commands with `cmd_` to distinguish from core functions.

## Security Guard Pattern

Commands that require an unlocked vault MUST check state:

```rust
let guard = state.vault_handle.lock().map_err(|_| KobeanError::VaultLocked)?;
let handle = guard.as_ref().ok_or(KobeanError::VaultLocked)?;
```

Commands that work without vault (e.g., `cmd_generate_password`) skip the guard.
