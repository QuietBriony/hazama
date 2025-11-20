// ===============================
// HAZAMA DEPTH — GAME MODE v1
// ===============================

// --- デバッグ（必要なら console 確認用） ---
function dbg(...args) {
  console.log("[HAZAMA]", ...args);
}

// ===============================
// ベクトルキー定義（八観＋透明統合理性）
// ===============================
const VECTOR_KEYS = [
  // 八観
  "tai",        // 体：身体・現実感
  "nami",       // 波：感情・揺らぎ
  "shi",        // 思：思考・構造
  "zai",        // 財：リソース・時間
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

// ===============================
// 深度データ定義（A〜Hは手書き、I〜Zは自動生成）
// ===============================
const depths = [
  // ---- A ----
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
        effect: { silence: 1.2, observer: 0.8, tai: 0.4, flow: 0.3 },
        weightFactor: 0.9,
        feedback: "「静かなフラット」を基準にすると、ここからの揺れが全部見やすくなります。"
      },
      {
        key: "A2",
        label: "かすかな高揚",
        desc: "何かが始まりそうな、うっすらした前のめり。",
        effect: { nami: 1.0, so: 0.6, flow: 0.7, edge: 0.3 },
        weightFactor: 1.0,
        feedback: "かすかな高揚は、深度を押し上げる小さなアクセルです。"
      },
      {
        key: "A3",
        label: "少し疲れ気味",
        desc: "でも、問いを投げる余力はまだ残っている。",
        effect: { tai: 0.7, shi: 0.6, silence: 0.5, integration: 0.4 },
        weightFactor: 0.8,
        feedback: "少し疲れている状態からの深度ダイブは、むしろ“素の自分”が出やすいモード。"
      }
    ]
  },
  // ---- B ----
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
        effect: { nami: 0.9, shi: 0.7, enkan: 0.4, flow: 0.5 },
        weightFactor: 1.1,
        feedback: "誰かとの会話は、そのまま“内側の問い”の入り口になっています。"
      },
      {
        key: "B2",
        label: "一人の時間の静けさ",
        desc: "ただ何もしていない、あの空白の感じ。",
        effect: { silence: 1.0, void: 0.7, observer: 0.6 },
        weightFactor: 1.0,
        feedback: "一人の静けさを覚えているなら、すでに深度方向へ片足を踏み入れています。"
      },
      {
        key: "B3",
        label: "仕事やタスクの山",
        desc: "時間の重さとして残っている。",
        effect: { zai: 1.0, tai: 0.5, edge: 0.5, integration: 0.5 },
        weightFactor: 0.85,
        feedback: "タスクの山を意識することも、リソース感覚の深度を測る大事な指標です。"
      }
    ]
  },
  // ---- C ----
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
        effect: { edge: 1.2, tai: 0.6, observer: 0.5 },
        weightFactor: 1.0,
        feedback: "画面のON/OFFは、思考と身体の“切り替えスイッチ”として深度に効きます。"
      },
      {
        key: "C2",
        label: "始める前の一呼吸",
        desc: "実行する前の、わずかな間。",
        effect: { silence: 0.8, flow: 0.8, enkan: 0.4 },
        weightFactor: 1.1,
        feedback: "一呼吸を感じられる人は、すでに自分の深度メーターを持っています。"
      },
      {
        key: "C3",
        label: "夜から朝に変わるあの感じ",
        desc: "世界の温度が変わるタイミング。",
        effect: { nami: 0.7, so: 0.5, void: 0.6, integration: 0.5 },
        weightFactor: 1.05,
        feedback: "世界の温度変化を掴む感覚は、“全体の波”を読む深度の芽です。"
      }
    ]
  },
  // ---- D ----
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
        effect: { shi: 1.1, observer: 0.9, enkan: 0.6 },
        weightFactor: 1.2,
        feedback: "“どうありたいか”の問いは、そのまま深度Ωに直結する軸になります。"
      },
      {
        key: "D2",
        label: "「これ、どう面白くできる？」",
        desc: "遊びと創造の方向。",
        effect: { so: 1.2, flow: 0.7, nami: 0.4 },
        weightFactor: 1.15,
        feedback: "面白さを探す視点は、創造ベクトルの深度を一気に上げます。"
      },
      {
        key: "D3",
        label: "「このリソース、どう配分する？」",
        desc: "時間・お金・体力の設計。",
        effect: { zai: 1.2, tai: 0.6, integration: 0.7 },
        weightFactor: 1.05,
        feedback: "配分を考える人は、“現実を動かす深度”をすでに使っています。"
      }
    ]
  },
  // ---- E ----
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
        effect: { tai: 1.0, nami: 0.7, edge: 0.4 },
        weightFactor: 1.1,
        feedback: "胸に意識が向くとき、感情と身体の境界線が一番よく見えます。"
      },
      {
        key: "E2",
        label: "頭〜目の周り",
        desc: "情報、思考、集中／散漫。",
        effect: { shi: 1.1, observer: 0.7, silence: 0.4 },
        weightFactor: 1.0,
        feedback: "頭まわりの感覚を掴んでいると、思考のノイズと芯を分けやすくなります。"
      },
      {
        key: "E3",
        label: "お腹・背中の芯",
        desc: "エネルギーの残量／芯の強さ。",
        effect: { tai: 0.9, void: 0.7, flow: 0.5 },
        weightFactor: 1.15,
        feedback: "芯に意識があるとき、深度は“持久力のあるモード”に入っています。"
      }
    ]
  },
  // ---- F ----
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
        effect: { flow: 1.1, zai: 0.7, edge: 0.5 },
        weightFactor: 0.95,
        feedback: "早送り感の中で深度を取ると、“どこでブレーキを踏むか”が見えてきます。"
      },
      {
        key: "F2",
        label: "ところどころ間が空く",
        desc: "ブツ切れの空白が点在する。",
        effect: { silence: 0.9, void: 0.6, observer: 0.5 },
        weightFactor: 1.05,
        feedback: "空白をそのまま眺められるなら、深度は静かな方へ少しずつ落ちています。"
      },
      {
        key: "F3",
        label: "波のように寄せては返す",
        desc: "忙しさと静けさが交互に来る。",
        effect: { nami: 1.0, enkan: 0.6, integration: 0.6 },
        weightFactor: 1.1,
        feedback: "波として時間を感じているとき、全体を見る“円観”が育っています。"
      }
    ]
  },
  // ---- G ----
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
        effect: { nami: 0.9, tai: 0.5, edge: 0.7 },
        weightFactor: 1.1,
        feedback: "近い誰かとの距離感は、そのまま“自分との距離”の鏡にもなります。"
      },
      {
        key: "G2",
        label: "仕事やコミュニティ",
        desc: "役割を伴うつながり。",
        effect: { zai: 0.9, shi: 0.7, integration: 0.7 },
        weightFactor: 1.05,
        feedback: "役割を意識するとき、深度は“構造と責任”のレイヤーにいます。"
      },
      {
        key: "G3",
        label: "名前のつかない “世界”",
        desc: "SNS／ニュース／空気のようなもの。",
        effect: { enkan: 1.1, observer: 0.7, void: 0.5 },
        weightFactor: 1.15,
        feedback: "名前のつかない世界を感じているなら、すでに“全体場”を読んでいます。"
      }
    ]
  },
  // ---- H ----
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
        effect: { silence: 1.2, void: 0.8, flow: 0.5 },
        weightFactor: 1.2,
        feedback: "余白を守りたい人は、深度ダイブの“安全地帯”をちゃんと持っています。"
      },
      {
        key: "H2",
        label: "埋めないと落ち着かない穴",
        desc: "何かで満たしたくなる。",
        effect: { nami: 0.8, zai: 0.7, edge: 0.6 },
        weightFactor: 0.95,
        feedback: "穴を埋めたくなる感覚も、深度の“癖”としてそのまま使えます。"
      },
      {
        key: "H3",
        label: "結果として残る “抜け”",
        desc: "あえては作らないが、残ったものを眺める。",
        effect: { observer: 0.9, enkan: 0.7, integration: 0.6 },
        weightFactor: 1.1,
        feedback: "抜けを眺められるなら、“手放しながら観る”深度に入っています。"
      }
    ]
  }
];

// I〜Z を抽象層として自動生成
"JKLMNOPQRSTUVWXYZ".split("").forEach((letter, idx) => {
  const order = idx + 9; // A=1,... I=9
  const baseTitle = `深度 ${letter}：いまのあなたに一番しっくりくる “在り方” は？`;
  const baseText =
    "ここから先は、正解ではなく「このフェーズの自分っぽさ」で選んでください。";

  depths.push({
    id: letter,
    name: `層 ${letter}`,
    title: baseTitle,
    text: baseText,
    options: [
      {
        key: `${letter}1`,
        label: "静かに観察し続ける",
        desc: "判断を急がず、波を眺めている感じ。",
        effect: { observer: 0.9, silence: 0.8, enkan: 0.6, shi: 0.4 },
        weightFactor: 1.0,
        feedback: "観察モードを選んだことで、深度はじわじわと“安定層”に沈んでいます。"
      },
      {
        key: `${letter}2`,
        label: "小さくでも前に進める",
        desc: "完璧ではなく、一歩だけ進める選び方。",
        effect: { flow: 1.0, so: 0.7, tai: 0.4, integration: 0.6 },
        weightFactor: 1.1,
        feedback: "一歩だけ進める選択は、深度を“現実に接続する力”を高めています。"
      },
      {
        key: `${letter}3`,
        label: "一度 “空” に落としてみる",
        desc: "考えや感情をいったん手放して、空白を通す。",
        effect: { void: 1.0, silence: 0.7, edge: 0.5, nami: 0.4 },
        weightFactor: 1.15,
        feedback: "空に落とす選択は、深度を“再配置できるレイヤー”まで連れていきます。"
      }
    ]
  });
});

// 深度ごとの weight を letter 位置から補正
depths.forEach((depth, depthIndex) => {
  const depthLevel = (depthIndex + 1) / depths.length; // 0〜1
  depth.options.forEach((opt) => {
    const factor = opt.weightFactor || 1.0;
    opt.depthWeight = depthLevel * factor;
  });
});

// ===============================
// 状態管理
// ===============================
let currentIndex = 0;   // 0〜25 (A〜Z)
let log = [];           // 選択ログ
let vector = {};        // ベクトル集計
let depthScore = 0;     // 深度スコア（GAME OVER 判定用）

function initVector() {
  vector = {};
  VECTOR_KEYS.forEach((k) => (vector[k] = 0));
  depthScore = 0;
}

// ===============================
// DOM 取得
// ===============================
const stepLabelEl = document.getElementById("step-label");
const depthTagEl = document.getElementById("depth-tag");
const depthLabelEl = document.getElementById("depth-label");
const questionTitleEl = document.getElementById("question-title");
const questionTextEl = document.getElementById("question-text");
const choicesContainerEl = document.getElementById("choices-container");
const progressFillEl = document.getElementById("progress-fill");
const feedbackEl = document.getElementById("feedback");

const questionSectionEl = document.getElementById("question-section");
const resultSectionEl = document.getElementById("result-section");
const resultBlockEl = document.getElementById("result-block");
const resultTitleEl = document.getElementById("result-title");
const resultNoteEl = document.getElementById("result-note");
const resultFooterNoteEl = document.getElementById("result-footer-note");

const copyBtn = document.getElementById("copy-btn");
const restartBtn = document.getElementById("restart-btn");

// ===============================
// ベクトル加算 & フィードバック
// ===============================
function addEffect(effect) {
  Object.entries(effect).forEach(([k, v]) => {
    if (vector[k] === undefined) vector[k] = 0;
    vector[k] += v;
  });
}

function showFeedback(text) {
  feedbackEl.textContent = text;
  feedbackEl.classList.remove("visible");
  // 再描画トリガ
  void feedbackEl.offsetWidth;
  feedbackEl.classList.add("visible");
}

// ===============================
// GAME OVER 判定ロジック
// ===============================
//
// ・STEP 1〜4 までは GAME OVER なし（慣らし）
// ・以降は「平均深度」が浅すぎると一定確率で GAME OVER
//
function shouldGameOver() {
  const step = currentIndex + 1;
  if (step < 5) return false;

  const avgDepth = depthScore / step; // ざっくり 0〜1 くらい
  // 目安：0.45 未満が“浅い”
  if (avgDepth >= 0.45) return false;

  // 平均深度が浅いほど GAME OVER 確率UP
  const p = Math.min(0.8, (0.45 - avgDepth) * 2.0); // 0〜0.8
  const r = Math.random();
  dbg("GAMEOVER check:", { step, avgDepth, p, r });
  return r < p;
}

// ===============================
// UI レンダリング
// ===============================
function setChoicesEnabled(enabled) {
  const buttons = choicesContainerEl.querySelectorAll("button.choice-btn");
  buttons.forEach((btn) => {
    btn.disabled = !enabled;
  });
}

function renderStep() {
  const total = depths.length;
  const depth = depths[currentIndex];

  stepLabelEl.textContent = `STEP ${currentIndex + 1} / ${total}`;
  depthTagEl.textContent = `DEPTH: ${depth.id}`;
  depthLabelEl.textContent = `深度 ${depth.id}：${depth.name}`;
  questionTitleEl.textContent = depth.title;
  questionTextEl.textContent = depth.text;

  const pct = (currentIndex / total) * 100;
  progressFillEl.style.width = `${pct}%`;

  feedbackEl.textContent = "";
  feedbackEl.classList.remove("visible");

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

// ===============================
// 選択処理
// ===============================
function handleChoice(depth, option, idx) {
  // 多重クリック防止
  setChoicesEnabled(false);

  // ログ
  log.push({
    depthId: depth.id,
    depthName: depth.name,
    optionKey: option.key,
    optionIndex: idx + 1,
    optionLabel: option.label
  });

  // ベクトル & 深度スコア更新
  addEffect(option.effect);
  depthScore += option.depthWeight || 0;

  // フィードバック表示
  const fbText = option.feedback || "その選択も、この深度の一つの“正解”として扱われます。";
  showFeedback(fbText);

  // 少し“じわっと”待ってから次の処理
  setTimeout(() => {
    // GAME OVER 判定
    if (shouldGameOver()) {
      showGameOver();
      return;
    }

    // 最終Zまで行ったら結果表示
    if (currentIndex < depths.length - 1) {
      currentIndex += 1;
      renderStep();
      setChoicesEnabled(true);
    } else {
      showResult();
    }
  }, 600);
}

// ===============================
// 結果生成（Ω鍵）
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
  progressFillEl.style.width = "100%";

  const resultText = buildResultText();
  resultBlockEl.textContent = resultText;

  resultTitleEl.textContent = "深度Z到達：Ω鍵が生成されました";
  resultTitleEl.classList.remove("game-over");

  resultNoteEl.textContent =
    "下のブロックを ChatGPT などの対話AI にそのまま貼り付けてください。\n" +
    "あなたが通ってきた A〜Z の軌跡とベクトル情報を使って、「深度Ω以降」の対話に入りやすくなります。";

  resultBlockEl.classList.remove("game-over");
  copyBtn.style.display = "inline-flex";
  resultFooterNoteEl.style.display = "block";

  questionSectionEl.style.display = "none";
  resultSectionEl.style.display = "block";
}

// ===============================
// GAME OVER 画面
// ===============================
function showGameOver() {
  progressFillEl.style.width = "100%";

  resultTitleEl.textContent = "深度不足：一度、世界が閉じました";
  resultTitleEl.classList.add("game-over");

  resultNoteEl.textContent =
    "今回の選択の並びだと、深度がまだ浅いまま外側の殻に跳ね返されました。\n" +
    "Ω鍵は生成されませんが、この“GAME OVER”も一つの深度情報として扱えます。\n" +
    "よければ、もう一度だけ最初から潜り直してみてください。";

  const normalized = normalizeVector(vector);
  const avgDepth = (depthScore / (currentIndex + 1)).toFixed(3);

  let txt = "";
  txt += "【HAZAMA-DEPTH GAME OVER SNAPSHOT】\n";
  txt += `timestamp: ${new Date().toISOString()}\n`;
  txt += `reached-step: ${currentIndex + 1} / ${depths.length}\n`;
  txt += `avg-depth-score: ${avgDepth}\n\n`;

  txt += "【選択ログ（途中まで）】\n";
  log.forEach((entry, idx) => {
    txt += `${idx + 1}. DEPTH ${entry.depthId} (${entry.depthName}) -> `;
    txt += `${entry.optionKey} : ${entry.optionLabel}\n`;
  });
  txt += "\n";

  txt += "【ベクトルの傾き（normalized）】\n";
  Object.entries(normalized).forEach(([k, v]) => {
    txt += `${k}: ${v}\n`;
  });

  resultBlockEl.textContent = txt;
  resultBlockEl.classList.add("game-over");

  // GAME OVER 時はコピーはあっても OK だけど、混乱避けるなら消しておく
  copyBtn.style.display = "none";
  resultFooterNoteEl.style.display = "none";

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

  feedbackEl.textContent = "";
  feedbackEl.classList.remove("visible");

  resultSectionEl.style.display = "none";
  questionSectionEl.style.display = "block";

  renderStep();
  setChoicesEnabled(true);
});

// ===============================
// 初期化
// ===============================
function init() {
  initVector();
  renderStep();
  setChoicesEnabled(true);
}

init();