# Next Agent Prompts — Hazama

Ready-to-paste prompts for the next session. Each prompt assumes the agent starts
in `C:\workspace\hazama` and must obey `AGENTS.md`.
（旧 forward 用プロンプト — Gate Run tuning / Playwright enablement — は対象撤去に伴い退役。）

## PWA Human-Gate Follow-Up（没入版）

```text
You are working in C:\workspace\hazama. The worktree may be
dirty from other agents; do not revert or overwrite changes you did not make.

Task: prepare and record the HZ-BL-001 PWA install / offline human pass (immersive build).

Scope boundaries:
- Read: AGENTS.md, docs/autonomy/STACK-INDEX.md, docs/autonomy/AUTONOMOUS-RUN.md,
  docs/autonomy/BACKLOG.md, docs/autonomy/SESSION-LEDGER.md.
- Write only docs needed for the human-gate result, normally docs/autonomy/SESSION-LEDGER.md
  and, if the user explicitly asks to close/update it, docs/autonomy/BACKLOG.md.
- Do not edit runtime, scripts, README, or PWA cache/version files.
- Do not mark the item done unless the human reports actual device/browser results.

Required checks:
- Run git status --short --branch before editing.
- Run node scripts/hazama-check.mjs before handoff; note PASS/FAIL.
- Human verification should cover: install prompt, standalone launch, first visit then
  offline reload, 「沈む」→ 零章 → a few descend choices, and reload-restore of the
  spiral memory (gate greets the returning observer and the next 沈む deepens the cycle).
- Final response must summarize human result, changed files, check output, and blockers.
```

## Spiral Hardening (HZ-BL-011, for Codex — start AFTER E3 lands)

```text
You are working in C:\workspace\hazama. The worktree may be dirty from other agents;
do not revert or overwrite changes you did not make. Confirm in
docs/autonomy/BACKLOG.md that HZ-BL-010 (E3) is done before touching slice.js.

Task: HZ-BL-011 — harden the spiral persistence (localStorage key hazama_spiral_v1)
against corrupt/legacy data, and encode the contract in smoke.

Scope boundaries:
- Read: AGENTS.md, docs/autonomy/STACK-INDEX.md, slice.js (Spiral module),
  scripts/build-consistency-smoke.mjs.
- Write scope: slice.js (Spiral load/save guards only), scripts/build-consistency-smoke.mjs.
- Cases to verify (manual browser + code reading): corrupt JSON string; wrong types
  (visits as array, legacy as string); leftover forward keys hazama_state_v2 / hazama_run_v1
  (must be ignored, NOT deleted); localStorage quota / SecurityError on save (must no-op).
- Behavior on any bad data: fall back to a fresh state, never throw, never block boot.
- Do not change the saved schema, the storage key, or what is persisted
  (no transients: sink/dread/returnPaths/observer stay unsaved).

Required checks:
- Run git status --short --branch before editing.
- node --check slice.js, then node scripts/hazama-check.mjs (2 PASS / 0 FAIL).
- If slice.js changed, bump ?v= in index.html (css+js), slice.js depths fetch, and
  sw.js VERSION together (build-consistency enforces sync).
- Final response: changed files, guards added, check output, and a SESSION-LEDGER entry draft.
```

## Immersive Taste-Pass Synthesis

```text
You are working in C:\workspace\hazama. The worktree may be
dirty from other agents; do not revert or overwrite changes you did not make.

Task: synthesize HZ-BL-002 manual play notes (immersive build) into a compact,
actionable handoff.

Scope boundaries:
- Read: AGENTS.md, docs/autonomy/STACK-INDEX.md, docs/autonomy/BACKLOG.md,
  docs/autonomy/SESSION-LEDGER.md, docs/hazama-playtest-slices-v0.md if present.
- Write only playtest synthesis/docs that the user authorizes, normally
  docs/autonomy/SESSION-LEDGER.md and optionally a docs/playtest note.
- Do not tune constants (ATTUNE / RESIST_STRAIN / DEEP_LOCK), change route content,
  edit runtime, add dependencies, or close human-gate items without explicit human
  playtest notes.

Required checks:
- Run git status --short --branch before editing.
- Run node scripts/hazama-check.mjs before final handoff.
- Synthesis must separate observed friction from proposed fixes.
- Cover: 没入読書の手触り / 認識◆の伝わり方 / 二極終端（Ω到達⇄浮上）の納得感 /
  縁の二択（もう一度沈む・すべて忘れる）/ 縁カードの体感.
- Final response must list changed files, checks, and the next recommended item.
```
