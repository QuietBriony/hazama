let depths = [];
let step = 0;

let lang = "jp";
let floatCount = 0;
let vector = {};
let logs = [];

const FLOAT_LIMIT = 3;

const titleEl = document.getElementById("depth-title");
const textEl = document.getElementById("depth-text");
const optionsEl = document.getElementById("option-area");
const logPrev = document.getElementById("log-preview");
const resultArea = document.getElementById("result-area");
const resultText = document.getElementById("result-text");

init();

async function init() {
  const res = await fetch("depths.json");
  const data = await res.json();
  depths = data.depths;
  render();
}

function render() {
  if (step >= depths.length) {
    showResult();
    return;
  }

  const d = depths[step];

  titleEl.textContent = d.title[lang];
  textEl.textContent = d.text[lang];
  optionsEl.innerHTML = "";

  d.options.forEach((opt) => {
    const btn = document.createElement("button");
    btn.className = "option-btn";

    btn.innerHTML =
      `<div style="font-weight:600">${opt.label[lang]}</div>
       <div style="font-size:13px;opacity:0.8">${opt.desc[lang]}</div>`;

    btn.onclick = () => choose(d, opt);
    optionsEl.appendChild(btn);
  });

  logPrev.textContent = logs.slice(-5).map(l => `${l.id}: ${l.j}`).join("\n");
}

function choose(depth, opt) {
  logs.push({
    id: depth.id,
    j: opt.label.jp,
    e: opt.label.en,
    type: opt.type
  });

  if (opt.type === "float") floatCount += 1;
  if (opt.type === "drift") floatCount += 0.5;

  for (let k in opt.effect) {
    vector[k] = (vector[k] || 0) + opt.effect[k];
  }

  if (floatCount >= FLOAT_LIMIT) {
    gameOver("浮きすぎて深度が途切れました。");
    return;
  }

  step += 1;
  render();
}

function gameOver(reason) {
  document.getElementById("scene-area").classList.add("hidden");
  resultArea.classList.remove("hidden");

  resultText.textContent =
    `GAME OVER\n\n理由: ${reason}\n\n` +
    buildLogText();
}

function showResult() {
  document.getElementById("scene-area").classList.add("hidden");
  resultArea.classList.remove("hidden");

  resultText.textContent = buildLogText();
}

function buildLogText() {
  let out = "";

  out += "【HAZAMA DEPTH-LOG】\n";
  out += "steps: " + depths.length + "\n";
  out += "\n【LOG】\n";

  logs.forEach((l, i) => {
    out += `${i + 1}. ${l.id}: ${l.j}\n`;
  });

  out += "\n【VECTOR】\n";
  for (let k in vector) {
    out += `${k}: ${vector[k]}\n`;
  }

  out += "\n（AI初期化用）\n";
  out += "This block is my Hazama Depth Dive result.\n";
  out += "Use this vector and log as initialization.\n";

  return out;
}

document.getElementById("retry-btn").onclick = () => {
  step = 0;
  floatCount = 0;
  vector = {};
  logs = [];
  resultArea.classList.add("hidden");
  document.getElementById("scene-area").classList.remove("hidden");
  render();
};
