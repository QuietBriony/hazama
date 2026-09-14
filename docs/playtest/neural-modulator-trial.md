# 小回路の音実験 — 接続仕様と試聴メモ

Date: 2026-09-14
Status: tools-only試作 / agent検証PASS / スマホ試聴向け公開・反映確認済み / 人間の試聴・採否待ち（HZ-BL-023）

## 何を作ったか

既存のHazama Sensory Response Labに、同一のWeb Audio音源経路を使う
A「周期＋平滑化ノイズ」、B「64細胞の簡易回路」、変調なしの3モードを追加。
目的は「世界の側にも別の呼吸がある」と感じるかを比較すること。
研究コード・配線データ・学習済み重みは使用していない。これは独自の小さな
神経回路風モデルであり、実際のハエの脳、生物学的再現、知能や学習の実証ではない。

本編の`slice.js` / `index.html` / `slice.css` / `sw.js` / 物語 / 保存形式は不変。
本番からのimport/fetch、PWA precacheへの追加、別タブとの通信はない。productionはE44のまま。

## 開き方と人間の比較

スマホのSafari/Chromeで[音実験室を開く](https://quietbriony.github.io/hazama/tools/sensory/sensory-audio-lab.html?v=neural-20260914-1)。
2026-09-14にユーザーが既存GitHub Pagesへのlab更新の公開を明示承認した。
PCの音声転送ではなく、スマホ自身のWeb Audioで再生する。PCとの同じWi-Fi接続や
ローカルサーバは不要。スマホ自身の`127.0.0.1`ではWorkerPCへ接続できない。

1. 端末音量を低くする。A「通常」、seed 7、同じtierと試聴音量を選ぶ。
2. 画面下の「試聴を始める」→「同じ刺激を60秒」を押す。
3. 終了時に自動停止する。B「小回路」へ替え、開始→同じ60秒を試す。
4. 順序の印象が混ざらないよう、次はB→Aの順でも比較する。
5. 自由試聴では浅部/深部なども試し、いつでも停止・音量0・変調なしへ戻せる。

OSの「視差効果を減らす」等に対応するreduced-motionが有効な場合はstaticになり、
連続音と自動60秒比較を無効にする。短い音の動詞は明示操作で試せる。

60秒は固定ステップの試行時間。負荷・非表示中断で壁時計上は長くなる場合がある。
非表示になると音と計算を中断し、戻っても自動再開しない。再開ボタンが必要。
mode切替は同じ入力を受けた両モデルの現時点を比較する。最初から同条件で比べるには
毎回60秒ボタンを押す。場面・seed・詳細値変更、リセットは刺激列を中止し自由試聴へ戻す。
60秒比較中は追加の音の動詞を無効化する。

刺激列（共通深度0.55）:

| 試行秒 | 入力 |
|---|---|
| 0–6 | 静けさ |
| 6–10 | 一度目の刺激 |
| 10–14 | 短い間 |
| 14–32 | 刺激を続ける |
| 32–50 | 回復を待つ |
| 50–54 | もう一度の刺激 |
| 54–60 | 余韻 → 自動停止 |

比較中に見る数字は診断値であり、科学的な神経発火率ではない。
同一の音量設定・出力上限だが、知覚音量/RMSを揃えた盲検試験ではない。
「違いを感じない」「Aのほうがよい」も有効な結果。ヘッドホン/スピーカーの
機種差、聞こえ方、不快さ、読みながら疲れないかを人が判断する。

返答はこの会話へ「A/Bどちらがよいか・どの場面か・うるささ/気配」を短く返せばよい。
repoには了承済みの匿名要約だけを記録し、生の個人情報や自由回答を自動保存しない。

### ローカル確認とキャッシュ

開発時のみ、作業root `C:\workspace\hazama`で次を起動する。

```powershell
python -m http.server 8037 --bind 127.0.0.1
```

同じPCから`http://127.0.0.1:8037/tools/sensory/sensory-audio-lab.html`を開く。
LANへのbind・Firewall変更・新しいホスティングは行わない。
既存PWAがlabの静的assetをcache-firstで保存していても新版を読めるよう、
HTMLからのlab moduleと、そのneural module importだけに`?v=neural-20260914-1`を付ける。
変更のないSensory Frameと本編のE44 asset/version/SWは維持し、既存cacheは削除しない。

## 本編との将来の接続

`neural-modulator.mjs`はブラウザ非依存。`createNeuralModulator(seed)`または
`createBaselineModulator(seed)`からインスタンスを作り、`reset(seed)` / `step(signals)`を呼ぶ。
入力は既存`createSensoryFrame(...).signals`に合わせる。seedはreset時に渡し、
depth/dread/density/phase/tier/reducedMotionをモデル側が使用する。
axis等の音色は既存Sensory Frameが扱う。既存の純粋関数やschemaを変更しない。

1 step = 50ms、64細胞×6入力。興奮/抑制・漏れ・短い不応期・疲労・入力への順応を
設計上の仕組みとして持つ。内部配列は固定長。両モデルを同じ入力で毎step更新する。
同じseed・入力列・step回数なら出力列を再現できる。Web Audioの波形位相までの
ビット一致や、生物と同じ時間スケールは保証しない。

| 出力 | 範囲 | labでの変換 |
|---|---|---|
| texture | −1..1 | cutoff ±280Hz（最終280..2540Hz）、detune ±5cent |
| pulse | 0..1 | 既存連続voiceを0.86..1倍に減衰（増幅しない） |
| pan | −1..1 | 対応ブラウザで左右±0.18 |
| activity/adaptation | 0..1 | 検証表示のみ |
| tick | 非負整数 | 決定論・進行の確認のみ |

本編へ採用するなら、同じdocument内でゲーム状態→変調モデル→既存Audioへの
小さなアダプターを設ける。物語・選択・採点・保存には出力を戻さない。
read-onlyの感覚入力と、boundedな変調出力だけを接続点にする。
Reading focusの視覚抑制・ミュート・reduced motion・既存Audioの単一Contextを維持し、
採用範囲とruntime/version/PWA変更は別の承認・検証で扱う。

## 停止・負荷・音量

- 初期はAudioContextも計算timerも作らない。音量設定はページ内だけ、既定35%。
- user gainはcompressor後の0..1。回路・刺激・場面変更はこの値を上書きしない。
- 20Hzのtimer一つ。遅延分をまとめて計算するcatch-upなし。
- stepが15msを3回連続で超えるか出力が不正なら、変調を無効化してtimerを停止。
  resetで明示再試行。計測はモデル＋音響パラメータ更新で、端末全体の負荷保証ではない。
- coarse pointerは既存どおりlight。OS reduced-motion / staticでは自律変調と連続voiceなし。
- 停止・pagehideでtimer、連続voice、transient参照を解放してContextをcloseする。
  非表示はsuspend、復帰は手動。終了音の残骸が復帰時に鳴らないようtransientも切る。
- 動詞は同時8音まで。終了時に接続を切る。compressorは聴覚安全を保証するものではない。

## 変更ファイルと検証

- `tools/sensory/neural-modulator.mjs`: 新規モデル・baseline・固定刺激列。
- `tools/sensory/sensory-audio-lab.{html,mjs}`: 比較操作、音響アダプター、lifecycle・音量。
- `scripts/neural-modulator-smoke.mjs` / `scripts/sensory-frame-smoke.mjs`:
  数値モデルと実engineのmock回帰。build-consistencyから単一checkへ接続。
- README / candidate文書 / BACKLOG / SESSION-LEDGER: この会話から次の判断へつなぐ記録。
- `.gitignore`: ローカルのPlaywright診断ログ・画像のみを配布対象外にする。

```powershell
node scripts/neural-modulator-smoke.mjs
node scripts/sensory-frame-smoke.mjs
node scripts/hazama-check.mjs
git diff --check
```

自動検証: seed/reset/インスタンス分離、出力範囲、悪入力、static時の凍結、4seedの
反応/順応/回復、1時間相当72,000step、frame不変、外部依存/本編未配線。
engineではミュート/上限、timer/voice上限、reset、hide→明示再開、遅延resumeとhideの競合、
二重stop、60秒自動停止、異常数値/連続遅延のfallback、比較中の動詞抑制をPASS。
1時間相当のモデル計算は今回のNode環境で約0.2秒（音処理・実時間試聴は含まない）。

ブラウザ検証（Playwright CLI、隔離Chromium、試聴音量0での技術確認）:

- 初期Context/timer 0、localStorage書き込み0。A/B両方の60秒経路の完走・自動停止を確認。
- A/B切替でも同時Context一つ、timer一つ。reset、比較中の動詞無効化、実AudioParamの
  変化とcutoff/pan範囲、音量0の維持を確認。聴感の評価はしていない。
- 自動操作環境では別タブも`document.hidden=false`になり、自然なタブ切替試験は
  timeoutした。`visibilitychange`とhiddenを検証用に注入し、実AudioContextのsuspend、
  timer 0、visibleへ戻しても停止維持、明示再開でtimer一つに戻ることを確認。
  再開promiseを待たずにtimerを読む検証側の競合も修正して再確認した。
- 実行中にOS reduced-motionを切り替えるとstatic / timer 0になり、比較ボタン無効。
  明示的な短音は使える。停止後は生成したContextが全てclosed、timer 0。
- 320×568 / 文字130% / 1280×800で横overflowなし。Tabで移った比較ボタンは
  固定の停止dockに隠れない。coarse pointerの別隔離contextで初期lightを確認。
- 画面画像を目視確認。page error / unhandled rejection 0、最終storage空。
  ローカルの診断ファイル・画像は`output/playwright/`（git対象外）。

`hazama-check`: 2 PASS / 0 FAIL / 0 SKIP。`git diff --check` PASS。
本編の降下ループ・PWA実機テストは今回は再実施していない（本編ファイルの差分なし）。

### 公開後の確認（2026-09-14）

- 公開commit `9099e5c`、[既存GitHub Pagesのdeployment](https://github.com/QuietBriony/hazama/actions/runs/34849576822)がsuccess。
  HTML / lab module / neural moduleがすべてHTTP 200、内容はローカルと一致（改行を正規化）。
  JSのContent-Typeも`text/javascript`であることを確認した。
- 隔離Chromiumで公開前のE44 SWと旧lab moduleを実際にcacheへ残したまま新版へ遷移。
  古いcacheを消さずにversion付き2 moduleが読み込まれ、A/B/変調なしの3ボタンを確認した。
- 公開URLを320×568で確認し、初期Context/timer 0・音量35%・保存なし・横overflowなし。
  音量0にして実UIからA開始→B切替→60秒試行の進行→手動停止を検証。
  同時Context/timerは一つ、ミュートを維持し、停止後Context closed / timer 0。
  新版のpage error / unhandled rejectionは0。画面画像を目視確認した。
- 公開環境の上記確認は技術検証で、実機スマホや耳の評価の代わりではない。
  A/B各60秒の完走・自動停止は、同一内容のローカル版で実施した前節の結果を参照。

未検証: 人間の耳による音質・気配・疲労、実機iPhone/Androidの音と操作、Safari、
ヘッドホン/スピーカー差、本編との同居負荷。人間gateをDoneにはしない。
今回の公開承認はlabと関連smoke・文書に限る。本編への採用、追加のrelease、
新しい会話・agent、外部データのダウンロードは含まない。
