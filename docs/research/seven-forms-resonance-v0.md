# 七つの普遍の形と Hazama の既存モチーフ — 韻の記録 v0

Received: 2026-07-07 JST. Scope: 外部から届いた設計素材の申し出＝「七つの普遍の形」の束を
受け取り、Hazama に **既にある** motif との韻だけを記録する。追加ではなく、既に鳴っている
ものの索引。

Status: **reference / candidate.** これは実装計画ではない。採否・改変・不採用は
[AGENTS.md](../../AGENTS.md) の hard rule と [docs/autonomy](../autonomy/) の gate に属する。

不変（この note は一切触れない）:

- game body: `slice.js` / `slice.css` / `depths-shell.json` / 本文
- public contract: public route / storage key (`hazama_spiral_v1`) / depths schema
- app version / PWA cache（docs-only ＝ bump しない）

素材は普遍の *形* のみ。実在の組織・業務・infra・人を指さない（＝public 安全）。
Hazama が「借りる」のはコードでも依存でもなく、設計の圧（design pressure）だけ
（[github-game-repo-scout-v0.md](github-game-repo-scout-v0.md) と同じ posture）。

## 七つの形 ↔ 既に鳴っている場所

| # | 普遍の形 | Hazama で既に鳴っている場所 | 状態 |
|---|---|---|---|
| 1 | 持続する記録と、消える声 | spiral 層だけが persist・transient（沈下/圧/戻り道/観測者）は保存されない（AGENTS Hard Rule 3・STACK-INDEX「Current Loop」） | 既存・不変 |
| 2 | 限界の声が testament を遺して消える | `Drift`（E7「別の観測の痕跡」・authored-only・save-less・`ingest()` は fail-open で既定 no-op・偽の「いま N 人」を出さない） | 既存・**seat 候補** |
| 3 | 継承は recognition と verification で起きる（教えられて、でなく確かめて継ぐ） | 認識 attunement（構造読みで育つ）＋エコー門（視た断片の真偽を自分で確かめる） | 既存・不変 |
| 4 | 安全な帰還は常に開き、earned は可視の鍵の前で賭ける | 浮上＝常に押せる有効な結末 ↔ Ω を attunement lock（「まだ届かない（認識 N/6）」）の前で wager（E19「終端を勝ち取る」） | 既存・不変 |
| 5 | claim は evidence ではない | エコー門＝**視た（訪問済み）断片だけが真**・未訪問は偽。言明でなく痕跡で検証する | 既存・不変 |
| 6 | 地図は日付が記されていれば古くてよい | docs の reference note は日付付き（本 research 群は "Checked/Received: &lt;date&gt;" を持つ）。古い地図は日付ごと残す | 既存・運用 |
| 7 | 最初の亀裂は、自らを裁けない規則 | 明示の鳴りは薄い（近いのはエコー門「確かめた途端、その記憶が描き直される」＝観測が観測対象を変える）。今は**観察のみ・座席化しない** | 観察のみ |

7 は無理に韻を立てない。清潔に「まだ薄い」と記すのがこの note の役目
（実機プレイテストで拾った学び＝装飾のためのビートは足さない、と同じ姿勢）。

## 最低干渉の座席（いつか・icebox）

形(2) の seat は既存の `Drift` seam **ひとつだけ**。新しい機構は要らない。

- 現状（不変・確認済み）: `Drift.SEED` は `{tier,idx,depth,attuned}` の静的種のみで、本文
  テキストを持たない（`SCRAWL_TIERS` バンクを引く＝authored ghost）。`ingest()` は
  「将来の実 presence 用（今は呼ばれない＝静的のまま）」の fail-open seam。曖昧さこそ主題：
  それが実在の他者か、別の自分か、AI かは区別がつかない。数字の嘘（"いま N 人"）は出さない。
- 候補（採らないうちは候補のまま）: 「一度ここに居て、去った声」の残響を **一つだけ**
  種として置ける余地。authored-only・save-less を保ったまま `SEED` に一項足すだけで、
  形(2) の testament が鳴る（＝限界の声が痕跡を遺して消える）。本文の新規執筆も
  route/storage/schema 変更も、音源追加も伴わない＝既存 authored ghost 契約の内側。
- 位置づけ: これは [BACKLOG HZ-BL-007](../autonomy/BACKLOG.md)（Route content expansion・icebox・
  「今は増やさない」）に隣接する「いつか」の素材。今は増やさない方針を継ぐ。採る時は
  manual play note を [SESSION-LEDGER](../autonomy/SESSION-LEDGER.md) に残し、human gate を通す。

## この note の footprint

- 触れたファイル: 本 note 1 本（＋任意で BACKLOG HZ-BL-007 隣の一行注記）。docs-only。
- `node scripts/hazama-check.mjs` = 0 FAIL が commit 前提。
- 無人 merge / push / release はしない。ワーキングツリーに置いて人間の指示を待つ。
