---
id: 8ivyns
title: 'Bug: Spacebar triggers base tour menu and blocks map view'
status: done
priority: high
labels:
  - bug
  - keyboard
  - ui
createdAt: '2026-03-16T03:50:31.834Z'
updatedAt: '2026-03-16T06:49:17.826Z'
timeSpent: 0
---
# Bug: Spacebar triggers base tour menu and blocks map view

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Pressing spacebar opens the quick base tour / menu UI in the bottom left, which overlaps and blocks the map. Keyboard shortcuts should not accidentally trigger UI elements during normal play.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Spacebar does not trigger any menu or tour overlay during map/mission view
- [ ] #2 Menu can only be opened via explicit button press
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Fixed by adding focus_mode = FOCUS_NONE to all nav buttons in earth_base_1.gd _setup_buttons(). Godot's ui_accept (spacebar) was activating focused buttons accidentally.
<!-- SECTION:NOTES:END -->

