---
id: iie4nj
title: Personal discoveries log (day 1)
status: done
priority: high
labels:
  - project-landnam
  - ui
  - citizen-science
  - star-map
createdAt: '2026-03-17T06:47:35.619Z'
updatedAt: '2026-03-18T14:20:26.340Z'
timeSpent: 254
assignee: '@me'
---
# Personal discoveries log (day 1)

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Player profile/star map screen showing all personally discovered targets with name attribution. Required from day 1.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Accessible from star map or player profile from day 1
- [x] #2 Shows: target name/ID, date discovered, classification status, player name attached
- [x] #3 Visually distinct from visited-only targets
- [x] #4 Works when empty (starts sparse, grows with player)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Added 'Discoveries' button to GameNavigationMenu header. _build_discoveries_overlay() + _get_personal_discoveries() show targets from mission log where discovery_bonus_claimed. Sorted newest-first, planet/asteroid icons, date + badge. MissionDebrief now logs target_type to enable icon. Empty state shown when no discoveries.
<!-- SECTION:NOTES:END -->

