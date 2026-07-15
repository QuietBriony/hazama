# LOOP-STATE — Hazama QA ループの栞

ループは毎回ここを読んで再開する。更新は追記でなく**この値を書き換える**。

- current_phase: DONE（QA一巡完了・2026-06-23）
- phase_label: 完了。全25機能 検証 pass・敵対的エッジ検査クリア・**実バグ0**。P3=N/A（欠陥なし）・P4=N/A（修正0）
- loop_status: STOPPED（次の自動起床なし。再開は再び /loop で）
- last_row_id: F36
- canonical: docs/qa/feature-stories.csv
- baseline_check: 2 PASS / 0 FAIL（node scripts/hazama-check.mjs）
- preview_serverId: 9449ff33-dd4d-4f08-8f01-ebeb6d0422cd（port 8740・preview_start name=hazama）
- P2進捗: 25/25 完了。happy-path で実バグ0（console0・smoke 0FAIL）。不具合列はツール癖(F01)/human-gate(F07,F16)/網羅注記のみ。
- addendum（2026-07-09・docs-only 追記、この一巡の記録=上記25機能・欠陥0は不変）: E23（生成 testament）を **F26** として正典 CSV へ追加。正典は**26機能**に更新。P2はこのセッションの実走で pass 済み（human_gate=yes＝頻度・レジスタの採否は実機）。次ループの Phase2 で F26 を通しで再検証すること。
- addendum（2026-07-15・docs-only 追記＋独立検証、上記25機能・欠陥0＋F26 の記録は不変）: 本番が E24〜E27 まで進んだのに正典が F26 で止まっていた乖離を是正。E24〜E27 のプレイヤー観測可能な新挙動を **F27〜F36（10行）** として追補し、正典は **36機能** に更新。P2 は worker(opus) が**実装者と別の目**で独立検証＝自前 static server(:8747)＋headless Chrome+CDP で `window.__hz`・`Emulation.setEmulatedMedia` を駆り、各行の期待挙動を実走確認（**10/10 pass・console error 0**）。human_gate=yes は **F33（浮上の音戻し＝耳）** のみ（コードパスは無例外で実行を確認）。F27 のピクセルの見えは visual-gate（機構は machine 検証済）。歴史（25機能・欠陥0 の一巡）は不変。次ループの Phase2 で F27〜F36 を再検証すること。

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
- iter8（docs-only＋独立検証）: 本番 E27 と正典 F26 の乖離を是正。E24〜E27 を **F27〜F36** に採番して CSV 追補（既存13列スキーマ準拠・根拠 file:line は grep 実測）。**独立実走検証**＝python http.server:8747 ＋ headless Chrome(:9333)+CDP（Node 標準 WebSocket）で `__hz`/`Emulation.setEmulatedMedia` を駆使し **10/10 pass**: F27(prefers-contrast:more で --ink-dim #6b7682→#858f9b 引き上げ・scrollbar-width=thin)／F28(認識0→1 で #attune.pulse=true・増えない render では非付与)／F29(遷移後 activeElement=最初の択)／F30(A→soma で認識 3 不変・非 A surface で 3→2)／F31(初◆グロス発火＋key セット・2度目非表示)／F32(reborn 約束 sub＋cycle===minCycle でのみ newly)／F33(surfaced コードパス＝audible は human-gate 耳)／F34(chosen/unchosen＋140ms 遅延・reduced 即時)／F35(cycle1 で早送り・初見無効)／F36(ghost 扉 cycle0 present・cycle3 消滅)。E27 の juice/早送りは reduced で無効化される仕様ゆえ **reduced を使わず**実タイマー＋実 click で検証。console error 0・node scripts/hazama-check.mjs 2 PASS/0 FAIL。正典 26→36機能・last_row_id F36 に更新（ループ Phase・完了済み一巡の記録は不変）。
- iter7（docs-only）: E23（生成 testament／below∞・attuned 専用・maybeForeignDrift/表紙ゲートは pick のみの単一 seat）を正典 CSV に F26 として追記。25→26機能。区分=漂着・根拠=slice.js:501/521/305＋build-consistency-smoke.mjs:281・human_gate=yes（頻度 attuned×42%×50%≈21%とレジスタ8種の採否は実機）。hazama-check 2 PASS/0 FAILを再確認。ループ Phase・last_row_id は動かさず（次回 /loop 起動時に F26 の Phase2 再検証から）。
- iter6: Phase3 敵対的エッジ検査＝全クリア。F11 完全合格(J→det_mirror divert・surfaceBounces++・rejoin K・認識−1)／F03 表層侵食−1 直接観測／forgetAll(cycle2→全消去→fresh zero・新spiral cycle0再生成)／深部ロック observer9(retreat→E_noreturn・戻り道消えず・refused+1・dread↑)／エコー門Q 真断片=+2／mobile 横溢れ0(背景fixedのみ)／弾きsurface=A→soma と J→K の2つ(detours は slice.js DETOURS・json に det は無)。**実バグ0**。P3 全行 N/A・hazama-check 2PASS/0FAIL。ループ STOP。SESSION-LEDGER に一巡完了を追記。総ノード数=72（README沿革の「42」は逆統合期の旧値・trunk追加で増）。
- iter5: Phase2 終端＋単体チャンク。__hz.edge/card/go で実走＝F04(surfaced/omega 二極)・F05(reborn Ω貫き locked『認識3/6』)・F06(cycle=3 で五幹開示)・F12(縁の二択)・F13(カード1080×1350・Ω底光/浮上上光で二極)・F14(reload で戻り表紙『また、来た』＋漂着)・F17(lp.html 200/五軸/OG1200×630/自己完結)・F18(belowLoop 0→1→2)・F20(代替:@media+REDUCED)・F21(♪chip 反転) を pass。**P2 25/25 完了・happy-path 実バグ0・console0**。current_phase 3 へ。
- iter4: Phase2 降下チャンク。沈む→零章→descend で A→E→E_noreturn→F を実走。F02(3 kind routing)・F15(onboard 一行)・F03(認識 0→4)・F24(◆◆◆◆◇◇・戻り道5→0・観測者1→3)・F10(観測者3 中盤 retreat→E_noreturn・戻り道−1・抗った+1) を pass。F11 は A→soma 分岐のみ確認(弾き divert は深幹に無く未到達)。P2 15/25。console0。注意: 降下ループは1eval=1〜2step まで(reveal ~6-15s・eval 30s制限)。reveal 待ちは choices ポーリングで。
- iter3: Phase2 開始。hazama-check 2PASS/0FAIL（F22/F23/契約系=pass）。preview_start(hazama)で実走＝表紙→沈む→零章OK(本文5行/descend+retreat/観測者=私/戻り道5)・console0。F01,F02,F24,F25 を browser pass、F08,F09,F13,F22,F23 を契約pass、F07/F16 を human-gate 記録。P2 11/25。preview合成clickが不発の癖を発見（native click/__hz.chooseで回避）。
- iter2: Phase1 第2チャンク＝F16〜F25 を起こし棚卸完了（計25機能・全✅）。version三点同期 e21。CSV検証OK。human_gate=yes は F07,F16。current_phase を 2 へ。
- iter1: baseline 取得（2 PASS/0 FAIL）。Phase1 第1チャンク＝F01〜F15 を確定行番号付きで棚卸。
- (init) スキャフォールド作成。Phase 1 から開始。
