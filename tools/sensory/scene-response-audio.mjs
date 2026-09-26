import { createCurrentAudio } from "./scene-current-audio.mjs?v=scene-20260923-1";
import { MODES, SCENES, MAX_SECONDS, responseScore } from "./scene-score.mjs?v=scene-20260923-1";

export const MAX_VOICES = 24;
// Fixed headroom allocation, never raised by depth, response count or feedback.
export const INTEGRATED_LEVELS = Object.freeze({ bed: .9, response: .65 });
export const clampVolume = (n) => Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0;
const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);

export class ResponseGraph {
  constructor(ctx, volume = .35) {
    this.ctx = ctx;
    this.voices = new Set();
    this.input = ctx.createGain(); this.input.gain.value = .26;
    this.highpass = ctx.createBiquadFilter(); this.highpass.type = "highpass"; this.highpass.frequency.value = 32;
    this.filter = ctx.createBiquadFilter(); this.filter.type = "lowpass"; this.filter.frequency.value = 2300; this.filter.Q.value = .6;
    this.compressor = ctx.createDynamicsCompressor();
    Object.entries({ threshold: -18, knee: 12, ratio: 4, attack: .006, release: .25 }).forEach(([key, value]) => { this.compressor[key].value = value; });
    this.output = ctx.createGain(); this.output.gain.value = clampVolume(volume);
    this.delay = ctx.createDelay(.8); this.delay.delayTime.value = .28;
    this.feedback = ctx.createGain(); this.feedback.gain.value = .18;
    this.wet = ctx.createGain(); this.wet.gain.value = .24;
    this.input.connect(this.highpass).connect(this.filter).connect(this.compressor);
    this.filter.connect(this.delay); this.delay.connect(this.feedback).connect(this.delay);
    this.delay.connect(this.wet).connect(this.compressor);
    this.compressor.connect(this.output).connect(ctx.destination);
  }

  setVolume(volume) { this.output.gain.setTargetAtTime(clampVolume(volume), this.ctx.currentTime, .025); }

  release(voice) {
    voice.carrier.onended = null;
    voice.nodes.forEach((node) => { try { node.disconnect(); } catch {} });
    this.voices.delete(voice);
  }

  clear(immediate = false) {
    const now = this.ctx.currentTime;
    for (const voice of [...this.voices]) {
      voice.gain.gain.cancelScheduledValues(now);
      voice.gain.gain.setTargetAtTime(0, now, .008);
      voice.sources.forEach((source) => { try { source.stop(now + (immediate ? 0 : .04)); } catch {} });
      if (immediate) this.release(voice);
    }
  }

  play(mode, index) {
    this.clear();
    this.texture = mode === "d";
    const time = this.ctx.currentTime;
    this.filter.frequency.setTargetAtTime(this.texture ? 1050 - SCENES[index].depth * 450 - SCENES[index].dread * 110 : 2300, time, .25);
    this.delay.delayTime.setTargetAtTime(this.texture ? .37 : .28, time, .1);
    this.wet.gain.setTargetAtTime(this.texture ? .45 : .24, time, .1);
    const now = this.ctx.currentTime + .025;
    for (const event of responseScore(mode, index)) this.schedule(event, now + event.at);
  }

  schedule(event, at) {
    // Includes future-scheduled voices. Repeated choices cannot accumulate graphs.
    if (this.voices.size >= MAX_VOICES) {
      const oldest = this.voices.values().next().value;
      oldest.sources.forEach((source) => { try { source.stop(); } catch {} });
      this.release(oldest);
    }
    const ctx = this.ctx, grain = event.kind === "grain";
    const carrier = grain ? ctx.createBufferSource() : ctx.createOscillator(), gain = ctx.createGain();
    const sources = [carrier], nodes = [carrier, gain], frequency = hz(event.midi);
    let signal = carrier;
    if (grain) {
      // Generated in memory, never an imported recording/sample. A deterministic
      // filtered grain adds friction, not a background process or neural claim.
      carrier.buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * (event.duration + .04)), ctx.sampleRate);
      const data = carrier.buffer.getChannelData(0);
      let seed = (Math.round(event.midi * 1000) ^ 0x485a4d41) >>> 0, memory = 0;
      for (let i = 0; i < data.length; i++) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        memory = .86 * memory + .14 * (seed / 2147483648 - 1);
        data[i] = Math.max(-1, Math.min(1, memory * 3.4));
      }
      const band = ctx.createBiquadFilter(); band.type = "bandpass"; band.Q.value = .8;
      band.frequency.setValueAtTime(frequency, at);
      band.frequency.setTargetAtTime(frequency * .67, at + .12, .3);
      carrier.connect(band); signal = band; nodes.push(band);
    } else {
      carrier.type = event.kind === "body" ? "triangle" : "sine";
      carrier.frequency.setValueAtTime(frequency, at);
      if (event.kind === "pulse") carrier.frequency.exponentialRampToValueAtTime(frequency * .65, at + .22);
      else if (this.texture) carrier.frequency.setTargetAtTime(frequency * .993, at + .6, 1.4);
    }
    if (event.kind === "fragment") {
      const modulator = ctx.createOscillator(), amount = ctx.createGain();
      modulator.frequency.value = frequency * (this.texture ? 1.997 : 2.005);
      amount.gain.setValueAtTime(frequency * (this.texture ? .14 : .28), at);
      amount.gain.exponentialRampToValueAtTime(frequency * .025, at + .65);
      modulator.connect(amount).connect(carrier.frequency);
      sources.push(modulator); nodes.push(modulator, amount);
    }
    gain.gain.value = 0;
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(event.gain, at + (event.kind === "pulse" ? .012 : (grain || this.texture) ? .12 : .025));
    gain.gain.exponentialRampToValueAtTime(.00001, at + event.duration);
    signal.connect(gain).connect(this.input);
    const voice = { carrier, gain, sources, nodes };
    this.voices.add(voice);
    carrier.onended = () => this.release(voice);
    sources.forEach((source) => { source.start(at); source.stop(at + event.duration + .03); });
  }

  dispose() {
    this.clear(true);
    [this.input, this.highpass, this.filter, this.compressor, this.output, this.delay, this.feedback, this.wet]
      .forEach((node) => { try { node.disconnect(); } catch {} });
  }
}

export class SceneAudioSession {
  constructor(host, doc) {
    this.host = host; this.doc = doc; this.context = null; this.graph = null; this.current = null;
    this.mode = "current"; this.volume = .35; this.generation = 0; this.timer = null;
    this.pending = false; this.running = false; this.closing = null;
    this.onChange = () => {}; this.onStop = () => {};
  }

  async start(mode, index) {
    if (this.context || this.closing || this.doc.hidden) return false;
    if (!Object.hasOwn(MODES, mode) || !Number.isInteger(index) || !SCENES[index]) throw new Error("Unknown comparison condition");
    const generation = ++this.generation;
    const Constructor = this.host.AudioContext || this.host.webkitAudioContext;
    if (!Constructor) throw new Error("このブラウザはWeb Audioに対応していません");
    this.mode = mode; this.pending = true;
    try {
      const ctx = this.context = new Constructor();
      // Unlock synchronously on the click. The snapshot's own resume() receives
      // this same handled promise, so a rejected unlock cannot leak a rejection.
      const resumed = ctx.resume();
      ctx.resume = () => resumed;
      void resumed.catch(() => {});
      if (mode === "current" || mode === "d") {
        this.current = createCurrentAudio({
          AudioContext: function () { return ctx; },
          matchMedia: this.host.matchMedia?.bind(this.host),
          setInterval: this.host.setInterval.bind(this.host), clearInterval: this.host.clearInterval.bind(this.host)
        }, this.doc, this.host.matchMedia?.("(prefers-reduced-motion: reduce)").matches || false);
        this.current.setVolume(this.volume * (mode === "d" ? INTEGRATED_LEVELS.bed : 1));
        this.current.start(); this.current.setColor(7);
      }
      if (mode !== "current") this.graph = new ResponseGraph(ctx, this.volume * (mode === "d" ? INTEGRATED_LEVELS.response : 1));
      this.onChange();
      await resumed;
      if (generation !== this.generation || this.doc.hidden || ctx !== this.context) return false;
      if (ctx.state !== "running") throw new Error("音を開始できませんでした。もう一度お試しください");
      this.pending = false; this.running = true; this.startedAt = ctx.currentTime;
      ctx.addEventListener("statechange", () => {
        if (ctx === this.context && this.running && ctx.state !== "running") void this.stop("音が中断されました。再開はボタンから。");
      });
      this.applyScene(index);
      this.timer = this.host.setInterval(() => {
        if (ctx.currentTime - this.startedAt >= MAX_SECONDS) void this.stop("2分で自動停止しました。文章はそのまま読めます。");
      }, 200);
      this.onChange();
      return true;
    } catch (error) {
      if (generation !== this.generation) return false;
      await this.stop();
      throw error;
    }
  }

  applyScene(index) {
    if (!this.running || !SCENES[index]) return;
    if (this.current) {
      const scene = SCENES[index];
      this.current.update(scene.depth, scene.dread, scene.density);
      // D supplies its own action response; don't double the old choice accent.
      if (index > 0 && this.mode === "current") this.current.pulseOnce(.85);
    }
    this.graph?.play(this.mode, index);
  }

  setVolume(value) {
    this.volume = clampVolume(value);
    this.current?.setVolume(this.volume * (this.mode === "d" ? INTEGRATED_LEVELS.bed : 1));
    this.graph?.setVolume(this.volume * (this.mode === "d" ? INTEGRATED_LEVELS.response : 1));
  }

  stop(reason = "停止中。再開はボタンから。") {
    ++this.generation;
    if (this.closing) return this.closing;
    const ctx = this.context;
    this.context = null; this.pending = false; this.running = false;
    if (this.timer !== null) this.host.clearInterval(this.timer);
    this.timer = null;
    this.graph?.dispose(); this.graph = null;
    // Capture and await close, including the production snapshot's dispose().
    let closed;
    if (ctx) {
      const nativeClose = ctx.close.bind(ctx);
      ctx.close = () => closed || (closed = nativeClose());
    }
    this.current?.dispose(); this.current = null;
    try { closed = ctx?.close(); } catch { closed = Promise.resolve(); }
    this.closing = Promise.resolve(closed).catch(() => {}).finally(() => {
      this.closing = null; this.onChange();
    });
    this.onStop(reason); this.onChange();
    return this.closing;
  }
}
