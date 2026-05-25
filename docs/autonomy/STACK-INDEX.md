# Stack Index — Hazama

Hazama を触る agent が最初に読む構造マップ。
作業フローは [AUTONOMOUS-RUN.md](AUTONOMOUS-RUN.md)、待ち行列は
[BACKLOG.md](BACKLOG.md)。

## Repo

ローカル配置: `C:\workspace\hazama`

| area | role | key files | check |
|---|---|---|---|
| app shell | static entry / PWA install / offline wrapper | `index.html`, `hazama-index.html`, `manifest.webmanifest`, `sw.js`, `icons/` | `bash scripts/startup-smoke.sh <port>` |
| runtime | UI render, story navigation, local state, Music bridge | `hazama-main.js`, `hazama-style.css`, `hazama-seed.js`, `hazama-state.js` | `node scripts/browser-first-playable-smoke.mjs` when Playwright exists |
| game model | dependency-free Gate Run / Breath Gate rules | `hazama-gate-run.js` | `node scripts/balance-smoke.mjs` |
| story data | depth graph and route text | `hazama-depths.json` | `node scripts/first-playable-smoke.mjs` |
| consistency | depth graph, route contract, version drift, next-action guide | `hazama-depths.json`, `hazama-main.js`, docs, smoke scripts | `node scripts/hazama-consistency-smoke.mjs` |
| docs | playtest plan, balance notes, research, autonomy engine | `docs/` | review + `node scripts/hazama-check.mjs` |
| playtest notes | agent/human passes and synthesis | `docs/playtest/` | review + relevant smoke |

## Current First Playable

Target loop:

`A_start -> HUB_NIGHT -> Gate Run -> Ω unlock -> Ω -> A_reborn -> HUB_NIGHT`

Hard boundaries:

- static host compatible
- no build step
- no new dependencies
- no audio files
- no raw player input persistence
- Music/BGM remains optional companion

## Coordination

Hazama talks to `QuietBriony/Music` only through sanitized metadata payloads:

- `type: "hazama-profile"`
- `version: 1`
- `provider: "music"`
- `profile` with normalized source / ucm / audio / patterns

Do not copy Music runtime code, samples, lyrics, or audio into this repo.

## Checks

Single entrance:

```bash
node scripts/hazama-check.mjs
```

It aggregates:

- `node scripts/balance-smoke.mjs`
- `node scripts/first-playable-smoke.mjs`
- `node scripts/pwa-static-contract-smoke.mjs`
- `node scripts/hazama-consistency-smoke.mjs`
- `bash scripts/startup-smoke.sh <free-port>`
- `node scripts/localstorage-migration-smoke.mjs`
- `node scripts/browser-first-playable-smoke.mjs`

The two browser-backed smokes may skip if optional Playwright is unavailable.
When they skip, use [browser-smoke-fallback.md](browser-smoke-fallback.md) for
the in-app browser/manual fallback checklist.

Human-gated PWA install/offline passes use
[pwa-install-offline-checklist.md](pwa-install-offline-checklist.md).
Record the result with [pwa-install-offline-result-template.md](pwa-install-offline-result-template.md).
Human first playable taste passes can use `docs/playtest/human-playtest-template.md`.
Balance tuning decisions can use `docs/playtest/gate-run-balance-decision-rubric.md`.
Agent return packets and autonomy run reviews can use
[harness-quality-checklist-candidate-001.md](harness-quality-checklist-candidate-001.md)
as a candidate quality gate. It is a handoff aid, not permission to close
human-gated work.
