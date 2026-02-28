---
id: z0pu9z
title: Tutorial step index not reconciled against completed_actions on startup
status: done
priority: high
labels:
  - tutorial
  - bug
  - persistence
  - startup
createdAt: '2026-02-28T04:22:37.002Z'
updatedAt: '2026-02-28T07:06:48.291Z'
timeSpent: 0
---
# Tutorial step index not reconciled against completed_actions on startup

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
TutorialController._reconcile_step_index() only clamps current_step_index to a valid range. It does not check whether completed_actions already contains the current step's action_key. After a crash, app restart, or cross-session resume, the tutorial can load a step index pointing to a step the user has already performed, showing a stale/wrong step. For example: if current_step_index=2 (select_launch_target) is loaded from disk, but completed_actions already has select_launch_target=true from the previous session, the tutorial should auto-advance to step 3 but doesn't. Fix: in _reconcile_step_index, fast-forward past any steps whose action_key is already present in completed_actions.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 On startup, _reconcile_step_index fast-forwards past all steps whose action_key appears in completed_actions
- [x] #2 After a crash/restart during or after a mission launch, tutorial shows the correct current step (mine_target or later) rather than a previously completed step
- [ ] #3 Existing test coverage validates the reconciliation logic
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
_reconcile_step_index now fast-forwards past steps already in completed_actions after the standard clamp, handling crash/restart/cross-session resume.
<!-- SECTION:NOTES:END -->

