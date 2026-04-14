---
id: otl8du
title: Fix mining scene popup obscured by drone drop zone
status: done
priority: high
labels:
  - ux
  - bug
  - mining
  - mobile
createdAt: '2026-03-01T10:21:22.985Z'
updatedAt: '2026-03-01T11:51:30.638Z'
timeSpent: 0
---
# Fix mining scene popup obscured by drone drop zone

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Tester feedback: 'The mining was interesting, but the mission popup is directly under where the drones drop, so its hard to tell whats happening.' The tutorial/info panel overlaps the drone animation area during mining. Reposition the panel to not conflict with the drone drop zone.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Tutorial/info panel does not overlap the drone drop animation area during mining
- [ ] #2 Player can see both the drone dropping and the mission info simultaneously
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Two fixes: (1) TutorialCoachTargeting mine_target now searches UI/FireButton as fallback so the panel repositions correctly during mining. (2) SidescrollMining Instructions label moved from offset_top=100 to offset_top=200, below the drone drop zone.
<!-- SECTION:NOTES:END -->

