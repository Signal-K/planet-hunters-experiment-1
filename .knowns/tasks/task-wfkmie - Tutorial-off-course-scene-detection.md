---
id: wfkmie
title: 'Tutorial: off-course scene detection'
status: done
priority: medium
labels:
  - project-landnam
  - tutorial
  - ux
  - rule
createdAt: '2026-03-03T12:02:35.617Z'
updatedAt: '2026-03-03T12:02:35.617Z'
timeSpent: 0
---
# Tutorial: off-course scene detection

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Rule: when the player navigates to a scene that is not valid for the current tutorial step, the tutorial panel stays visible but replaces its message with a 'head back to the base' nudge. When the player returns to a valid scene the normal step content is restored automatically.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 TutorialCatalog steps each carry a valid_scenes array (BASE_SCENES, MINING_SCENES, DEBRIEF_SCENES)
- [ ] #2 TutorialCoachOverlay._apply_off_course_check() runs every 0.15s and detects scene mismatch
- [ ] #3 Off-course panel shows redirect message instead of step instructions
- [ ] #4 Panel restores normal content as soon as player returns to a valid scene
- [ ] #5 Step change (tutorial_state_updated) resets off-course flag
<!-- AC:END -->

