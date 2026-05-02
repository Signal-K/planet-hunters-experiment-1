---
id: sx6soe
title: Apply 10% Francs bonus + extra XP for pre-classified TESS discoveries
status: done
priority: high
labels:
  - citizen-science
  - rewards
  - tess
createdAt: '2026-03-09T08:44:30.479Z'
updatedAt: '2026-03-09T08:57:37.618Z'
timeSpent: 19
assignee: '@me'
---
# Apply 10% Francs bonus + extra XP for pre-classified TESS discoveries

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
If a player classified a TESS PC target as 'planet' before visiting it, they should earn a 10% Francs bonus and extra XP at mission debrief. This rewards the citizen science loop.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 MissionDebrief checks RocketsManager for a 'planet' classification on the returned mission target
- [x] #2 If found, net payout is multiplied by 1.1 (10% bonus)
- [x] #3 add_experience is called once extra with reason 'tess_discovery'
- [x] #4 Debrief status text includes 'Discovery bonus: +10% applied' so player knows why
- [x] #5 Bonus only triggers once per target (cleared after debrief)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- MissionDebrief._sell(): after calibrate_onboarding_payout, checks get_tess_classification(target_id)
- If verdict=="planet": net+=int(net*0.1), discovery_bonus=true, clear_tess_classification(target_id)
- add_experience(1, "tess_discovery") called on app controller
- Status text includes "Includes +10% discovery bonus for classifying this TESS target\!"
<!-- SECTION:NOTES:END -->

