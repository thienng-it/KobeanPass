# KobeanPass — AI Agent Instructions

> Local-first, zero-knowledge password manager. Rust + Tauri v2 + React 19 + TypeScript + Tailwind CSS v4.

## Tech Stack (Do Not Deviate)

| Layer | Technology | Version |
|:---|:---|:---|
| Desktop Engine | Tauri v2 | 2.x |
| Backend | Rust | 2021 edition |
| Frontend | React 19 + TypeScript 5.5+ | strict mode |
| Styling | Tailwind CSS v4 (CSS-first, `@theme`) | 4.x |
| State | Zustand 5 (UI only — **NEVER store secrets**) | 5.x |
| Forms | react-hook-form + zod | 7.x / 3.x |
| Crypto | RustCrypto (argon2, chacha20poly1305, hkdf) | audited |
| Storage | SQLCipher via rusqlite (bundled-sqlcipher) | 0.33+ |
| Icons | Lucide React | latest |

## Dev Commands

```bash
# Install dependencies
pnpm install

# Dev server (frontend + Tauri)
pnpm tauri dev

# Build production
pnpm tauri build

# Rust tests
cd src-tauri && cargo test

# Frontend tests
pnpm test

# Rust lint
cd src-tauri && cargo clippy -- -D warnings

# Dependency audit
cd src-tauri && cargo audit
```

## Security Boundaries (ABSOLUTE — Never Violate)

1. **NEVER** log, print, or debug-format any secret (passwords, keys, tokens, VEK, MK, KWK).
2. **NEVER** pass secrets through Tauri event emitters — use only typed `#[tauri::command]` returns.
3. **NEVER** store secrets in Zustand, localStorage, sessionStorage, or any JS-accessible state.
4. **NEVER** use `unsafe` in Rust without explicit founder approval and a safety comment.
5. **NEVER** implement custom cryptographic algorithms — use only RustCrypto crates.
6. **NEVER** use `unwrap()` or `expect()` in production paths — use `?` with `thiserror` errors.
7. **NEVER** make network calls unless the user explicitly opted in (HIBP check only).
8. **NEVER** disable SQLCipher encryption or bypass the key derivation pipeline.
9. **ALL** key material must use `Zeroize + ZeroizeOnDrop` — no exceptions.
10. **ALL** encrypted payloads must include AAD (vault_id + record_id + schema_version).

## The 7-Step Decision Ladder (Before Writing ANY Code)

*Inspired by [ponytail](https://github.com/DietrichGebert/ponytail) — "The best code is code you never wrote."*

1. **Does this need to exist at all?** → If not, stop.
2. **Is it already in this codebase?** → Reuse existing module/function.
3. **Does the Rust std library or Web API provide it?** → Use the standard.
4. **Does Tauri's plugin ecosystem cover it?** → Use official Tauri plugin.
5. **Can an existing dependency do it?** → Use what's in `Cargo.toml` / `package.json`.
6. **Can it be written in ≤10 lines?** → Write inline, no new module.
7. **Only then:** Create a new module with tests. **Never add a dependency without founder approval.**

## Code Style

### Rust (`src-tauri/`)
- Follow `cargo clippy` with `-D warnings` (zero warnings policy).
- Use `thiserror` for all error types. Never use `String` as error type.
- All public functions must have `///` doc comments.
- Prefer `Result<T, KobeanError>` over `Option<T>` when failure is meaningful.
- Group imports: std → external crates → internal modules.
- Max line length: 100 chars (soft limit).

### TypeScript (`src/`)
- Strict mode (`"strict": true` in tsconfig).
- Prefer `const` → `let`. Never use `var`.
- Use `interface` for object shapes, `type` for unions/intersections.
- All component props must have explicit TypeScript interfaces.
- Use named exports. No default exports (except pages if required by framework).
- File naming: `PascalCase.tsx` for components, `camelCase.ts` for utilities.

### Tailwind CSS v4
- Use design tokens from `index.css` `@theme` block — never hardcode colors.
- Use `bg-surface-*`, `text-text-*`, `border-border-*` semantic classes.
- Responsive: mobile-first (`sm:`, `md:`, `lg:`).
- Prefer Tailwind utilities. Extract to CSS `@apply` only for 5+ repeated utility chains.

## Git Conventions

- **Commits:** `type(scope): message` (e.g., `feat(crypto): implement Argon2id KDF`)
- **Types:** `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `security`
- **Atomic commits:** One logical change per commit. Never mix features.
- **Test before commit:** `cargo test` and `pnpm test` must pass.

## Architecture Invariants

- **All crypto** lives in `src-tauri/src/core/` — never in `commands/` or frontend.
- **IPC boundary:** Frontend calls `invoke<T>('cmd_name', args)` → Rust returns typed result. Secrets cross this boundary only as return values, never as events.
- **State machine:** Vault is always in one of: `NoVault | Locked | Unlocked | RateLimited`. Guard all IPC commands accordingly.
- **Double encryption:** SQLCipher (page-level) + per-record XChaCha20-Poly1305. Both are mandatory.

## Agent Workflow

1. **Understand** the task fully before writing code. Ask clarifying questions.
2. **Check** existing code first (`grep_search`, `find_by_name`). Never duplicate.
3. **Plan** changes before implementing. For >3 files, create a brief plan.
4. **Test** every change. Write tests for new Rust functions. Run `cargo test`.
5. **Review** your own diff. Does it follow the security boundaries above?
6. **Commit** atomically with conventional commit messages.
