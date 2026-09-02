---
name: security-review
description: >-
  Use this skill when reviewing any pull request, code change, or feature
  that touches cryptographic code, IPC boundaries, or sensitive data handling
  in KobeanPass. Provides the complete security audit checklist.
---

# Security Review Checklist

## Pre-Review Setup

1. Read the diff carefully — focus on `core/`, `commands/`, and any file touching secrets.
2. Check `Cargo.toml` for new dependencies — audit each one.
3. Run `cd src-tauri && cargo clippy -- -D warnings` — must be clean.

## Cryptographic Code Review

| Check | Pass? |
|:---|:---|
| All nonces generated via `OsRng` (never deterministic or counter-based) | |
| XChaCha20-Poly1305 used (not raw ChaCha20 without authentication) | |
| AAD includes vault_id + record_id + schema_version | |
| Decryption errors are generic (`KobeanError::Decryption`) — no oracle info | |
| Argon2id parameters match spec (m=64MB, t=3, p=4, output=32B) | |
| Salt is 32 bytes from CSPRNG | |
| Key types derive `Zeroize + ZeroizeOnDrop` | |
| Intermediate keys (MK, KWK) zeroized after use | |
| No `Debug` or `Display` impl leaks key bytes | |
| No `Clone` on key types | |

## IPC Boundary Review

| Check | Pass? |
|:---|:---|
| Secrets returned only via `Result<T, KobeanError>`, never via events | |
| No `println!`, `dbg!`, `tracing::debug!` with secret values | |
| Commands that need vault access check `AppState` lock | |
| Input validation on all user-supplied strings (length limits, encoding) | |
| No `serde(default)` on security-critical fields | |

## Frontend Review

| Check | Pass? |
|:---|:---|
| No secrets in Zustand store | |
| No secrets in `console.log` or browser dev tools | |
| No secrets in `localStorage` / `sessionStorage` / `IndexedDB` | |
| Clipboard auto-clear timer active for all copy operations | |
| Password fields use `type="password"` by default | |
| Auto-re-mask passwords after 15 seconds | |

## Dependency Audit

```bash
cd src-tauri && cargo audit
```

- No known vulnerabilities in any dependency.
- New crate additions: check crates.io download count, last publish date, and maintainer reputation.
- Prefer crates from the `RustCrypto` organization for any crypto-adjacent functionality.

## Network Audit

| Check | Pass? |
|:---|:---|
| No fetch/XMLHttpRequest/reqwest calls unless feature-gated behind `hibp` | |
| HIBP check uses `Add-Padding: true` header | |
| HIBP sends only 5-char SHA-1 prefix (never full hash or password) | |
| No telemetry, analytics, or crash reporting endpoints | |
| No favicon fetches that leak domain names | |
