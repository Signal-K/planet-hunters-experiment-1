# Ground Layer Guide

This document explains the ground/soil system added to the `EarthBase1` scene and shows how to create and position new structures so they automatically snap to the ground the same way as the satellite ground station.

**Location**: `scene/Scenes/Earth/earth_base_1.gd`

--

## Overview

`earth_base_1.gd` exposes a small ground-level system to make placement predictable and easy:

- Constants:
  - `GROUND_LEVEL` — main ground Y coordinate (where structures sit). Currently `800.0`.
  - `SOIL_TOP` — top of soil layer (e.g. `750.0`).
  - `SOIL_BOTTOM` — bottom of soil layer (e.g. `950.0`).
  - `SKY_LEVEL` — optional reference for background (e.g. `400.0`).
  - `UI_LEVEL` — UI/menu Y baseline (e.g. `1000.0`).

- Helper functions:
  - `snap_to_ground(object: Node2D, offset_y: float = 0.0)` — place `object` at `GROUND_LEVEL + offset_y`.
  - `snap_to_soil_surface(object: Node2D, offset_y: float = 0.0)` — place `object` at `SOIL_TOP + offset_y`.
  - `snap_to_soil_bottom(object: Node2D, offset_y: float = 0.0)` — place `object` at `SOIL_BOTTOM + offset_y`.
  - `get_ground_level()` — returns `GROUND_LEVEL`.
  - `get_soil_bounds()` — returns `Vector2(SOIL_TOP, SOIL_BOTTOM)`.
  - `is_in_soil_layer(y_position: float)` — checks if `y_position` is inside soil layer.

- Visual guide:
  - Exported boolean `show_ground_guide`. When set to `true` on the `EarthBase1` node it draws guide lines (red = ground, green = soil top, blue = soil bottom) for visual placement while developing.

---

## Example: Create a new structure that snaps to ground

1. Create your structure scene (example path): `res://Scenes/Objects/my_structure.tscn`.
   - Root node type: `Node2D` (or `Sprite2D`/`StaticBody2D`) with the structure sprite as a child.
   - Optionally attach a script to the structure to handle behavior.

2. Example simple `my_structure.gd` (attached to the structure root):

```gdscript
extends Node2D

func _ready():
    # At runtime this will snap the instance to the ground.
    var earth_base = get_tree().get_root().find_node("EarthBase1", true, false)
    if earth_base:
        # snap_to_ground(self) will move this node to the ground Y
        earth_base.snap_to_ground(self)
        # You can pass an offset to lift/lower the object relative to ground
        # earth_base.snap_to_ground(self, -10)  # 10px above ground
```

3. Instantiating the structure from another script (for example, a spawner or level script):

```gdscript
var structure_scene = preload("res://Scenes/Objects/my_structure.tscn")

func spawn_structure(spawn_x: float):
    var instance = structure_scene.instantiate()
    # put instance where you want horizontally
    instance.position.x = spawn_x
    # add to scene tree (adjust parent path to your scene)
    get_node("/root/MainScene/World").add_child(instance)

    # find earth_base and snap vertically
    var earth_base = get_tree().get_root().find_node("EarthBase1", true, false)
    if earth_base:
        earth_base.snap_to_ground(instance)
```

Notes:
- `find_node("EarthBase1", true, false)` searches the tree for the node named `EarthBase1`. This is robust across different scene organization, but if you have a fixed scene tree you can use a direct `get_node("/root/...")` path instead.
- The `snap_to_*` helpers only set `position.y`. You are free to set `position.x` before or after snapping.

---

## Editor-time snapping (optional)

If you want objects to snap inside the editor (so you can place them in the editor and have them align immediately), you can make a small `tool` script in your structure that calls the same helper while in the editor. Example:

```gdscript
tool
extends Node2D

func _enter_tree():
    if Engine.is_editor_hint():
        var earth_base = get_tree().get_root().find_node("EarthBase1", true, false)
        if earth_base:
            earth_base.snap_to_ground(self)
```

Be mindful: editor-time scripts run in the editor and will modify scenes. Use the `tool` keyword carefully and only on nodes you intend to edit in-scene.

---

## Using the visual guides

- Select the `EarthBase1` node in the scene tree and enable the exported `show_ground_guide` property in the inspector to display the red/green/blue guide lines.
- While guides are active you can visually drag objects and see their relation to the soil/top/bottom lines.

---

## Where the satellite ground station sits

- The satellite ground station in `scene/Scenes/Earth/earth_base_1.tscn` is placed at `position.y = 800`, which corresponds to `GROUND_LEVEL` in the script. Use this as the example reference for all structures.

---

## Troubleshooting

- If your object appears too high or low, adjust the call using an `offset_y` argument (positive values move downward, negative move upward). Example:

```gdscript
earth_base.snap_to_ground(my_object, -20)  # lifts object 20px above ground
```

- If the guides aren't visible, ensure you enabled `show_ground_guide` on the `EarthBase1` node and that the `earth_base_1.gd` file is the active script on that node.

---

## Next steps / improvements

- Convert the soil bounds into exported `Vector2`/Resource so designers can tweak them in the inspector.
- Add an optional `snap_margin` per-structure export variable so each object can define its own vertical margin.
- Add helper to snap collision shapes or anchor bottoms (useful for tall sprites where sprite origin is not at the base).


If you'd like, I can also add an example `my_structure.tscn` and the `tool`-enabled example script into the repo so you can see a completed example scene. Want me to add that? 
