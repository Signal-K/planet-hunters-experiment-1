---
id: u522ai
title: Show returned rockets in control station + lock save/salvage
status: done
priority: high
labels:
  - ui
  - missions
createdAt: '2026-02-06T06:28:57.383Z'
updatedAt: '2026-02-06T06:32:35.594Z'
timeSpent: 161
assignee: '@me'
---
# Show returned rockets in control station + lock save/salvage

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Returned rockets should remain viewable until scrapped; save/salvage options should appear but be locked (scrap only available).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Control station lists returned rockets until scrapped
- [x] #2 Save/salvage options shown but disabled; scrap still available
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Merge returned rockets from state into control station list
2. Update UI list to avoid duplicates and show returned rockets
3. Lock save/salvage actions while keeping scrap available
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Control station list now includes returned rockets from state.
- Save/salvage buttons are shown but locked; scrap remains available.

## Files
- scene/Scripts/Utils/RocketsManager.gd
- scene/Scripts/UI/ControlStationPanel.gd
- scene/Scripts/Earth/MissionDebrief.gd
<!-- SECTION:NOTES:END -->

