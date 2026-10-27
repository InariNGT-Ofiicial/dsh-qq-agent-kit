#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
node="$PWD/.runtime/node-v24.21.0-linux-x64/bin/node"
sudo -n systemctl stop dsh-qq-personal-bridge
sudo -n systemctl restart dsh-qq-personal-model
sudo -n docker restart dsh-qq-personal-napcat >/dev/null
for attempt in $(seq 1 30); do
  if "$node" scripts/probe.mjs > .local/cloud-restart-probe.json 2>&1; then
    sudo -n systemctl start dsh-qq-personal-bridge
    printf 'Restored expected QQ account and model endpoint after restart.\n'
    cat .local/cloud-restart-probe.json
    exit 0
  fi
  sleep 2
done
printf 'QQ not ready after restart; bridge remains stopped. Inspect login status.\n' >&2
exit 1
