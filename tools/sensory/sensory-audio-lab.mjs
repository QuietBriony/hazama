import { createSensoryFrame, seededUnit } from "./hazama-sensory-frame.mjs";
import { createBaselineModulator, createNeuralModulator, isValidModulation,
  MODULATION_STEP_MS, NEUTRAL_MODULATION, trialAtTick } from "./neural-modulator.mjs?v=neural-20260914-1";

const PARTIALS = [
  { ratio: 0.5, type: "sine", base: 0, bloom: 0.045, diss: 0 },
  { ratio: 1, type: "sine", base: 0.075, bloom: 0, diss: 0 },
  { ratio: 1.5, type: "triangle", base: 0.034, bloom: 0, diss: 0 },
  { ratio: 2.01, type: "sine", base: 0, bloom: 0.05, diss: 0 },
  { ratio: 2.99, type: "sine", base: 0, bloom: 0.04, diss: 0 },
  { ratio: 1.06, type: "sine", base: 0, bloom: 0, diss: 0.03 }
];

export const REVIEW_SCENES = Object.freeze({
  shallow: Object.freeze({
    label: "浅部",
    summary: "入口の余白と低い気配",
    depth: 0.18,
    dread: 0.12,
    density: 0.10,
    axis: "deep",
    phase: "surface"
  }),
  deep: Object.freeze({
    label: "深部",
    summary: "圧と多声が重なる底の手前",
    depth: 0.82,
    dread: 0.72,
    density: 0.55,
    axis: "casc",
    phase: "bottom"
  }),
  surfaced: Object.freeze({
    label: "浮上",
    summary: "戻った呼吸にわずかな残響が残る",
    depth: 0.28,
    dread: 0.16,
    density: 0.18,
    axis: "reso",
    phase: "surfaced"
  }),
  omega: Object.freeze({
    label: "Ω",
    summary: "終端の縁で低い呼気だけを残す",
    depth: 1,
    dread: 0.82,
    density: 0.72,
    axis: "other",
    phase: "omega"
  })
});

function seededRandom(seed) {
  let value = (Number(seed) >>> 0) || 0x485a4d41;
  return () => {
    value += 0x6d2b79f5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

export class CandidateAudioEngine {
  constructor(hostWindow) {
    this.hostWindow = hostWindow;
    this.context = null;
    this.master = null;
    this.compressor = null;
    this.filter = null;
    this.dry = null;
    this.convolver = null;
    this.wet = null;
    this.lfo = null;
    this.lfoGain = null;
    this.partials = [];
    this.frame = null;
    this.effectiveFrame = null;
    this.running = false;
    this.suspendedByVisibility = false;
    this.listeningGain = null;
    this.panner = null;
    this.volume = 0.35;
    this.modulationMode = "baseline";
    this.modulation = NEUTRAL_MODULATION;
    this.models = { baseline: createBaselineModulator(), neural: createNeuralModulator() };
    this.modulationTimer = null;
    this.replayTick = null;
    this.trialCompleted = false;
    this.replayLabel = "自由試聴";
    this.modulationFault = "";
    this.slowTicks = 0;
    this.onChange = () => {};
    this.lifecycle = 0;
    this.stopping = null;
    this.transients = new Set();
  }

  async start(frame) {
    if (this.stopping) await this.stopping;
    if (this.hostWindow.document?.hidden) return;
    const generation = ++this.lifecycle;
    if (!this.context) this.#createGraph(frame);
    this.frame = frame;
    this.resetModulation();
    this.running = true;
    const context = this.context;
    try { await context.resume(); } catch (error) { await this.stop(); throw error; }
    if (generation !== this.lifecycle || context !== this.context || !this.running) {
      if (context === this.context && this.suspendedByVisibility) { try { await context.suspend(); } catch {} }
      return;
    }
    if (this.hostWindow.document?.hidden) return this.suspendForVisibility();
    this.suspendedByVisibility = false;
    this.#apply(frame, true);
    this.#startModulation();
    this.onChange();
  }

  #createGraph(frame) {
    const AudioContext = this.hostWindow.AudioContext || this.hostWindow.webkitAudioContext;
    if (!AudioContext) throw new Error("Web Audio API is unavailable");
    this.context = new AudioContext();
    this.master = this.context.createGain();
    this.master.gain.value = 0.0001;
    this.compressor = this.context.createDynamicsCompressor();
    this.compressor.threshold.value = -18;
    this.compressor.knee.value = 12;
    this.compressor.ratio.value = 4;
    this.compressor.attack.value = 0.006;
    this.compressor.release.value = 0.25;
    this.master.connect(this.compressor);
    this.listeningGain = this.context.createGain();
    this.listeningGain.gain.value = this.volume;
    this.compressor.connect(this.listeningGain);
    this.panner = this.context.createStereoPanner?.() || null;
    if (this.panner) {
      this.listeningGain.connect(this.panner);
      this.panner.connect(this.context.destination);
    } else this.listeningGain.connect(this.context.destination);

    this.filter = this.context.createBiquadFilter();
    this.filter.type = "lowpass";
    this.filter.Q.value = 0.8;
    this.dry = this.context.createGain();
    this.filter.connect(this.dry);
    this.dry.connect(this.master);
    this.#rebuildContinuous(frame);
  }

  #clearContinuous() {
    this.partials.forEach(({ oscillator, gain }) => {
      try { oscillator.stop(); } catch {}
      try { oscillator.disconnect(); gain.disconnect(); } catch {}
    });
    this.partials = [];
    if (this.lfo) {
      try { this.lfo.stop(); } catch {}
      try { this.lfo.disconnect(); this.lfoGain.disconnect(); } catch {}
      this.lfo = null;
      this.lfoGain = null;
    }
    if (this.convolver) {
      try { this.filter.disconnect(this.convolver); this.convolver.disconnect(); this.wet.disconnect(); } catch {}
      this.convolver.buffer = null;
      this.convolver = null;
      this.wet = null;
    }
  }

  #rebuildContinuous(frame) {
    this.#clearContinuous();
    const budget = frame.audio.partialBudget;
    if (frame.audio.impulseSeconds > 0) {
      this.convolver = this.context.createConvolver();
      this.convolver.buffer = this.#makeImpulse(frame.audio.impulseSeconds, frame.signals.seed);
      this.wet = this.context.createGain();
      this.wet.gain.value = frame.audio.wetGain;
      this.filter.connect(this.convolver);
      this.convolver.connect(this.wet);
      this.wet.connect(this.master);
    }
    if (budget === 0) return;
    this.lfo = this.context.createOscillator();
    this.lfo.type = "sine";
    this.lfoGain = this.context.createGain();
    this.lfo.connect(this.lfoGain);
    this.lfo.start();
    PARTIALS.slice(0, budget).forEach((spec) => {
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = spec.type;
      gain.gain.value = 0.0001;
      oscillator.connect(gain);
      gain.connect(this.filter);
      this.lfoGain.connect(oscillator.detune);
      oscillator.start();
      this.partials.push({ oscillator, gain, spec });
    });
  }

  #makeImpulse(seconds, seed) {
    const length = Math.max(1, Math.floor(this.context.sampleRate * seconds));
    const buffer = this.context.createBuffer(2, length, this.context.sampleRate);
    const random = seededRandom(seed ^ 0x49525031);
    for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
      const data = buffer.getChannelData(channel);
      for (let index = 0; index < length; index += 1) {
        data[index] = (random() * 2 - 1) * Math.pow(1 - index / length, 2.6);
      }
    }
    return buffer;
  }

  configure(frame) {
    if (!this.context) return;
    const previous = this.frame;
    this.frame = frame;
    if (previous?.signals.seed !== frame.signals.seed) this.resetModulation();
    if (!previous || previous.audio.partialBudget !== frame.audio.partialBudget ||
        previous.audio.impulseSeconds !== frame.audio.impulseSeconds ||
        previous.signals.seed !== frame.signals.seed) {
      this.#rebuildContinuous(frame);
    }
    this.#apply(frame, false);
    this.#startModulation();
  }

  setVolume(value) {
    const number = Number(value);
    this.volume = Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : 0;
    if (this.listeningGain) this.listeningGain.gain.setTargetAtTime(this.volume, this.context.currentTime, 0.04);
  }

  setModulationMode(mode) {
    this.modulationMode = ["baseline", "neural", "off"].includes(mode) ? mode : "off";
    this.modulation = NEUTRAL_MODULATION;
    if (this.frame && this.context) this.#apply(this.frame, false);
    this.#startModulation();
    this.onChange();
  }

  resetModulation() {
    const seed = this.frame?.signals.seed || 0;
    Object.values(this.models).forEach((model) => model.reset(seed));
    this.modulation = NEUTRAL_MODULATION;
    this.modulationFault = "";
    this.slowTicks = 0;
    this.replayTick = null;
    this.replayLabel = "自由試聴 · リセット済み";
    this.trialCompleted = false;
    if (this.context && this.frame) this.#apply(this.frame, false);
    this.#startModulation();
    this.onChange();
  }

  replayTrial() {
    if (!this.running || this.suspendedByVisibility || this.frame?.signals.tier === "static" || this.modulationMode === "off") return;
    this.resetModulation();
    this.replayTick = 0;
    this.replayLabel = "静けさ";
    this.onChange();
  }

  #clearModulationTimer() {
    if (this.modulationTimer !== null) this.hostWindow.clearInterval(this.modulationTimer);
    this.modulationTimer = null;
  }

  #startModulation() {
    this.#clearModulationTimer();
    if (!this.running || this.suspendedByVisibility || this.context?.state !== "running"
        || this.frame?.signals.tier === "static" || this.modulationMode === "off" || this.modulationFault) {
      this.modulation = NEUTRAL_MODULATION;
      return;
    }
    // One fixed step per tick, never a catch-up burst after a delayed frame.
    this.modulationTimer = this.hostWindow.setInterval(() => this.advanceModulation(), MODULATION_STEP_MS);
  }

  advanceModulation() {
    if (!this.running || this.suspendedByVisibility || this.context?.state !== "running"
        || this.hostWindow.document?.hidden || this.modulationFault || this.modulationMode === "off"
        || this.frame?.signals.tier === "static") return;
    const start = this.hostWindow.performance?.now() || 0;
    try {
      let frame = this.frame;
      if (this.replayTick !== null) {
        const stage = trialAtTick(this.replayTick);
        if (!stage) {
          this.replayTick = null;
          this.trialCompleted = true;
          this.replayLabel = "60秒比較が終了 · モードを替えて再試聴できます";
          void this.stop();
          return;
        }
        this.replayLabel = `${stage.seconds.toFixed(1)} / 60秒 · ${stage.label}`;
        frame = createSensoryFrame({ ...frame.signals, ...stage.signals });
        this.replayTick += 1;
      }
      const a = this.models.baseline.step(frame.signals);
      const b = this.models.neural.step(frame.signals);
      if (!isValidModulation(a) || !isValidModulation(b)) throw new Error("数値の範囲外");
      this.modulation = this.modulationMode === "neural" ? b : a;
      this.#apply(frame, false);
      const elapsed = (this.hostWindow.performance?.now() || 0) - start;
      this.slowTicks = elapsed > 15 ? this.slowTicks + 1 : 0;
      if (this.slowTicks >= 3) throw new Error("計算時間の上限");
      if (this.modulation.tick % 5 === 0) this.onChange();
    } catch {
      this.modulationFault = "変調を停止しました。リセットで再試行できます。";
      this.replayTick = null;
      this.#clearModulationTimer();
      this.modulation = NEUTRAL_MODULATION;
      this.#apply(this.frame, false);
      this.onChange();
    }
  }

  #apply(frame, immediate) {
    this.effectiveFrame = frame;
    const now = this.context.currentTime;
    const time = immediate ? 0.08 : 0.7;
    const m = frame.signals.tier === "static" || this.modulationMode === "off" ? NEUTRAL_MODULATION : this.modulation;
    this.master.gain.setTargetAtTime(frame.audio.masterGain, now, time);
    this.filter.frequency.setTargetAtTime(Math.max(280, Math.min(2540, frame.audio.cutoffHz + m.texture * 280)), now, time);
    if (this.panner) this.panner.pan.setTargetAtTime(m.pan * 0.18, now, 0.3);
    if (this.wet) this.wet.gain.setTargetAtTime(frame.audio.wetGain, now, 1.1);
    if (this.lfo) this.lfo.frequency.setTargetAtTime(frame.audio.lfoHz, now, 1.1);
    if (this.lfoGain) this.lfoGain.gain.setTargetAtTime(frame.audio.lfoCents, now, 1.1);
    const bloom = Math.max(0, frame.signals.depth - 0.1) / 0.9;
    this.partials.forEach(({ oscillator, gain, spec }) => {
      const level = spec.base + spec.bloom * bloom * (1 + frame.signals.density * 0.7) + spec.diss * frame.signals.menace;
      oscillator.frequency.setTargetAtTime(frame.audio.baseHz * spec.ratio, now, time);
      oscillator.detune.setTargetAtTime(frame.audio.baseDetuneCents + m.texture * 5, now, 1.2);
      gain.gain.setTargetAtTime(Math.max(0.0001, level * (0.86 + m.pulse * 0.14)), now, immediate ? 0.2 : 0.3);
    });
  }

  async playVerb(name, frame) {
    if (!this.context || !this.running) await this.start(frame);
    else if (this.context.state !== "running") await this.resumeFromGesture(frame);
    else this.configure(frame);
    if (!this.running || this.suspendedByVisibility || this.context?.state !== "running" || this.transients.size >= 8) return;
    const now = this.context.currentTime;
    const scale = frame.audio.transientScale;
    const recipes = {
      enter: { type: "sine", from: 132, to: 96, peak: 0.045, attack: 0.04, duration: 0.9 },
      descend: { type: "sine", from: 112 - frame.signals.depth * 18, to: 70, peak: 0.065, attack: 0.018, duration: 0.62 },
      resist: { type: "triangle", from: 126, to: 154 - frame.signals.dread * 30, peak: 0.052, attack: 0.015, duration: 0.48 },
      recognition: { type: "triangle", from: 176, to: 224, peak: 0.038, attack: 0.025, duration: 0.82 },
      breath: { type: "sine", from: frame.signals.phase === "omega" ? 80 : 128, to: frame.signals.phase === "omega" ? 75 : 120, peak: 0.05, attack: 0.55, duration: 4.8 }
    };
    if (name === "forget") return this.#noiseBurst(frame, now);
    const recipe = recipes[name] || recipes.descend;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = recipe.type;
    oscillator.frequency.setValueAtTime(recipe.from, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, recipe.to), now + recipe.duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, recipe.peak * scale), now + recipe.attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + recipe.duration);
    oscillator.connect(gain);
    gain.connect(this.filter);
    oscillator.start(now);
    oscillator.stop(now + recipe.duration + 0.04);
    this.#trackTransient(oscillator, [gain]);
  }

  #noiseBurst(frame, now) {
    const length = Math.max(1, Math.floor(this.context.sampleRate * 0.09));
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    const random = seededRandom(frame.signals.seed ^ 0x464f5247);
    for (let index = 0; index < length; index += 1) {
      data[index] = (random() * 2 - 1) * Math.pow(1 - index / length, 1.8);
    }
    const source = this.context.createBufferSource();
    const bandpass = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    source.buffer = buffer;
    bandpass.type = "bandpass";
    bandpass.frequency.value = 900 + seededUnit(frame.signals.seed, 0x425031) * 1800;
    bandpass.Q.value = 0.9;
    gain.gain.setValueAtTime(0.022 * frame.audio.transientScale, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
    source.connect(bandpass);
    bandpass.connect(gain);
    gain.connect(this.master);
    source.start(now);
    source.stop(now + 0.1);
    this.#trackTransient(source, [bandpass, gain]);
  }

  #trackTransient(source, nodes) {
    const entry = { source, nodes };
    this.transients.add(entry);
    source.onended = () => {
      source.disconnect();
      nodes.forEach((node) => node.disconnect());
      this.transients.delete(entry);
    };
  }

  #clearTransients() {
    this.transients.forEach(({ source, nodes }) => {
      source.onended = null;
      try { source.stop(); source.disconnect(); } catch {}
      nodes.forEach((node) => { try { node.disconnect(); } catch {} });
    });
    this.transients.clear();
  }

  async suspendForVisibility() {
    this.lifecycle += 1;
    this.#clearModulationTimer();
    if (!this.context || !this.running) return;
    this.suspendedByVisibility = true;
    this.#clearTransients();
    try { await this.context.suspend(); } catch {}
    this.onChange();
  }

  async resumeFromGesture(frame) {
    if (!this.context || !this.running) return this.start(frame);
    if (this.hostWindow.document?.hidden) return;
    const generation = ++this.lifecycle;
    const context = this.context;
    await context.resume();
    if (generation !== this.lifecycle || context !== this.context || !this.running) {
      if (context === this.context && this.suspendedByVisibility) { try { await context.suspend(); } catch {} }
      return;
    }
    if (this.hostWindow.document?.hidden) return this.suspendForVisibility();
    this.suspendedByVisibility = false;
    this.configure(frame);
    this.onChange();
  }

  async stop(immediate = false) {
    if (this.stopping) {
      if (immediate && this.context) {
        this.#clearContinuous();
        this.#clearTransients();
        try { await this.context.close(); } catch {}
      }
      return this.stopping;
    }
    this.lifecycle += 1;
    this.#clearModulationTimer();
    this.running = false;
    this.replayTick = null;
    this.onChange();
    if (!this.context) return;
    const context = this.context;
    this.master.gain.setTargetAtTime(0.0001, context.currentTime, 0.06);
    this.stopping = (async () => {
      if (!immediate) await new Promise((resolve) => this.hostWindow.setTimeout(resolve, 180));
      this.#clearContinuous();
      this.#clearTransients();
      try { await context.close(); } catch {}
      this.context = this.master = this.compressor = this.filter = this.dry = null;
      this.listeningGain = this.panner = this.frame = this.effectiveFrame = null;
      this.modulation = NEUTRAL_MODULATION;
      this.suspendedByVisibility = false;
      this.stopping = null;
      this.onChange();
    })();
    this.onChange();
    return this.stopping;
  }
}

export function setupSensoryAudioLab(doc, hostWindow) {
  const $ = (id) => doc.getElementById(id);
  const engine = new CandidateAudioEngine(hostWindow);
  let audioTransitioning = false;
  const controls = ["depth", "dread", "density", "axis", "phase", "tier"].map($);
  const motionQuery = hostWindow.matchMedia?.("(prefers-reduced-motion: reduce)");
  let reducedMotion = motionQuery?.matches || false;
  const coarsePointer = hostWindow.matchMedia?.("(pointer: coarse)").matches || false;
  if (coarsePointer && $("tier").value === "balanced") $("tier").value = "light";
  const currentFrame = () => createSensoryFrame({
    depth: $("depth").value,
    dread: $("dread").value,
    density: $("density").value,
    axis: $("axis").value,
    phase: $("phase").value || undefined,
    tier: $("tier").value,
    seed: $("seed").value,
    reducedMotion
  });
  const render = () => {
    ["depth", "dread", "density"].forEach((id) => { $(id).nextElementSibling.textContent = Number($(id).value).toFixed(2); });
    const frame = currentFrame();
    $("trace").textContent = JSON.stringify(frame, null, 2);
    if (engine.running && !engine.suspendedByVisibility) engine.configure(frame);
    return frame;
  };
  const status = (text) => { $("status").textContent = text; };
  const syncSceneSelection = (sceneId) => {
    doc.querySelectorAll("[data-scene]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.scene === sceneId));
    });
    const scene = REVIEW_SCENES[sceneId];
    $("scene-summary").textContent = scene
      ? `${scene.label} — ${scene.summary}`
      : "カスタム調整 — 詳細値を比較中";
  };
  const applyScene = (sceneId) => {
    const scene = REVIEW_SCENES[sceneId];
    if (!scene) return render();
    ["depth", "dread", "density", "axis", "phase"].forEach((id) => {
      $(id).value = scene[id];
    });
    syncSceneSelection(sceneId);
    const frame = render();
    engine.resetModulation();
    status(engine.running ? `試聴中: ${scene.label}` : `${scene.label}を選択。音はまだ停止中`);
    return frame;
  };
  const syncToggle = () => {
    const busy = audioTransitioning || Boolean(engine.stopping);
    $("audio-toggle").textContent = !engine.running ? "試聴を始める"
      : engine.suspendedByVisibility ? "試聴を再開する" : "試聴を止める";
    $("audio-toggle").setAttribute("aria-pressed", String(engine.running && !engine.suspendedByVisibility));
    $("audio-toggle").disabled = busy;
    const audible = engine.running && !engine.suspendedByVisibility && !busy;
    doc.querySelectorAll("[data-verb]").forEach((button) => {
      button.disabled = !audible || engine.replayTick !== null;
    });
    $("trial-replay").disabled = !audible || currentFrame().signals.tier === "static" || engine.modulationMode === "off";
    const paused = engine.suspendedByVisibility ? "一時停止 · ボタンで再開" : !engine.running ? "停止中" : "試聴中";
    const label = currentFrame().signals.tier === "static" ? "static設定 · 自律変調なし" : engine.replayLabel;
    // Do not make a screen reader announce the simulation clock four times/sec.
    const announcement = `${paused} · ${engine.modulationFault || label.replace(/^\d+\.\d \/ 60秒 · /, "")}`;
    if ($("trial-status").textContent !== announcement) $("trial-status").textContent = announcement;
    $("trial-progress").value = engine.replayTick === null ? (engine.trialCompleted ? 60 : 0) : engine.replayTick * MODULATION_STEP_MS / 1000;
    if (!engine.running && $("status").textContent.startsWith("試聴中")) status("停止中");
    const m = engine.modulation;
    $("trace").textContent = JSON.stringify(engine.running && engine.effectiveFrame ? engine.effectiveFrame : currentFrame(), null, 2);
    $("modulation-summary").textContent = `音色 ${m.texture.toFixed(2)} · 脈動 ${m.pulse.toFixed(2)} · 左右 ${m.pan.toFixed(2)}`
      + (engine.modulationMode === "neural" ? ` · 活動 ${Math.round(m.activity * 100)}% · 慣れ ${Math.round(m.adaptation * 100)}%` : "");
  };
  engine.onChange = syncToggle;

  controls.forEach((control) => control.addEventListener("input", () => {
    if (control.id !== "tier") syncSceneSelection();
    render();
    engine.resetModulation();
  }));
  $("seed").addEventListener("change", () => {
    const value = Number($("seed").value);
    $("seed").value = String(Number.isFinite(value) ? Math.max(0, Math.min(4294967295, Math.trunc(value))) : 0);
    render();
    engine.resetModulation();
  });
  $("volume").addEventListener("input", () => {
    engine.setVolume($("volume").value);
    $("volume").nextElementSibling.textContent = `${Math.round(engine.volume * 100)}%`;
  });
  doc.querySelectorAll("[data-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      engine.setModulationMode(button.dataset.mode);
      if (button.dataset.mode === "off") engine.resetModulation();
      doc.querySelectorAll("[data-mode]").forEach((item) => {
        item.setAttribute("aria-pressed", String(item.dataset.mode === engine.modulationMode));
      });
    });
  });
  $("modulation-reset").addEventListener("click", () => { render(); engine.resetModulation(); });
  $("trial-replay").addEventListener("click", () => { engine.replayTrial(); });
  doc.querySelectorAll("[data-scene]").forEach((button) => {
    button.addEventListener("click", () => { applyScene(button.dataset.scene); });
  });
  $("audio-toggle").addEventListener("click", async () => {
    if (audioTransitioning) return;
    audioTransitioning = true;
    $("audio-toggle").disabled = true;
    $("audio-toggle").setAttribute("aria-busy", "true");
    try {
      if (engine.running && !engine.suspendedByVisibility) {
        await engine.stop();
        status("停止中");
      } else {
        await engine.resumeFromGesture(render());
        status(reducedMotion ? "試聴中（OS設定によりstatic tier）" : "試聴中");
      }
      syncToggle();
    } catch (error) {
      status(`開始できません: ${error.message}`);
    } finally {
      audioTransitioning = false;
      $("audio-toggle").setAttribute("aria-busy", "false");
      syncToggle();
    }
  });
  doc.querySelectorAll("[data-verb]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (audioTransitioning || !engine.running || engine.suspendedByVisibility || engine.stopping || engine.replayTick !== null) return;
      try {
        await engine.playVerb(button.dataset.verb, render());
        status(`試聴中: ${button.textContent}`);
        syncToggle();
      } catch (error) {
        status(`再生できません: ${error.message}`);
      }
    });
  });
  doc.addEventListener("visibilitychange", async () => {
    if (doc.hidden) {
      await engine.suspendForVisibility();
      if (engine.running) status("非表示のため一時停止。再開はボタンを押してください");
      syncToggle();
    }
  });
  motionQuery?.addEventListener?.("change", (event) => {
    reducedMotion = event.matches;
    render();
    engine.resetModulation();
  });
  hostWindow.addEventListener("pagehide", () => { void engine.stop(true); });
  syncSceneSelection("shallow");
  render();
  syncToggle();
  if (coarsePointer) status(reducedMotion ? "停止中 · OS設定によりstatic tier" : "停止中 · mobile向けlight tier");
  return engine;
}

if (typeof document !== "undefined" && typeof window !== "undefined") {
  setupSensoryAudioLab(document, window);
}
