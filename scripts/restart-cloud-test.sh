#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
node="$PWD/.runtime/node-v24.21.0-linux-x64/bin/node"
settings=$("$node" scripts/cloud-container-settings.mjs)
read -r container _ <<< "$settings"
instance=${container%-napcat}
# Verify ownership before any disruptive operation, including legacy default names.
for unit in "$instance-model" "$instance-bridge"; do
 test "$(systemctl show "$unit" -p WorkingDirectory --value)" = "$PWD" || { echo 'Unit does not belong to this directory' >&2; exit 1; }
done
test "$(sudo -n docker inspect --format '{{range .Mounts}}{{if eq .Destination "/app/.config/QQ"}}{{.Source}}{{end}}{{end}}' "$container")" = "$PWD/.local/qq" || { echo 'Container state belongs to another directory' >&2; exit 1; }
sudo -n systemctl stop "$instance-bridge"
sudo -n systemctl restart "$instance-model"
sudo -n docker restart "$container" >/dev/null
"$node" scripts/wait-dsh.mjs
for attempt in $(seq 1 30); do
  if "$node" scripts/probe.mjs > .local/cloud-restart-probe.json 2>&1; then
    sudo -n systemctl start "$instance-bridge"
    printf 'Restored expected QQ account and model endpoint after restart.\n'
    cat .local/cloud-restart-probe.json
    exit 0
  fi
  sleep 2
done
printf 'QQ not ready after restart; bridge remains stopped. Inspect login status.\n' >&2
exit 1
