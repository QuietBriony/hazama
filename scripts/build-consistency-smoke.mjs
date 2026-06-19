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

// index: 没入シェル構造＋ランタイム参照（version一致: index の css/js・slice.js の depths fetch・sw cache）
const cssV = (html.match(/slice\.css\?v=([a-z0-9.]+)/) || [])[1];
const jsV = (html.match(/slice\.js\?v=([a-z0-9.]+)/) || [])[1];
assert(cssV && jsV && cssV === jsV, `index runtime version mismatch: css=${cssV} js=${jsV}`);
const fetchV = (js.match(/depths-shell\.json\?v=([a-z0-9.]+)/) || [])[1];
assert(fetchV === jsV, `slice.js depths fetch version mismatch: fetch=${fetchV} index=${jsV}`);
const swV = (sw.match(/const VERSION = "hazama-pwa-([a-z0-9.]+)"/) || [])[1];
assert(swV === jsV, `sw.js cache version mismatch: sw=${swV} index=${jsV}`);
assert(!html.includes("preview"), "production index.html should not say preview");
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

// E1: 記憶（spiral 層）＋縁の二択＋縁カード
has(js, '"hazama_spiral_v1"', "spiral storage key");
has(js, "function renderEdgeChoices", "edge two-way choices");
has(js, "function descendAgain", "descend-again (cycle deepen)");
has(js, "縁から、もう一度沈む", "edge re-descend label");
has(js, "すべて忘れる", "edge forget label");
has(js, "const EdgeCard", "edge share card");
// transient（戻り道/圧/観測者/エコー門発火）は保存しない＝spiral 層の save に紛れ込んだら fail
const saveBody = (js.match(/function save\(\) \{[\s\S]*?\n    \}/) || [""])[0];
assert(saveBody.includes("localStorage.setItem"), "spiral save writes localStorage");
for (const transient of ["returnPaths", "dread", "observer", "echoDone", "sink"]) {
  assert(!saveBody.includes(transient), `spiral save must not persist transient: ${transient}`);
}

// E3: 認識2.0（読解の試験化）＝深い構造読み＋エコー門。原典給餌(E2)の燃料が揃っていること。
has(js, "const ECHO_BANK", "E3 echo bank");
const echoKeys = [...js.matchAll(/^\s{4}([A-Za-z_]+): "/gm)].map((m) => m[1]);
assert(echoKeys.length >= 15, `E3 echo bank entries: ${echoKeys.length} (need >=15)`);
const deepTags = (read("depths-shell.json").match(/"deep":\s*true/g) || []).length;
assert(deepTags >= 10, `E3 deep descend tags: ${deepTags} (need >=10)`);
has(js, "surfaceErosion", "E3 surface erosion (recognition strips)");
has(js, "renderEchoChoices", "E3 echo gate renderer");
has(js, "ECHO_GATES", "E3 echo gate nodes");

// E7: 別の観測の痕跡（漂着・静的種・サーバ/保存なし）。fail-open seam(ingest)＋曖昧マーカー＋冷たい別の手。
has(js, "const Drift", "E7 drift module");
has(js, "foreign: true", "E7 foreign trace flag");
has(js, "function ingest", "E7 fail-open ingest seam");
assert(css.includes(".hz-line.scrawl.foreign"), "E7 foreign scrawl style");
assert(css.includes("別の観測の痕跡"), "E7 ambiguous drift marker (not a fake live count)");

// E8: 漂着を below 以外（深い降下中＋戻ってきた表紙）にも届かせる＝大多数のプレイヤーが見える。
has(js, "function maybeForeignDrift", "E8 mid-descent drift");
has(js, "hz-gate-drift", "E8 returning-title drift");
assert(css.includes(".hz-gate-drift"), "E8 gate drift style");

// E9: 初回オンボーディング（一度きり・最小ヒント・没入を壊さない）。永続キーで二度と出ない。
has(js, "function onboardHint", "E9 onboarding hint");
has(js, '"hazama_onboarded_v1"', "E9 onboarding persist key");
assert(css.includes(".hz-onboard"), "E9 onboarding style");
// オンボーディングは別キー＝spiral 層には混ぜない（save に紛れたら fail）。
assert(!saveBody.includes("onboard"), "E9/E10 onboarding must not be in spiral save");

// E10: エコー門の初回グロス（一度きり・別キー永続）。
has(js, '"hazama_echo_onboarded_v1"', "E10 echo onboarding persist key");
has(js, "視たものだけが、ここを通る", "E10 echo gloss line");
assert(css.includes(".hz-onboard-echo"), "E10 echo gloss style");

// E5: 視覚の磨きとパターン変化（A1 surfaced / A4 phase-break / B1 focus / B3 title / B4 cycle）。
// css に新層・状態・a11y・タイトル擬似要素が立ち、dead CSS(.hz-tl-c) は回収済みであること。
has(css, "body.surfaced", "E5/A1 surfaced wash style");
// E12: Ω 突破の専用ウォッシュ（浮上の対極＝核が前面化）。両極の終端が視覚的に揃っていること。
has(css, "body.omega", "E12 omega breakthrough wash style");
has(js, 'classList.add("omega")', "E12 omega class applied at attuned edge");
assert(js.includes('remove("surfaced", "omega"'), "E12 omega class cleared on re-descend/restart");
// E13: 縁カード(EdgeCard) の地も二極化＝Ω は底光・核グロー／浮上は上光（画面終端と対）。
// draw(attuned) の中で背景 gradient／軸光／核中央が attuned で分岐していること。
const edgeCardBody = (js.match(/const EdgeCard = \(\(\) => \{[\s\S]*?\n  \}\)\(\);/) || [""])[0];
assert(edgeCardBody.length > 0, "E13 EdgeCard IIFE present");
assert(/if \(attuned\)[\s\S]*createRadialGradient/.test(edgeCardBody), "E13 EdgeCard axis-light branches on attuned");
assert(edgeCardBody.includes("159,208,219"), "E13 EdgeCard omega core glow color present");
has(css, "phase-break", "E5/A4 phase-break style");
has(css, ":focus-visible", "E5/B1 focus-visible a11y");
has(css, ".hz-gate-title::before", "E5/B3 title RGB-split pseudo");
assert(!css.includes(".hz-tl-c"), "E5/B3 dead CSS removed (.hz-tl-c must not remain)");
// js: dev hook・周回スキン・phase 跨ぎ検知・below seed 畳み込み。
has(js, "__hz", "E5/A3 dev hook namespace");
has(js, "garden:", "E5/A3 garden dev hook");
has(js, "applyCycleSkin", "E5/B4 cycle skin");
has(js, "lastPhase", "E5/A4 phase transition tracker");
has(js, "belowLoop, 0x632be59b", "E5/A2 belowLoop seed fold");
// html: 表紙タイトルの data-text（B3 の RGB ずれ再接続の燃料）。
has(html, 'data-text="Hazama"', "E5/B3 title data-text");

// docs 参照整合: README/AGENTS が存在しない scripts を案内していないこと（forward 撤去後の漂流防止）
for (const docFile of ["README.md", "AGENTS.md"]) {
  const t = read(docFile);
  for (const m of t.matchAll(/scripts\/[a-z0-9-]+\.(?:mjs|sh)/g)) {
    assert(existsSync(repoPath(m[0])), `${docFile} references missing ${m[0]}`);
  }
}

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
  // E4: ECHO_BANK の全キーが実在ノードを指す（タイポした id の断片は永遠に真にならない＝ここで止める）
  for (const k of echoKeys) assert(depths.nodes[k], `ECHO_BANK key not in depths nodes: ${k}`);
  // E6(監査): deep:true は構造読み(descend)のみ＝認識2.0 の不変条件。surface/retreat に付くと認識計算が設計と乖離。
  for (const [id, node] of Object.entries(depths.nodes)) {
    for (const c of node.choices || []) {
      assert(!(c.deep === true && c.kind !== "descend"), `deep:true on non-descend choice: ${id} -> ${c.to} (kind=${c.kind})`);
    }
  }
  // E6(監査): ECHO_GATES の発火ノード(Q/Z 等)が depths に実在すること（リネームで門が永久に出ない事故を止める）。
  const gateMatch = js.match(/const ECHO_GATES = \[([^\]]*)\]/);
  const gateNodes = gateMatch ? (gateMatch[1].match(/"([^"]+)"/g) || []).map((s) => s.replace(/"/g, "")) : [];
  assert(gateNodes.length > 0, "ECHO_GATES not parseable");
  for (const g of gateNodes) assert(depths.nodes[g], `ECHO_GATES node not in depths: ${g}`);
}

if (failures.length) {
  console.error("build-consistency smoke FAIL");
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}
console.log("build-consistency smoke passed");
