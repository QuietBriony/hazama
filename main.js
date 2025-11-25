let depths = {};
let currentDepthId = "A_start";

async function loadDepths() {
  try {
    const response = await fetch(DEPTHS_URL, {
      method: "GET",
      cache: "no-store",
      headers: { "Content-Type": "application/json" }
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    depths = await response.json();
    console.log("depths loaded:", depths);

    // ▼ ここだけ追加：スタートノード存在チェック
    if (!depths[currentDepthId]) {
      if (depths["A_start"]) {
        currentDepthId = "A_start";
      } else if (depths["A"]) {
        currentDepthId = "A";
      } else {
        throw new Error("A_start も A も存在しません。depths.json を確認してください。");
      }
    }

    renderDepth(currentDepthId);
  } catch (error) {
    console.error("Error loading depths:", error);
    document.getElementById("story").innerText =
      "深度データの読み込みに失敗しました。しばらくしてから再試行してください。";
  }
}

function renderDepth(depthId) {
  const depth = depths[depthId];
  if (!depth) {
    console.error("Unknown depth:", depthId);
    return;
  }

  currentDepthId = depthId;

  const storyElem = document.getElementById("story");

  // ▼ story が配列じゃない時用の安全ガード
  const storyLines = Array.isArray(depth.story) ? depth.story : [];
  storyElem.innerHTML = `
## ${depth.title}

${storyLines.map(line => `

${line}
`).join("")}
  `;

  const optionsElem = document.getElementById("options");
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
    btn.textContent = opt.text;
    btn.onclick = () => renderDepth(opt.next);
    optionsElem.appendChild(btn);
  });
}