// Hazama main.js v2.1
// v0.1: Hub + Seed + Save/Resume

const APP_VERSION = "v2.1";

function buildDepthsURL() {
  // location.href 基準で確実に /hazama/hazama-depths.json を解決する
  const base = new URL("hazama-depths.json", location.href).toString();
  return `${base}?t=${Date.now()}&rnd=${Math.random()}`;
}

let depths = {};
let currentDepthId = "A_start";
let depthHistory = [];
let pendingTimerId = null;
let isLoopActive = false;
let currentSeed = "";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function clearPendingTimer() {
  if (pendingTimerId) {
    clearTimeout(pendingTimerId);
    pendingTimerId = null;
  }
}

function syncFooterStatus() {
  const status = document.getElementById("runtime-status");
  if (!status) return;
  status.textContent = `ローカル hazama-depths.json を読込中（Hazama main.js ${APP_VERSION}）`;
}

function shiftInput(text, depthId) {
  const base = String(text || "").trim() || "(無言)";
  const seedText = `${currentSeed}:${depthId}:${base.length}`;
  const hash = window.HazamaSeed ? window.HazamaSeed.hashText(seedText) : "0000";
  const mode = parseInt(hash.slice(0, 2), 16) % 3;

    console.log("Loaded hazama-depths.json:", depths);

    // スタートノードの存在確認
    if (!depths[currentDepthId]) {
      if (depths["A_start"]) currentDepthId = "A_start";
      else if (depths["A"]) currentDepthId = "A";
      else {
        const keys = Object.keys(depths);
        if (keys.length > 0) currentDepthId = keys[0];
        else throw new Error("hazama-depths.json が空です。");
      }
    }

function resetSession() {
  clearPendingTimer();
  isLoopActive = false;
  depthHistory = [];
  if (window.HazamaState) window.HazamaState.clearProgress();
  if (window.HazamaSeed) window.HazamaSeed.clearSeed();
  currentSeed = "";
  bootstrapApp(true);
}

function stopToHub() {
  clearPendingTimer();
  isLoopActive = false;
  renderDepth("HUB_NIGHT", { pushHistory: false });
}

// --- 描画 ---
function renderDepth(depthId) {
  const depth = depths[depthId];
  if (!depth) {
    console.error("Unknown depth:", depthId);
    const s = document.getElementById("story");
    if (s) s.innerText = `深度 ${depthId} が見つかりません。hazama-depths.json を確認してください。`;
    return;
  }

function renderSessionControls(optionsElem) {
  const wrap = document.createElement("div");
  wrap.className = "hz-session-controls";

  const resumeBtn = createButton("Resume", () => {
    const saved = window.HazamaState ? window.HazamaState.loadProgress() : null;
    if (!saved || !saved.nodeId) return;
    renderDepth(saved.nodeId, { pushHistory: false });
  });

  const resetBtn = createButton("Reset", () => {
    if (window.confirm("保存状態を消去して A_start に戻りますか？")) {
      if (window.HazamaState) window.HazamaState.clearProgress();
      renderDepth("A_start", { pushHistory: false });
    }
  });

  const backBtn = createButton("戻る", () => {
    if (depthHistory.length === 0) return;
    const prev = depthHistory.pop();
    renderDepth(prev, { pushHistory: false });
  });

  const stopBtn = createButton("STOP", stopToHub, "hz-stop-btn");

  wrap.appendChild(resumeBtn);
  wrap.appendChild(resetBtn);
  wrap.appendChild(backBtn);
  wrap.appendChild(stopBtn);
  optionsElem.appendChild(wrap);
}

function renderDepth(depthId, config = { pushHistory: true }) {
  const depth = depths[depthId];
  const storyElem = document.getElementById("story");
  const optionsElem = document.getElementById("options");
  if (!depth || !storyElem || !optionsElem) return;

  if (config.pushHistory && currentDepthId !== depthId && depths[currentDepthId]) {
    depthHistory.push(currentDepthId);
  }

  clearPendingTimer();
  isLoopActive = false;
  currentDepthId = depthId;
  persistProgress(depthId);

  const storyLines = Array.isArray(depth.story)
    ? depth.story
    : typeof depth.story === "string"
      ? [depth.story]
      : [];

  storyElem.innerHTML = `
    <h2>${escapeHtml(depth.title || "")}</h2>
    ${depth.description ? `<p class="description">${escapeHtml(depth.description)}</p>` : ""}
    ${storyLines.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}
  `;

  optionsElem.innerHTML = "";
  renderSessionControls(optionsElem);

  const options = Array.isArray(depth.options) ? depth.options : [];
  if (options.length === 0) {
    optionsElem.appendChild(createButton("入口へ戻る（A_start）", () => renderDepth("A_start")));
    return;
  }

  options.forEach((opt) => {
    const btn = createButton(opt.text || "(無題)", () => beginCoreLoop(opt, options.length));
    btn.classList.add("hz-option-btn");
    optionsElem.appendChild(btn);
  });
}

function setOptionButtonsDisabled(disabled) {
  document.querySelectorAll(".hz-option-btn").forEach((btn) => {
    btn.disabled = disabled;
  });
}

function beginCoreLoop(option, currentOptionCount) {
  const storyElem = document.getElementById("story");
  const optionsElem = document.getElementById("options");
  if (!storyElem || !optionsElem || isLoopActive) return;

  isLoopActive = true;
  setOptionButtonsDisabled(true);

  const box = document.createElement("div");
  box.className = "hz-loop-input";
  box.innerHTML = `
    <input id="loopInput" type="text" placeholder="1文入力（任意）" maxlength="200" />
    <button id="loopSubmit">送信</button>
  `;
  optionsElem.prepend(box);

  storyElem.insertAdjacentHTML("beforeend", `<p><strong>問い:</strong> ${escapeHtml(option.text || "次の一歩")}</p>`);

  const input = box.querySelector("#loopInput");
  const submit = box.querySelector("#loopSubmit");

  const finalize = () => {
    isLoopActive = false;
    setOptionButtonsDisabled(false);
    if (box.parentElement) box.remove();
  };

  const onSubmit = () => {
    if (submit) submit.disabled = true;
    const userText = input ? input.value : "";
    const reframed = shiftInput(userText, currentDepthId);

    storyElem.insertAdjacentHTML(
      "beforeend",
      `<p><strong>入力:</strong> ${escapeHtml(userText || "(無言)")}</p><p><strong>ズラし返答:</strong> ${escapeHtml(reframed)}</p>`
    );

    const waitMs = 3000 + Math.floor(Math.random() * 2001);
    storyElem.insertAdjacentHTML("beforeend", `<p class="hz-status">pause… ${Math.round(waitMs / 1000)}秒</p>`);

    pendingTimerId = window.setTimeout(() => {
      pendingTimerId = null;
      if (currentOptionCount === 1 && option.next) {
        renderDepth(option.next);
      } else {
        finalize();
      }
    }, waitMs);
  };

  if (submit) submit.onclick = onSubmit;
  if (input) {
    input.focus();
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        onSubmit();
      }
    });
  }
}

function ensureHubTopology() {
  if (!depths.HUB_NIGHT) return;

  Object.entries(depths).forEach(([key, node]) => {
    if (!node || typeof node !== "object" || key === "HUB_NIGHT") return;
    if (!Array.isArray(node.options)) node.options = [];
    const hasHub = node.options.some((opt) => opt && opt.next === "HUB_NIGHT");
    if (!hasHub) node.options.push({ text: "HUBへ戻る", next: "HUB_NIGHT" });
  });
}

async function fetchDepthsFrom(url) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(url, { cache: "no-store", signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
    return response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

async function loadDepths() {
  const candidates = [buildDepthsURL(), `./depths.json?t=${Date.now()}`];
  let lastError = null;

  for (const url of candidates) {
    try {
      depths = await fetchDepthsFrom(url);
      break;
    } catch (error) {
      lastError = error;
    }
  }

  if (!depths || Object.keys(depths).length === 0) {
    throw lastError || new Error("depth data is empty");
  }

  ensureHubTopology();
}

async function bootstrapApp(forceReset = false) {
  syncFooterStatus();

  try {
    await loadDepths();

    currentSeed = window.HazamaSeed ? await window.HazamaSeed.ensureSeed() : "seedless";
    const saved = !forceReset && window.HazamaState ? window.HazamaState.loadProgress() : null;

    if (saved && saved.nodeId && depths[saved.nodeId]) {
      renderDepth(saved.nodeId, { pushHistory: false });
      return;
    }

    renderDepth("A_start", { pushHistory: false });
  } catch (error) {
    const storyElem = document.getElementById("story");
    if (storyElem) {
      storyElem.innerHTML = `
        <p>深度データの読み込みに失敗しました。</p>
        <p class="hz-status">${escapeHtml(error.message || "unknown error")}</p>
        <button id="retryLoadBtn">再読み込み</button>
      `;
      const retryBtn = document.getElementById("retryLoadBtn");
      if (retryBtn) retryBtn.onclick = () => bootstrapApp(false);
    }
  }
}

window.addEventListener("DOMContentLoaded", () => bootstrapApp(false));
