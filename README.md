# Hazama

Hazama は、深度データ (`hazama-depths.json`) を読み込み、選択肢と短い問いを辿ってストーリー深度を移動する静的 Web アプリです。

## 現在の構成

- `index.html` / `hazama-index.html` : エントリーポイント
- `hazama-main.js` : 画面描画、深度データ読み込み、core loop、ゲーム状態
- `hazama-gate-run.js` : Gate Run / Breath Gate の依存なし共有モデル
- `hazama-seed.js` : 派生 seed の補助ロジック
- `hazama-state.js` : 派生 seed / 進行位置の保存補助
- `hazama-style.css` : スタイル
- `manifest.webmanifest` / `sw.js` / `icons/` : PWA install / offline shell
- `hazama-depths.json` : 深度定義データ
- `assets/hazama-descent-key.png` : 潜行探索のキービジュアル
- `assets/hazama-goal-mandala.png` : 目的ゲート用の曼荼羅ビジュアル
- `assets/hazama-descent-key.webp` / `assets/hazama-goal-mandala.webp` : 軽量配信用ビジュアル

`index.html` と `hazama-index.html` は `hazama-seed.js?v=2.35`、`hazama-state.js?v=2.35`、`hazama-gate-run.js?v=2.35`、`hazama-main.js?v=2.35` の順に読み込みます。

## v2.35 First Screen Guidance

v2.35 では、初回画面で何を押せばよいか迷わないように、入口専用の `最初にやること` guide を追加しました。

- `A_start` の本文上部に、主CTA `夜のハブへ` と初回ループ3手順を表示
- 既存の `夜のハブへ入る` 遷移を再利用し、public route / storage key / Music payload shape は変更しない
- Gate Run / HUD / BGM companion は維持しつつ、最初の一手を先に読めるようにする
- runtime asset更新に合わせて `v2.35` と `hazama-pwa-v2.35` へ同期

## v2.34 PWA Shell

v2.34 では、music-stack `Music` repo群のPWA構成を参考に、Hazamaを静的ホストのままinstall/offline対応しました。

- `manifest.webmanifest` を追加し、standalone表示、theme color、shortcuts、192/512/maskable iconを定義
- `sw.js` を追加し、HTMLと深度JSONはnetwork-first、同一origin静的assetはcache-firstで扱う
- cache cleanupは `hazama-pwa-` prefixのみに限定し、同じorigin上のMusic系cacheを消さない
- footerにブラウザのinstall promptが出た時だけ `アプリ化` ボタンを表示
- service worker更新検知時に小さな `新バージョン利用可能` bannerを表示
- Music payload shape、深度JSON、ゲーム進行、BGM handoffは変更しない

## 自律開発エンジン

music-stack の自律開発エンジンを Hazama 用に薄く移植し、Codex / Claude Code が
同じ順番で作業を継続できるようにしました。runtime / PWA cache / Music payload は
この移植では変更していません。

- `AGENTS.md` : agent が最初に読む Hazama repo 契約
- `docs/autonomy/STACK-INDEX.md` : 構造マップ
- `docs/autonomy/AUTONOMOUS-RUN.md` : 1 session の作業手順
- `docs/autonomy/BACKLOG.md` : 次にやることと claim ルール
- `docs/autonomy/SESSION-LEDGER.md` : 追記専用の作業ログ
- `docs/autonomy/pwa-install-offline-checklist.md` : PWA install / offline 実機確認の人間用チェックリスト
- `docs/autonomy/pwa-install-offline-result-template.md` : PWA install / offline 実機結果の記録テンプレート
- `docs/autonomy/closeout-checklist.md` : agent handoff / commit 前の締めチェック
- `docs/autonomy/next-agent-prompts.md` : 次の Codex / Claude に渡すコピペ用プロンプト
- `docs/COLLAB-CLAUDE-AND-CODEX.md` : Codex / Claude Code 共同開発ガイド
- `scripts/hazama-check.mjs` : 既存 smoke をまとめる単一チェック入口

## v2.33 BGM Handoff Clarity

v2.33 では、Hazama本体が直接鳴るのではなく、別タブのMusicで `START.HZM` して鳴ることをBGMチップ内で明示しました。

- 初期BGM表示を `別タブSTART.HZM` として、ブラウザの別タブ導線を短く表示
- BGMリンクを `別タブでMusicを開く` / `Musicタブへ` / `リンクでMusicを開く` の状態別コピーに整理
- ポップアップブロック時のfallbackも同じ別タブMusic導線へ戻す
- Music payload shape、storage key、深度JSON、ゲーム進行は変更しない

## v2.32 Growth Route Polish

v2.32 では、v2.31の初回導線をベースに、普通の短いインディーゲームとしての完了感を少し強めました。

- Breath Gateを本文直下の主入力から、`休む / 整える` の任意休息パネルへ移動
- `道を選ぶ` とGate Runを主操作、Breath Gateを回復補助として視覚的に分離
- `扉が開いた`、`立て直し中`、`時間切れ` の結果パネルをGate Run内に追加
- `A_reborn` の一周完了表示に、手数、歩数、休息、崩落、主な行動、Ω到達の短い記録を追加
- `balance-smoke` 上では混合プレイ11手、雑な攻めはsoft collapse、安全策だけではΩ未到達のため数値変更なし
- raw Breath Gate入力、public route、深度JSON、Music payload shape は変更しない

## v2.31 First Action Polish

v2.31 では、初回操作とGate Runの主ボタンを二次情報より先に読めるようにしました。

- タイトルを `Hazama` に寄せ、起動画面の説明を短いゲーム目標へ変更
- 起動画面のGate Run introに `夜のハブへ入る` CTAを追加
- Gate Run操作をDepth Map / Run Logより上へ移動
- 初期キービジュアルの高さを少し抑え、最初の操作へ届きやすくする
- 遷移後はrun panelへ戻し、スクロール位置の迷子を減らす
- `A_start` のHUD表示を `START` として扱い、HUBとの読み違いを減らす

## v2.30 Visual Gameplay Polish

v2.30 では、画像・アニメーション・常時表示UIをゲーム寄りに整理しました。

- 既存PNGから軽量WebPを追加し、起動画面はWebPを直接読む
- 探索画像を深度中も背景に残し、扉の開き・危険度・勝敗状態で発光/スキャン/圧を変える
- `RUN` HUDに情報を集約し、重複していた常時ゲージ、資源説明、Gate Intelligenceの常時表示を外す
- Gate Runの行動カードを短くし、BGM表示も補助チップとしてさらに小さくする
- 数値バランス、深度JSON、storage key、Music payload shape は変更しない

## v2.29 Roguelike HUD

v2.29 では、Gate Run をもっとゲームとして読めるように、既存ルールの上へローグライク寄りのHUDを足しました。

- `FLOOR / TURN / CALM / SYNC / GATE / RISK` のステータスバーで現在状態を即読できる
- `DEPTH MAP` で現在位置 `@`、HUB、未踏、ロック中のΩ、到達済み深度をタイル表示する
- `RUN LOG` で現在深度、直近結果、推奨ルート、扉の開き/Ω解放状態を短く残す
- 数値バランス、深度JSON、storage key、Music payload shape は変更しない

## v2.28 Balance Invariants

v2.28 では Gate Run の各行動が崩れないよう、balance smokeに役割別の不変条件を追加しました。

- `攻める` は危険を背負う主な扉チャージ、`見る` は安全で遅い確認、`整える` は準備、`合わせる` は響きを使う仕上げとして検査する
- 勝利後の `Ωの扉を試す` story option も、通常深度コストではなく報酬遷移として `Ω` へ入る
- browser smokeは低落ち着きの勝利済みHUBからstory option経由のΩ入場も確認する

## v2.27 Browser Hardening

v2.27 では実ブラウザのfirst playable smokeを追加し、Ω入場とMusic bridgeを堅くしました。

- Gate Run勝利後のΩ入場では通常深度コストを再適用せず、勝利状態を保ったまま `Ω` へ入る
- Music window がまだ `about:blank` や別originの時は `postMessage` を送らず、BGM未起動状態を静かに扱う
- optional Playwright smokeで `A_start -> HUB_NIGHT -> Gate Run won -> Ω -> A_reborn -> HUB_NIGHT -> reset` を実ブラウザ確認する

## v2.26 Completion CTA

v2.26 では `A_reborn` の完了表示を、次のHUB帰還まで含むCTAとして読みやすくしました。

- `Ω -> A_reborn 到達` と `一周完了` をGate Run panel内に表示する
- 完了panelから `夜のハブへ戻る / 次の周回へ` を直接選べる
- 物語本文、深度JSON、数値バランス、storage key、Music payload shape は変更しない

## v2.25 Retreat Readiness UI

v2.25 では Gate Run の `戻る` を、退避判断として読み分けやすくしました。

- Gate Run mission に `退避推奨` / `退避任意` / `再挑戦` / `Ω保持` を表示する
- `夜のハブへ戻る` ボタンにも同じ判断badgeを出す
- 数値バランス、storage key、Music payload shape は変更しない

## v2.24 Sync Readiness UI

v2.24 では Gate Run の `合わせる` を、準備前の小接続と準備OK後の仕上げとして読み分けやすくしました。

- Gate Run mission に `合わせる準備前/準備OK` と現在の `響き/扉` 条件を表示する
- `扉に合わせる` ボタンに `準備前` / `準備OK` badge を出す
- 数値バランス、storage key、Music payload shape は変更しない

## v2.23 Breath Gate Route Target

v2.23 では Breath Gate の崩落/時間切れが共有モデルからHUB退避ターゲットを返した時、ブラウザ本体もその `targetDepthId` を消費して同じ画面へ戻します。

- Breath spam failure is still soft recovery through `HUB_NIGHT`
- Raw input text remains unsaved and is not sent to Music
- Runtime API、storage key、Music payload shape は変更しない

## v2.22 Gate Run Model Hardening

v2.22 では Gate Run / Breath Gate の数値ルールを `hazama-gate-run.js` に集約し、ブラウザ本体と `scripts/balance-smoke.mjs` が同じ純粋ロジックを使います。

- `globalThis.HazamaGateRun` と CommonJS export の両方で共有モデルを公開する
- `applyGateAction(state, context, actionId)` は plain object state と context から次状態を返す
- `applyBreathReward(state, reward, context)` は Breath Gate の diminishing returns と勝敗判定を返す
- DOM、localStorage、Music payload、raw入力非保存方針は変更しない

## v2.21 Gate Run Balance v0

各深度では、既存の選択肢ナビゲーションに加えて以下が動きます。

- 初回ループは `A_start -> HUB -> Gate Run -> Ω unlock -> Ω -> A_reborn` を目標にする
- `Gate Intelligence` に現在の段階、次の目標、扉100%までの道筋を短く表示する
- 選択肢は「足元の光をたどって先へ進む」のような普通の行動文として表示する
- 落ち着きや扉の開きなどの効果は、選択肢本文と分けて小さく表示する
- 一言入力は必須進行ではなく、`休む / 整える` として落ち着きを戻す任意休息にする。連続使用は効きが落ちる
- 初期/HUBでは探索者キービジュアルだけを枠内に出し、通常深度以降は曼荼羅ゲートを全画面背景に溶かす
- 深度や響きが進むほど、曼荼羅の存在感と回転・発光が少し強まる
- Gate Intelligence が現在の目的、圧、推奨ルート、扉の開きを提示する
- Gate Run が `さらに奥へ進む / 周囲をよく見る / 呼吸を整える / 扉に合わせる / 夜のハブへ戻る` の5行動で扉の開き100%を目指す
- Gate Run は `攻める / 見る / 整える / 合わせる / 戻る` の役割で読み分ける
- `整える` は準備、`合わせる` は響きを消費する接続、`戻る` はHUBで立て直す判断として扱う
- Ω到達が本筋のゴール。Ωは `扉が開いた` 後に入れる
- `扉が開いた` で達成、落ち着き切れやターン超過で `立て直し中` になり夜のハブへ戻る
- 扉の開きと圧が、上部アニメーションの発光や圧力に反映される
- 深度・響き・落ち着き・しるしから Music repo 用の UCM プロファイルを自動生成する
- BGMは表のMusicタブUIとして出さず、小さい `BGM` チップとして扱う
- `BGM` は Hazama profile payload を URL hash に載せて Music を開く
- Music window が開いていれば、深度更新ごとに `postMessage` で同じ payload を送る
- `止める` はHazamaからの追従送信を止め、Music側が対応済みなら `hazama-control` の stop も送る
- `LOCAL` とJSONコピー/保存は localhost の dev drawer に退避する
- Music bridge の `source.stage` は Music 側の arc 語彙 `submerge / sprout / ferment / root / exhale` に合わせて送る
- Musicが未unlockなら小さく `別タブMusic → START.HZM` を残す。START.HZM後は `BGM` が再生中/待機中を短く出す
- Music feedback の `connectionState / autoFollow / controlAction / outputLevel / culture / proposal` を受け、`MUSIC.FOLLOW`、`MUSIC.PAUSE`、`MUSIC.STOP`、`BPM`、`ARC.*` として短く表示する
- `data-music-state / data-music-autofollow / data-music-acid / data-music-chapter / data-music-culture` をrootへ反映し、曼荼羅の雰囲気へ薄く混ぜる
- Hazama起動後の最初のクリック / タップ / キー入力でBGM起動または既存Music windowへの同期を試みる
- HUB/開始は低密度で広い音、通常探索は深度に応じて密度を増し、Gate Run進行時だけ pulse / drone / glitch を強める
- 短い問いを表示し、任意で一言だけ入力を受け取る
- 入力テキストと派生 seed から、ローカル deterministic な「ズラし返答」を返す
- 3〜5秒の沈黙ステータスを挟む
- 沈黙後に `落ち着き` / `響き` / `しるし` を更新する
- 自動では進まず、次深度・HUB・戻る・停止をユーザーが選ぶ

ゲーム状態:

- `落ち着き`: 崩落耐性。深く進むほど減り、ひと息置くことや夜のハブで回復する
- `響き`: `扉に合わせる` の資源。整える・進むことで増え、合わせると消費する
- `扉の開き`: Ω解放進捗。100%でΩへ入れる
- `HUB`: 安全な退避/再準備点。戻ると落ち着きは戻るが扉の開きは少し戻る
- `しるし`: 節目到達や稀な返答で増え、深い選択肢の通行バッファになる
- `最深`: 到達した最深ランク
- `Gate Run`: 扉の開き、行動回数、last actionを保存し、Music payloadにも安全な集計値として渡す

保存するのは派生 seed、進行位置、集計済みのゲーム状態だけです。raw の入力文は保存しません。

## Audio Provider 連携

Hazama は音源ファイルやサンプルを保持せず、現在の展開から外部音楽 repo 向けの profile を生成します。いまは `QuietBriony/Music` を active provider として扱い、`namima` と `drum-floor` は future provider として後から差し込める構造にしています。

- `energy / wave / mind / creation / void / circle / body / resource / observer` を深度状態から算出
- `audio.tempo / density / brightness / silenceRate / bassWeight` などを同時に算出
- Music 側に `#hazama=<payload>` boot と `postMessage` receiver があれば、そのまま自動生成音へ接続可能
- Hazama本体は音を鳴らさず、Musicタブが開いてSTART.HZM済みのときに再生へ追従する
- payload は `type: "hazama-profile"` / `version: 1` / `provider: "music"` / `profile` だけを送る
- profile は `name` / `style` / `source` / `ucm` / `audio` / `patterns` に正規化して渡す
- raw の入力文、prompt text、音源 URL、lyrics、samples は payload に入れない
- ブラウザの自動再生制限を迂回しない。Music側の初回 `START.HZM` / START による AudioContext unlock は必要
- Music 側が `hazama-profile` version 1 を維持する限り、Music repo 更新のたびに Hazama repo を更新する必要はない
- `namima` は mood profile、`drum-floor` は groove profile へ変換する provider を後で追加する想定

Music repo 側への次の依頼:

- `#hazama` または `START.HZM` 後は、AUTO MIXボタンなしで Hazama auto-follow として profile 更新に追従する
- `music-runtime-feedback` は継続送信し、Hazama側の `BGM` 表示に再生中BPM/章ラベルを返す
- 可能なら `hazama-control` version 1 の `pause / resume / stop` を受け取り、Hazama側の `止める` を実再生停止につなげる

## 最短のローカル起動方法

`file://` 直開きでは JSON の読み込みで問題が起きることがあるため、HTTP サーバ経由で起動してください。

```bash
python -m http.server 8000
```

ブラウザで `http://127.0.0.1:8000/` を開きます。別入口として `http://127.0.0.1:8000/hazama-index.html` も使えます。

Node.js を使う場合:

```bash
npx serve .
```

## スモークチェック

まとめて確認:

```bash
node scripts/hazama-check.mjs
```

`hazama-check` は balance、first playable、startup、optional browser smoke を順番に実行します。Playwrightが無い環境では browser smoke だけskipし、他が通れば `0 FAIL` です。

localStorage migration edge 確認:

```bash
node scripts/localstorage-migration-smoke.mjs
```

`localstorage-migration-smoke` は Playwright が利用できる環境で、古い `hazama_state_v2`、部分的な `hazama_run_v1`、壊れた progress JSON、reset、locked Ω の回復を確認します。Playwright が無い環境では依存を追加せず skip します。

自律開発 docs 整合性確認:

```bash
node scripts/autonomy-docs-smoke.mjs
```

`autonomy-docs-smoke` は `AGENTS.md`、`docs/autonomy/`、playtest/result template、README/BACKLOG/SESSION-LEDGER の最低限の接続を依存なしで確認します。

静的PWA契約確認:

```bash
node scripts/pwa-static-contract-smoke.mjs
```

`pwa-static-contract-smoke` はローカルファイルを直接読み、entry HTML、manifest、service worker、icons、PWA install/update文字列、cache namespace の整合を依存なしで確認します。

「深度データ読み込み中…」で止まるときは、次を実行してください。

```bash
./scripts/startup-smoke.sh
```

バランス確認:

```bash
node scripts/balance-smoke.mjs
```

`balance-smoke` は `hazama-gate-run.js` と同じ共有モデルを使い、`breath-spam`、`sync-rush`、`late-sync`、`retreat-retry`、`balanced` などの政策でΩ解放、HUB退避、Breath Gate cap、勝利後retreatを確認します。

first playable ルート確認:

```bash
node scripts/first-playable-smoke.mjs
```

`first-playable-smoke` は `A_start -> HUB_NIGHT -> Gate Run won -> Ω -> A_reborn -> HUB_NIGHT` の骨格と、共有モデルでΩ解放できることを確認します。

実ブラウザfirst playable確認:

```bash
node scripts/browser-first-playable-smoke.mjs
```

`browser-first-playable-smoke` はPlaywrightが利用できる環境ではローカルHTTPサーバを立て、モバイル幅でPWA manifest / service worker cache、BGM停止、locked Ω、Gate Run勝利、Ω入場、`A_reborn` completion CTA、resetを確認します。Playwrightが無い環境では依存を追加せずskipします。

Playwright skip時の in-app browser fallback は `docs/autonomy/browser-smoke-fallback.md` に整理しています。

手動プレイテストの切り口は `docs/hazama-playtest-slices-v0.md` に整理しています。
直近の agent / in-app browser pass は `docs/playtest/first-playable-agent-pass-2026-05-16.md` にあります。
人間の5〜8分通しプレイ記録は `docs/playtest/human-playtest-template.md` を使えます。
Gate Run 数値を触るかどうかの判断は `docs/playtest/gate-run-balance-decision-rubric.md` に整理しています。

通過条件:

- `index.html` が `hazama-gate-run.js?v=2.35` と `hazama-main.js?v=2.35` を参照している
- `hazama-main.js` が `v2.35` で配信される
- `manifest.webmanifest` と `sw.js` が配信され、192/512/maskable iconを参照している
- `hazama-depths.json` に `A_start` と `HUB_NIGHT` が存在する

失敗した場合は、ブラウザで `Shift + Reload`（ハードリロード）後に再試行してください。

## 操作の要点

- `休む / 整える`: 任意のBreath Gate。問いに一言置き、沈黙後に落ち着きを得る。連続使用では響きや扉の効率が落ちる
- `このまま先へ進む`: ひと息後に主導線へ進む
- `停止`: 沈黙中の待機や次深度候補を止め、現在深度に留まる
- `1ステップ戻る`: 直前の深度へ戻り、落ち着きを少し回復する
- `夜のハブへ戻る / 最初へ戻る`: 深度を強制的に深めず、安全な入口へ戻る
- `リセット`: seed / progress / game state を消去して `A_start` からやり直す

## 起動トラブルシュート

`ERR_CONNECTION_REFUSED` は、ほぼ「HTTP サーバが起動していない」状態です。

1. リポジトリ直下でサーバを起動する

```bash
python -m http.server 8000
```

2. 別ターミナルで疎通確認する

```bash
curl -I http://127.0.0.1:8000/
```

3. ブラウザで `http://127.0.0.1:8000/` を開く

8000 番ポートが使用中なら別ポートで起動してください。

```bash
python -m http.server 8080
```

## Status

This repository is a visual / conceptual reference for the wider creative stack.

It may inform:

- visual mood
- void / boundary concepts
- UI atmosphere
- abstract worldbuilding
- cyber / Zen / liminal aesthetic direction

It should not be directly merged into Music runtime.

Active music repos:

- QuietBriony/Music: experimental reference-driven generative rig
- QuietBriony/drum-floor: band groove generator
- QuietBriony/namima: public-friendly ambient player

Rules:

- Do not add audio files or samples
- Do not add dependencies
- Do not add GitHub Actions
- Do not treat this repo as a music runtime
- Use this repo as reference-only unless intentionally reactivated
