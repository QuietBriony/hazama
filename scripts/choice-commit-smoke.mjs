// Exercise production choice renderers with a deterministic clock: late appearance
// callbacks must never reopen a decision after the player has committed it.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { localeSource } from "./reading-locale-smoke.mjs";

const source = readFileSync(new URL("../slice.js", import.meta.url), "utf8");
const names = ["renderChoices", "confirmThen", "renderEchoChoices", "renderEdgeChoices"];
const renderers = names.map((name) => {
  const match = source.match(new RegExp(`  function ${name}\\([^)]*\\) \\{[\\s\\S]*?\\n  \\}`));
  assert.ok(match, `production ${name} must be available`);
  return match[0];
}).join("\n");

function harness(reduced = false) {
  let now = 0, nextTimer = 0;
  const timers = new Map(), actions = [];
  class Element {
    constructor() { this.children = []; this.className = ""; this.disabled = false; this.listeners = new Map(); this.style = {}; }
    get classList() {
      return {
        contains: (name) => this.className.split(/\s+/).includes(name),
        add: (...names) => { this.className = [...new Set([...this.className.split(/\s+/), ...names])].join(" "); }
      };
    }
    set innerHTML(html) {
      this.children = [];
      for (const match of html.matchAll(/<span class="([^"]+)"/g)) {
        const span = new Element(); span.className = match[1]; this.appendChild(span);
      }
    }
    appendChild(child) { this.children.push(child); return child; }
    contains(child) { return this === child || this.children.some((el) => el.contains(child)); }
    querySelectorAll(selector) {
      return this.children.flatMap((el) => [
        ...(el.classList.contains(selector.slice(1)) ? [el] : []), ...el.querySelectorAll(selector)
      ]);
    }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    setAttribute() {}
    addEventListener(event, fn, options) { this.listeners.set(event, { fn, once: options?.once }); }
    click() {
      if (this.disabled) return;
      const listener = this.listeners.get("click");
      if (listener?.once) this.listeners.delete("click");
      listener?.fn();
    }
    focus() { document.activeElement = this; }
  }
  const document = { body: new Element(), createElement: () => new Element() };
  document.activeElement = document.body;
  const choicesEl = new Element(), sceneEl = new Element();
  const context = vm.createContext({
    document, choicesEl, sceneEl, REDUCED: reduced, revealToken: 0,
    window: { setTimeout(fn, delay = 0) { timers.set(++nextTimer, { fn, at: now + delay }); return nextTimer; } },
    state: { id: "B", cycle: 0, maxSink: 0, attunement: 0, visits: { B: 1 }, legacy: { detoursSeen: [] } },
    ATTUNE: { omegaThreshold: 6 }, CHOICE_VARIA: {}, ECHO_BANK: { B: "seen", C: "unseen", D: "unseen too" },
    isAttuned: () => false, orderedChoices: (node) => node.choices,
    onboardHint() {}, attuneGlossHint() {}, setBusy() {}, queueA11yState() {},
    Follow: { stick() {} }, worldSeed: () => 1, hashStr: () => 2, mulberry32: () => () => 0.5,
    echoOnboarded: true, echoOnboardPending: false,
    choose: (choice) => actions.push(choice.t), echoResolve: (_node, _id, truth) => actions.push(truth),
    descendAgain: () => actions.push("descend"), forgetAll: () => actions.push("forget"), EdgeCard: { share() {} }
  });
  vm.runInContext(localeSource + "\n" + renderers, context);
  const node = { choices: [
    { t: "first", to: "C", kind: "descend" },
    { t: "second", to: "D", kind: "descend" },
    { t: "locked", to: "Omega", kind: "descend", sub: "key", requireAttune: true }
  ] };
  function render(kind) {
    if (kind === "echo") context.renderEchoChoices(node, "Q");
    else if (kind === "edge") context.renderEdgeChoices(false);
    else context.renderChoices(node);
    return choicesEl.querySelectorAll(".hz-choice");
  }
  function advance(ms) {
    const end = now + ms;
    for (;;) {
      const next = [...timers.entries()].filter(([,timer]) => timer.at <= end)
        .sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0];
      if (!next) break;
      timers.delete(next[0]); now = next[1].at; next[1].fn();
    }
    now = end;
  }
  return { context, choicesEl, document, actions, render, advance };
}

for (const kind of ["normal", "echo"]) {
  for (const clickAt of [160, 200, 260]) {
    const h = harness(), buttons = h.render(kind);
    h.advance(clickAt);
    buttons[0].click();
    h.advance(270 - clickAt); // Second button's appearance falls inside the 140ms commit beat.
    assert.equal(buttons[1].disabled, true, `${kind}: appearance must not re-enable an unchosen button`);
    buttons[1].click();
    assert.equal(h.actions.length, 0, `${kind}: preserve the confirmation beat`);
    h.advance(1000);
    assert.equal(h.actions.length, 1, `${kind}: exactly one choice effect`);
  }
}

for (const kind of ["normal", "echo", "edge"]) {
  const h = harness(), buttons = h.render(kind);
  h.advance(220);
  buttons[0].click();
  h.document.activeElement = h.document.body;
  h.context.revealToken++; // A newer scene replaces this decision before its commit runs.
  h.choicesEl.innerHTML = "";
  h.advance(1000);
  assert.equal(h.actions.length, 0, `${kind}: stale commit must not affect a newer scene`);
  assert.equal(h.document.activeElement, h.document.body, `${kind}: stale appearance must not steal focus`);
  const next = h.render(kind);
  h.advance(1000);
  next[0].click(); h.advance(140);
  assert.equal(h.actions.length, 1, `${kind}: next decision remains playable`);

  const reduced = harness(true), instant = reduced.render(kind);
  reduced.advance(0);
  instant[0].click(); instant[1].click();
  assert.equal(reduced.actions.length, 1, `${kind}: reduced motion commits once, immediately`);
}

const locked = harness(), lockedButtons = locked.render("normal");
lockedButtons[0].click();
assert.equal(locked.actions.length, 0, "unrevealed choice must not fire");
locked.advance(1000); lockedButtons[2].click(); locked.advance(140);
assert.equal(locked.actions.length, 0, "locked Omega choice must stay locked");

console.log("choice-commit smoke PASS (staggered clicks, stale scenes, reduced motion, locks)");
