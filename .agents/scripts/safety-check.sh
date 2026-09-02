#!/usr/bin/env bash
# KobeanPass AI Safety Gate Hook (PreToolUse)
# Validates shell commands before execution to prevent accidental data destruction or secret leaks.

set -e

# Read JSON payload from stdin
INPUT=$(cat)

# Extract tool arguments if jq is available, or fallback to python3
if command -v jq >/dev/null 2>&1; then
    COMMAND_LINE=$(echo "$INPUT" | jq -r '.toolCall.args.CommandLine // empty')
elif command -v python3 >/dev/null 2>&1; then
    COMMAND_LINE=$(echo "$INPUT" | python3 -c 'import sys, json; data=json.load(sys.stdin); print(data.get("toolCall", {}).get("args", {}).get("CommandLine", ""))')
else
    # Allow if no parser available
    echo '{"decision": "allow"}'
    exit 0
fi

if [ -z "$COMMAND_LINE" ]; then
    echo '{"decision": "allow"}'
    exit 0
fi

# 1. Deny dangerous destructive commands
if echo "$COMMAND_LINE" | grep -qE "(rm -rf /|rm -rf ~|mkfs|dd if=/dev/zero|chmod -R 777 /|git push .*--force.*main)"; then
    echo '{"decision": "deny", "reason": "Blocked high-risk destructive shell command by KobeanPass Safety Gate."}'
    exit 0
fi

# 2. Deny hardcoded secret injections in commands
if echo "$COMMAND_LINE" | grep -qiE "(password\s*=\s*['\"][^'\"]{8,}['\"]|SECRET_KEY\s*=\s*['\"][^'\"]{8,}['\"]|ghp_[0-9a-zA-Z]{36}|sk_live_[0-9a-zA-Z]{24})"; then
    echo '{"decision": "deny", "reason": "Blocked potential hardcoded secret or token in command arguments."}'
    exit 0
fi

echo '{"decision": "allow"}'
exit 0
