#!/bin/sh
set -eu
APP_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$APP_ROOT"
if curl -sf -o /dev/null --max-time 2 http://127.0.0.1:8080/; then
  exit 0
fi
nohup npm run dev >>/tmp/auris-startup.log 2>&1 </dev/null &
