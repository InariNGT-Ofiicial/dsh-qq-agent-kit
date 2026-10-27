#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
test "$(uname -m)" = x86_64
mkdir -p .runtime/downloads .local
chmod 700 .local
version=v24.21.0
archive=node-${version}-linux-x64.tar.xz
base=https://nodejs.org/dist/${version}
if [ ! -x ".runtime/node-${version}-linux-x64/bin/node" ]; then
  curl -fL --retry 2 --connect-timeout 15 --max-time 300 "$base/$archive" -o ".runtime/downloads/$archive"
  curl -fL --retry 2 --connect-timeout 15 --max-time 60 "$base/SHASUMS256.txt" -o .runtime/downloads/SHASUMS256.txt
  (cd .runtime/downloads; grep " $archive$" SHASUMS256.txt | sha256sum -c -)
  tar -xJf ".runtime/downloads/$archive" -C .runtime
fi
export PATH="$PWD/.runtime/node-${version}-linux-x64/bin:$PATH"
export NODE_OPTIONS=--max-old-space-size=384
node --version
npm ci --ignore-scripts --no-audit --no-fund
npm ci --prefix vendor --ignore-scripts --no-audit --no-fund
npm test
