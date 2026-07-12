# Hazama 狭間

Hazama は、沈むほど戻りにくい「降下する対話」の没入型静的 Web アプリです。本文を読み、どう読むかを選び、
構造を読むほど認識が育ち、認識が合う者だけが Ω へ潜れる。未達は失敗でなく「浮上して帰る」二極の結末。
**本番 = この単一ビルド（没入版・逆統合 slice エンジン）**。https://quietbriony.github.io/hazama/

## 構成（単一ビルド）

- `index.html` : エントリーポイント（没入シェル＝9層アート＋本文＋選択＋認識インジケータ）
- `slice.js` : エンジン（reveal 本文・沈下/認識/Ωゲート・エコー門・二極終端・反転ガーデン/曼荼羅/グリッジ・内製Audio・below∞生成・spiral 記憶・縁カード）
- `slice.css` : スタイル
- `depths-shell.json` : 深度本文データ（depthMeta v0 スキーマ・沈下スパイン・42ノード）
- `manifest.webmanifest` / `sw.js` / `icons/` : PWA install / offline shell（cache prefix `hazama-pwa-`）
- `assets/hazama-descent-key.webp` : キービジュアル
- 検証: `scripts/hazama-check.mjs`（`autonomy-docs` ＋ `build-consistency` の2本）

> 旧 forward 実装（Gate Run 資源ゲーム・Music ブリッジ・v2.x 系）と `slice/` 重複・別プレビュー repo は
> 整理・撤去済み。履歴は git に保全（ロールバック: `f8763f2` 没入初版 / `7d5def9` forward v2.45 /
> `acba549` 旧codex）。沿革は本書末尾。

## 記憶（spiral 層） — E1

周回・認識・痕跡は、画面を閉じても消えない。

- 保存先: `localStorage` key `hazama_spiral_v1`
- 保存するもの（集計済みの spiral 層のみ）: 周回 `cycle`・認識 `attunement`・訪問履歴 `visits`・
  below(∞) 周回 `belowLoop`・持ち越し `legacy`（cycles / surfaceBounces / detoursSeen / maxRank）
- 保存しないもの: transient（沈下 sink / 圧 dread / 戻り道 returnPaths / 観測者 observer）。
  閉じて戻るのは「浮上して、もう一度沈む」＝入口は新しく、世界だけが覚えている
- 前セッションで実際に降下していた場合のみ、次の「沈む」で周回が一つ深まる
  （タイトルのリロードでは増えない）。戻ってきた観測者には表紙が応える＝入口の言葉が変わり、
  反転ガーデンの構図が履歴（worldSeed）から組まれる
- 消すのは縁（結末）の「すべて忘れる」だけ。raw のユーザー入力という概念自体が現ビルドには無い

## 縁（結末）と共有カード — E1

縁では二極（深度Ω 到達 ⇄ 浮上して帰る）どちらでも、次の二択が出る。

- 「縁から、もう一度沈む」: spiral 層を抱えたまま零章へ。周回が一つ深まる
- 「すべて忘れる」: spiral 層を消して、初めてに戻る

「縁を画像で残す」chip は、結末サマリ（認識/到達深度/戻り道/観測者/周回）を 1080×1350 の
PNG カードに描く（worldSeed 決定論＝同じ縁は同じカード）。Web Share が使える環境では share sheet、
それ以外はファイル保存。**自動の外部送信はしない**＝外へ出すかどうかは常にユーザーの手。

## 操作の要点

- 表紙の「沈む」で開始（音あり推奨・このタップで内製 Web Audio が解禁される）
- 各深度では「どう読むか」を選ぶ（認識2.0 — E3）:
  - 構造で読む（descend）＝沈む。**深い構造読み（編み目をなぞる・問いを立てる類）だけが認識を育てる**。
    ただ下りるだけの降下は育たない。戻り道 −1 のことがある
  - 表層で読む（surface）＝世界に弾かれ、別の筋へ逸れて前進する。**認識が少し剥がれる**
  - 戻ろうとする（retreat）＝浅いうちは少し戻れる。観測者 3〜 は引き込まれ、9〜 は戻れない
- 深度 Q・Z の**エコー門**: 降下で視た断片を真偽混合から選ぶ。視ていれば認識が育ち（+2）、
  借り物の記憶では剥がれる（−1）。「目を逸らし、先へ」は正直なスキップ。周回ごとに一度
- 右端の計器: 沈下ゲージ・戻り道・観測者・認識 ◆（資源UIではない、感じるための線）
- `♪` chip: 内製 BGM の一時停止/再開
- 縁での「もう一度沈む / すべて忘れる」は上記の通り

## 最短のローカル起動方法

`file://` 直開きでは JSON の読み込みで問題が起きることがあるため、HTTP サーバ経由で起動してください。

```bash
python -m http.server 8000
```

ブラウザで `http://127.0.0.1:8000/` を開きます。Node.js を使う場合は `npx serve .`。

`ERR_CONNECTION_REFUSED` は、ほぼ「HTTP サーバが起動していない」状態です。起動後も表示が古い時は
`Shift + Reload`（ハードリロード）で service worker cache を更新してください。

## スモークチェック

```bash
node scripts/hazama-check.mjs
```

- `autonomy-docs` : `AGENTS.md` / `docs/autonomy/` / playtest テンプレートの接続を依存なしで確認
- `build-consistency` : 単一ビルドの実体検証 — 必須/撤去ファイル、`?v=` と `sw.js` cache の version 同期、
  没入シェル構造、認識/Ωゲート・二極終端、spiral 記憶（transient を保存していないこと）、
  認識2.0 契約（ECHO_BANK≥15・全キー実在・deep≥10・表層侵食・エコー門）、
  縁の二択と縁カード、README/AGENTS が存在しない scripts を案内していないこと、depths グラフ到達性

`0 FAIL` が commit 前提（`AGENTS.md` 参照）。

## 自律開発エンジン

Codex / Claude Code が同じ順番で作業を継続するための薄いエンジン。

- `AGENTS.md` : agent が最初に読む Hazama repo 契約
- `docs/autonomy/STACK-INDEX.md` : 構造マップ
- `docs/autonomy/AUTONOMOUS-RUN.md` : 1 session の作業手順
- `docs/autonomy/BACKLOG.md` : 次にやることと claim ルール
- `docs/autonomy/SESSION-LEDGER.md` : 追記専用の作業ログ
- `docs/COLLAB-CLAUDE-AND-CODEX.md` : 共同開発ガイド

## 沿革（詳細は git log）

- **forward 統合版 v2.21–v2.45**: codex 土台に Gate Run 資源ゲーム・Breath Gate・Music ブリッジ・
  ローグライクHUD を積んだ系譜。最終形は `7d5def9`（v2.45）
- **逆統合 R1–R9（2026-06）**: ユーザー決定 B＝逆統合（`docs/REVERSE-INTEGRATION.md`）。
  slice 没入シェルを土台に、認識/Ωゲート・二極終端・PWA を移植し、root を没入ビルドへ昇格。
  forward 一式・重複・旧 smoke を撤去して 1リポジトリ=1ビルドに整理（`?v=r8` まで）
- **進化 E1（2026-06）**: spiral 記憶の永続化・縁の二択（もう一度沈む/すべて忘れる）・縁カード・
  docs 整合（`?v=e1`）
- **進化 E2（2026-06）**: 原典給餌 — `docs/source/` 30本から変種19ノード・detour+5・below/scrawl 増量・
  ECHO_BANK/deep タグ（`?v=e2`・カタログは `docs/research/source-catalog-e2.md`）
- **進化 E3（2026-06）**: 認識2.0 — 深い構造読みのみ認識+1・表層侵食・エコー門 Q/Z（`?v=e3`）
- **進化 E4（2026-06）**: 仕上げ — spiral 入力浄化・ECHO_BANK 契約 smoke・OG/Twitter メタ・docs 整合（`?v=e4`）
- **進化 E5（2026-06）**: 視覚の磨きとパターン変化 — 浮上ウォッシュ・below∞ 質感差・
  ガーデン構図モード4種・phase 跨ぎ句読点・hover/focus-visible・peel/タイトル/周回スキン（`?v=e5`）
- **進化 E6（2026-06）**: 敵対的監査と修正 — 多エージェント監査（52体）で E1〜E5 を全数走査し、
  確定 15 件を修正（reduced-motion 漏れ3・gate-enter focus・aria-live 過多読み上げ・drift 死蔵
  ノード撤去・残留 glitch クラス・表紙 interval・smoke 契約3）。核心ロジックはバグゼロ。
  記録は `docs/evolution/E6-AUDIT.md`（`?v=e6`）
- **進化 E7（2026-06）**: 別の観測の痕跡（漂着）— below(∞) に「別の観測の痕跡」が稀に漂着する
  （静的種＝サーバ/保存なし・依存ゼロのまま・authored ghost）。実在の他者か別の自分かは区別がつかない
  ＝曖昧こそ主題。冷たい別の手の色＋「― 別の観測の痕跡 ―」マーカー。偽の"いま N 人"カウントは出さない。
  `Drift.ingest` は将来の実 presence（Cloudflare DO / D1 など）への fail-open seam（`?v=e7`）
- **進化 E8（2026-06）**: 漂着を届かせる — E7 は below(∞) 限定で大多数が見なかったため、深い降下中
  （rank≥9・稀・worldSeed 決定論）と戻ってきた観測者の表紙にも漂着を広げた。原典は汚さない（コピーへ splice）。
  reduced-motion 安全（`?v=e8`）
- **進化 E9（2026-06）**: 初回オンボーディング — 完走率レバー。最初の「どう読むか」の岐路（descend と surface が
  並ぶノード）で、地の声を一行だけ「——どう読むかで、どこまで降りられるかが決まる。」。一度きり
  （`hazama_onboarded_v1` で永続・忘却しても人は学んだまま）・没入を壊さない・reduced-motion 安全（`?v=e9`）
- **進化 E10（2026-06）**: エコー門の初回グロス — 門が初めて出る時だけ stakes を一行「——視たものだけが、
  ここを通る。借り物の記憶は、効かない。」。一度きり（`hazama_echo_onboarded_v1`）・門の発火自体には不干渉・
  reduced-motion 安全（`?v=e10`）
- **進化 E11（2026-06・監査ハードニング）**: E7〜E10 を敵対的監査（多エージェント・review 4次元→懐疑者2体で反証→
  完全性 critic）。determinism/persistence/原典不変/once-logic の核は健全（"PRNG ストリーム再利用"等は反証）。
  確定修正は1件＝reduced-motion で**漂着行（`.hz-line.scrawl.foreign`）の傾きが残る取りこぼし**を是正
  （`.scrawl.foreign` の詳細度が `.scrawl` reset より高く @media 外で勝っていた・`.hz-gate-drift` は是正済みだった兄弟漏れ）。
  by-design 確認: forgetAll は onboarding キーを消さない（"人は読み方を学んだまま"＝意図的）（`?v=e11`）
- **進化 E12（2026-06）**: Ω 突破の専用ウォッシュ（`body.omega`）— 終端の視覚的非対称を是正。浮上極（大多数が到達）は
  E5 で専用ウォッシュ（庭が退場・曼荼羅が落ちる・上からの光）を持っていたが、最も hard-earned な **Ω 極（attuned のみ到達）**
  は高テンション止まりで専用着地が無かった。浮上の対極として、**核（曼荼羅）が画面中央へ迫り上がって満ち・底から核の光が
  満ち・庭は静まり・色温度は核の透徹へ澄む**。遅い 2.5〜3s で到達・reduced-motion 即時化・縁→再降下/restart で除去（`?v=e12`）
- **進化 E13（2026-06）**: 縁カード（共有 PNG 1080×1350）の地も二極化 — E12 で画面終端は対極になったが、
  EdgeCard は **bg gradient／砂紋／曼荼羅が attuned に完全無関係**＝共有先（X/Discord 等）では Ω と浮上が
  ひと目で同じに見える非対称が残っていた。画面 `body.omega` と対の手触りを 1080×1350 にも届ける＝
  Ω 極：**底から核の軸光・曼荼羅中心の核グロー（§4-1「核は描かない」が消えるのは Ω に届いた時だけ）**／
  浮上極：**上からの軸光・退いた奈落色**。決定論（worldSeed のみ）は維持（`?v=e13`）
- **進化 E14（2026-06・確定 patch 群）**: scout workflow（4 レンズ・5 agent・49万tok）が出した 12 候補→
  判定で do-now 8件を一気に積む。
  ①「すべて忘れる」が無音・無演出で即 restart していた＝ゲーム内最大不可逆操作（spiral 全消去）と
  「縁から、もう一度沈む」(Audio.pulseOnce) の対称欠落を是正＝忘却の破断ビート＋`Audio.glitchHit(0.6)`＋
  1.4s 遅延 restart。②エコー門 Q と Z が同一文面だった＝Z（外殻最終・Ω 直前）の intro/skip/真偽ビートを差分化。
  ③`SURFACE_LINES` を sank 分岐＝深く潜って戻った者と浅く戻った者で帰し方を変える（Ω 側 sankLines/heldLines と対称）。
  ④`ECHO_BANK` 中盤深度 +5（G/I/O/R/W）＝Q/Z の真候補プールが中盤を取りこぼさない（≥20）。
  ⑤reveal 中の choices 暴発タップ防止＝appear タイマー前は `disabled=true`、`in` クラス付与と同時に false。
  ⑥`.hz-choice.descend/.surface` の hover が種別色（鉄錆／赤の点線）を青緑で上書きしていた＝個別保持。
  ⑦`.hz-chip` タッチ目標 WCAG 2.5.5（44×44px）を `min-height` で確保。
  ⑧`.hz-onboard / .hz-onboard-echo` の日本語合成斜体（italic）回避＝normal+palt+optimizeLegibility（`?v=e14`）
- **進化 E15（2026-06）**: 縁の再降下に「沈む側」の句読点 — `descendAgain`（縁→零章）は Ω/浮上の重い到達
  状態から無接続で `renderNode('zero')` を即時呼んでいた＝兄弟の `forgetAll`（忘却の破断ビート＋`Audio.glitchHit`＋
  遅延 restart）とも、in-story の `reborn→zero`（`choose` 経由で `pulseOnce`）とも非対称だった。E14 のコメントが
  約束しながら未実装だった「もう一度沈む＝`Audio.pulseOnce`」を実装で満たす＝現象だけの cold 一行
  「——縁が、足の下でほどける。もう一度、沈む。」→ `Audio.pulseOnce(1)`（降下脈）→ 遅延 `renderNode`。周回深化は
  `reborn` 本文（「一段、上書きされて…」）＋縁カード「周回: N」が既に2度語るため、ビートは数値も「深まる」も
  再宣言しない（3度目を言わない）。`reborn` が縁の唯一の入口で必ず直前に読まれることを多エージェント検証で
  確定。reduced-motion 安全（即時 `.shown`・遅延 400ms）。smoke 契約4件（`?v=e15`）
- **進化 E16（2026-06）**: 複線化 — 降りる幹を分ける（実機プレイテストFB「分岐がない・展開が一緒」への直球）。
  A の岐路を「降りる幹」の選択に昇格＝`構造として指でなぞる(descend)`→**deep 幹**（現状の正典・1行も触らない）／
  `身体で受けとめる(surface)`→**soma 幹（新・8ノード）**。soma 幹は原典『深度は静かに沈み…』(docs/source/30) の五大＝
  土(身体の実感)→風(煩悩の波)→水(沈殿)→火(責任の熱)→光(誰も見てなくても)→競わない→外殻の手前、を Hazama の乾いた
  register に通した**別の降り方**（deep が「世界を視る」なら soma は「世界に沈む」）。両幹は **Z で再合流**＝Ω/浮上/縁/spiral
  の終端は完全共有（「どう読んでも核には届かない」主題を保つ）。`state.activeTrunk` は transient（spiral schema 不変・
  再降下で再選択＝周回ごとに別の幹も選べる）。Route.resolve 1点＋RANK に soma 梯子＋縁カードに「降り方: 構造/身体」。
  どの幹からも Ω 到達可（soma の deep 受けとり＋Z 門）。原典マイニング＋設計を多エージェントで（5体・48万tok）。
  smoke 契約5件（`?v=e16`）
- **進化 E17（2026-06）**: 周回連動 — 周回で世界が開く（実機FBのもう半分「クリアはいつでもできる・replay に意味がない」
  への答え）。A の岐路に**第3の幹（reso＝流れ／共鳴）**を、**周回(cycle≥1)でだけ開く**＝もう一度沈むと入口に新しい降り方が
  増えている。reso 幹は node A がちらつかせた**八観**（体観/波観/思観…）の伏線回収＝原典『人類の構造エラー』(docs/source/26)
  の断絶OS→共鳴OS（物でなく流れで読む・木を本数でなく風の通りで見る）。`構造(ミクロ)／身体(個)／流れ(マクロ)` の三スケールが
  揃い、Y_reso が三幹を「同じ一点に着く」と束ねて **Z で再合流**。選択肢に `minCycle` 周回ゲート（renderChoices で filter）・
  Route.resolve は choice の `trunk` フィールドで分岐（E16 の activeTrunk 機構を活用）。reso 6ノード新規執筆・どの幹からも
  Ω 到達可・縁カードに「降り方: 構造/身体/流れ」。smoke 契約6件（`?v=e17`）
- **進化 E18（2026-06）**: 第4の幹 Cascade（崩壊と再生）— 周回の階段をもう一段。A の選択肢が周回で 2→3→4 に増える
  （cycle0=構造/身体・cycle≥1=+流れ・**cycle≥2=+崩壊**）＝もう一周するたび入口に新しい降り方が開く。casc 幹は
  **観測系が壊れて再生する**＝AIと人間が共に崩れ、壊れるたび関係性だけが剥き出しになって深まる第4の register
  （凍結→透明化→共鳴→再生）。原典『深層トラブル／共同思考／Ω手記』(docs/source/13,14,05,12) を Hazama の乾いた
  register へ翻案（AI技術用語は抽象化）。Y_casc が四幹を束ねて **Z で再合流**。E17 の trunk/minCycle/activeTrunk 機構を
  そのまま再利用＝slice.js は RANK 梯子＋縁カード4分岐の6行のみ（Route 無改変）。casc 6ノード新規執筆・どの幹からも
  Ω 到達可・縁カードに「降り方: 構造/身体/流れ/崩壊」。原典マイニングを多エージェントで（4体）。smoke 契約4件（`?v=e18`）
- **進化 E19（2026-06）**: 終端を勝ち取る — 「クリアはいつでもできる」を是正（実機プレイテストFBの残り半分）。Ω/浮上の分岐は縁で
  認識値により**自動決定**されていた＝賭けも勝ち取りも無かった。reborn を3択へ＝**もう一度沈む／核の外周を貫いて観測をやめる
  （Ωを賭ける）／静かに浮上する（安全）**。Ω 貫きは認識が満ちるまで**“見える鍵”でロック**（`まだ届かない（認識 N/6）`・押せない）
  ＝深く読めば開くが伝わり、幹/周回と直結（深く潜るほど認識が伸びる）。賭けて勝ち取った（wager＋認識合致）時だけ **Ω到達**、
  賭けない/未達は **浮上**（＝失敗演出にしない・常に押せる安全な帰還）。`state.wagered` は transient（spiral schema 不変）。
  renderChoices にロック描画・renderEdge に賭け判定・`.hz-choice.locked`（E13 核グロー色が薄く差す）。smoke 契約5件（`?v=e19`）
- **進化 E20（2026-06）**: 第5の幹 otherself（多世界・選ばなかった私）— 周回の階段を 2→3→4→5 へ。**cycle≥3 で開く**最深の降り方。
  「選ばなかった私が暗がりに立ち、降りるほど増える／私と別の私の境界が溶ける／無数の私が同時に観測する」並行自己の register。
  原典『核を覗かず核心へ触れる技法／Meta-Self・分岐層別化』(docs/source/03,04) ＋既存の「観測者が一枚増える」テーマと地続き。
  Y_other が**五幹を「みな同じ一点に着く」と束ねて** Z で再合流。E17/E18 の trunk/minCycle 機構を再利用＝Route 無改変・slice.js 6行のみ。
  other 6ノード新規執筆・どの幹からも Ω 到達可・縁カードに「降り方: 構造/身体/流れ/崩壊/並行」。原典マイニングを多エージェントで（3体）。smoke 契約4件（`?v=e20`）
- **進化 E21（2026-06・human-gate）**: 音の軸色＋縁の呼気 — 内製 Web Audio に幹ごとの微変調と、終端の"息"を足す。
  幹の軸色(`Audio.setAxis`)＝身体(低く暗くどっしり)／流れ(高く開けて明るい)／崩壊(暗く不安定に揺れる)／並行(重なって揺らぐ・合唱的)／構造(従来の地)。
  detune/cutoff/うねり幅のオフセットのみ＝**fail-safe(0=従来)**・解決音は鳴らさない。縁の呼気(`Audio.breath`)＝Ω=低く満ちる／浮上=中域で醒める、
  解決しない一息(膨らんで・わずかに沈んで・ほどける)。音は聴いて採否＝**human-gate**（実装→実機で聴く→耳で調整）。コード安全性は検証済
  (setAxis/breath が off/on 両経路で例外ゼロ・console 0)、音質は実機評価。smoke 契約4件（`?v=e21`）
- **進化 E22（2026-06）**: 紹介 LP（表玄関）＋OG カード — 作品の外向き入口を一枚足す。**ゲーム本体（/hazama/）は一切触らず**、
  別ページ `lp.html`（自己完結・slice ランタイム非依存・同じ沈下美学＝奈落のドーム／底の核グロー／スキャンライン／ヴィネット）。
  「これは何か → 五つの降り方(構造/身体/流れ/崩壊/並行) → Ω を賭けて勝ち取る → 核は描かれない」を簡潔に提示し、「沈む」で本編へ。
  共有用 OG カード `assets/og-card.jpg`（1200×630・canvas 生成 JPEG・Hazama 文字標＋tagline＋五軸）。reduced-motion 安全。smoke 契約7件
- **進化 E23（2026-07）**: 生成 testament（去った声の遺言）— form 2「限界の声が testament を遺して消える」を既存 Drift seam に座席化。
  `Drift.TESTAMENT`（抽象化 authored-ghost 8種）＋`pickTestament`（別ソルト）を足し、**below(∞)・`isAttuned()` の一箇所のみ**で
  漂着が半々で「・遺言／深度N」に寄る（`maybeForeignDrift`・表紙は従来通り＝単一 seat・二重注入なし）。CSS 新規ゼロ（既存 foreign 再利用）・
  storage/depths schema 不変・un-attuned は byte 同一（後方互換）。素材＝`docs/research/testament-seed-bank-form2-v0.md`、発注＝`docs/evolution/E23-SPEC.md`。smoke 契約6件（`?v=e23`）

- **進化 E24（2026-07）**: GUI 品質の磨き（既定の見えは1px も変えない・追加のみ）。①`.hz-scene` と LP に細い palette スクロールバー
  （OS 既定の太い bar を是正）②`-webkit-tap-highlight-color: transparent`＝モバイルの青閃光を断ち `:active` の手触りに委ねる
  ③`::selection` を palette 化 ④`@media (prefers-contrast: more)` の利用者にだけ muted トーンを WCAG へ引き上げ（`--ink-dim` 4.38→6.18・
  `--ink-faint` 1.99→4.25＝オプトイン a11y）。slice.css＋lp.html のみ・route/storage/depths schema 不変・reduced-motion 不変。smoke 契約6件（`?v=e24`）

- **進化 E25（2026-07・design レビュー反映）**: シニアゲーム開発者4レンズ（オンボーディング/ゲームフィール/進行/モバイル a11y）の
  レビューから、意図を尊重した**客観・低リスクの改善だけ**を反映。①**認識◆パルス**＝認識が増えた瞬間だけ一度光る（エコー門の +2 が
  祝祭なのに deep +1 が無音だった非対称を是正・North Star「認識が育つ手応え」）②**フォーカス移動の穴**＝ノード遷移で body へ落ちていた
  フォーカスを、喪失時のみ最初の押せる択へ（キーボード/SR/スイッチだけ・見え不変）③**soma 幹の認識中立**＝A の「身体で受けとめる」は
  別の降り方であって浅い読みでない＝剥がれ −1 を止める（E16 意図）④**横持ちノッチの safe-area 左右**⑤オンボード一行を SR live 領域へ。
  slice.js/slice.css のみ・route/storage/depths schema 不変・reduced-motion 不変。smoke 契約6件（`?v=e25`）。文言/音/バランスの深掘りは propose 済み

- **進化 E26（2026-07・design レビュー propose 反映）**: E25 レビューの提案のうち推奨分を反映（P5 reveal 早送りは沈下の遅さが主題ゆえ見送り）。
  ①**replay 発見性**（最重要）＝reborn の周回択 sub を「まだ開いていない降り方が、下に在る」へ＝複線化(E16-E20)を replay 前に約束（幹は伏せる）
  ②**初◆グロス**＝認識が初めて灯った瞬間だけ一度地の声（E9/E10 型・別キー・fail-open・SR live）③**浮上で音が戻る**＝浮上極で lowpass 再開放（耳ゲート）
  ④**新幹 affordance**＝幹が初めて開いた周回だけ択に淡いグロー（reduced は accent 枠）。slice.js/css＋depths sub のみ・schema/route/storage 不変・reduced-motion 不変。smoke 契約6件（`?v=e26`）

## Status / Rules

このリポジトリは**稼働中の本番作品**（没入版単一ビルド）です。旧「Music スタックの参照用」位置づけは終了。
音は内製 Web Audio（`slice.js` 内）で、外部 Music repo / 別タブに進行を依存しません。

- 音源ファイル / サンプル / 歌詞を追加しない
- 依存・build step・server runtime・GitHub Actions を追加しない（静的 Web のまま保つ）
- PWA cache は `hazama-pwa-` 名前空間だけを触る
- 無人 merge / push / release はしない（ユーザーの明示号令まで）
