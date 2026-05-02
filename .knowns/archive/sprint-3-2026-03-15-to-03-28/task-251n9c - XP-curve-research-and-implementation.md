---
id: 251n9c
title: XP curve research and implementation
status: done
priority: medium
labels:
  - progression
  - xp
  - balance
createdAt: '2026-03-17T06:47:52.208Z'
updatedAt: '2026-03-18T14:09:15.252Z'
timeSpent: 71
assignee: '@me'
---
# XP curve research and implementation

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Research mobile game XP curves, validate proposed values, implement in AppController.gd. Target: L1-L3 within tutorial arc.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Research: review XP curves from comparable mobile games (Stardew, No Man's Sky, etc.)
- [x] #2 Proposed curve reviewed and approved: L1-L3 achievable in tutorial, each level after progressively harder
- [x] #3 Values implemented in AppController.gd
- [x] #4 Mission XP rewards tuned to match curve (M1=80, M2=120, M3=160, M4=200 base)
- [x] #5 Balance validated in playtest (L3 reached by end of tutorial arc)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
XP formula: floor(100 * 1.5^(level-1)) → L1→L2=100, L2→L3=150, L3→L4=225. Mission XP: {1:80, 2:120, 3:160, 4:200}, free ops=100. Changes: AppController._xp_required_for_level + MissionDebrief XP_BY_MISSION_STAGE dict.
<!-- SECTION:NOTES:END -->

