#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
digest=sha256:69c5ca84ec226d658d0d5cd19997c6c89169da3206faa2948c2dc67d669b6406
base=${NAPCAT_BASE_IMAGE:-mlikiowa/napcat-docker@$digest}
[[ "$base" == *"@$digest" ]] || { echo 'Base must use the verified amd64 digest' >&2; exit 1; }
if [ "${1:-}" = --dry-run ]; then printf 'Base: %s\nOutput: dsh-qq-personal-napcat:4.18.41-stable\nDockerfile: cloud/Dockerfile.portable\n' "$base"; exit 0; fi
test "$(uname -m)" = x86_64
if ! sudo -n docker image inspect "$base" >/dev/null 2>&1; then
 echo 'Pulling pinned base image; large layers may take several minutes.'
 sudo -n docker pull "$base"
fi
test "$(sudo -n docker image inspect --format '{{.Os}}/{{.Architecture}}' "$base")" = linux/amd64
sudo -n env DOCKER_BUILDKIT=0 docker build --pull=false --build-arg "BASE_IMAGE=$base" \
 -t dsh-qq-personal-napcat:4.18.41-stable -f cloud/Dockerfile.portable cloud
sudo -n docker image inspect --format 'Built image: {{.Id}}' dsh-qq-personal-napcat:4.18.41-stable
