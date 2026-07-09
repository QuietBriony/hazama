# Stack Index — Hazama

Hazama を触る agent が最初に読む構造マップ。
作業フローは [AUTONOMOUS-RUN.md](AUTONOMOUS-RUN.md)、待ち行列は
[BACKLOG.md](BACKLOG.md)。

## Repo

ローカル配置: `C:\workspace\hazama`（1リポジトリ=1ビルド・没入版）

| area | role | key files | check |
|---|---|---|---|
| app shell | static entry / PWA install / offline wrapper | `index.html`, `manifest.webmanifest`, `sw.js`, `icons/` | `node scripts/build-consistency-smoke.mjs` |
| runtime | reveal 本文・沈下/認識/Ωゲート・五幹分岐（A の岐路・minCycle 階段）・二極終端・生成アート（反転ガーデン/曼荼羅/グリッジ）・内製Audio・spiral 記憶・縁カード・漂着/遺言（Drift・E7/E23） | `slice.js`, `slice.css` | 同上＋ブラウザ手動メモ |
| story data | 深度グラフ（72ノード・五幹：deep/soma/reso/casc/other が A で分岐し Z で再合流）・detour/variant 素材 | `depths-shell.json` | `node scripts/build-consistency-smoke.mjs`（到達性） |
| docs | playtest plan, balance notes, research, autonomy engine, 原典（`docs/source/`） | `docs/` | `node scripts/autonomy-docs-smoke.mjs` |
| playtest notes | agent/human passes and synthesis | `docs/playtest/` | review |

> 旧 forward 実装（`hazama-main.js` / `hazama-gate-run.js` / Gate Run 資源ゲーム / Music ブリッジ /
> v2.x smoke 群）は逆統合 R9 で撤去済み。履歴は git（沿革は `README.md` 末尾）。

## Current Loop（没入版）

`zero → A で降り方が分岐（構造/身体/流れ/崩壊/並行・周回 cycle で 2→3→4→5 択に開く）→ 各幹 …（構造読みで認識◆が育つ）… → Z 再合流 → Omega → below(∞) / reborn → 縁（二極: 深度Ω 到達 ⇄ 浮上して帰る）→ もう一度沈む（周回+1）/ すべて忘れる`

- A の岐路（`JUNCTIONS`）: 構造=deep / 身体=soma / 流れ=reso（cycle≥1）/ 崩壊=casc（cycle≥2）/ 並行=other（cycle≥3）。周回で `minCycle` 階段が開き 2→3→4→5 択に、構造読みも別の幹を通す
- 認識 attunement ≥ 6（`ATTUNE.omegaThreshold`）で Ω の極へ。未達は浮上の極＝有効な結末。
  E19: Ω は縁で賭けて勝ち取る（`requireAttune` の選択肢は認識 <6 では見える鍵でロック・浮上は常時可）
- 認識2.0（E3）: `deep:true` の構造読みのみ +1／表層読み −1（floor 0）／エコー門 Q・Z で
  視た断片の真偽（真+2・偽−1・逸らし0・周回毎一度・worldSeed 決定論）
- spiral 記憶（localStorage `hazama_spiral_v1`）: 周回/認識/痕跡は閉じても残る。
  transient（沈下/圧/戻り道/観測者）は残らない

Hard boundaries:

- static host compatible
- no build step
- no new dependencies
- no audio files（音は `slice.js` 内製 Web Audio）
- no raw player input persistence（保存は集計済み spiral 層のみ）

## Checks

Single entrance:

```bash
node scripts/hazama-check.mjs
```

It aggregates:

- `node scripts/autonomy-docs-smoke.mjs`
- `node scripts/build-consistency-smoke.mjs`

Human-gated PWA install/offline passes use
[pwa-install-offline-checklist.md](pwa-install-offline-checklist.md).
Record the result with [pwa-install-offline-result-template.md](pwa-install-offline-result-template.md).
Human taste passes can use `docs/playtest/human-playtest-template.md`.
Agent return packets and autonomy run reviews can use
[harness-quality-checklist-candidate-001.md](harness-quality-checklist-candidate-001.md)
as a candidate quality gate. It is a handoff aid, not permission to close
human-gated work.
