// Hazama main.js v2.14
// Minimal, robust loader + renderer for GitHub Pages / Codespaces.
// v2.3 adds a lightweight deterministic game layer around depth pressure.
// v2.5 animates the descent key visual and mandala goal gate.
// v2.6 maps story progression into Music repo UCM auto-generation profiles.
// v2.7 formalizes Music as the active audio provider, with future ports reserved.
// v2.8 adds a local Gate Intelligence director for game objectives.
// v2.9 sends sanitized Hazama profiles to Music via hash boot and postMessage.
// v2.10 arms Music sync on Hazama start and opens it on the first user gesture.
// v2.11 aligns Music bridge stages with the Music hazama-profile receiver arc.
// v2.12 adds Gate Run actions, win/loss, and game-forward GI feedback.
// v2.13 clarifies Ω as the goal, compresses Music into Audio Gate, and stages mandala focus.
// v2.14 separates anchor/mandala visuals and auto-collapses synced Audio Gate.

const APP_VERSION = "v2.14";

const STATE_KEY = "hazama_state_v2";
const SEED_KEY = "hazama_seed";
const RUN_KEY = "hazama_run_v1";
const DEFAULT_START = "A_start";
const HUB_DEPTH = "HUB_NIGHT";
const OMEGA_DEPTH = "Ω";
const CORE_MAX_INPUT = 80;
const STABILITY_MAX = 100;
const RESONANCE_MAX = 100;
const GATE_RUN_MAX_CHARGE = 100;
const GATE_RUN_TURN_LIMIT = 20;
const MILESTONE_RANKS = [8, 14, 20, 27];
const MOVE_TYPES = ["dive", "observe", "tune", "sync", "retreat"];
const MOVE_TYPE_LABELS = {
  dive: "潜る",
  observe: "観測",
  tune: "調律",
  sync: "同期",
  retreat: "退避"
};
const ACTIVE_AUDIO_PROVIDER = "music";
const AUDIO_PROVIDERS = {
  music: {
    id: "music",
    label: "Music",
    repo: "QuietBriony/Music",
    url: "https://quietbriony.github.io/Music/",
    origin: "https://quietbriony.github.io",
    localUrl: "http://127.0.0.1:8095/?v=hazama-local",
    localOrigin: "http://127.0.0.1:8095",
    schema: "ucm-mandala-v1",
    status: "active"
  },
  namima: {
    id: "namima",
    label: "namima",
    repo: "QuietBriony/namima",
    schema: "mood-profile-v1",
    status: "future"
  },
  drumfloor: {
    id: "drumfloor",
    label: "drum-floor",
    repo: "QuietBriony/drum-floor",
    schema: "groove-profile-v1",
    status: "future"
  }
};

let depths = {};
let currentDepthId = DEFAULT_START;
let historyStack = [];
let pauseTimer = null;
let pendingNextDepthId = null;
let navigationLocked = false;
let runState = null;
let runLog = "";
let musicBridgeWindows = {
  production: null,
  local: null
};
let lastMusicPayload = null;
let musicAutoStartInstalled = false;
let musicAutoStartDone = false;
let musicBridgePhase = "armed";
const MUSIC_FEEDBACK_ALLOWED_ORIGINS = new Set([
  "https://quietbriony.github.io",
  "http://127.0.0.1:8095",
  "http://localhost:8095"
]);
const MusicFeedbackState = {
  connected: false,
  lastAt: 0,
  playing: false,
  chapter: "",
  chapterLabel: "",
  bpm: 0,
  acid: 0,
  genre: {},
  gradient: {},
  families: {},
  visual: "idle",
  eventKind: "",
  lostTimer: null
};

function $(id) {
  return document.getElementById(id);
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function setStatus(msg) {
  const el = $("runtime-status");
  if (el) el.textContent = msg;
  console.log("[Hazama]", msg);
}

function buildDepthsURL() {
  const base = new URL("hazama-depths.json", location.href).toString();
  return `${base}?t=${Date.now()}&rnd=${Math.random()}`;
}

function localHashText(input) {
  let h = 2166136261;
  const text = String(input || "");
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

function hashText(input) {
  try {
    if (window.HazamaSeed && typeof window.HazamaSeed.hashText === "function") {
      return window.HazamaSeed.hashText(input);
    }
  } catch (_) {}
  return localHashText(input);
}

function numericHash(input) {
  return parseInt(hashText(input).slice(0, 8), 16) || 0;
}

function safeLocalStorageGet(key) {
  try {
    return localStorage.getItem(key);
  } catch (_) {
    return null;
  }
}

function safeLocalStorageSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (_) {}
}

function safeLocalStorageRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch (_) {}
}

function clampNumber(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function signedNumber(value) {
  const n = Number(value) || 0;
  return n > 0 ? `+${n}` : String(n);
}

function pick(list, n) {
  return list[Math.abs(n) % list.length];
}

function depthRank(depthId) {
  if (!depthId || depthId === HUB_DEPTH || depthId === DEFAULT_START) return 0;
  if (depthId === "A_reborn") return 28;
  if (depthId === "Ω") return 27;
  if (/^[A-Z]$/.test(depthId)) return depthId.charCodeAt(0) - 64;
  return 1;
}

function depthRankLabel(rank) {
  if (rank >= 28) return "A'";
  if (rank >= 27) return "Ω";
  if (rank <= 0) return "HUB";
  return String.fromCharCode(64 + clampNumber(rank, 1, 26));
}

function createRunState() {
  return {
    version: 1,
    stability: 76,
    resonance: 0,
    marks: 0,
    steps: 0,
    entries: 0,
    bestRank: 0,
    gateRunStatus: "running",
    gateRunTurns: 0,
    gateRunCharge: 0,
    lastGateAction: "",
    lastGateResult: "",
    lastMoveType: "observe",
    gateRunOutcomeAt: 0,
    lastDepthId: DEFAULT_START,
    lastChangedAt: Date.now()
  };
}

function normalizeRunState(data) {
  const base = createRunState();
  const src = data && typeof data === "object" ? data : {};
  return {
    version: 1,
    stability: clampNumber(src.stability ?? base.stability, 0, STABILITY_MAX),
    resonance: clampNumber(src.resonance ?? base.resonance, 0, RESONANCE_MAX),
    marks: clampNumber(src.marks ?? base.marks, 0, 99),
    steps: Math.max(0, Number(src.steps) || 0),
    entries: Math.max(0, Number(src.entries) || 0),
    bestRank: clampNumber(src.bestRank ?? base.bestRank, 0, 28),
    gateRunStatus: ["running", "won", "lost"].includes(src.gateRunStatus) ? src.gateRunStatus : base.gateRunStatus,
    gateRunTurns: Math.max(0, Number(src.gateRunTurns) || 0),
    gateRunCharge: clampNumber(src.gateRunCharge ?? base.gateRunCharge, 0, GATE_RUN_MAX_CHARGE),
    lastGateAction: typeof src.lastGateAction === "string" ? src.lastGateAction.slice(0, 40) : base.lastGateAction,
    lastGateResult: typeof src.lastGateResult === "string" ? src.lastGateResult.slice(0, 180) : base.lastGateResult,
    lastMoveType: MOVE_TYPES.includes(src.lastMoveType) ? src.lastMoveType : base.lastMoveType,
    gateRunOutcomeAt: Number(src.gateRunOutcomeAt) || base.gateRunOutcomeAt,
    lastDepthId: typeof src.lastDepthId === "string" ? src.lastDepthId : base.lastDepthId,
    lastChangedAt: Number(src.lastChangedAt) || base.lastChangedAt
  };
}

function loadRunState() {
  try {
    const raw = safeLocalStorageGet(RUN_KEY);
    if (!raw) return createRunState();
    return normalizeRunState(JSON.parse(raw));
  } catch (_) {
    return createRunState();
  }
}

function getRunState() {
  if (!runState) runState = loadRunState();
  return runState;
}

function saveRunState() {
  const state = getRunState();
  state.lastChangedAt = Date.now();
  safeLocalStorageSet(RUN_KEY, JSON.stringify(state));
}

function clearRunState() {
  runState = createRunState();
  runLog = "";
  safeLocalStorageRemove(RUN_KEY);
}

function countMilestonesCrossed(previousRank, nextRank) {
  return MILESTONE_RANKS.filter((rank) => previousRank < rank && nextRank >= rank).length;
}

function canEnterOmega(state = getRunState()) {
  return state.gateRunStatus === "won";
}

function normalizeMoveType(type) {
  return MOVE_TYPES.includes(type) ? type : "";
}

function inferMoveType(fromId, toId, moveKind = "choice", explicitType = "") {
  const direct = normalizeMoveType(explicitType);
  if (direct) return direct;
  if (toId === OMEGA_DEPTH) return "sync";
  if (moveKind === "back" || moveKind === "home" || toId === HUB_DEPTH || toId === DEFAULT_START) return "retreat";
  if (moveKind === "core") return "tune";

  const fromRank = depthRank(fromId);
  const toRank = depthRank(toId);
  const climb = toRank - fromRank;
  if (climb >= 5) return "dive";
  if (climb > 0) return "observe";
  if (climb < 0) return "retreat";
  return "tune";
}

function transitionPreview(fromId, toId, moveKind = "choice", explicitType = "") {
  const fromRank = depthRank(fromId);
  const toRank = depthRank(toId);
  const moveType = inferMoveType(fromId, toId, moveKind, explicitType);
  const typeLabel = MOVE_TYPE_LABELS[moveType] || "観測";

  if (moveKind === "back") {
    return {
      moveType,
      stabilityDelta: 8,
      resonanceDelta: -1,
      gateDelta: -1,
      label: `${typeLabel} / 安定 +8`,
      title: "一段戻って安定を取り戻します。"
    };
  }

  if (toId === HUB_DEPTH || toId === DEFAULT_START || moveKind === "home") {
    return {
      moveType,
      stabilityDelta: 14,
      resonanceDelta: -2,
      gateDelta: -2,
      label: `${typeLabel} / 安定 +14`,
      title: "HUB/入口で境界圧を落とします。"
    };
  }

  const climb = Math.max(0, toRank - fromRank);
  const span = Math.abs(toRank - fromRank);

  if (climb > 0) {
    const quietBonus = moveKind === "core" ? 3 : 0;
    const pressure = Math.max(1, 4 + climb * 2 + Math.floor(toRank / 7) + (span > 6 ? 5 : 0) - quietBonus);
    const typeTuning = {
      dive: { stability: -pressure, resonance: 2, gate: 8 + Math.ceil(climb / 2), note: "深く潜ってゲートを強く押します。" },
      observe: { stability: -Math.ceil(pressure * 0.68), resonance: 1, gate: 4 + Math.ceil(climb / 3), note: "観測しながら安全に進みます。" },
      tune: { stability: -Math.ceil(pressure * 0.42) + 4, resonance: 2, gate: 4, note: "位相を整えながら進みます。" },
      sync: { stability: -Math.ceil(pressure * 0.5), resonance: -6, gate: 16 + Math.min(8, getRunState().marks * 2), note: "共鳴を束ねてゲートへ接続します。" }
    }[moveType] || { stability: -pressure, resonance: 1, gate: 4, note: "深度圧を受けながら進みます。" };
    const stabilityDelta = clampNumber(typeTuning.stability, -72, 12);
    const resonanceDelta = typeTuning.resonance + 1 + Math.min(4, Math.ceil(toRank / 8));
    return {
      moveType,
      stabilityDelta,
      resonanceDelta,
      gateDelta: typeTuning.gate,
      label: `${typeLabel} / 安定 ${signedNumber(stabilityDelta)}`,
      title: `深度圧: ${typeTuning.note} 共鳴 ${signedNumber(resonanceDelta)} / gate ${signedNumber(typeTuning.gate)}。`
    };
  }

  if (toRank < fromRank) {
    return {
      moveType,
      stabilityDelta: 6,
      resonanceDelta: 0,
      gateDelta: -1,
      label: `${typeLabel} / 安定 +6`,
      title: "浅い層へ戻り、安定を少し回復します。"
    };
  }

  return {
    moveType,
    stabilityDelta: moveType === "tune" ? 3 : -2,
    resonanceDelta: moveType === "sync" ? -4 : 1,
    gateDelta: moveType === "sync" ? 10 : moveType === "tune" ? 3 : 1,
    label: `${typeLabel} / 安定 ${moveType === "tune" ? "+3" : "-2"}`,
    title: "同じ深度帯で位相を調整します。"
  };
}

function gateForOption(fromId, toId, option = {}) {
  if (toId === OMEGA_DEPTH && !canEnterOmega()) {
    const charge = Math.round(getRunState().gateRunCharge);
    return {
      allowed: false,
      moveType: "sync",
      label: `Ω LOCK / gate ${charge}%`,
      title: "ΩはGATE OPEN後に入れます。Gate Runを100%まで進めてください。"
    };
  }

  const preview = transitionPreview(fromId, toId, "choice", option.type);
  const cost = Math.max(0, -preview.stabilityDelta);
  const state = getRunState();
  const markBuffer = state.marks * 6;
  const allowed = cost === 0 || state.stability + markBuffer >= Math.min(72, cost);
  return {
    allowed,
    moveType: preview.moveType,
    label: preview.label,
    title: allowed
      ? preview.title
      : `${preview.title} 現在の安定は${state.stability}です。問いに返すか、HUBへ戻ると回復できます。`
  };
}

function syncRunDepth(depthId) {
  const state = getRunState();
  state.bestRank = Math.max(state.bestRank, depthRank(depthId));
  state.lastDepthId = depthId;
  saveRunState();
}

function visualModeForDepth(depthId, state = getRunState(), gi = buildGateIntelligence(depthId)) {
  const rank = depthRank(depthId);
  if (depthId === DEFAULT_START || depthId === HUB_DEPTH) return "anchor";
  if (depthId === OMEGA_DEPTH || state.gateRunStatus === "won" || gi.gateCharge >= 86 || rank >= 24) return "gate";
  if (MILESTONE_RANKS.includes(rank) || gi.gateCharge >= 62) return "threshold";
  return "story";
}

function syncVisualMotion(depthId) {
  const root = document.documentElement;
  if (!root) return;

  const rank = depthRank(depthId);
  const state = getRunState();
  const gi = buildGateIntelligence(depthId);
  const shift = clampNumber(4 + rank * 0.95 + state.resonance * 0.06, 4, 34);
  const duration = clampNumber(78 - rank * 1.4 - state.resonance * 0.08, 30, 78);
  const opacity = clampNumber(0.28 + rank / 62 + state.resonance / 260, 0.28, 0.76);
  const scale = clampNumber(1 + rank / 180 + state.resonance / 520 + gi.gateCharge / 900, 1, 1.26);
  const glow = clampNumber(0.18 + gi.gateCharge / 130, 0.18, 0.95);
  const visualMode = visualModeForDepth(depthId, state, gi);

  root.style.setProperty("--hz-depth-shift", `${shift.toFixed(1)}px`);
  root.style.setProperty("--hz-gate-duration", `${duration.toFixed(1)}s`);
  root.style.setProperty("--hz-gate-opacity", opacity.toFixed(2));
  root.style.setProperty("--hz-gate-scale", scale.toFixed(3));
  root.style.setProperty("--hz-gate-charge", gi.gateCharge.toFixed(1));
  root.style.setProperty("--hz-gate-glow", glow.toFixed(2));
  root.style.setProperty("--hz-threat", gi.risk.toFixed(1));
  root.dataset.hzVisual = visualMode;
}

function gatePhaseLabel(gateCharge, status = getRunState().gateRunStatus) {
  if (status === "won") return "OPEN";
  if (gateCharge >= 62) return "ALIGN";
  if (gateCharge >= 34) return "CHARGE";
  return "SCAN";
}

function giGateAlmostOpen(state, gateCharge) {
  return state.gateRunStatus === "running" && gateCharge >= 86;
}

function riskLabel(risk) {
  if (risk >= 78) return "CRITICAL";
  if (risk >= 54) return "HIGH";
  if (risk >= 28) return "WATCH";
  return "LOW";
}

function buildGateIntelligence(depthId = currentDepthId) {
  const state = getRunState();
  const depth = depths[depthId] || {};
  const rank = depthRank(depthId);
  const depthNorm = clampNumber(rank / 28, 0, 1);
  const resonanceNorm = clampNumber(state.resonance / RESONANCE_MAX, 0, 1);
  const stabilityNorm = clampNumber(state.stability / STABILITY_MAX, 0, 1);
  const gateCharge = clampNumber(
    Math.max(
      state.gateRunCharge || 0,
      rank * 1.45 + state.resonance * 0.58 + state.marks * 13 + state.entries * 1.4 - (100 - state.stability) * 0.08
    ),
    0,
    100
  );
  const risk = clampNumber(
    depthNorm * 48 + resonanceNorm * 24 + (1 - stabilityNorm) * 42 - state.marks * 2,
    0,
    100
  );
  const phase = gatePhaseLabel(gateCharge, state.gateRunStatus);

  let objective = "問いに返して、ゲートの位相を充電する。";
  let route = "返す -> 沈黙 -> 次深度";

  if (state.gateRunStatus === "won") {
    objective = "GATE OPEN。Ωへ入れる。ここからがこの周回の本筋の到達点。";
    route = "Ω -> A' / HUB";
  } else if (state.gateRunStatus === "lost") {
    objective = "Gate Run崩落。HUBで姿勢を戻し、退避から再起動する。";
    route = "退避 -> 再起動";
  } else if (state.gateRunCharge >= 82) {
    objective = "ゲートは開きかけている。同期で仕上げるか、調律で安定を厚くする。";
    route = "同期 / 調律";
  } else if (state.stability < 26) {
    objective = "安定が薄い。HUBへ戻るか、問いで調律して崩落を避ける。";
    route = "返す / HUBへ戻る";
  } else if (giGateAlmostOpen(state, gateCharge)) {
    objective = "目的ゲートは近いが、Ωはまだ開いていない。Gate Runを100%まで押し切る。";
    route = "同期 / 調律 / Gate Run";
  } else if (rank >= 18 && state.marks === 0) {
    objective = "節目のしるしが足りない。深度を刻み、通行バッファを作る。";
    route = "安全な分岐 -> しるし獲得";
  } else if (rank === 0) {
    objective = "Ω到達が本筋。まずGate Runを進め、GATE OPENまで位相を合わせる。";
    route = "巡礼 / 探索 / Gate Run";
  } else if (risk > 70) {
    objective = "境界圧が高い。無理に進まず、呼吸と選択を細くする。";
    route = "返す -> 停止 -> 戻る";
  }

  const signals = [
    "GI: 観測線はまだ保てる。",
    "GI: 目的点は見えている。急がなくていい。",
    "GI: 共鳴が増えるほど、扉は近くなる。",
    "GI: 安定を残せ。深度は戻れる者だけを通す。",
    "GI: ゲートの縁が反応している。"
  ];
  const signal = pick(signals, numericHash(`${depthId}|${state.steps}|${state.resonance}|gi`));

  return {
    code: `GI-${depthRankLabel(rank)}-${String(state.steps).padStart(2, "0")}`,
    phase,
    riskLabel: riskLabel(risk),
    gateCharge: Math.round(gateCharge),
    risk: Math.round(risk),
    objective,
    route,
    signal,
    depthTitle: depth.title || depthId
  };
}

function styleForMusicProfile(rank, state) {
  if (rank >= 27) return "trance";
  if (rank >= 22 || state.resonance >= 76) return "techno";
  if (rank >= 15) return "dub";
  if (rank >= 8) return "lofi";
  return "ambient";
}

function musicStageForDepth(rank) {
  if (rank >= 27) return "exhale";
  if (rank >= 18) return "root";
  if (rank >= 10) return "ferment";
  if (rank >= 4) return "sprout";
  return "submerge";
}

function activeAudioProvider() {
  return AUDIO_PROVIDERS[ACTIVE_AUDIO_PROVIDER] || AUDIO_PROVIDERS.music;
}

function futureAudioProviders() {
  return Object.values(AUDIO_PROVIDERS).filter((provider) => provider.status !== "active");
}

function buildMusicProfile(depthId = currentDepthId) {
  const state = getRunState();
  const depth = depths[depthId] || {};
  const provider = activeAudioProvider();
  const rank = depthRank(depthId);
  const depthNorm = clampNumber(rank / 28, 0, 1);
  const resonanceNorm = clampNumber(state.resonance / RESONANCE_MAX, 0, 1);
  const stabilityNorm = clampNumber(state.stability / STABILITY_MAX, 0, 1);
  const pressure = clampNumber((depthNorm * 0.62) + (resonanceNorm * 0.32) + ((1 - stabilityNorm) * 0.2), 0, 1);
  const gate = clampNumber((rank >= 24 ? 0.18 : 0) + resonanceNorm * 0.42 + state.marks * 0.035, 0, 0.9);
  const seed = ensureSeed();
  const variance = (numericHash(`${seed}|${depthId}|music`) % 9) - 4;
  const moveType = normalizeMoveType(state.lastMoveType) || "observe";
  const typeAudio = {
    dive: { density: 0.07, brightness: -0.02, silence: -0.04, bass: 0.08, harmonic: 0.02, gesture: "gate" },
    observe: { density: -0.02, brightness: 0.02, silence: 0.03, bass: -0.02, harmonic: 0.01, gesture: "trace" },
    tune: { density: -0.04, brightness: 0.04, silence: 0.04, bass: -0.03, harmonic: -0.02, gesture: "trace" },
    sync: { density: 0.06, brightness: 0.08, silence: -0.05, bass: 0.05, harmonic: 0.05, gesture: "gate" },
    retreat: { density: -0.06, brightness: -0.04, silence: 0.08, bass: -0.05, harmonic: -0.03, gesture: "none" }
  }[moveType];

  const ucm = {
    energy: Math.round(clampNumber(18 + depthNorm * 54 + resonanceNorm * 22 - stabilityNorm * 8 + variance, 4, 96)),
    wave: Math.round(clampNumber(26 + depthNorm * 28 + resonanceNorm * 26 + variance, 4, 96)),
    mind: Math.round(clampNumber(28 + depthNorm * 42 + resonanceNorm * 16 + state.marks * 2, 4, 96)),
    creation: Math.round(clampNumber(30 + depthNorm * 38 + resonanceNorm * 24 + pressure * 12, 4, 96)),
    void: Math.round(clampNumber(58 - depthNorm * 24 + (1 - stabilityNorm) * 28 + (rank === 0 ? 10 : 0), 4, 96)),
    circle: Math.round(clampNumber(48 + depthNorm * 22 + state.marks * 8 + gate * 20, 4, 96)),
    body: Math.round(clampNumber(24 + depthNorm * 34 + pressure * 24, 4, 96)),
    resource: Math.round(clampNumber(34 + depthNorm * 34 + resonanceNorm * 22 + state.entries * 0.7, 4, 96)),
    observer: Math.round(clampNumber(42 + depthNorm * 36 + resonanceNorm * 16 + (depthId === HUB_DEPTH ? 8 : 0), 4, 96))
  };

  const audio = {
    tempo: Math.round(clampNumber(48 + depthNorm * 72 + resonanceNorm * 24, 42, 148)),
    density: Number(clampNumber(0.08 + depthNorm * 0.46 + resonanceNorm * 0.22 + typeAudio.density, 0.05, 0.82).toFixed(3)),
    brightness: Number(clampNumber(0.18 + resonanceNorm * 0.34 + gate * 0.24 + typeAudio.brightness, 0.08, 0.9).toFixed(3)),
    silenceRate: Number(clampNumber(0.42 - depthNorm * 0.22 + (1 - stabilityNorm) * 0.16 + typeAudio.silence, 0.06, 0.58).toFixed(3)),
    bassWeight: Number(clampNumber(0.26 + pressure * 0.52 + typeAudio.bass, 0.12, 0.86).toFixed(3)),
    harmonicDeviation: Number(clampNumber(0.08 + resonanceNorm * 0.26 + depthNorm * 0.12 + typeAudio.harmonic, 0.02, 0.48).toFixed(3)),
    smoothing: Number(clampNumber(0.9 - pressure * 0.26, 0.52, 0.95).toFixed(3)),
    droneStability: Number(clampNumber(0.22 + stabilityNorm * 0.68, 0.12, 0.98).toFixed(3)),
    space: Number(clampNumber(0.16 + resonanceNorm * 0.44 + depthNorm * 0.24, 0.08, 0.92).toFixed(3))
  };

  return {
    name: `hazama_${String(depthId).replace(/[^a-zA-Z0-9_-]/g, "gate")}`,
    description: `Hazama auto-generated profile for ${depth.title || depthId}.`,
    provider: {
      id: provider.id,
      label: provider.label,
      repo: provider.repo,
      schema: provider.schema,
      status: provider.status
    },
    source: {
      repo: "QuietBriony/hazama",
      targetRepo: provider.repo,
      appVersion: APP_VERSION,
      depthId,
      depthTitle: depth.title || "",
      stage: musicStageForDepth(rank),
      rank,
      stability: state.stability,
      resonance: state.resonance,
      marks: state.marks,
      entries: state.entries,
      gateRunStatus: state.gateRunStatus,
      gateRunTurns: state.gateRunTurns,
      gateRunCharge: Math.round(state.gateRunCharge),
      lastGateAction: state.lastGateAction,
      rawInputStored: false
    },
    style: styleForMusicProfile(rank, state),
    ucm,
    audio,
    patterns: {
      drone: true,
      droneLayers: rank >= 18 ? 5 : rank >= 8 ? 4 : 3,
      densityBias: Number(clampNumber(depthNorm * 0.46 + state.marks * 0.05, 0, 0.9).toFixed(3)),
      glitch: rank >= 12 || resonanceNorm > 0.55 || state.marks >= 3,
      glitchRate: Number(clampNumber(0.02 + resonanceNorm * 0.16 + state.marks * 0.018, 0, 0.42).toFixed(3)),
      gesture: state.marks >= 3 ? "gate" : state.marks > 0 ? "trace" : typeAudio.gesture,
      jazzStabs: rank >= 10 && rank < 18,
      percussion: rank >= 18 || pressure > 0.62,
      gatePulse: rank >= 24 || state.marks > 0 || moveType === "sync"
    }
  };
}

function toBase64Url(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function cleanProfileName(name) {
  return String(name || "hazama_profile")
    .replace(/[^a-zA-Z0-9_.-]/g, "_")
    .slice(0, 80) || "hazama_profile";
}

function cleanShortText(text, fallback = "") {
  return String(text ?? fallback).replace(/[<>]/g, "").slice(0, 120);
}

function sanitizeMusicUcm(ucm = {}) {
  ucm = ucm && typeof ucm === "object" ? ucm : {};
  const keys = ["energy", "wave", "mind", "creation", "void", "circle", "body", "resource", "observer"];
  return Object.fromEntries(keys.map((key) => [key, Math.round(clampNumber(ucm[key], 0, 100))]));
}

function sanitizeMusicAudio(audio = {}) {
  audio = audio && typeof audio === "object" ? audio : {};
  return {
    tempo: Math.round(clampNumber(audio.tempo, 36, 180)),
    density: Number(clampNumber(audio.density, 0, 1).toFixed(3)),
    brightness: Number(clampNumber(audio.brightness, 0, 1).toFixed(3)),
    silenceRate: Number(clampNumber(audio.silenceRate, 0, 1).toFixed(3)),
    bassWeight: Number(clampNumber(audio.bassWeight, 0, 1).toFixed(3)),
    harmonicDeviation: Number(clampNumber(audio.harmonicDeviation, 0, 1).toFixed(3)),
    smoothing: Number(clampNumber(audio.smoothing, 0, 1).toFixed(3)),
    droneStability: Number(clampNumber(audio.droneStability, 0, 1).toFixed(3)),
    space: Number(clampNumber(audio.space, 0, 1).toFixed(3))
  };
}

function sanitizeMusicPatterns(patterns = {}) {
  patterns = patterns && typeof patterns === "object" ? patterns : {};
  const gesture = ["none", "trace", "gate"].includes(patterns.gesture) ? patterns.gesture : "none";
  return {
    drone: Boolean(patterns.drone),
    droneLayers: Math.round(clampNumber(patterns.droneLayers, 1, 8)),
    densityBias: Number(clampNumber(patterns.densityBias, 0, 1).toFixed(3)),
    glitch: Boolean(patterns.glitch),
    glitchRate: Number(clampNumber(patterns.glitchRate, 0, 1).toFixed(3)),
    gesture,
    jazzStabs: Boolean(patterns.jazzStabs),
    percussion: Boolean(patterns.percussion),
    gatePulse: Boolean(patterns.gatePulse)
  };
}

function sanitizeMusicSource(source = {}) {
  source = source && typeof source === "object" ? source : {};
  return {
    repo: "QuietBriony/hazama",
    targetRepo: "QuietBriony/Music",
    appVersion: APP_VERSION,
    depthId: cleanShortText(source.depthId || currentDepthId, DEFAULT_START),
    depthTitle: cleanShortText(source.depthTitle || depths[currentDepthId]?.title || ""),
    stage: cleanShortText(source.stage || musicStageForDepth(depthRank(currentDepthId)), "submerge"),
    rank: Math.round(clampNumber(source.rank ?? depthRank(currentDepthId), 0, 28)),
    stability: Math.round(clampNumber(source.stability ?? getRunState().stability, 0, STABILITY_MAX)),
    resonance: Math.round(clampNumber(source.resonance ?? getRunState().resonance, 0, RESONANCE_MAX)),
    marks: Math.round(clampNumber(source.marks ?? getRunState().marks, 0, 99)),
    entries: Math.max(0, Math.round(Number(source.entries ?? getRunState().entries) || 0)),
    gateRunStatus: ["running", "won", "lost"].includes(source.gateRunStatus) ? source.gateRunStatus : getRunState().gateRunStatus,
    gateRunTurns: Math.max(0, Math.round(Number(source.gateRunTurns ?? getRunState().gateRunTurns) || 0)),
    gateRunCharge: Math.round(clampNumber(source.gateRunCharge ?? getRunState().gateRunCharge, 0, GATE_RUN_MAX_CHARGE)),
    lastGateAction: cleanShortText(source.lastGateAction || getRunState().lastGateAction || ""),
    rawInputStored: false
  };
}

function sanitizeMusicProfile(profile = {}) {
  profile = profile && typeof profile === "object" ? profile : {};
  const source = sanitizeMusicSource(profile.source);
  return {
    name: cleanProfileName(profile.name || `hazama_${source.depthId}`),
    style: cleanShortText(profile.style || "ambient", "ambient"),
    source,
    ucm: sanitizeMusicUcm(profile.ucm),
    audio: sanitizeMusicAudio(profile.audio),
    patterns: sanitizeMusicPatterns(profile.patterns)
  };
}

function createMusicPayload(profile = buildMusicProfile()) {
  const provider = activeAudioProvider();
  return {
    type: "hazama-profile",
    version: 1,
    provider: provider.id,
    profile: sanitizeMusicProfile(profile)
  };
}

function makeMusicLaunchUrl(profileOrPayload, mode = "production") {
  const provider = activeAudioProvider();
  const payload = profileOrPayload?.type === "hazama-profile"
    ? profileOrPayload
    : createMusicPayload(profileOrPayload);
  const baseUrl = mode === "local" ? provider.localUrl : provider.url;
  return `${baseUrl}#hazama=${toBase64Url(JSON.stringify(payload))}`;
}

function audioGateStage() {
  if (MusicFeedbackState.connected) {
    return MusicFeedbackState.chapterLabel || MusicFeedbackState.chapter || "MUSIC";
  }
  return lastMusicPayload?.profile?.source?.stage || buildMusicProfile(currentDepthId).source.stage;
}

function isLocalDevHost() {
  return ["127.0.0.1", "localhost", "::1", "[::1]"].includes(location.hostname);
}

function isAllowedMusicFeedbackOrigin(origin) {
  return typeof origin === "string" && MUSIC_FEEDBACK_ALLOWED_ORIGINS.has(origin);
}

function safeFeedbackNumber(value, min = 0, max = 1) {
  return clampNumber(Number(value), min, max);
}

function sanitizeFeedbackMap(source, keys) {
  const map = source && typeof source === "object" ? source : {};
  return Object.fromEntries(keys.map((key) => [key, Number(safeFeedbackNumber(map[key], 0, 1).toFixed(3))]));
}

function musicFeedbackVisual(runtime) {
  const chapter = String(runtime?.albumArc?.chapter || "").toLowerCase();
  const acid = safeFeedbackNumber(runtime?.acid?.performance, 0, 1);
  const genre = runtime?.color?.genre || {};
  const gradient = runtime?.color?.gradient || {};
  if (chapter === "acid" || acid > 0.42) return "acid";
  if (chapter === "broken" || safeFeedbackNumber(gradient.micro, 0, 1) > 0.58) return "broken";
  if (chapter === "ghost" || safeFeedbackNumber(genre.pressure, 0, 1) > 0.48) return "ghost";
  if (chapter === "memory" || safeFeedbackNumber(gradient.memory, 0, 1) > 0.54) return "memory";
  if (chapter === "exhale" || safeFeedbackNumber(gradient.chrome, 0, 1) > 0.58) return "exhale";
  return "haze";
}

function musicFeedbackStatusText() {
  const bpm = MusicFeedbackState.bpm ? `BPM ${MusicFeedbackState.bpm}` : "BPM --";
  const acid = MusicFeedbackState.acid > 0.42 ? "ACID" : MusicFeedbackState.acid > 0.12 ? "acid-warm" : "soft";
  return `${bpm} / ${acid}`;
}

function applyMusicFeedbackVisual() {
  const root = document.documentElement;
  if (!root) return;
  const state = MusicFeedbackState;
  const genre = state.genre || {};
  const gradient = state.gradient || {};
  root.dataset.hzMusicFeedback = state.connected ? "connected" : "idle";
  root.dataset.hzMusicChapter = state.chapter ? state.chapter.toLowerCase() : "";
  root.dataset.hzMusicVisual = state.visual || "idle";
  root.dataset.hzMusicAcid = state.acid > 0.42 ? "hot" : state.acid > 0.12 ? "warm" : "idle";
  root.style.setProperty("--hz-music-acid", state.acid.toFixed(3));
  root.style.setProperty("--hz-music-ambient", safeFeedbackNumber(genre.ambient, 0, 1).toFixed(3));
  root.style.setProperty("--hz-music-micro", safeFeedbackNumber(gradient.micro, 0, 1).toFixed(3));
  root.style.setProperty("--hz-music-ghost", safeFeedbackNumber(gradient.ghost, 0, 1).toFixed(3));
  root.style.setProperty("--hz-music-chrome", safeFeedbackNumber(gradient.chrome, 0, 1).toFixed(3));
}

function scheduleMusicFeedbackLostCheck() {
  if (MusicFeedbackState.lostTimer) window.clearTimeout(MusicFeedbackState.lostTimer);
  MusicFeedbackState.lostTimer = window.setTimeout(() => {
    if (!MusicFeedbackState.connected) return;
    if (Date.now() - MusicFeedbackState.lastAt < 13000) {
      scheduleMusicFeedbackLostCheck();
      return;
    }
    MusicFeedbackState.connected = false;
    MusicFeedbackState.playing = false;
    MusicFeedbackState.visual = "idle";
    applyMusicFeedbackVisual();
    if (musicBridgePhase === "LISTENING") setMusicBridgeStatus("feedback idle", "IDLE");
  }, 14000);
}

function applyMusicRuntimeFeedback(payload) {
  if (!payload || typeof payload !== "object") return false;
  if (payload.type !== "music-runtime-feedback" || payload.version !== 1 || payload.provider !== "music") return false;
  if (payload.target && payload.target !== "hazama") return false;
  const runtime = payload.runtime && typeof payload.runtime === "object" ? payload.runtime : {};

  MusicFeedbackState.connected = true;
  MusicFeedbackState.lastAt = Date.now();
  MusicFeedbackState.playing = runtime.playing === true;
  MusicFeedbackState.chapter = cleanShortText(runtime.albumArc?.chapter || "", "");
  MusicFeedbackState.chapterLabel = cleanShortText(runtime.albumArc?.label || MusicFeedbackState.chapter || "", "");
  MusicFeedbackState.bpm = Math.round(clampNumber(runtime.bpm, 0, 220));
  MusicFeedbackState.acid = safeFeedbackNumber(runtime.acid?.performance, 0, 1);
  MusicFeedbackState.genre = sanitizeFeedbackMap(runtime.color?.genre, ["ambient", "idm", "techno", "pressure"]);
  MusicFeedbackState.gradient = sanitizeFeedbackMap(runtime.color?.gradient, ["haze", "memory", "micro", "ghost", "chrome", "organic"]);
  MusicFeedbackState.families = sanitizeFeedbackMap(runtime.color?.families, ["hazeBed", "chromeHymn", "memoryRefrain", "coldPulse", "ghostBody", "acidBiyon", "sub808", "reedBuzz"]);
  MusicFeedbackState.visual = musicFeedbackVisual(runtime);
  MusicFeedbackState.eventKind = cleanShortText(runtime.event?.kind || "", "");

  applyMusicFeedbackVisual();
  setMusicBridgeStatus(musicFeedbackStatusText(), MusicFeedbackState.playing ? "LISTENING" : "READY");
  scheduleMusicFeedbackLostCheck();
  return true;
}

function handleMusicRuntimeFeedbackMessage(event) {
  if (!isAllowedMusicFeedbackOrigin(event.origin)) return;
  const data = event && event.data;
  if (!data || typeof data !== "object" || data.type !== "music-runtime-feedback") return;
  applyMusicRuntimeFeedback(data);
}

function setupMusicFeedbackReceiver() {
  window.addEventListener("message", handleMusicRuntimeFeedbackMessage);
}

function setMusicBridgeStatus(text = "", phase = "") {
  if (MusicFeedbackState.connected && phase === "synced") phase = "LISTENING";
  if (phase) musicBridgePhase = phase;
  const gate = document.querySelector(".hz-audio-gate");
  const status = $("audio-gate-status") || $("music-profile-status");
  const phaseEl = $("audio-gate-phase");
  const stageEl = $("audio-gate-stage");
  const detail = text ? ` / ${text}` : "";
  if (gate) {
    gate.dataset.audioPhase = musicBridgePhase;
    gate.setAttribute("aria-hidden", musicBridgePhase === "synced" && !MusicFeedbackState.connected ? "true" : "false");
  }
  if (phaseEl) phaseEl.textContent = musicBridgePhase;
  if (stageEl) stageEl.textContent = audioGateStage();
  if (status) status.textContent = `${musicBridgePhase} / ${audioGateStage()}${detail}`;
}

function musicTargetOrigin(mode = "production") {
  const provider = activeAudioProvider();
  return mode === "local" ? provider.localOrigin : provider.origin;
}

function postMusicPayload(mode = "production", payload = lastMusicPayload) {
  const target = musicBridgeWindows[mode];
  if (!target || !payload) return false;
  if (target.closed) {
    musicBridgeWindows[mode] = null;
    return false;
  }
  try {
    target.postMessage(payload, musicTargetOrigin(mode));
    return true;
  } catch (error) {
    console.warn("[Hazama] Music bridge postMessage failed:", error);
    return false;
  }
}

function syncMusicBridge(profile = buildMusicProfile()) {
  lastMusicPayload = createMusicPayload(profile);
  const productionSent = postMusicPayload("production", lastMusicPayload);
  const localSent = postMusicPayload("local", lastMusicPayload);
  if ((productionSent || localSent) && musicBridgePhase !== "pending") {
    setMusicBridgeStatus("profile sent", "synced");
  } else if (!(productionSent || localSent) && musicBridgePhase === "synced") {
    setMusicBridgeStatus("tap START.HZM", "armed");
  }
  return { payload: lastMusicPayload, sent: productionSent || localSent };
}

function openMusicBridge(mode = "production") {
  const profile = buildMusicProfile();
  const payload = createMusicPayload(profile);
  lastMusicPayload = payload;
  const url = makeMusicLaunchUrl(payload, mode);
  const targetName = mode === "local" ? "hazama-music-local" : "hazama-music";
  const musicWindow = window.open(url, targetName);
  if (!musicWindow) return false;
  musicBridgeWindows[mode] = musicWindow;
  setMusicBridgeStatus("START.HZM in Music", "pending");
  window.setTimeout(() => postMusicPayload(mode, payload), 600);
  return true;
}

function isMusicLaunchTarget(target) {
  return Boolean(target?.closest?.(".hz-audio-gate, #music-open-provider, #music-open-local"));
}

function attemptMusicAutoStart(ev) {
  if (musicAutoStartDone) return;
  if (isMusicLaunchTarget(ev?.target || document.activeElement)) return;
  musicAutoStartDone = true;
  const synced = syncMusicBridge();
  if (synced.sent) {
    setMusicBridgeStatus("profile sent", "synced");
    return;
  }
  const opened = openMusicBridge("production");
  setMusicBridgeStatus(opened ? "START.HZM in Music" : "blocked / tap AUDIO.GATE", opened ? "pending" : "blocked");
}

function installMusicAutoStart() {
  if (musicAutoStartInstalled) return;
  musicAutoStartInstalled = true;
  setMusicBridgeStatus("first tap opens Music", "armed");
  window.addEventListener("pointerdown", attemptMusicAutoStart, { once: true, capture: true, passive: true });
  window.addEventListener("keydown", attemptMusicAutoStart, { once: true, capture: true });
  window.addEventListener("focus", () => {
    if (musicBridgePhase !== "pending") return;
    const synced = syncMusicBridge();
    if (synced.sent) setMusicBridgeStatus("profile sent", "synced");
  });
}

function compactMusicProfileSummary(profile) {
  const u = profile.ucm;
  return `${profile.style} / E${u.energy} W${u.wave} V${u.void} C${u.circle}`;
}

function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  }

  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.left = "-9999px";
  document.body.appendChild(area);
  area.select();
  try {
    document.execCommand("copy");
    return Promise.resolve();
  } catch (error) {
    return Promise.reject(error);
  } finally {
    area.remove();
  }
}

function downloadMusicProfile(payload) {
  if (!payload || payload.type !== "hazama-profile") payload = createMusicPayload(payload?.profile || payload);
  const profile = payload.profile || sanitizeMusicProfile();
  const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${profile.name}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function bindMusicControls() {
  const setMusicStatus = (text, phase = "") => {
    setMusicBridgeStatus(text, phase);
  };

  const copyBtn = $("music-copy-profile");
  if (copyBtn) {
    copyBtn.addEventListener("click", async () => {
      const payload = syncMusicBridge().payload;
      try {
        await copyText(JSON.stringify(payload, null, 2));
        setMusicStatus("payload copied");
      } catch (error) {
        console.warn("[Hazama] music profile copy failed:", error);
        setMusicStatus("copy failed");
      }
    });
  }

  const downloadBtn = $("music-download-profile");
  if (downloadBtn) {
    downloadBtn.addEventListener("click", () => {
      downloadMusicProfile(syncMusicBridge().payload);
      setMusicStatus("payload saved");
    });
  }

  const openLink = $("music-open-provider");
  if (openLink) {
    openLink.addEventListener("click", (ev) => {
      ev.preventDefault();
      const opened = openMusicBridge("production");
      musicAutoStartDone = musicAutoStartDone || opened;
      setMusicStatus(opened ? "START.HZM in Music" : "popup blocked", opened ? "pending" : "blocked");
    });
  }

  const localLink = $("music-open-local");
  if (localLink) {
    localLink.addEventListener("click", (ev) => {
      ev.preventDefault();
      const opened = openMusicBridge("local");
      musicAutoStartDone = musicAutoStartDone || opened;
      setMusicStatus(opened ? "local START.HZM" : "popup blocked", opened ? "pending" : "blocked");
    });
  }
}

function applyRunTransition(fromId, toId, moveKind = "choice", explicitType = "") {
  const state = getRunState();

  if (!fromId || fromId === toId) {
    syncRunDepth(toId);
    runLog = "";
    return toId;
  }

  if (toId === OMEGA_DEPTH && !canEnterOmega(state)) {
    runLog = `Ω LOCK: Gate Runを${GATE_RUN_MAX_CHARGE}%まで開くと入れます。`;
    return depths[HUB_DEPTH] ? HUB_DEPTH : fromId;
  }

  const preview = transitionPreview(fromId, toId, moveKind, explicitType);
  const nextRank = depthRank(toId);
  const previousBest = state.bestRank;
  const markGain = countMilestonesCrossed(previousBest, nextRank);
  const gateDelta = Math.round(Number(preview.gateDelta) || 0);
  let targetId = toId;

  state.steps += 1;
  state.stability = clampNumber(state.stability + preview.stabilityDelta, 0, STABILITY_MAX);
  state.resonance = clampNumber(state.resonance + preview.resonanceDelta, 0, RESONANCE_MAX);
  state.bestRank = Math.max(previousBest, nextRank);
  state.marks = clampNumber(state.marks + markGain, 0, 99);
  state.gateRunCharge = clampNumber(state.gateRunCharge + gateDelta, 0, GATE_RUN_MAX_CHARGE);
  state.lastMoveType = preview.moveType;

  const notes = [
    `type ${MOVE_TYPE_LABELS[preview.moveType] || preview.moveType}`,
    `安定 ${signedNumber(preview.stabilityDelta)}`,
    `共鳴 ${signedNumber(preview.resonanceDelta)}`,
    `gate ${signedNumber(gateDelta)}`
  ];
  if (markGain > 0) notes.push(`しるし +${markGain}`);

  if (state.stability <= 0 && toId !== HUB_DEPTH && toId !== DEFAULT_START) {
    targetId = depths[HUB_DEPTH] ? HUB_DEPTH : DEFAULT_START;
    state.gateRunStatus = "lost";
    state.gateRunOutcomeAt = Date.now();
    state.stability = 24;
    state.resonance = clampNumber(state.resonance - 6, 0, RESONANCE_MAX);
    state.gateRunCharge = clampNumber(Math.min(state.gateRunCharge, 72), 0, GATE_RUN_MAX_CHARGE);
    notes.push("COLLAPSED: HUBへ退避");
  } else if (state.gateRunStatus === "running" && state.gateRunCharge >= GATE_RUN_MAX_CHARGE) {
    state.gateRunStatus = "won";
    state.gateRunOutcomeAt = Date.now();
    notes.push("GATE OPEN");
  }

  state.lastDepthId = targetId;
  saveRunState();
  runLog = `${notes.join(" / ")}。`;
  return targetId;
}

function calculateCoreReward(text, seed, depthId) {
  const chars = Array.from(text);
  const uniqueChars = new Set(chars).size;
  const length = chars.length;
  const h = numericHash(`${seed}|${depthId}|reward|${hashText(text)}`);
  const compactness = length <= 12 ? 2 : length <= 36 ? 5 : 3;

  return {
    stabilityGain: 6 + (h % 5) + Math.min(6, Math.ceil(uniqueChars / 5)),
    resonanceGain: compactness + ((h >> 4) % 4) + Math.min(4, Math.floor(depthRank(depthId) / 8)),
    markGain: length >= 10 && length <= 48 && h % 11 === 0 ? 1 : 0
  };
}

function applyCoreReward(reward) {
  const state = getRunState();
  const rawResonance = state.resonance + reward.resonanceGain;
  let markGain = reward.markGain;

  state.entries += 1;
  state.stability = clampNumber(state.stability + reward.stabilityGain, 0, STABILITY_MAX);

  if (rawResonance >= RESONANCE_MAX) {
    state.resonance = 64 + (rawResonance % 9);
    markGain += 1;
  } else {
    state.resonance = clampNumber(rawResonance, 0, RESONANCE_MAX);
  }

  state.marks = clampNumber(state.marks + markGain, 0, 99);
  saveRunState();

  const notes = [
    `調律: 安定 +${reward.stabilityGain}`,
    `共鳴 +${reward.resonanceGain}`
  ];
  if (markGain > 0) notes.push(`しるし +${markGain}`);
  runLog = `${notes.join(" / ")}。`;
  syncVisualMotion(currentDepthId);
  refreshRunPanel();
  return runLog;
}

const GATE_RUN_ACTIONS = [
  {
    id: "dive",
    title: "潜る",
    meta: "深度圧を受けて、ゲート開度を強く進める。"
  },
  {
    id: "observe",
    title: "観測",
    meta: "危険を抑えながら、次の形を読む。"
  },
  {
    id: "tune",
    title: "調律",
    meta: "安定と共鳴を整えて、崩落を遠ざける。"
  },
  {
    id: "sync",
    title: "同期",
    meta: "共鳴やしるしを使って、ゲートを一気に合わせる。"
  },
  {
    id: "retreat",
    title: "退避",
    meta: "HUBへ戻り、安定を回復して立て直す。"
  }
];

function gateRunStatusLabel(state = getRunState()) {
  if (state.gateRunStatus === "won") return "GATE OPEN";
  if (state.gateRunStatus === "lost") return "COLLAPSED";
  if (state.gateRunCharge >= 82) return "FINAL ALIGN";
  if (state.stability < 28) return "LOW STABILITY";
  return "RUNNING";
}

function gateRunActionPreview(actionId) {
  const state = getRunState();
  const rank = depthRank(currentDepthId);
  const gi = buildGateIntelligence(currentDepthId);
  const risk = gi.risk;
  const bonus = numericHash(`${ensureSeed()}|${currentDepthId}|${state.gateRunTurns}|${actionId}`) % 4;
  const closed = state.gateRunStatus !== "running" && actionId !== "retreat";
  const common = { disabled: navigationLocked || closed, result: "", title: "" };

  if (actionId === "dive") {
    const cost = 8 + Math.ceil(risk / 18);
    const charge = 10 + Math.floor(rank / 4) + bonus;
    return {
      ...common,
      result: `gate +${charge} / 安定 -${cost}`,
      title: "深く潜って、ゲートの輪郭を押し広げる。"
    };
  }

  if (actionId === "observe") {
    const charge = 4 + bonus;
    return {
      ...common,
      result: `gate +${charge} / 安定 +3`,
      title: "観測線を増やし、無理なく開度を進める。"
    };
  }

  if (actionId === "tune") {
    const charge = 7 + Math.floor(state.resonance / 24) + bonus;
    return {
      ...common,
      result: `gate +${charge} / 安定 +7`,
      title: "位相を整え、次の同期に耐える土台を作る。"
    };
  }

  if (actionId === "sync") {
    const enough = state.resonance >= 16 || state.marks > 0 || state.gateRunCharge >= 82;
    const charge = enough ? 18 + Math.min(10, state.marks * 3) + bonus : 4 + bonus;
    return {
      ...common,
      disabled: common.disabled,
      result: enough ? `gate +${charge} / 共鳴 -12` : `gate +${charge} / 同期不足`,
      title: enough ? "共鳴を束ねて、扉へ直接接続する。" : "共鳴かしるしが薄い。小さな同期だけ通る。"
    };
  }

  return {
    ...common,
    disabled: navigationLocked,
    result: "安定 +18 / HUB",
    title: state.gateRunStatus === "running"
      ? "戻れるうちに戻り、走行を継続する。"
      : "崩落/達成後の記録を閉じ、次の走行を起こす。"
  };
}

function resetGateRunState(state) {
  state.gateRunStatus = "running";
  state.gateRunTurns = 0;
  state.gateRunCharge = 0;
  state.lastGateAction = "";
  state.lastGateResult = "";
  state.gateRunOutcomeAt = 0;
}

function resolveGateRunOutcome(state, notes) {
  let targetDepthId = null;

  if (state.stability <= 0) {
    state.gateRunStatus = "lost";
    state.gateRunOutcomeAt = Date.now();
    state.stability = Math.max(24, state.stability);
    state.resonance = clampNumber(state.resonance - 8, 0, RESONANCE_MAX);
    state.gateRunCharge = clampNumber(Math.min(state.gateRunCharge, 72), 0, GATE_RUN_MAX_CHARGE);
    targetDepthId = depths[HUB_DEPTH] ? HUB_DEPTH : DEFAULT_START;
    notes.push("崩落。HUBへ退避");
  } else if (state.gateRunCharge >= GATE_RUN_MAX_CHARGE) {
    state.gateRunStatus = "won";
    state.gateRunCharge = GATE_RUN_MAX_CHARGE;
    state.gateRunOutcomeAt = Date.now();
    notes.push("GATE OPEN");
  } else if (state.gateRunTurns >= GATE_RUN_TURN_LIMIT) {
    state.gateRunStatus = "lost";
    state.gateRunOutcomeAt = Date.now();
    state.stability = Math.max(24, state.stability);
    state.resonance = clampNumber(state.resonance - 8, 0, RESONANCE_MAX);
    state.gateRunCharge = clampNumber(Math.min(state.gateRunCharge, 72), 0, GATE_RUN_MAX_CHARGE);
    targetDepthId = depths[HUB_DEPTH] ? HUB_DEPTH : DEFAULT_START;
    notes.push("時間切れ。HUBへ退避");
  }

  return targetDepthId;
}

function applyGateRunAction(actionId) {
  if (navigationLocked) return null;

  const state = getRunState();
  const action = GATE_RUN_ACTIONS.find((item) => item.id === actionId);
  if (!action) return null;

  const preview = gateRunActionPreview(actionId);
  if (preview.disabled) {
    runLog = "Gate Runは今は動かせません。沈黙が解けるのを待ってください。";
    refreshRunPanel();
    return null;
  }

  const rank = depthRank(currentDepthId);
  const risk = buildGateIntelligence(currentDepthId).risk;
  const bonus = numericHash(`${ensureSeed()}|${currentDepthId}|${state.gateRunTurns}|${actionId}`) % 4;
  const notes = [`${action.title}: ${preview.result}`];
  let chargeDelta = 0;
  let stabilityDelta = 0;
  let resonanceDelta = 0;
  let marksDelta = 0;
  let targetDepthId = null;

  if (actionId === "retreat") {
    if (state.gateRunStatus !== "running") resetGateRunState(state);
    stabilityDelta = 18;
    resonanceDelta = -6;
    chargeDelta = -4;
    targetDepthId = currentDepthId !== HUB_DEPTH && depths[HUB_DEPTH] ? HUB_DEPTH : null;
  } else if (actionId === "dive") {
    stabilityDelta = -(8 + Math.ceil(risk / 18));
    resonanceDelta = 4 + Math.min(4, Math.ceil(rank / 9));
    chargeDelta = 10 + Math.floor(rank / 4) + bonus;
  } else if (actionId === "observe") {
    stabilityDelta = 3;
    resonanceDelta = 2;
    chargeDelta = 4 + bonus;
  } else if (actionId === "tune") {
    stabilityDelta = 7;
    resonanceDelta = 5;
    chargeDelta = 7 + Math.floor(state.resonance / 24) + bonus;
  } else if (actionId === "sync") {
    const enough = state.resonance >= 16 || state.marks > 0 || state.gateRunCharge >= 82;
    if (enough) {
      resonanceDelta = -12;
      marksDelta = state.marks > 0 ? -1 : 0;
      chargeDelta = 18 + Math.min(10, state.marks * 3) + bonus;
    } else {
      stabilityDelta = -3;
      resonanceDelta = 1;
      chargeDelta = 4 + bonus;
    }
  }

  state.gateRunTurns += 1;
  state.stability = clampNumber(state.stability + stabilityDelta, 0, STABILITY_MAX);
  state.resonance = clampNumber(state.resonance + resonanceDelta, 0, RESONANCE_MAX);
  state.marks = clampNumber(state.marks + marksDelta, 0, 99);
  state.gateRunCharge = clampNumber(state.gateRunCharge + chargeDelta, 0, GATE_RUN_MAX_CHARGE);
  state.lastGateAction = actionId;
  state.lastMoveType = actionId;
  state.lastGateResult = notes.join(" / ");

  const outcomeTarget = resolveGateRunOutcome(state, notes);
  if (outcomeTarget) targetDepthId = outcomeTarget;

  saveRunState();
  runLog = notes.join(" / ");
  syncVisualMotion(targetDepthId || currentDepthId);
  return targetDepthId;
}

function renderGateRunTrack(state) {
  const pct = clampNumber(state.gateRunCharge, 0, GATE_RUN_MAX_CHARGE);
  const marker = clampNumber((depthRank(currentDepthId) / 28) * 100, 0, 100);
  return `
    <div class="hz-gate-run-track" aria-label="Gate Run charge">
      <span class="hz-gate-run-fill" style="width: ${pct}%"></span>
      <span class="hz-gate-run-marker" style="left: ${marker}%"></span>
    </div>
  `;
}

function renderGateRunPanelMarkup() {
  const state = getRunState();
  const statusClass = state.gateRunStatus === "won" ? "hz-gate-win" : state.gateRunStatus === "lost" ? "hz-gate-loss" : "";
  const status = statusClass
    ? `<span class="${statusClass}">${escapeHtml(gateRunStatusLabel(state))}</span>`
    : `<span>${escapeHtml(gateRunStatusLabel(state))}</span>`;
  const actionButtons = GATE_RUN_ACTIONS.map((action) => {
    const preview = gateRunActionPreview(action.id);
    return `
      <button class="hz-gate-action" type="button" data-gate-action="${escapeHtml(action.id)}" title="${escapeHtml(preview.title)}"${preview.disabled ? " disabled" : ""}>
        <span class="hz-gate-action-title">${escapeHtml(action.title)}</span>
        <span class="hz-gate-action-meta">${escapeHtml(action.meta)}</span>
        <span class="hz-gate-action-result">${escapeHtml(preview.result)}</span>
      </button>
    `;
  }).join("");

  return `
    <section class="hz-gate-run-panel" aria-label="Gate Run">
      <div class="hz-gate-run-head">
        <span>Gate Run</span>
        <span class="hz-gate-run-status">${status} / turn ${state.gateRunTurns} / ${Math.round(state.gateRunCharge)}%</span>
      </div>
      ${renderGateRunTrack(state)}
      <div class="hz-gate-run-actions">
        ${actionButtons}
      </div>
    </section>
  `;
}

function bindGateRunControls() {
  for (const btn of document.querySelectorAll("[data-gate-action]")) {
    btn.addEventListener("click", () => {
      const actionId = btn.getAttribute("data-gate-action");
      const targetDepthId = applyGateRunAction(actionId);
      if (targetDepthId && depths[targetDepthId] && targetDepthId !== currentDepthId) {
        renderDepth(targetDepthId, { recordHistory: false, applyRun: false });
        return;
      }
      renderDepth(currentDepthId, { recordHistory: false, applyRun: false });
      setStatus(`Gate Run: ${actionId}`);
    });
  }
}

function renderGauge(label, value, max, toneClass) {
  const pct = clampNumber((value / max) * 100, 0, 100);
  return `
    <div class="hz-gauge ${toneClass}">
      <div class="hz-gauge-row">
        <span>${escapeHtml(label)}</span>
        <b>${Math.round(value)}</b>
      </div>
      <div class="hz-gauge-track" aria-hidden="true">
        <span style="width: ${pct}%"></span>
      </div>
    </div>
  `;
}

function renderGiMeter(label, value, className) {
  const pct = clampNumber(value, 0, 100);
  return `
    <div class="hz-gi-meter ${className}">
      <div class="hz-gi-meter-row">
        <span>${escapeHtml(label)}</span>
        <b>${Math.round(pct)}</b>
      </div>
      <div class="hz-gi-meter-track" aria-hidden="true">
        <span style="width: ${pct}%"></span>
      </div>
    </div>
  `;
}

function renderGateIntelligenceMarkup() {
  const gi = buildGateIntelligence(currentDepthId);
  return `
    <section class="hz-gi-panel" aria-label="Gate Intelligence">
      <div class="hz-gi-head">
        <span>Gate Intelligence</span>
        <b>${escapeHtml(gi.code)} / ${escapeHtml(gi.phase)}</b>
      </div>
      <div class="hz-gi-objective">${escapeHtml(gi.objective)}</div>
      <div class="hz-gi-route">${escapeHtml(gi.route)}</div>
      <div class="hz-gi-meters">
        ${renderGiMeter("gate", gi.gateCharge, "hz-gi-gate")}
        ${renderGiMeter(`risk ${gi.riskLabel}`, gi.risk, "hz-gi-risk")}
      </div>
      <div class="hz-gi-signal">${escapeHtml(gi.signal)}</div>
    </section>
  `;
}

function renderAudioGateMarkup(profile, launchUrl, localLaunchUrl) {
  const devTools = isLocalDevHost()
    ? `
      <details class="hz-audio-dev">
        <summary>dev</summary>
        <div class="hz-audio-dev-actions">
          <button id="music-copy-profile" class="hz-mini-btn" type="button">JSON</button>
          <button id="music-download-profile" class="hz-mini-btn" type="button">Save</button>
          <a id="music-open-local" class="hz-mini-link" href="${escapeHtml(localLaunchUrl)}" target="hazama-music-local">LOCAL</a>
        </div>
      </details>
    `
    : "";

  return `
    <div class="hz-audio-gate" data-audio-phase="${escapeHtml(musicBridgePhase)}" aria-label="Audio Gate" aria-hidden="${musicBridgePhase === "synced" ? "true" : "false"}">
      <div class="hz-audio-gate-row">
        <span class="hz-audio-gate-label">AUDIO.GATE</span>
        <span id="audio-gate-phase" class="hz-audio-gate-phase">${escapeHtml(musicBridgePhase)}</span>
        <span id="audio-gate-stage" class="hz-audio-gate-stage">${escapeHtml(profile.source.stage)}</span>
        <a id="music-open-provider" class="hz-audio-gate-link" href="${escapeHtml(launchUrl)}" target="hazama-music">START.HZM</a>
      </div>
      <div id="audio-gate-status" class="hz-audio-gate-status">${escapeHtml(`${musicBridgePhase} / ${profile.source.stage} / first tap opens Music`)}</div>
      ${devTools}
    </div>
  `;
}

function renderRunPanelMarkup() {
  const state = getRunState();
  const profile = buildMusicProfile(currentDepthId);
  const launchUrl = makeMusicLaunchUrl(profile);
  const localLaunchUrl = makeMusicLaunchUrl(profile, "local");
  const log = runLog ? `<div class="hz-run-log">${escapeHtml(runLog)}</div>` : "";
  return `
    <aside class="hz-run-panel" aria-label="位相調律">
      <div class="hz-run-head">
        <span>位相調律</span>
        <span>step ${state.steps}</span>
      </div>
      <div class="hz-gauge-grid">
        ${renderGauge("安定", state.stability, STABILITY_MAX, "hz-gauge-stability")}
        ${renderGauge("共鳴", state.resonance, RESONANCE_MAX, "hz-gauge-resonance")}
      </div>
      <div class="hz-run-stats">
        <span>しるし <b>${state.marks}</b></span>
        <span>最深 <b>${escapeHtml(depthRankLabel(state.bestRank))}</b></span>
        <span>返答 <b>${state.entries}</b></span>
      </div>
      ${log}
      ${renderGateRunPanelMarkup()}
      ${renderGateIntelligenceMarkup()}
      ${renderAudioGateMarkup(profile, launchUrl, localLaunchUrl)}
    </aside>
  `;
}

function refreshRunPanel() {
  const host = $("run-panel-host");
  if (host) host.innerHTML = renderRunPanelMarkup();
  bindGateRunControls();
  bindMusicControls();
  syncMusicBridge();
}

function ensureSeed() {
  const existing = safeLocalStorageGet(SEED_KEY);
  if (existing) return existing;

  const entropy = [
    APP_VERSION,
    Date.now(),
    Math.random(),
    navigator.userAgent,
    location.pathname
  ].join("|");
  const seed = hashText(entropy);
  safeLocalStorageSet(SEED_KEY, seed);
  return seed;
}

function loadProgress() {
  try {
    if (window.HazamaState && typeof window.HazamaState.loadProgress === "function") {
      const data = window.HazamaState.loadProgress();
      if (data && typeof data.nodeId === "string") return data;
    }
  } catch (_) {}

  try {
    const raw = safeLocalStorageGet(STATE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data && typeof data.currentDepthId === "string") {
      return { nodeId: data.currentDepthId, seed: data.seed || safeLocalStorageGet(SEED_KEY) };
    }
  } catch (_) {}
  return null;
}

function saveProgress() {
  const seed = ensureSeed();

  try {
    if (window.HazamaState && typeof window.HazamaState.saveProgress === "function") {
      window.HazamaState.saveProgress(currentDepthId, seed);
      return;
    }
  } catch (_) {}

  safeLocalStorageSet(STATE_KEY, JSON.stringify({
    version: APP_VERSION,
    currentDepthId,
    seed,
    ts: Date.now()
  }));
}

function clearProgress() {
  try {
    if (window.HazamaState && typeof window.HazamaState.clearProgress === "function") {
      window.HazamaState.clearProgress();
    }
  } catch (_) {}
  try {
    if (window.HazamaSeed && typeof window.HazamaSeed.clearSeed === "function") {
      window.HazamaSeed.clearSeed();
    }
  } catch (_) {}

  safeLocalStorageRemove(STATE_KEY);
  safeLocalStorageRemove(SEED_KEY);
  clearRunState();
}

function getPrimaryNext(depth) {
  const opts = Array.isArray(depth?.options) ? depth.options : [];
  const first = opts.find((o) => o && typeof o.next === "string" && depths[o.next]);
  return first ? first.next : null;
}

function questionForDepth(depth) {
  const title = depth?.title ? `「${depth.title}」` : "この深度";
  const prompts = [
    `${title}で、いま一番小さく動かせるものは何ですか。`,
    `${title}に立って、手放しても安全な言葉を一つだけ置いてください。`,
    `${title}の輪郭を、短い一文でなぞるなら何ですか。`,
    `${title}から戻れる余白を残すなら、何を選びますか。`
  ];
  return pick(prompts, numericHash(`${currentDepthId}|question`));
}

function makeShiftReply(text, seed, depthId) {
  const h = numericHash(`${seed}|${depthId}|${text}`);
  const lenses = ["輪郭", "余白", "速度", "距離", "静けさ", "重なり"];
  const moves = ["半歩だけ横へ置く", "名前を外して眺める", "薄い影として残す", "入口の手前に戻す", "別の呼吸に合わせる"];
  const anchors = ["深めなくていい", "戻れるままでいい", "急がなくていい", "選ばない余地も残していい"];
  return [
    "ズラし返答：",
    `${pick(lenses, h)}を${pick(moves, h >> 3)}。`,
    `${pick(anchors, h >> 6)}。`
  ].join("");
}

function pauseLengthMs(seed, depthId, text) {
  return 3000 + (numericHash(`${seed}|${depthId}|pause|${text}`) % 2001);
}

function setNavigationLocked(locked) {
  navigationLocked = locked;
  for (const btn of document.querySelectorAll(".hz-depth-option")) {
    btn.disabled = locked;
  }
}

function clearPause() {
  if (pauseTimer) {
    window.clearTimeout(pauseTimer);
    pauseTimer = null;
  }
  pendingNextDepthId = null;
  setNavigationLocked(false);
}

function renderCoreLoop(depth) {
  const form = $("core-form");
  const input = $("core-input");
  const response = $("core-response");
  const pause = $("core-pause");
  const nextBtn = $("core-next");

  if (!form || !input || !response || !pause || !nextBtn) return;

  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    clearPause();

    const text = String(input.value || "").trim().slice(0, CORE_MAX_INPUT);
    if (!text) {
      pause.textContent = "一言だけ置いてから、返答を受け取れます。";
      setStatus("入力待ち");
      return;
    }

    const seed = ensureSeed();
    const shifted = makeShiftReply(text, seed, currentDepthId);
    const reward = calculateCoreReward(text, seed, currentDepthId);
    const waitMs = pauseLengthMs(seed, currentDepthId, text);

    response.textContent = shifted;
    pause.textContent = "沈黙中… 呼吸を戻しています。";
    nextBtn.hidden = true;
    nextBtn.disabled = true;
    input.value = "";
    setNavigationLocked(true);
    setStatus(`沈黙中: ${Math.round(waitMs / 1000)}秒`);

    pauseTimer = window.setTimeout(() => {
      pauseTimer = null;
      const rewardMessage = applyCoreReward(reward);
      pendingNextDepthId = getPrimaryNext(depth);
      setNavigationLocked(false);
      response.textContent = `${shifted}\n${rewardMessage}`;
      pause.textContent = pendingNextDepthId
        ? "進めます。次へ進むか、ここに残るかを選べます。"
        : "ここで止まれます。必要なら最初へ戻れます。";
      if (pendingNextDepthId) {
        nextBtn.hidden = false;
        nextBtn.disabled = false;
      }
      setStatus(`OK: ${currentDepthId}`);
    }, waitMs);
  });

  nextBtn.addEventListener("click", () => {
    if (pendingNextDepthId) renderDepth(pendingNextDepthId, { moveKind: "core" });
  });
}

function addButton(parent, label, onClick, className = "hz-btn") {
  const btn = document.createElement("button");
  btn.className = className;
  btn.textContent = label;
  btn.onclick = onClick;
  parent.appendChild(btn);
  return btn;
}

function renderControls(optionsEl) {
  const controls = document.createElement("div");
  controls.className = "hz-controls";

  addButton(controls, "停止", () => {
    clearPause();
    const pause = $("core-pause");
    const nextBtn = $("core-next");
    if (pause) pause.textContent = "停止しました。ここから戻るか、別の選択肢へ移れます。";
    if (nextBtn) {
      nextBtn.hidden = true;
      nextBtn.disabled = true;
    }
    setStatus(`停止中: ${currentDepthId}`);
  });

  const backBtn = addButton(controls, "1ステップ戻る", () => {
    clearPause();
    const prev = historyStack.pop();
    if (prev && depths[prev]) renderDepth(prev, { recordHistory: false, moveKind: "back" });
  });
  backBtn.disabled = historyStack.length === 0;

  const homeTarget = (currentDepthId !== HUB_DEPTH && depths[HUB_DEPTH]) ? HUB_DEPTH : DEFAULT_START;
  addButton(controls, homeTarget === HUB_DEPTH ? "HUBへ戻る" : "最初へ戻る", () => {
    clearPause();
    renderDepth(homeTarget, { moveKind: "home" });
  });

  optionsEl.appendChild(controls);
}

function renderOptions(depth, optionsEl) {
  const opts = Array.isArray(depth.options) ? depth.options : [];
  if (opts.length === 0) {
    addButton(optionsEl, "最初へ戻る", () => {
      clearPause();
      renderDepth(DEFAULT_START, { moveKind: "home" });
    }, "hz-btn hz-depth-option");
    return;
  }

  for (const o of opts) {
    const next = o?.next;
    const gate = next ? gateForOption(currentDepthId, next, o) : { allowed: true, label: "", title: "", moveType: "" };
    const label = gate.label ? `${o?.text ?? "…"} / ${gate.label}` : (o?.text ?? "…");
    const btn = addButton(optionsEl, label, () => {
      if (navigationLocked) return;
      if (!next || !gate.allowed) return;
      clearPause();
      renderDepth(next, { moveKind: "choice", moveType: gate.moveType });
    }, "hz-btn hz-depth-option");
    btn.disabled = navigationLocked || !gate.allowed;
    btn.title = gate.title;
    if (!gate.allowed) btn.classList.add("hz-locked-option");
  }
}

function renderDepth(depthId, opts = {}) {
  let targetDepthId = depthId;
  if (targetDepthId === OMEGA_DEPTH && !canEnterOmega()) {
    runLog = `Ω LOCK: Gate Runを${GATE_RUN_MAX_CHARGE}%まで開くと入れます。`;
    targetDepthId = depths[HUB_DEPTH] ? HUB_DEPTH : DEFAULT_START;
  }
  let depth = depths[targetDepthId];
  if (!depth) {
    setStatus(`未知の深度ID: ${targetDepthId}`);
    const story = $("story");
    if (story) story.innerHTML = `<p class="hz-error">深度 <b>${escapeHtml(targetDepthId)}</b> が見つかりません。JSONの options.next を確認してください。</p>`;
    return;
  }

  clearPause();
  if (opts.applyRun !== false) {
    targetDepthId = applyRunTransition(currentDepthId, targetDepthId, opts.moveKind || "choice", opts.moveType || "");
    depth = depths[targetDepthId] || depth;
  } else {
    syncRunDepth(targetDepthId);
  }

  const shouldRecord = opts.recordHistory !== false;
  if (shouldRecord && currentDepthId && currentDepthId !== targetDepthId && depths[currentDepthId]) {
    historyStack.push(currentDepthId);
  }
  currentDepthId = targetDepthId;
  syncVisualMotion(currentDepthId);
  saveProgress();

  const storyEl = $("story");
  const optionsEl = $("options");

  if (!storyEl || !optionsEl) {
    console.error("Required elements missing: #story or #options");
    return;
  }

  const title = depth.title || "";
  const desc = depth.description || "";
  const paragraphs = Array.isArray(depth.story) ? depth.story : [];
  const theme = depth.theme || "";
  const question = questionForDepth(depth);

  storyEl.innerHTML = `
    <div id="run-panel-host">
      ${renderRunPanelMarkup()}
    </div>
    <div class="hz-block">
      <div class="hz-depth-title">${escapeHtml(title)}</div>
      ${desc ? `<div class="hz-depth-desc">${escapeHtml(desc)}</div>` : ""}
      ${theme ? `<div class="hz-depth-theme">${escapeHtml(theme)}</div>` : ""}
    </div>
    <div class="hz-block">
      ${paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join("")}
    </div>
    <div class="hz-block hz-core-loop">
      <div class="hz-depth-theme">問い</div>
      <p>${escapeHtml(question)}</p>
      <form id="core-form" class="hz-core-form">
        <input id="core-input" type="text" maxlength="${CORE_MAX_INPUT}" autocomplete="off" placeholder="短く一言だけ" />
        <button class="hz-btn" type="submit">返す</button>
      </form>
      <p id="core-response" class="hz-core-response" aria-live="polite"></p>
      <p id="core-pause" class="hz-core-pause" aria-live="polite"></p>
      <button id="core-next" class="hz-btn" type="button" hidden disabled>次深度へ</button>
    </div>
  `;

  optionsEl.innerHTML = "";
  renderControls(optionsEl);
  renderOptions(depth, optionsEl);
  renderCoreLoop(depth);
  bindGateRunControls();
  bindMusicControls();
  syncMusicBridge();
  installMusicAutoStart();

  setStatus(`OK: ${targetDepthId}`);
}

async function loadDepths() {
  setStatus("深度データを読み込み中…");
  const url = buildDepthsURL();

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json();
    if (!json || typeof json !== "object") throw new Error("JSON形式が不正です");

    depths = json;

    const saved = loadProgress();
    if (saved && depths[saved.nodeId]) currentDepthId = saved.nodeId;
    else if (depths[DEFAULT_START]) currentDepthId = DEFAULT_START;
    else {
      const keys = Object.keys(depths);
      currentDepthId = keys[0] || DEFAULT_START;
    }

    renderDepth(currentDepthId, { recordHistory: false, applyRun: false });
  } catch (e) {
    console.error("Error loading depths:", e);
    setStatus("深度データの読み込みに失敗");
    const story = $("story");
    const options = $("options");
    if (story) {
      story.innerHTML = `
        <p class="hz-error">深度データの読み込みに失敗しました。</p>
        <p class="hz-mono">URL: ${escapeHtml(url)}</p>
        <p class="hz-mono">Error: ${escapeHtml(e?.message || String(e))}</p>
      `;
    }
    if (options) {
      options.innerHTML = "";
      addButton(options, "再試行", () => loadDepths());
    }
  }
}

window.addEventListener("error", (ev) => {
  console.error("Uncaught error:", ev.error || ev.message);
  setStatus("起動エラー（console参照）");
});

window.addEventListener("unhandledrejection", (ev) => {
  console.error("Unhandled rejection:", ev.reason);
  setStatus("起動エラー（console参照）");
});

document.addEventListener("DOMContentLoaded", () => {
  const v = $("app-version");
  if (v) v.textContent = APP_VERSION;
  setupMusicFeedbackReceiver();
  applyMusicFeedbackVisual();

  const resetBtn = $("reset-progress");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      clearProgress();
      historyStack = [];
      currentDepthId = DEFAULT_START;
      renderDepth(currentDepthId, { recordHistory: false, applyRun: false });
    });
  }

  loadDepths();
});
