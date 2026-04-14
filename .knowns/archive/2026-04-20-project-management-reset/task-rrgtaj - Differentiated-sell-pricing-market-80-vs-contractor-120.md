---
id: rrgtaj
title: 'Differentiated sell pricing: market (80%) vs contractor (120%)'
status: done
priority: medium
labels:
  - economy
  - gameplay
  - debrief
createdAt: '2026-03-16T17:51:39.175Z'
updatedAt: '2026-03-16T21:23:37.380Z'
timeSpent: 12624
assignee: '@me'
---
# Differentiated sell pricing: market (80%) vs contractor (120%)

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Economy doc specifies two distinct sell paths. Sell to market = 80% of base market price. Sell to contractor = ~120% of base market price (with affinity bonus on top). Current debrief has a single payout path with contractor bonus but no market/contractor pricing distinction.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Debrief shows two sell options: 'Sell to Market' and 'Sell to Contractor' (when on contract route)
- [x] #2 Market sell yields 80% of base mineral value
- [x] #3 Contractor sell yields ~120% of base mineral value (plus existing affinity bonus)
- [x] #4 Survey route only shows 'Sell to Market' option
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
MissionDebrief.gd: added CONTRACTOR_ROUTE_MULT=1.2 and MARKET_ROUTE_MULT=0.8. _operation_mode read from returned mission. _calc_payout now applies route mult before location mult. Survey route skips order+affinity bonuses and skips contractor affinity recording. Button labels update per route. Status text shows route context.
<!-- SECTION:NOTES:END -->

