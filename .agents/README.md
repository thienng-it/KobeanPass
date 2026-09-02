# KobeanPass — AI Agent Harness & Vibe Coding Framework

> **The Sovereign Developer Experience**: How AI agents and human pair-programmers build KobeanPass with zero token waste, strict security boundaries, and high visual taste.

---

## 🏛️ Directory Architecture

```
.agents/
├── hooks.json                     # Lifecycle hooks (safety gates, secret scanners, token guards)
├── skills.json                    # Skills registry for progressive disclosure
├── scripts/                       # Executable lifecycle scripts
│   ├── safety-check.sh            # PreToolUse: Blocks destructive commands & secret leaks
│   ├── secret-scanner.sh          # PostToolUse: betterleaks-inspired secret detection
│   └── context-guard.sh           # PreInvocation: Token efficiency & security prompt injection
├── skills/                        # Modular, on-demand agent runbooks (SKILL.md)
│   ├── rust-crypto-patterns/      # Key hierarchy, AEAD templates, memory protection
│   ├── tauri-ipc-command/         # Full-stack IPC command checklist
│   ├── vault-record-type/         # Adding new credential types across Rust & React
│   ├── ui-component/              # Design tokens, accessibility, animations, cn()
│   ├── tdd-workflow/              # Red-Green-Refactor enforcement (superpowers pattern)
│   ├── security-review/           # Pre-merge cryptographic & network audit checklist
│   ├── context-efficiency/        # Search-before-read, token saving (GSD / repomix pattern)
│   ├── code-review-graph/         # Blast radius, AST caller/callee tracing, cross-boundary review
│   └── design-taste-audit/        # 10-point anti-AI-slop audit (taste-skills pattern)
└── state/                         # Persistent session memory & task DAG
    ├── STATE.md                   # Current phase, decisions log, invariants
    └── ROADMAP.md                 # 5-phase deliverables & readiness status

AGENTS.md                          # Root project rules (always loaded in context)
src-tauri/AGENTS.md                # Scoped backend Rust rules (clippy, thiserror, mlock)
src/AGENTS.md                      # Scoped frontend rules (Tailwind v4 tokens, a11y, no secrets)
```

---

## 🛡️ Best-Practice Integrations & Proven Patterns

| Source Repository | Applied Pattern in KobeanPass |
|:---|:---|
| **[ponytail](https://github.com/DietrichGebert/ponytail)** | **The 7-Step Decision Ladder**: Forbids unnecessary code and dependencies. Exhaust std/platform first. |
| **[taste-skills](https://github.com/0xDragoon/taste-skills)** | **Anti-AI-Slop & Design Taste Audit**: 10-point visual hierarchy, 60-30-10 color balance, OKLCH tokens, WCAG 2.2 AA. |
| **[superpowers](https://github.com/obra/superpowers)** | **TDD Workflow**: Mandatory failing tests before implementation code for all cryptographic and core logic. |
| **[get-shit-done](https://github.com/open-gsd/get-shit-done-redux)** | **State & Context Reset Protocol**: Externalized `.agents/state/STATE.md` to prevent context degradation. |
| **[beads](https://github.com/gastownhall/beads)** | **Task DAG & Readiness Graph**: Structured task dependencies (`[READY]` vs `[BLOCKED]`) in roadmap. |
| **[betterleaks](https://github.com/betterleaks/betterleaks)** | **Automated Secret Scanner Hook**: Post-tool execution scan preventing credential / key leakage into files. |
| **[repomix](https://github.com/yamadashy/repomix)** | **`context-efficiency` Skill** | Search-before-read and progressive disclosure to minimize token consumption. |
| **[code-review-graph](https://github.com/mizchi/code-review-graph)** | **`code-review-graph` Skill & Script** | Blast radius analysis, caller/callee tracing, and cross-boundary Rust $\leftrightarrow$ TS verification. |

---

## ⚡ How Progressive Disclosure Saves Tokens

1. **Root Rules (`AGENTS.md`)**: Concise, high-signal rules (~1,000 tokens) loaded into context.
2. **Skills (`skills/*/SKILL.md`)**: Only the `name` and `description` are initially mounted. The agent loads the full body only when executing relevant domain tasks.
3. **Scoped Rules (`src-tauri/AGENTS.md`, `src/AGENTS.md`)**: Injected only when operating in those subtrees.

---

## 🚀 Quick Commands for Human & Agent

```bash
# Verify backend compliance
cd src-tauri && cargo test && cargo clippy -- -D warnings

# Verify frontend compliance
pnpm test

# Audit security dependencies
cd src-tauri && cargo audit
```
