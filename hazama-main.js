// Hazama main.js v2.1
// v0.1 core loop: 問い表示 → 入力 → ズラし返答 → 無音待機 → 次深度

const APP_VERSION = "v2.1";

function buildDepthsURL() {
  const base = "./hazama-depths.json";
  return `${base}?t=${Date.now()}&rnd=${Math.random()}`;
}

let depths = {};
let currentDepthId = "A_start";
let depthHistory = [];
let stopRequested = false;
let pendingTimerId = null;
let isLoopActive = false;
let activeLoopCleanup = null;
let hasBootstrapped = false;
let loadingWatchdogId = null;

function showFatalStartupError(message) {
  const storyElem = document.getElementById("story");
  if (!storyElem) return;
  clearLoadingWatchdog();
  storyElem.innerHTML = `
    <p>初期化でエラーが発生しました。</p>
    <p class="hz-status">${escapeHtml(message)}</p>
    <button id="retryLoadBtn">再読み込み</button>
  `;

  const retryBtn = document.getElementById("retryLoadBtn");
  if (retryBtn) {
    retryBtn.onclick = () => {
      retryBtn.disabled = true;
      loadDepths();
    };
  }
}

window.addEventListener("error", (event) => {
  const msg = event?.message || "不明なエラー";
  showFatalStartupError(msg);
});

window.addEventListener("unhandledrejection", (event) => {
  const msg = event?.reason?.message || String(event?.reason || "不明なエラー");
  showFatalStartupError(msg);
});

function syncFooterStatus() {
  const footer = document.querySelector(".hz-footer");
  if (!footer) return;

  let status = footer.querySelector("#runtime-status");
  if (!status) {
    status = document.createElement("small");
    status.id = "runtime-status";
    footer.innerHTML = "";
    footer.appendChild(status);
  }

  status.textContent = `ローカル hazama-depths.json を読込中（Hazama main.js ${APP_VERSION}）`;

  const extras = footer.querySelectorAll("small:not(#runtime-status)");
  extras.forEach((node) => node.remove());
}

function scheduleLoadingWatchdog() {
  clearTimeout(loadingWatchdogId);
  loadingWatchdogId = window.setTimeout(() => {
    const storyElem = document.getElementById("story");
    if (!storyElem) return;

    const currentText = storyElem.textContent || "";
    if (!currentText.includes("深度データを読み込み中")) return;

    storyElem.innerHTML = `
      <p>読み込みが長引いています。待っても復旧しない場合があります。</p>
      <p class="hz-status">確認: HTTPサーバ起動 / URL / キャッシュ再読込</p>
      <button id="retryLoadBtn">再読み込み</button>
    `;

    const retryBtn = document.getElementById("retryLoadBtn");
    if (retryBtn) {
      retryBtn.onclick = () => {
        retryBtn.disabled = true;
        loadDepths();
      };
    }
  }, 6000);
}

function clearLoadingWatchdog() {
  if (!loadingWatchdogId) return;
  clearTimeout(loadingWatchdogId);
  loadingWatchdogId = null;
}

function clearPendingTimer() {
  if (pendingTimerId) {
    clearTimeout(pendingTimerId);
    pendingTimerId = null;
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function shiftInput(text) {
  const trimmed = (text || "").trim();
  if (!trimmed) return "まだ言葉になっていない気配が、境界でゆらいでいる。";

  const replacements = [
    ["私", "わたしの影"],
    ["僕", "ぼくの残響"],
    ["あなた", "境界のあなた"],
    ["いま", "いま/まだ"],
    ["ここ", "こことその外"],
    ["進", "にじむように進"]
  ];

  let shifted = trimmed;
  for (const [from, to] of replacements) {
    shifted = shifted.replace(from, to);
  }

  if (shifted === trimmed) {
    shifted = `${trimmed}、と告げた声が半拍遅れて追いついてくる。`;
  } else {
    shifted = `${shifted}。`;
  }

  return shifted;
}

function createControlButton(label, onClick, disabled = false) {
  const btn = document.createElement("button");
  btn.textContent = label;
  btn.disabled = disabled;
  btn.onclick = onClick;
  return btn;
}

function setOptionButtonsDisabled(disabled) {
  const optionButtons = document.querySelectorAll(".hz-option-btn");
  optionButtons.forEach((btn) => {
    btn.disabled = disabled;
  });
}

function renderControls(optionsElem) {
  const controlsWrap = document.createElement("div");
  controlsWrap.className = "hz-controls";

  const backBtn = createControlButton(
    "戻る",
    () => {
      if (depthHistory.length === 0) return;
      stopRequested = false;
      clearPendingTimer();
      if (activeLoopCleanup) activeLoopCleanup();
      const prevDepth = depthHistory.pop();
      renderDepth(prevDepth, { pushHistory: false });
    },
    depthHistory.length === 0
  );

  const stopBtn = createControlButton(stopRequested ? "停止中" : "停止", () => {
    stopRequested = true;
    clearPendingTimer();
    if (activeLoopCleanup) activeLoopCleanup();
    setOptionButtonsDisabled(false);
    const storyElem = document.getElementById("story");
    if (storyElem) {
      storyElem.insertAdjacentHTML(
        "beforeend",
        `<p class="hz-status">⏸ 進行を停止しました。再開するには選択肢を押してください。</p>`
      );
    }
  });

  controlsWrap.appendChild(backBtn);
  controlsWrap.appendChild(stopBtn);
  optionsElem.appendChild(controlsWrap);
}

function renderDepth(depthId, config = { pushHistory: true }) {
  const depth = depths[depthId];
  const storyElem = document.getElementById("story");
  const optionsElem = document.getElementById("options");

  if (!depth || !storyElem || !optionsElem) {
    if (storyElem) storyElem.innerText = `深度 ${depthId} が見つかりません。`;
    return;
  }

  if (config.pushHistory && currentDepthId !== depthId && depths[currentDepthId]) {
    depthHistory.push(currentDepthId);
  }

  clearPendingTimer();
  stopRequested = false;
  isLoopActive = false;
  activeLoopCleanup = null;
  currentDepthId = depthId;

  const title = depth.title || "";
  const description = depth.description || "";
  const storyLines = Array.isArray(depth.story)
    ? depth.story
    : typeof depth.story === "string"
      ? [depth.story]
      : [];

  storyElem.innerHTML = `
    <h2>${escapeHtml(title)}</h2>
    ${description ? `<p class="description">${escapeHtml(description)}</p>` : ""}
    ${storyLines.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}
  `;

  optionsElem.innerHTML = "";
  renderControls(optionsElem);

  if (!Array.isArray(depth.options) || depth.options.length === 0) {
    const homeBtn = createControlButton("入口へ戻る（A_start）", () => renderDepth("A_start"));
    homeBtn.className = "hz-option-btn";
    optionsElem.appendChild(homeBtn);
    return;
  }

  depth.options.forEach((opt) => {
    const btn = createControlButton(opt.text || "(無題の選択肢)", () => beginCoreLoop(opt));
    btn.classList.add("hz-option-btn");
    optionsElem.appendChild(btn);
  });
}

function beginCoreLoop(option) {
  const storyElem = document.getElementById("story");
  const optionsElem = document.getElementById("options");
  if (!storyElem || !optionsElem || isLoopActive) return;

  const existingBox = document.querySelector(".hz-loop-input");
  if (existingBox) existingBox.remove();

  stopRequested = false;
  isLoopActive = true;
  setOptionButtonsDisabled(true);

  const question = option.text || "この深度で、あなたは何を選ぶ？";
  storyElem.insertAdjacentHTML(
    "beforeend",
    `<div class="hz-loop-block"><p><strong>問い:</strong> ${escapeHtml(question)}</p></div>`
  );

  const loopBox = document.createElement("div");
  loopBox.className = "hz-loop-input";
  loopBox.innerHTML = `
    <input id="loopInput" type="text" placeholder="入力は任意。未入力でも返答できます" maxlength="200" />
    <button id="loopSubmit">返答する</button>
  `;

  const hint = document.createElement("p");
  hint.className = "hz-loop-hint";
  hint.textContent = "※ 連続タップ防止のため、この段階では他の選択肢は一時停止しています。";

  optionsElem.prepend(hint);
  optionsElem.prepend(loopBox);

  const input = loopBox.querySelector("#loopInput");
  const submit = loopBox.querySelector("#loopSubmit");

  if (input) input.focus();

  const cleanup = () => {
    if (loopBox.parentElement) loopBox.remove();
    if (hint.parentElement) hint.remove();
    activeLoopCleanup = null;
  };

  activeLoopCleanup = cleanup;

  const runTransition = () => {
    const userText = input ? input.value : "";
    const shifted = shiftInput(userText);

    storyElem.insertAdjacentHTML(
      "beforeend",
      `<p><strong>入力:</strong> ${escapeHtml(userText || "(無言)")}</p><p><strong>ズラし返答:</strong> ${escapeHtml(shifted)}</p>`
    );

    const silenceMs = 3000 + Math.floor(Math.random() * 2001);
    storyElem.insertAdjacentHTML(
      "beforeend",
      `<p class="hz-status">…${Math.round(silenceMs / 1000)}秒ほど沈黙します。</p>`
    );

    pendingTimerId = window.setTimeout(() => {
      pendingTimerId = null;
      if (stopRequested) {
        isLoopActive = false;
        setOptionButtonsDisabled(false);
        storyElem.insertAdjacentHTML("beforeend", `<p class="hz-status">停止中のため遷移を中断しました。</p>`);
        return;
      }
      renderDepth(option.next);
    }, silenceMs);
  };

  if (submit) {
    submit.onclick = () => {
      submit.disabled = true;
      cleanup();
      runTransition();
    };
  }

  if (input) {
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        if (submit) submit.click();
      }
    });
  }
}

async function fetchDepthsFrom(url) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json"
      },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    if (error && error.name === "AbortError") {
      throw new Error(`Timeout: ${url}`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function loadDepths() {
  scheduleLoadingWatchdog();
  const storyElem = document.getElementById("story");
  const candidates = [
    buildDepthsURL(),
    `./depths.json?t=${Date.now()}`
  ];

  try {
    let lastError = null;

    for (const url of candidates) {
      try {
        depths = await fetchDepthsFrom(url);
        console.log("Loaded depths from:", url);
        break;
      } catch (error) {
        lastError = error;
      }
    }

    if (!depths || Object.keys(depths).length === 0) {
      throw lastError || new Error("depth data is empty");
    }

    if (!depths[currentDepthId]) {
      const keys = Object.keys(depths);
      currentDepthId = depths.A_start ? "A_start" : keys[0];
    }

    renderDepth(currentDepthId, { pushHistory: false });
    clearLoadingWatchdog();
  } catch (error) {
    console.error("Error loading depths:", error);
    if (storyElem) {
      clearLoadingWatchdog();
      storyElem.innerHTML = `
        <p>深度データの読み込みに失敗しました。待っても自動復旧しないため、再読み込みを試してください。</p>
        <p class="hz-status">確認: HTTPサーバ起動 / URLが <code>/hazama/</code> 末尾か / キャッシュ更新</p>
        <button id="retryLoadBtn">再読み込み</button>
      `;

      const retryBtn = document.getElementById("retryLoadBtn");
      if (retryBtn) {
        retryBtn.onclick = () => {
          retryBtn.disabled = true;
          loadDepths();
        };
      }
    }
  }
}

function bootstrapApp() {
  if (hasBootstrapped) return;
  hasBootstrapped = true;
  syncFooterStatus();
  scheduleLoadingWatchdog();
  loadDepths();
}

window.addEventListener("DOMContentLoaded", bootstrapApp);
window.addEventListener("load", bootstrapApp);
if (document.readyState !== "loading") {
  bootstrapApp();
}
