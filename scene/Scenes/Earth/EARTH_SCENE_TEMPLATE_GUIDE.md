# Earth Scene Template Guide

This guide explains how to use the **Earth Scene Template** to create new Earth-based scenes with consistent backgrounds, soil layers, UI buttons, and structure placement.

## Overview

The Earth Scene Template provides:
- **BackgroundLayer**: Pre-configured Earth backdrop with scrolling support
- **SoilLayer**: Empty layer for soil/ground visuals (layer 0)
- **StructuresLayer**: Empty layer for placing buildings, stations, etc. (layer 1)
- **UILayer**: Pre-configured navigation buttons and UI controls (layer 2)
- **Ground/Soil Helper Functions**: Easy positioning of structures at ground level
- **Camera Controller**: Pre-configured camera with proper positioning

## Files

- **Template Scene**: `res://Scenes/Earth/earth_scene_template.tscn`
- **Base Script**: `res://Scenes/Earth/earth_scene_base.gd`

---

## Method 1: Create a New Scene by Inheriting the Template (Recommended)

### In Godot Editor:

1. **Create Inherited Scene**:
   - Right-click `earth_scene_template.tscn` in FileSystem
   - Select "New Inherited Scene"
   - Save as (e.g., `earth_base_2.tscn`)

2. **Add Your Structures**:
   - Expand the scene tree
   - Select `StructuresLayer` node
   - Add your structures as children (satellites, buildings, etc.)

3. **Optional: Add Custom Script**:
   ```gdscript
   extends "res://Scenes/Earth/earth_scene_base.gd"
   
   func _custom_ready() -> void:
       # Your custom initialization here
       print("Earth Base 2 initialized!")
       
       # Example: Snap a structure to ground
       var my_station = $StructuresLayer/MyStation
       snap_to_ground(my_station)
   ```

4. **Optional: Add Soil Visuals**:
   - Select `SoilLayer` node
   - Add sprites, tilemaps, or other visuals for soil/ground

### Benefits:
✅ Automatically inherits all template changes
✅ Keeps scenes DRY (Don't Repeat Yourself)
✅ Easy to update all Earth scenes at once

---

## Method 2: Duplicate and Modify (Quick but less maintainable)

1. Duplicate `earth_scene_template.tscn`
2. Rename to your scene name
3. Modify as needed
4. Note: Won't inherit future template updates

---

## Ground and Soil System

The base script provides constants and helper functions for consistent positioning:

### Constants

```gdscript
GROUND_LEVEL = 800.0    # Main ground surface
SOIL_TOP = 750.0        # Top of soil layer
SOIL_BOTTOM = 950.0     # Bottom of soil layer
SKY_LEVEL = 400.0       # Sky/background reference
UI_LEVEL = 1000.0       # UI baseline
```

### Helper Functions

#### Snap to Ground
```gdscript
func _custom_ready() -> void:
    var satellite = $StructuresLayer/SatelliteStation
    snap_to_ground(satellite)  # Places at y=800
    
    # With offset (lift structure 20 pixels above ground)
    snap_to_ground(satellite, -20)  # Places at y=780
```

#### Snap to Soil Surface
```gdscript
var plant = $StructuresLayer/Plant
snap_to_soil_surface(plant)  # Places at y=750
```

#### Snap to Soil Bottom
```gdscript
var buried_object = $StructuresLayer/BuriedCache
snap_to_soil_bottom(buried_object)  # Places at y=950
```

#### Get Ground Info
```gdscript
var ground_y = get_ground_level()  # Returns 800.0
var soil_bounds = get_soil_bounds()  # Returns Vector2(750, 950)

# Check if position is in soil
if is_in_soil_layer(my_object.position.y):
    print("Object is underground!")
```

---

## Layer Structure

The template uses a **CanvasLayer system** for proper z-ordering:

| Layer | Z-Order | Purpose | Contents |
|-------|---------|---------|----------|
| **BackgroundLayer** | 0 | Background imagery | Earth backdrop sprites |
| **SoilLayer** | 0 | Ground/soil visuals | Empty by default, add soil sprites/tilemaps |
| **StructuresLayer** | 1 | Interactive objects | Empty by default, add your structures here |
| **UILayer** | 2 | UI/HUD elements | Navigation buttons (pre-configured) |

### Adding Structures

Always add structures to `StructuresLayer`:

```gdscript
# In your derived script or directly in the editor:
var satellite_scene = preload("res://Scenes/Structures/satellite_station.tscn")
var satellite = satellite_scene.instantiate()
$StructuresLayer.add_child(satellite)
satellite.position.x = 600  # Set X position
snap_to_ground(satellite)   # Auto-set Y position to ground
```

### Adding Soil Visuals

Add soil/ground graphics to `SoilLayer`:

```gdscript
# Example: Add a soil tilemap
var soil_tilemap = TileMap.new()
$SoilLayer.add_child(soil_tilemap)
# Configure tilemap bounds to match SOIL_TOP to SOIL_BOTTOM range
```

---

## UI Buttons

The template includes pre-styled navigation buttons:

- **Back Button** (`<<`): Navigate backward in scene history
- **Forward Button** (`>>`): Navigate forward in scene history
- **Menu Button**: Open main menu panel
- **Market Button**: Open market panel
- **Space Map Button**: Open space map view
- **New Mission Button**: Open mission selection

### Button Styling

All buttons use a consistent design system with:
- Primary blue background (#8CB8EB)
- Rounded corners (8px radius)
- Border styling
- Hover/pressed/focus states
- White text at 28px font size

### Customizing Button Behavior

Override button handlers in your derived script:

```gdscript
extends "res://Scenes/Earth/earth_scene_base.gd"

func _on_market_button_pressed() -> void:
    # Call parent implementation
    super._on_market_button_pressed()
    
    # Add custom behavior
    print("Opening Earth Base 2 specific market!")
```

### Adding More Buttons

Add buttons to `UILayer/ButtonContainer` in the scene editor:

```gdscript
func _custom_ready() -> void:
    var upgrade_btn = Button.new()
    upgrade_btn.text = "Upgrade"
    upgrade_btn.custom_minimum_size = Vector2(200, 80)
    $UILayer/ButtonContainer.add_child(upgrade_btn)
    _apply_button_style(upgrade_btn)  # Use template styling
    upgrade_btn.pressed.connect(_on_upgrade_pressed)

func _on_upgrade_pressed() -> void:
    print("Upgrade pressed!")
```

---

## Debug Visualization

Enable ground guide lines for visual alignment during development:

1. Select your scene's root node
2. In Inspector, check `Show Ground Guide`
3. Guide lines will appear:
   - **Red line**: Ground level (800)
   - **Green line**: Soil top (750)
   - **Blue line**: Soil bottom (950)

**Important**: Disable before releasing/exporting!

---

## Example: Creating a New Earth Base

### earth_base_2.gd

```gdscript
extends "res://Scenes/Earth/earth_scene_base.gd"

func _custom_ready() -> void:
    print("Earth Base 2 ready!")
    
    # Position structures
    var launch_pad = $StructuresLayer/LaunchPad
    launch_pad.position.x = 1200
    snap_to_ground(launch_pad)
    
    var control_station = $StructuresLayer/ControlStation
    control_station.position.x = 1600
    snap_to_ground(control_station, -10)  # Slightly elevated
    
    # Add soil visuals
    _setup_soil_layer()

func _setup_soil_layer() -> void:
    # Create soil sprites or tilemap
    var soil_sprite = Sprite2D.new()
    soil_sprite.texture = preload("res://assets/Backdrops/soil_texture.png")
    soil_sprite.position = Vector2(960, 850)  # Center in soil layer
    $SoilLayer.add_child(soil_sprite)
```

### In the Scene Editor:

1. Create inherited scene from `earth_scene_template.tscn`
2. Save as `earth_base_2.tscn`
3. Add structures to `StructuresLayer`:
   - LaunchPad
   - ControlStation
4. Attach script: `earth_base_2.gd`
5. Run and test!

---

## Migrating Existing Scenes

To migrate an existing Earth scene to use the template:

1. **Create inherited scene** from template
2. **Copy structures** from old scene to `StructuresLayer`
3. **Copy soil visuals** to `SoilLayer` (if any)
4. **Create derived script** and move custom logic to `_custom_ready()`
5. **Test thoroughly**
6. **Delete old scene** once verified

### Example Migration:

```gdscript
# Old earth_base_1.gd
extends Node2D
func _ready():
    # All initialization here
    setup_camera()
    setup_buttons()
    # etc...

# New earth_base_1.gd (using template)
extends "res://Scenes/Earth/earth_scene_base.gd"

func _custom_ready() -> void:
    # Only custom initialization
    # Camera and buttons already handled by base!
    var satellite = $StructuresLayer/SatelliteStation
    snap_to_ground(satellite)
```

---

## Best Practices

1. **Always use inherited scenes** instead of duplicating the template
2. **Use helper functions** for positioning (don't hardcode y=800)
3. **Add structures to StructuresLayer**, not directly to root
4. **Override `_custom_ready()`** instead of `_ready()`
5. **Use layer system** for proper z-ordering
6. **Enable debug guides** during development, disable for release
7. **Keep constants in sync** if you modify ground/soil levels

---

## Troubleshooting

### Structures appear behind background
- Ensure structures are children of `StructuresLayer` (layer 1)
- Background is on layer 0

### Buttons not working
- Check if scene inherits from template properly
- Verify `_setup_buttons()` is called in base script

### Ground helpers not working
- Ensure your script extends `earth_scene_base.gd`
- Check that constants are not overridden

### Scene doesn't inherit template changes
- You may have duplicated instead of inherited
- Recreate as inherited scene

---

## Advanced: Customizing the Template

If you need to change the template for all scenes:

1. **Edit** `earth_scene_template.tscn` or `earth_scene_base.gd`
2. **All inherited scenes** will automatically update
3. **Test all scenes** after major template changes

### Example: Adding a new layer

```gdscript
# In earth_scene_base.gd, add constant:
const UNDERGROUND_LEVEL: float = 1100.0

# Add helper function:
func snap_to_underground(object: Node2D, offset_y: float = 0.0) -> void:
    object.position.y = UNDERGROUND_LEVEL + offset_y
```

Then add the layer in `earth_scene_template.tscn`:
```
[node name="UndergroundLayer" type="CanvasLayer" parent="."]
layer = -1
```

All inherited scenes get this new functionality automatically!

---

## Summary

The Earth Scene Template provides a **reusable, maintainable foundation** for all Earth-based scenes:

✅ Consistent backgrounds and UI
✅ Helper functions for positioning
✅ Easy to create new scenes
✅ Centralized updates
✅ Layer-based organization
✅ Debug visualization tools

Happy scene building! 🌍
