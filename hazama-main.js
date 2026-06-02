// Hazama main.js v2.40
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
// v2.15 lets the mandala dissolve full-bleed behind story depths.
// v2.16 makes choices read like clear actions and separates game hints from prose.
// v2.17 clarifies game state, rest actions, and Music connection wording.
// v2.18 hides Music as a background BGM companion with auto-follow resume.
// v2.19 reflects Music companion feedback state in BGM UI and atmosphere attrs.
// v2.20 finishes the first playable loop with tighter Gate Run signposting.
// v2.21 tightens Gate Run balance and limits repeated Breath Gate recovery.
// v2.22 shares Gate Run/Breath Gate mechanics with the balance smoke model.
// v2.23 follows Breath Gate collapse/timeout targets back to HUB in the browser.
// v2.24 makes sync readiness visible before players spend resonance on 合わせる.
// v2.25 makes retreat readiness visible before players lose a recoverable run.
// v2.26 makes A_reborn completion and the next HUB step explicit.
// v2.27 hardens Music window posting and adds browser loop smoke coverage.
// v2.28 locks Gate Run balance invariants and treats all won Ω entries as reward transitions.
// v2.29 adds a roguelike-style run map, tactical HUD, and event log.
// v2.30 simplifies the default HUD and makes the visual layer react like a game scene.
// v2.31 lifts the first action and Gate Run controls above secondary telemetry.
// v2.32 frames Breath Gate as optional rest and strengthens run outcomes.
// v2.33 makes the Music/BGM handoff explicit: Hazama opens Music in another tab, then START.HZM unlocks audio there.
// v2.34 adds the Music-stack-style PWA shell, install prompt, and service-worker update path.
// v2.35 adds a first-screen mission card so the opening action is unambiguous.
// v2.36 closes Ω on new loops and moves choices into one post-story flow panel.
// v2.37 adds same-screen generated BGM for mobile play while keeping external Music as a companion.
// v2.38 keeps the post-story flow focused with an always-visible next-action guide.
// v2.39 makes Gate Run feel more playful with a live pulse cue and recommended action highlight.

const APP_VERSION = "v2.40";
const GateRunModel = globalThis.HazamaGateRun || {};
const GATE_CONSTANTS = GateRunModel.constants || {};

const STATE_KEY = "hazama_state_v2";
const SEED_KEY = "hazama_seed";
const RUN_KEY = "hazama_run_v1";
const DEFAULT_START = "A_start";
const HUB_DEPTH = "HUB_NIGHT";
const OMEGA_DEPTH = "Ω";
const CORE_MAX_INPUT = 80;
const STABILITY_MAX = GATE_CONSTANTS.STABILITY_MAX || 100;
const RESONANCE_MAX = GATE_CONSTANTS.RESONANCE_MAX || 100;
const GATE_RUN_MAX_CHARGE = GATE_CONSTANTS.GATE_RUN_MAX_CHARGE || 100;
const GATE_RUN_TURN_LIMIT = GATE_CONSTANTS.GATE_RUN_TURN_LIMIT || 14;
const GATE_SYNC_READY_RESONANCE = GATE_CONSTANTS.GATE_SYNC_READY_RESONANCE || 18;
const GATE_SYNC_READY_CHARGE = GATE_CONSTANTS.GATE_SYNC_READY_CHARGE || 45;
const GATE_SYNC_MARK_CHARGE = GATE_CONSTANTS.GATE_SYNC_MARK_CHARGE || 35;
const DEPTH_GATE_STABILITY_RANK = 8;
const DEPTH_GATE_STABILITY_REQUIRED = 42;
const DEPTH_GATE_RESONANCE_RANK = 14;
const DEPTH_GATE_RESONANCE_REQUIRED = 8;
// 外殻ランク: ここを越えると「核へ降りる(没入)」⇄「浮上して帰る(帰還)」の二極が立ち上がる。
// G2(浮上ポール常設)・G5(サイレン的圧のclimax)・G3/G4(背景置換の深部)で共有する深度境界。
const OUTER_SHELL_RANK = 21;
const BREATH_HUB_STABILITY_CAP = GATE_CONSTANTS.BREATH_HUB_STABILITY_CAP || 94;
const BREATH_FIELD_STABILITY_CAP = GATE_CONSTANTS.BREATH_FIELD_STABILITY_CAP || 86;
const MILESTONE_RANKS = [8, 14, 20, 27];
const MOVE_TYPES = ["dive", "observe", "tune", "sync", "retreat"];
const MOVE_TYPE_LABELS = {
  dive: "深く進む",
  observe: "慎重に進む",
  tune: "整えて進む",
  sync: "扉に合わせる",
  retreat: "戻って整える"
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
let bgmFollowEnabled = true;
let bgmExpanded = false;
let deferredPwaInstallPrompt = null;
const InlineBgmState = {
  audioCtx: null,
  master: null,
  filter: null,
  drone: [],
  siren: null,
  pulseTimer: null,
  bridgeDestination: null,
  bridgeAudio: null,
  playing: false,
  route: "idle",
  params: null,
  step: 0,
  lastStatusAt: 0
};
const MUSIC_FEEDBACK_ALLOWED_ORIGINS = new Set([
  "https://quietbriony.github.io",
  "http://127.0.0.1:8095",
  "http://localhost:8095"
]);
const MusicFeedbackState = {
  connected: false,
  lastAt: 0,
  playing: false,
  auto: false,
  autoFollow: false,
  connectionState: "idle",
  controlAction: "",
  outputLevel: 0,
  hazamaStage: "",
  hazamaDepthId: "",
  chapter: "",
  chapterLabel: "",
  bpm: 0,
  acid: 0,
  genre: {},
  gradient: {},
  families: {},
  culture: "",
  proposal: "",
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

function stabilityMeta(value) {
  const rounded = Math.round(Number(value) || 0);
  if (rounded > 0) return `落ち着き +${rounded}`;
  if (rounded < 0) return `落ち着き ${rounded}`;
  return "落ち着き ±0";
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
    attunement: 0,
    collapseCount: 0,
    breathStreak: 0,
    lastBreathDepthId: "",
    lastBreathStep: 0,
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
    attunement: clampNumber(src.attunement ?? base.attunement, 0, 99),
    collapseCount: clampNumber(src.collapseCount ?? base.collapseCount, 0, 99),
    breathStreak: Math.max(0, Number(src.breathStreak) || 0),
    lastBreathDepthId: typeof src.lastBreathDepthId === "string" ? src.lastBreathDepthId.slice(0, 80) : base.lastBreathDepthId,
    lastBreathStep: Math.max(0, Number(src.lastBreathStep) || 0),
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
  // 認識ゲート(資格ゲート): Ωは「扉(charge=won)が開く」かつ「構造読みで認識(attunement)が合う」時だけ。
  // 反射・資源ゴリ押し・表層多用では開かない(INTEGRATION.md §5)。難易度は HazamaGateRun.tuning で可変。
  if (GateRunModel.omegaUnlocked) return GateRunModel.omegaUnlocked(state);
  return state.gateRunStatus === "won";
}

function canSyncGate(state = getRunState()) {
  if (GateRunModel.canSyncGate) return GateRunModel.canSyncGate(state);
  return (
    state.resonance >= GATE_SYNC_READY_RESONANCE &&
    state.gateRunCharge >= GATE_SYNC_READY_CHARGE
  ) || (
    state.marks > 0 &&
    state.gateRunCharge >= GATE_SYNC_MARK_CHARGE
  );
}

function gateRunModelContext(depthId = currentDepthId, extra = {}) {
  const gi = buildGateIntelligence(depthId);
  return {
    seed: ensureSeed(),
    depthId,
    currentDepthId: depthId,
    rank: depthRank(depthId),
    risk: gi.risk,
    hubDepthId: HUB_DEPTH,
    startDepthId: DEFAULT_START,
    hasHub: Boolean(depths[HUB_DEPTH]),
    navigationLocked,
    now: Date.now(),
    ...extra
  };
}

function resetBreathStreak(state = getRunState()) {
  state.breathStreak = 0;
  state.lastBreathDepthId = "";
  state.lastBreathStep = 0;
}

function recordGateCollapse(state = getRunState()) {
  state.collapseCount = clampNumber((Number(state.collapseCount) || 0) + 1, 0, 99);
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
  const typeLabel = MOVE_TYPE_LABELS[moveType] || "慎重に進む";

  if (moveKind === "back") {
    return {
      moveType,
      stabilityDelta: 8,
      resonanceDelta: -1,
      gateDelta: -1,
      label: `効果: ${typeLabel} / ${stabilityMeta(8)}`,
      title: "一段戻って落ち着きを取り戻します。"
    };
  }

  if (toId === HUB_DEPTH || toId === DEFAULT_START || moveKind === "home") {
    return {
      moveType,
      stabilityDelta: 14,
      resonanceDelta: -2,
      gateDelta: -2,
      label: `効果: ${typeLabel} / ${stabilityMeta(14)}`,
      title: "HUB/入口で境界圧を落とします。"
    };
  }

  const climb = Math.max(0, toRank - fromRank);
  const span = Math.abs(toRank - fromRank);

  if (climb > 0) {
    const quietBonus = moveKind === "core" ? 3 : 0;
    const pressure = Math.max(1, 4 + climb * 2 + Math.floor(toRank / 7) + (span > 6 ? 5 : 0) - quietBonus);
    const typeTuning = {
      dive: { stability: -pressure, resonance: 2, gate: 8 + Math.ceil(climb / 2), note: "深く進んで扉を強く押します。" },
      observe: { stability: -Math.ceil(pressure * 0.68), resonance: 1, gate: 4 + Math.ceil(climb / 3), note: "周囲を見ながら安全に進みます。" },
      tune: { stability: -Math.ceil(pressure * 0.42) + 4, resonance: 2, gate: 4, note: "位相を整えながら進みます。" },
      sync: { stability: -Math.ceil(pressure * 0.5), resonance: -6, gate: 16 + Math.min(8, getRunState().marks * 2), note: "響きを束ねて扉へ接続します。" }
    }[moveType] || { stability: -pressure, resonance: 1, gate: 4, note: "深度圧を受けながら進みます。" };
    const stabilityDelta = clampNumber(typeTuning.stability, -72, 12);
    const resonanceDelta = typeTuning.resonance + 1 + Math.min(4, Math.ceil(toRank / 8));
    return {
      moveType,
      stabilityDelta,
      resonanceDelta,
      gateDelta: typeTuning.gate,
      label: `効果: ${typeLabel} / ${stabilityMeta(stabilityDelta)}`,
      title: `深度圧: ${typeTuning.note} 響き ${signedNumber(resonanceDelta)} / 扉の開き ${signedNumber(typeTuning.gate)}。`
    };
  }

  if (toRank < fromRank) {
    return {
      moveType,
      stabilityDelta: 6,
      resonanceDelta: 0,
      gateDelta: -1,
      label: `効果: ${typeLabel} / ${stabilityMeta(6)}`,
      title: "浅い層へ戻り、落ち着きを少し回復します。"
    };
  }

  return {
    moveType,
    stabilityDelta: moveType === "tune" ? 3 : -2,
    resonanceDelta: moveType === "sync" ? -4 : 1,
    gateDelta: moveType === "sync" ? 10 : moveType === "tune" ? 3 : 1,
    label: `効果: ${typeLabel} / ${stabilityMeta(moveType === "tune" ? 3 : -2)}`,
    title: "同じ深度帯で位相を調整します。"
  };
}

function gateForOption(fromId, toId, option = {}) {
  const state = getRunState();
  if (toId === OMEGA_DEPTH) {
    if (!canEnterOmega()) {
      const charge = Math.round(state.gateRunCharge);
      const won = state.gateRunStatus === "won";
      const attuned = GateRunModel.isAttuned ? GateRunModel.isAttuned(state) : true;
      if (won && !attuned) {
        return {
          allowed: false,
          moveType: "sync",
          label: "まだ入れない / 認識が要る",
          title: "扉は開いた。だが構造を読んで認識が合っていない。降下で構造（八観）を読み、認識を育ててから来い。"
        };
      }
      return {
        allowed: false,
        moveType: "sync",
        label: `まだ入れない / 扉の開き ${charge}%`,
        title: "Ωは扉が開いた後に入れます。扉の開きを100%まで進めてください。"
      };
    }
    return {
      allowed: true,
      moveType: "sync",
      label: "扉が開いた / Ωへ入る",
      title: "Gate Runは完了しています。落ち着きを追加で削らず、Ωへ入れます。"
    };
  }

  const targetRank = depthRank(toId);
  if (targetRank >= DEPTH_GATE_STABILITY_RANK && state.bestRank < DEPTH_GATE_STABILITY_RANK && state.stability < DEPTH_GATE_STABILITY_REQUIRED) {
    return {
      allowed: false,
      moveType: "tune",
      label: `H境界: 落ち着き${DEPTH_GATE_STABILITY_REQUIRED}必要`,
      title: "H境界は崩落耐性が必要です。Breath GateかHUBで落ち着きを戻してください。"
    };
  }

  if (targetRank >= DEPTH_GATE_RESONANCE_RANK && state.bestRank < DEPTH_GATE_RESONANCE_RANK && state.resonance < DEPTH_GATE_RESONANCE_REQUIRED && state.marks <= 0) {
    return {
      allowed: false,
      moveType: "sync",
      label: `N境界: 響き${DEPTH_GATE_RESONANCE_REQUIRED}必要`,
      title: "N境界は合わせる資源が必要です。整えるかHUBへ戻ってから進んでください。"
    };
  }

  const preview = transitionPreview(fromId, toId, "choice", option.type);
  const cost = Math.max(0, -preview.stabilityDelta);
  const markBuffer = state.marks * 6;
  const allowed = cost === 0 || state.stability + markBuffer >= Math.min(72, cost);
  return {
    allowed,
    moveType: preview.moveType,
    label: preview.label,
    title: allowed
      ? preview.title
      : `${preview.title} 現在の落ち着きは${state.stability}です。ひと息置くか、夜のハブへ戻ると回復できます。`
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
  const cameraZoom = clampNumber(1.03 + rank / 210 + gi.risk / 980, 1.03, 1.18);
  const sceneSpeed = clampNumber(26 - rank * 0.42 - gi.risk * 0.045, 12, 26);
  const visualMode = visualModeForDepth(depthId, state, gi);

  root.style.setProperty("--hz-depth-shift", `${shift.toFixed(1)}px`);
  root.style.setProperty("--hz-gate-duration", `${duration.toFixed(1)}s`);
  root.style.setProperty("--hz-gate-opacity", opacity.toFixed(2));
  root.style.setProperty("--hz-gate-scale", scale.toFixed(3));
  root.style.setProperty("--hz-gate-charge", gi.gateCharge.toFixed(1));
  root.style.setProperty("--hz-gate-glow", glow.toFixed(2));
  root.style.setProperty("--hz-threat", gi.risk.toFixed(1));
  root.style.setProperty("--hz-calm", clampNumber(state.stability, 0, STABILITY_MAX).toFixed(1));
  root.style.setProperty("--hz-resonance", clampNumber(state.resonance, 0, RESONANCE_MAX).toFixed(1));
  root.style.setProperty("--hz-camera-zoom", cameraZoom.toFixed(3));
  root.style.setProperty("--hz-scene-speed", `${sceneSpeed.toFixed(1)}s`);
  root.dataset.hzVisual = visualMode;
  root.dataset.hzRunStatus = cleanDataToken(state.gateRunStatus || "running", "running");
}

function gatePhaseLabel(gateCharge, status = getRunState().gateRunStatus) {
  if (status === "won") return "扉が開いた";
  if (gateCharge >= 82) return "あと少し";
  if (gateCharge >= 34) return "扉を整える";
  return "様子を見る";
}

function buildFirstPlayableGuide(depthId = currentDepthId, state = getRunState()) {
  const gateCharge = Math.round(clampNumber(state.gateRunCharge, 0, GATE_RUN_MAX_CHARGE));
  let active = "Gate Run";
  let next = `扉を${GATE_RUN_MAX_CHARGE}%まで開く`;
  let detail = `扉 ${gateCharge}% / 攻める・整える・合わせるを選ぶ。`;
  let primary = "主導線: Gate Run / 道を選ぶ";
  let support = "補助: Breath Gate";
  let bgm = "BGM: 同じ画面推奨";

  if (depthId === DEFAULT_START) {
    active = "A_start";
    next = "夜のハブへ入る";
    detail = "まずHUBへ。Gate RunはHUBから操作できる。";
    primary = "主導線: 夜のハブへ";
  } else if (depthId === HUB_DEPTH && state.gateRunStatus !== "won") {
    active = "HUB";
    next = "Gate Runで扉100%";
    detail = `扉 ${gateCharge}% / Breath Gateは限定立て直し。`;
  } else if (depthId === OMEGA_DEPTH) {
    active = "Ω";
    next = "新しい入口へ戻る";
    detail = "一周の到達点。ここからA_rebornへつなぐ。";
    primary = "主導線: 新しい入口へ戻る";
    support = "補助: HUBへ戻る";
  } else if (depthId === "A_reborn") {
    active = "A_reborn";
    next = "夜のハブへ戻る";
    detail = "一周完了。次の挑戦はHUBから始める。";
    primary = "主導線: 次の周回へ";
    support = "補助: 記録を読む";
  } else if (state.gateRunStatus === "won") {
    active = "Ω unlock";
    next = "Ωへ入る";
    detail = "扉100%。一周の到達点へ進める。";
    primary = "主導線: Ωへ入る";
    support = "補助: HUBへ戻る";
  } else if (state.gateRunStatus === "lost" || state.stability < 34) {
    active = "Breath Gate";
    next = "ひと息置く";
    detail = `落ち着き ${Math.round(state.stability)} / 回復してから扉へ戻る。`;
    primary = "主導線: 立て直して再挑戦";
    support = "補助: Breath Gate / HUB退避";
  } else if (gateCharge >= 82) {
    active = "Gate Run";
    next = "扉に合わせる";
    detail = `扉 ${gateCharge}% / あと少しでΩ解放。`;
    primary = "主導線: 合わせる準備";
  }

  const stages = ["A_start", "HUB", "Gate Run", "Breath Gate", "Ω unlock", "Ω", "A_reborn"];
  return { active, next, detail, primary, support, bgm, stages };
}

function renderFirstPlayableGuideMarkup() {
  const guide = buildFirstPlayableGuide();
  const chips = guide.stages.map((stage) => `
    <span class="hz-loop-step${stage === guide.active ? " is-active" : ""}">${escapeHtml(stage)}</span>
  `).join("");
  return `
    <div class="hz-first-playable" aria-label="First playable loop">
      <div class="hz-first-playable-head">
        <span>初回ループ</span>
        <b>5〜8分で一周</b>
      </div>
      <div class="hz-loop-steps">${chips}</div>
      <div class="hz-loop-next"><span>次にやること</span><b>${escapeHtml(guide.next)}</b></div>
      <div class="hz-loop-detail">${escapeHtml(guide.detail)}</div>
      <div class="hz-loop-priority" aria-label="操作の優先順位">
        <span>${escapeHtml(guide.primary)}</span>
        <span>${escapeHtml(guide.support)}</span>
        <span>${escapeHtml(guide.bgm)}</span>
      </div>
    </div>
  `;
}

function renderStartGuideMarkup() {
  const state = getRunState();
  if (currentDepthId !== DEFAULT_START || state.gateRunStatus !== "running") return "";

  const startTarget = depths[HUB_DEPTH] ? HUB_DEPTH : "";
  return `
    <section class="hz-start-guide" aria-label="最初にやること">
      <div class="hz-start-guide-copy">
        <span class="hz-start-kicker">最初にやること</span>
        <h2>まず夜のハブへ入る</h2>
        <p>ここは入口です。HUBに入るとGate Runが開き、扉100%からΩを目指せます。</p>
      </div>
      <button class="hz-start-guide-cta" type="button" data-start-hub="${escapeHtml(startTarget)}"${startTarget ? "" : " disabled"}>
        <span>まず進む</span>
        <b>夜のハブへ</b>
      </button>
      <ol class="hz-start-steps" aria-label="初回ループの流れ">
        <li><b>1</b><span>夜のハブへ入る</span></li>
        <li><b>2</b><span>Gate Runで扉を100%</span></li>
        <li><b>3</b><span>Ωへ入って一周する</span></li>
      </ol>
    </section>
  `;
}

function giGateAlmostOpen(state, gateCharge) {
  return state.gateRunStatus === "running" && gateCharge >= 86;
}

function riskLabel(risk) {
  if (risk >= 78) return "危険";
  if (risk >= 54) return "高め";
  if (risk >= 28) return "注意";
  return "低い";
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

  let objective = "ひと息置いて落ち着きを戻すか、選択肢から先へ進む。";
  let route = "ひと息置く / 道を選ぶ";

  if (depthId === "A_reborn") {
    objective = "一周完了。Ωを通過した入口から、夜のハブへ戻って次の周回を選べる。";
    route = "夜のハブへ戻る / 次の周回";
  } else if (depthId === OMEGA_DEPTH) {
    objective = "Ωに到達した。ここがこの周回の本筋の到達点。新しい入口へ戻る。";
    route = "新しい入口 -> A_reborn";
  } else if (state.gateRunStatus === "won") {
    objective = "扉が開いた。Ωへ入れる。ここからがこの周回の本筋の到達点。";
    route = "Ω -> 新しい入口 / 夜のハブ";
  } else if (state.gateRunStatus === "lost") {
    objective = "立て直し中。夜のハブで姿勢を戻し、もう一度挑戦する。";
    route = "夜のハブへ戻る -> 再挑戦";
  } else if (state.gateRunCharge >= 82) {
    objective = "扉は開きかけている。扉に合わせるか、呼吸を整えて落ち着きを厚くする。";
    route = "扉に合わせる / 呼吸を整える";
  } else if (state.stability < 26) {
    objective = "落ち着きが薄い。夜のハブへ戻るか、ひと息置いて立て直す。";
    route = "ひと息置く / 夜のハブへ戻る";
  } else if (giGateAlmostOpen(state, gateCharge)) {
    objective = "目的の扉は近いが、Ωはまだ開いていない。扉の開きを100%まで押し切る。";
    route = "扉に合わせる / 呼吸を整える / Gate Run";
  } else if (rank >= 18 && state.marks === 0) {
    objective = "節目のしるしが足りない。深度を刻み、通行バッファを作る。";
    route = "安全な分岐 -> しるし獲得";
  } else if (rank === 0) {
    objective = "Ω到達が本筋。まずGate Runを進め、扉が開くまで位相を合わせる。";
    route = "巡礼 / 探索 / Gate Run";
  } else if (risk > 70) {
    objective = "境界圧が高い。無理に進まず、呼吸と選択を細くする。";
    route = "ひと息置く -> 停止 -> 戻る";
  }

  const signals = [
    "GI: 観測線はまだ保てる。",
    "GI: 目的点は見えている。急がなくていい。",
    "GI: 響きが増えるほど、扉は近くなる。",
    "GI: 落ち着きを残せ。深度は戻れる者だけを通す。",
    "GI: 扉の縁が反応している。"
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
  const gateChargeNorm = clampNumber(state.gateRunCharge / GATE_RUN_MAX_CHARGE, 0, 1);
  const gateWon = state.gateRunStatus === "won";
  const gateLost = state.gateRunStatus === "lost";
  const isAnchorDepth = depthId === DEFAULT_START || depthId === HUB_DEPTH;
  const gate = clampNumber(
    (rank >= 24 ? 0.18 : 0) +
    resonanceNorm * 0.36 +
    state.marks * 0.03 +
    gateChargeNorm * 0.34 +
    (gateWon ? 0.22 : 0),
    0,
    1
  );
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
    tempo: Math.round(clampNumber(46 + depthNorm * 62 + resonanceNorm * 20 + gate * 18 - (isAnchorDepth ? 4 : 0) - (gateLost ? 12 : 0), 40, 148)),
    density: Number(clampNumber(0.07 + depthNorm * 0.36 + resonanceNorm * 0.18 + gate * 0.18 + typeAudio.density - (isAnchorDepth ? 0.03 : 0) - (gateLost ? 0.12 : 0), 0.04, 0.86).toFixed(3)),
    brightness: Number(clampNumber(0.16 + resonanceNorm * 0.3 + gate * 0.34 + typeAudio.brightness - (gateLost ? 0.1 : 0), 0.07, 0.92).toFixed(3)),
    silenceRate: Number(clampNumber(0.46 - depthNorm * 0.18 - gate * 0.18 + (1 - stabilityNorm) * 0.16 + typeAudio.silence + (gateLost ? 0.12 : 0) + (isAnchorDepth ? 0.04 : 0), 0.05, 0.62).toFixed(3)),
    bassWeight: Number(clampNumber(0.22 + pressure * 0.44 + gate * 0.16 + typeAudio.bass - (gateLost ? 0.08 : 0), 0.1, 0.88).toFixed(3)),
    harmonicDeviation: Number(clampNumber(0.07 + resonanceNorm * 0.24 + depthNorm * 0.1 + gate * 0.08 + typeAudio.harmonic - (gateLost ? 0.04 : 0), 0.02, 0.52).toFixed(3)),
    smoothing: Number(clampNumber(0.92 - pressure * 0.24 - (1 - stabilityNorm) * 0.12 - gate * 0.08 + (gateLost ? 0.18 : 0), 0.48, 0.96).toFixed(3)),
    droneStability: Number(clampNumber(0.28 + stabilityNorm * 0.58 - (1 - stabilityNorm) * 0.16 + (gateLost ? 0.16 : 0), 0.1, 0.98).toFixed(3)),
    space: Number(clampNumber(0.24 + resonanceNorm * 0.4 + depthNorm * 0.18 + gate * 0.12 + (isAnchorDepth ? 0.18 : 0), 0.1, 0.94).toFixed(3))
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
      droneLayers: isAnchorDepth ? 2 : rank >= 18 || gate > 0.58 ? 5 : rank >= 8 ? 4 : 3,
      densityBias: Number(clampNumber(depthNorm * 0.36 + state.marks * 0.05 + gate * 0.2, 0, 0.92).toFixed(3)),
      glitch: !gateLost && (rank >= 12 || resonanceNorm > 0.55 || state.marks >= 3 || stabilityNorm < 0.32 || gate > 0.58),
      glitchRate: Number(clampNumber(0.02 + resonanceNorm * 0.14 + state.marks * 0.018 + (1 - stabilityNorm) * 0.08 + gate * 0.08 - (gateLost ? 0.06 : 0), 0, 0.48).toFixed(3)),
      gesture: gateWon || gate > 0.42 ? "gate" : state.marks >= 3 ? "gate" : state.marks > 0 ? "trace" : typeAudio.gesture,
      jazzStabs: rank >= 10 && rank < 18,
      percussion: !isAnchorDepth && !gateLost && (rank >= 18 || pressure > 0.62 || gate > 0.45),
      gatePulse: !gateLost && (rank >= 24 || gate > 0.28 || state.marks > 0 || moveType === "sync")
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

function cleanDataToken(text, fallback = "idle") {
  const token = String(text ?? fallback)
    .toLowerCase()
    .replace(/[^a-z0-9_.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  return token || fallback;
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

function bgmStageLabel() {
  if (MusicFeedbackState.connected) {
    return MusicFeedbackState.hazamaStage || MusicFeedbackState.chapterLabel || MusicFeedbackState.chapter || "MUSIC";
  }
  return lastMusicPayload?.profile?.source?.stage || buildMusicProfile(currentDepthId).source.stage;
}

function musicConnectionStateCode() {
  const state = MusicFeedbackState;
  if (inlineBgmIsPlaying()) return "MUSIC.INLINE";
  if (!bgmFollowEnabled || state.connectionState === "stop" || state.connectionState === "stopped") return "MUSIC.STOP";
  if (state.connectionState === "pause" || state.connectionState === "paused") return "MUSIC.PAUSE";
  if (state.connected && (state.autoFollow || state.connectionState === "follow" || state.connectionState === "following" || state.connectionState === "sync" || state.connectionState === "synced")) return "MUSIC.FOLLOW";
  if (state.connected) return "MUSIC.READY";
  if (musicBridgePhase === "blocked" || musicBridgePhase === "IDLE") return "MUSIC.READY";
  return "MUSIC.READY";
}

function bgmStateLabel() {
  const code = musicConnectionStateCode();
  if (code === "MUSIC.INLINE") return "INLINE";
  if (code === "MUSIC.STOP") return "STOP";
  if (code === "MUSIC.PAUSE") return "STOP";
  if (code === "MUSIC.FOLLOW") return "FOLLOW中";
  return "START待ち";
}

function musicArcLabel() {
  const raw = MusicFeedbackState.chapter || MusicFeedbackState.chapterLabel || MusicFeedbackState.hazamaStage || bgmStageLabel();
  const token = cleanDataToken(raw, "");
  const map = {
    acid: "ACD",
    acd: "ACD",
    broken: "BRK",
    break: "BRK",
    memory: "MEM",
    ghost: "GST",
    exhale: "EXH",
    root: "ROT",
    ferment: "FRM",
    sprout: "SPT",
    submerge: "SUB",
    haze: "HAZ",
    chrome: "CHR"
  };
  const code = map[token] || token.replace(/[^a-z0-9]/g, "").slice(0, 3).toUpperCase();
  return code ? `ARC.${code}` : "";
}

function bgmPhaseLabel(phase = musicBridgePhase) {
  if (!bgmFollowEnabled || phase === "off") return "STOP";
  return bgmStateLabel();
}

function bgmStatusLine(text = "") {
  if (inlineBgmIsPlaying()) return `BGM: INLINE / ${inlineBgmStatusText()}`;
  const arc = musicArcLabel();
  const details = [];
  if (!bgmFollowEnabled) return "BGM: MUSIC.STOP";
  if (MusicFeedbackState.connected && MusicFeedbackState.bpm) details.push(`BPM ${MusicFeedbackState.bpm}`);
  if (MusicFeedbackState.connected && arc) details.push(arc);
  if (MusicFeedbackState.connected && MusicFeedbackState.outputLevel > 0) details.push(`OUT ${Math.round(MusicFeedbackState.outputLevel * 100)}`);
  if (!MusicFeedbackState.connected && text) details.push(text);
  if (!MusicFeedbackState.connected && !text) details.push("別タブMusic → START.HZM");
  return `BGM: ${bgmPhaseLabel()}${details.length ? ` / ${details.join(" / ")}` : ""}`;
}

function bgmCompactDetail(text = "") {
  if (!bgmFollowEnabled) return "停止中";
  if (inlineBgmIsPlaying()) return `同じ画面 ${InlineBgmState.params?.tempo || ""}`.trim();
  if (MusicFeedbackState.connected && MusicFeedbackState.bpm) {
    return MusicFeedbackState.bpm ? `BPM ${MusicFeedbackState.bpm}` : "再生中";
  }
  if (MusicFeedbackState.connected) return musicArcLabel() || "接続済み";
  if (musicBridgePhase === "pending") return "MusicタブSTART";
  if (musicBridgePhase === "blocked") return "リンクで開く";
  if (musicBridgePhase === "armed" || musicBridgePhase === "IDLE") return "同じ画面START";
  return text || bgmStageLabel();
}

function bgmArcDetail() {
  if (!MusicFeedbackState.connected) return "";
  return musicArcLabel();
}

function bgmOpenLinkLabel() {
  if (!bgmFollowEnabled) return "BGM 再開";
  if (inlineBgmIsPlaying()) return "外部Musicも開く";
  if (musicBridgePhase === "pending") return "Musicタブへ";
  if (musicBridgePhase === "blocked") return "リンクでMusicを開く";
  return "別タブでMusicを開く";
}

function bgmShouldCollapse() {
  return bgmFollowEnabled && ((MusicFeedbackState.connected && MusicFeedbackState.playing && musicConnectionStateCode() === "MUSIC.FOLLOW") || inlineBgmIsPlaying()) && !bgmExpanded;
}

function inlineBgmSupported() {
  return typeof window !== "undefined" && Boolean(window.AudioContext || window.webkitAudioContext);
}

function inlineBgmIsPlaying() {
  return !!(InlineBgmState.playing && InlineBgmState.audioCtx && InlineBgmState.audioCtx.state !== "closed");
}

function inlineBgmRouteLabel() {
  if (InlineBgmState.route === "bridge") return "iOS bridge";
  if (InlineBgmState.route === "direct") return "direct";
  return "inline";
}

function inlineBgmStatusText() {
  const params = InlineBgmState.params;
  if (!inlineBgmIsPlaying() || !params) return "同じ画面BGM待ち";
  return `同じ画面BGM / BPM ${params.tempo} / ${inlineBgmRouteLabel()}`;
}

function inlineBgmProfileParams(profile = buildMusicProfile(currentDepthId)) {
  const source = profile?.source || {};
  const audio = profile?.audio || {};
  const ucm = profile?.ucm || {};
  const stage = cleanDataToken(source.stage || "submerge", "submerge");
  const rank = clampNumber(Number(source.rank) || depthRank(currentDepthId), 0, 28);
  const tempo = Math.round(clampNumber(Number(audio.tempo) || 72, 48, 132));
  const density = clampNumber(Number(audio.density) || 0.42, 0.16, 0.82);
  const brightness = clampNumber(Number(audio.brightness) || 0.48, 0.05, 0.9);
  const silenceRate = clampNumber(Number(audio.silenceRate) || 0.28, 0.05, 0.72);
  const bassWeight = clampNumber(Number(audio.bassWeight) || 0.38, 0.08, 0.78);
  const space = clampNumber(Number(audio.space) || 0.5, 0.1, 0.95);
  const energy = clampNumber(Number(ucm.energy) || 45, 0, 100);
  const circle = clampNumber(Number(ucm.circle) || 35, 0, 100);
  const stageHash = numericHash(`${stage}|${profile?.name || ""}|${rank}`);
  const baseMidi = 38 + (stageHash % 7) + Math.floor(rank / 5);
  const baseFreq = 440 * Math.pow(2, (baseMidi - 69) / 12);
  // G5: サイレン的"圧"のカーブ。浅は0(今のまま馴染む)、外殻(OUTER_SHELL_RANK)手前から立ち上がり
  // Ω付近でピーク。ease-in(二乗)で静→急＝「外殻を抜けた後に圧が立つ」。balance重視で控えめ係数。
  const shellStart = OUTER_SHELL_RANK - 2;
  const shellN = clampNumber((rank - shellStart) / (27 - shellStart), 0, 1);
  const sirenPressure = Number((shellN * shellN).toFixed(3));
  const scale = stage === "exhale"
    ? [0, 2, 5, 7, 9, 12]
    : stage === "root"
      ? [0, 3, 5, 7, 10, 12]
      : [0, 2, 3, 7, 10, 12];
  return {
    stage,
    tempo,
    density,
    brightness,
    silenceRate,
    bassWeight,
    space,
    energy,
    circle,
    baseFreq,
    scale,
    seed: stageHash,
    sirenPressure,
    droneGain: 0.018 + bassWeight * 0.028,
    pulseGain: 0.016 + density * 0.026,
    filterFreq: 360 + brightness * 1900 + circle * 5,
    intervalMs: Math.round(clampNumber(60000 / tempo, 360, 1250))
  };
}

function ensureInlineBgmContext() {
  if (InlineBgmState.audioCtx && InlineBgmState.audioCtx.state !== "closed") return InlineBgmState.audioCtx;
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  try {
    InlineBgmState.audioCtx = new AudioContextCtor({ latencyHint: "playback" });
  } catch (_) {
    InlineBgmState.audioCtx = new AudioContextCtor();
  }
  return InlineBgmState.audioCtx;
}

function resetInlineBgmGraph() {
  if (InlineBgmState.pulseTimer) {
    window.clearInterval(InlineBgmState.pulseTimer);
    InlineBgmState.pulseTimer = null;
  }
  const ctx = InlineBgmState.audioCtx;
  for (const voice of InlineBgmState.drone) {
    try {
      voice.gain?.gain?.cancelScheduledValues(ctx?.currentTime || 0);
      voice.gain?.gain?.setTargetAtTime(0.0001, ctx?.currentTime || 0, 0.03);
      voice.osc?.stop((ctx?.currentTime || 0) + 0.08);
    } catch (_) {}
    try { voice.osc?.disconnect(); } catch (_) {}
    try { voice.gain?.disconnect(); } catch (_) {}
  }
  InlineBgmState.drone = [];
  if (InlineBgmState.siren) {
    const sv = InlineBgmState.siren;
    try { sv.gain?.gain?.setTargetAtTime(0.0001, ctx?.currentTime || 0, 0.04); } catch (_) {}
    try { sv.osc?.stop((ctx?.currentTime || 0) + 0.08); } catch (_) {}
    try { sv.lfo?.stop((ctx?.currentTime || 0) + 0.08); } catch (_) {}
    for (const k of ["osc", "lfo", "lfoGain", "bp", "gain"]) {
      try { sv[k]?.disconnect(); } catch (_) {}
    }
    InlineBgmState.siren = null;
  }
  try { InlineBgmState.filter?.disconnect(); } catch (_) {}
  try { InlineBgmState.master?.disconnect(); } catch (_) {}
  try { InlineBgmState.bridgeDestination?.disconnect(); } catch (_) {}
  if (InlineBgmState.bridgeAudio) {
    try { InlineBgmState.bridgeAudio.pause(); } catch (_) {}
    try { InlineBgmState.bridgeAudio.srcObject = null; } catch (_) {}
  }
  InlineBgmState.master = null;
  InlineBgmState.filter = null;
  InlineBgmState.bridgeDestination = null;
  InlineBgmState.bridgeAudio = null;
  InlineBgmState.playing = false;
  InlineBgmState.route = "idle";
}

function createInlineDroneVoice(ctx, freq, type, gainValue) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.setTargetAtTime(gainValue, ctx.currentTime + 0.02, 0.55);
  osc.connect(gain);
  gain.connect(InlineBgmState.filter);
  osc.start();
  return { osc, gain };
}

// G5: サイレン的"圧"の声。鋸波を遅いLFOで上下に煽る(サイレンのうねり)＋帯域を絞って圧を作る。
// gain は sirenPressure で駆動(updateInlineBgmで更新)＝外殻〜Ωのclimax。lowpassを通さず master直結で抜ける。
function createInlineSirenVoice(ctx) {
  const baseHz = clampNumber((InlineBgmState.params?.baseFreq || 110) * 2.2, 90, 760);
  const osc = ctx.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(baseHz, ctx.currentTime);
  const lfo = ctx.createOscillator();
  lfo.type = "sine";
  lfo.frequency.setValueAtTime(0.16, ctx.currentTime);
  const lfoGain = ctx.createGain();
  lfoGain.gain.setValueAtTime(baseHz * 0.2, ctx.currentTime);
  lfo.connect(lfoGain); lfoGain.connect(osc.frequency);
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.setValueAtTime(baseHz * 1.4, ctx.currentTime);
  bp.Q.setValueAtTime(3.2, ctx.currentTime);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  osc.connect(bp); bp.connect(gain); gain.connect(InlineBgmState.master);
  osc.start(); lfo.start();
  return { osc, lfo, lfoGain, bp, gain, baseHz };
}

async function connectInlineBgmOutput(ctx, master) {
  InlineBgmState.route = "direct";
  if (typeof ctx.createMediaStreamDestination === "function" && typeof Audio !== "undefined") {
    try {
      const destination = ctx.createMediaStreamDestination();
      const audio = new Audio();
      audio.autoplay = false;
      audio.controls = false;
      audio.playsInline = true;
      audio.srcObject = destination.stream;
      master.connect(destination);
      await audio.play();
      InlineBgmState.bridgeDestination = destination;
      InlineBgmState.bridgeAudio = audio;
      InlineBgmState.route = "bridge";
      return;
    } catch (_) {
      try { master.disconnect(destination); } catch (e) {}
      try { InlineBgmState.bridgeDestination?.disconnect(); } catch (e) {}
      if (InlineBgmState.bridgeAudio) {
        try { InlineBgmState.bridgeAudio.pause(); } catch (e) {}
        try { InlineBgmState.bridgeAudio.srcObject = null; } catch (e) {}
      }
      InlineBgmState.bridgeDestination = null;
      InlineBgmState.bridgeAudio = null;
    }
  }
  master.connect(ctx.destination);
}

function playInlineBgmPulse() {
  if (!inlineBgmIsPlaying() || !InlineBgmState.master || !InlineBgmState.params) return;
  const ctx = InlineBgmState.audioCtx;
  const params = InlineBgmState.params;
  if (!ctx || ctx.state === "closed") return;
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  const step = InlineBgmState.step++;
  const gate = ((params.seed + step * 37) % 100) / 100;
  if (gate > Math.max(0.18, params.density * (1 - params.silenceRate * 0.45))) return;

  const degree = params.scale[(step + params.seed) % params.scale.length];
  const octave = step % 8 === 0 ? 0.5 : step % 5 === 0 ? 2 : 1;
  const freq = params.baseFreq * octave * Math.pow(2, degree / 12);
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const now = ctx.currentTime + 0.02;
  const dur = clampNumber(0.16 + params.space * 0.38, 0.18, 0.62);
  osc.type = params.brightness > 0.58 ? "triangle" : "sine";
  osc.frequency.setValueAtTime(freq, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(params.pulseGain, now + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  osc.connect(gain);
  gain.connect(InlineBgmState.filter || InlineBgmState.master);
  osc.start(now);
  osc.stop(now + dur + 0.04);
  window.setTimeout(() => {
    try { osc.disconnect(); } catch (_) {}
    try { gain.disconnect(); } catch (_) {}
  }, Math.round((dur + 0.2) * 1000));
}

function scheduleInlineBgmPulse() {
  if (InlineBgmState.pulseTimer) window.clearInterval(InlineBgmState.pulseTimer);
  const interval = InlineBgmState.params?.intervalMs || 720;
  InlineBgmState.pulseTimer = window.setInterval(playInlineBgmPulse, interval);
  playInlineBgmPulse();
}

// 増分C-2: グリッジ・バーストに同期して BGM が一瞬"裂ける"（共有信号＝視覚と一緒に壊れていく）。
// 既存 inline BGM の単一 AudioContext を再利用＝二重鳴り無し・iOS bridge 経路も不変。
//  - drone を一瞬デチューン（音程が割れる）→ 0 へ復帰
//  - filter cutoff を一瞬跳ねさせる（デジタルな破断）→ 元へ復帰
//  - 短いノイズ・バースト（バンドパス）でデータモッシュ的な"ザッ"。intensity は深いほど大きい。
function inlineBgmGlitchHit(intensity) {
  if (!inlineBgmIsPlaying()) return;
  const ctx = InlineBgmState.audioCtx;
  if (!ctx || ctx.state !== "running") return;
  const t = ctx.currentTime;
  const amt = clampNumber(Number(intensity) || 0, 0, 1.2);
  if (amt <= 0) return;
  try {
    for (const voice of InlineBgmState.drone) {
      const det = voice.osc && voice.osc.detune;
      if (!det) continue;
      det.cancelScheduledValues(t);
      det.setValueAtTime((Math.random() * 2 - 1) * 55 * amt, t);
      det.setTargetAtTime(0, t + 0.03, 0.10);
    }
    const filter = InlineBgmState.filter;
    if (filter) {
      const f0 = filter.frequency.value;
      filter.frequency.cancelScheduledValues(t);
      filter.frequency.setValueAtTime(Math.max(90, f0 * (1 + (Math.random() - 0.5) * 0.7 * amt)), t);
      filter.frequency.setTargetAtTime(f0, t + 0.04, 0.12);
    }
    const len = Math.floor(ctx.sampleRate * 0.05);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass";
    bp.frequency.value = 800 + Math.random() * 2600; bp.Q.value = 0.7;
    const ng = ctx.createGain(); ng.gain.value = 0.0001;
    ng.gain.setValueAtTime(0.016 * amt, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    src.connect(bp); bp.connect(ng); ng.connect(InlineBgmState.master || ctx.destination);
    src.start(t); src.stop(t + 0.06);
    window.setTimeout(() => {
      try { src.disconnect(); } catch (_) {}
      try { bp.disconnect(); } catch (_) {}
      try { ng.disconnect(); } catch (_) {}
    }, 120);
  } catch (_) {}
}

function updateInlineMediaSession(params, playing = inlineBgmIsPlaying()) {
  if (!("mediaSession" in navigator)) return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: "Hazama BGM",
      artist: "Hazama",
      album: `Gate ${params?.stage || "inline"}`,
      artwork: [
        { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" }
      ]
    });
    navigator.mediaSession.playbackState = playing ? "playing" : "paused";
    navigator.mediaSession.setActionHandler("play", () => startInlineBgm().catch(() => {}));
    navigator.mediaSession.setActionHandler("pause", () => stopInlineBgm());
    navigator.mediaSession.setActionHandler("stop", () => stopInlineBgm());
  } catch (_) {}
}

function updateInlineBgm(profile = buildMusicProfile(currentDepthId)) {
  if (!inlineBgmIsPlaying() || !InlineBgmState.params) return false;
  const next = inlineBgmProfileParams(profile);
  const prevInterval = InlineBgmState.params.intervalMs;
  const ctx = InlineBgmState.audioCtx;
  const now = ctx.currentTime;
  InlineBgmState.params = next;
  const siren = clampNumber(next.sirenPressure || 0, 0, 1);
  if (InlineBgmState.master) {
    // 外殻越えで master を少しだけ持ち上げる＝"圧"のピーク（balance: +0.05まで）。
    InlineBgmState.master.gain.setTargetAtTime(0.18 + next.energy * 0.0013 + siren * 0.05, now, 0.35);
  }
  if (InlineBgmState.filter) {
    InlineBgmState.filter.frequency.setTargetAtTime(next.filterFreq, now, 0.5);
    // 深部で共鳴Qを立てて圧を作る。
    InlineBgmState.filter.Q.setTargetAtTime(0.6 + next.brightness * 1.4 + siren * 1.3, now, 0.5);
  }
  InlineBgmState.drone.forEach((voice, index) => {
    const ratio = index === 0 ? 1 : index === 1 ? 1.5 : 2;
    const gain = index === 0 ? next.droneGain : next.droneGain * 0.48;
    voice.osc.frequency.setTargetAtTime(next.baseFreq * ratio, now, 0.6);
    voice.gain.gain.setTargetAtTime(gain, now, 0.7);
  });
  // G5: サイレンのうねりを sirenPressure で煽る。外殻手前=ほぼ無音、Ω付近でピーク（wail速度/深さ/音量↑）。
  if (InlineBgmState.siren) {
    const sv = InlineBgmState.siren;
    sv.gain.gain.setTargetAtTime(siren * 0.05, now, 0.8);
    sv.lfo.frequency.setTargetAtTime(0.16 + siren * 0.5, now, 0.6);
    sv.lfoGain.gain.setTargetAtTime(sv.baseHz * (0.18 + siren * 0.45), now, 0.6);
    sv.bp.frequency.setTargetAtTime(sv.baseHz * (1.2 + siren * 1.1), now, 0.6);
  }
  if (Math.abs(prevInterval - next.intervalMs) > 24) scheduleInlineBgmPulse();
  updateInlineMediaSession(next, true);
  if (Date.now() - InlineBgmState.lastStatusAt > 1100) {
    InlineBgmState.lastStatusAt = Date.now();
    setMusicBridgeStatus(inlineBgmStatusText(), "inline");
  }
  return true;
}

async function startInlineBgm(profile = buildMusicProfile(currentDepthId)) {
  bgmFollowEnabled = true;
  bgmExpanded = false;
  musicAutoStartDone = true;
  if (!inlineBgmSupported()) {
    setMusicBridgeStatus("このブラウザはWeb Audio非対応", "blocked");
    return false;
  }

  const ctx = ensureInlineBgmContext();
  const params = inlineBgmProfileParams(profile);
  resetInlineBgmGraph();
  InlineBgmState.audioCtx = ctx;
  InlineBgmState.params = params;
  InlineBgmState.step = 0;
  InlineBgmState.master = ctx.createGain();
  InlineBgmState.master.gain.setValueAtTime(0.0001, ctx.currentTime);
  InlineBgmState.master.gain.setTargetAtTime(0.18 + params.energy * 0.0013, ctx.currentTime + 0.03, 0.45);
  InlineBgmState.filter = ctx.createBiquadFilter();
  InlineBgmState.filter.type = "lowpass";
  InlineBgmState.filter.frequency.setValueAtTime(params.filterFreq, ctx.currentTime);
  InlineBgmState.filter.Q.setValueAtTime(0.6 + params.brightness * 1.4, ctx.currentTime);
  InlineBgmState.filter.connect(InlineBgmState.master);

  try {
    await ctx.resume();
    await connectInlineBgmOutput(ctx, InlineBgmState.master);
  } catch (error) {
    console.warn("[Hazama] inline BGM start failed:", error);
    resetInlineBgmGraph();
    setMusicBridgeStatus("タップでBGM再試行", "blocked");
    return false;
  }

  InlineBgmState.drone = [
    createInlineDroneVoice(ctx, params.baseFreq, "sine", params.droneGain),
    createInlineDroneVoice(ctx, params.baseFreq * 1.5, params.brightness > 0.55 ? "triangle" : "sine", params.droneGain * 0.48)
  ];
  // G5: サイレン声を常設し gain=0 から開始。深度で sirenPressure が上がると updateInlineBgm が煽る。
  InlineBgmState.siren = createInlineSirenVoice(ctx);
  InlineBgmState.siren.gain.gain.setTargetAtTime((params.sirenPressure || 0) * 0.05, ctx.currentTime + 0.05, 0.9);
  InlineBgmState.playing = true;
  scheduleInlineBgmPulse();
  updateInlineMediaSession(params, true);
  setMusicBridgeStatus(inlineBgmStatusText(), "inline");
  return true;
}

function stopInlineBgm() {
  if (!inlineBgmIsPlaying()) return false;
  const params = InlineBgmState.params;
  resetInlineBgmGraph();
  updateInlineMediaSession(params, false);
  return true;
}

function resumeInlineBgmIfNeeded() {
  const ctx = InlineBgmState.audioCtx;
  if (!inlineBgmIsPlaying() || !ctx || ctx.state !== "suspended") return;
  ctx.resume().then(() => {
    setMusicBridgeStatus(inlineBgmStatusText(), "inline");
  }).catch(() => {});
}

function installInlineBgmResumeHooks() {
  if (InlineBgmState.resumeInstalled) return;
  InlineBgmState.resumeInstalled = true;
  ["pointerdown", "touchend", "keydown"].forEach((eventName) => {
    window.addEventListener(eventName, resumeInlineBgmIfNeeded, { capture: true, passive: true });
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") resumeInlineBgmIfNeeded();
  });
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

function feedbackHazamaRuntime(runtime) {
  return runtime?.hazama && typeof runtime.hazama === "object" ? runtime.hazama : {};
}

function normalizeMusicConnectionState(runtime) {
  const hazama = feedbackHazamaRuntime(runtime);
  const raw = cleanDataToken(hazama.connectionState || runtime?.connectionState || "", "");
  const action = cleanDataToken(hazama.controlAction || runtime?.controlAction || "", "");
  const autoFollow = runtime?.autoFollow === true || hazama.autoFollow === true;
  if (["stop", "stopped"].includes(action) || ["stop", "stopped"].includes(raw)) return "stop";
  if (["pause", "paused"].includes(action) || ["pause", "paused"].includes(raw)) return "pause";
  if (["resume", "play", "playing", "follow", "following", "sync", "synced", "listening"].includes(raw)) return "follow";
  if (autoFollow && runtime?.playing === true) return "follow";
  if (runtime?.playing === true) return "ready";
  if (["ready", "pending", "armed", "idle", "lost"].includes(raw)) return raw || "ready";
  return raw || "ready";
}

function sanitizeMusicCulture(culture) {
  if (!culture) return "";
  if (typeof culture === "string") return cleanDataToken(culture, "");
  if (typeof culture === "object") {
    return cleanDataToken(culture.id || culture.name || culture.mode || culture.label || "", "");
  }
  return "";
}

function sanitizeMusicProposal(proposal) {
  if (!proposal) return "";
  if (typeof proposal === "string") return cleanShortText(proposal, "");
  if (typeof proposal === "object") {
    return cleanShortText(proposal.label || proposal.title || proposal.name || proposal.id || proposal.kind || "", "");
  }
  return "";
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
  const bpm = MusicFeedbackState.bpm ? `BPM ${MusicFeedbackState.bpm}` : "";
  const arc = musicArcLabel();
  return [musicConnectionStateCode(), bpm, arc].filter(Boolean).join(" / ");
}

function applyMusicFeedbackVisual() {
  const root = document.documentElement;
  if (!root) return;
  const state = MusicFeedbackState;
  const genre = state.genre || {};
  const gradient = state.gradient || {};
  const stateToken = cleanDataToken(state.connectionState || (state.connected ? "ready" : "idle"), "idle");
  const exposedState = ["stop", "stopped", "pause", "paused", "lost"].includes(stateToken)
    ? stateToken
    : state.connected ? stateToken : "idle";
  const chapterToken = cleanDataToken(state.chapter || state.chapterLabel || state.hazamaStage || "", "");
  const acidToken = state.acid > 0.42 ? "hot" : state.acid > 0.12 ? "warm" : "idle";
  root.dataset.hzMusicFeedback = state.connected ? "connected" : "idle";
  root.dataset.hzMusicChapter = chapterToken;
  root.dataset.hzMusicVisual = state.visual || "idle";
  root.dataset.hzMusicAcid = acidToken;
  root.dataset.musicState = exposedState;
  root.dataset.musicAutofollow = state.autoFollow ? "on" : "off";
  root.dataset.musicAcid = acidToken;
  root.dataset.musicChapter = chapterToken;
  root.dataset.musicCulture = state.culture || "none";
  root.style.setProperty("--hz-music-acid", state.acid.toFixed(3));
  root.style.setProperty("--hz-music-output", state.outputLevel.toFixed(3));
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
    MusicFeedbackState.auto = false;
    MusicFeedbackState.autoFollow = false;
    MusicFeedbackState.connectionState = "lost";
    MusicFeedbackState.controlAction = "";
    MusicFeedbackState.outputLevel = 0;
    MusicFeedbackState.visual = "idle";
    applyMusicFeedbackVisual();
    if (bgmFollowEnabled) setMusicBridgeStatus("BGM 再開", "IDLE");
  }, 14000);
}

function applyMusicRuntimeFeedback(payload) {
  if (!payload || typeof payload !== "object") return false;
  if (payload.type !== "music-runtime-feedback" || payload.version !== 1 || payload.provider !== "music") return false;
  if (payload.target && payload.target !== "hazama") return false;
  const runtime = payload.runtime && typeof payload.runtime === "object" ? payload.runtime : {};
  const hazama = feedbackHazamaRuntime(runtime);

  MusicFeedbackState.connected = true;
  MusicFeedbackState.lastAt = Date.now();
  MusicFeedbackState.playing = runtime.playing === true;
  MusicFeedbackState.auto = runtime.auto === true;
  MusicFeedbackState.autoFollow = runtime.autoFollow === true || hazama.autoFollow === true;
  MusicFeedbackState.connectionState = normalizeMusicConnectionState(runtime);
  MusicFeedbackState.controlAction = cleanShortText(hazama.controlAction || runtime.controlAction || "", "");
  MusicFeedbackState.outputLevel = safeFeedbackNumber(runtime.outputLevel, 0, 1);
  MusicFeedbackState.hazamaStage = cleanShortText(hazama.stage || "", "");
  MusicFeedbackState.hazamaDepthId = cleanShortText(hazama.depthId || "", "");
  MusicFeedbackState.chapter = cleanShortText(runtime.albumArc?.chapter || "", "");
  MusicFeedbackState.chapterLabel = cleanShortText(runtime.albumArc?.label || MusicFeedbackState.chapter || "", "");
  MusicFeedbackState.bpm = Math.round(clampNumber(runtime.bpm, 0, 220));
  MusicFeedbackState.acid = safeFeedbackNumber(runtime.acid?.performance, 0, 1);
  MusicFeedbackState.genre = sanitizeFeedbackMap(runtime.color?.genre, ["ambient", "idm", "techno", "pressure"]);
  MusicFeedbackState.gradient = sanitizeFeedbackMap(runtime.color?.gradient, ["haze", "memory", "micro", "ghost", "chrome", "organic"]);
  MusicFeedbackState.families = sanitizeFeedbackMap(runtime.color?.families, ["hazeBed", "chromeHymn", "memoryRefrain", "coldPulse", "ghostBody", "acidBiyon", "sub808", "reedBuzz"]);
  MusicFeedbackState.culture = sanitizeMusicCulture(runtime.culture);
  MusicFeedbackState.proposal = sanitizeMusicProposal(runtime.proposal);
  MusicFeedbackState.visual = musicFeedbackVisual(runtime);
  MusicFeedbackState.eventKind = cleanShortText(runtime.event?.kind || "", "");

  applyMusicFeedbackVisual();
  setMusicBridgeStatus(musicFeedbackStatusText(), MusicFeedbackState.connectionState === "follow" ? "LISTENING" : "READY");
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
  if (!bgmFollowEnabled) musicBridgePhase = "off";
  const companion = document.querySelector(".hz-bgm-companion");
  const status = $("bgm-status") || $("audio-gate-status") || $("music-profile-status");
  const phaseEl = $("bgm-phase") || $("audio-gate-phase");
  const detailEl = $("bgm-detail") || $("audio-gate-stage");
  const arcEl = $("bgm-arc");
  const openLink = $("music-open-provider");
  if (companion) {
    companion.dataset.bgmPhase = musicBridgePhase;
    companion.dataset.bgmCollapsed = bgmShouldCollapse() ? "true" : "false";
    companion.dataset.bgmFollow = bgmFollowEnabled ? "on" : "off";
    companion.dataset.inlineBgm = inlineBgmIsPlaying() ? "playing" : "idle";
    companion.dataset.musicState = cleanDataToken(MusicFeedbackState.connectionState || "idle", "idle");
    companion.dataset.musicAutofollow = MusicFeedbackState.autoFollow ? "on" : "off";
    companion.setAttribute("aria-hidden", "false");
  }
  if (phaseEl) phaseEl.textContent = bgmPhaseLabel();
  if (detailEl) detailEl.textContent = bgmCompactDetail(text);
  if (arcEl) arcEl.textContent = bgmArcDetail();
  if (status) status.textContent = bgmStatusLine(text);
  if (openLink) openLink.textContent = bgmOpenLinkLabel();
}

function musicTargetOrigin(mode = "production") {
  const provider = activeAudioProvider();
  return mode === "local" ? provider.localOrigin : provider.origin;
}

function musicWindowReadyForOrigin(target, expectedOrigin) {
  if (!target || !expectedOrigin) return false;
  try {
    const href = target.location?.href || "";
    if (!href || href === "about:blank") return false;
    const origin = target.location?.origin || "";
    return !origin || origin === expectedOrigin;
  } catch (_) {
    return true;
  }
}

function postMusicPayload(mode = "production", payload = lastMusicPayload) {
  if (!bgmFollowEnabled) return false;
  const target = musicBridgeWindows[mode];
  if (!target || !payload) return false;
  if (target.closed) {
    musicBridgeWindows[mode] = null;
    return false;
  }
  const targetOrigin = musicTargetOrigin(mode);
  if (!musicWindowReadyForOrigin(target, targetOrigin)) return false;
  try {
    target.postMessage(payload, targetOrigin);
    return true;
  } catch (error) {
    console.warn("[Hazama] Music bridge postMessage failed:", error);
    return false;
  }
}

function postMusicControl(action = "resume", mode = "production") {
  const target = musicBridgeWindows[mode];
  if (!target) return false;
  if (target.closed) {
    musicBridgeWindows[mode] = null;
    return false;
  }
  const targetOrigin = musicTargetOrigin(mode);
  if (!musicWindowReadyForOrigin(target, targetOrigin)) return false;
  const payload = {
    type: "hazama-control",
    version: 1,
    provider: "music",
    target: "music",
    action: cleanShortText(action, "resume"),
    source: {
      repo: "QuietBriony/hazama",
      appVersion: APP_VERSION
    }
  };
  try {
    target.postMessage(payload, targetOrigin);
    return true;
  } catch (error) {
    console.warn("[Hazama] Music control postMessage failed:", error);
    return false;
  }
}

function postMusicControlAll(action = "resume") {
  const productionSent = postMusicControl(action, "production");
  const localSent = postMusicControl(action, "local");
  return productionSent || localSent;
}

function hasOpenMusicWindow(mode = "production") {
  const target = musicBridgeWindows[mode];
  if (!target) return false;
  if (target.closed) {
    musicBridgeWindows[mode] = null;
    return false;
  }
  return true;
}

function syncMusicBridge(profile = buildMusicProfile()) {
  lastMusicPayload = createMusicPayload(profile);
  if (inlineBgmIsPlaying()) {
    updateInlineBgm(profile);
  }
  if (!bgmFollowEnabled) {
    setMusicBridgeStatus("止めています", "off");
    return { payload: lastMusicPayload, sent: false };
  }
  const productionSent = postMusicPayload("production", lastMusicPayload);
  const localSent = postMusicPayload("local", lastMusicPayload);
  if ((productionSent || localSent) && musicBridgePhase !== "pending") {
    setMusicBridgeStatus("同期しました", "synced");
  } else if (!(productionSent || localSent) && (musicBridgePhase === "synced" || musicBridgePhase === "LISTENING")) {
    setMusicBridgeStatus("BGM 再開", "armed");
  }
  return { payload: lastMusicPayload, sent: productionSent || localSent };
}

function openMusicBridge(mode = "production") {
  bgmFollowEnabled = true;
  const profile = buildMusicProfile();
  const payload = createMusicPayload(profile);
  lastMusicPayload = payload;
  const url = makeMusicLaunchUrl(payload, mode);
  const targetName = mode === "local" ? "hazama-music-local" : "hazama-music";
  const musicWindow = window.open(url, targetName);
  if (!musicWindow) return false;
  musicBridgeWindows[mode] = musicWindow;
  setMusicBridgeStatus("MusicタブでSTART.HZM", "pending");
  window.setTimeout(() => postMusicPayload(mode, payload), 600);
  return true;
}

function isMusicLaunchTarget(target) {
  return Boolean(target?.closest?.(".hz-bgm-companion, #music-open-provider, #music-open-local, #bgm-toggle-provider, #bgm-stop-provider"));
}

function attemptMusicAutoStart(ev) {
  if (musicAutoStartDone) return;
  if (!bgmFollowEnabled) return;
  if (isMusicLaunchTarget(ev?.target || document.activeElement)) return;
  musicAutoStartDone = true;
  const synced = syncMusicBridge();
  if (synced.sent) {
    setMusicBridgeStatus("同期しました", "synced");
    return;
  }
  setMusicBridgeStatus("同じ画面BGM待ち", "armed");
}

function installMusicAutoStart() {
  if (musicAutoStartInstalled) return;
  musicAutoStartInstalled = true;
  setMusicBridgeStatus("同じ画面BGM待ち", "armed");
  window.addEventListener("pointerdown", attemptMusicAutoStart, { once: true, capture: true, passive: true });
  window.addEventListener("keydown", attemptMusicAutoStart, { once: true, capture: true });
  window.addEventListener("focus", () => {
    if (musicBridgePhase !== "pending") return;
    const synced = syncMusicBridge();
    if (synced.sent) setMusicBridgeStatus("同期しました", "synced");
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

function resumeBgmCompanion(mode = "production") {
  bgmFollowEnabled = true;
  bgmExpanded = true;
  musicBridgePhase = musicBridgePhase === "off" ? "armed" : musicBridgePhase;
  if (MusicFeedbackState.connectionState === "stop" || MusicFeedbackState.connectionState === "pause") {
    MusicFeedbackState.connectionState = "ready";
    MusicFeedbackState.controlAction = "resume";
    applyMusicFeedbackVisual();
  }
  postMusicControlAll("resume");
  if (hasOpenMusicWindow(mode)) {
    const synced = syncMusicBridge();
    if (synced.sent) {
      setMusicBridgeStatus("同期しました", "synced");
      return true;
    }
  }
  const opened = openMusicBridge(mode);
  setMusicBridgeStatus(opened ? "MusicタブでSTART.HZM" : "リンクでMusicを開く", opened ? "pending" : "blocked");
  return opened;
}

function stopBgmCompanion() {
  stopInlineBgm();
  bgmFollowEnabled = false;
  bgmExpanded = false;
  musicAutoStartDone = true;
  MusicFeedbackState.connectionState = "stop";
  MusicFeedbackState.autoFollow = false;
  MusicFeedbackState.controlAction = "stop";
  applyMusicFeedbackVisual();
  postMusicControlAll("stop");
  setMusicBridgeStatus("止めています", "off");
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
      const opened = resumeBgmCompanion("production");
      musicAutoStartDone = musicAutoStartDone || opened;
      if (opened) {
        ev.preventDefault();
      } else {
        setMusicStatus("リンクでMusicを開く", "blocked");
      }
    });
  }

  const inlineBtn = $("bgm-inline-start");
  if (inlineBtn) {
    inlineBtn.addEventListener("click", async () => {
      const started = await startInlineBgm();
      musicAutoStartDone = musicAutoStartDone || started;
      if (!started) setMusicStatus("タップでBGM再試行", "blocked");
    });
  }

  const localLink = $("music-open-local");
  if (localLink) {
    localLink.addEventListener("click", (ev) => {
      const opened = resumeBgmCompanion("local");
      musicAutoStartDone = musicAutoStartDone || opened;
      if (opened) {
        ev.preventDefault();
      } else {
        setMusicStatus("リンクでMusicを開く", "blocked");
      }
    });
  }

  const bgmToggle = $("bgm-toggle-provider");
  if (bgmToggle) {
    bgmToggle.addEventListener("click", async () => {
      if (!inlineBgmIsPlaying()) {
        const started = await startInlineBgm();
        musicAutoStartDone = musicAutoStartDone || started;
        if (!started) setMusicStatus("タップでBGM再試行", "blocked");
        return;
      }
      bgmExpanded = !bgmExpanded;
      setMusicBridgeStatus(inlineBgmStatusText(), "inline");
    });
  }

  const bgmStop = $("bgm-stop-provider");
  if (bgmStop) {
    bgmStop.addEventListener("click", stopBgmCompanion);
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

  if (fromId === "A_reborn" && toId === HUB_DEPTH && state.gateRunStatus === "won") {
    startNextLoopState(state, toId);
    saveRunState();
    runLog = "次周回開始 / Ωは閉じた。";
    return toId;
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
  resetBreathStreak(state);

  const notes = [
    `${MOVE_TYPE_LABELS[preview.moveType] || preview.moveType}`,
    `落ち着き ${signedNumber(preview.stabilityDelta)}`,
    `響き ${signedNumber(preview.resonanceDelta)}`,
    `扉の開き ${signedNumber(gateDelta)}`
  ];
  if (markGain > 0) notes.push(`しるし +${markGain}`);

  if (state.stability <= 0 && toId !== HUB_DEPTH && toId !== DEFAULT_START) {
    targetId = depths[HUB_DEPTH] ? HUB_DEPTH : DEFAULT_START;
    state.gateRunStatus = "lost";
    state.gateRunOutcomeAt = Date.now();
    recordGateCollapse(state);
    state.stability = 24;
    state.resonance = clampNumber(state.resonance - 6, 0, RESONANCE_MAX);
    state.gateRunCharge = clampNumber(Math.min(state.gateRunCharge, 72), 0, GATE_RUN_MAX_CHARGE);
    notes.push("浮上して立て直す: 夜のハブへ戻った");
  } else if (state.gateRunStatus === "running" && state.gateRunCharge >= GATE_RUN_MAX_CHARGE) {
    state.gateRunStatus = "won";
    state.gateRunOutcomeAt = Date.now();
    notes.push("扉が開いた");
  }

  state.lastDepthId = targetId;
  state.lastGateResult = notes.join(" / ");
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

function breathDiminishForStreak(streak) {
  if (GateRunModel.breathDiminishForStreak) return GateRunModel.breathDiminishForStreak(streak);
  if (streak <= 1) return { multiplier: 1, resonanceCap: 2, gateDelta: 0, turnCost: 0 };
  if (streak === 2) return { multiplier: 0.65, resonanceCap: 1, gateDelta: -2, turnCost: 0 };
  if (streak === 3) return { multiplier: 0.35, resonanceCap: 0, gateDelta: -4, turnCost: 1 };
  return { multiplier: 0.2, resonanceCap: 0, gateDelta: -6, turnCost: 1 };
}

function breathStabilityCap(depthId) {
  if (GateRunModel.breathStabilityCap) return GateRunModel.breathStabilityCap(depthId, {
    hubDepthId: HUB_DEPTH,
    startDepthId: DEFAULT_START
  });
  return depthId === HUB_DEPTH || depthId === DEFAULT_START
    ? BREATH_HUB_STABILITY_CAP
    : BREATH_FIELD_STABILITY_CAP;
}

function applyCoreReward(reward, depthId = currentDepthId) {
  const state = getRunState();
  const applied = GateRunModel.applyBreathReward
    ? GateRunModel.applyBreathReward(state, reward, gateRunModelContext(depthId, { depthId }))
    : null;
  let breath;
  let targetDepthId = null;

  if (applied) {
    Object.assign(state, applied.state);
    breath = applied.breath;
    targetDepthId = applied.targetDepthId;
  } else {
    const sameBreathDepth = state.lastBreathDepthId === depthId;
    const nextStreak = sameBreathDepth ? state.breathStreak + 1 : 1;
    const diminish = breathDiminishForStreak(nextStreak);
    const stabilityGain = Math.max(1, Math.round(reward.stabilityGain * diminish.multiplier));
    const resonanceGain = Math.max(0, Math.min(diminish.resonanceCap, reward.resonanceGain));
    const cap = breathStabilityCap(depthId);
    const rawResonance = state.resonance + resonanceGain;
    let markGain = nextStreak === 1 ? reward.markGain : 0;

    state.entries += 1;
    state.breathStreak = nextStreak;
    state.lastBreathDepthId = depthId;
    state.lastBreathStep = state.steps + state.entries;
    state.stability = clampNumber(
      state.stability >= cap ? state.stability : Math.min(cap, state.stability + stabilityGain),
      0,
      STABILITY_MAX
    );
    state.gateRunCharge = clampNumber(state.gateRunCharge + diminish.gateDelta, 0, GATE_RUN_MAX_CHARGE);
    if (state.gateRunStatus === "running") state.gateRunTurns += diminish.turnCost;

    if (resonanceGain > 0 && rawResonance >= RESONANCE_MAX) {
      state.resonance = 64 + (rawResonance % 9);
      markGain += 1;
    } else {
      state.resonance = clampNumber(rawResonance, 0, RESONANCE_MAX);
    }

    state.marks = clampNumber(state.marks + markGain, 0, 99);
    breath = {
      nextStreak,
      stabilityGain,
      resonanceGain,
      markGain,
      gateDelta: diminish.gateDelta,
      turnCost: diminish.turnCost
    };
  }

  const notes = [
    `ひと息 ${breath.nextStreak}回目: 落ち着き +${breath.stabilityGain}`,
    `響き +${breath.resonanceGain}`
  ];
  if (breath.gateDelta < 0) notes.push(`扉の開き ${breath.gateDelta}`);
  if (breath.turnCost > 0) notes.push(`行動 +${breath.turnCost}`);
  if (breath.markGain > 0) notes.push(`しるし +${breath.markGain}`);

  if (applied?.events?.won) {
    notes.push("扉が開いた");
  } else if (applied?.events?.timeout) {
    recordGateCollapse(state);
    notes.push("時間切れ。夜のハブへ戻った");
  } else if (applied?.events?.lost) {
    recordGateCollapse(state);
    notes.push("立て直し中。夜のハブへ戻った");
  } else if (!applied) {
    targetDepthId = resolveGateRunOutcome(state, notes);
  }
  state.lastGateResult = notes.join(" / ");
  saveRunState();

  runLog = `${notes.join(" / ")}。`;
  syncVisualMotion(currentDepthId);
  refreshRunPanel();
  return {
    message: runLog,
    targetDepthId
  };
}

const GATE_RUN_ACTIONS = [
  {
    id: "dive",
    role: "攻める",
    title: "さらに奥へ進む",
    meta: "落ち着きを削って、扉の開きを大きく進める。"
  },
  {
    id: "observe",
    role: "見る",
    title: "周囲をよく見る",
    meta: "危険を抑えながら、次の進み方を読む。"
  },
  {
    id: "tune",
    role: "整える",
    title: "呼吸を整える",
    meta: "落ち着きと響きを戻す。扉の開きは少しだけ。"
  },
  {
    id: "sync",
    role: "合わせる",
    title: "扉に合わせる",
    meta: "準備が整った時だけ、響きを消費して扉へ合わせる。"
  },
  {
    id: "retreat",
    role: "戻る",
    title: "夜のハブへ戻る",
    meta: "HUBで立て直す。扉の開きは少し戻る。"
  }
];

function gateRunStatusLabel(state = getRunState()) {
  if (state.gateRunStatus === "won") return "扉が開いた";
  if (state.gateRunStatus === "lost") return "立て直し中";
  if (state.gateRunCharge >= 82) return "あと少し";
  if (state.stability < 28) return "落ち着き不足";
  return "進行中";
}

function gateRunReadinessLabel(state = getRunState()) {
  if (state.gateRunStatus === "won") return "Ω解放中";
  if (state.gateRunStatus === "lost") return "戻るで再挑戦";
  return gateRunSyncReadiness(state).label;
}

function gateRunRetreatAdvice(state = getRunState()) {
  const stability = Math.round(state.stability);
  const charge = Math.round(state.gateRunCharge);
  if (state.gateRunStatus === "won") {
    return {
      level: "next-loop",
      badge: "次周回",
      label: "次周回: HUBへ戻るとΩは閉じる",
      next: "HUBで再挑戦"
    };
  }
  if (state.gateRunStatus === "lost") {
    return {
      level: "retry",
      badge: "再挑戦",
      label: "再挑戦: 戻るで崩落を閉じる",
      next: "戻るで再挑戦"
    };
  }
  if (stability < 38) {
    return {
      level: "recommended",
      badge: "退避推奨",
      label: `退避推奨: 落ち着き ${stability}`,
      next: "戻るかBreath Gate"
    };
  }
  if (charge >= 82 && stability >= 38) {
    return {
      level: "hold",
      badge: "押し切れる",
      label: `退避任意: 扉 ${charge}%`,
      next: "合わせる準備を確認"
    };
  }
  return {
    level: "optional",
    badge: "退避任意",
    label: `退避任意: 落ち着き ${stability}`,
    next: "低くなったら戻る"
  };
}

function gateRunSyncReadiness(state = getRunState()) {
  const resonance = Math.round(state.resonance);
  const charge = Math.round(state.gateRunCharge);
  const marks = Math.round(state.marks);
  const markPath = marks > 0;
  const chargeTarget = markPath ? GATE_SYNC_MARK_CHARGE : GATE_SYNC_READY_CHARGE;
  const ready = canSyncGate(state);
  const resource = markPath
    ? `しるし ${marks} / 扉 ${charge}/${chargeTarget}%`
    : `響き ${resonance}/${GATE_SYNC_READY_RESONANCE} / 扉 ${charge}/${chargeTarget}%`;
  let next = "整えるで響き、攻めるで扉";
  if (ready) next = "次は合わせる";
  else if (markPath && charge < chargeTarget) next = "攻めるで扉";
  else if (!markPath && resonance < GATE_SYNC_READY_RESONANCE && charge < chargeTarget) next = "整える+攻める";
  else if (!markPath && resonance < GATE_SYNC_READY_RESONANCE) next = "整えるで響き";
  else if (charge < chargeTarget) next = "攻めるで扉";

  return {
    ready,
    label: `${ready ? "合わせる準備OK" : "合わせる準備前"}: ${resource}`,
    badge: ready ? "準備OK" : "準備前",
    next,
    resource
  };
}

function gateRunMissionText(state = getRunState()) {
  if (state.gateRunStatus === "won") return "Ωへ入ると一周の到達点です。";
  if (state.gateRunStatus === "lost") return "夜のハブへ戻って、落ち着きを戻してから再挑戦できます。";
  const retreat = gateRunRetreatAdvice(state);
  if (retreat.level === "recommended") return "落ち着きが薄いので、戻るか限定回復で立て直せます。";
  const readiness = gateRunSyncReadiness(state);
  if (readiness.ready) return "準備OK。響きを消費して扉に合わせます。";
  return `${readiness.next}。合わせるは準備後の仕上げです。`;
}

function gateRunPulseCue(state = getRunState()) {
  const charge = Math.round(clampNumber(state.gateRunCharge, 0, GATE_RUN_MAX_CHARGE));
  const stability = Math.round(clampNumber(state.stability, 0, STABILITY_MAX));
  const turnsLeft = Math.max(0, GATE_RUN_TURN_LIMIT - state.gateRunTurns);
  const readiness = gateRunSyncReadiness(state);

  if (state.gateRunStatus === "won") {
    return {
      tone: "win",
      label: "開門",
      actionId: "omega",
      action: "Ωへ",
      copy: "扉は開いている。ここは報酬ターン。"
    };
  }

  if (state.gateRunStatus === "lost") {
    return {
      tone: "retry",
      label: "再挑戦",
      actionId: "retreat",
      action: "戻る",
      copy: "HUBで崩落を閉じて、次の挑戦へ。"
    };
  }

  if (stability < 38) {
    return {
      tone: "calm",
      label: "退避ライン",
      actionId: "retreat",
      action: "戻る",
      copy: `落ち着き ${stability}。今は立て直しが強い。`
    };
  }

  if (readiness.ready) {
    return {
      tone: "sync",
      label: "合わせどき",
      actionId: "sync",
      action: "合わせる",
      copy: "響きと扉が噛み合っている。仕上げに行ける。"
    };
  }

  if (charge >= 82) {
    return {
      tone: "sync",
      label: "あと一押し",
      actionId: "sync",
      action: "準備して合わせる",
      copy: `扉 ${charge}%。整えてから合わせると気持ちいい。`
    };
  }

  if (turnsLeft <= 4) {
    return {
      tone: "push",
      label: "時間圧",
      actionId: charge >= 64 ? "sync" : "dive",
      action: charge >= 64 ? "合わせる準備" : "攻める",
      copy: `残り ${turnsLeft}。迷うより、扉を動かす。`
    };
  }

  if (state.resonance < GATE_SYNC_READY_RESONANCE && charge >= 38) {
    return {
      tone: "tune",
      label: "溜めどき",
      actionId: "tune",
      action: "整える",
      copy: "響きを溜めると、次の合わせが読みやすい。"
    };
  }

  return {
    tone: "push",
    label: "攻めどき",
    actionId: "dive",
    action: "攻める",
    copy: "まず扉を動かす。リスクはあるが進みが大きい。"
  };
}

function renderGateRunPulseMarkup(state = getRunState(), cue = gateRunPulseCue(state)) {
  const turnsLeft = state.gateRunStatus === "running"
    ? `${Math.max(0, GATE_RUN_TURN_LIMIT - state.gateRunTurns)}手`
    : state.gateRunStatus === "won" ? "OPEN" : "RETRY";
  const gate = Math.round(clampNumber(state.gateRunCharge, 0, GATE_RUN_MAX_CHARGE));
  return `
    <div class="hz-gate-pulse hz-gate-pulse--${escapeHtml(cue.tone)}" aria-label="Gate Run pulse">
      <span class="hz-gate-pulse-kicker">今のノリ</span>
      <b>${escapeHtml(cue.label)}</b>
      <span>${escapeHtml(cue.copy)}</span>
      <span class="hz-gate-pulse-pick">推し手: ${escapeHtml(cue.action)}</span>
      <span class="hz-gate-pulse-meta">扉 ${gate}% / ${escapeHtml(turnsLeft)}</span>
    </div>
  `;
}

function gateRunActionPreview(actionId) {
  const state = getRunState();
  const context = gateRunModelContext(currentDepthId);
  const modelPreview = GateRunModel.previewGateAction
    ? GateRunModel.previewGateAction(state, context, actionId)
    : null;
  const bonus = modelPreview?.bonus ?? numericHash(`${ensureSeed()}|${currentDepthId}|${state.gateRunTurns}|${actionId}`) % 4;
  const closed = modelPreview?.closed ?? (state.gateRunStatus !== "running" && actionId !== "retreat");
  const common = { disabled: modelPreview?.disabled ?? (navigationLocked || closed), result: "", title: "" };

  if (actionId === "dive") {
    const cost = Math.abs(modelPreview?.stabilityDelta ?? 15);
    const charge = modelPreview?.chargeDelta ?? 14 + bonus;
    return {
      ...common,
      result: `扉の開き +${charge} / 響き +3 / 落ち着き -${cost}`,
      title: "落ち着きを削って、扉の開きを大きく進める。"
    };
  }

  if (actionId === "observe") {
    const charge = modelPreview?.chargeDelta ?? 4 + (bonus % 3);
    return {
      ...common,
      result: `扉の開き +${charge} / 響き +1 / 落ち着き +3`,
      title: "周囲をよく見て、無理なく扉の開きを進める。"
    };
  }

  if (actionId === "tune") {
    const charge = modelPreview?.chargeDelta ?? 2 + (bonus % 3);
    return {
      ...common,
      result: `扉の開き +${charge} / 響き +5 / 落ち着き +6`,
      title: "呼吸を整え、次の接続に耐える土台を作る。"
    };
  }

  if (actionId === "sync") {
    const enough = modelPreview?.ready ?? canSyncGate(state);
    const charge = modelPreview?.chargeDelta ?? (enough ? 18 + Math.min(3, state.marks * 2) + (bonus % 4) : 2 + (bonus % 3));
    return {
      ...common,
      ready: enough,
      disabled: common.disabled,
      result: enough ? `扉の開き +${charge} / 響き -16 / 準備OK` : `準備前 / 扉の開き +${charge} / 響き -2`,
      title: enough ? "響きを束ねて、扉へ直接つなぐ。" : "まだ仕上げ前です。整えるか攻めるで準備してから合わせます。"
    };
  }

  return {
    ...common,
    disabled: navigationLocked,
    result: modelPreview?.resetWon || state.gateRunStatus === "won"
      ? "次周回開始 / Ωを閉じる"
      : state.gateRunStatus === "lost"
        ? "再挑戦開始 / 落ち着き +22"
        : state.stability < 38
          ? "退避推奨 / 落ち着き +22 / 扉の開き -8"
          : "退避任意 / 落ち着き +22 / 扉の開き -8",
    title: state.gateRunStatus === "won"
      ? "一周を閉じ、夜のハブから次のGate Runを始めます。"
      : state.gateRunStatus === "running"
        ? "落ち着きが薄い時は、戻って立て直すと崩落を避けやすくなります。"
        : "崩落後の記録を閉じ、次の挑戦を起こす。"
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

function startNextLoopState(state, targetDepthId = HUB_DEPTH) {
  const bestRank = Math.max(Number(state.bestRank) || 0, depthRank(currentDepthId));
  const collapseCount = Math.max(0, Number(state.collapseCount) || 0);
  resetGateRunState(state);
  resetBreathStreak(state);
  state.stability = Math.max(76, Math.min(STABILITY_MAX, Number(state.stability) || 76));
  state.resonance = 0;
  state.marks = 0;
  state.steps = 0;
  state.entries = 0;
  state.bestRank = bestRank;
  state.collapseCount = collapseCount;
  state.lastMoveType = "retreat";
  state.lastDepthId = targetDepthId;
  state.lastGateResult = "次周回開始 / Ωは閉じた";
}

function resolveGateRunOutcome(state, notes) {
  let targetDepthId = null;

  if (state.stability <= 0) {
    state.gateRunStatus = "lost";
    state.gateRunOutcomeAt = Date.now();
    recordGateCollapse(state);
    state.stability = Math.max(24, state.stability);
    state.resonance = clampNumber(state.resonance - 8, 0, RESONANCE_MAX);
    state.gateRunCharge = clampNumber(Math.min(state.gateRunCharge, 72), 0, GATE_RUN_MAX_CHARGE);
    targetDepthId = depths[HUB_DEPTH] ? HUB_DEPTH : DEFAULT_START;
    notes.push("立て直し中。夜のハブへ戻った");
  } else if (state.gateRunStatus !== "won" && state.gateRunCharge >= GATE_RUN_MAX_CHARGE) {
    state.gateRunStatus = "won";
    state.gateRunCharge = GATE_RUN_MAX_CHARGE;
    state.gateRunOutcomeAt = Date.now();
    notes.push("扉が開いた");
  } else if (state.gateRunStatus === "running" && state.gateRunTurns >= GATE_RUN_TURN_LIMIT) {
    state.gateRunStatus = "lost";
    state.gateRunOutcomeAt = Date.now();
    recordGateCollapse(state);
    state.stability = Math.max(24, state.stability);
    state.resonance = clampNumber(state.resonance - 8, 0, RESONANCE_MAX);
    state.gateRunCharge = clampNumber(Math.min(state.gateRunCharge, 72), 0, GATE_RUN_MAX_CHARGE);
    targetDepthId = depths[HUB_DEPTH] ? HUB_DEPTH : DEFAULT_START;
    notes.push("時間切れ。夜のハブへ戻った");
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

  const notes = [`${action.title}: ${preview.result}`];
  let targetDepthId = null;

  if (GateRunModel.applyGateAction) {
    const applied = GateRunModel.applyGateAction(state, gateRunModelContext(currentDepthId), actionId);
    Object.assign(state, applied.state);
    targetDepthId = applied.targetDepthId;
    if (applied.events.resetLost) notes.push("再挑戦を開始");
    if (applied.events.resetWon) {
      startNextLoopState(state, targetDepthId || HUB_DEPTH);
      notes.push("次周回開始 / Ωを閉じた");
    }
    if (applied.events.won) {
      notes.push("扉が開いた");
    } else if (applied.events.timeout) {
      recordGateCollapse(state);
      notes.push("時間切れ。夜のハブへ戻った");
    } else if (applied.events.lost) {
      recordGateCollapse(state);
      notes.push("立て直し中。夜のハブへ戻った");
    }
    state.lastGateResult = notes.join(" / ");
  } else {
    const rank = depthRank(currentDepthId);
    const risk = buildGateIntelligence(currentDepthId).risk;
    const bonus = numericHash(`${ensureSeed()}|${currentDepthId}|${state.gateRunTurns}|${actionId}`) % 4;
    let chargeDelta = 0;
    let stabilityDelta = 0;
    let resonanceDelta = 0;
    let marksDelta = 0;
    const countsAsGateTurn = actionId !== "retreat";

    if (actionId === "retreat") {
      const nextLoop = state.gateRunStatus === "won";
      if (state.gateRunStatus === "lost") {
        resetGateRunState(state);
        notes.push("再挑戦を開始");
      }
      if (nextLoop) {
        startNextLoopState(state);
        notes.push("次周回開始 / Ωを閉じた");
      }
      stabilityDelta = nextLoop ? 0 : 22;
      resonanceDelta = nextLoop ? 0 : -4;
      chargeDelta = nextLoop ? 0 : -8;
      targetDepthId = currentDepthId !== HUB_DEPTH && depths[HUB_DEPTH] ? HUB_DEPTH : null;
    } else if (actionId === "dive") {
      stabilityDelta = -(15 + Math.ceil(risk / 18));
      resonanceDelta = 3;
      chargeDelta = 14 + Math.floor(rank / 5) + bonus;
    } else if (actionId === "observe") {
      stabilityDelta = 3;
      resonanceDelta = 1;
      chargeDelta = 4 + (bonus % 3);
    } else if (actionId === "tune") {
      stabilityDelta = 6;
      resonanceDelta = 5;
      chargeDelta = 2 + (bonus % 3);
    } else if (actionId === "sync") {
      const enough = canSyncGate(state);
      if (enough) {
        resonanceDelta = -16;
        marksDelta = state.marks > 0 ? -1 : 0;
        chargeDelta = 18 + Math.min(3, state.marks * 2) + (bonus % 4);
      } else {
        stabilityDelta = -4;
        resonanceDelta = -2;
        chargeDelta = 2 + (bonus % 3);
      }
    }

    if (countsAsGateTurn) state.gateRunTurns += 1;
    state.stability = clampNumber(state.stability + stabilityDelta, 0, STABILITY_MAX);
    state.resonance = clampNumber(state.resonance + resonanceDelta, 0, RESONANCE_MAX);
    state.marks = clampNumber(state.marks + marksDelta, 0, 99);
    state.gateRunCharge = clampNumber(state.gateRunCharge + chargeDelta, 0, GATE_RUN_MAX_CHARGE);
    state.lastGateAction = actionId;
    state.lastMoveType = actionId;
    state.lastGateResult = notes.join(" / ");
    resetBreathStreak(state);

    const outcomeTarget = resolveGateRunOutcome(state, notes);
    if (outcomeTarget) targetDepthId = outcomeTarget;
  }

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
      <span class="hz-gate-track-label hz-gate-track-label--start">0</span>
      <span class="hz-gate-track-label hz-gate-track-label--end">Ω 100</span>
    </div>
  `;
}

function gateRunActionTitle(actionId) {
  const action = GATE_RUN_ACTIONS.find((item) => item.id === actionId);
  return action?.title || MOVE_TYPE_LABELS[actionId] || "道を選んだ";
}

function renderGateOutcomeMarkup(state) {
  const result = state.lastGateResult || "";
  let tone = "";
  let badge = "";
  let title = "";
  let copy = "";

  if (state.gateRunStatus === "won") {
    tone = "win";
    badge = "OPEN";
    title = "扉が開いた";
    copy = currentDepthId === OMEGA_DEPTH
      ? "そのままA_rebornへ進めば、一周の終わりが残ります。"
      : "Ωへ進めます。HUBへ戻っても解放は保持されます。";
  } else if (state.gateRunStatus === "lost") {
    const isTimeout = result.includes("時間切れ");
    tone = isTimeout ? "timeout" : "loss";
    badge = isTimeout ? "TIME" : "RECOVER";
    title = isTimeout ? "時間切れ" : "立て直し中";
    copy = isTimeout
      ? "HUBで落ち着きを戻して再挑戦できます。扉の開きは少し残ります。"
      : "崩落は終わりではありません。HUBで整えて、もう一度扉を押せます。";
  }

  if (!tone) return "";
  return `
    <div class="hz-gate-outcome hz-gate-outcome--${tone}" aria-live="polite">
      <span class="hz-gate-outcome-badge">${escapeHtml(badge)}</span>
      <div class="hz-gate-outcome-copy">
        <b>${escapeHtml(title)}</b>
        <span>${escapeHtml(copy)}</span>
      </div>
    </div>
  `;
}

function renderLoopSummaryMarkup(state) {
  const gateTurns = Math.max(0, Number(state.gateRunTurns) || 0);
  const routeSteps = Math.max(0, Number(state.steps) || 0);
  const breaths = Math.max(0, Number(state.entries) || 0);
  const collapses = Math.max(0, Number(state.collapseCount) || 0);
  const mainAction = gateRunActionTitle(state.lastGateAction || state.lastMoveType);
  const collapseLabel = collapses > 0 ? `${collapses}回` : "なし";
  const breathLabel = breaths > 0 ? `${breaths}回` : "なし";

  return `
    <div class="hz-loop-summary" aria-label="Run result">
      <span><b>${gateTurns}手</b><small>Gate Run</small></span>
      <span><b>${routeSteps}歩</b><small>道</small></span>
      <span><b>${escapeHtml(collapseLabel)}</b><small>崩落</small></span>
      <span><b>${escapeHtml(breathLabel)}</b><small>休息</small></span>
      <span><b>${escapeHtml(mainAction)}</b><small>主な行動</small></span>
      <span><b>到達</b><small>Ω</small></span>
    </div>
  `;
}

function loopFlavorLabel(state) {
  const gateTurns = Math.max(0, Number(state.gateRunTurns) || 0);
  const breaths = Math.max(0, Number(state.entries) || 0);
  const collapses = Math.max(0, Number(state.collapseCount) || 0);
  if (collapses > 0) return "立て直して掴んだ一周";
  if (gateTurns > 0 && gateTurns <= 9) return "駆け抜けた一周";
  if (breaths > 0) return "呼吸でつないだ一周";
  if (gateTurns >= 13) return "ぎりぎりで開いた一周";
  return "扉と噛み合った一周";
}

function renderGateRunPanelMarkup() {
  const state = getRunState();
  const syncReadiness = gateRunSyncReadiness(state);
  const retreatAdvice = gateRunRetreatAdvice(state);
  const pulseCue = gateRunPulseCue(state);
  const statusClass = state.gateRunStatus === "won" ? "hz-gate-win" : state.gateRunStatus === "lost" ? "hz-gate-loss" : "";
  const status = statusClass
    ? `<span class="${statusClass}">${escapeHtml(gateRunStatusLabel(state))}</span>`
    : `<span>${escapeHtml(gateRunStatusLabel(state))}</span>`;
  const turnMeta = state.gateRunStatus === "running"
    ? `残り ${Math.max(0, GATE_RUN_TURN_LIMIT - state.gateRunTurns)}`
    : state.gateRunStatus === "won" ? "Ω解放中" : "再挑戦可";
  const statusLine = `${status}<span>${escapeHtml(turnMeta)}</span><span>扉 ${Math.round(state.gateRunCharge)}%</span>`;
  const mission = gateRunMissionText(state);
  const readiness = gateRunReadinessLabel(state);
  const outcomeNotice = renderGateOutcomeMarkup(state);
  const introOnly = currentDepthId === DEFAULT_START && state.gateRunStatus === "running";
  if (introOnly) {
    const startTarget = depths[HUB_DEPTH] ? HUB_DEPTH : "";
    return `
      <section class="hz-gate-run-panel hz-gate-run-panel--intro" aria-label="Gate Run">
        <div class="hz-gate-run-head">
          <span>Gate Run / 扉操作</span>
          <span class="hz-gate-run-status">${statusLine}</span>
        </div>
        <div class="hz-gate-run-intro">
          <span class="hz-gate-run-start-pill">HUBで操作開始</span>
          <p>入口では夜のハブへ入るのが主導線です。HUBから扉100%を目指します。</p>
          <div class="hz-gate-run-intro-actions">
            <button class="hz-start-cta" type="button" data-start-hub="${escapeHtml(startTarget)}"${startTarget ? "" : " disabled"}>
              夜のハブへ入る
            </button>
            <span class="hz-start-note">そこからGate Runを始めます</span>
          </div>
        </div>
      </section>
    `;
  }
  const showGateActions = state.gateRunStatus !== "won"
    && !(currentDepthId === OMEGA_DEPTH || currentDepthId === "A_reborn");
  const actionButtons = showGateActions
    ? GATE_RUN_ACTIONS.map((action) => {
        const preview = gateRunActionPreview(action.id);
        const syncClass = action.id === "sync"
          ? ` hz-gate-action--sync-${preview.ready ? "ready" : "waiting"}`
          : "";
        const syncBadge = action.id === "sync"
          ? `<span class="hz-gate-action-state">${escapeHtml(syncReadiness.badge)}</span>`
          : "";
        const retreatClass = action.id === "retreat"
          ? ` hz-gate-action--retreat-${escapeHtml(retreatAdvice.level)}`
          : "";
        const retreatBadge = action.id === "retreat"
          ? `<span class="hz-gate-action-state hz-gate-action-state--retreat">${escapeHtml(retreatAdvice.badge)}</span>`
          : "";
        const recommended = action.id === pulseCue.actionId;
        const recommendedClass = recommended ? " hz-gate-action--recommended" : "";
        const recommendedBadge = recommended
          ? `<span class="hz-gate-action-state hz-gate-action-state--recommended">おすすめ</span>`
          : "";
        return `
          <button class="hz-gate-action hz-gate-action--${escapeHtml(action.id)}${syncClass}${retreatClass}${recommendedClass}" type="button" data-gate-action="${escapeHtml(action.id)}" title="${escapeHtml(preview.title)}"${preview.disabled ? " disabled" : ""}>
            <span class="hz-gate-action-role">${escapeHtml(action.role)}</span>
            ${recommendedBadge}
            ${syncBadge}
            ${retreatBadge}
            <span class="hz-gate-action-title">${escapeHtml(action.title)}</span>
            <span class="hz-gate-action-result">${escapeHtml(preview.result)}</span>
          </button>
        `;
      }).join("")
    : "";
  const loopComplete = state.gateRunStatus === "won" && currentDepthId === "A_reborn"
    ? `
      <div class="hz-gate-complete" aria-label="Loop complete">
        <span class="hz-gate-complete-badge">一周完了</span>
        <div class="hz-gate-complete-copy">
          <b>Ω -> A_reborn 到達</b>
          <span>${escapeHtml(loopFlavorLabel(state))}。夜のハブから次の周回へ戻れます。</span>
        </div>
        ${renderLoopSummaryMarkup(state)}
        <button class="hz-gate-complete-cta" type="button" data-complete-hub="true">
          <span>夜のハブへ戻る</span>
          <b>次の周回へ</b>
        </button>
      </div>
    `
    : "";
  const omegaUnlock = state.gateRunStatus === "won" && currentDepthId !== OMEGA_DEPTH && currentDepthId !== "A_reborn"
    ? `
      <div class="hz-gate-unlock">
        <button class="hz-gate-omega" type="button" data-gate-omega="true">Ωへ入る</button>
        <button class="hz-gate-secondary" type="button" data-gate-action="retreat">
          <span class="hz-gate-secondary-main">HUBへ戻る</span>
          <span class="hz-gate-secondary-badge">${escapeHtml(retreatAdvice.badge)}</span>
        </button>
        <span>${currentDepthId === HUB_DEPTH ? "扉は開いています。次はもっと深い輪や別ルートを試せます。" : "扉は開いています。ここから一周の到達点へ進めます。"}</span>
      </div>
    `
    : "";

  return `
    <section class="hz-gate-run-panel" aria-label="Gate Run">
      <div class="hz-gate-run-head">
        <span>Gate Run / 扉操作</span>
        <span class="hz-gate-run-status">${statusLine}</span>
      </div>
      <div class="hz-gate-run-mission">
        <span><b>目標</b> 扉100%でΩ</span>
        <span><b>次</b> ${escapeHtml(readiness)} / ${escapeHtml(retreatAdvice.badge)}</span>
      </div>
      <div class="hz-gate-run-hint">${escapeHtml(mission)}</div>
      ${renderGateRunPulseMarkup(state, pulseCue)}
      ${outcomeNotice}
      ${renderGateRunTrack(state)}
      ${loopComplete}
      ${omegaUnlock}
      <div class="hz-gate-run-actions"${showGateActions ? "" : " hidden"}>
        ${actionButtons}
      </div>
    </section>
  `;
}

function returnCompletedLoopToHub() {
  if (navigationLocked) return;
  const targetDepthId = depths[HUB_DEPTH] ? HUB_DEPTH : DEFAULT_START;
  clearPause();

  const state = getRunState();
  const wasWon = state.gateRunStatus === "won";
  if (wasWon) {
    startNextLoopState(state, targetDepthId);
    saveRunState();
  }
  runLog = wasWon
    ? "一周完了 / 夜のハブへ戻る / Ωは閉じた"
    : "夜のハブへ戻る";
  renderDepth(targetDepthId, { recordHistory: false, applyRun: false });
  setStatus(targetDepthId === HUB_DEPTH ? "HUBへ" : "最初へ");
}

function enterOmegaDepth() {
  if (!canEnterOmega() || navigationLocked) return;
  clearPause();
  const state = getRunState();
  state.lastMoveType = "sync";
  state.lastGateResult = state.lastGateResult || "扉が開いた";
  saveRunState();
  runLog = "Ωへ入る / 扉が開いた";
  renderDepth(OMEGA_DEPTH, { moveKind: "choice", moveType: "sync", applyRun: false });
  setStatus("Ωへ");
}

function bindGateRunControls() {
  for (const startHubBtn of document.querySelectorAll("[data-start-hub]")) {
    startHubBtn.addEventListener("click", () => {
      const targetDepthId = startHubBtn.getAttribute("data-start-hub");
      if (!targetDepthId || !depths[targetDepthId] || navigationLocked) return;
      clearPause();
      renderDepth(targetDepthId, { moveKind: "choice", moveType: "retreat" });
    });
  }

  const completeHubBtn = document.querySelector("[data-complete-hub]");
  if (completeHubBtn) {
    completeHubBtn.addEventListener("click", returnCompletedLoopToHub);
  }

  const omegaBtn = document.querySelector("[data-gate-omega]");
  if (omegaBtn) {
    omegaBtn.addEventListener("click", () => {
      enterOmegaDepth();
    });
  }

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
      ${renderFirstPlayableGuideMarkup()}
      <div class="hz-gi-objective">${escapeHtml(gi.objective)}</div>
      <div class="hz-gi-route">${escapeHtml(gi.route)}</div>
      <div class="hz-gi-meters">
        ${renderGiMeter("扉の開き", gi.gateCharge, "hz-gi-gate")}
        ${renderGiMeter(`圧 ${gi.riskLabel}`, gi.risk, "hz-gi-risk")}
      </div>
      <div class="hz-gi-signal">${escapeHtml(gi.signal)}</div>
    </section>
  `;
}

function renderBgmCompanionMarkup(profile, launchUrl, localLaunchUrl) {
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
  const stopButton = bgmFollowEnabled
    ? `<button id="bgm-stop-provider" class="hz-bgm-stop" type="button">止める</button>`
    : "";
  const openText = bgmOpenLinkLabel();

  return `
    <div class="hz-bgm-companion" data-bgm-phase="${escapeHtml(musicBridgePhase)}" data-bgm-collapsed="${bgmShouldCollapse() ? "true" : "false"}" data-bgm-follow="${bgmFollowEnabled ? "on" : "off"}" data-inline-bgm="${inlineBgmIsPlaying() ? "playing" : "idle"}" data-music-state="${escapeHtml(cleanDataToken(MusicFeedbackState.connectionState || "idle", "idle"))}" data-music-autofollow="${MusicFeedbackState.autoFollow ? "on" : "off"}" aria-label="BGM: 同じ画面で生成BGMを鳴らせます" title="自動再生制限は迂回せず、タップ後に同じ画面のWeb Audioで鳴らします。外部Musicは任意 companion です。">
      <div class="hz-bgm-row">
        <button id="bgm-toggle-provider" class="hz-bgm-chip" type="button" aria-label="BGMを起動または表示">
          <span class="hz-bgm-label">BGM</span>
          <span id="bgm-phase" class="hz-bgm-phase">${escapeHtml(bgmPhaseLabel())}</span>
          <span id="bgm-detail" class="hz-bgm-detail">${escapeHtml(bgmCompactDetail(profile.source.stage))}</span>
          <span id="bgm-arc" class="hz-bgm-arc">${escapeHtml(bgmArcDetail())}</span>
        </button>
        ${stopButton}
      </div>
      <div id="bgm-status" class="hz-bgm-status">${escapeHtml(bgmStatusLine("同じ画面BGM待ち"))}</div>
      <div class="hz-bgm-unlock">
        <button id="bgm-inline-start" class="hz-bgm-inline" type="button">同じ画面で鳴らす</button>
        <a id="music-open-provider" class="hz-bgm-link" href="${escapeHtml(launchUrl)}" target="hazama-music">${escapeHtml(openText)}</a>
        <span class="hz-bgm-mobile-note">スマホは同じ画面再生を推奨</span>
      </div>
      ${devTools}
    </div>
  `;
}

function renderResourceRolesMarkup() {
  return `
    <div class="hz-resource-roles" aria-label="Resource roles">
      <span><b>落ち着き</b> 崩落耐性</span>
      <span><b>響き</b> 合わせる資源</span>
      <span><b>扉の開き</b> Ω解放</span>
      <span><b>HUB</b> 安全な退避</span>
      <span><b>Breath Gate</b> 限定回復</span>
    </div>
  `;
}

function rogueTileLabel(rank) {
  if (rank <= 0) return "HUB";
  if (rank >= 28) return "A'";
  return depthRankLabel(rank);
}

function rogueTileGlyph(rank, currentRank) {
  if (rank === currentRank) return "@";
  if (rank <= 0) return "H";
  if (rank >= 28) return "A'";
  if (rank >= 27) return "Ω";
  return depthRankLabel(rank);
}

function renderRogueMapMarkup(state, gi) {
  const currentRank = depthRank(currentDepthId);
  const bestRank = Math.max(state.bestRank, currentRank);
  const gateWon = state.gateRunStatus === "won";
  const mapGatePercent = Math.max(0, Math.min(100, Math.round(gi.gateCharge)));
  const tiles = Array.from({ length: 29 }, (_, rank) => {
    const current = rank === currentRank;
    const startCurrent = current && currentDepthId === DEFAULT_START;
    const seen = rank <= bestRank || current || (rank === 27 && gateWon);
    const locked = rank >= 27 && !gateWon && !seen;
    const fog = !seen && !locked;
    const classes = [
      "hz-map-tile",
      current ? "is-current" : "",
      seen ? "is-seen" : "",
      locked ? "is-locked" : "",
      fog ? "is-fog" : "",
      rank === 0 ? "is-hub" : "",
      rank === 27 ? "is-omega" : "",
      rank === 28 ? "is-reborn" : "",
      startCurrent ? "is-start" : ""
    ].filter(Boolean).join(" ");
    const label = startCurrent ? "START" : rogueTileLabel(rank);
    const glyph = locked ? "X" : fog ? "." : startCurrent ? "@" : rogueTileGlyph(rank, currentRank);
    return `
      <span class="${classes}" role="listitem" title="${escapeHtml(label)}" aria-label="${escapeHtml(`${label}${current ? " current" : locked ? " locked" : fog ? " unknown" : " seen"}`)}">
        <b>${escapeHtml(glyph)}</b>
        <small>${escapeHtml(label)}</small>
      </span>
    `;
  }).join("");

  return `
    <section class="hz-rogue-map-panel" aria-label="Depth map">
      <div class="hz-rogue-section-head">
        <span>DEPTH MAP</span>
        <b>${escapeHtml(currentDepthId === DEFAULT_START ? "START" : rogueTileLabel(currentRank))} / BEST ${escapeHtml(rogueTileLabel(bestRank))}</b>
      </div>
      <div class="hz-rogue-map" style="--hz-map-gate: ${mapGatePercent}%" role="list">
        ${tiles}
      </div>
    </section>
  `;
}

function renderRogueLogMarkup(state, gi) {
  const depth = depths[currentDepthId] || {};
  const entries = [
    `${depthRankLabel(depthRank(currentDepthId))}: ${depth.title || currentDepthId}`,
    state.lastGateResult || runLog || "run initialized",
    gi.route,
    state.gateRunStatus === "won"
      ? "Ω unlocked: reward route ready"
      : state.gateRunStatus === "lost"
        ? "soft failure: return to HUB and retry"
        : `gate ${Math.round(state.gateRunCharge)} / ${GATE_RUN_MAX_CHARGE}`
  ];

  return `
    <section class="hz-rogue-log" aria-label="Run log">
      <div class="hz-rogue-section-head">
        <span>RUN LOG</span>
        <b>${escapeHtml(gateRunStatusLabel(state))}</b>
      </div>
      <ol>
        ${entries.map((entry) => `<li>${escapeHtml(entry)}</li>`).join("")}
      </ol>
    </section>
  `;
}

function renderRoguelikeHudMarkup(state) {
  const gi = buildGateIntelligence(currentDepthId);
  const remainingTurns = state.gateRunStatus === "running"
    ? Math.max(0, GATE_RUN_TURN_LIMIT - state.gateRunTurns)
    : state.gateRunStatus === "won" ? "OPEN" : "RETRY";
  const floorLabel = currentDepthId === DEFAULT_START ? "START" : depthRankLabel(depthRank(currentDepthId));
  return `
    <section class="hz-rogue-hud" aria-label="Roguelike run HUD">
      <div class="hz-rogue-topline">
        <span><b>FLOOR</b>${escapeHtml(floorLabel)}</span>
        <span><b>TURN</b>${escapeHtml(String(remainingTurns))}</span>
        <span><b>CALM</b>${Math.round(state.stability)}</span>
        <span><b>SYNC</b>${Math.round(state.resonance)}</span>
        <span><b>GATE</b>${Math.round(state.gateRunCharge)}%</span>
        <span><b>RISK</b>${Math.round(gi.risk)}</span>
      </div>
      ${renderRogueMapMarkup(state, gi)}
      ${renderRogueLogMarkup(state, gi)}
    </section>
  `;
}

function renderRunPanelMarkup() {
  const state = getRunState();
  const profile = buildMusicProfile(currentDepthId);
  const launchUrl = makeMusicLaunchUrl(profile);
  const localLaunchUrl = makeMusicLaunchUrl(profile, "local");
  return `
    <aside class="hz-run-panel" aria-label="位相調律">
      <div class="hz-run-head">
        <span>RUN</span>
        <span>step ${state.steps}</span>
      </div>
      ${renderGateRunPanelMarkup()}
      ${renderRoguelikeHudMarkup(state)}
      ${renderBgmCompanionMarkup(profile, launchUrl, localLaunchUrl)}
    </aside>
  `;
}

function syncViewportAfterRender(previousDepthId, nextDepthId, opts = {}) {
  if (opts.preserveScroll === true) return;
  if (!previousDepthId || previousDepthId === nextDepthId) return;
  const target = $("story");
  if (!target || typeof target.scrollIntoView !== "function") return;
  window.requestAnimationFrame(() => {
    target.scrollIntoView({ block: "start", inline: "nearest", behavior: "auto" });
  });
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
      pause.textContent = "休む時は短く一言だけ置いてください。進行は必須ではありません。";
      setStatus("入力待ち");
      return;
    }

    const seed = ensureSeed();
    const shifted = makeShiftReply(text, seed, currentDepthId);
    const reward = calculateCoreReward(text, seed, currentDepthId);
    const waitMs = pauseLengthMs(seed, currentDepthId, text);

    response.textContent = shifted;
    pause.textContent = "休んでいます… 落ち着きを戻しています。";
    nextBtn.hidden = true;
    nextBtn.disabled = true;
    input.value = "";
    setNavigationLocked(true);
    setStatus(`ひと息: ${Math.round(waitMs / 1000)}秒`);

    pauseTimer = window.setTimeout(() => {
      pauseTimer = null;
      const rewardResult = applyCoreReward(reward, currentDepthId);
      const rewardMessage = rewardResult?.message || String(rewardResult || "");
      const rewardTargetDepthId = rewardResult?.targetDepthId;
      pendingNextDepthId = rewardTargetDepthId ? "" : getPrimaryNext(depth);
      setNavigationLocked(false);
      response.textContent = `${shifted}\n${rewardMessage}`;
      if (rewardTargetDepthId && depths[rewardTargetDepthId] && rewardTargetDepthId !== currentDepthId) {
        pendingNextDepthId = "";
        renderDepth(rewardTargetDepthId, { recordHistory: false, applyRun: false });
        return;
      }
      pause.textContent = pendingNextDepthId
        ? "整いました。このまま先へ進むか、別の道を選べます。"
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
  controls.setAttribute("aria-label", "セッション操作");

  const heading = document.createElement("div");
  heading.className = "hz-controls-heading";
  heading.textContent = "セッション";
  controls.appendChild(heading);

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
  addButton(controls, homeTarget === HUB_DEPTH ? "夜のハブへ戻る" : "最初へ戻る", () => {
    clearPause();
    renderDepth(homeTarget, { moveKind: "home" });
  });

  optionsEl.appendChild(controls);
}

// 降下本文。depthMeta.voice があれば who 別クラスの多声で描画（深層 deep は attuned のみ可視）。
// 無ければ従来 story[] にフォールバック（後方互換）。INTEGRATION.md §6。
// ====================================================================
// 増分C: アート/音の移植（slice.js → engine）。1本の深度/state信号で
// 絵(Garden/Mandala/Glitch/Peel)・音(Audio)・テキストを一緒に駆動する。
// 信号は applyAtmosphere(depthId) が engine state から組み、HazamaAtmos.apply へ。
// rAFなし(Garden)/state変化時のみ/タブ非表示で停止/reduced-motion尊重＝モバイル軽量。
// 本文可読性(R4)は不変＝荒々しさは背景/差し色/遷移のみ。
// ====================================================================
// 動く表紙の per-load seed（毎回ちがう構図＝生きた庭。ロードごとに固定）。
const ATMOS_LOAD_SEED = (((Date.now() & 0xffffffff) ^ Math.floor((typeof performance !== "undefined" ? performance.now() : 0) * 1000)) >>> 0) || 1;
const HazamaAtmos = (() => {
  const REDUCED = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  const $id = (id) => document.getElementById(id);

  // 決定論PRNG（mulberry32）。worldSeed → 同じstateは同じ構図、stateが動くと別の構図。
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // 音フック（Audioモジュールが later sub-step で差し込む。未配線なら no-op）。
  let onGlitch = null;

  // ---------- 手続き的曼荼羅（Ω/到達点の reactive ビジュアル：八観幾何・核は描かない） ----------
  const Mandala = (() => {
    let cv = null, g = null;
    let raf = 0, last = 0, lastT = 0, size = 0, dpr = 1, started = false;
    let cur = { sink: 0, observer: 1, dread: 0 };
    function resize() {
      if (!cv) return;
      const r = cv.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      size = Math.max(120, Math.floor(Math.min(r.width || 300, r.height || 300)));
      cv.width = Math.floor(size * dpr); cv.height = Math.floor(size * dpr);
      draw(lastT);
    }
    function draw(time) {
      if (!cv || !cv.width) return;
      const s = cur.sink, obs = cur.observer, d = cur.dread;
      const W = cv.width, H = cv.height, cx = W / 2, cy = H / 2, R = W * 0.46;
      g.clearRect(0, 0, W, H);
      g.globalCompositeOperation = "lighter";
      const rot = REDUCED ? 0.3 : time * 0.00002;
      const spokes = 8 * (1 + Math.floor(obs / 7));
      const rings = Math.min(16, 3 + Math.floor(obs / 1.5));
      const voidR = R * (0.10 + s * 0.32);
      const baseA = 0.045 + s * 0.05;
      for (let i = 0; i < rings; i++) {
        const f = (rings > 1) ? i / (rings - 1) : 0;
        const rr = voidR + (R - voidR) * f;
        if (rr <= voidR) continue;
        const dir = (i % 2) ? -1 : 1;
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
      g.globalCompositeOperation = "source-over";
      const vg = g.createRadialGradient(cx, cy, 0, cx, cy, voidR);
      vg.addColorStop(0, "rgba(0,0,0,1)");
      vg.addColorStop(0.72, "rgba(1,3,8,0.96)");
      vg.addColorStop(1, "rgba(2,4,10,0)");
      g.fillStyle = vg; g.beginPath(); g.arc(cx, cy, voidR, 0, Math.PI * 2); g.fill();
      if (s > 0.7) {
        const flick = REDUCED ? 0.45 : (0.5 + 0.5 * Math.sin(time * 0.004));
        g.globalCompositeOperation = "lighter";
        g.lineWidth = Math.max(1, dpr * 0.8);
        g.strokeStyle = "rgba(222,233,238," + (0.06 * ((s - 0.7) / 0.3) * flick).toFixed(3) + ")";
        g.beginPath(); g.arc(cx, cy, voidR * 0.99, 0, Math.PI * 2); g.stroke();
      }
    }
    function loop(time) {
      if (time - last >= 33) { last = time; lastT = time; draw(time); }
      raf = requestAnimationFrame(loop);
    }
    function start() {
      cv = $id("hz-mandala");
      if (!cv || !cv.getContext) return;
      g = cv.getContext("2d");
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
    return { start, update: (sink, observer, dread) => { cur = { sink, observer, dread }; draw(lastT); } };
  })();

  // ---------- 反転重森ガーデン（深度ゲートの背景ブレイクダウン・rAFなし＝state変化時のみ） ----------
  const Garden = (() => {
    let cv = null, g = null, W = 0, H = 0, dpr = 1, started = false;
    let cur = { depth: 0, dread: 0, seed: 0 };
    function resize() {
      if (!cv) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = Math.max(1, Math.floor((window.innerWidth || 360) * dpr));
      H = Math.max(1, Math.floor((window.innerHeight || 640) * dpr));
      cv.width = W; cv.height = H;
      draw();
    }
    // G4: 反転重森ガーデンに立体感を — 地平線＋消失点の遠近、奥行3層(遠/中/近)を奥から手前へ、
    // パララックス(seedでカメラを横へ振る)、緻密なディテール(ネオン縁/微光/走査)で精緻なサイバーパンク世界へ。
    // rAFなし＝state変化時のみ描画＝モバイル軽量を維持。色相180°反転(緑→マゼンタ/シアン)の砂紋/石組/重森。
    function draw() {
      if (!cv || !W) return;
      g.clearRect(0, 0, W, H);
      const s = cur.depth, d = cur.dread;
      const vis = Math.max(0, (s - 0.12) / 0.88);
      cv.style.opacity = (vis * 0.94).toFixed(3);
      if (vis <= 0.003) return;
      const rng = mulberry32((cur.seed >>> 0) || 1);
      const R = (n) => rng() * (n == null ? 1 : n);
      const bright = 0.45 + s * 0.55;
      const mosh = s * 0.55 + d * 0.45;
      const px = dpr;

      // --- カメラ / 投影（消失点・地平線・パララックス） ---
      const horizon = H * (0.30 + R(0.08));         // 地平線（上1/3付近・seedで微動）
      const camX = W * (0.5 + (R(1) - 0.5) * 0.22);  // パララックス: 消失点を横へ振る＝深度移動で世界がずれる
      const floorH = H - horizon;
      // 床上の点を投影: u∈[-1,1]=横, t∈[0,1]=奥(0)→手前(1)
      const projY = (t) => horizon + floorH * Math.pow(t, 1.55);
      const projX = (u, t) => camX + u * (W * 0.05 + W * 0.70 * t);
      const projScale = (t) => 0.10 + t * 1.0;

      // --- 空/虚空（地平線の上）＋ 遠景のネオン光柱（サイバーパンクの奥行） ---
      const sky = g.createLinearGradient(0, 0, 0, horizon);
      sky.addColorStop(0, "rgba(4,8,16,0)");
      sky.addColorStop(1, "hsla(205," + (24 + s * 22).toFixed(0) + "%," + (10 + s * 8).toFixed(0) + "%," + (0.18 + s * 0.22).toFixed(3) + ")");
      g.fillStyle = sky; g.fillRect(0, 0, W, horizon);
      g.globalCompositeOperation = "lighter";
      const columns = 5 + Math.floor(s * 5);
      for (let i = 0; i < columns; i++) {
        const cx = W * R(1), cw = px * (1 + R(2));
        const ch = horizon * (0.3 + R(0.7));
        const a = (0.015 + s * 0.05) * (0.5 + R(0.5));
        g.fillStyle = "hsla(" + (188 + R(40)).toFixed(0) + ",80%,62%," + a.toFixed(3) + ")";
        g.fillRect(cx, horizon - ch, cw, ch);
      }
      // 遠景スカイライン（反転重森のシルエット＝奥行の壁）
      g.lineWidth = px * 0.8;
      g.strokeStyle = "hsla(200," + (30 + s * 24).toFixed(0) + "%," + (40 + s * 14).toFixed(0) + "%," + (0.1 + s * 0.16).toFixed(3) + ")";
      g.beginPath();
      let firstSky = true;
      for (let x = 0; x <= W; x += Math.max(6, W / 60)) {
        const n = Math.sin(x * 0.013 + 1) * 0.5 + Math.sin(x * 0.041 + 3) * 0.3 + Math.sin(x * 0.11) * 0.2;
        const y = horizon - (0.04 + (n * 0.5 + 0.5) * 0.14) * H * (0.5 + s * 0.5);
        firstSky ? (g.moveTo(x, y), firstSky = false) : g.lineTo(x, y);
      }
      g.stroke();

      // --- 遠近の床（raked sand）: 奥行ライン(間隔が地平線へ詰まる)＋消失点へ収束するrakeライン ---
      const depthLines = 14;
      for (let i = 1; i <= depthLines; i++) {
        const t = i / depthLines;
        const y = projY(t);
        const a = (0.04 + s * 0.13) * bright * (0.4 + t * 0.6);
        const band = (rng() < mosh * 0.4) ? (R(2) - 1) * W * 0.05 * mosh * t : 0;
        g.strokeStyle = "hsla(192," + (34 + s * 26).toFixed(0) + "%," + (50 + s * 16).toFixed(0) + "%," + a.toFixed(3) + ")";
        g.lineWidth = Math.max(1, px * (0.5 + t));
        const amp = H * 0.004 * (1 + s) * t;
        g.beginPath();
        const stepX = Math.max(8, Math.floor(14 * dpr));
        for (let x = 0; x <= W; x += stepX) {
          const yy = y + Math.sin((x / W) * Math.PI * 4 + i) * amp + band;
          x === 0 ? g.moveTo(x, yy) : g.lineTo(x, yy);
        }
        g.stroke();
      }
      const rake = 13;
      g.lineWidth = Math.max(1, px * 0.5);
      for (let i = 0; i <= rake; i++) {
        const u = (i / rake) * 2 - 1;
        const a = (0.03 + s * 0.09) * bright;
        g.strokeStyle = "hsla(196," + (30 + s * 22).toFixed(0) + "%," + (52 + s * 14).toFixed(0) + "%," + a.toFixed(3) + ")";
        g.beginPath();
        g.moveTo(projX(u * 0.04, 0), projY(0.001));
        g.lineTo(projX(u, 1), projY(1));
        g.stroke();
      }
      g.globalCompositeOperation = "source-over";

      // --- 反転重森: 奥行3層の構造体(monolith＋格子の枝)を奥→手前で描く（遠=小/暗/寒・近=大/明/ネオン縁） ---
      const tiers = [
        { t: 0.16, n: 4 + Math.floor(s * 3), neon: false },
        { t: 0.46, n: 3 + Math.floor(s * 3), neon: s > 0.4 },
        { t: 0.82, n: 2 + Math.floor(s * 2), neon: true }
      ];
      for (const tier of tiers) {
        for (let n = 0; n < tier.n; n++) {
          const u = (R(2) - 1) * 0.96;
          const t = clamp01(tier.t + (R(0.18) - 0.09));
          const sc = projScale(t);
          const baseX = projX(u, t);
          const baseY = projY(t);
          const colW = Math.max(1, W * 0.026 * sc);
          const colH = H * (0.18 + R(0.26)) * sc * (0.7 + s * 0.6);
          const topY = baseY - colH;
          const fade = 0.22 + t * 0.78;                 // 大気遠近: 奥ほど淡い
          const a = (0.10 + s * 0.20) * bright * fade;
          const warp = (1 + d * 0.5);
          // 幹（縦のモノリス）
          g.strokeStyle = "hsla(" + (208 - t * 18).toFixed(0) + "," + (26 + s * 26).toFixed(0) + "%," + (44 + t * 16 + s * 10).toFixed(0) + "%," + a.toFixed(3) + ")";
          g.lineWidth = Math.max(1, colW * 0.5);
          g.beginPath(); g.moveTo(baseX, baseY); g.lineTo(baseX + Math.sin(t * 9) * colW * 0.4 * warp, topY); g.stroke();
          // 格子の横桟（密なディテール）
          const rungs = 4 + Math.floor((4 + s * 5) * t);
          g.lineWidth = Math.max(1, px * 0.6 * sc);
          for (let r = 1; r <= rungs; r++) {
            const ry = baseY - (colH * r) / rungs;
            const rw = colW * (1.6 - (r / rungs) * 1.1);
            g.strokeStyle = "hsla(196," + (40 + s * 24).toFixed(0) + "%," + (54 + s * 14).toFixed(0) + "%," + (a * 0.8).toFixed(3) + ")";
            g.beginPath(); g.moveTo(baseX - rw, ry); g.lineTo(baseX + rw, ry); g.stroke();
          }
          // 反転した枝（上方へ開く重森のキャノピー）
          const branches = 3 + Math.floor(R(3));
          g.strokeStyle = "hsla(204," + (30 + s * 22).toFixed(0) + "%," + (50 + s * 12).toFixed(0) + "%," + (a * 0.9).toFixed(3) + ")";
          g.lineWidth = Math.max(1, px * 0.7 * sc);
          for (let b = 0; b < branches; b++) {
            const ang = -Math.PI / 2 + (b - (branches - 1) / 2) * 0.42 + (R(0.2) - 0.1);
            const len = colH * (0.3 + R(0.4));
            g.beginPath(); g.moveTo(baseX, topY);
            g.lineTo(baseX + Math.cos(ang) * len * warp, topY + Math.sin(ang) * len); g.stroke();
          }
          // ネオン縁（近景のみ・サイバーパンクの差し色＝マゼンタ/アシッド）
          if (tier.neon) {
            g.globalCompositeOperation = "lighter";
            g.strokeStyle = "hsla(" + (R(1) < 0.5 ? 300 : 162).toFixed(0) + ",90%,64%," + (0.10 + s * 0.18).toFixed(3) + ")";
            g.lineWidth = Math.max(1, px * 0.7);
            g.beginPath(); g.moveTo(baseX - colW, baseY); g.lineTo(baseX - colW * 0.5, topY); g.stroke();
            g.globalCompositeOperation = "source-over";
          }
          // 石組（足元の同心リング＝枯山水の波紋・遠近で扁平）
          if (t > 0.3 && R(1) < 0.6) {
            const ringN = 2 + Math.floor(R(3));
            for (let r = 1; r <= ringN; r++) {
              const rr = r * (W * 0.012) * sc * (1 + s * 0.4);
              g.strokeStyle = "hsla(210," + (28 + s * 22).toFixed(0) + "%," + (52 + s * 12).toFixed(0) + "%," + ((a * 0.7) / Math.sqrt(r)).toFixed(3) + ")";
              g.lineWidth = Math.max(1, px * 0.5 * sc);
              g.beginPath();
              for (let k = 0; k <= 28; k++) {
                const ang = (k / 28) * Math.PI * 2;
                const x = baseX + Math.cos(ang) * rr, y = baseY + Math.sin(ang) * rr * 0.34;
                k ? g.lineTo(x, y) : g.moveTo(x, y);
              }
              g.closePath(); g.stroke();
            }
          }
        }
      }

      // --- 前景の市松苔（遠近のトラペゾイドでタイル＝床の手前・原色leak同調のアシッド差し色） ---
      const tileRows = 5;
      for (let ry = 0; ry < tileRows; ry++) {
        const t0 = 0.55 + (ry / tileRows) * 0.45;
        const t1 = 0.55 + ((ry + 1) / tileRows) * 0.45;
        const cols = 8;
        for (let cxi = 0; cxi < cols; cxi++) {
          if ((cxi + ry) % 2) continue;
          const u0 = (cxi / cols) * 2 - 1, u1 = ((cxi + 1) / cols) * 2 - 1;
          const glitched = rng() < mosh * 0.35;
          const a = (0.05 + s * 0.16) * bright * (0.4 + (ry / tileRows) * 0.6);
          g.fillStyle = glitched
            ? "hsla(162,75%,58%," + (a * 0.9).toFixed(3) + ")"
            : "hsla(300," + (32 + s * 26).toFixed(0) + "%," + (30 + s * 16).toFixed(0) + "%," + a.toFixed(3) + ")";
          const jit = glitched ? (R(2) - 1) * W * 0.02 * mosh : 0;
          g.beginPath();
          g.moveTo(projX(u0, t0) + jit, projY(t0));
          g.lineTo(projX(u1, t0) + jit, projY(t0));
          g.lineTo(projX(u1, t1) + jit, projY(t1));
          g.lineTo(projX(u0, t1) + jit, projY(t1));
          g.closePath(); g.fill();
        }
      }

      // --- 微光の粒子（浮遊するデータの塵＝緻密さと空気感） ---
      g.globalCompositeOperation = "lighter";
      const motes = 16 + Math.floor(s * 28);
      for (let i = 0; i < motes; i++) {
        const t = R(1), x = projX((R(2) - 1) * 0.9, t), y = horizon + R(floorH);
        const a = (0.05 + s * 0.12) * R(1) * (0.3 + t);
        g.fillStyle = "hsla(" + (190 + R(30)).toFixed(0) + ",90%,72%," + a.toFixed(3) + ")";
        g.fillRect(x, y, px * (0.6 + t), px * (0.6 + t));
      }
      g.globalCompositeOperation = "source-over";
    }
    return {
      start() {
        cv = $id("hz-garden");
        if (!cv || !cv.getContext) return;
        g = cv.getContext("2d");
        if (started) return; started = true;
        resize();
        window.addEventListener("resize", resize);
      },
      update: (depth, dread, seed) => { cur = { depth, dread, seed }; draw(); }
    };
  })();

  // ---------- グリッジ（深度連動・短バースト＝塗装が剥がれる。原色leak同調・音も裂ける） ----------
  const Glitch = (() => {
    const root = document.documentElement.style;
    let depth = 0, dread = 0, timer = 0, started = false, paused = false, leakTimer = 0;
    const LEAK = ["10,186,181", "216,68,46", "224,168,60", "46,168,96"];
    const clearBurst = () => document.body.classList.remove("glitch-soft", "glitch-hard");
    function setGi() { root.setProperty("--gi", Math.min(1, depth * 0.85 + dread * 0.28).toFixed(3)); }
    function burst() {
      const hard = Math.random() < (0.12 + depth * 0.55 + dread * 0.15);
      document.body.classList.add(hard ? "glitch-hard" : "glitch-soft");
      const dur = hard ? 130 + Math.random() * 210 : 80 + Math.random() * 110;
      if (Math.random() < (0.16 + depth * 0.5)) {
        root.setProperty("--leak-rgb", LEAK[Math.floor(Math.random() * LEAK.length)]);
        document.body.classList.add("leak-on");
        clearTimeout(leakTimer);
        leakTimer = window.setTimeout(() => document.body.classList.remove("leak-on"), Math.round(dur * 0.8));
      }
      if (typeof onGlitch === "function") onGlitch(hard ? (0.55 + depth * 0.5) : (0.28 + depth * 0.32));
      window.setTimeout(clearBurst, dur);
    }
    function schedule() {
      if (paused) return;
      const mean = Math.max(900, 8600 - depth * 5800 - dread * 1600);
      timer = window.setTimeout(() => { burst(); schedule(); }, mean * (0.45 + Math.random()));
    }
    function start() {
      if (started || REDUCED) return; started = true;
      document.addEventListener("visibilitychange", () => {
        paused = document.hidden;
        if (paused) { clearTimeout(timer); clearBurst(); } else schedule();
      });
      schedule();
    }
    return { start, update: (d, dr) => { depth = clamp01(d); dread = clamp01(dr); setGi(); } };
  })();

  // ---------- 塗装剥がれ／めくれ遷移（各遷移で層が一枚めくれて降りる） ----------
  const Peel = (() => {
    let t = 0;
    function play() {
      if (REDUCED) return;
      document.body.classList.remove("peeling");
      void document.body.offsetWidth;
      document.body.classList.add("peeling");
      clearTimeout(t);
      t = window.setTimeout(() => document.body.classList.remove("peeling"), 700);
    }
    return { play };
  })();

  let started = false;
  function start() {
    if (started) return; started = true;
    document.documentElement.classList.add("hz-atmos");
    Garden.start(); Mandala.start(); Glitch.start();
  }
  // sig: { depthN, dread, observer, seed, gardenDepthN?, glitchDepthN? }
  // gardenDepthN/glitchDepthN を分けると、浅い表紙(anchor)でも背景が薄く生きる「動く表紙」になる。
  function apply(sig) {
    start();
    const root = document.documentElement.style;
    const depthN = clamp01(sig.depthN || 0);
    const dread = clamp01(sig.dread || 0);
    const observer = Math.max(1, sig.observer || 1);
    const gardenDepthN = clamp01(sig.gardenDepthN != null ? sig.gardenDepthN : depthN);
    const glitchDepthN = clamp01(sig.glitchDepthN != null ? sig.glitchDepthN : depthN);
    root.setProperty("--sink", depthN.toFixed(3));
    root.setProperty("--press", dread.toFixed(3));
    Mandala.update(depthN, observer, dread);
    Glitch.update(glitchDepthN, dread);
    Garden.update(gardenDepthN, dread, sig.seed >>> 0);
  }
  return { apply, peel: () => Peel.play(), setAudioGlitch: (fn) => { onGlitch = fn; }, reduced: REDUCED };
})();

// engine state → 共有"深度信号"。テキストを分岐させているのと同じstateが背景/音も組み直す。
function atmosWorldSeed(state, rank) {
  const numericHashLocal = (s) => { let h = 2166136261; const str = String(s); for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  return (numericHashLocal("hazama:world")
    ^ Math.imul((state.entries || 0) + 1, 0x9e3779b9)
    ^ Math.imul((state.bestRank || 0) + 1, 0x85ebca6b)
    ^ Math.imul((state.attunement || 0) + 1, 0xc2b2ae35)
    ^ Math.imul((rank || 0) + 1, 0x27d4eb2f)) >>> 0;
}

// 周回/再訪で本文が変異する（slice applyCycle 相当）。初回通過は不変＝作り込んだ導入を壊さない。
// 巡る(再訪)ほど"手の声"(scrawl)が増え・断片化して冷たい構造へ書き込まれる＝「巡っている」気づき。
const atmosNodeVisits = Object.create(null);
const ATMOS_SCRAWL_TIERS = [
  ["（これ、まえも読んだ）", "ここ、まえと同じ継ぎ目だ。", "また、ここに立っている。",
   "知っている。この声を、知っている。", "戻ったんじゃない。置き直されただけ。"],
  ["ぜんぶ塗装だ。剥がせ。", "核は——ここには無い。何度見ても。", "私を、数えるな。",
   "下りるたび、私が増える。やめろ。", "この行を、誰が書いている？"],
  ["もう一段　もう一段　もう一段", "私　私　私　——どれだ", "底は無い　知ってる　知ってて下りてる",
   "消せない。書いたものは、消えない。", "■■■——ここに、何か書いた。"]
];
function atmosHashStr(s) { let h = 2166136261; const str = String(s); for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function atmosMulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// voice[] を再訪回数で変異させて返す（新配列）。reduced-motion でも内容変化は出す（動きでなく語）。
function applyVoiceCycle(depthId, voice) {
  const lines = Array.isArray(voice) ? voice.slice() : [];
  const visits = (atmosNodeVisits[depthId] = (atmosNodeVisits[depthId] || 0) + 1);
  const state = getRunState();
  const cycle = Math.max(0, (state.entries || 0)) + Math.max(0, visits - 1);
  if (visits < 2 && cycle < 1) return lines;                 // 初回通過は原文そのまま
  const seed = (atmosHashStr(depthId) ^ Math.imul(cycle + 1, 0x9e3779b9) ^ Math.imul(visits, 0x85ebca6b)) >>> 0;
  const rng = atmosMulberry32(seed);
  const tier = cycle >= 3 ? 2 : cycle >= 2 ? 1 : 0;
  const maxIntr = cycle >= 3 ? 2 : 1;
  let count = 0;
  if (rng() < 0.85) count = 1;
  if (maxIntr > 1 && rng() < 0.6) count = 2;
  const used = new Set();
  for (let i = 0; i < count; i++) {
    const bank = ATMOS_SCRAWL_TIERS[tier];
    const t = bank[Math.floor(rng() * bank.length)];
    if (used.has(t)) continue; used.add(t);
    const at = 1 + Math.floor(rng() * Math.max(1, lines.length - 1));
    lines.splice(at, 0, { who: "scrawl", text: t });
  }
  return lines;
}

// renderDepth 末尾フック（slice applyAtmosphere 相当）。深度/圧/観測者/worldSeed を一括配布。
function applyAtmosphere(depthId) {
  if (typeof HazamaAtmos === "undefined") return;
  const depth = depths[depthId] || {};
  const meta = (depth && depth.depthMeta) || {};
  const state = getRunState();
  const gi = buildGateIntelligence(depthId);
  const rank = depthRank(depthId);
  const depthN = clampNumber(rank / 28, 0, 1);
  // 圧(dread): 境界圧(gi.risk)＋深度。表層中立の方針に合わせ深度寄与は控えめ。
  const dread = clampNumber(gi.risk / 135 + depthN * 0.22, 0, 1);
  // 観測者: depthMeta優先、無ければ深度から（深いほど"私"が増える）。
  const observer = Math.max(1, Number(meta.observer) || (1 + Math.floor(rank / 3)));
  const seed = atmosWorldSeed(state, rank);
  // 動く表紙: anchor(表紙=A_start/HUB)でも背景の反転ガーデン/グリッジを薄く生かす(per-load seed)。
  const isAnchor = rank === 0;
  const gardenDepthN = isAnchor ? Math.max(depthN, 0.26) : depthN;
  const glitchDepthN = isAnchor ? Math.max(depthN, 0.30) : depthN;
  const titleSeed = isAnchor ? ((seed ^ ATMOS_LOAD_SEED) >>> 0) : seed;
  HazamaAtmos.apply({ depthN, dread, observer, seed: titleSeed, gardenDepthN, glitchDepthN });
  updateBackdrop(depthN);
  updateSinkHud(depthId, rank, observer, depthN, state);
}

// G3: descent写真の退場。浅(--sink小)では写真が残り、降下に従って opacity↓・滲み↑で
// 反転ガーデン(canvas)へクロスフェードし、外殻以降(depthN≳0.76)は写真 0＝完全にガーデンへ。
function updateBackdrop(depthN) {
  const img = document.querySelector(".hz-visual-depth");
  if (!img) return;
  const s = clampNumber(depthN, 0, 1);
  const op = Math.max(0, 0.5 - s * 0.66);          // sink 0→0.5 / 0.76→0 / 以降は0
  img.style.opacity = op.toFixed(3);
  img.style.filter =
    `saturate(${(0.86 - s * 0.34).toFixed(3)}) contrast(${(1.12 + s * 0.12).toFixed(3)})`
    + ` brightness(${(0.8 - s * 0.26).toFixed(3)}) blur(${(s * 1.2).toFixed(2)}px)`;
}

// 沈下HUD（沈下ゲージ＋観測者カウンタ＋認識）。ゲージ充填は inline transform（var-in-transform 回避）。
function updateSinkHud(depthId, rank, observer, depthN, state = getRunState()) {
  const fillEl = $("hz-sink-fill");
  if (fillEl && fillEl.parentElement) {
    const track = fillEl.parentElement.clientWidth || 0;
    fillEl.style.width = `${Math.round(track * clampNumber(depthN, 0, 1))}px`;
  }
  const depthEl = $("hz-sink-depth");
  if (depthEl) depthEl.textContent = `深度 ${depthRankLabel(rank)}`;
  const obsEl = $("hz-observer");
  if (obsEl) {
    const n = Math.max(1, observer);
    obsEl.textContent = "私".repeat(Math.min(n, 6)) + (n > 6 ? "…" : "");
    obsEl.classList.toggle("deep", n > 6);
  }
  const atEl = $("hz-attune");
  if (atEl) {
    const at = Math.round(clampNumber(state.attunement || 0, 0, 99));
    const attuned = GateRunModel.isAttuned ? GateRunModel.isAttuned(state) : false;
    const need = (GateRunModel.tuning && GateRunModel.tuning.attuneOmegaThreshold) || 0;
    atEl.textContent = attuned ? `認識 合致(${at})` : (need ? `認識 ${at}/${need}` : `認識 ${at}`);
    atEl.classList.toggle("attuned", attuned);
  }
}

function renderDepthBodyMarkup(depth, paragraphs) {
  const meta = depth && depth.depthMeta;
  if (meta && Array.isArray(meta.voice) && meta.voice.length) {
    const cycled = applyVoiceCycle(depth.id || currentDepthId, meta.voice); // 巡回/再訪で scrawl 割り込み
    const lines = cycled.map((l) => {
      const who = typeof l?.who === "string" ? l.who : "n";
      return `<p class="hz-voice hz-voice-${escapeHtml(who)}">${escapeHtml(String(l?.text ?? ""))}</p>`;
    });
    const attuned = GateRunModel.isAttuned ? GateRunModel.isAttuned(getRunState()) : false;
    if (attuned && Array.isArray(meta.deep) && meta.deep.length) {
      lines.push(
        `<div class="hz-deep" aria-label="深層：認識が合う者だけに視える">`
        + meta.deep.map((t) => `<p class="hz-voice hz-voice-deep">${escapeHtml(String(t))}</p>`).join("")
        + `</div>`
      );
    }
    return lines.join("");
  }
  return (Array.isArray(paragraphs) ? paragraphs : []).map((p) => `<p>${escapeHtml(p)}</p>`).join("");
}

// depthMeta.choices の next を実ノードへ解決。仮想/遅延ターゲットは暫定フォールバック
// （below=手続き的∞は増分Cで procedural 移植予定。__edge=終端→HUB）。
function resolveChoiceTarget(next) {
  if (!next) return null;
  if (depths[next]) return next;
  const fallback = {
    below: depths.A_reborn ? "A_reborn" : HUB_DEPTH,
    __edge: HUB_DEPTH,
    __rejoin: HUB_DEPTH,
    __divert: HUB_DEPTH
  };
  const mapped = fallback[next];
  return mapped && depths[mapped] ? mapped : null;
}

// 認識ゲートの主導線。R1: 選択肢は視覚的に等価・読みやすく描画し、"正解/はじかれ"を事前に
// telegraph しない（kind 別マーク・機械的 sub は出さない）。判定は選んだ"後"に reaction として立ち上がる。
function renderDepthMetaChoices(depth, choices, optionsEl) {
  const heading = document.createElement("div");
  heading.className = "hz-options-heading";
  heading.textContent = "どう読む";
  optionsEl.appendChild(heading);

  let hasSurfacePole = false;
  for (const c of choices) {
    const kind = typeof c?.kind === "string" ? c.kind : "descend";
    const label = String(c?.text ?? "…");
    const isSurfacePole = c?.next === "__surface";
    if (isSurfacePole) hasSurfacePole = true;
    const target = isSurfacePole ? "__surface" : resolveChoiceTarget(c?.next);
    const isOmega = target === OMEGA_DEPTH;

    const btn = addButton(optionsEl, label, () => {
      if (navigationLocked || !target) return;
      clearPause();
      // 構造読み(descend)で認識が育つ／表層(surface)は中立／退避(retreat)は育てない。
      // 判定は"選んだ後"に立ち上がる（事前 telegraph 無し）＝認識の手応えはこの reaction で返す。
      let res = null;
      if (GateRunModel.applyRecognition) {
        const st = getRunState();
        res = GateRunModel.applyRecognition(st, kind);
        st.attunement = res.state.attunement;
        saveRunState();
      }
      if (isSurfacePole) {
        flashChoiceReaction("ascend", res);
        renderSurfaceReturn("choice");
        return;
      }
      flashChoiceReaction(kind, res);
      if (isOmega && canEnterOmega()) {
        enterOmegaDepth();
        return;
      }
      const moveType = kind === "descend" ? "dive" : kind === "surface" ? "observe" : "retreat";
      renderDepth(target, { moveKind: "choice", moveType });
    }, "hz-btn hz-depth-option");

    // kind クラスは保持（遷移種の配線用）だが、CSS では視覚差を付けない＝等価。
    btn.classList.add("hz-choice-button", "hz-choice-open", `hz-choice-${escapeHtml(isSurfacePole ? "ascend" : kind)}`);
    btn.innerHTML = `<span class="hz-choice-main">${escapeHtml(label)}</span>`;
    btn.disabled = navigationLocked || !target;
    if (isOmega && !canEnterOmega()) {
      // Ω は資格（認識）が要るが、ここでは"閉じている"を赤い失敗として見せない（G2: 二極の帰還）。
      btn.disabled = true;
      btn.classList.add("hz-veiled-option");
    }
  }

  // G2: 外殻を越えた深部では「核へ降りる(没入)」⇄「浮上して帰る(帰還)」の二極を必ず開く。
  // 浮上ポールは常に有効＝Ω が伏せられていても行き止まりにならず、帰還が"有効な結末"になる。
  const rank = depthRank(depth?.id || currentDepthId);
  if (!hasSurfacePole && rank >= OUTER_SHELL_RANK && currentDepthId !== OMEGA_DEPTH && currentDepthId !== "A_reborn") {
    const btn = addButton(optionsEl, "光のほうへ、浮上して帰る", () => {
      if (navigationLocked) return;
      clearPause();
      flashChoiceReaction("ascend", null);
      renderSurfaceReturn("choice");
    }, "hz-btn hz-depth-option");
    btn.classList.add("hz-choice-button", "hz-choice-open", "hz-choice-ascend");
    btn.innerHTML = `<span class="hz-choice-main">光のほうへ、浮上して帰る</span>`;
  }
}

// G2: 終端の二極（帰還の極）。Ω(没入)へ降りられない／降りないとき、"死/GAME OVER"ではなく
// 「正気のほうへ浮上して帰る」有効な結末として描く。失敗演出にせず、見たものを抱えて表層へ戻す。
function renderSurfaceReturn(reason = "lock") {
  clearPause();
  document.body.classList.add("hz-surfaced");
  const storyEl = $("story");
  const optionsEl = $("options");
  if (!storyEl || !optionsEl) return;
  const state = getRunState();
  const attune = Math.round(clampNumber(state.attunement || 0, 0, 99));
  const need = (GateRunModel.tuning && GateRunModel.tuning.attuneOmegaThreshold) || 6;
  const lines = reason === "lock"
    ? ["核へは、まだ降りられない。", "認識が満ちていない——けれど、それは失敗じゃない。",
       "あなたは光のほうへ浮上する。視たものを、抱えたまま。"]
    : ["降りるのを、ここでやめる。", "正気のほうへ、ゆっくり浮上していく。",
       "戻れた——それも、ひとつの結末だ。"];
  storyEl.innerHTML = `
    <div class="hz-block hz-surface-card">
      <div class="hz-depth-title">浮上 — 表層へ帰る</div>
      ${lines.map((l) => `<p class="hz-voice hz-voice-self">${escapeHtml(l)}</p>`).join("")}
      <p class="hz-surface-meta">認識 ${attune} / ${need}（構造を読むほど、核へ降りられる）</p>
    </div>`;
  optionsEl.innerHTML = `
    <section class="hz-decision-panel" aria-label="浮上">
      <div class="hz-options-heading">どう帰る</div>
      <div id="hz-surface-actions" class="hz-route-options"></div>
    </section>`;
  const host = $("hz-surface-actions") || optionsEl;
  const leave = () => document.body.classList.remove("hz-surfaced");
  const reDive = addButton(host, "もう一度、入口から沈む", () => {
    leave();
    renderDepth(DEFAULT_START, { moveKind: "home" });
  }, "hz-btn hz-depth-option hz-choice-button hz-choice-open hz-choice-descend");
  reDive.innerHTML = `<span class="hz-choice-main">もう一度、入口から沈む</span>`;
  const close = addButton(host, "ここで閉じて、戻る", () => {
    leave();
    const home = depths[HUB_DEPTH] ? HUB_DEPTH : DEFAULT_START;
    renderDepth(home, { moveKind: "home" });
  }, "hz-btn hz-depth-option hz-choice-button hz-choice-open hz-choice-ascend");
  close.innerHTML = `<span class="hz-choice-main">ここで閉じて、戻る</span>`;
  // 浮上＝背景を表層へ戻す（ガーデン退場・グリッジ鎮静）。HUD はそのまま意味を保つ。
  if (typeof HazamaAtmos !== "undefined") {
    HazamaAtmos.apply({ depthN: 0.06, dread: 0.04, observer: 1, seed: atmosWorldSeed(state, 0) });
  }
  setStatus("浮上 / 表層へ帰った");
}

// 選んだ"後"に立ち上がる認識の手応え（事前 telegraph しないための post-choice reaction）。
// descend=認識が深まる／surface=表層で受け流し別の筋へ／retreat=ひと呼吸おいて退く。失敗演出にはしない。
let hzReactionTimer = 0;
function flashChoiceReaction(kind, res) {
  let text = "";
  let tone = "";
  const gain = res ? res.gain : 0;
  if (kind === "descend") {
    text = gain > 0 ? "——構造が、すこし視えた。" : "深く、指でなぞった。";
    tone = "deep";
  } else if (kind === "surface") {
    text = "表層を受け流し、別の筋へ逸れる。";
    tone = "surface";
  } else if (kind === "ascend") {
    text = "光のほうへ、浮上していく。";
    tone = "calm";
  } else {
    text = "ひと呼吸おいて、退く。";
    tone = "calm";
  }
  let el = document.getElementById("hz-reaction");
  if (!el) {
    el = document.createElement("div");
    el.id = "hz-reaction";
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
    document.body.appendChild(el);
  }
  el.textContent = text;
  el.className = "hz-reaction" + (tone ? ` hz-reaction-${tone}` : "");
  void el.offsetWidth; // restart fade
  el.classList.add("show");
  window.clearTimeout(hzReactionTimer);
  hzReactionTimer = window.setTimeout(() => el.classList.remove("show"), 1700);
}

function renderOptions(depth, optionsEl) {
  const meta = depth && depth.depthMeta;
  if (meta && Array.isArray(meta.choices) && meta.choices.length) {
    renderDepthMetaChoices(depth, meta.choices, optionsEl);
    return;
  }
  const opts = Array.isArray(depth.options) ? depth.options : [];
  if (opts.length === 0) {
    addButton(optionsEl, "最初へ戻る", () => {
      clearPause();
      renderDepth(DEFAULT_START, { moveKind: "home" });
    }, "hz-btn hz-depth-option");
    return;
  }

  const heading = document.createElement("div");
  heading.className = "hz-options-heading";
  heading.textContent = "道を選ぶ";
  optionsEl.appendChild(heading);

  for (const o of opts) {
    const next = o?.next;
    const gate = next ? gateForOption(currentDepthId, next, o) : { allowed: true, label: "", title: "", moveType: "" };
    const primaryLabel = String(o?.text ?? "…");
    const btn = addButton(optionsEl, primaryLabel, () => {
      if (navigationLocked) return;
      if (!next || !gate.allowed) return;
      clearPause();
      if (next === OMEGA_DEPTH && canEnterOmega()) {
        enterOmegaDepth();
        return;
      }
      renderDepth(next, { moveKind: "choice", moveType: gate.moveType });
    }, "hz-btn hz-depth-option");
    btn.classList.add("hz-choice-button");
    if (gate.label) {
      const lockHint = !gate.allowed && next === OMEGA_DEPTH
        ? `<span class="hz-choice-lock">扉100%で解放</span>`
        : "";
      btn.innerHTML = `
        <span class="hz-choice-main">${escapeHtml(primaryLabel)}</span>
        <span class="hz-choice-meta">${escapeHtml(gate.label)}</span>
        ${lockHint}
      `;
      btn.setAttribute("aria-label", `${primaryLabel} / ${gate.label}${lockHint ? " / 扉100%で解放" : ""}`);
    }
    btn.disabled = navigationLocked || !gate.allowed;
    btn.title = gate.title;
    if (!gate.allowed) btn.classList.add("hz-locked-option");
  }
}

function renderBreathRestMarkup(question) {
  return `
    <div class="hz-rest-panel hz-core-loop" aria-label="Breath Gate optional rest">
      <div class="hz-rest-head">
        <div>
          <span class="hz-rest-kicker">Breath Gate</span>
          <b>休む / 整える</b>
        </div>
        <span class="hz-rest-badge">任意休息</span>
      </div>
      <p class="hz-rest-question">${escapeHtml(question)}</p>
      <p class="hz-core-help">主導線は「道を選ぶ」とGate Runです。ここは落ち着きと響きを少し戻す補助で、連続使用は効きが落ちます。</p>
      <form id="core-form" class="hz-core-form">
        <input id="core-input" type="text" maxlength="${CORE_MAX_INPUT}" autocomplete="off" placeholder="短く一言だけ" />
        <button class="hz-btn" type="submit">休む</button>
      </form>
      <p id="core-response" class="hz-core-response" aria-live="polite"></p>
      <p id="core-pause" class="hz-core-pause" aria-live="polite"></p>
      <button id="core-next" class="hz-btn" type="button" hidden disabled>このまま先へ進む</button>
    </div>
  `;
}

function renderDepth(depthId, opts = {}) {
  const previousDepthId = currentDepthId;
  let targetDepthId = depthId;
  if (targetDepthId === OMEGA_DEPTH && !canEnterOmega()) {
    // G2: Ω(没入)へ降りられない時は失敗バウンスでなく「浮上して帰る」二極の結末へ。
    renderSurfaceReturn("lock");
    return;
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
  const depthChanged = previousDepthId && previousDepthId !== targetDepthId;
  currentDepthId = targetDepthId;
  syncVisualMotion(currentDepthId);
  if (depthChanged && typeof HazamaAtmos !== "undefined") HazamaAtmos.peel(); // 遷移で塗装が一枚めくれる
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
    <div class="hz-block">
      <div class="hz-depth-title">${escapeHtml(title)}</div>
      ${desc ? `<div class="hz-depth-desc">${escapeHtml(desc)}</div>` : ""}
      ${theme ? `<div class="hz-depth-theme">${escapeHtml(theme)}</div>` : ""}
    </div>
    <div class="hz-block">
      ${renderDepthBodyMarkup(depth, paragraphs)}
    </div>
  `;

  optionsEl.innerHTML = "";
  optionsEl.innerHTML = `
    <section class="hz-decision-panel" aria-label="展開">
      ${renderStartGuideMarkup()}
      <div class="hz-decision-head">
        <span>展開</span>
        <b>本文を読んでから選ぶ</b>
      </div>
      ${renderFirstPlayableGuideMarkup()}
      <div id="run-panel-host">
        ${renderRunPanelMarkup()}
      </div>
      <div id="route-options-host" class="hz-route-options"></div>
      <div id="session-controls-host"></div>
      ${renderBreathRestMarkup(question)}
    </section>
  `;
  const routeHost = $("route-options-host") || optionsEl;
  const controlsHost = $("session-controls-host") || optionsEl;
  renderOptions(depth, routeHost);
  renderControls(controlsHost);
  renderCoreLoop(depth);
  bindGateRunControls();
  bindMusicControls();
  syncMusicBridge();
  installMusicAutoStart();
  syncViewportAfterRender(previousDepthId, targetDepthId, opts);
  applyAtmosphere(currentDepthId); // 1信号で背景(Garden/Mandala/Glitch)を駆動＝テキストと一緒に壊れていく

  setStatus(`OK: ${targetDepthId}`);
}

function hidePwaInstallButton() {
  const btn = $("pwa-install");
  if (btn) btn.hidden = true;
}

function showPwaInstallButton() {
  const btn = $("pwa-install");
  if (!btn) return;
  btn.hidden = false;
}

function setupPwaInstallPrompt() {
  const btn = $("pwa-install");
  if (btn) {
    btn.addEventListener("click", async () => {
      if (!deferredPwaInstallPrompt) {
        hidePwaInstallButton();
        return;
      }
      deferredPwaInstallPrompt.prompt();
      try {
        await deferredPwaInstallPrompt.userChoice;
      } catch (e) {
        console.warn("[Hazama] install prompt failed:", e);
      }
      deferredPwaInstallPrompt = null;
      hidePwaInstallButton();
    });
  }

  window.addEventListener("beforeinstallprompt", (ev) => {
    ev.preventDefault();
    deferredPwaInstallPrompt = ev;
    showPwaInstallButton();
  });

  window.addEventListener("appinstalled", () => {
    deferredPwaInstallPrompt = null;
    hidePwaInstallButton();
  });
}

function showPwaUpdateBanner(registration) {
  let banner = $("pwa-update");
  if (!banner) {
    banner = document.createElement("div");
    banner.id = "pwa-update";
    banner.className = "hz-pwa-update";
    banner.setAttribute("role", "status");
    banner.innerHTML = `
      <span>新バージョン利用可能</span>
      <button id="pwa-update-reload" type="button">更新</button>
      <button id="pwa-update-dismiss" type="button" aria-label="閉じる">×</button>
    `;
    document.body.appendChild(banner);
  }

  banner.hidden = false;

  const reloadBtn = $("pwa-update-reload");
  const dismissBtn = $("pwa-update-dismiss");
  if (reloadBtn) {
    reloadBtn.onclick = () => {
      if (registration?.waiting) {
        registration.waiting.postMessage({ type: "SKIP_WAITING" });
      }
      window.setTimeout(() => window.location.reload(), 180);
    };
  }
  if (dismissBtn) {
    dismissBtn.onclick = () => {
      banner.hidden = true;
    };
  }
}

function setupServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").then((registration) => {
      if (registration.waiting) showPwaUpdateBanner(registration);

      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) {
            showPwaUpdateBanner(registration);
          }
        });
      });

      if (typeof registration.update === "function") {
        registration.update().catch(() => {});
      }
    }).catch((err) => {
      console.warn("[Hazama] serviceWorker.register(\"sw.js\") failed:", err);
    });
  });
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
  installInlineBgmResumeHooks();
  // グリッジ・バーストと BGM の破断を同期（共有信号）。BGM 未解禁時は no-op。
  if (typeof HazamaAtmos !== "undefined") HazamaAtmos.setAudioGlitch(inlineBgmGlitchHit);
  applyMusicFeedbackVisual();
  setupPwaInstallPrompt();
  setupServiceWorker();

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
