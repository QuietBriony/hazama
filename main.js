// ===============================
// Hazama Engine v1.1 (2025-11)
// depths.json v1.1 対応
// ===============================

// GitHub RAW から直接読み込む（cache no-store）
const DEPTHS_URL =
  "https://raw.githubusercontent.com/QuietBriony/hazama/master/depths.json";

/** 深度データ保持 */
let depths = {};
let currentDepthId = "A_start";   // v1.1 — 初期は A_start

/** GitHub raw から depths.json を取得 */
async function loadDepths() {
  try {
    const response = await fetch(DEPTHS_URL, {
      method: "GET",
      cache: "no-store", // ← Safari/iOS キャッシュ対策
      headers: {
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    depths = await response.json();
    console.log("depths loaded:", depths);

    // 初期表示
    renderDepth(currentDepthId);
  } catch (error) {
    console.error("Error loading depths:", error);
    document.getElementById("story").innerText =
      "深度データの読み込みに失敗しました。少し待ってから再読み込みしてください。";
  }
}

/** 深度を画面に描画 */
function renderDepth(depthId) {
  const depth = depths[depthId];
  if (!depth) {
    console.error("Unknown depth:", depthId);
    return;
  }

  currentDepthId = depthId;

  // タイトル・文章
  const storyElem = document.getElementById("story");
  storyElem.innerHTML = `
    <h2>${depth.title}</h2>
    ${depth.story.map(line => `<p>${line}</p>`).join("")}
  `;

  // 選択肢
  const optionsElem = document.getElementById("options");
  optionsElem.innerHTML = "";

  // options がない（A_reborn 等）場合のハンドリング
  if (!depth.options || depth.options.length === 0) {
    const btn = document.createElement("button");
    btn.textContent = "入口へ戻る（A_start）";
    btn.onclick = () => renderDepth("A_start");
    optionsElem.appendChild(btn);
    return;
  }

  // options がある場合
  depth.options.forEach(opt => {
    const btn = document.createElement("button");
    btn.textContent = opt.text;
    btn.onclick = () => renderDepth(opt.next);
    optionsElem.appendChild(btn);
  });
}

// ページロード時、depths を読み込む
window.addEventListener("load", loadDepths);