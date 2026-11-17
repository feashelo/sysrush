#!/usr/bin/env bash
set -euo pipefail

systemctl --user start sysrush-sync.service >/dev/null 2>&1 || true
URL="https://feashelo.github.io/sysrush/"

echo "🚀 Открываю SysRush 24/7 Cloud Edition: $URL"
xdg-open "$URL" >/dev/null 2>&1 || google-chrome-stable "$URL" >/dev/null 2>&1 &
