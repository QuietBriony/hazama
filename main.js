document.addEventListener("DOMContentLoaded", async () => {
  const depthTitle = document.getElementById("depth-title");
  const depthDescription = document.getElementById("depth-description");
  const storyDiv = document.getElementById("story");
  const optionsDiv = document.getElementById("options");

  let depths = {};
  let currentDepthId = "A";

  async function loadDepths() {
    const res = await fetch("depths.json");
    depths = await res.json();
  }

  function applyDepthColor(depth) {
    const root = document.documentElement;
    if (depth && depth.color) {
      root.style.setProperty("--depth-color", depth.color);
    } else {
      // 色指定がない場合は CSS 側のデフォルトに戻す
      root.style.removeProperty("--depth-color");
    }
  }

  function renderDepth(id) {
    const depth = depths[id];
    if (!depth) {
      console.warn(`Unknown depth id: ${id}`);
      return;
    }

    currentDepthId = id;

    // タイトル・説明
    depthTitle.textContent = `${depth.id} — ${depth.title}`;
    depthDescription.textContent = depth.description || "";

    // 本文（story 配列を <p> に展開）
    const lines = Array.isArray(depth.story) ? depth.story : [];
    storyDiv.innerHTML = lines.map((line) => `<p>${line}</p>`).join("");

    // 色反映
    applyDepthColor(depth);

    // 選択肢リセット
    optionsDiv.innerHTML = "";

    if (depth.options && depth.options.length > 0) {
      depth.options.forEach((opt) => {
        const btn = document.createElement("button");
        btn.className = "option-btn";
        btn.textContent = opt.text;
        btn.addEventListener("click", () => {
          renderDepth(opt.next);
          window.scrollTo({ top: 0, behavior: "smooth" });
        });
        optionsDiv.appendChild(btn);
      });
    } else {
      const p = document.createElement("p");
      p.textContent =
        "この深度には選択肢がありません。別の深度へ移動してください。";
      optionsDiv.appendChild(p);
    }
  }

  await loadDepths();
  renderDepth(currentDepthId);
});