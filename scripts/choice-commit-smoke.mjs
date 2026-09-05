// Exercise production choice renderers with a deterministic clock: late appearance
// callbacks must never reopen a decision after the player has committed it.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { localeSource } from "./reading-locale-smoke.mjs";

const source = readFileSync(new URL("../slice.js", import.meta.url), "utf8");
const forgetGuard = source.match(/  const ForgetGuard = \(\(\) => \{[\s\S]*?\n  \}\)\(\);/)?.[0];
assert.ok(forgetGuard, "production forget confirmation must be available");
const names = ["renderChoices", "confirmThen", "renderEchoChoices", "renderEdgeChoices"];
const renderers = names.map((name) => {
  const match = source.match(new RegExp(`  function ${name}\\([^)]*\\) \\{[\\s\\S]*?\\n  \\}`));
  assert.ok(match, `production ${name} must be available`);
  return match[0];
}).join("\n");

function harness(reduced = false, dialogMode = "native") {
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
    emit(event) { this.listeners.get(event)?.fn(); }
    showModal() { this.open = true; this.opens = (this.opens || 0) + 1; }
    close(value) { this.open = false; if (value !== undefined) this.returnValue = value; this.emit("close"); }
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
  const dialog = dialogMode === "missing" ? null : new Element();
  if (dialogMode === "unsupported") dialog.showModal = undefined;
  if (dialogMode === "throws") dialog.showModal = () => { throw new Error("cannot show"); };
  const context = vm.createContext({
    document, choicesEl, sceneEl, REDUCED: reduced, revealToken: 0, $: () => dialog,
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
  vm.runInContext(localeSource + "\n" + renderers + "\n" + forgetGuard, context);
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
  return { context, choicesEl, document, dialog, actions, render, advance };
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

// E44: the actual edge renderer and guard must never erase on an opening/cancel.
for (const reduced of [false, true]) {
  const h = harness(reduced), buttons = h.render("edge");
  h.advance(1000);
  const token = h.context.revealToken;
  buttons[1].click(); buttons[1].click();
  assert.equal(h.dialog.opens, 1, "rapid open clicks cannot replace the pending request");
  assert.equal(h.dialog.returnValue, "cancel", "every opening defaults to keeping memory");
  assert.equal(h.context.revealToken, token, "opening confirmation must not commit a choice");
  assert.ok(buttons.every((button) => !button.disabled));
  assert.equal(h.choicesEl.querySelector(".chosen"), null);
  h.dialog.open = false; // Native close dispatch can be queued after the open attribute clears.
  buttons[1].click();
  assert.equal(h.dialog.opens, 1, "a queued close must finish before another request can replace it");
  h.dialog.close("cancel"); h.advance(1000);
  assert.deepEqual(h.actions, []);
  assert.equal(h.document.activeElement, buttons[1], "cancel returns to the original forget control");
  buttons[1].click();
  h.dialog.returnValue = "forget"; h.dialog.emit("cancel"); h.dialog.close();
  assert.deepEqual(h.actions, [], "Escape cannot reuse a destructive return value");
  buttons[1].click(); h.dialog.close("forget"); h.dialog.emit("close"); buttons[1].click();
  h.advance(1000);
  assert.deepEqual(h.actions, ["forget"], "only explicit confirmation erases, exactly once");
}
for (const stale of ["token", "detached", "disabled", "chosen"]) {
  const h = harness(), buttons = h.render("edge");
  h.advance(1000); buttons[1].click();
  if (stale === "token") h.context.revealToken++;
  if (stale === "detached") h.choicesEl.innerHTML = "";
  if (stale === "disabled") buttons[1].disabled = true;
  if (stale === "chosen") buttons[0].classList.add("chosen");
  h.document.activeElement = h.document.body;
  h.dialog.close("forget"); h.advance(1000);
  assert.deepEqual(h.actions, [], `${stale}: stale confirmation cannot erase another scene`);
  assert.equal(h.document.activeElement, h.document.body, `${stale}: stale dialog cannot steal focus`);
}
for (const mode of ["missing", "unsupported", "throws"]) {
  const h = harness(false, mode), buttons = h.render("edge");
  h.advance(1000); buttons[1].click(); h.advance(1000);
  assert.deepEqual(h.actions, [], `${mode}: unavailable confirmation must fail closed`);
  buttons[0].click(); h.advance(1000);
  assert.deepEqual(h.actions, ["descend"], `${mode}: memory-preserving descent remains playable`);
}
console.log("choice-commit smoke PASS (staggered clicks, stale scenes, reduced motion, locks, safe forget/cancel/reopen)");
