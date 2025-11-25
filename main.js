// Hazama main.js v1.4
// 完全キャッシュ破壊 + Raw最新版強制 + 安全一式

// --- 設定 ---
function buildDepthsURL() {
  // GitHub Raw の完全キャッシュ破壊
  const base = "https://raw.githubusercontent.com/QuietBriony/hazama/master/depths.json";
  return `${base}?t=${Date.now()}&rnd=${Math.random()}`;
}

// --- 状態 ---
let depths = {};
let currentDepthId = "A_start";

// --- 初期化 ---
async function loadDepths() {
  const url = buildDepthsURL();

  try {
    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const json = await response.json();
    depths = json;

    console.log("Loaded depths.json:", depths);

    // スタートノードの存在確認
    if (!depths[currentDepthId]) {
      if (depths["A_start"]) currentDepthId = "A_start";
      else if (depths["A"]) currentDepthId = "A";
      else {
        const keys = Object.keys(depths);
        if (keys.length > 0) currentDepthId = keys[0];
        else throw new Error("depths.json が空です。");
      }
    }

    renderDepth(currentDepthId);

  } catch (error) {
    console.error("Error loading depths:", error);
    const storyElem = document.getElementById("story");
    if (storyElem) {
      storyElem.innerText = "深度データの読み込みに失敗しました。時間をおいて再試行してください。";
    }
  }
}

// --- 描画 ---
function renderDepth(depthId) {
  const depth = depths[depthId];
  if (!depth) {
    console.error("Unknown depth:", depthId);
    const s = document.getElementById("story");
    if (s) s.innerText = `深度 ${depthId} が見つかりません。depths.json を確認してください。`;
    return;
  }

  currentDepthId = depthId;

  const storyElem = document.getElementById("story");
  const optionsElem = document.getElementById("options");
  if (!storyElem || !optionsElem) {
    console.error("#story または #options が不足しています（index.html を確認）。");
    return;
  }

  const title = depth.title || "";
  const description = depth.description || "";

  const storyLines = Array.isArray(depth.story)
    ? depth.story
    : typeof depth.story === "string"
    ? [depth.story]
    : [];

  storyElem.innerHTML = `
    <h2>${title}</h2>
    ${description ? `<p class="description">${description}</p>` : ""}
    ${storyLines.map(line => `<p>${line}</p>`).join("")}
  `;

  // 選択肢描画
  optionsElem.innerHTML = "";

  if (!depth.options || depth.options.length === 0) {
    const btn = document.createElement("button");
    btn.textContent = "入口へ戻る（A_start）";
    btn.onclick = () => renderDepth("A_start");
    optionsElem.appendChild(btn);
    return;
  }

  depth.options.forEach(opt => {
    const btn = document.createElement("button");
    btn.textContent = opt.text || "(無題の選択肢)";
    btn.onclick = () => renderDepth(opt.next);
    optionsElem.appendChild(btn);
  });
}

// --- 起動 ---
window.addEventListener("load", loadDepths);