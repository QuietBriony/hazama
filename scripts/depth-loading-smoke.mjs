// Exercise the production depth loader with a deterministic clock and stalled
// headers/body. A lost connection must reach retry instead of trapping the gate.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../slice.js", import.meta.url), "utf8");
const production = source.match(/  async function loadData\(\) \{[\s\S]*?\n  \}/)?.[0];
assert.ok(production, "production depth loader exists");
const data = { start: "zero", nodes: { zero: { lines: [], choices: [] } } };

function harness(mode = "success") {
  let now = 0, timerId = 0, signal, requested, options;
  const timers = new Map();
  const stalled = () => signal?.aborted ? Promise.reject(signal.reason) : new Promise((resolve, reject) => {
    signal.addEventListener("abort", () => reject(signal.reason), { once: true });
  });
  const context = vm.createContext({
    DATA: null, AbortController,
    window: {
      setTimeout(fn, delay) { timers.set(++timerId, { fn, at: now + delay }); return timerId; },
      clearTimeout(id) { timers.delete(id); }
    },
    fetch(url, init) {
      requested = url; options = init; signal = init.signal;
      if (mode === "headers") return stalled();
      if (mode === "network") return Promise.reject(new Error("Connection lost"));
      return Promise.resolve({ ok: mode !== "http", status: mode === "http" ? 503 : 200,
        json() {
          if (mode === "body") return stalled();
          if (mode === "json") return Promise.reject(new SyntaxError("Incomplete JSON"));
          return Promise.resolve(mode === "schema" ? { start: "missing", nodes: {} } : data);
        }
      });
    }
  });
  vm.runInContext(production + "\nglobalThis.load = loadData;", context);
  return {
    context, timers, load: () => context.load(),
    get signal() { return signal; }, get requested() { return requested; }, get options() { return options; },
    set mode(value) { mode = value; },
    advance(ms) {
      now += ms;
      for (const [id, timer] of timers) if (timer.at <= now) { timers.delete(id); timer.fn(); }
    }
  };
}

for (const mode of ["headers", "body"]) {
  const h = harness(mode);
  const outcome = h.load().then(() => ({ ok: true }), error => ({ error }));
  assert.ok(h.signal, `${mode}: request must be abortable`);
  await new Promise(setImmediate); // Let fetch headers resolve before checking a stalled body.
  assert.equal(h.timers.size, 1, `${mode}: deadline remains armed while waiting`);
  h.advance(9999);
  assert.equal(h.signal.aborted, false, `${mode}: a normal request has time to complete`);
  h.advance(1);
  const result = await outcome;
  assert.equal(result.error?.name, "AbortError", `${mode}: deadline rejects into the existing retry path`);
  assert.equal(h.context.DATA, null, `${mode}: failed startup never installs data`);
  assert.equal(h.timers.size, 0, `${mode}: deadline is cleaned up`);
  h.mode = "success";
  await h.load();
  assert.equal(h.context.DATA, data, `${mode}: a fresh attempt can recover`);
  assert.equal(h.timers.size, 0, `${mode}: recovery cleans its deadline`);
}

for (const mode of ["network", "http", "json", "schema"]) {
  const h = harness(mode);
  await assert.rejects(h.load());
  assert.equal(h.context.DATA, null, `${mode}: failed validation cannot install data`);
  assert.equal(h.timers.size, 0, `${mode}: failure cleans its deadline`);
  h.advance(10000);
  assert.equal(h.signal.aborted, false, `${mode}: no stale abort fires after failure`);
}

const h = harness();
await h.load();
assert.equal(h.context.DATA, data, "valid data is installed");
assert.equal(h.options.cache, "no-store", "depth requests preserve the freshness policy");
assert.match(h.requested, /^depths-shell\.json\?v=/, "the versioned local data source is preserved");
assert.equal(h.timers.size, 0, "success cleans its deadline");
h.advance(10000);
assert.equal(h.signal.aborted, false, "successful startup is not aborted later");
console.log("depth-loading smoke PASS (stalled headers/body, recovery, validation, timer cleanup)");
