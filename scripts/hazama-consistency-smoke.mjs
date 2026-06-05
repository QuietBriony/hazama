#!/usr/bin/env node
/* hazama-consistency — 逆統合(root=slice)の整合検証。
   root は slice/ の昇格コピー(=本番ビルド)。slice/ を source とし、共有ランタイムが
   root と byte 一致していること(=(P)休眠運用の drift 防止)＋エントリ整合を確認する。 */

import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];
const read = (p) => readFileSync(path.join(root, p), "utf8");
const assert = (cond, msg) => { if (!cond) failures.push(msg); };
const has = (text, needle, label) => assert(text.includes(needle), `${label} missing: ${needle}`);

const indexHtml = read("index.html");
const altHtml = read("hazama-index.html");

// 1) エントリは同一
assert(indexHtml === altHtml, "index.html and hazama-index.html must stay identical");

// 2) root は slice/ の昇格＝共有ランタイムは byte 一致（drift 防止／slice/ が source-of-truth）
for (const f of ["slice.js", "slice.css", "depths-shell.json", "manifest.webmanifest"]) {
  assert(read(f) === read(`slice/${f}`), `root ${f} must match slice/${f} (promote from slice source)`);
}

// 3) root index は没入シェル構造を備える（slice 由来）
for (const layer of ["hz-bg-garden", "hz-bg-mandala", "hz-glitch", "hz-scanline"]) {
  has(indexHtml, layer, "root immersive art layer");
}
has(indexHtml, 'id="scene"', "root scene");
has(indexHtml, 'id="choices"', "root choices");
has(indexHtml, 'id="attune"', "root recognition indicator");
has(indexHtml, "slice.js?v=", "root references slice runtime");

// 4) 認識/Ωゲート(逆統合の核)が root ランタイムに在る
const js = read("slice.js");
has(js, "function gainRecognition", "recognition gain");
has(js, "isAttuned", "omega attunement gate");
has(js, "浮上 — 表層へ帰る", "two-pole surface ending");
has(js, "深度Ω 到達", "omega ending");

// 5) PWA は root と slice/ で別 cache 空間（互いを消さない）
has(read("sw.js"), 'const CACHE_PREFIX = "hazama-pwa-"', "root sw uses hazama-pwa- prefix");
has(read("slice/sw.js"), 'const CACHE_PREFIX = "hazama-slice-pwa-"', "slice sw uses hazama-slice-pwa- prefix");

// 6) forward 一式は (P) 休眠で残置（depth-meta/route/balance smoke が参照）
for (const f of ["hazama-gate-run.js", "hazama-depths.json"]) {
  try { read(f); } catch { failures.push(`dormant forward file missing: ${f}`); }
}

if (failures.length > 0) {
  console.error("hazama-consistency smoke FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("hazama-consistency smoke passed");
