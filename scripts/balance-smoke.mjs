#!/usr/bin/env node

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const GateRun = require("../hazama-gate-run.js");

function createState() {
  return {
    stability: 76,
    resonance: 0,
    marks: 0,
    gateRunStatus: "running",
    gateRunTurns: 0,
    gateRunCharge: 0,
    breathStreak: 0,
    lastBreathDepthId: "",
    lastBreathStep: 0,
    lastGateAction: "",
    lastGateResult: "",
    lastMoveType: "observe",
    gateRunOutcomeAt: 0,
    collapsed: false,
    hardDeadEnd: false,
    actions: []
  };
}

function modelContext(state) {
  return {
    seed: "balance-v0",
    depthId: "HUB_NIGHT",
    currentDepthId: "HUB_NIGHT",
    hubDepthId: "HUB_NIGHT",
    startDepthId: "A_start",
    hasHub: true,
    rank: 0,
    risk: 1,
    now: 1700000000000 + state.actions.length
  };
}

function applyGateAction(state, actionId) {
  const result = GateRun.applyGateAction(state, modelContext(state), actionId);
  Object.assign(state, result.state);
  if (result.changed) state.actions.push(actionId);
  if (result.events.lost) state.collapsed = true;
}

function applyBreath(state) {
  const result = GateRun.applyBreathReward(state, {
    stabilityGain: 10,
    resonanceGain: 2,
    markGain: 0
  }, modelContext(state));
  Object.assign(state, result.state);
  state.actions.push("breath");
  if (result.events.lost) state.collapsed = true;
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
    if (GateRun.canSyncGate(state)) return "sync";
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
