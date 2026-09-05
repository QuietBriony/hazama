import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const slice = readFileSync(new URL("../slice.js", import.meta.url), "utf8");
const audioStart = slice.indexOf("  const Audio = (() => {");
const audioEnd = slice.indexOf("\n  // ---------- 手続き的曼荼羅", audioStart);
assert.ok(audioStart >= 0 && audioEnd > audioStart, "production Audio IIFE must be extractable");
const audioSource = slice.slice(audioStart, audioEnd).replace(/^  /gm, "");

class FakeParam {
  constructor(value = 0) { this.value = value; }
  setTargetAtTime(value) { this.value = value; }
  setValueAtTime(value) { this.value = value; }
  exponentialRampToValueAtTime(value) { this.value = value; }
  cancelScheduledValues() {}
}

class FakeNode {
  constructor(kind = "node") { this.kind = kind; this.connections = []; }
  connect(target) { this.connections.push(target); return target; }
  disconnect() { this.connections = []; }
}

class FakeGain extends FakeNode {
  constructor() { super("gain"); this.gain = new FakeParam(1); }
}

class FakeOscillator extends FakeNode {
  constructor() {
    super("oscillator");
    this.frequency = new FakeParam();
    this.detune = new FakeParam();
    this.type = "sine";
    this.started = false;
    this.stopped = false;
  }
  start() { this.started = true; }
  stop() { this.stopped = true; }
}

class FakeFilter extends FakeNode {
  constructor() {
    super("filter");
    this.frequency = new FakeParam();
    this.Q = new FakeParam();
    this.type = "lowpass";
  }
}

class FakeCompressor extends FakeNode {
  constructor() {
    super("compressor");
    this.threshold = new FakeParam();
    this.knee = new FakeParam();
    this.ratio = new FakeParam();
    this.attack = new FakeParam();
    this.release = new FakeParam();
  }
}

class FakeConvolver extends FakeNode {
  constructor() { super("convolver"); this.buffer = null; }
}

class FakeBufferSource extends FakeNode {
  constructor() { super("buffer-source"); this.buffer = null; }
  start() {}
  stop() {}
}

function createHarness({ coarse = false, reduced = false } = {}) {
  const contexts = [];
  const timers = new Map();
  let nextTimer = 1;
  const document = { hidden: false };

  class FakeAudioContext {
    constructor() {
      this.sampleRate = 100;
      this.currentTime = 0;
      this.state = "suspended";
      this.destination = new FakeNode("destination");
      this.oscillators = [];
      this.compressors = [];
      this.convolvers = [];
      contexts.push(this);
    }
    createGain() { return new FakeGain(); }
    createDynamicsCompressor() {
      const node = new FakeCompressor();
      this.compressors.push(node);
      return node;
    }
    createBiquadFilter() { return new FakeFilter(); }
    createConvolver() {
      const node = new FakeConvolver();
      this.convolvers.push(node);
      return node;
    }
    createOscillator() {
      const node = new FakeOscillator();
      this.oscillators.push(node);
      return node;
    }
    createBufferSource() { return new FakeBufferSource(); }
    createBuffer(channels, length) {
      const data = Array.from({ length: channels }, () => new Float32Array(length));
      return { numberOfChannels: channels, length, getChannelData: (channel) => data[channel] };
    }
    resume() { this.state = "running"; return Promise.resolve(); }
    suspend() { this.state = "suspended"; return Promise.resolve(); }
    close() { this.state = "closed"; return Promise.resolve(); }
  }

  const sandbox = {
    REDUCED: reduced,
    window: {
      AudioContext: FakeAudioContext,
      matchMedia: () => ({ matches: coarse })
    },
    document,
    setInterval: (callback, delay) => {
      const id = nextTimer++;
      timers.set(id, { callback, delay });
      return id;
    },
    clearInterval: (id) => { timers.delete(id); },
    clamp01: (value) => Math.max(0, Math.min(1, Number(value) || 0)),
    console
  };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(audioSource + "\nglobalThis.__audio = Audio;", sandbox);
  return { audio: sandbox.__audio, contexts, timers, document };
}

const full = createHarness();
full.audio.start();
assert.equal(full.audio.tier, "full");
assert.equal(full.contexts.length, 1, "start creates one context");
assert.equal(full.contexts[0].oscillators.length, 7, "full creates six drones and one LFO");
assert.equal(full.contexts[0].convolvers[0].buffer.length, 280, "full uses the 2.8 second IR budget");
assert.equal(full.contexts[0].compressors.length, 1, "full creates one master guardrail");
assert.equal(full.contexts[0].compressors[0].threshold.value, -18);
assert.equal(full.timers.size, 1, "full schedules one pulse timer");
full.audio.start();
assert.equal(full.contexts.length, 1, "repeated start does not create a second context");

// E42: a final volume stage preserves compression and applies to every layer.
const fullOutput = full.contexts[0].compressors[0].connections[0];
assert.equal(fullOutput.kind, "gain", "volume follows the existing compressor");
assert.equal(fullOutput.connections[0], full.contexts[0].destination, "no output bypasses final volume");
assert.equal(fullOutput.gain.value, 1, "100% preserves the previous level");
full.audio.setVolume(0.35);
full.audio.update(1, 1, 1);
full.audio.glitchHit(1);
assert.equal(fullOutput.gain.value, 0.35, "depth/glitch changes must not override user volume");
full.audio.setVolume(NaN); full.audio.setVolume(Infinity);
assert.equal(full.audio.volume, 0.35, "invalid volume leaves the last valid level");
full.audio.setVolume(-1);
assert.equal(fullOutput.gain.value, 0, "lower bound is silence");
full.audio.setVolume(2);
assert.equal(fullOutput.gain.value, 1, "volume never boosts beyond the previous level");
full.audio.setVolume(0.2);
full.audio.dispose();
assert.equal(fullOutput.connections.length, 0, "dispose disconnects the volume stage");
full.audio.start();
assert.equal(full.contexts[1].compressors[0].connections[0].gain.value, 0.2, "in-page volume survives audio recreation");
full.audio.dispose();

const quietStart = createHarness();
quietStart.audio.setVolume(0);
assert.equal(quietStart.contexts.length, 0, "setting volume on the cover does not start sound");
quietStart.audio.start();
assert.equal(quietStart.contexts[0].compressors[0].connections[0].gain.value, 0, "zero volume is applied before audio starts");
quietStart.audio.dispose();

const light = createHarness({ coarse: true });
light.audio.start();
assert.equal(light.audio.tier, "light");
assert.equal(light.contexts[0].oscillators.length, 4, "light creates three drones and one LFO");
assert.equal(light.contexts[0].convolvers[0].buffer.length, 80, "light uses the 0.8 second IR budget");
assert.equal(light.timers.size, 1);
light.document.hidden = true;
assert.equal(light.audio.suspendForVisibility(), true);
assert.equal(light.audio.playing, false);
assert.equal(light.audio.suspendedByVisibility, true);
assert.equal(light.contexts[0].state, "suspended");
assert.equal(light.timers.size, 0, "hidden clears the pulse timer");
light.document.hidden = false;
light.audio.toggle();
assert.equal(light.audio.playing, true, "explicit toggle resumes intent");
assert.equal(light.audio.suspendedByVisibility, false);
assert.equal(light.contexts[0].state, "running");
assert.equal(light.timers.size, 1, "explicit resume restores one timer");
light.audio.dispose();
assert.equal(light.contexts[0].state, "closed");
assert.equal(light.audio.on, false);
assert.equal(light.timers.size, 0);
light.audio.start();
assert.equal(light.contexts.length, 2, "dispose permits a fresh single context");
assert.equal(light.contexts[0].state, "closed", "the previous context stays closed");
assert.equal(light.contexts[1].state, "running");
light.audio.dispose();

const reduced = createHarness({ reduced: true });
reduced.audio.start();
assert.equal(reduced.audio.tier, "static");
assert.equal(reduced.contexts[0].oscillators.length, 0, "static creates no continuous oscillators");
assert.equal(reduced.contexts[0].convolvers.length, 0, "static creates no IR");
assert.equal(reduced.timers.size, 0, "static creates no automatic pulse timer");
reduced.audio.pulseOnce(1);
assert.equal(reduced.contexts[0].oscillators.length, 2, "static keeps explicit transient feedback");
reduced.audio.dispose();

console.log("audio-governor smoke PASS");
