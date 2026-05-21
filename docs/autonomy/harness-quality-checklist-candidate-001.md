# Harness Quality Checklist - Candidate 001

Status: candidate-first / review-only / docs-only.

Purpose: make Hazama autonomy runs and first-playable return packets easier to review across Codex, Claude, and human playtest lanes. This checklist is a quality gate for agent work notes; it is not a new runtime, automation, deploy flow, or permission to close human-gated items.

Use this when preparing or reviewing a Hazama agent run, especially after a docs/autonomy task, smoke improvement, first-playable note, PWA install/offline prep, or balance-evaluation handoff.

## 1. Scope And Contract

- Repo root is confirmed as `C:\workspace\hazama`.
- Current branch and worktree state are recorded before editing.
- `AGENTS.md` hard rules are named or explicitly inherited.
- Mode is clear: docs-only, smoke, runtime, balance, verify, or research.
- Allowed write set is listed.
- Forbidden actions are listed.
- The run states whether commit, push, merge, deploy, GitHub Pages settings changes, cron/automation, or cross-repo edits are allowed.
- Existing dirty/untracked files are classified as yours, user/other-agent, or intentionally untouched.

## 2. Required Reads

The run should name the relevant orientation files it actually used:

- `AGENTS.md`
- `docs/autonomy/STACK-INDEX.md`
- `docs/autonomy/AUTONOMOUS-RUN.md`
- `docs/autonomy/BACKLOG.md`
- `docs/autonomy/SESSION-LEDGER.md`
- `docs/autonomy/closeout-checklist.md` when preparing a handoff
- Relevant playtest or PWA docs when touching `HZ-BL-001`, `HZ-BL-002`, or first-playable evidence

For narrow candidate memos, it is acceptable to read only the files needed to support the memo, but the final packet should say that the scope was candidate-first and review-only.

## 3. Human-Gate Handling

- `HZ-BL-001` is not marked done without actual install/offline device evidence.
- `HZ-BL-002` is not marked done without human first-playable taste/play notes.
- Agent/browser/smoke evidence is labeled as support evidence, not human completion.
- Prepared checklists and templates are described as prepared, not verified.
- Remaining human tasks are written as concrete next actions.
- Any balance follow-up for `HZ-BL-003` cites specific playtest friction rather than vibes alone.

## 4. Evidence Shape

A good return packet should include:

- `scope`: what was allowed and intentionally untouched.
- `changed`: exact files changed.
- `why`: one-sentence reason for the change.
- `checks`: exact commands and PASS / FAIL / SKIP.
- `evidence`: route, browser, PWA, doc, or human note supporting the claim.
- `human-gated`: items kept open and why.
- `next`: one concrete next action.
- `blockers`: unresolved device, taste, permission, deploy, or tool limitations.

Avoid raw log dumps unless the user asked for them. Summarize the important lines.

## 5. First-Playable Return Packet Additions

When a run touches first-playable evidence, include:

- Route covered: `A_start -> HUB_NIGHT -> Gate Run -> Ω -> A_reborn -> HUB_NIGHT`, or the exact partial route.
- Whether Music/BGM was unopened, inline, external, stopped, or irrelevant.
- Whether locked Ω was checked before Gate Run victory.
- Whether completion returned to HUB and whether Ω state matched the intended loop behavior.
- Whether mobile-width overflow or touch-target issues were checked.
- Whether the note is an agent/browser pass or a human taste pass.

## 6. PWA / Offline Return Packet Additions

When a run touches install/offline prep or evidence, include:

- Entry path used: `/`, `index.html`, or `hazama-index.html`.
- Install prompt or standalone launch evidence.
- First online visit evidence.
- Offline reload evidence.
- Reset and `A_start -> HUB_NIGHT` evidence after install/offline.
- Service worker/cache version observed when relevant.
- A clear statement if the pass is still human-gated.

## 7. Verification Baseline

Default handoff check:

```bash
node scripts/hazama-check.mjs
```

Also use `git diff --check` for any changed text/code files.

Interpretation:

- `0 FAIL` is required before commit or handoff unless the final response clearly reports the blocker.
- Optional Playwright-backed checks may `SKIP` when Playwright is unavailable.
- A `SKIP` is acceptable only when the rest passes and the run does not claim browser/device completion.
- Docs-only candidate memos do not bump runtime asset versions or PWA cache names.

## 8. Review Questions

Before accepting a candidate note, ask:

- Does this improve future agent or human coordination?
- Does it avoid changing gameplay, PWA runtime behavior, deployment, or Pages settings?
- Does it keep repo artifacts as shared memory instead of relying on chat memory?
- Does it separate prepared work from verified completion?
- Does it leave the next person with a concrete, bounded action?

## Suggested Next Action

If this checklist is accepted, fold it into `docs/autonomy/closeout-checklist.md` or link it from `docs/autonomy/STACK-INDEX.md` as a review aid. Keep that follow-up docs-only and do not close `HZ-BL-001` or `HZ-BL-002` unless human evidence is present.
