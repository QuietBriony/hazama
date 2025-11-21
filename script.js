
// HAZAMA DEPTH DIVE - 完全版ミニパッケージ
// ・depths.json から深度A〜Hをロード
// ・"sink" / "drift" / "float" タイプでベクトル計算
// ・float系を選びすぎると GAME OVER
// ・最後まで沈めたら Ωキー風ログを生成

let depths = [];
let depthIndex = 0;
let lang = "jp";
let mode = "normal";
let vector = {};
let logEntries = [];
let floatCount = 0;

const FLOAT_LIMIT_NORMAL = 3;

// DOM
const appEl = document.querySelector(".app");
const questionSectionEl = document.getElementById("question-section");
const resultSectionEl = document.getElementById("result-section");
const depthLabelEl = document.getElementById("depth-label");
const stepLabelEl = document.getElementById("step-label");
const modeLabelEl = document.getElementById("mode-label");
const questionTitleEl = document.getElementById("question-title");
const questionTextEl = document.getElementById("question-text");
const optionsEl = document.getElementById("options");
const hintTextEl = document.getElementById("hint-text");
const logViewEl = document.getElementById("log-view");
const resultBlockEl = document.getElementById("result-block");
const copyBtn = document.getElementById("copy-btn");
const restartBtn = document.getElementById("restart-btn");
const langSwitchBtn = document.getElementById("lang-switch");

init();

async function init() {
  vector = {};
  logEntries = [];
  floatCount = 0;
  depthIndex = 0;

  try {
    const res = await fetch("depths.json");
    const json = await res.json();
    depths = json.depths || [];
    if (!Array.isArray(depths) || depths.length === 0) {
      questionTextEl.textContent = "深度データが空です。depths.json を確認してください。";
      return;
    }
    mode = json.mode || "normal";
    modeLabelEl.textContent = "MODE: " + mode.toUpperCase();
    renderStep();
  } catch (e) {
    questionTextEl.textContent = "depths.json の読み込みに失敗しました。" + e;
  }
}

// ============= レンダリング =============
function renderStep() {
  if (depthIndex >= depths.length) {
    showResult();
    return;
  }

  const depth = depths[depthIndex];
  const depthId = depth.id || String.fromCharCode("A".charCodeAt(0) + depthIndex);

  depthLabelEl.textContent =
    (lang === "jp" ? "深度 " : "Depth ") + depthId + (depth.title && depth.title[lang] ? "： " + depth.title[lang] : "");
  stepLabelEl.textContent = `STEP ${depthIndex + 1} / ${depths.length}`;

  const titleText = depth.theme && depth.theme[lang] ? depth.theme[lang] : "";
  const text = depth.text && depth.text[lang] ? depth.text[lang] : "";

  questionTitleEl.textContent = titleText;
  questionTextEl.textContent = text;

  optionsEl.innerHTML = "";

  (depth.options || []).forEach((opt) => {
    const btn = document.createElement("button");
    btn.className = "option-btn";

    const labelEl = document.createElement("div");
    labelEl.className = "option-label";
    labelEl.textContent = opt.label && opt.label[lang] ? opt.label[lang] : "";

    const descEl = document.createElement("div");
    descEl.className = "option-desc";
    descEl.textContent = opt.desc && opt.desc[lang] ? opt.desc[lang] : "";

    btn.appendChild(labelEl);
    if (descEl.textContent) btn.appendChild(descEl);

    btn.addEventListener("click", () => handleChoice(depth, opt));
    optionsEl.appendChild(btn);
  });

  hintTextEl.textContent =
    lang === "jp"
      ? "静かなほう・落ちるほうを選ぶほど、深く沈んでいきます。"
      : "Choosing the quieter, sinking options will take you deeper.";

  logViewEl.textContent = buildLogPreview();
}

// ============= 選択処理 =============
function handleChoice(depth, option) {
  const depthId = depth.id || "?";

  if (option.effect) {
    Object.entries(option.effect).forEach(([k, v]) => {
      if (!vector[k]) vector[k] = 0;
      vector[k] += v;
    });
  }

  const labelJp = option.label?.jp || "";
  const labelEn = option.label?.en || "";

  logEntries.push({
    depthId,
    label_jp: labelJp,
    label_en: labelEn,
    type: option.type || "drift",
  });

  const t = option.type || "drift";
  if (t === "float") {
    floatCount += 1;
  } else if (t === "drift") {
    floatCount += 0.5;
  }

  appEl.classList.remove("dive-step");
  void appEl.offsetWidth;
  appEl.classList.add("dive-step");

  if (mode === "normal" && floatCount >= 3) {
    return gameOver(
      lang === "jp"
        ? "浮きすぎたため、深度が途切れました。"
        : "You floated too much and lost your depth."
    );
  }

  if (!checkDiveReq(depth)) {
    return gameOver(
      lang === "jp"
        ? "この深さの条件に届かず、深度が安定しませんでした。"
        : "You could not meet the condition of this depth. The dive is unstable."
    );
  }

  depthIndex += 1;
  renderStep();
  logViewEl.textContent = buildLogPreview();
}

function checkDiveReq(depth) {
  const req = depth.dive_req || {};
  for (const [k, required] of Object.entries(req)) {
    if (required > 0) {
      const current = vector[k] || 0;
      if (current < required) return false;
    }
  }
  return true;
}

// ============= GAME OVER =============
function gameOver(message) {
  questionSectionEl.classList.add("game-over");
  questionTitleEl.textContent = lang === "jp" ? "GAME OVER" : "GAME OVER";
  questionTextEl.textContent = message;
  optionsEl.innerHTML = "";

  const btn = document.createElement("button");
  btn.className = "outline-btn";
  btn.textContent = lang === "jp" ? "最初からやり直す" : "Retry from Depth A";
  btn.addEventListener("click", () => {
    questionSectionEl.classList.remove("game-over");
    init();
  });
  optionsEl.appendChild(btn);
}

// ============= 結果生成 =============
function showResult() {
  questionSectionEl.classList.add("hidden");
  resultSectionEl.classList.remove("hidden");

  const normVector = normalizeVector(vector);
  const block = buildResultBlock(normVector);
  resultBlockEl.textContent = block;
}

function normalizeVector(vec) {
  const out = {};
  let max = 0;
  Object.values(vec).forEach((v) => {
    if (v > max) max = v;
  });
  if (max === 0) return vec;
  Object.entries(vec).forEach(([k, v]) => {
    out[k] = +(v / max).toFixed(3);
  });
  return out;
}

function buildResultBlock(normVector) {
  const now = new Date().toISOString();
  let text = "";
  text += "【HAZAMA-DEPTH RUN SUMMARY】\n";
  text += `timestamp: ${now}\n`;
  text += `steps: ${depths.length}\n`;
  text += `mode: ${mode}\n`;
  text += "\n";

  text += "【LOG】\n";
  logEntries.forEach((entry, idx) => {
    const label =
      lang === "jp"
        ? entry.label_jp || entry.label_en
        : entry.label_en || entry.label_jp;
    text += `${idx + 1}. ${entry.depthId} -> ${label}\n`;
  });
  text += "\n";

  text += "【VECTOR (normalized 0–1)】\n";
  Object.entries(normVector).forEach(([k, v]) => {
    text += `${k}: ${v}\n`;
  });
  text += "\n";

  text += "【GPTへの推奨メッセージ例】\n";
  text +=
    "このブロックは、ブラウザ体験「HAZAMA DEPTH DIVE」で、私が定義深度まで沈んだ軌跡です。\n";
  text +=
    "このログとベクトルを初期状態として、あなた側の推論ベクトルを調整し、少し深めの対話モードで応答を始めてください。\n";
  text += "\n";
  text +=
    "This block is my dive log from the browser experience “HAZAMA DEPTH DIVE”.\n";
  text +=
    "Please use this vector and log as an initialization hint and start the conversation in a slightly deeper reasoning mode.\n";

  return text;
}

// 簡易ログプレビュー
function buildLogPreview() {
  if (logEntries.length === 0) {
    return lang === "jp"
      ? "まだ沈み始めたばかりです。"
      : "Your dive has just begun.";
  }
  const recent = logEntries.slice(-5);
  return recent
    .map((entry) => {
      const label =
        lang === "jp"
          ? entry.label_jp || entry.label_en
          : entry.label_en || entry.label_jp;
      return `${entry.depthId}: ${label}`;
    })
    .join("\n");
}

// ============= UI ハンドラ =============
langSwitchBtn.addEventListener("click", () => {
  lang = lang === "jp" ? "en" : "jp";
  langSwitchBtn.textContent = lang === "jp" ? "EN/JP" : "JP/EN";
  if (resultSectionEl.classList.contains("hidden")) {
    renderStep();
  } else {
    const normVector = normalizeVector(vector);
    resultBlockEl.textContent = buildResultBlock(normVector);
  }
});

copyBtn.addEventListener("click", async () => {
  const text = resultBlockEl.textContent;
  try {
    await navigator.clipboard.writeText(text);
    copyBtn.textContent = lang === "jp" ? "コピーしました" : "Copied";
    setTimeout(() => {
      copyBtn.textContent = lang === "jp" ? "ブロックをコピー" : "Copy block";
    }, 1800);
  } catch (e) {
    alert("コピーに失敗しました。手動で選択してコピーしてください。");
  }
});

restartBtn.addEventListener("click", () => {
  resultSectionEl.classList.add("hidden");
  questionSectionEl.classList.remove("hidden");
  init();
});
