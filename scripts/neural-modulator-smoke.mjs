import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { createSensoryFrame } from "../tools/sensory/hazama-sensory-frame.mjs";
import { createNeuralModulator, createBaselineModulator, NEURON_COUNT,
  NEUTRAL_MODULATION, isValidModulation, trialAtTick, MODULATION_STEP_MS } from "../tools/sensory/neural-modulator.mjs";

assert.equal(NEURON_COUNT, 64);
assert.equal(MODULATION_STEP_MS, 50);
const outputs = (model, seed) => {
  model.reset(seed);
  return Array.from({ length: 1200 }, (_, tick) => model.step(trialAtTick(tick).signals));
};
for (const factory of [createNeuralModulator, createBaselineModulator]) {
  const model = factory(7);
  const first = outputs(model, 7);
  assert.deepEqual(outputs(model, 7), first, "reset replays identical inputs exactly");
  assert.deepEqual(outputs(factory(7), 7), first, "instances do not share mutable state");
  assert.notDeepEqual(outputs(model, 8), first, "seed changes the trial");
  assert.ok(first.every(isValidModulation), "all outputs are finite and bounded");
  assert.ok(first.every(Object.isFrozen), "snapshots cannot mutate the model");
  const varying = new Set(first.slice(140, 200).map((item) => item.texture.toFixed(5)));
  assert.ok(varying.size > 20, "modulation does not collapse to a constant");
  model.reset(7);
  const reference = factory(7);
  for (let i = 0; i < 200; i += 1) {
    assert.equal(model.step({ reducedMotion: true }), NEUTRAL_MODULATION);
    assert.equal(model.step({ tier: "static" }), NEUTRAL_MODULATION);
  }
  assert.deepEqual(model.step({ depth: 1 }), reference.step({ depth: 1 }), "disabled steps do not advance state");
  for (const input of [null, undefined, {}, { depth: Infinity, dread: NaN, density: -90 },
    { depth: Symbol(), dread: "bad", density: 999 }]) assert.ok(isValidModulation(model.step(input)));
}
assert.equal(trialAtTick(0).label, "静けさ");
assert.equal(trialAtTick(120).label, "一度目の刺激");
assert.equal(trialAtTick(640).label, "回復を待つ");
assert.equal(trialAtTick(1000).label, "もう一度の刺激");
assert.equal(trialAtTick(1200), null, "trial has a finite end");
assert.equal(isValidModulation({ ...NEUTRAL_MODULATION, texture: NaN }), false);
assert.equal(isValidModulation({ ...NEUTRAL_MODULATION, pulse: 1.01 }), false);

// A designed toy response, not proof of biological validity or learned behavior.
for (const seed of [0, 7, 42, 4294967295]) {
  const model = createNeuralModulator(seed);
  const average = (dread, steps) => {
    let sum = 0;
    for (let i = 0; i < steps; i += 1) sum += model.step({ depth: 0.55, dread, density: 0.1 }).activity;
    return sum / steps;
  };
  const quiet = average(0.12, 120);
  const initial = average(0.9, 80);
  average(0.9, 500);
  const sustained = average(0.9, 100);
  const rest = average(0.12, 600);
  const recovered = average(0.9, 80);
  assert.ok(initial > quiet + 0.2, `seed ${seed}: responds to stimulus`);
  assert.ok(sustained < initial - 0.1, `seed ${seed}: sustained stimulus attenuates response`);
  assert.ok(rest < sustained && recovered > sustained + 0.1, `seed ${seed}: rest permits renewed response`);
}

const start = performance.now();
const long = createNeuralModulator(20260914);
for (let tick = 0; tick < 72000; tick += 1) {
  const input = tick % 400 < 200 ? { depth: 1, dread: 1, density: 1 } : {};
  assert.ok(isValidModulation(long.step(input)), "one simulated hour stays bounded");
}
const elapsed = performance.now() - start;
const frame = createSensoryFrame({ seed: 7, depth: 0.55 });
const before = JSON.stringify(frame);
long.step(frame.signals);
assert.equal(JSON.stringify(frame), before, "shared sensory frame remains pure and unchanged");

const source = readFileSync(new URL("../tools/sensory/neural-modulator.mjs", import.meta.url), "utf8");
for (const forbidden of ["Math.random", "fetch(", "localStorage", "sessionStorage", "AudioContext", "setInterval", ".mp3", ".wav", "https://"]) {
  assert.ok(!source.includes(forbidden), `model must not depend on ${forbidden}`);
}
for (const file of ["index.html", "slice.js", "sw.js"]) {
  const runtime = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
  assert.ok(!runtime.includes("neural-modulator") && !runtime.includes("sensory-audio-lab"), "lab must remain unconnected to production");
}
console.log(`neural-modulator smoke PASS (64 cells, deterministic replay/reset, response/recovery, 1h / ${elapsed.toFixed(0)}ms CPU)`);
