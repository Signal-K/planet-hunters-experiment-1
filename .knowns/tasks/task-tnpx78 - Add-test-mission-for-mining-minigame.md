---
id: tnpx78
title: Add test mission for mining minigame
status: done
priority: medium
labels:
  - testing
  - mining
  - debug
createdAt: '2026-02-24T14:13:52.762Z'
updatedAt: '2026-02-25T00:27:38.777Z'
timeSpent: 138
---
# Add test mission for mining minigame

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create quick debug function to launch mining minigame test with random target and ship
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Debug function added to RocketsManager
- [x] #2 Test accessible from game UI or console
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Implementation

Created quick test system for mining minigame:

### Test Scene
- **Location**: `scene/Scenes/Debug/mining_test.tscn`
- **Usage**: Right-click → Run Scene (F6) in Godot
- **Auto-launches**: Creates test mission and opens mining preview

### Debug Function
- **Function**: `RocketsManager.debug_launch_mining_test()`
- **Creates**: Random asteroid (level 1-10) with random unlocked rocket
- **Sets up**: Preview context and marks rocket as arrived
- **No side effects**: Doesn't affect mission progression

### Test Features
- Random asteroid ID and label
- Random difficulty level (1-10)
- Uses any unlocked rocket type
- Instant arrival (no transit time)
- Direct to mining preview

### Files Created
- `scene/Scenes/Debug/mining_test.tscn`
- `scene/Scripts/Debug/MiningTestLauncher.gd`
- `scene/Scenes/Debug/README_MINING_TEST.md`

### Files Modified
- `scene/Scripts/Utils/RocketsManager.gd` - Added debug_launch_mining_test()
- `scene/Scripts/Earth/LaunchpadSelectorPanel.gd` - Added handler (unused but available)
<!-- SECTION:NOTES:END -->

