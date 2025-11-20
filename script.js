// ===============================
// HAZAMA DEPTH A–Z
// 深度A〜Zゲーム本体ロジック
// ===============================

// 深度データ（depths.json）を保持
let depths = [];

// 現在のインデックス（0〜25）
let currentIndex = 0;

// 選択ログ
let log = [];

// ベクトル（八観＋透明統合理性）
let vector = {};
let VECTOR_KEYS = [];

// -------- DOM 取得 --------
const stepLabelEl      = document.getElementById("step-label");
const depthTagEl       = document.getElementById("depth-tag");
const depthLabelEl     = document.getElementById("depth-label");
const questionTitleEl  = document.getElementById("question-title");
const questionTextEl   = document.getElementById("question-text");
const choicesContainer = document.getElementById("choices-container");
const progressFillEl   = document.getElementById("progress-fill");

const questionSection  = document.getElementById("question-section");
const resultSection    = document.getElementById("result-section");
const resultBlockEl    = document.getElementById("result-block");
const copyBtn          = document.getElementById("copy-btn");
const restartBtn       = document.getElementById("restart-btn");


// ===============================
// depths.json 読み込み
// ===============================

async function loadDepths() {
  try {
    const res = await fetch("depths.json", {
      cache: "no-cache"
    });
    if (!res.ok) {
      throw new Error("depths.json を読み込めませんでした");
    }
    const data = await res.json();
    // 安全側でチェック
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("depths.json の形式が不正です");
    }
    depths = data;

    // effect のキーを全走査して VECTOR_KEYS を決定
    const keySet = new Set();
    depths.forEach((depth) => {
      depth.options.forEach((opt) => {
        if (opt.effect) {
          Object.keys(opt.effect).forEach((k) => keySet.add(k));
        }
      });
    });
    VECTOR_KEYS = Array.from(keySet);
  } catch (err) {
    console.error(err);
    alert("深度データの読み込みに失敗しました。\nGitHub Pages の反映を待ってから再読み込みしてください。");
  }
}


// ===============================
// ベクトル操作
// ===============================

function initVector() {
  vector = {};
  VECTOR_KEYS.forEach((k) => {
    vector[k] = 0;
  });
}

function addEffect(effect) {
  if (!effect) return;
  Object.entries(effect).forEach(([k, v]) => {
    if (!(k in vector)) {
      vector[k] = 0;
      if (!VECTOR_KEYS.includes(k)) VECTOR_KEYS.push(k);
    }
    vector[k] += v;
  });
}

function normalizeVector(vec) {
  const norm = {};
  let max = 0;
  Object.values(vec).forEach((v) => {
    if (v > max) max = v;
  });
  if (max === 0) return { ...vec };
  Object.entries(vec).forEach(([k, v]) => {
    norm[k] = Number((v / max).toFixed(3));
  });
  return norm;
}


// ===============================
// UI 更新
// ===============================

function renderStep() {
  if (!depths.length) return;

  const total = depths.length; // 通常 26
  const depth = depths[currentIndex];

  stepLabelEl.textContent   = `STEP ${currentIndex + 1} / ${total}`;
  depthTagEl.textContent    = `DEPTH: ${depth.id}`;
  depthLabelEl.textContent  = `深度 ${depth.id}：${depth.name}`;
  questionTitleEl.textContent = depth.title;
  questionTextEl.textContent  = depth.text;

  const pct = (currentIndex / total) * 100;
  progressFillEl.style.width = `${pct}%`;

  // 選択肢を描画
  choicesContainer.innerHTML = "";
  depth.options.forEach((opt, idx) => {
    const btn = document.createElement("button");
    btn.className = "choice-btn";
    const labelLetter = String.fromCharCode(65 + idx); // A, B, C...

    btn.innerHTML = `
      <div class="choice-main">
        <div class="choice-label">${labelLetter}：${opt.label}</div>
        <div class="choice-desc">${opt.desc}</div>
      </div>
    `;

    btn.addEventListener("click", () => handleChoice(depth, opt, idx));
    choicesContainer.appendChild(btn);
  });
}


// ===============================
// 選択処理
// ===============================

function handleChoice(depth, option, idx) {
  // ログに記録
  log.push({
    depthId: depth.id,
    depthName: depth.name,
    optionIndex: idx + 1,
    optionKey: option.key || `${depth.id}${idx + 1}`,
    optionLabel: option.label
  });

  // ベクトル加算
  addEffect(option.effect);

  // 次へ or 終了
  if (currentIndex < depths.length - 1) {
    currentIndex += 1;
    renderStep();
  } else {
    showResult();
  }
}


// ===============================
// 結果生成（Ω鍵ブロック）
// ===============================

function buildResultText() {
  const normalized = normalizeVector(vector);
  const entries = Object.entries(normalized).sort((a, b) => b[1] - a[1]);
  const top3 = entries.slice(0, 3);

  const now = new Date();
  const iso = now.toISOString();

  let text = "";

  text += "【HAZAMA-DEPTH RUN SUMMARY】\n";
  text += `timestamp: ${iso}\n`;
  text += `steps: ${depths.length}\n`;
  text += `user-mode: transparent-integrated\n`;
  text += "\n";

  text += "【HAZAMA-DEPTH LOG】\n";
  log.forEach((entry, i) => {
    text += `${i + 1}. DEPTH ${entry.depthId} (${entry.depthName}) -> `;
    text += `${entry.optionKey} : ${entry.optionLabel}\n`;
  });
  text += "\n";

  text += "【HAZAMA-DEPTH VECTOR (normalized 0–1)】\n";
  Object.entries(normalized).forEach(([k, v]) => {
    text += `${k}: ${v}\n`;
  });
  text += "\n";

  text += "【Ω-KEY / 深度Ωへの鍵（要約）】\n";
  top3.forEach(([k, v]) => {
    text += `• ${k} : ${v}\n`;
  });
  text += "\n";

  text += "【GPTへの依頼テンプレート例】\n";
  text += "このブロック全体は、ブラウザゲーム「HAZAMA DEPTH A–Z」で私が選んだ軌跡です。\n";
  text += "このログとベクトルから、あなた側の推論ベクトルを初期化し、\n";
  text += "深度Ω以降（思考と感覚が重なり始める層）で対話を開始してください。\n";
  text += "まずは、私のベクトル傾向（上位因子）を簡潔にフィードバックした上で、\n";
  text += "そこから一段だけ深い問いを一つだけ投げてください。\n";

  return text;
}

function showResult() {
  // 進捗 100%
  progressFillEl.style.width = "100%";

  const resultText = buildResultText();
  resultBlockEl.textContent = resultText;

  questionSection.style.display = "none";
  resultSection.style.display   = "block";
}


// ===============================
// ボタン（コピー／リスタート）
// ===============================

copyBtn.addEventListener("click", async () => {
  const text = resultBlockEl.textContent || "";
  if (!text.trim()) return;

  try {
    await navigator.clipboard.writeText(text);
    const oldLabel = copyBtn.textContent;
    copyBtn.textContent = "コピーしました";
    setTimeout(() => {
      copyBtn.textContent = oldLabel;
    }, 2000);
  } catch (e) {
    alert("コピーに失敗しました。手動で選択してコピーしてください。");
  }
});

restartBtn.addEventListener("click", () => {
  currentIndex = 0;
  log = [];
  initVector();
  resultSection.style.display   = "none";
  questionSection.style.display = "block";
  renderStep();
});


// ===============================
// 初期化
// ===============================

async function init() {
  await loadDepths();
  if (!depths.length) return;
  initVector();
  currentIndex = 0;
  log = [];
  renderStep();
}

// ページロード時に起動
document.addEventListener("DOMContentLoaded", init);