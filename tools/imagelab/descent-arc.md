# descent-arc — キービジュアルを game 展開に連れて変化させる設計（E29 想定・order-of-record）

「展開に合わせてキービジュアルを変化させる」要望への設計。worker 工房（[README](README.md)）で生成する
**5 stage の弧**と、既存 runtime フックへの最小配線案。承認済みモチーフ = seed 123（微小フード人物＋
遠い暖ランタン＋teal 霧＋寒色 teal/rust）。**保存/route/depths schema は一切触らない。**

## 弧「沈下の背骨と裂ける終端」
深度(--sink)を背骨に、二極終端(body.surfaced/omega)を既存フックへ束ね、観測者累積は prompt 内モディファイア。
全 stage: seed 123 固定・共通 style-anchor 末尾（`painterly concept art, teal and rust palette, austere, awe and solitude, centered composition, cinematic`）・1280×768→1500×900 仕上げ。prompt 実体は `hz_stages.json`。

| key | game_trigger | 変化 | mode |
|---|---|---|---|
| **surface** | `data-phase="surface"`（--sink<0.18・cycle0）＝既定 hero・og:image | 基準（seed123）。暖光最強・構造が視える | txt2img |
| **drift** | `data-phase="drift"/"deep"`（--sink 0.18–0.75） | 人物縮小・暖光退く・teal 濃く・鉄錆格子露出。cycle≥1 で視線点ひとつ | hybrid |
| **bottom** | `data-phase="bottom"`（--sink≥0.75） | 溶ける微小点・曼荼羅が下から兆す・観測者点在（cycle 深いほど密） | hybrid |
| **surfaced** | `body.surfaced`（縁の浮上極） | 上向きに開ける・淡い暁光・世界は戻るが rust の残響 | hybrid |
| **omega** | `body.omega`（縁のΩ極＝attuned×wager） | 下向き収束の漏斗・中心は灼熱の空白（**核は描かない**）・曼荼羅外周光 | hybrid |

## 一貫性の担保
(1) seed 123 固定＋同一 sampler/CFG/解像度。(2) style-anchor token を全 prompt 末尾に一字一句同一。差分は
光量/スケール/霧/構造溶解/watcher/曼荼羅/収束方向の記述のみ。(3) 滑らかにするなら img2img chain
（surface→drift→bottom を denoise≈0.4–0.45 で連鎖・終端2枚は bottom の latent から構図方向だけ反転）。
観測者累積は独立生成せず prompt 内 watcher 節（no watchers→one pale glow→scattered motes）の漸進、
cycle 閾値で任意の `_c1/_c3` 変種のみ。禁止: 実在人物/N人/顔/テキスト焼き込み/核の直接描写。

## 配線案（E29・後方互換・schema 不変）
- **HTML**: `index.html` の単一 `<img class="hz-bg-descent" src="assets/hazama-descent-key.webp">` を、
  同 src（surface 基準＝default paint・og:image 一致）を **base 層に残したまま**、その上に `data-stage` を持つ
  4 枚（drift/bottom/surfaced/omega・既定 `opacity:0`）を絶対配置で重ねる層スタックへ。base が常に見える＝
  JS 無効/reduced/初回ペイントで従来と 1px も変わらない。
- **CSS**: `slice.css` に opacity クロスフェードのみ追加＝`body[data-phase="drift"] .hz-bg-descent[data-stage="drift"]{opacity:1}`
  を surface/drift(+deep)/bottom の3段、終端は `body.surfaced …[data-stage="surfaced"]` / `body.omega …[data-stage="omega"]`。
  既存 `--sink/--cycle-hue/--cycle-pan` フィルタを各層に継承＝stage 間微補間はタダ。transition は既存
  `prefers-reduced-motion` ガードに相乗り。
- **JS**: 追加実質ゼロ（`data-phase`・`body.surfaced/omega` は既に立っている）。観測者変種を出す時だけ
  `applyCycleSkin` 隣で `document.body.dataset.cycleTier = c>=3?'3':c>=1?'1':'0'` の1行。
- version 同期4点（index css/js・slice.js depths fetch・sw cache）＋smoke＋号令でのみ deploy。

## 状態
弧・prompt・配線案は確定。生成は worker(RTX2070) 必須＝worker 復帰後に `hz_stages.ps1`（seed123 txt2img・~2.5分）
一発で 5 枚。curate→ギャラリー更新→採用なら E29。関連 [[hazama-imagelab]] [[hazama-worker-render]]。
