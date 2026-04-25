extends Node2D

@export var show_ground_guide: bool = false

var camera_controller: Node
var scene_manager: SceneManager
var ui_manager: UIManager
const PREVIEW_SCENE_PATH := "res://Scenes/UI/AsteroidPreview/asteroid_preview.tscn"
const RocketSpecs = preload("res://Scripts/Utils/RocketSpecs.gd")
const PanelStyle = preload("res://Scripts/UI/PanelStyle.gd")
const UILayout = preload("res://Scripts/UI/UILayout.gd")
const ClassificationConsensus = preload("res://Scripts/Utils/ClassificationConsensus.gd")
const EarthBaseActionCard = preload("res://Scripts/UI/EarthBaseActionCard.gd")
const EarthBaseProgressionCards = preload("res://Scripts/UI/EarthBaseProgressionCards.gd")
const StarterRocket2UnlockOverlayScene = preload("res://Scenes/UI/StarterRocket2UnlockOverlay.tscn")
const FreeOpsUnlockOverlayScene = preload("res://Scenes/UI/FreeOpsUnlockOverlay.tscn")
const StarterRocket2HighlightChipScene = preload("res://Scenes/UI/Templates/StarterRocket2HighlightChip.tscn")
const EarthBaseBuildFlowOverlayScene = preload("res://Scenes/UI/EarthBaseBuildFlowOverlay.tscn")
const EmergencyLoanOfferDialogScene = preload("res://Scenes/UI/EmergencyLoanOfferDialog.tscn")
const ClassificationConsensusNotificationScene = preload("res://Scenes/UI/ClassificationConsensusNotification.tscn")
const ControlStationScript = preload("res://Scripts/Earth/ControlStation.gd")
const ControlStationTexture = preload("res://assets/Structures/ControlStation.png")
const PreviewRouting = preload("res://Scripts/UI/NewMissionPreviewRouting.gd")
const SR2_UNLOCK_POPUP_PATH := "user://rocket_unlock_popups.cfg"
const SR2_UNLOCK_SECTION := "popups"
const SR2_UNLOCK_KEY := "starterrocket2_seen"
const FREE_OPS_UNLOCK_KEY := "free_ops_unlock_seen"
const SR2_UNLOCK_INTRO_SECONDS := 0.9
const CONTROL_STATION_POSITION := Vector2(1600, 800)
const CONTROL_STATION_LABEL_POSITION := Vector2(1600, 620)
const CONTROL_STATION_COLLISION_SIZE := Vector2(200, 200)
const GLASS_CARD_BG := Color(0.06, 0.10, 0.16, 0.95)
const GLASS_CARD_SUBTLE_BG := Color(0.08, 0.12, 0.20, 0.93)

var _build_flow_requested_structure: String = ""
var _build_flow_location_id: String = ""

@onready var _progression_cards_root: EarthBaseProgressionCards = $UILayer/ProgressionCards

func _ready() -> void:
	_ensure_tutorial_runtime()
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
	_sync_control_station_presence()
	_connect_app_runtime_signals()
	
	# Create ground guide lines if enabled
	if show_ground_guide:
		var DebugVisualizer = preload("res://Scripts/Earth/DebugVisualizer.gd")
		DebugVisualizer.create_ground_guides(self)

	var app_ctrl = preload("res://Scripts/Utils/AppControllerHelper.gd").get_instance()
	var ux_tour_running = app_ctrl != null and app_ctrl.get("is_ux_tour_running") == true

	if not ux_tour_running:
		call_deferred("_maybe_show_starterrocket2_unlock_popup")
		call_deferred("_maybe_show_free_ops_unlock")
		call_deferred("_maybe_offer_loan")
		call_deferred("_check_classification_consensus")

	call_deferred("_apply_tutorial_button_state")
	call_deferred("_apply_nav_safe_area")
	call_deferred("_apply_structure_visual_evolution")
	_build_earth_base_identity()

func _ensure_tutorial_runtime() -> void:
	var app = preload("res://Scripts/Utils/AppControllerHelper.gd").get_instance()
	if app != null and app.has_method("_ensure_tutorial_runtime"):
		app._ensure_tutorial_runtime()

func _connect_app_runtime_signals() -> void:
	var app = preload("res://Scripts/Utils/AppControllerHelper.gd").get_instance()
	if app == null:
		return
	if app.has_signal("rockets_reset") and not app.rockets_reset.is_connected(_on_rockets_reset):
		app.rockets_reset.connect(_on_rockets_reset)

func _setup_buttons() -> void:
	var back_btn        := $UILayer/ButtonContainer/BackButton       as Button
	var forward_btn     := $UILayer/ButtonContainer/ForwardButton    as Button
	var menu_btn        := $UILayer/ButtonContainer/MenuButton       as Button
	var market_btn      := $UILayer/ButtonContainer/MarketButton     as Button
	var space_map_btn   := $UILayer/ButtonContainer/SpaceMapButton   as Button
	var build_btn       := $UILayer/ButtonContainer/BuildButton      as Button
	var new_mission_btn := $UILayer/ButtonContainer/NewMissionButton as Button
	var container       := $UILayer/ButtonContainer                  as HBoxContainer

	# ── Unified pill background behind all buttons ───────────────────────────
	var bg := $UILayer/ButtonContainer/NavBackground as Panel
	var bg_style := StyleBoxFlat.new()
	bg_style.bg_color     = Color(0.03, 0.03, 0.04, 0.94)
	bg_style.border_color = Color(0.28, 0.88, 0.96, 0.35)   # cyan, low-opacity border
	bg_style.set_border_width_all(1)
	bg_style.set_corner_radius_all(12)
	bg.add_theme_stylebox_override("panel", bg_style)
	container.add_theme_constant_override("separation", 0)

	# ── Style buttons as transparent slots with divider on the right ─────────
	_style_nav_slot(back_btn,        false)
	_style_nav_slot(forward_btn,     false)
	_style_nav_slot(menu_btn,        false)
	_style_nav_slot(market_btn,      false)
	_style_nav_slot(space_map_btn,   false)
	_style_nav_slot(build_btn,       false)
	_style_nav_slot(new_mission_btn, true)   # amber, no right divider

	# ── Labels and icons ─────────────────────────────────────────────────────
	back_btn.text        = "Back"
	forward_btn.text     = "Next"
	menu_btn.text        = "Menu"
	market_btn.text      = "Market"
	space_map_btn.text   = "Map"
	build_btn.text       = "Build"
	new_mission_btn.text = "New Mission"

	_load_icon(back_btn,        "res://Resources/Icons/nav_back.svg",    false)
	_load_icon(forward_btn,     "res://Resources/Icons/nav_forward.svg", false)
	_load_icon(menu_btn,        "res://Resources/Icons/nav_menu.svg",    false)
	_load_icon(market_btn,      "res://Resources/Icons/nav_market.svg",  false)
	_load_icon(space_map_btn,   "res://Resources/Icons/nav_map.svg",     false)
	_load_icon(new_mission_btn, "res://Resources/Icons/nav_mission.svg", true)
	for btn in [back_btn, forward_btn, menu_btn, market_btn, space_map_btn, build_btn]:
		_set_nav_min(btn, 152, 108)
	_set_nav_min(new_mission_btn, 210, 108)

	# ── Connect signals ───────────────────────────────────────────────────────
	back_btn.pressed.connect(_on_back_button_pressed)
	forward_btn.pressed.connect(_on_forward_button_pressed)
	menu_btn.pressed.connect(_on_menu_button_pressed)
	market_btn.pressed.connect(_on_market_button_pressed)
	space_map_btn.pressed.connect(_on_space_map_button_pressed)
	build_btn.pressed.connect(_on_build_button_pressed)
	new_mission_btn.pressed.connect(_on_new_mission_button_pressed)

	# Prevent spacebar/enter from accidentally activating nav buttons via Godot's ui_accept
	for btn in [back_btn, forward_btn, menu_btn, market_btn, space_map_btn, build_btn, new_mission_btn]:
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

func _on_build_button_pressed() -> void:
	_start_guided_build_flow("")

func _show_build_overlay() -> void:
	_start_guided_build_flow("")

func _start_guided_build_flow(requested_structure: String = "") -> void:
	var existing := get_node_or_null("UILayer/BuildOverlay")
	if existing:
		existing.queue_free()
	var overlay := EarthBaseBuildFlowOverlayScene.instantiate()
	if overlay == null:
		return
	overlay.name = "BuildOverlay"
	overlay.set_meta("tutorial_zone_exempt", true)
	$UILayer.add_child(overlay)
	_build_flow_requested_structure = requested_structure
	_build_flow_location_id = ""
	if overlay.has_signal("cancelled"):
		overlay.cancelled.connect(func() -> void:
			_build_flow_requested_structure = ""
			_build_flow_location_id = ""
		)
	if overlay.has_signal("location_selected"):
		overlay.location_selected.connect(func(location_id: String) -> void:
			if location_id == "":
				_show_build_location_step(overlay)
				return
			_build_flow_location_id = location_id
			_show_build_structure_step(overlay)
		)
	if overlay.has_signal("structure_selected"):
		overlay.structure_selected.connect(func(structure_id: String) -> void:
			_complete_guided_structure_build(structure_id, overlay)
		)
	_show_build_location_step(overlay)

func _show_build_location_step(overlay: Control) -> void:
	var items := [{
		"id": "earth_base",
		"title": "Earth Base",
		"subtitle": "Primary surface hub for fleet, scanning, and future construction.",
		"meta": "SELECT BUILD SITE"
	}]
	var subtitle := "Select the Earth Base first, then choose the structure to place."
	var message := ""
	if _build_flow_requested_structure == "control_station":
		subtitle = "Mission 2 introduces base construction. Select Earth Base to place the Control Station."
		message = "This is the first time the base expands. Place the Control Station here to unlock mission planning for Starter Rocket 2."
	elif _build_flow_requested_structure == "scanner_station":
		subtitle = "Legacy scanner placement flow."
		message = "The Scanner Station is now part of the Mission 3 and early-autonomy toolset, so this path should rarely be needed."
	if overlay.has_method("show_location_step"):
		overlay.call("show_location_step", "Select build location", subtitle, items, message)

func _show_build_structure_step(overlay: Control) -> void:
	var options := _available_build_structures()
	if _build_flow_requested_structure != "":
		var filtered := []
		for option_any in options:
			if typeof(option_any) != TYPE_DICTIONARY:
				continue
			var option: Dictionary = option_any
			if str(option.get("id", "")) == _build_flow_requested_structure:
				filtered.append(option)
		options = filtered
	var message := ""
	if options.is_empty():
		message = "No new structures are available at the current mission stage."
	if overlay.has_method("show_structure_step"):
		overlay.call("show_structure_step", "Select structure", "Choose the structure to place on Earth Base.", options, message)

func _available_build_structures() -> Array:
	var options := []
	if _control_station_build_required():
		options.append({
			"id": "control_station",
			"title": "Control Station",
			"subtitle": "Mission 2 fleet hub. Unlocks structured route planning and Starter Rocket 2 prep.",
			"meta": "MISSION 2 GATE"
		})
	if _scanner_station_build_required():
		options.append({
			"id": "scanner_station",
			"title": "Scanner Station",
			"subtitle": "Legacy placement flow for older saves. Current progression expects the scanner to already be available by Mission 4.",
			"meta": "LEGACY SUPPORT"
		})
	return options

func _complete_guided_structure_build(structure_id: String, overlay: Control) -> void:
	var success := false
	match structure_id:
		"control_station":
			success = _complete_control_station_build()
		"scanner_station":
			success = _complete_scanner_station_build()
	if success and is_instance_valid(overlay):
		overlay.queue_free()
	_build_flow_requested_structure = ""
	_build_flow_location_id = ""

func _complete_control_station_build() -> bool:
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if not rm or rm.is_control_station_built() or not _control_station_build_required():
		return false
	rm.set_control_station_built(true)
	preload("res://Scripts/Utils/AppControllerHelper.gd").record_tutorial_action("build_control_station")
	_sync_control_station_presence()
	_apply_control_station_visual_tier()
	_apply_tutorial_button_state()
	_build_progression_cards()
	return true

func _complete_scanner_station_build() -> bool:
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if not rm or rm.is_scanner_station_built() or not _scanner_station_build_required():
		return false
	var app = get_tree().root.find_child("AppController", true, false)
	if app == null or not app.has_method("get_franc_balance") or not app.has_method("add_franc_balance"):
		return false
	var cost = rm.get_scanner_build_cost()
	var balance = int(app.get_franc_balance())
	if not rm.can_afford_scanner_build(balance):
		return false
	app.add_franc_balance(-cost, "build_scanner_station")
	rm.set_scanner_station_built(true)
	preload("res://Scripts/Utils/AppControllerHelper.gd").record_tutorial_action("build_scanner_station")
	_apply_tutorial_button_state()
	_build_progression_cards()
	return true

func _on_space_map_button_pressed() -> void:
	print("Space Map button pressed - opening space map scene")
	if scene_manager:
		scene_manager.change_to_scene("res://Scenes/UI/SpaceMap/space_map.tscn")
	else:
		get_tree().change_scene_to_file("res://Scenes/UI/SpaceMap/space_map.tscn")

func _on_new_mission_button_pressed() -> void:
	if _control_station_build_required():
		_build_progression_cards()
		return
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
	var sr2_range := RocketSpecs.get_max_range_au("starterrocket2")
	var sr1_range := RocketSpecs.get_max_range_au("starterrocket1")
	var overlay: ColorRect = StarterRocket2UnlockOverlayScene.instantiate()
	overlay.name = "StarterRocket2UnlockOverlay"
	add_child(overlay)
	var intro: Label = overlay.get_node("Center/Stack/IntroLabel")
	intro.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	intro.modulate = Color(1, 1, 1, 0.0)
	PanelStyle.apply_title_on_dark(intro)
	intro.add_theme_font_size_override("font_size", 36 if get_viewport().get_visible_rect().size.x < 1200.0 else 42)

	var viewport := get_viewport().get_visible_rect().size
	var vp_w := viewport.x
	var compact := viewport.x < 1200.0
	var panel: PanelContainer = overlay.get_node("Center/Stack/Card")
	panel.custom_minimum_size = Vector2(clampf(vp_w - 48.0, 300.0, 700.0), 0)
	_apply_glass_callout_panel(panel)
	var body: VBoxContainer = overlay.get_node("Center/Stack/Card/Body")
	var eyebrow: Label = overlay.get_node("Center/Stack/Card/Body/Eyebrow")
	eyebrow.add_theme_color_override("font_color", Color(0.28, 0.88, 0.96, 1.0))
	eyebrow.add_theme_font_size_override("font_size", 18 if compact else 20)
	var content: HBoxContainer = overlay.get_node("Center/Stack/Card/Body/Content")
	var icon_shell: PanelContainer = overlay.get_node("Center/Stack/Card/Body/Content/IconShell")
	icon_shell.custom_minimum_size = Vector2(200 if compact else 240, 220 if compact else 260)
	icon_shell.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	_apply_glass_callout_panel(icon_shell, Color(0.08, 0.11, 0.16, 0.92), 0.46, 18, 18, 16)
	var icon: TextureRect = overlay.get_node("Center/Stack/Card/Body/Content/IconShell/Icon")
	icon.texture = RocketSpecs.get_icon_texture("starterrocket2")
	icon.custom_minimum_size = Vector2(160 if compact else 180, 190 if compact else 220)
	var details: VBoxContainer = overlay.get_node("Center/Stack/Card/Body/Content/Details")
	var title: Label = overlay.get_node("Center/Stack/Card/Body/Content/Details/Title")
	PanelStyle.apply_title_on_dark(title)
	title.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	var summary: Label = overlay.get_node("Center/Stack/Card/Body/Content/Details/Summary")
	summary.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	summary.text = "You proved the first route works. SR2 doubles your speed, stretches your operating radius to %.0f AU, and carries a bigger haul for the next belt run." % sr2_range
	PanelStyle.apply_body_on_dark(summary)
	summary.add_theme_font_size_override("font_size", 24 if compact else 28)

	var flavour: Label = overlay.get_node("Center/Stack/Card/Body/Content/Details/Flavour")
	flavour.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	flavour.text = "Mission 2 is no longer out of reach. Build the upgrade, then push your operation deeper into the belt."
	PanelStyle.apply_muted_on_dark(flavour)

	var highlights: VBoxContainer = overlay.get_node("Center/Stack/Card/Body/Content/Details/Highlights")
	for child in highlights.get_children():
		highlights.remove_child(child)
		child.queue_free()
	for text in [
		"2x SPEED  •  Turn the next route around in half the time.",
		"%.0f AU RANGE  •  Reach targets beyond SR1's %.0f AU ceiling." % [sr2_range, sr1_range],
		"1.5x CARGO  •  Bring home a larger load every launch."
	]:
		var chip: PanelContainer = StarterRocket2HighlightChipScene.instantiate()
		_apply_glass_callout_panel(chip, GLASS_CARD_SUBTLE_BG, 0.42, 16, 18, 16)
		var chip_label: Label = chip.get_node("Label")
		chip_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		chip_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		chip_label.text = text
		PanelStyle.apply_body_on_dark(chip_label)
		chip_label.add_theme_font_size_override("font_size", 20 if compact else 24)
		highlights.add_child(chip)

	var stats: Label = overlay.get_node("Center/Stack/Card/Body/Content/Details/Stats")
	stats.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	stats.text = "2x speed  •  2x range  •  1.5x cargo  •  Cost: 1.3B F"
	PanelStyle.apply_muted_on_dark(stats)

	var footer: Label = overlay.get_node("Center/Stack/Card/Body/Content/Details/Footer")
	footer.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	footer.text = "Longer targets are now reachable. Open the launchpad to build SR2 and line up your next mission."
	PanelStyle.apply_muted_on_dark(footer)

	var cta: Button = overlay.get_node("Center/Stack/Card/Body/CTAButton")
	PanelStyle.apply_button(cta, true)
	cta.pressed.connect(func():
		if is_instance_valid(overlay):
			overlay.queue_free()
		_on_new_mission_button_pressed()
	)

	intro.name = "StarterRocket2UnlockIntro"
	body.name = "StarterRocket2UnlockBody"
	eyebrow.name = "StarterRocket2UnlockEyebrow"
	content.name = "StarterRocket2UnlockContent"
	icon_shell.name = "StarterRocket2UnlockIconShell"
	icon.name = "StarterRocket2UnlockIcon"
	details.name = "StarterRocket2UnlockDetails"
	title.name = "StarterRocket2UnlockTitle"
	summary.name = "StarterRocket2UnlockSummary"
	flavour.name = "StarterRocket2UnlockFlavour"
	highlights.name = "StarterRocket2UnlockHighlights"
	stats.name = "StarterRocket2UnlockStats"
	footer.name = "StarterRocket2UnlockFooter"
	cta.name = "StarterRocket2UnlockCTA"

	var intro_tween = create_tween()
	intro_tween.tween_property(overlay, "color:a", 0.58, 0.22)
	intro_tween.parallel().tween_property(intro, "modulate:a", 1.0, 0.22)
	intro_tween.tween_interval(SR2_UNLOCK_INTRO_SECONDS)
	intro_tween.tween_property(intro, "modulate:a", 0.28, 0.18)
	intro_tween.parallel().tween_property(panel, "modulate:a", 1.0, 0.30)
	intro_tween.parallel().tween_property(panel, "scale", Vector2(1.0, 1.0), 0.30).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
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
	var overlay: Control = FreeOpsUnlockOverlayScene.instantiate()
	overlay.name = "FreeOpsUnlockOverlay"
	add_child(overlay)

	var title := overlay.get_node_or_null("RootVBox/ContentMargin/ContentVBox/TitleRow/TitleLabel") as Label
	if title:
		title.text = "FREE OPERATIONS"

	var desc := overlay.get_node_or_null("RootVBox/ContentMargin/ContentVBox/TitleRow/TitleDesc") as Label
	if desc:
		desc.text = "You've completed the initial mission series. The belt is now open. Run operations on your own schedule, choose contract work for payout bonuses, or survey freely and sell to market."
		desc.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART

	var start_btn := overlay.get_node_or_null("RootVBox/BottomBar/BottomRow/StartRunButton") as Button
	if start_btn:
		start_btn.text = "Open Launchpad"

	if overlay.has_signal("cta_pressed"):
		overlay.connect("cta_pressed", Callable(self, "_on_new_mission_button_pressed"))

	overlay.modulate.a = 0.0
	var intro = create_tween()
	intro.tween_property(overlay, "modulate:a", 1.0, 0.25)

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

func _show_loan_offer_dialog(_app: Node) -> void:
	# EmergencyLoanOfferDialog.gd extends BaseDialogLayer and self-styles on _ready().
	var ui_layer: CanvasLayer = EmergencyLoanOfferDialogScene.instantiate()
	add_child(ui_layer)

func _control_station_build_required() -> bool:
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if not rm:
		return false
	return int(rm.get_completed_mission_count()) == 1 and not rm.is_control_station_built()

func _scanner_station_build_required() -> bool:
	return false

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
	var new_mission_btn := get_node_or_null("UILayer/ButtonContainer/NewMissionButton") as Button
	if new_mission_btn:
		var control_station_required := _control_station_build_required()
		var scanner_station_required := _scanner_station_build_required()
		new_mission_btn.disabled = control_station_required or scanner_station_required
		if control_station_required:
			new_mission_btn.tooltip_text = "Build the Control Station first."
		elif scanner_station_required:
			new_mission_btn.tooltip_text = "Build the Scanner Station first."
		else:
			new_mission_btn.tooltip_text = ""

func _build_earth_base_identity() -> void:
	_build_wordmark()
	_build_ambient_stars()
	_build_progression_cards()

func _build_wordmark() -> void:
	var ui_layer = get_node_or_null("UILayer")
	if ui_layer == null:
		return
	var wordmark := ui_layer.get_node_or_null("PlanetHuntersWordmark") as Label
	if wordmark == null:
		return
	_apply_wordmark_layout(wordmark)
	if not get_viewport().size_changed.is_connected(_on_earth_base_viewport_resized):
		get_viewport().size_changed.connect(_on_earth_base_viewport_resized)

func _on_earth_base_viewport_resized() -> void:
	var ui_layer = get_node_or_null("UILayer")
	if ui_layer == null:
		return
	var wordmark := ui_layer.get_node_or_null("PlanetHuntersWordmark") as Label
	if wordmark:
		_apply_wordmark_layout(wordmark)
	_apply_nav_safe_area()

func _apply_wordmark_layout(wordmark: Label) -> void:
	var viewport := get_viewport_rect().size
	var widget_rect := UILayout.zone(UILayout.Zone.EARTH_WIDGET, viewport)
	wordmark.set_anchors_preset(Control.PRESET_TOP_LEFT)
	wordmark.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	wordmark.add_theme_font_size_override("font_size", 10 if viewport.x < 1200.0 else 12)
	if viewport.x < 1200.0:
		wordmark.offset_left = widget_rect.position.x + 6.0
		wordmark.offset_top = widget_rect.end.y + 10.0
	else:
		wordmark.offset_left = widget_rect.end.x + 28.0
		wordmark.offset_top = widget_rect.position.y + 10.0
	wordmark.offset_right = wordmark.offset_left + 150.0
	wordmark.offset_bottom = wordmark.offset_top + 24.0

func _build_ambient_stars() -> void:
	var star_root = get_node_or_null("AmbientStarLayer/StarRoot")
	if star_root == null:
		return
	if star_root.get_child_count() > 0:
		return
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
	var cards_root := _progression_cards_root
	if cards_root == null:
		return
	var active_context := get_active_mission_context()
	var control_station_required := _control_station_build_required()
	var scanner_station_required := _scanner_station_build_required()
	var state := _get_tutorial_state()
	if not state.is_empty():
		var skipped = bool(state.get("skipped", false))
		var step: Dictionary = state.get("current_step", {})
		var valid_scenes: Variant = step.get("valid_scenes", [])
		var is_earth_base_step := false
		if typeof(valid_scenes) == TYPE_ARRAY:
			for scene_name_any in valid_scenes:
				if str(scene_name_any) == "earth_base_1":
					is_earth_base_step = true
					break
		# Keep the tutorial lane clean: the coach overlay is the single active
		# tutorial surface, including build-gate CTAs.
		if active_context.is_empty() and not skipped and not step.is_empty() and is_earth_base_step:
			cards_root.visible = false
			return
	cards_root.hide_all()
	cards_root.visible = true

	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if not rm:
		cards_root.visible = false
		return

	var completed_count = int(rm.get_completed_mission_count())
	if not active_context.is_empty():
		cards_root.show_active_mission(active_context, _on_active_mission_cta_pressed)
		return
	elif control_station_required:
		cards_root.show_control_station(_on_build_control_station_pressed)
	elif scanner_station_required:
		cards_root.show_scanner_station(_on_build_scanner_station_pressed)
	elif completed_count >= 1:
		cards_root.show_next_mission(int(rm.get_mission_stage()), _on_new_mission_button_pressed)

func _get_tutorial_state() -> Dictionary:
	var tree := get_tree()
	if tree == null or tree.root == null:
		return {}
	var root := tree.root
	var fallback_state := {}
	var stack: Array[Node] = [root]
	while not stack.is_empty():
		var node: Node = stack.pop_back()
		if node.has_method("get_tutorial_state"):
			var state: Dictionary = node.get_tutorial_state()
			var step: Dictionary = state.get("current_step", {})
			if not step.is_empty():
				return state
			if fallback_state.is_empty():
				fallback_state = state
		for child in node.get_children():
			stack.append(child)
	var app = preload("res://Scripts/Utils/AppControllerHelper.gd").get_instance()
	if app != null and app.has_method("get_tutorial_state"):
		var state: Dictionary = app.get_tutorial_state()
		var step: Dictionary = state.get("current_step", {})
		if not step.is_empty():
			return state
		if fallback_state.is_empty():
			fallback_state = state
	return fallback_state

func get_active_mission_context() -> Dictionary:
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if not rm:
		return {}

	var returned: Dictionary = rm.get_returned_mission()
	if not returned.is_empty():
		return _build_returned_mission_context(returned)

	var awaiting_rocket_id := str(rm.get_primary_awaiting_rocket_id())
	if awaiting_rocket_id == "":
		for placed_any in rm.get_placed():
			if typeof(placed_any) != TYPE_DICTIONARY:
				continue
			var placed: Dictionary = placed_any
			if str(placed.get("status", "")) == "awaitingLaunch":
				awaiting_rocket_id = str(placed.get("id", ""))
				if awaiting_rocket_id != "":
					break
	if awaiting_rocket_id != "":
		return _build_awaiting_mission_context(rm, awaiting_rocket_id)

	var placed_by_id := {}
	for placed_any in rm.get_placed():
		if typeof(placed_any) != TYPE_DICTIONARY:
			continue
		var placed: Dictionary = placed_any
		var placed_id := str(placed.get("id", ""))
		if placed_id == "":
			continue
		placed_by_id[placed_id] = placed

	var missions: Array = rm.get_missions()
	if missions.is_empty() or placed_by_id.is_empty():
		return {}
	var latest_mission: Dictionary = {}
	var latest_launch := -1.0
	for mission_any in missions:
		if typeof(mission_any) != TYPE_DICTIONARY:
			continue
		var mission: Dictionary = mission_any
		var rocket_id := str(mission.get("rocket_id", ""))
		if rocket_id == "" or not placed_by_id.has(rocket_id):
			continue
		var launch_time := float(mission.get("launch_time", 0.0))
		if launch_time >= latest_launch:
			latest_launch = launch_time
			latest_mission = mission.duplicate(true)
	if latest_mission.is_empty():
		return {}

	var rocket_id := str(latest_mission.get("rocket_id", ""))
	rm.mark_returned_if_due(rocket_id)
	returned = rm.get_returned_mission()
	if not returned.is_empty() and str(returned.get("rocket_id", "")) == rocket_id:
		return _build_returned_mission_context(returned)

	var target_id := str(latest_mission.get("target", ""))
	var target_details: Dictionary = rm.get_target_details(target_id)
	var target_label := str(target_details.get("label", target_id if target_id != "" else "mission target"))
	var target_type := str(target_details.get("type", "asteroid"))
	var status := str(rm.get_rocket_status(rocket_id))
	var arrived := rm.has_arrived(rocket_id, target_id)
	var rocket_name := RocketSpecs.get_display_name(rocket_id)

	if status == "returningHome":
		return {
			"mode": "resume",
			"title": "Mission Returning",
			"subtitle": "%s is returning from %s." % [rocket_name, target_label],
			"hint": "Open the live mission view to track the return leg or wait for debrief.",
			"cta": "Resume Return",
			"rocket_id": rocket_id,
			"target_id": target_id,
			"target_label": target_label,
			"target_type": target_type,
		}
	if arrived:
		return {
			"mode": "resume",
			"title": "Mission At Target",
			"subtitle": "%s has arrived at %s. Resume the mission to mine, scan, or classify." % [rocket_name, target_label],
			"hint": "This run is already live. Resume it instead of starting a new setup flow.",
			"cta": "Resume Mission",
			"rocket_id": rocket_id,
			"target_id": target_id,
			"target_label": target_label,
			"target_type": target_type,
		}
	return {
		"mode": "resume",
		"title": "Mission In Flight",
		"subtitle": "%s is en route to %s." % [rocket_name, target_label],
		"hint": "Resume the outbound leg from the live mission view.",
		"cta": "Resume Mission",
		"rocket_id": rocket_id,
		"target_id": target_id,
		"target_label": target_label,
		"target_type": target_type,
	}

func _build_returned_mission_context(returned: Dictionary) -> Dictionary:
	var rocket_name := RocketSpecs.get_display_name(str(returned.get("rocket_id", "")))
	var target_label := str(returned.get("label", str(returned.get("target_id", "mission target"))))
	return {
		"mode": "debrief",
		"title": "Mission Debrief Ready",
		"subtitle": "%s has returned from %s. Resolve the debrief before setting up anything else." % [rocket_name, target_label],
		"hint": "Payout, unlocks, and the next mission handoff stay locked until debrief is complete.",
		"cta": "Open Debrief",
		"rocket_id": str(returned.get("rocket_id", "")),
		"target_id": str(returned.get("target_id", "")),
		"target_label": target_label,
		"target_type": str(returned.get("type", "asteroid")),
	}

func _build_awaiting_mission_context(rm, rocket_id: String) -> Dictionary:
	var rocket_name := RocketSpecs.get_display_name(rocket_id)
	var target_id := str(rm.get_selected_target())
	var target_details: Dictionary = rm.get_target_details(target_id) if target_id != "" else {}
	var target_label := str(target_details.get("label", target_id if target_id != "" else "route selection"))
	var target_type := str(target_details.get("type", "asteroid"))
	var contractor: Dictionary = rm.get_trip_selected_contractor()
	var contractor_name := str(contractor.get("name", ""))
	var subtitle := "%s is armed on the pad. Return to the Launchpad to finish setup and launch." % rocket_name
	if contractor_name != "" and target_id != "":
		subtitle = "%s is armed for %s via %s. Return to the Launchpad to confirm and launch." % [rocket_name, target_label, contractor_name]
	elif target_id != "":
		subtitle = "%s is armed for %s. Return to the Launchpad to finish setup and launch." % [rocket_name, target_label]
	elif contractor_name != "":
		subtitle = "%s is armed. Return to the Launchpad to finish routing with %s." % [rocket_name, contractor_name]
	return {
		"mode": "launchpad",
		"title": "Launch Ready on Pad",
		"subtitle": subtitle,
		"hint": "This mission already has a ship committed. Resume the launch flow instead of starting another card-driven prompt.",
		"cta": "Open Launchpad",
		"rocket_id": rocket_id,
		"target_id": target_id,
		"target_label": target_label,
		"target_type": target_type,
	}

func _on_active_mission_cta_pressed() -> void:
	var context := get_active_mission_context()
	if context.is_empty():
		return
	var mode := str(context.get("mode", ""))
	if mode == "launchpad":
		if scene_manager:
			scene_manager.change_to_scene("res://Scenes/Earth/earth_launchpad.tscn")
		else:
			get_tree().change_scene_to_file("res://Scenes/Earth/earth_launchpad.tscn")
		return
	if mode == "debrief":
		if scene_manager:
			scene_manager.change_to_scene("res://Scenes/Earth/mission_debrief_v2.tscn")
		else:
			get_tree().change_scene_to_file("res://Scenes/Earth/mission_debrief_v2.tscn")
		return
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if not rm:
		return
	var rocket_id := str(context.get("rocket_id", ""))
	var target_id := str(context.get("target_id", ""))
	var target_label := str(context.get("target_label", target_id))
	var target_type := str(context.get("target_type", "asteroid"))
	if rocket_id == "" or target_id == "":
		return
	rm.set_preview_target(target_id, target_label, target_type, rocket_id)
	rm.mark_returned_if_due(rocket_id)
	var status := rm.get_rocket_status(rocket_id)
	var arrived := rm.has_arrived(rocket_id, target_id)
	var scene_path := PreviewRouting.resolve_scene_path(status, arrived)
	if scene_manager:
		scene_manager.change_to_scene(scene_path)
	else:
		get_tree().change_scene_to_file(scene_path)

func _on_build_control_station_pressed() -> void:
	_start_guided_build_flow("control_station")

func _on_build_scanner_station_pressed() -> void:
	_start_guided_build_flow("scanner_station")

func _apply_glass_callout_panel(
	panel: Control,
	bg_color: Color = GLASS_CARD_BG,
	border_alpha: float = 0.72,
	corner_radius: int = 18,
	padding_x: int = 24,
	padding_y: int = 20
) -> void:
	if panel == null:
		return
	panel.set_meta("ui_style_locked", true)
	panel.add_theme_stylebox_override(
		"panel",
		PanelStyle.create_glass_panel_style(bg_color, border_alpha, corner_radius, padding_x, padding_y)
	)


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
	# Reposition the navigation ButtonContainer so it is always anchored to the
	# bottom of the viewport and spans its full width.  This replaces the old
	# single-case patch (aspect > 1.85) with a fully responsive layout.
	var container := get_node_or_null("UILayer/ButtonContainer") as HBoxContainer
	if container == null:
		return
	var vp := get_viewport()
	if vp == null:
		return
	var vp_rect := vp.get_visible_rect()
	if vp_rect.size.y <= 0:
		return

	var vp_w := vp_rect.size.x
	var vp_h := vp_rect.size.y
	var margin_h := 24.0
	var bar_h := 120.0
	# On ultra-wide landscape (phone home indicator), leave a small bottom margin.
	var bottom_margin := 34.0 if vp_w / vp_h > 1.85 else 0.0

	# Anchor to bottom-full-width so the bar tracks the actual viewport height.
	container.anchor_left   = 0.0
	container.anchor_top    = 1.0
	container.anchor_right  = 1.0
	container.anchor_bottom = 1.0
	container.offset_left   = margin_h
	container.offset_top    = -(bar_h + bottom_margin)
	container.offset_right  = -margin_h
	container.offset_bottom = -bottom_margin

	# Zoom the camera so the designed 1920-unit world fills the full width on
	# wide-aspect (mobile landscape) viewports instead of leaving empty edges.
	var camera := get_node_or_null("Camera2D") as Camera2D
	if camera != null:
		var design_aspect := 1920.0 / 1080.0
		var actual_aspect := vp_w / vp_h
		if actual_aspect > design_aspect:
			var z := actual_aspect / design_aspect
			camera.zoom = Vector2(z, z)
		else:
			camera.zoom = Vector2(1.0, 1.0)

func _check_classification_consensus() -> void:
	ClassificationConsensus.check_for_updates(get_tree(), func(updates: Array) -> void:
		if updates.is_empty():
			return
		_show_consensus_notifications(updates)
	)

func _show_consensus_notifications(updates: Array) -> void:
	if updates.is_empty():
		return
	# Use the redesigned ClassificationConsensusNotification via its show_results() API.
	var layer = ClassificationConsensusNotificationScene.instantiate()
	add_child(layer)
	var app = preload("res://Scripts/Utils/AppControllerHelper.gd").get_instance()
	var exp_gained := int(app.get_experience()) if app and app.has_method("get_experience") else 0
	var rank := str(app.get_player_rank_label()) if app and app.has_method("get_player_rank_label") else ""
	if layer.has_method("show_results"):
		layer.show_results(updates, exp_gained, rank)

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
	_apply_control_station_visual_tier(cargo_tier)

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

func _apply_control_station_visual_tier(tier: int = -1) -> void:
	var cargo_tier := tier
	if cargo_tier < 0:
		var rm = preload("res://Scripts/Utils/RocketsManager.gd")
		if rm == null:
			return
		var upgrades: Dictionary = rm.get_type_room_upgrades("starterrocket1")
		cargo_tier = int(upgrades.get("cargo", 1))
	var layers := get_node_or_null("StructuresLayer")
	if layers == null:
		return
	var structure := layers.get_node_or_null("ControlStation") as Node2D
	if structure == null:
		return
	var scale_mult: float = _STRUCTURE_SCALE_PER_TIER.get(clamp(cargo_tier, 1, 4), 1.0)
	structure.scale = Vector2.ONE * scale_mult

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

func _on_rockets_reset() -> void:
	_sync_control_station_presence()
	_apply_tutorial_button_state()
	_build_progression_cards()

func _sync_control_station_presence() -> void:
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if rm == null:
		return
	if rm.is_control_station_built():
		_ensure_control_station_visible()
	else:
		_remove_control_station()

func _ensure_control_station_visible() -> void:
	var layers := get_node_or_null("StructuresLayer")
	if layers == null:
		return
	if layers.get_node_or_null("ControlStation") != null:
		if layers.get_node_or_null("ControlStationLabel") == null:
			layers.add_child(_build_control_station_label())
		return
	var structure := Node2D.new()
	structure.name = "ControlStation"
	structure.position = CONTROL_STATION_POSITION
	structure.set_script(ControlStationScript)

	var sprite := Sprite2D.new()
	sprite.name = "Sprite2D"
	sprite.position = Vector2(-29.00003, 5.9999847)
	sprite.scale = Vector2(0.5, 0.5)
	sprite.texture = ControlStationTexture
	structure.add_child(sprite)

	var area := Area2D.new()
	area.name = "InteractionArea"
	area.input_pickable = true
	var shape := CollisionShape2D.new()
	shape.name = "CollisionShape2D"
	var rect := RectangleShape2D.new()
	rect.size = CONTROL_STATION_COLLISION_SIZE
	shape.shape = rect
	area.add_child(shape)
	structure.add_child(area)

	layers.add_child(structure)
	if layers.get_node_or_null("ControlStationLabel") == null:
		layers.add_child(_build_control_station_label())

func _build_control_station_label() -> Node2D:
	var label_root := Node2D.new()
	label_root.name = "ControlStationLabel"
	label_root.position = CONTROL_STATION_LABEL_POSITION

	var label := Label.new()
	label.name = "Label"
	label.offset_left = -120.0
	label.offset_top = -20.0
	label.offset_right = 120.0
	label.offset_bottom = 20.0
	label.add_theme_color_override("font_color", Color(1, 1, 1, 1))
	label.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.7))
	label.add_theme_constant_override("outline_size", 4)
	label.add_theme_font_size_override("font_size", 26)
	label.text = "Control Station"
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label_root.add_child(label)

	var pointer := Line2D.new()
	pointer.name = "Pointer"
	pointer.points = PackedVector2Array([Vector2(0, 30), Vector2(0, 170)])
	pointer.width = 4.0
	pointer.default_color = Color(1, 1, 1, 0.9)
	pointer.antialiased = true
	label_root.add_child(pointer)
	return label_root

func _remove_control_station() -> void:
	var layers := get_node_or_null("StructuresLayer")
	if layers == null:
		return
	var structure := layers.get_node_or_null("ControlStation")
	if structure != null:
		structure.queue_free()
	var label := layers.get_node_or_null("ControlStationLabel")
	if label != null:
		label.queue_free()
