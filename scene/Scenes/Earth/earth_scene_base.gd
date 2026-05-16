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

const AppLogger = preload("res://Scripts/Utils/Logger.gd")
const AppControllerHelper = preload("res://Scripts/Utils/AppControllerHelper.gd")
const RocketsManager = preload("res://Scripts/Utils/RocketsManager.gd")
const CameraController = preload("res://Scripts/Earth/CameraController.gd")
const DebugVisualizer = preload("res://Scripts/Earth/DebugVisualizer.gd")
const GameNavigationMenu = preload("res://Scripts/UI/GameNavigationMenu.gd")
const EarthSceneUIHelper = preload("res://Scripts/Earth/EarthSceneUIHelper.gd")

@export var show_ground_guide: bool = false

var camera_controller: Node
var scene_manager: SceneManager
var ui_manager: UIManager
var _ui_helper := EarthSceneUIHelper.new()

func _ready() -> void:
	# Initialize camera controller
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
	_ensure_tutorial_runtime()
	call_deferred("_apply_tutorial_button_state")
	call_deferred("_apply_nav_safe_area")

	# Create ground guide lines if enabled
	if show_ground_guide:
		DebugVisualizer.create_ground_guides(self)

	# Call custom initialization for derived scenes
	_custom_ready()

## Override this in derived scripts for custom initialization
func _custom_ready() -> void:
	pass

func _ensure_tutorial_runtime() -> void:
	var app = AppControllerHelper.get_instance()
	if app != null and app.has_method("_ensure_tutorial_runtime"):
		app._ensure_tutorial_runtime()

func _apply_tutorial_button_state() -> void:
	var app = AppControllerHelper.get_instance()
	var tutorial_active := not RocketsManager.is_free_operations_unlocked()
	if app != null and app.has_method("get_tutorial_state"):
		var state: Dictionary = app.get_tutorial_state()
		if not state.is_empty():
			var current_step: Dictionary = state.get("current_step", {}) as Dictionary
			tutorial_active = not bool(state.get("skipped", false)) and not current_step.is_empty()
	# During the tutorial disable off-mission nav buttons (SpaceMap, Market, Forward).
	# Back and Menu stay enabled so the player can navigate back or access skip/replay.
	# New Mission stays enabled in template scenes where it triggers the launchpad flow.
	for btn_path in [
		"UILayer/ButtonContainer/ForwardButton",
		"UILayer/ButtonContainer/SpaceMapButton",
	]:
		var btn := get_node_or_null(btn_path) as Button
		if btn:
			btn.disabled = tutorial_active
	_apply_market_button_state(tutorial_active)

func _apply_market_button_state(_tutorial_active: bool) -> void:
	var market_btn := get_node_or_null("UILayer/ButtonContainer/MarketButton") as Button
	if market_btn == null:
		return
	var market_unlocked := RocketsManager.is_free_operations_unlocked()
	market_btn.disabled = not market_unlocked
	if not market_unlocked:
		market_btn.tooltip_text = "Market unlocks after completing the starter mission series."
		market_btn.modulate = Color(1, 1, 1, 0.38)
	else:
		market_btn.tooltip_text = ""
		market_btn.modulate = Color(1, 1, 1, 1)

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
	scene_manager.navigate_backward()

func _on_forward_button_pressed() -> void:
	scene_manager.navigate_forward()

func _on_menu_button_pressed() -> void:
	GameNavigationMenu.toggle(self)

func _on_market_button_pressed() -> void:
	if not RocketsManager.is_free_operations_unlocked():
		return
	var app = AppControllerHelper.get_instance()
	if app and app.has_method("get_experience_level"):
		var level = int(app.get_experience_level())
		if level < 5:
			AppLogger.w("Market unlocks at Level 5 (Current: %d)" % level)
			return
	
	ui_manager.show_panel(UIManager.PanelType.MARKET)

func _on_space_map_button_pressed() -> void:
	if scene_manager:
		scene_manager.change_to_scene("res://Scenes/UI/SpaceMap/galaxy_map.tscn")
	else:
		get_tree().change_scene_to_file("res://Scenes/UI/SpaceMap/galaxy_map.tscn")

func _on_new_mission_button_pressed() -> void:
	AppControllerHelper.record_tutorial_action("open_launchpad")
	if scene_manager:
		scene_manager.change_to_scene("res://Scenes/Earth/earth_launchpad.tscn")
	else:
		get_tree().change_scene_to_file("res://Scenes/Earth/earth_launchpad.tscn")

func _apply_nav_safe_area() -> void:
	_ui_helper.apply_nav_layout()
