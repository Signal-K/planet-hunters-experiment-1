---
id: 8f1dx7
title: Tutorial panel hides entirely when it cannot find a zero-overlap position
status: done
priority: medium
labels:
  - project-landnam
  - tutorial
  - bug
  - layout
  - ui
createdAt: '2026-02-28T04:27:30.256Z'
updatedAt: '2026-02-28T07:06:48.779Z'
timeSpent: 0
---
# Tutorial panel hides entirely when it cannot find a zero-overlap position

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
In TutorialCoachOverlay._reposition_panel(), if best_overlap > 0.0, the code sets panel.visible = false and returns. This means in crowded UI scenes (e.g. launchpad with selector panel open and rockets visible), the tutorial panel can disappear entirely even though there is a valid nearby position that merely partially overlaps. Users lose the tutorial guidance with no indication it exists. Fix: always show the panel (possibly with reduced alpha or in a fallback corner), or choose the candidate with minimum overlap rather than hiding outright.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Tutorial panel always remains visible even when all candidate positions have some overlap
- [x] #2 In crowded scenes, panel is placed at the position with minimum overlap rather than hidden
- [x] #3 No regression: panel still avoids target UI elements where possible
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Removed the hide-on-overlap branch in _reposition_panel. Panel always shows at the minimum-overlap candidate position.
<!-- SECTION:NOTES:END -->

