---
id: 87z5ex
title: >-
  Planet Hunters visual identity: Earth base hub branding and star field
  background
status: done
priority: high
labels:
  - project-landnam
  - visual-polish
  - branding
  - earth-base
  - experiment1
createdAt: '2026-02-28T09:48:11.636Z'
updatedAt: '2026-02-28T10:04:04.432Z'
timeSpent: 128
---
# Planet Hunters visual identity: Earth base hub branding and star field background

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The main hub (earth_base_1.tscn / earth_launchpad.tscn) has no Planet Hunters identity. There is no wordmark, no star field, nothing that says 'you are in a sci-fi citizen science game'. This hurts first impressions significantly given the 'looks good' requirement. Needs to feel like a space game, not a generic top-down base.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Planet Hunters wordmark visible on the main Earth base hub
- [x] #2 Star field visible in the sky/background (can reuse earth_sky_night_filter.gdshader or EarthStarFieldEvent)
- [x] #3 Consistent visual palette — dark navy/space tones with the Nebula UI style
- [x] #4 No new external assets required — use existing shaders, sprites, procedural generation
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Wordmark label added to UILayer top-center, 15px blue-tinted text. Ambient 55-star field added via CanvasLayer layer=-1 (screen-fixed, always visible). EarthStarFieldEvent already present for night stars.
<!-- SECTION:NOTES:END -->

