import { createCurrentAudio } from "./scene-current-audio.mjs?v=scene-20260915-1";
import { MODES, SCENES, MAX_SECONDS, responseScore } from "./scene-score.mjs?v=scene-20260915-1";

export const MAX_VOICES = 24;
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
    const ctx = this.ctx, carrier = ctx.createOscillator(), gain = ctx.createGain();
    const sources = [carrier], nodes = [carrier, gain], frequency = hz(event.midi);
    carrier.type = event.kind === "body" ? "triangle" : "sine";
    carrier.frequency.setValueAtTime(frequency, at);
    if (event.kind === "pulse") carrier.frequency.exponentialRampToValueAtTime(frequency * .65, at + .22);
    if (event.kind === "fragment") {
      const modulator = ctx.createOscillator(), amount = ctx.createGain();
      modulator.frequency.value = frequency * 2.005;
      amount.gain.setValueAtTime(frequency * .28, at);
      amount.gain.exponentialRampToValueAtTime(frequency * .025, at + .65);
      modulator.connect(amount).connect(carrier.frequency);
      sources.push(modulator); nodes.push(modulator, amount);
    }
    gain.gain.value = 0;
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(event.gain, at + (event.kind === "pulse" ? .012 : .025));
    gain.gain.exponentialRampToValueAtTime(.00001, at + event.duration);
    carrier.connect(gain).connect(this.input);
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
      if (mode === "current") {
        this.current = createCurrentAudio({
          AudioContext: function () { return ctx; },
          matchMedia: this.host.matchMedia?.bind(this.host),
          setInterval: this.host.setInterval.bind(this.host), clearInterval: this.host.clearInterval.bind(this.host)
        }, this.doc, this.host.matchMedia?.("(prefers-reduced-motion: reduce)").matches || false);
        this.current.setVolume(this.volume); this.current.start(); this.current.setColor(7);
      } else this.graph = new ResponseGraph(ctx, this.volume);
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
      if (index > 0) this.current.pulseOnce(.85);
    } else this.graph.play(this.mode, index);
  }

  setVolume(value) {
    this.volume = clampVolume(value);
    this.current?.setVolume(this.volume); this.graph?.setVolume(this.volume);
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
