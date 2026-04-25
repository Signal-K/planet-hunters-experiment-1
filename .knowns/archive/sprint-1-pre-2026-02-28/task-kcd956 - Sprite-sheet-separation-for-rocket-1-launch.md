---
id: kcd956
title: Sprite sheet separation for rocket 1 launch
status: done
priority: medium
labels:
  - Rocket
  - Rockets
  - Sprites
  - Animations
createdAt: '2026-01-25T01:38:13.782Z'
updatedAt: '2026-03-07T01:26:28.605Z'
timeSpent: 10
assignee: '@me'
parent: mzl2k8
---
# Sprite sheet separation for rocket 1 launch

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Separate rocket 1 sprite sheet for launch animations. See @doc/dev/nebula-theme-implementation for visual design context.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Build dedicated Starter Rocket 1 launch animation frames from launch sprite sheet
2. Expose launch sprite API in RocketSpriteHelper and use it in RocketAscent
3. Keep orbit/other rockets on existing stage-2/static pipeline
4. Validate ascent scene loads and close task
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
✓ Added dedicated launch sprite-sheet pipeline in RocketSpriteHelper (StarterRocket1LaunchSpritesheet atlas slicing) and switched RocketAscent to AnimatedSprite2D launch visuals using apply_launch_sprite().
<!-- SECTION:NOTES:END -->

