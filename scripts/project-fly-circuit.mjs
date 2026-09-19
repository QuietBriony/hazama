// One-time, read-only authoring utility. Not a build step or runtime dependency.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const SOURCE_SHA256 = "8f76d94034dcf802453e3a0a8ed5342d122e57d37e2bb5ea28da66de0856f5d6";
export function projectFlyCircuit(bytes) {
  assert.equal(bytes.length, 1076374, "pinned source size");
  assert.equal(createHash("sha256").update(bytes).digest("hex"), SOURCE_SHA256, "pinned source digest");
  const data = JSON.parse(bytes);
  assert.equal(data.provenance.license, "CC-BY-4.0");
  assert.equal(data.neurons.length, 1045);
  assert.equal(data.edges.length, 17224);
  const groups = ["sensory", "descending", "premotor", "ascending", ...Array.from({ length: 6 }, (_, i) => `motor-${i}`)];
  const counts = Array(10).fill(0), incoming = new Float64Array(1045);
  const groupOf = data.neurons.map(cell => {
    const index = groups.indexOf(cell.role === "motor" ? `motor-${cell.leg}` : cell.role);
    assert.ok(index >= 0, "every cell has a projection group");
    counts[index]++;
    return index;
  });
  assert.ok(counts.every(n => n > 0));
  for (const [from, to, weight] of data.edges) {
    assert.ok(Number.isInteger(from) && from >= 0 && from < 1045);
    assert.ok(Number.isInteger(to) && to >= 0 && to < 1045 && Number.isFinite(weight));
    incoming[to] += Math.abs(weight);
  }
  // Each cell's incoming signed weights are L1-normalized first. Average those
  // inputs within each TARGET group; source group signals stand for mean activity.
  // This quotient loses within-group dynamics. It is not an equivalent connectome.
  const rows = Array.from({ length: 10 }, () => Array(10).fill(0));
  for (const [from, to, weight] of data.edges) {
    rows[groupOf[to]][groupOf[from]] += weight / Math.max(1, incoming[to]) / counts[groupOf[to]];
  }
  return {
    version: "hazama-fly-projection-v1", sourceSha256: SOURCE_SHA256,
    sourceBytes: bytes.length, sourceNeurons: 1045, sourceEdges: 17224,
    license: "CC-BY-4.0", groups, counts,
    method: "per-neuron absolute-incoming normalization; target-group mean; 6-decimal rounding",
    rows: rows.map(row => row.map(value => Math.round(value * 1e6) / 1e6))
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const sourcePath = process.argv[2];
  assert.ok(sourcePath, "Pass the pinned locomotor_circuit.json path; no download or output files are created.");
  assert.equal(statSync(sourcePath).size, 1076374);
  console.log(JSON.stringify(projectFlyCircuit(readFileSync(sourcePath)), null, 2));
}
