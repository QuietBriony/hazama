// Hazama main.js v2.2
// Minimal, robust loader + renderer for GitHub Pages / Codespaces
// v2.2: reconnect seed/state helpers and restore the local v0.1 core loop.

const APP_VERSION = "v2.2";

const STATE_KEY = "hazama_state_v2";
const SEED_KEY = "hazama_seed";
const DEFAULT_START = "A_start";
const HUB_DEPTH = "HUB_NIGHT";
const CORE_MAX_INPUT = 80;

let depths = {};
let currentDepthId = DEFAULT_START;
let historyStack = [];
let pauseTimer = null;
let pendingNextDepthId = null;
let navigationLocked = false;

function $(id) { return document.getElementById(id); }

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function setStatus(msg) {
  const el = $("runtime-status");
  if (el) el.textContent = msg;
  console.log("[Hazama]", msg);
}

function buildDepthsURL() {
  const base = new URL("hazama-depths.json", location.href).toString();
  return `${base}?t=${Date.now()}&rnd=${Math.random()}`;
}

function localHashText(input) {
  let h = 2166136261;
  const text = String(input || "");
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

function hashText(input) {
  try {
    if (window.HazamaSeed && typeof window.HazamaSeed.hashText === "function") {
      return window.HazamaSeed.hashText(input);
    }
  } catch (_) {}
  return localHashText(input);
}

function safeLocalStorageGet(key) {
  try {
    return localStorage.getItem(key);
  } catch (_) {
    return null;
  }
}

function safeLocalStorageSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (_) {}
}

function safeLocalStorageRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch (_) {}
}

function ensureSeed() {
  const existing = safeLocalStorageGet(SEED_KEY);
  if (existing) return existing;

  const entropy = [
    APP_VERSION,
    Date.now(),
    Math.random(),
    navigator.userAgent,
    location.pathname
  ].join("|");
  const seed = hashText(entropy);
  safeLocalStorageSet(SEED_KEY, seed);
  return seed;
}

function loadProgress() {
  try {
    if (window.HazamaState && typeof window.HazamaState.loadProgress === "function") {
      const data = window.HazamaState.loadProgress();
      if (data && typeof data.nodeId === "string") return data;
    }
  } catch (_) {}

  try {
    const raw = safeLocalStorageGet(STATE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data && typeof data.currentDepthId === "string") {
      return { nodeId: data.currentDepthId, seed: data.seed || safeLocalStorageGet(SEED_KEY) };
    }
  } catch (_) {}
  return null;
}

function saveProgress() {
  const seed = ensureSeed();

  try {
    if (window.HazamaState && typeof window.HazamaState.saveProgress === "function") {
      window.HazamaState.saveProgress(currentDepthId, seed);
      return;
    }
  } catch (_) {}

  safeLocalStorageSet(STATE_KEY, JSON.stringify({
    version: APP_VERSION,
    currentDepthId,
    seed,
    ts: Date.now()
  }));
}

function clearProgress() {
  try {
    if (window.HazamaState && typeof window.HazamaState.clearProgress === "function") {
      window.HazamaState.clearProgress();
    }
  } catch (_) {}
  try {
    if (window.HazamaSeed && typeof window.HazamaSeed.clearSeed === "function") {
      window.HazamaSeed.clearSeed();
    }
  } catch (_) {}

  safeLocalStorageRemove(STATE_KEY);
  safeLocalStorageRemove(SEED_KEY);
}

function numericHash(input) {
  return parseInt(hashText(input).slice(0, 8), 16) || 0;
}

function pick(list, n) {
  return list[Math.abs(n) % list.length];
}

function getPrimaryNext(depth) {
  const opts = Array.isArray(depth?.options) ? depth.options : [];
  const first = opts.find((o) => o && typeof o.next === "string" && depths[o.next]);
  return first ? first.next : null;
}

function questionForDepth(depth) {
  const title = depth?.title ? `「${depth.title}」` : "この深度";
  const prompts = [
    `${title}で、いま一番小さく動かせるものは何ですか。`,
    `${title}に立って、手放しても安全な言葉を一つだけ置いてください。`,
    `${title}の輪郭を、短い一文でなぞるなら何ですか。`,
    `${title}から戻れる余白を残すなら、何を選びますか。`
  ];
  return pick(prompts, numericHash(`${currentDepthId}|question`));
}

function makeShiftReply(text, seed, depthId) {
  const h = numericHash(`${seed}|${depthId}|${text}`);
  const lenses = ["輪郭", "余白", "速度", "距離", "静けさ", "重なり"];
  const moves = ["半歩だけ横へ置く", "名前を外して眺める", "薄い影として残す", "入口の手前に戻す", "別の呼吸に合わせる"];
  const anchors = ["深めなくていい", "戻れるままでいい", "急がなくていい", "選ばない余地も残していい"];
  return [
    "ズラし返答：",
    `${pick(lenses, h)}を${pick(moves, h >> 3)}。`,
    `${pick(anchors, h >> 6)}。`
  ].join("");
}

function pauseLengthMs(seed, depthId, text) {
  return 3000 + (numericHash(`${seed}|${depthId}|pause|${text}`) % 2001);
}

function clearPause() {
  if (pauseTimer) {
    window.clearTimeout(pauseTimer);
    pauseTimer = null;
  }
  pendingNextDepthId = null;
  setNavigationLocked(false);
}

function setNavigationLocked(locked) {
  navigationLocked = locked;
  for (const btn of document.querySelectorAll(".hz-depth-option")) {
    btn.disabled = locked;
  }
}

function renderCoreLoop(depth) {
  const form = $("core-form");
  const input = $("core-input");
  const response = $("core-response");
  const pause = $("core-pause");
  const nextBtn = $("core-next");

  if (!form || !input || !response || !pause || !nextBtn) return;

  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    clearPause();

    const text = String(input.value || "").trim().slice(0, CORE_MAX_INPUT);
    if (!text) {
      pause.textContent = "一言だけ置いてから、返答を受け取れます。";
      setStatus("入力待ち");
      return;
    }

    const seed = ensureSeed();
    const shifted = makeShiftReply(text, seed, currentDepthId);
    const waitMs = pauseLengthMs(seed, currentDepthId, text);

    response.textContent = shifted;
    pause.textContent = "沈黙中… 呼吸を戻しています。";
    nextBtn.hidden = true;
    nextBtn.disabled = true;
    input.value = "";
    setNavigationLocked(true);
    setStatus(`沈黙中: ${Math.round(waitMs / 1000)}秒`);

    pauseTimer = window.setTimeout(() => {
      pauseTimer = null;
      pendingNextDepthId = getPrimaryNext(depth);
      setNavigationLocked(false);
      pause.textContent = pendingNextDepthId
        ? "進めます。次へ進むか、ここに残るかを選べます。"
        : "ここで止まれます。必要なら最初へ戻れます。";
      if (pendingNextDepthId) {
        nextBtn.hidden = false;
        nextBtn.disabled = false;
      }
      setStatus(`OK: ${currentDepthId}`);
    }, waitMs);
  });

  nextBtn.addEventListener("click", () => {
    if (pendingNextDepthId) renderDepth(pendingNextDepthId);
  });
}

function addButton(parent, label, onClick, className = "hz-btn") {
  const btn = document.createElement("button");
  btn.className = className;
  btn.textContent = label;
  btn.onclick = onClick;
  parent.appendChild(btn);
  return btn;
}

function renderControls(optionsEl) {
  const controls = document.createElement("div");
  controls.className = "hz-controls";

  addButton(controls, "停止", () => {
    clearPause();
    const pause = $("core-pause");
    const nextBtn = $("core-next");
    if (pause) pause.textContent = "停止しました。ここから戻るか、別の選択肢へ移れます。";
    if (nextBtn) {
      nextBtn.hidden = true;
      nextBtn.disabled = true;
    }
    setStatus(`停止中: ${currentDepthId}`);
  });

  const backBtn = addButton(controls, "1ステップ戻る", () => {
    clearPause();
    const prev = historyStack.pop();
    if (prev && depths[prev]) renderDepth(prev, { recordHistory: false });
  });
  backBtn.disabled = historyStack.length === 0;

  const homeTarget = (currentDepthId !== HUB_DEPTH && depths[HUB_DEPTH]) ? HUB_DEPTH : DEFAULT_START;
  addButton(controls, homeTarget === HUB_DEPTH ? "HUBへ戻る" : "最初へ戻る", () => {
    clearPause();
    renderDepth(homeTarget);
  });

  optionsEl.appendChild(controls);
}

function renderOptions(depth, optionsEl) {
  const opts = Array.isArray(depth.options) ? depth.options : [];
  if (opts.length === 0) {
    addButton(optionsEl, "最初へ戻る", () => {
      clearPause();
      renderDepth(DEFAULT_START);
    }, "hz-btn hz-depth-option");
    return;
  }

  for (const o of opts) {
    const btn = addButton(optionsEl, o?.text ?? "…", () => {
      if (navigationLocked) return;
      const next = o?.next;
      if (!next) return;
      clearPause();
      renderDepth(next);
    }, "hz-btn hz-depth-option");
    btn.disabled = navigationLocked;
  }
}

function renderDepth(depthId, opts = {}) {
  const depth = depths[depthId];
  if (!depth) {
    setStatus(`未知の深度ID: ${depthId}`);
    const story = $("story");
    if (story) story.innerHTML = `<p class="hz-error">深度 <b>${escapeHtml(depthId)}</b> が見つかりません。JSONの options.next を確認してください。</p>`;
    return;
  }

  clearPause();
  const shouldRecord = opts.recordHistory !== false;
  if (shouldRecord && currentDepthId && currentDepthId !== depthId && depths[currentDepthId]) {
    historyStack.push(currentDepthId);
  }
  currentDepthId = depthId;
  saveProgress();

  const storyEl = $("story");
  const optionsEl = $("options");

  if (!storyEl || !optionsEl) {
    console.error("Required elements missing: #story or #options");
    return;
  }

  const title = depth.title || "";
  const desc = depth.description || "";
  const paragraphs = Array.isArray(depth.story) ? depth.story : [];
  const theme = depth.theme || "";
  const question = questionForDepth(depth);

  storyEl.innerHTML = `
    <div class="hz-block">
      <div class="hz-depth-title">${escapeHtml(title)}</div>
      ${desc ? `<div class="hz-depth-desc">${escapeHtml(desc)}</div>` : ""}
      ${theme ? `<div class="hz-depth-theme">${escapeHtml(theme)}</div>` : ""}
    </div>
    <div class="hz-block">
      ${paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join("")}
    </div>
    <div class="hz-block hz-core-loop">
      <div class="hz-depth-theme">問い</div>
      <p>${escapeHtml(question)}</p>
      <form id="core-form" class="hz-core-form">
        <input id="core-input" type="text" maxlength="${CORE_MAX_INPUT}" autocomplete="off" placeholder="短く一言だけ" />
        <button class="hz-btn" type="submit">返す</button>
      </form>
      <p id="core-response" class="hz-core-response" aria-live="polite"></p>
      <p id="core-pause" class="hz-core-pause" aria-live="polite"></p>
      <button id="core-next" class="hz-btn" type="button" hidden disabled>次深度へ</button>
    </div>
  `;

  optionsEl.innerHTML = "";
  renderControls(optionsEl);
  renderOptions(depth, optionsEl);
  renderCoreLoop(depth);

  setStatus(`OK: ${depthId}`);
}

async function loadDepths() {
  setStatus("深度データを読み込み中…");
  const url = buildDepthsURL();

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json();
    if (!json || typeof json !== "object") throw new Error("JSON形式が不正です");

    depths = json;

    const saved = loadProgress();
    if (saved && depths[saved.nodeId]) currentDepthId = saved.nodeId;
    else if (depths[DEFAULT_START]) currentDepthId = DEFAULT_START;
    else {
      const keys = Object.keys(depths);
      currentDepthId = keys[0] || DEFAULT_START;
    }

    renderDepth(currentDepthId, { recordHistory: false });
  } catch (e) {
    console.error("Error loading depths:", e);
    setStatus("深度データの読み込みに失敗");
    const story = $("story");
    const options = $("options");
    if (story) {
      story.innerHTML = `
        <p class="hz-error">深度データの読み込みに失敗しました。</p>
        <p class="hz-mono">URL: ${escapeHtml(url)}</p>
        <p class="hz-mono">Error: ${escapeHtml(e?.message || String(e))}</p>
      `;
    }
    if (options) {
      options.innerHTML = "";
      addButton(options, "再試行", () => loadDepths());
    }
  }
}

window.addEventListener("error", (ev) => {
  console.error("Uncaught error:", ev.error || ev.message);
  setStatus("起動エラー（console参照）");
});
window.addEventListener("unhandledrejection", (ev) => {
  console.error("Unhandled rejection:", ev.reason);
  setStatus("起動エラー（console参照）");
});

document.addEventListener("DOMContentLoaded", () => {
  const v = $("app-version");
  if (v) v.textContent = APP_VERSION;

  const resetBtn = $("reset-progress");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      clearProgress();
      historyStack = [];
      currentDepthId = DEFAULT_START;
      renderDepth(currentDepthId, { recordHistory: false });
    });
  }

  loadDepths();
});
