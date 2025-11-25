let depths = {};
let current = "A";

// JSONファイルを読み込み
async function loadDepths() {
  const res = await fetch("depths.json");
  depths = await res.json();
  renderDepth(current);
}

// 深度描画
function renderDepth(id) {
  const depth = depths[id];
  current = id;

  // タイトル / 説明
  document.getElementById("depth-title").innerText = depth.title;
  document.getElementById("depth-description").innerText = depth.description;

  // 背景アクセント（color）
  document.body.style.background = `linear-gradient(180deg, ${depth.color}33, #000)`;

  // Story描画
  const storyContainer = document.getElementById("story-container");
  storyContainer.innerHTML = "";
  depth.story.forEach(line => {
    const p = document.createElement("p");
    p.className = "story-line";
    p.innerText = line;
    storyContainer.appendChild(p);
  });

  // Options描画
  const options = document.getElementById("options");
  options.innerHTML = "";

  if (depth.options) {
    depth.options.forEach(opt => {
      const btn = document.createElement("div");
      btn.className = "option-btn";
      btn.innerText = opt.text;
      btn.onclick = () => renderDepth(opt.next);
      options.appendChild(btn);
    });
  }
}

loadDepths();
