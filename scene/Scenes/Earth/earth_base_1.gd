extends Node2D

@export var show_ground_guide: bool = false

var camera_controller: Node
var scene_manager: SceneManager
var ui_manager: UIManager
const PREVIEW_SCENE_PATH := "res://Scenes/UI/AsteroidPreview/asteroid_preview.tscn"
const RocketSpecs = preload("res://Scripts/Utils/RocketSpecs.gd")
const PanelStyle = preload("res://Scripts/UI/PanelStyle.gd")
const ClassificationConsensus = preload("res://Scripts/Utils/ClassificationConsensus.gd")
const SR2_UNLOCK_POPUP_PATH := "user://rocket_unlock_popups.cfg"
const SR2_UNLOCK_SECTION := "popups"
const SR2_UNLOCK_KEY := "starterrocket2_seen"
const FREE_OPS_UNLOCK_KEY := "free_ops_unlock_seen"

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
	call_deferred("_maybe_show_free_ops_unlock")
	call_deferred("_maybe_offer_loan")
	call_deferred("_apply_tutorial_button_state")
	call_deferred("_apply_nav_safe_area")
	call_deferred("_check_classification_consensus")
	call_deferred("_apply_structure_visual_evolution")
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
	for btn in [back_btn, forward_btn, menu_btn, market_btn, space_map_btn]:
		_set_nav_min(btn, 152, 108)
	_set_nav_min(new_mission_btn, 210, 108)

	# ── Connect signals ───────────────────────────────────────────────────────
	back_btn.pressed.connect(_on_back_button_pressed)
	forward_btn.pressed.connect(_on_forward_button_pressed)
	menu_btn.pressed.connect(_on_menu_button_pressed)
	market_btn.pressed.connect(_on_market_button_pressed)
	space_map_btn.pressed.connect(_on_space_map_button_pressed)
	new_mission_btn.pressed.connect(_on_new_mission_button_pressed)

	# Prevent spacebar/enter from accidentally activating nav buttons via Godot's ui_accept
	for btn in [back_btn, forward_btn, menu_btn, market_btn, space_map_btn, new_mission_btn]:
		btn.focus_mode = Control.FOCUS_NONE


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
	normal.content_margin_left   = 12
	normal.content_margin_right  = 12
	normal.content_margin_top    = 8
	normal.content_margin_bottom = 8

	var hover := StyleBoxFlat.new()
	hover.bg_color = Color(_AMBER.r, _AMBER.g, _AMBER.b, 0.12) if is_amber else Color(1, 1, 1, 0.06)
	hover.border_width_right = normal.border_width_right
	hover.border_color = div
	hover.set_corner_radius_all(0)
	hover.content_margin_left   = 12
	hover.content_margin_right  = 12
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

func _set_nav_min(btn: Button, min_w: float, min_h: float) -> void:
	if btn == null:
		return
	var current := btn.custom_minimum_size
	btn.custom_minimum_size = Vector2(max(current.x, min_w), max(current.y, min_h))

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
	preload("res://Scripts/UI/GameNavigationMenu.gd").toggle(self)

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
	overlay.color = Color(0, 0, 0, 0.0)
	overlay.mouse_filter = Control.MOUSE_FILTER_STOP
	overlay.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(overlay)

	var center = CenterContainer.new()
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	overlay.add_child(center)

	var vp_w := get_viewport().get_visible_rect().size.x
	var panel = PanelContainer.new()
	panel.custom_minimum_size = Vector2(clampf(vp_w - 48.0, 300.0, 700.0), 0)
	panel.scale = Vector2(0.92, 0.92)
	panel.modulate = Color(1, 1, 1, 0.0)
	center.add_child(panel)

	var panel_style = preload("res://Scripts/UI/PanelStyle.gd")
	panel_style.apply_panel(panel)

	var body = VBoxContainer.new()
	body.add_theme_constant_override("separation", 10)
	panel.add_child(body)

	var title = Label.new()
	title.text = "Mission Milestone: Starter Rocket 2"
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
	summary.text = "Starter Rocket 2 is now available. It's faster, hits further, and carries a heavier load — your operational range just expanded significantly."
	panel_style.apply_body(summary)
	body.add_child(summary)

	var highlights = HBoxContainer.new()
	highlights.add_theme_constant_override("separation", 8)
	body.add_child(highlights)
	for text in ["SPEED 2.0x", "RANGE 2.0x", "CARGO 1.5x"]:
		var chip = PanelContainer.new()
		chip.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		panel_style.apply_panel(chip)
		var chip_label = Label.new()
		chip_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		chip_label.text = text
		panel_style.apply_body(chip_label)
		chip.add_child(chip_label)
		highlights.add_child(chip)

	var stats = Label.new()
	stats.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	stats.text = "Mining Laser: 1.5x | Cost: 1.3B F | Salvage Refund: 20%"
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

	var intro = create_tween()
	intro.tween_property(overlay, "color:a", 0.68, 0.25)
	intro.parallel().tween_property(panel, "modulate:a", 1.0, 0.28)
	intro.parallel().tween_property(panel, "scale", Vector2(1.0, 1.0), 0.28).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	var pulse = create_tween()
	pulse.set_loops()
	pulse.tween_property(icon, "modulate:a", 0.78, 0.65).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	pulse.tween_property(icon, "modulate:a", 1.0, 0.65).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)

func _maybe_show_free_ops_unlock() -> void:
	if _has_seen_free_ops_unlock():
		return
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if not rm:
		return
	# Free ops unlocks after completing all 4 authored missions
	if int(rm.get_completed_mission_count()) < 4:
		return
	_mark_free_ops_unlock_seen()
	_show_free_ops_unlock_overlay()

func _show_free_ops_unlock_overlay() -> void:
	var overlay = ColorRect.new()
	overlay.name = "FreeOpsUnlockOverlay"
	overlay.color = Color(0, 0, 0, 0.0)
	overlay.mouse_filter = Control.MOUSE_FILTER_STOP
	overlay.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(overlay)

	var center = CenterContainer.new()
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	overlay.add_child(center)

	var vp_w2 := get_viewport().get_visible_rect().size.x
	var panel = PanelContainer.new()
	panel.custom_minimum_size = Vector2(clampf(vp_w2 - 48.0, 300.0, 720.0), 0)
	panel.scale = Vector2(0.92, 0.92)
	panel.modulate = Color(1, 1, 1, 0.0)
	center.add_child(panel)

	var panel_style = preload("res://Scripts/UI/PanelStyle.gd")
	panel_style.apply_panel(panel)

	var body = VBoxContainer.new()
	body.add_theme_constant_override("separation", 12)
	panel.add_child(body)

	var title = Label.new()
	title.text = "Free Operations Unlocked"
	panel_style.apply_title(title)
	body.add_child(title)

	var desc = Label.new()
	desc.text = "You've completed the initial mission series. The belt is now open — run operations on your own schedule and terms.\n\nTwo routes are available each run:"
	desc.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	panel_style.apply_body(desc)
	body.add_child(desc)

	var routes = VBoxContainer.new()
	routes.add_theme_constant_override("separation", 8)
	body.add_child(routes)
	for route_info in [
		["Contract", "Work for a contractor. Complete their mineral order for a 20% bonus above market rate."],
		["Survey", "Scan and discover. Sell collected minerals on the open market at 80% of base value."]
	]:
		var chip = PanelContainer.new()
		chip.size_flags_horizontal = Control.SIZE_FILL
		panel_style.apply_panel(chip)
		var chip_body = VBoxContainer.new()
		chip_body.add_theme_constant_override("separation", 4)
		chip.add_child(chip_body)
		var chip_title = Label.new()
		chip_title.text = route_info[0]
		panel_style.apply_body(chip_title)
		chip_title.add_theme_color_override("font_color", Color(0.94, 0.69, 0.19, 1.0))
		chip_body.add_child(chip_title)
		var chip_desc = Label.new()
		chip_desc.text = route_info[1]
		chip_desc.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		panel_style.apply_muted(chip_desc)
		chip_body.add_child(chip_desc)
		routes.add_child(chip)

	var cta = Button.new()
	cta.text = "Start a Free Run"
	panel_style.apply_button(cta, true)
	cta.pressed.connect(func():
		if is_instance_valid(overlay):
			overlay.queue_free()
		_on_new_mission_button_pressed()
	)
	body.add_child(cta)

	var intro = create_tween()
	intro.tween_property(overlay, "color:a", 0.70, 0.28)
	intro.parallel().tween_property(panel, "modulate:a", 1.0, 0.30)
	intro.parallel().tween_property(panel, "scale", Vector2(1.0, 1.0), 0.30).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)

func _has_seen_free_ops_unlock() -> bool:
	var cfg = ConfigFile.new()
	var err = cfg.load(SR2_UNLOCK_POPUP_PATH)
	if err != OK:
		return false
	return bool(cfg.get_value(SR2_UNLOCK_SECTION, FREE_OPS_UNLOCK_KEY, false))

func _mark_free_ops_unlock_seen() -> void:
	var cfg = ConfigFile.new()
	cfg.load(SR2_UNLOCK_POPUP_PATH)
	cfg.set_value(SR2_UNLOCK_SECTION, FREE_OPS_UNLOCK_KEY, true)
	cfg.save(SR2_UNLOCK_POPUP_PATH)

func _maybe_offer_loan() -> void:
	var app = preload("res://Scripts/Utils/AppControllerHelper.gd").get_instance()
	if app == null or not app.has_method("can_take_loan"):
		return
	if not app.can_take_loan():
		return
	_show_loan_offer_dialog(app)

func _show_loan_offer_dialog(app: Node) -> void:
	var PanelStyle = preload("res://Scripts/UI/PanelStyle.gd")
	var viewport_size := get_viewport().get_visible_rect().size
	var bg := ColorRect.new()
	bg.color = Color(0, 0, 0, 0.65)
	bg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	bg.mouse_filter = Control.MOUSE_FILTER_STOP
	var ui_layer := CanvasLayer.new()
	ui_layer.layer = 80
	add_child(ui_layer)
	ui_layer.add_child(bg)

	var panel := PanelContainer.new()
	PanelStyle.apply_panel(panel)
	panel.custom_minimum_size = Vector2(420, 0)
	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 28)
	margin.add_theme_constant_override("margin_right", 28)
	margin.add_theme_constant_override("margin_top", 28)
	margin.add_theme_constant_override("margin_bottom", 28)
	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 18)
	margin.add_child(vbox)
	panel.add_child(margin)

	var title := Label.new()
	PanelStyle.apply_title(title)
	title.text = "Emergency Loan Available"
	vbox.add_child(title)

	var body := Label.new()
	PanelStyle.apply_body(body)
	body.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	body.text = "Your balance is too low to launch another mission. The Space Bank offers a 1.5B F emergency loan at 3% interest, auto-repaid from your next payout."
	vbox.add_child(body)

	var loan_amount_label := Label.new()
	PanelStyle.apply_muted(loan_amount_label)
	loan_amount_label.text = "Loan: 1.50B F  •  Repay: 1.545B F from next mission"
	vbox.add_child(loan_amount_label)

	var btn_row := HBoxContainer.new()
	btn_row.add_theme_constant_override("separation", 12)
	vbox.add_child(btn_row)

	var accept_btn := Button.new()
	PanelStyle.apply_button(accept_btn, true)
	accept_btn.text = "Accept Loan"
	accept_btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	btn_row.add_child(accept_btn)

	var decline_btn := Button.new()
	PanelStyle.apply_button(decline_btn, false)
	decline_btn.text = "No Thanks"
	decline_btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	btn_row.add_child(decline_btn)

	accept_btn.pressed.connect(func():
		app.take_loan()
		ui_layer.queue_free()
	)
	decline_btn.pressed.connect(func():
		ui_layer.queue_free()
	)

	ui_layer.add_child(panel)
	panel.set_anchors_preset(Control.PRESET_CENTER)

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
	_build_progression_cards()

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
	# Position below the EARTH_WIDGET zone (FrancBalance at y=12-62) to avoid overlap
	wordmark.offset_top = 66.0
	wordmark.offset_bottom = 86.0
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

func _build_progression_cards() -> void:
	var ui_layer = get_node_or_null("UILayer")
	if ui_layer == null:
		return
	var app = preload("res://Scripts/Utils/AppControllerHelper.gd").get_instance()
	if app != null and app.has_method("get_tutorial_state"):
		var state: Dictionary = app.get_tutorial_state()
		var skipped = bool(state.get("skipped", false))
		var step: Dictionary = state.get("current_step", {})
		# Keep the reserved tutorial lane clean: progression cards are post-tutorial
		# helpers and should never overlap the active linear tutorial flow.
		if not skipped and not step.is_empty():
			return
	var cards_root = VBoxContainer.new()
	cards_root.name = "ProgressionCards"
	cards_root.add_theme_constant_override("separation", 10)
	cards_root.set_anchors_preset(Control.PRESET_TOP_RIGHT)
	cards_root.offset_left = -380
	cards_root.offset_right = -20
	cards_root.offset_top = 40
	cards_root.offset_bottom = 320
	cards_root.clip_contents = true
	ui_layer.add_child(cards_root)

	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if not rm:
		return
		
	var completed_count = int(rm.get_completed_mission_count())
	if completed_count >= 1:
		cards_root.add_child(_build_next_mission_card())
		
	# Show star map after M1 completion (regardless of scanner station)
	if completed_count >= 1:
		cards_root.add_child(_build_star_map_card())

func _build_next_mission_card() -> PanelContainer:
	var panel = PanelContainer.new()
	panel.size_flags_horizontal = Control.SIZE_FILL
	PanelStyle.apply_panel(panel)
	var body = VBoxContainer.new()
	body.add_theme_constant_override("separation", 6)
	panel.add_child(body)
	var title = Label.new()
	title.text = "Next Mission Available"
	title.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	PanelStyle.apply_title(title)
	title.add_theme_font_size_override("font_size", 20)
	body.add_child(title)
	var subtitle = Label.new()
	var _rm_ref = preload("res://Scripts/Utils/RocketsManager.gd")
	var _stage = int(_rm_ref.get_mission_stage()) if _rm_ref else 0
	match _stage:
		1: subtitle.text = "Launch your first mission — pick a contractor, select a target, deploy."
		2: subtitle.text = "Starter Rocket 2 is ready — push further with extended range."
		3: subtitle.text = "Mission 3 is available — fly to a real NASA TESS planet candidate."
		4: subtitle.text = "Mission 4 is ready — build the Scanner Station and try drone mining."
		_: subtitle.text = "Free Operations are open — pick any target and contractor."
	subtitle.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	PanelStyle.apply_body(subtitle)
	body.add_child(subtitle)
	var cta = Button.new()
	cta.text = "Open Launchpad"
	PanelStyle.apply_button(cta, true)
	cta.pressed.connect(_on_new_mission_button_pressed)
	body.add_child(cta)
	return panel

func _build_star_map_card() -> PanelContainer:
	var panel = PanelContainer.new()
	panel.size_flags_horizontal = Control.SIZE_FILL
	PanelStyle.apply_panel(panel)
	var body = VBoxContainer.new()
	body.add_theme_constant_override("separation", 6)
	panel.add_child(body)
	var title = Label.new()
	title.text = "Star Map"
	title.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	PanelStyle.apply_title(title)
	title.add_theme_font_size_override("font_size", 20)
	body.add_child(title)
	var discovered_count = _get_discovered_planet_count()
	var subtitle = Label.new()
	subtitle.text = "%d planet candidate%s charted" % [discovered_count, "" if discovered_count == 1 else "s"]
	subtitle.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	PanelStyle.apply_body(subtitle)
	body.add_child(subtitle)
	var hint = Label.new()
	hint.text = "Track discoveries and unlock distant targets."
	hint.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	PanelStyle.apply_muted(hint)
	body.add_child(hint)
	var cta = Button.new()
	cta.text = "Open Star Map"
	PanelStyle.apply_button(cta, false)
	cta.pressed.connect(_on_space_map_button_pressed)
	body.add_child(cta)
	return panel

func _get_discovered_planet_count() -> int:
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if not rm:
		return 0
	var state = rm.load_state()
	var seen_planets = state.get("seen_planets", [])
	var seen_count = seen_planets.size() if typeof(seen_planets) == TYPE_ARRAY else 0
	var detected_planets = 0
	for target in rm.get_detected_targets():
		var target_type = str(target.get("type", "")).to_lower()
		if target_type == "planet" or target_type == "tess":
			detected_planets += 1
	return max(seen_count, detected_planets)

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

func _check_classification_consensus() -> void:
	ClassificationConsensus.check_for_updates(get_tree(), func(updates: Array) -> void:
		if updates.is_empty():
			return
		_show_consensus_notifications(updates)
	)

func _show_consensus_notifications(updates: Array) -> void:
	if updates.is_empty():
		return
	# Build a single dismissable notification panel listing all updates
	var layer := CanvasLayer.new()
	layer.layer = 90
	add_child(layer)

	var panel := PanelContainer.new()
	var pstyle := StyleBoxFlat.new()
	pstyle.bg_color = Color(0.06, 0.10, 0.18, 0.97)
	pstyle.border_color = Color(0.3, 0.65, 1.0, 0.8)
	pstyle.set_border_width_all(2)
	pstyle.set_corner_radius_all(8)
	pstyle.content_margin_left = 18
	pstyle.content_margin_right = 18
	pstyle.content_margin_top = 14
	pstyle.content_margin_bottom = 14
	panel.add_theme_stylebox_override("panel", pstyle)
	panel.custom_minimum_size = Vector2(320, 0)
	panel.anchor_left = 0.5
	panel.anchor_right = 0.5
	panel.anchor_top = 0.0
	panel.anchor_bottom = 0.0
	panel.offset_left = -160.0
	panel.offset_top = 60.0
	panel.offset_right = 160.0
	layer.add_child(panel)

	var col := VBoxContainer.new()
	col.add_theme_constant_override("separation", 8)
	panel.add_child(col)

	var hdr := Label.new()
	hdr.text = "📡  Classification Update"
	hdr.add_theme_color_override("font_color", Color(0.4, 0.75, 1.0, 1.0))
	hdr.add_theme_font_size_override("font_size", 15)
	col.add_child(hdr)

	var rm := preload("res://Scripts/Utils/RocketsManager.gd")
	for entry_any in updates:
		if typeof(entry_any) != TYPE_DICTIONARY:
			continue
		var entry: Dictionary = entry_any
		var anomaly_id := str(entry.get("anomaly_id", ""))
		var player_verdict := str(entry.get("player_verdict", ""))
		var consensus_verdict := str(entry.get("consensus_verdict", ""))
		var target_label: String = str(rm.get_target_details(anomaly_id).get("label", anomaly_id))

		var row_lbl := Label.new()
		var matches := player_verdict == consensus_verdict
		var pv_display := "Planet" if player_verdict == "planet" else "Not a Planet"
		var cv_display := "Planet" if consensus_verdict == "planet" else "Not a Planet"
		var agree_icon := "✓" if matches else "✗"
		var consensus_label := ClassificationConsensus.consensus_label(anomaly_id)
		row_lbl.text = "%s %s — consensus: %s\n  %s" % [agree_icon, target_label, cv_display, consensus_label]
		row_lbl.add_theme_font_size_override("font_size", 13)
		row_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		row_lbl.add_theme_color_override("font_color",
			Color(0.5, 1.0, 0.6, 1.0) if matches else Color(1.0, 0.55, 0.4, 1.0))
		col.add_child(row_lbl)

	var dismiss_btn := Button.new()
	dismiss_btn.text = "Got it"
	PanelStyle.apply_button(dismiss_btn, false)
	dismiss_btn.pressed.connect(func() -> void:
		ClassificationConsensus.mark_all_notified()
		layer.queue_free()
	)
	col.add_child(dismiss_btn)

# ── Earth base visual evolution ───────────────────────────────────────────────
## Structure visual evolution: scales existing sprites to reflect upgrade tiers,
## and shows construction-project structures with a placement animation.
## Art assets (tier-specific sprites) are TODO — scale is used as placeholder.

const _STRUCTURE_SCALE_PER_TIER := {1: 1.0, 2: 1.15, 3: 1.30, 4: 1.45}
const _CONSTRUCTION_STRUCTURE_POSITIONS := {
	"relay_1":    Vector2(2100, 800),
	"refinery_1": Vector2(400, 800),
}
const _STRUCTURE_SEEN_CFG := "user://structure_intro_seen.cfg"

func _apply_structure_visual_evolution() -> void:
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if rm == null:
		return
	var app = preload("res://Scripts/Utils/AppControllerHelper.gd").get_instance()
	var player_level := 1
	if app and app.has_method("get_experience_level"):
		player_level = int(app.get_experience_level())

	# Scale the three starter structures based on their room upgrade tiers.
	# "starterrocket1" is the primary type for tier tracking at L1-L4.
	var primary_type := "starterrocket1"
	var upgrades: Dictionary = rm.get_type_room_upgrades(primary_type)
	var mining_tier := int(upgrades.get("mining", 1))
	var cargo_tier  := int(upgrades.get("cargo", 1))

	# Satellite Station → scales with scanner (track via mission count as proxy)
	var mission_count := int(rm.get_completed_mission_count())
	var scanner_tier: int = clamp(1 + int(rm.is_scanner_station_built()), 1, 2)
	_scale_structure("SatelliteStation", scanner_tier)
	_scale_structure("Launchpad", mining_tier)
	_scale_structure("ControlStation", cargo_tier)

	# Show construction-project structures when completed
	if player_level >= 5:
		for proj_id in _CONSTRUCTION_STRUCTURE_POSITIONS.keys():
			if preload("res://Scripts/Utils/ConstructionManager.gd").is_project_completed(proj_id):
				_ensure_construction_structure_visible(proj_id)

func _scale_structure(node_name: String, tier: int) -> void:
	var layers := get_node_or_null("StructuresLayer")
	if layers == null:
		return
	var structure := layers.get_node_or_null(node_name) as Node2D
	if structure == null:
		return
	var scale_mult: float = _STRUCTURE_SCALE_PER_TIER.get(clamp(tier, 1, 4), 1.0)
	structure.scale = structure.scale * scale_mult

func _ensure_construction_structure_visible(proj_id: String) -> void:
	var layers := get_node_or_null("StructuresLayer")
	if layers == null:
		return
	var node_name := "ConstructionStructure_%s" % proj_id
	if layers.get_node_or_null(node_name) != null:
		return  # Already added

	var cfg := ConfigFile.new()
	var is_new := cfg.load(_STRUCTURE_SEEN_CFG) != OK or \
		not cfg.has_section_key("seen", proj_id)

	var sprite := Sprite2D.new()
	sprite.name = node_name
	sprite.position = _CONSTRUCTION_STRUCTURE_POSITIONS.get(proj_id, Vector2(0, 0))
	# Use launchpad sprite as placeholder (art asset for each project TBD)
	var tex = load("res://assets/Structures/launchpad.png") as Texture2D
	if tex:
		sprite.texture = tex
	sprite.scale = Vector2(0.35, 0.35)
	# Tint to distinguish from base structures
	sprite.modulate = Color(0.7, 0.9, 1.0, 1.0)
	layers.add_child(sprite)

	if is_new:
		# Placement animation: scale from 0 → full
		var target_scale := sprite.scale
		sprite.scale = Vector2.ZERO
		var tween := create_tween()
		tween.set_ease(Tween.EASE_OUT)
		tween.set_trans(Tween.TRANS_BACK)
		tween.tween_property(sprite, "scale", target_scale, 0.6)
		cfg.set_value("seen", proj_id, true)
		cfg.save(_STRUCTURE_SEEN_CFG)
