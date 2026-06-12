# Hazama 狭間

Hazama は、沈むほど戻りにくい「降下する対話」の没入型静的 Web アプリです。本文を読み、どう読むかを選び、
構造を読むほど認識が育ち、認識が合う者だけが Ω へ潜れる。未達は失敗でなく「浮上して帰る」二極の結末。
**本番 = この単一ビルド（没入版・逆統合 slice エンジン）**。https://quietbriony.github.io/hazama/

## 構成（単一ビルド）

- `index.html` : エントリーポイント（没入シェル＝9層アート＋本文＋選択＋認識インジケータ）
- `slice.js` : エンジン（reveal 本文・沈下/認識/Ωゲート・二極終端・反転ガーデン/曼荼羅/グリッジ・内製Audio・below∞生成・spiral 記憶・縁カード）
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
- 各深度では「どう読むか」を選ぶ:
  - 構造で読む（descend）＝沈む。認識が育つ。戻り道 −1 のことがある
  - 表層で読む（surface）＝世界に弾かれ、別の筋へ逸れて前進する
  - 戻ろうとする（retreat）＝浅いうちは少し戻れる。観測者 3〜 は引き込まれ、9〜 は戻れない
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

## Status / Rules

このリポジトリは**稼働中の本番作品**（没入版単一ビルド）です。旧「Music スタックの参照用」位置づけは終了。
音は内製 Web Audio（`slice.js` 内）で、外部 Music repo / 別タブに進行を依存しません。

- 音源ファイル / サンプル / 歌詞を追加しない
- 依存・build step・server runtime・GitHub Actions を追加しない（静的 Web のまま保つ）
- PWA cache は `hazama-pwa-` 名前空間だけを触る
- 無人 merge / push / release はしない（ユーザーの明示号令まで）
