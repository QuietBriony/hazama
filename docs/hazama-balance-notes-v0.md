# Hazama Balance Notes v0

## Current resource roles

- `落ち着き`: collapse resistance. It is spent by pressure, risky routes, and `攻める`.
- `響き`: sync resource. It prepares `扉に合わせる` and is consumed by successful sync.
- `扉の開き`: Ω unlock progress. It must reach 100% before Ω becomes available.
- `HUB`: safe retreat and reset point. It restores posture but gives up some gate progress.
- `Breath Gate`: limited in-place recovery. It can stabilize a run but should not replace HUB.

## Observed exploits

- Repeating `ひと息置く` could over-recover both `落ち着き` and `響き`.
- `落ち着き` stayed near 100 too easily outside HUB.
- `整える` gave too much gate charge for a preparation action.
- `扉に合わせる` opened the gate too quickly once it became ready.
- Breath Gate working equally well everywhere made HUB retreat less meaningful.
- Story choices and Gate Run actions were close enough in presentation that their roles blurred.

## Target balance

- Breath spam should stabilize the player briefly, then lose efficiency and push the gate backward.
- `攻める` should be the main gate-charge action and should carry a real collapse cost.
- `見る` should be safe, slow information/probing.
- `整える` should mostly prepare `響き` and `落ち着き`, not open the gate.
- `合わせる` should require readiness, consume `響き`, and act as a finisher rather than a shortcut.
- HUB return should be a good move when `落ち着き` is low, even though it costs some gate progress.
- A reasonable mixed strategy should open Ω in about 8-12 meaningful actions.

## v2.22 model boundary

- Gate Run and Breath Gate numeric mechanics live in `hazama-gate-run.js`.
- Browser UI code supplies context such as current depth, rank, risk, seed, and HUB availability.
- `scripts/balance-smoke.mjs` imports the same model instead of duplicating the balance rules.
- UI labels, Music bridge, localStorage, and raw input handling remain outside the shared model.

## Acceptance tests

- `breath-spam` does not unlock Ω.
- `sync-rush` does not unlock Ω in fewer than 8 actions.
- `late-sync` still needs a setup window before opening Ω.
- `balanced` unlocks Ω in 8-12 meaningful actions.
- `aggressive` can collapse softly and return to retry instead of hard-ending.
- `retreat-retry` demonstrates that collapse recovery returns through HUB without a hard dead end.
- `safe` should remain stable but not outperform the mixed strategy.
- Repeated field Breath Gate stays under the field stability cap and pushes gate charge backward.
- Retreat after a won Gate Run returns to HUB without relocking Ω.
- Gate actions that are closed after a win do not mutate the shared model.
- Raw Breath Gate input is not saved to localStorage or Music payloads.
