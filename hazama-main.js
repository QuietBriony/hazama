// Hazama main.js v1.6
// v0.1 core loop: 問い表示 → 入力 → ズラし返答 → 無音待機 → 次深度

function buildDepthsURL() {
  const base = "./hazama-depths.json";
  return `${base}?t=${Date.now()}&rnd=${Math.random()}`;
}

let depths = {};
let currentDepthId = "A_start";
let depthHistory = [];
let stopRequested = false;
let pendingTimerId = null;

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

function renderControls(optionsElem) {
  const controlsWrap = document.createElement("div");
  controlsWrap.className = "hz-controls";

  const backBtn = createControlButton("戻る", () => {
    if (depthHistory.length === 0) return;
    stopRequested = false;
    clearPendingTimer();
    const prevDepth = depthHistory.pop();
    renderDepth(prevDepth, { pushHistory: false });
  }, depthHistory.length === 0);

  const stopBtn = createControlButton(stopRequested ? "停止中" : "停止", () => {
    stopRequested = true;
    clearPendingTimer();
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
    optionsElem.appendChild(
      createControlButton("入口へ戻る（A_start）", () => renderDepth("A_start"))
    );
    return;
  }

  depth.options.forEach((opt) => {
    const btn = createControlButton(opt.text || "(無題の選択肢)", () => beginCoreLoop(opt));
    optionsElem.appendChild(btn);
  });
}

function beginCoreLoop(option) {
  const storyElem = document.getElementById("story");
  const optionsElem = document.getElementById("options");
  if (!storyElem || !optionsElem) return;

  stopRequested = false;

  const question = option.text || "この深度で、あなたは何を選ぶ？";
  storyElem.insertAdjacentHTML(
    "beforeend",
    `<div class="hz-loop-block"><p><strong>問い:</strong> ${escapeHtml(question)}</p></div>`
  );

  const loopBox = document.createElement("div");
  loopBox.className = "hz-loop-input";
  loopBox.innerHTML = `
    <input id="loopInput" type="text" placeholder="ここに入力" maxlength="200" />
    <button id="loopSubmit">返答する</button>
    <button id="loopCancel">停止</button>
  `;

  optionsElem.prepend(loopBox);

  const input = loopBox.querySelector("#loopInput");
  const submit = loopBox.querySelector("#loopSubmit");
  const cancel = loopBox.querySelector("#loopCancel");

  if (input) input.focus();

  const cleanup = () => {
    if (loopBox.parentElement) loopBox.remove();
  };

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
        storyElem.insertAdjacentHTML("beforeend", `<p class="hz-status">停止中のため遷移を中断しました。</p>`);
        return;
      }
      renderDepth(option.next);
    }, silenceMs);
  };

  if (submit) {
    submit.onclick = () => {
      cleanup();
      runTransition();
    };
  }

  if (cancel) {
    cancel.onclick = () => {
      stopRequested = true;
      clearPendingTimer();
      cleanup();
      storyElem.insertAdjacentHTML("beforeend", `<p class="hz-status">⏸ 入力段階で停止しました。</p>`);
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

async function loadDepths() {
  const storyElem = document.getElementById("story");

  try {
    const response = await fetch(buildDepthsURL(), {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    depths = await response.json();

    if (!depths[currentDepthId]) {
      const keys = Object.keys(depths);
      currentDepthId = depths.A_start ? "A_start" : keys[0];
    }

    renderDepth(currentDepthId, { pushHistory: false });
  } catch (error) {
    console.error("Error loading depths:", error);
    if (storyElem) {
      storyElem.innerText = "深度データの読み込みに失敗しました。時間をおいて再試行してください。";
    }
  }
}

window.addEventListener("load", loadDepths);
