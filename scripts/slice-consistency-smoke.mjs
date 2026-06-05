/* slice-consistency-smoke — 逆統合(slice ビルド)の実体検証。
   slice/ が「没入シェル＋認識/Ωゲート＋PWA」を備えていることを依存なしで確認する。
   root を slice ビルドへ差し替える前提の契約（REVERSE-INTEGRATION.md R5）。 */
import { readFileSync } from "node:fs";

const failures = [];
const assert = (cond, msg) => { if (!cond) failures.push(msg); };
const has = (text, needle, label) => assert(text.includes(needle), `${label} missing: ${needle}`);

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

const html = read("slice/index.html");
const js = read("slice/slice.js");
const css = read("slice/slice.css");
const sw = read("slice/sw.js");
const manifestRaw = read("slice/manifest.webmanifest");
const depthsRaw = read("slice/depths-shell.json");

// --- 没入シェル（9層アート＋最小UI） ---
for (const layer of ["hz-bg-descent", "hz-bg-garden", "hz-bg-abyss", "hz-bg-grid", "hz-bg-mandala", "hz-bg-leak", "hz-glitch", "hz-vignette", "hz-scanline", "hz-grain"]) {
  has(html, layer, "slice immersive art layer");
}
has(html, 'id="scene"', "slice scene");
has(html, 'id="choices"', "slice choices");
has(html, 'id="gate-enter"', "slice enter gate");

// --- R2/R3 認識・Ωゲート（二極終端＋インジケータ） ---
has(js, "state.attunement", "slice attunement state");
has(js, "function gainRecognition", "slice recognition gain");
has(js, "isAttuned", "slice isAttuned gate");
has(js, "function renderEdge", "slice edge terminal");
has(js, "浮上 — 表層へ帰る", "slice two-pole surface ending");
has(js, "深度Ω 到達", "slice omega ending");
has(js, "function renderAttune", "slice recognition indicator");
has(html, 'id="attune"', "slice recognition indicator element");
has(css, ".hz-attune", "slice recognition indicator css");

// --- R4 PWA ---
has(html, 'rel="manifest"', "slice manifest link");
has(js, 'navigator.serviceWorker.register("sw.js")', "slice sw registration");
has(sw, "hazama-slice-pwa-", "slice sw cache prefix (separate namespace)");
has(sw, "depths-shell.json", "slice sw precache depth data");

let manifest;
try { manifest = JSON.parse(manifestRaw); } catch { failures.push("slice manifest.webmanifest invalid JSON"); }
if (manifest) {
  assert(manifest.start_url === "." , "slice manifest start_url should be '.'");
  assert(manifest.scope === "./", "slice manifest scope should be './'");
  assert(Array.isArray(manifest.icons) && manifest.icons.some((i) => i.sizes === "512x512"), "slice manifest needs 512 icon");
  assert(manifest.icons.some((i) => i.purpose === "maskable"), "slice manifest needs maskable icon");
}

// --- データ（depths-shell.json: 沈下スパイン本文） ---
let depths;
try { depths = JSON.parse(depthsRaw); } catch { failures.push("slice depths-shell.json invalid JSON"); }
if (depths) {
  assert(depths.start && depths.nodes && depths.nodes[depths.start], "slice depths start node missing");
  assert(Object.keys(depths.nodes).length >= 30, "slice depths node count too low");
  // 全 choices.to が実在 or 仮想(__*) であること
  const ids = new Set(Object.keys(depths.nodes));
  const missing = [];
  for (const [id, node] of Object.entries(depths.nodes)) {
    for (const c of node.choices || []) {
      const t = c.to;
      if (!t) continue;
      if (t.startsWith("__") || t === "below") continue;
      if (!ids.has(t)) missing.push(`${id} -> ${t}`);
    }
  }
  assert(missing.length === 0, `slice depths missing choice targets: ${missing.join(", ")}`);
}

// --- cache version 一貫（index と slice.js の ?v= が一致） ---
const vHtml = (html.match(/slice\.js\?v=([a-z0-9.]+)/) || [])[1];
const vDepths = (js.match(/depths-shell\.json\?v=([a-z0-9.]+)/) || [])[1];
assert(vHtml && vDepths && vHtml === vDepths, `slice cache version mismatch: index=${vHtml} depths=${vDepths}`);

if (failures.length) {
  console.error("slice-consistency smoke FAIL");
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}
console.log("slice-consistency smoke passed");
