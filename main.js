// ---------------------------------------------------------
// Hazama Engine — main.js (GitHub版 v3 安定化)
// ---------------------------------------------------------

let depths = {};
let currentDepthId = "A";

// ---------------------------------------------
// 1) depths.json の安定ロード（相対パス固定）
//   - GitHub Pages / ローカル / iPhone すべて対応
// ---------------------------------------------
async function loadDepths() {
  try {
    const res = await fetch("./depths.json", {
      cache: "no-cache"
    });
    depths = await res.json();
  } catch (e) {
    console.error("depths.json の読み込みに失敗:", e);
  }
}

// ---------------------------------------------
// 2) UI の DOM 要素
// ---------------------------------------------
const titleEl = document.getElementById("depth-title");
const descEl = document.getElementById("depth-description");
const storyEl = document.getElementById("story");
const optionsDiv = document.getElementById("options");

// ---------------------------------------------
// 3) 深度レンダリング
// ---------------------------------------------
function renderDepth(id) {
  const depth = depths[id];

  if (!depth) {
    console.warn(`Unknown depth id: ${id}`);
    return;
  }

  currentDepthId = id;

  titleEl.textContent = `${depth.id} — ${depth.title}`;
  descEl.textContent = depth.description;
  storyEl.innerHTML = "";

  // ---------- Story 表示 ----------
  depth.story.forEach(line => {
    const p = document.createElement("p");
    p.textContent = line;
    storyEl.appendChild(p);
  });

  // ---------- 選択肢 ----------
  optionsDiv.innerHTML = "";

  if (depth.options && depth.options.length > 0) {
    depth.options.forEach(opt => {
      const btn = document.createElement("button");
      btn.className = "option-btn";
      btn.textContent = opt.text;
      btn.onclick = () => {
        const next = opt.next;
        if (next && depths[next]) {
          renderDepth(next);
        } else {
          console.warn("Next depth not found:", next);
        }
      };
      optionsDiv.appendChild(btn);
    });
  } else {
    // ---------------------------------------------
    // 4) 選択肢が無い深度の処理
    //    → auto-next が定義されていれば自動遷移
    // ---------------------------------------------
    if (depth.next && depths[depth.next]) {
      renderDepth(depth.next);
      return;
    }

    // 何も無ければメッセージ表示
    const p = document.createElement("p");
    p.textContent = "この深度には選択肢がありません。";
    optionsDiv.appendChild(p);
  }
}

// ---------------------------------------------
// 5) 初期化
// ---------------------------------------------
(async function init() {
  await loadDepths();

  // JSONの最初のキーを自動起点に
  const firstKey = Object.keys(depths)[0];
  if (firstKey) currentDepthId = firstKey;

  renderDepth(currentDepthId);
})();