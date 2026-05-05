# Hazama Game Development Plan

## Current playable loop summary

Hazama v2.23 is a browser-based static first playable slice that loads `hazama-depths.json` from `index.html` / `hazama-index.html` and renders a text-first depth navigator. The current loop starts at `A_start`, lets the player enter `HUB_NIGHT` or move into the depth chain, and keeps persistent local run state for progress, seed, stability, resonance, marks, best depth, Gate Run progress, and Breath Gate streak counters.

The playable systems already present are:

- Story navigation through depth options, including return paths to `HUB_NIGHT`.
- Gate Intelligence feedback for current objective, risk, route, and gate pressure.
- Gate Run actions: `さらに奥へ進む`, `周囲をよく見る`, `呼吸を整える`, `扉に合わせる`, and `夜のハブへ戻る`.
- Optional Breath Gate beat through the existing `ひと息置く` input, which restores resources and may add resonance or marks.
- Ω locking through `canEnterOmega()`, requiring `gateRunStatus === "won"` before Ω entry.
- Completion path from `Ω` to `A_reborn`, then back to `HUB_NIGHT`.
- Reset flow that clears seed, progress, and run state.
- BGM companion integration that sends Music profile payloads while keeping Music as background support only.
- Shared dependency-free Gate Run model in `hazama-gate-run.js`, used by both the browser runtime and `scripts/balance-smoke.mjs`.
- First playable route smoke in `scripts/first-playable-smoke.mjs`, covering the static loop skeleton and shared-model Ω unlock.
- Breath Gate collapse/timeout targets from the shared model are followed by the browser runtime, so Breath spam failure returns through `HUB_NIGHT`.

The current app is already close to a first playable. The main gap is clarity: players can move, breathe, charge the gate, unlock Ω, and reach `A_reborn`, but the intended route and the relationship between story choices, Gate Run actions, Breath Gate, and Ω unlock need to be easier to read at a glance.

## First playable loop definition

Target vertical slice:

`A_start -> HUB -> Gate Run -> Breath Gate -> Ω unlock -> Ω -> A_reborn`

Loop intent by the OpenAI Codex game development structure:

1. Build the first playable loop
   - Treat `A_start` as onboarding, `HUB_NIGHT` as the run launcher, Gate Run as the primary playable challenge, Breath Gate as the existing recovery/resource action, Ω unlock as the win condition, `Ω` as the run climax, and `A_reborn` as completion feedback.
   - Keep the loop static-host compatible: no server, no build step, no new dependencies, no new audio, no GitHub Actions.
   - Preserve existing story text. Any future text changes should be limited to tiny UI-facing labels or helper copy.

2. Tune UI and controls
   - Make the intended route visible without replacing the story: current step, next goal, and locked/unlocked Ω state.
   - Keep story choices, Gate Run actions, Breath Gate, and session controls visually distinct.
   - Ensure mobile players can see why Ω is locked and what action advances it.

3. Tackle hard game logic
   - Evaluate Gate Run charge, win/loss, retreat, turn limit, and Breath Gate recovery as one loop rather than isolated buttons.
   - Keep deterministic local state and avoid saving raw player input.

4. Triage bugs from real signals
   - Use browser behavior, console output, localStorage state, smoke checks, and manual mobile/touch passes as the source of truth.

5. Review before merge
   - Review each PR against the vertical slice, static hosting constraints, Music boundary, and story preservation rules.

Breath Gate means the existing `ひと息置く` mechanic. It is not a new node in `hazama-depths.json`; it is the recovery/resource beat that helps the player stabilize before pushing Gate Run or Ω unlock.

## Self-driving goal ladder

The top-level goal is not to add more systems. The top-level goal is to make the existing first playable readable enough that a new player can complete one intended loop without outside explanation.

- North Star: a first-time player can understand the one-loop intent without audio or external docs, and can reach `A_reborn` in roughly 5-8 minutes.
- Next merge goal: make the PR1 signposting polish merge-ready by keeping the current UI additions focused on route clarity, Ω lock clarity, Breath Gate framing, and Gate Run action roles.
- Next playtest goal: verify Gate Run works as a small decision game built around attacking, stabilizing, and syncing rather than as five equivalent buttons.
- v2.21 goal: keep Hazama first playable while making Gate Run and Breath Gate balance resistant to simple recovery/sync spam.

Done means the player can answer these questions from the screen itself:

- Where am I in the first playable loop?
- What am I trying to open?
- Why is Ω locked or unlocked?
- When should I use Breath Gate?
- What does a completed run look like?

## UI/control issues to polish

- Route clarity: the app should plainly communicate that the first playable target is `A_start -> HUB -> Gate Run -> Breath Gate -> Ω unlock -> Ω -> A_reborn`.
- Ω lock guidance: locked Ω choices already show `まだ入れない / 扉の開き X%`, but this needs to remain visible and understandable on small screens and touch devices.
- Control hierarchy: story choices, Gate Run actions, Breath Gate input, `停止`, `1ステップ戻る`, hub return, reset, and BGM controls should not compete for the same visual priority.
- Gate Run readability: the player should be able to tell which action is risky, which action recovers, and which action is the likely finisher.
- Breath Gate framing: `ひと息置く` should read as an optional recovery/resource action, not as a required text-entry gate.
- Win/loss feedback: `扉が開いた` and `立て直し中` should be unmistakable, with the next useful action obvious.
- BGM companion: keep Music/BGM as background companion only. Do not make Music a primary route, required action, or source of player progression.

## Gate Run logic issues to evaluate

- Dual charging: normal depth movement and Gate Run actions both change `gateRunCharge`; verify this feels intentional and does not unlock Ω too early or too confusingly.
- `sync` readiness: `扉に合わせる` becomes strong with enough resonance, marks, or high gate charge; verify players can understand how to prepare it.
- Turn limit: `GATE_RUN_TURN_LIMIT` is 14; test whether this creates pressure without making safe HUB retreat feel punitive.
- Retreat/reset behavior: `夜のハブへ戻る` recovers and may reset completed/lost Gate Run state; verify this does not erase progress in a surprising way.
- Loss recovery: stability collapse and turn timeout move the player to `HUB_NIGHT` / `A_start` and cap charge; verify recovery feels like a retry loop, not a hard failure.
- Ω redirect: attempting Ω before unlock redirects toward the hub/start path; verify the message persists long enough to teach the lock.
- Actual charge vs GI pressure: Gate Intelligence may display derived gate pressure above stored `gateRunCharge`; verify labels distinguish objective pressure from the actual unlock requirement.
- Determinism: keep the seeded bonus behavior predictable within a run and avoid non-deterministic balance surprises.

## Bug triage checklist

- Startup smoke passes for `/`, `/hazama-index.html`, `hazama-main.js`, `hazama-style.css`, `hazama-depths.json`, and both image assets.
- Browser console has no startup errors, JSON load failures, missing asset errors, or unhandled Music `postMessage` issues.
- Fresh localStorage starts at `A_start` and can reach `HUB_NIGHT`.
- Existing localStorage from older v2 state normalizes safely.
- Reset clears seed, progress, and run state, then returns to `A_start`.
- Gate Run can reach `扉が開いた` and then allows Ω.
- Locked Ω stays blocked before `扉が開いた`.
- `Ω -> A_reborn -> HUB_NIGHT` works without losing static routing.
- Breath Gate updates stability/resonance without saving raw input text.
- Mobile/touch layout keeps story, Gate Run, lock guidance, and controls readable without overlap.
- Reduced-motion mode avoids required animation cues.
- Music unavailable or unopened does not block Hazama progression.
- BGM stop/follow controls do not mutate Hazama story progress.

## First playable test scenarios

- Fresh start: reset state, load `/`, confirm `A_start` makes `HUB_NIGHT` feel like the next natural step.
- Locked Ω: from `HUB_NIGHT`, choose `Ωの扉を試す` before the gate is won and confirm the screen explains why Ω is unavailable.
- Gate Run purpose: use the Gate Run panel and confirm `攻める / 見る / 整える / 合わせる / 戻る` read as distinct decisions.
- Breath Gate purpose: submit a short `ひと息置く` response and confirm it feels like optional recovery/preparation, not required story input.
- Unlock and completion: reach `扉が開いた`, enter `Ω`, then choose `新しい入口へ戻る` and confirm `A_reborn` feels like loop completion.
- Static regression: run `bash scripts/startup-smoke.sh 8765` and confirm no dependency, build, audio, Music repo, or GitHub Actions changes are needed.
- Route skeleton regression: run `node scripts/first-playable-smoke.mjs` and confirm `A_start -> HUB_NIGHT -> Gate Run won -> Ω -> A_reborn -> HUB_NIGHT`.

## PR review checklist

- Keeps Hazama browser-based and static.
- Adds no dependencies, no audio files, and no GitHub Actions.
- Does not change the Music repo or require Music changes for Hazama progression.
- Preserves existing story text except tiny UI-facing copy when absolutely necessary.
- Keeps Music/BGM as background companion only.
- Does not alter public routes, storage keys, JSON schema, or Music payload shape unless the PR explicitly scopes and documents that change.
- Keeps raw player input out of persistent state and Music payloads.
- Verifies `index.html` and `hazama-index.html` stay aligned.
- Runs `bash scripts/startup-smoke.sh 8765` before merge.
- Includes manual browser notes for the first playable loop, especially mobile/touch and locked/unlocked Ω.

## Recommended next 3 PRs

1. Research scout review
   - Review `docs/research/github-game-repo-scout-v0.md` and decide whether any reference repo deserves a focused follow-up spike.
   - Keep the default decision as reference-only. No dependency should be added without a separate architecture PR.
   - Acceptance: each candidate has a license-safe decision and a clear Hazama area.

2. Gate Run balance/evaluation pass
   - Tune only existing deterministic values in the shared Gate Run model after manual playthrough notes.
   - Focus on turns to 100%, Breath Gate usefulness, `扉に合わせる` payoff, loss recovery, and retry pressure.
   - Acceptance: `scripts/balance-smoke.mjs` and manual play agree on the same rules because both use `hazama-gate-run.js`.

3. Real-signal bug triage and review hardening
   - Fix bugs found from console output, mobile/touch play, localStorage edge cases, static asset loading, and smoke checks.
   - Extend the local smoke script only if it catches first-playable regressions and still requires no GitHub Actions.
   - Acceptance: startup smoke passes, the first playable loop completes in-browser, Music absence is harmless, and only intended files change.
