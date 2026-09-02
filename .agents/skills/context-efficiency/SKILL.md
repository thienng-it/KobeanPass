---
name: context-efficiency
description: >-
  Use this skill when working on large tasks in KobeanPass to minimize token
  waste and prevent context window exhaustion. Covers search-before-read
  strategy, incremental file viewing, efficient grep patterns, and context
  reset protocols. Inspired by GSD and repomix methodologies.
---

# Context-Efficient Agent Patterns

*Based on [get-shit-done](https://github.com/open-gsd/get-shit-done-redux) and [repomix](https://github.com/yamadashy/repomix) methodologies.*

## The Core Principle

> **Never read a file you haven't searched for first. Never read an entire file when you only need 20 lines.**

## Search-Before-Read Strategy

### 1. Find the right file FIRST

```
find_by_name → narrow to exact file
grep_search → find exact function/struct/line
view_file (StartLine, EndLine) → read ONLY the relevant section
```

### 2. Never do this

```
❌ view_file entire 500-line file to find one function
❌ Reading multiple files "just to understand the codebase"
❌ Re-reading files you already read in this conversation
```

### 3. Efficient grep patterns for KobeanPass

```bash
# Find a Rust function definition
grep_search: "pub fn function_name"

# Find a Tauri command
grep_search: "#[tauri::command]" + then "cmd_name"

# Find a React component
grep_search: "export function ComponentName"

# Find a TypeScript type
grep_search: "interface TypeName" or "type TypeName"

# Find where something is used
grep_search: "function_name(" (with parenthesis to find calls)
```

## Context Reset Protocol

When working on a long task (>10 tool calls), periodically check:

1. **Am I repeating myself?** → Stop re-reading the same files.
2. **Is the task growing?** → Break into sub-tasks, use subagents.
3. **Am I stuck in a loop?** → Step back, re-read the error, try a different approach. After 3 failed attempts, stop and ask the user.

## Subagent Dispatch Guidelines

Use subagents for:
- **Research tasks** that require reading many files (e.g., "find all usages of X")
- **Independent changes** that don't depend on each other
- **Investigation** of unfamiliar APIs or libraries

Don't use subagents for:
- Sequential changes that depend on each other
- Tasks requiring fewer than 3 tool calls
- Simple questions the user can answer

## File Size Awareness

| File | Strategy |
|:---|:---|
| < 100 lines | Read entire file |
| 100-300 lines | Read in sections (view_file with StartLine/EndLine) |
| > 300 lines | Search first, read only relevant sections |
| > 500 lines | Consider refactoring into smaller modules |

## Token-Saving Shortcuts

- Use `list_dir` before `find_by_name` when you know the directory.
- Use `grep_search` with `MatchPerLine: false` first to find files, then `true` for specific lines.
- When creating multiple similar files, create a template first, then adapt.
- Don't explain code you're about to write — just write it with good comments.
