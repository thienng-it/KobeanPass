# KobeanPass — Multi-Phase Development Roadmap

> **Milestones, Dependencies, and Acceptance Criteria** for autonomous AI pair programming.

---

## 🎯 Phase 1: Cryptographic Core & Vault Engine (COMPLETE ✅)
*Target: Standalone, 100% test-covered Rust core library.*

- [x] **1.1 Project Scaffolding:** Tauri v2 + React 19 + TypeScript + Vite (`src-tauri` & `src`)
- [x] **1.2 Design System Tokens:** Tailwind CSS v4 OKLCH tokens, base typography (`JetBrains Mono` / `Inter`)
- [x] **1.3 Rust Dependencies:** Configured `Cargo.toml` (`argon2`, `chacha20poly1305`, `hkdf`, `zeroize`, `secrecy`, `rusqlite` bundled SQLCipher)
- [x] **1.4 Error Architecture:** `core/errors.rs` with `thiserror` `KobeanError`
- [x] **1.5 Memory Protection:** `core/memory.rs` (`ProtectedMemory`, `libc::mlock`, `ptrace(PT_DENY_ATTACH)`, `prctl(PR_SET_DUMPABLE, 0)`)
- [x] **1.6 Cryptographic Primitives:** `core/crypto.rs` (Argon2id KDF, HKDF domain separation, XChaCha20-Poly1305 AEAD, key wrapping, AAD)
- [x] **1.7 Crypto Unit Tests:** Round-trip encryption, tamper resistance, wrong password rejection, AAD binding (8/8 passing)
- [x] **1.8 Data Models:** `core/models.rs` (Login, Secure Note, Credit Card, Identity, API Token, SSH Key, WiFi, License)
- [x] **1.9 SQLCipher Store:** `core/store.rs` (Schema initialization, WAL mode, CRUD, search, item tags)
- [x] **1.10 Vault Lifecycle:** `core/vault.rs` (Create vault, open vault, lock vault, change master password, atomic file writes)
- [x] **1.11 Generator & TOTP:** `core/generator.rs` (zxcvbn + EFF Diceware) & `core/totp.rs` (RFC 6238 2FA engine)
- [x] **1.12 Vault Audit:** `core/audit.rs` (Weak/reused password detection, missing 2FA, old credentials)

---

## ⚡ Phase 2: Tauri IPC Bridge & Platform Integration (COMPLETE ✅)
*Target: Native desktop capabilities, auto-lock, clipboard security, and IPC handlers.*

- [x] **2.1 App State Machine:** `state.rs` (`Mutex<Option<VaultHandle>>` state machine with `NoVault | Locked | Unlocked | RateLimited`)
- [x] **2.2 IPC Command Handlers:** `commands/*.rs` (20 typed commands matching TypeScript wrappers in `src/lib/tauri.ts`)
- [x] **2.3 Secure Clipboard:** `core/clipboard.rs` (30-second generation-checked auto-clear)
- [x] **2.4 Keychain Bridge:** `core/keychain.rs` (OS Keychain via `keyring` crate)

---

## 🎨 Phase 3: 1Password-Grade React Desktop UI (COMPLETE ✅)
*Target: High-polish, split-pane desktop interface with zero AI slop.*

- [x] **3.1 Atomic UI Primitives:** `components/ui/` (Button, Input, Badge, Modal)
- [x] **3.2 First-Run Wizard:** `components/screens/WelcomeScreen.tsx` (Create vault wizard with real-time `zxcvbn` meter)
- [x] **3.3 Unlock Screen:** `components/screens/UnlockScreen.tsx` (Password + CapsLock warning + rate limit countdown)
- [x] **3.4 Three-Pane Layout:** `components/screens/MainScreen.tsx` (Sidebar + Category Filters + Search List + Item Detail)
- [x] **3.5 Item Detail View:** `components/vault/ItemDetailView.tsx` (Colorized password reveal, copy triggers, animated TOTP countdown ring)
- [x] **3.6 Form Handling:** `components/vault/ItemFormModal.tsx` (Create & Edit logins, secure notes, credit cards)
- [x] **3.7 Generator & Command Palette:** `components/generator/PasswordGeneratorModal.tsx` & `components/shared/CommandPalette.tsx` (⌘K fuzzy search)
- [x] **3.8 Security Audit Score:** Integrated real-time health score display in sidebar

---

## 🌐 Phase 4: Browser Extension & Native Messaging (Post-MVP)
*Target: Companion host binary and browser autofill.*

- [ ] **4.1 Companion Host Binary:** `kobeanpass-host` (Stdio JSON frame parser over native messaging protocol)
- [ ] **4.2 IPC Daemon Socket:** Unix Domain Socket / Windows Named Pipe connecting host binary to Tauri core
- [ ] **4.3 Manifest V3 Extension:** Chrome & Firefox extension popup + background service worker
- [ ] **4.4 Autofill Engine:** Form detection, credential injection, save-new-login prompt, TOTP auto-copy

---

## 📦 Phase 5: Hardening, Import/Export & Distribution (Post-MVP)
*Target: Production packaging, third-party imports, and code signing.*

- [ ] **5.1 Vault Exporters/Importers:** 1Password (`.1pux`), Bitwarden (`.json`), KeePass (`.kdbx`), CSV
- [ ] **5.2 Emergency Recovery PDF:** Printable emergency kit with QR code and encrypted recovery parameters
- [ ] **5.3 Code Signing & Notarization:** Apple Developer ID notarization, Windows Authenticode EV
- [ ] **5.4 Installers & Auto-Updater:** `.dmg`, `.msi`, `.AppImage`, `.deb` + Ed25519-signed updates
