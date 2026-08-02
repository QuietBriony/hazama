import { createSensoryFrame, seededUnit } from "./hazama-sensory-frame.mjs";

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
    this.running = false;
    this.suspendedByVisibility = false;
  }

  async start(frame) {
    if (!this.context) this.#createGraph(frame);
    this.frame = frame;
    this.running = true;
    await this.context.resume();
    this.#apply(frame, true);
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
    this.compressor.connect(this.context.destination);

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
    if (!previous || previous.audio.partialBudget !== frame.audio.partialBudget ||
        previous.audio.impulseSeconds !== frame.audio.impulseSeconds ||
        previous.signals.seed !== frame.signals.seed) {
      this.#rebuildContinuous(frame);
    }
    this.#apply(frame, false);
  }

  #apply(frame, immediate) {
    const now = this.context.currentTime;
    const time = immediate ? 0.08 : 0.7;
    this.master.gain.setTargetAtTime(frame.audio.masterGain, now, time);
    this.filter.frequency.setTargetAtTime(frame.audio.cutoffHz, now, time);
    if (this.wet) this.wet.gain.setTargetAtTime(frame.audio.wetGain, now, 1.1);
    if (this.lfo) this.lfo.frequency.setTargetAtTime(frame.audio.lfoHz, now, 1.1);
    if (this.lfoGain) this.lfoGain.gain.setTargetAtTime(frame.audio.lfoCents, now, 1.1);
    const bloom = Math.max(0, frame.signals.depth - 0.1) / 0.9;
    this.partials.forEach(({ oscillator, gain, spec }) => {
      const level = spec.base + spec.bloom * bloom * (1 + frame.signals.density * 0.7) + spec.diss * frame.signals.menace;
      oscillator.frequency.setTargetAtTime(frame.audio.baseHz * spec.ratio, now, time);
      oscillator.detune.setTargetAtTime(frame.audio.baseDetuneCents, now, 1.2);
      gain.gain.setTargetAtTime(Math.max(0.0001, level), now, immediate ? 0.2 : 0.8);
    });
  }

  async playVerb(name, frame) {
    if (!this.context || !this.running) await this.start(frame);
    else if (this.context.state !== "running") await this.resumeFromGesture(frame);
    else this.configure(frame);
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
  }

  async suspendForVisibility() {
    if (!this.context || !this.running || this.context.state !== "running") return;
    this.suspendedByVisibility = true;
    await this.context.suspend();
  }

  async resumeFromGesture(frame) {
    if (!this.context || !this.running) return this.start(frame);
    this.suspendedByVisibility = false;
    await this.context.resume();
    this.configure(frame);
  }

  async stop() {
    if (!this.context) return;
    this.running = false;
    const context = this.context;
    this.master.gain.setTargetAtTime(0.0001, context.currentTime, 0.06);
    await new Promise((resolve) => this.hostWindow.setTimeout(resolve, 180));
    this.#clearContinuous();
    try { await context.close(); } catch {}
    this.context = null;
    this.master = null;
    this.compressor = null;
    this.filter = null;
    this.dry = null;
    this.frame = null;
    this.suspendedByVisibility = false;
  }
}

export function setupSensoryAudioLab(doc, hostWindow) {
  const $ = (id) => doc.getElementById(id);
  const engine = new CandidateAudioEngine(hostWindow);
  let audioTransitioning = false;
  const controls = ["depth", "dread", "density", "axis", "phase", "tier"].map($);
  const reducedMotion = hostWindow.matchMedia?.("(prefers-reduced-motion: reduce)").matches || false;
  const coarsePointer = hostWindow.matchMedia?.("(pointer: coarse)").matches || false;
  const seed = 0x485a4c31;
  if (coarsePointer && $("tier").value === "balanced") $("tier").value = "light";
  const currentFrame = () => createSensoryFrame({
    depth: $("depth").value,
    dread: $("dread").value,
    density: $("density").value,
    axis: $("axis").value,
    phase: $("phase").value || undefined,
    tier: $("tier").value,
    seed,
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
    status(engine.running ? `試聴中: ${scene.label}` : `${scene.label}を選択。音はまだ停止中`);
    return frame;
  };
  const syncToggle = () => {
    $("audio-toggle").textContent = !engine.running ? "試聴を始める"
      : engine.suspendedByVisibility ? "試聴を再開する" : "試聴を止める";
    $("audio-toggle").setAttribute("aria-pressed", String(engine.running));
  };

  controls.forEach((control) => control.addEventListener("input", () => {
    if (control.id !== "tier") syncSceneSelection();
    render();
  }));
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
      $("audio-toggle").disabled = false;
      $("audio-toggle").setAttribute("aria-busy", "false");
    }
  });
  doc.querySelectorAll("[data-verb]").forEach((button) => {
    button.addEventListener("click", async () => {
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
  hostWindow.addEventListener("pagehide", () => { void engine.stop(); }, { once: true });
  syncSceneSelection("shallow");
  render();
  if (coarsePointer) status(reducedMotion ? "停止中 · OS設定によりstatic tier" : "停止中 · mobile向けlight tier");
  return engine;
}

if (typeof document !== "undefined" && typeof window !== "undefined") {
  setupSensoryAudioLab(document, window);
}
