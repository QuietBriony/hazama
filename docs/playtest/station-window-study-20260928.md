# 視覚試作02 — 間の駅（2026-09-28）

## 狙いと境界

ユーザーの提示したThree.js/HD-2Dの雨の駅・窓・一瞬の画像破綻は、
技術スタックやキャラクターを模写せず、「見た／見なかった」で同じ場所の意味が変わる
Hazamaの場面として試す。これは独立した[tools-onlyページ](../../tools/visual/station-window-lab.html)。
本編の表紙やルートではない。ゲーム進行、`hazama_spiral_v1`、`depths-shell.json`、
音、PWA cacheには接続しない。Three.js、外部ライブラリ、音源も入れない。

## 短い体験

1. 雨の終電後の駅を、車内の窓越しに見る。
2. 「窓の奥を確かめる」か「視線を外す」を選ぶ。
3. 同じ窓へ戻る。前者では見た継ぎ目が残り、影がこちら側に移る。
   後者では内側に曇りが生じ、再訪時に向こう側の人影を発見する。

単なる綺麗な駅画ではなく、選択が視界に残るかが試験点。文章は意図的に短くした。
選択時の色ずれは一度だけで常時点滅しない。動きは手動で停止でき、
端末の`prefers-reduced-motion`が初期設定に反映される。

## 作り方と出典

背景`tools/visual/assets/hazama-station-night-01.png`は、ユーザー画像をムード参照として
内蔵ImageGenで新規生成した原画。既存の駅・キャラクター・投稿画像を複製していない。
ローカル生成元は`C:/Users/cta88/.codex/generated_images/01a06b28-e71f-7932-82f2-2f07abc9be40/exec-003340ad-6dee-4665-a054-b6972cc83d67.png`。
生成後は無変換でrepoへコピー。以下が使用したプロンプト全文。
SHA-256: `a91ea406e0c4a665772ed1ecc4c27fd521d865c0ea69043f103d5e8d7cde5b56`。

```text
Use case: stylized-concept
Asset type: original game environment backdrop for a responsive, interactive Hazama station micro-scene
Primary request: an empty small Japanese railway station platform at night in steady rain, viewed from across the tracks. It is ordinary enough to recognize, but its architecture subtly suggests a second structural layer beneath the visible world.
Scene/backdrop: wet tracks and platform, steel canopy, one dim waiting room with a few warm amber windows, deep perspective into darkness. No train, no near-camera door frame: the interactive page will add its own foreground window and reflections.
Style/medium: cinematic 2.5D game-environment painting with believable materials and restrained fine pixel texture at distant edges; compatible with a dark industrial, peeling-world visual language, not a cute anime scene.
Composition/framing: wide landscape establishing image, station readable when center-cropped to a tall phone screen; a clear central area for a small overlay silhouette and lower area for interface text. Distinct near, middle, and far depth planes; avoid important objects on extreme left/right.
Lighting/mood: cold blue-teal rain and deep charcoal shadows, sparse aged amber practical light, quiet unease, subtle rust and exposed cables. Wet reflections, haze, architectural scale.
Constraints: original location and composition, no people or characters, no train, no visible text or signage lettering, no logos, no watermark, no rendered UI. Do not reproduce any reference screenshot, show no horizontal RGB glitch yet (the browser supplies that only when the player observes).
```

窓枠・雨・影・曇り・色ずれはHTML/CSS、選択と有限の演出だけJS。
画像を除いて本編assetやruntimeコードは再利用・変更していない。

## Agent確認と未判定

- `node scripts/hazama-check.mjs`は2 PASS / 0 FAIL、JS構文チェックPASS。
- ローカルの320×568、390×844、1440×900で表示を確認。両分岐の再訪まで操作し、
  320pxで横スクロールなし。`localStorage.length=0`のまま。
- 390pxで選択直後の有限グリッチも撮影して確認。動き停止と
  `prefers-reduced-motion: reduce`の初期反映を確認。
- 実スマホでの視認性・動きの体感、初見での解釈、作品全体への採否は未判定。
  この試作はまだ公開されていないため、スマホの遠隔ブラウザからは開けない。

## 次のhuman gate

端末で初見に近い条件で見て、絵の強さより「選択後、同じ場所へ戻った理由」を
説明できるかを聞く。グリッチが意味を補うか、怖さを奪っていないかも確認する。
本編に入れる場合は、既存の本文/読書優先表示を損なわない小さな場面として別設計し、
画像の配信容量とスマホ性能を検証してから採用を判断する。
