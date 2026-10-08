# Landnam tests

Cypress was removed (SSL-506). The browser suite is Playwright scene tests.

## What the scene suite is, and is not

`tests/scenes/screens.spec.ts` mounts one screen at a time from fixture state (`/game/stage?preset=...`) at 390x844, 926x428 and 1440x900. For each it saves a screenshot and checks: no Next error overlay, no uncaught page errors, no page-level horizontal scroll, no visible text under 14px, no tap target under 44px, no two controls overlapping.

It does **not** exercise sign-in, persistence, multi-step flows or the backend. The flow coverage that the old Cypress journeys, auth and regression profiles claimed is replaced by SSL-508 (staging playthrough), not by this suite.

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
| Full staging prerelease | SSL-508 spec (not written yet) | before a release |

`retries: 2` in `playwright.config.ts` absorbs browser crashes (see Known flakiness). A test that needed a retry is reported as flaky, not hidden.

## What each deleted Cypress profile became

| Cypress profile | Fate |
| --- | --- |
| offline, features, ui-zones, tutorial-rail, interaction-order | Layout and overlap concerns are covered per screen by the scene checks. Step-by-step assertions are retired (they asserted the removed coach and old chrome). |
| visual, visual-extended, release-matrix, responsive | Replaced by the scene screenshots at the three viewports. |
| regression, journeys, clean-start-loop, staging-full, with-pb | **Not replaced yet.** Retired from the suite; end-to-end flow coverage is owed to SSL-508. |
| auth | **Not replaced yet.** Owed to SSL-508 (sign-up, token expiry, 401 retry). |
| surveys | **Not replaced yet.** Survey runtime gate has no browser test. |
| smoke | Superseded by `scenes`. |

## Known flakiness

On a heavily loaded Mac, Chrome sometimes dies mid-test ("Target page, context or browser has been closed"). Roughly 13 of 84 tests needed a retry in two consecutive runs, with a different set each time and a system load average above 180. Tests that failed this way passed when rerun alone. Run on Linux/Docker or a quiet machine for a trustworthy signal.
