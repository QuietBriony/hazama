# tools/blender — Hazama アセットの Blender 生成（build-time ツール・runtime 非依存）

Hazama は静的・依存ゼロ。ここは**オフラインでアセット画像を作る**ためのツール置き場であり、
ゲームの runtime には何も足さない（出力は静的画像1枚だけ）。

## 役割分担（cross-machine）
- **worker（MyComputer／`C:\workspace\blender-worker`＋Blender 5.2.0 LTS candidate＋RTX2070）側**
  … `hazama_descent_key.py` の**アートディレクション（何を描く／パレット／構図／核は描かない／`CFG` 数値）を発注書**として、
    実レンダで作り込む。既存の `blender-worker\renders\` 運用で名前付きバリアントを出してよい。
- **Fable（hazama repo 側セッション）** … 出た PNG を**目視で採否・方向出し**し、**E29 で本番配線**する
  （webp **1500×900 drop-in**＝`assets/hazama-descent-key.webp` を同寸置換・`?v=` 四点同期・smoke・visual-gate・deploy）。
  **最終採否は人間の目**。共通runtimeとrepo境界は
  [`docs/BLENDER-AUTHORING.md`](../../docs/BLENDER-AUTHORING.md) を正本とする。

## descent-key 背景（最優先アセット）
- スクリプト: `hazama_descent_key.py`（完全手続き・外部テクスチャ無し。上部 `CFG` を数値で追い込む＝反復の要）
- 目標: `assets/hazama-descent-key.webp` の置換。**現行と同寸 1500×900**＝CSS/OG 無改変の drop-in。
  （このアセットは 3役: `index.html` の背景 `<img>`／`og:image`／`.hz-glitch` の RGB ゴースト）
- 走らせ方: system `PATH` の `blender` は使わず、
  `C:\workspace\blender-worker\bin\invoke-blender.ps1 -Runtime candidate`
  の `-BlenderArgs` に `--background --factory-startup --python-exit-code 1 --python <script>` を配列で渡す。
  出力先は `C:\workspace\blender-worker\renders\hazama-game\<job-id>\`。
- compositorはBlender 5.2の `compositing_node_group`＋socket式Glareと、
  legacy 4.5の `Scene.node_tree`＋`FOG_GLOW` を分岐。両方のlow-cost
  headless smokeで適用marker・PNG生成・exit code 0を確認済み。
  最終1500×900候補の採否は引き続き人間の目。
- 描くもの: 世界の表皮が剥がれ、鉄錆の編み目＝竪坑が露れる。坑は暗闇へ沈み、底中央から核の"気配"だけが霧に滲む
  （**核そのものは決して描かない**＝遮蔽＋霧で滲みのみ）。硬い・乾いた・冷たい・威圧。モバイル cover で中央縦帯が主役。
  パレット: 地 `#04060b` / 冷青緑 `rgb(127,182,196)` / 鉄錆 `rgb(196,107,90)` / 核グロー `rgb(159,208,219)`。

## 受け渡し
PNG は `blender-worker\renders\` にだけ出し、人間が
「もっと暗く／錆を強く／核を沈めて／坑を細く／霧を濃く」をレビューする。
採用する場合も、最終用途向けに最適化したWebP/JPGだけを別の明示承認付き変更でrepoへ入れる。
