---
name: vault-record-type
description: >-
  Use this skill when adding a new vault record type (e.g., wifi, passport,
  crypto wallet) to KobeanPass. Covers the exact changes needed across Rust
  models, store schema, IPC commands, TypeScript types, and UI form components.
---

# Adding a New Vault Record Type

## Files to Modify (Checklist)

- [ ] `core/models.rs` — Add Rust struct + extend `VaultRecord` enum
- [ ] `core/store.rs` — Add item_type string constant
- [ ] `src/lib/types.ts` — Add TypeScript interface + extend union
- [ ] `src/components/vault/ItemForm.tsx` — Add form fields for new type
- [ ] `src/components/vault/ItemDetail.tsx` — Add display section for new type
- [ ] `src/components/layout/Sidebar.tsx` — Add category entry with icon

## Step 1: Rust Model (`core/models.rs`)

```rust
/// Encrypted payload for [YourType] records
#[derive(Debug, Serialize, Deserialize, Clone, Zeroize, ZeroizeOnDrop)]
pub struct YourTypePayload {
    pub field1: String,
    pub field2: String,
    #[serde(default)]
    pub notes: String,
    #[serde(default)]
    pub custom_fields: Vec<CustomField>,
}
```

Then add to the `VaultRecord` enum:

```rust
pub enum VaultRecord {
    Login(LoginPayload),
    SecureNote(SecureNotePayload),
    CreditCard(CreditCardPayload),
    // ... existing types
    YourType(YourTypePayload),  // ← Add here
}
```

## Step 2: Store Constant (`core/store.rs`)

Add the `item_type` string used in SQLite:

```rust
// In the match for serialization/deserialization:
"your_type" => VaultRecord::YourType(serde_json::from_slice(&decrypted)?),
```

## Step 3: TypeScript Interface (`src/lib/types.ts`)

```typescript
export interface YourTypePayload {
  field1: string;
  field2: string;
  notes: string;
  custom_fields: CustomField[];
}

// Add to the discriminated union:
export type VaultRecordPayload =
  | { type: 'login'; data: LoginPayload }
  | { type: 'your_type'; data: YourTypePayload }
  // ...
```

## Step 4: Form Component

Add a case to `ItemForm.tsx` that renders the appropriate fields with `react-hook-form` + `zod` validation.

## Step 5: Sidebar Category

Add an entry in `Sidebar.tsx` categories array with a Lucide icon:

```typescript
{ type: 'your_type', label: 'Your Type', icon: SomeIcon }
```

## Conventions

- `item_type` string: `snake_case`, singular (e.g., `credit_card`, `ssh_key`)
- Payload struct name: `PascalCase` + `Payload` suffix
- All string fields that hold secrets: mark in comments for sensitive handling
- Always include `notes: String` and `custom_fields: Vec<CustomField>`
