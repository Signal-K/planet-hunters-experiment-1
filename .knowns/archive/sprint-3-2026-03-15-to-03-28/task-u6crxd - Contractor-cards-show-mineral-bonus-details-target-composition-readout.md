---
id: u6crxd
title: 'Contractor cards: show mineral bonus details + target composition readout'
status: done
priority: high
labels:
  - ux
  - contractor
  - missions
createdAt: '2026-03-21T01:38:35.043Z'
updatedAt: '2026-03-21T01:43:12.699Z'
timeSpent: 0
---
# Contractor cards: show mineral bonus details + target composition readout

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
When choosing a contractor, the player needs to see which minerals each contractor pays a premium on so they can pick the best match. When choosing a target, show estimated mineral composition so the player knows what they will mine.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Each contractor card in trip/selector flow shows specific bonus minerals (e.g. 'Nickel +12%, Iron +8%') in amber text
- [x] #2 Each target card in launchpad selector shows procedurally-generated estimated composition (e.g. 'Est: Iron 42%, Nickel 28%, Cobalt 15%, Silicates 15%')
- [x] #3 Composition is deterministic (same target always shows same composition)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Added 'Pays premium: Nickel +12%, Iron +8%' label to each contractor card by cross-referencing SubcontractorManager.SUBCONTRACTORS. Added _estimate_target_composition() helper that deterministically hashes target_id to produce Iron/Nickel + 1 rare mineral percentages. Added comp label in green text under each target card.
<!-- SECTION:NOTES:END -->

