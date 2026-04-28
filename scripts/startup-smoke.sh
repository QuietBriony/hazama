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
curl -fsS "$ROOT_URL/assets/hazama-descent-key.png" >/tmp/hz_descent.png
curl -fsS "$ROOT_URL/assets/hazama-goal-mandala.png" >/tmp/hz_goal.png

python3 - <<'PY'
import json
from pathlib import Path

root = Path('/tmp/hz_root.html').read_text(encoding='utf-8')
js = Path('/tmp/hz_main.js').read_text(encoding='utf-8')
depths = json.loads(Path('/tmp/hz_depths.json').read_text(encoding='utf-8'))

assert 'hazama-main.js?v=2.12' in root, 'index.html が最新の script クエリを参照していません'
assert 'assets/hazama-descent-key.png' in root, 'index.html が探索者キービジュアルを参照していません'
assert 'assets/hazama-goal-mandala.png' in root, 'index.html が曼荼羅ゲートを参照していません'
assert 'Hazama main.js v2.12' in js, 'hazama-main.js バージョンが期待値ではありません'
assert 'Gate Intelligence' in js, 'hazama-main.js にGIディレクターが見つかりません'
assert 'createMusicPayload' in js, 'hazama-main.js にMusic sender payloadが見つかりません'
assert 'postMessage' in js, 'hazama-main.js にMusic postMessage senderが見つかりません'
assert 'installMusicAutoStart' in js, 'hazama-main.js にMusic自動起動待機が見つかりません'
assert 'return "exhale"' in js and 'return "root"' in js and 'return "submerge"' in js, 'Music stage mapping が receiver arc に揃っていません'
assert 'Gate Run' in js, 'hazama-main.js にGate Run表示が見つかりません'
assert 'applyGateRunAction' in js, 'hazama-main.js にGate Run行動が見つかりません'
assert 'A_start' in depths, 'hazama-depths.json に A_start がありません'
assert 'HUB_NIGHT' in depths, 'hazama-depths.json に HUB_NIGHT がありません'
print('OK: startup smoke passed')
PY

echo "Smoke check passed: ${ROOT_URL}"
