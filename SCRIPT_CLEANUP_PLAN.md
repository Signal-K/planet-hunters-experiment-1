# Script Cleanup & Refactoring Plan

## Analysis Summary

**Total Scripts:** 87
**Scripts >300 lines:** 14

## Phase 1: Delete Unused/Redundant Scripts

### Confirmed Unused (0 references)
None found - all scripts are referenced

### Redundant/Consolidatable Scripts

1. **PanelStyle.gd** (50 lines) - Used 43 times
   - Already have StyledPanelBase.tscn component
   - Action: Keep both (PanelStyle for runtime styling, StyledPanelBase for scene templates)

2. **item_info.gd** (10 lines) - Only used in item_info.tscn
   - Action: Keep (minimal, single purpose)

## Phase 2: Refactor Long Scripts (>300 lines)

### Priority 1: Move Runtime Creation to Scenes

#### 1. RocketsManager.gd (1468 lines)
**Issue:** Massive static utility class
**Refactor:** Split into smaller focused managers
- RocketStateManager.gd (state load/save)
- MissionProgressManager.gd (mission tracking)
- ScannerManager.gd (scanner unlock logic)
- ContractorManager.gd (M5 contractor logic)

#### 2. AsteroidPreview.gd (695 lines)
**Issue:** Creates UI elements at runtime
**Refactor:**
- Move orbit visuals to scene (Line2D, AnimatedSprite2D already in scene)
- Move panel styling to scene resources
- Extract mining minigame logic to separate class

#### 3. SidescrollMining.gd (670 lines) ✅ ALREADY DONE
- Object pools already in scene
- Minimal runtime creation

#### 4. LaunchpadSelectorPanel.gd (526 lines)
**Issue:** Creates UI panels at runtime
**Refactor:**
- Create reusable LaunchpadCard.tscn component
- Move panel creation to scene instantiation

#### 5. SatelliteStationPanel.gd (506 lines)
**Issue:** Complex state management + UI creation
**Refactor:**
- Already split into Data/List/Detail/Loading classes
- Move UI templates to scene files

### Priority 2: Extract Reusable Components

#### 6. RocketReturn.gd (465 lines)
**Refactor:**
- Extract reward display to RewardPanel.tscn
- Extract mission summary to MissionSummaryPanel.tscn

#### 7. AppController.gd (456 lines)
**Refactor:**
- Already split (AppControllerPersistence exists)
- Extract scene transition logic to SceneTransitionManager.gd

#### 8. ReturnPreviewTransition.gd (426 lines)
**Refactor:**
- Extract orbit animation to OrbitAnimator.gd
- Move UI panels to scene templates

#### 9. MissionDebrief.gd (406 lines)
**Refactor:**
- Extract reward calculation to RewardCalculator.gd
- Move UI to scene templates

#### 10. ControlStationPanel.gd (348 lines)
**Refactor:**
- Extract rocket status cards to RocketStatusCard.tscn
- Move panel styling to scene

### Priority 3: Minor Refactors


#### 12. OutboundPreviewTransition.gd (330 lines)
- Similar to ReturnPreviewTransition
- Share OrbitAnimator.gd

#### 13. MenuPanel.gd (323 lines)
- Extract stats display to StatsPanel.tscn
- Move menu items to scene

#### 14. RocketTransit.gd (307 lines)
- Extract progress display to TransitProgressPanel.tscn

## Implementation Order

### Step 1: Create Reusable Scene Components (2-3 hours)
1. LaunchpadCard.tscn
2. RocketStatusCard.tscn
3. RewardPanel.tscn
4. MissionSummaryPanel.tscn
5. TransitProgressPanel.tscn

### Step 2: Split RocketsManager (1-2 hours)
1. RocketStateManager.gd
2. MissionProgressManager.gd
3. ScannerManager.gd
4. ContractorManager.gd
5. Update all references

### Step 3: Refactor Large UI Scripts (3-4 hours)
1. AsteroidPreview.gd
2. LaunchpadSelectorPanel.gd
3. RocketReturn.gd
4. ReturnPreviewTransition.gd
5. MissionDebrief.gd

### Step 4: Extract Shared Logic (1-2 hours)
1. OrbitAnimator.gd
2. RewardCalculator.gd
3. SceneTransitionManager.gd

## Expected Results

- **Lines Reduced:** ~2000+ lines
- **New Components:** 5 reusable .tscn files
- **New Utilities:** 7 focused .gd files
- **Deleted Scripts:** 0 (all are used)
- **Improved Maintainability:** Smaller, focused files
- **Better Godot Practices:** Scenes for structure, scripts for behavior
