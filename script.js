// =====================================================
// HAZAMA DEPTH — デバッグログ入り完全動作版 script.js
// =====================================================

// グローバル
let depths = null;
let currentIndex = 0;
let log = [];
let vector = {};

const VECTOR_KEYS = [
  "tai", "nami", "shi", "zai", "so",
  "observer", "void", "enkan",
  "flow", "silence", "edge", "integration"
];

// ---------- デバッグログ ----------
function dbg(...args) {
  console.log("[HAZAMA-DEBUG]", ...args);
}

// ---------- JSON 読み込み ----------
async function loadDepths() {
  dbg("loading depths.json...");

  try {
    const res = await fetch("depths.json?cache=" + Date.now());
    if (!res.ok) throw new Error("HTTP " + res.status);

    const data = await res.json();

    // A〜Z の並び順に transform
    depths = Object.keys(data)
      .sort()
      .map(k => {
        const d = data[k];
        return {
          id: k,
          title: d.title,
          text: d.text,
          options: [
            {
              key: `${k}-1`,
              label: "A：選択肢1",
              desc: "",
              effect: d.vector
            }
          ]
        };
      });

    dbg("depths loaded:", depths);
  } catch (e) {
    dbg("ERROR loading depths:", e);

    alert(
      "深度データの読み込みに失敗しました。\n" +
      "GitHub Pages の反映に少し時間がかかる場合があります。\n" +
      "数秒後に再読み込みしてください。"
    );
  }
}

// ---------- ベクトル初期化 ----------
function initVector() {
  vector = {};
  VECTOR_KEYS.forEach(k => (vector[k] = 0));
  dbg("vector initialized:", vector);
}

// ---------- ベクトル加算 ----------
function addEffect(effect) {
  Object.entries(effect).forEach(([k, v]) => {
    if (vector[k] === undefined) vector[k] = 0;
    vector[k] += v;
  });
  dbg("vector updated:", vector);
}

// ---------- DOM 要素取得 ----------
const stepLabelEl = document.getElementById("step-label");
const depthTagEl = document.getElementById("depth-tag");
const depthLabelEl = document.getElementById("depth-label");
const questionTitleEl = document.getElementById("question-title");
const questionTextEl = document.getElementById("question-text");
const choicesContainerEl = document.getElementById("choices-container");
const progressFillEl = document.getElementById("progress-fill");
const questionSectionEl = document.getElementById("question-section");
const resultSectionEl = document.getElementById("result-section");
const resultBlockEl = document.getElementById("result-block");
const copyBtn = document.getElementById("copy-btn");
const restartBtn = document.getElementById("restart-btn");

// ---------- UI レンダリング ----------
function renderStep() {
  if (!depths) {
    dbg("renderStep called before depths loaded");
    return;
  }

  const total = depths.length;
  const depth = depths[currentIndex];

  dbg("render step", currentIndex, depth);

  stepLabelEl.textContent = `STEP ${currentIndex + 1} / ${total}`;
  depthTagEl.textContent = `DEPTH: ${depth.id}`;
  depthLabelEl.textContent = depth.title;
  questionTitleEl.textContent = depth.title;
  questionTextEl.textContent = depth.text;

  const pct = (currentIndex / total) * 100;
  progressFillEl.style.width = `${pct}%`;

  choicesContainerEl.innerHTML = "";

  // 各深度は 1択（透明モード）
  depth.options.forEach((opt, idx) => {
    const btn = document.createElement("button");
    btn.className = "choice-btn";
    btn.innerHTML = `
      <div class="choice-main">
        <div class="choice-label">${opt.key}</div>
        <div class="choice-desc">${opt.label}</div>
      </div>
      <div class="choice-hotkey">${depth.id}-1</div>
    `;

    btn.addEventListener("click", () => {
      dbg("choice clicked", opt);
      handleChoice(depth, opt);
    });

    choicesContainerEl.appendChild(btn);
  });
}

// ---------- 選択処理 ----------
function handleChoice(depth, option) {
  dbg("handleChoice", depth.id, option.key);

  log.push({
    depthId: depth.id,
    optionKey: option.key
  });

  addEffect(option.effect);

  if (currentIndex < depths.length - 1) {
    currentIndex++;
    renderStep();
  } else {
    showResult();
  }
}

// ---------- 結果生成 ----------
function normalizeVector(vec) {
  let max = 0;
  Object.values(vec).forEach(v => (max = Math.max(max, v)));
  if (max === 0) return vec;

  const norm = {};
  Object.entries(vec).forEach(([k, v]) => {
    norm[k] = +(v / max).toFixed(3);
  });

  dbg("normalized vector", norm);
  return norm;
}

function buildResultText() {
  const normalized = normalizeVector(vector);

  let txt = "";
  txt += "【HAZAMA-DEPTH RUN SUMMARY】\n";
  txt += `timestamp: ${new Date().toISOString()}\n`;
  txt += `steps: ${depths.length}\n\n`;

  txt += "【HAZAMA-DEPTH VECTOR】\n";
  Object.entries(normalized).forEach(([k, v]) => {
    txt += `${k}: ${v}\n`;
  });

  txt += "\n【LOG】\n";
  log.forEach((l, i) => txt += `${i + 1}. DEPTH ${l.depthId} → ${l.optionKey}\n`);

  txt += "\n【GPT用の指示】\n";
  txt += "このブロック全体を GPT に貼ってください。\n";

  return txt;
}

function showResult() {
  dbg("Z reached, generating result…");

  progressFillEl.style.width = "100%";
  const result = buildResultText();
  resultBlockEl.textContent = result;

  questionSectionEl.style.display = "none";
  resultSectionEl.style.display = "block";
}

// ---------- 操作ボタン ----------
copyBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(resultBlockEl.textContent);
    copyBtn.textContent = "コピーしました";
    setTimeout(() => (copyBtn.textContent = "ブロックをコピー"), 2000);
  } catch {
    alert("コピー失敗。手動でコピーしてください。");
  }
});

restartBtn.addEventListener("click", () => {
  dbg("restart");

  currentIndex = 0;
  log = [];
  initVector();

  resultSectionEl.style.display = "none";
  questionSectionEl.style.display = "block";

  renderStep();
});

// ---------- 初期化 ----------
async function init() {
  dbg("INIT START");

  initVector();
  await loadDepths();

  if (depths) {
    dbg("depths ready -> renderStep");
    renderStep();
  } else {
    dbg("depths NOT loaded");
  }
}

init();