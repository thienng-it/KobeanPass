---
name: design-taste-audit
description: >-
  Use this skill after completing any frontend UI task in KobeanPass. Performs
  a visual quality, accessibility, and design taste audit to prevent AI-generated
  UI slop. Must be run before marking any UI task as done. Inspired by
  taste-skills and ponytail methodologies.
---

# Design Taste Audit

*Based on [taste-skills](https://github.com/0xDragoon/taste-skills) — preventing AI UI slop.*

> **Run this audit BEFORE marking any frontend task as complete.**

## The 10-Point Taste Test

### 1. Visual Hierarchy ✅
- [ ] One clear dominant element per view (title, hero card, primary action)
- [ ] Secondary elements are visually subordinate (smaller, lighter, less saturated)
- [ ] Eye flow follows a natural F-pattern or Z-pattern

### 2. Spacing & Rhythm ✅
- [ ] Consistent spacing using Tailwind's 4px grid (`gap-2`, `gap-3`, `gap-4`)
- [ ] Related elements are closer together than unrelated elements (proximity principle)
- [ ] No "floating in space" elements with inconsistent margins

### 3. Typography ✅
- [ ] Max 2-3 font sizes per component
- [ ] Body text: `text-sm` (13px) or `text-base` (14px) — never smaller for primary content
- [ ] Passwords/codes: `font-mono tracking-wider`
- [ ] No walls of same-size, same-weight text

### 4. Color Discipline ✅
- [ ] 60-30-10 rule: 60% surfaces, 30% text, 10% accent
- [ ] All colors use semantic tokens (`bg-surface-*`, `text-text-*`, `text-accent`)
- [ ] No hardcoded hex/rgb values
- [ ] Accent color used sparingly for primary actions and active states only

### 5. Anti-Slop Checks ✅
- [ ] ❌ No gratuitous purple/blue gradients
- [ ] ❌ No oversized rounded buttons (max `rounded-xl`)
- [ ] ❌ No generic identical card grids with stock-photo-style icons
- [ ] ❌ No rainbow color schemes for unrelated elements
- [ ] ❌ No excessive shadows (max `shadow-lg` on modals)
- [ ] ❌ No animated background patterns or particles

### 6. Interactive States ✅
- [ ] Hover: subtle background change (`bg-surface-3`)
- [ ] Active/pressed: slightly darker or accent tint
- [ ] Focus: visible 2px ring (`focus-visible:ring-2 focus-visible:ring-accent`)
- [ ] Disabled: reduced opacity (`opacity-50 cursor-not-allowed`)
- [ ] Loading: skeleton or spinner (never blank space)

### 7. Empty & Edge States ✅
- [ ] Empty list: illustration + descriptive message + CTA button
- [ ] Error state: clear error message + retry action
- [ ] Loading state: skeleton shimmer, not spinner-only
- [ ] Truncation: `truncate` or `line-clamp-2` with tooltip for full text

### 8. Responsive Behavior ✅
- [ ] Works at 1024px (3-pane), 768px (2-pane), <768px (1-pane)
- [ ] No horizontal scroll at any viewport width
- [ ] Text doesn't break out of containers

### 9. Motion Quality ✅
- [ ] Transitions ≤200ms for micro-interactions
- [ ] Spring easing for interactive elements
- [ ] `motion-safe:` prefix for all animations
- [ ] No janky/stuttering animations (check 60fps)

### 10. Accessibility ✅
- [ ] Keyboard-navigable (Tab through all interactive elements)
- [ ] Screen reader announces all state changes
- [ ] No color-only indicators
- [ ] Min contrast 4.5:1 for body text

## Quick Fix Patterns

| Problem | Fix |
|:---|:---|
| "Everything looks the same" | Increase size/weight contrast between heading and body |
| "Too much accent color" | Replace accent backgrounds with `bg-surface-3`, keep accent for borders/text only |
| "Feels cramped" | Increase padding from `p-2` to `p-4`, add `gap-3` between sections |
| "Feels empty/sparse" | Reduce max-width, add subtle borders (`border-border-subtle`) |
| "Generic AI look" | Remove gradients, reduce border-radius, use asymmetric layouts |
