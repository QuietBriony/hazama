// Test the actual settings wiring and music controls without persisting anything.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../slice.js", import.meta.url), "utf8");
const settings = source.match(/  function setupReadingSettings\(\) \{[\s\S]*?\n  \}/)?.[0];
const music = source.match(/  const Music = \(\(\) => \{[\s\S]*?\n  \}\)\(\);/)?.[0];
assert.ok(settings && music, "production settings and Music must be extractable");

function harness(reduced = false) {
  const elements = new Map(), styles = {}, calls = [];
  let finishCount = 0;
  class Element {
    constructor() { this.listeners = new Map(); this.value = ""; this.checked = false; this.open = false; this.isConnected = true; }
    addEventListener(type, fn) { this.listeners.set(type, fn); }
    emit(type) { this.listeners.get(type)?.(); }
    setAttribute(key, value) { this[key] = value; }
    showModal() { this.open = true; calls.push("modal"); }
    focus() { this.focused = true; }
  }
  const $ = (id) => { if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id); };
  const audio = {
    playing: false, volume: 1, suspendedByVisibility: false,
    start() { this.playing = true; calls.push("start"); },
    toggle() { this.playing = !this.playing; this.suspendedByVisibility = false; calls.push("toggle"); },
    setVolume(v) { this.volume = v; },
    suspendForVisibility() { this.playing = false; this.suspendedByVisibility = true; return true; },
    dispose() { this.playing = false; }
  };
  const document = new Element(); document.documentElement = { style: { setProperty: (k, v) => { styles[k] = v; } } };
  const context = vm.createContext({
    $, document, window: new Element(), Audio: audio, REDUCED: reduced, entered: false,
    Preferences: { textScale: 1, fullText: false, sound: true }, Follow: { release() {} },
    localStorage: new Proxy({}, { get() { throw new Error("settings must not access storage"); } })
  });
  context.readingFinish = () => { finishCount++; context.readingFinish = null; };
  vm.runInContext(music + "\n" + settings + "\nsetupReadingSettings(); globalThis.music = Music;", context);
  return { $, context, audio, calls, document, styles, get finishCount() { return finishCount; } };
}

const h = harness();
h.$("settings-gate").emit("click");
assert.equal(h.$("settings-dialog").open, true);
assert.equal(h.$("settings-size").value, "1");
assert.equal(h.$("settings-reading").value, "reveal");
assert.equal(h.$("settings-volume-value").textContent, "100%");
h.$("settings-gate").emit("click");
assert.deepEqual(h.calls, ["modal"], "reopening an open modal is harmless and never starts audio");
h.$("settings-size").value = "1.3"; h.$("settings-size").emit("change");
assert.equal(h.styles["--reading-scale"], "1.3");
h.$("settings-size").value = "999"; h.$("settings-size").emit("change");
assert.equal(h.context.Preferences.textScale, 1.3, "only supported text sizes are accepted");
assert.equal(h.$("settings-size").value, "1.3", "invalid input is resynchronized");
h.$("settings-reading").value = "full"; h.$("settings-reading").emit("change");
h.$("settings-reading").emit("change");
assert.equal(h.finishCount, 1, "changing preference finishes the current text at most once");
assert.equal(h.context.Preferences.fullText, true);
h.$("settings-sound").checked = false; h.$("settings-sound").emit("change");
h.$("settings-volume").value = "35"; h.$("settings-volume").emit("input");
assert.equal(h.audio.volume, 0.35);
assert.equal(h.$("settings-volume")["aria-valuetext"], "35%");
assert.deepEqual(h.calls, ["modal"], "sound/volume on the cover cannot start audio");
h.$("settings-dialog").open = false; h.$("settings-dialog").emit("close");
assert.equal(h.$("settings-gate").focused, true, "closing returns focus to the opener");
h.context.entered = true; h.context.music.startPrimary();
assert.equal(h.audio.playing, false, "sound-off before entry stays silent");
h.$("settings-sound").checked = true; h.$("settings-sound").emit("change");
assert.equal(h.audio.playing, true, "explicit in-game toggle starts audio");
h.$("settings-volume").value = "0"; h.$("settings-volume").emit("input");
assert.equal(h.$("audio-toggle").textContent, "♪ 音量0");
h.context.music.cycle();
assert.equal(h.$("settings-sound").checked, false, "footer toggle synchronizes settings");
h.context.music.cycle();
h.document.hidden = true; h.document.emit("visibilitychange");
assert.equal(h.$("settings-sound").checked, false);
const callsAfterHidden = h.calls.length;
h.$("settings-volume").value = "50"; h.$("settings-volume").emit("input");
assert.equal(h.calls.length, callsAfterHidden, "volume changes never undo visibility suspension");
assert.equal(h.$("audio-toggle").textContent, "♪ 再開");

const reduced = harness(true);
reduced.$("settings-gate").emit("click");
assert.equal(reduced.$("settings-reading").disabled, true, "OS reduced motion cannot be overridden by the text setting");
assert.equal(reduced.$("settings-reading").value, "full");
console.log("reading-settings smoke PASS (session-only, bounds, modal focus, no surprise audio, volume/mute sync, reduced motion)");
