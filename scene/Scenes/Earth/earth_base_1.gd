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
	call_deferred("_apply_tutorial_button_state")
	_build_earth_base_identity()

func _setup_buttons() -> void:
	var back_btn        := $UILayer/ButtonContainer/BackButton       as Button
	var forward_btn     := $UILayer/ButtonContainer/ForwardButton    as Button
	var menu_btn        := $UILayer/ButtonContainer/MenuButton       as Button
	var market_btn      := $UILayer/ButtonContainer/MarketButton     as Button
	var space_map_btn   := $UILayer/ButtonContainer/SpaceMapButton   as Button
	var new_mission_btn := $UILayer/ButtonContainer/NewMissionButton as Button
	var container       := $UILayer/ButtonContainer                  as HBoxContainer

	# ── Unified pill background behind all buttons ───────────────────────────
	var bg := Panel.new()
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	bg.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var bg_style := StyleBoxFlat.new()
	bg_style.bg_color     = Color(0.03, 0.03, 0.04, 0.94)
	bg_style.border_color = Color(0.28, 0.88, 0.96, 0.35)   # cyan, low-opacity border
	bg_style.set_border_width_all(1)
	bg_style.set_corner_radius_all(12)
	bg.add_theme_stylebox_override("panel", bg_style)
	container.add_child(bg)
	container.move_child(bg, 0)
	container.add_theme_constant_override("separation", 0)

	# ── Style buttons as transparent slots with divider on the right ─────────
	_style_nav_slot(back_btn,        false)
	_style_nav_slot(forward_btn,     false)
	_style_nav_slot(menu_btn,        false)
	_style_nav_slot(market_btn,      false)
	_style_nav_slot(space_map_btn,   false)
	_style_nav_slot(new_mission_btn, true)   # amber, no right divider

	# ── Labels and icons ─────────────────────────────────────────────────────
	back_btn.text        = "Back"
	forward_btn.text     = "Next"
	menu_btn.text        = "Menu"
	market_btn.text      = "Market"
	space_map_btn.text   = "Map"
	new_mission_btn.text = "New Mission"

	_load_icon(back_btn,        "res://Resources/Icons/nav_back.svg",    false)
	_load_icon(forward_btn,     "res://Resources/Icons/nav_forward.svg", false)
	_load_icon(menu_btn,        "res://Resources/Icons/nav_menu.svg",    false)
	_load_icon(market_btn,      "res://Resources/Icons/nav_market.svg",  false)
	_load_icon(space_map_btn,   "res://Resources/Icons/nav_map.svg",     false)
	_load_icon(new_mission_btn, "res://Resources/Icons/nav_mission.svg", true)

	# ── Connect signals ───────────────────────────────────────────────────────
	back_btn.pressed.connect(_on_back_button_pressed)
	forward_btn.pressed.connect(_on_forward_button_pressed)
	menu_btn.pressed.connect(_on_menu_button_pressed)
	market_btn.pressed.connect(_on_market_button_pressed)
	space_map_btn.pressed.connect(_on_space_map_button_pressed)
	new_mission_btn.pressed.connect(_on_new_mission_button_pressed)


const _AMBER        := Color(0.941, 0.690, 0.188, 1.0)
const _CYAN_FAINT   := Color(0.28, 0.88, 0.96, 0.35)   # cyan divider
const _FONT_WHITE   := Color(0.95, 0.93, 0.90, 1.0)

func _style_nav_slot(btn: Button, is_amber: bool) -> void:
	var col: Color = _AMBER if is_amber else _FONT_WHITE
	var div: Color = Color(_AMBER.r, _AMBER.g, _AMBER.b, 0.60) if is_amber else _CYAN_FAINT

	var normal := StyleBoxFlat.new()
	normal.bg_color = Color(0, 0, 0, 0)
	normal.border_width_right = 0 if is_amber else 1
	normal.border_color = div
	normal.set_corner_radius_all(0)
	normal.content_margin_top    = 8
	normal.content_margin_bottom = 8

	var hover := StyleBoxFlat.new()
	hover.bg_color = Color(_AMBER.r, _AMBER.g, _AMBER.b, 0.12) if is_amber else Color(1, 1, 1, 0.06)
	hover.border_width_right = normal.border_width_right
	hover.border_color = div
	hover.set_corner_radius_all(0)
	hover.content_margin_top    = 8
	hover.content_margin_bottom = 8

	var pressed := hover.duplicate()
	pressed.bg_color = Color(_AMBER.r, _AMBER.g, _AMBER.b, 0.22) if is_amber else Color(1, 1, 1, 0.12)

	btn.add_theme_stylebox_override("normal",  normal)
	btn.add_theme_stylebox_override("hover",   hover)
	btn.add_theme_stylebox_override("pressed", pressed)
	btn.add_theme_stylebox_override("focus",   hover)
	btn.add_theme_color_override("font_color",         col)
	btn.add_theme_color_override("font_hover_color",   col)
	btn.add_theme_color_override("font_pressed_color", col)
	btn.add_theme_font_size_override("font_size", 28)
	# Lock so UIConsistencyEnforcer does not override our custom nav styling
	btn.set_meta("ui_style_locked", true)


func _load_icon(btn: Button, path: String, is_amber: bool) -> void:
	if not ResourceLoader.exists(path):
		return
	var tex := load(path) as Texture2D
	if tex == null:
		return
	btn.icon = tex
	var col: Color = _AMBER if is_amber else _FONT_WHITE
	btn.add_theme_color_override("icon_normal_color",  col)
	btn.add_theme_color_override("icon_hover_color",   col)
	btn.add_theme_color_override("icon_pressed_color", col)

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
	preload("res://Scripts/Utils/AppControllerHelper.gd").record_tutorial_action("open_launchpad")
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

func _apply_tutorial_button_state() -> void:
	var app = preload("res://Scripts/Utils/AppControllerHelper.gd").get_instance()
	var tutorial_active := false
	if app != null and app.has_method("get_tutorial_state"):
		var state: Dictionary = app.get_tutorial_state()
		tutorial_active = not state.is_empty() and not bool(state.get("skipped", false))
	# During the tutorial keep only Menu + New Mission active.
	# SpaceMap, Market, and Forward lead nowhere useful and confuse new players.
	for btn_path in [
		"UILayer/ButtonContainer/ForwardButton",
		"UILayer/ButtonContainer/MarketButton",
		"UILayer/ButtonContainer/SpaceMapButton",
	]:
		var btn := get_node_or_null(btn_path) as Button
		if btn:
			btn.disabled = tutorial_active

func _build_earth_base_identity() -> void:
	_build_wordmark()
	_build_ambient_stars()

func _build_wordmark() -> void:
	var ui_layer = get_node_or_null("UILayer")
	if ui_layer == null:
		return
	var wordmark = Label.new()
	wordmark.name = "PlanetHuntersWordmark"
	wordmark.text = "PLANET HUNTERS"
	wordmark.add_theme_font_size_override("font_size", 15)
	wordmark.add_theme_color_override("font_color", Color(0.90, 0.87, 0.82, 0.45))
	wordmark.set_anchors_preset(Control.PRESET_TOP_WIDE)
	wordmark.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	wordmark.offset_top = 10.0
	wordmark.offset_bottom = 30.0
	wordmark.mouse_filter = Control.MOUSE_FILTER_IGNORE
	ui_layer.add_child(wordmark)

func _build_ambient_stars() -> void:
	var star_layer = CanvasLayer.new()
	star_layer.name = "AmbientStarLayer"
	star_layer.layer = -1
	add_child(star_layer)
	var star_root = Node2D.new()
	star_layer.add_child(star_root)
	var vp = get_viewport_rect().size
	var sky_h = vp.y * 0.50
	var rng = RandomNumberGenerator.new()
	rng.seed = 0xC3B9A1
	for _i in range(55):
		var dot = ColorRect.new()
		var sz = rng.randf_range(1.0, 2.4)
		dot.size = Vector2(sz, sz)
		dot.color = Color(0.88, 0.94, 1.0, rng.randf_range(0.10, 0.32))
		dot.position = Vector2(rng.randf_range(0.0, vp.x), rng.randf_range(0.0, sky_h))
		dot.mouse_filter = Control.MOUSE_FILTER_IGNORE
		star_root.add_child(dot)

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
