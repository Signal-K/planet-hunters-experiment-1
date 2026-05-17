---
id: wxwa54
title: Add M1-M4 new-user-flow tests and fix seed state issues
status: done
priority: medium
labels:
  - project-landnam
  - testing
  - gdscript
  - missions
createdAt: '2026-04-08T14:41:01.974Z'
updatedAt: '2026-04-08T14:41:06.982Z'
timeSpent: 0
---
# Add M1-M4 new-user-flow tests and fix seed state issues

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Added run_new_user_flow_tests.gd (15 tests covering the complete Mission 1 new user journey) and run_later_missions_tests.gd (16 tests covering Missions 2-4 end-to-end). Fixed three test failures: (1) res://rockets_state.json seed file had stale developer state polluting fresh runs; (2) set_returned_mission stores label under 'label' key not 'target_label', and extra dict keys are merged at top level not nested under 'mission_data'; (3) badge format must use dash ('mission-1') not underscore to pass is_progress_badge_valid(). Also fixed _reset() to call save_state(clean) explicitly after reset_state() because RocketsManager.reset_state() called via GDScript preload/static does not execute its body in headless mode — known GDScript 4 quirk.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 run_new_user_flow_tests.gd passes 15/15
- [x] #2 run_later_missions_tests.gd passes 16/16
- [x] #3 res://rockets_state.json seed file is clean default state
- [x] #4 All 23 existing GDScript tests still pass
- [x] #5 All 106 Playwright tests still pass
<!-- AC:END -->

