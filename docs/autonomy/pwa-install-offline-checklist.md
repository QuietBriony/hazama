# PWA Install / Offline Human Checklist — Hazama

This checklist advances `HZ-BL-001` only to a ready-for-human state. It is
human-gated: completing this document, or running automated smokes, does not mark
the backlog item done. A person with a real browser/device must perform the pass
and record results when `SESSION-LEDGER.md` is in scope.

## Prerequisites

- Use a real desktop browser and at least one real mobile device or mobile PWA
  install environment.
- Start from the repo root and serve Hazama as a static site. Example:

```bash
python -m http.server 8765
```

- Open `http://localhost:8765/` or `http://localhost:8765/hazama-index.html`.
- Confirm `node scripts/hazama-check.mjs` is already green or that any failure is
  unrelated and explicitly known.
- Use a fresh profile, private window, or clear existing Hazama site data before
  the main pass.
- Keep Music unopened for the primary pass. Hazama must progress without Music,
  BGM playback, or an external tab.

## Desktop Install Steps

1. Visit Hazama while online.
2. Confirm the app starts without a visible startup error.
3. Move from `A_start` to `HUB_NIGHT`.
4. Trigger the browser install flow from the address bar or browser menu.
5. Launch the installed app in standalone/app-window mode.
6. Confirm it opens to Hazama, not a blank page or server directory listing.
7. Use reset once, then confirm the app can reach `A_start -> HUB_NIGHT` again.

## Mobile Install Steps

1. Visit the same static Hazama URL while online.
2. Add/install Hazama to the home screen using the platform browser flow.
3. Launch from the home-screen icon.
4. Confirm standalone display if the platform supports it.
5. Confirm `A_start -> HUB_NIGHT` works after launch.
6. Check that the first playable controls fit at mobile width with no blocking
   horizontal overflow or clipped progression buttons.

## Offline Reload Checks

Perform these after one successful online visit, so the service worker has a
chance to cache the shell.

1. Close all Hazama tabs/app windows.
2. Disable network access for the browser/device.
3. Reopen the installed Hazama app or reload the existing Hazama URL.
4. Confirm the app shell loads offline.
5. Confirm reset is available and harmless offline.
6. Confirm `A_start -> HUB_NIGHT` works offline.
7. Re-enable network and reload once more to confirm the app still starts.

## Expected Pass Signals

- Install prompt or add-to-home-screen path is available on at least one target
  platform.
- Installed launch opens Hazama in an app-like window or platform equivalent.
- First online visit reaches `HUB_NIGHT`.
- Offline reload loads the Hazama shell instead of a browser network error.
- Reset does not strand the app in a blank or locked state.
- `A_start -> HUB_NIGHT` works after reset and during the offline pass.
- Music remains optional; Hazama progress does not depend on Music START.HZM,
  audio playback, or an external Music tab.

## What To Record

When ledger edits are in scope, record:

- date, tester, device, OS, and browser
- served URL and entry file used
- whether install was prompted, menu-driven, or unavailable
- standalone launch result
- online `A_start -> HUB_NIGHT` result
- offline reload result
- reset result
- mobile layout notes, especially overflow or clipped controls
- screenshots only if useful for a failure; do not store raw Breath Gate input

## Failure Triage

- Install unavailable: note browser/platform, manifest visibility, and whether
  the page was served over an install-eligible origin.
- Offline reload fails: check service worker registration, cache version, and
  whether the first online visit completed before going offline.
- Blank or stale app after launch: compare `index.html`, `hazama-index.html`,
  `sw.js`, and startup-smoke expected version only in a runtime-scoped session.
- Reset breaks progression: record the exact state before reset and the visible
  route after reload; do not change storage contracts without explicit scope.
- Mobile controls blocked: record viewport/device and the blocked action.
- Music-related issue: confirm the same path with Music unopened. Hazama should
  treat Music as a companion, not a dependency.

## Closeout Rule

Do not move `HZ-BL-001` to Done from this checklist alone. The item closes only
after a human records a real install/offline pass result.
