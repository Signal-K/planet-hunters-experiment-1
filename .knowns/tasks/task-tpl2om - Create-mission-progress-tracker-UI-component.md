---
id: tpl2om
title: Create mission progress tracker UI component
status: done
priority: low
labels:
  - project-landnam
  - missions
  - ui
  - progress
  - tracking
createdAt: '2026-02-25T08:19:32.510Z'
updatedAt: '2026-02-25T09:56:41.932Z'
timeSpent: 8
assignee: '@me'
---
# Create mission progress tracker UI component

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add persistent UI element showing current mission, completion status, and next objective. Helps players always know where they are in progression. See @doc/specs/mission-system-specification for mission flow.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Progress tracker shows current mission number and stage
- [ ] #2 Displays current objective in mission flow
- [ ] #3 Shows completion percentage or checklist for mission steps
- [ ] #4 Updates in real-time as player progresses
- [ ] #5 Collapsible/expandable to save screen space
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Create MissionProgressTracker UI scene/component
2. Show mission number/stage, objective, and checklist/progress
3. Update in real-time from mission/tutorial state
4. Add collapse/expand toggle for screen space
5. Mount tracker persistently via AppController and validate in tests
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
✓ Implemented MissionProgressTracker component (new scene + script) and mounted it globally from AppController for persistence across scenes. Tracker shows mission number/stage, objective summary, checklist-based completion %, updates live every 0.5s from mission/tutorial state, and includes Hide/Show collapse toggle.
<!-- SECTION:NOTES:END -->

