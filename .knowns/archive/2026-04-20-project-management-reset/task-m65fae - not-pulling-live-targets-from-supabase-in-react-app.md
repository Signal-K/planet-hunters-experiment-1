---
id: m65fae
title: Not pulling live targets from supabase in react app
status: done
priority: high
labels:
  - bug
  - supabase
  - database
  - targets
  - anomalies
  - api
  - react
  - vercel
  - test
  - deployment
createdAt: '2026-02-15T16:51:40.000Z'
updatedAt: '2026-02-16T15:16:05.040Z'
timeSpent: 333
assignee: '@me'
---
# Not pulling live targets from supabase in react app

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add env-key compatibility aliases in runtime clients so Supabase credentials resolve from `SUPABASE_URL` + `SUPABASE_ANON`/`SUPABASE_ANON_KEY` (+ service-role fallback where safe).
2. Update React/TS Supabase client env resolution to include the non-prefixed variable names shown in deployment settings.
3. Update Godot Supabase client env resolution to support `SUPABASE_ANON` (and `SUPABASE_SERVICE` fallback) so live anomaly fetch uses deployed credentials.
4. Run targeted tests/build checks and verify no regression in launchpad/anomaly fetch paths.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Fixed Supabase env resolution mismatch between deployment variable names and app expectations.
- Updated React client (`utils/supabase.ts`) to accept aliases: `SUPABASE_URL`, `SUPABASE_ANON`, `SUPABASE_ANON_KEY`, with service fallback for misconfigured environments.
- Updated Godot anomaly client (`scene/Scripts/Systems/SupabaseClient.gd`) to resolve key from `SUPABASE_ANON_KEY`, then `SUPABASE_ANON`, then `SUPABASE_SERVICE`.
- This removes dependency on only `NEXT_PUBLIC_*`/`EXPO_PUBLIC_*` naming and aligns with your Supabase project variable names shown in screenshot.

## Validation
- `cd /Users/scroobz/Navigation/Native/planet-hunters-experiment-1/scene && /Users/scroobz/godot-src/bin/godot.macos.editor.arm64 --headless --script res://tests/run_supabase_tests.gd 2>&1`
  - 1/1 passed
- `npm run test:unit -- --runInBand --watchman=false`
  - 3 suites passed, 17 tests passed
<!-- SECTION:NOTES:END -->

