import { seededUnit } from "./hazama-sensory-frame.mjs";

// Original, deliberately small toy dynamics. No measured fly wiring or trained
// weights. One step is 50 ms of experiment time, not a biological time model.
export const MODULATION_STEP_MS = 50;
export const NEURON_COUNT = 64;
export const NEUTRAL_MODULATION = Object.freeze({ texture: 0, pulse: 1, pan: 0, activity: 0, adaptation: 0, tick: 0 });

function finite(value, fallback = 0) {
  try { const n = Number(value); return Number.isFinite(n) ? n : fallback; } catch { return fallback; }
}
const unit = (value) => Math.max(0, Math.min(1, finite(value)));
const signed = (value) => Math.max(-1, Math.min(1, finite(value)));
const seedValue = (seed) => finite(seed) >>> 0;
function signals(input) {
  const s = input && typeof input === "object" ? input : {};
  return { depth: unit(s.depth), dread: unit(s.dread), density: unit(s.density),
    quiet: s.phase === "surfaced", disabled: s.tier === "static" || Boolean(s.reducedMotion) };
}
function snapshot(texture, pulse, pan, activity, adaptation, tick) {
  return Object.freeze({ texture: signed(texture), pulse: unit(pulse), pan: signed(pan),
    activity: unit(activity), adaptation: unit(adaptation), tick });
}

/** Stateful, browser-independent experiment. reset(seed) + identical step
 * inputs gives identical outputs. State never leaves this instance or persists. */
export function createNeuralModulator(initialSeed = 0) {
  const voltage = new Float64Array(NEURON_COUNT);
  const fatigue = new Float64Array(NEURON_COUNT);
  const spikes = new Uint8Array(NEURON_COUNT);
  const nextSpikes = new Uint8Array(NEURON_COUNT);
  const refractory = new Uint8Array(NEURON_COUNT);
  const sources = new Uint8Array(NEURON_COUNT * 6);
  let seed, tick, adaptation, activity, left, right, texture, pulse, pan;
  function reset(nextSeed = initialSeed) {
    seed = seedValue(nextSeed);
    tick = adaptation = activity = left = right = texture = pan = 0;
    pulse = 0.5;
    fatigue.fill(0); spikes.fill(0); nextSpikes.fill(0); refractory.fill(0);
    for (let i = 0; i < NEURON_COUNT; i += 1) {
      voltage[i] = seededUnit(seed, i + 11) * 0.7;
      for (let j = 0; j < 6; j += 1) {
        // Four local and two global inputs; each fourth source is inhibitory.
        sources[i * 6 + j] = j < 4
          ? (Math.floor(i / 16) * 16 + Math.floor(seededUnit(seed, i * 6 + j + 90) * 16))
          : Math.floor(seededUnit(seed, i * 6 + j + 90) * NEURON_COUNT);
      }
    }
    return snapshot(texture, pulse, pan, activity, adaptation, tick);
  }
  function step(input = {}) {
    const s = signals(input);
    if (s.disabled) return NEUTRAL_MODULATION; // Frozen: no background simulation.
    tick += 1;
    const stimulus = unit(0.8 * s.dread + 0.2 * s.density);
    adaptation += (stimulus - adaptation) * (stimulus > adaptation ? 0.004 : 0.0025);
    let fired = 0, firedLeft = 0, firedRight = 0;
    for (let i = 0; i < NEURON_COUNT; i += 1) {
      nextSpikes[i] = 0;
      fatigue[i] *= 0.986;
      if (refractory[i] > 0) { refractory[i] -= 1; continue; }
      let recurrent = 0;
      for (let j = 0; j < 6; j += 1) {
        const source = sources[i * 6 + j];
        recurrent += spikes[source] * (source % 4 === 3 ? -0.17 : 0.055);
      }
      const variation = seededUnit(seed, (tick * NEURON_COUNT + i) >>> 0);
      const sensitivity = 0.85 + seededUnit(seed, i + 800) * 0.3;
      const drive = (0.54 + s.depth * 0.25 + stimulus * 1.75 * (1 - adaptation * 0.72))
        * sensitivity * (s.quiet ? 0.8 : 1);
      voltage[i] = Math.max(0, Math.min(1.6, voltage[i] * 0.88
        + drive * 0.12 + recurrent + (variation - 0.5) * 0.12 - fatigue[i] * 0.03));
      if (voltage[i] >= 1) {
        voltage[i] = 0.12;
        refractory[i] = 2;
        fatigue[i] = Math.min(1, fatigue[i] + 0.15);
        nextSpikes[i] = 1;
        fired += 1;
        if (i < NEURON_COUNT / 2) firedLeft += 1; else firedRight += 1;
      }
    }
    spikes.set(nextSpikes);
    activity += (unit(fired / NEURON_COUNT * 8) - activity) * 0.12;
    left += (unit(firedLeft / (NEURON_COUNT / 2) * 8) - left) * 0.1;
    right += (unit(firedRight / (NEURON_COUNT / 2) * 8) - right) * 0.1;
    texture += (signed(activity * 2 - 0.55) - texture) * 0.045;
    pulse += (unit(activity * 1.5) - pulse) * 0.09;
    pan += (signed((left - right) * 5) - pan) * 0.05;
    return snapshot(texture, pulse, pan, activity, adaptation, tick);
  }
  reset(initialSeed);
  return Object.freeze({ reset, step });
}

/** A comparator: periodic movement + smoothed seeded noise, no recurrent
 * circuit or habituation. Same output bounds and audio adapter as B. */
export function createBaselineModulator(initialSeed = 0) {
  let seed, tick, noise, texture, pan;
  function reset(nextSeed = initialSeed) {
    seed = seedValue(nextSeed); tick = noise = texture = pan = 0;
    return snapshot(0, 0.5, 0, 0, 0, 0);
  }
  function step(input = {}) {
    const s = signals(input);
    if (s.disabled) return NEUTRAL_MODULATION;
    tick += 1;
    noise += (seededUnit(seed, tick) * 2 - 1 - noise) * 0.08;
    const time = tick * MODULATION_STEP_MS / 1000;
    const phase = seededUnit(seed, 41) * Math.PI * 2;
    const wave = Math.sin(time * (0.5 + s.dread * 0.6) + phase);
    const strength = (0.3 + s.dread * 0.5 + s.density * 0.2) * (s.quiet ? 0.8 : 1);
    texture += ((wave * 0.65 + noise * 0.35) * strength - texture) * 0.045;
    pan += (Math.sin(time * 0.35 + phase) * strength * 0.5 - pan) * 0.05;
    return snapshot(texture, (wave + 1) / 2, pan, 0, 0, tick);
  }
  reset(initialSeed);
  return Object.freeze({ reset, step });
}

export const TRIAL_SECONDS = 60;
const TRIAL = Object.freeze([
  [6, "静けさ", 0.12, 0.1], [10, "一度目の刺激", 0.9, 0.65],
  [14, "短い間", 0.12, 0.1], [32, "刺激を続ける", 0.9, 0.65],
  [50, "回復を待つ", 0.12, 0.1], [54, "もう一度の刺激", 0.9, 0.65],
  [60, "余韻", 0.12, 0.1]
].map(Object.freeze));

// Both A and B receive the exact same signals; no clicks or player data stored.
export function trialAtTick(tick) {
  const seconds = Math.max(0, finite(tick)) * MODULATION_STEP_MS / 1000;
  const stage = TRIAL.find(([end]) => seconds < end);
  if (!stage) return null;
  return Object.freeze({ label: stage[1], seconds,
    signals: Object.freeze({ depth: 0.55, dread: stage[2], density: stage[3], axis: "deep", phase: "deep" }) });
}

export function isValidModulation(value) {
  return Boolean(value) && ["texture", "pulse", "pan", "activity", "adaptation", "tick"]
    .every((key) => typeof value[key] === "number" && Number.isFinite(value[key]))
    && Math.abs(value.texture) <= 1 && Math.abs(value.pan) <= 1
    && value.pulse >= 0 && value.pulse <= 1 && value.activity >= 0 && value.activity <= 1
    && value.adaptation >= 0 && value.adaptation <= 1 && Number.isSafeInteger(value.tick) && value.tick >= 0;
}
