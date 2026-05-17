---
id: awmju4
title: 'Expand starmap target layout for belts, planets, and other systems'
status: done
priority: medium
labels:
  - project-landnam
  - star-map
  - launchpad
  - ui
createdAt: '2026-03-26T09:47:46.015Z'
updatedAt: '2026-03-28T04:06:25.600Z'
timeSpent: 6618
assignee: '@me'
parent: ls9pkd
---
# Expand starmap target layout for belts, planets, and other systems

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Follow-up from @task-kh8gvl notebook reminders. Grow the current star map beyond the first-pass picker so it can represent asteroid belt / Kuiper belt groupings, solar-system planets, and future expandable rings / other systems without redoing the interaction model.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Target layout model supports separate belt / ring groupings
- [x] #2 Solar-system planets can be rendered alongside mining targets
- [x] #3 Map layout can be expanded to additional systems without replacing current picker flow
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Belt groupings, solar system reference planets, and expandable layout implemented in LaunchpadStarMap.gd.
- Asteroids placed on rings 0-3 based on distance_au (< 2.5 / 2.5-5 / 5-12 / 12+ AU)
- Faint belt band shading for Inner Belt and Main Belt zones
- Mars and Jupiter reference markers at AU-accurate positions using _au_px_scale
- belt_ring field on each asteroid marker; outer-systems panel unchanged for TESS
- Tests: run_starmap_enhancement_tests.gd (10/10 pass)
<!-- SECTION:NOTES:END -->

