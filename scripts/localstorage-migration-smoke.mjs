#!/usr/bin/env node

import { createServer } from "node:http";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);

let chromium;
try {
  ({ chromium } = require("playwright"));
} catch (_) {
  console.log("SKIP: localStorage migration smoke requires optional Playwright");
  process.exit(0);
}

const ROOT_DIR = fileURLToPath(new URL("..", import.meta.url)).replace(/[\\/]+$/, "");
const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".webp": "image/webp"
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function staticPath(pathname) {
  const cleanPath = decodeURIComponent(pathname.split("?")[0] || "/");
  const relative = cleanPath === "/" ? "index.html" : cleanPath.replace(/^\/+/, "");
  const resolved = normalize(join(ROOT_DIR, relative));
  if (!resolved.startsWith(ROOT_DIR + sep) && resolved !== ROOT_DIR) return null;
  return resolved;
}

function createStaticServer() {
  return createServer(async (req, res) => {
    try {
      const pathname = new URL(req.url || "/", "http://127.0.0.1").pathname;
      const filePath = staticPath(pathname);
      if (!filePath) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
      }
      const body = await readFile(filePath);
      res.writeHead(200, {
        "content-type": MIME_TYPES[extname(filePath)] || "application/octet-stream",
        "cache-control": "no-store"
      });
      res.end(body);
    } catch (_) {
      res.writeHead(404);
      res.end("Not found");
    }
  });
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
  });
}

async function waitStatus(page, text) {
  await page.waitForFunction(
    (expected) => document.getElementById("runtime-status")?.textContent === expected,
    text,
    { timeout: 5000 }
  );
}

async function storageSnapshot(page) {
  return page.evaluate(() => ({
    progress: JSON.parse(localStorage.getItem("hazama_progress") || "null"),
    run: JSON.parse(localStorage.getItem("hazama_run_v1") || "null"),
    seed: localStorage.getItem("hazama_seed"),
    oldState: localStorage.getItem("hazama_state_v2")
  }));
}

async function buttonByText(page, text) {
  return page.locator("button", { hasText: text }).first();
}

async function runCase(browser, baseUrl, testCase) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const consoleProblems = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") consoleProblems.push(`${msg.type()}: ${msg.text()}`);
  });
  page.on("pageerror", (error) => {
    consoleProblems.push(`pageerror: ${error.message}`);
  });

  await context.addInitScript((setup) => {
    localStorage.clear();
    for (const [key, value] of Object.entries(setup)) {
      if (value !== null) localStorage.setItem(key, value);
    }
  }, testCase.storage);

  try {
    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await testCase.verify(page);
    assert(consoleProblems.length === 0, `${testCase.name} console problems:\n- ${consoleProblems.join("\n- ")}`);
  } catch (error) {
    const snapshot = await page.evaluate(() => ({
      status: document.getElementById("runtime-status")?.textContent || "",
      progress: localStorage.getItem("hazama_progress") || "",
      run: localStorage.getItem("hazama_run_v1") || "",
      body: document.body.textContent.replace(/\s+/g, " ").trim().slice(0, 500)
    })).catch(() => ({}));
    console.error(`localStorage smoke snapshot (${testCase.name}): ${JSON.stringify(snapshot)}`);
    throw error;
  } finally {
    await context.close().catch(() => {});
  }
}

const cases = [
  {
    name: "old-progress-fallback",
    storage: {
      hazama_state_v2: JSON.stringify({
        version: "v2-old",
        currentDepthId: "HUB_NIGHT",
        seed: "legacy-progress-seed",
        ts: 1700000000000
      })
    },
    async verify(page) {
      await waitStatus(page, "OK: HUB_NIGHT");
      const snapshot = await storageSnapshot(page);
      assert(snapshot.progress?.nodeId === "HUB_NIGHT", "old progress did not migrate into hazama_progress");
      assert(snapshot.progress?.seed === "legacy-progress-seed", "old progress seed was not preserved");
      assert(snapshot.run?.lastDepthId === "HUB_NIGHT", "run state did not sync to migrated depth");
    }
  },
  {
    name: "partial-run-normalizes-and-locks-omega",
    storage: {
      hazama_seed: "partial-run-seed",
      hazama_progress: JSON.stringify({
        nodeId: "HUB_NIGHT",
        seed: "partial-run-seed",
        lastVisitedAt: 1700000000000
      }),
      hazama_run_v1: JSON.stringify({
        stability: 999,
        resonance: -12,
        marks: 120,
        gateRunStatus: "almost",
        gateRunTurns: -4,
        gateRunCharge: 1000,
        breathStreak: -2,
        lastMoveType: "warp",
        lastDepthId: "OLD"
      })
    },
    async verify(page) {
      await waitStatus(page, "OK: HUB_NIGHT");
      const omega = await buttonByText(page, "Ωの扉を試す");
      assert(await omega.isDisabled(), "partial non-won run unlocked the story Ω option");
      assert((await omega.innerText()).includes("扉100%で解放"), "locked Ω option lost its unlock hint");
      assert(await page.locator("[data-gate-omega]").count() === 0, "partial non-won run showed the Ω entry CTA");

      const snapshot = await storageSnapshot(page);
      assert(snapshot.run?.gateRunStatus === "running", "invalid gateRunStatus did not normalize to running");
      assert(snapshot.run?.gateRunCharge === 100, "gateRunCharge did not clamp to 100");
      assert(snapshot.run?.stability === 100, "stability did not clamp to max");
      assert(snapshot.run?.resonance === 0, "negative resonance did not clamp to 0");
      assert(snapshot.run?.marks === 99, "marks did not clamp to max");
      assert(snapshot.run?.lastMoveType === "observe", "invalid lastMoveType did not normalize");
    }
  },
  {
    name: "bad-progress-reset-recovers",
    storage: {
      hazama_seed: "bad-progress-seed",
      hazama_progress: JSON.stringify({
        nodeId: "MISSING_DEPTH",
        seed: "bad-progress-seed",
        lastVisitedAt: 1700000000000
      }),
      hazama_run_v1: "{bad json"
    },
    async verify(page) {
      await waitStatus(page, "OK: A_start");
      let snapshot = await storageSnapshot(page);
      assert(snapshot.progress?.nodeId === "A_start", "bad progress did not fall back to A_start");
      assert(snapshot.run?.gateRunStatus === "running", "bad run JSON did not recover to a running state");

      await page.locator("#reset-progress").click({ timeout: 5000 });
      await waitStatus(page, "OK: A_start");
      snapshot = await storageSnapshot(page);
      assert(snapshot.progress?.nodeId === "A_start", "reset did not keep startup at A_start");
      assert(snapshot.run?.gateRunStatus === "running", "reset did not recreate a running Gate Run");
      assert(snapshot.run?.gateRunCharge === 0, "reset did not clear Gate Run charge");
    }
  }
];

const server = createStaticServer();
const port = await listen(server);
const baseUrl = `http://127.0.0.1:${port}/index.html`;
const browser = await chromium.launch({ headless: true });

try {
  for (const testCase of cases) {
    await runCase(browser, baseUrl, testCase);
  }
  console.log("OK: localStorage migration smoke passed");
} finally {
  await browser.close().catch(() => {});
  await new Promise((resolve) => server.close(resolve));
}
