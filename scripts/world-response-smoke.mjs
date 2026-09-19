import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { createHarness } from "./audio-governor-smoke.mjs";

const source = readFileSync(new URL("../slice.js", import.meta.url), "utf8");
const cues = ["enter", "descend", "recognition", "return", "resist"];
for (const [options, limit] of [[{}, 24], [{ coarse: true }, 12], [{ reduced: true }, 8]]) {
  const h = createHarness(options);
  assert.equal(h.audio.respond("enter"), false, "no context without a gesture");
  assert.equal(h.contexts.length, 0);
  assert.equal(await h.audio.start(), true);
  const ctx = h.contexts[0];
  const output = ctx.compressors[0].connections[0];
  assert.equal(ctx.compressors.length, 1, "one master guardrail for the complete mix");
  for (let i = 0; i < 300; i++) {
    ctx.currentTime += .09;
    h.audio.update((i % 11) / 10, (i % 7) / 6, (i % 5) / 4);
    assert.equal(h.audio.respond(cues[i % cues.length]), true);
    if (i % 9 === 0) h.audio.glitchHit(.8);
    if (i % 13 === 0) h.audio.pulseOnce(.5);
    assert.ok(h.audio.transientCount <= limit, "scheduled + fading + legacy sounds stay within tier budget");
    assert.equal(h.contexts.length, 1);
  }
  for (const node of ctx.bufferSources) {
    for (const sample of node.buffer.getChannelData(0)) assert.ok(Number.isFinite(sample) && Math.abs(sample) <= 1);
  }
  h.audio.setVolume(0);
  h.audio.update(1, 1, 1);
  assert.equal(output.gain.value, 0, "no response can bypass the common final mute");
  const mutedCount = h.audio.transientCount;
  assert.equal(h.audio.respond("return"), false, "muted reading does not schedule new responses");
  assert.equal(h.audio.transientCount, mutedCount);
  h.audio.setVolume(.35);
  assert.equal(h.audio.respond("unknown"), false);
  h.audio.toggle();
  assert.equal(h.audio.transientCount, 0, "pause cancels future notes, not just their clock");
  assert.equal(h.timers.size, 0);
  assert.equal(h.audio.respond("recognition"), false);
  await h.audio.toggle();
  assert.equal(h.audio.transientCount, 0, "manual resume does not replay a stale phrase");
  assert.equal(output.gain.value, .35);
  h.audio.respond("recognition");
  for (const node of [...ctx.oscillators, ...ctx.bufferSources]) node.onended?.();
  assert.equal(h.audio.transientCount, 0, "ended callbacks release voices and connections");
  h.audio.respond("return");
  h.document.hidden = true;
  h.audio.suspendForVisibility();
  assert.equal(h.audio.transientCount, 0);
  assert.equal(h.timers.size, 0);
  h.document.hidden = false;
  assert.equal(h.audio.playing, false, "visible state alone does not resume sound");
  await h.audio.toggle();
  h.audio.respond("resist");
  ctx.state = "interrupted"; ctx.onstatechange();
  assert.equal(h.audio.playing, false);
  assert.equal(h.audio.suspendedByVisibility, true);
  assert.equal(h.audio.transientCount, 0);
  assert.equal(h.timers.size, 0);
  h.audio.dispose();
  assert.equal(ctx.state, "closed");
  assert.equal(output.connections.length, 0);
}

for (const action of ["pause", "hidden", "dispose"]) {
  const h = createHarness({ resume: "deferred" });
  const ready = h.audio.start();
  if (action === "pause") h.audio.toggle();
  if (action === "hidden") { h.document.hidden = true; h.audio.suspendForVisibility(); }
  if (action === "dispose") h.audio.dispose();
  h.pendingResumes.shift()();
  assert.equal(await ready, false, "late resume must not accept a cancelled start: " + action);
  assert.equal(h.audio.playing, false);
  assert.equal(h.audio.transientCount, 0);
  assert.equal(h.timers.size, 0);
  if (action !== "dispose") assert.equal(h.contexts[0].state, "suspended");
  h.audio.dispose();
}
const rejected = createHarness({ resume: "reject" });
let labels = 0; rejected.audio.onChange = () => labels++;
assert.equal(await rejected.audio.start(), false);
assert.equal(rejected.audio.playing, false);
assert.equal(rejected.timers.size, 0);
assert.equal(labels, 1, "resume rejection refreshes the visible audio control");
rejected.audio.dispose();

// Execute the real routing functions, mocking only collaborators, not the cue decision.
const choose = source.match(/  function choose\(c\) \{[\s\S]*?\n  \}/)?.[0];
const resist = source.match(/  function resolveResist\(c\) \{[\s\S]*?\n  \}/)?.[0];
assert.ok(choose && resist);
const events = [];
const state = { id: "B", attunement: 0, visits: { B: 1 }, sink: 0, dread: 0, returnPaths: 4,
  observer: 1, resisted: 0, refused: 0 };
const sandbox = {
  state, onboardPending: false, JUNCTIONS: new Set(["A"]), ATTUNE: { omegaThreshold: 6 },
  RESIST_STRAIN: 5, DEEP_LOCK: 10,
  gainRecognition(c) { state.attunement += c.gain || 0; },
  isAttuned: () => state.attunement >= 6,
  Route: { resolve: (_id, c) => c.to },
  Audio: { respond: cue => events.push(["sound", cue, state.id]) },
  renderNode(id) { state.id = id; state.visits[id] = (state.visits[id] || 0) + 1; events.push(["node", id]); },
  renderEdge() { events.push(["edge"]); }
};
vm.createContext(sandbox); vm.runInContext(choose + "\n" + resist, sandbox);
function run(c) { events.length = 0; sandbox.choose(c); return events.at(-1); }
assert.deepEqual(run({ kind: "descend", gain: 1, to: "C" }), ["sound", "recognition", "C"]);
assert.deepEqual(events[0], ["node", "C"], "response follows the new atmosphere, not the old node");
assert.deepEqual(run({ kind: "descend", gain: 1, to: "D" }), ["sound", "descend", "D"], "not every attunement point plays a motif");
assert.deepEqual(run({ kind: "descend", to: "C" }), ["sound", "return", "C"]);
state.attunement = 5;
assert.deepEqual(run({ kind: "descend", gain: 1, to: "E" }), ["sound", "recognition", "E"]);
for (const observer of [1, 6, 12]) {
  state.observer = observer; state.returnPaths = 4;
  assert.equal(run({ kind: "retreat", to: "hold", back: "back", failTo: "fail" })[1], "resist");
}
assert.deepEqual(run({ kind: "descend", to: "__edge" }), ["edge"], "edge breath has no overlapping choice motif");
assert.ok(source.includes('Audio.respond("recognition");'), "echo recognition is wired");
assert.ok(!/import\s|fetch\(|localStorage|sessionStorage|\.mp3|\.wav/.test(
  source.slice(source.indexOf("  const Audio = (() => {"), source.indexOf("\n  // ---------- 手続き的曼荼羅"))),
  "production Audio remains built-in, without assets, dependencies or persistence");
console.log("world-response smoke PASS (cue routing, shared mix, bounded voices, mute, tiers, cancellation, interruption, resume races)");
