---
id: kmqebw
title: XP level-up overlay / celebration
status: done
priority: medium
labels:
  - progression
  - ux
  - shell
createdAt: '2026-03-01T16:16:07.099Z'
updatedAt: '2026-03-01T16:22:18.624Z'
timeSpent: 361
---
# XP level-up overlay / celebration

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
XP is synced to Supabase but level-ups are silent. Show a brief overlay in the React shell when experience_level increases, e.g. 'Level 2 — Longer range unlocked'.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Shell detects experience_level increase from postMessage XP events
- [x] #2 Level-up overlay appears briefly then auto-dismisses
- [x] #3 Overlay text references what the new level unlocks
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Level-up banner renders top-centre, auto-dismisses after 4s. Reads LEVEL_UNLOCK_HINTS map for context text. Detects prevLevel vs new level in XP postMessage handler.
<!-- SECTION:NOTES:END -->

