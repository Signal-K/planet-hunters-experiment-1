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

func _ready() -> void:
	# Initialize camera controller
	var CameraController = preload("res://Scripts/Earth/CameraController.gd")
	camera_controller = CameraController.new()
	add_child(camera_controller)
	camera_controller.initialize($Camera2D)
	
	# Initialize scene manager
	scene_manager = SceneManager.new()
	add_child(scene_manager)
	
	# Initialize UI manager
	ui_manager = UIManager.new()
	add_child(ui_manager)
	ui_manager.add_to_group("ui_manager")  # Add to group for easy access
	
	# Style and connect button signals
	_setup_buttons()
	
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

func _setup_buttons() -> void:
	"""Setup button styling and connections"""
	var back_btn = $UILayer/ButtonContainer/BackButton
	var forward_btn = $UILayer/ButtonContainer/ForwardButton
	var menu_btn = $UILayer/ButtonContainer/MenuButton
	var market_btn = $UILayer/ButtonContainer/MarketButton
	var space_map_btn = $UILayer/ButtonContainer/SpaceMapButton
	var new_mission_btn = $UILayer/ButtonContainer/NewMissionButton
	
	var buttons = [back_btn, forward_btn, menu_btn, market_btn, space_map_btn, new_mission_btn]
	
	for button in buttons:
		_apply_button_style(button)
	
	# Connect signals
	back_btn.pressed.connect(_on_back_button_pressed)
	forward_btn.pressed.connect(_on_forward_button_pressed)
	menu_btn.pressed.connect(_on_menu_button_pressed)
	market_btn.pressed.connect(_on_market_button_pressed)
	space_map_btn.pressed.connect(_on_space_map_button_pressed)
	new_mission_btn.pressed.connect(_on_new_mission_button_pressed)
	
	print("All buttons styled and connected")

func _apply_button_style(button: Button) -> void:
	"""Apply styling to a button based on CSS design system"""
	# Normal state - Primary blue background
	var normal_style = StyleBoxFlat.new()
	normal_style.bg_color = Color(0.55, 0.72, 0.92, 1)  # Primary blue
	normal_style.border_width_left = 2
	normal_style.border_width_right = 2
	normal_style.border_width_top = 2
	normal_style.border_width_bottom = 2
	normal_style.border_color = Color(0.45, 0.62, 0.82, 1)
	normal_style.corner_radius_top_left = 8
	normal_style.corner_radius_top_right = 8
	normal_style.corner_radius_bottom_left = 8
	normal_style.corner_radius_bottom_right = 8
	normal_style.set_expand_margin_all(4)
	button.add_theme_stylebox_override("normal", normal_style)
	
	# Hover state - Lighter blue
	var hover_style = StyleBoxFlat.new()
	hover_style.bg_color = Color(0.65, 0.78, 0.96, 1)
	hover_style.border_width_left = 2
	hover_style.border_width_right = 2
	hover_style.border_width_top = 2
	hover_style.border_width_bottom = 2
	hover_style.border_color = Color(0.55, 0.72, 0.92, 1)
	hover_style.corner_radius_top_left = 8
	hover_style.corner_radius_top_right = 8
	hover_style.corner_radius_bottom_left = 8
	hover_style.corner_radius_bottom_right = 8
	hover_style.set_expand_margin_all(4)
	button.add_theme_stylebox_override("hover", hover_style)
	
	# Pressed state - Darker blue
	var pressed_style = StyleBoxFlat.new()
	pressed_style.bg_color = Color(0.45, 0.62, 0.82, 1)
	pressed_style.border_width_left = 2
	pressed_style.border_width_right = 2
	pressed_style.border_width_top = 2
	pressed_style.border_width_bottom = 2
	pressed_style.border_color = Color(0.35, 0.52, 0.72, 1)
	pressed_style.corner_radius_top_left = 8
	pressed_style.corner_radius_top_right = 8
	pressed_style.corner_radius_bottom_left = 8
	pressed_style.corner_radius_bottom_right = 8
	pressed_style.set_expand_margin_all(4)
	button.add_theme_stylebox_override("pressed", pressed_style)
	
	# Focus state
	var focus_style = StyleBoxFlat.new()
	focus_style.bg_color = Color(0.60, 0.75, 0.94, 1)
	focus_style.border_width_left = 2
	focus_style.border_width_right = 2
	focus_style.border_width_top = 2
	focus_style.border_width_bottom = 2
	focus_style.border_color = Color(0.55, 0.18, 0.25, 1)  # Ring color
	focus_style.corner_radius_top_left = 8
	focus_style.corner_radius_top_right = 8
	focus_style.corner_radius_bottom_left = 8
	focus_style.corner_radius_bottom_right = 8
	focus_style.set_expand_margin_all(4)
	button.add_theme_stylebox_override("focus", focus_style)
	
	# Text color - white with improved rendering
	button.add_theme_color_override("font_color", Color(1, 1, 1, 1))
	button.add_theme_color_override("font_hover_color", Color(1, 1, 1, 1))
	button.add_theme_color_override("font_pressed_color", Color(1, 1, 1, 1))
	button.add_theme_color_override("font_focus_color", Color(1, 1, 1, 1))
	
	# Improve font rendering quality
	button.add_theme_font_size_override("font_size", 28)  # Larger font size for crisp text

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
	print("Space Map button pressed - showing space map panel")
	ui_manager.show_panel(UIManager.PanelType.SPACE_MAP)

func _on_new_mission_button_pressed() -> void:
	print("New Mission button pressed - showing new mission panel")
	ui_manager.show_panel(UIManager.PanelType.NEW_MISSION)
