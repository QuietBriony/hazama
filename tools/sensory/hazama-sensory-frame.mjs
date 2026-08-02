const AXIS_COLOR = Object.freeze({
  soma: Object.freeze({ cents: -5, cutoffHz: -260, wobbleCents: 1 }),
  reso: Object.freeze({ cents: 4, cutoffHz: 360, wobbleCents: 2 }),
  casc: Object.freeze({ cents: 0, cutoffHz: -120, wobbleCents: 7 }),
  other: Object.freeze({ cents: 2, cutoffHz: 60, wobbleCents: 11 })
});

const TIER_BUDGET = Object.freeze({
  full: Object.freeze({ partials: 6, impulseSeconds: 2.8, wetScale: 1, frameIntervalMs: 33, visualComplexity: 1 }),
  balanced: Object.freeze({ partials: 4, impulseSeconds: 1.8, wetScale: 0.8, frameIntervalMs: 50, visualComplexity: 0.75 }),
  light: Object.freeze({ partials: 3, impulseSeconds: 0.8, wetScale: 0.45, frameIntervalMs: 67, visualComplexity: 0.45 }),
  static: Object.freeze({ partials: 0, impulseSeconds: 0, wetScale: 0, frameIntervalMs: 0, visualComplexity: 0 })
});

const PHASES = new Set(["surface", "drift", "deep", "bottom", "surfaced", "omega"]);

export function clamp01(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(1, number));
}

export function seededUnit(seed, salt = 0) {
  let value = ((Number(seed) >>> 0) ^ (Number(salt) >>> 0) ^ 0x9e3779b9) >>> 0;
  value ^= value >>> 16;
  value = Math.imul(value, 0x21f0aaad);
  value ^= value >>> 15;
  value = Math.imul(value, 0x735a2d97);
  value ^= value >>> 15;
  return (value >>> 0) / 4294967296;
}

function phaseFromDepth(depth) {
  return depth < 0.18 ? "surface" : depth < 0.45 ? "drift" : depth < 0.75 ? "deep" : "bottom";
}

function round(value, digits = 3) {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

/**
 * Candidate-only pure model for the shared Hazama sensory signal.
 * This module is not loaded by the production game. It keeps proposed audio
 * and visual budgets reviewable without changing route, storage, or PWA state.
 */
export function createSensoryFrame(input = {}) {
  const depth = clamp01(input.depth);
  const dread = clamp01(input.dread);
  const density = clamp01(input.density);
  const seed = Number(input.seed) >>> 0;
  const reducedMotion = Boolean(input.reducedMotion);
  const requestedTier = Object.hasOwn(TIER_BUDGET, input.tier) ? input.tier : "balanced";
  const tier = reducedMotion ? "static" : requestedTier;
  const budget = TIER_BUDGET[tier];
  const axisName = Object.hasOwn(AXIS_COLOR, input.axis) ? input.axis : "deep";
  const axis = AXIS_COLOR[axisName] || { cents: 0, cutoffHz: 0, wobbleCents: 0 };
  const phase = PHASES.has(input.phase) ? input.phase : phaseFromDepth(depth);
  const menace = dread * (0.3 + 0.7 * depth);
  const textureCents = (seededUnit(seed, 0x485a5346) * 24 - 12) * 0.6;
  const cutoffHz = Math.max(280, Math.min(2260, 1900 - depth * 1000 - dread * 250 + axis.cutoffHz));
  const wetGain = (0.1 + depth * 0.34) * budget.wetScale;

  return deepFreeze({
    version: 1,
    signals: {
      depth: round(depth),
      dread: round(dread),
      density: round(density),
      menace: round(menace),
      axis: axisName,
      phase,
      seed,
      tier,
      reducedMotion
    },
    audio: {
      baseHz: round(116 - depth * 40, 2),
      cutoffHz: round(cutoffHz, 1),
      masterGain: round(0.24 + dread * 0.06),
      wetGain: round(wetGain),
      lfoHz: round(0.05 + depth * 0.1),
      lfoCents: round(3 + depth * 10 + density * 4 + axis.wobbleCents),
      baseDetuneCents: round(axis.cents + textureCents, 2),
      pulseIntervalMs: Math.max(440, Math.round(1150 - dread * 680)),
      partialBudget: budget.partials,
      impulseSeconds: budget.impulseSeconds,
      transientScale: tier === "static" ? 0.7 : tier === "light" ? 0.82 : 1
    },
    visual: {
      animate: budget.frameIntervalMs > 0,
      frameIntervalMs: budget.frameIntervalMs,
      complexity: budget.visualComplexity
    }
  });
}

export const SENSORY_TIERS = Object.freeze(Object.keys(TIER_BUDGET));
