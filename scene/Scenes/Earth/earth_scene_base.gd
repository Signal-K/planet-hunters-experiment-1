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
	call_deferred("_apply_tutorial_button_state")
	call_deferred("_apply_nav_safe_area")

	# Create ground guide lines if enabled
	if show_ground_guide:
		var DebugVisualizer = preload("res://Scripts/Earth/DebugVisualizer.gd")
		DebugVisualizer.create_ground_guides(self)

	# Call custom initialization for derived scenes
	_custom_ready()

## Override this in derived scripts for custom initialization
func _custom_ready() -> void:
	pass

func _apply_tutorial_button_state() -> void:
	var app = preload("res://Scripts/Utils/AppControllerHelper.gd").get_instance()
	var tutorial_active := false
	if app != null and app.has_method("get_tutorial_state"):
		var state: Dictionary = app.get_tutorial_state()
		tutorial_active = not state.is_empty() and not bool(state.get("skipped", false))
	# During the tutorial disable off-mission nav buttons (SpaceMap, Market, Forward).
	# Back and Menu stay enabled so the player can navigate back or access skip/replay.
	# New Mission stays enabled in template scenes where it triggers the launchpad flow.
	for btn_path in [
		"UILayer/ButtonContainer/ForwardButton",
		"UILayer/ButtonContainer/MarketButton",
		"UILayer/ButtonContainer/SpaceMapButton",
	]:
		var btn := get_node_or_null(btn_path) as Button
		if btn:
			btn.disabled = tutorial_active

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
	print("New Mission button pressed - opening launchpad scene")
	preload("res://Scripts/Utils/AppControllerHelper.gd").record_tutorial_action("open_launchpad")
	if scene_manager:
		scene_manager.change_to_scene("res://Scenes/Earth/earth_launchpad.tscn")
	else:
		get_tree().change_scene_to_file("res://Scenes/Earth/earth_launchpad.tscn")

func _apply_nav_safe_area() -> void:
	# On mobile landscape viewports (wider than 16:9), shift the nav bar up to
	# clear the iPhone home indicator. Design is 1920×1080; iPhone landscape
	# expands the viewport to ~2337×1080 (aspect ~2.16). The home indicator is
	# ~34 CSS px → ~94 Godot units at that scale. We use 90 as a round value.
	var container := get_node_or_null("UILayer/ButtonContainer") as HBoxContainer
	if container == null:
		return
	var vp := get_viewport()
	if vp == null:
		return
	var vp_rect := vp.get_visible_rect()
	if vp_rect.size.y <= 0:
		return
	if vp_rect.size.x / vp_rect.size.y > 1.85:
		var inset := 90.0
		container.offset_top -= inset
		container.offset_bottom -= inset
