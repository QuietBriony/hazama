# Hazama Playtest Slices v0

## Current Goal

Make the v2.24 first playable readable as a small decision loop:

`A_start -> HUB_NIGHT -> Gate Run -> Breath Gate -> Ω unlock -> Ω -> A_reborn`

Current master already has:

- Gate Run / Breath Gate mechanics shared through `hazama-gate-run.js`
- Browser runtime follows Breath Gate collapse/timeout targets back through `HUB_NIGHT`
- Gate Run labels `合わせる` readiness as `準備前` or `準備OK`
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
- `道を選ぶ` does not look like the same control group as Gate Run actions.

Pass signal:

- Player can say "I need to open the gate before Ω" within the first minute.

## Slice 2: Gate Run Decision Feel

Goal: Gate Run feels like a pressure loop, not five equivalent buttons.

Check:

- `攻める` visibly advances the gate but costs calm.
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
- Raw input text is not stored or sent to Music.

Pass signal:

- Player understands Breath Gate as "立て直し" rather than required story input.

## Slice 4: Completion Read

Goal: opening Ω and reaching `A_reborn` feels like completing one loop.

Check:

- Once Gate Run is won, the Ω CTA appears clearly.
- Retreat after a win preserves Ω unlock.
- `Ω -> A_reborn -> HUB_NIGHT` is available and readable.
- `A_reborn` reads as completion feedback, not just another ordinary depth.

Pass signal:

- Player can identify that one loop is complete and choose whether to return to HUB.

## Slice 5: Companion Boundary

Goal: BGM is supportive, never required.

Check:

- Music unopened does not block any Hazama route.
- BGM controls stay visually secondary to Gate Run and story options.
- `止める` affects follow/control state only, not story progress.
- Music payload contains sanitized profile data only, never raw input.

Pass signal:

- Player can complete the loop with audio unavailable.

## Current Automated Coverage

- `node scripts/balance-smoke.mjs`
  - Covers spam, rush, balanced play, late sync, retreat/retry, field Breath cap, won retreat, and post-win closed action.
- `node scripts/first-playable-smoke.mjs`
  - Covers the static route skeleton and shared-model Ω unlock.
- `bash scripts/startup-smoke.sh 8765`
  - Covers static serving, asset presence, versioned script loading, model/script presence, and key UI strings.

## Latest Browser Smoke Notes

Checked on a narrow mobile viewport with local static serving:

- `合わせる準備前` appears in the Gate Run mission and sync action before the resonance/gate threshold is ready.
- `合わせる準備OK` appears in the Gate Run mission and sync action once resonance and gate charge meet the threshold.
- Key Gate Run controls, mission chips, locked Ω choices, and completion text did not horizontally overflow at mobile width.
- Repeated field Breath Gate timeout returned through `HUB_NIGHT`, marked Gate Run as lost, showed the timeout message, and did not store raw input text.
- Locked Ω at `HUB_NIGHT` showed `まだ入れない / 扉の開き 48%` and `扉100%で解放`.
- `A_reborn` showed `一周完了。夜のハブから次の周回へ戻れます。`

## Next Manual Pass

Run a local server and play one loop on desktop and a narrow mobile viewport.

Record:

- where the next goal was unclear
- where the UI felt like too many equal buttons
- whether `合わせる` was used too early
- whether retreat felt useful
- whether `A_reborn` felt like completion
- whether the new `合わせる準備前/準備OK` labels reduce early sync confusion

Only tune numbers after this pass finds a specific confusing or broken moment.
