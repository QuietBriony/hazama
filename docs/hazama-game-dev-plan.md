# Hazama Game Development Plan

## Current playable loop summary

Hazama v2.40 is a browser-based static first playable slice that loads `hazama-depths.json` from `index.html` / `hazama-index.html` and renders a text-first depth navigator with a simplified roguelike-style run HUD. The current loop starts at `A_start`, lets the player enter `HUB_NIGHT` or move into the depth chain, and keeps persistent local run state for progress, seed, stability, resonance, marks, best depth, Gate Run progress, Breath Gate streak counters, and a small collapse count for run-result feedback.

The playable systems already present are:

- Story navigation through depth options, including return paths to `HUB_NIGHT`.
- Gate Intelligence feedback for current objective, risk, route, and gate pressure.
- Gate Run actions: `さらに奥へ進む`, `周囲をよく見る`, `呼吸を整える`, `扉に合わせる`, and `夜のハブへ戻る`.
- Optional Breath Gate rest through the `休む / 整える` panel, which restores resources and may add resonance or marks while sitting below the main route controls.
- Ω locking through `canEnterOmega()`, requiring `gateRunStatus === "won"` before Ω entry.
- Completion path from `Ω` to `A_reborn`, then back to `HUB_NIGHT`.
- Reset flow that clears seed, progress, and run state.
- BGM companion integration that sends Music profile payloads while keeping Music as background support only, with same-screen generated BGM recommended on mobile and the external Music handoff preserved as an optional tab.
- Shared dependency-free Gate Run model in `hazama-gate-run.js`, used by both the browser runtime and `scripts/balance-smoke.mjs`.
- First playable route smoke in `scripts/first-playable-smoke.mjs`, covering the static loop skeleton and shared-model Ω unlock.
- Breath Gate collapse/timeout targets from the shared model are followed by the browser runtime, so Breath spam failure returns through `HUB_NIGHT`.
- Sync readiness UI that labels `合わせる` as `準備前` or `準備OK` without changing the balance model.
- Retreat readiness UI that labels `戻る` as `退避推奨`, `退避任意`, `再挑戦`, or `Ω保持` without changing the balance model.
- Completion CTA that marks `Ω -> A_reborn` arrival and returns directly to HUB for the next loop.
- Gate Run outcome panels for `扉が開いた`, `立て直し中`, and `時間切れ`.
- Compact `A_reborn` run-result record for turns, route steps, rest count, collapse count, main action, and Ω arrival.
- Browser first playable smoke that exercises BGM stop, locked Ω, Gate Run win, Ω entry, completion CTA, and reset when optional Playwright is available.
- Music bridge send hardening that waits for a Music window to be on the expected origin before posting payload/control messages.
- Balance smoke invariants for Gate Run action roles: risky charge, safe observe, preparation, ready/unready sync, and retreat behavior.
- Roguelike HUD that shows `FLOOR / TURN / CALM / SYNC / GATE / RISK`, a depth tile map, and a compact run log without changing balance or story data.
- Lightweight WebP visual assets and a gameplay-reactive visual layer that keeps the descent image active while gate pressure, risk, and win/loss state change the scene.
- Simplified default HUD surface: duplicate gauges, resource explanation chips, and full Gate Intelligence are no longer constantly shown above the playable controls.
- First action polish that lifts the initial `夜のハブへ入る` CTA and Gate Run action buttons above secondary map/log telemetry.
- Growth-route polish that keeps Gate Run and route choices primary while Breath Gate reads as optional rest.
- Story-first polish that places Gate Run, route choices, Breath Gate, and session controls in one post-story `展開` panel after the player reads the current depth.
- Next-loop polish that closes Ω after `A_reborn -> HUB_NIGHT`, so a new loop asks the player to open the gate again.
- Same-screen generated BGM so smartphone play does not depend on returning from an external Music tab.
- Consistency smoke coverage for depth graph integrity, first playable route contract, Ω lock/relock markers, and version drift.
- Playful Gate Run pulse feedback that labels the current flow, highlights the recommended action, and adds a small loop-flavor hook at `A_reborn` without changing balance values.
- PWA shell modeled after the music-stack `Music` repo family: standalone manifest, local icons, service-worker precache/offline fallback, install prompt, and update banner.
- Hazama-local autonomous development engine adapted from music-stack: `AGENTS.md`, `docs/autonomy/`, Codex/Claude collaboration notes, and a single `node scripts/hazama-check.mjs` verification entrypoint.

The current app is already close to a first playable. The main remaining gap is evidence: keep using real browser behavior, localStorage state, and smoke scripts to catch cases where the shared model passes but the DOM flow regresses.

## First playable loop definition

Target vertical slice:

`A_start -> HUB -> Gate Run -> Ω unlock -> Ω -> A_reborn`

Loop intent by the OpenAI Codex game development structure:

1. Build the first playable loop
   - Treat `A_start` as onboarding, `HUB_NIGHT` as the run launcher, Gate Run as the primary playable challenge, Breath Gate as optional recovery/rest, Ω unlock as the win condition, `Ω` as the run climax, and `A_reborn` as completion feedback.
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

Breath Gate means the existing short text rest mechanic, now framed as `休む / 整える`. It is not a new node in `hazama-depths.json`; it is the recovery/resource beat that helps the player stabilize before pushing Gate Run or Ω unlock.

## Self-driving goal ladder

The top-level goal is not to add more systems. The top-level goal is to make the existing first playable readable enough that a new player can complete one intended loop without outside explanation.

- North Star: a first-time player can understand the one-loop intent without audio or external docs, and can reach `A_reborn` in roughly 5-8 minutes.
- Next merge goal: verify the v2.40 post-story flow, Gate Run pulse cues, and same-screen BGM in a real browser/device pass, especially next-action clarity, mobile touch hierarchy, install/offline reload, Breath Gate hierarchy, outcome panels, and the `A_reborn` run record.
- Next playtest goal: keep verifying Gate Run as a small decision game built around attacking, stabilizing, and syncing rather than as five equivalent buttons.
- v2.21 goal: keep Hazama first playable while making Gate Run and Breath Gate balance resistant to simple recovery/sync spam.

Done means the player can answer these questions from the screen itself:

- Where am I in the first playable loop?
- What am I trying to open?
- Why is Ω locked or unlocked?
- When should I use Breath Gate?
- What does a completed run look like?

## UI/control issues to polish

- Route clarity: the app should plainly communicate that the first playable target is `A_start -> HUB -> Gate Run -> Ω unlock -> Ω -> A_reborn`, with Breath Gate as optional recovery rather than a required route node.
- Ω lock guidance: locked Ω choices already show `まだ入れない / 扉の開き X%`, but this needs to remain visible and understandable on small screens and touch devices.
- Control hierarchy: story choices and Gate Run actions should remain primary; Breath Gate rest, `停止`, `1ステップ戻る`, hub return, reset, and BGM controls should stay clearly secondary.
- Gate Run readability: the player should be able to tell which action is risky, which action recovers, and which action is the likely finisher.
- Breath Gate framing: `休む / 整える` should read as an optional recovery/resource action, not as a required text-entry gate.
- Win/loss feedback: `扉が開いた`, `立て直し中`, and `時間切れ` should be unmistakable, with the next useful action obvious.
- BGM companion: keep Music/BGM as background companion only. Do not make Music a primary route, required action, or source of player progression.
- Consistency drift: keep docs, runtime version markers, PWA cache names, and smoke scripts aligned whenever runtime assets change.

## Gate Run logic issues to evaluate

- Dual charging: normal depth movement and Gate Run actions both change `gateRunCharge`; verify this feels intentional and does not unlock Ω too early or too confusingly.
- `sync` readiness: `扉に合わせる` becomes strong with enough resonance, marks, or high gate charge; verify players can understand how to prepare it.
- Turn limit: `GATE_RUN_TURN_LIMIT` is 14; test whether this creates pressure without making safe HUB retreat feel punitive.
- Retreat/reset behavior: `夜のハブへ戻る` recovers and may reset completed/lost Gate Run state; verify this does not erase progress in a surprising way.
- Loss recovery: stability collapse and turn timeout move the player to `HUB_NIGHT` / `A_start` and cap charge; verify recovery feels like a retry loop, not a hard failure.
- Ω redirect: attempting Ω before unlock redirects toward the hub/start path; verify the message persists long enough to teach the lock. After unlock, Ω entry is a reward transition and should not reapply ordinary depth pressure.
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
- PWA install/offline behavior does not block JSON loading, reset, or the first playable loop.

## First playable test scenarios

- Fresh start: reset state, load `/`, confirm `A_start` makes `HUB_NIGHT` feel like the next natural step.
- Locked Ω: from `HUB_NIGHT`, choose `Ωの扉を試す` before the gate is won and confirm the screen explains why Ω is unavailable.
- Gate Run purpose: use the Gate Run panel and confirm `攻める / 見る / 整える / 合わせる / 戻る` read as distinct decisions.
- Breath Gate purpose: submit a short `休む / 整える` response and confirm it feels like optional recovery/preparation, not required story input.
- Unlock and completion: reach `扉が開いた`, enter `Ω`, then choose `新しい入口へ戻る` and confirm `A_reborn` feels like loop completion.
- Replay hook: confirm `A_reborn` shows turns, route steps, rest count, collapse count, main action, and Ω arrival without storing raw Breath Gate input.
- Static regression: run `bash scripts/startup-smoke.sh 8765` and confirm no dependency, build, audio, Music repo, or GitHub Actions changes are needed.
- Autonomy regression: run `node scripts/hazama-check.mjs` and confirm all required smoke checks pass, with only optional Playwright browser smoke allowed to skip.
- Route skeleton regression: run `node scripts/first-playable-smoke.mjs` and confirm `A_start -> HUB_NIGHT -> Gate Run won -> Ω -> A_reborn -> HUB_NIGHT`.
- Browser route regression: run `node scripts/browser-first-playable-smoke.mjs` in an environment with Playwright and confirm the same loop completes through the DOM.

## PR review checklist

- Keeps Hazama browser-based and static.
- Adds no dependencies, no audio files, and no GitHub Actions.
- Does not change the Music repo or require Music changes for Hazama progression.
- Preserves existing story text except tiny UI-facing copy when absolutely necessary.
- Keeps Music/BGM as background companion only.
- Does not alter public routes, storage keys, JSON schema, or Music payload shape unless the PR explicitly scopes and documents that change.
- Keeps PWA cache cleanup scoped to Hazama cache names so same-origin Music apps are not evicted.
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
   - v2.27 fixed an in-browser Ω entry regression found by browser smoke and hardened Music posting while preserving Music payload shape.
   - v2.28 adds role invariants to balance smoke and verifies the story option Ω route after Gate Run victory.
   - v2.29 adds the roguelike run HUD so the same Gate Run state reads more like a playable dungeon loop.
   - v2.30 shifts visual polish toward gameplay feedback and removes duplicated default UI surfaces.
   - v2.32 frames Breath Gate as optional rest, adds outcome feedback, and records a compact loop result at `A_reborn`.
   - v2.33 clarifies that Hazama opens Music separately and audio starts after `START.HZM` in the Music tab.
   - v2.34 adds a standalone PWA manifest, icons, service worker, install prompt, and update banner.
   - v2.35 adds first-screen guidance for the opening action.
   - v2.36 moves choices into one post-story `展開` panel and closes Ω on the next loop.
   - v2.37 adds same-screen generated BGM for smartphone play.
   - v2.38 adds a visible next-action guide and consistency smoke for docs/runtime drift.
   - v2.39 adds Gate Run pulse cues and recommended-action highlights without changing balance numbers.
   - Continue fixing bugs found from console output, mobile/touch play, localStorage edge cases, static asset loading, and smoke checks.
   - Acceptance: startup smoke passes, the first playable loop completes in-browser, Music absence is harmless, and only intended files change.
