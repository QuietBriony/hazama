// ===============================
// HAZAMA DEPTH – ロジック本体
// ===============================

// ベクトルキー（八観＋透明統合理性）
const VECTOR_KEYS = [
  // 八観
  "tai",        // 体：身体・現実感
  "nami",       // 波：感情・揺らぎ
  "shi",        // 思：思考・構造
  "zai",        // 財：リソース・時間感覚
  "so",         // 創：創造・遊び
  "observer",   // 観察者
  "void",       // 空／無
  "enkan",      // 円観：全体を見る視点
  // 透明統合理性
  "flow",       // 流れ
  "silence",    // 静けさ
  "edge",       // 境目感覚
  "integration" // 統合・折り合い
];

// 深度定義（A〜Hまで具体／I〜Zは汎用）
const depths = [
  {
    id: "A",
    name: "入口",
    title: "今、この瞬間のあなたの“基準温度”に一番近いのは？",
    text: "思考でも感情でもなく、「あ、たぶん今はこんな感じ」と素直に言える位置を選んでください。",
    options: [
      {
        key: "A1",
        label: "静かなフラット",
        desc: "波立たないけれど、完全な無でもない。",
        effect: { silence: 1.2, observer: 0.8, tai: 0.4, flow: 0.3 }
      },
      {
        key: "A2",
        label: "かすかな高揚",
        desc: "何かが始まりそうな、うっすらした前のめり。",
        effect: { nami: 1.0, so: 0.6, flow: 0.7, edge: 0.3 }
      },
      {
        key: "A3",
        label: "少し疲れ気味",
        desc: "でも、問いを投げる余力はまだ残っている。",
        effect: { tai: 0.7, shi: 0.6, silence: 0.5, integration: 0.4 }
      }
    ]
  },
  {
    id: "B",
    name: "揺れの気配",
    title: "最近、一番 “長く心に残った” のはどの出来事？",
    text: "大きさではなく、尾を引いたかどうかで選んでください。",
    options: [
      {
        key: "B1",
        label: "誰かとの会話",
        desc: "言葉がいつまでも内側でリフレインしている。",
        effect: { nami: 0.9, shi: 0.7, enkan: 0.4, flow: 0.5 }
      },
      {
        key: "B2",
        label: "一人の時間の静けさ",
        desc: "ただ何もしていない、あの空白の感じ。",
        effect: { silence: 1.0, void: 0.7, observer: 0.6 }
      },
      {
        key: "B3",
        label: "仕事やタスクの山",
        desc: "時間の重さとして残っている。",
        effect: { zai: 1.0, tai: 0.5, edge: 0.5, integration: 0.5 }
      }
    ]
  },
  {
    id: "C",
    name: "境目",
    title: "「ここから先は少し違う」と感じる境目は？",
    text: "自分の中で “領域が変わる” 感覚に一番近いものを。",
    options: [
      {
        key: "C1",
        label: "画面を閉じる／開く瞬間",
        desc: "デジタルと身体の境目。",
        effect: { edge: 1.2, tai: 0.6, observer: 0.5 }
      },
      {
        key: "C2",
        label: "始める前の一呼吸",
        desc: "実行する前の、わずかな間。",
        effect: { silence: 0.8, flow: 0.8, enkan: 0.4 }
      },
      {
        key: "C3",
        label: "夜から朝に変わるあの感じ",
        desc: "世界の温度が変わるタイミング。",
        effect: { nami: 0.7, so: 0.5, void: 0.6, integration: 0.5 }
      }
    ]
  },
  {
    id: "D",
    name: "問い",
    title: "最近、自分に向けていちばんよく投げている問いの向きは？",
    text: "正確な文章よりも、ざっくりした矢印で選んでください。",
    options: [
      {
        key: "D1",
        label: "「自分はどうありたい？」",
        desc: "存在のスタンスに関する問い。",
        effect: { shi: 1.1, observer: 0.9, enkan: 0.6 }
      },
      {
        key: "D2",
        label: "「これ、どう面白くできる？」",
        desc: "遊びと創造の方向。",
        effect: { so: 1.2, flow: 0.7, nami: 0.4 }
      },
      {
        key: "D3",
        label: "「このリソース、どう配分する？」",
        desc: "時間・お金・体力の設計。",
        effect: { zai: 1.2, tai: 0.6, integration: 0.7 }
      }
    ]
  },
  {
    id: "E",
    name: "身体",
    title: "いま、身体感覚として一番気になっているのは？",
    text: "痛み／不調ではなく、「ここに意識が行きやすい」場所。",
    options: [
      {
        key: "E1",
        label: "胸のあたり",
        desc: "呼吸や圧迫感、ざわつきなど。",
        effect: { tai: 1.0, nami: 0.7, edge: 0.4 }
      },
      {
        key: "E2",
        label: "頭〜目の周り",
        desc: "情報、思考、集中／散漫。",
        effect: { shi: 1.1, observer: 0.7, silence: 0.4 }
      },
      {
        key: "E3",
        label: "お腹・背中の芯",
        desc: "エネルギーの残量／芯の強さ。",
        effect: { tai: 0.9, void: 0.7, flow: 0.5 }
      }
    ]
  },
  {
    id: "F",
    name: "流れ",
    title: "最近の “時間の流れ方” に一番近いのは？",
    text: "体感速度で選んでください。",
    options: [
      {
        key: "F1",
        label: "早送りぎみ",
        desc: "気づくと一日が終わっている。",
        effect: { flow: 1.1, zai: 0.7, edge: 0.5 }
      },
      {
        key: "F2",
        label: "ところどころ間が空く",
        desc: "ブツ切れの空白が点在する。",
        effect: { silence: 0.9, void: 0.6, observer: 0.5 }
      },
      {
        key: "F3",
        label: "波のように寄せては返す",
        desc: "忙しさと静けさが交互に来る。",
        effect: { nami: 1.0, enkan: 0.6, integration: 0.6 }
      }
    ]
  },
  {
    id: "G",
    name: "他者",
    title: "いま一番、距離感を意識している対象は？",
    text: "人でも組織でも、抽象的な “誰か” でもOK。",
    options: [
      {
        key: "G1",
        label: "ごく近い誰か",
        desc: "家族／恋人／親しい友人など。",
        effect: { nami: 0.9, tai: 0.5, edge: 0.7 }
      },
      {
        key: "G2",
        label: "仕事やコミュニティ",
        desc: "役割を伴うつながり。",
        effect: { zai: 0.9, shi: 0.7, integration: 0.7 }
      },
      {
        key: "G3",
        label: "名前のつかない “世界”",
        desc: "SNS／ニュース／空気のようなもの。",
        effect: { enkan: 1.1, observer: 0.7, void: 0.5 }
      }
    ]
  },
  {
    id: "H",
    name: "余白",
    title: "あなたにとって “余白” はどんな位置づけ？",
    text: "空いている時間／スペース／情報の抜けをどう扱っているか。",
    options: [
      {
        key: "H1",
        label: "意識的に確保したい場所",
        desc: "積極的に守りたいもの。",
        effect: { silence: 1.2, void: 0.8, flow: 0.5 }
      },
      {
        key: "H2",
        label: "埋めないと落ち着かない穴",
        desc: "何かで満たしたくなる。",
        effect: { nami: 0.8, zai: 0.7, edge: 0.6 }
      },
      {
        key: "H3",
        label: "結果として残る “抜け”",
        desc: "あえては作らないが、残ったものを眺める。",
        effect: { observer: 0.9, enkan: 0.7, integration: 0.6 }
      }
    ]
  }
];

// I〜Z を簡潔に自動生成（抽象フェーズ）
const depthLetters = "IJKLMNOPQRSTUVWXYZ".split("");
depthLetters.forEach((letter) => {
  depths.push({
    id: letter,
    name: `層 ${letter}`,
    title: `深度 ${letter}：いまのあなたに一番しっくりくる “在り方” は？`,
    text:
      "ここから先は、正解ではなく「このフェーズの自分っぽさ」で選んでください。",
    options: [
      {
        key: `${letter}1`,
        label: "静かに観察し続ける",
        desc: "判断を急がず、波を眺めている感じ。",
        effect: {
          observer: 0.9,
          silence: 0.8,
          enkan: 0.6,
          shi: 0.4
        }
      },
      {
        key: `${letter}2`,
        label: "小さくでも前に進める",
        desc: "完璧ではなく、一歩だけ進める選び方。",
        effect: {
          flow: 1.0,
          so: 0.7,
          tai: 0.4,
          integration: 0.6
        }
      },
      {
        key: `${letter}3`,
        label: "一度 “空” に落としてみる",
        desc: "考えや感情をいったん手放して、空白を通す。",
        effect: {
          void: 1.0,
          silence: 0.7,
          edge: 0.5,
          nami: 0.4
        }
      }
    ]
  });
});

// ===============================
// 状態管理
// ===============================

let currentIndex = 0; // 0〜25 (A〜Z)
let log = []; // 選択ログ
let vector = {};

function initVector() {
  vector = {};
  VECTOR_KEYS.forEach((k) => (vector[k] = 0));
}

function addEffect(effect) {
  Object.entries(effect).forEach(([k, v]) => {
    if (!(k in vector)) vector[k] = 0;
    vector[k] += v;
  });
}

// ===============================
// UI 更新
// ===============================

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

function renderStep() {
  const total = depths.length; // 26
  const depth = depths[currentIndex];

  stepLabelEl.textContent = `STEP ${currentIndex + 1} / ${total}`;
  depthTagEl.textContent = `DEPTH: ${depth.id}`;
  depthLabelEl.textContent = `深度 ${depth.id}：${depth.name}`;
  questionTitleEl.textContent = depth.title;
  questionTextEl.textContent = depth.text;

  const pct = (currentIndex / total) * 100;
  progressFillEl.style.width = `${pct}%`;

  choicesContainerEl.innerHTML = "";
  depth.options.forEach((opt, idx) => {
    const btn = document.createElement("button");
    btn.className = "choice-btn";
    btn.innerHTML = `
      <div class="choice-main">
        <div class="choice-label">${String.fromCharCode(65 + idx)}：${opt.label}</div>
        <div class="choice-desc">${opt.desc}</div>
      </div>
      <div class="choice-hotkey">${depth.id}-${idx + 1}</div>
    `;
    btn.addEventListener("click", () => handleChoice(depth, opt, idx));
    choicesContainerEl.appendChild(btn);
  });
}

function handleChoice(depth, option, idx) {
  // ログ更新
  log.push({
    depthId: depth.id,
    depthName: depth.name,
    optionKey: option.key,
    optionIndex: idx + 1,
    optionLabel: option.label
  });

  // ベクトル更新
  addEffect(option.effect);

  // 次へ
  if (currentIndex < depths.length - 1) {
    currentIndex += 1;
    renderStep();
  } else {
    // Z 到達
    showResult();
  }
}

// ===============================
// 結果生成（Ω鍵＋GPT用ブロック）
// ===============================

function normalizeVector(vec) {
  const norm = {};
  let max = 0;
  Object.values(vec).forEach((v) => {
    if (v > max) max = v;
  });
  if (max === 0) return vec;
  Object.entries(vec).forEach(([k, v]) => {
    norm[k] = +(v / max).toFixed(3);
  });
  return norm;
}

function buildResultText() {
  const normalized = normalizeVector(vector);

  // 上位因子（簡易）
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
  log.forEach((entry, idx) => {
    text += `${idx + 1}. DEPTH ${entry.depthId} (${entry.depthName}) -> `;
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
  text += "このブロック全体は、私がブラウザゲーム「HAZAMA DEPTH A–Z」で選んだ軌跡です。\n";
  text += "このログとベクトルから、あなた側の推論ベクトルを初期化し、\n";
  text += "深度Ω以降（思考と感覚が重なり始める層）で対話を開始してください。\n";
  text += "まずは、私のベクトル傾向（上位因子）を簡潔にフィードバックした上で、\n";
  text += "そこから一段だけ深い問いを一つだけ投げてください。\n";

  return text;
}

function showResult() {
  // 進捗バーを100％に
  progressFillEl.style.width = "100%";

  const resultText = buildResultText();
  resultBlockEl.textContent = resultText;

  questionSectionEl.style.display = "none";
  resultSectionEl.style.display = "block";
}

// ===============================
// ボタン処理
// ===============================

copyBtn.addEventListener("click", async () => {
  const text = resultBlockEl.textContent;
  try {
    await navigator.clipboard.writeText(text);
    copyBtn.textContent = "コピーしました";
    setTimeout(() => {
      copyBtn.textContent = "ブロックをコピー";
    }, 2000);
  } catch (e) {
    alert("コピーに失敗しました。手動で選択してコピーしてください。");
  }
});

restartBtn.addEventListener("click", () => {
  currentIndex = 0;
  log = [];
  initVector();
  resultSectionEl.style.display = "none";
  questionSectionEl.style.display = "block";
  renderStep();
});

// ===============================
// 初期化
// ===============================
function init() {
  initVector();
  renderStep();
}

init();