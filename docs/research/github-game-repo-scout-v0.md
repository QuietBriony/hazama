# GitHub Game Repo Scout v0

Checked: 2026-05-05 JST. Scope: public GitHub repositories that can improve Hazama without replacing Hazama, copying code, adding dependencies, adding audio, or adding GitHub Actions.

## Decision summary

Hazama should stay a static, dependency-free browser app. The useful pattern is not "adopt an engine"; it is "borrow design pressure" from narrative engines, state-machine libraries, turn-based engines, and HUD examples, then rewrite the tiny parts Hazama needs.

Immediate decisions:

- Keep `hazama-depths.json` as the story source for now.
- Keep Gate Run/Breath Gate in Hazama-owned logic, now shared through `hazama-gate-run.js`.
- Use external repos as reference only unless a later PR explicitly accepts dependency cost and license obligations.
- Reject GPL/AGPL/unclear/no-license code reuse. Reading for ideas is okay; copying is not.

## HZ-BL-005 decision pass

Default posture: adopt no dependency and copy no code. "Adopt candidate" below means Hazama can adopt the pattern in Hazama-owned code or docs after a focused change; it does not approve vendoring, package installs, assets, samples, or runtime integration.

| Repo | Classification | Hazama area | Rationale |
| --- | --- | --- | --- |
| [y-lohse/inkjs](https://github.com/y-lohse/inkjs) | Reference-only | `hazama-depths.json`, choice continuation, save/resume notes | Useful vocabulary for variables and continuation, but adopting Ink would change authoring and runtime shape. Keep as a future docs spike only. |
| [inkle/ink-library](https://github.com/inkle/ink-library) | Reference-only | Narrative planning docs | Good example corpus for branch documentation and sample structure. No direct app harvest needed. |
| [videlais/snowman](https://github.com/videlais/snowman) | Reference-only | Option rendering, story-flow conventions, CSS feel | Helpful for small link-like passage flow ideas, but Twine migration and JS/CSS assumptions do not fit Hazama now. |
| [lunafromthemoon/RenJS-V2](https://github.com/lunafromthemoon/RenJS-V2) | No-harvest | Visual pacing notes only | CC-BY-SA plus VN/rendering-stack size make code, asset, and dependency reuse a poor fit. At most, use broad staging observations in docs. |
| [okaybenji/text-engine](https://github.com/okaybenji/text-engine) | No-harvest | Input/reply loop concepts only | Conceptually close to browser text play, but GPL-3.0 blocks code reuse for Hazama's current posture. |
| [jakesgordon/javascript-state-machine](https://github.com/jakesgordon/javascript-state-machine) | Adopt candidate | `hazama-gate-run.js`, run-state naming, transition tests | Small MIT FSM library is a strong reference for explicit transition boundaries. Adopt the state vocabulary/pattern in local code, not the package. |
| [statelyai/xstate](https://github.com/statelyai/xstate) | Reference-only | Future state diagrams, edge-case docs | Excellent statechart language, but the actor/TypeScript ecosystem is too large for the static first playable. |
| [boardgameio/boardgame.io](https://github.com/boardgameio/boardgame.io) | Adopt candidate | Gate Run move model, balance smoke policies | Reducer-like moves, turn limits, and legal-action simulation map well to balance checks. Adopt the model ideas only. |
| [reduxjs/redux](https://github.com/reduxjs/redux) | Adopt candidate | Pure run reducers, testable state transitions | Pure reducer discipline is a good fit for Hazama-owned logic and smoke tests. No global-state dependency needed. |
| [phaserjs/phaser](https://github.com/phaserjs/phaser) | No-harvest | HUD vocabulary and future visual experiments only | Full game framework is far beyond Hazama's text/depth/breath core. Do not import runtime or examples. |
| [end3r/Gamedev-Canvas-workshop](https://github.com/end3r/Gamedev-Canvas-workshop) | No-harvest | Lightweight smoke/test teaching ideas only | Static tutorial shape is relevant, but licensing is not clean enough for code reuse. |

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
