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
  // 抗う/戻るの作法（尺度＝観測者数＝物語深度）:
  //   observer < RESIST_STRAIN : 浅い。少し戻れる。
  //   RESIST_STRAIN..<DEEP_LOCK: 中盤。抗えるが世界が引き込む。
  //   observer >= DEEP_LOCK     : 深部。本当に戻れない（戻り道が残っていても失敗）。
  const RESIST_STRAIN = 3; // 観測者3（深度E〜）から「抗えるが引き込まれる」
  const DEEP_LOCK = 9;     // 観測者9（深度Q・外側の外側〜）から「戻れない」

  const state = { id: null, sink: 0, dread: 0, returnPaths: RETURN_PATHS_START, maxSink: 0, observer: 1, steps: 0, belowLoop: 0, resisted: 0, refused: 0, resistBeat: null, rank: 0 };
  let DATA = null;
  let revealToken = 0;
  const clamp01 = (x) => Math.max(0, Math.min(1, x));

  // 降下インデックス＝音楽ブリッジの第一義 depth（depth.html は source.rank/28 で深さを取る）。
  // production の深度梯子(A_start..Z,Ω,A_reborn,HUB_NIGHT=0..28)に対応。retreat/drift は
  // ランクを持たず＝直前の深さを保つ（沈下は残す）。below(∞)は最深=28。
  const RANK = {
    zero: 0, zero_hold: 0, A: 1, B: 2, C: 3, D: 4, E: 5, E_noreturn: 5, F: 6,
    G: 7, G_hold: 7, H: 8, I: 9, J: 10, K: 11, L: 12,
    M: 13, N: 14, O: 15, O_hold: 15, P: 16, Q: 17,
    R: 18, S: 19, S_hold: 19, T: 20, U: 21,
    V: 22, W: 23, X: 24, X_hold: 24, Y: 25, Z: 26,
    Omega: 27, below: 28, reborn: 27
  };

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
    Mandala.update(sinkNorm, state.observer, Math.min(1, state.dread));
    Music.push(buildProfile(node));
  }

  // ---------- slice state → depth.html wire format（hazama-profile v1） ----------
  // depth.html(engine bridge) の ingest 契約に正確に合わせる:
  //   source.rank(0..28)=深さの第一義 / pressure(0..1) / stability・resonance は 0..100 /
  //   audio.{brightness,bassWeight,density,space} は 0..1 / ucm.energy は 0..100。
  //   profile.depth は送らない＝rank を深さの正にする（北極星：沈むほど鳴りが深く・暗く・密に）。
  function buildProfile(node) {
    const depthN = clamp01(state.rank / 28);
    const dr = Math.min(1, state.dread);
    const obsN = clamp01((state.observer - 1) / 18);
    const stability = Math.round(clamp01(0.96 - depthN * 0.5 - dr * 0.4) * 100); // 沈むほど不安定
    const resonance = Math.round(clamp01(0.10 + obsN * 0.70 + dr * 0.25) * 100); // 観測者が増えるほど共鳴
    const stage = (node && node.title) ? String(node.title).slice(0, 40) : (state.id || "");
    return {
      provider: "music", type: "hazama-profile", version: 1,
      profile: {
        ucm: { energy: Math.round(clamp01(0.2 + dr * 0.8) * 100) },
        audio: {
          brightness: +clamp01(0.60 - depthN * 0.50 - dr * 0.12).toFixed(3), // 沈むほど暗い
          bassWeight: +clamp01(0.18 + depthN * 0.78).toFixed(3),             // 沈むほど低域
          density:    +clamp01(0.14 + obsN * 0.60 + depthN * 0.22).toFixed(3), // 多声で密
          space:      +clamp01(0.10 + depthN * 0.72).toFixed(3)              // 沈むほど広い残響
        },
        pressure: +clamp01(0.45 * depthN + 0.60 * dr).toFixed(3),            // 圧＝dread 主体
        source: {
          depthId: state.id || "zero",
          stage,
          stability, resonance,
          marks: state.resisted + state.refused,
          rank: state.rank
        }
      }
    };
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
    if (typeof RANK[id] === "number") state.rank = RANK[id]; // drift/未登録は直前の深さを保つ
    if (typeof node.observer === "number" && node.observer > 0) state.observer = Math.max(state.observer, node.observer);
    applyAtmosphere(node);
    sceneEl.innerHTML = "";
    choicesEl.innerHTML = "";
    const myToken = ++revealToken;
    const revealMs = REDUCED ? 0 : (34 + state.dread * 64);
    let delay = 0;

    // 抗い/戻りの結果ビート（あれば本文の先頭に差す。一度きり）。
    const lines = state.resistBeat ? [state.resistBeat].concat(node.lines || []) : (node.lines || []);
    state.resistBeat = null;

    lines.forEach((line) => {
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
        sceneEl.scrollTop = sceneEl.scrollHeight; // 行が現れるたび最新行を底へ追従
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
    // ボタンを積んで scene が縮んだ“後”に最新行を底へ。重なりはレイアウトで防止済み、
    // ここは「最後の行を選択肢の真上に見せる」ためのスクロール追従。
    sceneEl.scrollTop = sceneEl.scrollHeight;
  }

  function sinkNorm() { return Math.min(1, state.sink / SINK_SCALE); }

  function choose(c) {
    if (c.kind === "retreat" && !c.terminal) return resolveResist(c);
    state.sink += c.sink || 0;
    state.dread = Math.min(1, state.dread + (c.dread || 0));
    if (c.close && state.returnPaths > 0) state.returnPaths -= 1; // 戻り道は復活しない
    Audio.pulseOnce(c.kind === "descend" ? 1 : 0.5);
    if (c.to === "__edge") return renderEdge();
    renderNode(c.to);
  }

  // 抗う/戻るの判定。尺度は観測者数＝物語深度（単調増加で、早々に飽和する沈下より安定）。
  //  浅い (observer<RESIST_STRAIN) : 少し戻れる。back へ上がり、戻り道 −1。沈下は残る。
  //  中盤 (..<DEEP_LOCK)           : 抗えるが世界が引き込む。_hold(c.to) へ・沈下が一段進む。戻り道 −1。
  //  深部 (>=DEEP_LOCK)            : 戻れない。戻り道が残っていても効かない。failTo/c.to へ落ち、dread が跳ねる。
  function resolveResist(c) {
    const depth = state.observer;
    const hasPath = state.returnPaths > 0;
    let target, beat = null, addSink = c.sink || 0, addDread = c.dread || 0;

    if (depth >= DEEP_LOCK || !hasPath) {
      // 失敗：世界が引き込む。戻り道は消費しない（残っていても、もう効かない＝無効化された救い）。
      state.refused += 1;
      target = c.failTo || c.to;
      beat = { who: "danger", t: hasPath
        ? "——戻ろうとする。が、上が、もう無い。世界が、一段こちらを引き込んだ。"
        : "——抗う手が、空を掻く。戻り道は、とうに尽きていた。" };
      addSink += 2; addDread += 0.06;
      Audio.pulseOnce(1);
    } else if (depth >= RESIST_STRAIN) {
      // 抗えるが引き込まれる（_hold ノードが地の文で語るので、ここでは追いビートを足さない）
      state.returnPaths -= 1; state.resisted += 1;
      target = c.to;
      addSink += 1; addDread -= 0.03;
      Audio.pulseOnce(0.55);
    } else {
      // 浅い：少し戻れる
      state.returnPaths -= 1; state.resisted += 1;
      target = c.back || c.to;
      beat = { who: "cold", t: "——息を整え、来た方へ。まだ、戻れる。だが沈んだ分は、もう戻らない。" };
      addDread -= 0.06;
      Audio.pulseOnce(0.4);
    }
    state.sink += addSink;
    state.dread = Math.min(1, Math.max(0, state.dread + addDread));
    state.resistBeat = beat;
    if (target === "__edge") return renderEdge();
    renderNode(target);
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
      card.textContent = `― 深度Ω 到達・外殻踏破 ―  到達深度: ${"▮".repeat(lit)}${"▯".repeat(8 - lit)} / 残った戻り道: ${state.returnPaths}/${RETURN_PATHS_START} / 観測者: ${state.observer} / 抗った: ${state.resisted} ・ 戻れなかった: ${state.refused}`;
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
      if (ctx.state !== "running") ctx.resume(); // 内製モードへ切替時の再開
    }
    function silence() { if (on && ctx && ctx.state === "running") { try { ctx.suspend(); } catch (e) {} } }
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
      start, toggle, silence, pulseOnce: (a) => beat(a),
      get on() { return on; },
      setColor: (seed) => { colorSeed = seed; apply(false); },
      update: (sink, dread) => { const prev = cur.dread; cur = { sink, dread }; apply(false); if (Math.abs(prev - dread) > 0.08) schedulePulse(); }
    };
  })();

  // ---------- 手続き的曼荼羅（Ω/到達点の reactive ビジュアル） ----------
  // 硬い・乾いた・サイバーパンクの沈下美学。手描き画像でなく canvas で生成し、深度に呼応させる:
  //  - 8回対称（八観）。観測者数で層(rings)とスポーク(spokes)が増殖する。
  //  - 沈むほど暗く・彩度↓・最外リングが迫り上がる（CSSで下から接近、ここで輝度を上げる）。
  //  - 高dread で最外に warn 色の不協和リングが立つ。
  //  - 中心＝核は描かない(§4-1)。沈むほど中心の空白(void)が退いて広がり、深部のみ縁が白く灼ける。
  //  - reduced-motion は1枚静止描画。タブ非表示で rAF 停止（モバイル負荷）。
  const Mandala = (() => {
    const cv = $("mandala");
    if (!cv || !cv.getContext) return { start() {}, update() {} };
    const g = cv.getContext("2d");
    let raf = 0, last = 0, lastT = 0, size = 0, dpr = 1, started = false;
    let cur = { sink: 0, observer: 1, dread: 0 };

    function resize() {
      const r = cv.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      size = Math.max(120, Math.floor(Math.min(r.width || 300, r.height || 300)));
      cv.width = Math.floor(size * dpr); cv.height = Math.floor(size * dpr);
      draw(0);
    }
    function draw(time) {
      if (!cv.width) return;
      const s = cur.sink, obs = cur.observer, d = cur.dread;
      const W = cv.width, H = cv.height, cx = W / 2, cy = H / 2, R = W * 0.46;
      g.clearRect(0, 0, W, H);
      g.globalCompositeOperation = "lighter";
      const rot = REDUCED ? 0.3 : time * 0.00002;
      const spokes = 8 * (1 + Math.floor(obs / 7));        // 八観の倍数で増殖
      const rings = Math.min(16, 3 + Math.floor(obs / 1.5));
      const voidR = R * (0.10 + s * 0.32);                 // 核は描かない＝沈むほど退いて広がる空白
      const baseA = 0.045 + s * 0.05;
      for (let i = 0; i < rings; i++) {
        const f = (rings > 1) ? i / (rings - 1) : 0;       // 0=内 → 1=外
        const rr = voidR + (R - voidR) * f;
        if (rr <= voidR) continue;
        const dir = (i % 2) ? -1 : 1;                      // 交互逆回転＝モアレ
        const a = rot * (1 + i * 0.18) * dir + i * 0.2;
        const warn = (d > 0.6 && i >= rings - 1);
        const alpha = Math.min(0.5, baseA * (0.5 + f) * (0.7 + s * 0.7));
        g.beginPath();
        for (let k = 0; k <= spokes; k++) {
          const ang = a + (k / spokes) * Math.PI * 2;
          const wob = 1 + Math.sin(ang * 3 + i) * 0.014 * (1 + d);
          const x = cx + Math.cos(ang) * rr * wob, y = cy + Math.sin(ang) * rr * wob;
          k ? g.lineTo(x, y) : g.moveTo(x, y);
        }
        g.closePath();
        g.lineWidth = Math.max(1, dpr * (warn ? 1.3 : 0.7));
        g.strokeStyle = warn
          ? "rgba(196,107,90," + (alpha * 1.5).toFixed(3) + ")"
          : "rgba(" + Math.round(127 - s * 34) + "," + Math.round(182 - s * 44) + "," + Math.round(196 - s * 30) + "," + alpha.toFixed(3) + ")";
        g.stroke();
      }
      // 放射スポーク（八観の軸）。void へは踏み込ませない。
      g.lineWidth = Math.max(1, dpr * 0.55);
      g.strokeStyle = "rgba(127,182,196," + (0.03 + s * 0.05).toFixed(3) + ")";
      for (let k = 0; k < spokes; k++) {
        const ang = rot * 0.6 + (k / spokes) * Math.PI * 2;
        const inner = voidR * 1.05, outer = R * (0.6 + s * 0.36);
        g.beginPath();
        g.moveTo(cx + Math.cos(ang) * inner, cy + Math.sin(ang) * inner);
        g.lineTo(cx + Math.cos(ang) * outer, cy + Math.sin(ang) * outer);
        g.stroke();
      }
      // 中心の空（核）: “描かない”を黒で描く。沈むほど深い穴。
      g.globalCompositeOperation = "source-over";
      const vg = g.createRadialGradient(cx, cy, 0, cx, cy, voidR);
      vg.addColorStop(0, "rgba(0,0,0,1)");
      vg.addColorStop(0.72, "rgba(1,3,8,0.96)");
      vg.addColorStop(1, "rgba(2,4,10,0)");
      g.fillStyle = vg; g.beginPath(); g.arc(cx, cy, voidR, 0, Math.PI * 2); g.fill();
      if (s > 0.7) { // 覗くと白く灼ける（深部のみ・細い縁／点滅は reduced で固定）
        const flick = REDUCED ? 0.45 : (0.5 + 0.5 * Math.sin(time * 0.004));
        g.globalCompositeOperation = "lighter";
        g.lineWidth = Math.max(1, dpr * 0.8);
        g.strokeStyle = "rgba(222,233,238," + (0.06 * ((s - 0.7) / 0.3) * flick).toFixed(3) + ")";
        g.beginPath(); g.arc(cx, cy, voidR * 0.99, 0, Math.PI * 2); g.stroke();
      }
    }
    function loop(time) {
      if (time - last >= 33) { last = time; lastT = time; draw(time); } // ~30fps
      raf = requestAnimationFrame(loop);
    }
    function start() {
      if (started) return; started = true;
      resize();
      window.addEventListener("resize", resize);
      if (REDUCED) return;
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
        else if (!raf) { last = 0; raf = requestAnimationFrame(loop); }
      });
      raf = requestAnimationFrame(loop);
    }
    return {
      start,
      // 深度が変わった瞬間に1枚即描画（reactivity の即応＋rAF が間引かれる環境でも反映）。
      // rAF ループは回転を継続させる。
      update: (sink, observer, dread) => { cur = { sink, observer, dread }; draw(lastT); }
    };
  })();

  // ---------- 音楽ブリッジ（depth.html をリアクティブ音楽レイヤーとして連動） ----------
  // 推奨方式: depth.html を 1px の不可視 iframe として埋め込み、降下の状態変化ごとに
  // hazama-profile を postMessage で流す。音は slice の "沈む" タップ操作（実ユーザー手勢）で
  // depth.html 内 START を click して解禁する（本番プレビューは同一オリジン＝quietbriony.github.io）。
  // モード: depth(連動・既定) / inner(内製音) / off(消音)。二重鳴りを避けるため inner 以外は内製を止める。
  const Music = (() => {
    const MODES = ["depth", "inner", "off"];
    let mode = "depth";
    let iframe = null, pending = null;
    const chip = $("audio-toggle");

    function ensureIframe() {
      if (iframe) return;
      iframe = document.createElement("iframe");
      iframe.id = "depth-frame";
      iframe.title = "depth music layer";
      iframe.setAttribute("aria-hidden", "true");
      iframe.tabIndex = -1;
      // 不可視だが描画は生かす（display:none は一部環境で audio を止めるため 1px オフスクリーン）。
      iframe.style.cssText = "position:fixed;left:-2px;bottom:-2px;width:1px;height:1px;opacity:0;border:0;pointer-events:none;";
      iframe.src = "depth.html?v=m2-08"; // 相対＝本番プレビューでは同一オリジン
      iframe.addEventListener("load", () => { tryUnlock(); if (pending) post(pending); });
      document.body.appendChild(iframe);
    }
    // 同一オリジン時のみ可能：START を実ユーザー手勢の中で click して AudioContext を解禁。
    // クロスオリジン（ローカル開発で github.io を指す等）は例外で握りつぶす。
    function tryUnlock() {
      if (mode !== "depth") return;
      try {
        const w = iframe && iframe.contentWindow; if (!w) return;
        const st = w.DepthEngine && w.DepthEngine.getState && w.DepthEngine.getState();
        if (st && st.running) return;
        const start = w.document && w.document.getElementById("start");
        if (start && !start.disabled) start.click();
      } catch (e) { /* cross-origin: 手勢伝播に任せる */ }
    }
    function stopDepth() {
      try {
        const w = iframe && iframe.contentWindow; if (!w) return;
        const stop = w.document && w.document.getElementById("stop");
        if (stop && !stop.disabled) stop.click();
      } catch (e) {}
    }
    function post(profile) {
      if (!iframe || !iframe.contentWindow) return;
      try { iframe.contentWindow.postMessage(profile, "*"); } catch (e) {} // depth 側で origin 検証
    }
    function push(profile) {
      pending = profile;
      // ロード前の post は about:blank に落ちて無害（load 時に pending を再送）。
      // 降下中は状態変化ごとに送るので、ready ゲートは不要＝取りこぼしを無くす。
      if (mode === "depth") post(profile);
    }
    function label() {
      if (!chip) return;
      chip.textContent = mode === "depth" ? "♪ depth 連動" : mode === "inner" ? "♪ 内製音" : "♪ 消音";
      chip.setAttribute("aria-pressed", mode === "off" ? "false" : "true");
    }
    function applyMode() {
      if (mode === "depth") { ensureIframe(); tryUnlock(); if (pending) post(pending); Audio.silence(); }
      else if (mode === "inner") { stopDepth(); Audio.start(); }
      else { stopDepth(); Audio.silence(); }
      label();
    }
    function startPrimary() {
      if (chip) chip.hidden = false;
      applyMode(); // 既定 depth：iframe 解禁＋内製ミュート
    }
    function cycle() { mode = MODES[(MODES.indexOf(mode) + 1) % MODES.length]; applyMode(); }
    // iframe は boot で先に生成しておく（沈む click 時点でロード済み＝手勢内で START を click できる）。
    function preload() { ensureIframe(); }
    return { push, startPrimary, cycle, preload };
  })();

  // ---------- 起動 ----------
  async function loadData() {
    const res = await fetch("depths-shell.json?v=m2-08", { cache: "no-store" });
    DATA = await res.json();
  }
  function enter() {
    gateEl.classList.add("gone");
    buildReturnPaths();
    Music.startPrimary(); // depth.html を実ユーザー手勢の中で解禁（既定）／内製はミュート
    Mandala.start();
    renderNode(DATA.start || "zero");
  }
  function restart() {
    revealToken++;
    state.id = null; state.sink = 0; state.dread = 0; state.returnPaths = RETURN_PATHS_START; state.maxSink = 0; state.observer = 1; state.steps = 0; state.belowLoop = 0; state.resisted = 0; state.refused = 0; state.resistBeat = null; state.rank = 0;
    $("restart").hidden = true;
    buildReturnPaths();
    renderNode(DATA.start || "zero");
  }

  $("audio-toggle").addEventListener("click", () => Music.cycle());
  $("restart").addEventListener("click", restart);

  // 開発用フック（プレビュー検証専用・本体統合時は外す）: 任意ノードへ跳ぶ／状態を読む。
  window.__hz = { go: renderNode, choose, state, get sink() { return sinkNorm(); } };

  loadData().then(() => {
    const gb = $("gate-enter");
    gb.disabled = false;
    gb.addEventListener("click", enter, { once: false });
    Music.preload(); // depth.html を先にロード（沈む click 時点でロード済み＝手勢内で解禁できる）
  }).catch((e) => {
    $("scene").textContent = "深度データの読み込みに失敗しました。再読み込みしてください。";
    console.warn("[Hazama slice] load failed:", e);
  });
})();
