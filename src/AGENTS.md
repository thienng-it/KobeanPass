# Frontend — Agent Rules

> These rules apply to ALL files within `src/`. They supplement the root `AGENTS.md`.

## Component Architecture

- **Atomic primitives** (`ui/`): Button, Input, Badge, Toggle — stateless, fully controlled.
- **Feature components** (`vault/`, `generator/`, `security/`): Compose primitives + call IPC.
- **Screen components** (`screens/`): Full-page views, handle routing/state transitions.
- **Layout components** (`layout/`): AppShell, Sidebar, SplitHandle — structural only.

## Design System Tokens (MANDATORY)

NEVER hardcode colors. Always use semantic tokens from `index.css`:

```tsx
// ✅ Correct
<div className="bg-surface-2 text-text-primary border-border-default" />

// ❌ Wrong — hardcoded colors bypass theming
<div className="bg-gray-800 text-white border-gray-700" />
<div className="bg-[#1a1a2e] text-[#f0f0f0]" />
```

## Token Reference (Quick)

| Purpose | Token Class |
|:---|:---|
| App background | `bg-surface-0` |
| Sidebar | `bg-surface-1` |
| Cards / list items | `bg-surface-2` |
| Hover / dropdowns | `bg-surface-3` |
| Active selection | `bg-surface-4` |
| Primary text | `text-text-primary` |
| Secondary text | `text-text-secondary` |
| Muted / labels | `text-text-muted` |
| Accent / brand | `bg-accent`, `text-accent` |
| Danger | `text-danger-text`, `bg-danger-surface` |
| Success | `text-success-text`, `bg-success-surface` |
| Warning | `text-warning-text`, `bg-warning-surface` |
| Borders | `border-border-subtle`, `border-border-default` |

## Typography

- **UI text**: System sans-serif (Inter). Use `text-sm` (13px) for list items, `text-base` (14px) for body.
- **Passwords & codes**: `font-mono` (JetBrains Mono / Fira Code). Always add `tracking-wider`.
- **Never** use `text-xs` (12px) as primary text — only for badges and metadata.

## IPC Calls

All Tauri IPC calls go through typed wrappers in `lib/tauri.ts`:

```typescript
// ✅ Correct — typed wrapper
import { invoke } from '@tauri-apps/api/core';

export async function listItems(filter?: ItemFilter): Promise<ItemSummary[]> {
  return invoke<ItemSummary[]>('cmd_list_items', { filter });
}

// ❌ Wrong — inline invoke without types
const items = await invoke('cmd_list_items', { filter });
```

## State Management

- Zustand for UI state only: selected item ID, sidebar collapsed, theme, filters.
- **NEVER** store decrypted passwords, keys, or tokens in Zustand.
- Secrets live only in Rust memory. Frontend receives them via IPC and displays immediately.

## Accessibility Requirements

- All interactive elements: visible focus ring (`focus:ring-2 focus:ring-accent`).
- All buttons: `aria-label` if icon-only.
- All forms: associated `<label>` elements.
- Password fields: `aria-describedby` for strength meter.
- Lists: `role="listbox"` + `role="option"` + `aria-selected`.
- TOTP updates: `aria-live="polite"`.
- Minimum target size: 24×24px.

## Animation Guidelines

- Use CSS transitions, not JS animation libraries (keep bundle small).
- Spring easing: `cubic-bezier(0.16, 1, 0.3, 1)` for interactive feedback.
- Duration: 120-200ms for micro-interactions, 200-300ms for page transitions.
- Respect `prefers-reduced-motion` — wrap animations in media query.
