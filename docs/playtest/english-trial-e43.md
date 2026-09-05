# E43 — English Body-path trial

2026-09-05。日英の試遊を並行して進めるための、小さな翻訳試作。
翻訳の自然さ・面白さ・需要の人間による検証は未完了。Steam向け完成版ではない。

E44でも本文の翻訳範囲は同じ。追加したReading focusと忘却の確認画面は英訳済み。
Reading focusは明瞭な文字/操作と静かな背景を選ぶ表示設定で、文字送り・音・記憶・進行を変えない。
Forget everythingは確認を開くだけ。Keep my memories/Escで取り消し、Erase memories and start anewで初めて消去する。

## 対象と非対象

- 表紙で `Language / 言語 → English (trial)` を選び、`Descend` で開始する。
- 初回の `zero → A → B_soma → D_soma → F_soma → J_soma → N_soma → S_soma → V_soma → Y_soma → Z → Omega → reborn`、
  入口で一度ためらう `zero_hold`、浮上/Ωの終端を英訳した。全体72ノード中、本文カタログは14ノード。
- 設定・通常/鍵/エコー/終端の操作、結末の記録、正答と誤答を含む全29エコー断片も対象。
- 未翻訳の道と本文は案内を出し、日本語のまま読める。選択肢の削除・ロック条件・認識の増減は変更しない。
- 周回の言い換え/他の幹/寄り道/無限深度には未訳が残る。共有カード画像と共有文も日本語のまま。
  画像保存ボタンにもJapaneseと明示。装飾画像の文字やストア向け説明を全英語対応と扱わない。
- 言語は開始前に選び、再読み込みで日本語へ戻す。言語切替自体は記憶を書かず、再読み込みで記憶も消さない。
  初回用には別のテスト用ブラウザプロフィールを使う。既存の個人記憶を消して準備しない。

## 翻訳の基準

| 原語 | この試作での基準 |
|---|---|
| 認識 | attunement（深く受け取ることで育つ状態） |
| 核 / 外殻 | core / outer shell（同じものに訳さない） |
| 戻り道 | ways back（残数と喪失を選択前に示す） |
| 身体 / 構造の道 | Body / Structure path |
| 周回 / 観測者 | cycle / observer |
| n / cold | 読者に向けた地の文 / 乾いた現象の記述 |
| self / voice | 内側の一人称 / 引用符付きの声 |

本文キーは日本語の原文そのもの。原文が変われば旧訳を無条件に再利用せずfallbackする。
対象ノードの訳抜け、エコーの正答だけが訳される漏洩、原文/進行への書込みはsmokeで検出する。
英語の文字増加だけで待ちが伸びないよう、段落の文字送りは原文相当時間を上限にする。
この時間が心地よいかは実プレイで判断し、必要なら全文表示を使える。

## 人に頼む試遊

日本語版の自由な初見テストは[E41手順](steam-demo-candidate-e41.md)を継続する。
英語版はまず英語で普段ノベル/探索ゲームを読む人に、訳の品質と読解を見てもらう。
以下は翻訳対象の範囲を指定するテストなので、自由な経路選択や販売需要の証拠とは区別する。
相手の了承の範囲だけ記録する。録画・募集・連絡・自動収集・外部送信は未実施。

参加者には[短い英語案内](invite-en.md)を渡す（送信はしていない）。
公開ゲームへのリンク、実際の選択肢ラベル、終了後の3問を一つにまとめてある。
依頼と返答の扱いは[最初の試遊ラウンド](first-round.md)を使う。
以下は実施側が必要に応じて追加する質問で、すべてを参加者の必須回答にはしない。

終わった後に聞くこと:

1. What did you think you were doing, and what changed because of your choices?
2. Which sentence felt unnatural, unclear or too abstract? What did you think it meant?
3. Could you tell the inner voice from the voice addressing you?
4. Did the memory question feel fair? Did you recognize a scene you had actually read?
5. Did the ending feel chosen, earned or imposed? Would you try another path without being asked?
6. Did the text reveal add atmosphere, or make you wait? Where did you use Reveal all text?

記録は匿名ID/言語/端末/build/到達点/問題の文/受け取った意味/中断理由に絞る。
数値の一致は動作検証であって、訳の採否・面白さの合格ではない。

## 次の判断

声が混ざる/選択の意味が伝わらない/門が不公平と受け取られるなら、全文拡張の前に対象箇所を直す。
初回の反応と英語表現が整ってから、構造の道→寄り道/周回変奏→他の幹/無限深度/共有へ対象を広げる。
英語ストア説明や「英語対応」の公開表記は、実際に対応する製品範囲と揃える別工程。
