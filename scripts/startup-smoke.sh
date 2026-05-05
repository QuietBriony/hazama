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
curl -fsS "$ROOT_URL/hazama-gate-run.js" >/tmp/hz_gate_run.js
curl -fsS "$ROOT_URL/hazama-style.css" >/tmp/hz_style.css
curl -fsS "$ROOT_URL/hazama-index.html" >/tmp/hz_alt.html
curl -fsS "$ROOT_URL/hazama-depths.json" >/tmp/hz_depths.json
curl -fsS "$ROOT_URL/scripts/balance-smoke.mjs" >/tmp/hz_balance.mjs
curl -fsS "$ROOT_URL/scripts/first-playable-smoke.mjs" >/tmp/hz_first_playable.mjs
curl -fsS "$ROOT_URL/assets/hazama-descent-key.png" >/tmp/hz_descent.png
curl -fsS "$ROOT_URL/assets/hazama-goal-mandala.png" >/tmp/hz_goal.png

python3 - <<'PY'
import json
from pathlib import Path

root = Path('/tmp/hz_root.html').read_text(encoding='utf-8')
alt = Path('/tmp/hz_alt.html').read_text(encoding='utf-8')
js = Path('/tmp/hz_main.js').read_text(encoding='utf-8')
gate = Path('/tmp/hz_gate_run.js').read_text(encoding='utf-8')
css = Path('/tmp/hz_style.css').read_text(encoding='utf-8')
depths = json.loads(Path('/tmp/hz_depths.json').read_text(encoding='utf-8'))
balance = Path('/tmp/hz_balance.mjs').read_text(encoding='utf-8')
first_playable = Path('/tmp/hz_first_playable.mjs').read_text(encoding='utf-8')

for html_name, html in [('index.html', root), ('hazama-index.html', alt)]:
    for asset in [
        'hazama-style.css?v=2.25',
        'hazama-seed.js?v=2.25',
        'hazama-state.js?v=2.25',
        'hazama-gate-run.js?v=2.25',
        'hazama-main.js?v=2.25',
    ]:
        assert asset in html, f'{html_name} が最新の {asset} を参照していません'
assert 'assets/hazama-descent-key.png' in root, 'index.html が探索者キービジュアルを参照していません'
assert 'assets/hazama-goal-mandala.png' in root, 'index.html が曼荼羅ゲートを参照していません'
assert 'Hazama main.js v2.25' in js, 'hazama-main.js バージョンが期待値ではありません'
assert 'Hazama Gate Run model v1' in gate and 'applyGateAction' in gate and 'applyBreathReward' in gate, 'hazama-gate-run.js の共有モデルが見つかりません'
assert 'position: fixed' in css and '100vh' in css and 'mask-image' in css, '全画面曼荼羅背景のCSSフックが見つかりません'
assert 'Gate Intelligence' in js, 'hazama-main.js にGIディレクターが見つかりません'
assert 'createMusicPayload' in js, 'hazama-main.js にMusic sender payloadが見つかりません'
assert 'postMessage' in js, 'hazama-main.js にMusic postMessage senderが見つかりません'
assert 'installMusicAutoStart' in js, 'hazama-main.js にMusic自動起動待機が見つかりません'
assert 'return "exhale"' in js and 'return "root"' in js and 'return "submerge"' in js, 'Music stage mapping が receiver arc に揃っていません'
assert 'Gate Run' in js, 'hazama-main.js にGate Run表示が見つかりません'
assert 'applyGateRunAction' in js, 'hazama-main.js にGate Run行動が見つかりません'
assert 'HUBで操作開始' in js and 'data-gate-omega' in js and 'Ωへ入る' in js, 'first playable loop の Gate Run 導線が見つかりません'
assert 'GATE_RUN_TURN_LIMIT: 14' in gate, 'v2.25 Gate Run のターン制限が見つかりません'
assert 'GATE_SYNC_READY_RESONANCE: 18' in gate and 'GATE_SYNC_READY_CHARGE: 45' in gate and 'GATE_SYNC_MARK_CHARGE: 35' in gate and '合わせる準備前' in js and '合わせる準備OK' in js and 'hz-gate-action--sync-ready' in css, 'Gate Run の sync 準備表示が見つかりません'
assert '退避推奨' in js and '退避任意' in js and 'hz-gate-secondary-badge' in js and 'hz-gate-action--retreat-recommended' in css and 'hz-gate-action--retreat-retry' in css and 'hz-gate-secondary-badge' in css, 'Gate Run の retreat 準備表示が見つかりません'
assert '扉100%でΩ' in js and '攻める / 整える / 合わせる' in js, 'Gate Run の目標/基本手順が見つかりません'
assert 'hz-gate-secondary' in js and 'HUBへ戻る' in js and 'data-gate-action="retreat"' in js, 'Gate Run 勝利後の副CTAが見つかりません'
assert 'hz-gate-run-mission' in css and 'hz-gate-secondary' in css, 'Gate Run hardening CSS が見つかりません'
assert 'breathStreak' in js and 'breathDiminishForStreak' in js and '限定回復' in js, 'Breath Gate diminishing returns が見つかりません'
assert 'targetDepthId = applied.targetDepthId' in js and 'rewardTargetDepthId' in js and 'renderDepth(rewardTargetDepthId' in js, 'Breath Gate のHUB退避ターゲット処理が見つかりません'
assert 'H境界: 落ち着き' in js and 'N境界: 響き' in js and '道を選ぶ' in js and 'Gate Run / 扉操作' in js, 'v2.25 balance UI labels が見つかりません'
assert 'hz-resource-roles' in js and 'hz-resource-roles' in css, 'resource roles UI が見つかりません'
assert 'breath-spam' in balance and 'sync-rush' in balance and 'balanced' in balance, 'balance smoke script が見つかりません'
assert 'first playable smoke passed' in first_playable and 'A_start -> HUB_NIGHT -> Gate Run won -> Ω -> A_reborn -> HUB_NIGHT' in first_playable, 'first playable smoke script が見つかりません'
assert 'BGM' in js and 'hz-bgm-companion' in js, 'BGM companion UI が見つかりません'
assert 'START待ち' in js and 'FOLLOW中' in js, 'BGM 状態表示の短いラベルが見つかりません'
assert '初回操作後にMusicでSTART' in js and '自動再生制限は迂回せず' in js, 'BGM companion の操作後START表示が見つかりません'
assert 'data-bgm-phase' in js and 'hazama-control' in js, 'BGM 接続状態または停止制御が見つかりません'
assert 'connectionState' in js and 'autoFollow' in js and 'outputLevel' in js, 'Music companion feedback fields が見つかりません'
assert 'data-music-state' in js and 'dataset.musicAutofollow' in js and 'dataset.musicCulture' in js, 'Music feedback data attrs が見つかりません'
assert 'MUSIC.FOLLOW' in js and 'MUSIC.STOP' in js and 'ARC.' in js, 'Music companion short labels が見つかりません'
assert 'canEnterOmega' in js and 'まだ入れない / 扉の開き' in js, 'Ωロック条件が見つかりません'
assert 'hz-choice-main' in js and 'hz-choice-meta' in js, '選択肢の主文/補足表示が見つかりません'
assert '夜のハブへ戻る' in json.dumps(depths, ensure_ascii=False), '人間語の選択肢が見つかりません'
assert '落ち着き' in js and '響き' in js and '立て直し中' in js, 'v2.25 の説明語彙が見つかりません'
assert 'A_start' in depths, 'hazama-depths.json に A_start がありません'
assert 'HUB_NIGHT' in depths, 'hazama-depths.json に HUB_NIGHT がありません'
print('OK: startup smoke passed')
PY

echo "Smoke check passed: ${ROOT_URL}"
