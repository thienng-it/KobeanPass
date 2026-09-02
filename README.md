<div align="center">

# 🛡️ KobeanPass

**Local-first, zero-knowledge, double-encrypted password manager for security purists.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![Tauri](https://img.shields.io/badge/Tauri-v2.x-24C8D8?style=flat-square&logo=tauri&logoColor=white)](https://tauri.app)
[![Rust](https://img.shields.io/badge/Rust-2021%20Edition-DEA584?style=flat-square&logo=rust&logoColor=white)](https://www.rust-lang.org)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.0-38BDF8?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![SQLCipher](https://img.shields.io/badge/Storage-SQLCipher_AES--256-4E9F3D?style=flat-square&logo=sqlite&logoColor=white)](https://www.zetetic.net/sqlcipher/)
[![Zeroize](https://img.shields.io/badge/Memory-ZeroizeOnDrop-E056FD?style=flat-square)](https://crates.io/crates/zeroize)

<p align="center">
  <a href="https://thienng-it.github.io/KobeanPass/"><strong>Explore Documentation & Interactive Demo »</strong></a>
  <br />
  <br />
  <a href="#-key-features">Key Features</a> •
  <a href="#-cryptographic-architecture">Crypto Architecture</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-security-invariants">Security Model</a> •
  <a href="#-tech-stack">Tech Stack</a>
</p>

---

</div>

## 🌟 Overview

**KobeanPass** is a modern desktop password manager engineered from the ground up for privacy, speed, and defense-in-depth security. Built natively with **Rust (Tauri v2)** and a lightning-fast **React 19 + Tailwind CSS v4** interface, your credentials never touch the cloud, third-party analytics, or unencrypted storage.

Every credential in KobeanPass undergoes **double-envelope encryption**: record payloads are encrypted with authenticated **XChaCha20-Poly1305** using a unique nonce and AAD (*Additional Authenticated Data*), then stored within a **SQLCipher AES-256-CBC** page-level encrypted database.

---

## ✨ Key Features

| Feature | Description |
|:---|:---|
| 🔐 **Zero-Knowledge Architecture** | Encryption keys are derived purely on-device from your Master Password via Argon2id. No master passwords or plaintext secrets are ever persisted or transmitted. |
| 🛡️ **Double-Layer Encryption** | Page-level SQLCipher (AES-256-CBC with HMAC-SHA512) **plus** individual record-level XChaCha20-Poly1305 AEAD with AAD tamper verification. |
| 🧠 **In-Memory Zeroization** | All sensitive cryptographic keys, intermediate buffers, and decrypted payloads implement `Zeroize + ZeroizeOnDrop`, wiping memory immediately when dropped. |
| ⏱️ **Integrated 2FA / TOTP Authenticator** | Full RFC 6238 & RFC 4226 TOTP support (SHA-1, SHA-256, SHA-512) with real-time countdown progress rings, drift tolerance, and QR code import/export. |
| 🎲 **Smart Entropy Password Generator** | Generate high-entropy passwords, Diceware passphrases, and pronounceable secrets with real-time Shannon entropy and crack-time metrics. |
| 🔍 **Vault Health & Breach Auditing** | Identifies weak, reused, and stale credentials locally. Optional opt-in Have I Been Pwned (HIBP) check using **k-anonymity** (5-char SHA-1 hash prefix). |
| ⚡ **Keyboard-First Command Palette** | Instant navigation and search via `Cmd+K` / `Ctrl+K` with tag filtering, favorites, folders, and rapid copy actions. |
| 📋 **Smart Clipboard Auto-Purge** | Decrypted credentials copied to the clipboard are automatically erased after a configurable timeout (default 30s) to prevent memory harvesting. |
| 🌐 **100% Offline & Local-First** | Zero telemetry, zero cloud dependencies, zero external servers. Your vault belongs entirely to you. |

---

## 🔒 Cryptographic Architecture

KobeanPass adheres to a multi-stage cryptographic pipeline following the latest industry standards:

```
[ Master Password ] + [ 32-byte CSPRNG Salt ]
         │
         ▼
 ┌───────────────────────────────────────────────┐
 │   Argon2id KDF (64 MiB RAM, 3 iter, 4 lanes)  │
 └───────────────────────────────────────────────┘
         │
         ▼
   [ Master Key (MK) ] (32 bytes)
         │
    HKDF-SHA256
    ├── Expand("kobean-kwrap") ──► [ Key Wrapping Key (KWK) ]
    └── Expand("kobean-auth")  ──► [ Auth Key (HMAC verification) ]
                                            │
                                            ▼
[ 256-bit CSPRNG Vault Encryption Key (VEK) ] ◄── Encrypted by KWK (XChaCha20-Poly1305)
         │
         ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ Record Encryption (XChaCha20-Poly1305)                      │
 │ Nonce: 24-byte CSPRNG XNonce                                │
 │ AAD:   vault_id || item_id || schema_version                │
 └─────────────────────────────────────────────────────────────┘
         │
         ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ Storage: SQLCipher (AES-256-CBC + HMAC-SHA512 per page)     │
 └─────────────────────────────────────────────────────────────┘
```

### Key Hierarchy Highlights
1. **Master Key (MK)**: Derived via `Argon2id` using memory-hard parameters (64 MiB, 3 passes, 4 threads).
2. **Key Wrapping Key (KWK)**: Derived via `HKDF-Expand-SHA256` with info string `kobean-kwrap`.
3. **Auth Key**: Derived via `HKDF-Expand-SHA256` with info string `kobean-auth` for fast master key validation without trial decryptions.
4. **Vault Encryption Key (VEK)**: Independent 256-bit CSPRNG key wrapped by the KWK. Changing the master password only re-wraps the VEK without needing to re-encrypt every single vault item.
5. **AAD Tamper Defense**: Every encrypted payload binds `vault_id + record_id + schema_version` into the Poly1305 MAC to prevent ciphertext transplant attacks.

---

## 🚀 Quick Start

### Prerequisites
- **Node.js**: `v20+` & **pnpm**: `v9+`
- **Rust**: `1.78+` (with `cargo`)
- **Tauri Prerequisites**: Follow the [Tauri v2 OS Prerequisites Guide](https://v2.tauri.app/start/prerequisites/) for macOS, Linux, or Windows.

### Installation & Development

```bash
# 1. Clone the repository
git clone https://github.com/thienng-it/KobeanPass.git
cd KobeanPass

# 2. Install frontend dependencies
pnpm install

# 3. Launch local development environment (Tauri v2 + Vite + React 19)
pnpm tauri dev
```

### Available Scripts

```bash
# Run frontend dev server only
pnpm dev

# Run frontend test suite (Vitest)
pnpm test

# Run Rust unit & crypto tests
cd src-tauri && cargo test

# Run Rust linter with strict warning enforcement
cd src-tauri && cargo clippy -- -D warnings

# Build production desktop installer
pnpm tauri build
```

---

## 🛡️ Security Invariants

The KobeanPass codebase is governed by strict rules designed to eliminate entire classes of vulnerabilities:

1. **Zero Secret Logging**: Secrets, master keys, VEKs, and passwords are never formatted in logs, debug prints, or telemetry.
2. **IPC Boundary Discipline**: Secrets never traverse Tauri event streams. Sensitive payloads pass exclusively as typed return values of synchronous/async command invocations.
3. **Memory Hardening**: All cryptographic keys and sensitive buffers implement `Zeroize + ZeroizeOnDrop`.
4. **Double Encryption**: SQLCipher page encryption and per-record XChaCha20-Poly1305 with AAD are mandatory.
5. **Zero Web Storage Secrets**: Secrets are never saved in Zustand, localStorage, sessionStorage, or IndexedDB.
6. **No Unsafe Code**: The Rust backend prohibits `unsafe` unless audited and approved with safety proofs.
7. **Offline Guarantee**: No network connections are permitted by default. The HIBP breach check is strictly opt-in and uses k-anonymity (5-char SHA-1 hash prefix).

---

## 🏗️ Tech Stack

```
KobeanPass/
├── src/                     # React 19 + TypeScript Frontend
│   ├── components/          # Modular UI components (Tailwind v4)
│   │   ├── folders/         # Vault folder & tag management
│   │   ├── generator/       # Password & Passphrase Generator
│   │   ├── screens/         # Setup, Unlock, Vault & Audit views
│   │   ├── settings/        # Security preferences & export/import
│   │   ├── shared/          # Shared modal, toast & utility dialogs
│   │   ├── ui/              # Atom components (buttons, badges, inputs)
│   │   └── vault/           # Item list, detail inspector & TOTP cards
│   ├── lib/                 # Typed Tauri IPC client, QR parser, utils
│   └── stores/              # Zustand UI state (active tab, search query)
└── src-tauri/               # Tauri v2 + Rust Core Engine
    └── src/
        ├── commands/        # Typed IPC command handlers & guards
        └── core/            # Cryptographic engine, SQLCipher store, TOTP & audit
```

| Layer | Technology | Purpose |
|:---|:---|:---|
| **Desktop Runtime** | [Tauri v2](https://tauri.app) | Secure, lightweight native webview wrapper with Rust backend |
| **Backend Engine** | [Rust](https://www.rust-lang.org) | Memory-safe crypto, file I/O, SQLCipher interface & system hooks |
| **Frontend Framework** | [React 19](https://react.dev) | Fast declarative UI with strict type safety |
| **Type System** | [TypeScript 5.7](https://www.typescriptlang.org) | End-to-end typed IPC bindings & component contracts |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com) | Modern CSS-first design tokens with native dark-first theme |
| **Crypto Primitives** | [RustCrypto](https://github.com/RustCrypto) | Audited implementations of `argon2`, `chacha20poly1305`, `hkdf`, `sha2` |
| **Encrypted Database** | [SQLCipher](https://www.zetetic.net/sqlcipher/) via `rusqlite` | AES-256-CBC page-level encrypted local storage |
| **Command Palette** | [cmdk](https://cmdk.paco.me) | Fast keyboard-accessible command menu |
| **Iconography** | [Lucide React](https://lucide.dev) | Crisp, modern SVG icons |

---

## 📖 Documentation & GitHub Pages

Detailed guides, interactive crypto pipeline demos, and security whitepapers are available at our GitHub Pages site:

👉 **[https://thienng-it.github.io/KobeanPass/](https://thienng-it.github.io/KobeanPass/)**

---

## 🤝 Contributing

We welcome contributions from security researchers, Rustaceans, and frontend enthusiasts!

1. Fork the repository
2. Create your feature branch (`git checkout -b feat/my-cool-feature`)
3. Ensure all tests and lints pass (`cargo test` and `pnpm test`)
4. Commit your changes with conventional commits (`git commit -m "feat(crypto): add custom wordlist support"`)
5. Push to your branch and open a Pull Request

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for details.

<div align="center">
  <sub>Crafted with passion for absolute privacy and digital sovereignty.</sub>
  <br />
  <sub>Joseph Thien ❤️ kobenguyent</sub>
</div>
