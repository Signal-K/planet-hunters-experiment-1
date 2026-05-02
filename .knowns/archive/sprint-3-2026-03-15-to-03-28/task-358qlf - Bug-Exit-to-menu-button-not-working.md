---
id: 358qlf
title: 'Bug: Exit to menu button not working'
status: done
priority: high
labels:
  - bug
  - ui
  - navigation
createdAt: '2026-03-16T03:50:57.632Z'
updatedAt: '2026-03-16T06:49:28.590Z'
timeSpent: 0
---
# Bug: Exit to menu button not working

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The Exit to Menu button in the game does not function — pressing it has no effect or fails silently. Player cannot return to the main menu.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Exit to Menu button navigates the player back to the main menu
- [ ] #2 Button responds visually to press (hover/active state)
- [ ] #3 No errors in console when button is pressed
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Fixed: back_button.pressed.connect(_return_to_base) moved before the _returned.is_empty() early-return in MissionDebrief._ready(). Previously the button was enabled but unconnected in the empty state.
<!-- SECTION:NOTES:END -->

