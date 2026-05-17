---
id: lmky3l
title: Add mining drone deployment system
status: done
priority: high
labels:
  - project-landnam
  - mining
  - drones
createdAt: '2026-02-25T00:17:08.779Z'
updatedAt: '2026-02-25T00:21:08.015Z'
timeSpent: 182
assignee: '@me'
---
# Add mining drone deployment system

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement ability for player to drop mining drones during the mining minigame. Drones should target and destroy subsurface deposits.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Player can deploy drones during mining
- [x] #2 Drones have animated sprite/visual
- [x] #3 Drones target subsurface deposits
- [x] #4 Drones destroy deposits on contact
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Create MiningDrone.gd script with deployment, flight, targeting, and explosion logic
2. Create drone sprite/animations (deployment, flight, explosion)
3. Add subsurface deposit detection and targeting system
4. Integrate drone spawning into SidescrollMining.gd
5. Add UI for drone count and deployment controls
6. Test and verify all acceptance criteria
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Implementation Summary

Created complete mining drone system with:

**Files Created:**
- Scripts/UI/MiningDrone.gd - Drone behavior (deploy, seek, explode states)
- Scenes/UI/MiningDrone.tscn - Drone scene with sprite and particle effects

**Files Modified:**
- Scripts/UI/SidescrollMining.gd - Added drone deployment, targeting, and UI
- Scenes/UI/SidescrollMining.tscn - Added drone counter label

**Features:**
- Press D to deploy drones (3 max, 5s cooldown)
- Drones animate through 3 states: deploying, seeking, exploding
- Auto-target nearest subsurface mineral within 400px range
- Explosion particles on impact
- Destroys deposits and awards 50 points
- UI shows drone count and cooldown timer

**Animations:**
- Deployment: Drops from rocket with rotation
- Flight: Seeks target with smooth rotation toward direction
- Explosion: Particle burst with gradient (orange to black)
<!-- SECTION:NOTES:END -->

