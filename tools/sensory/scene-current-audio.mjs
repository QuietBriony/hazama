// Tools-only snapshot of the production Audio IIFE. The smoke check enforces exact source parity.
// Do not import this fixture into the game. No build step is required to use the lab.
export function createCurrentAudio(window, document, REDUCED = false) {
  const setInterval = window.setInterval.bind(window);
  const clearInterval = window.clearInterval.bind(window);
  // Seed only the lab's synthetic IR/noise; all production audio formulas remain unchanged.
  const Math = Object.create(globalThis.Math);
  let randomState = 20260915;
  Math.random = () => {
    randomState = (globalThis.Math.imul(randomState, 1664525) + 1013904223) >>> 0;
    return randomState / 4294967296;
  };
  const Audio = (() => {
    let ctx = null, master = null, compressor = null, outputVolume = null, filter = null, dryGain = null, conv = null, wetGain = null;
    let volume = 1; // 圧で変動するmasterとは別の最終音量。既定1＝従来の音を変えない。
    let lfo = null, lfoGain = null, drones = [], pulseTimer = null, on = false, playing = false;
    let suspendedByVisibility = false;
    // depth=深度(rank/沈下の濃い方・0..1) / dread=圧(0..1) / density=観測者の多声(0..1)。
    // depth.html のリアクティブ設計（深さ→音域/cutoff/残響、多声→密度、圧→不協和/鼓動）を
    // 同一document の内製エンジンへ畳み込んだ信号。menace=浅は馴染む/深で威圧。
    let cur = { depth: 0, dread: 0, density: 0 }, colorSeed = 0, baseCents = 0;
    let axisCents = 0, axisCut = 0, axisWobble = 0;   // E21: 幹ごとの音の軸色オフセット（fail-safe=0=従来の地）
    const supported = () => !!(window.AudioContext || window.webkitAudioContext);
    // E31: desktopの既存音は維持し、coarse pointerだけ持続音/IR budgetを下げる。
    // reduced-motionは自動drone/pulseを作らず、実手勢のtransientだけを残す。
    const AUDIO_BUDGETS = Object.freeze({
      full:   Object.freeze({ partials: 6, impulseSeconds: 2.8, wetScale: 1, pulse: true }),
      light:  Object.freeze({ partials: 3, impulseSeconds: 0.8, wetScale: 0.45, pulse: true }),
      static: Object.freeze({ partials: 0, impulseSeconds: 0, wetScale: 0, pulse: false })
    });
    const coarsePointer = !!window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
    const audioTier = REDUCED ? "static" : coarsePointer ? "light" : "full";
    const audioBudget = AUDIO_BUDGETS[audioTier];

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
      master.gain.setTargetAtTime(0.26, ctx.currentTime + 0.05, 0.8);
      // E31: guardrail。音圧を稼がず、既存layerが重なった瞬間のpeakだけを受ける。
      compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -18; compressor.knee.value = 12; compressor.ratio.value = 4;
      compressor.attack.value = 0.006; compressor.release.value = 0.25;
      outputVolume = ctx.createGain(); outputVolume.gain.value = volume;
      master.connect(compressor); compressor.connect(outputVolume); outputVolume.connect(ctx.destination);
      filter = ctx.createBiquadFilter(); filter.type = "lowpass"; filter.frequency.value = 1700; filter.Q.value = 0.8;
      dryGain = ctx.createGain(); dryGain.gain.value = 0.85;
      filter.connect(dryGain); dryGain.connect(master);
      // 合成IR の残響（"空間"）。wet は深いほど増える。
      if (audioBudget.impulseSeconds > 0) {
        conv = ctx.createConvolver(); conv.buffer = makeImpulse(audioBudget.impulseSeconds, 2.6);
        wetGain = ctx.createGain(); wetGain.gain.value = 0.0001;
        filter.connect(conv); conv.connect(wetGain); wetGain.connect(master);
      }
      // 共有 LFO：全 partial の detune を揺らす（うねり）。
      if (audioBudget.partials > 0) {
        lfo = ctx.createOscillator(); lfo.type = "sine"; lfo.frequency.value = 0.06;
        lfoGain = ctx.createGain(); lfoGain.gain.value = 4; lfo.connect(lfoGain); lfo.start();
        PARTIALS.slice(0, audioBudget.partials).forEach((spec) => {
          const osc = ctx.createOscillator(), g = ctx.createGain();
          osc.type = spec.type; osc.frequency.value = 70 * spec.ratio;
          g.gain.value = spec.base; osc.connect(g); g.connect(filter);
          lfoGain.connect(osc.detune); osc.start();
          drones.push({ osc, g, spec });
        });
      }
      on = true; playing = true; suspendedByVisibility = false; schedulePulse(); apply(true);
      // 実手勢の中で resume()＝モバイルでも解禁される（同一document の context なので通る）。
      if (ctx.state !== "running") ctx.resume();
    }
    // playing は「鳴らす意図」を表す（ctx.suspend/resume は非同期で state 反映が遅れるため、
    // チップ表示はこの意図フラグを正にする）。
    function setVolume(value) {
      if (!Number.isFinite(value)) return;
      volume = Math.max(0, Math.min(1, value));
      if (ctx && outputVolume) outputVolume.gain.setTargetAtTime(volume, ctx.currentTime, 0.04);
    }
    function toggle() {
      if (!on) return start();
      playing = !playing;
      suspendedByVisibility = false;
      try {
        if (playing) { ctx.resume(); schedulePulse(); }
        else { clearPulse(); ctx.suspend(); }
      } catch (e) {}
    }
    function apply(now) {
      if (!on || !ctx) return;
      const t = ctx.currentTime;
      const s = cur.depth, d = cur.dread, dens = cur.density;
      const base = 116 - s * 40;                         // 沈むほど低く（116→76Hz）。端末スピーカーで可聴な音域へ底上げ
      const cutoff = 1900 - s * 1000 - d * 250 + axisCut;  // 沈むほど暗く（深さ＋圧で翳る）。E21: 幹で温度を染める
      const bloomCurve = Math.max(0, s - 0.10) / 0.90;   // 浅では開かない／深で倍音が開花
      const menace = d * (0.30 + 0.70 * s);              // 不協和は浅は馴染み・深で威圧（menaceカーブ）
      baseCents = (((colorSeed * 37) % 25) - 12) * 0.6 + axisCents; // 周回ごとの微デチューン＋E21 幹の軸色（glitchHit の復帰先）
      const slow = now ? 0.25 : 1.3;
      drones.forEach((dr) => {
        const sp = dr.spec;
        // 多声(density)が増えるほど倍音が密に開く＝沈むほど密。不協和は menace で。
        let g = sp.base + sp.bloom * bloomCurve * (1 + dens * 0.7) + sp.diss * menace;
        dr.g.gain.setTargetAtTime(Math.max(0, g), t, now ? 0.3 : 1.6);
        dr.osc.frequency.setTargetAtTime(base * sp.ratio, t, slow);
        dr.osc.detune.setTargetAtTime(baseCents, t, 1.8);
      });
      filter.frequency.setTargetAtTime(Math.max(280, cutoff), t, slow);
      master.gain.setTargetAtTime(0.24 + d * 0.06, t, 0.8);
      if (wetGain) wetGain.gain.setTargetAtTime((0.1 + s * 0.34) * audioBudget.wetScale, t, 1.8); // 深いほど広い残響
      if (lfo) lfo.frequency.setTargetAtTime(0.05 + s * 0.1, t, 1.8);
      if (lfoGain) lfoGain.gain.setTargetAtTime(3 + s * 10 + dens * 4 + (colorSeed % 5) + axisWobble, t, 1.8); // うねり幅（cents）＋E21 幹の揺れ
    }
    function clearPulse() {
      if (pulseTimer) clearInterval(pulseTimer);
      pulseTimer = null;
    }
    function schedulePulse() {
      clearPulse();
      if (!audioBudget.pulse || !on || !playing || document.hidden) return;
      pulseTimer = setInterval(() => beat(0.5), Math.max(440, Math.round(1150 - cur.dread * 680))); // 圧で鼓動が速い
    }
    function beat(amp) {
      if (!on || !ctx || ctx.state !== "running") return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator(), g = ctx.createGain();
      osc.type = "sine"; osc.frequency.value = 98 - cur.depth * 30;
      osc.frequency.setTargetAtTime((98 - cur.depth * 30) * 0.72, t, 0.18); // 鼓動の沈み込み（可聴域へ底上げ）
      g.gain.value = 0.0001;
      g.gain.exponentialRampToValueAtTime(0.06 * amp + cur.dread * 0.05, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
      osc.connect(g); g.connect(filter); osc.start(t); osc.stop(t + 0.6); // 鼓動も残響を通す
      // 仕上げ: 選択時(amp>=0.8)だけ、やわらかい音色を一音添える＝可聴で音楽的なアクセント。
      // 鼓動(自動 beat=0.5)には付けない＝うるさくしない。沈むほど低い音度＋短い余韻。
      if (amp >= 0.8) {
        const scale = [0, 3, 7, 10, 12];                          // 短調寄りの度数
        const deg = scale[Math.min(scale.length - 1, Math.floor(cur.depth * scale.length))];
        const f = (176 - cur.depth * 42) * Math.pow(2, deg / 12); // 中域＝端末スピーカーで明瞭
        const o2 = ctx.createOscillator(), g2 = ctx.createGain();
        o2.type = "triangle"; o2.frequency.value = f;
        g2.gain.value = 0.0001;
        g2.gain.exponentialRampToValueAtTime(0.055, t + 0.03);
        g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.95);
        o2.connect(g2); g2.connect(filter); o2.start(t); o2.stop(t + 1.0);
      }
    }
    // グリッジ・バーストと同期して音も一瞬"裂ける"（共有信号＝視覚と一緒に壊れていく）。
    //  - drone を一瞬デチューン（音程が割れる）→ baseCents へ復帰
    //  - フィルタ cutoff を一瞬跳ねさせる（デジタルな破断）
    //  - 短いノイズ・バースト（バンドパス）でデータモッシュ的なザッという質感
    // intensity は深いほど大きい（Glitch から depth 連動で渡す）。
    function glitchHit(intensity) {
      if (!on || !ctx || ctx.state !== "running") return;
      const t = ctx.currentTime, amt = Math.max(0, Math.min(1.2, intensity));
      try {
        drones.forEach((dr) => {
          dr.osc.detune.cancelScheduledValues(t);
          dr.osc.detune.setValueAtTime(baseCents + (Math.random() * 2 - 1) * 55 * amt, t);
          dr.osc.detune.setTargetAtTime(baseCents, t + 0.03, 0.10);
        });
        const f0 = filter.frequency.value;
        filter.frequency.cancelScheduledValues(t);
        filter.frequency.setValueAtTime(Math.max(90, f0 * (1 + (Math.random() - 0.5) * 0.7 * amt)), t);
        filter.frequency.setTargetAtTime(f0, t + 0.04, 0.12);
        // 短いノイズ・バースト（datamosh の"ザッ"）。深いほど目立つ。
        const len = Math.floor(ctx.sampleRate * 0.05);
        const buf = ctx.createBuffer(1, len, ctx.sampleRate);
        const ch = buf.getChannelData(0);
        for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
        const src = ctx.createBufferSource(); src.buffer = buf;
        const bp = ctx.createBiquadFilter(); bp.type = "bandpass";
        bp.frequency.value = 800 + Math.random() * 2600; bp.Q.value = 0.7;
        const ng = ctx.createGain(); ng.gain.value = 0.0001;
        ng.gain.setValueAtTime(0.018 * amt + cur.dread * 0.012, t);
        ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
        src.connect(bp); bp.connect(ng); ng.connect(master);
        src.start(t); src.stop(t + 0.06);
      } catch (e) {}
    }
    // E21: 音の軸色＝幹ごとに地の音を微かに染める（解決音は鳴らさない・現象としての地）。
    //   fail-safe＝既定(deep/null)はオフセット 0＝従来の地そのもの。実機で人間が聴いて採否/調整（human-gate）。
    function setAxis(trunk) {
      const AX = {
        soma:  { cents: -5, cut: -260, wobble: 1 },   // 身体＝低く・暗く・どっしり
        reso:  { cents:  4, cut:  360, wobble: 2 },   // 流れ＝やや高く・開けて明るい
        casc:  { cents:  0, cut: -120, wobble: 7 },   // 崩壊＝暗く・不安定に揺れる
        other: { cents:  2, cut:   60, wobble: 11 }   // 並行＝重なって揺らぐ（合唱的）
      };
      const a = AX[trunk] || { cents: 0, cut: 0, wobble: 0 };
      axisCents = a.cents; axisCut = a.cut; axisWobble = a.wobble;
      apply(false);
    }
    // E21: 縁の呼気＝解決音ではない、ただの息。低い一音が膨らんで、わずかに沈んで、ほどける。
    //   Ω=低く満ちる／浮上=中域で醒める。Audio 未解禁なら no-op。
    function breath(attuned) {
      if (!on || !ctx || ctx.state !== "running") return;
      const t = ctx.currentTime;
      const f0 = attuned ? 80 : 128;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine"; o.frequency.value = f0;
      o.frequency.setTargetAtTime(f0 * 0.94, t + 1.0, 2.2);          // わずかに沈む＝吐く息（解決しない）
      g.gain.value = 0.0001;
      g.gain.setTargetAtTime(attuned ? 0.075 : 0.05, t + 0.08, 1.0); // ゆっくり吸う
      g.gain.setTargetAtTime(0.0001, t + 2.8, 2.0);                  // ゆっくり吐く＝呼気
      o.connect(g); g.connect(filter); o.start(t); o.stop(t + 6.0);
    }
    // E31: hiddenから勝手に鳴り直さない。再開は既存chipの実手勢だけ。
    function suspendForVisibility() {
      if (!on || !ctx || !playing) return false;
      playing = false; suspendedByVisibility = true; clearPulse();
      try { const pending = ctx.suspend(); if (pending && pending.catch) pending.catch(() => {}); } catch (e) {}
      return true;
    }
    // E31: pagehide/BFCacheでも単一AudioContextを閉じ、次の実手勢で再生成可能にする。
    function dispose() {
      clearPulse();
      const closing = ctx;
      drones.forEach(({ osc, g }) => {
        try { osc.stop(); } catch (e) {}
        try { osc.disconnect(); g.disconnect(); } catch (e) {}
      });
      try { if (lfo) lfo.stop(); } catch (e) {}
      try { if (lfo) lfo.disconnect(); if (lfoGain) lfoGain.disconnect(); } catch (e) {}
      try { if (filter) filter.disconnect(); if (dryGain) dryGain.disconnect(); } catch (e) {}
      try { if (conv) conv.disconnect(); if (wetGain) wetGain.disconnect(); } catch (e) {}
      try { if (master) master.disconnect(); if (compressor) compressor.disconnect(); } catch (e) {}
      try { if (outputVolume) outputVolume.disconnect(); } catch (e) {}
      ctx = null; master = null; compressor = null; outputVolume = null; filter = null; dryGain = null; conv = null; wetGain = null;
      lfo = null; lfoGain = null; drones = []; on = false; playing = false; suspendedByVisibility = false;
      try {
        if (closing && closing.state !== "closed") {
          const pending = closing.close(); if (pending && pending.catch) pending.catch(() => {});
        }
      } catch (e) {}
    }
    return {
      start, toggle, setVolume, pulseOnce: (a) => beat(a), glitchHit, setAxis, breath, suspendForVisibility, dispose,
      get volume() { return volume; },
      get on() { return on; },
      get playing() { return playing; }, // 鳴らす意図（チップ表示の正）
      get suspendedByVisibility() { return suspendedByVisibility; },
      get tier() { return audioTier; },
      setColor: (seed) => { colorSeed = seed; apply(false); },
      update: (depth, dread, density) => {
        const prev = cur.dread;
        cur = { depth, dread, density: density || 0 };
        apply(false);
        if (Math.abs(prev - dread) > 0.08) schedulePulse(); // 圧が動いたら鼓動の速さを取り直す
      }
    };
  })();
  return Audio;
}
