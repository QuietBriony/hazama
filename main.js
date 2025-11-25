// Hazama main.js v1.2
// GitHub Raw depths.json 対応 / A_start フォールバック / Safari キャッシュ対策

// --- 設定 ---
const DEPTHS_URL =
  "https://raw.githubusercontent.com/QuietBriony/hazama/master/depths.json";

// --- 状態 ---
let depths = {};
let currentDepthId = "A_start";

// --- 初期化 ---
async function loadDepths() {
  try {
    const response = await fetch(DEPTHS_URL, {
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

    depths = await response.json();
    console.log("depths loaded:", depths);

    // スタートノードの存在チェック
    if (!depths[currentDepthId]) {
      if (depths["A_start"]) {
        currentDepthId = "A_start";
      } else if (depths["A"]) {
        currentDepthId = "A";
      } else {
        // それも無いなら、最初のキーにフォールバック
        const keys = Object.keys(depths);
        if (keys.length > 0) {
          currentDepthId = keys[0];
        } else {
          throw new Error("depths.json が空です。");
        }
      }
    }

    renderDepth(currentDepthId);
  } catch (error) {
    console.error("Error loading depths:", error);
    const storyElem = document.getElementById("story");
    if (storyElem) {
      storyElem.innerText =
        "深度データの読み込みに失敗しました。しばらくしてから再試行してください。";
    }
  }
}

// --- 描画 ---
function renderDepth(depthId) {
  const depth = depths[depthId];
  if (!depth) {
    console.error("Unknown depth:", depthId);
    const storyElem = document.getElementById("story");
    if (storyElem) {
      storyElem.innerText = `深度 ${depthId} が見つかりません。depths.json を確認してください。`;
    }
    return;
  }

  currentDepthId = depthId;

  const storyElem = document.getElementById("story");
  const optionsElem = document.getElementById("options");
  if (!storyElem || !optionsElem) {
    console.error("#story または #options が存在しません（index.html を確認）。");
    return;
  }

  // タイトル
  const title = depth.title || "";
  const description = depth.description || "";

  // story は配列でも単一文字列でもOKにする
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