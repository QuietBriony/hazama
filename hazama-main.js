// Hazama main.js v2.2
// Minimal, robust loader + renderer for GitHub Pages / Codespaces
// v2.1: Hub + Seed + Save/Resume (UI is optional; code degrades gracefully)

const APP_VERSION = "v2.2";

const STATE_KEY = "hazama_state_v2";
const DEFAULT_START = "A_start";

let depths = {};
let currentDepthId = DEFAULT_START;

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
  // also log for debugging
  console.log("[Hazama]", msg);
}

function buildDepthsURL() {
  // Resolve relative to the current page URL so it works on:
  // - https://quietbriony.github.io/hazama/
  // - http://127.0.0.1:8000/
  // Add cache-busting to avoid GitHub Pages / browser cache traps.
  const base = new URL("hazama-depths.json", location.href).toString();
  return `${base}?t=${Date.now()}&rnd=${Math.random()}`;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (s && typeof s.currentDepthId === "string") return s;
  } catch (_) {}
  return null;
}

function saveState() {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify({
      version: APP_VERSION,
      currentDepthId,
      ts: Date.now()
    }));
  } catch (_) {}
}

function renderDepth(depthId) {
  const depth = depths[depthId];
  if (!depth) {
    setStatus(`未知の深度ID: ${depthId}`);
    const story = $("story");
    if (story) story.innerHTML = `<p class="hz-error">深度 <b>${escapeHtml(depthId)}</b> が見つかりません。JSONの options.next を確認してください。</p>`;
    return;
  }

  currentDepthId = depthId;
  saveState();

  const storyEl = $("story");
  const optionsEl = $("options");

  if (!storyEl || !optionsEl) {
    // If the DOM is missing, fail loudly in console but don't crash.
    console.error("Required elements missing: #story or #options");
    return;
  }

  const title = depth.title || "";
  const desc = depth.description || "";
  const paragraphs = Array.isArray(depth.story) ? depth.story : [];
  const theme = depth.theme || "";

  storyEl.innerHTML = `
    <div class="hz-block">
      <div class="hz-depth-title">${escapeHtml(title)}</div>
      ${desc ? `<div class="hz-depth-desc">${escapeHtml(desc)}</div>` : ""}
      ${theme ? `<div class="hz-depth-theme">${escapeHtml(theme)}</div>` : ""}
    </div>
    <div class="hz-block">
      ${paragraphs.map(p => `<p>${escapeHtml(p)}</p>`).join("")}
    </div>
  `;

  // Options
  optionsEl.innerHTML = "";
  const opts = Array.isArray(depth.options) ? depth.options : [];
  if (opts.length === 0) {
    const btn = document.createElement("button");
    btn.className = "hz-btn";
    btn.textContent = "最初へ戻る";
    btn.onclick = () => renderDepth(DEFAULT_START);
    optionsEl.appendChild(btn);
  } else {
    for (const o of opts) {
      const btn = document.createElement("button");
      btn.className = "hz-btn";
      btn.textContent = o?.text ?? "…";
      btn.onclick = () => {
        const next = o?.next;
        if (!next) return;
        renderDepth(next);
      };
      optionsEl.appendChild(btn);
    }
  }

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

    // determine start
    const saved = loadState();
    if (saved && depths[saved.currentDepthId]) currentDepthId = saved.currentDepthId;
    else if (depths[DEFAULT_START]) currentDepthId = DEFAULT_START;
    else {
      // fallback: first key
      const keys = Object.keys(depths);
      currentDepthId = keys[0] || DEFAULT_START;
    }

    renderDepth(currentDepthId);
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
      const btn = document.createElement("button");
      btn.className = "hz-btn";
      btn.textContent = "再試行";
      btn.onclick = () => loadDepths();
      options.appendChild(btn);
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
  // Show versions in footer if present
  const v = $("app-version");
  if (v) v.textContent = APP_VERSION;

  // hook reset button if exists
  const resetBtn = $("reset-progress");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      try { localStorage.removeItem(STATE_KEY); } catch (_) {}
      currentDepthId = DEFAULT_START;
      renderDepth(currentDepthId);
    });
  }

  loadDepths();
});
