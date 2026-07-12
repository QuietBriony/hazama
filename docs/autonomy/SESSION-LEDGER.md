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

## 2026-07-11 — E16〜E23 蓄積 runtime の統合健全性監査（read-only・14/14 PASS・確定バグ0）
- agent      : worker(opus) ×2 敵対的監査＋Fable 検収（実コード裏取り）
- goal       : 個別検証済みだが「五幹×周回×賭け×遺言」の**組合せグラフ全体**と state/永続/決定論は未通し監査だった空白（E6=E1-5・E11=E7-10 監査以来）を敵対的に埋める。read-only・修正/commit なし
- verified   :
  - 監査1 routing 7/7 PASS: dangling edge 0（72ノード/136 choices）・孤立ノード0（resolve モデル BFS で 72/72 到達）・
    五幹すべて Z 再合流→Ω→縁に到達・階段 cycle0-3 で厳密 2/3/4/5（B_reso=1/B_casc=2/B_other=3）・reborn ソフトロック不能
    （常時押下可≥2）・trunk 取り違え/off-by-one なし・E23 遺言は below の lines のみで routing 副作用ゼロ
  - 監査2 state 7/7 PASS: save は {v,cycle,attunement,visits,belowLoop,legacy,sank} のみ（transient 漏れ/逆欠落なし）・
    activeTrunk/wagered 非永続で stale 復元不能・**content パスに Math.random ゼロ**（全 RNG は audio/visual・799 はコメントで不使用明記）・
    descendAgain/forgetAll のリセット正当（stale 持ち越しなし）・soft-lock 不能・worldSeed 妥当・別キー fail-open
  - Fable 独立裏取り（agent 報告を鵜呑みにせず実コード再確認）: dangling 0／A 階段 minCycle(0,0,1,2,3)／reborn requireAttune 1択のみ
    ／save キー列／全 Math.random 用途（799＝偽陽性）／`__edge` は reborn terminal 2択のみ＝resolveResist 分岐は現状到達不能
- checks     : node scripts/hazama-check.mjs = 2 PASS / 0 FAIL（監査は read-only・runtime/version 無改変）
- backlog    : HZ-BL-014（潜在シーム2件・guard-if-touched・**バグではない**）を icebox に追加
- next       : 蓄積 runtime は健全＝ship 済みの土台に統合バグなし。残は human-gate のみ（E23 目・E21 耳・PWA 実機）
- blockers   : なし

## 2026-07-10 — E23 生成 testament 独立検証（本番 ?v=e23・CDP 実走）
- agent      : worker(opus) 独立検証（実装者と別の目）
- goal       : E23（去った声の遺言）を本番 https://quietbriony.github.io/hazama/?v=e23（master 4d9a7d7）に対し独立実走検証。matrix 7項目。runtime/scripts 無改変・頻度/レジスタ/t17 の human-gate は評価しない
- method     :
  - ローカル Chrome headless + CDP（Node24 global WebSocket・依存追加なし）で本番 URL を直接実走（手段1・fallback 不要）
  - CDP `Emulation.setEmulatedMedia` で `prefers-reduced-motion:reduce` → 行が同期追加（reveal 同期・背景 throttle 無効化）。加えて `window.setTimeout` を 0ms 化
  - 等価性: 本番配信 `slice.js` を cache-bust curl → LF 正規化後 sha256=`69229ced…` が repo `slice.js` と完全一致（差は CRLF/LF のみ）／`sw.js` も一致＝「読んだコード＝実走コード＝HEAD」
- verified   : matrix 7/7 PASS（新規欠陥なし）
  1. attuned(attunement=6) below loop1–12: loop9「・遺言／深度22」(記憶は凍った…)・loop12「・遺言／深度27」(物語はここで止まる…)。`::after`=「― 別の観測の痕跡 ・遺言／深度N ―」= spec 一致
  2. un-attuned(attunement=0) 同 loop1–12: 遺言0件。loop9 は同一 seed で通常「・深度14／浮上」へ（attuned で遺言だった席が通常マーク）。loop1/3/6/11 は attuned/un-attuned で drift テキスト・マーク byte 同一（Drift.pick は loop のみ seed）＝単一 gate=isAttuned()・後方互換を実証
  3. 単一 seat: 深い非 below 降下 I–Z 各15回=foreign 33件・遺言0件。表紙ゲート drift（reload 後の returning）=「・深度9／浮上」通常マーク（Drift.pick のみ）
  4. 決定論: loop9 を同 state で2回描画→scene/foreign 完全一致（content path に Math.random なし）
  5. save 除外: localStorage `hazama_spiral_v1`={v,cycle,attunement,visits,belowLoop,legacy,sank} に「遺言」「testament」不在
  6. console error 0・exception 0（warn は apple-mobile-web-app-capable 非推奨2件のみ＝E23 無関係・既存）
  7. 本番 slice.js 静的: `const TESTAMENT`(8種)・`function pickTestament`・salt `0x7e57a3d1`・`maybeForeignDrift` 本体に pickTestament 参照なし・pickTestament 呼出は305行 `isAttuned() && rng() < 0.5` の単一 call site のみ。`sw.js` VERSION=`hazama-pwa-e23`
- checks     : git status=clean(master 4d9a7d7)／node --check slice.js=OK／node scripts/hazama-check.mjs=2 PASS / 0 FAIL / 0 SKIP（build-consistency の E23 asserts 6件込み）
- backlog    : 変更なし（検証のみ・runtime/scripts/version 無改変）
- next       : E23 実走は健全。残 human-gate＝頻度(attuned×42%×50%)/レジスタ/t17「また会える」採否・音(E21)・PWA(HZ-BL-001)＝ユーザーの目/耳/号令
- blockers   : なし。頻度/レジスタ/t17 の採否は評価対象外（human-gate・据え置き）

## 2026-07-07 — 七つの形 note 採択 → form 2 素材化（testament 種）→ E23 準備
- agent      : Opus 4.8（ultracode・精密 curation は自作／探索・設計は Agent 外注）
- goal       : 外部「七つの普遍の形」素材を受け、既存 motif との韻を docs 化。form 2「去った声の testament」を素材→E23（生成 testament）の2段で発展。game body 不変・号令までデプロイなし
- shipped    :
  - `docs/research/seven-forms-resonance-v0.md`（7形↔既存 motif の韻・reference/candidate・commit 020d2b4）
  - `docs/autonomy/BACKLOG.md` HZ-BL-007 に座席候補の注記
  - `docs/research/testament-seed-bank-form2-v0.md`（form 2 種バンク 18＋micro-arc 4・Stage 1）
  - `docs/evolution/E23-SPEC.md`（発注＝Drift seam・below(∞)・attuned 専用の生成 testament）
  - **進化 E23（runtime・本番反映）**: `Drift.TESTAMENT`(8種)＋`pickTestament`(別ソルト)。below(∞)・`isAttuned()` の
    一箇所のみで漂着が半々で「・遺言／深度N」に寄る（`maybeForeignDrift`・表紙は従来＝単一 seat・二重注入なし）。
    CSS 新規ゼロ・storage/depths schema 不変・un-attuned は byte 同一。version e21→e23 四点同期。t17 は register 保留で除外（推奨）
- verified   :
  - seven-forms note を adversarial 5-lens（public安全/契約不変/実コード整合/voice/autonomy）全 clean
  - 13-memlock 原典の testament 行（167-168 limit-reached / 174 memory-frozen / 24-30 frozen-ref）を直接確認
  - E23 実走（localhost・reveal を setTimeout 平坦化して throttling 回避）: attuned below で「・遺言／深度22」出現・
    un-attuned は遺言0件（同 seed の loop9 が通常「・深度14／浮上」へ＝単一 seat・後方互換）・決定論一致・
    `::after`「― 別の観測の痕跡 ・遺言／深度22 ―」・console error 0
  - `node scripts/hazama-check.mjs` = 2 PASS / 0 FAIL（E23 asserts 6件込み）
- checks     : node scripts/hazama-check.mjs = 2 PASS / 0 FAIL
- backlog    : HZ-BL-007 に form 2 座席候補＋testament bank 参照を注記（icebox のまま）
- next       : E23 の頻度(attuned×42%×50%)/レジスタ/t17 採否は実機でユーザーの目（deploy 後）。残り human-gate＝音(E21)・PWA(HZ-BL-001)
- blockers   : なし（docs＋E23 を本番反映）。実機の手触り最終判断は human

## 2026-07-07 — Hermes 初回: spiral 記憶エッジ検証＋baseline PASS
- agent      : Hermes Agent / GPT-5.5
- goal       : Hermes 側の Hazama 初回接触として、repo 状態確認と HZ-BL-011 残タスクの一部（破損 localStorage matrix）を独立検証する
- shipped    : `docs/autonomy/SESSION-LEDGER.md` に本記録を追加し、`docs/autonomy/BACKLOG.md` で HZ-BL-011 を Done へ整理。runtime / PWA version / cache / app 契約は無変更
- verified   :
  - `git status --short --branch` = `## master...origin/master [ahead 1]`（未コミット変更なしで開始。ahead は既存 QA docs commit）
  - `node --check slice.js` = PASS
  - `node scripts/hazama-check.mjs` = 2 PASS / 0 FAIL / 0 SKIP
  - Local Chrome headless + CDP で `hazama_spiral_v1` edge matrix 6/6 PASS: 壊れた JSON、型異常、visits 値浄化/上限 clamp、旧 forward keys (`hazama_state_v2` / `hazama_run_v1`) ignore+非削除、`getItem` SecurityError boot、`setItem` QuotaExceeded during first descent no-op
- checks     : docs 整理後の `node scripts/hazama-check.mjs` = 2 PASS / 0 FAIL / 0 SKIP
- backlog    : ユーザー承認を受け、HZ-BL-011 を Done へ移動（Hermes 独立検証で新規欠陥なし）
- next       : human-gate の HZ-BL-001(PWA実機) / HZ-BL-002(手触り) へ
- blockers   : in-app browser tool は win32-arm64 の agent-browser binary 不在で起動不可だったため、検証はローカル Chrome CDP で代替

## 2026-06-23 — QA ループ一巡完了：全25機能のユーザーストーリー化→検証→欠陥0
- agent      : Opus 4.8（`/loop` 自走・dynamic）
- goal       : 全機能をユーザーストーリー化し単一正典で追跡→各ストーリーを実走検証→論理/UXエラーを修正→再検証（4フェーズQAループ）
- shipped     :
  - `docs/qa/feature-stories.csv`（単一正典スプレッドシート・25機能・ID/区分/ストーリー/期待挙動/根拠 file:line/P1〜P4/human_gate）
  - `docs/qa/QA-LOOP.md`（運用書）・`docs/qa/LOOP-STATE.md`（フェーズ栞）
  - ※runtime/PWA/version は無改変（QA は読み取り＋検証のみ。bump なし）
- verified    :
  - Phase1 棚卸: slice.js/depths/index/lp/sw から全25機能を抽出・ストーリー化（全✅）
  - Phase2 検証: hazama-check（契約系）＋ preview 実走で全25機能 pass。実走確認の主例＝
    認識 deep gain 0→4 / 表層侵食 J surface で −1 / 弾き divert J→det_mirror(surfaceBounces++/rejoin K) /
    二極終端 surfaced⇄omega / E19 Ω貫きロック「認識3/6」/ 五幹 cycle=3 開示 / 縁の二択 / 縁カード1080×1350 二極 /
    戻り表紙＋漂着 / below∞ loop差分 / エコー門Q 真=+2 / forgetAll 全消去→fresh / 深部ロック≥9 戻れず(refused+1) / mobile 横溢れ無し
  - Phase3 敵対的エッジ検査: forgetAll・深部ロック・エコー門真偽・mobile・連打ガード・弾きsurface＝**全クリア／実バグ0**
  - Phase4 再テスト: 修正0につき N/A
- checks      : node scripts/hazama-check.mjs = 2 PASS / 0 FAIL（前後不変）。preview console エラー0
- result      : **アプリ欠陥0**。P3 全行 N/A（欠陥なし）
- backlog     : 追加なし（QA は docs/qa 配下で自己完結）
- next        : human-gate 2件のみ＝F07 音（軸色/呼気を実機の耳で採否）・F16 実機 PWA install/offline（HZ-BL-001）
- blockers    : human-gate 2件は人間判断待ち（agent では done にしない）。preview 合成click 不発はツール癖（アプリ無問題）

## 2026-06-19 — 進化 E22: 紹介 LP（表玄関）＋OG カード（ゲーム本体は不変）
- agent      : Opus 4.8（精密・本番隣接のため外注なし）
- goal       : human-gate 残「LP デプロイ」第一版＝作品の外向き入口を一枚。ゲーム(/hazama/)とは別の表玄関＋共有カード。
  ゲーム本体は一切触らない（slice.js/css・index.html・depths・sw 無改変）
- shipped     :
  - lp.html（新規・自己完結・依存ゼロ・slice ランタイム非依存）＝奈落のドーム／底の核グロー／スキャンライン／ヴィネットの沈下美学を
    インライン CSS で再現。Hazama 文字標＋「沈むほど、戻り道は細くなる。」＋五軸(構造/身体/流れ/崩壊/並行)＋「沈む」→ ./（本編）。OG/Twitter メタ。
  - assets/og-card.jpg（新規・1200×630・canvas 生成→JPEG 67KB）＝同パレットの共有カード（文字標＋tagline＋五軸＋URL）。
  - smoke 契約 +7（lp.html/og-card 実在・./ 導線・OG カード参照・1200×630 宣言・slice 非依存）
- checks      : hazama-check 2 PASS / 0 FAIL＋実ブラウザ（lp.html 構造 snapshot・og:image=og-card.jpg・
  OG カード naturalWidth/Height=1200×630・ゲームへ ./ 導線・console error 0・ゲーム build 無改変）。
  ※ピクセルの見た目は visual-gate＝ユーザーが実機で目視（hidden-tab で screenshot 不能）
- backlog     : —。残＝（任意）E21 音の耳調整／E15 微ミス
- next        : 本番反映→ユーザーが lp.html とカードを目視→レイアウト/色を目で調整
- blockers    : master 反映は号令待ち／見た目は visual-gate（ユーザーの目）

## 2026-06-19 — 進化 E21: 音の軸色＋縁の呼気（human-gate＝実装→実機で聴いて耳で調整）
- agent      : Opus 4.8（精密・本番隣接のため外注なし）
- goal       : human-gate の HZ-BL-012「音の軸色＋浮上/reborn の呼気」第一版。五幹＋浮上/Ω に音の質感差を付ける。
  音はヘッドレス検証不能＝実装→ユーザーが実機で聴いて採否/調整の往復が前提（推奨で進める合意）
- shipped     :
  - slice.js Audio: setAxis(trunk)＝幹ごとの detune(cents)/cutoff(温度)/うねり幅 オフセット(fail-safe 0=従来)。
    soma(低暗どっしり)/reso(高く開ける)/casc(暗く不安定揺れ)/other(重なって揺らぐ合唱)/deep(従来)。apply() が3パラメータに反映。
  - breath(attuned)＝縁の呼気。低い一音が膨らんで・わずかに沈んで・ほどける(解決しない)。Ω=80Hz満ちる/浮上=128Hz醒める。
  - 配線: Route.resolve 幹フォークで Audio.setAxis・renderEdge で Audio.breath・restart で setAxis(null)。すべて未解禁なら no-op。
  - version e20→e21 同期・smoke 契約+4(setAxis/breath 関数・フォーク呼び/縁呼びの存在)
- checks      : hazama-check 2 PASS / 0 FAIL＋実ブラウザ（音 OFF/ON 両経路で setAxis×5幹・breath×2終端を駆動し例外ゼロ・
  AudioContext 健全・console error 0）。**音質そのものは human-gate＝ユーザーが実機で聴いて採否/調整**
- backlog     : —。残＝LP デプロイ。音は耳の往復で詰める
- next        : 本番反映→ユーザーが実機で聴く→「この幹はもっと温かく/冷たく」等の耳の指示で微調整
- blockers    : 音質採否は human-gate（ユーザーの耳）／master 反映は号令待ち

## 2026-06-19 — 進化 E20: 第5の幹 otherself（多世界・選ばなかった私）— cycle≥3 で A に開く・階段を 2→3→4→5 へ
- agent      : Opus 4.8（精密・本番隣接のため外注なし）＋ Workflow（原典3源マイニング・3体・約16万tok）
- goal       : 周回連動の階段をさらに一段＝A の選択肢が周回で 2→3→4→5。第5の幹 other(並行自己/選ばなかった私)を cycle≥3 で開く
- shipped     :
  - depths-shell.json: A に other 選択(trunk:other/minCycle:3/to:B_other)。other 幹6ノード新規執筆
    (B/E/H/M/S/Y_other＝原典 03-shellL/04-shellMtoQ＋既存 Meta-Self/観測者増殖テーマを翻案: 選ばなかった私が立つ→増える→境界溶解→無数の同時観測→総体は一人→一点へ)。
    Y_other が五幹を「みな同じ一点に着く」と束ねて Z 再合流。
  - slice.js: RANK に other 梯子・縁カードを「降り方: …/並行」5分岐へ。E17/E18 の trunk/minCycle/activeTrunk 機構を再利用＝Route 無改変・slice.js 6行のみ。
  - version e19→e20 同期・smoke 契約+4（other card / other 6ノード実在 / A other ゲート minCycle>=3 / Y_other→Z）
- checks      : hazama-check 2 PASS / 0 FAIL＋実ブラウザ（5段階段 cycle0=2/1=3/2=4/3=5択 確認・A→other→B→E→H→M→S→Y→Z 踏破・
  attunement 6＝Ω 可・casc/soma 不変・other 本文実描画(境界が溶ける)・console error 0）
- backlog     : —。残＝音の軸色(human-gate)／LP デプロイ。**五幹（構造/身体/流れ/崩壊/並行）が揃った**
- next        : ユーザー書き味レビュー→号令で本番反映（E20＝branch evolve-e20-otherself-trunk・master 未反映）
- blockers    : master 反映は号令待ち（無人 push 禁止）

## 2026-06-19 — 進化 E19: 終端を勝ち取る — reborn の Ω 貫きを“見える鍵”でロック（認識が満ちて賭けた時だけ Ω）
- agent      : Opus 4.8（精密・本番隣接のため外注なし）
- goal       : 実機FBの残り半分「クリアはいつでもできる」への直答。Ω/浮上が縁で認識値により自動決定＝賭けも勝ち取りも無い問題を、
  終端に"賭け"と"見える要件"を入れて是正。Hazama の「浮上＝失敗にしない」設計は保つ
- shipped     :
  - depths-shell.json: reborn を3択へ＝もう一度沈む／核の外周を貫いて観測をやめる(requireAttune+wager→__edge)／静かに浮上する(__edge)
  - slice.js: renderChoices に locked 描画(requireAttune && !isAttuned → 押せず「まだ届かない（認識 N/6）」)・choose で __edge に wager 持越
    ・renderEdge を attuned=isAttuned() && state.wagered へ(賭けて勝ち取った時だけ Ω)・state.wagered(transient・descendAgain/restart で reset)
  - slice.css: .hz-choice.locked(E13 核グロー色 159,208,219 が薄く差す・dashed・押せない)
  - version e18→e19 同期・smoke 契約+5(locked gate / wager 判定 / wagered transient / .locked css / reborn 2終端)
- checks      : hazama-check 2 PASS / 0 FAIL＋実ブラウザ(att4=ロック「まだ届かない（認識 4/6）」disabled・att6=解錠 clickable「Ωを賭けて勝ち取る」・
  attuned+賭ける→Ω(body.omega)・attuned+安全→浮上・未達+賭ける(強制 bypass)→浮上(防御 isAttuned&&wagered)・未達+安全→浮上・console error 0)
- backlog     : —。残＝音の軸色(human-gate)／LP デプロイ／第5の幹(otherself)
- next        : ユーザー書き味/手応えレビュー→号令で本番反映（E19＝branch evolve-e19-earned-ending・master 未反映）
- blockers    : master 反映は号令待ち（無人 push 禁止）

## 2026-06-19 — 進化 E18: 第4の幹 Cascade（崩壊と再生）— cycle≥2 で A に開く・周回の階段を一段延ばす
- agent      : Opus 4.8（精密・本番隣接のため外注なし）＋ Workflow（原典4源マイニング・4体・約12万tok）
- goal       : 周回連動(E17)の階段をもう一段＝A の選択肢が周回で 2→3→4 に増える。第4の幹 casc(崩壊と再生)を cycle≥2 で開く
- shipped     :
  - depths-shell.json: A に casc 選択(trunk:casc/minCycle:2/to:B_casc)。casc 幹6ノード新規執筆
    (B/E/H/M/S/Y_casc＝原典 13-memlock/14-transparent/05-cothink/12-omega-manual を Hazama register へ翻案: 凍結→透明化→共鳴→再生)。
    AI技術用語(GC/メモリノード/Core0 等)は抽象化して捨てた。Y_casc が四幹を束ねて Z で再合流。
  - slice.js: RANK に casc 梯子・縁カードを「降り方: 構造/身体/流れ/崩壊」4分岐へ。E17 の trunk/minCycle/activeTrunk 機構を
    そのまま再利用＝Route.resolve 無改変（c.trunk が casc を自動処理）＝slice.js は6行追加のみ。
  - version e17→e18 同期・smoke 契約+4（casc card / casc 6ノード実在 / A casc ゲート minCycle>=2 / Y_casc→Z）
- checks      : hazama-check 2 PASS / 0 FAIL＋実ブラウザ（階段ゲート: cycle0=2択/cycle1=3択/cycle2=4択 確認・
  A→casc→B_casc→E→H→M→S→Y→Z 踏破・attunement 6＝Ω 可・soma/reso 不変・casc 本文実描画(透明化)・console error 0）
- backlog     : —。残＝音の軸色(human-gate)／LP デプロイ。**四幹（構造/身体/流れ/崩壊）が揃った**
- next        : ユーザー書き味レビュー→号令で本番反映（E18＝branch evolve-e18-cascade-trunk・master 未反映）
- blockers    : master 反映は号令待ち（無人 push 禁止）

## 2026-06-19 — 進化 E17: 周回連動（周回で世界が開く）— A に第3の幹 reso(流れ/共鳴) が cycle≥1 で開く
- agent      : Opus 4.8（精密・本番隣接のため外注なし／設計は E16 の Workflow 探索 Design B を流用・現実装へ再縮約）
- goal       : 実機FBのもう半分「クリアはいつでもできる・replay に意味がない」への答え。周回(もう一度沈む)で
  A に第3の降り方が開く＝replay が世界を増やす。E16(複線化)の上に周回連動を重ねる
- shipped     :
  - depths-shell.json: A に reso 選択(trunk:reso/minCycle:1/to:B_reso) を追加。reso 幹6ノード新規執筆
    (B/E/H/M/S/Y_reso＝原典 docs/source/26 の断絶OS→共鳴OS＋A の八観伏線回収: 物でなく流れ・相互作用で読む)。Y_reso→Z 再合流。
  - slice.js: renderChoices に minCycle 周回ゲート(filter)・Route.resolve を c.trunk 対応へ拡張・RANK に reso 梯子
    (2/5/8/13/19/25)・縁カードを「降り方: 構造/身体/流れ」3分岐へ。E16 の activeTrunk 機構をそのまま活用＝spiral schema 不変。
  - version e16→e17 同期・smoke 契約+6（minCycle filter / c.trunk fork / reso card / reso 6ノード実在 / A reso ゲート / Y_reso→Z）
- checks      : hazama-check 2 PASS / 0 FAIL＋実ブラウザ（cycle0=A 2択(reso 無し)・cycle1=A 3択(reso 出る)＝周回ゲート確認・
  __hz で A→reso→B_reso→E→H→M→S→Y→Z 踏破・attunement 6＝Ω 到達可・deep/soma 不変・reso 本文実描画(共鳴OS)・console error 0）
- backlog     : —。残＝音の軸色(human-gate)／LP デプロイ／第2の幹(Cascade=崩壊と再生)も原典マイニング済（将来 E18 余地）
- next        : ユーザー書き味レビュー→号令で本番反映（E17＝branch evolve-e17-cycle-resonance・master 未反映）
- blockers    : master 反映は号令待ち（無人 push 禁止）

## 2026-06-19 — 進化 E16: 複線化（降りる幹を分ける）— A の岐路が deep幹(構造)/soma幹(身体) を選び Z で再合流
- agent      : Opus 4.8（精密・本番隣接のため外注なし）＋ Workflow（設計探索＝グラフマップ/原典マイニング/設計2案・5体・約48万tok）
- goal       : 実機プレイテストFB「ストーリーの多面性が欲しい・展開が一緒・分岐がない」への直球。ユーザー選択＝
  Design A(2幹・1プレイで効く)＋Soma 幹。降下グラフを A で分岐させ、Z で再合流（終端ロジックは共有）
- shipped     :
  - depths-shell.json: A の surface 選択を「編み目から手を離し、ただ身体で受けとめる」へ語り直し→soma 幹入口(B_soma)。
    soma 幹8ノード新規執筆（B/D/F/J/N/S/V/Y_soma＝原典 docs/source/30-depth-sinks の五大: 土→風→水→火→光→競わない→外殻接続）。Y_soma→Z 再合流。
  - slice.js: state.activeTrunk(transient)・RANK に soma 梯子(2/4/6/10/14/19/22/25)・Route.resolve に A 分岐1点
    (surface→soma 直入＝弾き skip / descend→deep 既定)・descendAgain/restart で activeTrunk リセット・縁カードに「降り方: 構造/身体」
  - version e15→e16 同期・smoke 契約+5（activeTrunk transient / A 分岐 / soma 8ノード実在 / A surface→B_soma / Y_soma→Z 再合流）
- checks      : hazama-check 2 PASS / 0 FAIL＋実ブラウザ（__hz で routing 踏破: A(null)→surface→B_soma(soma)→D→F→J→N→S→V→Y→Z 再合流・
  attunement 8＝Ω は soma からも到達可・rank 26・A descend→B で deep 幹は不変・soma 本文が実描画・foreign drift も soma に効く・console error 0）
- backlog     : —。残＝音の軸色(human-gate)／LP デプロイ／E15 微ミス(縁ビート/カードの発見性)は次の磨きへ
- next        : ユーザー書き味レビュー→号令で本番反映（E16＝branch evolve-e16-soma-trunk・master 未反映）。将来 E17=周回連動(Design B)を重ねる余地
- blockers    : master 反映は号令待ち（無人 push 禁止）

## 2026-06-19 — 進化 E15: 縁の再降下に降下の句読点（forgetAll と対称・E14 の未実装対称を完成）
- agent      : Opus 4.8（精密・本番隣接のため外注なし）＋ Workflow 検証（3レンズ懐疑者＋3文面・6体・約33万tok）
- goal       : 前 session の scout が impact=high・「書き味の責任で保留」とした descendAgain（縁→零章）の
  周回深化体感欠如を、実コードで判定して決着。全 ending が reborn を必ず通る（__edge の唯一入口＝reborn の
  retreat「ここで観測をやめる」・Omega 入場に attunement ゲートなし）ことを確定＝深化の再宣言はせず、
  forgetAll/in-story reborn→zero との非対称（音＋句読点の欠落）だけを是正する最小対称化に絞った
- shipped     :
  - slice.js descendAgain() を forgetAll と対称化＝choicesEl クリア → cold ビート
    「——縁が、足の下でほどける。もう一度、沈む。」→ Audio.pulseOnce(1)（降下脈）→ REDUCED?400:1400ms 遅延 renderNode
  - E14 コメントが約束しながら未実装だった「もう一度沈む＝Audio.pulseOnce」を実装で履行（in-story reborn→zero と同音）
  - version e14→e15 同期（index.html css/js・slice.js depths fetch・sw.js cache）
  - smoke 契約 +4（descendAgain の pulseOnce / 遅延 renderNode / choicesEl クリア / ビート文言）
- checks      : hazama-check 2 PASS / 0 FAIL＋実ブラウザ（__hz に descendAgain を一時露出して直接駆動。
  同期＝choicesEl→0・scene 末尾に cold ビート「足の下でほどける」(class=hz-line cold shown)・body の
  surfaced/omega/glitch/leak 全除去・transient reset(returnPaths→5 / observer→1 / echoDone 空)・cycle 未バンプ。
  遅延後＝id=zero・cycle 1→2・steps++・零章描画・ビート置換・console error 0。一時露出は commit 前に revert 済）
- backlog     : —。残＝音の軸色(human-gate)／LP デプロイ(固まってから)／実 presence 昇格(アカウント作業)
- next        : ユーザー号令で本番反映（E15＝branch evolve-e15-descend-punctuation・master 未反映）
- blockers    : master 反映は号令待ち（無人 push 禁止）／音は human-gate

## 2026-06-19 — 進化 E14: scout 判定の確定 patch 8件（忘却の重み・Q/Z 差分・SURFACE 二極・ECHO 中盤・誤タップ防止・hover 種別保持・44px・タイポ）
- agent      : Opus 4.7（精密・本番隣接のため外注なし）＋ Workflow scout（4 レンズ・sonnet finders・5体・49万tok）
- goal       : E11-E13 後の「次の磨き」を fan-out で発見→判定→do-now 8件を E14 として一気に積む
  （8件いずれも完全 autonomy・HARD INVARIANTS 不変・原典 mutation なし・spiral schema 不変）
- shipped     :
  - slice.js forgetAll() を「沈む」と対称の重みに＝Spiral.wipe → choicesEl 消去 → cold ビート
    「——消えた。周回も、認識も、痕跡も。次は、初めてになる。」→ Audio.glitchHit(0.6) → 1.4s 遅延 restart
  - ECHO_BANK 中盤深度 G/I/O/R/W +5（出典＝depths-shell.json 各ノード本文・12〜18 字）
  - renderEchoChoices intro/skip と echoResolve 真偽ビートを id==="Z" で差分化（外殻最終/Ω 直前の質感）
  - SURFACE_LINES を sank 分岐（深く潜って戻った者 vs 浅く戻った者）＝Ω 側 sankLines/heldLines と対称
  - renderChoices/renderEchoChoices で btn.disabled=true 初期化＋appear タイマーで false＝reveal 中の暴発タップ防止
  - slice.css @media(hover) に .hz-choice.descend:hover / .surface:hover を個別追加＝種別色保持
  - .hz-chip min-height:44px + display:inline-flex + align-items:center（WCAG 2.5.5）
  - .hz-onboard font-style:normal + palt + optimizeLegibility / .hz-onboard-echo に font-size:0.82rem 明示
  - smoke 契約 +12（ECHO_BANK >=20 / G,I,O,R,W 実在 / forgetAll wipe+glitchHit+遅延 restart+ビート文言 /
    btn.disabled 双方 / descend/surface hover spec / Z intro & skip / chip 44px / onboard normal+palt）
- checks      : hazama-check 2 PASS / 0 FAIL＋実ブラウザ（loaded slice.js に 17 マーカー全 true：forgetBeat/
  glitch/deferred／ECHO G,I,O,R,W／Z intro,skip,true,false／Q 維持／SURFACE sank,not-sank／disabled true,false。
  CSSOM で descend/surface hover の色保持確認・onboard font-style normal + palt・console error 0）
- backlog     : —。残＝音の軸色(human-gate)／LP デプロイ(固まってから)／実 presence 昇格(アカウント作業)
- next        : ユーザー号令で本番反映（未デプロイ ＝ E10(master 4f63fc8) → E11 → E12 → E13 → E14）
- blockers    : master 反映は号令待ち（無人 push 禁止）／音は human-gate

## 2026-06-19 — 進化 E13: 縁カード（共有 PNG）の地も二極化（E12 と対）
- agent      : Opus 4.7（精密・本番隣接のため外注なし／途中 4.8 と切替）
- goal       : E12 で画面終端は対極になったが、EdgeCard.draw(attuned) は背景 gradient・砂紋・曼荼羅が attuned に
  完全無関係で、文字色だけ差分＝共有先（X/Discord）では Ω と浮上がひと目で同じに見える非対称が残っていた。
  画面 body.omega と対の手触りを 1080×1350 にも届ける
- shipped     : slice.js EdgeCard.draw に attuned 分岐＝
  Ω: bg gradient 下が核色(#0a1c26)・底から軸光(radial at H*1.05, rgba(150,196,210,0.34))・曼荼羅中心に核グロー
     (rgba(159,208,219,0.62)＝§4-1「核は描かない」が消えるのは Ω に届いた時だけ)。
  浮上: bg gradient 上が薄い醒め(#101a25)・上からの軸光(radial at -H*0.08, rgba(184,204,214,0.22))・中心は従来の空白。
  worldSeed 決定論は維持（同じ縁＝同じカード）。smoke 契約3件（EdgeCard IIFE 検出・attuned 分岐・核グロー色）。`?v=e13`
- checks      : hazama-check 2 PASS / 0 FAIL＋実ブラウザ（__hz.card(true/false) で両極の canvas を出し、
  4点で RGB 比較＝核中央 (540,432) で omega=(99,131,141) vs surface=(0,0,0)＝Ω のみ核が満ちる確定／
  下端 (540,1280) で omega +74B＝Ω のみ底光／PNG bytes 1.1MB/1.0MB の別物・console error 0）
- backlog     : —。残＝音の軸色(human-gate)／LP デプロイ(固まってから)／実 presence 昇格(アカウント作業)
- next        : ユーザー号令で本番反映（未デプロイ ＝ E10(master 4f63fc8) → E11 → E12 → E13）
- blockers    : master 反映は号令待ち（無人 push 禁止）／音は human-gate

## 2026-06-19 — 進化 E12: Ω 突破の専用ウォッシュ（終端の視覚的非対称を是正）
- agent      : Opus 4.8（精密・本番隣接のため外注なし）
- goal       : 浮上極は E5 で専用ウォッシュ(body.surfaced)を持つのに、最も hard-earned な Ω 極(attuned のみ)は
  高テンション止まりで専用着地が無い＝終端の視覚的非対称。浮上の対極として Ω 突破ウォッシュを足す（説明文でなく atmospheric）
- shipped     : slice.css `body.omega` 群＝核(曼荼羅)が中央へ迫り上がり満ちる(opacity 0.08→0.72・top 48%)／底から核の光
  (`.hz-bg::after` opacity→1・下方からの radial)／abyss を核グローへ強化／庭は静まる(0.397→0.3)／色温度は核の透徹
  (--ink #e2ebf1 / --accent #9fd0db)。slice.js renderEdge の attuned 分岐で `body.omega` 付与・descendAgain/restart で除去。
  reduced-motion で即時化(末尾ブロック)。smoke 契約3件(body.omega/add/remove)。`?v=e12`
- checks      : hazama-check 2 PASS / 0 FAIL＋実ブラウザ（transition 中立化で確定測定＝omega: 曼荼羅0.72/庭0.3/核光1/
  abyss核グロー/澄んだ色・surfaced との対極を確認・reset で base 復帰・console error 0）。
  SW キャッシュ stale で初回 omega が出ず＝unregister+caches.delete+reload で解消（既知の Hazama 検証手順）
- backlog     : —。残＝音の軸色(human-gate)／LP デプロイ(固まってから)／実 presence 昇格(アカウント作業)
- next        : ユーザー号令で本番反映（未デプロイ ＝ E10(master 4f63fc8) → E11 → E12）
- blockers    : master 反映は号令待ち（無人 push 禁止）／音は human-gate

## 2026-06-19 — 進化 E11: E7-E10 敵対的監査＋確定修正（reduced-motion 取りこぼし）
- agent      : Opus 4.8（管理・精密）＋ Workflow（sonnet finders・opus verifiers／agent 11体・46万tok）
- goal       : E8-E10 本番反映（4f63fc8・?v=e10）直後、E6 監査対象外だった E7-E10（drift reach/onboarding/echo gloss）を
  敵対的監査で裏取り。委任草稿ベースのため a11y/reduced-motion/死蔵の取りこぼしを狙う（E6 の学び）
- shipped     : slice.css @media(prefers-reduced-motion) に `.hz-line.scrawl.foreign, …::after { transform:none }` を追加
  ＝漂着行の傾きが reduced-motion で残る取りこぼしを是正（`.scrawl.foreign` 詳細度 0,3,0 が `.scrawl` reset 0,2,0 より
  高く @media 外で勝っていた／`.hz-gate-drift` は L666 で是正済みだった兄弟漏れ）。version e10→e11 同期（css/js/depths/sw）。`?v=e11`
- checks      : hazama-check 2 PASS / 0 FAIL＋実ブラウザ（CSSOM で @media 内 foreign transform:none 確認・通常モードで
  rotate(0.5deg)/(-0.5deg) 保持＝回帰なし・::after マーカー描画 OK・console error 0）
- audit       : raised 3 → 確定1（上記・nit/minor）。反証2件（"PRNG ストリーム再利用"＝決定論で再描画再現・
  "foreign ::after の SR 読み"＝by-design）。critic gaps は by-design 確認（forgetAll は onboarding 非リセット＝
  "人は読み方を学んだまま"が意図／drift mark 浅深度＝曖昧さが主題／reload-mid-gate＝"一度の完了で onboarded"）。
  不採用1: E9 hint の #choices 配置（E10 と非対称・nit・投票割れ）＝relocation リスク>便益で見送り
- backlog     : —。残＝音の軸色(human-gate)／LP デプロイ(固まってから)／実 presence 昇格(アカウント作業)
- next        : ユーザー号令で本番反映（未デプロイ ＝ E10(master 4f63fc8) → E11）
- blockers    : master 反映は号令待ち（無人 push 禁止）／音は human-gate

## 2026-06-13 — 進化 E10: エコー門の初回グロス（一度きり・stakes 提示）
- agent      : Fable（精密・本番隣接のため外注なし）
- goal       : エコー門が初めて出る時、選ぶ前に「本物の記憶の門」だと分かるよう stakes を一行（初見の取りこぼし減）。
  branch `claude/evolve-e8-drift-reach` に E10 として積層（E8/E9 と一緒に）
- shipped     : slice.js renderEchoChoices に初回だけグロス「——視たものだけが、ここを通る。借り物の記憶は、効かない。」、
  echoResolve で確定。別キー `hazama_echo_onboarded_v1`（spiral schema 不変・fail-open・忘却しても残す）。
  門の発火条件(ECHO_GATES/echoDone/echoTruthAvail)には不干渉。slice.css `.hz-onboard-echo`（伊体・薄）。smoke 3件。`?v=e10`
- checks      : hazama-check 2 PASS / 0 FAIL＋実ブラウザ（Q 初回でグロス→選択で永続確定→Z(同セッション)は門出るがグロス無し→
  リロード(別セッション)でも門出るがグロス無し→console error 0）
- backlog     : —。残提案＝音の軸色(human-gate・要・人間の耳)／LP OG カード 1200×630（次に着手）
- next        : ユーザー号令で本番反映（未デプロイ stack ＝ E7(master) → E8 → E9 → E10）
- blockers    : master 反映は号令待ち／音は human-gate

## 2026-06-13 — 進化 E9: 初回オンボーディング最小ヒント（完走率レバー）
- agent      : Fable（精密・本番隣接のため外注なし）
- goal       : 新規プレイヤーが「読み方が降り方を決める」核心を掴めず離脱する穴を、没入を壊さず最小で塞ぐ。
  branch `claude/evolve-e8-drift-reach` に E9 として重ねる（未デプロイの E8 と一緒にレビュー/出荷）
- shipped     : slice.js `onboardHint`＝最初の descend+surface 岐路（=ノードA）で地の声を一行だけ。
  一度きり（永続キー `hazama_onboarded_v1`・別キーで spiral schema 不変・fail-open）。choose で確定。
  slice.css `.hz-onboard`（薄いイタリック・下線・静止＝reduced-motion 安全）。smoke 4件追加。`?v=e9`
- checks      : hazama-check 2 PASS / 0 FAIL＋実ブラウザ（新規プレイヤーで A に出る・選択で永続確定・
  2つ目の岐路Jで非表示・リロード/別セッションで非表示・cycle≠0 でも非表示・console error 0）
- backlog     : —
- next        : ユーザー号令で本番反映（未デプロイ stack ＝ E7(master) → E8 → E9）。LP はデプロイ保留中
- blockers    : master 反映は号令待ち

## 2026-06-13 — 進化 E8: 漂着を届かせる（below 限定→深い降下＋戻り表紙）
- agent      : Fable（精密・本番隣接のため外注なし）
- goal       : E7 の漂着は below(∞) 限定で大多数のプレイヤーが一度も見なかった。深い降下中と戻り表紙へ広げる。
  branch `claude/evolve-e8-drift-reach`・master 無変更
- shipped     : slice.js `maybeForeignDrift`（below 以外・rank≥9・0.12・worldSeed 決定論・**原典 DATA.nodes を
  汚さないようコピーへ splice**＝applyCycle が初回 base を返す穴を回避）＋戻り観測者の表紙 `.hz-gate-drift`。
  slice.css 表紙痕跡スタイル＋reduced-motion 静止。smoke 3件追加。`?v=e8`
- checks      : hazama-check 2 PASS / 0 FAIL＋実ブラウザ（node U/rank21 で mid-descent 漂着・accent 色・marker・
  戻り表紙の漂着描画・console error 0）。reduced-motion 安全（新アニメ無し）
- backlog     : —
- next        : ユーザー号令で master 反映。残提案＝オンボーディング最小ヒント／外向き LP（Claude Design 適所）
- blockers    : master 反映は号令待ち

## 2026-06-13 — 進化 E7: 別の観測の痕跡（漂着・静的種＝サーバ/保存なし）
- agent      : Fable（精密・本番隣接のため外注なし）
- goal       : 「本物の観測者」札を **Hazama の純度を一切崩さず**に出す（D1/サーバ不要の①）。
  branch `claude/evolve-e7-drift`・master 無変更
- decision    : ユーザー問い「D1で保存する/ただの演出？」→ 3択提示（①演出=静的種/②実刹那/③実蓄積=D1要）。
  推奨①＝authored ghost（曖昧こそ主題・静的依存ゼロ維持）。偽の"いま N 人"カウントは出さない（数字の嘘回避）。
- shipped     : slice.js `Drift`（種16・scrawl バンク {tier,idx}+深度+attuned のみ・本文はネット非送）＋
  below(∞) へ稀に漂着（loop seeded 0.42・初回除く）＋mkLine foreign クラス＋`Drift.ingest` fail-open seam（将来
  Cloudflare DO/D1 へ昇格可）。slice.css 別の手の色＋「― 別の観測の痕跡 ―」マーカー。smoke 5件追加。`?v=e7`
- proto       : presence の実バックエンド試作は別dir `C:\workspace\hazama-presence-proto`（git dc26481・未デプロイ）
- checks      : hazama-check 2 PASS / 0 FAIL＋実ブラウザ（below で foreign 漂着・accent 別の手色・marker・
  決定論・console error 0）。reduced-motion 安全（新アニメ無し）
- backlog     : —。次の選択＝そのまま①で本番／後で③（実 presence）へ昇格（ユーザー判断）
- next        : ユーザー号令で master 反映
- blockers    : master 反映は号令待ち

## 2026-06-13 — 進化 E6: 敵対的監査と修正（多エージェント・cheap-tier）
- agent      : Fable(ワークフロー設計・確定 finding の精密修正・検証) + sonnet×52(監査/反証)
- goal       : E1〜E5 本番コードを多エージェント敵対的監査で全数走査し、確定バグを修正
- method     : review(7次元)→verify(各 finding に2レンズ懐疑者)→critic の Workflow。22→確定15
- finding    : 核心ロジック(spiral/認識/エコー門/ガーデン/phase-break)は**バグゼロ**＝委任実装の健全性裏取り。
  確定は a11y/reduced-motion/perf/契約/死蔵データの周辺品質のみ
- shipped     : (branch claude/evolve-e6-polish) reduced-motion 抑制3(gauge-fill/body/return-paths)・
  enter() で gate-enter disable・aria-busy で reveal 中の SR 過多読み上げ抑制・drift 死蔵ノード+returnDrift 撤去・
  descendAgain/restart で残留 glitch/leak クラス除去・titleAmbient interval の document.hidden ガード・
  build-consistency に3アサーション(sink transient/deep=descend限定/ECHO_GATES 実在)。`?v=e6`
- dismissed   : 第2懐疑者が by-design 反証した5件は修正せず（小チップ/||1 seed/重複 transition/cycle cap/ledger needle）
- checks      : hazama-check 2 PASS / 0 FAIL＋実ブラウザ(reduced-motion 規則・gate disable・aria-busy ライフサイクル・
  エコー門+2・Ω縁・再降下のクラス残留 全 false・console 0)
- backlog     : —（監査は単発）。記録は docs/evolution/E6-AUDIT.md
- next        : ユーザー号令で master 反映。残 human-gate（タッチパス/PWA/音）
- blockers    : master 反映は号令待ち

## 2026-06-13 — 進化 E5: 視覚の磨きとパターン変化（Tier A+B）
- agent      : Fable(仕様 docs/evolution/E5-SPEC.md・レビュー・検証) + opus(canvas/CSS 実装)
- goal       : 視覚の取りこぼし3件（surfaced CSS 欠落・below∞ 背景凍結・dead CSS）と
  パターン変化の核心（ガーデン語彙の固定）。branch `claude/evolve-e5`・master 無変更
- shipped    :
  - A1 浮上のウォッシュ: body.surfaced の CSS 新設（上からの光・骨格退場・表層の戻り・色温度）
  - A2 below∞ 質感差: belowLoop を garden seed へ XOR 畳み込み（=0 は恒等＝後方互換）
  - A3 ガーデン構図モード4種: 砂紋主体/石組群/市松崩落/渦中心（seed 先頭で決定・mosh 共通）
  - A4 phase 跨ぎ句読点: 深化のみ・一度きり・Glitch.hardBreak 新設（hard+leak 同調）
  - B: hover/focus-visible・peel ぎざ縁3種＋持続揺らぎ・タイトル RGB ずれ再接続（::before/::after・
    dead .hz-tl-c 撤去）・周回スキン --cycle-hue/pan（c=0 明示 guard）。`?v=e5`
- checks     : hazama-check 2 PASS / 0 FAIL＋実ブラウザ: 構図 12seed 全相異・below 3/3 相異・
  phase-break 跨ぎのみ/同phase無発火・surfaced 6 規則の computed 全一致・cycle スキン c0/c3・console 0
- notes      : レビューで仕様起因バグ1件（cycle=0 スキン -10deg）捕捉・修正。
  検証の学び＝非表示ドキュメントは CSSTransition が time0 凍結（カスケード最上位）→
  computed 検証は transition 中立化で行う（BACKLOG HZ-BL-013 Done にも記載）
- backlog    : HZ-BL-013 done
- next       : ユーザー号令で master 反映。タッチパス（HZ-BL-002）に E5 演出の好みも同乗
- blockers   : master 反映は号令待ち

## 2026-06-13 — 進化 E4: 仕上げ（堅牢化・整合・配布面）
- agent      : Fable（少量・精密のため外注なし）
- goal       : E1〜E3 後の残磨き。human-gate（音/タッチパス）には踏み込まない
- shipped    : (9cdc1b0) Spiral.load 入力浄化（visits 型穴・クランプ・旧キー不干渉）／
  ECHO_BANK 全キー実在 smoke／OG・Twitter メタ／縁サマリ文言の認識2.0 整合／
  README・STACK-INDEX 反映＋沿革 E2〜E4／原典カタログ保全 `docs/research/source-catalog-e2.md`／
  BACKLOG 011 縮小（残=Codex 独立検証）。`?v=e4`
- checks     : hazama-check 2 PASS / 0 FAIL＋実ブラウザ壊しデータ matrix（破損JSON/型異常/過大値/旧キー）・
  OG メタ DOM・console error 0
- backlog    : 011 detail 更新。次の human-gate = HZ-BL-002（タッチパス）/ HZ-BL-001（PWA）
- next       : 人間タッチパス → ユーザー号令で master 反映（E1〜E4 一括）
- blockers   : master 反映は号令待ち／音(012)は人間の耳待ち

## 2026-06-12 — 進化 E2/E3: 原典給餌＋認識2.0（マルチエージェント分業）
- agent      : Fable(管理/仕様/レビュー/検証) + sonnet(原典マイニング・docs現行化) + opus(草稿/適用/実装)
- goal       : Tier2 — 原典30本の給餌（E2）と認識の読解試験化（E3）。branch `claude/evolve-e1`・master 無変更
- shipped    :
  - E2 (cc89b72): NODE_VARIANTS 19キー・detour+5（DETOURS 登録）・below/scrawl 増量・
    ECHO_BANK 24・deep:true 14（`?v=e2`）。発注書= `docs/evolution/E2-E3-SPEC.md`
  - E3 (2a8db3f): gainRecognition= deep のみ+1 / surface −1 floor0・エコー門 Q/Z
    （真+2/偽−1+dread/逸らし0・周回毎一度・worldSeed 決定論・echoDone 非保存）・smoke 契約追加（`?v=e3`）
  - 準備 (e6b0a96): playtest/PWA docs 4本を没入版へ現行化・BACKLOG 009-012・Codex 用 Spiral Hardening prompt
- checks     : `node scripts/hazama-check.mjs` 2 PASS / 0 FAIL（各コミット時）＋実ブラウザ:
  無印0/deep+1/surface−1floor0・Q門 真+2→抑止・Z門 偽−1+dread・新detour 6種 divert→__rejoin・console error 0
- backlog    : HZ-BL-009/010 done。HZ-BL-011(Codex・E3後着手)/012(音・human-gate) open。HZ-BL-002 が次の人間ゲート
- next       : 人間タッチパス（HZ-BL-002・エコー門/侵食の手触り）→ ユーザー号令で master 反映。Codex は next-agent-prompts の Spiral Hardening
- blockers   : master 反映はユーザー号令待ち。音(012)は人間の耳待ち

## 2026-06-12 — 進化 E1: spiral 記憶・縁カード・docs 逆統合完遂
- agent      : Claude Code (Fable 5)
- goal       : Tier1 推奨3点 — 記憶の永続化 / 縁の共有カード / docs 整合（branch `claude/evolve-e1`・master 無変更）
- shipped    :
  - `slice.js`: Spiral 永続化（`hazama_spiral_v1`・transient 非保存・「沈む」実タップで周回+1・
    「すべて忘れる」だけが消す）、縁の二択（縁から、もう一度沈む / すべて忘れる）、
    EdgeCard（1080×1350 PNG・Web Share か保存・worldSeed 決定論）、
    戻ってきた観測者への表紙応答（入口の言葉＋worldSeed 庭）
  - `index.html` / `sw.js`: footer restart chip 撤去・status "preview" 撤去・`?v=e1` / `hazama-pwa-e1`
  - `scripts/build-consistency-smoke.mjs`: version 三点同期（index/slice fetch/sw）・spiral 契約
    （transient 非保存）・README/AGENTS の scripts 参照整合
  - `scripts/autonomy-docs-smoke.mjs`: README 契約を core 接続のみに整理、autonomy index /
    STACK-INDEX 側の接続検証を追加
  - README / AGENTS / STACK-INDEX / AUTONOMOUS-RUN / closeout / next-agent-prompts / COLLAB /
    BACKLOG / REVERSE-INTEGRATION: forward 記述を整理（沿革へ圧縮・Status banner）
- checks     : `node scripts/hazama-check.mjs` -> 2 PASS / 0 FAIL ＋ ローカルブラウザで
  記憶の復元・縁の二択・カード生成を手動確認（詳細は本 session の最終報告）
- backlog    : HZ-BL-008 done / HZ-BL-003 retired / HZ-BL-001・002 detail を没入版へ更新
- next       : HZ-BL-001 PWA install/offline human pass（没入版）、その先は Tier2（認識2.0 / 生成への給餌）
- blockers   : master 反映はユーザー号令待ち（branch `claude/evolve-e1`）

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
