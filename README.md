# Hazama

Hazama は、深度データ (`hazama-depths.json`) を読み込み、選択肢を辿ってストーリー深度を移動する静的 Web アプリです。

## 現在の構成

- `hazama-index.html` : エントリーポイント
- `hazama-main.js` : 画面描画と深度データ読み込みロジック
- `hazama-seed.js` : 派生 seed の補助ロジック（raw 入力は保存しない）
- `hazama-state.js` : 派生 seed / 進行位置の保存補助
- `hazama-style.css` : スタイル
- `hazama-depths.json` : 深度定義データ

## 現在の起動 / core loop

`index.html` と `hazama-index.html` は `hazama-seed.js?v=2.2`、`hazama-state.js?v=2.2`、`hazama-main.js?v=2.2` の順に読み込みます。

各深度では、既存の選択肢ナビゲーションに加えて最小 core loop が動きます。

- 短い問いを表示
- 1文だけ入力を受け取る
- 入力テキストと派生 seed から、ローカル deterministic な「ズラし返答」を返す
- 3〜5秒の沈黙ステータスを挟む
- 自動では進まず、次深度・HUB・戻る・停止をユーザーが選ぶ

保存するのは派生 seed と進行位置のみです。raw の入力文は保存しません。

## 最短のローカル起動方法

`file://` 直開きでは JSON の読み込みで問題が起きることがあるため、HTTP サーバ経由で起動してください。

### Python を使う場合

```bash
python -m http.server 8000
```

ブラウザで `http://127.0.0.1:8000/` を開きます（`index.html` を追加済み）。
ブラウザで `http://localhost:8000/hazama-index.html` を開きます。

### Node.js を使う場合

```bash
npx serve .
```

表示されたローカル URL にアクセスします（ルートの `index.html` で表示されます）。


## 「全然進まない」ときの最短チェック

1. リポジトリ直下でサーバを起動

```bash
cd /path/to/hazama
python -m http.server 8000
```

2. 別ターミナルで応答確認

```bash
curl -I http://127.0.0.1:8000/
```

3. ブラウザは `http://127.0.0.1:8000/` を開く（`localhost` ではなく `127.0.0.1` 推奨）

4. それでも駄目ならポート変更

```bash
python -m http.server 8080
```

5. リモート環境（Codespaces/Dev Container/Codex）ならポートフォワードURLを使う

## エージェントのインターネットアクセスは必要？

- **ローカル起動確認だけなら不要**です（このプロジェクトは静的ファイル + ローカルJSONのみ）。
- **GitHubにPRを作るときだけ必要**です（push/PR API通信）。
- つまり、実装とローカル確認はオフライン寄りで進められます。



## 起動処理の安定確認（まずこれを実行）

「深度データ読み込み中…」で止まるときは、次のスモークチェックを先に実行してください。

```bash
./scripts/startup-smoke.sh
```

通過条件:
- `index.html` が `hazama-main.js?v=2.2` を参照している
- `hazama-main.js` が `v2.2` で配信される
- `hazama-depths.json` に `A_start` と `HUB_NIGHT` が存在する

失敗した場合は、ブラウザで `Shift + Reload`（ハードリロード）後に再試行してください。

## GitHub Pages が Deployed になった後にやること

`https://quietbriony.github.io/hazama/` が **Deployed (completed)** なら、公開自体は成功です。
次は以下の順で進めると迷いません。

1. 公開URLで表示確認
   - `https://quietbriony.github.io/hazama/`
   - タイトル表示、本文表示、選択肢ボタン遷移を1周確認

2. 変更を入れる前に「1つだけ」Issueを作る
   - 例: `feat: hazama codex v0.1 core loop`
   - DoDを3〜5行で固定（PRの判断基準になる）

3. ブランチを切って小さく実装
   - 1PR=1目的（docs修正と機能追加を混ぜない）
   - 例: `feat/v0-1-core-loop`

4. ローカル確認 → PR作成 → Pages反映確認
   - ローカル: `python -m http.server 8000` で `/` を確認
   - PRマージ後: Actions の `pages-build-deployment` が completed になるのを待つ
   - 再度公開URLを開いて反映確認

## デプロイ画面の見方（要点）

- **Active / Deployed (completed)**: 公開成功
- **Failed**: ビルドエラー。Actionsログを確認
- **古い表示のまま**: ブラウザキャッシュの可能性（再読み込み / シークレットウィンドウ）

## 最小 core loop の安全操作

- `停止`: 沈黙中の待機や次深度候補を止め、現在深度に留まる
- `1ステップ戻る`: 直前の深度へ戻る
- `HUBへ戻る / 最初へ戻る`: 深度を強制的に深めず、安全な入口へ戻る


### Issue 作成テンプレート（そのまま使う）

GitHub の `New issue` で `v0.1 core loop` テンプレートを選ぶと、必要な DoD を埋めた状態で開始できます。

- `.github/ISSUE_TEMPLATE/v0-1-core-loop.md`
表示されたローカル URL にアクセスし、`/hazama-index.html` を開きます。

## 推奨開発フロー

1. ブランチを作成する
2. 変更する
3. ローカルで HTTP サーバを起動して確認する
4. 差分を確認する
5. commit する
6. PR を作成する（`main` へ直接 push しない）

例:

```bash
git switch -c docs/readme-quickstart
python -m http.server 8000
# ブラウザで動作確認
git status
git add .
git commit -m "docs: add README quickstart"
git push -u origin docs/readme-quickstart
```

## 命名整理の提案（次PR候補）

将来的には、GitHub Pages 互換性と一般的な構成に寄せるため、以下への統一を推奨します。

- `hazama-index.html` → `index.html`
- `hazama-main.js` → `main.js`
- `hazama-style.css` → `style.css`
- `hazama-depths.json` → `depths.json`

今回の変更では既存ファイルを壊さない方針で、参照名を現在のファイル名に揃える最小修正に留めています。


## 起動トラブルシュート（ERR_CONNECTION_REFUSED など）

`ERR_CONNECTION_REFUSED` は、ほぼ「HTTP サーバが起動していない」状態です。以下を順番に確認してください。

1. ターミナルでこのリポジトリ直下に移動

```bash
cd /path/to/hazama
```

2. サーバを起動（ターミナルを開いたままにする）

```bash
python -m http.server 8000
```

3. 別ターミナルで疎通確認

```bash
curl -I http://127.0.0.1:8000/hazama-index.html
```

`HTTP/1.0 200 OK` が返れば起動できています。

4. ブラウザで次を開く

- `http://127.0.0.1:8000/hazama-index.html`

### それでも開かない場合

- 8000 番ポートが使用中の可能性があります。別ポートで起動してください。

```bash
python -m http.server 8080
```

その場合は `http://127.0.0.1:8080/hazama-index.html` を開きます。

- VS Code Dev Container / リモート環境 / Codex 環境では、`localhost` が「あなたのPC」ではなく「リモート側」を指すことがあります。ポートフォワード機能で公開された URL を使ってください。


## PRを表示したのに「Merge」が出ないとき

以下のどれかが原因です。上から順に確認してください。

1. **すでにマージ済み**
   - PR画面に `Merged` と表示されていれば作業完了です。

2. **あなたの権限でマージできない**
   - リポジトリ権限が `Write` 未満だとマージボタンが出ません。
   - 管理者にマージ依頼するか、権限付与を依頼します。

3. **Branch rules で必須チェック未通過**
   - `Require a pull request before merging` / `Require status checks` が有効だと、
     チェック完了までマージ不可です。
   - PRの `Checks` タブで失敗ジョブを確認します。

4. **コンフリクトがある**
   - `This branch has conflicts` が出ている場合は、ブランチを更新して再pushします。

### いま次にやること（最短）

- PRが `Merged` なら次タスクへ進む
- PRが `Open` なら `Checks` と `Conversation` の指摘を解消
- その後、次は `feat: hazama codex v0.1 core loop` を1PRで実装


# Status

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
