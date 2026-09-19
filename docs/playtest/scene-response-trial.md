# 本文と反応音の比較 — Scene Listening 02

Status: tools-only公開試作 / agent検証済み / 本文付きの人間試聴・採否待ち。

入口: [世界が、音で応える](https://quietbriony.github.io/hazama/tools/sensory/scene-response-lab.html?v=scene-20260919-1)

## 目的

ユーザーはMusic Listening LoopのB/Cを好評価したが、「普通によい音楽」になることと
Hazama世界に合うことは別だと指摘した。今回は曲の完成度ではなく、文章への没入と
世界の応答を比べる。音が不穏・単調であること自体を目標にはしない。

2026-09-19の追加フィードバックは「B/Cはいいが音楽っぽい。Aの不気味に沈む感じと、
効果音/BGMとしての質感も統合したい」。そこでA/B/Cを残してDを追加する。
反応の後に完全な無音へ戻るのでなく、Aの地の音へ戻る構成を試す。

## 比較条件

- 同じ本文抜粋: A→B→C→B→C、5場面。約1〜2分を目安に自分のペースで読む。
- 本文は`depths-shell.json`の既存文そのまま。比較用の場面名・選択ラベル・正規化した
  音の状態は演出の台本であり、本編の認識判定/分岐/数値モデルを実行するものではない。
- A・現行音: 本編のAudio IIFEを`scene-current-audio.mjs`へ切り出し、smokeで完全一致を検査。
  合成IR等の乱数だけ固定。深さ/圧/選択音を与えるが、背景のGlitchや終端・全進行の再現ではない。
- B: 操作直後の短い拍動・低音・応答。圧を常時ビートにせず、数秒で退く。
- C: 同じ開いたモチーフの断片。認識で一度つながり、再訪では一部を欠いて戻る。
- D・統合（既定）: Aの持続音を0.9倍で残し、別の応答層を0.65倍で重ねる。
  応答の拍は1操作につき最大2個、断片は沈む基音に沿う。native Web Audioで生成した
  薄い擦れ音を加え、低いcutoffとゆっくりした減衰で背景へ退かせる。録音/サンプルは不使用。
- B/C/DはMusicの曲・実測回路・再生エンジンの移植ではなく、特徴を内製Web Audioへ翻訳した別試作。
- 音量35%を既定とし、4案で同じ設定を保持。音色/密度による知覚音量は同一ではない。
  自分の読む速さも揃わないため、盲検/統制実験や因果効果の数値評価とは呼ばない。

## スマホでの試聴

1. リンクをSafari等で開き、小音量から開始。選択だけでは鳴らない。
2. まず「D・統合」で5場面を読む。各場面のボタンは読み終わってから押す。
3. 「A・現行音」で同じ5場面を読み、沈む感じがDでも残っているかを比べる。
4. 余裕があれば「B」「C」も比較する。音量と端末音量をできるだけ変えない。
5. 応答イベントは8秒未満で終わり、残響も退く。B/Cは無音へ、DはA由来の地の音へ戻る。
6. 逆順でも比べ、疲れたら停止する。OSの「動きを減らす」が有効な場合は、本編と同様に
   A/Dの持続音を止めるため、今回の沈む音の比較条件とは異なる（ページにも明示）。

「文章に入れたか / 音に気を取られたか / 再訪で変化を感じたか」を、この会話へ短く返す。
今回は特に「Aの不気味な沈下が残るか / 断片が曲を主張しすぎないか / 効果音が世界に馴染むか」を聞く。
ページには評価ボタン・自由入力・保存・送信を設けない。端末のロック/別アプリへの移動から
戻ったときも勝手に鳴り直さず、再開は明示ボタンのみ。2分で安全停止し、本文はそのまま読める。

## 構成と境界

- `tools/sensory/scene-response-lab.html` / `.css` / `.mjs`: 静的な比較UI。
- `tools/sensory/scene-score.mjs`: 本文snapshot、固定場面状態、有限長の作曲ルール。
- `tools/sensory/scene-response-audio.mjs`: native Web Audio、応答層24発音voice上限、単一Context/停止競合制御。
  Dでは本番相当tierの持続音を同じContextへ加える。2分停止・非表示・中断時には両層を破棄する。
- `tools/sensory/scene-current-audio.mjs`: 比較専用の本番Audioコピー。将来の本番Audio変更時は
  smokeが不一致を知らせるので、コピーを確認して同期する。実行時の抽出/eval/build stepはない。
- `scripts/scene-response-smoke.mjs`: 単一`hazama-check`に接続。

本編index/slice.js/slice.css/sw/depths/localeは無変更（E44）。新しい保存/通信・音源・依存・
service worker登録なし。旧labには入口リンクだけ追加。Music / Openclaw-labも変更しない。
試作assetsだけを`scene-20260919-1`で同期し、既存PWA cacheを消さない。

ユーザーの2026-09-15継続承認: tools-only音の試作は、検証と既存Pages反映までを基本作業とする。
スマホ公開の都度確認は不要。本編採用や新hosting/公開設定変更はこの承認に含めない。

## Agent検証（2026-09-19、D追加）

- `node scripts/hazama-check.mjs`: 2 PASS / 0 FAIL / 0 SKIP。変更JS構文/差分check PASS。
- smoke: A/B/Cのスコアhash維持、本番Audio snapshot一致、Dの持続音＋応答を単一Contextで
  生成し、固定の層別音量・両層ミュート・full/light/static・停止競合・timer解放を確認。
- Playwright CLI / Chromium: 全4案×5場面のUI、本文一致、切替停止とreset、終了close/timer 0、
  hidden模擬→自動再開なし→明示再開、reduced-motion時の持続音停止と説明表示を検証。
  390×844 / 320×568で横overflowなし、画像を目視確認。page error/新規localStorage 0。
- OfflineAudioContext、44.1kHz/stereo/各12秒/user音量100%で、A/D×5場面×full/lightの20条件を
  native AudioNodeで合成。clock/timerはオフライン用に駆動し、実時間性能や実機試聴の証拠とはしない。
  Dの合成peakは0.05403〜0.07965、12秒RMSは0.02060〜0.02339、NaN/Inf/クリップ0。
  反応後10.5〜12秒のRMSはAの約0.9倍で、持続音が残ることを確認。知覚音量一致や聴感合格ではない。
- Music側はread-onlyで`node scripts/check-listening-loop.mjs`を再実行し72項目PASS。
  対象は実測の脚運動部分回路（1,045ニューロン/17,224エッジ）で、全ハエ脳ではない。
  毎回初期化した有限反応を再生前に計算する。背景で生き続ける状態、神経学習、自律的なコード更新はない。
  Hazamaの旧labの64細胞モデルとも別で、今回のA/B/C/Dにはどちらも接続しない。

未検証: 実iPhone/Safariでの音・ロック復帰、イヤホン/内蔵スピーカー差、Dの世界観・疲れ・採否。
本編E44とHZ-BL-023はそのまま、HZ-BL-024のhuman gateを維持する。

## 公開確認（2026-09-19、D追加）

実装commit `365e32e072074818e5c7044bbc1059ad8f14946d`、既存Pagesの
[deployment 35431206928](https://github.com/QuietBriony/hazama/actions/runs/35431206928)は同SHAでsuccess。
HTML/CSS/4 modulesの6資産はHTTP200・正しいMIME・ローカルと改行正規化後の内容一致。
更新前のScene 01を読み込んだ隔離ChromiumでE44のSW/cacheを維持し、公開旧labの入口をクリック。
Scene 02の4案・D既定・音量35%・初期無音と全moduleの`scene-20260919-1`取得を確認した。
公開先でも全4案×5場面、同一本文、切替/終了/hidden模擬からの明示再開、320/390px、
reduced-motionの説明と抑止を再検証。終了時全Context closed/timer 0、page error/保存0。
古いcacheは削除せず、本編のPWA versionもE44を維持。実機の耳での評価は引き続き未検証。

## Agent検証（2026-09-15）

- `node scripts/hazama-check.mjs`: 2 PASS / 0 FAIL / 0 SKIP。
- 新smoke: 現行Audioソース完全一致、本文一致、同じ入力の再現、有限長/声数/音量、
  二重開始/close競合、遅延resume取り消し、resume拒否、中断、自動停止、timer teardown。
- Playwright CLI / Chromium: 全3案×5場面のUI通過、全案の本文一致、初期Context/timer 0、
  ミュート保持、終了後全Context closed/timer 0、途中切替で停止＋場面reset、読みの自動送りなし。
- 390×844 / 320×568で横overflowなし。画面画像を目視確認。画面非表示を模擬して
  close→visible復帰で無音→明示再開、reduced-motionの現行自動pulse抑止を検証。
- OfflineAudioContext、44.1kHz/stereo/各12秒、user音量100%でB/C全10場面をレンダー。
  peakは0.04276〜0.07434、NaN/Inf/クリップ0。10.5秒以後の最大残響は約1.8e-14以下。
  12秒平均RMSは0.00406〜0.00656。無音時間を含み、LUFS/主観音量一致/聴感合格の主張ではない。
- ブラウザpage error/unhandled rejection 0、新規localStorage 0。検証用ファイルは
  gitignore下の`output/playwright/`に保持し、録音は追加していない。

未検証: 実iPhone/Safariの音・ロック復帰、イヤホン/内蔵スピーカー差、本編の視覚との同居、
人間の読書/疲れ/世界観の採否。HZ-BL-024はこれらの試聴待ちでありDoneにしない。

## 公開確認（2026-09-15）

実装commit `1db4cdcb17b050dc0248b05e60aea7e199175e22`、既存Pagesの
[deployment 34915257081](https://github.com/QuietBriony/hazama/actions/runs/34915257081)は同SHAでsuccess。
HTML/CSS/4 modulesの6資産はHTTP200・正しいMIME・ローカルと改行正規化後の内容一致。
公開した旧labの入口リンクから新版へ遷移し、E44のSW制御/cacheを維持した状態で
全3案×5場面を再検証した。新moduleはすべて同じversion queryで取得される。
終了/切替/hidden模擬→手動再開/reduced-motion/320pxの検証も公開先でPASS。
Contextとtimerの解放、保存なし、page error/unhandled rejection 0を確認した。
