const depths = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];

const container = document.getElementById("depth-buttons");
const resultBox = document.getElementById("result-box");

// ボタン生成
depths.forEach(d => {
  const btn = document.createElement("button");
  btn.textContent = d;
  btn.onclick = () => selectDepth(d);
  container.appendChild(btn);
});

// 深度を押したら GPT に渡す「ベクトル鍵」を生成
function selectDepth(d) {
  const vector = `【HAZAMA-DEPTH:${d}】`;

  resultBox.innerHTML = `
    <h3>深度 ${d} の扉が開いた…</h3>
    <p>下の鍵を GPT に貼ると続きが始まります：</p>
    <pre style="white-space:pre-wrap;">${vector}</pre>
  `;
}