---
id: f7qkcm
title: Rocket second stage sprite in preview scene
status: done
priority: medium
labels:
  - Sprites
  - Rockets
  - Preview
createdAt: '2026-02-04T09:11:46.047Z'
updatedAt: '2026-02-04T09:21:06.092Z'
timeSpent: 362
assignee: '@me'
parent: 0x09aq
---
# Rocket second stage sprite in preview scene

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Locate the preview scene + rocket selection logic tied to starterrocket1.
2. Inspect the 8 stage-2 frame PNGs and batch-crop transparent padding consistently.
3. Update preview scene to use the stage-2 animated frames for starterrocket1 and verify alignment.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Cropped StarterRocketStage2Frame1-8 to a shared 112x521 bbox to reduce padding.
- Orbit preview now uses AnimatedSprite2D with stage-2 animation for starterrocket1; other rockets use a static frame.
<!-- SECTION:NOTES:END -->

