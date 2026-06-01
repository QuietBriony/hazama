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

  const state = { id: null, sink: 0, dread: 0, returnPaths: RETURN_PATHS_START, maxSink: 0, observer: 1, steps: 0 };
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
    const node = DATA.nodes[id];
    if (!node) return;
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
      card.textContent = `― 冒頭アーク 終了 ―  到達深度: ${"▮".repeat(lit)}${"▯".repeat(8 - lit)} / 残った戻り道: ${state.returnPaths}/${RETURN_PATHS_START} / 観測者: ${state.observer}`;
      sceneEl.appendChild(card); card.classList.add("shown");
      const more = document.createElement("p");
      more.className = "hz-line"; more.style.cssText = "margin-top:0.6em;font-size:0.78rem;color:#6b7682;";
      more.textContent = "続きは次の増分で。底は、まだずっと下にある。";
      sceneEl.appendChild(more); more.classList.add("shown");
      $("restart").hidden = false;
    }, delay + 400);
  }

  // ---------- 沈下連動 inline Web Audio（Hazama内製・music-stack非依存） ----------
  const Audio = (() => {
    let ctx = null, master = null, filter = null, drones = [], pulseTimer = null, on = false;
    let cur = { sink: 0, dread: 0 };
    const supported = () => !!(window.AudioContext || window.webkitAudioContext);

    function start() {
      if (on || !supported()) return;
      const C = window.AudioContext || window.webkitAudioContext;
      ctx = new C();
      master = ctx.createGain(); master.gain.value = 0.0001;
      master.gain.setTargetAtTime(0.16, ctx.currentTime + 0.05, 0.6);
      filter = ctx.createBiquadFilter(); filter.type = "lowpass"; filter.frequency.value = 900; filter.Q.value = 0.7;
      filter.connect(master); master.connect(ctx.destination);
      [1, 1.5].forEach((ratio, i) => {
        const osc = ctx.createOscillator(), g = ctx.createGain();
        osc.type = i === 0 ? "sine" : "triangle"; osc.frequency.value = 70 * ratio;
        g.gain.value = i === 0 ? 0.06 : 0.03; osc.connect(g); g.connect(filter); osc.start();
        drones.push({ osc, g, ratio });
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
      const base = 70 - cur.sink * 38;                       // 沈むほど低く
      const cutoff = 1100 - cur.sink * 780 - cur.dread * 180; // 沈むほど暗く
      drones.forEach((d) => d.osc.frequency.setTargetAtTime(base * d.ratio, t, 0.8));
      filter.frequency.setTargetAtTime(Math.max(130, cutoff), t, now ? 0.2 : 1.2);
      master.gain.setTargetAtTime(0.14 + cur.dread * 0.06, t, 0.8);
    }
    function schedulePulse() {
      if (pulseTimer) clearInterval(pulseTimer);
      pulseTimer = setInterval(() => beat(0.5), Math.max(420, Math.round(1100 - cur.dread * 660))); // 圧で鼓動が速い
    }
    function beat(amp) {
      if (!on || !ctx || ctx.state !== "running") return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator(), g = ctx.createGain();
      osc.type = "sine"; osc.frequency.value = 44 - cur.sink * 14;
      g.gain.value = 0.0001;
      g.gain.exponentialRampToValueAtTime(0.05 * amp + cur.dread * 0.04, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      osc.connect(g); g.connect(master); osc.start(t); osc.stop(t + 0.55);
    }
    return {
      start, toggle, pulseOnce: (a) => beat(a),
      update: (sink, dread) => { const prev = cur.dread; cur = { sink, dread }; apply(false); if (Math.abs(prev - dread) > 0.08) schedulePulse(); }
    };
  })();

  // ---------- 起動 ----------
  async function loadData() {
    const res = await fetch("depths-shell.json?v=m2-03", { cache: "no-store" });
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
    state.id = null; state.sink = 0; state.dread = 0; state.returnPaths = RETURN_PATHS_START; state.maxSink = 0; state.observer = 1; state.steps = 0;
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
