import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { VERSION, MAX_SECONDS, MODES, SCENES, responseScore } from "../tools/sensory/scene-score.mjs";
import { MAX_VOICES, ResponseGraph, SceneAudioSession } from "../tools/sensory/scene-response-audio.mjs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8").replace(/\r\n?/g, "\n");
const production = read("slice.js");
const fixture = read("tools/sensory/scene-current-audio.mjs");
const audioStart = "  const Audio = (() => {";
const audioEnd = "\n  // ---------- 手続き的曼荼羅";
const body = production.slice(production.indexOf(audioStart), production.indexOf(audioEnd)).trimEnd();
const copy = fixture.slice(fixture.indexOf(audioStart), fixture.lastIndexOf("\n  return Audio;")).trimEnd();
assert.ok(body.length > 12000, "full production Audio body, not a placeholder");
assert.equal(copy, body, "current comparison must use the exact production Audio source; refresh the tools-only snapshot when production changes");
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
      assert.ok(["pulse", "body", "fragment"].includes(event.kind));
      [event.at, event.midi, event.duration, event.gain].forEach((v) => assert.ok(Number.isFinite(v)));
      assert.ok(event.at >= 0 && event.at + event.duration <= 8, "finite response leaves reading space");
      assert.ok(event.gain > 0 && event.gain <= .2);
      assert.ok(event.midi >= 36 && event.midi <= 84);
    }
  }
}
assert.notDeepEqual(responseScore("b", 2), responseScore("c", 2));
assert.notDeepEqual(responseScore("c", 2), responseScore("c", 4), "revisited motif retains a different ending");
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
  assert.equal(await session.start(mode, 0), true);
  const ctx = session.context;
  assert.equal(await session.start(mode, 0), false, "cannot double-start");
  session.setVolume(0); session.applyScene(1);
  assert.equal(session.current?.volume ?? session.graph.output.gain.value, 0, "scene state never overrides mute");
  session.setVolume(99);
  assert.equal(session.volume, 1);
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
for (const mode of ["current", "b", "c"]) {
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
await session.start("c", 0);
session.context.state = "interrupted"; session.context.events.get("statechange")();
await session.closing;
assert.equal(session.running, false, "interruption closes; never auto-resumes");
assert.equal(timers.size, 0);

const graph = new ResponseGraph(new Context(), 0);
graph.play("c", 2); graph.clear(true);
assert.equal(graph.voices.size, 0);
graph.dispose();
console.log("scene-response smoke PASS (exact current-audio parity, authored excerpts, bounded phrases/voices, mute, cancellation, interruption, teardown)");
