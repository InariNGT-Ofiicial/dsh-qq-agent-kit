#!/usr/bin/env bash
# Read-only host inventory. Does not install or enable services.
set -eu
printf 'os='; uname -s
printf 'arch='; uname -m
printf 'node='; if command -v node >/dev/null 2>&1; then node --version; else printf 'missing\n'; fi
printf 'git='; if command -v git >/dev/null 2>&1; then git --version; else printf 'missing\n'; fi
printf 'container='; if command -v docker >/dev/null 2>&1; then docker --version; else printf 'missing\n'; fi
printf 'init='; ps -p 1 -o comm=
printf 'memory_kib='; awk '/MemTotal/ {print $2}' /proc/meminfo
df -Pk .
printf 'lab_listeners:\n'; if command -v ss >/dev/null 2>&1; then ss -lnt | awk 'NR==1 || /:(13000|13001|13080|16099|23000|23001|23080|26099)[[:space:]]/'; fi
