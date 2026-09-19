import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { VERSION, MAX_SECONDS, MODES, SCENES, responseScore } from "../tools/sensory/scene-score.mjs";
import { MAX_VOICES, INTEGRATED_LEVELS, ResponseGraph, SceneAudioSession } from "../tools/sensory/scene-response-audio.mjs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8").replace(/\r\n?/g, "\n");
const production = read("slice.js");
const fixture = read("tools/sensory/scene-current-audio.mjs");
const audioStart = "  const Audio = (() => {";
const copy = fixture.slice(fixture.indexOf(audioStart), fixture.lastIndexOf("\n  return Audio;")).trimEnd();
assert.ok(copy.length > 12000, "full E44 reference Audio body, not a placeholder");
assert.equal(createHash("sha256").update(copy).digest("hex"),
  "17fadf2d659f7d204d4e91b1a0b1ec6f8281cdbf93e7a64aad1a8fbb7dbc6726",
  "A and D retain the exact E44 reference; do not silently turn the comparison bed into E45");
const depths = JSON.parse(read("depths-shell.json"));
assert.deepEqual(SCENES.map((s) => s.node), ["A", "B", "C", "B", "C"]);
assert.equal(SCENES[3].depth, SCENES[2].depth, "retreat does not reset descent");
for (const scene of SCENES) {
  assert.deepEqual(scene.lines, scene.indices.map((i) => depths.nodes[scene.node].lines[i].t), "excerpts must match authored prose");
  [scene.depth, scene.dread, scene.density].forEach((v) => assert.ok(v >= 0 && v <= 1));
}
for (const mode of Object.keys(MODES)) {
  for (let index = 0; index < SCENES.length; index++) {
    const score = responseScore(mode, index);
    assert.deepEqual(score, responseScore(mode, index), "same state reproduces the same phrase");
    assert.ok(score.length < MAX_VOICES);
    for (const event of score) {
      assert.ok(["pulse", "body", "fragment", "grain"].includes(event.kind));
      [event.at, event.midi, event.duration, event.gain].forEach((v) => assert.ok(Number.isFinite(v)));
      assert.ok(event.at >= 0 && event.at + event.duration <= 8, "finite response leaves reading space");
      assert.ok(event.gain > 0 && event.gain <= .2);
      assert.ok(event.midi >= 36 && event.midi <= 84);
    }
  }
}
assert.notDeepEqual(responseScore("b", 2), responseScore("c", 2));
assert.notDeepEqual(responseScore("c", 2), responseScore("c", 4), "revisited motif retains a different ending");
assert.equal(createHash("sha256").update(JSON.stringify(["current", "b", "c"].map(mode =>
  [0, 1, 2, 3, 4].map(index => responseScore(mode, index))))).digest("hex"),
  "4f0b58f7ac32a46b872cbec204b3f6954d3680f1f67f1f51957a5a3756fc54bf", "original A/B/C scores remain unchanged");
assert.ok(responseScore("d", 1).some(event => event.kind === "grain"));
assert.ok(responseScore("d", 1).filter(event => event.kind === "pulse").length < responseScore("b", 1).filter(event => event.kind === "pulse").length);
assert.ok(responseScore("d", 4).find(event => event.kind === "body").midi < responseScore("d", 0).find(event => event.kind === "body").midi, "integrated response pitch follows the sinking bed");
Object.values(INTEGRATED_LEVELS).forEach(value => assert.ok(value > 0 && value <= 1));
assert.throws(() => responseScore("neural", 0));
assert.throws(() => responseScore("b", -1));
assert.throws(() => responseScore("b", NaN));

const paths = ["scene-response-lab.html", "scene-response-lab.css", "scene-response-lab.mjs", "scene-score.mjs", "scene-current-audio.mjs", "scene-response-audio.mjs"];
for (const path of paths) {
  const source = read(`tools/sensory/${path}`);
  assert.ok(!/https?:\/\/|fetch\(|localStorage|sessionStorage|indexedDB|sendBeacon|serviceWorker\.register|Tone\./.test(source), `no external runtime, fetch or persistence: ${path}`);
  for (const match of source.matchAll(/(?:from |src=|href=)["']\.\/(scene-[^"']+)["']/g)) {
    assert.ok(match[1].endsWith(`?v=${VERSION}`), `exact lab version in ${path}: ${match[1]}`);
  }
}
assert.ok(!read("index.html").includes("scene-response"));
assert.ok(!read("sw.js").includes("scene-response"));
assert.ok(!production.includes("scene-response"));
assert.ok(read("tools/sensory/sensory-audio-lab.html").includes(`scene-response-lab.html?v=${VERSION}`));

class Param {
  constructor(value = 0) { this.value = value; }
  setValueAtTime(value) { assert.ok(Number.isFinite(value)); this.value = value; }
  setTargetAtTime(value) { this.setValueAtTime(value); }
  exponentialRampToValueAtTime(value) { assert.ok(value > 0); this.setValueAtTime(value); }
  linearRampToValueAtTime(value) { this.setValueAtTime(value); }
  cancelScheduledValues() {}
}
class Node {
  constructor() {
    for (const key of ["gain", "frequency", "detune", "Q", "threshold", "knee", "ratio", "attack", "release", "delayTime"]) this[key] = new Param();
    this.disconnected = false;
  }
  connect(other) { return other; }
  disconnect() { this.disconnected = true; }
  start(at = 0) { this.startAt = at; }
  stop(at = 0) { this.stopAt = at; }
}
const contexts = [];
class Context {
  constructor() {
    this.destination = new Node(); this.currentTime = 0; this.sampleRate = 100;
    this.state = "suspended"; this.events = new Map(); this.closeCalls = 0; contexts.push(this);
  }
  createGain() { return new Node(); }
  createBiquadFilter() { return new Node(); }
  createDynamicsCompressor() { return new Node(); }
  createDelay() { return new Node(); }
  createOscillator() { return new Node(); }
  createConvolver() { return new Node(); }
  createBufferSource() { return new Node(); }
  createBuffer(channels, length) { return { getChannelData: () => new Float32Array(length) }; }
  addEventListener(name, handler) { this.events.set(name, handler); }
  async resume() { this.state = "running"; }
  async close() { this.closeCalls++; this.state = "closed"; this.events.get("statechange")?.(); }
}
const timers = new Map(); let nextTimer = 0;
const doc = { hidden: false };
const host = { AudioContext: Context, matchMedia: () => ({ matches: false }),
  setInterval(fn) { const id = ++nextTimer; timers.set(id, fn); return id; }, clearInterval(id) { timers.delete(id); } };
const session = new SceneAudioSession(host, doc);
assert.equal(contexts.length, 0, "no AudioContext before a user gesture");
assert.equal(session.volume, .35);
for (const mode of Object.keys(MODES)) {
  const before = contexts.length;
  assert.equal(await session.start(mode, 0), true);
  assert.equal(contexts.length, before + 1, "all layers share one native context, including D");
  const ctx = session.context;
  if (mode === "d") assert.ok(session.current && session.graph, "integrated condition has both the real A bed and responses");
  assert.equal(await session.start(mode, 0), false, "cannot double-start");
  session.setVolume(0); session.applyScene(1);
  if (session.current) assert.equal(session.current.volume, 0, "scene state never overrides bed mute");
  if (session.graph) assert.equal(session.graph.output.gain.value, 0, "scene state never overrides response mute");
  session.setVolume(99);
  assert.equal(session.volume, 1);
  session.applyScene(2);
  if (session.current) assert.equal(session.current.volume, mode === "d" ? INTEGRATED_LEVELS.bed : 1, "fixed bed headroom, not increased by pressure");
  if (session.graph) assert.equal(session.graph.output.gain.value, mode === "d" ? INTEGRATED_LEVELS.response : 1, "fixed response headroom");
  session.setVolume(NaN);
  assert.equal(session.volume, 0, "invalid volume fails silent");
  session.setVolume(.35);
  for (let i = 0; i < 60; i++) session.applyScene(i % SCENES.length);
  if (session.graph) {
    assert.ok(session.graph.voices.size <= MAX_VOICES, "rapid taps bound future and fading voices");
    const voice = session.graph.voices.values().next().value;
    const count = session.graph.voices.size;
    voice.carrier.onended();
    assert.equal(session.graph.voices.size, count - 1, "ended voices release graph references");
  }
  assert.ok(timers.size <= 2, "one lifetime timer plus only the production pulse timer");
  const stopping = session.stop();
  assert.equal(await session.start(mode, 0), false, "no new context during close");
  await Promise.all([stopping, session.stop()]);
  assert.equal(ctx.closeCalls, 1, "stop is idempotent, including the production dispose");
  assert.equal(ctx.state, "closed");
  assert.equal(session.context, null);
  assert.equal(timers.size, 0);
}
doc.hidden = true;
assert.equal(await session.start("b", 0), false);
doc.hidden = false;
await session.start("b", 0);
session.context.currentTime = MAX_SECONDS + 1;
for (const timer of [...timers.values()]) timer();
await session.closing;
assert.equal(session.running, false, "two-minute safety stop");
assert.equal(timers.size, 0);

let finishResume;
class DelayedContext extends Context {
  resume() { return new Promise((resolve) => { finishResume = () => { if (this.state !== "closed") this.state = "running"; resolve(); }; }); }
}
for (const mode of Object.keys(MODES)) {
  const race = new SceneAudioSession({ ...host, AudioContext: DelayedContext }, doc);
  const starting = race.start(mode, 0);
  assert.equal(race.pending, true);
  await race.stop(); finishResume();
  assert.equal(await starting, false, "late resume cannot resurrect canceled playback");
  assert.equal(race.running, false);
  assert.equal(race.context, null);
  assert.equal(timers.size, 0);
}
class RejectedContext extends Context { resume() { return Promise.reject(new Error("denied")); } }
const rejected = new SceneAudioSession({ ...host, AudioContext: RejectedContext }, doc);
await assert.rejects(rejected.start("current", 0), /denied/);
assert.equal(rejected.context, null);
assert.equal(timers.size, 0);

for (const tier of ["light", "static"]) {
  const limited = new SceneAudioSession({ ...host, matchMedia: query => ({ matches:
    tier === "light" ? query.includes("pointer: coarse") : query.includes("prefers-reduced-motion") }) }, doc);
  await limited.start("d", 2);
  assert.equal(limited.current.tier, tier, "D respects the existing production tier");
  assert.equal(timers.size, tier === "light" ? 2 : 1, "no automatic pulse under reduced motion");
  assert.ok(limited.graph.voices.size > 0, "explicit-action responses remain available");
  await limited.stop(); assert.equal(timers.size, 0);
}
await session.start("c", 0);
session.context.state = "interrupted"; session.context.events.get("statechange")();
await session.closing;
assert.equal(session.running, false, "interruption closes; never auto-resumes");
assert.equal(timers.size, 0);

const graph = new ResponseGraph(new Context(), 0);
graph.play("c", 2); graph.clear(true);
assert.equal(graph.voices.size, 0);
graph.dispose();
console.log("scene-response smoke PASS (A/B/C preserved, D shared-context bed/texture/headroom, authored excerpts, bounded voices, mute, tiers, lifecycle)");
