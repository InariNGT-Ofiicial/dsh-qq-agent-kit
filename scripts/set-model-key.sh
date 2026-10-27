#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
read -r -s -p 'DeepSeek API Key (hidden input): ' DSH_LAB_KEY
printf '\n'
trap 'unset DSH_LAB_KEY' EXIT
printf '%s' "$DSH_LAB_KEY" | node scripts/configure-model-key.mjs
