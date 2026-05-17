---
id: gksy7c
title: Create standalone mining test scene
status: done
priority: high
labels:
  - project-landnam
  - testing
  - mining
  - ui
createdAt: '2026-02-24T14:18:07.177Z'
updatedAt: '2026-02-25T08:45:17.908Z'
timeSpent: 62
---
# Create standalone mining test scene

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Build completely separate test UI for mining minigame, not dependent on asteroid preview
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Standalone test scene with own UI
- [x] #2 Mine button launches minigame directly
- [x] #3 Works independently of game state
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Implementation

Created completely standalone mining test scene:

### Standalone UI
- Simple control panel with level slider (1-10)
- START MINING button launches minigame directly
- Result display shows success rate and bonus
- No dependencies on game state or asteroid preview

### Features
- **Level slider**: Test any difficulty 1-10
- **Instant launch**: Click button → minigame starts
- **Clear feedback**: Success rate and bonus multiplier displayed
- **Repeatable**: Can test multiple times without restarting

### Files
- `scene/Scenes/Debug/mining_test.tscn` - Standalone test scene
- `scene/Scripts/Debug/MiningTestScene.gd` - Test controller
- Updated README with usage instructions

### Removed
- Old MiningTestLauncher.gd (replaced with simpler approach)



Spec Reference: @doc/specs/mining-minigame-system-specification
<!-- SECTION:NOTES:END -->

