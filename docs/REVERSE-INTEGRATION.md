# REVERSE-INTEGRATION.md — 逆統合（slice シェル土台 ＋ ゲーム移植）

> **Status: 完了（2026-06）** — R1〜R9 まで実施し、master root は没入版単一ビルドへ昇格済み。
> 本書は計画の歴史記録。現行の構成・検証は `README.md` と `scripts/hazama-check.mjs` が正。

ユーザー決定（2026-06-03）: **B＝逆統合**。slice（hazama-preview の没入シェル）を土台にし、
codex 側のゲーム（認識/Ωゲート・Gate Run・PWA・43深度コンテンツ）を slice 側へ移植する。
理由: 統合版（codex土台＋slice アート）は本文下にゲームUIが積層し "機能説明画面" 化しやすく、
slice の純没入（9層アート＋最小UI）にならない。土台を slice に替える。

## 安全制約（厳守）
- **本番 `hazama/`（master, 現 v2.45 の forward 統合版）は、逆統合が完成・承認されるまで無変更。**
- 開発は branch `claude/reverse-integration`。確認は別プレビュー（新規 or 既存 hazama-preview とは別口）。
- master push / 本番入れ替えはユーザー明示号令まで禁止。判断はメッセージで（AskUserQuestion 不可）。
- ロールバック基準: 本番 `7d5def9`(v2.45) / `f736c59`(v2.41) / `acba549`(統合前 codex)。

## 現状の素材
- **slice エンジン**: `slice/slice.js`(1107L)/`slice.css`(556L)/`index.html`(124L)。
  - 9層背景アート（abyss/grid/mandala/leak/glitch/vignette/scanline/grain/peel）＋最小UI（scene/choices/沈下ゲージ/observer/gate）。
  - state: sink/dread/returnPaths/observer/rank/cycle/legacy/visits。reveal本文・applyAtmosphere・below(∞)手続き生成。
  - 認識ゲート原型: resolveResist（RESIST_STRAIN=3 / DEEP_LOCK=9・observer 尺度）＋ renderEdge 終端。
  - データ: `fetch("depths-shell.json")`（42ノード・depthMeta v0 スキーマ）。
- **codex ゲーム**: `hazama-gate-run.js`(tuning/applyRecognition/isAttuned/omegaUnlocked/Gate Run資源)、
  `hazama-depths.json`(43ノード・depthMeta 完備)、PWA(manifest/sw/icons)、smoke 一式。

## 確定すべき設計判断
- **D1 コンテンツ**: production の 43深度 depthMeta を slice シェルで描画する（＝forward で作り込んだ本文/分岐を活かす）。
  → 既定でこれ。slice の depths-shell.json は廃し、hazama-depths.json を slice 用に読む adapter を入れる。
- **D2 Gate Run の扱い**（最重要・没入を左右）:
  - (a) **認識/Ωゲートのみ**（推奨）: slice の沈下/observer/returnPaths モデルに attunement(構造読みで育つ)＋
    Ω解放(attuned)＋二極終端(没入⇄浮上)を溶かす。資源ミニゲーム(charge/stability/turns/崩落)のUIは持ち込まない＝没入維持。
  - (b) **Gate Run 資源ゲームも移植**: charge/崩落等も slice 内へ（没入とトレードオフ・"機能説明" 再来リスク）。
  → **推奨 = (a)**。"ゲーム手応え" は slice 既存の resist/deep-lock＋認識/Ωで十分成立する。
- **D3 PWA**: slice をインストール/オフライン対応に（manifest/sw/icons 移植）。既定で yes。

## フェーズ（各段: 別プレビュー検証＋smoke＋commit。本番無変更）
- **R0 計画＋足場**（本書）: branch `claude/reverse-integration`、dev プレビュー先決定。
- **R1 slice が production コンテンツを再生**: `hazama-depths.json`(43深度 depthMeta)を slice レンダラへ
  流す adapter（depthMeta→slice DATA: lines=voice / choices / observer / kind / rank）。全グラフが slice シェルで通ることを確認。
- **R2 認識/Ωゲート**: `hazama-gate-run.js` の applyRecognition/isAttuned/omegaUnlocked を slice state へ。
  構造読み(descend)で attunement↑、Ω は attuned のみ、未達は renderEdge を二極（深みへ降りる⇄浮上して帰る）に作り替え。
- **R3 仕上げ（D2 の決定に従う）**: (a)なら認識ゲートの手触り調整のみ。(b)なら Gate Run 資源ループを slice 内へ。
- **R4 PWA**: slice 用 manifest/sw(VERSION)/icons。オフライン shell。
- **R5 smoke＋version＋本番化**: slice ビルド用に smoke 契約を移行/新設、version 採番、別プレビュー最終確認。
  ユーザー承認で本番（master root）を slice ビルドへ差し替え（forward 統合版からの置換）。

## 配信構成メモ
- 本番 Pages = `QuietBriony/hazama` master root（legacy・Actions無し）。master push で自動再ビルド。
- 逆統合の dev プレビューは別 repo/別 path（本番・hazama-integration-preview・hazama-preview と分離）。
