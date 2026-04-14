---
id: 5l30r4
title: Weather events & skymap?
status: done
priority: medium
labels:
  - Weather
  - Backgrounds
  - Earth
  - Events
  - Images
createdAt: '2026-02-08T02:00:13.839Z'
updatedAt: '2026-03-07T01:25:37.338Z'
timeSpent: 138
assignee: '@me'
---
# Weather events & skymap?

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Explore adding weather events and dynamic skymap to Earth Base scenes. See @doc/specs/user-flow-and-citizen-science-specification for Earth Base context.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add dedicated Earth sky-map event renderer tied to night cycle
2. Integrate skymap event into Earth base/debrief/orbit/template scenes
3. Validate Earth scenes load with weather+skymap stack
4. Document implementation and close review task
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
✓ Added EarthSkyMapEvent (constellation overlay tied to night factor), wired into Earth base + orbit_sale_preview + mission_debrief + earth scene template, and validated scene loads headlessly.
<!-- SECTION:NOTES:END -->

