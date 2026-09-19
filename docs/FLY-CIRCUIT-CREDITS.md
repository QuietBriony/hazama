# Hazama — fly circuit data, modifications and limits

E46 candidate, 2026-09-20. These notices also apply to the compact `FLY_ROWS`
data embedded in `slice.js` and `tools/sensory/fly-circuit-projection.json`.

## Attribution / DATA license

MaleCNS v1.0, male Drosophila melanogaster.
Credit: MaleCNS collaboration — FlyEM at HHMI Janelia, University of Cambridge,
MRC Laboratory of Molecular Biology, Google Research.

- Dataset: https://male-cns.janelia.org/download/
- Data license: [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/)
  ([full terms](https://creativecommons.org/licenses/by/4.0/legalcode.en)).
  The projected data remain available under CC BY 4.0 without additional restrictions.
- Extraction/provenance: Denis Shiryaev / DesktopFly,
  revision `32b00011e83c3dc85fa3ea0b3934155b04f1635d`.
  [Extraction notice](https://github.com/DenisSergeevitch/desktop-fly/blob/32b00011e83c3dc85fa3ea0b3934155b04f1635d/data/LOCOMOTOR_PROVENANCE.md).
- Distribution: Apolotary / Fly Lab,
  revision `631ada7f1e074581ac986e91c7e68ad7074fedb1`.
  [Source notices](https://github.com/Apolotary/fly-lab/blob/631ada7f1e074581ac986e91c7e68ad7074fedb1/THIRD_PARTY_NOTICES.md).
- Pinned source: [locomotor_circuit.json](https://raw.githubusercontent.com/Apolotary/fly-lab/631ada7f1e074581ac986e91c7e68ad7074fedb1/data/locomotor_circuit.json).
  1,076,374 bytes; SHA-256 `8f76d94034dcf802453e3a0a8ed5342d122e57d37e2bb5ea28da66de0856f5d6`.

This work is independent. The data, extraction and distribution authors do not
endorse Hazama. No third-party application code, audio, model runtimes or recordings are included.
No female FlyWire data are included.

## Changes made by Hazama

The source is a selected **leg-locomotor** graph, not a whole brain:
1,045 cells and 17,224 directed connections. Hazama uses a lossy projection into
sensory / descending / premotor / ascending / six motor-leg groups.
For each original target cell, divide every signed input by its absolute incoming
weight sum (floor 1). Average within each target group, then round to six decimals.
Group sizes: 153, 16, 622, 34, 38, 42, 33, 33, 37, 37.

The upstream graph already omits connections and applies assumed transmitter
signs. Group averaging further discards individual-cell and within-group dynamics.
The projection is **not equivalent** to the original neural simulation.
Stimulus strength, 10 Hz update clock, leakage, fatigue, noise and musical readout
are authored toy dynamics, not measured physiology. No neural weights change.

Hazama's newly authored adapter modifies only small details of existing synthesized
responses and heartbeat: friction pitch, response timing and attenuation.
It takes only existing audio scalars and bounded event cues, not raw player text.
It does not choose routes, award attunement, write storage, communicate with
Music/Openclaw, or learn preferences. It is not a living
fly, a model of consciousness, a medical intervention or RSI.

## Reproduction

The existing source copy in the user's Music experiment was inspected read-only;
its full bytes matched the pinned size and SHA-256 before projection. No original
data file is copied into Hazama and there is no runtime fetch.

Run the read-only authoring utility with a local copy of the exact source:

```text
node scripts/project-fly-circuit.mjs /absolute/path/to/locomotor_circuit.json
```

It prints the projection for review, creates no files and performs no network
requests. The output must match `tools/sensory/fly-circuit-projection.json` and
the matrix in `slice.js`. This utility is **not** a required build step.
