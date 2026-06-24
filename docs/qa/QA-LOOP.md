# QA-LOOP — Hazama 全機能 ユーザーストーリー駆動 QA ループ

参考にした 4 フェーズ（feature inventory → test → fix → retest）を、Hazama の
**静的 Web 単一ビルド／human-gate／無人 push 禁止** に合わせて落とし込んだ運用書。

`/loop` で回す。**唯一の正典は `docs/qa/feature-stories.csv`**（= single canonical spreadsheet）。
進行の栞は `docs/qa/LOOP-STATE.md`。ループは毎回この 2 つを読んで「どこまでやったか」を復元する
（会話文脈ではなくディスクが記憶＝context が要約されても続行できる）。

---

## フェーズ（直列・1つ終わったら次へ自動で切替）

| Phase | やること | 完了条件 | 出力先 |
|---|---|---|---|
| **1 棚卸** | コードから全機能を抽出し、機能ごとに「ユーザーストーリー＋期待挙動＋根拠 file:line」を書く | 全機能行に P1_story=✅ | CSV の行を埋める |
| **2 検証** | 各ストーリーを実際にテストし、全エラーを記録 | 全行に P2_テスト結果 | CSV P2 列 |
| **3 修正** | 論理エラー / UX エラーを直す（hard rules 内・working tree のみ） | 全 P2 不具合に P3_修正 | CSV P3 列＋実コード |
| **4 再検証** | Phase 3 で直した行だけ再テスト | 修正行に P4_再テスト | CSV P4 列 |

完了したら `/loop` を**止める**（dynamic モードなら次の ScheduleWakeup を呼ばない）。
締めに `docs/autonomy/SESSION-LEDGER.md` へ要約を追記する。

---

## 1 イテレーションの定型（毎回これだけ）

1. `LOOP-STATE.md` と `feature-stories.csv` を読み、現在 Phase と次にやる行を決める。
2. **1チャンクだけ**進める（目安: 棚卸 3〜5 機能 / 検証 3〜5 ストーリー / 修正 1 件）。
   - 欲張らない。1 ループ＝1 検証可能な単位。
3. CSV を更新（行を Write で書き直す＝サージカル Edit より壊れにくい）。
4. `LOOP-STATE.md` を更新（現在 Phase・最後に触れた行 ID・気づき）。
5. そのチャンクでフェーズが満了したら **Phase を +1** して STATE に記す（=「switch loop to …」）。
6. Phase 4 まで満了 → ループ終了＋ledger 追記。

---

## Hazama 専用ガードレール（loop は必ず守る）

- **本体不変が既定**: `slice.js` / `depths-shell.json` / 原典は、Phase 3 で**実バグを直す時だけ**触る。
  LP(`lp.html`)は本体と別系統。「展開を変える」改修は QA ループの仕事ではない（BACKLOG 案件）。
- **version 同期**: runtime を1行でも変えたら `index.html` の `?v=`・`slice.js` の depths fetch `?v=`・
  `sw.js` の `VERSION` を必ず揃える（`build-consistency` が落とす）。docs/CSV だけの変更では bump しない。
- **検証の正**: 各修正後に `node scripts/hazama-check.mjs` が **0 FAIL**。挙動はブラウザ preview で確認。
- **human-gate は agent が done にしない**: 音（軸色 setAxis / 呼気 breath = E21）・実機 PWA install/offline・
  mobile の手触り・音の体感。これらは P2 に「human-gate: 要実機」と記録し、人間に上げる（CSV human_gate=yes）。
- **無人 push / merge / release 禁止**: Phase 3 の修正は working tree に置くだけ。報告して人間の号令を待つ。
- **依存・build step・GitHub Actions・音源/サンプル/歌詞を追加しない**（静的 Web のまま）。
- raw ユーザー入力を保存しない／PWA cache は `hazama-pwa-` 名前空間だけ。

---

## テスト手段（Phase 2 / 4）

- ヘッドレス: `node scripts/hazama-check.mjs`（必須/撤去ファイル・version 三点同期・認識/Ωゲート・
  二極終端・spiral 契約・エコー門・縁カード・depths 到達性）。
- ブラウザ: `python -m http.server 8740` を立て、preview ツールで
  `沈む → 零章 → 構造/表層/戻る → エコー門 → 二極終端 → 縁の二択 → 再降下で周回深化` を実走。
  幹ゲート（cycle≥1 流れ / ≥2 崩壊 / ≥3 並行）は localStorage の cycle を進めて確認。
- 音・実機 feel: **ヘッドレス不能**。記録のみ＝human-gate。

---

## なぜ CSV か（このリポジトリでの最適化）

- 1 ファイル＝single canonical。git-diff で履歴が残り、Excel でも開ける。
- agent が毎ループ確実に読み書きできる（xlsx の round-trip 事故がない）。
- 人間に見せる時はマイルストーンで `xlsx` スキルにより `.xlsx` 出力してもよい（任意）。
