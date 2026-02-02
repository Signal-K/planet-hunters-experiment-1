extends Node2D
## Base template for Earth scenes with backgrounds, soil layers, UI, and structure placement
##
## This class provides the foundational structure for all Earth-based scenes,
## including background rendering, ground/soil layer management, UI buttons,
## and helper functions for positioning structures.
##
## To create a new Earth scene:
## 1. Create a new scene that inherits from earth_scene_template.tscn
## 2. Add your structures to the StructuresLayer
## 3. Optionally override methods or add custom behavior in a derived script

# Ground and soil layer constants
const GROUND_LEVEL: float = 800.0
const SOIL_TOP: float = 750.0
const SOIL_BOTTOM: float = 950.0
const SKY_LEVEL: float = 400.0
const UI_LEVEL: float = 1000.0

@export var show_ground_guide: bool = false

var camera_controller: Node
var scene_manager: SceneManager
var ui_manager: UIManager
var _ui_helper := preload("res://Scripts/Earth/EarthSceneUIHelper.gd").new()

func _ready() -> void:
	# Initialize camera controller
	var CameraController = preload("res://Scripts/Earth/CameraController.gd")
	camera_controller = CameraController.new()
	add_child(camera_controller)
	camera_controller.initialize($Camera2D)
	
	# Initialize scene manager
	scene_manager = SceneManager.new()
	add_child(scene_manager)
	# Add to group so other scripts can discover it via get_first_node_in_group("scene_manager")
	scene_manager.add_to_group("scene_manager")
	
	# Initialize UI manager
	ui_manager = UIManager.new()
	add_child(ui_manager)
	ui_manager.add_to_group("ui_manager")  # Add to group for easy access
	
	# Style and connect button signals
	_ui_helper.setup(self)
	_ui_helper.setup_buttons()
	
	# Create ground guide lines if enabled
	if show_ground_guide:
		var DebugVisualizer = preload("res://Scripts/Earth/DebugVisualizer.gd")
		DebugVisualizer.create_ground_guides(self)
	
	# Call custom initialization for derived scenes
	_custom_ready()

## Override this in derived scripts for custom initialization
func _custom_ready() -> void:
	pass

# ============================================================================
# Ground and Soil Helper Functions
# ============================================================================

## Snap an object to the ground level with optional Y offset
func snap_to_ground(object: Node2D, offset_y: float = 0.0) -> void:
	object.position.y = GROUND_LEVEL + offset_y

## Snap an object to the top of the soil layer with optional Y offset
func snap_to_soil_surface(object: Node2D, offset_y: float = 0.0) -> void:
	object.position.y = SOIL_TOP + offset_y

## Snap an object to the bottom of the soil layer with optional Y offset
func snap_to_soil_bottom(object: Node2D, offset_y: float = 0.0) -> void:
	object.position.y = SOIL_BOTTOM + offset_y

## Get the ground level Y coordinate
func get_ground_level() -> float:
	return GROUND_LEVEL

## Get the soil layer bounds as Vector2(top, bottom)
func get_soil_bounds() -> Vector2:
	return Vector2(SOIL_TOP, SOIL_BOTTOM)

## Check if a Y position is within the soil layer
func is_in_soil_layer(y_position: float) -> bool:
	return y_position >= SOIL_TOP and y_position <= SOIL_BOTTOM

# ============================================================================
# UI Setup
# ============================================================================

# ============================================================================
# Button Handlers (Override these in derived scripts if needed)
# ============================================================================

func _on_back_button_pressed() -> void:
	print("Back button pressed - navigating backward")
	scene_manager.navigate_backward()

func _on_forward_button_pressed() -> void:
	print("Forward button pressed - navigating forward")
	scene_manager.navigate_forward()

func _on_menu_button_pressed() -> void:
	print("Menu button pressed - showing menu panel")
	ui_manager.show_panel(UIManager.PanelType.MENU)

func _on_market_button_pressed() -> void:
	print("Market button pressed - showing market panel")
	ui_manager.show_panel(UIManager.PanelType.MARKET)

func _on_space_map_button_pressed() -> void:
	print("Space Map button pressed - opening space map scene")
	if scene_manager:
		scene_manager.change_to_scene("res://Scenes/UI/SpaceMap/space_map.tscn")
	else:
		get_tree().change_scene_to_file("res://Scenes/UI/SpaceMap/space_map.tscn")

func _on_new_mission_button_pressed() -> void:
	print("New Mission button pressed - showing new mission panel")
	ui_manager.show_panel(UIManager.PanelType.NEW_MISSION)
