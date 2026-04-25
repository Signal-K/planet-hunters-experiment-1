---
id: j6c3zz
title: >-
  Create browser-playable Godot web app with persistence and unified CI release
  pipeline
status: done
priority: high
labels:
  - web
  - godot
  - ci
  - release
  - persistence
  - e2e
createdAt: '2026-02-13T07:23:01.493Z'
updatedAt: '2026-02-13T07:33:37.289Z'
timeSpent: 478
assignee: '@me'
---
# Create browser-playable Godot web app with persistence and unified CI release pipeline

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add a public web app to host/play the exported Godot Web build with persistent progress, add automated tests for web behavior, implement iterative release naming/versioning, and unify CI pipeline order: Godot tests -> unit/e2e -> release -> cache clear.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Users can play the Godot Web build through a dedicated web app route
- [x] #2 Web app persists and restores user progress between sessions
- [x] #3 Automated test series covers web load + persistence + release flow checks
- [x] #4 Release name/version increments predictably per release
- [x] #5 Single pipeline orchestrates test stages, release, then cache clear
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add browser web host (`web/server.js`, `web/public/index.html`) to serve the Godot Web export at `/game/*` with persistence bootstrap.
2. Add automated tests: unit tests for release versioning and web host behavior, plus Playwright e2e for web app load/persistence checks.
3. Add release version iterator utility and wire it into release publish naming/tagging.
4. Unify CI into one ordered pipeline in `.github/workflows/electron_release.yml`: Godot tests -> unit/e2e tests -> build/release -> cache clear.
5. Keep old cache workflow non-automatic to avoid duplicate post-release runs.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Added browser-playable web host at `web/` that serves shell UI and Godot export route `/game/*`.
- Added persistence bootstrap via browser storage persistence request + local save marker in web shell.
- Added test series: Jest unit tests for release versioning + web host behavior, Playwright e2e suite for web app load and persistence checks.
- Added release versioning utility (`scripts/release/next-release.js`) and wired release workflow to iterative release names/tags.
- Unified pipeline in `electron_release.yml` with ordered stages: Godot tests -> unit/e2e tests -> release -> cache clear.
- Disabled automatic standalone cache workflow trigger to avoid duplicate cache-clear runs outside unified pipeline.

## Verification
- `npm run test:unit -- releaseVersion webServer` passes (7 tests).
- `npx playwright test --list` lists all 3 e2e tests.
- Full Playwright execution not run locally in sandbox due browser/server runtime constraints; CI job runs install + execution.
<!-- SECTION:NOTES:END -->

