# CI (SSL-505)

Workflow: `.github/workflows/web-ci.yml`. Cypress and visual-qa workflows were removed; Playwright scene tests (`cd web && npm run test:scenes`) replace them.

## Branches vs jobs

| Target | Event | lint-typecheck | unit | scenes | build | ci-required | deploy |
|---|---|---|---|---|---|---|---|
| PR into main | pull_request | yes | yes | yes | yes | yes | no |
| PR into cycle/** | pull_request | yes | yes | yes | yes | yes | no |
| PR into sprint*/** | pull_request | yes | yes | yes | yes | yes | no |
| PR into release/** | pull_request | yes | yes | yes | yes | yes | no |
| PR into native/** | pull_request | yes | yes | yes | yes | yes | no |
| push to main | push | yes | yes | yes | yes | yes | production Worker |
| push to cycle/** | push | yes | yes | yes | yes | yes | staging Worker |
| push elsewhere | none | no | no | no | no | no | no |

No path filters, so the checks always report. Deploy jobs need `ci-required`.

## Required check

Require only `CI required` (job `ci-required`). It runs with `if: always()` and fails unless all four needed jobs succeeded, so a skipped, cancelled or failed job fails the gate. The scenes job uploads `web/tests/.report` and `web/tests/.out` with `if-no-files-found: error`, so a run that produced no artifacts fails.

Branch protection state at audit time: `main` unprotected (404), no rulesets. Not modified; enabling "Require status checks: CI required" is a manual repo-settings step.

## Retry and rollback

- Flaky scene: re-run failed jobs from the Actions UI (artifact names include run_attempt). Do not add `continue-on-error` or retries to hide it.
- Rollback: revert the commit touching `web-ci.yml`; the previous Cypress jobs are gone for good, recover via `git show <old-sha>:.github/workflows/<file>`.
- If the gate itself is broken and blocks merges, remove `CI required` from required checks in repo settings temporarily, fix, restore.
