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

`index.html` と `hazama-index.html` は `hazama-seed.js?v=2.18`、`hazama-state.js?v=2.18`、`hazama-main.js?v=2.18` の順に読み込みます。

## v2.18 Background Music Companion

各深度では、既存の選択肢ナビゲーションに加えて以下が動きます。

- 選択肢は「足元の光をたどって先へ進む」のような普通の行動文として表示する
- 落ち着きや扉の開きなどの効果は、選択肢本文と分けて小さく表示する
- 一言入力は必須進行ではなく、`ひと息置く` として落ち着きと響きを戻す任意行動にする
- 初期/HUBでは探索者キービジュアルだけを枠内に出し、通常深度以降は曼荼羅ゲートを全画面背景に溶かす
- 深度や響きが進むほど、曼荼羅の存在感と回転・発光が少し強まる
- Gate Intelligence が現在の目的、圧、推奨ルート、扉の開きを提示する
- Gate Run が `さらに奥へ進む / 周囲をよく見る / 呼吸を整える / 扉に合わせる / 夜のハブへ戻る` の5行動で扉の開き100%を目指す
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
- Musicが未unlockなら小さく `MusicでSTART.HZM` を残す。START.HZM後は `BGM` が再生中/待機中を短く出す
- Hazama起動後の最初のクリック / タップ / キー入力でBGM起動または既存Music windowへの同期を試みる
- HUB/開始は低密度で広い音、通常探索は深度に応じて密度を増し、Gate Run進行時だけ pulse / drone / glitch を強める
- 短い問いを表示し、任意で一言だけ入力を受け取る
- 入力テキストと派生 seed から、ローカル deterministic な「ズラし返答」を返す
- 3〜5秒の沈黙ステータスを挟む
- 沈黙後に `落ち着き` / `響き` / `しるし` を更新する
- 自動では進まず、次深度・HUB・戻る・停止をユーザーが選ぶ

ゲーム状態:

- `落ち着き`: 深く進むほど減り、ひと息置くことや夜のハブで回復する
- `響き`: 深度移動やひと息で増え、上限に達すると `しるし` に結晶化する
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

「深度データ読み込み中…」で止まるときは、次を実行してください。

```bash
./scripts/startup-smoke.sh
```

通過条件:

- `index.html` が `hazama-main.js?v=2.18` を参照している
- `hazama-main.js` が `v2.18` で配信される
- `hazama-depths.json` に `A_start` と `HUB_NIGHT` が存在する

失敗した場合は、ブラウザで `Shift + Reload`（ハードリロード）後に再試行してください。

## 操作の要点

- `ひと息置く`: 問いに一言置き、沈黙後に落ち着き・響きを得る
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
