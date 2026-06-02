#!/usr/bin/env node

// depth-meta smoke — 統合スキーマ（depthMeta）の後方互換バリデーション。
//
// depthMeta は hazama-depths.json の各ノードへ任意で足せる拡張フィールド（INTEGRATION.md §4）。
// 不在ノードは従来挙動（このチェックは何も要求しない＝後方互換）。存在する場合のみ形を検証する。
// 実グラフ（options[]）は hazama-consistency-smoke.mjs が引き続き source of truth として検証する。

import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

const depths = JSON.parse(read("hazama-depths.json"));

const WHO = new Set(["n", "voice", "self", "cold", "danger", "body", "scrawl"]);
const KIND = new Set(["descend", "surface", "retreat", "rejoin", "edge"]);
const REGISTER = new Set(["descent", "anchor", "hub", "omega", "reborn", "procedural", "detour", "hold"]);
// 八観（INTEGRATION.md §6 / source 八観）。detour ルートの質感タグ。
const KAN = new Set(["体観", "波観", "思観", "財観", "創観", "観察者観", "空観", "円観"]);

let metaCount = 0;

for (const [id, node] of Object.entries(depths)) {
  const meta = node?.depthMeta;
  if (meta === undefined) continue; // 後方互換：depthMeta 不在は従来挙動
  metaCount += 1;

  assert(meta && typeof meta === "object" && !Array.isArray(meta), `${id}: depthMeta must be an object`);
  if (!meta || typeof meta !== "object") continue;

  if ("register" in meta) {
    assert(REGISTER.has(meta.register), `${id}: depthMeta.register invalid: ${meta.register}`);
  }
  if ("maps_from" in meta) {
    assert(typeof meta.maps_from === "string" && meta.maps_from.length > 0, `${id}: depthMeta.maps_from must be a non-empty string`);
  }
  if ("kan" in meta) {
    assert(KAN.has(meta.kan), `${id}: depthMeta.kan invalid (八観): ${meta.kan}`);
  }
  if ("branch" in meta) {
    assert(typeof meta.branch === "boolean", `${id}: depthMeta.branch must be a boolean`);
  }
  if ("observer" in meta) {
    assert(Number.isFinite(meta.observer) && meta.observer >= 0, `${id}: depthMeta.observer must be a non-negative number`);
  }
  if ("sinkFloor" in meta) {
    assert(Number.isFinite(meta.sinkFloor) && meta.sinkFloor >= 0, `${id}: depthMeta.sinkFloor must be a non-negative number`);
  }
  if ("tension" in meta) {
    assert(meta.tension === "high", `${id}: depthMeta.tension only supports "high"`);
  }
  if ("core" in meta) {
    // 設計則：核は描写しない（INTEGRATION.md §4 / M2-spine §4-1）。core:true は禁止に近い。
    assert(meta.core === false, `${id}: depthMeta.core must be false (核は描写しない)`);
  }
  if ("voice" in meta) {
    assert(Array.isArray(meta.voice), `${id}: depthMeta.voice must be an array`);
    for (const [i, line] of (meta.voice || []).entries()) {
      assert(line && typeof line === "object", `${id}: depthMeta.voice[${i}] must be an object`);
      assert(WHO.has(line?.who), `${id}: depthMeta.voice[${i}].who invalid: ${line?.who}`);
      assert(typeof line?.text === "string" && line.text.length > 0, `${id}: depthMeta.voice[${i}].text must be a non-empty string`);
    }
  }
  if ("deep" in meta) {
    assert(Array.isArray(meta.deep), `${id}: depthMeta.deep must be an array`);
    for (const [i, line] of (meta.deep || []).entries()) {
      assert(typeof line === "string" && line.length > 0, `${id}: depthMeta.deep[${i}] must be a non-empty string`);
    }
  }
  if ("choices" in meta) {
    assert(Array.isArray(meta.choices), `${id}: depthMeta.choices must be an array`);
    for (const [i, ch] of (meta.choices || []).entries()) {
      assert(ch && typeof ch === "object", `${id}: depthMeta.choices[${i}] must be an object`);
      assert(typeof ch?.text === "string" && ch.text.length > 0, `${id}: depthMeta.choices[${i}].text must be a non-empty string`);
      assert(typeof ch?.next === "string" && ch.next.length > 0, `${id}: depthMeta.choices[${i}].next must be a non-empty string`);
      if ("kind" in ch) {
        assert(KIND.has(ch.kind), `${id}: depthMeta.choices[${i}].kind invalid: ${ch.kind}`);
      }
      for (const numField of ["sink", "dread", "close"]) {
        if (numField in ch) {
          assert(Number.isFinite(ch[numField]), `${id}: depthMeta.choices[${i}].${numField} must be a number`);
        }
      }
      if ("sub" in ch) {
        assert(typeof ch.sub === "string", `${id}: depthMeta.choices[${i}].sub must be a string`);
      }
    }
  }
}

// このチェックを意味あるものにするため、最低1ノードは depthMeta を持つこと（統合の土台が入っている証）。
assert(metaCount >= 1, "no node carries depthMeta yet — integration schema foundation missing");

if (failures.length > 0) {
  console.error("depth-meta smoke FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`depth-meta smoke PASS (${metaCount} node(s) with depthMeta)`);
