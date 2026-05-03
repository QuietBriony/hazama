#!/usr/bin/env node

const STABILITY_MAX = 100;
const RESONANCE_MAX = 100;
const GATE_RUN_MAX_CHARGE = 100;
const GATE_RUN_TURN_LIMIT = 14;
const GATE_SYNC_READY_RESONANCE = 18;
const GATE_SYNC_READY_CHARGE = 45;
const GATE_SYNC_MARK_CHARGE = 35;
const BREATH_HUB_STABILITY_CAP = 94;

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

function createState() {
  return {
    stability: 76,
    resonance: 0,
    marks: 0,
    gateRunStatus: "running",
    gateRunTurns: 0,
    gateRunCharge: 0,
    breathStreak: 0,
    collapsed: false,
    hardDeadEnd: false,
    actions: []
  };
}

function canSyncGate(state) {
  return (
    state.resonance >= GATE_SYNC_READY_RESONANCE &&
    state.gateRunCharge >= GATE_SYNC_READY_CHARGE
  ) || (
    state.marks > 0 &&
    state.gateRunCharge >= GATE_SYNC_MARK_CHARGE
  );
}

function breathDiminishForStreak(streak) {
  if (streak <= 1) return { multiplier: 1, resonanceCap: 2, gateDelta: 0, turnCost: 0 };
  if (streak === 2) return { multiplier: 0.65, resonanceCap: 1, gateDelta: -2, turnCost: 0 };
  if (streak === 3) return { multiplier: 0.35, resonanceCap: 0, gateDelta: -4, turnCost: 1 };
  return { multiplier: 0.2, resonanceCap: 0, gateDelta: -6, turnCost: 1 };
}

function bonusFor(state, actionId) {
  return numericHash(`balance-v0|HUB_NIGHT|${state.gateRunTurns}|${actionId}`) % 4;
}

function resolveOutcome(state) {
  if (state.stability <= 0) {
    state.gateRunStatus = "lost";
    state.collapsed = true;
    state.stability = 24;
    state.resonance = clampNumber(state.resonance - 8, 0, RESONANCE_MAX);
    state.gateRunCharge = clampNumber(Math.min(state.gateRunCharge, 72), 0, GATE_RUN_MAX_CHARGE);
  } else if (state.gateRunStatus !== "won" && state.gateRunCharge >= GATE_RUN_MAX_CHARGE) {
    state.gateRunStatus = "won";
    state.gateRunCharge = GATE_RUN_MAX_CHARGE;
  } else if (state.gateRunStatus === "running" && state.gateRunTurns >= GATE_RUN_TURN_LIMIT) {
    state.gateRunStatus = "lost";
    state.collapsed = true;
    state.stability = Math.max(24, state.stability);
    state.resonance = clampNumber(state.resonance - 8, 0, RESONANCE_MAX);
    state.gateRunCharge = clampNumber(Math.min(state.gateRunCharge, 72), 0, GATE_RUN_MAX_CHARGE);
  }
}

function applyGateAction(state, actionId) {
  if (state.gateRunStatus !== "running" && actionId !== "retreat") return;

  const bonus = bonusFor(state, actionId);
  let stabilityDelta = 0;
  let resonanceDelta = 0;
  let chargeDelta = 0;
  let marksDelta = 0;
  const countsAsTurn = actionId !== "retreat";

  if (actionId === "retreat") {
    if (state.gateRunStatus === "lost") {
      state.gateRunStatus = "running";
      state.gateRunTurns = 0;
      state.gateRunCharge = 0;
    }
    stabilityDelta = 22;
    resonanceDelta = -4;
    chargeDelta = -8;
  } else if (actionId === "dive") {
    stabilityDelta = -16;
    resonanceDelta = 3;
    chargeDelta = 14 + bonus;
  } else if (actionId === "observe") {
    stabilityDelta = 3;
    resonanceDelta = 1;
    chargeDelta = 4 + (bonus % 3);
  } else if (actionId === "tune") {
    stabilityDelta = 6;
    resonanceDelta = 5;
    chargeDelta = 2 + (bonus % 3);
  } else if (actionId === "sync") {
    if (canSyncGate(state)) {
      resonanceDelta = -16;
      marksDelta = state.marks > 0 ? -1 : 0;
      chargeDelta = 18 + Math.min(3, state.marks * 2) + (bonus % 4);
    } else {
      stabilityDelta = -4;
      resonanceDelta = -2;
      chargeDelta = 2 + (bonus % 3);
    }
  }

  if (countsAsTurn) state.gateRunTurns += 1;
  state.stability = clampNumber(state.stability + stabilityDelta, 0, STABILITY_MAX);
  state.resonance = clampNumber(state.resonance + resonanceDelta, 0, RESONANCE_MAX);
  state.marks = clampNumber(state.marks + marksDelta, 0, 99);
  state.gateRunCharge = clampNumber(state.gateRunCharge + chargeDelta, 0, GATE_RUN_MAX_CHARGE);
  state.breathStreak = 0;
  state.actions.push(actionId);
  resolveOutcome(state);
}

function applyBreath(state) {
  const nextStreak = state.breathStreak + 1;
  const diminish = breathDiminishForStreak(nextStreak);
  const stabilityGain = Math.max(1, Math.round(10 * diminish.multiplier));
  const resonanceGain = Math.max(0, Math.min(diminish.resonanceCap, 2));

  state.breathStreak = nextStreak;
  state.stability = state.stability >= BREATH_HUB_STABILITY_CAP
    ? state.stability
    : Math.min(BREATH_HUB_STABILITY_CAP, state.stability + stabilityGain);
  state.resonance = clampNumber(state.resonance + resonanceGain, 0, RESONANCE_MAX);
  state.gateRunCharge = clampNumber(state.gateRunCharge + diminish.gateDelta, 0, GATE_RUN_MAX_CHARGE);
  if (state.gateRunStatus === "running") state.gateRunTurns += diminish.turnCost;
  state.actions.push("breath");
  resolveOutcome(state);
}

const policies = {
  aggressive(state) {
    return state.gateRunStatus === "lost" ? "retreat" : "dive";
  },
  safe(state) {
    if (state.gateRunStatus === "lost" || state.stability < 38) return "retreat";
    if (state.gateRunTurns >= 12) return "retreat";
    return state.resonance < 16 ? "tune" : "observe";
  },
  "breath-spam"() {
    return "breath";
  },
  "sync-rush"() {
    return "sync";
  },
  balanced(state) {
    if (state.gateRunStatus === "lost") return "retreat";
    if (canSyncGate(state)) return "sync";
    if (state.stability <= 24) return "tune";
    if (state.gateRunCharge >= 78 && state.stability > 36) return "dive";
    if (state.gateRunCharge < 45 && state.stability > 36) return "dive";
    if (state.resonance < 18) return "tune";
    if (state.gateRunCharge < 82 && state.stability > 34) return "dive";
    return "observe";
  }
};

function simulate(policyName, limit = 18) {
  const state = createState();
  const policy = policies[policyName];
  for (let i = 0; i < limit && state.gateRunStatus !== "won"; i += 1) {
    const action = policy(state);
    if (action === "breath") applyBreath(state);
    else applyGateAction(state, action);
  }
  return {
    policy: policyName,
    unlocked: state.gateRunStatus === "won",
    collapsed: state.collapsed,
    hardDeadEnd: state.hardDeadEnd,
    actions: state.actions.length,
    turns: state.gateRunTurns,
    stability: Math.round(state.stability),
    resonance: Math.round(state.resonance),
    gate: Math.round(state.gateRunCharge),
    sequence: state.actions.join(",")
  };
}

const results = Object.keys(policies).map((name) => simulate(name));
console.table(results.map(({ sequence, ...row }) => row));
for (const result of results) {
  console.log(`${result.policy}: ${result.sequence}`);
}

const failures = [];
const breathSpam = results.find((r) => r.policy === "breath-spam");
const syncRush = results.find((r) => r.policy === "sync-rush");
const balanced = results.find((r) => r.policy === "balanced");
const aggressive = results.find((r) => r.policy === "aggressive");

if (breathSpam?.unlocked) failures.push("breath-spam unlocked Ω");
if (syncRush?.unlocked && syncRush.actions < 8) failures.push("sync-rush unlocked Ω in fewer than 8 actions");
if (!balanced?.unlocked || balanced.actions < 8 || balanced.actions > 12) {
  failures.push("balanced did not unlock Ω in 8-12 meaningful actions");
}
if (aggressive?.collapsed && aggressive.hardDeadEnd) failures.push("aggressive collapse became a hard dead end");

if (failures.length) {
  console.error(`Balance smoke failed:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}

console.log("OK: balance smoke passed");
