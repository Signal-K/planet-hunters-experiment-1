---
title: Rocket and backdrop pixel consistency
createdAt: '2026-03-07T01:25:59.666Z'
updatedAt: '2026-03-07T01:25:59.847Z'
description: >-
  Defines nearest-filter policy and launch/orbit sprite usage for consistent
  pixel look
tags:
  - visuals
  - pixelart
  - rocket
  - backdrop
---
# Rocket and Backdrop Pixel Consistency

## Objective
Keep rocket, structures, and backdrop visuals in the same pixel-art language by avoiding linear blur on scaled sprites.

## Rules
- Backdrop sprites that receive night tint shader must use nearest filtering.
- Rocket animated sprites in active orbit/transport transitions must use nearest filtering.

## Implementation Points
- `EarthSkyNightFilterEvent.gd`: set `texture_filter = NEAREST` on resolved backdrops.
- `RocketSpriteHelper.gd`: set nearest filtering when applying orbit sprites in the retained transport scenes.

## Historical Note
- Until 2026-05-04, launches routed through `rocket_ascent.tscn` / `RocketAscent.gd`, which played a dedicated lift-off scene where the rocket climbed away from Earth and the Earth backdrop faded out before handing off to `rocket_transit.tscn`.
- That ascent/fade sequence has now been removed from the live mission flow. `LaunchpadScene.gd` routes directly to `rocket_transit.tscn`, and the obsolete ascent scene/script were deleted to keep the transport stack limited to the scenes still used at runtime.

## Future Work
- Add optional per-target post-process grain/dither pass while preserving nearest sampling.
