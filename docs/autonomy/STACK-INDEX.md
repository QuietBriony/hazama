# Stack Index — Hazama

Hazama を触る agent が最初に読む構造マップ。
作業フローは [AUTONOMOUS-RUN.md](AUTONOMOUS-RUN.md)、待ち行列は
[BACKLOG.md](BACKLOG.md)。

## Repo

ローカル配置: `C:\workspace\hazama`（1リポジトリ=1ビルド・没入版）

| area | role | key files | check |
|---|---|---|---|
| app shell | static entry / PWA install / offline wrapper | `index.html`, `manifest.webmanifest`, `sw.js`, `icons/` | `node scripts/build-consistency-smoke.mjs` |
| runtime | reveal 本文・沈下/認識/Ωゲート・二極終端・生成アート（反転ガーデン/曼荼羅/グリッジ）・内製Audio・spiral 記憶・縁カード | `slice.js`, `slice.css` | 同上＋ブラウザ手動メモ |
| story data | 深度グラフ（depthMeta v0・42ノード）・detour/variant 素材 | `depths-shell.json` | `node scripts/build-consistency-smoke.mjs`（到達性） |
| docs | playtest plan, balance notes, research, autonomy engine, 原典（`docs/source/`） | `docs/` | `node scripts/autonomy-docs-smoke.mjs` |
| playtest notes | agent/human passes and synthesis | `docs/playtest/` | review |

> 旧 forward 実装（`hazama-main.js` / `hazama-gate-run.js` / Gate Run 資源ゲーム / Music ブリッジ /
> v2.x smoke 群）は逆統合 R9 で撤去済み。履歴は git（沿革は `README.md` 末尾）。

## Current Loop（没入版）

`zero → …（構造読みで認識◆が育つ）… → Z → Omega → below(∞) / reborn → 縁（二極: 深度Ω 到達 ⇄ 浮上して帰る）→ もう一度沈む（周回+1）/ すべて忘れる`

- 認識 attunement ≥ 6（`ATTUNE.omegaThreshold`）で Ω の極へ。未達は浮上の極＝有効な結末
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
