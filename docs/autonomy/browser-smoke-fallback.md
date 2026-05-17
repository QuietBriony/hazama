# Browser Smoke Fallback — Hazama

Hazama keeps browser verification lightweight. The automated browser smoke is useful when
Playwright is already available, but it is not a required dependency for this static Web
first playable.

## Optional Playwright Smoke

`node scripts/browser-first-playable-smoke.mjs` starts from a static-served Hazama page
and checks the core DOM loop:

- the app shell renders without a startup error
- first playable navigation reaches the HUB
- the locked Omega route state is visible before Gate Run completion
- Gate Run can complete and unlock Omega
- the reborn/completion path can return to the HUB

The script is intentionally optional. If Playwright is missing, `SKIP` with exit code 0 is
acceptable because `hazama-check` still runs the dependency-free model, story, and startup
smokes. Missing Playwright means "browser automation unavailable in this session", not
"Hazama passed all browser/manual checks".

## In-App Browser Manual Fallback

When Playwright skips and a browser is available, verify the same first playable path in
the in-app browser:

1. Serve the repo as a static site and open `hazama-index.html` or `index.html`.
2. Fresh start reaches `HUB_NIGHT` without console-visible startup failure.
3. Confirm Omega is locked before Gate Run completion.
4. Complete a Gate Run win and confirm Omega unlocks.
5. Enter Omega, reach `A_reborn`, then use the completion CTA back to the HUB.
6. Recheck the path with Music unopened; BGM/stop controls must be harmless.
7. At mobile width, repeat the HUB -> Gate Run -> completion path and look for horizontal
   overflow, clipped controls, or blocked progression.

Record manual browser/mobile-width notes in `docs/autonomy/SESSION-LEDGER.md` only when
that file is in the active write scope for the session.
