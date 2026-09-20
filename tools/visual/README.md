# Hazama visual preview — candidate 01

[スマホ向け比較ページ](https://quietbriony.github.io/hazama/tools/visual/visual-preview.html?v=visual-20260920-1)

ユーザーの「スマホからで見えるようにして」（2026-09-20）に基づく、静止画像だけの公開プレビュー。
本編E46への採用や可読性のhuman gate通過を意味しない。新しいruntime・外部依存・音・保存・PWA登録はない。

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
本編採用時の軽量化・全深度の検証・実機判断は別作業。
