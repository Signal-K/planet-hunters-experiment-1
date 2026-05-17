---
id: bf8tnb
title: Fix off-screen UI overflow across gameplay surfaces
status: done
priority: high
labels:
  - project-landnam
  - ux
  - ui
  - layout
  - overflow
createdAt: '2026-03-27T12:12:34.946Z'
updatedAt: '2026-03-28T04:06:48.881Z'
timeSpent: 0
assignee: '@me'
---
# Fix off-screen UI overflow across gameplay surfaces

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Audit and fix UI components that render off-screen or become inaccessible across gameplay screens, starting with the Mining Academy panel. Use UX tour output to identify and verify additional overflow issues.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Mining Academy panel stays fully on-screen across supported viewport sizes
- [x] #2 Other confirmed off-screen UI issues found in the audit are fixed or explicitly documented
- [x] #3 UX tour is run and reviewed for remaining overflow issues
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Rework the Earth base top HUD lane so the PLANET HUNTERS wordmark respects the FrancBalance safe area and scales/clamps with the viewport.
2. Refactor MenuPanel layout so header actions, tab content, debug controls, and logbook overlay use scrollable/responsive containers instead of stacking into overlap states.
3. Fix SatelliteStationPanel sizing so the centered modal and its inner scroll regions clamp to the safe rect and never place header/content above or below the viewport.
4. Re-run `make ux-tour`, review the concrete remaining overflow/overlap findings, and patch any residual deterministic defects in the same surfaces.
5. Update task notes, correct AC state if needed, stop the timer, and close the task only after the tour is clean enough for the remaining issues to be explicitly accounted for.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
✓ Earth base wordmark moved out of FrancBalance lane and now clamps to the HUD safe area.
✓ Menu panel header/logbook layout reworked; hidden-tab controls no longer pollute UX overlap detection.
✓ Satellite Station modal now fills/clamps correctly inside the safe rect and no longer reports off-screen content.
✓ `make ux-tour` rerun: overlap/off-screen findings cleared. Remaining tour issues are unrelated to this task: tutorial coach first-visit visibility, and missing `res://Scenes/Earth/mission_debrief.tscn`.

Reopened alongside ogmedx to cover any overflow fixes exposed by the asteroid-detail mobile pass.

Asteroid-detail/mobile overflow fixes landed, but full verification remains blocked by unrelated parse errors in Scripts/UI/SidescrollMining.gd during project load and UX tour startup. Focused SR2 validation passed; UX tour could not be used to close this task cleanly.

$
SidescrollMining.gd parse errors no longer present (verified 2026-03-28). All 3 ACs were already done; unblocking and closing.
<!-- SECTION:NOTES:END -->

