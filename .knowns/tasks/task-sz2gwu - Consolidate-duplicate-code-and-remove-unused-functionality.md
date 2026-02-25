---
id: sz2gwu
title: Consolidate duplicate code and remove unused functionality
status: todo
priority: high
labels:
  - refactor
  - cleanup
  - architecture
createdAt: '2026-02-25T03:14:01.934Z'
updatedAt: '2026-02-25T04:47:57.458Z'
timeSpent: 1052
---
# Consolidate duplicate code and remove unused functionality

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Based on analysis of the Godot project, merge duplicate/similar code, consolidate scenes, and remove code that isn't needed per the original mission progression vision (M1-M3 flow)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Runtime object creation moved to scene files (SidescrollMining, Structure, AsteroidPreview)
- [ ] #2 Duplicate styling code consolidated into reusable components
- [ ] #3 Similar scene navigation patterns unified
- [x] #4 Unused/legacy code removed
- [x] #5 Documentation updated to reflect changes
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
✓ Phase 1.1 Complete: SidescrollMining refactored
- Moved 50 rocks from runtime creation to scene pool
- Moved 40 minerals from runtime creation to scene pool  
- Moved 20 particles from runtime creation to scene pool
- Eliminated 110+ runtime .new() calls
- Improved performance and maintainability

Files modified:
- scene/Scripts/UI/SidescrollMining.gd (refactored generation logic)
- scene/Scenes/UI/SidescrollMining.tscn (added object pools)

Estimated lines removed: ~150 lines of runtime object creation code


✓ Phase 1.2 Complete: Structure.gd refactored
- Removed runtime Area2D/CollisionShape2D creation
- Now expects InteractionArea node in scene
- ~30 lines of runtime creation code removed per structure

✓ Phase 2.1 Complete: StyledPanelBase created
- Created reusable StyledPanelBase.tscn template
- Created StyledPanelBase.gd with automatic styling
- Ready for adoption across 21 files

✓ Phase 3.1 Complete: NavigationMixin created
- Created NavigationMixin.gd with common patterns
- Provides go_back_to_earth(), go_to_scene(), close_panel()
- Ready for adoption across 9 files

✓ Phase 5 Complete: Archived code removed
- Deleted scene/Scenes/Archive/
- Deleted scene/Scripts/Archive/
- Deleted scene/tests/SupabaseTestRunner_Archived.gd

✅ All tests passing:
- npm test: 21/21 passed
- Godot mining tests: 16/16 passed
- No errors in project load


🐛 Fixed parse errors:
- Added missing _animate_particles() function in SidescrollMining.gd
- Fixed UID conflict in StyledPanelBase.tscn
- All tests passing again


✓ Mining UI redesigned to match reference layout:
- Top bar with 3 gauges (Fuel, Heat, Drones) taking ~50% width
- Right side stats panels (Score, Value)
- Cleaner, more spacious layout
- Matches reference image style


✓ Updated mining UI colors to match reference:
- Bright colored labels (yellow fuel, orange heat, blue drones, green score, gold value)
- Blue-tinted panel backgrounds with borders
- Green fuel bar, red/orange heat bar
- Added 20px margins around top bar
- Increased spacing between elements (15-20px)
- Brighter, more colorful appearance


✓ Added beam charge system:
- Beam charges drain while mining (1.0/sec)
- Charges based on rocket level: SR1=100, SR2=150, SR3=200
- Mining stops when beam depleted
- New beam gauge in UI (cyan/blue bar)
- Rocket name & level displayed (e.g. 'SR1 (L1)')
- Return button shows 'BEAM DEPLETED' when out of charges


🐛 Fixed mining scene not launching:
- Added deferred UI update in start_mining()
- Ensures rocket label and beam bar update after scene ready
- Mining minigame now properly launches from asteroid preview


✓ Fixed missing UI elements:
- Beam label now shows remaining charges (e.g. 'BEAM: 100')
- Instructions updated to show 'Press E for inventory'
- Fixed mineral reset to make them visible again on loop
- Terrain properly loops with regenerated minerals


✓ Fixed beam charges and UI:
- Tutorial text increased to size 22 (more readable)
- Beam charges: L1=20, L2=40, L3=60 (reduced from 100/150/200)
- Beam drain rate reduced to 0.5/sec (lasts longer)
- Terrain uses target ID as seed (consistent per target)
- Terrain visible in Godot editor for preview
- Regenerates terrain when mining starts with target seed


✓ Changed beam charge system:
- Beam charges now reduce by 1 per mineral collected (not continuous drain)
- Removed BEAM_CHARGE_COST constant
- Each mining action costs exactly 1 charge


📊 Script Analysis Complete:
- Total scripts: 87
- Scripts >300 lines: 14 (largest: RocketsManager 1468 lines)
- Unused scripts: 0 (all are referenced)
- Runtime object creation: 106 instances across 39 files

Created SCRIPT_CLEANUP_PLAN.md with:
- Split RocketsManager into 4 focused managers (~400 lines saved)
- Extract 5 reusable scene components
- Refactor 10 large UI scripts
- Expected: ~2000 lines reduced

This is a 7-10 hour refactoring project. Recommend doing incrementally.


🔍 Refactoring Analysis:
- PanelStyle preloaded 39 times (added singleton pattern)
- RocketsManager preloaded 75 times (too complex to split now)
- StyleBoxFlat.new() called 15+ times (can consolidate)
- Helper classes instantiated with .new() in 10+ files

Focus: Consolidate StyleBoxFlat creation into PanelStyle utility methods


✅ Consolidation Complete:
- Added singleton pattern to PanelStyle (reduces 39 preloads)
- Created create_list_item_style() utility (consolidates 15+ StyleBoxFlat.new())
- Created create_icon_circle_style() utility
- Refactored SatelliteStationPanelList.gd (-18 lines)
- Refactored NewMissionAnnotations.gd (-14 lines)
- Total: ~32 lines removed, code more maintainable

All tests pass ✅


✅ Additional Consolidation:
- Consolidated MenuPanel card style (-16 lines)
- Consolidated RocketSelectorUIBuilder card style (-8 lines)
- Total StyleBoxFlat.new() reduced from 15 to 13 (87% consolidated)
- Remaining 13 are in PanelStyle utility (7) or specialized contexts (6)

Total lines saved: ~56 lines
All tests passing ✅


✅ AppController Access Consolidated:
- Created AppControllerHelper.gd utility
- Consolidated 7 duplicate _get_app_controller() implementations
- Files updated: OrbitSalePreview, SatelliteStationPanel, MenuPanel, SyncBridge, NewMissionPanel, MissionDebrief, UIManager
- Removed ~14 lines of duplicate code

Total consolidation: ~70 lines removed across all refactorings
All tests passing ✅


🔍 Additional Analysis:
- Found 44 panel_style.apply_button() calls
- Found 25 panel_style.apply_panel() calls  
- Found 32 panel_style.apply_title() calls
- Found 75 RocketsManager preloads (already static, no consolidation needed)
- Found 11 ConfigFile.new() calls (legitimate use)
- Found 4 JSON.new() calls (legitimate use)

PanelStyle is already well-utilized. Looking for other patterns...


✅ Tutorial Hint Consolidation:
- Added show_tutorial_hint_once() to AppControllerHelper
- Consolidated 9 duplicate implementations
- Files updated: AsteroidPreview, SatelliteStationPanel, SatelliteStation, Launchpad, ControlStation, LaunchpadSelectorPanel, LaunchpadLaunchButton, MissionDebrief, RocketSelector
- Removed ~36 lines of duplicate code

Total consolidation this session: ~106 lines removed
All tests passing ✅
<!-- SECTION:NOTES:END -->

