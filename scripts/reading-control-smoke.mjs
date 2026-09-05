// Run the actual renderers against a small DOM and deterministic clock. Full-text
// reveal must change presentation only: never advance, score, or bypass an echo.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../slice.js", import.meta.url), "utf8");
const names = ["clearReadingControl", "armReadingControl", "showReadingPlace", "renderNode", "renderEdge", "endingReflection", "renderEndingRecord"];
const production = names.map((name) => {
  const match = source.match(new RegExp(`  function ${name}\\([^)]*\\) \\{[\\s\\S]*?\\n  \\}`));
  assert.ok(match, `production ${name} exists`);
  return match[0];
}).join("\n");
const buttonListener = source.split(/\r?\n/).find((line) => line.includes('$("reveal-now").addEventListener'));
assert.ok(buttonListener, "full-text button is wired in production");

function harness(reduced = false) {
  let now = 0, nextTimer = 0, saves = 0;
  const timers = new Map(), choices = [];
  class Element {
    constructor() { this.children = []; this.listeners = new Map(); this.className = ""; this.style = {}; this.dataset = {}; this.scrollTop = 0; this.disabled = false; this.text = ""; }
    get classList() {
      return { add: (...names) => { this.className += " " + names.join(" "); }, contains: (name) => this.className.split(/\s+/).includes(name) };
    }
    get textContent() { return this.text + this.children.map((el) => el.textContent).join(""); }
    set textContent(text) { this.text = text; this.children = []; }
    set innerHTML(_html) { this.text = ""; this.children = []; }
    appendChild(el) { this.children.push(el); return el; }
    querySelectorAll(selector) { return this.children.flatMap((el) => [...(el.classList.contains(selector.slice(1)) ? [el] : []), ...el.querySelectorAll(selector)]); }
    addEventListener(event, fn) { this.listeners.set(event, fn); }
    removeEventListener(event, fn) { if (this.listeners.get(event) === fn) this.listeners.delete(event); }
    click() { if (!this.disabled) this.listeners.get("click")?.(); }
  }
  const scene = new Element(), button = new Element(), place = new Element();
  button.disabled = true;
  const lines = ["first line", "second line", "third line"].map((t) => ({ who: "n", t }));
  const node = (title) => ({ title, lines, choices: [] });
  const state = { steps: 0, visits: {}, cycle: 0, legacy: { maxRank: 0 }, observer: 1, dread: 0, rank: 0, echoDone: {}, attunement: 0, returnPaths: 5, maxSink: 0.5, resisted: 0, refused: 0 };
  const context = vm.createContext({
    state, DATA: { start: "zero", nodes: { zero: node("entry"), A: node("junction"), Q: node("echo") }, edge: { sankLines: lines, heldLines: lines } },
    document: { createElement: () => new Element(), body: new Element() },
    $: (id) => id === "reveal-now" ? button : place,
    sceneEl: scene, choicesEl: new Element(), readingFinish: null, sceneSkipHandler: null, revealToken: 0,
    REDUCED: reduced, Preferences: { fullText: false }, RANK: { zero: 0, A: 1, Q: 17 }, WHO_CLASS: {}, ECHO_GATES: ["Q"], ATTUNE: { omegaThreshold: 6 }, RETURN_PATHS_START: 5,
    window: { setTimeout(fn, delay = 0) { timers.set(++nextTimer, { fn, at: now + delay }); return nextTimer; } },
    applyCycle: (_id, n) => n, maybeForeignDrift: (_id, n) => n, applyCycleSkin() {}, applyAtmosphere() {},
    Spiral: { save() { saves++; } }, Follow: { reset() { scene.scrollTop = 0; }, stick() {}, release() {} }, Peel: { play() {} },
    Audio: { update() {}, breath() {} }, clamp01: (n) => Math.min(1, Math.max(0, n)),
    isAttuned: () => state.attunement >= 6, echoTruthAvail: () => true,
  });
  context.setBusy = () => context.clearReadingControl();
  for (const [name, kind] of [["renderChoices", "normal"], ["renderEchoChoices", "echo"], ["renderEdgeChoices", "edge"]]) {
    context[name] = () => { context.setBusy(false); choices.push(kind); };
  }
  vm.runInContext(production + "\n" + buttonListener, context);
  function advance(ms) {
    const end = now + ms;
    for (;;) {
      const next = [...timers.entries()].filter(([,timer]) => timer.at <= end).sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0];
      if (!next) break;
      timers.delete(next[0]); now = next[1].at; next[1].fn();
    }
    now = end;
  }
  return { context, state, scene, button, choices, advance, get saves() { return saves; } };
}

for (const at of [0, 100, 850]) {
  const h = harness(); h.context.renderNode("zero"); h.advance(at);
  h.scene.click();
  assert.equal(h.choices.length, 0, "first-visit scene tap does not skip");
  const before = JSON.stringify(h.state), saves = h.saves;
  h.scene.scrollTop = 17;
  h.button.click(); h.button.click(); h.advance(30000);
  assert.deepEqual(h.choices, ["normal"], "full reveal yields one decision, including after old timers");
  assert.deepEqual(h.scene.children.map((p) => p.textContent), ["first line", "second line", "third line"]);
  assert.ok(h.scene.querySelectorAll(".ch").every((span) => span.classList.contains("lit")));
  assert.equal(h.scene.scrollTop, 17, "manual reveal preserves reading position");
  assert.equal(JSON.stringify(h.state), before, "full reveal never advances or changes recognition");
  assert.equal(h.saves, saves, "full reveal does not persist a progress change");
  assert.equal(h.button.disabled, true);
}
{
  const h = harness(); h.context.renderNode("zero");
  const stale = h.context.readingFinish;
  h.context.renderNode("Q"); stale();
  assert.equal(h.choices.length, 0, "stale finish cannot expose the new scene's choices");
  h.button.click(); h.advance(30000);
  assert.deepEqual(h.choices, ["echo"], "full-text reveal cannot bypass the echo gate");
  assert.equal(h.state.attunement, 0); assert.deepEqual(h.state.echoDone, {});
}
for (const reduced of [false, true]) {
  const h = harness(reduced); h.context.renderNode("zero"); h.advance(30000);
  assert.deepEqual(h.choices, ["normal"], "natural/reduced reveal completes exactly once");
  assert.equal(h.button.disabled, true, "natural/reduced completion disables manual reveal");
}
{
  const h = harness(); h.state.cycle = 1; h.context.renderNode("zero"); h.scene.click(); h.advance(30000);
  assert.deepEqual(h.choices, ["normal"], "existing replay scene-tap shortcut remains available");
}
for (const [recognition, wagered, phrase] of [[6, true, "核の外周へ届いた"], [6, false, "届かなかったのではない"], [0, false, "今の認識では"]]) {
  for (const reduced of [false, true]) {
    const h = harness(reduced); h.state.attunement = recognition; h.state.wagered = wagered; h.state.activeTrunk = "soma";
    h.context.renderEdge(); h.advance(100); h.button.click(); h.advance(30000);
    assert.deepEqual(h.choices, ["edge"], "ending record is rendered exactly once");
    assert.ok(h.scene.textContent.includes(phrase), "ending distinguishes reaching, choosing to return, and not reaching");
    assert.ok(h.scene.textContent.includes("身体の道"), "reflection matches the selected trunk");
    assert.equal(h.scene.querySelectorAll(".hz-edge-record").length, 1);
    assert.equal(h.button.disabled, true);
  }
}
console.log("reading-control smoke PASS (first read, stale timers, echo, replay, reduced motion, three ending states)");

for (const target of ["zero", "Q", "edge"]) {
  const h = harness(); h.context.Preferences.fullText = true;
  if (target === "edge") h.context.renderEdge(); else h.context.renderNode(target);
  assert.equal(h.button.disabled, true, "automatic full text does not require the reveal button");
  assert.equal(h.scene.querySelectorAll(".ch").length, 0, "automatic full text creates no hidden characters");
  h.advance(30000);
  assert.deepEqual(h.choices, [target === "Q" ? "echo" : target === "edge" ? "edge" : "normal"]);
  assert.equal(h.state.attunement, 0, "full-text preference never scores a choice");
}
console.log("automatic full-text smoke PASS (normal, echo, ending)");
