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
