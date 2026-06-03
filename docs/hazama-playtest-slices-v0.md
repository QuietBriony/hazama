# Hazama Playtest Slices v0

## Current Goal

Make the v2.42 first playable readable as a small roguelike decision loop:

`A_start -> HUB_NIGHT -> Gate Run -> Ω unlock -> Ω -> A_reborn`

Current master already has:

- Gate Run / Breath Gate mechanics shared through `hazama-gate-run.js`
- Browser runtime follows Breath Gate collapse/timeout targets back through `HUB_NIGHT`
- Gate Run labels `合わせる` readiness as `準備前` or `準備OK`
- Gate Run labels `戻る` readiness as `退避推奨`, `退避任意`, `再挑戦`, or `Ω保持`
- `A_reborn` completion panel links directly back to HUB for the next loop
- Ω entry after Gate Run victory preserves the won run instead of reapplying ordinary depth pressure
- Optional browser smoke covers the DOM loop when Playwright is available
- Balance smoke locks the intended roles for `攻める`, `見る`, `整える`, `合わせる`, and `戻る`
- Roguelike HUD shows floor, turns, calm, sync, gate, risk, depth map, and run log
- Visual layer keeps the descent scene active and reacts to gate pressure, risk, and win/loss state
- Default UI is simplified by removing duplicate gauges and always-on explainer panels
- Initial CTA and Gate Run action buttons now appear before secondary map/log telemetry
- Breath Gate now sits below route/session controls as `休む / 整える`, so it reads as optional rest rather than the main route
- Gate Run now shows explicit `扉が開いた`, `立て直し中`, and `時間切れ` outcome panels
- `A_reborn` completion shows a short run record for turns, route steps, rest count, collapse count, main action, and Ω arrival
- BGM now supports same-screen BGM for smartphone play while preserving `別タブMusic → START.HZM` as an optional companion path
- PWA manifest, icons, service worker, install prompt, and update banner are now present without changing the main loop
- The post-story `展開` panel keeps the first playable guide, next action, operation priority, Gate Run, route choices, Breath Gate, session controls, and BGM in one flow
- `A_reborn -> HUB_NIGHT` closes Ω on the next loop, so replay starts by opening the gate again
- Consistency smoke checks depth graph integrity, first playable route contract, Ω lock/relock markers, and docs/runtime version drift
- Gate Run now shows `今のノリ` pulse cues and an `おすすめ` action badge so the current pressure state reads more like a small decision game
- Hazama-local autonomous development engine now gives Codex / Claude Code the same BACKLOG, SESSION-LEDGER, claim rules, and `node scripts/hazama-check.mjs` entrypoint
- Balance policies in `scripts/balance-smoke.mjs`
- Static route skeleton check in `scripts/first-playable-smoke.mjs`
- GitHub repo scout notes in `docs/research/github-game-repo-scout-v0.md`
- HUD hierarchy polish for Gate Run, story options, session controls, and BGM

## Slice 1: First-Time Route Read

Goal: a fresh player can identify the next useful action without reading README.

Check:

- Fresh load starts at `A_start`.
- `夜のハブへ入る` reads as the main route.
- HUB shows that Ω exists but is not yet available.
- Gate Run panel explains `扉100%でΩ`.
- The depth map shows current position as `@`, future floors as fog, and locked Ω as unavailable.
- The first screen does not feel like several competing dashboards before the player chooses a route.
- `道を選ぶ` does not look like the same control group as Gate Run actions.

Pass signal:

- Player can say "I need to open the gate before Ω" within the first minute.

## Slice 2: Gate Run Decision Feel

Goal: Gate Run feels like a pressure loop, not five equivalent buttons.

Check:

- `攻める` visibly advances the gate but costs calm.
- The HUD top line changes enough that gate pressure and remaining turns feel like a run, not a static menu.
- Background pressure and gate glow change as Gate Run advances or collapses.
- `整える` prepares sync but does not race the gate open alone.
- `合わせる` is understandable as a finisher after setup.
- `戻る` feels like a valid recovery choice when calm is low.
- Collapse returns through HUB and does not feel like a hard end.

Pass signal:

- A balanced route opens Ω in roughly 8-12 meaningful actions.
- A reckless route collapses softly and teaches retreat.

## Slice 3: Breath Gate Boundary

Goal: Breath Gate is useful recovery, not a spam engine.

Check:

- One or two breaths can stabilize the player.
- Repeated breath loses efficiency.
- Repeated breath in the field does not exceed the field stability cap.
- Breath spam does not open Ω.
- The `休む / 整える` panel sits after `道を選ぶ` and session controls, not before the main route.
- Raw input text is not stored or sent to Music.

Pass signal:

- Player understands Breath Gate as "立て直し" rather than required story input.

## Slice 4: Completion Read

Goal: opening Ω and reaching `A_reborn` feels like completing one loop.

Check:

- Once Gate Run is won, the Ω CTA appears clearly.
- `扉が開いた`, `立て直し中`, and `時間切れ` are visually distinct from ordinary log text.
- Retreat after a win preserves Ω unlock.
- `Ω -> A_reborn -> HUB_NIGHT` is available and readable.
- `A_reborn` shows a compact one-loop record before the next-loop CTA.
- `A_reborn` reads as completion feedback, not just another ordinary depth.

Pass signal:

- Player can identify that one loop is complete and choose whether to return to HUB.

## Slice 5: Companion Boundary

Goal: BGM is supportive, never required.

Check:

- Music unopened does not block any Hazama route.
- BGM controls stay visually secondary to Gate Run and story options.
- BGM copy makes it clear that Hazama opens Music in another tab and audio starts after `START.HZM` there.
- `止める` affects follow/control state only, not story progress.
- Music payload contains sanitized profile data only, never raw input.

Pass signal:

- Player can complete the loop with audio unavailable.

## Slice 6: PWA Boundary

Goal: install/offline support feels like a wrapper, not a new game system.

Check:

- Browser sees `manifest.webmanifest`, app icons, and `sw.js`.
- Reload after first visit still reaches `A_start` or saved progress when offline-capable cache is present.
- `アプリ化` appears only when the browser exposes an install prompt.
- `新バージョン利用可能` update banner is secondary and does not cover core controls on mobile.
- Service worker cache names are scoped to Hazama and do not evict Music-stack caches on the same origin.

Pass signal:

- Player can install or reload offline without losing the first playable route.

## Current Automated Coverage

- `node scripts/balance-smoke.mjs`
  - Covers spam, rush, balanced play, late sync, retreat/retry, field Breath cap, won retreat, post-win closed action, and action-role invariants.
- `node scripts/first-playable-smoke.mjs`
  - Covers the static route skeleton and shared-model Ω unlock.
- `node scripts/browser-first-playable-smoke.mjs`
  - Covers the browser DOM loop and PWA shell when optional Playwright is available; skips without adding dependencies when it is not.
- `node scripts/hazama-consistency-smoke.mjs`
  - Covers depth graph integrity, first playable route contract, Ω lock/relock markers, current version alignment, and the next-action guide in the post-story flow.
- `bash scripts/startup-smoke.sh 8765`
  - Covers static serving, asset presence, versioned script loading, PWA manifest/service worker/icons, model/script presence, and key UI strings.
- `node scripts/localstorage-migration-smoke.mjs`
  - Covers old progress fallback, partial run-state normalization, reset recovery, and locked Ω behavior when optional Playwright is available; skips without adding dependencies when it is not.
- `node scripts/hazama-check.mjs`
  - Aggregates the balance, first playable, startup, and optional browser smoke checks as the autonomy engine's single gate.

## Latest Browser Smoke Notes

Checked on a narrow mobile viewport with local static serving:

- `合わせる準備前` appears in the Gate Run mission and sync action before the resonance/gate threshold is ready.
- `合わせる準備OK` appears in the Gate Run mission and sync action once resonance and gate charge meet the threshold.
- `退避推奨`, `退避任意`, `再挑戦`, and `Ω保持` appear in the Gate Run retreat mission state at the expected run states.
- Key Gate Run controls, mission chips, locked Ω choices, and completion text did not horizontally overflow at mobile width.
- Repeated field Breath Gate timeout returned through `HUB_NIGHT`, marked Gate Run as lost, showed the timeout message, and did not store raw input text.
- Locked Ω at `HUB_NIGHT` showed `まだ入れない / 扉の開き 48%` and `扉100%で解放`.
- `A_reborn` showed `一周完了。夜のハブから次の周回へ戻れます。`
- `A_reborn` completion CTA showed `Ω -> A_reborn 到達` and `夜のハブへ戻る / 次の周回へ`.
- Clicking the completion CTA returned to `HUB_NIGHT` while preserving `gateRunStatus: won` and `gateRunCharge: 100`.
- Browser smoke caught an Ω-entry regression where ordinary depth pressure could flip a won Gate Run into `lost`; v2.27 now treats Ω entry as a reward transition and keeps the won state.
- BGM stop did not mutate story progress during browser smoke, and Music posting waits for the expected target origin before sending.
- Browser smoke also covers the won `Ωの扉を試す` story option from a low-stability HUB state.
- Balance smoke now verifies that risky charge, safe observe, preparation, ready/unready sync, low-state retreat, and won retreat keep their intended numeric roles.
- v2.29 visual pass adds `FLOOR / TURN / CALM / SYNC / GATE / RISK`, `DEPTH MAP`, and `RUN LOG` as the first read above the existing Gate Run controls.
- v2.30 visual pass swaps the default images to lightweight WebP, keeps the descent scene behind the run, and removes duplicated always-on HUD panels.
- v2.31 first-action pass shortens the visible title, adds a top-level HUB CTA, puts Gate Run controls before map/log telemetry, and returns transitions to the run panel.
- v2.32 growth-route pass makes Breath Gate optional rest, adds Gate Run outcome feedback, and gives `A_reborn` a compact run record.
- v2.32 in-app browser check covered fresh reset, `夜のハブへ入る`, Gate Run win, `Ω -> A_reborn`, compact run record, collapse/retry feedback, and BGM unopened with no console errors.
- v2.33 BGM handoff pass clarifies `別タブMusic → START.HZM` and keeps the companion secondary to the main loop.
- v2.34 PWA pass adds install/offline shell behavior while keeping route progress and Music handoff unchanged.
- v2.35 first-screen guidance makes the initial `夜のハブへ` action explicit.
- v2.36 story-first loop polish moves controls into a post-story `展開` panel and closes Ω on the next loop.
- v2.37 same-screen BGM lets smartphone play continue without depending on returning from an external Music tab.
- v2.38 consistency polish keeps the next action visible inside `展開` and adds a docs/runtime drift smoke.
- v2.39 playful polish adds Gate Run pulse cues and recommended-action highlights without changing balance numbers.

## Next Manual Pass

Latest agent/in-app browser support note:

- `docs/playtest/first-playable-agent-pass-2026-05-16.md`
- Human playtest template: `docs/playtest/human-playtest-template.md`
- Gate Run balance decision rubric: `docs/playtest/gate-run-balance-decision-rubric.md`

Run a local server and play one loop on desktop and a narrow mobile viewport.

Record:

- where the next goal was unclear
- where the UI felt like too many equal buttons
- whether the map/log makes the loop feel like a small roguelike run
- whether the simplified HUD leaves the next useful action clearer
- whether the image motion feels like gameplay feedback rather than decoration
- whether `合わせる` was used too early
- whether retreat felt useful
- whether `A_reborn` felt like completion
- whether the new run result record makes a second loop tempting
- whether `休む / 整える` feels helpful without becoming the main route
- whether the new `合わせる準備前/準備OK` labels reduce early sync confusion
- whether the `次にやること` guide makes the main action clearer than the secondary Breath Gate/BGM affordances
- whether `今のノリ` and `おすすめ` make Gate Run feel more like a pressure loop without becoming too directive

Only tune numbers after this pass finds a specific confusing or broken moment.
