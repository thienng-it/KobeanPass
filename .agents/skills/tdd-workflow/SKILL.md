---
name: tdd-workflow
description: >-
  Use this skill when implementing new features or fixing bugs in KobeanPass.
  Enforces the Test-Driven Development workflow: write failing test first, then
  implement minimum code to pass, then refactor. Inspired by the superpowers
  repo methodology.
---

# Test-Driven Development Workflow

*Based on [superpowers](https://github.com/obra/superpowers) methodology.*

## The Iron Rule

> **Never write implementation code without a failing test first.**

## Workflow: Red → Green → Refactor

### Step 1: RED — Write a Failing Test

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encrypt_decrypt_roundtrip() {
        let vk = generate_vault_key();
        let plaintext = b"hunter2";
        let aad = b"vault1:item1:1";

        let encrypted = encrypt_record(&vk, plaintext, aad).unwrap();
        let decrypted = decrypt_record(&vk, &encrypted, aad).unwrap();

        assert_eq!(decrypted, plaintext);
    }
}
```

Run it — confirm it fails:
```bash
cd src-tauri && cargo test test_encrypt_decrypt_roundtrip
```

### Step 2: GREEN — Write Minimum Code to Pass

Implement only enough code to make the test pass. No extra features.

Run it — confirm it passes:
```bash
cd src-tauri && cargo test test_encrypt_decrypt_roundtrip
```

### Step 3: REFACTOR — Clean Up

- Remove duplication
- Improve naming
- Extract helpers
- Run ALL tests to ensure nothing broke:
```bash
cd src-tauri && cargo test
```

## Test Categories

### Crypto Tests (MANDATORY for all crypto functions)
- **Round-trip**: encrypt → decrypt → compare original
- **Tamper detection**: flip one ciphertext byte → decryption MUST fail
- **Wrong key**: decrypt with different key → MUST fail
- **AAD binding**: encrypt with AAD₁, decrypt with AAD₂ → MUST fail
- **Determinism**: same input + same key + different nonce → different ciphertext

### Vault Tests
- Create → open → lock → reopen
- Wrong password → `KobeanError::Decryption`
- Password change → old fails, new works

### Frontend Tests (Vitest)
```typescript
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

describe('PasswordStrengthBar', () => {
  it('renders correct label for strong password', () => {
    render(<PasswordStrengthBar score={3} />);
    expect(screen.getByText('Strong')).toBeInTheDocument();
  });
});
```

## When to Skip TDD

- Pure UI layout changes (visual only, no logic)
- Config file changes
- Documentation updates

## When TDD is MANDATORY

- Any function in `core/` (crypto, vault, store, generator, totp, audit)
- Any bug fix (write a test that reproduces the bug first)
- Any IPC command that handles vault state transitions
