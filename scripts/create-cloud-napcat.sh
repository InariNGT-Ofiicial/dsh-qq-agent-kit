#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
root="$PWD"
settings=$(node scripts/cloud-container-settings.mjs)
read -r name http_port ws_port web_port <<< "$settings"
image=${NAPCAT_IMAGE:-dsh-qq-personal-napcat:4.18.41-stable}
sudo -n docker image inspect "$image" >/dev/null
if sudo -n docker container inspect "$name" >/dev/null 2>&1; then echo 'Dedicated container already exists; refusing replacement'; exit 1; fi
sudo -n docker create --name "$name" --hostname qq-personal-lab --restart unless-stopped \
 --memory 512m --memory-swap 768m --pids-limit 256 --shm-size 128m \
 --ulimit core=0 --log-opt max-size=10m --log-opt max-file=2 \
 -e NAPCAT_UID="$(id -u)" -e NAPCAT_GID="$(id -g)" \
 -p "127.0.0.1:$web_port:$web_port" -p "127.0.0.1:$http_port:$http_port" -p "127.0.0.1:$ws_port:$ws_port" \
 -v "$root/.local/qq:/app/.config/QQ" \
 -v "$root/.local/napcat/config:/app/napcat/config" \
 "$image"
echo 'Created dedicated container, not started. Existing containers unchanged.'
