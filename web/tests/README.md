# Landnam tests

Cypress was removed (SSL-506). The browser suite is Playwright scene tests.

## What the scene suite is, and is not

`tests/scenes/screens.spec.ts` mounts one screen at a time from fixture state (`/game/stage?preset=...`) at 390x844, 926x428 and 1440x900. For each it saves a screenshot and checks: no Next error overlay, no uncaught page errors, no page-level horizontal scroll, no visible text under 14px, no tap target under 44px, no two controls overlapping.

It does **not** exercise a real sign-in, durable persistence, sync, or the backend. A few focused specs seed an account-shaped local session to protect routes; that is not staging acceptance. The old Cypress journeys, auth and regression profiles are owed to SSL-508 (staging playthrough), not this suite.

## Commands

Local (macOS, installed Chrome):

```bash
cd web
SCENES_CHANNEL=chrome npm run test:scenes
SCENES_CHANNEL=chrome npm run test:scenes:phone   # fast subset
```

Linux / Docker (use this when macOS blocks or crashes the browser):

```bash
docker run --rm -v "$PWD":/work -w /work/web --ipc=host \
  mcr.microsoft.com/playwright:v1.56.1-noble \
  bash -c "npm ci && npm run test:scenes"
```

CI runs the same `npm run test:scenes` in the `scenes` job (see `docs/ci.md`) and uploads `tests/.report` and `tests/.out` (screenshots) on every run.

## Suites

| Suite | Command | When |
| --- | --- | --- |
| Fast per-PR | `npm run test:unit` + `npm run test:scenes` | every PR (CI `unit`, `scenes`) |
| Phone smoke | `npm run test:scenes:phone` | local iteration |
| Full staging prerelease | `STAGING_BASE_URL=… STAGING_LANDNAM_PB_URL=… npm run test:staging` | before a release |

`retries: 2` in `playwright.config.ts` absorbs browser crashes (see Known flakiness). A test that needed a retry is reported as flaky, not hidden.

## What each deleted Cypress profile became

| Cypress profile | Fate |
| --- | --- |
| offline, features, ui-zones, tutorial-rail, interaction-order | Layout and overlap concerns are covered per screen by the scene checks. Step-by-step assertions are retired (they asserted the removed coach and old chrome). |
| visual, visual-extended, release-matrix, responsive | Replaced by the scene screenshots at the three viewports. |
| regression, journeys, clean-start-loop, staging-full, with-pb | The initial SSL-508 gate creates and purges a real `@landnam.test` account, uses the shipped M1–M3 handoff, asserts the saved `game_states` row, then reloads into Free Ops. Individual mining/scan/part interaction, offline replay, expiry recovery and cross-account coverage remain follow-up slices. |
| auth | Fixture-only route coverage exists; the SSL-508 staging gate now covers real sign-up. Token expiry and 401 retry remain follow-up slices. |
| surveys | **Not replaced yet.** Survey runtime gate has no browser test. |
| smoke | Superseded by `scenes`. |

## Known flakiness

On a heavily loaded Mac, Chrome sometimes dies mid-test ("Target page, context or browser has been closed"). Roughly 13 of 84 tests needed a retry in two consecutive runs, with a different set each time and a system load average above 180. Tests that failed this way passed when rerun alone. Run on Linux/Docker or a quiet machine for a trustworthy signal.

## Evidence

Screenshot evidence is mandatory and checked without any paid vision API. Everything is computed from the DOM and pixels.

- `tests/scenes/checks.ts` exports `checkContrast` (WCAG AA 4.5:1, 3:1 for large text, against the resolved background colour; text over an image, gradient, canvas, video or svg is skipped and the reason recorded), `checkClipping` (visible text cut off by an `overflow:hidden` box; intentional ellipsis and line-clamp are ignored), `checkGameplayVisible` (scene root or canvas has nonzero size and the rendered frame is not blank) and `collectStructural` (overlap, tap size, small text, horizontal scroll as data).
- `tests/scenes/evidence.spec.ts` runs all of them on 8 key presets at the 3 viewports and saves `evidence-<preset>-<viewport>.png`.
- `tests/scenes/checks.selftest.spec.ts` proves the checkers work: a built page with a known overlap, tiny text, low contrast and clipped text must be reported, and a clean page must report nothing.
- With `CI` set, Playwright writes the JSON report to `tests/.out/results.json` and the HTML report to `tests/.report`; screenshots are saved next to them in `tests/.out`.
- Native: `scripts/native-evidence.sh [scene ...]` launches catalog scenes (`SceneCatalog.swift`) in the booted iOS Simulator and saves screenshots with `simctl io booted screenshot`. It captures images only; there are no automated native pixel checks beyond the existing `verify:native-*` scripts.
