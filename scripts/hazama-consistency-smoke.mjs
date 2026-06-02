#!/usr/bin/env node

import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function repoPath(relativePath) {
  return path.join(root, relativePath);
}

function read(relativePath) {
  return readFileSync(repoPath(relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function assertIncludes(text, needle, label) {
  assert(text.includes(needle), `${label} missing: ${needle}`);
}

function appVersionFromMain(main) {
  const match = main.match(/const APP_VERSION = "v([^"]+)";/);
  assert(Boolean(match), "hazama-main.js APP_VERSION not found");
  return match?.[1] || "";
}

function linkedVersionedAssets(html) {
  return [...html.matchAll(/(?:href|src)="([^"]+\?v=([^"]+))"/g)]
    .map((match) => ({ asset: match[1], version: match[2] }));
}

function hasOption(depths, fromId, toId) {
  return Boolean(depths[fromId]?.options?.some((option) => option?.next === toId));
}

const main = read("hazama-main.js");
const gate = read("hazama-gate-run.js");
const style = read("hazama-style.css");
const indexHtml = read("index.html");
const altHtml = read("hazama-index.html");
const sw = read("sw.js");
const startupSmoke = read("scripts/startup-smoke.sh");
const browserSmoke = read("scripts/browser-first-playable-smoke.mjs");
const pwaSmoke = read("scripts/pwa-static-contract-smoke.mjs");
const gamePlan = read("docs/hazama-game-dev-plan.md");
const playtestSlices = read("docs/hazama-playtest-slices-v0.md");
const readme = read("README.md");
const depths = JSON.parse(read("hazama-depths.json"));

const appVersion = appVersionFromMain(main);
const appVersionLabel = `v${appVersion}`;
const cacheVersion = `hazama-pwa-v${appVersion}`;

assert(indexHtml === altHtml, "index.html and hazama-index.html must stay identical");
assertIncludes(main, `Hazama main.js ${appVersionLabel}`, "hazama-main.js");
assertIncludes(sw, `const VERSION = "${cacheVersion}";`, "sw.js");
assertIncludes(pwaSmoke, `const APP_VERSION = "${appVersion}";`, "pwa-static-contract smoke");
assertIncludes(browserSmoke, cacheVersion, "browser-first-playable smoke");
assertIncludes(startupSmoke, `Hazama main.js ${appVersionLabel}`, "startup smoke");
assertIncludes(startupSmoke, cacheVersion, "startup smoke");

for (const [htmlName, html] of [
  ["index.html", indexHtml],
  ["hazama-index.html", altHtml]
]) {
  const assets = linkedVersionedAssets(html);
  for (const requiredAsset of [
    "hazama-style.css",
    "hazama-seed.js",
    "hazama-state.js",
    "hazama-gate-run.js",
    "hazama-main.js"
  ]) {
    assert(
      assets.some(({ asset, version }) => asset === `${requiredAsset}?v=${appVersion}` && version === appVersion),
      `${htmlName} missing current version asset: ${requiredAsset}?v=${appVersion}`
    );
  }
  for (const { asset, version } of assets) {
    assert(version === appVersion, `${htmlName} has drifted asset version ${version}: ${asset}`);
  }
}

const missingEdges = [];
const incoming = Object.fromEntries(Object.keys(depths).map((id) => [id, 0]));
for (const [id, depth] of Object.entries(depths)) {
  assert(depth?.id === id, `depth id mismatch for ${id}`);
  assert(Array.isArray(depth?.story), `depth ${id} story must be an array`);
  assert(Array.isArray(depth?.options), `depth ${id} options must be an array`);
  for (const option of depth.options || []) {
    if (!depths[option?.next]) {
      missingEdges.push(`${id} -> ${option?.next || "(missing)"}`);
    } else {
      incoming[option.next] += 1;
    }
  }
}
assert(missingEdges.length === 0, `depth graph has missing next targets: ${missingEdges.join(", ")}`);

// 到達性は旧サーフェス(options[])と新サーフェス(depthMeta.choices)の和で辿る
// （統合で det_*(八観ルート)/hold は depthMeta.choices からのみ到達するため。INTEGRATION.md §8）。
function outgoingTargets(node) {
  const targets = [];
  for (const option of node?.options || []) {
    if (option?.next) targets.push(option.next);
  }
  for (const choice of node?.depthMeta?.choices || []) {
    // 仮想ターゲット(__rejoin 等)は除外。実在ノードのみ辿る
    if (choice?.next && !choice.next.startsWith("__")) targets.push(choice.next);
  }
  return targets;
}
const reachable = new Set(["A_start"]);
const queue = ["A_start"];
while (queue.length) {
  const id = queue.shift();
  for (const next of outgoingTargets(depths[id])) {
    if (depths[next] && !reachable.has(next)) {
      reachable.add(next);
      queue.push(next);
    }
  }
}
const unreachable = Object.keys(depths).filter((id) => !reachable.has(id));
assert(unreachable.length === 0, `depth graph has unreachable nodes from A_start: ${unreachable.join(", ")}`);

assert(hasOption(depths, "A_start", "HUB_NIGHT"), "A_start must route to HUB_NIGHT");
assert(hasOption(depths, "HUB_NIGHT", "Ω"), "HUB_NIGHT must expose locked Ω attempt");
assert(hasOption(depths, "Ω", "A_reborn"), "Ω must route to A_reborn");
assert(hasOption(depths, "A_reborn", "HUB_NIGHT"), "A_reborn must return to HUB_NIGHT");

assertIncludes(main, 'function canEnterOmega(state = getRunState())', "hazama-main.js");
// 認識ゲート(統合): Ωは omegaUnlocked(won かつ attuned) で解放。資源だけでは開かない。
assertIncludes(main, 'GateRunModel.omegaUnlocked', "hazama-main.js");
assertIncludes(main, 'GateRunModel.applyRecognition', "hazama-main.js");
assertIncludes(main, 'renderDepthBodyMarkup', "hazama-main.js");
assertIncludes(main, 'renderDepthMetaChoices', "hazama-main.js");
assertIncludes(main, "次周回開始 / Ωは閉じた", "hazama-main.js");
assertIncludes(main, "次周回: HUBへ戻るとΩは閉じる", "hazama-main.js");
assertIncludes(main, "次にやること", "hazama-main.js");
assertIncludes(main, "hz-loop-priority", "hazama-main.js");
assertIncludes(main, "BGM: 同じ画面推奨", "hazama-main.js");
assertIncludes(main, "今のノリ", "hazama-main.js");
assertIncludes(main, "hz-gate-pulse", "hazama-main.js");
assertIncludes(main, "おすすめ", "hazama-main.js");
assertIncludes(gate, "resetWon", "hazama-gate-run.js");
assertIncludes(gate, "keepOmegaUnlocked: false", "hazama-gate-run.js");
assertIncludes(style, "hz-loop-priority", "hazama-style.css");
assertIncludes(style, "hz-gate-pulse", "hazama-style.css");
assertIncludes(style, "hz-gate-action--recommended", "hazama-style.css");

assertIncludes(gamePlan, `Hazama ${appVersionLabel}`, "docs/hazama-game-dev-plan.md");
assert(!gamePlan.includes("Hazama v2.34 is"), "game dev plan still describes current app as v2.34");
assertIncludes(gamePlan, "same-screen generated BGM", "docs/hazama-game-dev-plan.md");
assertIncludes(gamePlan, "post-story `展開` panel", "docs/hazama-game-dev-plan.md");
assertIncludes(playtestSlices, `${appVersionLabel} first playable`, "docs/hazama-playtest-slices-v0.md");
assert(!playtestSlices.includes("Make the v2.34"), "playtest slices still describe current goal as v2.34");
assertIncludes(playtestSlices, "same-screen BGM", "docs/hazama-playtest-slices-v0.md");
assertIncludes(playtestSlices, "Ω on the next loop", "docs/hazama-playtest-slices-v0.md");
assertIncludes(readme, `hazama-main.js?v=${appVersion}`, "README.md");
assertIncludes(readme, `## ${appVersionLabel}`, "README.md");

// v2.40 統合サーフェス(アート/音/タイトル/沈下HUD)が実体として在ることを検証(INTEGRATION.md §8-3)。
// 1信号で絵・音・テキストを駆動する applyAtmosphere フックと、各 canvas/HUD 要素・CSS規則。
assertIncludes(main, "const HazamaAtmos", "hazama-main.js atmosphere module");
assertIncludes(main, "function applyAtmosphere", "hazama-main.js atmosphere hook");
assertIncludes(main, "inlineBgmGlitchHit", "hazama-main.js glitch-synced BGM tear");
assertIncludes(main, "function updateSinkHud", "hazama-main.js sink HUD");
assertIncludes(main, "applyVoiceCycle", "hazama-main.js cycle text mutation");
for (const html of [indexHtml, altHtml]) {
  assertIncludes(html, 'id="hz-garden"', "html inverted-garden canvas");
  assertIncludes(html, 'id="hz-mandala"', "html mandala canvas");
  assertIncludes(html, 'id="hz-sink-hud"', "html sink HUD surface");
  assertIncludes(html, 'data-text="Hazama"', "html distressed structural title");
}
assertIncludes(style, ".hz-garden", "hazama-style.css garden layer");
assertIncludes(style, ".hz-sink-fill", "hazama-style.css sink gauge");
assertIncludes(style, "hzPeel", "hazama-style.css peel transition");

if (failures.length > 0) {
  console.error("hazama-consistency smoke FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("hazama-consistency smoke PASS");
