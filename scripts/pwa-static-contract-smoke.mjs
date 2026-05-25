#!/usr/bin/env node

import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];
const APP_VERSION = "2.39";
const CACHE_VERSION = `hazama-pwa-v${APP_VERSION}`;

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

function assertNonEmpty(relativePath) {
  const filePath = repoPath(relativePath);
  assert(existsSync(filePath), `missing required asset: ${relativePath}`);
  if (existsSync(filePath)) {
    assert(statSync(filePath).size > 0, `required asset is empty: ${relativePath}`);
  }
}

function assertIncludes(text, needle, label) {
  assert(text.includes(needle), `${label} missing: ${needle}`);
}

function linkedVersionedAssets(html) {
  return [...html.matchAll(/(?:href|src)="([^"]+\?v=([^"]+))"/g)]
    .map((match) => ({ asset: match[1], version: match[2] }));
}

for (const requiredFile of [
  "index.html",
  "hazama-index.html",
  "manifest.webmanifest",
  "sw.js",
  "hazama-main.js",
  "scripts/startup-smoke.sh"
]) {
  assertExists(requiredFile);
}

const indexHtml = read("index.html");
const altHtml = read("hazama-index.html");
const manifest = JSON.parse(read("manifest.webmanifest"));
const sw = read("sw.js");
const main = read("hazama-main.js");
const startupSmoke = read("scripts/startup-smoke.sh");

assert(indexHtml === altHtml, "index.html and hazama-index.html must stay aligned");

for (const [htmlName, html] of [
  ["index.html", indexHtml],
  ["hazama-index.html", altHtml]
]) {
  const versionedAssets = linkedVersionedAssets(html);
  for (const requiredAsset of [
    `hazama-style.css?v=${APP_VERSION}`,
    `hazama-seed.js?v=${APP_VERSION}`,
    `hazama-state.js?v=${APP_VERSION}`,
    `hazama-gate-run.js?v=${APP_VERSION}`,
    `hazama-main.js?v=${APP_VERSION}`
  ]) {
    assert(
      versionedAssets.some(({ asset }) => asset === requiredAsset),
      `${htmlName} missing v${APP_VERSION} asset: ${requiredAsset}`
    );
  }
  for (const { asset, version } of versionedAssets) {
    assert(version === APP_VERSION, `${htmlName} has non-v${APP_VERSION} asset reference: ${asset}`);
  }
  for (const needle of [
    'rel="manifest" href="manifest.webmanifest"',
    'rel="apple-touch-icon" href="icons/apple-touch-icon.png"',
    'name="theme-color" content="#070a12"',
    'id="pwa-install"',
    "assets/hazama-descent-key.webp",
    "assets/hazama-goal-mandala.webp"
  ]) {
    assertIncludes(html, needle, htmlName);
  }
}

assert(manifest.name === "Hazama", "manifest name must be Hazama");
assert(manifest.short_name === "Hazama", "manifest short_name must be Hazama");
assert(manifest.start_url === "index.html", "manifest start_url must be index.html");
assert(manifest.scope === "./", "manifest scope must be ./");
assert(manifest.display === "standalone", "manifest display must be standalone");
assert(manifest.theme_color === "#070a12", "manifest theme_color must match shell");
assert(Array.isArray(manifest.icons), "manifest icons must be an array");

for (const iconPath of [
  "icons/icon-96.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-512-maskable.png",
  "icons/apple-touch-icon.png"
]) {
  assertNonEmpty(iconPath);
}

assert(
  manifest.icons.some((icon) => icon.src === "icons/icon-192.png" && icon.sizes === "192x192"),
  "manifest must include 192x192 icon"
);
assert(
  manifest.icons.some((icon) =>
    icon.src === "icons/icon-512-maskable.png" &&
    icon.sizes === "512x512" &&
    icon.purpose === "maskable"
  ),
  "manifest must include maskable 512x512 icon"
);

assertIncludes(sw, `const VERSION = "${CACHE_VERSION}";`, "sw.js");
assertIncludes(sw, 'const CACHE_PREFIX = "hazama-pwa-";', "sw.js");
assertIncludes(sw, "PRECACHE_URLS", "sw.js");
assertIncludes(sw, "key.startsWith(CACHE_PREFIX)", "sw.js");

for (const requiredAsset of [
  "./",
  "index.html",
  "hazama-index.html",
  "hazama-depths.json",
  "hazama-style.css",
  "hazama-seed.js",
  "hazama-state.js",
  "hazama-gate-run.js",
  "hazama-main.js",
  "manifest.webmanifest",
  "assets/hazama-descent-key.webp",
  "assets/hazama-goal-mandala.webp"
]) {
  assertIncludes(sw, `"${requiredAsset}"`, "sw.js PRECACHE_URLS");
  assertExists(requiredAsset === "./" ? "." : requiredAsset);
}

for (const requiredAsset of [
  "assets/hazama-descent-key.webp",
  "assets/hazama-goal-mandala.webp",
  "assets/hazama-descent-key.png",
  "assets/hazama-goal-mandala.png"
]) {
  assertNonEmpty(requiredAsset);
}

for (const needle of [
  `Hazama main.js v${APP_VERSION}`,
  `const APP_VERSION = "v${APP_VERSION}";`,
  'serviceWorker.register("sw.js")',
  "beforeinstallprompt",
  "新バージョン利用可能",
  "SKIP_WAITING",
  "pwa-install"
]) {
  assertIncludes(main, needle, "hazama-main.js PWA shell");
}

for (const needle of [
  `hazama-style.css?v=${APP_VERSION}`,
  `hazama-main.js?v=${APP_VERSION}`,
  `Hazama main.js v${APP_VERSION}`,
  CACHE_VERSION,
  "manifest.webmanifest",
  'serviceWorker.register("sw.js")',
  "beforeinstallprompt",
  "新バージョン利用可能",
  "別タブMusic → START.HZM",
  "MusicタブでSTART.HZM",
  "自動再生制限は迂回せず",
  "同じ画面で鳴らす",
  "startInlineBgm",
  "MediaMetadata"
]) {
  assertIncludes(startupSmoke, needle, "scripts/startup-smoke.sh contract");
}

for (const needle of [
  "別タブMusic → START.HZM",
  "MusicタブでSTART.HZM",
  "自動再生制限は迂回せず",
  "同じ画面で鳴らす",
  "createMediaStreamDestination",
  "data-inline-bgm"
]) {
  assertIncludes(main, needle, "hazama-main.js startup contract");
}

if (failures.length > 0) {
  console.error("pwa-static-contract smoke FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("pwa-static-contract smoke PASS");
