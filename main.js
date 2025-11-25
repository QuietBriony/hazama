// main.js v1.1 — Hazama Engine (A_start → Ω loop) 
// GitHub raw 読み込み / Safari・iOS キャッシュ完全無効化

let depths = {};
let currentDepthId = "A_start";

// GitHub Raw を常に最新取得（キャッシュ完全無効化）
async function loadDepths() {
    const url = "https://raw.githubusercontent.com/QuietBriony/hazama/master/depths.json";

    const response = await fetch(url, {
        method: "GET",
        cache: "no-store",
        headers: { "Cache-Control": "no-store" }
    });

    if (!response.ok) throw new Error("depths.json 読み込み失敗");
    depths = await response.json();
}

// 深度反映
function renderDepth(id) {
    const depth = depths[id];
    if (!depth) {
        document.getElementById("story").innerHTML = `<p>読み込みエラー：${id} が存在しません。</p>`;
        document.getElementById("options").innerHTML = "";
        return;
    }

    currentDepthId = id;

    // Story
    document.getElementById("story").innerHTML = `
        <h2>${depth.title}</h2>
        <p>${depth.description}</p>
    `;

    // Options
    const optionsDiv = document.getElementById("options");
    optionsDiv.innerHTML = "";

    if (!depth.options || depth.options.length === 0) {
        const backButton = document.createElement("button");
        backButton.textContent = "入口へ戻る";
        backButton.onclick = () => renderDepth("A_start");
        optionsDiv.appendChild(backButton);
        return;
    }

    depth.options.forEach(opt => {
        const btn = document.createElement("button");
        btn.textContent = opt.text;
        btn.onclick = () => renderDepth(opt.next);
        optionsDiv.appendChild(btn);
    });
}

// 初期起動
async function startHazama() {
    await loadDepths();
    renderDepth("A_start");
}

startHazama();