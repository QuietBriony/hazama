# 本文と反応音の比較 — Scene Listening 01

Status: tools-only試作 / agent検証済み / 本文付きの人間試聴・採否待ち。

入口: [世界が、音で応える](https://quietbriony.github.io/hazama/tools/sensory/scene-response-lab.html?v=scene-20260915-1)

## 目的

ユーザーはMusic Listening LoopのB/Cを好評価したが、「普通によい音楽」になることと
Hazama世界に合うことは別だと指摘した。今回は曲の完成度ではなく、文章への没入と
世界の応答を比べる。音が不穏・単調であること自体を目標にはしない。

## 比較条件

- 同じ本文抜粋: A→B→C→B→C、5場面。約1〜2分を目安に自分のペースで読む。
- 本文は`depths-shell.json`の既存文そのまま。比較用の場面名・選択ラベル・正規化した
  音の状態は演出の台本であり、本編の認識判定/分岐/数値モデルを実行するものではない。
- 現行音: 本編のAudio IIFEを`scene-current-audio.mjs`へ切り出し、smokeで完全一致を検査。
  合成IR等の乱数だけ固定。深さ/圧/選択音を与えるが、背景のGlitchや終端・全進行の再現ではない。
- B: 操作直後の短い拍動・低音・応答。圧を常時ビートにせず、数秒で退く。
- C: 同じ開いたモチーフの断片。認識で一度つながり、再訪では一部を欠いて戻る。
- B/CはMusicの曲・実測回路・再生エンジンの移植ではなく、特徴を内製Web Audioへ翻訳した別試作。
- 音量35%を既定とし、3案で同じ設定を保持。音色/密度による知覚音量は同一ではない。
  自分の読む速さも揃わないため、盲検/統制実験や因果効果の数値評価とは呼ばない。

## スマホでの試聴

1. リンクをSafari等で開き、小音量から開始。選択だけでは鳴らない。
2. 「現行音」で5場面を読む。各場面のボタンは読み終わってから押す。
3. 「B」「C」でも同じ5場面を読む。音量と端末音量をできるだけ変えない。
4. B/Cの応答は8秒未満で終わり、残響も退く。無音になっても故障ではない。
5. 余裕があればC→B→現行と逆順でも比較する。疲れたら停止する。

「文章に入れたか / 音に気を取られたか / 再訪で変化を感じたか」を、この会話へ短く返す。
ページには評価ボタン・自由入力・保存・送信を設けない。端末のロック/別アプリへの移動から
戻ったときも勝手に鳴り直さず、再開は明示ボタンのみ。2分で安全停止し、本文はそのまま読める。

## 構成と境界

- `tools/sensory/scene-response-lab.html` / `.css` / `.mjs`: 静的な比較UI。
- `tools/sensory/scene-score.mjs`: 本文snapshot、固定場面状態、有限長の作曲ルール。
- `tools/sensory/scene-response-audio.mjs`: native Web Audio、24発音voice上限、単一Context/停止競合制御。
- `tools/sensory/scene-current-audio.mjs`: 比較専用の本番Audioコピー。将来の本番Audio変更時は
  smokeが不一致を知らせるので、コピーを確認して同期する。実行時の抽出/eval/build stepはない。
- `scripts/scene-response-smoke.mjs`: 単一`hazama-check`に接続。

本編index/slice.js/slice.css/sw/depths/localeは無変更（E44）。新しい保存/通信・音源・依存・
service worker登録なし。旧labには入口リンクだけ追加。Music / Openclaw-labも変更しない。
試作assetsだけを`scene-20260915-1`で同期し、既存PWA cacheを消さない。

ユーザーの2026-09-15継続承認: tools-only音の試作は、検証と既存Pages反映までを基本作業とする。
スマホ公開の都度確認は不要。本編採用や新hosting/公開設定変更はこの承認に含めない。

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
