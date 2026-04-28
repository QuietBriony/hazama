# Hazama

Hazama は、深度データ (`hazama-depths.json`) を読み込み、選択肢と短い問いを辿ってストーリー深度を移動する静的 Web アプリです。

## 現在の構成

- `index.html` / `hazama-index.html` : エントリーポイント
- `hazama-main.js` : 画面描画、深度データ読み込み、core loop、ゲーム状態
- `hazama-seed.js` : 派生 seed の補助ロジック
- `hazama-state.js` : 派生 seed / 進行位置の保存補助
- `hazama-style.css` : スタイル
- `hazama-depths.json` : 深度定義データ
- `assets/hazama-descent-key.png` : 潜行探索のキービジュアル
- `assets/hazama-goal-mandala.png` : 目的ゲート用の曼荼羅ビジュアル

`index.html` と `hazama-index.html` は `hazama-seed.js?v=2.11`、`hazama-state.js?v=2.11`、`hazama-main.js?v=2.11` の順に読み込みます。

## v2.11 Gate Intelligence + Music Bridge

各深度では、既存の選択肢ナビゲーションに加えて以下が動きます。

- 探索者キービジュアルがゆっくり沈み、曼荼羅ゲートが回転・発光する
- 深度や共鳴が進むほど、ゲートの存在感と潜行感が少し強まる
- Gate Intelligence が現在の目的、危険度、推奨ルート、ゲート開度を提示する
- ゲート開度と危険度が、上部アニメーションの発光や圧力に反映される
- 深度・共鳴・安定・しるしから Music repo 用の UCM プロファイルを自動生成する
- 生成した Music JSON はコピー / ダウンロードできる
- `SYNC.MUSIC` は Hazama profile payload を URL hash に載せて Music を開く
- Music window が開いていれば、深度更新ごとに `postMessage` で同じ payload を送る
- `LOCAL` は `http://127.0.0.1:8095/?v=hazama-local#hazama=<payload>` を開く
- Music bridge の `source.stage` は Music 側の arc 語彙 `submerge / sprout / ferment / root / exhale` に合わせて送る
- `SYNC.MUSIC` / `LOCAL` クリック時は、その選択先を優先して開く
- Hazama起動後の最初のクリック / タップ / キー入力で `SYNC.MUSIC` と同じMusic起動を試みる
- 短い問いを表示
- 1文だけ入力を受け取る
- 入力テキストと派生 seed から、ローカル deterministic な「ズラし返答」を返す
- 3〜5秒の沈黙ステータスを挟む
- 沈黙後に `安定` / `共鳴` / `しるし` を更新する
- 自動では進まず、次深度・HUB・戻る・停止をユーザーが選ぶ

ゲーム状態:

- `安定`: 深く進むほど減り、問いへの返答や HUB 退避で回復する
- `共鳴`: 深度移動や返答で増え、上限に達すると `しるし` に結晶化する
- `しるし`: 節目到達や稀な返答で増え、深い選択肢の通行バッファになる
- `最深`: 到達した最深ランク

保存するのは派生 seed、進行位置、集計済みのゲーム状態だけです。raw の入力文は保存しません。

## Audio Provider 連携

Hazama は音源ファイルやサンプルを保持せず、現在の展開から外部音楽 repo 向けの profile を生成します。いまは `QuietBriony/Music` を active provider として扱い、`namima` と `drum-floor` は future provider として後から差し込める構造にしています。

- `energy / wave / mind / creation / void / circle / body / resource / observer` を深度状態から算出
- `audio.tempo / density / brightness / silenceRate / bassWeight` などを同時に算出
- Music 側に `#hazama=<payload>` boot と `postMessage` receiver があれば、そのまま自動生成音へ接続可能
- payload は `type: "hazama-profile"` / `version: 1` / `provider: "music"` / `profile` だけを送る
- profile は `name` / `style` / `source` / `ucm` / `audio` / `patterns` に正規化して渡す
- raw の入力文、prompt text、音源 URL、lyrics、samples は payload に入れない
- ブラウザの自動再生制限を迂回しない。Music側の初回 `START.HZM` / START による AudioContext unlock は必要
- Music 側が `hazama-profile` version 1 を維持する限り、Music repo 更新のたびに Hazama repo を更新する必要はない
- `namima` は mood profile、`drum-floor` は groove profile へ変換する provider を後で追加する想定

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

「深度データ読み込み中…」で止まるときは、次を実行してください。

```bash
./scripts/startup-smoke.sh
```

通過条件:

- `index.html` が `hazama-main.js?v=2.11` を参照している
- `hazama-main.js` が `v2.11` で配信される
- `hazama-depths.json` に `A_start` と `HUB_NIGHT` が存在する

失敗した場合は、ブラウザで `Shift + Reload`（ハードリロード）後に再試行してください。

## 操作の要点

- `返す`: 問いに一言置き、沈黙後に安定・共鳴を得る
- `次深度へ`: 問いの後に主導線へ進む
- `停止`: 沈黙中の待機や次深度候補を止め、現在深度に留まる
- `1ステップ戻る`: 直前の深度へ戻り、安定を少し回復する
- `HUBへ戻る / 最初へ戻る`: 深度を強制的に深めず、安全な入口へ戻る
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
