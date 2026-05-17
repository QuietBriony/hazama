# HZ-BL-003 Gate Run Balance Decision Rubric

Use this after HZ-BL-002 human playtest notes decide whether Gate Run balance tuning is justified.
Prefer no numeric change unless the notes show a repeatable balance problem.

## Tune Only With Concrete Evidence

Tuning is justified when notes identify a specific balance failure and the likely mechanic involved:

- Ω opens too early or too late in a completed run, especially outside the 8-12 meaningful action target.
- A named action loses its intended role: `攻める` is not the risky charge action, `見る` is not safe/slow, `整える` opens the gate too much, or `合わせる` feels useful before readiness.
- Breath Gate feels like a required route step or a repeatable spam engine instead of limited recovery.
- Loss, timeout, retreat, or retry pressure feels unfair, toothless, or unclear after a specific observed sequence.
- Two or more notes from separate runs point at the same numeric problem.
- Smoke policies and human notes disagree in a way that can be explained by deterministic values in `hazama-gate-run.js`.

## Do Not Tune From Weak Evidence

Do not change balance from:

- A single vague complaint such as "felt weird", "too hard", or "too slow" without action sequence, turn count, or route context.
- Confusion caused by copy, visual hierarchy, layout, PWA behavior, Music handoff, or completion messaging.
- Raw Breath Gate text content or interpretation of what the player typed.
- A run where Music/audio/external tabs blocked progress; that is a companion-boundary issue, not balance.
- One unlucky or exploratory route where the player ignored available recovery, sync setup, or retreat.
- Preference for a different game shape that would require new actions, new routes, new storage, or a changed public contract.

Example decision: "Do not tune from a single vague complaint. Ask for one more pass with route, rough turn count, and the action that felt wrong."

## Safe Knobs

If tuning is justified, keep changes narrow and deterministic:

- Numeric constants in `hazama-gate-run.js` for charge gain/loss, calm cost/recovery, resonance gain/spend, readiness thresholds, turn limit, retreat recovery, collapse/timeout recovery, and Breath Gate diminishing returns.
- Policy expectations in `scripts/balance-smoke.mjs` that directly track the same intended rule.
- Documentation notes that explain the changed target.

Prefer one small knob at a time. Preserve the action roles unless the task explicitly scopes a role change.

## Contracts Not To Change

HZ-BL-003 balance tuning must not change:

- Static Web app architecture; no build step, server runtime, database, GitHub Actions, or dependency addition.
- Public route names, the first playable route, storage keys, `hazama-depths.json` schema, or Music payload shape.
- Raw Breath Gate input policy: do not save it, log it, or send it to Music.
- Music optionality: Hazama progress must not depend on Music launch, audio playback, `START.HZM`, or an external tab.
- PWA cache namespace discipline; do not touch same-origin Music caches.
- UI hierarchy, copy, route content, or runtime bridge behavior unless separately scoped.

## Required Checks

Before handing off a balance change:

```bash
node scripts/balance-smoke.mjs
node scripts/first-playable-smoke.mjs
node scripts/hazama-check.mjs
```

If `hazama-check` reports browser smoke as `SKIP` because Playwright is unavailable, that is acceptable. Record the skip plainly.

Manual check, when available:

- Complete `A_start -> HUB_NIGHT -> Gate Run -> Ω -> A_reborn`.
- Confirm a balanced route still opens Ω in roughly 8-12 meaningful actions.
- Confirm Breath Gate helps recovery but does not replace HUB retreat.
- Confirm Music unopened does not block progress.
- Confirm no raw Breath Gate input appears in notes, localStorage, or Music payloads.

## Example Decisions

- Do not tune: "Player said Gate Run felt slow, but gave no route, turns, or action context."
- Do not tune: "Player missed `合わせる準備OK`; this is a readability/copy issue, not numeric evidence."
- Do not tune: "Music did not start; Hazama still progressed, so balance is unrelated."
- Tune cautiously: "Two passes reached Ω in 5-6 meaningful actions through early `合わせる`; raise sync readiness or lower pre-ready sync payoff."
- Tune cautiously: "Three passes used repeated Breath Gate to stay near max calm and still gain gate progress; reduce field recovery or increase diminishing returns."
- Tune cautiously: "Balanced route repeatedly times out at 13-14 actions despite correct setup; adjust charge gain, turn limit, or sync payoff, then update smoke expectations."
- Stop and ask: "Requested fix changes storage, route data, Music payload, or raw input handling."
