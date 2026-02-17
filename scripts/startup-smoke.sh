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

assert 'hazama-main.js' in root, 'index.html が hazama-main.js を参照していません'
assert 'loadDepths' in js, 'hazama-main.js に loadDepths が見つかりません'
assert 'renderDepth' in js, 'hazama-main.js に renderDepth が見つかりません'
assert 'A_start' in depths, 'hazama-depths.json に A_start がありません'
print('OK: startup smoke passed')
PY

echo "Smoke check passed: ${ROOT_URL}"
