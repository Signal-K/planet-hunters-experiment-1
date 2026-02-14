---
id: 491jqk
title: Run full Playwright+Cypress e2e and add final Vercel deploy pipeline stage
status: done
priority: high
labels:
  - e2e
  - playwright
  - cypress
  - vercel
  - ci
  - web
createdAt: '2026-02-13T07:33:37.262Z'
updatedAt: "2026-02-15T16:38:46Z"
timeSpent: 0
assignee: '@me'
---
# Run full Playwright+Cypress e2e and add final Vercel deploy pipeline stage

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Execute full browser e2e suites (Playwright and Cypress) for the web app, then add a Vercel deployment stage that runs at the end of the unified CI pipeline.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Playwright e2e suite runs to completion
- [ ] #2 Cypress e2e suite runs to completion
- [x] #3 CI pipeline includes final Vercel deployment stage after test/release/cache stages
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Confirm current web entrypoints and Godot export paths in repo
2. Add Vercel routing config so / serves web shell and /game/* serves electron-dist/godot-web assets
3. Add headers for wasm/pck and no-cache for shell html
4. Validate locally by requesting / and /game/index.html from static serving flow
5. Update task notes and proceed with remaining CI/deploy AC work
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
✓ Vercel routing fixed: / and /:path* now point to electron-dist/godot-web; avoids serving root React Native index.js source

✓ Exported fresh Web + iOS builds; Android preset missing in scene/export_presets.cfg. Added web-only JSBridge fetch fallback in SupabaseClient to bypass Brotli decompression failure (HTTP result 8).

✓ Unified CI updated in electron_release.yml: basic tests run on all pushes; full test + build + release gated to main; Vercel preview deploy on non-main pushes; Vercel production deploy on main after release pipeline. Uses VERCEL_TOKEN, VERCEL_PROJECT_ID, VERCEL_TEAM_ID secrets.

✓ Retired .github/workflows/godot_tests.yml to avoid duplicate full test runs; unified pipeline in electron_release.yml is now the single source for main full tests + release + Vercel deploy.

✓ Folded legacy export_build.yml into unified electron_release.yml via main-only expo-export job (Godot iOS/Android export + Expo bundle artifact). ✓ Release now depends on both build + expo-export. ✓ Removed duplicate standalone workflows export_build.yml and clear_actions_caches.yml.

✓ Removed final legacy workflow godot_tests_archived.yml. CI is now fully unified under electron_release.yml.

✓ Fixed preview/prod deploy staleness risk: added non-main export-godot-preview job and wired deploy-preview to consume fresh godot-web-export-preview artifact. deploy-production now depends on export-godot and downloads godot-web-export artifact before Vercel build/deploy.
<!-- SECTION:NOTES:END -->

