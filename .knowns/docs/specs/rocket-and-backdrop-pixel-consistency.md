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
- Rocket animated sprites in orbit/ascent transitions must use nearest filtering.
- Launch sequence uses dedicated launch sprite-sheet frames for Starter Rocket 1.

## Implementation Points
- `EarthSkyNightFilterEvent.gd`: set `texture_filter = NEAREST` on resolved backdrops.
- `RocketSpriteHelper.gd`: set nearest filtering when applying orbit/launch sprite frames.
- `RocketAscent.gd`: use `AnimatedSprite2D` launch sprite path + nearest-filtered Earth backdrop sprite.

## Future Work
- Add optional per-target post-process grain/dither pass while preserving nearest sampling.
