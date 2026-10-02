# 深度データ通信停止の起動復旧 — E55.1ローカル候補

2026-10-02。対象は起動を止める1不具合。未commit・未公開。

## 起点と作業範囲

- 元repo: `C:\workspace\hazama`、master `65f522d1e9e845e410b3f9dbb3c3af0b381dcd73`。
  作業前はclean、他のworktreeなし、BACKLOGに稼働中のclaimなし。
- branch: `codex/one-bug-20261002`。
- worktree: `C:\Users\cta88\Documents\Codex\2026-10-02\task-5\hazama-worktree`。
- repo/親workspaceのAGENTS、autonomy手順/台帳、共同開発ガイドを確認。
  repo内`.agents`/追加SKILLはなし。Playwrightスキルを実画面QAに使用。
- HZ-BL-033をこのworktreeでclaimし、runtimeの編集は1人だけが担当。
  補助agentは読み取り調査・差分レビューのみ。検証ブラウザは同時に1セッション。

## 再現とユーザーへの影響

`loadData()`は深度データの`fetch`/`res.json()`を期限なしで待っていた。
通信がrejectせず止まると、表紙の「深度を読み込み中…」と無効な「沈む」が続き、
既存の再試行は呼ばれない。通常のHTTPエラー検証では発見できなかった。

独立したChromiumでSWをブロックし、`**/depths-shell.json*`を保留した。
旧実装で12秒後も`gate-enter.disabled=true`、入口`aria-busy=true`、`state.id=null`。
`index.html`の10秒期限は旧SW切替専用で、深度データには適用されない。
SWの深度取得もnetwork-firstで、reject時のみcacheへ移るため、未決通信は問題になる。

## 修正

`slice.js`の`loadData()`へAbortControllerと10秒期限を追加。
headersとJSON本文の読了/検証を同じtry/finallyで囲み、成功/失敗の双方で期限を解除する。
既存のcatch→再試行ボタン→reloadを使う。`DATA`は従来どおり検証成功後だけ代入する。

`index.html`/`slice.js`/`sw.js`の参照・cache・表示版をE55.1へ同期。
新しい`depth-loading-smoke.mjs`を既存のbuild-consistencyへ接続し、READMEと作業台帳を更新。
本文/分岐/数値/保存キー・schema/音/画像/依存には差分なし。

## 検証結果

| 検証 | 結果 |
|---|---|
| baseline標準入口 | `hazama-check`: 2 PASS / 0 FAIL / 0 SKIP |
| 新smokeの修正前実行 | FAIL: headersリクエストがabort不可 |
| production関数の修正後smoke | PASS: 9999→10000msのheaders/本文abort、DATA未代入、復旧、通信/HTTP/JSON/schema、残存timerなし |
| 修正後標準入口 | `hazama-check`: 2 PASS / 0 FAIL / 0 SKIP |
| 構文/差分 | `node --check slice.js`、新smoke構文、`git diff --check`: PASS |
| headers保留の実Chromium | リクエスト開始から10.008秒で再試行、`disabled=false`/`aria-busy=false` |
| 本文停止の実Chromium | ローカルサーバーがHTTP 200と`{"start":`だけ送信。navigation開始から10.181秒で`net::ERR_ABORTED`→再試行 |
| 回復操作 | 通信復旧→再試行reload→沈む→零章→A→B_somaを実ボタンで操作 |
| 記憶 | 隔離ブラウザの集計済みfixtureが、失敗/再試行reloadを通じ文字列一致。周回2→入口tapで3、認識4保持 |
| 通常ループ | SW有効の新規ブラウザで零章→A→B。周回0/認識1/戻り道4本 |
| offline復元 | E55.1 controller/cacheでoffline再読み込み→入口ready、記憶文字列一致。再降下で周回1/認識1/沈下0/戻り道5本 |
| 画面 | 320×568の再試行、390×844の復旧/通常本文、1440×900の通常本文。横overflowなし、PNGを目視 |
| 独立レビュー | 補助agentの読み取りレビューで修正/版同期/回帰smokeに問題なし |

故障注入のSWブロック通知とload失敗warningは意図したもの。
通常ブラウザではpageerrorなし。音の好みは今回評価しない。

## 根拠ファイル

repo外の`C:\Users\cta88\Documents\Codex\2026-10-02\task-5\output\playwright\`に保存。

- `before-hung-request-12s.png`: 旧実装の待機固定。
- `after-retry-mobile.png` / `after-retry-320.png`: 期限後の操作可能な再試行。
- `after-partial-body-retry.png`: ネイティブ部分JSON停止。
- `normal-b-mobile.png` / `normal-b-desktop.png`: 通常進行画面。
- `before-hung-request.log` / `after-recovery.log` / `partial-body.log` / `normal-pwa.log`: 再現コードと実行結果。

再現用CLIコード/静的サーバー/設定はtask-5直下の`qa-*.js`、`qa-server.mjs`、
`playwright*.config.json`。repoへの外部依存追加はない。

## 限界と採用時の注意

10秒以上必要な正常通信も再試行になる。言語取得には既存の8秒期限、旧SW切替には既存の10秒期限がある。
今回の取得期限も有限に揃えた。即時cache fallbackの再設計は行っていない。

実スマホstandalone、旧E55からの実機更新、WebKit/Firefox、OSの通信切替/バックグラウンド制約は未検証。
全分岐の実操作、全終端、音の体感、没入感/面白さ、Steam販売品質の判定は今回の範囲外。
既存のhuman gateは継続。元masterの作業ファイルは変更せず、commit/push/PR/merge/公開は行わない。
