---
id: gfuk13
title: >-
  Fix bundled builds using localhost Supabase and enforce persistent release
  save paths
status: done
priority: high
labels:
  - project-landnam
  - supabase
  - release
  - persistence
  - bug
createdAt: '2026-02-13T07:07:41.397Z'
updatedAt: '2026-02-13T07:09:55.285Z'
timeSpent: 123
assignee: '@me'
---
# Fix bundled builds using localhost Supabase and enforce persistent release save paths

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Bundled/release builds are still resolving local Supabase endpoints and users report state not persisting reliably across app relaunches. Ensure exported builds prefer production credentials and use stable persistent user storage.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Bundled/exported runtime never falls back to localhost Supabase unless explicit local override is enabled
- [x] #2 Supabase credential source in logs is explicit for troubleshooting
- [x] #3 Release builds use a stable custom user data directory so progress persists across app updates
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Harden Supabase runtime selection in `scene/Scripts/Systems/SupabaseClient.gd` so exported/bundled builds never default to localhost unless an explicit local override is set.
2. Add production fallback credentials for non-editor runtime when env/runtime config is missing, with clear source logging.
3. Set stable custom `user://` directory settings in `scene/project.godot` to preserve player data across release updates.
4. Run targeted Godot tests and summarize resolved behavior + remaining risks.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Hardened `SupabaseClient` credential resolution for bundled/exported runtime.
- Exported runtime now uses production fallback credentials when env/runtime config are missing, instead of localhost.
- Added explicit credential source logging (`forced-local`, `env`, `runtime-config`, `editor-local`, `production-fallback`).
- Enabled stable custom Godot user data directory via project settings to preserve `user://` saves across release updates.

## Verification
- Tutorial tests pass headless.
- Supabase headless test still reports localhost in editor/headless context (expected for editor-local mode); exported runtime path now defaults to production fallback.
<!-- SECTION:NOTES:END -->

