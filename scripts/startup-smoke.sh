#!/usr/bin/env bash
set -euo pipefail

PORT="${1:-8000}"
ROOT_URL="http://127.0.0.1:${PORT}"

python3 -m http.server "$PORT" >/tmp/hazama_smoke_http.log 2>&1 &
PID=$!
trap 'kill "$PID" >/dev/null 2>&1 || true' EXIT

for _ in {1..30}; do
  if curl -fs "$ROOT_URL/" >/tmp/hz_root.html; then
    break
  fi
  sleep 0.2
done

curl -fsS "$ROOT_URL/hazama-main.js" >/tmp/hz_main.js
curl -fsS "$ROOT_URL/hazama-depths.json" >/tmp/hz_depths.json

python3 - <<'PY'
import json
from pathlib import Path

root = Path('/tmp/hz_root.html').read_text(encoding='utf-8')
js = Path('/tmp/hz_main.js').read_text(encoding='utf-8')
depths = json.loads(Path('/tmp/hz_depths.json').read_text(encoding='utf-8'))

assert 'hazama-main.js?v=2.1' in root, 'index.html が最新の script クエリを参照していません'
assert 'Hazama main.js v2.1' in js, 'hazama-main.js バージョンが期待値ではありません'
assert 'A_start' in depths, 'hazama-depths.json に A_start がありません'
assert 'HUB_NIGHT' in depths, 'hazama-depths.json に HUB_NIGHT がありません'
print('OK: startup smoke passed')
PY

echo "Smoke check passed: ${ROOT_URL}"
