#!/usr/bin/env bash
# KobeanPass Context Efficiency Guard (PreInvocation)
# Reminds agents of progressive disclosure and token efficiency constraints.

set -e

# Output ephemeral guidance step
cat << 'EOF'
{
  "injectSteps": [
    {
      "ephemeralMessage": "KobeanPass Guard: Enforce 7-step decision ladder (ponytail) + zero secrets in logs/state. Use search-before-read to minimize token usage."
    }
  ]
}
EOF
exit 0
