---
id: 37wan4
title: Update background or rocket - change pixelation
status: done
priority: medium
labels:
  - project-landnam
  - styling
  - assets
  - pixelart
  - rockets
  - background
  - backdrop
  - art
  - from-feedback
createdAt: '2026-02-16T22:26:13.000Z'
updatedAt: '2026-03-07T01:26:07.632Z'
timeSpent: 19
assignee: '@me'
---
# Update background or rocket - change pixelation

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
According to @Tom, there is a discrepancy between the quality of the background and the quality of the foreground objects (specifically, the rocket). Tom is currently investigating. See @doc/dev/nebula-theme-implementation for current visual design.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Enforce nearest filtering for Earth backdrop shader path and rocket animated sprites
2. Ensure launch/ascent path uses same pixel-art filtering as mining and structures
3. Validate Earth + ascent scenes load with updated visual settings
4. Close review ticket with notes
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
✓ Enforced nearest filtering for Earth backdrops via EarthSkyNightFilterEvent and rocket animated sprites via RocketSpriteHelper; updated RocketAscent Earth sprite filtering to match pixel-art foreground quality.
<!-- SECTION:NOTES:END -->

