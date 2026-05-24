#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createServer } from "node:net";

function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close(() => resolve(port));
    });
  });
}

function runStep(step) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const child = spawn(step.command, step.args, {
      cwd: process.cwd(),
      env: process.env,
      shell: false
    });

    let output = "";
    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stdout.write(text);
    });
    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stderr.write(text);
    });
    child.on("error", (error) => {
      resolve({
        ...step,
        code: 1,
        durationMs: Date.now() - startedAt,
        output: String(error)
      });
    });
    child.on("close", (code) => {
      resolve({
        ...step,
        code: code ?? 1,
        durationMs: Date.now() - startedAt,
        output
      });
    });
  });
}

const startupPort = await freePort();
const steps = [
  {
    name: "autonomy-docs",
    command: "node",
    args: ["scripts/autonomy-docs-smoke.mjs"]
  },
  {
    name: "pwa-static-contract",
    command: "node",
    args: ["scripts/pwa-static-contract-smoke.mjs"]
  },
  {
    name: "hazama-consistency",
    command: "node",
    args: ["scripts/hazama-consistency-smoke.mjs"]
  },
  {
    name: "balance",
    command: "node",
    args: ["scripts/balance-smoke.mjs"]
  },
  {
    name: "first-playable",
    command: "node",
    args: ["scripts/first-playable-smoke.mjs"]
  },
  {
    name: "startup",
    command: "bash",
    args: ["scripts/startup-smoke.sh", String(startupPort)]
  },
  {
    name: "localstorage-migration",
    command: "node",
    args: ["scripts/localstorage-migration-smoke.mjs"],
    optionalSkip: true
  },
  {
    name: "browser-first-playable",
    command: "node",
    args: ["scripts/browser-first-playable-smoke.mjs"],
    optionalSkip: true
  }
];

const results = [];
for (const step of steps) {
  console.log(`\n== ${step.name} ==`);
  results.push(await runStep(step));
}

let pass = 0;
let fail = 0;
let skip = 0;
for (const result of results) {
  const skipped = result.optionalSkip && /\bSKIP\b/i.test(result.output);
  if (result.code === 0 && skipped) {
    skip += 1;
  } else if (result.code === 0) {
    pass += 1;
  } else {
    fail += 1;
  }
}

console.log("\nHazama check summary");
for (const result of results) {
  const skipped = result.optionalSkip && /\bSKIP\b/i.test(result.output);
  const status = result.code === 0 ? (skipped ? "SKIP" : "PASS") : "FAIL";
  console.log(`- ${status}: ${result.name} (${Math.round(result.durationMs / 100) / 10}s)`);
}
console.log(`${pass} PASS / ${fail} FAIL / ${skip} SKIP`);

if (fail > 0) process.exit(1);
