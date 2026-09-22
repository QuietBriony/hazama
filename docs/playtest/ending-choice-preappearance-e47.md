# 結末の表示前入力 — E47 再現 / E48 修正

2026-09-23。入口→降下→選択→余韻の確認で発見し、隔離ブラウザ使用への「進めて」を受けて再現・修正した。
E48はローカル実装・agent検証済み、未公開。人間の試遊結果やSteam販売品質の認定ではない。

## E47で確認できた問題

E47の`renderEdgeChoices()`は「縁から、もう一度沈む」「すべて忘れる」を生成直後から有効にする。
一方、CSSの `.hz-choice` は初期 `opacity: 0` で、`.in` の追加は通常時200ms / 360ms後。
通常の選択肢とエコー門は生成時に `disabled = true` にしているが、結末には同じ保護がない。

最初のコード検証では、既存の`scripts/choice-commit-smoke.mjs`のharnessとproduction rendererを
ファイルを変更せずに読み込み、生成直後のclickと時刻140msまでの進行を検査した。

| 対象 | 生成直後 disabled | 生成直後 .in | 表示前の click の結果 |
|---|---|---|---|
| 通常の選択 | true | false | 動作なし |
| エコー門 | true | false | 動作なし |
| 結末・再降下 | false | false | 140ms時点で再降下が確定 |
| 結末・忘却 | false | false | 生成直後に確認画面を開く |

忘却そのものは確認操作に守られており、表示前のclickだけで記憶が消えたとは扱わない。
その後、隔離Chromeで身体の道を入口から進み、浮上の結末へ自然到達した。
結末確定140ms＋記録表示400msの直後にブラウザの時計を止め、両ボタンがopacity 0、
`.in`なし、disabled=falseであることを確認。再降下ボタンの実座標へmouse clickを送り、
表示開始より前に再降下の文へ進むことを再現した。忘却の表示前動作は上記コード検証による。
実生活での誤タップ率は測定していない。

## E48の修正

- 結末も生成時は`disabled = true`にし、既存の出現コールバックでだけ有効にする。
- 既存の世代・DOM所属チェックより後で有効化し、確定後や画面交代後のタイマーでは復活させない。
- 挙動変更はこの2行。表示タイミング、忘却の確認画面、物語・ルート・数値・保存・音・画像・CSSは維持。
- HTML/CSS/JS参照、locale/depths取得、SWのバージョンをE48で同期。新しい依存や公開設定は追加しない。

## 検証結果

`choice-commit-smoke`に表示前入力、通常/軽減、200/360ms境界、確定後の遅延タイマーを追加。
修正前に結末の初期disabled検査が失敗することを確認し、修正後は既存の連打・世代・Ω・忘却取消検査とともにPASS。

| フロー | 実ブラウザでの確認 | 結果 |
|---|---|---|
| 1. 入口・降下 | 新規profileから身体の道、エコーskip、Ω、rebornへ。game stateを注入せず通常操作 | 通過 |
| 2. 結末の出現前 | E48の見えない2ボタンへ実座標click。再降下なし・確認画面なし・保存不変 | 修正を確認 |
| 3. 出現境界 | 199msは両方無効、200msで最初、360msで次が有効。出現後はfocus/操作可能 | 通過 |
| 4. 狭幅の結末 | 320×568、文字130%・読書優先。本文末へkeyboard scroll、本文/選択/ページの横overflowなし | 通過 |
| 5. 忘却の取消 | 安全側に初期focus。Escapeと「記憶を残す」で保存維持・元ボタンへfocus復帰。再表示可能 | 通過 |
| 6. 再降下 | visibleな再降下をdouble click。周回0→1、zero訪問1→2のみ、認識維持 | 通過 |
| 7. 視覚効果軽減 | 別の新規profileで身体→Ωの結末、390px・focus・忘却取消・再降下 | 通過 |
| 8. 更新・offline | 同じ隔離profileのE47からE48のSW/CSS/JSへ更新、記憶維持。cache済みoffline reloadで入口/開始可能 | 通過 |

- 通常/軽減の検証profileはconsoleのerrors/warningsとも0。
- `node scripts/hazama-check.mjs`: 2 PASS / 0 FAIL / 0 SKIP。
- `node --check`（slice.js / sw.js / choice-commit-smoke.mjs）、`git diff --check`: PASS。
- Playwrightの一つの待機条件が初周の選択肢文言を期待してtimeoutしたが、再降下自体は成功していた。
  周回変奏に対応するQA selectorへ修正し、保存の増分を独立確認。軽減profileでは修正した取消/再降下検査も通過。
- Product Design auditの実画面確認で範囲を絞り、演出は増やさず入力保護だけを修正した。
  12枚の画面と順序付きメモはローカルの`output/playwright/e48/`に保存・目視確認済み（git対象外）。

## 範囲と未確認

- baseline: `master` / `d1280918f777733ecfbffc5acd5748abe1bff3d1`。
  初回調査はclean、実装開始時の差分は前回調査のdocsのみ。branch: `codex/hazama-e48-ending-input`。
- 内蔵Browser/Chrome接続が利用できず、ユーザー承認後にPlaywright CLIの隔離Chromeで確認した。
- 高速な再現のため本文一括表示・音offを使用。初見の間合い、音の体感、実iPhone/Safari、
  PWA実機install、screen reader、英語の今回の実ブラウザ再試験は対象外。offline全編完走も未試験。
- commit・push・公開は未実施。このsessionでは既存公開版E47を変更していない。
- 初見の面白さ、実機の読みやすさ・動き・聴感、Steam販売品質のhuman gateは閉じない。

次は本編公開の明示承認後、既存PagesへE48を反映して配信/旧版更新を確認する。
