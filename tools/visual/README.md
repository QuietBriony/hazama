# Hazama visual studies

## 視覚試作02 — 間の駅（公開中・本編未接続）

[スマホで操作できる試作](https://quietbriony.github.io/hazama/tools/visual/station-window-lab.html?v=station-20260928-1) /
[ローカルファイル](station-window-lab.html) / [制作・試遊メモ](../../docs/playtest/station-window-study-20260928.md)。
2026-09-28の画像相談から作った、夜の駅の同じ窓を「確かめる／視線を外す」で
見直す短い分岐。背景はオリジナルの生成画、雨・窓枠・影・有限のグリッチはCSS。
Three.jsや外部依存は使わない。本編の進行・保存・音・PWAには接続せず、本編採用は未判定。

---

## 視覚比較01 — 入口画像

[スマホ向け比較ページ](https://quietbriony.github.io/hazama/tools/visual/visual-preview.html?v=visual-20260920-1)

ユーザーの「スマホからで見えるようにして」（2026-09-20）に基づく、静止画像だけの公開プレビュー。
公開後の「とりあえず入れ替えたら」を受け、候補01は本編E47の入口へ採用した。
この比較ページ自体は当時の静止画のまま。可読性のhuman gate通過を意味しない。
このページにruntime・外部依存・音・保存・PWA登録はない。[動く本編](https://quietbriony.github.io/hazama/?v=e47)。

## 収録画像

すべて2026-09-20に同じ会話で制作・撮影したPNGを無変換でコピーしたもの。
生成候補は既存の`assets/hazama-descent-key.webp`を参照した内蔵ImageGen出力。
画像内のUIは操作できないため、公開ページにも静止画であることを明記する。

| ファイル | 内容 | 寸法 |
| --- | --- | --- |
| `assets/hazama-peeling-world-01.png` | ImageGenの原画。文字・UIなし | 1536 × 1024 |
| `assets/cover-current-390.png` | 現行E46の表紙 | 390 × 844 |
| `assets/cover-candidate-390.png` | 背景＋表紙の露出・文字色・crop35%をDOM内で仮調整 | 390 × 844 |
| `assets/cover-candidate-1440.png` | 候補の横画面。中央crop | 1440 × 900 |
| `assets/reading-current-390.png` | 現行背景の零章。gate退場後 | 390 × 844 |
| `assets/reading-candidate-390.png` | 同じ零章で背景だけ交換。gate退場後 | 390 × 844 |

候補表紙は撮影時にCSS animationを無効化。現行表紙のタイトル色ずれとの比較は
背景だけの厳密なA/Bではない。読書画面は表紙用の露出調整を適用していない。
各画像の原寸リンクで拡大でき、ページは端末のズームを禁止しない。

原画SHA-256: `12d63a6b2d8985d244c0710f32c0dacd7dcb6b919933d9ae92c8c98b2471c900`。
元の画像・生成prompt・検証用スクリーンショットはローカルの`output/playwright/`に保持。
本編の形式変換/有限カメラは[実装と確認](../../docs/playtest/visual-entry-e47.md)へ。実機判断は別作業。
