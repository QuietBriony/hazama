# E2-E3 SPEC — 原典給餌（E2）＋ 認識2.0（E3）

> **Status: 完了（2026-06-12/13）** — E2=cc89b72 / E3=2a8db3f として master 反映済み。本書は発注の歴史記録。
> 現行の構成・検証は `README.md` と `scripts/hazama-check.mjs` が正。

発注書。実装エージェント（opus）と将来の agent はこれを正とする。
レビュー/承認/コミットは管理側（Fable）が行う。branch `claude/evolve-e1`。master 無変更。

## 0. 不変の制約（AGENTS.md 準拠）

- 静的 Web のまま。依存・build step・GitHub Actions・音源ファイル追加禁止。
- `depths-shell.json` schema は**後方互換の追加のみ**（既存フィールドの意味を変えない）。
- 資源ゲームUIは持ち込まない（D2=(a)）。数値・ゲージ・クイズ画面を出さない。
- raw 入力保存なし（そもそも自由入力は無い）。spiral 層の保存内容は変えない。
- `node scripts/hazama-check.mjs` 2 PASS / 0 FAIL がコミット条件。

## 1. 本文レジスタ（執筆規範）

- トーン: **硬い・乾いた・サイバーパンク・威圧**。詩性は「異物感のため」だけに最小量。
- 文は短く切る。読点で沈ませる。説明しない。比喩は機械・建築・観測・地質から。
- 「核」は描写しない。歪み・退き・白く灼ける、で示唆のみ（§4-1）。
- who の声色: `n`=地の文 / `voice`=『』の声 / `self`=私の独白 / `body`=身体に来る /
  `cold`=乾いた観測 / `danger`=危険 / `scrawl`=手の殴り書き（断片・反復可）。
- 既存本文と並べて違和感が出ないこと。原典（docs/source/）の語彙を借り、引き写しすぎない。

## 2. E2 — 原典給餌（コンテンツ・パッケージ）

成果物はまず **草稿ファイル**として `C:\workspace\hazama-scratch\e2-draft\` に置く（репо外）。
承認後に repo へ適用する。各草稿には出典（docs/source のファイル名）をコメントで残す。

### 2A. NODE_VARIANTS 拡張（slice.js）
- 対象: B C D E F G H J L N Q S V Y Z（既存 zero/A/Omega/reborn は +1 変種ずつ強化）。
- 各対象ノードの本文 1〜2 行に対し**言い換え 2 案**（原文は常に候補に残る仕様）。
- 制約: 意味とビート維持・who 不変・長さ ±30%・周回で読むと「世界が微妙に変質した」と
  感じる差分（語の置換でなく、視点や確度がずれる）。
- 草稿形式: `variants.draft.js`（NODE_VARIANTS へそのままマージできる object literal）。
  行 index は `depths-shell.json` の該当ノード `lines` を読んで確定すること。

### 2B. detour 追加 +5（depths-shell.json）
- 既存 det_mirror 等と同 schema の自己完結ノード。`choices` は既存作法
  （descend → `__rejoin` 合流、等）に合わせる。observer は 0（=直前深度を保つ）。
- 各 det は別々の原典テーマから: 候補= 08(AI依存) / 13(記憶ロック) / 14(透明な日) /
  30(深みが支える) / 09(八観OS)。id は `det_<短い英語>`。
- 草稿形式: `detours.draft.json`（nodes へマージできる object）。

### 2C. below(∞) バンク増量（slice.js）
- UCM_AXES 9 軸それぞれ +2 句（既存と同じ「現象の一文」形式・核は描かない）。
- BELOW_SELVES +4 / BELOW_VOICES +4（VOICES は『』声）。
- 草稿形式: `below.draft.js`。

### 2D. scrawl 増量（slice.js）
- SCRAWL_TIERS 各 tier +3（tier0=まだ言葉になる / tier1=構造へ書き込む・否定 /
  tier2=タガが外れる・断片反復）。草稿は below.draft.js に同梱可。

### 2E. ECHO_BANK 新設（slice.js・E3 の燃料）
- `nodeId → 断片` の map。対象: 主要深度 A〜Z から 14 ノード＋全 detour（既存5+新規5）。
- 断片 = **12〜28字・その場を読んだ者なら「視た」と分かる引用的イメージ**（本文の
  そのまま引用でなく、凝縮した言い直し）。『』は付けない（表示側で付ける）。
- 草稿形式: `echo-bank.draft.js`。

### 2F. deep タグ付け（depths-shell.json）
- descend choice のうち「**構造を読む選択**」（編み目をなぞる・問いを立てる・記述を疑う等、
  前進するだけの移動ではないもの）に `"deep": true` を追加。**12〜16 個**。
- 草稿形式: `deep-tags.draft.md`（`ノードid / choice本文 / 理由一行` の表）。schema 追加は
  optional field のみ＝後方互換。

## 3. E3 — 認識2.0（読解の試験化・slice.js）

狙い: 認識を「descend クリック集計」から「読んだことの証明」へ。UI は増やさない。

### 3.1 gainRecognition 改訂
```js
ATTUNE = { omegaThreshold: 6, structuralGain: 1, surfaceErosion: 1, echoGain: 2, echoSlip: 1 }
```
- descend: `c.deep === true` のときだけ +structuralGain（無印 descend は 0）。
- surface: −surfaceErosion（floor 0）＝表層で読むと認識が剥がれる。
- retreat: 0（変更なし）。

### 3.2 エコー門（EchoGate）
- 発火: `ECHO_GATES = ["Q", "Z"]`。各門は**周回ごとに一度**（state に発火記録、spiral 保存不要
  =セッション内のみで可。周回で再挑戦できる）。
- 流れ: 対象ノードの本文 reveal 完了後、通常 choices の**代わりに**まずエコー選択を出す:
  - 真 1: ECHO_BANK のうち**訪問済み** id（detoursSeen 優先、なければ visits）から 1 つ。
  - 偽 2: **未訪問** id の断片から 2 つ（未訪問が足りなければ 1 つでも可）。
  - 逸らし 1: 「目を逸らし、先へ」（gain 0・侵食もなし＝正直なスキップ）。
  - 並びと選抜は `worldSeed() ^ hashStr(nodeId)` の mulberry32 で決定論。
- 表示: lead = `『断片』`、sub なし（機械的説明を書かない）。kind class は `echo`
  （slice.css に最小スタイル: 既存 choice 準拠＋細い点線でわずかに異質に）。
- 結果ビート（resistBeat 機構を再利用して通常 choices の前に挿す）:
  - 真: +echoGain。cold「——視た。あなたの降下は、あなたのものだ。」
  - 偽: −echoSlip（floor 0）・dread +0.05。danger「——それは、あなたの視たものではない。借り物の記憶は、ここでは効かない。」
  - 逸らし: ビートなし。
- エコー後にそのノードの通常 choices を出す（深度遷移はしない＝門は足止めしない）。
- REDUCED / 既存 Follow・reveal 機構と干渉しないこと。

### 3.3 表示・保存
- 認識インジケータ・縁サマリ・縁カードは無変更（値の意味が変わるだけ）。
- spiral 保存 schema 無変更。

### 3.4 smoke（build-consistency へ追加）
- `ECHO_BANK` 存在＋エントリ ≥15。
- depths-shell の `"deep": true` choice ≥10。
- `surfaceErosion` / `renderEchoGate`（または同等マーカー）存在。
- version 同期は既存検査が担保（E2 适用時 `?v=e2`、E3 完了時 `?v=e3` に揃える）。

## 4. 受け入れ基準（コミット前）

1. `node --check slice.js` / `node scripts/hazama-check.mjs` 2 PASS。
2. 草稿に出典コメントがある。レジスタ逸脱（説明調・感傷・横文字過多）がない。
3. エコー門: 真を選ぶと +2、偽で −1、逸らしで 0。周回内再発火しない。decoy が
   訪問済み断片と重複しない。
4. 通しで console error 0（localhost preview）。
5. バランス見込み: 全 deep 読破 ≈ +12〜16 / 表層多用や門の取りこぼしで 6 未満が現実に
   起こり得る（=浮上の極が生きる）。タッチパス（人間プレイ）前提の v1 とし、定数は
   ATTUNE に集約しておく。
