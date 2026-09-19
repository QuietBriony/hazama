# E46 — 配線由来の小さな応答を、沈む世界へ

2026-09-20 / HZ-BL-026。Status: 実装・自動/ローカル/公開ブラウザ検証・本編公開済。実機聴感待ち。

ユーザーの「接続しながら磨いて」により本編音への接続を実装。
公開範囲を聞いた後の「接続してすすめよ」を受け、検証後に既存本編へ反映する方針を伝えた。
公開や制作続行の指示を、実機の音が合格したという記録にはしない。

## 何を接続したか

Music内の固定JSONをread-onlyで照合し、1,045細胞/17,224接続の脚部分回路から
10群の係数を新たに作った。元の重いJSONも、Music/Fly Labのコードもコピーしない。
`slice.js`内の軽い状態更新を、元からあるWeb Audioの反応へ接続する。
[正確な出典・縮約手順・CC BY 4.0・変更と限界](../FLY-CIRCUIT-CREDITS.md)を参照。

元の回路と等価なシミュレーションではない。符号、刺激、疲労、更新速度、音への対応はモデル上の仮定。
神経の重みは変わらず、常時生存・意識・好み学習・RSI・仏教哲学の実証ではない。
Openclaw-labへの通信/実行も追加しない。

## 音と操作

- A由来の持続音・E45の音色とvoice上限を維持。新しい音源や音声Contextは増やさない。
- 回路は間合い、擦れる音域（最大±5%）、応答の減衰（最大22%、増幅なし）へだけ接続。
  断片の時間差は最大±0.1秒、擦れの追加遅延0〜0.2秒、鼓動間隔は最大±8%。
  これらはハード上限で、通常の出力はより小さい。効果が耳で有益かは未判定。
- 同じtimer一つで10Hz更新。遅れを追計算せず、現在のforegroundの小さな反応として使う。
- ページ内設定「回路による音の気配」をoffにするとE45の固定応答と元の鼓動間隔へ戻る。
  切替で新しい音を始めず、前の応答を短く減衰させ、回路をreset。再読込で標準onへ戻る。
- ミュート/停止/非表示/interruptedで回路は進まない。停止/非表示後の再開は明示操作のみ。
  ミュート時は予約音も取り消す。disposeで回路の一時状態を消す。保存キーは追加しない。
- OS reduced-motionでは回路off固定、timer/持続音なし。既存の有限操作音は残す。
- 世界の進行/認識点/結末を回路に決めさせない。入力は既存の音用の深度/圧/密度と有限cueだけで、本文文字列は渡さない。

## 八観の小さな修正

流れSの列挙と末尾の呼び名を、入口Aと生成側に合わせ「体・波・思・財・創・観察者・空・円」に揃える（2行）。
原典09市場版と10曼荼羅版は用途が異なるため、原典ファイルは改稿しない。
新しい教義・分類・ルートは未追加。[Steam方向と公開資料の検討](eight-views-steam-direction.md)は仮説として残す。

## 検証

- 初期master `ff90848`、clean、hazama-check 2 PASS / 0 FAIL / 0 SKIP。
- `scripts/project-fly-circuit.mjs`で固定sourceの1,076,374 bytes/SHA-256を検証して縮約。
- `fly-circuit-smoke`: 同seed/入力/reset再現、配線を切るablation差、cue刺激差、1時間相当36,000stepの
  有限値/境界、full/light/staticのon/off/mute/停止/再開/hidden/interrupted/disposeを実Audioで検査。
  純粋モデルのablationによるactivity最大差0.02859、cueによるspacing最大差0.07940。
  動作の因果性の検査で、縮約の生理学的忠実度や聴感の証明ではない。
- 新設定は既存のページ内設定検査に追加。日本語/英語の案内と出典を備える。
- native OfflineAudioContext、stereo 44.1kHz・12秒 × on/off × full/light/static × 7条件（42件）。
  最終peak最大0.19413、NaN/Inf/clip 0、開始時muteは全6条件で厳密0。持続音の残存とstatic操作音の有限終了を確認。
  最大voiceは13/11/8。検証clockで駆動した合成の検査で、実時間の端末負荷や耳の合格ではない。
- Playwright CLI/Chromiumで構造→Ω（C→Bの抗い/再訪あり）、英語身体→浮上、次周以降の流れ→ΩをUI通過。
  流れSの修正2行を実表示で確認。QAの本文selector誤りを直して再走し、製品の不具合とは数えない。
- 回路on/off・pause・hidden模擬→手動再開・pagehide→Context再生成を確認。エラー0、終了時全Context closed/予約音0。
  保存/reload/キャッシュ済みoffline入口でspiral維持、自動再生なし。音のQA出力先のみ無音にして操作した。
- 390/320pxと本文130%、日英の展開した出典を確認。document/dialogの横overflowなし、画面画像を目視。
  出典リンクの暗い既定色をaccent色へ改善し、summaryの44px操作領域とキーボードfocusを追加。
  ローカル最終CSSはQA queryを追加して旧E46試験cacheを避けた。公開先では通常のE46参照で再確認する。
- feature branchで同一会話の差分reviewを実施。独立agent reviewではない。原典・ゲーム数値・保存形式は変更なし。

## 公開確認

- 実装commit `198ac5e168f2899b5a1bb46645f83f391d708ad6`をmasterへfast-forwardして通常push。
  既存Pages deployment `35452317333`は同SHAでsuccess。新hosting/公開設定/workflowは追加しない。
- [本編E46を開く](https://quietbriony.github.io/hazama/?v=e46)。公開15資産はHTTP200・MIME・ローカル内容一致。
  本編6資産、出典MD、縮約JSON、既存の比較lab7資産を確認した。
- 公開E45のSW/cacheを保持した同じ隔離ChromiumでE46を開き、更新後の入口・runtime・SWがe46に揃うことを確認。
  cacheはe46-static/runtime。音声Context作成0・自動再生なし。
- 公開構造ルートでΩ終端（認識14、C→B抗い/再訪あり）。回路on/off、pause、hidden模擬→手動再開、
  pagehide→再生成、保存維持、reload/キャッシュ済みoffline入口を再確認。全Context closed・予約音0・エラー0。
- 通常のe46 CSS参照で日英共通の出典リンク色を確認。390/320pxの設定と展開出典・終端で横overflowなし。
  Playwrightのスクリーンショットを目視。実iPhoneの音やSafari固有挙動を代わりに保証するものではない。

## 次に人間が聴くところ

小音量で始め、同じ数場面をon/offで読み比べる。onを当てる試験より、
「音が気になるか」「沈みが続くか」「数分で疲れるか」を聞く。
実iPhone/Safari・ロック復帰・PWA install/offline・イヤホン差は人間の確認待ち。
Steamの販売品質/需要や、思想の伝わり方も未合格として残す。
