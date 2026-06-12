# E5 SPEC — 視覚の磨きとパターン変化（Tier A+B）

> **Status: 完了（2026-06-13）** — d3a6b61 として実装・検証済み。本書は発注の歴史記録。
> 現行の構成・検証は `README.md` と `scripts/hazama-check.mjs` が正。

発注書。実装は opus、レビュー/検証/コミットは管理側（Fable）。branch `claude/evolve-e5`。
対象: `slice.js` / `slice.css` / `index.html` / `sw.js` / `scripts/build-consistency-smoke.mjs`。
**触らない領域**: Spiral／認識・エコー門ロジック／Audio 内部（`glitchHit`/`pulseOnce` の呼び出しのみ可）。

## 0. 不変の制約

- 依存・asset 追加なし。モバイル軽量の規律を守る（garden は rAF なし・状態変化時のみ再描画、
  曼荼羅 30fps、バーストは短時間クラス付与）。
- **prefers-reduced-motion で全項目が安全**（新アニメは無効化 or 静止1枚）。
- 浅はクリーン（garden opacity≈0）・核は描かない、の原則は不変。
- `node scripts/hazama-check.mjs` 2 PASS / 0 FAIL がコミット条件。完了時 version `?v=e5` 同期
  （index css/js・slice fetch・sw VERSION）。

## A1. 浮上のウォッシュ（`body.surfaced` の CSS 新設）

JS は既に縁（浮上極）で `body.surfaced` を付与している（slice.js renderEdge）。CSS が無い。

- `slice.css` に追加（すべて 2.5s 前後の遅い transition＝水面を破る速度）:
  - 上からの光: `body.surfaced .hz-bg::after`（content:""・inset:0・
    `linear-gradient(to bottom, rgba(184,204,214,0.12), transparent 46%)`・pointer-events none）。
    ※ `.hz-bg::after` の新設が既存層と衝突しないこと（z-index/重なりを確認）。
  - 世界の骨格の退場: `body.surfaced .hz-bg-garden { opacity: 0.22 !important; }`
    （JS が inline opacity を持つため !important。transition も付ける）
    `body.surfaced .hz-bg-mandala { opacity: 0.04; }`（迫り上がりを解く: `top: 112%;` 程度へ）
  - 表層世界の戻り: `body.surfaced .hz-bg-descent { opacity: 0.55; filter: brightness(0.5) saturate(0.6) contrast(1.04); }`
    （沈下 var に依存しない固定値で「浮上した」を言う）
  - 色温度: `body.surfaced { --ink: #cdd6de; --accent: #8fc0cc; }` 程度のわずかな醒め。
  - グリッジ/leak は surfaced 中も生きてよい（世界は治らない）。ただし
    `body.surfaced .hz-scanline { opacity: 0.04; }` で圧を抜く。
- reduced-motion: transition なしで同じ静止状態に到達すること。

## A2. below(∞) の質感差（背景の凍結解除）

- `applyAtmosphere` の Garden 呼び出しで belowLoop を seed に畳み込む:
  `Garden.update(depthN, dr, (worldSeed() ^ Math.imul(state.belowLoop, 0x632be59b)) >>> 0)`
  - belowLoop=0 のとき `Math.imul(0,k)=0`＝XOR 恒等＝**通常降下の構図は従来と完全一致**（後方互換）。
  - below を一段下りるごとに庭が掻き直される＝「底なしの反復に質感差」をテキストだけでなく背景でも。
- コメントに意図を残す（設計目標 §4-6 の取りこぼし修正であること）。

## A3. ガーデン構図モード（パターン変化の本丸）

`Garden.draw()` を構図モード制に。**seed からモードを最初に決める**（`const mode = Math.floor(rng() * 4)`、
以降の rng 消費順は変わってよい＝構図互換は不要）。深度による破壊（mosh）は全モード共通で継続。

| mode | 名 | 構成 |
|---|---|---|
| 0 | 砂紋主体 | 砂紋 30〜34行・振幅↑・石 0〜1・市松なし or 小1 |
| 1 | 石組群 | 砂紋 10〜12行（薄く）・石 5〜7（環системы大きめ）・市松 0〜1 |
| 2 | 市松崩落 | 砂紋 12〜14行・石 1〜2・市松パッチ 2〜3（グリッド 8×6・glitched セル率↑） |
| 3 | 渦中心 | 砂紋を水平でなく**同心円/渦の掻き目**（seed 中心・半径段々・wobble）で描く・石 2〜3 を渦上に・市松なし |

- 実装規範: 既存の砂紋/石組/市松の描画をヘルパー関数に切り出し、mode で本数・配置・有無を変える。
  mode 3 の渦は同心円弧（40分割程度の閉路 or 弧）で、行数×ステップ数が既存と同程度の描画コストに収まること。
- 色・ブレンド（screen・反転色相）は不変。「浅はクリーン」も不変。
- 開発フック: `window.__hz.garden = (depth, dread, seed) => Garden.update(depth, dread, seed)` を追加
  （プレビュー検証専用コメント付き）。

## A4. phase 跨ぎの句読点（一度だけの強い破断）

- `applyAtmosphere` で `phaseFor(sinkNorm)` の遷移を検知（モジュール変数 `lastPhase`・state に入れない）。
  `PHASE_ORDER = ["surface","drift","deep","bottom"]` で**深くなる方向の跨ぎのみ**発火:
  - `document.body.classList.add("phase-break")` を 900ms（タイマーで除去・多重発火は先勝ち）
  - 既存バースト機構を借りる: `glitch-hard`＋`leak-on`（`--leak-rgb` はその時の LEAK からランダムでよい）
    を同時に短時間点ける（Glitch 内部を流用できるならそれでも可）
  - `Audio.glitchHit(0.9)`（未解禁なら no-op）
- `slice.css` に `body.phase-break` の上乗せ: scanline 増光＋`.hz-bg` の tear を一拍長く
  （既存 hz-tear 流用 or 専用 keyframes 1.2s）。
- restart/descendAgain/forget で `lastPhase` を "surface" に戻す。retreat で浅くなる方向では発火しない。
- reduced-motion: 発火自体を no-op（クラスを付けない）。

## B1. hover / focus-visible（PC 反応と a11y）

```css
@media (hover: hover) {
  .hz-choice:hover { background: rgba(127,182,196,0.10); border-color: rgba(127,182,196,0.4); }
  .hz-choice.retreat:hover { background: rgba(127,182,196,0.05); }
  .hz-chip:hover { color: var(--ink); border-color: var(--ink-dim); }
  .hz-gate-enter:hover { background: rgba(127,182,196,0.14); }
}
.hz-choice:focus-visible, .hz-chip:focus-visible, .hz-gate-enter:focus-visible {
  outline: 2px solid var(--accent); outline-offset: 2px;
}
```
（値は調整可。トーンを壊さない最小反応で。）

## B2. peel の seed 変化

- 現状 clip-path が keyframes 内に固定＝毎回同一のぎざ縁。
- keyframes から clip-path を外し（transform/opacity のみ）、`Peel.play()` が 3 種のぎざ縁
  polygon から「遷移ごとに」1 つ選んで inline `clip-path` を設定する（Math.random で可・演出のみ）。
  持続も 0.55〜0.7s で揺らす。reduced は従来どおり無効。

## B3. 表紙タイトルの RGB ずれ再接続（dead CSS の回収）

- `index.html`: `<div class="hz-gate-title" data-text="Hazama">Hazama</div>` に変更。
- `slice.css`: 未使用の `.hz-gate-art` / `.hz-tl-c` / `.hz-tl-r` 系（keyframes 含む）を**撤去**し、
  代わりに `.hz-gate-title::before/::after`（`content: attr(data-text)`・absolute 重ね・
  赤/シアン・±2〜3px・5.5s のゆっくり呼吸）を新設。`body.glitch-hard .hz-gate-title::before/::after`
  で一瞬大きく裂ける（既存グリッジ・バーストに同調）。
- reduced-motion: 呼吸停止・静止 ±1px（薄く）。

## B4. 周回スキン（周回≥1 の表紙写真の seeded 変化）

- root CSS 変数で実装: `--cycle-hue` / `--cycle-pan`。**cycle=0 は明示 guard で両方 0**
  （剰余式 `(c*7)%21-10` は c=0 で -10 を返すため、guard なしでは初回の見えが変わってしまう）。
  cycle≥1 は `((c*7)%21)-10` deg / `((c*13)%9)-4` %。
  - `.hz-bg-descent` の filter 連鎖の hue-rotate を `calc(var(--sink) * -8deg + var(--cycle-hue, 0deg))` に拡張、
    `object-position: calc(50% + var(--cycle-pan, 0%)) 50%;` を追加。
- JS: `applyCycleSkin()`（root へ2変数を set）を新設し、boot（Spiral.load 後）・renderNode の
  cycle++ 箇所・`consumeCycleBump` 後・restart/forget（0 に戻す）から呼ぶ。
- cycle=0 は両変数 0＝完全に従来どおり。決定論（Math.random 不使用）。

## smoke（build-consistency へ追加）

- css: `body.surfaced` / `phase-break` / `:focus-visible` / `.hz-gate-title::before` の存在
- js: `__hz.garden`（dev hook）/ `applyCycleSkin` / `lastPhase` / belowLoop seed 畳み込み
  （`belowLoop, 0x632be59b` の文字列で可）
- css に `.hz-tl-c` が**残っていない**こと（dead CSS 回収の担保）
- html: `data-text="Hazama"`

## 検証（必須・FAIL は自分で直す）

1. `node --check slice.js` / `node scripts/hazama-check.mjs` 2 PASS
2. ブラウザ（localhost:8740・SW/storage クリーンから）:
   - `__hz.garden(0.7, 0.3, seed)` を異なる seed×6 で呼び、`#garden` canvas の `toDataURL()` が
     **4 モードぶん相異なる**こと（ハッシュ比較）＋浅（depth 0.05）で opacity ≈ 0
   - `__hz.go("below")` 連打で背景 dataURL が毎回変わる（A2）
   - 縁（浮上極）で `body.surfaced` 適用後の computed style（garden opacity 0.22 / descent opacity 0.55）
   - sink を跨がせて `phase-break` が一度だけ付く（深→浅では付かない）
   - cycle=3 を仕込んで reload → `--cycle-hue` が root に立つ
   - console error 0
3. 最終メッセージ（12行以内）: diffstat・検証結果・判断で埋めた点。git 操作禁止。
