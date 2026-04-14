---
id: lhysnf
title: 'Feedback pass: spacing, mining beam, and Mars background polish'
status: done
priority: high
labels:
  - ui
  - feedback
  - mining
  - visual-polish
createdAt: '2026-03-06T06:53:41.688Z'
updatedAt: '2026-03-06T07:18:48.214Z'
timeSpent: 674
assignee: '@me'
---
# Feedback pass: spacing, mining beam, and Mars background polish

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement user feedback from latest review while preserving current color palette, fonts, and rocket/mineral animations.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Core UI spacing is visually consistent across key gameplay screens
- [x] #2 Mining beam reads as a beam effect (not a straight line)
- [x] #3 Mining scene includes a 2D pixelated Mars background
- [ ] #4 Procedural mining background visually matches Mars-style reference (planet disc, layered mountains, atmospheric haze/clouds)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Rework Mars palette + sky layering in SidescrollMining background generator to match reference tone (golden upper sky, red-orange mid, dusty lower atmosphere).
2. Replace current small sun with a large semi-transparent planet disc and subtle banding/noise overlays to match the focal style from reference image.
3. Replace mesa-strip horizon with layered jagged mountain silhouettes (far/mid/near) and atmospheric haze/cloud wisps crossing both sky and planet.
4. Add sparse stylized foreground accents (small red shrubs/patches) above ground horizon to approximate the illustrated pixel-art depth cues.
5. Verify viewport scaling + performance (no per-frame regeneration), run tests, then update AC/notes and close task.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Updated mining procedural background to asteroid-tone palette with reference-style composition: large translucent planet disc, layered jagged ridges, haze/cloud streaks, and pixel-texture pass with stylized foreground flora accents.
<!-- SECTION:NOTES:END -->

