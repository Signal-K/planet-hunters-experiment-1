---
id: 7c58pt
title: Scanner range increase at Level 8
status: done
priority: low
labels:
  - project-landnam
  - gameplay
  - scanner
  - progression
createdAt: '2026-03-16T17:52:22.220Z'
updatedAt: '2026-03-16T21:38:25.121Z'
timeSpent: 0
assignee: '@me'
---
# Scanner range increase at Level 8

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Level progression doc specifies: at Level 8, scanner range increases (measured in light-years). Relay stations amplify this base increase further. Entry point: SatelliteStationPanel.gd or scanner target filtering.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Scanner range is extended at Level 8 (more distant targets become visible/selectable)
- [x] #2 Scanner UI shows range indicator that updates when L8 is reached
- [x] #3 Relay stations provide additional multiplier on top of the L8 base increase (stub OK for now)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
SCANNER_RANGE_UNLOCK_LEVEL=8 added to SatelliteStationPanel. has_extended_scanner_range() and get_scanner_range_label() implemented. Status labels updated with range note at L8. Relay station multiplier stubbed (AC3 fulfilled as stub per task). MECH19-20 pass.
<!-- SECTION:NOTES:END -->

