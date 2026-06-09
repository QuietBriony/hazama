/* build-consistency — Hazama 本番ビルド(没入版・単一)の実体検証。
   リポジトリは1ビルドのみ: root に没入ランタイム(index.html + slice.* + depths-shell.json + PWA)。
   forward 一式・slice/ 重複は撤去済み。ここで build の整合を依存なしで一括検証する。 */
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];
const repoPath = (p) => path.join(root, p);
const read = (p) => readFileSync(repoPath(p), "utf8");
const assert = (c, m) => { if (!c) failures.push(m); };
const has = (t, n, label) => assert(t.includes(n), `${label} missing: ${n}`);
const nonEmpty = (p) => { const fp = repoPath(p); assert(existsSync(fp), `missing: ${p}`); if (existsSync(fp)) assert(statSync(fp).size > 0, `empty: ${p}`); };

// 必須ファイル（このビルドの全構成）
for (const f of ["index.html", "slice.js", "slice.css", "depths-shell.json", "manifest.webmanifest", "sw.js"]) {
  assert(existsSync(repoPath(f)), `missing build file: ${f}`);
}

// forward / 重複が残っていないこと（=1ビルドの担保）
for (const stale of ["hazama-main.js", "hazama-gate-run.js", "hazama-depths.json", "hazama-index.html", "hazama-style.css", "slice/index.html"]) {
  assert(!existsSync(repoPath(stale)), `stale file should be removed (single-build): ${stale}`);
}

const html = read("index.html");
const js = read("slice.js");
const css = read("slice.css");
const sw = read("sw.js");

// index: 没入シェル構造＋ランタイム参照（version一致）
const cssV = (html.match(/slice\.css\?v=([a-z0-9.]+)/) || [])[1];
const jsV = (html.match(/slice\.js\?v=([a-z0-9.]+)/) || [])[1];
assert(cssV && jsV && cssV === jsV, `index runtime version mismatch: css=${cssV} js=${jsV}`);
for (const layer of ["hz-bg-garden", "hz-bg-mandala", "hz-glitch", "hz-scanline", "hz-vignette"]) has(html, layer, "immersive art layer");
for (const el of ['id="scene"', 'id="choices"', 'id="gate-enter"', 'id="attune"', 'rel="manifest"']) has(html, el, "index element");

// slice.js: 認識/Ωゲート(逆統合の核)＋二極終端＋認識インジケータ
has(js, "function gainRecognition", "recognition gain");
has(js, "isAttuned", "omega attunement gate");
has(js, "function renderEdge", "edge terminal");
has(js, "浮上 — 表層へ帰る", "two-pole surface ending");
has(js, "深度Ω 到達", "omega ending");
has(js, "function renderAttune", "recognition indicator");
has(js, 'navigator.serviceWorker.register("sw.js")', "sw registration");
assert(css.includes(".hz-attune"), "slice.css recognition indicator style");

// manifest（root スコープ PWA）
let manifest;
try { manifest = JSON.parse(read("manifest.webmanifest")); } catch { failures.push("manifest invalid JSON"); }
if (manifest) {
  assert(typeof manifest.name === "string" && manifest.name.length > 0, "manifest name");
  assert(manifest.display === "standalone", "manifest display standalone");
  assert(Array.isArray(manifest.icons) && manifest.icons.some((i) => i.sizes === "192x192"), "manifest 192 icon");
  assert(manifest.icons.some((i) => i.sizes === "512x512"), "manifest 512 icon");
  assert(manifest.icons.some((i) => i.purpose === "maskable"), "manifest maskable icon");
}

// service worker（root スコープ・旧cache掃除prefix・build一式を precache）
has(sw, 'const CACHE_PREFIX = "hazama-pwa-"', "sw cache prefix");
for (const url of ["index.html", "slice.js", "slice.css", "depths-shell.json", "manifest.webmanifest"]) has(sw, url, `sw precache ${url}`);

// アイコン/アセット実体
for (const a of ["icons/icon-96.png", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-512-maskable.png", "icons/apple-touch-icon.png", "assets/hazama-descent-key.webp"]) nonEmpty(a);

// depths-shell（本文データ）: start＋ノード数＋choice到達性
let depths;
try { depths = JSON.parse(read("depths-shell.json")); } catch { failures.push("depths-shell.json invalid JSON"); }
if (depths) {
  assert(depths.start && depths.nodes && depths.nodes[depths.start], "depths start node");
  assert(Object.keys(depths.nodes).length >= 30, "depths node count");
  const ids = new Set(Object.keys(depths.nodes));
  const missing = [];
  for (const [id, node] of Object.entries(depths.nodes)) {
    for (const c of node.choices || []) {
      const t = c.to;
      if (!t || t.startsWith("__") || t === "below") continue;
      if (!ids.has(t)) missing.push(`${id} -> ${t}`);
    }
  }
  assert(missing.length === 0, `depths missing choice targets: ${missing.join(", ")}`);
}

if (failures.length) {
  console.error("build-consistency smoke FAIL");
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}
console.log("build-consistency smoke passed");
