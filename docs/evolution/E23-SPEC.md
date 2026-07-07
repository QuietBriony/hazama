# E23 SPEC — 生成 testament（去った声の遺言・Drift seam）

> **Status: 発注（未実装・号令待ち）** — 実装はワーキングツリーで行い、目/耳の human-gate と
> 明示号令が揃うまで deploy（push）しない。素材＝[../research/testament-seed-bank-form2-v0.md](../research/testament-seed-bank-form2-v0.md)、
> 動機＝[../research/seven-forms-resonance-v0.md](../research/seven-forms-resonance-v0.md) form 2。

発注。実装は精密（Fable）。対象: `slice.js` / `scripts/build-consistency-smoke.mjs` /
`index.html` / `sw.js`。**触らない領域**: `slice.css`（既存 `.hz-line.scrawl.foreign` 再利用のみ）・
`depths-shell.json`・Spiral/認識ロジック・Audio。

## 0. 不変の制約

- static / 依存ゼロ / build なし / Actions なし / 音源なし。
- public contract 不変: route・storage key `hazama_spiral_v1`・depths schema。DATA.nodes を mutate しない
  （`genBelowNode` は既に新オブジェクトを組む＝踏襲）。
- authored-ghost 倫理: 曖昧さ保持（実在他者/別の自分/AI 区別不能）・実在人物/組織/infra 名なし・
  偽「いま N 人」なし・save-less・`ingest()` は no-op のまま。
- 決定論（content に `Math.random` を使わない）・reduced-motion 安全・後方互換
  （below-loop 0／un-attuned は byte 同一）。
- `node scripts/hazama-check.mjs` = 2 PASS / 0 FAIL がコミット条件。version `?v=e21→e23` 同期
  （index css/js・slice fetch・sw VERSION）。**e22 は飛ばす**（LP はゲーム版を bump していない）。

## 1. 座席（seat）— Drift 内サブバンク＋単一 call site

**seat 決定**: (a) `Drift` に静的 `TESTAMENT` バンク（testament-seed-bank から 6〜8 本の `{t,depth}`）と
`pickTestament(seed)` を足す。`pick` と同じ行形（`{who:"scrawl",t,foreign:true,mark}`）だが
`mark:"・遺言／深度N"`（**別の観測の痕跡の内側**＝曖昧さ保持）。別ソルト `0x7e57a3d1` で `pick` と別系列。

**単一 call site（二重注入なし）**: `genBelowNode`（∞・「私を読む私」層）で `loop>=1` の既存 42% 包絡の中、
`isAttuned()` のときだけ `pickTestament` に寄せる（例: 半々）。`maybeForeignDrift`（中盤）と表紙ゲートは
従来 `pick` のまま＝遺言は席を1つだけ持つ。

**棄却**: (b) renderEdge 追記＝plain `hz-line` で drift renderer 非経由・新 CSS 要・二極終端を薄める。
(c) maybeForeignDrift バイアス＝broad-reach 席で希少種を常流に引き込む・二重発火リスク。

**CSS 新規ゼロ**: `mkLine` が `p.dataset.mark` を置き、`.hz-line.scrawl.foreign::after content:"― 別の観測の痕跡 " attr(data-mark) " ―"` が描く。`[data-mark*="遺言"]` の見た目変種は eye-tuning で後回し。

## 2. smoke（build-consistency-smoke.mjs・E22 ブロック後に E23）

```js
// E23: 遺言（限界の声が testament を遺して消える）＝Drift seam の attuned 専用 departed-voice。
has(js, "function pickTestament", "E23 testament picker");
has(js, "const TESTAMENT", "E23 testament bank");
has(js, "遺言", "E23 testament mark (departed-voice)");
assert(/isAttuned\(\)[\s\S]{0,80}pickTestament/.test(js), "E23 testament only on attuned deep run");
const driftFn = (js.match(/function maybeForeignDrift[\s\S]*?\n  \}/) || [""])[0];
assert(driftFn && !driftFn.includes("pickTestament"), "E23 mid-descent seat must not emit testament (single seat)");
assert(!saveBody.includes("testament") && !saveBody.includes("遺言"), "E23 testament stays out of spiral save");
```

## 3. 検証

- `node --check slice.js` ／ `node scripts/hazama-check.mjs` = 2 PASS / 0 FAIL（E23 asserts 込み）。
- ブラウザ（`window.__hz`）: attuned（`attunement=6`）→ `go("below")` 反復で `.scrawl.foreign` の
  `data-mark` に「遺言」／`::after`「― 別の観測の痕跡 ・遺言／深度N ―」。un-attuned（`attunement=0`）は
  「遺言」が決して出ない。決定論（同 loop で同一・ちらつきなし）。深い非 below 降下＋表紙で二重発火なし。
  reduced-motion 静的可読。console error 0。
- human-gate（目/耳・号令でのみ deploy）: 「遺言」が曖昧さを壊さず departed と読めるか・レジスタ・
  頻度（attuned×42%の50% が妥当か＝1行 tunable）・t17「また会える」採否・バンク承認。E23 に音変更なし
  （testament 専用ビートは E21 型の別耳パス）。
