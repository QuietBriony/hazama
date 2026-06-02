#!/usr/bin/env node

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const GateRun = require("../hazama-gate-run.js");

function createState(overrides = {}) {
  return {
    depthId: "HUB_NIGHT",
    rank: 0,
    risk: 1,
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
    actions: [],
    ...overrides
  };
}

function modelContext(state) {
  return {
    seed: "balance-v0",
    depthId: state.depthId || "HUB_NIGHT",
    currentDepthId: state.depthId || "HUB_NIGHT",
    hubDepthId: "HUB_NIGHT",
    startDepthId: "A_start",
    hasHub: true,
    rank: state.rank ?? 0,
    risk: state.risk ?? 1,
    now: 1700000000000 + state.actions.length
  };
}

function applyGateAction(state, actionId) {
  const result = GateRun.applyGateAction(state, modelContext(state), actionId);
  Object.assign(state, result.state);
  if (result.targetDepthId) {
    state.depthId = result.targetDepthId;
    state.rank = result.targetDepthId === "HUB_NIGHT" ? 0 : state.rank;
    state.risk = result.targetDepthId === "HUB_NIGHT" ? 1 : state.risk;
  }
  if (result.changed) state.actions.push(actionId);
  if (result.events.lost) state.collapsed = true;
  return result;
}

function applyBreath(state) {
  const result = GateRun.applyBreathReward(state, {
    stabilityGain: 10,
    resonanceGain: 2,
    markGain: 0
  }, modelContext(state));
  Object.assign(state, result.state);
  if (result.targetDepthId) {
    state.depthId = result.targetDepthId;
    state.rank = result.targetDepthId === "HUB_NIGHT" ? 0 : state.rank;
    state.risk = result.targetDepthId === "HUB_NIGHT" ? 1 : state.risk;
  }
  state.actions.push("breath");
  if (result.events.lost) state.collapsed = true;
  return result;
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
  "late-sync"(state) {
    if (state.gateRunStatus === "lost") return "retreat";
    if (state.gateRunCharge < 70 && state.stability > 38) return "dive";
    if (!GateRun.canSyncGate(state)) return "tune";
    return "sync";
  },
  "retreat-retry"(state) {
    if (state.gateRunStatus === "lost") return "retreat";
    if (state.collapsed) {
      if (GateRun.canSyncGate(state)) return "sync";
      if (state.stability < 40) return "tune";
      return state.gateRunCharge < 82 ? "dive" : "tune";
    }
    return "dive";
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
    depth: state.depthId,
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

function previewRow(name, actionId, overrides = {}) {
  const state = createState(overrides);
  const preview = GateRun.previewGateAction(state, modelContext(state), actionId);
  return {
    name,
    action: actionId,
    ready: preview.ready,
    disabled: preview.disabled,
    stability: preview.stabilityDelta,
    resonance: preview.resonanceDelta,
    marks: preview.marksDelta,
    gate: preview.chargeDelta,
    target: preview.targetDepthId || "",
    keepOmega: preview.keepOmegaUnlocked,
    resetWon: preview.resetWon === true
  };
}

const results = Object.keys(policies).map((name) => simulate(name));
console.table(results.map(({ sequence, ...row }) => row));
for (const result of results) {
  console.log(`${result.policy}: ${result.sequence}`);
}

const previews = [
  previewRow("dive", "dive"),
  previewRow("observe", "observe"),
  previewRow("tune", "tune"),
  previewRow("sync-unready", "sync"),
  previewRow("sync-ready", "sync", {
    resonance: GateRun.constants.GATE_SYNC_READY_RESONANCE,
    gateRunCharge: GateRun.constants.GATE_SYNC_READY_CHARGE
  }),
  previewRow("retreat-low", "retreat", {
    depthId: "Q",
    rank: 17,
    risk: 48,
    stability: 22,
    gateRunCharge: 62,
    resonance: 20
  }),
  previewRow("retreat-won", "retreat", {
    depthId: "Z",
    rank: 26,
    risk: 42,
    gateRunStatus: "won",
    gateRunCharge: 100,
    resonance: 24
  })
];
console.table(previews);

const failures = [];
const breathSpam = results.find((r) => r.policy === "breath-spam");
const syncRush = results.find((r) => r.policy === "sync-rush");
const balanced = results.find((r) => r.policy === "balanced");
const safe = results.find((r) => r.policy === "safe");
const aggressive = results.find((r) => r.policy === "aggressive");
const lateSync = results.find((r) => r.policy === "late-sync");
const retreatRetry = results.find((r) => r.policy === "retreat-retry");
const previewByName = Object.fromEntries(previews.map((row) => [row.name, row]));

if (breathSpam?.unlocked) failures.push("breath-spam unlocked Ω");
if (syncRush?.unlocked && syncRush.actions < 8) failures.push("sync-rush unlocked Ω in fewer than 8 actions");
if (safe?.unlocked) failures.push("safe unlocked Ω; safe should stay stable without outperforming the mixed strategy");
if (!balanced?.unlocked || balanced.actions < 8 || balanced.actions > 12) {
  failures.push("balanced did not unlock Ω in 8-12 meaningful actions");
}
if (!lateSync?.unlocked || lateSync.actions < 8) failures.push("late-sync did not require a real setup window");
if (!retreatRetry?.collapsed || retreatRetry.depth !== "HUB_NIGHT") failures.push("retreat-retry did not demonstrate soft recovery through HUB");
if (!aggressive?.collapsed || aggressive.hardDeadEnd) {
  failures.push("aggressive did not produce a soft collapse");
}

if (!(previewByName.dive.gate > previewByName.observe.gate && previewByName.dive.stability < 0)) {
  failures.push("dive no longer reads as the risky main gate-charge action");
}
if (!(previewByName.observe.stability > 0 && previewByName.observe.gate < previewByName.dive.gate)) {
  failures.push("observe no longer reads as the safe, slow probing action");
}
if (!(previewByName.tune.stability > 0 && previewByName.tune.resonance >= 5 && previewByName.tune.gate <= 4)) {
  failures.push("tune no longer reads as preparation over gate rushing");
}
if (!(previewByName["sync-unready"].ready === false && previewByName["sync-unready"].gate <= 4 && previewByName["sync-unready"].resonance < 0)) {
  failures.push("unready sync no longer reads as a weak/failed connection");
}
if (!(previewByName["sync-ready"].ready === true && previewByName["sync-ready"].gate >= 18 && previewByName["sync-ready"].resonance < 0)) {
  failures.push("ready sync no longer reads as a resonance-spending finisher");
}
if (!(previewByName["retreat-low"].target === "HUB_NIGHT" && previewByName["retreat-low"].stability >= 20 && previewByName["retreat-low"].gate < 0)) {
  failures.push("low-state retreat no longer reads as HUB recovery with a gate cost");
}
if (!(previewByName["retreat-won"].target === "HUB_NIGHT" && previewByName["retreat-won"].resetWon && !previewByName["retreat-won"].keepOmega && previewByName["retreat-won"].gate < 0)) {
  failures.push("won retreat no longer starts a closed next loop");
}

const fieldBreath = createState({
  depthId: "P",
  rank: 16,
  risk: 45,
  stability: 80,
  resonance: 12,
  gateRunCharge: 50
});
applyBreath(fieldBreath);
applyBreath(fieldBreath);
applyBreath(fieldBreath);
applyBreath(fieldBreath);
if (fieldBreath.stability > GateRun.constants.BREATH_FIELD_STABILITY_CAP) {
  failures.push("field Breath Gate exceeded field stability cap");
}
if (fieldBreath.gateRunCharge >= 50) failures.push("repeated field Breath Gate did not push gate charge backward");

const wonRetreat = createState({
  gateRunStatus: "won",
  gateRunCharge: 100,
  resonance: 24,
  depthId: "Z",
  rank: 26,
  risk: 42
});
const wonRetreatResult = applyGateAction(wonRetreat, "retreat");
if (wonRetreat.gateRunStatus !== "running" || wonRetreat.gateRunCharge !== 0 || wonRetreatResult.targetDepthId !== "HUB_NIGHT") {
  failures.push("won retreat did not close Ω while returning to HUB");
}

if (wonRetreatResult.events.resetWon !== true) failures.push("won retreat did not report resetWon");

// --- 認識ゲート(attunement)＝Ωのハードな最終関門。資源(charge=won)だけでは開かない ---
// 設計: 構造読み(descend)で認識が育つ／表層読み(surface)は中立(0)／Ω = won かつ attuned。
const T = GateRun.tuning;
// 表層読みは中立(0)＝八観ルートは報酬だが認識は育たない
if (GateRun.recognitionGain("surface") !== 0) failures.push("surface read should be neutral (0 attunement)");
if (GateRun.recognitionGain("descend") <= 0) failures.push("structural read (descend) should grow attunement");

// won でも未 attuned なら Ω は開かない（反射・資源ゴリ押しでは抜けられない）
const wonNoAttune = createState({ gateRunStatus: "won", gateRunCharge: 100, attunement: 0 });
if (GateRun.omegaUnlocked(wonNoAttune)) failures.push("Ω opened on won without attunement (reflex/resource brute-force should not pass)");

// 構造読みを閾値ぶん積むと attuned になり、won と合わせて Ω が開く
let recog = createState({ gateRunStatus: "won", gateRunCharge: 100, attunement: 0 });
for (let i = 0; i < T.attuneOmegaThreshold; i += 1) {
  const r = GateRun.applyRecognition(recog, "descend");
  Object.assign(recog, r.state);
}
if (!GateRun.isAttuned(recog)) failures.push("structural reads up to threshold did not reach attuned");
if (!GateRun.omegaUnlocked(recog)) failures.push("won + attuned did not unlock Ω");

// 表層読みだけでは閾値に届かない（中立なので認識は伸びない）
let surfOnly = createState({ gateRunStatus: "won", gateRunCharge: 100, attunement: 0 });
for (let i = 0; i < T.attuneOmegaThreshold + 4; i += 1) {
  const r = GateRun.applyRecognition(surfOnly, "surface");
  Object.assign(surfOnly, r.state);
}
if (GateRun.isAttuned(surfOnly)) failures.push("surface-only reading reached attuned (should stay neutral)");
if (GateRun.omegaUnlocked(surfOnly)) failures.push("surface-only reading opened Ω (should require structural reads)");

if (failures.length) {
  console.error(`Balance smoke failed:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}

console.log("OK: balance smoke passed");
