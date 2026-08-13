#!/bin/bash
cd "$(dirname "$0")" || exit 1
PORT=8765
URL="http://127.0.0.1:${PORT}/01_START_GAME.html"
echo "Project Sengokuを起動します。"
echo "終了するときは、このTerminalで Control+C を押してください。"
if command -v python3 >/dev/null 2>&1; then
  (sleep 1; open "$URL") &
  python3 -m http.server "$PORT" --bind 127.0.0.1
elif command -v python >/dev/null 2>&1; then
  (sleep 1; open "$URL") &
  python -m SimpleHTTPServer "$PORT"
elif command -v ruby >/dev/null 2>&1; then
  (sleep 1; open "$URL") &
  ruby -run -e httpd . -p "$PORT" -b 127.0.0.1
else
  echo "ローカルサーバーを起動できないため、単一HTML版を開きます。"
  open "01_START_GAME.html"
fi
