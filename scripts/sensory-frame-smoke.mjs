import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  SENSORY_TIERS,
  clamp01,
  createSensoryFrame,
  seededUnit
} from "../tools/sensory/hazama-sensory-frame.mjs";
import {
  CandidateAudioEngine,
  REVIEW_SCENES,
  setupSensoryAudioLab
} from "../tools/sensory/sensory-audio-lab.mjs";

assert.deepEqual(SENSORY_TIERS, ["full", "balanced", "light", "static"]);
assert.equal(clamp01(-4), 0);
assert.equal(clamp01(4), 1);
assert.equal(clamp01("bad"), 0);

const input = {
  depth: 0.72,
  dread: 0.61,
  density: 0.44,
  axis: "casc",
  phase: "deep",
  seed: 0x1234abcd,
  tier: "balanced"
};
const first = createSensoryFrame(input);
const second = createSensoryFrame(input);
assert.deepEqual(first, second, "same state must produce the same sensory frame");
assert.equal(seededUnit(12, 34), seededUnit(12, 34), "seeded texture must be deterministic");
assert.notEqual(seededUnit(12, 34), seededUnit(13, 34), "different seeds should vary texture");

const shallow = createSensoryFrame({ depth: 0, dread: 0, tier: "full" });
const deep = createSensoryFrame({ depth: 1, dread: 1, tier: "full" });
assert.ok(deep.audio.baseHz < shallow.audio.baseHz, "depth lowers the tonal bed");
assert.ok(deep.audio.cutoffHz < shallow.audio.cutoffHz, "depth darkens the filter");
assert.ok(deep.audio.wetGain > shallow.audio.wetGain, "depth widens the room");
assert.ok(deep.audio.pulseIntervalMs < shallow.audio.pulseIntervalMs, "dread accelerates the pulse");

const full = createSensoryFrame({ tier: "full" });
const light = createSensoryFrame({ tier: "light" });
const reduced = createSensoryFrame({ tier: "full", reducedMotion: true });
assert.ok(full.audio.partialBudget > light.audio.partialBudget, "light tier reduces continuous voices");
assert.ok(full.audio.impulseSeconds > light.audio.impulseSeconds, "light tier shortens the impulse response");
assert.equal(reduced.signals.tier, "static", "reduced motion forces the static tier");
assert.equal(reduced.visual.animate, false, "static tier does not animate");
assert.equal(reduced.audio.partialBudget, 0, "static tier has no continuous drone");

const clamped = createSensoryFrame({ depth: 8, dread: -2, density: Infinity, tier: "unknown" });
assert.equal(clamped.signals.depth, 1);
assert.equal(clamped.signals.dread, 0);
assert.equal(clamped.signals.density, 0);
assert.equal(clamped.signals.tier, "balanced");
assert.equal(clamped.signals.axis, "deep");
assert.ok(Object.isFrozen(clamped) && Object.isFrozen(clamped.audio), "frame is immutable");

assert.equal(typeof CandidateAudioEngine, "function");
assert.equal(typeof setupSensoryAudioLab, "function");
assert.deepEqual(Object.keys(REVIEW_SCENES), ["shallow", "deep", "surfaced", "omega"]);
assert.equal(REVIEW_SCENES.omega.phase, "omega");
assert.ok(Object.isFrozen(REVIEW_SCENES) && Object.isFrozen(REVIEW_SCENES.deep), "review scenes are immutable");
const labSource = readFileSync(new URL("../tools/sensory/sensory-audio-lab.mjs", import.meta.url), "utf8");
const labHtml = readFileSync(new URL("../tools/sensory/sensory-audio-lab.html", import.meta.url), "utf8");
assert.ok(labSource.includes("createDynamicsCompressor"), "candidate has a native Web Audio guardrail");
const labVersion = labHtml.match(/type="module" src="\.\/sensory-audio-lab\.mjs\?v=([a-z0-9-]+)"/)?.[1];
assert.equal(labVersion, "neural-20260914-1", "lab entry bypasses previously cached unversioned modules");
assert.ok(labSource.includes(`from "./neural-modulator.mjs?v=${labVersion}"`), "changed lab modules share their own cache version");
assert.equal((labHtml.match(/data-scene=/g) || []).length, 4, "mobile review exposes four quick scenes");
assert.ok(labHtml.includes("viewport-fit=cover") && labHtml.includes("safe-area-inset-bottom"), "mobile review respects device safe areas");
assert.ok(labSource.includes('matchMedia?.("(pointer: coarse)")'), "coarse pointers start from the light candidate tier");
for (const forbidden of ["Tone.", "fetch(", "localStorage", "sessionStorage", ".mp3", ".wav", ".ogg"]) {
  assert.ok(!labSource.includes(forbidden), `candidate must not add runtime/audio dependency: ${forbidden}`);
}

class FakeElement {
  constructor({ id = "", value = "", textContent = "", dataset = {} } = {}) {
    this.id = id;
    this.value = value;
    this.textContent = textContent;
    this.dataset = dataset;
    this.nextElementSibling = { textContent: "" };
    this.listeners = new Map();
    this.attributes = new Map();
  }
  addEventListener(type, listener) { this.listeners.set(type, listener); }
  setAttribute(name, value) { this.attributes.set(name, value); }
  trigger(type) { return this.listeners.get(type)?.({ currentTarget: this }); }
}

const fakeElements = new Map([
  ["depth", new FakeElement({ id: "depth", value: "0.18" })],
  ["dread", new FakeElement({ id: "dread", value: "0.12" })],
  ["density", new FakeElement({ id: "density", value: "0.10" })],
  ["axis", new FakeElement({ id: "axis", value: "deep" })],
  ["phase", new FakeElement({ id: "phase", value: "surface" })],
  ["tier", new FakeElement({ id: "tier", value: "balanced" })],
  ["trace", new FakeElement({ id: "trace" })],
  ["status", new FakeElement({ id: "status", textContent: "停止中" })],
  ["scene-summary", new FakeElement({ id: "scene-summary" })],
  ["audio-toggle", new FakeElement({ id: "audio-toggle" })]
]);
for (const id of ["seed", "volume", "trial-replay", "modulation-reset", "trial-status", "trial-progress", "modulation-summary"]) {
  fakeElements.set(id, new FakeElement({ id, value: id === "seed" ? "7" : id === "volume" ? "0.35" : "" }));
}
const fakeSceneButtons = Object.keys(REVIEW_SCENES).map((scene) => new FakeElement({ dataset: { scene } }));
const fakeVerbButtons = [new FakeElement({ textContent: "降下する", dataset: { verb: "descend" } })];
const fakeModeButtons = ["baseline", "neural", "off"].map((mode) => new FakeElement({ dataset: { mode } }));
const documentListeners = new Map();
const fakeDocument = {
  hidden: false,
  getElementById: (id) => fakeElements.get(id),
  querySelectorAll: (selector) => selector === "[data-scene]" ? fakeSceneButtons : selector === "[data-mode]" ? fakeModeButtons : fakeVerbButtons,
  addEventListener(type, callback) { documentListeners.set(type, callback); }
};
const fakeMobileWindow = {
  matchMedia: (query) => ({ matches: query === "(pointer: coarse)" }),
  addEventListener() {},
  setTimeout: (callback) => { callback(); return 1; }
};
const uiEngine = setupSensoryAudioLab(fakeDocument, fakeMobileWindow);
assert.equal(uiEngine.context, null, "no context is created on lab load");
assert.equal(fakeVerbButtons[0].disabled, true, "verbs cannot start audio before the start button");
fakeModeButtons[1].trigger("click");
assert.equal(uiEngine.modulationMode, "neural");
assert.equal(uiEngine.context, null, "mode selection is silent");
assert.equal(fakeElements.get("tier").value, "light", "coarse-pointer lab starts at the light tier");
assert.equal(fakeSceneButtons[0].attributes.get("aria-pressed"), "true", "shallow scene starts selected");
fakeSceneButtons[1].trigger("click");
assert.equal(fakeElements.get("depth").value, REVIEW_SCENES.deep.depth, "scene button applies its depth");
assert.equal(fakeElements.get("phase").value, "bottom", "scene button applies its phase");
assert.equal(fakeSceneButtons[1].attributes.get("aria-pressed"), "true", "scene selection updates aria state");
assert.match(fakeElements.get("scene-summary").textContent, /^深部/);

class FakeParam {
  constructor(value = 0) { this.value = value; }
  setTargetAtTime(value) { this.value = value; }
  setValueAtTime(value) { this.value = value; }
  exponentialRampToValueAtTime(value) { this.value = value; }
}
class FakeNode {
  connect(target) { return target; }
  disconnect() {}
}
class FakeGain extends FakeNode { constructor() { super(); this.gain = new FakeParam(1); } }
class FakeOscillator extends FakeNode {
  constructor() { super(); this.frequency = new FakeParam(); this.detune = new FakeParam(); this.type = "sine"; }
  start() {}
  stop() {}
}
class FakeFilter extends FakeNode {
  constructor() { super(); this.frequency = new FakeParam(); this.Q = new FakeParam(); this.type = "lowpass"; }
}
class FakeCompressor extends FakeNode {
  constructor() {
    super();
    this.threshold = new FakeParam(); this.knee = new FakeParam(); this.ratio = new FakeParam();
    this.attack = new FakeParam(); this.release = new FakeParam();
  }
}
class FakeConvolver extends FakeNode { constructor() { super(); this.buffer = null; } }
class FakePanner extends FakeNode { constructor() { super(); this.pan = new FakeParam(); } }
class FakeBufferSource extends FakeNode { start() {} stop() {} }
class FakeAudioContext {
  constructor() {
    this.sampleRate = 800;
    this.currentTime = 0;
    this.state = "suspended";
    this.destination = new FakeNode();
  }
  createGain() { return new FakeGain(); }
  createDynamicsCompressor() { return new FakeCompressor(); }
  createBiquadFilter() { return new FakeFilter(); }
  createConvolver() { return new FakeConvolver(); }
  createStereoPanner() { return new FakePanner(); }
  createOscillator() { return new FakeOscillator(); }
  createBufferSource() { return new FakeBufferSource(); }
  createBuffer(channels, length) {
    const data = Array.from({ length: channels }, () => new Float32Array(length));
    return { numberOfChannels: channels, getChannelData: (channel) => data[channel] };
  }
  async resume() { this.state = "running"; }
  async suspend() { this.state = "suspended"; }
  async close() { this.state = "closed"; }
}

const timers = new Map();
let timerId = 0;
const fakeWindow = { AudioContext: FakeAudioContext, setTimeout: (callback) => { callback(); return 1; },
  setInterval: (callback) => { timers.set(++timerId, callback); return timerId; },
  clearInterval: (id) => timers.delete(id) };
const engine = new CandidateAudioEngine(fakeWindow);
await engine.start(createSensoryFrame({ tier: "full", seed: 7 }));
assert.equal(engine.compressor.threshold.value, -18, "guardrail threshold is configured");
assert.equal(engine.partials.length, 6, "full tier creates the full continuous voice budget");
assert.equal(timers.size, 1, "one modulation loop only");
engine.setVolume(0);
engine.setModulationMode("neural");
engine.replayTrial();
for (let i = 0; i < 300; i += 1) engine.advanceModulation();
assert.equal(engine.effectiveFrame.signals.depth, 0.55, "trace reflects the trial inputs, not the idle scene controls");
assert.equal(engine.frame.signals.depth, 0, "trial never overwrites the selected base scene");
assert.equal(engine.listeningGain.gain.value, 0, "autonomous stimulus does not override mute");
assert.ok(Math.abs(engine.panner.pan.value) <= 0.18);
assert.ok(engine.filter.frequency.value >= 280 && engine.filter.frequency.value <= 2540);
engine.setVolume(99);
assert.equal(engine.listeningGain.gain.value, 1, "user gain is capped");
engine.setVolume(NaN);
assert.equal(engine.listeningGain.gain.value, 0, "invalid user gain fails silent");
engine.resetModulation();
assert.equal(timers.size, 1, "repeated resets do not accumulate timers");
engine.configure(createSensoryFrame({ tier: "light", seed: 7 }));
assert.equal(engine.partials.length, 3, "light tier tears down excess continuous voices");
await engine.suspendForVisibility();
assert.equal(engine.context.state, "suspended", "hidden page suspends audio");
assert.equal(timers.size, 0, "hidden page stops the simulation timer");
const frozenTick = engine.modulation.tick;
engine.advanceModulation();
assert.equal(engine.modulation.tick, frozenTick, "hidden page does not advance models");
await engine.playVerb("recognition", createSensoryFrame({ tier: "light", seed: 7 }));
assert.equal(engine.context.state, "running", "a later user gesture can resume audio before a verb");
assert.equal(timers.size, 1);
for (let i = 0; i < 20; i += 1) await engine.playVerb("recognition", createSensoryFrame({ tier: "light", seed: 7 }));
assert.equal(engine.transients.size, 8, "rapid verbs have a bounded voice budget");
const transient = [...engine.transients][0];
transient.source.onended();
assert.equal(engine.transients.size, 7, "ended transients release graph references");
engine.configure(reduced);
assert.equal(timers.size, 0, "static tier disables simulation");
assert.equal(engine.partials.length, 0);
await Promise.all([engine.stop(), engine.stop()]);
assert.equal(engine.context, null, "stop closes and releases the candidate context");
assert.equal(engine.transients.size, 0);
assert.equal(timers.size, 0);

await engine.start(createSensoryFrame({ tier: "light", seed: 7 }));
engine.replayTrial();
for (let i = 0; i < 1201; i += 1) engine.advanceModulation();
await engine.stop();
assert.equal(engine.running, false, "60-second trial auto-stops");
assert.equal(engine.trialCompleted, true);
assert.equal(timers.size, 0);

await engine.start(createSensoryFrame({ tier: "light", seed: 7 }));
engine.models.neural = { step: () => ({ texture: NaN }), reset() {} };
engine.advanceModulation();
assert.ok(engine.modulationFault, "invalid model output triggers neutral fallback");
assert.equal(timers.size, 0);
assert.equal(engine.modulation.texture, 0);
await engine.stop();

// A delayed start cannot resurrect sound/simulation after hide or stop.
let finishResume;
class DelayedContext extends FakeAudioContext {
  resume() { return new Promise((resolve) => { finishResume = () => { this.state = "running"; resolve(); }; }); }
}
const race = new CandidateAudioEngine({ ...fakeWindow, AudioContext: DelayedContext });
const starting = race.start(light);
await race.suspendForVisibility();
finishResume();
await starting;
assert.equal(race.context.state, "suspended", "late resume is suspended again after hide");
assert.equal(timers.size, 0);
await race.stop();

const slow = new CandidateAudioEngine({ ...fakeWindow, performance: { now: () => (timerId += 20) } });
await slow.start(light);
for (let i = 0; i < 3; i += 1) slow.advanceModulation();
assert.ok(slow.modulationFault, "sustained slow steps disable modulation");
assert.equal(timers.size, 0);
await slow.stop();

const immediate = new CandidateAudioEngine({ ...fakeWindow,
  setTimeout() { throw new Error("pagehide must not wait for a timer in an unloading document"); } });
await immediate.start(light);
await immediate.playVerb("breath", light);
await immediate.stop(true);
assert.equal(immediate.context, null, "pagehide closes without an unload-time delay");
assert.equal(immediate.transients.size, 0);
assert.equal(timers.size, 0);

Object.assign(fakeMobileWindow, fakeWindow);
await fakeElements.get("audio-toggle").trigger("click");
assert.equal(uiEngine.running, true);
fakeElements.get("trial-replay").trigger("click");
assert.equal(uiEngine.replayTick, 0);
assert.equal(fakeVerbButtons[0].disabled, true, "verbs cannot contaminate the scripted comparison");
fakeDocument.hidden = true;
await documentListeners.get("visibilitychange")();
assert.equal(timers.size, 0);
fakeDocument.hidden = false;
await documentListeners.get("visibilitychange")();
assert.equal(uiEngine.suspendedByVisibility, true, "visibility restoration does not auto-resume");
assert.equal(fakeElements.get("audio-toggle").textContent, "試聴を再開する");
await uiEngine.stop();

console.log("sensory-frame smoke PASS (lab A/B, volume, bounded voices/timers, lifecycle races, replay, fail-safe)");
