#!/usr/bin/env bash
# KobeanPass Local Impact Analysis & Blast Radius Tool
# Usage: ./.agents/scripts/impact-analysis.sh <symbol_name>

set -e

SYMBOL="${1:-}"

if [ -z "$SYMBOL" ]; then
    echo "Usage: $0 <symbol_name_or_function>"
    echo "Example: $0 derive_master_key"
    exit 1
fi

echo "======================================================="
echo "🔍 Blast Radius & Dependency Graph for: $SYMBOL"
echo "======================================================="

echo ""
echo "1. 🦀 Rust Backend References (src-tauri/):"
echo "-------------------------------------------------------"
if command -v rg >/dev/null 2>&1; then
    rg -n --color=never "$SYMBOL" src-tauri/ 2>/dev/null || echo "No Rust matches found."
else
    grep -rn "$SYMBOL" src-tauri/ 2>/dev/null || echo "No Rust matches found."
fi

echo ""
echo "2. ⚛️ Frontend References (src/):"
echo "-------------------------------------------------------"
if command -v rg >/dev/null 2>&1; then
    rg -n --color=never "$SYMBOL" src/ 2>/dev/null || echo "No Frontend matches found."
else
    grep -rn "$SYMBOL" src/ 2>/dev/null || echo "No Frontend matches found."
fi

echo ""
echo "3. 🧪 Affected Test Suites:"
echo "-------------------------------------------------------"
if command -v rg >/dev/null 2>&1; then
    rg -n --color=never "(#\[test\]|describe\(|it\().*$SYMBOL" src-tauri/ src/ 2>/dev/null || echo "No direct test matches found."
else
    grep -rnE "(#\[test\]|describe\(|it\().*$SYMBOL" src-tauri/ src/ 2>/dev/null || echo "No direct test matches found."
fi

echo ""
echo "======================================================="
echo "✅ Analysis complete. Follow .agents/skills/code-review-graph/SKILL.md"
echo "======================================================="
exit 0
