# Closeout Checklist — Hazama Agents

Use this before commit, PR, or handoff. Keep the session small and leave the repo easier for the next agent to trust.

## 1. Reconfirm the Contract

- Read `AGENTS.md` and the autonomy entry docs you used: `STACK-INDEX.md`, `AUTONOMOUS-RUN.md`, plus the relevant `BACKLOG.md` / `SESSION-LEDGER.md` entries.
- Stay inside the claimed write scope. Do not edit runtime, scripts, README, backlog, or ledger unless the task explicitly allowed it.
- Run `git status --short --branch` and identify which changes are yours.
- Do not revert, overwrite, reformat, or "clean up" changes made by humans or other agents.

## 2. Check Hazama Integrity

- Run from repo root before commit/PR/handoff when code, tests, smoke scripts, story data, runtime assets, cache/version files, or public behavior changed:

```bash
node scripts/hazama-check.mjs
```

- `0 FAIL` is the commit baseline. If it fails, report the failing check, likely cause, and whether you fixed it.
- Browser confidence comes from a manual or in-app browser pass; add a note to the ledger when the task needed UI confidence.
- Docs-only / autonomy-only edits usually do not require version or PWA cache bumps. Still run `hazama-check` if the handoff expects a verified repo state.

## 3. Guard the Hard Rules

- Keep Hazama static Web first: no build step, server runtime, database, or GitHub Actions.
- Do not change public routes, the storage key (`hazama_spiral_v1`), or the `depths-shell.json` schema without explicit scope.
- Never persist raw player input. Only the aggregated spiral layer (cycle / attunement / traces) may be saved; transients (sink / dread / return paths / observer) stay unsaved.
- Keep audio self-contained (`slice.js` built-in Web Audio): game progress must not depend on audio playback or any external tab/repo.
- Do not add audio files, samples, lyrics, or external dependencies.
- Touch only the `hazama-pwa-` cache namespace.

## 4. Handle Human Gates

- Do not mark `human-gate: yes` work as done by agent verification alone.
- Agent closeout may include implementation, prepared checklist, smoke results, and notes for the human pass.
- Leave PWA install, offline feel, mobile feel, sound feel, and taste calls for a human result unless the user explicitly supplies that result.

## 5. Final Handoff

Include only the useful closeout facts:

- Changed files you touched.
- What changed and why, in one or two sentences.
- Verification run, including exact command and result, or why it was not run.
- Any optional `SKIP` results and the fallback/manual note if relevant.
- Remaining blockers, human-gate items, or follow-up risks.
- No unattended merge, push, release, or PR action unless the user explicitly asked for it.

For autonomy or first-playable handoffs, also review
[harness-quality-checklist-candidate-001.md](harness-quality-checklist-candidate-001.md)
while it remains candidate status. It helps shape the return packet, but it does
not replace human evidence for `HZ-BL-001` or `HZ-BL-002`.
