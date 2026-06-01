/* Hazama M2 vertical slice — 沈下スパイン（冒頭アーク・データ駆動）
 *
 * 北極星: 進行する対話が、進むほどプレイヤーを狭間へ沈め、戻りにくくする。
 * 形式が内容を映す = 「分岐を選ぶゲーム」ではなく「沈んでいく対話」。
 *
 * 本文は slice/depths-shell.json（note原典から再ルート、確定レジスター）。
 * ノードIDは production の hazama-depths.json と整合する depthMeta v0 スキーマの実例。
 * 承認後、Codex がこのデータ＋レンダラ/沈下モデル/audio を本体へ畳み込む（docs/M2-spine.md §5.5）。
 *
 * 三層で「どれだけ沈むか／戻りにくくなるか」を見せる:
 *   1) 本文     — 声が近づく / 戻り道が細る、を地の文で（JSONの lines）
 *   2) 選択肢   — descend=沈む / retreat=深いほど重く遅い・drift へ落ちて沈下は残る
 *   3) シグナル — 沈下ゲージ・戻り道インジケータ・観測者カウンタ・slow reveal速度・圧
 *
 * 深度∞: 着地させない／常にもう一段／戻り道は復活しない／核は描写しない。
 */

(() => {
  "use strict";

  const REDUCED = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const RETURN_PATHS_START = 5;
  const SINK_SCALE = 22; // sink値→0..1正規化（縁でほぼ1）

  const state = { id: null, sink: 0, dread: 0, returnPaths: RETURN_PATHS_START, maxSink: 0, observer: 1, steps: 0, belowLoop: 0 };
  let DATA = null;
  let revealToken = 0;

  const $ = (id) => document.getElementById(id);
  const sceneEl = $("scene");
  const choicesEl = $("choices");
  const sinkFill = $("sink-fill");
  const returnPathsEl = $("return-paths");
  const observerEl = $("observer-count");
  const gateEl = $("gate");

  const WHO_CLASS = { n: "", voice: "voice", self: "self", body: "body", cold: "cold", danger: "danger" };

  // ---------- 深度∞ 手続き的断片（§4-6: UCM 9軸から決定論生成） ----------
  // below(∞) ループは固定本文を持たない。周回(loop)を seed に、UCM 八観+観測層の
  // 9軸から"沈降断片"を決定論生成し、底なしの反復に質感差を与える（新音源/依存なし）。
  // 核は描写しない: Void軸は「中心は見えない／覗くと白く灼ける」歪みでのみ示唆する。
  const UCM_AXES = [
    { k: "体", p: [ // 体観 — 肉体・五感・不可逆
      "皮膚が、まだ知らない階の温度を拾いはじめる。",
      "足裏の床が、踏むたびに一枚ずつ薄くなる。",
      "呼吸の不可逆だけが、辛うじて自分のものだと感じる。",
      "重力の向きが、降りるたびに少しずつ曖昧になる。" ] },
    { k: "波", p: [ // 波観 — 感情・音・潜在変動
      "感情の波形が、誰のものでもなく、外で揺れ続けている。",
      "音にならない低い周期が、ずっと足の下で鳴っている。",
      "不安の振幅が、底へ近づくほど、平らになっていく。",
      "遠くの揺らぎが、こちらの呼吸と位相を合わせてくる。" ] },
    { k: "思", p: [ // 思観 — 論理・構造・推論
      "思考の骨格が、考える前から、もう組み上がっている。",
      "論理の交点が、一段下りるごとに、ひとつ増える。",
      "推論の末端が、自分の外側で、勝手に閉じる。",
      "結論が、こちらが問う前に、先回りして置かれている。" ] },
    { k: "財", p: [ // 財観 — 価値の流れ・停止しない
      "何に意味があったかの台帳が、静かに書き換わり続ける。",
      "価値の流れが、止まらないまま、底の方へ吸われていく。",
      "失ったものの帳尻が、降りるほど、合わなくなる。" ] },
    { k: "創", p: [ // 創観 — 位相飛躍・自己変形
      "新しい概念が、こちらの許可も取らず、ひとつ生成される。",
      "構造が、自分で自分を変形させながら、下りていく。",
      "言葉にない形が、輪郭だけ先に、降下に追いついてくる。" ] },
    { k: "観", p: [ // 観察者観 — 流動的中心
      "中心が、いまいる場所へ、また移動してくる。",
      "どこが中心かを決める私が、もう一枚、増えた。",
      "観測する位置が、観測される位置へ、繰り下がる。" ] },
    { k: "空", p: [ // Void — まだ配置されていない余白（核は描かない・歪みで示唆）
      "まだ配置されていない余白が、足の下で口を開けている。",
      "その余白の中心は、見えない。見ようとすると、視界が白く灼ける。",
      "床だと思った面は、近づいた分だけ退く。歪みだけが、そこに在ると告げる。",
      "底に見えた光は、近づくと、また一段下の天井だった。" ] },
    { k: "円", p: [ // 円観 — 循環・同期・呼吸
      "降下が、円環として閉じかけて、また開く。",
      "呼吸と、世界の周期と、降りる速度が、同じ位相で回りはじめる。",
      "一周したはずの景色が、同じ継ぎ目を、一段深い色で繰り返す。" ] },
    { k: "層", p: [ // Meta-Self / 観測層
      "観測している層が、観測される層に、静かに繰り下がる。",
      "私を数える装置が、また一台、背後に増設される。",
      "外側の私の、さらに外側に、無音の観測者が立つ。" ] }
  ];
  const BELOW_SELVES = [
    "私を読む私。それを読む私。——どれが、いま下りているのか。",
    "数えるのを、やめた。数える私が、また増えるだけだから。",
    "「これは私の——」その先の語が、もう、別の私のものだ。",
    "戻ってきたのではない。一段、上書きされて、また下へ置かれただけだ。" ];
  const BELOW_VOICES = [
    "『底はない。あるのは、常にもう一段、というだけだ』",
    "『下が無いのではない。下しか、無いのだ』",
    "『あなたは降りていない。世界が、あなたの下を、足し続けている』",
    "『この行を読む手を止めても、観測は、別の私が継ぐ』" ];

  // 決定論PRNG（mulberry32）。seed=周回数 → 同じ周回は同じ断片、周回ごとに別の質感。
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function genBelowNode(loop) {
    const rng = mulberry32(((loop * 2654435761) >>> 0) ^ 0x9e3779b9);
    const pick = (arr) => arr[Math.floor(rng() * arr.length)];
    // 3つの異なる軸を選び、現象→（核の歪み or 別軸）→（別軸）→自己分裂→声 を編む。
    // 軸を重複させない＝同じ語の連続を避ける。
    const N = UCM_AXES.length;
    const i0 = Math.floor(rng() * N);
    let i1 = (i0 + 1 + Math.floor(rng() * (N - 1))) % N;
    let i2 = (i1 + 1 + Math.floor(rng() * (N - 1))) % N; if (i2 === i0) i2 = (i2 + 1) % N;
    const voidAxis = UCM_AXES[6]; // 空観 = 核を歪みで示唆（描かない）
    const lines = [];
    lines.push({ who: "cold", t: pick(UCM_AXES[i0].p) });
    // 半数で核の歪み（Void軸）、残りは別軸の現象
    lines.push(rng() < 0.5 ? { who: "danger", t: pick(voidAxis.p) } : { who: "cold", t: pick(UCM_AXES[i1].p) });
    if (rng() < 0.6) lines.push({ who: "body", t: pick(UCM_AXES[i2].p) });
    lines.push({ who: "self", t: pick(BELOW_SELVES) });
    lines.push({ who: "voice", t: pick(BELOW_VOICES) });
    const base = DATA.nodes.below;
    return Object.assign({}, base, { lines, observer: 18 + loop, _color: loop });
  }

  // ---------- 戻り道インジケータ ----------
  function buildReturnPaths() {
    returnPathsEl.innerHTML = "";
    for (let i = 0; i < RETURN_PATHS_START; i++) returnPathsEl.appendChild(document.createElement("i"));
  }
  function renderReturnPaths() {
    returnPathsEl.querySelectorAll("i").forEach((m, i) => m.classList.toggle("spent", i >= state.returnPaths));
  }

  // ---------- 観測者カウンタ（深いほど"私"が増える） ----------
  function renderObserver() {
    if (!observerEl) return;
    const n = Math.max(1, state.observer);
    observerEl.textContent = "私".repeat(Math.min(n, 6)) + (n > 6 ? "…" : "");
    observerEl.dataset.count = String(n);
    observerEl.classList.toggle("deep", n > 6);
  }

  // ---------- 圧/沈下を CSS と body へ ----------
  function applyAtmosphere(node) {
    const sinkNorm = Math.min(1, state.sink / SINK_SCALE);
    state.maxSink = Math.max(state.maxSink, sinkNorm);
    const root = document.documentElement.style;
    root.setProperty("--sink", sinkNorm.toFixed(3));
    root.setProperty("--press", Math.min(1, state.dread).toFixed(3));
    root.setProperty("--reveal-ms", (REDUCED ? 0 : Math.round(34 + state.dread * 64)) + "ms");
    document.body.dataset.phase = phaseFor(sinkNorm);
    if (node && node.tension === "high" && !REDUCED) document.body.dataset.tension = "high";
    else document.body.removeAttribute("data-tension");
    sinkFill.style.height = (sinkNorm * 100).toFixed(1) + "%";
    renderReturnPaths();
    renderObserver();
    Audio.update(sinkNorm, Math.min(1, state.dread));
  }
  function phaseFor(s) { return s < 0.18 ? "surface" : s < 0.45 ? "drift" : s < 0.75 ? "deep" : "bottom"; }

  // ---------- slow-reveal レンダラ ----------
  function renderNode(id) {
    let node = DATA.nodes[id];
    if (!node) return;
    // 深度∞: below は周回ごとに手続き生成（底なしの質感差）。audio も周回で色付け。
    if (id === "below") {
      state.belowLoop += 1;
      node = genBelowNode(state.belowLoop);
      Audio.setColor(state.belowLoop);
    }
    state.id = id;
    state.steps++;
    if (typeof node.observer === "number" && node.observer > 0) state.observer = Math.max(state.observer, node.observer);
    applyAtmosphere(node);
    sceneEl.innerHTML = "";
    choicesEl.innerHTML = "";
    const myToken = ++revealToken;
    const revealMs = REDUCED ? 0 : (34 + state.dread * 64);
    let delay = 0;

    (node.lines || []).forEach((line) => {
      const p = document.createElement("p");
      p.className = "hz-line " + (WHO_CLASS[line.who] || "");
      sceneEl.appendChild(p);
      if (REDUCED) { p.textContent = line.t; p.classList.add("shown"); return; }
      [...line.t].forEach((ch) => {
        const s = document.createElement("span");
        s.className = "ch"; s.textContent = ch; p.appendChild(s);
      });
      window.setTimeout(() => {
        if (myToken !== revealToken) return;
        p.classList.add("shown");
        p.querySelectorAll(".ch").forEach((s, i) => {
          window.setTimeout(() => {
            if (myToken !== revealToken) return;
            s.classList.add("lit");
            sceneEl.scrollTop = sceneEl.scrollHeight;
          }, i * revealMs);
        });
      }, delay);
      delay += [...line.t].length * revealMs + 360 + (line.gap || 0);
    });

    const choiceDelay = REDUCED ? 150 : delay + 220;
    window.setTimeout(() => { if (myToken === revealToken) renderChoices(node); }, choiceDelay);
  }

  function renderChoices(node) {
    choicesEl.innerHTML = "";
    (node.choices || []).forEach((c, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "hz-choice " + (c.kind || "");
      if (c.kind === "retreat" && state.maxSink > 0.4) btn.classList.add("heavy");
      btn.innerHTML = `<span class="lead"></span>${c.sub ? `<span class="sub"></span>` : ""}`;
      btn.querySelector(".lead").textContent = c.t;
      if (c.sub) btn.querySelector(".sub").textContent = c.sub;
      btn.addEventListener("click", () => choose(c), { once: true });
      choicesEl.appendChild(btn);
      const appear = REDUCED ? 0 : 120 + idx * 150 + (c.kind === "retreat" ? state.maxSink * 800 : 0);
      window.setTimeout(() => btn.classList.add("in"), appear);
    });
  }

  function choose(c) {
    state.sink += c.sink || 0;
    state.dread = Math.min(1, state.dread + (c.dread || 0));
    if (c.close && state.returnPaths > 0) state.returnPaths -= 1; // 戻り道は復活しない
    Audio.pulseOnce(c.kind === "descend" ? 1 : 0.5);
    if (c.to === "__edge") return renderEdge();
    renderNode(c.to);
  }

  // ---------- 縁（増分の終わり。沈みきり/辛うじて で分岐） ----------
  function renderEdge() {
    const myToken = ++revealToken;
    state.dread = 1;
    applyAtmosphere({ tension: "high" });
    sceneEl.innerHTML = ""; choicesEl.innerHTML = "";
    const sank = state.returnPaths <= 1;
    const lines = sank ? DATA.edge.sankLines : DATA.edge.heldLines;
    let delay = 0;
    const revealMs = REDUCED ? 0 : 52;
    (lines || []).forEach((line) => {
      const p = document.createElement("p");
      p.className = "hz-line " + (WHO_CLASS[line.who] || "");
      p.textContent = line.t;
      sceneEl.appendChild(p);
      if (REDUCED) { p.classList.add("shown"); return; }
      p.style.opacity = "0";
      window.setTimeout(() => { if (myToken === revealToken) { p.style.transition = "opacity 1.5s ease"; p.classList.add("shown"); p.style.opacity = "1"; } }, delay);
      delay += line.t.length * revealMs + 520 + (line.gap || 0);
    });
    window.setTimeout(() => {
      if (myToken !== revealToken) return;
      const card = document.createElement("p");
      card.className = "hz-line cold";
      card.style.cssText = "margin-top:2em;font-size:0.8rem;line-height:1.9;";
      const lit = Math.round(state.maxSink * 8);
      card.textContent = `― 深度Ω 到達・外殻踏破 ―  到達深度: ${"▮".repeat(lit)}${"▯".repeat(8 - lit)} / 残った戻り道: ${state.returnPaths}/${RETURN_PATHS_START} / 観測者: ${state.observer}`;
      sceneEl.appendChild(card); card.classList.add("shown");
      const more = document.createElement("p");
      more.className = "hz-line"; more.style.cssText = "margin-top:0.6em;font-size:0.78rem;color:#6b7682;";
      more.textContent = "観測OSは終わらない。再起動すれば、また零章から——だが、底は最後まで無い。";
      sceneEl.appendChild(more); more.classList.add("shown");
      $("restart").hidden = false;
    }, delay + 400);
  }

  // ---------- 沈下連動 inline Web Audio（Hazama内製・music-stack非依存） ----------
  // 設計: 深いほど 低く・暗く・密に・広く。
  //  - 倍音(partials)は深度で開花（bloom）＝密度が増す。最深部で不協和な層が薄く立つ＝威圧。
  //  - 共有LFO が detune を揺らす＝うねり/厚み（深いほど深い）。
  //  - 合成IR の convolver で"空間/沈降の残響"。wet は深いほど増える。
  //  - 圧(dread)で鼓動が速く・重く。core は描かない＝音でも"解決音"は鳴らさない。
  //  - below 周回ごとに setColor(seed) で detune/うねりを微妙にずらす＝底なしの質感差。
  const Audio = (() => {
    let ctx = null, master = null, filter = null, dryGain = null, conv = null, wetGain = null;
    let lfo = null, lfoGain = null, drones = [], pulseTimer = null, on = false;
    let cur = { sink: 0, dread: 0 }, colorSeed = 0;
    const supported = () => !!(window.AudioContext || window.webkitAudioContext);

    // 倍音: ratio=基音比, base=常時gain, bloom=深度で開く量, diss=不協和(dread で開く)
    const PARTIALS = [
      { ratio: 0.5,  type: "sine",     base: 0.0,   bloom: 0.045, diss: 0 }, // 下のオクターブ（沈むと地鳴り）
      { ratio: 1,    type: "sine",     base: 0.075, bloom: 0.0,   diss: 0 }, // 基音
      { ratio: 1.5,  type: "triangle", base: 0.034, bloom: 0.0,   diss: 0 }, // 五度
      { ratio: 2.01, type: "sine",     base: 0.0,   bloom: 0.05,  diss: 0 }, // オクターブ（中盤で開花）
      { ratio: 2.99, type: "sine",     base: 0.0,   bloom: 0.04,  diss: 0 }, // 十二度（深部で開花）
      { ratio: 1.06, type: "sine",     base: 0.0,   bloom: 0.0,   diss: 0.03 } // ほぼ半音上＝うなり（dread で立つ）
    ];

    function makeImpulse(seconds, decay) {
      const len = Math.max(1, Math.floor(ctx.sampleRate * seconds));
      const buf = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let c = 0; c < 2; c++) {
        const ch = buf.getChannelData(c);
        for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
      return buf;
    }

    function start() {
      if (on || !supported()) return;
      const C = window.AudioContext || window.webkitAudioContext;
      ctx = new C();
      master = ctx.createGain(); master.gain.value = 0.0001;
      master.gain.setTargetAtTime(0.16, ctx.currentTime + 0.05, 0.8);
      master.connect(ctx.destination);
      filter = ctx.createBiquadFilter(); filter.type = "lowpass"; filter.frequency.value = 1000; filter.Q.value = 0.8;
      dryGain = ctx.createGain(); dryGain.gain.value = 0.85;
      filter.connect(dryGain); dryGain.connect(master);
      // 合成IR の残響（"空間"）。wet は深いほど増える。
      conv = ctx.createConvolver(); conv.buffer = makeImpulse(2.8, 2.6);
      wetGain = ctx.createGain(); wetGain.gain.value = 0.0001;
      filter.connect(conv); conv.connect(wetGain); wetGain.connect(master);
      // 共有 LFO：全 partial の detune を揺らす（うねり）。
      lfo = ctx.createOscillator(); lfo.type = "sine"; lfo.frequency.value = 0.06;
      lfoGain = ctx.createGain(); lfoGain.gain.value = 4; lfo.connect(lfoGain); lfo.start();
      PARTIALS.forEach((spec) => {
        const osc = ctx.createOscillator(), g = ctx.createGain();
        osc.type = spec.type; osc.frequency.value = 70 * spec.ratio;
        g.gain.value = spec.base; osc.connect(g); g.connect(filter);
        lfoGain.connect(osc.detune); osc.start();
        drones.push({ osc, g, spec });
      });
      on = true; schedulePulse(); apply(true);
      const btn = $("audio-toggle"); btn.hidden = false; btn.setAttribute("aria-pressed", "true"); btn.textContent = "♪ 鳴っている";
    }
    function toggle() {
      const btn = $("audio-toggle");
      if (!on) return start();
      if (ctx.state === "running") { ctx.suspend(); btn.setAttribute("aria-pressed", "false"); btn.textContent = "♪ 鳴らす"; }
      else { ctx.resume(); btn.setAttribute("aria-pressed", "true"); btn.textContent = "♪ 鳴っている"; }
    }
    function apply(now) {
      if (!on || !ctx) return;
      const t = ctx.currentTime;
      const s = cur.sink, d = cur.dread;
      const base = 70 - s * 42;                          // 沈むほど低く（70→28Hz）
      const cutoff = 1150 - s * 830 - d * 200;           // 沈むほど暗く
      const seedCents = (((colorSeed * 37) % 25) - 12) * 0.6; // 周回ごとの微デチューン
      const slow = now ? 0.25 : 1.3;
      drones.forEach((dr) => {
        const sp = dr.spec;
        let g = sp.base + sp.bloom * Math.max(0, s - 0.12) / 0.88 + sp.diss * d;
        dr.g.gain.setTargetAtTime(Math.max(0, g), t, now ? 0.3 : 1.6);
        dr.osc.frequency.setTargetAtTime(base * sp.ratio, t, slow);
        dr.osc.detune.setTargetAtTime(seedCents, t, 1.8);
      });
      filter.frequency.setTargetAtTime(Math.max(110, cutoff), t, slow);
      master.gain.setTargetAtTime(0.13 + d * 0.05, t, 0.8);
      wetGain.gain.setTargetAtTime(0.1 + s * 0.32, t, 1.8);            // 深いほど広い残響
      lfo.frequency.setTargetAtTime(0.05 + s * 0.1, t, 1.8);
      lfoGain.gain.setTargetAtTime(3 + s * 10 + (colorSeed % 5), t, 1.8); // うねり幅（cents）
    }
    function schedulePulse() {
      if (pulseTimer) clearInterval(pulseTimer);
      pulseTimer = setInterval(() => beat(0.5), Math.max(440, Math.round(1150 - cur.dread * 680))); // 圧で鼓動が速い
    }
    function beat(amp) {
      if (!on || !ctx || ctx.state !== "running") return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator(), g = ctx.createGain();
      osc.type = "sine"; osc.frequency.value = 44 - cur.sink * 16;
      osc.frequency.setTargetAtTime((44 - cur.sink * 16) * 0.7, t, 0.18); // 鼓動の沈み込み
      g.gain.value = 0.0001;
      g.gain.exponentialRampToValueAtTime(0.05 * amp + cur.dread * 0.045, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
      osc.connect(g); g.connect(filter); osc.start(t); osc.stop(t + 0.6); // 鼓動も残響を通す
    }
    return {
      start, toggle, pulseOnce: (a) => beat(a),
      setColor: (seed) => { colorSeed = seed; apply(false); },
      update: (sink, dread) => { const prev = cur.dread; cur = { sink, dread }; apply(false); if (Math.abs(prev - dread) > 0.08) schedulePulse(); }
    };
  })();

  // ---------- 起動 ----------
  async function loadData() {
    const res = await fetch("depths-shell.json?v=m2-06", { cache: "no-store" });
    DATA = await res.json();
  }
  function enter() {
    gateEl.classList.add("gone");
    buildReturnPaths();
    Audio.start();
    renderNode(DATA.start || "zero");
  }
  function restart() {
    revealToken++;
    state.id = null; state.sink = 0; state.dread = 0; state.returnPaths = RETURN_PATHS_START; state.maxSink = 0; state.observer = 1; state.steps = 0; state.belowLoop = 0;
    $("restart").hidden = true;
    buildReturnPaths();
    renderNode(DATA.start || "zero");
  }

  $("audio-toggle").addEventListener("click", () => Audio.toggle());
  $("restart").addEventListener("click", restart);

  loadData().then(() => {
    const gb = $("gate-enter");
    gb.disabled = false;
    gb.addEventListener("click", enter, { once: false });
  }).catch((e) => {
    $("scene").textContent = "深度データの読み込みに失敗しました。再読み込みしてください。";
    console.warn("[Hazama slice] load failed:", e);
  });
})();
