---
title: Earth weather + skymap layering
createdAt: '2026-03-07T01:23:30.991Z'
updatedAt: '2026-03-07T01:23:31.165Z'
description: >-
  Layer order and behavior for weather cycle, skymap, clouds, and night tint
  across Earth scenes
tags:
  - earth
  - weather
  - skymap
  - visuals
---
# Earth Weather + Skymap Layering

## Scope
Defines Earth scene environment layering and day/night response for base-adjacent screens.

## Layer Stack
1. Backdrop sprites (Earth background)
2. Night tint filter (shader-based)
3. Star field event
4. Sky map event (constellation lines + anchor stars)
5. Cloud drift event

## Day/Night Behavior
- Weather engine drives `night_factor` from 0.0 to 1.0.
- Stars and skymap become visible only as night increases.
- Cloud layer remains visible day/night but fades at night.

## Pixel-Art Consistency
- Backdrop sprites use nearest filtering to avoid soft blur against pixel foreground elements.

## Follow-up
- Add per-season weather profiles and occasional transient events (storms, aurora, meteors).
