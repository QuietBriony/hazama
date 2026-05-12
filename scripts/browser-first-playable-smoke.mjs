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
  console.log("SKIP: browser first playable smoke requires optional Playwright");
  process.exit(0);
}

const ROOT_DIR = fileURLToPath(new URL("..", import.meta.url)).replace(/[\\/]+$/, "");
const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png"
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

async function buttonText(page, text) {
  return page.locator("button", { hasText: text }).first();
}

async function clickButtonText(page, text) {
  const button = await buttonText(page, text);
  await button.click({ timeout: 5000 });
}

async function progress(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem("hazama_progress") || "{}"));
}

async function waitProgress(page, nodeId) {
  await page.waitForFunction(
    (expected) => JSON.parse(localStorage.getItem("hazama_progress") || "{}").nodeId === expected,
    nodeId,
    { timeout: 5000 }
  );
}

async function runState(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem("hazama_run_v1") || "{}"));
}

async function nextBalancedAction(page) {
  return page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("hazama_run_v1") || "{}");
    if (state.gateRunStatus === "lost") return "retreat";
    if (window.HazamaGateRun?.canSyncGate?.(state)) return "sync";
    if (state.stability <= 24) return "tune";
    if (state.gateRunCharge >= 78 && state.stability > 36) return "dive";
    if (state.gateRunCharge < 45 && state.stability > 36) return "dive";
    if (state.resonance < 18) return "tune";
    if (state.gateRunCharge < 82 && state.stability > 34) return "dive";
    return "observe";
  });
}

async function clickGateAction(page, actionId) {
  await page.locator(`[data-gate-action="${actionId}"]`).first().click({ timeout: 5000 });
  await page.waitForTimeout(40);
}

const server = createStaticServer();
const port = await listen(server);
const baseUrl = `http://127.0.0.1:${port}/index.html`;
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2
});
const consoleProblems = [];
let mainPage = null;

context.on("page", async (popup) => {
  if (!mainPage || popup === mainPage) return;
  await popup.waitForLoadState("domcontentloaded", { timeout: 1000 }).catch(() => {});
  await popup.close().catch(() => {});
});

const page = await context.newPage();
mainPage = page;
page.on("console", (msg) => {
  const text = msg.text();
  if (msg.type() === "error" || /postMessage failed|target origin/i.test(text)) {
    consoleProblems.push(`${msg.type()}: ${text}`);
  }
});
page.on("pageerror", (error) => {
  consoleProblems.push(`pageerror: ${error.message}`);
});

try {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await waitStatus(page, "OK: A_start");

  await page.locator("#bgm-stop-provider").click({ timeout: 5000 });
  assert((await progress(page)).nodeId === "A_start", "BGM stop changed story progress");
  assert(await page.locator(".hz-bgm-companion[data-bgm-follow='off']").count(), "BGM stop did not mark follow off");

  await clickButtonText(page, "夜のハブへ入る");
  await waitStatus(page, "OK: HUB_NIGHT");
  assert((await progress(page)).nodeId === "HUB_NIGHT", "A_start did not enter HUB_NIGHT");

  const lockedOmega = await buttonText(page, "Ωの扉を試す");
  assert(await lockedOmega.isDisabled(), "locked Ω option should be disabled before Gate Run is won");
  const lockedText = await lockedOmega.innerText();
  assert(lockedText.includes("扉100%で解放"), "locked Ω option does not explain the 100% gate requirement");

  for (let i = 0; i < 14; i += 1) {
    const state = await runState(page);
    if (state.gateRunStatus === "won") break;
    await clickGateAction(page, await nextBalancedAction(page));
  }

  const wonState = await runState(page);
  assert(wonState.gateRunStatus === "won", "browser balanced policy did not open Ω");
  assert(wonState.gateRunCharge === 100, "browser won Gate Run did not clamp charge to 100");
  assert(wonState.gateRunTurns >= 8 && wonState.gateRunTurns <= 12, "browser Gate Run won outside the 8-12 turn window");

  await page.locator("[data-gate-omega]").first().waitFor({ state: "visible", timeout: 5000 });
  await page.waitForTimeout(100);
  await page.locator("[data-gate-omega]").first().click({ timeout: 5000 });
  await page.waitForFunction(
    () => document.body.textContent.includes("新しい入口へ戻る")
      && ["Ωへ", "OK: Ω"].includes(document.getElementById("runtime-status")?.textContent || ""),
    null,
    { timeout: 5000 }
  );
  await clickButtonText(page, "新しい入口へ戻る");
  await waitStatus(page, "OK: A_reborn");

  const completionText = await page.locator(".hz-gate-complete").innerText({ timeout: 5000 });
  assert(completionText.includes("Ω -> A_reborn 到達"), "A_reborn completion CTA copy is missing");
  await page.locator(".hz-gate-complete-cta").click({ timeout: 5000 });
  await waitStatus(page, "HUBへ");
  assert((await progress(page)).nodeId === "HUB_NIGHT", "completion CTA did not return to HUB_NIGHT");

  await page.locator("#reset-progress").click({ timeout: 5000 });
  await waitStatus(page, "OK: A_start");
  assert((await progress(page)).nodeId === "A_start", "reset did not return to A_start");
  const resetState = await runState(page);
  assert(resetState.gateRunStatus === "running" && resetState.gateRunCharge === 0, "reset did not clear Gate Run state");

  assert(consoleProblems.length === 0, `browser console problems:\n- ${consoleProblems.join("\n- ")}`);
  console.log("OK: browser first playable smoke passed");
} catch (error) {
  const snapshot = await page.evaluate(() => ({
    status: document.getElementById("runtime-status")?.textContent || "",
    progress: localStorage.getItem("hazama_progress") || "",
    run: localStorage.getItem("hazama_run_v1") || "",
    body: document.body.textContent.replace(/\s+/g, " ").trim().slice(0, 700)
  })).catch(() => ({}));
  console.error(`Browser smoke snapshot: ${JSON.stringify(snapshot)}`);
  throw error;
} finally {
  await browser.close().catch(() => {});
  await new Promise((resolve) => server.close(resolve));
}
