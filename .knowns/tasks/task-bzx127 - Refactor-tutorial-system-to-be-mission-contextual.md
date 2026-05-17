---
id: bzx127
title: Refactor tutorial system to be mission-contextual
status: done
priority: medium
labels:
  - project-landnam
  - tutorial
  - refactor
  - missions
  - ux
createdAt: '2026-02-25T08:19:32.059Z'
updatedAt: '2026-02-25T09:52:47.864Z'
timeSpent: 0
---
# Refactor tutorial system to be mission-contextual

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Refactor tutorial system to show contextual guidance based on current mission stage and player location. Tutorial should adapt to where player is in mission progression. See @doc/specs/mission-system-specification for mission stages.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Tutorial steps grouped by mission stage (M1-M5)
- [x] #2 Tutorial shows only relevant steps for current mission
- [x] #3 Tutorial adapts instruction text based on scene and mission context
- [x] #4 Tutorial can be dismissed per-mission rather than globally
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add mission-stage tutorial grouping (M1-M5 mappings)
2. Filter tutorial steps by current mission stage and scene context
3. Add per-mission dismissal state (instead of single global dismiss)
4. Update tutorial panel UI text generation with mission-context wording
5. Run experience tests and close task
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
✓ Tutorial now mission-contextual: added M1-M5 stage step group mapping in TutorialPanel, mission-specific instruction variants, and active-step filtering to only show steps relevant to current mission stage. Added per-mission dismiss support in AppController (dismiss/is_dismissed/get_current_mission_stage) and wired Skip to dismiss current mission only.
<!-- SECTION:NOTES:END -->

