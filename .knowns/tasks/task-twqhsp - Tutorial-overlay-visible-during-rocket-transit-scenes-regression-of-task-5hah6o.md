---
id: twqhsp
title: >-
  Tutorial overlay visible during rocket transit scenes (regression of task
  5hah6o)
status: done
priority: high
labels:
  - project-landnam
  - tutorial
  - bug
  - regression
  - transit
  - scenes
createdAt: '2026-02-28T04:23:10.593Z'
updatedAt: '2026-02-28T07:06:48.538Z'
timeSpent: 0
---
# Tutorial overlay visible during rocket transit scenes (regression of task 5hah6o)

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Task 5hah6o claimed 'Tutorial panel now stays hidden in transit scenes (rocket_transit and rocket_return)' but TutorialCoachOverlay.gd contains no scene-detection or transit-suppression logic. The overlay relies entirely on step.is_empty() to hide, which only triggers when all steps are done. The screenshot confirms the tutorial panel is visible and showing the wrong step (Select Target) while the rocket is en route. The AppController._set_tutorial_overlay_suspended() method exists for the menu panel but is never called for transit scenes. Fix: detect when the current scene is a transit scene (rocket_transit, rocket_return, outbound_preview, return_preview) and suspend the overlay, resuming it when returning to earth/asteroid scenes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Tutorial overlay is hidden when the active scene is a rocket transit or return transit scene
- [x] #2 Tutorial overlay resumes and shows the correct current step when the player returns to an actionable scene (earth launchpad, asteroid)
- [x] #3 No regression: overlay still shows correctly during earth and asteroid scenes
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
TutorialCoachOverlay now self-detects rocket_transit and rocket_return scene basenames in _process via _apply_transit_suppression(). Hides on enter, refreshes on exit.
<!-- SECTION:NOTES:END -->

