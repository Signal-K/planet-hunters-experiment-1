extends Node2D

@export var show_ground_guide: bool = false

var camera_controller: Node
var scene_manager: SceneManager
var ui_manager: UIManager
const PREVIEW_SCENE_PATH := "res://Scenes/UI/AsteroidPreview/asteroid_preview.tscn"
const RocketSpecs = preload("res://Scripts/Utils/RocketSpecs.gd")
const SR2_UNLOCK_POPUP_PATH := "user://rocket_unlock_popups.cfg"
const SR2_UNLOCK_SECTION := "popups"
const SR2_UNLOCK_KEY := "starterrocket2_seen"

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

	call_deferred("_maybe_show_starterrocket2_unlock_popup")

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

func _unhandled_input(event: InputEvent) -> void:
	if not (event is InputEventMouseButton):
		return
	var mouse_event := event as InputEventMouseButton
	if mouse_event.button_index != MOUSE_BUTTON_LEFT or not mouse_event.pressed:
		return
	if _try_launchpad_click_fallback(mouse_event.position):
		get_viewport().set_input_as_handled()

func _try_launchpad_click_fallback(screen_position: Vector2) -> bool:
	var launchpad = get_node_or_null("StructuresLayer/Launchpad")
	if launchpad == null:
		return false
	var sprite = launchpad.get_node_or_null("Sprite2D")
	if sprite == null or not sprite is Sprite2D:
		return false
	if not _sprite_contains_point(sprite, screen_position):
		return false
	if launchpad.has_method("on_interact"):
		launchpad.on_interact()
		return true
	return false

func _sprite_contains_point(sprite: Sprite2D, screen_position: Vector2) -> bool:
	if sprite.texture == null:
		return false
	var size = sprite.texture.get_size() * sprite.global_scale.abs()
	if size.x <= 0 or size.y <= 0:
		return false
	var top_left = sprite.global_position - (size * 0.5)
	return Rect2(top_left, size).has_point(screen_position)

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

func _maybe_show_starterrocket2_unlock_popup() -> void:
	if _has_seen_starterrocket2_unlock_popup():
		return
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if not rm or not rm.is_unlocked("starterrocket2"):
		return
	var completed_count = int(rm.get_completed_mission_count())
	if completed_count < 1:
		return
	_mark_starterrocket2_unlock_popup_seen()
	_show_starterrocket2_unlock_popup()

func _show_starterrocket2_unlock_popup() -> void:
	var overlay = ColorRect.new()
	overlay.name = "StarterRocket2UnlockOverlay"
	overlay.color = Color(0, 0, 0, 0.62)
	overlay.mouse_filter = Control.MOUSE_FILTER_STOP
	overlay.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(overlay)

	var center = CenterContainer.new()
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	overlay.add_child(center)

	var panel = PanelContainer.new()
	panel.custom_minimum_size = Vector2(700, 0)
	center.add_child(panel)

	var panel_style = preload("res://Scripts/UI/PanelStyle.gd")
	panel_style.apply_panel(panel)

	var body = VBoxContainer.new()
	body.add_theme_constant_override("separation", 10)
	panel.add_child(body)

	var title = Label.new()
	title.text = "Rocket Unlocked: Starter Rocket 2"
	panel_style.apply_title(title)
	body.add_child(title)

	var icon = TextureRect.new()
	icon.texture = RocketSpecs.get_icon_texture("starterrocket2")
	icon.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	icon.custom_minimum_size = Vector2(180, 180)
	icon.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	body.add_child(icon)

	var summary = Label.new()
	summary.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	summary.text = "Starter Rocket 2 is now available. It is faster and has longer range."
	panel_style.apply_body(summary)
	body.add_child(summary)

	var stats = Label.new()
	stats.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	stats.text = "Speed: 2.0x | Range: 2.0x | Cargo: 1.5x | Mining Laser: 1.5x | Cost: 1.3B F | Salvage: 20%"
	panel_style.apply_muted(stats)
	body.add_child(stats)

	var cta = Button.new()
	cta.text = "View Rockets"
	panel_style.apply_button(cta, true)
	cta.pressed.connect(func():
		if is_instance_valid(overlay):
			overlay.queue_free()
		_on_new_mission_button_pressed()
	)
	body.add_child(cta)

func _has_seen_starterrocket2_unlock_popup() -> bool:
	var cfg = ConfigFile.new()
	var err = cfg.load(SR2_UNLOCK_POPUP_PATH)
	if err != OK:
		return false
	return bool(cfg.get_value(SR2_UNLOCK_SECTION, SR2_UNLOCK_KEY, false))

func _mark_starterrocket2_unlock_popup_seen() -> void:
	var cfg = ConfigFile.new()
	cfg.load(SR2_UNLOCK_POPUP_PATH)
	cfg.set_value(SR2_UNLOCK_SECTION, SR2_UNLOCK_KEY, true)
	cfg.save(SR2_UNLOCK_POPUP_PATH)
