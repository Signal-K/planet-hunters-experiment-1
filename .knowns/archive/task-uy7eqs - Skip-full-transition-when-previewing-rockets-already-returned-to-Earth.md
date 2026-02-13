---
id: uy7eqs
title: Skip full transition when previewing rockets already returned to Earth
status: done
priority: high
labels:
  - bug
  - preview
  - routing
  - rocket-state
createdAt: '2026-02-08T08:09:15.767Z'
updatedAt: '2026-02-09T01:35:58.295Z'
timeSpent: 135
assignee: '@me'
---
# Skip full transition when previewing rockets already returned to Earth

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Previewing a rocket that is already returned to Earth should not replay full return transition. Route directly to Earth/base preview state instead.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Previewing returned rockets does not open full return transition scene
- [x] #2 Returned-rocket preview routes directly to Earth/base state
- [x] #3 Other preview routes (launched/returning) continue to behave as before
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Validate NewMissionLaunchList preview routing for returned rockets
2. Keep returningHome route on transition scene while returned routes direct to mission_debrief
3. Add regression tests for returned/returning/launched route mapping
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Fixed return preview start logic in `scene/Scripts/Transitions/ReturnPreviewTransition.gd` so rockets with status `returned` start directly in Earth orbit phase instead of replaying full transition.
- Kept `returningHome` behavior unchanged (still transitions unless return is already complete).

## Verification
- `GODOT_USER_DIR=/tmp/godot Godot --headless --path scene --script res://tests/run_tutorial_tests.gd` ✅ (2/2 pass)

🔄 Reopened fix: route status=returned preview directly to mission_debrief.tscn from NewMissionLaunchList; only returningHome uses rocket_return transition

✓ Refactored preview route resolver into Scripts/UI/NewMissionPreviewRouting.gd and validated returned/returning route mapping via run_experience_tests.gd.
<!-- SECTION:NOTES:END -->

