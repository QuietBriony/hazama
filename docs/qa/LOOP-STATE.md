# LOOP-STATE — Hazama QA ループの栞

ループは毎回ここを読んで再開する。更新は追記でなく**この値を書き換える**。

- current_phase: DONE（QA一巡完了・2026-06-23）
- phase_label: 完了。全25機能 検証 pass・敵対的エッジ検査クリア・**実バグ0**。P3=N/A（欠陥なし）・P4=N/A（修正0）
- loop_status: STOPPED（次の自動起床なし。再開は再び /loop で）
- last_row_id: F25
- canonical: docs/qa/feature-stories.csv
- baseline_check: 2 PASS / 0 FAIL（node scripts/hazama-check.mjs）
- preview_serverId: 9449ff33-dd4d-4f08-8f01-ebeb6d0422cd（port 8740・preview_start name=hazama）
- P2進捗: 25/25 完了。happy-path で実バグ0（console0・smoke 0FAIL）。不具合列はツール癖(F01)/human-gate(F07,F16)/網羅注記のみ。

## Phase 3 計画（修正）
Phase2 happy-path は欠陥0。確定前に「敵対的エッジ検査」を1チャンク行い、実バグが出たら working tree のみで修正→hazama-check 0FAIL→P3列、出なければ「修正0」を確定して Phase4(=再テスト不要)へ。
### 敵対的エッジ検査リスト（次イテレーション）
1. forgetAll: spiral 全消去＋遅延 restart で新規表紙（hazama_spiral_v1 が消える）
2. 深部ロック: observer≥9(DEEP_LOCK) で retreat しても戻れない（failTo へ落ち dread 跳ね）
3. エコー門 Q 真偽: 真=+2 / 偽=-1+dread / 逸らし=0（__hz.go('Q')・要 visits 既訪 or detoursSeen）
4. mobile width 溢れ: preview_resize preset=mobile → documentElement.scrollWidth<=clientWidth
5. 連打ガード(E14): reveal 中の choices は disabled=true（appear 前タップ無効）
6. F11 補足: 弾き surface(divert/surfaceBounces++)が現コンテンツに存在するか depths 走査
出た不具合のみ P3 で修正。なければ Phase4 スキップ＝SESSION-LEDGER に「QA一巡・欠陥0」を記しループ終了。

## preview の知見（次イテレーションで必須）
- **preview_click（合成click）は #gate-enter で発火しない**＝ツール癖。代わりに preview_eval で
  `document.getElementById('id').click()`（native click）か、`window.__hz.choose(choiceObj)` を使う。
- dev hook: `window.__hz = { go(id), choose(c), state, isAttuned(), edge(), card(attuned), garden(d,dr,seed), sink, attunement }`。
  任意ノードへ `__hz.go('Q')`、終端は `__hz.edge()`、縁カードは `__hz.card(true/false)`。
- reveal はアニメ遅延あり（REDUCED=false）。本文/choices 取得前に sleep 4500ms 程度。
- console は全工程エラー 0。

## Phase 切替条件（再掲）
- P1→P2: 全機能行に P1_story=✅  ← 達成
- P2→P3: 全行に P2_テスト結果  ← 11/25
- P3→P4: 全 P2 不具合に P3_修正
- P4→終了: 修正行に P4_再テスト

## 進行ログ（新しい順に追記）
- iter6: Phase3 敵対的エッジ検査＝全クリア。F11 完全合格(J→det_mirror divert・surfaceBounces++・rejoin K・認識−1)／F03 表層侵食−1 直接観測／forgetAll(cycle2→全消去→fresh zero・新spiral cycle0再生成)／深部ロック observer9(retreat→E_noreturn・戻り道消えず・refused+1・dread↑)／エコー門Q 真断片=+2／mobile 横溢れ0(背景fixedのみ)／弾きsurface=A→soma と J→K の2つ(detours は slice.js DETOURS・json に det は無)。**実バグ0**。P3 全行 N/A・hazama-check 2PASS/0FAIL。ループ STOP。SESSION-LEDGER に一巡完了を追記。総ノード数=72（README沿革の「42」は逆統合期の旧値・trunk追加で増）。
- iter5: Phase2 終端＋単体チャンク。__hz.edge/card/go で実走＝F04(surfaced/omega 二極)・F05(reborn Ω貫き locked『認識3/6』)・F06(cycle=3 で五幹開示)・F12(縁の二択)・F13(カード1080×1350・Ω底光/浮上上光で二極)・F14(reload で戻り表紙『また、来た』＋漂着)・F17(lp.html 200/五軸/OG1200×630/自己完結)・F18(belowLoop 0→1→2)・F20(代替:@media+REDUCED)・F21(♪chip 反転) を pass。**P2 25/25 完了・happy-path 実バグ0・console0**。current_phase 3 へ。
- iter4: Phase2 降下チャンク。沈む→零章→descend で A→E→E_noreturn→F を実走。F02(3 kind routing)・F15(onboard 一行)・F03(認識 0→4)・F24(◆◆◆◆◇◇・戻り道5→0・観測者1→3)・F10(観測者3 中盤 retreat→E_noreturn・戻り道−1・抗った+1) を pass。F11 は A→soma 分岐のみ確認(弾き divert は深幹に無く未到達)。P2 15/25。console0。注意: 降下ループは1eval=1〜2step まで(reveal ~6-15s・eval 30s制限)。reveal 待ちは choices ポーリングで。
- iter3: Phase2 開始。hazama-check 2PASS/0FAIL（F22/F23/契約系=pass）。preview_start(hazama)で実走＝表紙→沈む→零章OK(本文5行/descend+retreat/観測者=私/戻り道5)・console0。F01,F02,F24,F25 を browser pass、F08,F09,F13,F22,F23 を契約pass、F07/F16 を human-gate 記録。P2 11/25。preview合成clickが不発の癖を発見（native click/__hz.chooseで回避）。
- iter2: Phase1 第2チャンク＝F16〜F25 を起こし棚卸完了（計25機能・全✅）。version三点同期 e21。CSV検証OK。human_gate=yes は F07,F16。current_phase を 2 へ。
- iter1: baseline 取得（2 PASS/0 FAIL）。Phase1 第1チャンク＝F01〜F15 を確定行番号付きで棚卸。
- (init) スキャフォールド作成。Phase 1 から開始。
