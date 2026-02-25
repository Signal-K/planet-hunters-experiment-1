---
id: mklpf2
title: Design interactive mining minigame system
status: done
priority: high
labels:
  - gameplay
  - mining
  - minigame
createdAt: '2026-02-24T12:09:13.987Z'
updatedAt: '2026-02-25T08:45:16.869Z'
timeSpent: 169
---
# Design interactive mining minigame system

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create Dredge-inspired timing-based mining mechanics to replace simple button press. Research completed - implementing rotating stability rings with timing challenges.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Mining minigame scene created with visual components
- [x] #2 Timing mechanics implemented with success/fail feedback
- [x] #3 Integration with existing mining system complete
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Implementation Summary

Created Dredge-inspired timing-based mining minigame system:

### Core Mechanics
- **Rotating indicator**: Spins around stability ring at variable speed
- **Timing challenge**: Player presses SPACE when indicator aligns with green zones
- **Quality feedback**: PERFECT (90%+) or Good (70%+) hits, Miss for failures
- **Progressive difficulty**: Speed increases, zones shrink, fewer zones at higher levels

### Difficulty Scaling
- Level 1-2: 3 zones, base speed, 5 hits required
- Level 3-4: Smaller zones (85% size), faster rotation
- Level 5-6: Only 2 zones, even faster
- Level 7+: Smallest zones (64% size), maximum speed

### Reward System
- Success rate = hits / (hits + misses)
- Bonus multiplier: 1.0 + (success_rate * 0.5)
- Perfect play = 1.5x mining yield
- 3 misses = mining fails, no resources

### Integration
- Replaces simple button press in AsteroidPreview
- Launches as overlay when Mine button pressed
- Visual feedback with drill depth progression
- Cooldown timer still applies after completion

### Files Created
- scene/Scripts/UI/MiningMinigame.gd
- scene/Scenes/UI/MiningMinigame.tscn

### Files Modified
- scene/Scripts/UI/AsteroidPreview/AsteroidPreview.gd
- scene/Scenes/UI/AsteroidPreview/asteroid_preview.tscn



Spec Reference: @doc/specs/mining-minigame-system-specification
<!-- SECTION:NOTES:END -->

