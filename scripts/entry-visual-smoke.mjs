// E47: entry art, bounded camera motion and the existing four depth/ending variations.
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import vm from "node:vm";

const html = readFileSync("index.html", "utf8");
const js = readFileSync("slice.js", "utf8");
const css = readFileSync("slice.css", "utf8");
const sw = readFileSync("sw.js", "utf8");
const asset = "assets/hazama-descent-entry-e47.webp";
const bytes = readFileSync(asset);
assert.equal(bytes.toString("ascii", 0, 4), "RIFF");
assert.equal(bytes.toString("ascii", 8, 12), "WEBP");
assert(statSync(asset).size < 1300000, "lossless entry stays below the agreed 1.3 MB budget");
assert(html.includes(`src="${asset}"`), "initial HTML uses the adopted image");
assert(sw.includes(`"${asset}"`), "offline shell includes the entry");
assert(/class="hz-entry-space"[^>]*>\s*<img class="hz-bg-descent"/.test(html), "only the entry image is inside the camera");
const camera = css.match(/body:not\(\.reading-comfort\) \.hz-entry-space \{([^}]+)\}/)?.[1];
assert(camera?.includes("hz-entry-descent 36s ease-out 1 both"), "finite one-pass camera, no endless sway");
assert(/@media \(prefers-reduced-motion: no-preference\)\s*\{\s*body:not\(\.reading-comfort\) \.hz-entry-space/.test(css), "reduced motion and reading comfort are opt-outs");
assert(css.includes("body.entry-motion-paused .hz-entry-space { animation-play-state: paused; }"));
assert(js.includes('document.addEventListener("visibilitychange", syncEntryMotion)'));
assert(js.includes('window.addEventListener("pageshow", syncEntryMotion)'));
assert(css.includes("object-position: calc(35% + var(--cycle-pan, 0%)) 50%"), "portrait entry crop preserves the side texture");

// Exercise the actual picker. Changing cycles may change stages, never revert the chosen entry.
const picker = js.match(/function applyArtSet\(\) \{[\s\S]*?\n  \}/)?.[0];
assert(picker, "art picker exists");
for (const cycle of [0, 1, 2, 12]) {
  for (const suffix of ["", "-b"]) {
    const base = { src: "" };
    const stages = ["drift", "bottom", "surfaced", "omega"].map(stage => ({ dataset: { stage }, src: "" }));
    const context = {
      state: { cycle }, ART_SETS: ["", "-b"],
      hashStr: () => 0, mulberry32: () => () => 0, pickR: () => suffix,
      document: { querySelector: () => base, querySelectorAll: () => stages }
    };
    vm.runInNewContext(`${picker}; applyArtSet();`, context);
    assert.equal(base.src, asset);
    for (const image of stages) assert.equal(image.src, `assets/hazama-descent-${image.dataset.stage}${cycle ? suffix : ""}.webp`);
  }
}
console.log("entry-visual smoke PASS (adopted art, finite motion, opt-outs, offline, cycle-safe entry/stages)");
