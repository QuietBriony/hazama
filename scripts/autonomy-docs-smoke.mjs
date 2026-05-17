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
  "docs/COLLAB-CLAUDE-AND-CODEX.md"
];

for (const requiredFile of requiredFiles) assertExists(requiredFile);

const readme = read("README.md");
for (const needle of [
  "node scripts/hazama-check.mjs",
  "AGENTS.md",
  "docs/autonomy/STACK-INDEX.md",
  "docs/autonomy/AUTONOMOUS-RUN.md",
  "docs/autonomy/BACKLOG.md",
  "docs/autonomy/SESSION-LEDGER.md",
  "docs/autonomy/pwa-install-offline-checklist.md",
  "docs/autonomy/pwa-install-offline-result-template.md",
  "docs/autonomy/closeout-checklist.md",
  "docs/autonomy/next-agent-prompts.md",
  "docs/autonomy/browser-smoke-fallback.md",
  "docs/playtest/gate-run-balance-decision-rubric.md",
  "docs/playtest/human-playtest-template.md",
  "scripts/pwa-static-contract-smoke.mjs",
  "docs/COLLAB-CLAUDE-AND-CODEX.md"
]) {
  assertIncludes(readme, needle, "README.md");
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
