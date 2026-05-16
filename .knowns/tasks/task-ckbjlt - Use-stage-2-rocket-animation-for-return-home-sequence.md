---
id: ckbjlt
title: Use stage-2 rocket animation for return-home sequence
status: done
priority: medium
labels:
  - project-landnam
  - bug
  - animation
  - ux
createdAt: '2026-02-27T06:42:59.962Z'
updatedAt: '2026-02-27T08:44:44.281Z'
timeSpent: 285
assignee: '@me'
---
# Use stage-2 rocket animation for return-home sequence

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Return-home scene currently appears to use the wrong animation. It should use the second-stage rocket animation and improve visual continuity during return path transitions.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Return-home sequence uses the same second-stage rocket animation asset expected for post-mining return
- [x] #2 Transitions between return path points are visually smooth with no abrupt jumps
- [x] #3 Behavior is verified in-game for a full launch-mine-return loop
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Ensure return flow persists returned mission context (rocket_id, target_id, label, type) before entering return/debrief scenes.
2. Update return transition motion to interpolate departure path smoothly (no abrupt snap between orbit and travel center point).
3. Keep stage-2 orbit sprite behavior deterministic in return scene by using persisted mission rocket_id and existing RocketSpriteHelper stage-2 frames.
4. Validate by scripted checks (YAML/lint-equivalent where possible) and targeted Godot tests for return preview/debrief flow if runnable.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
⚠️ Local Godot headless test run blocked by engine crash on user://logs open; AC #3 pending manual in-game verification on target runtime.

Closed and moved to done per user request (2026-02-27).
<!-- SECTION:NOTES:END -->

