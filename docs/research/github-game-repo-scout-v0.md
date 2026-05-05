# GitHub Game Repo Scout v0

Checked: 2026-05-05 JST. Scope: public GitHub repositories that can improve Hazama without replacing Hazama, copying code, adding dependencies, adding audio, or adding GitHub Actions.

## Decision summary

Hazama should stay a static, dependency-free browser app. The useful pattern is not "adopt an engine"; it is "borrow design pressure" from narrative engines, state-machine libraries, turn-based engines, and HUD examples, then rewrite the tiny parts Hazama needs.

Immediate decisions:

- Keep `hazama-depths.json` as the story source for now.
- Keep Gate Run/Breath Gate in Hazama-owned logic, now shared through `hazama-gate-run.js`.
- Use external repos as reference only unless a later PR explicitly accepts dependency cost and license obligations.
- Reject GPL/AGPL/unclear/no-license code reuse. Reading for ideas is okay; copying is not.

## Candidate table

| Repo | License | Active | Complexity | Use for Hazama | Decision | Affected Hazama areas |
| --- | --- | --- | --- | --- | --- | --- |
| [y-lohse/inkjs](https://github.com/y-lohse/inkjs) | MIT | active, pushed 2026-05-01 | TypeScript/npm narrative runtime | Variable/choice/state handling, story continuation model | Reference now; possible library only after a separate architecture decision | `hazama-depths.json`, `renderOptions`, save/resume docs |
| [inkle/ink-library](https://github.com/inkle/ink-library) | MIT | active, updated 2026-04-27 in search results | Examples/tools collection | How Ink projects document branches and samples | Reference | docs, narrative planning |
| [videlais/snowman](https://github.com/videlais/snowman) | MIT | active, pushed 2026-05-04 | Twine story format with JS/CSS expectations | Link-like story flow, small story-format UI conventions | Reference; do not migrate to Twine | `hazama-depths.json`, `hazama-style.css`, option rendering |
| [lunafromthemoon/RenJS-V2](https://github.com/lunafromthemoon/RenJS-V2) | CC-BY-SA-4.0 | active-ish, pushed 2025-05-30 | TypeScript plus VN/rendering stack | Scene transition and visual-novel staging ideas | Reference only; reject code/library because license and size do not fit | UI docs, visual pacing notes |
| [okaybenji/text-engine](https://github.com/okaybenji/text-engine) | GPL-3.0 | active-ish, pushed 2025-06-14 | Browser text adventure engine | Browser text-game structure, command/state loops | Reference only; reject code reuse due GPL | `hazama-main.js`, input/reply flow docs |
| [jakesgordon/javascript-state-machine](https://github.com/jakesgordon/javascript-state-machine) | MIT | active-ish, pushed 2025-06-01 | Small JS FSM library | Naming and transition boundaries for run states | Reference; no dependency needed | `hazama-gate-run.js`, `scripts/balance-smoke.mjs` |
| [statelyai/xstate](https://github.com/statelyai/xstate) | MIT | active, pushed 2026-05-04 | Large TypeScript statechart/actor ecosystem | Statechart vocabulary for diagrams and edge cases | Reference only; reject dependency for Hazama v2 | docs, future state diagrams |
| [boardgameio/boardgame.io](https://github.com/boardgameio/boardgame.io) | MIT | active-ish, pushed 2025-04-18 | Turn-based game engine, TS/React/networking | Reducer-like moves, turn limits, bot/random playtest thinking | Reference only; too large as runtime | `hazama-gate-run.js`, `scripts/balance-smoke.mjs` |
| [reduxjs/redux](https://github.com/reduxjs/redux) | MIT | active, pushed 2026-05-01 | Predictable global state management | Pure reducer discipline and testable state transitions | Reference pattern; no dependency | `hazama-gate-run.js`, tests/docs |
| [phaserjs/phaser](https://github.com/phaserjs/phaser) | MIT | active, pushed 2026-04-30 | Full 2D game framework | HUD/game-loop vocabulary, not Hazama core | Reject runtime; reference UI/game-loop docs only | `hazama-style.css`, future visual experiments |
| [end3r/Gamedev-Canvas-workshop](https://github.com/end3r/Gamedev-Canvas-workshop) | Other | stale-ish, pushed 2022-06-09 | Pure JS/HTML tutorial | Small static-game teaching structure | Reference only; reject code reuse because license is not clean | docs, lightweight smoke ideas |

## Scoring notes

Highest fit:

- `jakesgordon/javascript-state-machine`, `reduxjs/redux`, and `boardgameio/boardgame.io` are most useful for Gate Run because they reinforce explicit state transitions without forcing Hazama into a framework.
- `inkjs` and `snowman` are best for narrative design reference, but adopting them would change authoring flow and should wait.
- `okaybenji/text-engine` is conceptually close to a browser text game, but GPL makes it reference-only.

Lowest fit:

- RenJS and Phaser are strong engines for other games, but they are too large for Hazama's current text/depth/breath core.
- Anything with no license, GPL/AGPL, or unclear "Other" licensing should not be copied into Hazama.

## Follow-up work

- Keep `scripts/balance-smoke.mjs` as the first balance harness instead of adopting a test framework.
- Add future policies only when they express a real player pattern: cautious retreat, late sync, high-risk sprint, random legal action.
- If narrative authoring becomes the bottleneck, do a separate Ink/Twine spike in docs only before adding any runtime dependency.
