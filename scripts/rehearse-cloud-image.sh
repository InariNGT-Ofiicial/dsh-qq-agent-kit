#!/usr/bin/env bash
# Fresh-directory, no-account rehearsal. Does not install systemd units or start a bridge.
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="$PWD/.runtime/node-v24.21.0-linux-x64/bin:$PATH"
if [ "${1:-}" = --resume ]; then
 node --input-type=module -e 'import fs from "node:fs"; const c=JSON.parse(fs.readFileSync(".local/config.json")),w=JSON.parse(fs.readFileSync(".local/napcat/config/webui.json")); if(c.selfId!=="10000"||c.instanceName!=="dsh-qq-rehearsal"||c.allowedPeers.length||w.autoLoginAccount||fs.existsSync(".local/bridge-state.json"))throw Error("Not an unpaired no-login rehearsal");'
else
 test ! -f .local/config.json || { echo 'Use a fresh directory for rehearsal' >&2; exit 1; }
 node scripts/init-local.mjs 10000
 node scripts/configure-cloud-instance.mjs --name dsh-qq-rehearsal --port-offset 10000 --no-auto-login
 node scripts/setup-cloud-services.mjs
fi
if [ "${1:-}" = --prepare-only ]; then echo 'Prepared no-account rehearsal configuration only'; exit 0; fi
sudo -n docker image inspect dsh-qq-personal-napcat:4.18.41-stable >/dev/null
bash scripts/create-cloud-napcat.sh
name=dsh-qq-rehearsal-napcat
sudo -n docker update --restart=no "$name" >/dev/null
trap 'sudo -n docker stop "$name" >/dev/null 2>&1 || true' EXIT
check_qr() {
 rm -f -- .local/login-qr-url.txt
 for attempt in $(seq 1 30); do
  if node scripts/export-login-qr.mjs >.local/qr-check.log 2>&1; then
   test -s .local/login-qr-url.txt
   node scripts/napcat-login-status.mjs > .local/rehearsal-status.json
   node --input-type=module -e 'import fs from "node:fs"; const s=JSON.parse(fs.readFileSync(".local/rehearsal-status.json")); if(s.isLogin)throw Error("Unexpected logged-in account: stop rehearsal"); console.log(JSON.stringify(s));'
   return 0
  fi
  sleep 2
 done
 echo 'QR readiness failed; inspect private diagnostics without publishing credentials' >&2
 return 1
}
sudo -n docker start "$name" >/dev/null
check_qr
echo 'Fresh container: authenticated WebUI and private QR ready; no account scanned.'
sudo -n docker restart "$name" >/dev/null
check_qr
echo 'Restart: authenticated WebUI and private QR ready; no account scanned.'
echo 'Rehearsal container will now stop. No systemd units installed or bridge started.'
