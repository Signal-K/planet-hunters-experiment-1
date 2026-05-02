---
id: yh2cln
title: >-
  Award 2 XP for mission completion and affinity improvement to unblock M1→M2
  progression
status: done
priority: high
labels:
  - gameplay
  - progression
  - xp
createdAt: '2026-03-09T01:09:29.537Z'
updatedAt: '2026-03-09T01:35:49.763Z'
timeSpent: 204
assignee: '@me'
---
# Award 2 XP for mission completion and affinity improvement to unblock M1→M2 progression

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
After M1, players have 9/11 XP needed for Level 2. Award +1 XP on mission completion and +1 XP on affinity improvement to bridge the gap without changing the level threshold.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Player reaches Level 2 after completing M1 normally
- [x] #2 XP is awarded on debrief completion and affinity improvement events
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Fixed double exposure bug (was 4+4=8 XP, now 4 only from ship step). Added +1 XP on affinity gain in _sell() and starter contract path. Added +1 XP on mission_completion in all three ship resolution methods (_scrap_ship, _leave_in_orbit, _archive_ship). M1 path: 5 launch + 2 scan + 1 affinity + 1 completion + 4 exposure = 13 XP → Level 2.
<!-- SECTION:NOTES:END -->

