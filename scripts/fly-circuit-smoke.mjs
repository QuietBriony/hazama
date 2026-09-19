import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import vm from "node:vm";
import { performance } from "node:perf_hooks";
import { createHarness } from "./audio-governor-smoke.mjs";

const source = readFileSync(new URL("../slice.js", import.meta.url), "utf8");
const projection = JSON.parse(readFileSync(new URL("../tools/sensory/fly-circuit-projection.json", import.meta.url), "utf8"));
const start = source.indexOf("    const FLY_ROWS = ["), end = source.indexOf("    // End of pure circuit:", start);
assert.ok(start >= 0 && end > start);
const pure = source.slice(start, end), sandbox = {};
vm.runInNewContext(pure + ";this.create = createFlyCircuit;this.rows = FLY_ROWS;", sandbox);
assert.deepEqual(JSON.parse(JSON.stringify(sandbox.rows)), projection.rows);
assert.equal(projection.sourceSha256, "8f76d94034dcf802453e3a0a8ed5342d122e57d37e2bb5ea28da66de0856f5d6");
assert.equal(projection.counts.reduce((sum, n) => sum + n, 0), 1045);
assert.ok(projection.rows.every(row => row.length === 10 && row.reduce((sum, n) => sum + Math.abs(n), 0) <= 1.00001));
assert.ok(!/\b(fetch|document|window|setInterval|setTimeout|localStorage|sessionStorage)\b/.test(pure), "pure model owns no host or persisted state");

const input = { depth: .7, dread: .6, density: .4 };
function trace(model, ticks = 600) {
  const values = [];
  for (let tick = 0; tick < ticks; tick++) {
    if (tick === 80 || tick === 120 || tick === 400) model.excite("resist");
    values.push(model.step(input));
  }
  return values;
}
const a = sandbox.create(20260920), b = sandbox.create(20260920);
const expected = trace(a);
assert.equal(JSON.stringify(expected), JSON.stringify(trace(b)), "same input and seed reproduce the circuit");
a.reset(20260920);
assert.equal(JSON.stringify(expected), JSON.stringify(trace(a)), "reset discards all transient memory");
assert.notEqual(JSON.stringify(expected), JSON.stringify(trace(sandbox.create(23))), "seed supplies independent authored stimulus");
const disconnected = trace(sandbox.create(20260920, false));
const ablation = Math.max(...expected.map((value, i) => Math.abs(value.activity - disconnected[i].activity)));
assert.ok(ablation > .005, "removing measured connections changes readout, not just a label");
const unstimulated = sandbox.create(20260920);
const quiet = Array.from({ length: 600 }, () => unstimulated.step(input));
const stimulusDifference = Math.max(...expected.map((value, i) => Math.abs(value.spacing - quiet[i].spacing)));
assert.ok(stimulusDifference > .005, "cue injection reaches the measured circuit readout");
assert.ok(expected[599].adaptation > expected[59].adaptation, "internal fatigue develops over foreground steps");
const long = sandbox.create(17), beginning = performance.now();
for (let tick = 0; tick < 36000; tick++) {
  if (tick % 130 === 0) long.excite(["descend", "recognition", "return", "resist"][tick % 4]);
  const frame = long.step({ depth: tick % 20 / 19, dread: tick % 31 / 30, density: tick % 7 / 6 });
  assert.ok(Object.isFrozen(frame));
  for (const key of ["activity", "adaptation", "wear"]) assert.ok(Number.isFinite(frame[key]) && frame[key] >= 0 && frame[key] <= 1);
  for (const key of ["texture", "spacing"]) assert.ok(Number.isFinite(frame[key]) && Math.abs(frame[key]) <= 1);
  assert.ok(Number.isInteger(frame.tick) && frame.tick >= 0);
}
for (const bad of [null, {}, { depth: NaN, dread: Infinity, density: "bad" }]) {
  assert.ok(Object.values(long.step(bad)).every(Number.isFinite));
}
const cpuMs = performance.now() - beginning;

for (const options of [{}, { coarse: true }, { reduced: true }]) {
  const h = createHarness(options);
  const enabled = !options.reduced;
  assert.equal(h.audio.circuitEnabled, enabled);
  h.audio.setCircuitEnabled(true);
  assert.equal(h.contexts.length, 0, "cover option must not create or unlock audio");
  await h.audio.start();
  const ctx = h.contexts[0];
  const pump = () => { ctx.currentTime += .1; for (const timer of [...h.timers.values()]) timer.callback(); };
  for (let i = 0; i < 80; i++) pump();
  assert.equal(h.timers.size, enabled ? 1 : 0, "one clock shared with heartbeat, no clock in reduced motion");
  assert.equal(h.audio.circuitState.tick, enabled ? 80 : 0);
  h.audio.respond("recognition");
  const count = h.audio.transientCount;
  assert.ok(count > 0, "authored cue remains available even without circuit");
  h.audio.setVolume(0);
  const muted = JSON.stringify(h.audio.circuitState);
  for (let i = 0; i < 40; i++) pump();
  assert.equal(JSON.stringify(h.audio.circuitState), muted, "zero volume freezes simulation");
  assert.equal(h.audio.transientCount, 0, "mute cancels pending cues");
  assert.equal(ctx.compressors[0].connections[0].gain.value, 0);
  h.audio.setVolume(.35);
  h.audio.toggle();
  assert.equal(h.timers.size, 0);
  const paused = JSON.stringify(h.audio.circuitState);
  for (let i = 0; i < 40; i++) pump();
  assert.equal(JSON.stringify(h.audio.circuitState), paused);
  await h.audio.toggle();
  pump();
  assert.equal(h.audio.circuitState.tick, enabled ? 81 : 0, "resume takes one step, never catches up missed wall time");
  h.audio.setCircuitEnabled(false);
  assert.equal(h.audio.circuitState.tick, 0);
  for (let i = 0; i < 20; i++) pump();
  assert.equal(h.audio.circuitState.tick, 0, "off is a real bypass");
  assert.equal(h.audio.respond("return"), true, "fixed E45 response is still playable");
  h.audio.setCircuitEnabled(true);
  pump();
  h.document.hidden = true; h.audio.suspendForVisibility();
  const hidden = JSON.stringify(h.audio.circuitState);
  for (let i = 0; i < 30; i++) pump();
  assert.equal(JSON.stringify(h.audio.circuitState), hidden);
  assert.equal(h.timers.size, 0);
  h.document.hidden = false;
  assert.equal(h.audio.playing, false, "visibility alone never resumes");
  await h.audio.toggle();
  ctx.state = "interrupted"; ctx.onstatechange();
  assert.equal(h.timers.size, 0);
  h.audio.dispose();
  assert.equal(h.audio.circuitState.tick, 0);
  assert.equal(h.audio.transientCount, 0);
  assert.equal(ctx.state, "closed");
}

const story = JSON.parse(readFileSync(new URL("../depths-shell.json", import.meta.url), "utf8"));
const storyText = JSON.stringify(story);
assert.ok(storyText.includes("体観、波観、思観、財観、創観、観察者観、空観、円観"));
assert.ok(!storyText.includes("観察観、空観、Void観"), "game names agree with A and the mandala edition, not the market edition");
assert.ok(!JSON.stringify(story.nodes.S_reso).includes("Void観"), "S uses the same displayed name for 空 as the entrance");
const credits = readFileSync(new URL("../docs/FLY-CIRCUIT-CREDITS.md", import.meta.url), "utf8");
assert.ok(credits.includes(projection.sourceSha256) && credits.includes("CC BY 4.0") && credits.includes("not equivalent"));
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
assert.ok(html.includes('id="settings-circuit"') && html.includes("docs/FLY-CIRCUIT-CREDITS.md"));
const fingerprint = createHash("sha256").update(JSON.stringify(projection)).digest("hex");
assert.equal(fingerprint, "0618734f45fc7564bdbe88856d7716292351bed24ae86fc6186dceeb5625f669", "reviewed projection provenance and coefficients stay pinned");
console.log(`fly-circuit smoke PASS (10 groups, provenance ${fingerprint.slice(0, 12)}, 1h/${Math.round(cpuMs)}ms CPU, ablation ${ablation.toFixed(5)}, cue delta ${stimulusDifference.toFixed(5)}, bounds/bypass/mute/lifecycle/eight-view names)`);
