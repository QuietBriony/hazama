# Session Ledger — Hazama

Hazama 自律開発 session の追記専用ログ。
新しい session は最新エントリを読んでから始める。
古いエントリは編集せず、新しいものを先頭に積む。

## Entry Format

```text
## YYYY-MM-DD — one-line summary
- agent      : agent / model
- goal       : session goal
- shipped    : files / behavior
- checks     : PASS / FAIL / SKIP
- backlog    : closed / added items
- next       : recommended next task
- blockers   : human wait / unresolved issue
```

---

## 2026-05-25 — Playful Gate Run polish
- agent      : Codex
- goal       : first playable の route / balance を変えず、Gate Run の選択が少し楽しく読めるようにする
- shipped    :
  - `hazama-main.js` / `hazama-style.css`: Gate Run に `今のノリ` pulse、状態別の推し手、`おすすめ` action highlight、A_reborn の loop flavor copy を追加
  - `index.html` / `hazama-index.html` / `sw.js` / smoke scripts / docs: runtime asset 更新に合わせて v2.39 / `hazama-pwa-v2.39` へ同期
- checks     : `node --check hazama-main.js` -> PASS; `node scripts/hazama-consistency-smoke.mjs` -> PASS; `node scripts/first-playable-smoke.mjs` -> PASS; `node scripts/hazama-check.mjs` -> 6 PASS / 0 FAIL / 2 SKIP; `git diff --check` -> PASS
- backlog    : HZ-BL-001 / HZ-BL-002 は human-gate のため open 維持。HZ-BL-003 は数値変更なし
- next       : 実機スマホで `今のノリ` / `おすすめ` が楽しい補助に見えるか、押し付けに見えないか記録
- blockers   : 実機 PWA / offline、スマホBGM、ゲーム性 taste は human wait

## 2026-05-25 — Human validation handoff baseline
- agent      : Codex
- goal       : v2.38 Pages deploy 後の次作業を、実機 / 人間 evidence 取得に絞って迷わないようにする
- shipped    :
  - `docs/autonomy/README.md` / `STACK-INDEX.md` / `closeout-checklist.md`: harness-quality checklist candidate への導線を追加
  - `docs/autonomy/BACKLOG.md`: HZ-BL-001 / HZ-BL-002 の次 pass 対象を v2.38 Pages 実機確認として明記
- checks     : `node scripts/hazama-check.mjs` -> 6 PASS / 0 FAIL / 2 SKIP; `git diff --check` -> PASS
- backlog    : HZ-BL-001 / HZ-BL-002 は human-gate のため open 維持。HZ-BL-003 は具体的な人間 playtest friction 待ち
- next       : Pages 版で install / standalone / offline reload と 5〜8分 first playable taste pass を人間が記録
- blockers   : 実機 PWA / offline、スマホBGM、ゲーム性 taste は agent だけでは完了不可

## 2026-05-24 — Gameplay consistency polish
- agent      : Codex
- goal       : 既存 first playable を壊さず、矛盾検証と「次にやること」の体感導線を強める
- shipped    :
  - `hazama-main.js` / `hazama-style.css`: `展開` パネル内に初回ループ guide、次アクション、主導線/補助/BGM の優先順位を常時表示
  - `scripts/hazama-consistency-smoke.mjs` / `scripts/hazama-check.mjs`: depth graph、first playable route、Ω lock/relock、version drift、次アクション導線を依存なし smoke に追加
  - `index.html` / `hazama-index.html` / `sw.js` / smoke scripts / docs: runtime asset 更新に合わせて v2.38 / `hazama-pwa-v2.38` へ同期
- checks     : `node --check hazama-main.js` -> PASS; `node --check scripts/hazama-consistency-smoke.mjs` -> PASS; `node scripts/hazama-consistency-smoke.mjs` -> PASS; `node scripts/balance-smoke.mjs` -> PASS; `node scripts/first-playable-smoke.mjs` -> PASS; `git diff --check` -> PASS; `node scripts/hazama-check.mjs` -> 6 PASS / 0 FAIL / 2 SKIP; in-app browser desktop/mobile -> v2.38 next-action guide visible, no horizontal overflow
- backlog    : HZ-BL-001 / HZ-BL-002 は human-gate のため open 維持。HZ-BL-003 の数値調整は具体メモ待ち
- next       : 実機スマホで `次にやること` guide、同じ画面BGM、次周回Ω再ロックが集中を邪魔しないか記録
- blockers   : 実機 PWA install/offline、BGMバックグラウンド継続、ゲーム性の taste 判断は human wait

## 2026-05-20 — Same-screen mobile BGM path
- agent      : Codex
- goal       : スマホでゲーム画面へ戻ってもBGMを鳴らしながら遊べるよう、別タブ依存を避けるBGM導線を追加する
- shipped    :
  - `hazama-main.js` / `hazama-style.css`: `BGM` チップと `同じ画面で鳴らす` から、同じページ内の lightweight Web Audio BGM を開始
  - `hazama-main.js`: `hazama-profile` の sanitized audio / ucm / stage を使い、テンポ・密度・明るさ・低域・簡易フレーズを生成
  - `hazama-main.js`: 可能な環境では Web Audio を hidden media stream bridge に流し、iOS / Bluetooth / media route へ寄せる
  - `index.html` / `hazama-index.html` / `sw.js` / smoke scripts / `README.md`: runtime asset 更新に合わせて v2.37 / `hazama-pwa-v2.37` へ同期
- checks     : `node --check hazama-main.js` -> PASS; `git diff --check` -> PASS; `node scripts/hazama-check.mjs` -> 5 PASS / 0 FAIL / 2 SKIP; in-app browser mobile BGM start -> `INLINE` / `playing`
- backlog    : HZ-BL-002 は human-gate のため open 維持。ただしスマホBGMの主要な構造問題は同一画面再生へ寄せた
- next       : 実機スマホで `同じ画面で鳴らす` -> 通しプレイ -> ロック画面/ホーム移動時の挙動を記録
- blockers   : 実機OSのバックグラウンド継続、Bluetooth route、最終的な音量/音色の好みは human wait

## 2026-05-20 — Story-first loop and next-loop polish
- agent      : Codex
- goal       : 実機プレイの違和感を受け、BGM導線、Ω周回、選択UIを first playable の範囲で整える
- shipped    :
  - `hazama-main.js` / `hazama-style.css`: 本文後に単一 `展開` パネルを置き、Gate Run / 道の選択 / Breath休息 / セッション操作を集約
  - `hazama-gate-run.js` / `scripts/balance-smoke.mjs`: `A_reborn` 後や勝利後 retreat で次周回を開始し、Ωを再ロックするよう更新
  - BGM companion: 自動タブ起動と同一タブ fallback をやめ、スマホでは止まったらMusic側で再開する任意導線へ変更
  - `index.html` / `hazama-index.html` / `sw.js` / smoke scripts / `README.md`: runtime asset 更新に合わせて v2.36 / `hazama-pwa-v2.36` へ同期
- checks     : `node --check hazama-main.js` -> PASS; `node --check hazama-gate-run.js` -> PASS; `git diff --check` -> PASS; `node scripts/hazama-check.mjs` -> 5 PASS / 0 FAIL / 2 SKIP; in-app browser desktop/mobile DOM layout pass
- backlog    : HZ-BL-002 は human-gate のため open 維持。ただし今回の手触り指摘は runtime polish として反映済み
- next       : 人間のスマホ通しプレイで、BGM再開導線と「本文 -> 展開」動線が集中を邪魔しないか確認
- blockers   : 実機 BGMのバックグラウンド継続可否、PWA install/offline、ゲーム性の taste 判断は human wait

## 2026-05-19 — First-screen guidance polish
- agent      : Codex
- goal       : 初期画面で最初に何をすればよいか迷う問題を、静的 first playable の範囲で解消する
- shipped    :
  - `hazama-main.js` / `hazama-style.css`: `A_start` 上部に `最初にやること` guide、主CTA、初回ループ3手順を追加
  - `index.html` / `hazama-index.html` / `sw.js` / smoke scripts / `README.md`: runtime asset 更新に合わせて v2.35 / `hazama-pwa-v2.35` へ同期
- checks     : `node --check hazama-main.js` -> PASS; `git diff --check` -> PASS; `node scripts/hazama-check.mjs` -> 5 PASS / 0 FAIL / 2 SKIP; in-app browser desktop/mobile first-screen CTA pass
- backlog    : HZ-BL-002 は human-gate のため open 維持。ただし初期画面の迷いは修正済み
- next       : 人間の5〜8分通しプレイで、HUB後のGate Run判断が読めるか確認
- blockers   : 実機 PWA install/offline と taste 判断は human wait

## 2026-05-16 — Static contract and closeout hardening
- agent      : Codex parent + 3 worker agents
- goal       : PWA/static 契約を依存なし smoke に分離し、agent closeout と balance 判断の型を固定する
- shipped    :
  - `scripts/pwa-static-contract-smoke.mjs`: entry HTML / manifest / sw / icons / PWA文字列の静的契約チェック
  - `scripts/hazama-check.mjs`: pwa-static-contract smoke を必須ステップへ追加
  - `docs/autonomy/closeout-checklist.md`: commit / PR / handoff 前の agent 締めチェック
  - `docs/playtest/gate-run-balance-decision-rubric.md`: HZ-BL-003 の数値調整判断ルール
  - `README.md` / `docs/autonomy/`: 新しい smoke と docs への導線を追加
- checks     : `node scripts/hazama-check.mjs` -> 5 PASS / 0 FAIL / 2 SKIP
- backlog    : HZ-BL-003 は open 維持。ただし tuning の判断基準を準備済み
- next       : 人間の HZ-BL-001 / HZ-BL-002 結果が出たら、rubric に沿って HZ-BL-003 を実施するか判断
- blockers   : 実機 install/offline と taste 判断は agent では完了不可

## 2026-05-16 — Result templates and docs smoke
- agent      : Codex parent + 3 worker agents
- goal       : human-gated pass の結果記録をテンプレート化し、autonomy docs 接続を smoke で固定する
- shipped    :
  - `docs/autonomy/pwa-install-offline-result-template.md`: HZ-BL-001 実機結果テンプレート
  - `docs/playtest/human-playtest-template.md`: HZ-BL-002 人間プレイテスト記録テンプレート
  - `scripts/autonomy-docs-smoke.mjs`: autonomy docs / README / BACKLOG / LEDGER 接続確認
  - `scripts/hazama-check.mjs`: autonomy docs smoke を必須ステップへ追加
  - `README.md` / `docs/autonomy/`: 新テンプレートと smoke への導線を追加
- checks     : `node scripts/hazama-check.mjs` -> 4 PASS / 0 FAIL / 2 SKIP
- backlog    : HZ-BL-001 / HZ-BL-002 は open 維持。ただし結果記録の型まで準備済み
- next       : 人間がテンプレートを埋め、結果に応じて HZ-BL-001 / HZ-BL-002 を close または HZ-BL-003 へ進める
- blockers   : 実機 install/offline と taste 判断は agent では完了不可

## 2026-05-16 — Human-gate prep sprint
- agent      : Codex parent + 3 worker agents
- goal       : 残る human-gated item をすぐ回せる状態にし、次 agent への投げ先を準備する
- shipped    :
  - `docs/autonomy/pwa-install-offline-checklist.md`: PWA install/offline 実機確認の手順書
  - `docs/playtest/first-playable-agent-pass-2026-05-16.md`: in-app browser / smoke ベースの first playable pass note
  - `docs/autonomy/next-agent-prompts.md`: 次 agent 用の PWA / playtest / balance / Playwright prompt 集
  - `README.md` / `docs/autonomy/`: 新しい docs への導線を追加
- checks     : `node scripts/hazama-check.mjs` -> 3 PASS / 0 FAIL / 2 SKIP
- backlog    : HZ-BL-001 と HZ-BL-002 を ready-for-human へ前進。human-gate のため open 維持
- next       : 人間が HZ-BL-001 実機 PWA/offline、HZ-BL-002 taste playtest を実施。具体的な違和感が出た時だけ HZ-BL-003
- blockers   : 実機 install/offline と taste 判断は agent では完了不可

## 2026-05-16 — Multi-agent backlog sprint
- agent      : Codex parent + 3 worker agents
- goal       : HZ-BL-004 / HZ-BL-005 / HZ-BL-006 を並列で消化し、次の自律ランを軽くする
- shipped    :
  - `docs/autonomy/browser-smoke-fallback.md`: optional Playwright skip 時の手動 fallback
  - `docs/research/github-game-repo-scout-v0.md`: research scout decision pass
  - `scripts/localstorage-migration-smoke.mjs`: localStorage migration edge smoke
  - `scripts/hazama-check.mjs`: localStorage smoke を単一チェック入口へ統合
  - `README.md` / `docs/autonomy/`: 新しい smoke と fallback docs への導線を追加
- checks     : `node scripts/hazama-check.mjs` -> 3 PASS / 0 FAIL / 2 SKIP
- backlog    : HZ-BL-004 / HZ-BL-005 / HZ-BL-006 done
- next       : HZ-BL-001 PWA install/offline human pass、HZ-BL-002 first playable manual play notes
- blockers   : Playwright が無い環境では browser-backed smokes は SKIP。実機 PWA / offline は human-gate

## 2026-05-16 — Hazama autonomy engine import
- agent      : Codex
- goal       : music-stack の自律開発エンジンを Hazama に薄く取り込む
- shipped    :
  - `AGENTS.md`: Hazama repo operating contract
  - `docs/autonomy/`: STACK-INDEX / AUTONOMOUS-RUN / BACKLOG / SESSION-LEDGER / README
  - `docs/COLLAB-CLAUDE-AND-CODEX.md`: Codex と Claude の共同開発プレイブック
  - `scripts/hazama-check.mjs`: 既存 smoke を集約する単一チェック入口
  - `README.md`: 自律開発エンジンへの入口を追加
- checks     : `node scripts/hazama-check.mjs` -> 3 PASS / 0 FAIL / 1 SKIP
- backlog    : HZ-BL-000 done、HZ-BL-001〜007 を seed
- next       : HZ-BL-001 PWA install/offline human pass、または HZ-BL-002 manual play notes
- blockers   : 実機 PWA / offline は human-gate
