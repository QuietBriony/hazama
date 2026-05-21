# Code as Agent Harness for Hazama - Candidate 001

Status: candidate-first / review-only / architecture framing.

Scope: docs-only memo for mapping "Code as Agent Harness" into Hazama's existing autonomy, PWA, and first-playable workflow. This memo does not propose gameplay code changes, PWA runtime changes, deploys, GitHub Pages setting changes, recurring automations, or closure of human-gated items.

## Source Posture

arXiv:2605.18747, "Code as Agent Harness", should be treated as research / survey / architecture framing, not an implementation spec. For Hazama, the useful part is the vocabulary: code and repo artifacts can act as the inspectable harness around agent work, rather than only as generated output.

This candidate therefore maps the paper's three-layer frame onto artifacts Hazama already has. It does not introduce a new framework, runtime, dependency, scheduler, or autonomous agent process.

Reference: https://arxiv.org/abs/2605.18747

## Hazama Mapping

### Harness Interface

In Hazama, the harness interface is the set of repo artifacts that make agent work legible before any tool runs:

- `AGENTS.md`: repo operating contract, hard rules, integrity gate, and branch/PR convention.
- `docs/autonomy/STACK-INDEX.md`: current structure map for app shell, runtime, game model, story data, docs, and playtest notes.
- `docs/autonomy/AUTONOMOUS-RUN.md`: session workflow from orientation through verification and closeout.
- PWA/static contract docs and smoke coverage: README PWA sections, `sw.js` version discipline, startup smoke, and pwa-static-contract smoke.
- Playtest/result templates: PWA install/offline checklist and result template, human playtest template, first-playable notes.
- Backlog IDs such as `HZ-BL-001`, `HZ-BL-002`, and `HZ-BL-003`: bounded work units with human-gate semantics.
- Smoke scripts: `node scripts/hazama-check.mjs`, balance smoke, first-playable smoke, startup smoke, localStorage migration smoke, and optional browser smoke.

The interface is not a chat transcript. It is the checked-in contract that tells Codex, Claude, and humans what is safe to touch, what must remain static, and what evidence is required.

### Harness Mechanisms

Hazama's harness mechanisms are the repeatable controls that make an agent run auditable:

- `hazama-check`: the single verification entrance, aggregating model, first-playable, static/PWA, startup, and optional browser checks.
- Autonomy checklists: `AUTONOMOUS-RUN.md`, closeout checklist, browser smoke fallback, and next-agent prompts.
- First-playable notes: agent/browser passes record route evidence without pretending to be human taste judgment.
- Install/offline checklist: PWA install and offline reload remain explicit device checks rather than inferred success.
- Human-gated backlog: `HZ-BL-001` and `HZ-BL-002` stay open until a human supplies device/playtest evidence.
- Session ledger: append-only run summaries preserve what changed, what passed, what skipped, and what remains blocked.

The main mechanism to strengthen is not "more automation." It is better evidence shape: every run should leave a small return packet that another agent or human can verify from repo state.

### Scaling The Harness

This section maps scaling the harness to Hazama's existing multi-lane coordination.

Scaling the harness for Hazama means coordinating Codex, Claude, and human playtest lanes through repo artifacts, not chat memory:

- Codex lane: narrow runtime fixes, smoke reinforcement, balance model checks, localStorage/browser regression reproduction.
- Claude lane: UX synthesis, playtest-note integration, backlog grooming, task decomposition, and documentation.
- Human lane: real-device PWA install/offline, mobile feel, BGM feel, first-playable taste, and replay motivation.

Shared state should live in `AGENTS.md`, `docs/autonomy/`, `docs/playtest/`, `BACKLOG.md`, `SESSION-LEDGER.md`, and smoke output summaries. Chat memory may help orientation, but it should not be the durable source of truth.

## What To Adopt Now

- Better task briefs for Hazama agent runs: each prompt should state root, mode, allowed write set, forbidden changes, required reads, validation commands, and whether human-gated items can be closed.
- Better return packets / playtest notes: each run should report changed files, evidence gathered, PASS/FAIL/SKIP, observed friction, proposed follow-up, and explicit blockers.
- Explicit distinction between prepared checklist and human-verified completion: a ready checklist is not a completed `HZ-BL-001` or `HZ-BL-002`.
- Repo-state as shared memory: use checked-in docs, backlog IDs, ledger entries, and smoke scripts as the coordination layer across Codex, Claude, and humans.

## What To Defer

- Gameplay code changes.
- PWA behavior changes.
- Deploy.
- Autonomous runtime.
- Cron / recurring automation.
- Closing `HZ-BL-001` or `HZ-BL-002` without human evidence.

## Candidate Brief Pattern

Future Hazama agent prompts should prefer this shape:

```text
Repo:
Branch:
Mode:
Goal:
Allowed write set:
Forbidden changes:
Read first:
Validation:
Human-gate rule:
Stop condition:
Return packet:
```

This pattern keeps the harness interface explicit and reduces hidden assumptions between agents.

## Candidate Return Packet Pattern

Future Hazama run summaries should include:

- `scope`: what was allowed and what was intentionally untouched.
- `changed`: files and behavior/docs changed.
- `checks`: exact commands and PASS / FAIL / SKIP.
- `evidence`: route, PWA, browser, or human notes that justify the claim.
- `human-gated`: items prepared but not closed.
- `next`: one concrete next action.
- `blockers`: unresolved device, taste, deploy, or permission requirements.

## Suggested Next Action

Create a Hazama harness-quality checklist for autonomy runs and first-playable return packets. It should live under `docs/autonomy/`, stay docs-only, and check whether each run has clear scope, allowed writes, forbidden actions, validation, human-gate status, and a small return packet.
