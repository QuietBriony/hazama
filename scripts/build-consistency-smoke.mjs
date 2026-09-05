/* build-consistency — Hazama 本番ビルド(没入版・単一)の実体検証。
   リポジトリは1ビルドのみ: root に没入ランタイム(index.html + slice.* + depths-shell.json + PWA)。
   forward 一式・slice/ 重複は撤去済み。ここで build の整合を依存なしで一括検証する。 */
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import "./audio-governor-smoke.mjs";
import "./sensory-frame-smoke.mjs";
import "./choice-commit-smoke.mjs";
import "./reading-control-smoke.mjs";
import "./reading-settings-smoke.mjs";

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
const bootSwV = (html.match(/const SW_URL = "sw\.js\?v=([a-z0-9.]+)"/) || [])[1];
const bootRuntimeV = (html.match(/const RUNTIME_URL = "slice\.js\?v=([a-z0-9.]+)"/) || [])[1];
const runtimeSwV = (js.match(/serviceWorker\.register\("sw\.js\?v=([a-z0-9.]+)"/) || [])[1];
assert(bootSwV === jsV, `boot SW version mismatch: sw=${bootSwV} index=${jsV}`);
assert(bootRuntimeV === jsV, `boot runtime version mismatch: runtime=${bootRuntimeV} index=${jsV}`);
assert(runtimeSwV === jsV, `runtime SW registration version mismatch: sw=${runtimeSwV} index=${jsV}`);
const bootScript = (html.match(/<script>\s*([\s\S]*?)\s*<\/script>/i) || [])[1];
assert(Boolean(bootScript), "inline boot script missing");
if (bootScript) {
  try { new vm.Script(bootScript, { filename: "index-inline-boot.js" }); }
  catch (err) { failures.push(`inline boot script syntax: ${err.message}`); }
}
assert(!html.includes("preview"), "production index.html should not say preview");
for (const layer of ["hz-bg-garden", "hz-bg-mandala", "hz-glitch", "hz-scanline", "hz-vignette"]) has(html, layer, "immersive art layer");
for (const el of ['id="scene"', 'id="choices"', 'id="gate-enter"', 'id="attune"', 'rel="manifest"']) has(html, el, "index element");
has(html, 'id="gate" class="hz-gate" aria-busy="true"', "E33 gate load state");
has(html, 'class="hz-gate-title" aria-hidden="true"', "E33 decorative title hidden from assistive tech");
has(html, 'aria-describedby="gate-note"', "E33 entry audio/load description");
has(html, 'id="gate-note" class="hz-gate-note" role="status" aria-live="polite"', "E33 visible gate load status");
has(html, 'id="a11y-state" class="hz-sr-only" role="status" aria-live="polite" aria-atomic="true"', "E34 gauge state live summary");
has(html, "window.__hazamaArmRetry = armRetry", "E34 shared boot/data retry handler");
has(html, 'label.textContent = "再試行"', "E34 retry control label");
has(html, "window.location.reload()", "E34 retry action reloads the static shell");
has(html, 'navigator.serviceWorker.controller.scriptURL === expectedController', "E33 current-controller version guard");
has(html, 'navigator.serviceWorker.addEventListener("controllerchange", onControllerChange)', "E33 old SW takeover wait");
const takeoverBody = (html.match(/const onControllerChange = \(\) => \{[\s\S]*?\n      \};/) || [""])[0];
has(takeoverBody, "finish(() => window.location.reload())", "E35 old SW takeover reloads the complete shell");
assert(!takeoverBody.includes("startRuntime"), "E35 old-controller navigation must not mix old CSS with current runtime");
assert(!/<script\s+[^>]*src=["']slice\.js\?v=/i.test(html), "E33 runtime must wait for SW takeover instead of direct script load");
has(js, 'gateEl.setAttribute("inert", "")', "E33 departed gate inert state");
has(js, 'gateEl.setAttribute("aria-hidden", "true")', "E33 departed gate accessibility state");
assert(js.indexOf('gb.addEventListener("click", enter') < js.indexOf('gb.disabled = false', js.indexOf("loadData().then")),
  "E33 gate must enable only after click listener wiring");
const loadCatch = (js.match(/loadData\(\)\.then\([\s\S]*?\n  \}\);/) || [""])[0];
has(loadCatch, 'window.__hazamaArmRetry("深度データを読み込めません。再試行してください。")',
  "E34 failed depth load routes to retry control");
has(loadCatch, "gb.disabled = false", "E34 fallback retry control is enabled");
assert(!loadCatch.includes('$("scene").textContent'), "E33 failed boot must not duplicate the gate live announcement");
assert(/\.hz-chip\[hidden\]\s*\{[^}]*display:\s*none/.test(css),
  "E34 hidden audio chip must not render or enter the focus order before descent");
const gateErrorCss = (css.match(/\.hz-gate-note\.is-error\s*\{[^}]*\}/) || [""])[0];
has(gateErrorCss, "font-size: 0.8rem", "E34 readable boot error size");
has(gateErrorCss, "color: var(--warn)", "E34 contrasted boot error color");
const choicesCss = (css.match(/\.hz-choices\s*\{[\s\S]*?\n\}/) || [""])[0];
for (const contract of ["flex: 0 0 auto", "min-height: 0", "max-height: min(56dvh, 34rem)", "overflow-y: auto", "overscroll-behavior: contain"]) {
  has(choicesCss, contract, `E34 short-viewport choices ${contract}`);
}
has(js, "function queueA11yState", "E34 gauge state summary renderer");
for (const renderer of ["renderChoices", "renderEchoChoices", "renderEdgeChoices"]) {
  const body = (js.match(new RegExp(`function ${renderer}\\([^)]*\\) \\{[\\s\\S]*?\\n  \\}`)) || [""])[0];
  assert((body.match(/queueA11yState\(\)/g) || []).length === 1,
    `E34 gauge summary must run exactly once in ${renderer}`);
}
assert((js.match(/^    queueA11yState\(\);/gm) || []).length === 3,
  "E34 gauge summary must have exactly three renderer call-sites");
has(js, "if (b && a11yStateTimer)", "E34 stale gauge summary cancellation on next scene");
has(js, "戻り道 ${state.returnPaths}本。認識 ${lit}/${need}", "E34 gauge summary values");
has(js, "window.__hazamaArmRetry", "E34 depth-load retry handoff");

// slice.js: 認識/Ωゲート(逆統合の核)＋二極終端＋認識インジケータ
has(js, "function gainRecognition", "recognition gain");
has(js, "isAttuned", "omega attunement gate");
has(js, "function renderEdge", "edge terminal");
has(js, "浮上 — 表層へ帰る", "two-pole surface ending");
has(js, "深度Ω 到達", "omega ending");
has(js, "function renderAttune", "recognition indicator");
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
// E39: 画像共有を受け取った先から作品へ戻れるよう、対応 Web Share payload に正規 URL を添える。
// 組み合わせ非対応なら従来の files-only payload、Web Share 非対応なら PNG 保存を維持する。
assert(edgeCardBody.includes('const SHARE_URL = "https://quietbriony.github.io/hazama/"'), "E39 EdgeCard canonical share URL present");
assert(/const shareData = \{[\s\S]*?files: \[file\][\s\S]*?url: SHARE_URL/.test(edgeCardBody), "E39 EdgeCard share payload carries file and URL");
assert(edgeCardBody.includes("navigator.canShare(shareData)"), "E39 EdgeCard preserves files-only fallback when combined share is unsupported");
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

// E31: production audio governor（単一AudioContextのままmobile budget・peak guard・lifecycleを強化）。
has(js, "const AUDIO_BUDGETS", "E31 production audio tier budgets");
has(js, 'window.matchMedia("(pointer: coarse)")', "E31 coarse-pointer light tier");
has(js, "createDynamicsCompressor", "E31 master compressor guardrail");
has(js, "function suspendForVisibility", "E31 hidden-page audio suspend");
has(js, "function dispose", "E31 pagehide audio dispose");
has(js, "Audio.suspendForVisibility()", "E31 visibility lifecycle wiring");
has(js, "Audio.dispose()", "E31 pagehide lifecycle wiring");
has(js, "dryGain.gain.value = 0.85", "E31 preserves the production dry gain");
assert(!js.includes('import "./tools/sensory') && !js.includes('fetch("tools/sensory')
  && !/\bnew\s+Tone\b/.test(js) && !/\bTone\.(?:Player|Transport|Oscillator)\b/.test(js),
  "E31 production audio remains dependency-free and single-runtime");
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
for (const url of ["index.html", "depths-shell.json", "manifest.webmanifest"]) has(sw, url, `sw precache ${url}`);
has(sw, '`slice.js?v=${RELEASE}`', "sw precache versioned slice.js");
has(sw, '`slice.css?v=${RELEASE}`', "sw precache versioned slice.css");
has(sw, "const CORE_PRECACHE_URLS", "sw atomic core precache list");
has(sw, "const OPTIONAL_PRECACHE_URLS", "sw optional visual precache list");
has(sw, "cache.addAll(CORE_PRECACHE_URLS).then", "sw core precache rejects install atomically");
const corePrecache = (sw.match(/const CORE_PRECACHE_URLS = \[[\s\S]*?\n\];/) || [""])[0];
for (const core of ['"./"', '"index.html"', '`slice.css?v=${RELEASE}`', '`slice.js?v=${RELEASE}`', '"depths-shell.json"']) {
  has(corePrecache, core, `sw required core ${core}`);
}
assert(!corePrecache.includes(".catch"), "sw core precache failure must reject install and preserve the active cache");
const optionalPrecache = (sw.match(/const OPTIONAL_PRECACHE_URLS = \[[\s\S]*?\n\];/) || [""])[0];
assert(optionalPrecache.includes("icons/") && optionalPrecache.includes("assets/"),
  "sw optional precache should contain visual extras");
assert((sw.match(/matchCachedRequest\(request, \{ ignoreSearch: true \}\)/g) || []).length === 1,
  "sw ignoreSearch must be limited to depths offline fallback");
const staticFetchBranch = (sw.match(/if \(url\.origin === self\.location\.origin\) \{[\s\S]*?\n  \}/) || [""])[0];
assert(staticFetchBranch && !staticFetchBranch.includes("ignoreSearch"),
  "sw versioned static assets must use exact cache matches");

// E33: core欠損時はinstallを失敗させ、旧Hazama cacheを消すactivateへ進ませない。
// 画像・iconだけの欠損はbest-effortでinstallを通す。実network/filesystemは使わないVM検証。
async function simulateSwInstall({ failCore = false, failOptional = false } = {}) {
  const handlers = {};
  const deleted = [];
  let skipWaitingCalls = 0;
  let optionalAttempts = 0;
  const cache = {
    addAll: async () => { if (failCore) throw new Error("core miss"); },
    add: async () => { optionalAttempts += 1; if (failOptional) throw new Error("optional miss"); },
    put: async () => {}
  };
  const cacheApi = {
    open: async () => cache,
    keys: async () => ["hazama-pwa-e30-static", "hazama-pwa-e30-runtime", "hazama-pwa-e32-static", "music-cache"],
    delete: async (key) => { deleted.push(key); return true; },
    match: async () => null
  };
  const worker = {
    location: { origin: "https://example.test" },
    clients: { claim: async () => {} },
    skipWaiting: async () => { skipWaitingCalls += 1; },
    addEventListener: (type, handler) => { handlers[type] = handler; }
  };
  vm.runInNewContext(sw, {
    self: worker,
    caches: cacheApi,
    console: { log() {}, warn() {}, error() {} },
    URL,
    Promise
  });

  let installPromise = Promise.resolve();
  handlers.install({ waitUntil: (promise) => { installPromise = Promise.resolve(promise); } });
  let installResolved = true;
  try { await installPromise; } catch { installResolved = false; }
  if (installResolved) {
    let activatePromise = Promise.resolve();
    handlers.activate({ waitUntil: (promise) => { activatePromise = Promise.resolve(promise); } });
    await activatePromise;
  }
  return { installResolved, skipWaitingCalls, optionalAttempts, deleted };
}

const coreMiss = await simulateSwInstall({ failCore: true });
assert(!coreMiss.installResolved, "sw core miss must reject install");
assert(coreMiss.skipWaitingCalls === 0, "sw core miss must not skip waiting");
assert(coreMiss.deleted.length === 0, "sw core miss must preserve the active Hazama caches");
const optionalMiss = await simulateSwInstall({ failOptional: true });
assert(optionalMiss.installResolved && optionalMiss.skipWaitingCalls === 1,
  "sw optional visual miss should keep the complete core install usable");
assert(optionalMiss.optionalAttempts > 0, "sw optional precache path should be exercised");
assert(optionalMiss.deleted.includes("hazama-pwa-e30-static") && optionalMiss.deleted.includes("hazama-pwa-e30-runtime"),
  "sw successful install should retire old Hazama caches");
assert(optionalMiss.deleted.includes("hazama-pwa-e32-static"),
  "sw successful install should retire the immediately previous Hazama cache");
assert(!optionalMiss.deleted.includes("music-cache"), "sw must not delete non-Hazama caches");

// アイコン/アセット実体
for (const a of ["icons/icon-96.png", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-512-maskable.png", "icons/apple-touch-icon.png", "assets/hazama-descent-key.webp"]) nonEmpty(a);

// E29: 降下の弧（背景写真が深度/終端で差し替わる層スタック）。
// base(surface)＝hazama-descent-key.webp は常在（後方互換）。overlay 4 枚＋実体＋CSS クロスフェード＋sw precache。
for (const st of ["drift", "bottom", "surfaced", "omega"]) {
  nonEmpty(`assets/hazama-descent-${st}.webp`);
  has(html, `data-stage="${st}"`, `E29 stage img ${st}`);
  has(sw, `assets/hazama-descent-${st}.webp`, `E29 sw precache ${st}`);
}
has(html, 'class="hz-stage"', "E29 stage layer class");
has(css, ".hz-stage {", "E29 stage layer style");
// E32: 文字列一致を整形非依存の regex に＋E29 の中核契約（base 退場・終端優先ガード・終端 filter）をロック。
const hasRe = (re, label) => assert(re.test(css), `${label} missing: ${re}`);
hasRe(/body:not\(\.surfaced\):not\(\.omega\)\[data-phase="bottom"\]\s+\.hz-stage\[data-stage="bottom"\]/, "E29 depth crossfade rule (terminal-guarded)");
hasRe(/body:not\(\.surfaced\):not\(\.omega\)\[data-phase="drift"\]\s+\.hz-stage\[data-stage="drift"\]/, "E29 drift rule (terminal-guarded)");
hasRe(/body\[data-phase="bottom"\]\s+\.hz-bg-descent\s*\{\s*opacity:\s*0/, "E29 base hidden while stage shows");
hasRe(/body\.surfaced\s+\.hz-stage\[data-stage="surfaced"\]/, "E29 surfaced terminal rule");
hasRe(/body\.omega\s+\.hz-stage\[data-stage="omega"\]/, "E29 omega terminal rule");
hasRe(/body\.surfaced\s+\.hz-stage\[data-stage="surfaced"\]\s*\{[^}]*filter:\s*brightness/, "E32 surfaced terminal fixed filter");
hasRe(/body\.omega\s+\.hz-stage\[data-stage="omega"\]\s*\{[^}]*filter:\s*brightness/, "E32 omega terminal fixed filter");
// E31: overlay は帯域を奪わない（fetchpriority=low ×4・base の high は別途）
assert((html.match(/class="hz-stage"[^>]*fetchpriority="low"/g) || []).length === 4,
  "E32 all 4 stage overlays must carry fetchpriority=low");

// E30: OG 堅牢化＝先頭 og:image は 1200×630 JPG（webp 非対応クライアント欠落対策）＋寸法宣言。
// og-card.jpg は LP と共有（中身は E29 hero 由来で再生成済み）。webp/png は後続フォールバックで残す。
// E32: indexOf の素朴比較（body の img でも成立し得た）を og:image 群のパースに置換＝契約を実体でロック。
nonEmpty("assets/og-card.jpg");
const ogImages = [...html.matchAll(/property="og:image"\s+content="([^"]+)"/g)].map((m) => m[1]);
assert(ogImages.length === 3, `E30 og:image count must stay 3 (got ${ogImages.length})`);
assert(ogImages[0] === "https://quietbriony.github.io/hazama/assets/og-card.jpg",
  "E30 first og:image must be the 1200x630 JPG (legacy/WhatsApp parsers take only the first)");
assert(ogImages.some((u) => u.endsWith("hazama-descent-key.webp")), "E30 webp og:image fallback retained");
assert(ogImages.every((u) => u.startsWith("https://quietbriony.github.io/hazama/")), "E30 og:image must be absolute URLs");
has(html, 'property="og:image:width"', "E30 og:image width declared");
has(html, 'property="og:image:height"', "E30 og:image height declared");
const wIdx = html.indexOf('property="og:image:width"');
assert(wIdx > html.indexOf(ogImages[0]) && wIdx < html.indexOf(ogImages[1]),
  "E30 og:image:width/height must bind to the first og:image (declared between 1st and 2nd)");
has(html, 'property="og:image:alt"', "E32 og:image alt declared");

// E36: 周回の変奏＝択の並び（kind 内 seeded shuffle）＋択の文言（CHOICE_VARIA バンク）＋zero_hold 変奏。
// 初見 cycle0 不変・決定論（worldSeed 系）・機構（to/sink/deep）不変・縁/エコー門は対象外、を契約でロック。
has(js, "const CHOICE_VARIA", "E36 choice varia bank");
has(js, "function orderedChoices", "E36 ordered choices fn");
assert(/function orderedChoices[\s\S]{0,400}?state\.cycle < 1/.test(js), "E36 shuffle must be cycle-gated (cycle0 = authored order)");
assert((js.match(/orderedChoices\(/g) || []).length === 2, "E36 orderedChoices used exactly once (renderChoices only — edge/echo excluded)");
assert(/state\.cycle >= 1 && CHOICE_VARIA\[/.test(js), "E36 label varia must be cycle-gated");
has(js, '"zero>A#descend"', "E36 varia key format (entry band)");
has(js, "月の明るい方へ、引き返す", "E36 seductive retreat variant");
has(js, "zero_hold: {", "E36 zero_hold node variants");
// 変奏は表示だけ＝choose(c) に渡る choice オブジェクトの機構フィールドへは触れない（t/sub の再代入が無いこと）
assert(!/c\.t\s*=|c\.sub\s*=/.test(js), "E36 varia must not mutate choice objects (display-only lead/sub)");

// E37: 絵の変奏＝背景写真セット（降下の弧5枚）が worldSeed×周回で丸ごと回る。
// セットB 実体＋sw precache＋picker の cycle ゲート（cycle0=正典セット・HTML 既定 src と一致）を契約でロック。
for (const st of ["key", "drift", "bottom", "surfaced", "omega"]) {
  nonEmpty(`assets/hazama-descent-${st}-b.webp`);
  has(sw, `assets/hazama-descent-${st}-b.webp`, `E37 sw precache set-B ${st}`);
}
has(js, "const ART_SETS", "E37 art set bank");
has(js, "function applyArtSet", "E37 art set picker");
assert(/function applyArtSet[\s\S]{0,900}?c < 1 \? ""/.test(js), "E37 picker must be cycle-gated (cycle0 = canonical set)");
has(js, "applyArtSet();", "E37 picker wired into applyCycleSkin");
// HTML 既定 src は正典セットのまま（JS 死亡時/初回ペイント＝従来どおり）
assert(!/hazama-descent-key-b\.webp/.test(html), "E37 html default src must stay canonical set");
assert(!/hazama-descent-[a-z]+-b\.webp/.test(html), "E37/E38 html must not reference any set-B asset (stage overlays included)");

// E38: picker の seed 規約＝周回錨（transient 非依存）＋hashStr 拡散。回帰防止:
//  (1) 3 picker とも worldSeed() を参照しない（rank/maxRank で同周回の見えが揺れる）
//  (2) cycle 項に Math.imul を使わない（worldSeed 定数との XOR 相殺／imul 対の先頭 draw 縞）
const pickerSrc = (name, span) => { const i = js.indexOf(name); return i < 0 ? "" : js.slice(i, i + span); };
for (const [name, span] of [["function applyArtSet", 900], ["function orderedChoices", 1100]]) {
  const src = pickerSrc(name, span);
  assert(src.length > 0, `E38 picker present: ${name}`);
  assert(!/worldSeed\(/.test(src), `E38 ${name} must not depend on worldSeed() (transient rank/maxRank)`);
  assert(!/Math\.imul\((state\.cycle|c) \+ 1/.test(src), `E38 ${name} must diffuse cycle via hashStr, not imul`);
}
const labelLine = (js.match(/const vr = mulberry32\([^\n]*/) || [""])[0];
assert(labelLine.includes('hashStr("label:') && !labelLine.includes("worldSeed(") && !labelLine.includes("Math.imul("),
  "E38 label varia seed must be cycle-anchored hashStr (no worldSeed/imul)");

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

// E22: 紹介 LP（表玄関）＋OG カード。ゲーム本体とは別ページ・自己完結（slice ランタイム非依存）・ゲームへ導線。
nonEmpty("lp.html");
nonEmpty("assets/og-card.jpg");
const lpHtml = read("lp.html");
has(lpHtml, 'href="./"', "E22 LP links into the game (./)");
has(lpHtml, "assets/og-card.jpg", "E22 LP references the OG card");
has(lpHtml, 'og:image:width" content="1200"', "E22 LP OG card declares 1200x630");
assert(!lpHtml.includes("slice.js") && !lpHtml.includes("slice.css"), "E22 LP is self-contained (no game runtime deps)");

// E23: 遺言（限界の声が testament を遺して消える）＝Drift seam の attuned 専用 departed-voice（単一 seat）。
has(js, "function pickTestament", "E23 testament picker");
has(js, "const TESTAMENT", "E23 testament bank");
has(js, "遺言", "E23 testament mark (departed-voice)");
assert(/isAttuned\(\)[\s\S]{0,80}pickTestament/.test(js), "E23 testament only on attuned deep run");
const driftFn = (js.match(/function maybeForeignDrift[\s\S]*?\n  \}/) || [""])[0];
assert(driftFn && !driftFn.includes("pickTestament"), "E23 mid-descent seat must not emit testament (single seat)");
assert(!saveBody.includes("testament") && !saveBody.includes("遺言"), "E23 testament stays out of spiral save");

// E24: GUI 品質の磨き（既定不変・追加のみ）＝細い palette スクロールバー・タップ発光除去・選択色・prefers-contrast a11y。
has(css, "scrollbar-width", "E24 thin scrollbar");
has(css, "-webkit-tap-highlight-color", "E24 tap-highlight removed");
has(css, "::selection", "E24 palette selection");
has(css, "prefers-contrast: more", "E24 opt-in high-contrast a11y (game)");
has(lpHtml, "prefers-contrast: more", "E24 opt-in high-contrast a11y (LP)");
has(lpHtml, "scrollbar-width", "E24 LP thin scrollbar");

// E25: design レビュー反映（既定不変・feedback/a11y）＝認識パルス・focus 移動・soma 幹中立・safe-area 左右・onboard SR。
has(css, "hz-attune-pulse", "E25 recognition pulse feedback");
has(css, "env(safe-area-inset-right)", "E25 landscape safe-area (right)");
has(css, "env(safe-area-inset-left)", "E25 landscape safe-area (left)");
has(js, "preventScroll", "E25 focus first choice after reveal (a11y)");
assert(/JUNCTIONS\.has\(state\.id\)\s*&&\s*c\.kind === "surface"/.test(js), "E25 A trunk (soma) is recognition-neutral");
has(js, 'aria-live", "polite"', "E25 onboarding hint in SR live region");

// E26: design レビュー propose 反映＝replay 発見性/初◆グロス/浮上の音戻し/新幹 affordance。
has(read("depths-shell.json"), "まだ開いていない降り方が", "E26 reborn promises unopened trunks (replay legibility)");
has(js, "ATTUNE_GLOSS_KEY", "E26 first-recognition gloss (one-time, own key)");
has(js, "function attuneGlossHint", "E26 attune gloss hint");
has(js, "Audio.update(0.16", "E26 surface pole reopens audio (音が戻る)");
assert(/state\.cycle === c\.minCycle/.test(js), "E26 newly-opened trunk affordance");
has(css, "hz-choice-open", "E26 newly-opened trunk glow");

// E27/E41: 押下の確定感／本文タップの早送りは既読限定（明示ボタンは初見でも可）／封印された扉。
has(js, 'classList.add("chosen")', "E27 choice confirm juice");
has(js, "sceneSkipHandler", "E27 revisit fast-forward handler");
assert(/state\.cycle >= 1 \|\| \(state\.visits\[id\] \|\| 0\) > 1/.test(js), "E27 scene-tap fast-forward gated to revisits only");
has(js, "locked ghost", "E27 sealed-door ghost choice");
has(js, "まだ、開かない。周回した者だけに開く。", "E27 ghost speaks the mechanism in canon phrase");
has(css, ".hz-choice.chosen", "E27 chosen style");
has(css, ".hz-choice.ghost", "E27 ghost style");

// E28: 操作言語の統一＝押下の確定感と focus 着地をエコー門・縁の択にも（renderChoices と同じイディオム）。
has(js, "function confirmThen", "E28 shared confirm helper");
assert((js.match(/confirmThen\(btn, fn\)/g) || []).length >= 3, "E28 confirmThen wired to echo + edge (def + 2 call sites)");
assert((js.match(/focus\(\{ preventScroll: true \}\)/g) || []).length >= 3, "E28 focus landing at choices + echo + edge");

if (failures.length) {
  console.error("build-consistency smoke FAIL");
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}
console.log("build-consistency smoke passed");
