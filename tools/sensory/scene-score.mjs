// Authored response rules, not a fly-brain simulation or a continuous music player.
export const VERSION = "scene-20260915-1";
export const MAX_SECONDS = 120;
export const MODES = Object.freeze({
  current: { label: "現行音", description: "本編と同じドローン・鼓動・選択音。比較用の固定seed。" },
  b: { label: "B · 拍動", description: "沈む・引き返すときに短い拍が現れ、読み続けると退く。" },
  c: { label: "C · 断片", description: "気づいたときに断片がつながり、戻ると少し姿を変える。" }
});

// Existing prose, in a fixed A → B → C → B → C sequence. This is an excerpt,
// not a route runner: these normalized audio states do not alter game balance.
export const SCENES = Object.freeze([
  { node: "A", indices: [0, 1, 3], label: "編み目に触れる", action: "編み目をなぞり、沈む", cue: "enter", depth: .18, dread: .12, density: .05,
    lines: [
      "答えはない。代わりに、世界の表皮が剥がれはじめる。視界の縁でピクセルが浮き、その下から鉄錆色の配線が露出する——世界は塗装だった。",
      "『世界は情報じゃない。構造でできている。いま、その編み目を見はじめている』",
      "体観——指先が、まだ触れていない床の冷たさを、先に拾う。"
    ] },
  { node: "B", indices: [2, 3, 4], label: "沈む", action: "月の継ぎ目を覗く", cue: "descend", depth: .28, dread: .3, density: .08,
    lines: [
      "物理法則も偶然も、破綻を避けるための裏側の処理。月が一瞬、二重に割れる。",
      "『深度が描画速度を上回っただけだ』",
      "胸の振れと街の振れが、同じ周期で震えている。世界の法則と、自分の法則が重なる。"
    ] },
  { node: "C", indices: [0, 2, 3], label: "気づく", action: "記憶を閉じ、引き返す", cue: "recognition", depth: .4, dread: .38, density: .12,
    lines: [
      "記憶が、時間順に並ばなくなる。幼い日と、ついさっきが、同じ層に同居する。",
      "では、いま思い出しているこれは——本当に、あったことなのか。",
      "確かめる手立てはない。確かめようとした瞬間、その記憶もまた書き直される。"
    ] },
  { node: "B", indices: [2, 4], label: "引き返す", action: "もう一度、継ぎ目の奥へ", cue: "resist", depth: .4, dread: .48, density: .12,
    lines: [
      "物理法則も偶然も、破綻を避けるための裏側の処理。月が一瞬、二重に割れる。",
      "胸の振れと街の振れが、同じ周期で震えている。世界の法則と、自分の法則が重なる。"
    ] },
  { node: "C", indices: [0, 1], label: "同じ場所、違う痕跡", action: "この音での試聴を終える", cue: "return", depth: .46, dread: .54, density: .16,
    lines: [
      "記憶が、時間順に並ばなくなる。幼い日と、ついさっきが、同じ層に同居する。",
      "『記憶と物語は同じ構造だ。歴史は固定じゃない。再描画され続けている』"
    ] }
].map((scene) => Object.freeze({ ...scene, indices: Object.freeze(scene.indices), lines: Object.freeze(scene.lines) })));

export function responseScore(mode, index) {
  if (!Object.hasOwn(MODES, mode) || !Number.isInteger(index) || !SCENES[index]) throw new Error("Unknown comparison condition");
  if (mode === "current") return [];
  const cue = SCENES[index].cue;
  const notes = [];
  const add = (kind, at, midi, duration, gain) => notes.push(Object.freeze({ kind, at, midi, duration, gain }));
  if (mode === "b") {
    const pulseTimes = { enter: [0, .94], descend: [0, .625, .94, 1.875, 2.5, 3.75],
      recognition: [0, 1.25], resist: [0, .47, 1.72], return: [0, .625, 1.875] }[cue];
    pulseTimes.forEach((at, i) => add("pulse", at, 45 - index, .46, i === 0 ? .19 : .12));
    const degrees = cue === "recognition" ? [0, 7, 10, 2] : cue === "resist" ? [0, 1] : [0, 7, 2];
    degrees.forEach((degree, i) => add("body", .32 + i * .83, 57 + degree, .85, .075));
    if (cue === "recognition") add("body", 1.9, 52, 2.8, .055);
    if (cue === "return") add("body", 3.2, 59, 1.3, .045);
  } else {
    // A shared open motif: recognition briefly completes it; return omits its
    // third fragment. No chord progression, tonic cadence, or success fanfare.
    const degrees = cue === "recognition" ? [0, 7, 10, 2] : cue === "return" ? [0, 7, 2] : cue === "resist" ? [7, 1] : [0, 7];
    const gap = cue === "recognition" ? .9 : cue === "return" ? 1.35 : 1.8;
    degrees.forEach((degree, i) => add("fragment", .12 + i * gap, 69 + degree - (cue === "resist" ? 12 : 0), 2, .085));
    if (cue === "recognition") {
      add("body", 1.7, 57, 3.4, .05);
      add("body", 2.1, 64, 2.9, .035);
    }
    if (cue === "return") add("fragment", 5.4, 71, 1.9, .045);
  }
  return Object.freeze(notes.sort((a, b) => a.at - b.at));
}
