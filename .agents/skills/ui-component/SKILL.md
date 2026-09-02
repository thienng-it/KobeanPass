---
name: ui-component
description: >-
  Use this skill when creating new React UI components for KobeanPass. Covers
  the design system tokens, component file structure, accessibility patterns,
  animation conventions, and the taste audit checklist to prevent AI slop.
---

# Creating UI Components for KobeanPass

## File Structure Convention

```
src/components/<category>/
└── MyComponent.tsx     # Named export, PascalCase filename
```

Categories: `ui/` (primitives), `layout/`, `vault/`, `generator/`, `security/`, `totp/`, `onboarding/`, `shared/`, `screens/`

## Component Template

```tsx
import React from 'react';
import { cn } from '@/lib/cn';

interface MyComponentProps {
  /** Description of prop */
  variant?: 'default' | 'danger';
  className?: string;
  children: React.ReactNode;
}

export function MyComponent({ variant = 'default', className, children }: MyComponentProps) {
  return (
    <div
      className={cn(
        // Base styles
        'rounded-xl border transition-all duration-150',
        // Variant styles
        variant === 'default' && 'bg-surface-2 border-border-default text-text-primary',
        variant === 'danger' && 'bg-danger-surface border-danger-border text-danger-text',
        // Focus/hover
        'hover:bg-surface-3 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none',
        // Consumer override
        className
      )}
    >
      {children}
    </div>
  );
}
```

## Design Token Quick Reference

| Surface | Class | Use For |
|:---|:---|:---|
| Deepest | `bg-surface-0` | App background |
| Panel | `bg-surface-1` | Sidebar, nav |
| Card | `bg-surface-2` | List items, cards |
| Hover | `bg-surface-3` | Hover states, dropdowns |
| Active | `bg-surface-4` | Selected items |

## Accessibility Checklist (BEFORE completing any UI task)

- [ ] All buttons have visible labels OR `aria-label`
- [ ] Focus ring visible on keyboard navigation (`focus-visible:ring-2`)
- [ ] Color is not the only indicator (add icons/text for status)
- [ ] Contrast ratio ≥ 4.5:1 for text, ≥ 3:1 for large text/icons
- [ ] Interactive targets ≥ 24×24px
- [ ] Forms have `<label>` elements associated with inputs

## Taste Audit (Inspired by taste-skills — Anti-AI-Slop)

Before marking ANY frontend task complete, self-audit:

1. **Hierarchy**: Is there a clear visual hierarchy? (One dominant element per view)
2. **Spacing**: Is spacing consistent? (Use Tailwind's 4px grid: `p-2`, `p-3`, `p-4`)
3. **Typography**: Max 2 font sizes per component. No walls of same-size text.
4. **Color**: Follow 60-30-10 rule (60% surface, 30% text, 10% accent).
5. **No AI Slop**: No gratuitous gradients, no oversized rounded buttons, no generic card grids.
6. **Motion**: Transitions are ≤200ms with spring easing. No bounce effects.
7. **Empty States**: Every list/view handles the empty case with illustration + CTA.

## Animation Pattern

```tsx
// Use CSS transitions, not framer-motion (bundle size)
className="transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)]"

// Respect reduced motion
className="motion-safe:transition-all motion-safe:duration-150"
```

## `cn()` Utility (`src/lib/cn.ts`)

```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```
