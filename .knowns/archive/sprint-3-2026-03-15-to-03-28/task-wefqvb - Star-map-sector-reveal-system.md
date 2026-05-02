---
id: wefqvb
title: Star map sector reveal system
status: done
priority: high
labels:
  - star-map
  - ui
  - art
createdAt: '2026-03-17T06:47:51.987Z'
updatedAt: '2026-03-19T03:42:01.349Z'
timeSpent: 318
assignee: '@me'
---
# Star map sector reveal system

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Star map showing solar system (asteroids) vs other star systems (planets). Sector-based fog-of-war reveal. Solar/star icons per system.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Solar system view: asteroids at real positions within our system
- [x] #2 Star systems view: TESS planet candidates at correct star systems
- [x] #3 Sector reveal mechanic (fog of war, expands on visit or scan)
- [ ] #4 Star/solar icons generated for each host star (art task)
- [x] #5 Personal discoveries highlighted distinctly on map
- [x] #6 Star map visible after M1 completion
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
SectorRevealManager.gd: 8 sectors, SECTOR_POSITIONS/NAMES/ADJACENCY constants, get_sector_for_target (hash-based), reveal_for_target (sector + neighbours), is_target_revealed, persists to rockets_state["revealed_sectors"].
SpaceMap.gd: Full rewrite — two view modes (Solar System / Star Systems), toggle buttons, fog-of-war on unrevealed star sectors, personal discoveries highlighted gold (★), legend in both views, programmatic star color by spectral class hash.
MissionDebrief.gd: calls SectorRevealManager.reveal_for_target(target_id) on mission completion.
earth_base_1.gd: star map card shown after completed_count >= 1 (M1 done), not just after scanner station built.
AC#4 (art: star/solar icons) deferred — using programmatic spectral-class colors as placeholder.
<!-- SECTION:NOTES:END -->

