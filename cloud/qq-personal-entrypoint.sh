#!/usr/bin/env bash
set -euo pipefail
umask 077
ulimit -c 0
echo 0 > /proc/self/coredump_filter 2>/dev/null || true
uid=${NAPCAT_UID:-1000}
gid=${NAPCAT_GID:-1000}
mkdir -p /app/.config/QQ /app/napcat/config
chown -R "$uid:$gid" /app/napcat /app/.config/QQ
export DISPLAY=:99
gosu "$uid:$gid" Xvfb :99 -screen 0 1080x760x16 +extension GLX +render >/dev/null 2>&1 &
sleep 1
cd /app/napcat
exec gosu "$uid:$gid" /opt/QQ/qq --no-sandbox
