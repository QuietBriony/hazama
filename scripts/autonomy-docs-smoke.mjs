#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
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

function assertExists(relativePath) {
  assert(existsSync(repoPath(relativePath)), `missing required file: ${relativePath}`);
}

function assertIncludes(text, needle, label) {
  assert(text.includes(needle), `${label} missing: ${needle}`);
}

function backlogSection(backlog, itemId) {
  const start = backlog.indexOf(`### ${itemId} `);
  if (start === -1) return "";
  const next = backlog.indexOf("\n### ", start + 1);
  return next === -1 ? backlog.slice(start) : backlog.slice(start, next);
}

const requiredFiles = [
  "AGENTS.md",
  "docs/autonomy/README.md",
  "docs/autonomy/STACK-INDEX.md",
  "docs/autonomy/AUTONOMOUS-RUN.md",
  "docs/autonomy/BACKLOG.md",
  "docs/autonomy/SESSION-LEDGER.md",
  "docs/autonomy/browser-smoke-fallback.md",
  "docs/autonomy/closeout-checklist.md",
  "docs/autonomy/pwa-install-offline-checklist.md",
  "docs/autonomy/pwa-install-offline-result-template.md",
  "docs/autonomy/next-agent-prompts.md",
  "docs/playtest/first-playable-agent-pass-2026-05-16.md",
  "docs/playtest/gate-run-balance-decision-rubric.md",
  "docs/playtest/human-playtest-template.md",
  "docs/playtest/invite-ja.md",
  "docs/playtest/invite-en.md",
  "docs/playtest/first-round.md",
  "docs/COLLAB-CLAUDE-AND-CODEX.md"
];

for (const requiredFile of requiredFiles) assertExists(requiredFile);

// README は自律起動の core 接続と、参加者へ渡す試遊案内の入口を要求する。
// 深い自律手順の接続は docs/autonomy/README.md と STACK-INDEX.md 側で担保する。
const readme = read("README.md");
for (const needle of [
  "node scripts/hazama-check.mjs",
  "AGENTS.md",
  "docs/autonomy/STACK-INDEX.md",
  "docs/autonomy/AUTONOMOUS-RUN.md",
  "docs/autonomy/BACKLOG.md",
  "docs/autonomy/SESSION-LEDGER.md",
  "docs/playtest/invite-ja.md",
  "docs/playtest/invite-en.md",
  "docs/playtest/first-round.md",
  "docs/COLLAB-CLAUDE-AND-CODEX.md"
]) {
  assertIncludes(readme, needle, "README.md");
}

const autonomyIndex = read("docs/autonomy/README.md");
for (const needle of [
  "pwa-install-offline-checklist.md",
  "pwa-install-offline-result-template.md",
  "closeout-checklist.md",
  "next-agent-prompts.md",
  "browser-smoke-fallback.md",
  "harness-quality-checklist-candidate-001.md"
]) {
  assertIncludes(autonomyIndex, needle, "docs/autonomy/README.md");
}

const stackIndex = read("docs/autonomy/STACK-INDEX.md");
for (const needle of [
  "slice.js",
  "depths-shell.json",
  "hazama_spiral_v1",
  "build-consistency-smoke.mjs",
  "human-playtest-template.md"
]) {
  assertIncludes(stackIndex, needle, "docs/autonomy/STACK-INDEX.md");
}

// The English handout points to two real choices; keep its instructions in sync
// with the catalog rather than asking participants to guess an obsolete label.
const trialData = JSON.parse(read("depths-shell.json"));
const trialEnglish = JSON.parse(read("locales/en.json")).strings;
const englishInvite = read("docs/playtest/invite-en.md");
for (const [id, to] of [["A", "B_soma"], ["Omega", "reborn"]]) {
  const choice = trialData.nodes[id].choices.find((item) => item.to === to);
  const label = choice && trialEnglish[choice.t];
  assert(typeof label === "string" && label.length > 0, `English trial instruction has no catalog label: ${id} -> ${to}`);
  if (label) assertIncludes(englishInvite, label, "docs/playtest/invite-en.md");
}
for (const language of ["ja", "en"]) {
  assertIncludes(read(`docs/playtest/invite-${language}.md`), "https://quietbriony.github.io/hazama/", `invite-${language}`);
  assertIncludes(read("docs/playtest/first-round.md"), `invite-${language}.md`, "first-round.md");
}

const backlog = read("docs/autonomy/BACKLOG.md");
for (const itemId of ["HZ-BL-001", "HZ-BL-002"]) {
  const section = backlogSection(backlog, itemId);
  assert(section, `BACKLOG missing section: ${itemId}`);
  assertIncludes(section, "- human-gate: yes", `BACKLOG ${itemId}`);
  assertIncludes(section, "- status   : open", `BACKLOG ${itemId}`);
}

const ledger = read("docs/autonomy/SESSION-LEDGER.md");
const normalizedLedger = ledger.replaceAll("\u2014", "-");
for (const needle of [
  "## 2026-06-12 - 進化 E1",
  "## 2026-05-16 - Human-gate prep sprint",
  "## 2026-05-16 - Multi-agent backlog sprint",
  "## 2026-05-16 - Hazama autonomy engine import",
  "HZ-BL-001",
  "HZ-BL-002"
]) {
  assertIncludes(normalizedLedger, needle, "SESSION-LEDGER.md");
}

if (failures.length > 0) {
  console.error("autonomy-docs smoke FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("autonomy-docs smoke PASS");
