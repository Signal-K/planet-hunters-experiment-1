---
id: 9qghnp
title: Apply discovery bonus to mission payout in debrief
status: done
priority: medium
labels:
  - economy
  - debrief
  - discovery
createdAt: '2026-03-16T21:57:36.120Z'
updatedAt: '2026-03-16T21:59:34.773Z'
timeSpent: 100
assignee: '@me'
---
# Apply discovery bonus to mission payout in debrief

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
RocketsManager.mark_discovery_bonus_claimed() and is_discovery_bonus_claimed() exist, but MissionDebrief._calc_payout() never uses them. Economy doc specifies 10% bonus for visiting a new/unconfirmed target for the first time. Bonus should stack on top of route multiplier and location bonus.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 First visit to any target applies a 10% discovery bonus to gross payout
- [x] #2 Subsequent visits to same target get no discovery bonus
- [x] #3 Debrief shows 'Discovery Bonus +10%' line when bonus applied
- [x] #4 Bonus is marked claimed on first sell so repeat visits get no bonus
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
DISCOVERY_BONUS_MULT=1.10 added to MissionDebrief. _discovery_bonus_unclaimed set in _ready() via RocketsManager.has_discovery_bonus_claimed(). Applied in _calc_payout() before contractor/order/affinity bonuses. Status label shows 'Discovery Bonus +10%' when applicable. Claimed on _sell(). MECH21-23 tests pass.
<!-- SECTION:NOTES:END -->

