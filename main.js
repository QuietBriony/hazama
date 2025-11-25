// Hazama main.js v1.3
// 完全安定版：Raw depths.json × Safari対策 × A_startフォールバック

const DEPTHS_URL =
  "https://raw.githubusercontent.com/QuietBriony/hazama/master/depths.json";

let depths = {};
let currentDepthId = "A_start";

// --- 初期化 ---
async function loadDepths() {
  try {
    const response = await fetch(DEPTHS_URL, {
      method: "GET",
      cache: "no-store",
      headers: { "Accept": "application/json" }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    depths = await response.json();
    console.log("Loaded depths:", depths);

    // フォールバック
    if (!depths[currentDepthId]) {
      if (depths["A_start"]) currentDepthId = "A_start";
      else if (depths["A"]) currentDepthId = "A";
      else currentDepthId = Object.keys(depths)[0];
    }

    renderDepth(currentDepthId);
  } catch (e) {
    console.error(e);
    document.getElementById("story").innerText =
      "深度データの読み込みに失敗しました。";
  }
}

// --- 描画 ---
function renderDepth(id) {
  const depth = depths[id];
  if (!depth) {
    document.getElementById("story").innerText = `深度 ${id} が見つかりません。`;
    return;
  }

  currentDepthId = id;

  const storyElem = document.getElementById("story");
  const optionsElem = document.getElementById("options");

  const title = depth.title || "";
const description = depth.description || "";
const storyLines = Array.isArray(depth.story)
  ? depth.story
  : typeof depth.story === "string"
  ? [depth.story]
  : [];

// DOM 存在チェック（将来 index.html いじっても即クラッシュしないように）
const storyElem = document.getElementById("story");
const optionsElem = document.getElementById("options");
if (!storyElem || !optionsElem) {
  console.error("#story または #options が見つかりません。index.html を確認してください。");
  return;
}

storyElem.innerHTML = `
  <h2>${title}</h2>
  ${description ? `<p class="description">${description}</p>` : ""}
  ${storyLines.map(line => `<p>${line}</p>`).join("")}
`;

  optionsElem.innerHTML = "";

  if (!depth.options || depth.options.length === 0) {
    const btn = document.createElement("button");
    btn.textContent = "入口へ戻る";
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
