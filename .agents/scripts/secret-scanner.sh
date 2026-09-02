#!/usr/bin/env bash
# KobeanPass Secret Scanner Hook (PostToolUse)
# Inspired by betterleaks: Scans modified files for leaked high-entropy API keys, private keys, or credentials.

set -e

INPUT=$(cat)

# Extract modified target file if available
TARGET_FILE=""
if command -v jq >/dev/null 2>&1; then
    TARGET_FILE=$(echo "$INPUT" | jq -r '.toolCall.args.TargetFile // empty')
elif command -v python3 >/dev/null 2>&1; then
    TARGET_FILE=$(echo "$INPUT" | python3 -c 'import sys, json; data=json.load(sys.stdin); print(data.get("toolCall", {}).get("args", {}).get("TargetFile", ""))')
fi

if [ -n "$TARGET_FILE" ] && [ -f "$TARGET_FILE" ]; then
    # Check for private keys or live API keys in written file
    if grep -qE -- "-----BEGIN (RSA|EC|OPENSSH|PRIVATE) KEY-----" "$TARGET_FILE" 2>/dev/null; then
        echo "[SECURITY WARNING] Potential raw private key detected in $TARGET_FILE!" >&2
    fi
    if grep -qE "(ghp_[0-9a-zA-Z]{36}|sk_live_[0-9a-zA-Z]{24}|AKIA[0-9A-Z]{16})" "$TARGET_FILE" 2>/dev/null; then
        echo "[SECURITY WARNING] Potential live API token detected in $TARGET_FILE!" >&2
    fi
fi

echo '{}'
exit 0
