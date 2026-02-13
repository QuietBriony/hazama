# Hazama

Hazama は、深度データ (`hazama-depths.json`) を読み込み、選択肢を辿ってストーリー深度を移動する静的 Web アプリです。

## 現在の構成

- `hazama-index.html` : エントリーポイント
- `hazama-main.js` : 画面描画と深度データ読み込みロジック
- `hazama-style.css` : スタイル
- `hazama-depths.json` : 深度定義データ

## 最短のローカル起動方法

`file://` 直開きでは JSON の読み込みで問題が起きることがあるため、HTTP サーバ経由で起動してください。

### Python を使う場合

```bash
python -m http.server 8000
```

ブラウザで `http://localhost:8000/hazama-index.html` を開きます。

### Node.js を使う場合

```bash
npx serve .
```

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
