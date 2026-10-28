#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
root="$PWD"
account_config=${1:?Supply existing authorized account config path}
node_path=${2:?Supply fixed node executable path}
[[ "$root" =~ ^/[A-Za-z0-9_./-]+$ && "$account_config" =~ ^/[A-Za-z0-9_./-]+$ && "$node_path" =~ ^/[A-Za-z0-9_./-]+$ ]] || exit 1
test -r "$account_config"; test -x "$node_path"
unit=dsh-qq-control-groups.service
if systemctl cat "$unit" >/dev/null 2>&1; then echo 'Existing group worker unit; inspect rather than overwrite'; exit 1; fi
mkdir -p .local
touch .local/group-worker.out.log .local/group-worker.err.log
chmod 600 .local/group-worker.out.log .local/group-worker.err.log
cat > .local/group-worker.service <<EOF
[Unit]
Description=DSH QQ controlled groups addon
After=network-online.target
StartLimitIntervalSec=300
StartLimitBurst=5
[Service]
Type=simple
User=$(id -un)
WorkingDirectory=$root
Environment=QQ_ACCOUNT_CONFIG=$account_config
Environment=NODE_OPTIONS=--max-old-space-size=128
ExecStart=$node_path $root/src/group-worker.mjs
Restart=on-failure
RestartSec=10
UMask=0077
NoNewPrivileges=true
MemoryMax=192M
TasksMax=64
StandardOutput=append:$root/.local/group-worker.out.log
StandardError=append:$root/.local/group-worker.err.log
[Install]
WantedBy=multi-user.target
EOF
sudo -n install -m 644 .local/group-worker.service /etc/systemd/system/$unit
sudo -n systemctl daemon-reload
echo 'Installed separate group unit, not enabled or started. Existing services unchanged.'
