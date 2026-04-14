---
id: rhkpi3
title: Trigger inline PostHog exit survey at first mission completion
status: done
priority: high
labels:
  - posthog
  - survey
  - supabase
  - experiment1
createdAt: '2026-02-15T07:45:58.142Z'
updatedAt: '2026-02-15T07:52:05.122Z'
timeSpent: 359
assignee: '@me'
---
# Trigger inline PostHog exit survey at first mission completion

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement seamless in-app survey trigger at end of first mission in Experiment 1, include anonymous/guest Supabase user creation and attach progress JSON to survey properties for analysis and Star Sailors ecosystem integration.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Survey opens inline (no new tab) after first mission debrief completion
- [x] #2 A guest Supabase identity exists before survey event is sent
- [x] #3 Survey event includes a compact JSON progress payload of user actions
- [x] #4 Survey is shown once per player/session milestone
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add Godot web bridge helper for parent-window event posting on web builds only.
2. Emit tutorial progression + first mission completion telemetry from Godot scripts.
3. Extend web shell to collect telemetry, create/restore Supabase anonymous user, and prepare compact progress_json payload.
4. Render external PostHog survey inline in-page (modal iframe) with distinct_id, supabase_guest_id, and progress_json query params.
5. Ensure one-time trigger at first mission completion and preserve existing shell behavior.
6. Validate behavior and update task acceptance criteria + notes.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Added Godot->web event bridge for tutorial + mission telemetry.
- Emits first mission completion from MissionDebrief.
- Web shell now auto-creates/restores Supabase anonymous user before showing survey.
- Survey opens inline modal iframe (no new tab) and passes distinct_id, supabase_guest_id, mission metadata, and compact progress_json.
- Survey gate is one-time via localStorage milestone key.

## Validation
- `node --check web/public/app.js`
- `npx eslint web/public/app.js`

## Notes
- Full repo lint has many unrelated pre-existing errors; not modified in this task.
<!-- SECTION:NOTES:END -->

