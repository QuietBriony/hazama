// Hazama Gate Run model v1
// Dependency-free mechanics shared by the browser runtime and balance smoke.
(function initHazamaGateRun(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.HazamaGateRun = api;
}(typeof globalThis !== "undefined" ? globalThis : window, function createHazamaGateRun() {
  const constants = Object.freeze({
    STABILITY_MAX: 100,
    RESONANCE_MAX: 100,
    GATE_RUN_MAX_CHARGE: 100,
    GATE_RUN_TURN_LIMIT: 14,
    GATE_SYNC_READY_RESONANCE: 18,
    GATE_SYNC_READY_CHARGE: 45,
    GATE_SYNC_MARK_CHARGE: 35,
    BREATH_HUB_STABILITY_CAP: 94,
    BREATH_FIELD_STABILITY_CAP: 86
  });

  function clampNumber(value, min, max) {
    const n = Number(value);
    if (!Number.isFinite(n)) return min;
    return Math.min(max, Math.max(min, n));
  }

  function hashText(input) {
    let h = 2166136261;
    const text = String(input || "");
    for (let i = 0; i < text.length; i += 1) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(16).padStart(8, "0");
  }

  function numericHash(input) {
    return parseInt(hashText(input).slice(0, 8), 16) || 0;
  }

  function cloneState(state) {
    return { ...(state || {}) };
  }

  function normalizeContext(context) {
    const src = context && typeof context === "object" ? context : {};
    const hubDepthId = typeof src.hubDepthId === "string" ? src.hubDepthId : "HUB_NIGHT";
    const startDepthId = typeof src.startDepthId === "string" ? src.startDepthId : "A_start";
    const depthId = typeof src.depthId === "string" ? src.depthId : hubDepthId;
    const currentDepthId = typeof src.currentDepthId === "string" ? src.currentDepthId : depthId;
    return {
      seed: typeof src.seed === "string" && src.seed ? src.seed : "balance-v0",
      depthId,
      currentDepthId,
      hubDepthId,
      startDepthId,
      hasHub: src.hasHub !== false,
      rank: Math.max(0, Number(src.rank) || 0),
      risk: Math.max(0, Number(src.risk) || 0),
      now: Number(src.now) || Date.now(),
      navigationLocked: src.navigationLocked === true
    };
  }

  function bonusFor(state, context, actionId) {
    const ctx = normalizeContext(context);
    return numericHash(`${ctx.seed}|${ctx.depthId}|${Math.max(0, Number(state?.gateRunTurns) || 0)}|${actionId}`) % 4;
  }

  function canSyncGate(state) {
    const src = state && typeof state === "object" ? state : {};
    return (
      src.resonance >= constants.GATE_SYNC_READY_RESONANCE &&
      src.gateRunCharge >= constants.GATE_SYNC_READY_CHARGE
    ) || (
      src.marks > 0 &&
      src.gateRunCharge >= constants.GATE_SYNC_MARK_CHARGE
    );
  }

  function breathDiminishForStreak(streak) {
    const n = Math.max(0, Number(streak) || 0);
    if (n <= 1) return { multiplier: 1, resonanceCap: 2, gateDelta: 0, turnCost: 0 };
    if (n === 2) return { multiplier: 0.65, resonanceCap: 1, gateDelta: -2, turnCost: 0 };
    if (n === 3) return { multiplier: 0.35, resonanceCap: 0, gateDelta: -4, turnCost: 1 };
    return { multiplier: 0.2, resonanceCap: 0, gateDelta: -6, turnCost: 1 };
  }

  function breathStabilityCap(depthId, context) {
    const ctx = normalizeContext({ ...(context || {}), depthId });
    return ctx.depthId === ctx.hubDepthId || ctx.depthId === ctx.startDepthId
      ? constants.BREATH_HUB_STABILITY_CAP
      : constants.BREATH_FIELD_STABILITY_CAP;
  }

  function resetBreathFields(state) {
    state.breathStreak = 0;
    state.lastBreathDepthId = "";
    state.lastBreathStep = 0;
  }

  function resetGateRunFields(state) {
    state.gateRunStatus = "running";
    state.gateRunTurns = 0;
    state.gateRunCharge = 0;
    state.lastGateAction = "";
    state.lastGateResult = "";
    state.gateRunOutcomeAt = 0;
  }

  function previewGateAction(state, context, actionId) {
    const src = state && typeof state === "object" ? state : {};
    const ctx = normalizeContext(context);
    const bonus = bonusFor(src, ctx, actionId);
    const closed = src.gateRunStatus !== "running" && actionId !== "retreat";
    const common = {
      actionId,
      bonus,
      closed,
      disabled: ctx.navigationLocked || closed,
      countsAsTurn: actionId !== "retreat",
      ready: canSyncGate(src),
      keepOmegaUnlocked: false,
      resetLost: false,
      targetDepthId: null,
      stabilityDelta: 0,
      resonanceDelta: 0,
      marksDelta: 0,
      chargeDelta: 0
    };

    if (actionId === "retreat") {
      const nextLoop = src.gateRunStatus === "won";
      return {
        ...common,
        disabled: ctx.navigationLocked,
        countsAsTurn: false,
        keepOmegaUnlocked: false,
        resetWon: nextLoop,
        resetLost: src.gateRunStatus === "lost",
        targetDepthId: ctx.currentDepthId !== ctx.hubDepthId && ctx.hasHub ? ctx.hubDepthId : null,
        stabilityDelta: nextLoop ? 12 : 22,
        resonanceDelta: nextLoop ? 0 : -4,
        chargeDelta: nextLoop ? -100 : -8
      };
    }

    if (actionId === "dive") {
      return {
        ...common,
        stabilityDelta: -(15 + Math.ceil(ctx.risk / 18)),
        resonanceDelta: 3,
        chargeDelta: 14 + Math.floor(ctx.rank / 5) + bonus
      };
    }

    if (actionId === "observe") {
      return {
        ...common,
        stabilityDelta: 3,
        resonanceDelta: 1,
        chargeDelta: 4 + (bonus % 3)
      };
    }

    if (actionId === "tune") {
      return {
        ...common,
        stabilityDelta: 6,
        resonanceDelta: 5,
        chargeDelta: 2 + (bonus % 3)
      };
    }

    if (actionId === "sync") {
      if (common.ready) {
        return {
          ...common,
          resonanceDelta: -16,
          marksDelta: src.marks > 0 ? -1 : 0,
          chargeDelta: 18 + Math.min(3, src.marks * 2) + (bonus % 4)
        };
      }
      return {
        ...common,
        stabilityDelta: -4,
        resonanceDelta: -2,
        chargeDelta: 2 + (bonus % 3)
      };
    }

    return { ...common, disabled: true };
  }

  function resolveGateOutcome(state, context) {
    const next = cloneState(state);
    const ctx = normalizeContext(context);
    const events = {
      lost: false,
      won: false,
      timeout: false
    };
    let targetDepthId = null;

    if (next.stability <= 0) {
      next.gateRunStatus = "lost";
      next.gateRunOutcomeAt = ctx.now;
      next.stability = Math.max(24, next.stability);
      next.resonance = clampNumber(next.resonance - 8, 0, constants.RESONANCE_MAX);
      next.gateRunCharge = clampNumber(Math.min(next.gateRunCharge, 72), 0, constants.GATE_RUN_MAX_CHARGE);
      targetDepthId = ctx.hasHub ? ctx.hubDepthId : ctx.startDepthId;
      events.lost = true;
    } else if (next.gateRunStatus !== "won" && next.gateRunCharge >= constants.GATE_RUN_MAX_CHARGE) {
      next.gateRunStatus = "won";
      next.gateRunCharge = constants.GATE_RUN_MAX_CHARGE;
      next.gateRunOutcomeAt = ctx.now;
      events.won = true;
    } else if (next.gateRunStatus === "running" && next.gateRunTurns >= constants.GATE_RUN_TURN_LIMIT) {
      next.gateRunStatus = "lost";
      next.gateRunOutcomeAt = ctx.now;
      next.stability = Math.max(24, next.stability);
      next.resonance = clampNumber(next.resonance - 8, 0, constants.RESONANCE_MAX);
      next.gateRunCharge = clampNumber(Math.min(next.gateRunCharge, 72), 0, constants.GATE_RUN_MAX_CHARGE);
      targetDepthId = ctx.hasHub ? ctx.hubDepthId : ctx.startDepthId;
      events.lost = true;
      events.timeout = true;
    }

    return { state: next, targetDepthId, events };
  }

  function applyGateAction(state, context, actionId) {
    const ctx = normalizeContext(context);
    let next = cloneState(state);
    const preview = previewGateAction(next, ctx, actionId);
    const events = {
      resetLost: false,
      resetWon: false,
      keepOmegaUnlocked: false,
      lost: false,
      won: false,
      timeout: false
    };
    let targetDepthId = preview.targetDepthId;

    if (preview.disabled) {
      return { state: next, preview, events, targetDepthId: null, changed: false };
    }

    if (preview.resetLost) {
      resetGateRunFields(next);
      events.resetLost = true;
    }
    if (preview.resetWon) {
      resetGateRunFields(next);
      events.resetWon = true;
    }
    if (preview.keepOmegaUnlocked) events.keepOmegaUnlocked = true;

    if (preview.countsAsTurn) next.gateRunTurns = Math.max(0, Number(next.gateRunTurns) || 0) + 1;
    next.stability = clampNumber((Number(next.stability) || 0) + preview.stabilityDelta, 0, constants.STABILITY_MAX);
    next.resonance = clampNumber((Number(next.resonance) || 0) + preview.resonanceDelta, 0, constants.RESONANCE_MAX);
    next.marks = clampNumber((Number(next.marks) || 0) + preview.marksDelta, 0, 99);
    next.gateRunCharge = clampNumber((Number(next.gateRunCharge) || 0) + preview.chargeDelta, 0, constants.GATE_RUN_MAX_CHARGE);
    next.lastGateAction = actionId;
    next.lastMoveType = actionId;
    resetBreathFields(next);

    const outcome = resolveGateOutcome(next, ctx);
    next = outcome.state;
    targetDepthId = outcome.targetDepthId || targetDepthId;
    events.lost = outcome.events.lost;
    events.won = outcome.events.won;
    events.timeout = outcome.events.timeout;

    return { state: next, preview, events, targetDepthId, changed: true };
  }

  function applyBreathReward(state, reward, context) {
    const ctx = normalizeContext(context);
    let next = cloneState(state);
    const sameBreathDepth = next.lastBreathDepthId === ctx.depthId;
    const nextStreak = sameBreathDepth ? Math.max(0, Number(next.breathStreak) || 0) + 1 : 1;
    const diminish = breathDiminishForStreak(nextStreak);
    const stabilityGain = Math.max(1, Math.round((Number(reward?.stabilityGain) || 0) * diminish.multiplier));
    const resonanceGain = Math.max(0, Math.min(diminish.resonanceCap, Number(reward?.resonanceGain) || 0));
    const cap = breathStabilityCap(ctx.depthId, ctx);
    const rawResonance = (Number(next.resonance) || 0) + resonanceGain;
    let markGain = nextStreak === 1 ? Math.max(0, Number(reward?.markGain) || 0) : 0;

    next.entries = Math.max(0, Number(next.entries) || 0) + 1;
    next.breathStreak = nextStreak;
    next.lastBreathDepthId = ctx.depthId;
    next.lastBreathStep = Math.max(0, Number(next.steps) || 0) + next.entries;
    next.stability = clampNumber(
      next.stability >= cap ? next.stability : Math.min(cap, (Number(next.stability) || 0) + stabilityGain),
      0,
      constants.STABILITY_MAX
    );
    next.gateRunCharge = clampNumber((Number(next.gateRunCharge) || 0) + diminish.gateDelta, 0, constants.GATE_RUN_MAX_CHARGE);
    if (next.gateRunStatus === "running") {
      next.gateRunTurns = Math.max(0, Number(next.gateRunTurns) || 0) + diminish.turnCost;
    }

    if (resonanceGain > 0 && rawResonance >= constants.RESONANCE_MAX) {
      next.resonance = 64 + (rawResonance % 9);
      markGain += 1;
    } else {
      next.resonance = clampNumber(rawResonance, 0, constants.RESONANCE_MAX);
    }
    next.marks = clampNumber((Number(next.marks) || 0) + markGain, 0, 99);

    const outcome = resolveGateOutcome(next, ctx);
    next = outcome.state;

    return {
      state: next,
      targetDepthId: outcome.targetDepthId,
      events: outcome.events,
      breath: {
        nextStreak,
        stabilityGain,
        resonanceGain,
        markGain,
        gateDelta: diminish.gateDelta,
        turnCost: diminish.turnCost,
        cap
      }
    };
  }

  return Object.freeze({
    constants,
    clampNumber,
    hashText,
    numericHash,
    canSyncGate,
    breathDiminishForStreak,
    breathStabilityCap,
    previewGateAction,
    applyGateAction,
    applyBreathReward,
    resolveGateOutcome
  });
}));
