#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
root="$PWD"
name=dsh-qq-personal-napcat
image=${NAPCAT_IMAGE:-docker.1ms.run/mlikiowa/napcat-docker@sha256:69c5ca84ec226d658d0d5cd19997c6c89169da3206faa2948c2dc67d669b6406}
if sudo -n docker container inspect "$name" >/dev/null 2>&1; then echo 'Dedicated container already exists; refusing replacement'; exit 1; fi
sudo -n docker create --name "$name" --hostname qq-personal-lab --restart unless-stopped \
 --memory 512m --memory-swap 768m --pids-limit 256 --shm-size 128m \
 --ulimit core=0 --log-opt max-size=10m --log-opt max-file=2 \
 -e NAPCAT_UID="$(id -u)" -e NAPCAT_GID="$(id -g)" \
 -p 127.0.0.1:16099:16099 -p 127.0.0.1:13000:13000 -p 127.0.0.1:13001:13001 \
 -v "$root/.local/qq:/app/.config/QQ" \
 -v "$root/.local/napcat/config:/app/napcat/config" \
 "$image"
echo 'Created dedicated container, not started. Existing containers unchanged.'
