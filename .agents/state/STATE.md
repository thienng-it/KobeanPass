# KobeanPass — Agent Session Memory & State (GSD / Beads Pattern)

> **Persistent External Memory**: Keeps AI agents aligned across context resets, preventing hallucinations and context rot.

## 📍 Current Phase: Phase 1 & 2 Complete $\rightarrow$ Advancing Phase 3 (UI Polish & Platform Integrations)

- **Status:** Core Crypto Engine + SQLCipher Storage + Full 3-Pane Desktop UI Complete
- **Rust Test Suite:** 8/8 Tests Passing (100% Green), Clippy Zero Warnings
- **TypeScript / Vite Build:** Clean build in 5.07s (0 Type Errors)

---

## 🧭 Active Task DAG

```
[Phase 1 & 2: Core, Storage & UI Scaffold]
  ├── [COMPLETED] T1.1: Scaffold Tauri v2 + React 19 + TypeScript + Vite
  ├── [COMPLETED] T1.2: Configure Tailwind CSS v4 OKLCH tokens & index.css
  ├── [COMPLETED] T1.3: Cargo.toml with RustCrypto + SQLCipher + Zeroize
  ├── [COMPLETED] T1.4: Implement core/errors.rs (thiserror KobeanError)
  ├── [COMPLETED] T1.5: Implement core/memory.rs (ProtectedMemory, mlock, anti-debug)
  ├── [COMPLETED] T1.6: Implement core/crypto.rs (Argon2id + HKDF + XChaCha20-Poly1305)
  ├── [COMPLETED] T1.7: Write crypto unit tests (round-trip + bit-flip tamper detection)
  ├── [COMPLETED] T1.8: Implement core/models.rs (Record types + ZeroizeOnDrop)
  ├── [COMPLETED] T1.9: Implement core/store.rs (SQLCipher schema & CRUD)
  ├── [COMPLETED] T1.10: Implement core/vault.rs (create, open, lock, change password)
  ├── [COMPLETED] T1.11: Implement core/generator.rs & core/totp.rs & core/audit.rs
  ├── [COMPLETED] T2.1: Implement 20 typed Tauri IPC command handlers
  ├── [COMPLETED] T3.1: Implement WelcomeScreen, UnlockScreen, and MainScreen
  ├── [COMPLETED] T3.2: Implement 3-pane layout, Password Generator, and Command Palette
  └── [READY] T3.3: Native system tray and biometric keychain integrations
```

---

## 🔒 Decisions Log (Immutable Invariants)

1. **Two-Layer Key Hierarchy:** `MasterPassword + Salt(32B)` $\rightarrow$ Argon2id $\rightarrow$ `Master Key (MK)` $\rightarrow$ HKDF-SHA256 $\rightarrow$ `KWK` $\rightarrow$ unwrap `VEK`. Changing master password re-wraps VEK in $O(1)$; records are never re-encrypted.
2. **Double Encryption:** SQLCipher (page-level AES-256-CBC + HMAC-SHA512) + per-record XChaCha20-Poly1305 (192-bit nonce) with AAD binding (`vault_id:record_id:schema_version`).
3. **Protected Memory:** `ProtectedMemory<T>` uses `libc::mlock` on Unix and `VirtualLock` on Windows to prevent OS paging to disk swap; explicit `Zeroize` on drop.
4. **No Secrets in UI State:** Zustand and localStorage hold zero secret bytes; decrypted values flow from typed `invoke()` returns directly into rendering components and clear on lock.
5. **Ponytail 7-Step Gate:** No third-party dependency added without verifying it cannot be implemented with std/existing crates in $\le 10$ lines.
