// ===============================
// Hazama Engine v1.1 (2025-11)
// depths.json v1.1 対応 / Safari最適化
// ===============================

// GitHub RAW から常に最新を取得（キャッシュ禁止）
const DEPTHS_URL =
  "https://raw.githubusercontent.com/QuietBriony/hazama/master/depths.json";

// 深度データ
let depths = {};
let currentDepthId = "A_start";   // v1.1 初期ノード

// -------------------------------
// depths.json 読み込み
// -------------------------------
async function loadDepths() {
  try {
    const response = await fetch(DEPTHS_URL, {
      method: "GET",
      cache: "no-store",     // ← Safari / iOS キャッシュ回避
      headers: {
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    depths = await response.json();
    console.log("depths loaded:", depths);

    renderDepth(currentDepthId);

  } catch (error) {
    console.error("Error loading depths:", error);
    document.getElementById("story").innerText =
      "深度データの読み込みに失敗しました。しばらくしてから再試行してください。";
  }
}

// -------------------------------
// 画面描画
// -------------------------------
function renderDepth(depthId) {
  const depth = depths[depthId];
  if (!depth) {
    console.error("Unknown depth:", depthId);
    return;
  }

  currentDepthId = depthId;

  // --- 本文 ---
  const storyElem = document.getElementById("story");
  storyElem.innerHTML = `
    <h2>${depth.title}</h2>
    ${depth.story.map(line => `<p>${line}</p>`).join("")}
  `;

  // --- 選択肢 ---
  const optionsElem = document.getElementById("options");
  optionsElem.innerHTML = "";

  // 選択肢が無い場合（A_reborn など）
  if (!depth.options || depth.options.length === 0) {
    const btn = document.createElement("button");
    btn.textContent = "入口へ戻る（A_start）";
    btn.onclick = () => renderDepth("A_start");
    optionsElem.appendChild(btn);
    return;
  }

  // 選択肢がある場合
  depth.options.forEach(opt => {
    const btn = document.createElement("button");
    btn.textContent = opt.text;
    btn.onclick = () => renderDepth(opt.next);
    optionsElem.appendChild(btn);
  });
}

// -------------------------------
// ページロード
// -------------------------------
window.addEventListener("load", loadDepths);