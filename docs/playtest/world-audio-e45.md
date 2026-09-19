# E45 — 沈む地の音と、世界の応答

Status: 実装・自動/ブラウザ検証済 / feature branchで差分review済 / 公開前。

本編入口: [Hazama](https://quietbriony.github.io/hazama/?v=e45)
比較原型: [Scene Listening 02](scene-response-trial.md)

## スコープと公開判断

Dを公開した後のユーザーの「続けて／磨いて／本番デプロイはやらん？」を、
本編へ統合し既存GitHub Pagesへ公開する依頼として受けた。これは今回の本編公開の依頼であり、
ユーザーがDやE45を実機で聴いて合格と判定した、という記録ではない。

本編は既存の静的Web・単一`slice.js`のまま。物語・分岐/認識/抗いの数値・保存キー/形式は不変。
Music/Openclaw-lab/ハエ回路は未接続・変更なし。音源/録音/外部依存/新hosting/公開設定は追加しない。

## 音の磨き

- A由来の持続する地と自動鼓動を維持。共通masterを元のカーブの0.9倍にして重ねる余裕を残す。
- 降下: 一つの短い拍動・低い身体音・擦れる合成ノイズ。操作後に現れ、地の音へ戻る。
- 認識: 初めて灯る時、Ωの必要値に届く時、エコーを正しく認識した時にだけ曇った断片が現れる。
  毎回の認識点でメロディーを鳴らさない。
- 再訪: 断片が遅れて一部だけ戻る。抗い: 不均等な2拍と擦れ。成功/失敗のファンファーレにしない。
- 既存filter/合成IR/単一compressor/最終音量を共有。試聴の別エンジンを重ねたりimportしたりしない。
- 新応答のgainは0.65倍。fullは断片2個、light/staticは1個に制限。新応答は6秒余りまでで、常時の曲ではない。
- 古い音階アクセントを外す。終端は既存の呼気へ渡し、進行音と二重に断片を鳴らさない。

## 停止と負荷

新応答だけでなく鼓動・破断・呼気のone-shotも追跡し、終了時にdisconnectする。
予約済み/減衰中を含めてfull 24 / light 12 / static 8 voiceを上限とする。
連続操作では古い応答を短く退かせ、pause/hidden/interruptedでは予約音を取り消す。
visible復帰は無音、再開は明示操作。遅延resumeや拒否で鳴る意図と表示を取り残さない。
OSの視覚効果軽減では従来どおり持続音/自動鼓動なし、操作への有限応答だけを残す。

## Agent検証

- `node scripts/hazama-check.mjs`: 2 PASS / 0 FAIL / 0 SKIP。
- `world-response-smoke`: 実Audioと実choose/resolveResistからcue判定・状態確定後の接続・3tier各300回の
  連打/声数上限・全体ミュート・停止/hidden/interrupted・遅延resume取消/拒否を検査。
- native OfflineAudioContext、stereo44.1kHz/12秒、3tier×7条件（5cue＋連打/破断/呼気＋mute）=21条件。
  合成peak最大0.17819、NaN/Inf/クリップ0、muteは全tierで厳密に0。確認した最大voice数は13/11/8。
  full/lightは反応後も地の音が続き、staticの通常応答は後半無音。
  時間/状態用facadeと0.25秒刻みの検証clockで駆動したnative DSP検査で、実時間性能/主観音量/耳の合格ではない。
- Playwright CLI / Chromium: 日本語の構造ルート（C→Bの抗い/再訪を含む）からΩ終端、
  次周の流れルートからΩ終端、英語の身体8点から浮上終端をUI操作で通過。
  読む速さを検証しない通過試験として既存の全文表示を利用し、出力先だけをQA用にミュートした。
- 390/320pxで横overflowなし、画像を目視確認。音のpause/hidden模擬/手動再開/pagehide再生成を検査。
  終了時の予約音0、全Context closed、page error/unhandled rejection 0。
  英語＋reduced-motionでは持続oscillatorなし・操作音の有限終了を確認。
- 音の操作とreload/offline coverを挟んでも既存のspiral/3 onboardingキーの内容は完全一致。
  最初のQAでは終端遷移待ちと既存onboardingキーを考慮しないassertを修正し、残りのlifecycle検査を再実行した。
- 同一会話で差分review: 進行/保存/本文への変更なしを確認し、開始時の二重fade targetと
  断片FMの予約開始値を修正。その最終Audioで21条件の合成出力を再検査した。

## 人間に残す確認

スマホで小音量から開始し、音が曲を主張せず文章と沈下を支えているか、
再訪/認識の違いが過剰でないか、数分読んで疲れないかをこの会話へ返す。
実iPhone/Safari・イヤホン/内蔵speaker・ロック復帰・PWA install/offlineの体感は人間の確認待ち。
販売品質/需要/Steamへの提出が完了したという意味ではない。
