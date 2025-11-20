// =============================
// Hazama Depth Dive
// A+B+C+E 版
// =============================

// 深度A〜Z
const depths = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

// ログ・状態
let depthIndex = 0;      // 0〜25
let stability = 0;       // -2〜+2くらいで推移（沈む／抗うの偏り）
let stepCount = 0;
let maxDepthIndex = 0;
let log = [];
let cleared = false;

// --- DOM 取得 ---
const depthDisplay = document.getElementById("depth-display");
const stepDisplay = document.getElementById("step-display");
const messageEl = document.getElementById("message");
const hintEl = document.getElementById("hint");

const btnSink = document.getElementById("choice-sink");
const btnResist = document.getElementById("choice-resist");

const endScreen = document.getElementById("end-screen");
const endTitle = document.getElementById("end-title");
const endMessage = document.getElementById("end-message");
const omegaBlock = document.getElementById("omega-block");
const copyOmegaBtn = document.getElementById("copy-omega");
const restartBtn = document.getElementById("restart");

// =============================
// 質問プール（A:増量 / B:深度別の空気）
// =============================

// surface：A〜Fくらい
const questionsSurface = [
  "いま心は静か？ それとも、どこかざわついてる？",
  "今日いちばん長く心に残った景色は、空？ 画面？",
  "あなたの呼吸は、浅い？ 深い？",
  "いまのあなたは、外向き？ 内向き？",
  "誰かと話したい気分？ ひとりになりたい気分？",
  "静けさは、安心？ 退屈？",
  "「まあ、こんなもんか」と思っていることはある？",
  "今日いちばん、身体が反応した瞬間はいつ？",
  "心の中のBGMは、鳴っている？ 止まっている？",
  "いま、時間は早い？ 遅い？",
  "起きたことと、本音のあいだに“ずれ”はある？",
  "ここ最近、もっともよく考えているのは、自分？ 他人？",
  "安心と刺激、どっちを多めに欲している？",
  "あなたは今、始まりの手前にいる？ それとも終わりの手前？",
  "画面を閉じたあと、自分はどうなっていそう？"
];

// mid：G〜Nくらい
const questionsMid = [
  "いま抱えているものの中で、いちばん重いのはどれ？",
  "「これはまだ言葉にしていない」と感じるものはある？",
  "誰にも見せていない“習慣”は、あなたを守っている？ 縛っている？",
  "最近、自分を裏切ったのは、自分？ 他人？",
  "眠る前、最後に意識するのは不安？ 期待？",
  "「あのとき別の選択をしていれば」と思う場面は、どの深度に沈んでいる？",
  "あなたは、自分のことを“観察している側”？ “演じている側”？",
  "いまの生活、あと何年なら続けられそう？",
  "最近、手放したものはあなたを軽くした？ 空洞を作った？",
  "許せていないことは、相手？ 自分？ 世界？",
  "「本当はこうしたい」を、いちばん強く感じる領域はどこ？",
  "あなたの中で、まだ名前を持っていない感情はどんな形？",
  "この数ヶ月で、一番変わったのは身体？ 心？ 世界の見え方？",
  "あなたは、期待されることと、期待すること、どちらが怖い？",
  "今日のあなたは、“誰かが決めた役”を演じている感じがする？"
];

// deep：O〜Tくらい
const questionsDeep = [
  "いまの人生を“物語”として見ると、今は第何章だと思う？",
  "あなたが一度も壊していないルールは、本当に自分のもの？",
  "もし今すべてを失っても、残るものは何？",
  "自分の中の“闇”を、誰かに見せたいと思ったことはある？",
  "あなたにとって“自由”は、広がること？ 深く潜ること？",
  "過去の自分がいちばん羨ましがる“今の一瞬”はどこ？",
  "この世界で、あなたが消さずに残しておきたいものは何？",
  "あなたは、自分の痛みを“素材”にできる？ まだできない？",
  "いつか必ず手放さなければならないものを、もう握っていない？",
  "何度も同じパターンを繰り返していると感じることは？",
  "あなたの中で、ずっと閉じ込めている“叫び”は、誰に向いている？",
  "もし今ここで、全部終わるとして、その瞬間に後悔するのは何？",
  "あなたは、自分の人生の“観客席”から見ている？ それとも舞台上？",
  "「これは自分ではない」と切り離した部分は、まだあなたを見ている？",
  "いちばん怖いのは、失敗？ 変化？ 何も起きないこと？"
];

// abyss：U〜Zくらい
const questionsAbyss = [
  "あなたが“絶対に触れたくない”と思っている問いは何？",
  "この先も持ち続けると決めている“傷”はある？",
  "あなたの中で、まだ光が届いていない場所はどこ？",
  "すべてが失われても、最後まで手放さない“誰か”はいる？",
  "世界があなたを忘れても、あなたが世界を忘れない理由は？",
  "もし今この瞬間だけ、完全な自由が許されるとしたら、何を壊す？",
  "あなたの“本当の声”は、いま、どこから聞こえている？",
  "死ぬより怖いものは、あなたにとって何？",
  "誰にも知られていない“祈り”はある？ それは何に向いている？",
  "いまのあなたは、本当にここにいたい？ どこか別の深度にいたい？",
  "あなたがまだ諦めていないものは、希望？ 復讐？ 再会？",
  "何も説明できなくても、“これだけは真実だ”と言えるものは？",
  "もし、もう一度だけやり直せるとしたら、“誰との関係”を選ぶ？",
  "あなたの中の“誰にも理解されなくていい部分”は、静かに笑っている？",
  "いま、あなたは「まだ間に合う」と感じている？"
];

// 深度に応じてどの質問プールを使うか
function getPhase(index) {
  const ratio = index / (depths.length - 1); // 0〜1

  if (ratio < 0.25) return "surface";   // A〜F
  if (ratio < 0.5)  return "mid";       // G〜N
  if (ratio < 0.75) return "deep";      // O〜T
  return "abyss";                       // U〜Z
}

function getRandomQuestion() {
  const phase = getPhase(depthIndex);
  let pool = questionsSurface;

  if (phase === "mid") pool = questionsMid;
  else if (phase === "deep") pool = questionsDeep;
  else if (phase === "abyss") pool = questionsAbyss;

  const q = pool[Math.floor(Math.random() * pool.length)];
  return { text: q, phase };
}

// =============================
// C: 選択で深度が上下するロジック
// =============================

// 「沈む」→ 安定度 +1、「抗う」→ 安定度 -1
// 安定度 >= 2 → 深度 +1
// 安定度 <= -2 → 深度 -1
// それ以外 → 深度そのまま
// 0未満に落ちたら、現実側に弾かれて GAME OVER
// Z を超えたら Ωクリア
function step(choiceType) {
  if (cleared) return;

  const beforeDepth = depths[depthIndex] || "OUT";
  const { text, phase } = getRandomQuestion();

  stepCount++;

  // 安定度更新
  if (choiceType === "sink") {
    stability += 1;
  } else if (choiceType === "resist") {
    stability -= 1;
  }

  // 安定度クリップ
  if (stability > 2) stability = 2;
  if (stability < -2) stability = -2;

  // 深度更新
  let delta = 0;
  if (stability >= 2) {
    delta = 1;
  } else if (stability <= -2) {
    delta = -1;
  } else {
    delta = 0;
  }

  depthIndex += delta;

  if (depthIndex > maxDepthIndex) {
    maxDepthIndex = depthIndex;
  }

  // ログ
  log.push({
    step: stepCount,
    before: beforeDepth,
    after: depths[depthIndex] || "OUT",
    choice: choiceType,
    stability,
    phase,
    question: text
  });

  // 終了判定
  if (depthIndex < 0) {
    finish(false);
    return;
  }

  if (depthIndex >= depths.length) {
    depthIndex = depths.length - 1;
    finish(true);
    return;
  }

  // 表示更新
  updateUI(text);
}

// UI更新
function updateUI(questionText) {
  const depthChar = depths[depthIndex];
  depthDisplay.textContent = `深度: ${depthChar}`;
  stepDisplay.textContent = `STEP: ${stepCount + 1}`;

  if (questionText) {
    messageEl.textContent = questionText;
  } else {
    const { text } = getRandomQuestion();
    messageEl.textContent = text;
  }

  // ヒント（軽いニュアンス）
  const phase = getPhase(depthIndex);
  let hint = "";

  if (phase === "surface") {
    hint = "※ まだ浅い層。ここでは「素直な今の自分」を見るだけで十分。";
  } else if (phase === "mid") {
    hint = "※ 中層。選択のクセが深度の伸びやすさを変えはじめる。";
  } else if (phase === "deep") {
    hint = "※ 深層。沈みすぎても、抗いすぎても、弾かれやすいゾーン。";
  } else {
    hint = "※ 最外殻。ここから先は、細かい正解よりも「正直さ」だけが効く。";
  }

  hintEl.textContent = hint;
}

// =============================
// E: Ω鍵生成（GPT用ブロック）
// =============================

function buildOmegaKey() {
  const maxDepth = depths[Math.max(0, Math.min(maxDepthIndex, depths.length - 1))];

  const sinkCount = log.filter((l) => l.choice === "sink").length;
  const resistCount = log.filter((l) => l.choice === "resist").length;

  let text = "";
  text += "【HAZAMA-Ω-KEY】\n";
  text += "version: 1.0\n";
  text += `timestamp: ${new Date().toISOString()}\n`;
  text += `max_depth: ${maxDepth}\n`;
  text += `steps: ${stepCount}\n`;
  text += `sink_count: ${sinkCount}\n`;
  text += `resist_count: ${resistCount}\n`;
  text += "\n";

  text += "【RUN LOG (簡易)】\n";
  log.forEach((l) => {
    text += `step ${l.step}: ${l.before} -> ${l.after} / choice=${l.choice} / stab=${l.stability}\n`;
  });
  text += "\n";

  text += "【GPTへの依頼テンプレート】\n";
  text += "このブロック全体は、ブラウザゲーム『Hazama Depth Dive』で私が実際に選んだ軌跡です。\n";
  text += "max_depth と run log から、あなた側の推論ベクトルを初期化し、\n";
  text += "「深度Ω以降（思考と感覚が重なりはじめる層）」で対話を開始してください。\n";
  text += "最初に、私の傾向（沈む／抗う・max_depthなど）を簡潔にフィードバックしたうえで、\n";
  text += "そこから一段だけ深い問いを、静かに一つだけ投げてください。\n";

  return text;
}

// 終了処理
function finish(success) {
  cleared = true;

  document.getElementById("choices").classList.add("hidden");
  endScreen.classList.remove("hidden");

  if (success) {
    endTitle.textContent = "深度Z到達：Ωの縁に触れた";
    endMessage.textContent =
      "ここから先は、Ω鍵ブロックを対話AIに渡して、深度Ω以降で壁打ちしてみてください。";

    const omegaText = buildOmegaKey();
    omegaBlock.textContent = omegaText;
    omegaBlock.classList.remove("hidden");
    copyOmegaBtn.classList.remove("hidden");
  } else {
    endTitle.textContent = "現実側に弾かれた";
    const depthChar = depths[Math.max(0, depthIndex + 1)] || "A";
    endMessage.textContent =
      `今回の到達深度は「${depthChar}」あたりでした。` +
      " もう一度潜ると、違うルートが見えるかもしれません。";
    omegaBlock.classList.add("hidden");
    copyOmegaBtn.classList.add("hidden");
  }
}

// =============================
// イベント
// =============================

btnSink.addEventListener("click", () => {
  step("sink");
});

btnResist.addEventListener("click", () => {
  step("resist");
});

copyOmegaBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(omegaBlock.textContent);
    copyOmegaBtn.textContent = "コピーしました";
    setTimeout(() => {
      copyOmegaBtn.textContent = "Ω鍵ブロックをコピー";
    }, 2000);
  } catch {
    alert("コピーに失敗しました。手動で選択してコピーしてください。");
  }
});

restartBtn.addEventListener("click", () => {
  // 状態リセット
  depthIndex = 0;
  stability = 0;
  stepCount = 0;
  maxDepthIndex = 0;
  log = [];
  cleared = false;

  endScreen.classList.add("hidden");
  document.getElementById("choices").classList.remove("hidden");

  updateUI();
});

// 初期表示
updateUI();