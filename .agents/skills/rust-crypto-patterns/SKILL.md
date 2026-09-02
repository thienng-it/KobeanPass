---
name: rust-crypto-patterns
description: >-
  Use this skill when implementing or modifying any cryptographic code in
  src-tauri/src/core/crypto.rs, core/memory.rs, or core/vault.rs. Covers
  the exact key hierarchy, AEAD patterns, memory protection, and security
  review checklist for KobeanPass.
---

# Rust Cryptographic Patterns for KobeanPass

## Key Hierarchy (MUST follow exactly)

```
MasterPassword + Salt(32B) → Argon2id(m=64MB,t=3,p=4) → MK(256-bit)
    ├── HKDF-SHA256(MK, info="kobean-kwrap") → KWK(256-bit)
    ├── HKDF-SHA256(MK, info="kobean-auth")  → AuthKey(256-bit)
    └── Zeroize MK immediately after deriving KWK + AuthKey

KWK + WrappedVEK → XChaCha20-Poly1305.decrypt → VEK(256-bit)
    └── Zeroize KWK immediately after unwrapping VEK

VEK → SQLCipher DB key + per-record encryption key
    └── VEK lives in mlock'd ProtectedMemory until vault locks
```

## AEAD Encryption Template

```rust
use chacha20poly1305::{aead::{Aead, KeyInit, Payload}, Key, XChaCha20Poly1305, XNonce};
use rand::rngs::OsRng;
use rand::RngCore;

pub fn encrypt_record(vk: &VaultKey, plaintext: &[u8], aad: &[u8]) -> Result<Vec<u8>, KobeanError> {
    let cipher = XChaCha20Poly1305::new(Key::from_slice(&vk.0));
    let mut nonce_bytes = [0u8; 24];
    OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = XNonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, Payload { msg: plaintext, aad })
        .map_err(|_| KobeanError::Encryption("XChaCha20-Poly1305 encrypt failed".into()))?;

    // Output format: [nonce(24B) | ciphertext+tag]
    let mut output = Vec::with_capacity(24 + ciphertext.len());
    output.extend_from_slice(&nonce_bytes);
    output.extend_from_slice(&ciphertext);
    Ok(output)
}
```

## AAD Construction (MANDATORY for all encryption)

```rust
fn build_aad(vault_id: &str, record_id: &str, schema_version: u32) -> Vec<u8> {
    format!("{}:{}:{}", vault_id, record_id, schema_version).into_bytes()
}
```

This prevents encrypted blob swapping between records or vaults.

## Memory Protection Checklist

- [ ] Key type derives `Zeroize, ZeroizeOnDrop`
- [ ] Key wrapped in `secrecy::Secret` or `ProtectedMemory`
- [ ] Buffer pinned with `mlock()` on Unix / `VirtualLock()` on Windows
- [ ] Parent keys zeroized immediately after deriving child keys
- [ ] No `Debug` or `Display` impl that could leak key bytes
- [ ] No `Clone` on key types (prevents accidental copies)

## Security Review Checklist (Before Merging ANY Crypto Change)

1. Are all nonces generated via `OsRng` (CSPRNG)?
2. Is AAD included in every encrypt/decrypt call?
3. Are decryption errors generic (no oracle information leakage)?
4. Are all intermediate keys zeroized after use?
5. Do round-trip tests exist (encrypt → decrypt → compare)?
6. Do tamper tests exist (flip bit → decryption fails)?
7. Is `cargo clippy -- -D warnings` clean?
