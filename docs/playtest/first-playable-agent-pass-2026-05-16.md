# First Playable Agent Pass - 2026-05-16

Scope: HZ-BL-002 support note. This is an agent / in-app browser / smoke pass, not a human taste pass. It should not close the human-gated manual playtest item by itself.

## Environment

- Repo: `C:\workspace\github-inventory\side-stack\hazama`
- Date: 2026-05-16
- App target: Hazama v2.34 static first playable
- Local URL: `http://127.0.0.1:58911/index.html`
- Browser surface: Codex in-app browser, default desktop viewport plus 390px-class mobile viewport override
- Music: unopened; no Music tab/audio dependency used

## Verification Run

`node scripts/hazama-check.mjs` returned `3 PASS / 0 FAIL / 2 SKIP`.

- PASS: balance smoke
- PASS: first playable smoke
- PASS: startup smoke
- SKIP: localStorage migration smoke requires optional Playwright
- SKIP: browser first playable smoke requires optional Playwright

In-app route pass completed:

`A_start -> HUB_NIGHT -> Gate Run won -> Ω -> A_reborn -> HUB_NIGHT`

The Gate Run sequence used was:

`dive, dive, dive, tune, tune, sync, tune, tune, dive, tune, sync`

Observed result: 11 Gate Run actions, gate reached 100%, `扉が開いた` appeared, `Ωへ入る` appeared, `A_reborn` showed `一周完了` and `Ω -> A_reborn 到達`, then the completion CTA returned to `HUB_NIGHT`.

## Slice Notes

### First-Time Route Read

- Fresh in-app load reported `OK: A_start`.
- The top Gate Run mission text said the entrance should go to the night hub first, and the visible primary CTA was `夜のハブへ入る`.
- The depth map showed `START current` as `@`, future floors as fog/unknown, and `Ω locked`.
- At `HUB_NIGHT`, the locked story option read `Ωの扉を試す / まだ入れない / 扉の開き 0% / 扉100%で解放`.

Agent read: the first route is legible from the screen. This is still not a substitute for a fresh human saying whether they understand it within one minute.

### Gate Run Decision Feel

- At `HUB_NIGHT`, Gate Run actions were visibly differentiated:
  - `攻める`: `扉の開き +14 / 響き +3 / 落ち着き -16`
  - `見る`: `扉の開き +6 / 響き +1 / 落ち着き +3`
  - `整える`: `扉の開き +2 / 響き +5 / 落ち着き +6`
  - `合わせる 準備前`: small gate gain and resonance cost before setup
  - `戻る 退避任意`: recovery/retreat affordance
- During the 11-action route, `合わせる` changed from `準備前` to `準備OK` after setup, then fell back after use and later became `準備OK` again.
- `node scripts/balance-smoke.mjs`, through `hazama-check`, still verifies balanced unlock in 8-12 meaningful actions and reckless/collapse policies as soft recovery cases.

Agent read: the decision roles are mechanically and textually distinct. No balance tuning is recommended from this pass alone.

### Breath Gate Boundary

- The `Breath Gate / 休む / 整える / 任意休息` panel appeared below route/session controls in the visible DOM, not as the first route.
- Existing balance smoke coverage in this run kept `breath-spam` from unlocking Ω and verified repeated field Breath Gate cap behavior.
- The in-app browser BGM link payload visible at `A_start` included sanitized profile data and `rawInputStored:false`; this pass did not submit new raw Breath Gate text.

Agent read: current evidence supports Breath Gate as optional recovery rather than a primary route or Ω opener. A human pass should still judge whether the panel feels tempting but not mandatory.

### Completion Read

- After Gate Run victory, the outcome panel read `扉が開いた` and explained that Ω could be entered and that returning to HUB preserves the unlock.
- `Ωへ入る` led to `Ω`; `新しい入口へ戻る` led to `OK: A_reborn`.
- `A_reborn` showed `一周完了`, `Ω -> A_reborn 到達`, a compact record (`11手Gate Run`, `3歩道`, `なし崩落`, `なし休息`, `扉に合わせる主な行動`, `到達Ω`), and `夜のハブへ戻る / 次の周回へ`.
- The completion CTA returned to `HUB_NIGHT`; the won Ω option remained enabled afterward.

Agent read: completion is explicit and loop-shaped in browser. Whether the record makes a second loop tempting remains a human taste question.

### Companion Boundary

- The route pass was completed with Music unopened.
- BGM UI stayed separate from route controls and read as `START待ち` / `リンクで開く` or `別タブSTART.HZM`.
- The `止める` control was present, and `hazama-check` startup coverage still finds the Music companion copy and sender hooks.

Agent read: Music is not required for progression in this pass.

### PWA Boundary

- Startup smoke passed PWA shell checks, including manifest, icons, service worker registration/update UI strings, and Hazama cache namespace expectations.
- In-app DOM read found `manifest.webmanifest` and `icons/apple-touch-icon.png`.
- Browser-first-playable PWA automation did not run in this environment because optional Playwright was unavailable.
- Mobile-width check at a 390px-class viewport ended at `OK: A_reborn`; no buttons, links, inputs, or key control containers overflowed the viewport. Decorative/visual layers were wider than the viewport internally, but document `scrollWidth` stayed at viewport width.

Agent read: PWA static shell evidence is healthy, but install prompt, standalone launch, and offline reload remain human/device-gated.

## Risks / Follow-Up

- HZ-BL-002 should remain human-gated. This pass confirms mechanics and route legibility, not player taste, confusion, touch feel, or desire to replay.
- Optional Playwright-backed browser smokes skipped, so the in-app browser pass is useful but not the same as the scripted browser regression suite.
- No supported evidence from this pass suggests changing Gate Run numbers. Keep HZ-BL-003 blocked on specific manual confusion or balance pain.
- Human follow-up should focus on: first-minute goal clarity, whether five Gate Run buttons feel meaningfully different, whether `休む / 整える` feels optional, and whether `A_reborn` feels like a satisfying completion.
