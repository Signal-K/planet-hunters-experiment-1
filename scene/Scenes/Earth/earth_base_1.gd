extends Node2D

@export var show_ground_guide: bool = false

var camera_controller: Node
var scene_manager: SceneManager
var ui_manager: UIManager
const PREVIEW_SCENE_PATH := "res://Scenes/UI/AsteroidPreview/asteroid_preview.tscn"
const ACTION_OPEN_NEW_MISSION := "open_new_mission"
const HINT_OPEN_NEW_MISSION := "Tap New Mission to open the launch area and prepare a rocket."

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

	# Reopen New Mission panel if requested by previous scene
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if rm and rm.consume_return_to_new_mission_panel():
		ui_manager.show_panel(UIManager.PanelType.NEW_MISSION)
	
	# Connect button signals
	_setup_buttons()
	
	# Create ground guide lines if enabled
	if show_ground_guide:
		var DebugVisualizer = preload("res://Scripts/Earth/DebugVisualizer.gd")
		DebugVisualizer.create_ground_guides(self)

func _setup_buttons() -> void:
	"""Setup button connections"""
	var back_btn = $UILayer/ButtonContainer/BackButton
	var forward_btn = $UILayer/ButtonContainer/ForwardButton
	var menu_btn = $UILayer/ButtonContainer/MenuButton
	var market_btn = $UILayer/ButtonContainer/MarketButton
	var space_map_btn = $UILayer/ButtonContainer/SpaceMapButton
	var new_mission_btn = $UILayer/ButtonContainer/NewMissionButton
	
	# Connect signals
	back_btn.pressed.connect(_on_back_button_pressed)
	forward_btn.pressed.connect(_on_forward_button_pressed)
	menu_btn.pressed.connect(_on_menu_button_pressed)
	market_btn.pressed.connect(_on_market_button_pressed)
	space_map_btn.pressed.connect(_on_space_map_button_pressed)
	new_mission_btn.pressed.connect(_on_new_mission_button_pressed)
	
	print("All button signals connected")

# Button handlers
func _on_back_button_pressed() -> void:
	print("Back button pressed - navigating backward")
	if _open_preview_delta(-1):
		return
	scene_manager.navigate_backward()

func _on_forward_button_pressed() -> void:
	print("Forward button pressed - navigating forward")
	if _open_preview_delta(1):
		return
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
	_show_tutorial_hint_once(ACTION_OPEN_NEW_MISSION, HINT_OPEN_NEW_MISSION)
	if scene_manager:
		scene_manager.change_to_scene("res://Scenes/Earth/earth_launchpad.tscn")
	else:
		get_tree().change_scene_to_file("res://Scenes/Earth/earth_launchpad.tscn")

func _open_preview_delta(delta: int) -> bool:
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if not rm:
		return false
	var candidates = rm.get_preview_candidates()
	if candidates.is_empty():
		return false
	var idx = rm.get_preview_index()
	idx = (idx + delta) % candidates.size()
	if idx < 0:
		idx = candidates.size() - 1
	rm.set_preview_index(idx)
	var target = candidates[idx]
	rm.set_preview_target(
		str(target.get("target_id", "")),
		str(target.get("label", "")),
		str(target.get("type", "asteroid")),
		str(target.get("rocket_id", ""))
	)
	if scene_manager:
		scene_manager.change_to_scene(PREVIEW_SCENE_PATH)
	else:
		get_tree().change_scene_to_file(PREVIEW_SCENE_PATH)
	return true

func _show_tutorial_hint_once(action_key: String, message: String) -> void:
	var app = get_tree().root.find_child("AppController", true, false)
	if app and app.has_method("show_tutorial_hint_once"):
		app.show_tutorial_hint_once(action_key, message)
