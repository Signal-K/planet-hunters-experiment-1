---
title: Refactoring Plan
createdAt: '2026-02-25T08:23:18.140Z'
updatedAt: '2026-02-25T08:23:33.039Z'
description: >-
  Consolidate duplicates and remove unused code - align with M1-M3 mission
  progression
spec: true
tags:
  - refactor
  - architecture
  - cleanup
  - missions
---
# Godot Project Refactoring Plan
## Consolidate Duplicates & Remove Unused Code

**Goal:** Align codebase with M1-M3 mission progression vision, eliminate duplication, move runtime creation to scenes.

---

## Phase 1: Move Runtime Object Creation to Scenes (HIGH PRIORITY)

### 1.1 SidescrollMining.gd → SidescrollMining.tscn
**Problem:** Creates 90+ visual objects at runtime (rocks, minerals, particles)

**Solution:**
- Create object pools in scene file:
  - `RockPool/` with 50 pre-created Polygon2D rocks
  - `MineralPool/` with 40 pre-created Polygon2D minerals  
  - `ParticlePool/` with 20 pre-created ColorRect particles
- Script only activates/positions existing nodes
- Use metadata to mark collectible types

**Files:**
- `scene/Scenes/UI/SidescrollMining.tscn` - add pools
- `scene/Scripts/UI/SidescrollMining.gd` - refactor to use pools

**Estimated reduction:** 150+ lines, better performance

### 1.2 Structure.gd → Structure scene files
**Problem:** Creates Area2D, CollisionShape2D, RectangleShape2D at runtime

**Solution:**
- Add Area2D + CollisionShape2D as children in each structure scene
- Script only configures existing nodes
- Remove `_setup_interaction()` runtime creation

**Files:**
- `scene/Scripts/Earth/Structure.gd` - remove creation code
- All structure scenes - add collision nodes

**Estimated reduction:** 30 lines per structure

### 1.3 AsteroidPreview.gd debris generation
**Problem:** Creates Polygon2D debris procedurally

**Solution:**
- Create debris template pool in scene
- Script duplicates and modifies templates
- Keep procedural variation but use templates

**Files:**
- `scene/Scenes/UI/AsteroidPreview/asteroid_preview.tscn` - add debris pool
- `scene/Scripts/UI/AsteroidPreview/AsteroidPreview.gd` - use templates

**Estimated reduction:** 50 lines

---

## Phase 2: Consolidate Styling Code

### 2.1 Create StyledPanel base scene
**Problem:** 21 files manually apply PanelStyle to every element

**Solution:**
- Create `StyledPanel.tscn` with pre-styled elements:
  - Title label (already styled)
  - Body label (already styled)
  - Close button (already styled)
  - Back button (already styled)
- Scenes inherit from StyledPanel
- Remove manual `apply_*` calls

**Files:**
- NEW: `scene/Scenes/UI/Templates/StyledPanel.tscn`
- Update 21 files to use StyledPanel

**Estimated reduction:** 200+ lines across project

### 2.2 Consolidate StyleBoxFlat creation
**Problem:** 19 files create StyleBoxFlat.new() for same styles

**Solution:**
- Create theme resource file with pre-defined styles
- Load theme instead of creating at runtime
- Keep PanelStyle.gd for programmatic overrides only

**Files:**
- NEW: `scene/themes/ui_theme.tres`
- Update files to use theme resource

**Estimated reduction:** 100+ lines

---

## Phase 3: Unify Navigation Patterns

### 3.1 Create NavigationMixin
**Problem:** 9 files have duplicate `_on_back_pressed()` logic

**Solution:**
- Create `NavigationMixin.gd` with common patterns:
  - `go_back_to_earth()`
  - `go_to_scene(path)`
  - `close_panel()`
- Scripts extend or compose with mixin

**Files:**
- NEW: `scene/Scripts/Utils/NavigationMixin.gd`
- Update 9 files to use mixin

**Estimated reduction:** 50+ lines

---

## Phase 4: Split Large Monolithic Scripts

### 4.1 RocketsManager.gd (1468 lines)
**Problem:** God object handling rockets, missions, targets, state

**Solution:** Split into focused modules:
- `RocketState.gd` - rocket data/state
- `MissionManager.gd` - mission CRUD
- `TargetManager.gd` - target data
- `RocketsManager.gd` - orchestration only

**Estimated reduction:** Better maintainability, clearer responsibilities

### 4.2 AsteroidPreview.gd (695 lines)
**Problem:** Handles 3D rendering, UI, mining, inventory, navigation

**Solution:** Extract:
- `AsteroidRenderer.gd` - 3D asteroid generation
- `OrbitController.gd` - orbit animation
- `MiningController.gd` - mining beam logic
- `AsteroidPreview.gd` - orchestration only

**Estimated reduction:** 400+ lines moved to focused scripts

---

## Phase 5: Remove Unused/Legacy Code

### 5.1 Archive folder cleanup
**Files to review:**
- `scene/Scenes/Archive/` - old asteroid detail view
- `scene/Scripts/Archive/` - archived scripts
- `scene/tests/SupabaseTestRunner_Archived.gd`

**Action:** Delete if not referenced

### 5.2 Duplicate scenes
**Candidates:**
- `earth_base_example.tscn` vs `earth_base_1.tscn`
- Multiple rocket selector implementations
- Old transition scenes

**Action:** Consolidate to single implementation

### 5.3 Unused utility scripts
**Review:**
- `HashUtils.gd` - is it used?
- `DebugVisualizer.gd` - development only?
- Old test helpers

**Action:** Remove if unused in production

---

## Phase 6: Align with M1-M3 Vision

### 6.1 Mission progression flow
**Based on task-4r0j05 and recent completed work:**
- M1: Tutorial mission with StarterRocket1 (static, no animation)
- M2: Requires new rocket unlock
- M3: Scanner introduction

**Verify:**
- No code for missions beyond M3
- Tutorial flow matches spec
- Scanner gating works correctly

### 6.2 Remove pre-M1 complexity
**Candidates:**
- Multiple rocket selection before M1 complete
- Advanced features shown too early
- Unused contractor logic (M5+)

---

## Implementation Order

1. **Phase 1.1** - SidescrollMining object pools (highest impact)
2. **Phase 1.2** - Structure collision nodes
3. **Phase 2.1** - StyledPanel base scene
4. **Phase 5** - Remove unused code
5. **Phase 3.1** - Navigation mixin
6. **Phase 4** - Split large scripts (ongoing)
7. **Phase 6** - Align with M1-M3 vision

---

## Success Metrics

- [ ] 500+ lines of code removed
- [ ] No runtime `.new()` calls for visual objects
- [ ] All panels use StyledPanel or theme
- [ ] Navigation code in one place
- [ ] No scripts over 400 lines
- [ ] Archive folder empty or documented
- [ ] Only M1-M3 features present

---

## Testing Strategy

After each phase:
1. Run Godot editor - check for errors
2. Test M1 tutorial flow
3. Test M2 progression
4. Test M3 scanner introduction
5. Run existing test suite
6. Manual playthrough of full M1-M3 flow
