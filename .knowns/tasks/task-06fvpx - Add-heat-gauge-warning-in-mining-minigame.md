---
id: 06fvpx
title: Add heat gauge warning in mining minigame
status: done
priority: high
labels:
  - project-landnam
  - gameplay
  - mining
  - tutorial
createdAt: '2026-03-09T01:09:32.186Z'
updatedAt: '2026-03-10T05:37:37.168Z'
timeSpent: 0
---
# Add heat gauge warning in mining minigame

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Players who hold FIRE non-stop overheat and get auto-returned without understanding why. The guide teaches SPACE/FIRE=mine but never mentions the Heat gauge (builds 25/s, cools 18/s).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A warning fires when heat first reaches ~50%: 'Heat rising — release FIRE to cool'
- [x] #2 Warning appears inline in the existing guide step instruction label
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
✓ Verified in SidescrollMining.gd: inline guide warning at ~50% heat ('Heat rising — release FIRE to cool').
<!-- SECTION:NOTES:END -->

