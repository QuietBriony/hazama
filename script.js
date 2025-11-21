// ===============================
// HAZAMA DEPTH DIVE - script.js
// A〜H 深度版（v1）
// ===============================

// グローバル状態
let lang = "jp";        // "jp" or "en"
let mode = "normal";    // いまは "normal" 固定（あとで "nightmare" 追加予定）

let depths = [];        // depths.json からロードした配列
let depthIndex = 0;     // 現在の深度インデックス（0 = A）
let vector = {};        // ベクトル集計（effect の合算）
let logEntries = [];    // ログ（どの深度で何を選んだか）
let floatCount = 0;     // 漂い／浮きカウント

// 浮きすぎルール（あとで mode によって変える）
const FLOAT_LIMIT_NORMAL = 3;
// const FLOAT_LIMIT_NIGHTMARE = 1; // いずれ使う

// DOM 参照
const questionSectionEl = document.getElementById("question-section");
const resultBlockEl = document.getElementById("result-block");

// ===============================
// 初期化 & データロード
// ===============================

init();

async function init() {
  // ベクトル初期化
  vector = {};

  // depths.json の読み込み
  try {
    const res = await fetch("depths.json");
    const data = await res.json();
    depths = data.depths || [];

    // デバッグがてら最初の状態をログ表示
    renderStep(); // 最初の深度を描画
  } catch (e) {
    questionSectionEl.textContent = "depths.json の読み込みに失敗しました: " + e;
  }
}

// ===============================
// UI レンダリング
// ===============================

function renderStep() {
  // 全層クリア済み → 結果表示
  if (depthIndex >= depths.length) {
    showResult();
    return;
  }

  const depth = depths[depthIndex];

  // 必要プロパティチェック
  if (!depth || !depth.text || !depth.options) {
    questionSectionEl.textContent = "深度データが不完全です。depths.json を確認してください。";
    return;
  }

  // 深度ラベル（A / B / …）
  const depthId = depth.id || String.fromCharCode("A".charCodeAt(0) + depthIndex);

  const titleText = depth.title && depth.title[lang]
    ? depth.title[lang]
    : `Depth ${depthId}`;

  const mainText = depth.text[lang] || "";

  // questionSection の中身を全部差し替え
  questionSectionEl.innerHTML = "";

  const container = document.createElement("div");

  // ヘッダー（深度表示＋言語切替）
  const headerEl = document.createElement("div");
  headerEl.style.marginBottom = "16px";

  const depthLabelEl = document.createElement("div");
  depthLabelEl.style.fontSize = "18px";
  depthLabelEl.style.marginBottom = "4px";
  depthLabelEl.textContent = titleText;

  const metaRowEl = document.createElement("div");
  metaRowEl.style.display = "flex";
  metaRowEl.style.justifyContent = "space-between";
  metaRowEl.style.alignItems = "center";
  metaRowEl.style.fontSize = "12px";
  metaRowEl.style.opacity = "0.8";

  const stepLabel = document.createElement("span");
  stepLabel.textContent = `STEP ${depthIndex + 1} / ${depths.length}`;

  const rightControls = document.createElement("div");

  const langBtn = document.createElement("button");
  langBtn.textContent = lang === "jp" ? "EN" : "JP";
  langBtn.style.marginLeft = "8px";
  langBtn.style.padding = "4px 8px";
  langBtn.style.borderRadius = "4px";
  langBtn.style.border = "1px solid #80c0ff";
  langBtn.style.background = "#003f66";
  langBtn.style.color = "#e8f4ff";
  langBtn.style.cursor = "pointer";
  langBtn.onclick = () => {
    lang = lang === "jp" ? "en" : "jp";
    renderStep(); // 再描画
  };

  // モード表示（今は normal 固定）
  const modeSpan = document.createElement("span");
  modeSpan.textContent = `MODE: ${mode.toUpperCase()}`;

  rightControls.appendChild(modeSpan);
  rightControls.appendChild(langBtn);

  metaRowEl.appendChild(stepLabel);
  metaRowEl.appendChild(rightControls);

  headerEl.appendChild(depthLabelEl);
  headerEl.appendChild(metaRowEl);

  // 質問テキスト
  const textEl = document.createElement("div");
  textEl.id = "hazama-question-text";
  textEl.style.marginTop = "8px";
  textEl.style.fontSize = "16px";
  textEl.style.lineHeight = "1.7";
  textEl.textContent = mainText;

  // 選択肢
  const optionsEl = document.createElement("div");
  optionsEl.style.marginTop = "18px";

  depth.options.forEach((opt, idx) => {
    const btn = document.createElement("button");
    btn.className = "hazama-option-btn";
    btn.style.display = "block";
    btn.style.width = "100%";
    btn.style.textAlign = "left";
    btn.style.margin = "8px 0";
    btn.style.padding = "10px 12px";
    btn.style.fontSize = "15px";
    btn.style.background = "#003f66";
    btn.style.border = "1px solid #80c0ff";
    btn.style.borderRadius = "6px";
    btn.style.cursor = "pointer";

    const labelText = opt.label && opt.label[lang] ? opt.label[lang] : `(option ${idx + 1})`;
    const descText = opt.desc && opt.desc[lang] ? opt.desc[lang] : "";

    const labelEl = document.createElement("div");
    labelEl.style.fontWeight = "600";
    labelEl.textContent = labelText;

    const descEl = document.createElement("div");
    descEl.style.fontSize = "13px";
    descEl.style.opacity = "0.8";
    descEl.style.marginTop = "2px";
    descEl.textContent = descText;

    btn.appendChild(labelEl);
    if (descText) btn.appendChild(descEl);

    btn.addEventListener("click", () => {
      handleChoice(depth, opt);
    });

    optionsEl.appendChild(btn);
  });

  // フッターヒント
  const footerHint = document.createElement("div");
  footerHint.style.marginTop = "16px";
  footerHint.style.fontSize = "12px";
  footerHint.style.opacity = "0.7";
  footerHint.textContent =
    lang === "jp"
      ? "静かなほう・落ちるほうを選ぶほど、深く沈んでいきます。"
      : "Choosing the quieter, sinking options will take you deeper.";

  // ログの一部表示
  const logView = document.createElement("div");
  logView.style.marginTop = "18px";
  logView.style.fontSize = "12px";
  logView.style.opacity = "0.6";
  logView.style.whiteSpace = "pre-line";
  logView.textContent = buildLogPreview();

  container.appendChild(headerEl);
  container.appendChild(textEl);
  container.appendChild(optionsEl);
  container.appendChild(footerHint);
  container.appendChild(logView);

  questionSectionEl.appendChild(container);
}

// 簡易ログプレビュー
function buildLogPreview() {
  if (logEntries.length === 0) {
    return lang === "jp"
      ? "まだ沈み始めたばかりです。"
      : "Your dive has just begun.";
  }
  const lines = logEntries.slice(-5).map((entry, idx) => {
    const label = lang === "jp" ? entry.label_jp : entry.label_en;
    return `${entry.depthId}: ${label}`;
  });
  return lines.join("\n");
}

// ===============================
// 選択処理
// ===============================

function handleChoice(depth, option) {
  const depthId = depth.id || "?";

  // effect をベクトルに加算
  if (option.effect) {
    Object.entries(option.effect).forEach(([k, v]) => {
      if (!vector[k]) vector[k] = 0;
      vector[k] += v;
    });
  }

  // ログに追加
  logEntries.push({
    depthId,
    label_jp: option.label?.jp || "",
    label_en: option.label?.en || "",
    type: option.type || "drift"
  });

  // type に応じて「浮き」カウント
  const type = option.type || "drift";

  if (type === "float") {
    floatCount += 1;
  } else if (type === "drift") {
    // ドリフトも、少しだけ「浮き」とみなす
    floatCount += 0.5;
  }

  // 浮きすぎチェック
  if (mode === "normal") {
    if (floatCount >= FLOAT_LIMIT_NORMAL) {
      return gameOver("浮きすぎたため、深度が途切れました。");
    }
  }
  // ナイトメア用フラグ（今は無効化）
  // else if (mode === "nightmare") {
  //   if (floatCount >= FLOAT_LIMIT_NIGHTMARE) {
  //     return gameOver("一度浮いた瞬間に、圧壊しました。");
  //   }
  // }

  // dive_req 判定（現バージョンではすべて 0 なので実質パス）
  if (!checkDiveReq(depth)) {
    return gameOver(
      lang === "jp"
        ? "この深さの条件に届かず、深度が安定しませんでした。"
        : "You could not meet the condition of this depth. The dive is unstable."
    );
  }

  // 次の深度へ
  depthIndex += 1;
  renderStep();
}

// 深度の要求条件チェック
function checkDiveReq(depth) {
  const req = depth.dive_req || {};
  for (const [k, required] of Object.entries(req)) {
    if (required > 0) {
      const current = vector[k] || 0;
      if (current < required) {
        return false;
      }
    }
  }
  return true;
}

// ===============================
// GAME OVER
// ===============================

function gameOver(message) {
  questionSectionEl.innerHTML = "";

  const wrap = document.createElement("div");

  const titleEl = document.createElement("div");
  titleEl.style.fontSize = "20px";
  titleEl.style.marginBottom = "8px";
  titleEl.textContent =
    lang === "jp" ? "GAME OVER" : "GAME OVER";

  const msgEl = document.createElement("div");
  msgEl.style.fontSize = "14px";
  msgEl.style.marginBottom = "16px";
  msgEl.style.lineHeight = "1.7";
  msgEl.textContent = message;

  const hintEl = document.createElement("div");
  hintEl.style.fontSize = "12px";
  hintEl.style.opacity = "0.7";
  hintEl.style.marginBottom = "16px";
  hintEl.textContent =
    lang === "jp"
      ? "一度ページをリロードするか、下のボタンから最初の深度Aに戻って再挑戦できます。"
      : "You can reload the page or use the button below to retry from Depth A.";

  const btn = document.createElement("button");
  btn.textContent = lang === "jp" ? "最初の深度からやり直す" : "Retry from Depth A";
  btn.style.padding = "8px 12px";
  btn.style.borderRadius = "4px";
  btn.style.border = "1px solid #80c0ff";
  btn.style.background = "#003f66";
  btn.style.color = "#e8f4ff";
  btn.style.cursor = "pointer";
  btn.onclick = () => {
    // 状態リセット
    depthIndex = 0;
    floatCount = 0;
    vector = {};
    logEntries = [];
    renderStep();
  };

  wrap.appendChild(titleEl);
  wrap.appendChild(msgEl);
  wrap.appendChild(hintEl);
  wrap.appendChild(btn);

  questionSectionEl.appendChild(wrap);
}

// ===============================
// 結果表示（Ωキー風）
// ===============================

function showResult() {
  questionSectionEl.innerHTML = "";

  // 正規化
  const normVector = normalizeVector(vector);
  const logText = buildLogText(logEntries, normVector);

  // 画面にも表示
  const msg = document.createElement("div");
  msg.style.fontSize = "16px";
  msg.style.marginBottom = "12px";
  msg.textContent =
    lang === "jp"
      ? "深度Hまで沈みました。下のブロックをコピーして、AIへの「深度キー」として使えます。"
      : "You reached Depth H. You can copy the block below as a 'depth key' for AI.";

  questionSectionEl.appendChild(msg);

  // resultBlock にテキスト出力
  if (resultBlockEl) {
    resultBlockEl.textContent = logText;
  }

  // 再挑戦ボタン
  const btn = document.createElement("button");
  btn.textContent = lang === "jp" ? "もう一度沈む" : "Dive again";
  btn.style.marginTop = "8px";
  btn.style.padding = "8px 12px";
  btn.style.borderRadius = "4px";
  btn.style.border = "1px solid #80c0ff";
  btn.style.background = "#003f66";
  btn.style.color = "#e8f4ff";
  btn.style.cursor = "pointer";
  btn.onclick = () => {
    depthIndex = 0;
    floatCount = 0;
    vector = {};
    logEntries = [];
    renderStep();
  };

  questionSectionEl.appendChild(btn);
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

function buildLogText(logEntries, normVector) {
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
      lang === "jp" ? entry.label_jp || entry.label_en : entry.label_en || entry.label_jp;
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
    "このブロックは、ブラウザ体験「HAZAMA DEPTH DIVE」で、私が A〜H まで沈んだ軌跡です。\n";
  text +=
    "このログとベクトルを初期状態として、あなた側の推論ベクトルを調整し、少し深めの対話モードで応答を始めてください。\n";

  text += "\n";
  text += "This block is my dive log (Depth A–H) from the browser experience “HAZAMA DEPTH DIVE”.\n";
  text +=
    "Please use this vector and log as an initialization hint and start the conversation in a slightly deeper reasoning mode.\n";

  return text;
}
