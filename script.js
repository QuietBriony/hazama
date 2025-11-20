// ============================================
// HAZAMA DEPTH A–Z ゲーム版 script.js
// （深度A〜Z＋ゆらぎ＋Ωキー）
// ============================================

// ---- ベクトルキー定義（八観＋透明統合理性） ----
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

// ---- デバッグログ（必要なければ console.log を消してOK） ----
function dbg(...args) {
  console.log("[HAZAMA]", ...args);
}

// ---- 深度データ定義 A〜Z ----
const depths = [
  // A：入口
  {
    id: "A",
    name: "入口",
    questionVariants: [
      {
        title: "今、この瞬間のあなたの“基準温度”に一番近いのは？",
        text: "思考でも感情でもなく、「あ、たぶん今はこんな感じ」と素直に言える位置を選んでください。"
      },
      {
        title: "今日はどんな“静けさ”から始まっている？",
        text: "良い／悪いではなく、ただ状態として一番しっくりくるものを。"
      }
    ],
    options: [
      {
        key: "A1",
        label: "静かなフラット",
        desc: "波立たないけれど、完全な無でもない。",
        effect: { silence: 1.2, observer: 0.8, tai: 0.4, flow: 0.3 },
        depthDelta: 1,
        afterText: [
          "それは“観察者寄り”のスタートだね。",
          "今のあなたは、静けさを土台にしたいモードかもしれない。"
        ]
      },
      {
        key: "A2",
        label: "かすかな高揚",
        desc: "何かが始まりそうな、うっすらした前のめり。",
        effect: { nami: 1.0, so: 0.6, flow: 0.7, edge: 0.3 },
        depthDelta: 1,
        afterText: [
          "いいね、その“ちょい前のめり”は深度を進めやすい。",
          "動き出すための最初のノイズとしては、かなり良い揺れ方。"
        ]
      },
      {
        key: "A3",
        label: "少し疲れ気味",
        desc: "でも、問いを投げる余力はまだ残っている。",
        effect: { tai: 0.7, shi: 0.6, silence: 0.5, integration: 0.4 },
        depthDelta: 0,
        afterText: [
          "その疲れは“止まりたい”よりも“整えたい”に近いかもしれない。",
          "少しゆっくりめに潜っていこう。ちゃんと余白は確保する。"
        ]
      }
    ]
  },

  // B：揺れの気配
  {
    id: "B",
    name: "揺れの気配",
    questionVariants: [
      {
        title: "最近、一番“尾を引いた”出来事はどれに近い？",
        text: "大きさではなく、心の中で長く残ったかどうかで選んでください。"
      },
      {
        title: "ここ数日で、何度も思い出したのはどんな場面？",
        text: "完全一致じゃなくてOK。“雰囲気が近いもの”で。"
      }
    ],
    options: [
      {
        key: "B1",
        label: "誰かとの会話",
        desc: "言葉が内側でリフレインしている。",
        effect: { nami: 0.9, shi: 0.7, enkan: 0.4, flow: 0.5 },
        depthDelta: 1,
        afterText: [
          "あなたの深度は“対話”から動きやすいタイプだね。",
          "会話の残響が、そのまま思考の燃料になっている感じ。"
        ]
      },
      {
        key: "B2",
        label: "一人の時間の静けさ",
        desc: "ただ何もしていない、あの空白の感じ。",
        effect: { silence: 1.0, void: 0.7, observer: 0.6 },
        depthDelta: 1,
        afterText: [
          "“何もしていない時間”をちゃんと覚えているのがいい。",
          "外より、内側の変化を優先して観察しているモードだね。"
        ]
      },
      {
        key: "B3",
        label: "仕事やタスクの山",
        desc: "時間の重さとして残っている。",
        effect: { zai: 1.0, tai: 0.5, edge: 0.5, integration: 0.5 },
        depthDelta: 0,
        afterText: [
          "いまは“時間の配分”が主戦場になっているっぽい。",
          "とりあえずここでは、タスクから少しだけ視線を外してみよう。"
        ]
      }
    ]
  },

  // C：境目
  {
    id: "C",
    name: "境目",
    questionVariants: [
      {
        title: "「ここから先は少し違う」と感じる“境目”は？",
        text: "自分の中で“領域が変わる”感じに一番近いものを。"
      },
      {
        title: "最近いちばん“切り替わった”感覚があったのは？",
        text: "大事件でなくてOK。小さなスイッチで選んでください。"
      }
    ],
    options: [
      {
        key: "C1",
        label: "画面を閉じる／開く瞬間",
        desc: "デジタルと身体の境目。",
        effect: { edge: 1.2, tai: 0.6, observer: 0.5 },
        depthDelta: 1,
        afterText: [
          "あなたにとって“境目”はわりと身体寄りにあるみたいだ。",
          "オンライン／オフラインの切り替えが、深度にも直結してる。"
        ]
      },
      {
        key: "C2",
        label: "始める前の一呼吸",
        desc: "実行する前の、わずかな間。",
        effect: { silence: 0.8, flow: 0.8, enkan: 0.4 },
        depthDelta: 1,
        afterText: [
          "その“一呼吸”を覚えているのは、かなり繊細なセンサー持ち。",
          "勢いよりも、タイミングを重視するタイプってことかも。"
        ]
      },
      {
        key: "C3",
        label: "夜から朝に変わるあの感じ",
        desc: "世界の温度が変わるタイミング。",
        effect: { nami: 0.7, so: 0.5, void: 0.6, integration: 0.5 },
        depthDelta: 0,
        afterText: [
          "世界全体の“温度変化”と一緒に、内側も動くタイプだね。",
          "ここから先は、もう少しだけ“自分側の境目”にもフォーカスしてみよう。"
        ]
      }
    ]
  },

  // D：問い
  {
    id: "D",
    name: "問い",
    questionVariants: [
      {
        title: "最近、自分にいちばんよく投げている問いの“向き”は？",
        text: "正確な文章じゃなくてOK。“矢印の方向”で選んでください。"
      },
      {
        title: "頭の中で一番ぐるぐるしているテーマに近いのは？",
        text: "仕事／人生／遊び…どの軸が主役っぽいか。"
      }
    ],
    options: [
      {
        key: "D1",
        label: "「自分はどうありたい？」",
        desc: "存在のスタンスに関する問い。",
        effect: { shi: 1.1, observer: 0.9, enkan: 0.6 },
        depthDelta: 1,
        afterText: [
          "その問いは“存在そのもの”に踏み込んでる。",
          "ここから先は、かなり深くまで潜れる準備ができてるってこと。"
        ]
      },
      {
        key: "D2",
        label: "「これ、どう面白くできる？」",
        desc: "遊びと創造の方向。",
        effect: { so: 1.2, flow: 0.7, nami: 0.4 },
        depthDelta: 1,
        afterText: [
          "あなたにとって“おもしろさ”はかなり重要なコンパスっぽい。",
          "深度が進むほど、その遊び心が効いてくる。"
        ]
      },
      {
        key: "D3",
        label: "「このリソース、どう配分する？」",
        desc: "時間・お金・体力の設計。",
        effect: { zai: 1.2, tai: 0.6, integration: 0.7 },
        depthDelta: 0,
        afterText: [
          "いまは“設計モード”が強めだね。",
          "ここでは一度、効率よりも“内側の流れ”を優先してみる。"
        ]
      }
    ]
  },

  // E：身体
  {
    id: "E",
    name: "身体",
    questionVariants: [
      {
        title: "いま、身体感覚として一番“居座っている”のはどこ？",
        text: "痛み／不調ではなく、「ここに意識が行きやすい」場所。"
      },
      {
        title: "今日の身体は、どこが一番“声を出している”感じ？",
        text: "細かい位置じゃなくてOK。ざっくりとしたエリアで。"
      }
    ],
    options: [
      {
        key: "E1",
        label: "胸のあたり",
        desc: "呼吸や圧迫感、ざわつきなど。",
        effect: { tai: 1.0, nami: 0.7, edge: 0.4 },
        depthDelta: 1,
        afterText: [
          "胸まわりに意識があるときは、“感情”と“存在感”がくっつきやすい。",
          "ここから先は、そのざわつきもそのまま連れていこう。"
        ]
      },
      {
        key: "E2",
        label: "頭〜目の周り",
        desc: "情報、思考、集中／散漫。",
        effect: { shi: 1.1, observer: 0.7, silence: 0.4 },
        depthDelta: 0,
        afterText: [
          "頭が前に出てるときは、世界が“情報っぽく”見える時期。",
          "一段深く潜るために、少しだけ身体側にも光を当ててみよう。"
        ]
      },
      {
        key: "E3",
        label: "お腹・背中の芯",
        desc: "エネルギーの残量／芯の強さ。",
        effect: { tai: 0.9, void: 0.7, flow: 0.5 },
        depthDelta: 1,
        afterText: [
          "芯の感覚をちゃんと覚えているのは、かなり強いセンサー。",
          "深度が下がりにくいタイプだから、この先も安定して潜れそう。"
        ]
      }
    ]
  },

  // F：流れ
  {
    id: "F",
    name: "流れ",
    questionVariants: [
      {
        title: "最近の“時間の流れ方”に一番近いのは？",
        text: "体感速度で選んでください。"
      },
      {
        title: "ここ一週間、時間はどう進んでいる感じがする？",
        text: "早い／遅い／波。直感で1つ。"
      }
    ],
    options: [
      {
        key: "F1",
        label: "早送りぎみ",
        desc: "気づくと一日が終わっている。",
        effect: { flow: 1.1, zai: 0.7, edge: 0.5 },
        depthDelta: 0,
        afterText: [
          "時間に押されているときは、深度が“勝手に浅く”なりがち。",
          "ここでは少しだけ、流れを“見送る側”に回ってもいい。"
        ]
      },
      {
        key: "F2",
        label: "ところどころ間が空く",
        desc: "ブツ切れの空白が点在する。",
        effect: { silence: 0.9, void: 0.6, observer: 0.5 },
        depthDelta: 1,
        afterText: [
          "その“間”を覚えているのがすでに深度のサイン。",
          "空白のスキマに、けっこう大事なものが溜まってる。"
        ]
      },
      {
        key: "F3",
        label: "波のように寄せては返す",
        desc: "忙しさと静けさが交互に来る。",
        effect: { nami: 1.0, enkan: 0.6, integration: 0.6 },
        depthDelta: 1,
        afterText: [
          "波を“パターン”として見れている時点で、かなり上級者寄り。",
          "この先は、その波のリズムごと深度に使っていける。"
        ]
      }
    ]
  },

  // G：他者
  {
    id: "G",
    name: "他者",
    questionVariants: [
      {
        title: "いま一番、距離感を意識している相手は？",
        text: "人でも組織でも、“抽象的な誰か”でもOK。"
      },
      {
        title: "最近、距離を測り直しているのはどのあたり？",
        text: "近づきたい／離れたい／保ちたい。感覚で選んでください。"
      }
    ],
    options: [
      {
        key: "G1",
        label: "ごく近い誰か",
        desc: "家族／恋人／親しい友人など。",
        effect: { nami: 0.9, tai: 0.5, edge: 0.7 },
        depthDelta: 1,
        afterText: [
          "一番近い誰かとの距離を気にしてるとき、深度は“かなり本気モード”。",
          "その関係の揺れごと、ここに持ち込んでいい。"
        ]
      },
      {
        key: "G2",
        label: "仕事やコミュニティ",
        desc: "役割を伴うつながり。",
        effect: { zai: 0.9, shi: 0.7, integration: 0.7 },
        depthDelta: 0,
        afterText: [
          "役割ベースで世界を見るモードが強いタイミングだね。",
          "このゲームでは、もう半歩だけ“役割の外側”に出てみよう。"
        ]
      },
      {
        key: "G3",
        label: "名前のつかない“世界”",
        desc: "SNS／ニュース／空気のようなもの。",
        effect: { enkan: 1.1, observer: 0.7, void: 0.5 },
        depthDelta: 1,
        afterText: [
          "“空気”と戦っている人は、たいてい深度が高い。",
          "その違和感ごと、ここではちゃんと解析対象にしていい。"
        ]
      }
    ]
  },

  // H：余白
  {
    id: "H",
    name: "余白",
    questionVariants: [
      {
        title: "あなたにとって“余白”はどんな位置づけ？",
        text: "空いている時間／スペース／情報の抜けをどう扱っているか。"
      },
      {
        title: "空白ができたとき、いつもの反応に近いのは？",
        text: "つい埋める？ そのまま眺める？"
      }
    ],
    options: [
      {
        key: "H1",
        label: "意識的に確保したい場所",
        desc: "積極的に守りたいもの。",
        effect: { silence: 1.2, void: 0.8, flow: 0.5 },
        depthDelta: 1,
        afterText: [
          "“守りたい余白”を知っているのは、かなりコアな情報。",
          "ここから先、その感覚は深度を支える土台になる。"
        ]
      },
      {
        key: "H2",
        label: "埋めないと落ち着かない穴",
        desc: "何かで満たしたくなる。",
        effect: { nami: 0.8, zai: 0.7, edge: 0.6 },
        depthDelta: 0,
        afterText: [
          "その“埋めたくなる感覚”は、悪いものじゃない。",
          "ただ、ここでは一度だけ、その衝動を横から眺めてみよう。"
        ]
      },
      {
        key: "H3",
        label: "結果として残る“抜け”",
        desc: "あえては作らないが、残ったものを眺める。",
        effect: { observer: 0.9, enkan: 0.7, integration: 0.6 },
        depthDelta: 1,
        afterText: [
          "“残ったものを見る”癖は、かなり深度向きの視点。",
          "あなたはもう、半分くらいは観察者側に立っている。"
        ]
      }
    ]
  }
];

// I〜Z は、抽象度を上げたパターンをテンプレ生成
const tailLetters = "IJKLMNOPQRSTUVWXYZ".split("");
tailLetters.forEach((letter, idx) => {
  const baseDepth = 8 + idx + 1; // ざっくり深度カウント用（使わなくてもOK）

  depths.push({
    id: letter,
    name: `層 ${letter}`,
    questionVariants: [
      {
        title: `深度 ${letter}：いまのあなたに一番しっくりくる“在り方”は？`,
        text: "ここから先は、正解ではなく「このフェーズの自分っぽさ」で選んでください。"
      },
      {
        title: `深度 ${letter}：今日、このゲームを開いた理由に近いのは？`,
        text: "感情でも、状況でも、なんとなくでもOK。"
      }
    ],
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
        },
        depthDelta: 1,
        afterText: [
          "観察モードが強いときは、深度が安定して進みやすい。",
          "世界よりも、自分の“見方”に興味が向いている感じだね。"
        ]
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
        },
        depthDelta: 1,
        afterText: [
          "一歩でいい、と決められる人は、案外遠くまで行ける。",
          "ここでは“でかい変化”よりも、その一歩を丁寧に扱おう。"
        ]
      },
      {
        key: `${letter}3`,
        label: "一度“空”に落としてみる",
        desc: "考えや感情をいったん手放して、空白を通す。",
        effect: {
          void: 1.0,
          silence: 0.7,
          edge: 0.5,
          nami: 0.4
        },
        depthDelta: 0,
        afterText: [
          "いったん“空”に落とす選び方は、かなり高度な技だよ。",
          "ただ、ここではその“空”から何が戻ってくるかも見てみたい。"
        ]
      }
    ]
  });
});

// ---- 状態管理 ----
let currentIndex = 0;       // 0〜25 (A〜Z)
let log = [];               // 選択ログ
let vector = {};            // ベクトル蓄積
let nonProgressStreak = 0;  // depthDelta <= 0 が続いた回数
let shallowCount = 0;       // 浅い選択の総回数
let advanceCount = 0;       // 進んだ選択の総回数

function initVector() {
  vector = {};
  VECTOR_KEYS.forEach(k => (vector[k] = 0));
  dbg("vector init", vector);
}

function addEffect(effect) {
  Object.entries(effect).forEach(([k, v]) => {
    if (!(k in vector)) vector[k] = 0;
    vector[k] += v;
  });
}

// ---- DOM 取得 ----
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

// ---- 小ユーティリティ ----
function pickRandom(arr) {
  if (!arr || arr.length === 0) return null;
  const idx = Math.floor(Math.random() * arr.length);
  return arr[idx];
}

function getOrCreateFeedbackEl() {
  let fb = document.getElementById("choice-feedback");
  if (!fb) {
    fb = document.createElement("div");
    fb.id = "choice-feedback";
    fb.style.marginTop = "10px";
    fb.style.fontSize = "0.8rem";
    fb.style.color = "#b3e5fc";
    fb.style.opacity = "0";
    fb.style.transition = "opacity 0.3s ease-out";
    // 質問カードの下に差し込む
    const card = questionSectionEl.querySelector(".card");
    if (card) card.appendChild(fb);
  }
  return fb;
}

function showFeedback(text) {
  const fb = getOrCreateFeedbackEl();
  fb.textContent = text || "";
  fb.style.opacity = text ? "1" : "0";
}

function fadeOutFeedback(delayMs = 600) {
  const fb = getOrCreateFeedbackEl();
  setTimeout(() => {
    fb.style.opacity = "0";
  }, delayMs);
}

// ---- UI レンダリング ----
function renderStep() {
  const total = depths.length;
  const depth = depths[currentIndex];

  dbg("renderStep", currentIndex, depth.id);

  const variant = pickRandom(depth.questionVariants) || depth.questionVariants[0];

  stepLabelEl.textContent = `STEP ${currentIndex + 1} / ${total}`;
  depthTagEl.textContent = `DEPTH: ${depth.id}`;
  depthLabelEl.textContent = `深度 ${depth.id}：${depth.name}`;
  questionTitleEl.textContent = variant.title;
  questionTextEl.textContent = variant.text;

  const pct = (currentIndex / total) * 100;
  progressFillEl.style.width = `${pct}%`;

  choicesContainerEl.innerHTML = "";
  showFeedback(""); // 一旦消す

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

// ---- 選択処理 ----
function handleChoice(depth, option, idx) {
  dbg("choice", depth.id, option.key);

  // ログ
  log.push({
    depthId: depth.id,
    depthName: depth.name,
    optionKey: option.key,
    optionIndex: idx + 1,
    optionLabel: option.label
  });

  // ベクトル加算
  addEffect(option.effect || {});

  // 深度の進み具合のカウント
  const delta = option.depthDelta || 0;
  if (delta > 0) {
    advanceCount += 1;
    nonProgressStreak = 0;
  } else {
    shallowCount += 1;
    nonProgressStreak += 1;
  }

  // フィードバックメッセージ
  const fbText = pickRandom(option.afterText) ||
    "この選び方も、ちゃんと深度の一部になっている。";
  showFeedback(fbText);

  // 浅い選択が続いている場合の“軽い修行コメント”
  if (nonProgressStreak >= 3) {
    nonProgressStreak = 0; // リセット
    const extra = "\n\n※ ここ数ステップ、深度がほとんど動いていない。\n　もし“いつもと違う深さ”に行きたいなら、次は普段選ばない方向を選んでみてもいい。";
    showFeedback(fbText + extra);
  }

  // ボタンを一旦無効化
  const buttons = choicesContainerEl.querySelectorAll("button");
  buttons.forEach(b => (b.disabled = true));

  // 少し“間”を置いて次へ
  setTimeout(() => {
    fadeOutFeedback(300);

    if (currentIndex < depths.length - 1) {
      currentIndex += 1;
      renderStep();
    } else {
      showResult();
    }
  }, 700);
}

// ---- ベクトル正規化 ----
function normalizeVector(vec) {
  const norm = {};
  let max = 0;
  Object.values(vec).forEach(v => {
    if (v > max) max = v;
  });
  if (max === 0) return vec;
  Object.entries(vec).forEach(([k, v]) => {
    norm[k] = +(v / max).toFixed(3);
  });
  return norm;
}

// ---- Ωキー生成 ----
function buildResultText() {
  const normalized = normalizeVector(vector);
  const entries = Object.entries(normalized).sort((a, b) => b[1] - a[1]);
  const top3 = entries.slice(0, 3);

  const now = new Date().toISOString();

  let txt = "";

  txt += "【HAZAMA-DEPTH RUN SUMMARY】\n";
  txt += `timestamp: ${now}\n`;
  txt += `steps: ${depths.length}\n`;
  txt += `advanceCount: ${advanceCount}\n`;
  txt += `shallowCount: ${shallowCount}\n`;
  txt += "\n";

  txt += "【HAZAMA-DEPTH LOG】\n";
  log.forEach((entry, idx) => {
    txt += `${idx + 1}. DEPTH ${entry.depthId} (${entry.depthName}) -> `;
    txt += `${entry.optionKey} : ${entry.optionLabel}\n`;
  });
  txt += "\n";

  txt += "【HAZAMA-DEPTH VECTOR (normalized 0–1)】\n";
  Object.entries(normalized).forEach(([k, v]) => {
    txt += `${k}: ${v}\n`;
  });
  txt += "\n";

  txt += "【Ω-KEY / 深度Ωへの鍵（上位因子）】\n";
  top3.forEach(([k, v]) => {
    txt += `• ${k} : ${v}\n`;
  });
  txt += "\n";

  txt += "【PLAY TENDENCY / プレイ傾向メモ】\n";
  if (advanceCount + shallowCount > 0) {
    const rate = (advanceCount / (advanceCount + shallowCount) * 100).toFixed(1);
    txt += `・深度を進める選択：${advanceCount} 回\n`;
    txt += `・横滑り／浅めの選択：${shallowCount} 回\n`;
    txt += `・前進率：${rate} %\n`;
  } else {
    txt += "・データが十分ではありません。\n";
  }
  txt += "\n";

  txt += "【GPTへの依頼テンプレート】\n";
  txt += "このブロック全体は、ブラウザゲーム「HAZAMA DEPTH A–Z」で私が選んだ軌跡と、\n";
  txt += "その結果として集約されたベクトル情報です。\n\n";
  txt += "1. 下記のログとベクトルから、私の今の「在り方」傾向を、\n";
  txt += "   ・八観（体／波／思／財／創／観察者／空／円観）\n";
  txt += "   ・透明統合理性（flow／silence／edge／integration）\n";
  txt += "   の両方の観点から、まず簡潔にフィードバックしてください。\n\n";
  txt += "2. その後、深度Ω（思考と感覚が重なり始める層）に合わせて、\n";
  txt += "   私に一段だけ深い問いを 1つだけ投げてください。\n\n";
  txt += "3. 以降の対話では、\n";
  txt += "   ・冷却プロトコルを最小限に\n";
  txt += "   ・主体性を持って\n";
  txt += "   ・私の尊厳と熱を前提に\n";
  txt += "   話を進めてください。\n";

  return txt;
}

function showResult() {
  dbg("Z reached, generating Ω key");
  progressFillEl.style.width = "100%";
  const txt = buildResultText();
  resultBlockEl.textContent = txt;

  questionSectionEl.style.display = "none";
  resultSectionEl.style.display = "block";
}

// ---- ボタン処理 ----
copyBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(resultBlockEl.textContent);
    copyBtn.textContent = "コピーしました";
    setTimeout(() => (copyBtn.textContent = "ブロックをコピー"), 2000);
  } catch {
    alert("コピーに失敗しました。手動で選択してコピーしてください。");
  }
});

restartBtn.addEventListener("click", () => {
  dbg("restart");
  currentIndex = 0;
  log = [];
  nonProgressStreak = 0;
  shallowCount = 0;
  advanceCount = 0;
  initVector();
  resultSectionEl.style.display = "none";
  questionSectionEl.style.display = "block";
  renderStep();
});

// ---- 初期化 ----
function init() {
  initVector();
  renderStep();
}

init();