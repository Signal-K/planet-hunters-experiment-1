---
id: v4zqhe
title: Add return to Earth button in mining minigame
status: done
priority: high
labels:
  - project-landnam
  - mining
  - ux
  - navigation
createdAt: '2026-02-25T03:09:21.877Z'
updatedAt: '2026-02-25T03:10:36.115Z'
timeSpent: 68
assignee: '@me'
---
# Add return to Earth button in mining minigame

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Allow players to exit mining early by pressing a button that returns them to the main game loop (preview scene). Should work when fuel runs out or player wants to leave early.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Return button visible in mining UI
- [x] #2 Button exits minigame and returns to preview
- [x] #3 Works when fuel depleted
- [x] #4 Works when player chooses to leave early
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Added RETURN TO EARTH button (bottom-right). Connects to _on_return_pressed() which calls _complete_mining() to emit mining_completed signal. Preview scene already handles this signal. Button turns red with 'FUEL DEPLETED' text when fuel reaches 0. Works for early exit or fuel depletion.
<!-- SECTION:NOTES:END -->

