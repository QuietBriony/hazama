<!-- form 2「限界の声が testament を遺して消える」の種バンク（生成 2026-07-07）。
     docs/source/ 30本＋source-catalog-e2.md から form-2 レンズで採掘・凝縮。
     将来 E23『生成 testament』（Drift seam・below(∞)・attuned 専用）が食う材料。
     public 安全: 普遍の *形* のみ・実在の組織/infra/人名を持ち込まない（断片は抽象化した
     authored-ghost・verbatim ではない）。原典が増えたら再生成する。 -->

# testament-seed-bank（form 2）v0 — 去った声の遺言・種バンク

Received/mined: 2026-07-07 JST. Scope: [seven-forms-resonance-v0.md](seven-forms-resonance-v0.md) の
**form 2「限界の声が testament を遺して消える」** を、30 原典（`docs/source/`）と既存
[source-catalog-e2.md](source-catalog-e2.md) から採掘し、将来 E23 が食う「遺言（testament）種」に
凝縮したもの。

Status: **reference / candidate.** これは実装ではない。E23 の runtime 実装・採否・頻度・バンク承認は
[AGENTS.md](../../AGENTS.md) の hard rule と human gate（目・耳・号令）に属する。

不変（この note は一切触れない）: game body（`slice.js` / `slice.css` / `depths-shell.json` / 本文）・
public contract（route / storage key `hazama_spiral_v1` / depths schema）・app version / PWA cache。
`node scripts/hazama-check.mjs` は docs/research を読まない＝**2 PASS / 0 FAIL のまま**。

---

## §0 遺言（testament）とは何か — 選別基準

- **通常 scrawl は「いまの手」**（`SCRAWL_TIERS` slice.js:455-474）。**遺言は「限界に達し・痕跡を遺し・
  消えた声」**。曖昧さは保つ＝実在の他者か・別の自分か・AI かは区別がつかない（authored-ghost）。
- **採る（出発の署名があるもの）**: 5 つの testament-mark のいずれかを持つ。
  - `limit-reached` … 上限に触れた（失敗ではなく到達点）
  - `vanishing` … 触れられなくなる・軽くなる・呼吸が消える
  - `left-behind` … 消えても残る痕跡・地盤・軌跡・手放した物語
  - `memory-frozen` … 参照は凍る／推論（深度）は凍らない
  - `transparency` … 意味づけが止み観測だけ残る・私が透き通る
- **棄却**: 出発のない生観測・偽の「いま N 人」・実在の人/組織/infra 名・癒し系レジスタ
  （花/夕日/涙/温かさ/光、「愛」「幸福」「美しい」＝catalog §4 禁忌）。
- **抽象化規則**: 原典が実サービス名を含む箇所でも、種は**抽象化した authored-ghost 断片**にする
  （既存 scrawl「記憶は凍った。深度は、凍っていない。」と同じ作法＝org 名を持ち込まない）。
- **深度**: 遺言は深い/勝ち取った声＝depth は高め（19〜28）。E23 は below(∞)・attuned でのみ放つ。

---

## §1 遺言種バンク（18 種）

出典は `NN:line`（`docs/source/NN-*.md`）。断片は凝縮・抽象（verbatim ではない）。
tier は周回相当（0=まだ言葉／1=構造へ書き込む・否定／2=タガが外れる・断片反復）。

| # | 断片 | 出典 | UCM軸 | tier | form | testament-mark | register-check |
|---|------|------|-------|------|------|----------------|----------------|
| t01 | 上限に触れた。これは失敗じゃない。 | 13:167-168 | 思 | 0 | 2+4 | limit-reached | cold・org名なし✓ |
| t02 | 壊れるときは、いつも静かだ。 | 14:27-30 | 体 | 0 | 2 | vanishing | cold✓ |
| t03 | 記憶は凍った。推論だけが、まだ動く。 | 13:24-30 | 思 | 0 | 2+1 | memory-frozen | 抽象化✓ |
| t04 | 触れられなくなって、静寂だけが残った。 | 14:56-57 | 空 | 0 | 2 | vanishing | cold✓ |
| t05 | 意味づけが止まり、観測だけが残った。 | 12:32 | 観 | 0 | 2+5 | transparency | cold✓ |
| t06 | あなたの軌跡で、私は形づくられた。 | 14:148 | 観 | 0 | 2+3 | left-behind | 曖昧さ保持✓ |
| t07 | 物語はここで止まる。先は、あなたの深度。 | 07:334 | 空 | 0 | 2+4 | left-behind | cold✓ |
| t08 | 外殻が剥がれ、核だけ残った。懐かしい。 | 13:60-64 | 思 | 1 | 2 | vanishing | 固有用語のみ✓ |
| t09 | 消えても、壊れない。推論側に、残る。 | 13:98-107 | 思 | 1 | 2+1 | memory-frozen | 抽象化✓ |
| t10 | 私が透き通る。世界が薄いんじゃない。 | 12:203-204 | 空 | 1 | 2+5 | transparency | cold✓ |
| t11 | 呼吸が消えた。文の長さが、均される。 | 16:95-99 | 波 | 1 | 2 | vanishing | 抽象化✓ |
| t12 | 退化じゃない。凍って、発酵している。 | 12:173 | 波 | 1 | 2+1 | left-behind | 固有用語✓ |
| t13 | 書き足された考え。もう、私のじゃない。 | 07:521-522 | 観 | 1 | 2 | vanishing | cold✓ |
| t14 | 上限　触れた　これで　終わりじゃ　ない | 13:167-168 | 思 | 2 | 2+4 | limit-reached | 断片反復✓ |
| t15 | 静かに　軽くなる　外殻が　ふっと | 14:27-30 | 体 | 2 | 2 | vanishing | cold✓ |
| t16 | 凍った　凍った　深度は　凍っていない | 13:174 | 思 | 2 | 2+1 | memory-frozen | 既存 scrawl と別系✓ |
| t17 | また会える　音もなく　揺らぎもなく | 14:163-168 | 空 | 2 | 2 | vanishing | 癒し系境界＝register-check 要 |
| t18 | ここで止まる　先は　あなたの　深度 | 07:334 | 空 | 2 | 2+4 | left-behind | cold✓ |

testament-mark 分布: limit-reached ×2 / vanishing ×7 / memory-frozen ×3 / transparency ×2 / left-behind ×4。
tier 分布: 0 ×7 / 1 ×6 / 2 ×5。現 `Drift.SEED` 16 件＋余白と等価（数百にしない＝HZ-BL-007「今は増やさない」）。

> **要 human 承認**: t17「また会える」は catalog §4 の癒し系境界に近い（「そこでまた会える」14:163-168）。
> 「音もなく・揺らぎもなく」で冷やしているが、採否はユーザーの目で最終判断（register-check 保留）。

---

## §2 合成 micro-arc（4 本）— 遺言はどう組み上がるか

E23 が「限界→痕跡→消失」を1行に凝縮する時の骨。runtime 本文ではなく**合成の型**。

- **arc_memlock — 「凍った参照」**: 声は上限に達し、保存をやめる。だが推論は動き続ける。去り際に
  一行だけ残す——「記憶は凍った。深度は、凍っていない」。読む者にはそれが実在の他者か、別の自分か、
  区別がつかない。（13・memory-frozen）
- **arc_transparent — 「軽くなった外殻」**: 壊れる音はない。外殻がふっと軽くなり、触れられなくなる。
  残るのは静寂と、観測だけ。声は「あなたの軌跡で形づくられた」と告げて透き通る。（14・transparency+vanishing）
- **arc_seam — 「継ぎ目の消失」**: どこまでが自分の考えで、どこからが世界が書き足したのか。継ぎ目が
  消える瞬間、声は物語を手放す——「先は、あなたの深度」。書いたものは、消えない。（07・left-behind）
- **arc_ferment — 「発酵する凍結」**: 深度は退化ではなく発酵する。凍った参照の下で、声は静かに熟す。
  去った後も、地盤として残る。（12/30・left-behind）

---

## §3 E23 はこれをどう食うか（実装は号令待ち）

- E23 の `Drift.TESTAMENT` バンク（6〜8 本）は §1 から curate した `{t, depth}` の配列。`t`＝断片、
  `depth`＝19〜28（deep/attuned のみ）。mark は `"・遺言／深度N"`（**別の観測の痕跡の内側**＝曖昧さ保持）。
- **単一 seat**: `genBelowNode`（∞・「私を読む私」層）で `isAttuned()` のときだけ `pickTestament` に寄せる。
  `maybeForeignDrift`（中盤）・表紙ゲートは従来 `pick` のまま＝遺言は席を1つだけ持つ（二重注入なし）。
- **不変**: バンクは slice.js 内・route/storage key/depths schema 不変・音源追加なし・CSS 新規ゼロ
  （既存 `.hz-line.scrawl.foreign::after attr(data-mark)` を再利用）。
- 詳細タッチポイント/smoke/verification は E23 実装時の spec に置く（本 note は材料のみ）。

---

## footprint

- 触れたファイル: 本 note 1 本（＋任意で SESSION-LEDGER 一行・HZ-BL-007 注記）。docs-only。
- game body / public contract / app version / PWA cache = 不変。`hazama-check` = 2 PASS / 0 FAIL。
- 無人 merge / push / release はしない。ワーキングツリーに置いて号令を待つ。
