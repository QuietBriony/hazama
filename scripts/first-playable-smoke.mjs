#!/usr/bin/env node

import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";

const require = createRequire(import.meta.url);
const GateRun = require("../hazama-gate-run.js");

const DEPTHS_PATH = new URL("../hazama-depths.json", import.meta.url);
const depths = JSON.parse(await readFile(DEPTHS_PATH, "utf8"));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function hasOption(fromId, toId) {
  return Array.isArray(depths[fromId]?.options)
    && depths[fromId].options.some((option) => option?.next === toId);
}

function createRunState() {
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
    actions: []
  };
}

function context(state) {
  return {
    seed: "first-playable-smoke",
    depthId: state.depthId,
    currentDepthId: state.depthId,
    hubDepthId: "HUB_NIGHT",
    startDepthId: "A_start",
    hasHub: true,
    rank: state.rank,
    risk: state.risk,
    now: 1700000100000 + state.actions.length
  };
}

function nextBalancedAction(state) {
  if (state.gateRunStatus === "lost") return "retreat";
  if (GateRun.canSyncGate(state)) return "sync";
  if (state.stability <= 24) return "tune";
  if (state.gateRunCharge >= 78 && state.stability > 36) return "dive";
  if (state.gateRunCharge < 45 && state.stability > 36) return "dive";
  if (state.resonance < 18) return "tune";
  if (state.gateRunCharge < 82 && state.stability > 34) return "dive";
  return "observe";
}

function applyAction(state, actionId) {
  const result = GateRun.applyGateAction(state, context(state), actionId);
  Object.assign(state, result.state);
  if (result.targetDepthId) state.depthId = result.targetDepthId;
  if (result.changed) state.actions.push(actionId);
  return result;
}

for (const id of ["A_start", "HUB_NIGHT", "Ω", "A_reborn"]) {
  assert(depths[id], `missing first-playable depth: ${id}`);
}

assert(hasOption("A_start", "HUB_NIGHT"), "A_start does not lead to HUB_NIGHT");
assert(hasOption("HUB_NIGHT", "Ω"), "HUB_NIGHT does not expose the locked Ω attempt");
assert(hasOption("Ω", "A_reborn"), "Ω does not lead to A_reborn");
assert(hasOption("A_reborn", "HUB_NIGHT"), "A_reborn does not return to HUB_NIGHT");

const state = createRunState();
assert(state.gateRunStatus !== "won", "fresh run starts with Ω unlocked");

for (let i = 0; i < 14 && state.gateRunStatus !== "won"; i += 1) {
  applyAction(state, nextBalancedAction(state));
}

assert(state.gateRunStatus === "won", "balanced first playable policy did not open Ω");
assert(state.actions.length >= 8 && state.actions.length <= 12, "balanced first playable policy opened Ω outside the 8-12 action window");
assert(state.gateRunCharge === GateRun.constants.GATE_RUN_MAX_CHARGE, "won Gate Run did not clamp gate charge to 100");

const summary = {
  route: "A_start -> HUB_NIGHT -> Gate Run won -> Ω -> A_reborn -> HUB_NIGHT",
  actions: state.actions.length,
  turns: state.gateRunTurns,
  stability: Math.round(state.stability),
  resonance: Math.round(state.resonance),
  gate: Math.round(state.gateRunCharge),
  sequence: state.actions.join(",")
};

console.table([summary]);
console.log("OK: first playable smoke passed");
