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
# A container restart retains /tmp although the old X server is gone.
rm -f /tmp/.X99-lock /tmp/.X11-unix/X99
gosu "$uid:$gid" Xvfb :99 -screen 0 1080x760x16 +extension GLX +render >/tmp/qq-lab-xvfb.log 2>&1 &
xpid=$!
for attempt in $(seq 1 50); do
  kill -0 "$xpid" || { echo 'Virtual display failed to start' >&2; exit 1; }
  test ! -S /tmp/.X11-unix/X99 || break
  sleep 0.1
done
test -S /tmp/.X11-unix/X99 || { echo 'Virtual display readiness timed out' >&2; exit 1; }
cd /app/napcat
exec gosu "$uid:$gid" /opt/QQ/qq --no-sandbox
