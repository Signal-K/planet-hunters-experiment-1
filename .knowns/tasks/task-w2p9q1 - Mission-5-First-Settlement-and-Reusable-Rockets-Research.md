---
id: w2p9q1
title: 'Mission 5: First Settlement and Reusable Rockets Research'
status: done
priority: high
labels:
  - gameplay
  - progression
  - mission
createdAt: '2026-03-12T00:00:00.000Z'
updatedAt: '2026-03-19T03:55:13.992Z'
timeSpent: 346
assignee: '@me'
---
# Mission 5: First Settlement and Reusable Rockets Research

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Introduce the first construction-focused mission (Mission 5) and the concept of reusable rocket research to reduce operational costs.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 First Settlement guidance shown in launchpad at L5+ for construction-focused missions
- [x] #2 Reusable Rockets Research system with 3 tiers (10/20/30% cost reduction)
- [x] #3 Research UI in menu at L5+
- [x] #4 Research cost applies to all rocket launches via get_trip_purchase_cost()
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Design decision
Design pivoted away from authored M5 — authoring ends at M4, then Free Operations. Implemented M5 concepts within Free Ops framework.

## Implemented
1. First Settlement guidance: LaunchpadSelectorPanel shows green hint at L5+ in Free Ops if relay_1 construction not yet complete ("mine Iron 500kg + Nickel 200kg")
2. Reusable Rockets Research: RocketsManager.get/set_reusable_research_tier(), REUSABLE_RESEARCH_UPGRADE_COSTS, get_reusable_research_cost_mult(). Applied in get_trip_purchase_cost(). Tiers: 1=500M/10%off, 2=2B/20%off, 3=5B/30%off.
3. Research UI card in GameNavigationMenu at L5+ (ROCKET RESEARCH section).
4. MechanicIntroCatalog entry "reusable_research" + FirstTimeMechanicTracker trigger on first card open.
<!-- SECTION:NOTES:END -->

