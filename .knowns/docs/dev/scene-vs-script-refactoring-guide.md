---
title: Scene vs Script Refactoring Guide
createdAt: '2026-02-25T02:28:10.872Z'
updatedAt: '2026-02-25T02:28:34.163Z'
description: Analysis of runtime object creation that should be moved to scene files
tags:
  - refactor
  - architecture
  - best-practices
---
# Scene vs Script Refactoring Guide

## Problem

Many scripts are creating UI elements, visual objects, and game objects at runtime using `.new()`. This violates Godot best practices where:
- **Scenes (.tscn)** should contain structure, hierarchy, and visual elements
- **Scripts (.gd)** should contain behavior, logic, and dynamic state

## Files Requiring Refactoring

### HIGH PRIORITY

#### SidescrollMining.gd (CRITICAL)
**Issues:**
- Creates 50+ Polygon2D rocks at runtime (`_add_surface_rocks`)
- Creates 40 Polygon2D minerals at runtime (`_generate_minerals`)
- Creates ColorRect particles dynamically (`_spawn_particles`)

**Should be:**
- Pre-place rock/mineral Polygon2D nodes in scene
- Use metadata to mark them as collectible
- Script only handles collision detection and state changes

**Refactor:**
```gdscript
# BEFORE (BAD)
var rock = Polygon2D.new()
rock.polygon = points
rock.color = Color(0.32, 0.28, 0.25)
terrain_container.add_child(rock)

# AFTER (GOOD)
# In scene: Add Polygon2D nodes with metadata
# In script: Just read and modify existing nodes
for rock in terrain_container.get_children():
    if rock.has_meta("rock_type"):
        # Handle rock behavior
```

#### AsteroidPreview.gd
**Issues:**
- Creates debris Polygon2D objects at runtime
- Procedural visual generation

**Should be:**
- Pre-create debris pool in scene
- Script activates/positions existing objects

#### Structure.gd
**Issues:**
- Creates Area2D, CollisionShape2D, RectangleShape2D at runtime
- This is core structure setup

**Should be:**
- Add these as child nodes in structure scene files
- Script only configures them

### MEDIUM PRIORITY

#### Dialog Creation
**Files:** SatelliteStation.gd, RocketSelector.gd
**Issues:**
- Creates ConfirmationDialog, AcceptDialog at runtime

**Should be:**
- Add dialogs as hidden children in scene
- Script shows/hides and configures them

#### Style Boxes
**Files:** PanelStyle.gd, MenuPanel.gd, SatelliteStationPanelList.gd
**Issues:**
- Creates StyleBoxFlat at runtime for theming

**Keep as-is:** This is acceptable for dynamic theming

### LOW PRIORITY (OK to keep)

#### Procedural Generation
**Files:** ProceduralBodyBuilder.gd, SpaceMap.gd
**Reason:** Truly procedural content that changes each time

#### HTTP Requests
**Files:** SupabaseClient.gd, AsteroidImageHelper.gd
**Reason:** Dynamic network requests

#### Helper Classes
**Files:** RNG, JSON parsers, ConfigFile
**Reason:** Utility objects, not visual elements

## Refactoring Patterns

### Pattern 1: Static Visual Elements
**Move to scene:**
- UI panels, labels, buttons
- Background sprites
- Terrain/environment objects
- Collision shapes

**Keep in script:**
- Dynamic text updates
- Position/rotation changes
- Visibility toggles
- State management

### Pattern 2: Object Pools
**For repeated objects (rocks, minerals, particles):**

1. Create pool in scene:
```
TerrainContainer/
  ├─ RockPool/
  │   ├─ Rock1 (Polygon2D)
  │   ├─ Rock2 (Polygon2D)
  │   └─ Rock3 (Polygon2D)
  └─ MineralPool/
      ├─ Mineral1 (Polygon2D)
      └─ Mineral2 (Polygon2D)
```

2. Script activates from pool:
```gdscript
func _activate_rock(index: int, position: Vector2):
    var rock = rock_pool.get_child(index)
    rock.position = position
    rock.visible = true
```

### Pattern 3: Procedural with Template
**For truly random content:**

1. Create template node in scene (hidden)
2. Script duplicates and modifies:
```gdscript
@onready var rock_template = $RockTemplate
func _spawn_rock():
    var rock = rock_template.duplicate()
    rock.visible = true
    # Modify properties
```

## Implementation Priority

1. **Fix SidescrollMining.gd** - Most egregious violator
2. **Fix Structure.gd** - Core architecture issue
3. **Fix AsteroidPreview.gd** - Visual quality
4. **Document patterns** - Prevent future violations

## Benefits

- **Performance:** Pre-instantiated objects load faster
- **Editability:** Visual tweaking in editor, not code
- **Debugging:** See object hierarchy in scene tree
- **Maintainability:** Separation of concerns
- **Collaboration:** Designers can modify scenes without touching code
