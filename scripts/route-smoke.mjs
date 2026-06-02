#!/usr/bin/env node

// route smoke — 統合の分岐サーフェス（depthMeta.choices）の不変条件を検証。
// 対象: 八観ルート(det_*)の環・連環(円観→体観)・前進不変(寄り道は前方合流/holdは降下)・
// surface ゲートが前進する・depthMeta.choices.next が実在する。INTEGRATION.md §5/§8。

import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function read(rel) {
  return readFileSync(path.join(root, rel), "utf8");
}
function assert(cond, msg) {
  if (!cond) failures.push(msg);
}

const depths = JSON.parse(read("hazama-depths.json"));

// depth rank（前進判定用）。A_start=1, B..Z=2..27, Ω=28, A_reborn=29, HUB=0。
function rankOf(id) {
  if (id === "A_start") return 1;
  if (id === "Ω") return 28;
  if (id === "A_reborn") return 29;
  if (id === "HUB_NIGHT") return 0;
  if (/^[A-Z]$/.test(id)) return id.charCodeAt(0) - 64 + 1; // B=2..Z=27
  return null; // det_*/hold 等は段位を持たない
}

const detIds = Object.keys(depths).filter((id) => id.startsWith("det_"));
const EIGHT = ["体観", "波観", "思観", "財観", "創観", "観察者観", "空観", "円観"];

// 仮想/遅延ターゲット（ノード化しない）。below=手続き的∞(増分5/6で engine 側生成)。
const VIRTUAL = new Set(["below"]);
const isVirtual = (next) => !next || next.startsWith("__") || VIRTUAL.has(next);

// 1) 八観ルートが8つ・各 register=detour・kan が八観・kan が重複なく全8観を覆う
assert(detIds.length === 8, `expected 8 八観ルート, got ${detIds.length}: ${detIds.join(",")}`);
const kans = new Set();
for (const id of detIds) {
  const m = depths[id]?.depthMeta;
  assert(m?.register === "detour", `${id}: detour register expected, got ${m?.register}`);
  assert(EIGHT.includes(m?.kan), `${id}: kan must be one of 八観, got ${m?.kan}`);
  if (m?.kan) kans.add(m.kan);
  assert(Array.isArray(m?.choices) && m.choices.length >= 1, `${id}: detour needs choices`);
}
for (const k of EIGHT) assert(kans.has(k), `八観ルートに ${k} が欠けている`);

// 2) 連環: 円観(det_enkan)が体観(det_taikan)へ結び直す（始まりと終わりが結ばれる）
const enkan = detIds.find((id) => depths[id]?.depthMeta?.kan === "円観");
const taikan = detIds.find((id) => depths[id]?.depthMeta?.kan === "体観");
assert(enkan === "det_enkan", `円観ノードIDは det_enkan を想定: ${enkan}`);
assert(taikan === "det_taikan", `体観ノードIDは det_taikan を想定: ${taikan}`);
if (enkan && taikan) {
  const loops = (depths[enkan].depthMeta.choices || []).some((c) => c.next === taikan);
  assert(loops, "円観(det_enkan)が体観(det_taikan)へ結び直していない＝連環が閉じていない");
}

// 3) 各 det は「別の観へジャンプ(det_*へ)」と「前方合流(降下へ戻る)」の両方を持つ
for (const id of detIds) {
  const choices = depths[id].depthMeta.choices || [];
  const jump = choices.some((c) => typeof c.next === "string" && c.next.startsWith("det_"));
  const rejoinFwd = choices.some((c) => {
    const r = rankOf(c.next);
    return r !== null && r >= 1; // 本筋の降下点へ戻る＝前進
  });
  assert(jump, `${id}: 別の観へのジャンプ選択肢が無い`);
  assert(rejoinFwd, `${id}: 本筋への前方合流（降下へ戻る）が無い`);
}

// 4) surface ゲート（表層読み）は前方へ逸れる（同ノードへ戻さない＝戻りループにしない）
for (const [id, node] of Object.entries(depths)) {
  for (const c of node?.depthMeta?.choices || []) {
    if (c.kind === "surface") {
      assert(c.next !== id, `${id}: surface choice loops back to itself`);
      assert(Boolean(depths[c.next]), `${id}: surface choice next missing: ${c.next}`);
    }
  }
}

// 5) hold（退避＝抗っても沈む）は降下して前方へ（rank が現depthより前＝沈む）
const holdIds = Object.keys(depths).filter((id) => depths[id]?.depthMeta?.register === "hold");
assert(holdIds.length >= 6, `expected >=6 hold nodes, got ${holdIds.length}`);
for (const id of holdIds) {
  const choices = depths[id].depthMeta.choices || [];
  assert(choices.length >= 1, `${id}: hold needs a descend choice`);
  for (const c of choices) {
    assert(Boolean(depths[c.next]), `${id}: hold choice next missing: ${c.next}`);
  }
}

// 6) 全 depthMeta.choices.next が実在（仮想 __*/below と terminal は除外）
for (const [id, node] of Object.entries(depths)) {
  for (const c of node?.depthMeta?.choices || []) {
    if (isVirtual(c.next)) continue;
    if (c.terminal === true) continue;
    assert(Boolean(depths[c.next]), `${id}: depthMeta choice next missing: ${c.next}`);
  }
}

// 7) 八観の環が A_start の surface ゲートから到達できる（表層読み→八観ルートへ前進）
const aSurf = (depths.A_start?.depthMeta?.choices || []).find((c) => c.kind === "surface");
assert(aSurf && aSurf.next.startsWith("det_"), "A_start の surface ゲートが八観ルートへ繋がっていない");
if (aSurf) {
  const seen = new Set();
  const q = [aSurf.next];
  while (q.length) {
    const cur = q.shift();
    if (seen.has(cur)) continue;
    seen.add(cur);
    for (const c of depths[cur]?.depthMeta?.choices || []) {
      if (c.next && c.next.startsWith("det_") && !seen.has(c.next)) q.push(c.next);
    }
  }
  for (const k of EIGHT) {
    const node = detIds.find((id) => depths[id].depthMeta.kan === k);
    assert(seen.has(node), `八観ルート ${k}(${node}) が A_start surface から環で到達できない`);
  }
}

if (failures.length > 0) {
  console.error("route smoke FAIL");
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}

console.log(`route smoke PASS (8観ルート環・連環・前進不変・${holdIds.length} hold)`);

