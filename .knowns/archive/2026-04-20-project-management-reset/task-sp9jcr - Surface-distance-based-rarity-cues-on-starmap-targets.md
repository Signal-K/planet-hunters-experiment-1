---
id: sp9jcr
title: Surface distance-based rarity cues on starmap targets
status: done
priority: medium
labels:
  - star-map
  - economy
  - ui
createdAt: '2026-03-26T09:47:46.015Z'
updatedAt: '2026-03-28T04:06:43.019Z'
timeSpent: 0
assignee: '@me'
parent: ls9pkd
---
# Surface distance-based rarity cues on starmap targets

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Follow-up from @task-kh8gvl notebook reminders. The note ties farther-out targets to higher concentrations of rare minerals; surface that relationship on the map so route choice communicates resource upside before launch.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Map exposes a visible rarity / richness cue per target
- [x] #2 Cue is derived from target distance or target profile data, not hard-coded labels
- [x] #3 Players can distinguish safer close targets from higher-value distant targets at a glance
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Distance-based rarity cues implemented in LaunchpadStarMap.gd.
- _rarity_tier(distance_au): 0 = standard (< 5 AU), 1 = mid-yield amber (5-12 AU), 2 = high-yield gold (12+ AU)
- Tier-aware colors replace flat ASTEROID_COLOR for non-blocked targets
- Amber/gold glow ring drawn behind high-tier markers
- "HIGH YIELD" text label below target name for tier-2 targets
- Tests: run_starmap_enhancement_tests.gd (3 sp9jcr tests pass)
<!-- SECTION:NOTES:END -->

