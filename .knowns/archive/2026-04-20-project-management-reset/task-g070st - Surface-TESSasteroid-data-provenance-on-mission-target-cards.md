---
id: g070st
title: Surface TESS/asteroid data provenance on mission target cards
status: done
priority: high
labels:
  - ux
  - citizen-science
  - target-selection
createdAt: '2026-03-08T02:33:07.676Z'
updatedAt: '2026-03-10T05:37:37.182Z'
timeSpent: 0
---
# Surface TESS/asteroid data provenance on mission target cards

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Targets come from real TESS exoplanet candidates and asteroid catalogues but this is invisible. The science hook - the game's primary differentiator - is never shown to the player during target selection.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Target card shows the real catalogue source (e.g. TESS candidate, MPC asteroid)
- [x] #2 A one-line science context blurb appears on the target card (e.g. detected by NASA TESS in 2022)
- [x] #3 The science context is also shown briefly during space transit to reinforce the connection
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
✓ Verified: Launchpad target cards include science_source/science_blurb; outbound transit shows science context caption for selected target.
<!-- SECTION:NOTES:END -->

