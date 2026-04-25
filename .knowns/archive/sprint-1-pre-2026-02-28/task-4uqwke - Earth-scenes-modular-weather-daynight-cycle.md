---
id: 4uqwke
title: 'Earth scenes: modular weather + day/night cycle'
status: done
priority: high
labels:
  - godot
  - earth
  - weather
  - day-night
  - visuals
createdAt: '2026-02-26T00:59:09.082Z'
updatedAt: '2026-02-27T08:47:54.606Z'
timeSpent: 1999
assignee: '@me'
---
# Earth scenes: modular weather + day/night cycle

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement a reusable Earth environment system that supports a 60-second day/night loop, sky darkening on Earth1/Earth backdrop sprites, star overlays at night, and expandable weather events for Earth scenes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Earth scenes using Earth1 backdrop shift from day to night over a 60-second cycle
- [x] #2 Sky region is darkened at night while preserving non-sky background details
- [x] #3 Night visuals include star effects
- [x] #4 Weather system supports modular event registration and extension
- [x] #5 Implementation notes document where the system is integrated
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Build reusable Earth weather engine node with 60s cycle state, extensible event registration, and scene-safe lifecycle hooks.
2. Add Earth backdrop night visual pipeline: sky-selective darkening filter based on blue sky tones + synchronized star overlay fade.
3. Add modular weather event(s) (initial cloud drift) managed by engine and configurable per scene.
4. Integrate into Earth scenes using Earth1/EarthBackdrop nodes (earth_base_1, mission_debrief, orbit_sale_preview), keeping scene scripts minimal.
5. Run Godot headless checks/tests that are practical in this repo and document implementation notes in the knowns task.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Added modular Earth environment engine with 60s day/night cycle (`EarthWeatherEngine.gd`).
- Added sky-selective night shader filter for Earth backdrop sky regions (`earth_sky_night_filter.gdshader`) and wiring event (`EarthSkyNightFilterEvent.gd`).
- Added starfield event with night fade/twinkle (`EarthStarFieldEvent.gd`).
- Added cloud drift weather event (`EarthCloudDriftEvent.gd`).
- Integrated environment nodes into Earth scenes: `earth_scene_template.tscn`, `earth_base_1.tscn`, `mission_debrief.tscn`, `orbit_sale_preview.tscn`.

## Validation
- Did not run further Godot runtime tests per user request after repeated sandbox/headless crash in logger initialization (`user://logs/...`).
- Changes are implemented and wired; runtime verification should be done in local non-sandbox editor/runtime.

Completed and moved to done per user request (2026-02-27).
<!-- SECTION:NOTES:END -->

