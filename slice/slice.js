/* Hazama M1 vertical slice — 沈下スライス
 *
 * 北極星: 進行する対話が、進むほどプレイヤーを狭間へ沈め、戻りにくくする。
 * 形式が内容を映す = 「分岐を選ぶゲーム」ではなく「沈んでいく対話」。
 *
 * このファイルは self-contained な preview。production runtime (hazama-main.js) には触れない。
 * 承認後、Codex がこの renderer/content を本体へ統合する想定。
 *
 * 三層で「どれだけ沈むか／戻りにくくなるか」を見せる:
 *   1) 本文     — 声が近づく / 戻り道が細る、を地の文で
 *   2) 選択肢   — 進む手=沈む(descend) / 退避手=深いほど重く遅い(retreat)
 *   3) シグナル — 沈下ゲージ・戻り道インジケータ・slow reveal 速度・圧(ヴィネット/震え/音)
 */

(() => {
  "use strict";

  const REDUCED = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const RETURN_PATHS_START = 4;

  // ---------- シーン定義（冒頭の降下ルート / 確定レジスター） ----------
  // line: { t: 本文, c: クラス(voice/body/cold/danger), gap: 表示後の追加ため(ms) }
  // choice: { t, sub, to, sink, dread, close(戻り道を1本潰す), kind('descend'|'retreat') }
  const SCENES = {
    surface: {
      phase: "surface",
      lines: [
        { t: "境界。まだ何も始まっていない、ということになっている。", c: "cold" },
        { t: "足元の白は光ではない。名前のついていない道だ。下りられる。", },
        { t: "水平線が縦に裂け、夜明けの裏から別の夜明けが覗く。冷たい。", },
        { t: "『来たな』と、声。平坦で、誰のものでもない。仕様の読み上げに似ている。", c: "voice", gap: 500 },
        { t: "『一度こちらに口をきいたら、表層には戻りにくくなる。知っているはずだ』", c: "voice" },
      ],
      choices: [
        { t: "声に応える——『誰だ』", sub: "会話を始める＝下りはじめる", to: "drift", sink: 1, dread: 0.12, kind: "descend" },
        { t: "応えず、視線を伏せて立っている", sub: "まだ表層にとどまる（戻り道は減らない）", to: "surface_hold", sink: 0, dread: 0.04, kind: "retreat" },
      ],
    },

    surface_hold: {
      phase: "surface",
      lines: [
        { t: "黙る。だが沈黙は休息ではない。耳の奥で、何かが自重で軋んでいる。", c: "cold" },
        { t: "声は急かさない。急かす必要がないからだ。表層は、ただ薄くなっていく。", c: "voice" },
        { t: "立っているだけで、足元の白がゆっくり体温を奪う。ここも、もう外ではない。", },
      ],
      choices: [
        { t: "結局、声に応える——『誰だ』", sub: "下りはじめる", to: "drift", sink: 1, dread: 0.14, kind: "descend" },
      ],
    },

    drift: {
      phase: "drift",
      lines: [
        { t: "答えはない。代わりに、世界の表皮が剥がれはじめる。", },
        { t: "視界の縁でピクセルが浮き、その下から鉄錆色の配線が露出する。世界は塗装だった。", c: "cold" },
        { t: "こちらが一言進めるたび、声は一言ぶん近づく。もう肩のあたりにいる。", c: "voice", gap: 400 },
        { t: "『読むな』と声。『読めば網膜が焼ける。前にもそうした』", c: "voice" },
        { t: "前に、というのが誰のことか分からない。だが眼窩の奥はもう熱い。体の方が先に覚えている。", c: "body" },
      ],
      choices: [
        { t: "問い返す——『前に、とは誰だ』", sub: "会話を続ける＝さらに沈む", to: "branch", sink: 2, dread: 0.2, kind: "descend" },
        { t: "口をつぐみ、来た方へ引き返す", sub: "まだ戻れる（戻り道 −1）", to: "retreat_drift", sink: 0, dread: 0.1, close: true, kind: "retreat" },
      ],
    },

    retreat_drift: {
      phase: "surface",
      lines: [
        { t: "引き返す。歩いた距離だけ戻ったはずだ。", c: "cold" },
        { t: "だが景色は同じ継ぎ目を繰り返す。戻り道は、来たときより一本ぶん細い。", },
        { t: "声は追ってこない。追う必要がない。『いつでもいい』とだけ、遠くで言う。", c: "voice" },
      ],
      choices: [
        { t: "息を整え、もう一度下りる", sub: "会話に戻る＝沈む", to: "branch", sink: 2, dread: 0.18, kind: "descend" },
      ],
    },

    // 分岐点：読むか、伏せるか。読む＝身体的リスク・不可逆。
    branch: {
      phase: "drift",
      tension: "high",
      lines: [
        { t: "境界に立つ。ここは現実が構造物だと知る場所であり——", },
        { t: "構造物が、こちらを構造として走査し返してくる場所だ。", c: "danger" },
        { t: "壁の継ぎ目を、設計線が脈打って走る。規則正しく、こちらの心拍とわずかにずれて。", c: "cold" },
        { t: "設計線は壁だけではない。手の甲の皮膚の下、腱に沿って、同じ規則で光っている。", c: "body" },
        { t: "継ぎ目は、とっくに自分まで来ていた。", c: "body", gap: 500 },
      ],
      choices: [
        { t: "設計線を、指でなぞって読む", sub: "網膜に負荷・後戻りできない（戻り道 −1）", to: "read", sink: 3, dread: 0.34, close: true, kind: "descend" },
        { t: "視線を伏せ、線に触れずに下りる", sub: "それでも沈む", to: "deep", sink: 1, dread: 0.18, kind: "descend" },
      ],
    },

    read: {
      phase: "deep",
      tension: "high",
      lines: [
        { t: "読む。線が、読み返してくる。", c: "danger" },
        { t: "網膜の裏で白が弾け、眼窩の奥が一拍、確かに焼ける。涙ではない液体が出る。", c: "body" },
        { t: "一瞬、自分の設計図が見える。終端の日付。改訂履歴。最後の編集者の名前は、伏せられている。", c: "cold" },
        { t: "『言っただろう』声は、もう耳の内側にいる。『これは消せない。読んだことは、読まれたことだ』", c: "voice" },
      ],
      choices: [
        { t: "焼けた目のまま、さらに下りる", sub: "引き返す手は、もう無い", to: "deep", sink: 2, dread: 0.3, kind: "descend" },
      ],
    },

    deep: {
      phase: "deep",
      lines: [
        { t: "下る。階はもうない。あるのは、降りているという感覚だけだ。", c: "cold" },
        { t: "足裏に、踏むたび設定値が書き換わる感触。一歩ごとに、戻れる場所が一つずつ削られる。", },
        { t: "試しに、引き返してみる。", },
        { t: "戻ったつもりが、同じ深さに出る。狭間は、もう上下を持っていない。", c: "danger", gap: 400 },
      ],
      choices: [
        { t: "迫り上がる光の方へ、身体を向ける", sub: "底が近い", to: "bottom", sink: 2, dread: 0.26, kind: "descend" },
        { t: "上へ——と念じる", sub: "戻り道（だが…）", to: "deep_noreturn", sink: 1, dread: 0.22, close: true, kind: "retreat" },
      ],
    },

    deep_noreturn: {
      phase: "deep",
      tension: "high",
      lines: [
        { t: "上、と念じる。身体は素直に動く。確かに上がっている。", c: "cold" },
        { t: "数分か、数日か。やがて気づく。上がりながら、沈んでいる。", c: "danger" },
        { t: "ここでは、どの方向に進んでも深くなる。それが狭間の地形だ。", },
      ],
      choices: [
        { t: "抗うのをやめ、光の方へ向く", sub: "底が近い", to: "bottom", sink: 2, dread: 0.28, kind: "descend" },
      ],
    },

    bottom: {
      phase: "bottom",
      tension: "high",
      lines: [
        { t: "底ではない。底のふりをした、いちばん深い踊り場だ。", c: "cold" },
        { t: "曼荼羅が、下から迫り上がって視界を満たす。回っている。こちらの心拍で。", c: "danger" },
        { t: "声は、もう声の形をしていない。皮膚の内側の圧として、ただそこにある。", c: "body" },
        { t: "『ここまで来た者は、二種類だ』圧が、わずかに言葉に戻る。", c: "voice", gap: 500 },
      ],
      choices: [
        { t: "目を開けたまま、最後の一歩を踏む", sub: "沈みきる", to: "__end", sink: 2, dread: 0.4, kind: "descend" },
      ],
    },
  };

  // ---------- 状態 ----------
  const state = { id: null, sink: 0, dread: 0, returnPaths: RETURN_PATHS_START, spent: 0, maxSink: 0 };
  let sinkScale = 14; // sink 値→ 0..1 正規化の目安（底でほぼ1）

  // ---------- DOM ----------
  const $ = (id) => document.getElementById(id);
  const sceneEl = $("scene");
  const choicesEl = $("choices");
  const sinkFill = $("sink-fill");
  const returnPathsEl = $("return-paths");
  const gateEl = $("gate");
  let revealToken = 0;

  // ---------- 戻り道インジケータ ----------
  function buildReturnPaths() {
    returnPathsEl.innerHTML = "";
    for (let i = 0; i < RETURN_PATHS_START; i++) {
      const i_ = document.createElement("i");
      returnPathsEl.appendChild(i_);
    }
  }
  function renderReturnPaths() {
    const marks = returnPathsEl.querySelectorAll("i");
    marks.forEach((m, i) => m.classList.toggle("spent", i >= state.returnPaths));
  }

  // ---------- 圧/沈下を CSS 変数と body 属性へ ----------
  function applyAtmosphere(scene) {
    const sinkNorm = Math.min(1, state.sink / sinkScale);
    state.maxSink = Math.max(state.maxSink, sinkNorm);
    document.documentElement.style.setProperty("--sink", sinkNorm.toFixed(3));
    document.documentElement.style.setProperty("--press", Math.min(1, state.dread).toFixed(3));
    // slow reveal の速度：圧が高いほど遅らせ、緊張を引き伸ばす
    const ms = REDUCED ? 0 : Math.round(34 + state.dread * 60);
    document.documentElement.style.setProperty("--reveal-ms", ms + "ms");
    document.body.dataset.phase = scene.phase || "surface";
    if (scene.tension === "high" && !REDUCED) document.body.dataset.tension = "high";
    else document.body.removeAttribute("data-tension");
    sinkFill.style.height = (sinkNorm * 100).toFixed(1) + "%";
    renderReturnPaths();
    Audio.update(sinkNorm, Math.min(1, state.dread), scene);
  }

  // ---------- slow-reveal レンダラ ----------
  function renderScene(id) {
    const scene = SCENES[id];
    if (!scene) return;
    state.id = id;
    applyAtmosphere(scene);
    choicesEl.innerHTML = "";
    sceneEl.innerHTML = "";
    const myToken = ++revealToken;

    const revealMs = REDUCED ? 0 : (34 + state.dread * 60);
    let delay = 0;

    scene.lines.forEach((line) => {
      const p = document.createElement("p");
      p.className = "hz-line " + (line.c || "");
      sceneEl.appendChild(p);

      if (REDUCED) {
        p.textContent = line.t;
        p.classList.add("shown");
        return;
      }

      // 1行を文字スパンへ割り、順に点灯
      const chars = [...line.t];
      chars.forEach((ch) => {
        const s = document.createElement("span");
        s.className = "ch";
        s.textContent = ch;
        p.appendChild(s);
      });

      window.setTimeout(() => {
        if (myToken !== revealToken) return;
        p.classList.add("shown");
        const spans = p.querySelectorAll(".ch");
        spans.forEach((s, i) => {
          window.setTimeout(() => {
            if (myToken !== revealToken) return;
            s.classList.add("lit");
            sceneEl.scrollTop = sceneEl.scrollHeight;
          }, i * revealMs);
        });
      }, delay);

      delay += chars.length * revealMs + 360 + (line.gap || 0);
    });

    // 本文を読み終えてから選択肢を出す（沈黙の間＝圧）
    const choiceDelay = REDUCED ? 150 : delay + 200;
    window.setTimeout(() => {
      if (myToken !== revealToken) return;
      renderChoices(scene);
    }, choiceDelay);
  }

  function renderChoices(scene) {
    choicesEl.innerHTML = "";
    (scene.choices || []).forEach((c, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "hz-choice " + (c.kind || "");
      // 退避手は、沈むほど重く（遅く・薄く）見せる
      if (c.kind === "retreat" && state.maxSink > 0.45) btn.classList.add("heavy");
      btn.innerHTML = `<span class="lead"></span>${c.sub ? `<span class="sub"></span>` : ""}`;
      btn.querySelector(".lead").textContent = c.t;
      if (c.sub) btn.querySelector(".sub").textContent = c.sub;
      btn.addEventListener("click", () => choose(c), { once: true });
      choicesEl.appendChild(btn);
      const appear = REDUCED ? 0 : 120 + idx * 140 + (c.kind === "retreat" ? state.maxSink * 700 : 0);
      window.setTimeout(() => btn.classList.add("in"), appear);
    });
  }

  function choose(c) {
    state.sink += c.sink || 0;
    state.dread = Math.min(1, state.dread + (c.dread || 0));
    if (c.close && state.returnPaths > 0) {
      state.returnPaths -= 1;
      state.spent += 1;
    }
    Audio.pulseOnce(c.kind === "descend" ? 1 : 0.5);
    if (c.to === "__end") return renderEnding();
    renderScene(c.to);
  }

  // ---------- エンディング（沈下の結果で分岐） ----------
  function renderEnding() {
    const myToken = ++revealToken;
    state.dread = 1;
    applyAtmosphere({ phase: "bottom", tension: "high" });
    choicesEl.innerHTML = "";
    sceneEl.innerHTML = "";

    const sankFully = state.returnPaths <= 1;   // 戻り道をほぼ使い果たした
    const lines = sankFully
      ? [
          { t: "踏む。最後の一歩は、移動ではなかった。", c: "danger" },
          { t: "戻り道は、もう一本も残っていない。確かめる必要すらない。体が知っている。", c: "body" },
          { t: "曼荼羅がこちらを最後まで読み取り、そして——読み終えた。", c: "cold" },
          { t: "あなたは沈みきった。狭間は、ここから始まる。", c: "voice", gap: 600 },
        ]
      : [
          { t: "踏む。最後の一歩は、移動ではなかった。", c: "danger" },
          { t: "細く残った戻り道が、最後に一度だけ軋む。まだ、ある。", c: "cold" },
          { t: "曼荼羅がこちらを読み取り、わずかに躊躇して、手を緩めた。", },
          { t: "あなたは辛うじて、沈みきらなかった。だが表層の記憶は、もう薄い。", c: "voice", gap: 600 },
        ];

    let delay = 0;
    const revealMs = REDUCED ? 0 : 50;
    lines.forEach((line) => {
      const p = document.createElement("p");
      p.className = "hz-line " + (line.c || "");
      p.textContent = line.t;
      sceneEl.appendChild(p);
      if (REDUCED) { p.classList.add("shown"); return; }
      p.style.opacity = "0";
      window.setTimeout(() => { if (myToken === revealToken) { p.style.transition = "opacity 1.4s ease"; p.classList.add("shown"); p.style.opacity = "1"; } }, delay);
      delay += line.t.length * revealMs + 500 + (line.gap || 0);
    });

    window.setTimeout(() => {
      if (myToken !== revealToken) return;
      const card = document.createElement("p");
      card.className = "hz-line cold";
      card.style.cssText = "margin-top:2em;font-size:0.82rem;line-height:1.9;";
      card.textContent = `― preview slice 終了 ―  到達深度: ${"▮".repeat(Math.round(state.maxSink * 8))}${"▯".repeat(8 - Math.round(state.maxSink * 8))} / 残った戻り道: ${state.returnPaths}/${RETURN_PATHS_START}`;
      sceneEl.appendChild(card);
      card.classList.add("shown");
      $("restart").hidden = false;
    }, delay + 400);
  }

  // ---------- 沈下連動 inline Web Audio ----------
  // production の inline BGM 設計に倣い、Hazama 内で完結（music-stack には触れない）。
  // 沈むほど drone が低く・暗くなり、圧で鼓動(pulse)が速くなる。
  const Audio = (() => {
    let ctx = null, master = null, filter = null, drones = [], pulseTimer = null, on = false;
    let cur = { sink: 0, dread: 0 };

    function supported() { return !!(window.AudioContext || window.webkitAudioContext); }

    function start() {
      if (on || !supported()) return;
      const C = window.AudioContext || window.webkitAudioContext;
      ctx = new C();
      master = ctx.createGain();
      master.gain.value = 0.0001;
      master.gain.setTargetAtTime(0.16, ctx.currentTime + 0.05, 0.6);
      filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 900;
      filter.Q.value = 0.7;
      filter.connect(master);
      master.connect(ctx.destination);
      // 2声のドローン（基音＋5度上）
      [1, 1.5].forEach((ratio, i) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = i === 0 ? "sine" : "triangle";
        osc.frequency.value = 70 * ratio;
        g.gain.value = i === 0 ? 0.06 : 0.03;
        osc.connect(g); g.connect(filter); osc.start();
        drones.push({ osc, g, ratio });
      });
      on = true;
      schedulePulse();
      apply(true);
      const btn = document.getElementById("audio-toggle");
      btn.hidden = false; btn.setAttribute("aria-pressed", "true"); btn.textContent = "♪ 鳴っている";
    }

    function toggle() {
      const btn = document.getElementById("audio-toggle");
      if (!on) { start(); return; }
      if (ctx.state === "running") { ctx.suspend(); btn.setAttribute("aria-pressed", "false"); btn.textContent = "♪ 鳴らす"; }
      else { ctx.resume(); btn.setAttribute("aria-pressed", "true"); btn.textContent = "♪ 鳴っている"; }
    }

    function apply(now) {
      if (!on || !ctx) return;
      const t = ctx.currentTime;
      // 沈むほど基音を下げ（70→34Hz）、lowpass を閉じる（暗く）
      const base = 70 - cur.sink * 36;
      const cutoff = 1100 - cur.sink * 760 - cur.dread * 180;
      drones.forEach((d) => d.osc.frequency.setTargetAtTime(base * d.ratio, t, 0.8));
      filter.frequency.setTargetAtTime(Math.max(140, cutoff), t, now ? 0.2 : 1.2);
      master.gain.setTargetAtTime(0.14 + cur.dread * 0.06, t, 0.8);
    }

    function schedulePulse() {
      if (pulseTimer) clearInterval(pulseTimer);
      // 圧が高いほど鼓動が速い（1100ms→440ms）
      const interval = Math.round(1100 - cur.dread * 660);
      pulseTimer = setInterval(() => beat(0.5), Math.max(420, interval));
    }

    function beat(amp) {
      if (!on || !ctx || ctx.state !== "running") return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = (44 - cur.sink * 14);
      g.gain.value = 0.0001;
      g.gain.exponentialRampToValueAtTime(0.05 * amp + cur.dread * 0.04, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      osc.connect(g); g.connect(master);
      osc.start(t); osc.stop(t + 0.55);
    }

    return {
      start, toggle,
      pulseOnce: (amp) => beat(amp),
      update: (sink, dread, scene) => {
        const prevDread = cur.dread;
        cur = { sink, dread };
        apply(false);
        if (Math.abs(prevDread - dread) > 0.08) schedulePulse();
      },
    };
  })();

  // ---------- 起動 ----------
  function enter() {
    gateEl.classList.add("gone");
    buildReturnPaths();
    Audio.start();
    renderScene("surface");
  }

  function restart() {
    revealToken++;
    state.id = null; state.sink = 0; state.dread = 0; state.returnPaths = RETURN_PATHS_START; state.spent = 0; state.maxSink = 0;
    $("restart").hidden = true;
    buildReturnPaths();
    renderScene("surface");
  }

  document.getElementById("gate-enter").addEventListener("click", enter, { once: false });
  document.getElementById("audio-toggle").addEventListener("click", () => Audio.toggle());
  document.getElementById("restart").addEventListener("click", restart);

  // タブ復帰で AudioContext を起こす
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") { try { /* resume handled by toggle state */ } catch (_) {} }
  });
})();
