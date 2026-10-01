// E55: runtime copy, revisits and scenery. No new routes, state or dependencies.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const read = file => readFileSync(new URL("../" + file, import.meta.url), "utf8");
const data = JSON.parse(read("depths-shell.json"));
const js = read("slice.js"), css = read("slice.css"), html = read("index.html");
const variants = js.match(/  const NODE_VARIANTS = (\{[\s\S]*?\n  \});/)?.[1];
const cycle = js.match(/  function applyCycle\(id, base\) \{[\s\S]*?\n  \}/)?.[0];
const hash = js.match(/  function hashStr\(s\) \{[^\n]+\}/)?.[0];
const random = js.match(/  function mulberry32\(a\) \{[\s\S]*?\n  \}/)?.[0];
assert.ok(variants && cycle, "exercise actual production copy, not a second implementation");
const context = vm.createContext({
  state: { cycle: 0, visits: {} },
  pickR: (rng, values) => values[Math.floor(rng() * values.length)],
  scrawlTier: () => 0, SCRAWL_TIERS: [["（これ、まえも読んだ）"]]
});
vm.runInContext(`${hash}; ${random}; const NODE_VARIANTS = ${variants}; ${cycle}; globalThis.applyCycle = applyCycle;`, context);
const original = JSON.stringify(data);
for (const loop of [0, 1, 2, 7]) {
  for (const visits of [1, 2, 9]) {
    context.state = { cycle: loop, visits: { A: visits } };
    const lines = context.applyCycle("A", data.nodes.A).lines;
    assert.ok(!lines.some(line => /^(体観|波観|思観|財観|創観|観察者観|空観|円観)——/.test(line.t)),
      "entry never dumps the eight names, even with a saved loop");
    for (const id of ["Omega", "reborn"]) {
      context.state.visits[id] = visits;
      const node = context.applyCycle(id, data.nodes[id]);
      assert.ok(!JSON.stringify(node).match(/スマホ|PC|スクリーン|OS|物語／AI／読者/),
        `${id}: revisits must not bring device-name explanations back`);
      assert.deepEqual(node.choices, data.nodes[id].choices, "copy variations do not alter choices");
    }
  }
}
for (const [previous, expected] of [["B_soma", "足裏が冷える"], ["B", "月の割れる場所"]]) {
  context.state = { cycle: 1, visits: { A: 1, [previous]: 1 } };
  assert.ok(context.applyCycle("A", data.nodes.A).lines[0].t.includes(expected),
    "the entry remembers the path actually visited");
}
assert.equal(JSON.stringify(data), original, "copy rendering must not mutate source nodes");
const backdrop = js.match(/  function backdropFor\(rank\) \{[^\n]+\}/)?.[0];
assert.ok(backdrop);
const getBackdrop = vm.runInNewContext(`(${backdrop})`);
for (const [rank, expected] of [[0, "entry"], [1, "entry"], [2, "drift"], [9, "drift"], [10, "shell"], [17, "shell"], [18, "outer"], [26, "outer"], [27, "threshold"], [28, "threshold"]]) {
  assert.equal(getBackdrop(rank), expected);
}
assert.ok(js.includes("document.body.dataset.backdrop = backdropFor(state.rank)"));
assert.ok(!css.includes(".hz-choice.descend .lead::after"), "no red line beneath wrapped choice text");
assert.ok(!/text-decoration:\s*line-through/.test(css), "available choices are never crossed out");
const scrawl = css.match(/\.hz-line\.scrawl\.cross\s*\{([^}]+)\}/)?.[1];
assert.ok(scrawl?.includes("border-left") && scrawl.includes("background: none"), "denial trace stays in the margin");
assert.ok(html.includes('id="settings-refresh"') && html.includes('id="build-version"'));
assert.ok(!/\b(?:three|cdn\.jsdelivr|unpkg)\b/i.test(html), "main runtime stays dependency-free");
console.log("immersion-copy smoke PASS (no opening glossary, device-free ending, path memory, five backdrops, readable marks)");
