---
id: dxw2mx
title: Unify tutorial UI into single linear flow
status: done
priority: high
labels:
  - project-landnam
  - tutorial
  - ui
  - cleanup
createdAt: '2026-03-14T04:01:27.304Z'
updatedAt: '2026-03-14T04:02:09.070Z'
timeSpent: 0
assignee: '@me'
---
# Unify tutorial UI into single linear flow

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Remove overlapping guidance surfaces so active tutorial uses one authoritative overlay and no duplicate mission guidance cards/trackers.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Progression cards do not render while tutorial has an active step
- [x] #2 Launchpad mission guidance overlay is suppressed during active tutorial
- [x] #3 Mission progress tracker does not display during linear tutorial progression
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Identify all concurrently-rendered tutorial/guidance surfaces.
2. Keep TutorialCoachOverlay as the single active tutorial surface during non-skipped tutorial flow.
3. Suppress secondary guidance surfaces (base progression cards, launchpad mission guidance overlay, mission progress tracker) while tutorial has an active step.
4. Keep post-tutorial helper surfaces available after skip/free-ops unlock.
5. Validate by inspecting overlap conditions in affected scenes.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Suppressed Earth base progression cards while tutorial has an active step to prevent parallel guidance overlays.
- Suppressed Launchpad mission guidance overlay during active tutorial steps and auto-clears it if tutorial state becomes active.
- MissionProgressTracker now stays hidden during linear tutorial progression and only appears after tutorial skip or Free Operations unlock.

## Validation
- Static validation only in this run (script-level checks + diff inspection).
- Full Godot runtime test execution is still blocked in this environment by existing logger crash (`user://logs` open failure).
<!-- SECTION:NOTES:END -->

