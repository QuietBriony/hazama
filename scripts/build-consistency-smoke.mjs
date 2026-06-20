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
// E14: 中盤深度 G/I/O/R/W の真候補を追加＝Q/Z の門が中盤を取りこぼさない（≥20）。
assert(echoKeys.length >= 20, `E3/E14 echo bank entries: ${echoKeys.length} (need >=20)`);
for (const k of ["G", "I", "O", "R", "W"]) assert(echoKeys.includes(k), `E14 ECHO_BANK missing mid-depth key: ${k}`);
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
// E14: 「すべて忘れる」が縁の他方（再降下）と対称＝忘却の破断ビート＋Audio.glitchHit＋遅延 restart。
const forgetBody = (js.match(/function forgetAll\(\)[\s\S]*?\n  \}/) || [""])[0];
assert(forgetBody.includes("Spiral.wipe()"), "E14 forgetAll still wipes spiral");
assert(/setTimeout\(\s*restart/.test(forgetBody), "E14 forgetAll defers restart for the beat");
assert(forgetBody.includes("Audio.glitchHit"), "E14 forgetAll triggers break sound");
has(js, "次は、初めてになる", "E14 forget beat text");
// E15: 縁の再降下(descendAgain)を forgetAll と対称化＝降下の句読点＋Audio.pulseOnce＋遅延 renderNode。
// E14 コメントが約束しながら未実装だった「もう一度沈む＝Audio.pulseOnce」をここで満たす。周回数値は
// reborn 本文＋縁カードが既に2度語るため、ビートは現象だけ（数値・「深まる」の再宣言なし）。
const descendBody = (js.match(/function descendAgain\(\)[\s\S]*?\n  \}/) || [""])[0];
assert(descendBody.includes("Audio.pulseOnce"), "E15 descendAgain plays the sink pulse (symmetry with forget's glitchHit / in-story reborn→zero)");
assert(/setTimeout\([\s\S]*?renderNode/.test(descendBody), "E15 descendAgain defers renderNode for the descent beat");
assert(descendBody.includes('choicesEl.innerHTML = ""'), "E15 descendAgain clears edge choices before the beat");
has(js, "縁が、足の下でほどける", "E15 re-descend beat text");
// E16: 複線化（降りる幹を分ける）＝A の岐路が deep 幹(構造)/soma 幹(身体)を選び、Z で再合流（終端は共有）。
has(js, "activeTrunk", "E16 active-trunk state field");
assert(/fromId === "A"[\s\S]{0,240}activeTrunk/.test(js), "E16 fork selects the descent trunk at junction A");
assert(saveBody.length > 0 && !saveBody.includes("activeTrunk"), "E16 activeTrunk stays transient (not in spiral save)");
// E17: 周回連動＝周回(cycle>=1)で A に第3の幹(reso/流れ)が開く。minCycle ゲート＋trunk フィールドで分岐。
assert(/filter\(\(c\) => !c\.minCycle/.test(js), "E17 cycle-gate filters choices by minCycle");
assert(/state\.activeTrunk = c\.trunk \|\|/.test(js), "E17 fork honors c.trunk (third trunk)");
has(js, '=== "reso" ? "流れ"', "E17 edge card labels the reso trunk");
// E18: 第4の幹 casc（崩壊と再生）＝cycle≥2 で A に開く。E17 の trunk/minCycle 機構をそのまま活用。
has(js, '=== "casc" ? "崩壊"', "E18 edge card labels the casc trunk");
// E20: 第5の幹 other（並行自己）＝cycle≥3 で A に開く。E17/E18 と同じ trunk/minCycle 機構。
has(js, '=== "other" ? "並行"', "E20 edge card labels the otherself trunk");
// E21: 音の軸色（幹ごとの微変調 setAxis ＋ 縁の呼気 breath）。human-gate＝耳で採否＝コード存在のみ検証。
has(js, "function setAxis", "E21 per-trunk audio axis");
has(js, "function breath", "E21 edge breath (呼気)");
has(js, "Audio.setAxis(state.activeTrunk)", "E21 axis set at trunk fork");
has(js, "Audio.breath(attuned)", "E21 breath at edge");
// E19: 終端を勝ち取る＝reborn の Ω 貫きは認識が満ちるまで“見える鍵”でロック。賭けて勝ち取った時だけ Ω 終端。
assert(/requireAttune && !isAttuned\(\)/.test(js), "E19 Ω wager choice locked until attuned");
assert(/attuned = isAttuned\(\) && state\.wagered/.test(js), "E19 omega ending requires the wager");
assert(saveBody.length > 0 && !saveBody.includes("wagered"), "E19 wagered stays transient (not in spiral save)");
assert(css.includes(".hz-choice.locked"), "E19 locked Ω door style");
// E14: choices の暴発タップ防止＝reveal 中は disabled・appear タイマーで false。
assert(js.includes("btn.disabled = true"), "E14 choice button disabled until appear");
assert(js.includes("btn.disabled = false"), "E14 choice button enabled after appear timer");
// E14: descend/surface の hover が種別の意味（descend 鉄錆・surface 赤の点線）を上書きしない。
has(css, ".hz-choice.descend:hover", "E14 descend hover keeps the iron-rust kind color");
has(css, ".hz-choice.surface:hover", "E14 surface hover keeps the red dashed kind color");
// E14: 縁カード以外でも Q/Z のエコー門が文面で差分化（Z は外殻最終の質感）。
has(js, '外殻の最果て', "E14 echo gate Z intro line");
has(js, '目を閉じ、Ωへ', "E14 echo gate Z skip label");
// E14: chip タッチターゲット 44px（min-height）。
has(css, "min-height: 44px", "E14 chip 44px touch target");
// E14: onboard タイポ漂泊是正＝合成斜体回避（normal）＋ palt。
assert(/\.hz-onboard\s*\{[^}]*font-style:\s*normal/.test(css), "E14 onboard font-style normalized");
assert(/\.hz-onboard\s*\{[^}]*palt/.test(css), "E14 onboard uses palt feature");
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
  // E16: soma 幹（複線化）の実在＋A surface→soma 入口＋Y_soma→Z 再合流。
  for (const sid of ["B_soma", "D_soma", "F_soma", "J_soma", "N_soma", "S_soma", "V_soma", "Y_soma"]) {
    assert(depths.nodes[sid], `E16 soma trunk node missing: ${sid}`);
  }
  const aSurface = (depths.nodes["A"]?.choices || []).find((c) => c.kind === "surface");
  assert(aSurface && aSurface.to === "B_soma", "E16 A surface choice enters soma trunk (B_soma)");
  const ySomaTargets = (depths.nodes["Y_soma"]?.choices || []).map((c) => c.to);
  assert(ySomaTargets.includes("Z"), "E16 soma trunk reconverges to Z");
  // E17: reso 幹（周回で開く第3の幹）の実在＋A の reso 選択(minCycle ゲート)＋Y_reso→Z 再合流。
  for (const rid of ["B_reso", "E_reso", "H_reso", "M_reso", "S_reso", "Y_reso"]) {
    assert(depths.nodes[rid], `E17 reso trunk node missing: ${rid}`);
  }
  const aReso = (depths.nodes["A"]?.choices || []).find((c) => c.trunk === "reso");
  assert(aReso && aReso.to === "B_reso" && aReso.minCycle >= 1, "E17 A reso choice is cycle-gated and enters reso trunk");
  const yResoTargets = (depths.nodes["Y_reso"]?.choices || []).map((c) => c.to);
  assert(yResoTargets.includes("Z"), "E17 reso trunk reconverges to Z");
  // E18: casc 幹（cycle≥2 で開く第4の幹）の実在＋A の casc 選択(minCycle:2 ゲート)＋Y_casc→Z 再合流。
  for (const cid of ["B_casc", "E_casc", "H_casc", "M_casc", "S_casc", "Y_casc"]) {
    assert(depths.nodes[cid], `E18 casc trunk node missing: ${cid}`);
  }
  const aCasc = (depths.nodes["A"]?.choices || []).find((c) => c.trunk === "casc");
  assert(aCasc && aCasc.to === "B_casc" && aCasc.minCycle >= 2, "E18 A casc choice is cycle-gated (>=2) and enters casc trunk");
  const yCascTargets = (depths.nodes["Y_casc"]?.choices || []).map((c) => c.to);
  assert(yCascTargets.includes("Z"), "E18 casc trunk reconverges to Z");
  // E20: other 幹（cycle≥3 で開く第5の幹）の実在＋A の other 選択(minCycle:3 ゲート)＋Y_other→Z 再合流。
  for (const oid of ["B_other", "E_other", "H_other", "M_other", "S_other", "Y_other"]) {
    assert(depths.nodes[oid], `E20 otherself trunk node missing: ${oid}`);
  }
  const aOther = (depths.nodes["A"]?.choices || []).find((c) => c.trunk === "other");
  assert(aOther && aOther.to === "B_other" && aOther.minCycle >= 3, "E20 A otherself choice is cycle-gated (>=3) and enters other trunk");
  const yOtherTargets = (depths.nodes["Y_other"]?.choices || []).map((c) => c.to);
  assert(yOtherTargets.includes("Z"), "E20 otherself trunk reconverges to Z");
  // E19: reborn に Ω 貫き(requireAttune・wager) と安全な浮上(賭けない) の2終端。
  const rebornEndings = (depths.nodes["reborn"]?.choices || []).filter((c) => c.to === "__edge");
  assert(rebornEndings.length >= 2, "E19 reborn has wager + safe-surface endings");
  assert(rebornEndings.some((c) => c.requireAttune && c.wager), "E19 reborn has locked Ω wager ending");
  assert(rebornEndings.some((c) => !c.requireAttune), "E19 reborn keeps an always-open surface ending");
}

if (failures.length) {
  console.error("build-consistency smoke FAIL");
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}
console.log("build-consistency smoke passed");
