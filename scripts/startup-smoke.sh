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
curl -fsS "$ROOT_URL/hazama-style.css" >/tmp/hz_style.css
curl -fsS "$ROOT_URL/hazama-index.html" >/tmp/hz_alt.html
curl -fsS "$ROOT_URL/hazama-depths.json" >/tmp/hz_depths.json
curl -fsS "$ROOT_URL/assets/hazama-descent-key.png" >/tmp/hz_descent.png
curl -fsS "$ROOT_URL/assets/hazama-goal-mandala.png" >/tmp/hz_goal.png

python3 - <<'PY'
import json
from pathlib import Path

root = Path('/tmp/hz_root.html').read_text(encoding='utf-8')
alt = Path('/tmp/hz_alt.html').read_text(encoding='utf-8')
js = Path('/tmp/hz_main.js').read_text(encoding='utf-8')
css = Path('/tmp/hz_style.css').read_text(encoding='utf-8')
depths = json.loads(Path('/tmp/hz_depths.json').read_text(encoding='utf-8'))

for html_name, html in [('index.html', root), ('hazama-index.html', alt)]:
    for asset in [
        'hazama-style.css?v=2.17',
        'hazama-seed.js?v=2.17',
        'hazama-state.js?v=2.17',
        'hazama-main.js?v=2.17',
    ]:
        assert asset in html, f'{html_name} が最新の {asset} を参照していません'
assert 'assets/hazama-descent-key.png' in root, 'index.html が探索者キービジュアルを参照していません'
assert 'assets/hazama-goal-mandala.png' in root, 'index.html が曼荼羅ゲートを参照していません'
assert 'Hazama main.js v2.17' in js, 'hazama-main.js バージョンが期待値ではありません'
assert 'position: fixed' in css and '100vh' in css and 'mask-image' in css, '全画面曼荼羅背景のCSSフックが見つかりません'
assert 'Gate Intelligence' in js, 'hazama-main.js にGIディレクターが見つかりません'
assert 'createMusicPayload' in js, 'hazama-main.js にMusic sender payloadが見つかりません'
assert 'postMessage' in js, 'hazama-main.js にMusic postMessage senderが見つかりません'
assert 'installMusicAutoStart' in js, 'hazama-main.js にMusic自動起動待機が見つかりません'
assert 'return "exhale"' in js and 'return "root"' in js and 'return "submerge"' in js, 'Music stage mapping が receiver arc に揃っていません'
assert 'Gate Run' in js, 'hazama-main.js にGate Run表示が見つかりません'
assert 'applyGateRunAction' in js, 'hazama-main.js にGate Run行動が見つかりません'
assert 'Music' in js and 'hz-audio-gate' in js, 'Music connection UI が見つかりません'
assert 'data-audio-phase' in js and 'synced' in js, 'Music 接続状態の同期表示が見つかりません'
assert 'canEnterOmega' in js and 'まだ入れない / 扉の開き' in js, 'Ωロック条件が見つかりません'
assert 'hz-choice-main' in js and 'hz-choice-meta' in js, '選択肢の主文/補足表示が見つかりません'
assert '夜のハブへ戻る' in json.dumps(depths, ensure_ascii=False), '人間語の選択肢が見つかりません'
assert '落ち着き' in js and '響き' in js and '立て直し中' in js, 'v2.17 の説明語彙が見つかりません'
assert 'A_start' in depths, 'hazama-depths.json に A_start がありません'
assert 'HUB_NIGHT' in depths, 'hazama-depths.json に HUB_NIGHT がありません'
print('OK: startup smoke passed')
PY

echo "Smoke check passed: ${ROOT_URL}"
