# Next Agent Prompts — Hazama

Ready-to-paste prompts for the post-sprint handoff. Each prompt assumes the agent starts
in `C:\workspace\github-inventory\side-stack\hazama` and must obey `AGENTS.md`.

## PWA Human-Gate Follow-Up

```text
You are working in C:\workspace\github-inventory\side-stack\hazama. The worktree may be
dirty from other agents; do not revert or overwrite changes you did not make.

Task: prepare and record the HZ-BL-001 PWA install / offline human pass.

Scope boundaries:
- Read: AGENTS.md, docs/autonomy/STACK-INDEX.md, docs/autonomy/AUTONOMOUS-RUN.md,
  docs/autonomy/BACKLOG.md, docs/autonomy/SESSION-LEDGER.md.
- Write only docs needed for the human-gate result, normally docs/autonomy/SESSION-LEDGER.md
  and, if the user explicitly asks to close/update it, docs/autonomy/BACKLOG.md.
- Do not edit runtime, scripts, README, PWA cache/version files, or Music integration.
- Do not mark the item done unless the human reports actual device/browser results.

Required checks:
- Run git status --short --branch before editing.
- Run node scripts/hazama-check.mjs before handoff; note PASS/FAIL/SKIP.
- Human verification should cover install prompt, standalone launch, first visit then
  offline reload, reset, and A_start -> HUB_NIGHT.
- Final response must summarize human result, changed files, check output, and blockers.
```

## First Playable Human Playtest Synthesis

```text
You are working in C:\workspace\github-inventory\side-stack\hazama. The worktree may be
dirty from other agents; do not revert or overwrite changes you did not make.

Task: synthesize HZ-BL-002 first playable manual play notes into an actionable, compact
handoff for future tuning.

Scope boundaries:
- Read: AGENTS.md, docs/autonomy/STACK-INDEX.md, docs/autonomy/BACKLOG.md,
  docs/autonomy/SESSION-LEDGER.md, docs/hazama-playtest-slices-v0.md if present.
- Write only playtest synthesis/docs that the user authorizes, normally
  docs/autonomy/SESSION-LEDGER.md and optionally a docs/playtest note.
- Do not tune balance, change route content, edit runtime, add dependencies, or close
  human-gate items without explicit human playtest notes.

Required checks:
- Run git status --short --branch before editing.
- Run node scripts/hazama-check.mjs before final handoff.
- Synthesis must separate observed friction from proposed fixes.
- Cover Omega unlock clarity, Gate Run decision feel, Breath Gate optional feel, and
  A_reborn completion feel.
- Final response must list changed files, checks, and the next recommended balance item.
```

## Gate Run Balance Tuning After Notes

```text
You are working in C:\workspace\github-inventory\side-stack\hazama. The worktree may be
dirty from other agents; do not revert or overwrite changes you did not make.

Task: tune HZ-BL-003 Gate Run balance only if concrete manual playtest notes identify a
specific balance problem.

Scope boundaries:
- Read: AGENTS.md, docs/autonomy/STACK-INDEX.md, docs/autonomy/BACKLOG.md,
  docs/autonomy/SESSION-LEDGER.md, hazama-gate-run.js, scripts/balance-smoke.mjs.
- Write scope is limited to hazama-gate-run.js, scripts/balance-smoke.mjs, and the
  authorized autonomy docs needed for handoff.
- Do not change public routes, storage keys, hazama-depths.json schema, Music payload
  shape, PWA cache/versioning, or unrelated UI copy.
- Do not tune from vibes alone; cite the playtest note that justifies each number change.

Required checks:
- Run git status --short --branch before editing.
- Run node scripts/balance-smoke.mjs after balance edits.
- Run node scripts/hazama-check.mjs before final handoff; require 0 FAIL.
- If browser automation is unavailable, record SKIP as optional and do not treat it as a
  manual browser pass.
- Final response must list changed values, changed files, checks, and residual playtest risk.
```

## Optional Playwright Enablement Review

```text
You are working in C:\workspace\github-inventory\side-stack\hazama. The worktree may be
dirty from other agents; do not revert or overwrite changes you did not make.

Task: review whether optional Playwright browser smoke can be enabled or improved without
making Playwright a required repo dependency.

Scope boundaries:
- Read: AGENTS.md, docs/autonomy/STACK-INDEX.md, docs/autonomy/browser-smoke-fallback.md,
  scripts/browser-first-playable-smoke.mjs, scripts/hazama-check.mjs, package metadata if
  present.
- Prefer docs or smoke-script clarification only. Do not add build steps, GitHub Actions,
  databases, runtime dependencies, or mandatory Playwright installation.
- Keep browser smoke optional: missing Playwright must remain SKIP with exit code 0.
- Do not edit runtime behavior unless the user explicitly expands scope.

Required checks:
- Run git status --short --branch before editing.
- Run node scripts/browser-first-playable-smoke.mjs directly.
- Run node scripts/hazama-check.mjs before final handoff.
- If Playwright is missing, confirm the SKIP wording still points to
  docs/autonomy/browser-smoke-fallback.md.
- Final response must list changed files, whether Playwright was PASS or SKIP, and any
  manual fallback still needed.
```
