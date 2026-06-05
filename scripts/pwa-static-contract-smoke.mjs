#!/usr/bin/env node
/* pwa-static-contract — root(=没入版/逆統合) の静的 PWA 契約を検証。
   逆統合(R5)で root は slice ビルドへ差し替え済み。index は slice ランタイムを参照し、
   manifest/sw が root スコープで成立していることを確認する。 */

import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

const repoPath = (p) => path.join(root, p);
const read = (p) => readFileSync(repoPath(p), "utf8");
const assert = (cond, msg) => { if (!cond) failures.push(msg); };
const assertExists = (p) => assert(existsSync(repoPath(p)), `missing required file: ${p}`);
const assertNonEmpty = (p) => {
  const fp = repoPath(p);
  assert(existsSync(fp), `missing required asset: ${p}`);
  if (existsSync(fp)) assert(statSync(fp).size > 0, `required asset is empty: ${p}`);
};
const has = (text, needle, label) => assert(text.includes(needle), `${label} missing: ${needle}`);

for (const f of [
  "index.html", "hazama-index.html", "manifest.webmanifest", "sw.js",
  "slice.js", "slice.css", "depths-shell.json", "scripts/startup-smoke.sh"
]) assertExists(f);

const indexHtml = read("index.html");
const altHtml = read("hazama-index.html");
const sw = read("sw.js");

// root と alt は同一エントリ
assert(indexHtml === altHtml, "index.html and hazama-index.html must stay identical");

// index は slice ランタイムを参照（バージョン一致）
const cssV = (indexHtml.match(/slice\.css\?v=([a-z0-9.]+)/) || [])[1];
const jsV = (indexHtml.match(/slice\.js\?v=([a-z0-9.]+)/) || [])[1];
assert(cssV && jsV && cssV === jsV, `index slice runtime version mismatch: css=${cssV} js=${jsV}`);
has(indexHtml, 'rel="manifest"', "index manifest link");
has(indexHtml, 'id="gate-enter"', "index immersive gate");

// manifest（root スコープ）
let manifest;
try { manifest = JSON.parse(read("manifest.webmanifest")); } catch { failures.push("manifest.webmanifest invalid JSON"); }
if (manifest) {
  assert(typeof manifest.name === "string" && manifest.name.length > 0, "manifest name");
  assert(manifest.display === "standalone", "manifest display standalone");
  assert(Array.isArray(manifest.icons) && manifest.icons.some((i) => i.sizes === "192x192"), "manifest 192 icon");
  assert(manifest.icons.some((i) => i.sizes === "512x512"), "manifest 512 icon");
  assert(manifest.icons.some((i) => i.purpose === "maskable"), "manifest maskable icon");
}

// service worker（root スコープ・旧 forward cache を掃除する prefix）
has(sw, 'const CACHE_PREFIX = "hazama-pwa-"', "root sw cache prefix (cleans old forward caches)");
has(sw, "PRECACHE_URLS", "sw precache list");
for (const url of ["index.html", "slice.js", "slice.css", "depths-shell.json", "manifest.webmanifest"]) {
  has(sw, url, `sw precache ${url}`);
}

// アイコン実体
for (const ic of [
  "icons/icon-96.png", "icons/icon-192.png", "icons/icon-512.png",
  "icons/icon-512-maskable.png", "icons/apple-touch-icon.png",
  "assets/hazama-descent-key.webp"
]) assertNonEmpty(ic);

// depths-shell（本文データ）
try { JSON.parse(read("depths-shell.json")); } catch { failures.push("depths-shell.json invalid JSON"); }

if (failures.length) {
  console.error("pwa-static-contract smoke FAIL");
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}
console.log("pwa-static-contract smoke passed");
