extends Node2D

@export var show_ground_guide: bool = false

const SceneManager = preload("res://Scripts/Earth/SceneManager.gd")
const UIManager = preload("res://Scripts/Earth/UIManager.gd")
const RocketsManager = preload("res://Scripts/Utils/RocketsManager.gd")
const AppControllerHelper = preload("res://Scripts/Utils/AppControllerHelper.gd")
const CameraController = preload("res://Scripts/Earth/CameraController.gd")
const DebugVisualizer = preload("res://Scripts/Earth/DebugVisualizer.gd")
const PREVIEW_SCENE_PATH := "res://Scenes/UI/AsteroidPreview/asteroid_preview.tscn"
const RocketSpecs = preload("res://Scripts/Utils/RocketSpecs.gd")
const PanelStyle = preload("res://Scripts/UI/PanelStyle.gd")
const UILayout = preload("res://Scripts/UI/UILayout.gd")

var camera_controller: Node
var scene_manager: SceneManager
var ui_manager: UIManager
const ClassificationConsensus = preload("res://Scripts/Utils/ClassificationConsensus.gd")
const EarthBaseActionCard = preload("res://Scripts/UI/EarthBaseActionCard.gd")
const EarthBaseProgressionCards = preload("res://Scripts/UI/EarthBaseProgressionCards.gd")
const StarterRocket2UnlockOverlayScene = preload("res://Scenes/UI/StarterRocket2UnlockOverlay.tscn")
const FreeOpsUnlockOverlayScene = preload("res://Scenes/UI/FreeOpsUnlockOverlay.tscn")
const StarterRocket2HighlightChipScene = preload("res://Scenes/UI/Templates/StarterRocket2HighlightChip.tscn")
const EarthBaseBuildFlowOverlayScene = preload("res://Scenes/UI/EarthBaseBuildFlowOverlay.tscn")
const EmergencyLoanOfferDialogScene = preload("res://Scenes/UI/EmergencyLoanOfferDialog.tscn")
const ControlStationBuiltDialogueScene = preload("res://Scenes/UI/ControlStationBuiltDialogue.tscn")
const ClassificationConsensusNotificationScene = preload("res://Scenes/UI/ClassificationConsensusNotification.tscn")
const ControlStationScript = preload("res://Scripts/Earth/ControlStation.gd")
const LaunchpadTexture = preload("res://assets/Structures/launchpad.png")
const CONTROL_STATION_TEXTURE_PATH := "res://assets/Structures/ControlStation.png"
const PreviewRouting = preload("res://Scripts/UI/NewMissionPreviewRouting.gd")
const SR2_UNLOCK_POPUP_PATH := "user://rocket_unlock_popups.cfg"
const SR2_UNLOCK_SECTION := "popups"
const SR2_UNLOCK_KEY := "starterrocket2_seen"
const FREE_OPS_UNLOCK_KEY := "free_ops_unlock_seen"
const SR2_UNLOCK_INTRO_SECONDS := 0.9
const CONTROL_STATION_POSITION := Vector2(914, 1169)
const CONTROL_STATION_LABEL_POSITION := Vector2(914, 960)
const CONTROL_STATION_COLLISION_SIZE := Vector2(220, 180)
const GLASS_CARD_BG := Color(0.06, 0.10, 0.16, 0.95)
const GLASS_CARD_SUBTLE_BG := Color(0.08, 0.12, 0.20, 0.93)
const COMPACT_LAYOUT_BREAKPOINT := 900.0

var _build_flow_requested_structure: String = ""
var _build_flow_location_id: String = ""

@onready var _progression_cards_root: EarthBaseProgressionCards = $UILayer/ProgressionCards
@onready var _satellite_chip_status: Label = $UILayer/SatelliteChip/VBox/StatusLabel
@onready var _launchpad_chip_status: Label = $UILayer/LaunchpadChip/VBox/StatusLabel
@onready var _control_chip: PanelContainer = $UILayer/ControlChip
@onready var _control_chip_status: Label = $UILayer/ControlChip/VBox/StatusLabel
@onready var _jobs_label: Label = $UILayer/JobsChip/JobsLabel
@onready var _radial_nav: Control = $UILayer/RadialNav
@onready var _radial_overlay: ColorRect = $UILayer/RadialNav/RadialOverlay
@onready var _hub_button: Button = $UILayer/RadialNav/HubButton
@onready var _hub_glow: Panel = $UILayer/RadialNav/HubGlow
@onready var _sat_base: Button = $UILayer/RadialNav/SatBase
@onready var _sat_atlas: Button = $UILayer/RadialNav/SatAtlas
@onready var _sat_build: Button = $UILayer/RadialNav/SatBuild
@onready var _sat_missions: Button = $UILayer/RadialNav/SatMissions

func _ready() -> void:
	_ensure_tutorial_runtime()
	# Initialize camera controller
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
	if RocketsManager.consume_return_to_new_mission_panel():
		ui_manager.show_panel(UIManager.PanelType.NEW_MISSION)
	
	# Connect button signals
	_setup_buttons()
	_sync_control_station_presence()
	_connect_app_runtime_signals()
	
	# Create ground guide lines if enabled
	if show_ground_guide:
		DebugVisualizer.create_ground_guides(self)

	var app_ctrl = AppControllerHelper.get_instance()
	var ux_tour_running = app_ctrl != null and app_ctrl.get("is_ux_tour_running") == true

	if not ux_tour_running:
		call_deferred("_maybe_show_starterrocket2_unlock_popup")
		call_deferred("_maybe_show_free_ops_unlock")
		call_deferred("_maybe_offer_loan")
		call_deferred("_check_classification_consensus")

	call_deferred("_apply_tutorial_button_state")
	call_deferred("_apply_nav_safe_area")
	call_deferred("_apply_structure_visual_evolution")
	call_deferred("_refresh_tutorial_overlay_when_ready")
	_build_earth_base_identity()
	call_deferred("_refresh_tutorial_owned_ui")

func _ensure_tutorial_runtime() -> void:
	var app = AppControllerHelper.get_instance()
	if app != null and app.has_method("_ensure_tutorial_runtime"):
		app._ensure_tutorial_runtime()

func _connect_app_runtime_signals() -> void:
	var app = AppControllerHelper.get_instance()
	if app == null:
		_connect_tutorial_overlay_signals()
		return
	if app.has_signal("rockets_reset") and not app.rockets_reset.is_connected(_on_rockets_reset):
		app.rockets_reset.connect(_on_rockets_reset)
	if app.has_signal("tutorial_state_updated") and not app.tutorial_state_updated.is_connected(_on_tutorial_state_updated):
		app.tutorial_state_updated.connect(_on_tutorial_state_updated)
	_connect_tutorial_overlay_signals()

func _connect_tutorial_overlay_signals() -> void:
	var tree := get_tree()
	if tree == null or tree.root == null:
		return
	if not tree.root.child_entered_tree.is_connected(_on_root_child_entered_tree):
		tree.root.child_entered_tree.connect(_on_root_child_entered_tree)
	var overlay := tree.root.find_child("TutorialCoachOverlay", true, false)
	if overlay != null:
		_bind_tutorial_overlay_signals(overlay)

func _on_root_child_entered_tree(node: Node) -> void:
	if node != null and str(node.name) == "TutorialCoachOverlay":
		_bind_tutorial_overlay_signals(node)
		call_deferred("_refresh_tutorial_overlay_when_ready")
		call_deferred("_refresh_tutorial_owned_ui")

func _bind_tutorial_overlay_signals(node: Node) -> void:
	if not (node is CanvasItem):
		return
	var canvas_item := node as CanvasItem
	if not canvas_item.visibility_changed.is_connected(_on_tutorial_overlay_visibility_changed):
		canvas_item.visibility_changed.connect(_on_tutorial_overlay_visibility_changed)

func _on_tutorial_overlay_visibility_changed() -> void:
	call_deferred("_refresh_tutorial_owned_ui")

func _setup_buttons() -> void:
	var back_btn: Button        = $UILayer/ButtonContainer/BackButton
	var forward_btn: Button     = $UILayer/ButtonContainer/ForwardButton
	var menu_btn: Button        = $UILayer/ButtonContainer/MenuButton
	var market_btn: Button      = $UILayer/ButtonContainer/MarketButton
	var space_map_btn: Button   = $UILayer/ButtonContainer/SpaceMapButton
	var build_btn: Button       = $UILayer/ButtonContainer/BuildButton
	var new_mission_btn: Button = $UILayer/ButtonContainer/NewMissionButton
	var container: HBoxContainer = $UILayer/ButtonContainer

	# Portrait nav: 4 visible tabs (Base/Atlas/Build/Missions); Back/Forward/Market hidden
	back_btn.visible    = false
	forward_btn.visible = false
	market_btn.visible  = false

	# ── Nav background — dark gradient matching portrait prototype ───────────
	var bg: Panel = $UILayer/ButtonContainer/NavBackground
	var bg_style := StyleBoxFlat.new()
	bg_style.bg_color     = Color(0.024, 0.035, 0.059, 0.92)
	bg_style.border_color = Color(0.247, 0.663, 1.0, 0.22)
	bg_style.border_width_top = 1
	bg_style.set_corner_radius_all(0)
	bg.add_theme_stylebox_override("panel", bg_style)
	container.add_theme_constant_override("separation", 0)

	# ── Style 4 portrait tabs ────────────────────────────────────────────────
	_style_portrait_tab(menu_btn,        false)   # Base
	_style_portrait_tab(space_map_btn,   false)   # Atlas
	_style_portrait_tab(build_btn,       false)   # Build
	_style_portrait_tab(new_mission_btn, true)    # Missions (amber accent)

	# ── Labels: concise single words ─────────────────────────────────────────
	menu_btn.text        = "Base"
	space_map_btn.text   = "Atlas"
	build_btn.text       = "Build"
	new_mission_btn.text = "Missions"

	# ── Icons ────────────────────────────────────────────────────────────────
	_load_icon(menu_btn,        "res://Resources/Icons/nav_menu.svg",    false)
	_load_icon(space_map_btn,   "res://Resources/Icons/nav_map.svg",     false)
	_load_icon(new_mission_btn, "res://Resources/Icons/nav_mission.svg", true)

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
	_apply_market_button_state(false)


const _AMBER        := Color(0.961, 0.651, 0.137, 1.0)   # DS Vulcan Amber
const _CYAN         := Color(0.247, 0.663, 1.0,   1.0)   # DS Command Cyan
const _TEXT_MUTED   := Color(0.663, 0.722, 0.808, 1.0)   # DS TEXT_MUTED

# Portrait bottom-nav tab styling: icon above label, 4 equal columns.
func _style_portrait_tab(btn: Button, is_amber: bool) -> void:
	var col: Color    = _AMBER if is_amber else _TEXT_MUTED
	var col_act: Color = _AMBER if is_amber else _CYAN

	var normal := StyleBoxFlat.new()
	normal.bg_color = Color(0, 0, 0, 0)
	normal.set_corner_radius_all(14)
	normal.content_margin_left   = 12
	normal.content_margin_right  = 12
	normal.content_margin_top    = 14
	normal.content_margin_bottom = 14

	var hover := normal.duplicate() as StyleBoxFlat
	hover.bg_color = Color(col_act.r, col_act.g, col_act.b, 0.14)

	var pressed := normal.duplicate() as StyleBoxFlat
	pressed.bg_color = Color(col_act.r, col_act.g, col_act.b, 0.22)

	btn.add_theme_stylebox_override("normal",  normal)
	btn.add_theme_stylebox_override("hover",   hover)
	btn.add_theme_stylebox_override("pressed", pressed)
	btn.add_theme_stylebox_override("focus",   hover)
	btn.add_theme_color_override("font_color",         col)
	btn.add_theme_color_override("font_hover_color",   col_act)
	btn.add_theme_color_override("font_pressed_color", col_act)
	var nav_font := load("res://Resources/Fonts/Oxanium-Bold.ttf") as Font
	if nav_font:
		btn.add_theme_font_override("font", nav_font)
	# Label at 10px effective, icon above via button's built-in vertical layout
	# 26 design-units ≈ 9px on phone after 0.36× scale — compact mobile nav label.
	btn.add_theme_font_size_override("font_size", 26)
	btn.icon_alignment     = HORIZONTAL_ALIGNMENT_CENTER
	btn.vertical_icon_alignment = VERTICAL_ALIGNMENT_TOP
	btn.expand_icon        = false
	# Lock so UIConsistencyEnforcer does not override our custom nav styling
	btn.set_meta("ui_style_locked", true)

# Legacy stub — kept so any remaining callers compile; use _style_portrait_tab instead.
func _style_nav_slot(btn: Button, is_amber: bool) -> void:
	_style_portrait_tab(btn, is_amber)


func _load_icon(btn: Button, path: String, is_amber: bool) -> void:
	if not ResourceLoader.exists(path):
		return
	var tex := load(path) as Texture2D
	if tex == null:
		return
	btn.icon = tex
	var col: Color = _AMBER if is_amber else _TEXT_MUTED
	btn.add_theme_color_override("icon_normal_color",  col)
	btn.add_theme_color_override("icon_hover_color",   col)
	btn.add_theme_color_override("icon_pressed_color", col)

func _set_nav_min(btn: Button, min_w: float, min_h: float) -> void:
	if btn == null:
		return
	var current := btn.custom_minimum_size
	btn.custom_minimum_size = Vector2(max(current.x, min_w), max(current.y, min_h))

# ── Radial Navigation ─────────────────────────────────────────────────────────

func _setup_radial_nav() -> void:
	# Style hub glow (translucent cyan halo behind the hub button)
	var glow_style := StyleBoxFlat.new()
	glow_style.bg_color = Color(_CYAN.r, _CYAN.g, _CYAN.b, 0.18)
	glow_style.set_corner_radius_all(110)
	_hub_glow.add_theme_stylebox_override("panel", glow_style)

	# Style hub button (solid cyan circle with subtle ring)
	var hub_normal := StyleBoxFlat.new()
	hub_normal.bg_color = _CYAN
	hub_normal.set_corner_radius_all(86)
	hub_normal.border_width_top    = 3
	hub_normal.border_width_bottom = 3
	hub_normal.border_width_left   = 3
	hub_normal.border_width_right  = 3
	hub_normal.border_color = Color(1.0, 1.0, 1.0, 0.35)
	var hub_pressed := hub_normal.duplicate() as StyleBoxFlat
	hub_pressed.bg_color = Color(_CYAN.r * 0.75, _CYAN.g * 0.75, _CYAN.b * 0.75, 1.0)
	_hub_button.add_theme_stylebox_override("normal",  hub_normal)
	_hub_button.add_theme_stylebox_override("hover",   hub_normal)
	_hub_button.add_theme_stylebox_override("pressed", hub_pressed)
	_hub_button.add_theme_stylebox_override("focus",   hub_normal)
	var hub_icon := load("res://Resources/Icons/nav_menu.svg") as Texture2D
	if hub_icon:
		_hub_button.icon = hub_icon
		_hub_button.add_theme_color_override("icon_normal_color",  Color(0.06, 0.09, 0.14, 1.0))
		_hub_button.add_theme_color_override("icon_hover_color",   Color(0.06, 0.09, 0.14, 1.0))
		_hub_button.add_theme_color_override("icon_pressed_color", Color(0.06, 0.09, 0.14, 1.0))
	_hub_button.add_theme_constant_override("icon_max_width", 64)
	_hub_button.text = ""
	_hub_button.focus_mode = Control.FOCUS_NONE

	# Style satellite buttons (dark glass circles with label)
	var sat_data := [
		[_sat_base,     "Base",     "res://Resources/Icons/nav_menu.svg",    false],
		[_sat_atlas,    "Atlas",    "res://Resources/Icons/nav_map.svg",     false],
		[_sat_build,    "Build",    "",                                       false],
		[_sat_missions, "Missions", "res://Resources/Icons/nav_mission.svg", true],
	]
	var nav_font := load("res://Resources/Fonts/Oxanium-Bold.ttf") as Font
	for entry in sat_data:
		var btn := entry[0] as Button
		var label_text := entry[1] as String
		var icon_path := entry[2] as String
		var is_amber := entry[3] as bool
		var col: Color = _AMBER if is_amber else _CYAN

		var sat_n := StyleBoxFlat.new()
		sat_n.bg_color = Color(0.039, 0.071, 0.114, 0.95)
		sat_n.set_corner_radius_all(73)
		sat_n.border_width_top    = 2
		sat_n.border_width_bottom = 2
		sat_n.border_width_left   = 2
		sat_n.border_width_right  = 2
		sat_n.border_color = Color(col.r, col.g, col.b, 0.55)
		var sat_h := sat_n.duplicate() as StyleBoxFlat
		sat_h.border_color = Color(col.r, col.g, col.b, 0.9)
		sat_h.bg_color = Color(col.r, col.g, col.b, 0.18)
		btn.add_theme_stylebox_override("normal",  sat_n)
		btn.add_theme_stylebox_override("hover",   sat_h)
		btn.add_theme_stylebox_override("pressed", sat_h)
		btn.add_theme_stylebox_override("focus",   sat_n)
		btn.add_theme_color_override("font_color",         col)
		btn.add_theme_color_override("font_hover_color",   col)
		btn.add_theme_color_override("font_pressed_color", col)
		if nav_font:
			btn.add_theme_font_override("font", nav_font)
		btn.add_theme_font_size_override("font_size", 22)
		if icon_path != "" and ResourceLoader.exists(icon_path):
			var tex := load(icon_path) as Texture2D
			if tex:
				btn.icon = tex
				btn.add_theme_color_override("icon_normal_color",  col)
				btn.add_theme_color_override("icon_hover_color",   col)
				btn.add_theme_color_override("icon_pressed_color", col)
				btn.add_theme_constant_override("icon_max_width", 42)
		btn.text = label_text
		btn.icon_alignment = HORIZONTAL_ALIGNMENT_CENTER
		btn.vertical_icon_alignment = VERTICAL_ALIGNMENT_TOP
		btn.focus_mode = Control.FOCUS_NONE
		btn.set_meta("ui_style_locked", true)

	# Wire signals once (guard against double-connect on resize)
	if not _hub_button.pressed.is_connected(_toggle_radial_menu):
		_hub_button.pressed.connect(_toggle_radial_menu)
	if not _radial_overlay.gui_input.is_connected(_on_radial_overlay_input):
		_radial_overlay.gui_input.connect(_on_radial_overlay_input)
	if not _sat_base.pressed.is_connected(_on_menu_button_pressed):
		_sat_base.pressed.connect(_on_menu_button_pressed)
		_sat_base.pressed.connect(_close_radial_menu)
	if not _sat_atlas.pressed.is_connected(_on_space_map_button_pressed):
		_sat_atlas.pressed.connect(_on_space_map_button_pressed)
		_sat_atlas.pressed.connect(_close_radial_menu)
	if not _sat_build.pressed.is_connected(_on_build_button_pressed):
		_sat_build.pressed.connect(_on_build_button_pressed)
		_sat_build.pressed.connect(_close_radial_menu)
	if not _sat_missions.pressed.is_connected(_on_new_mission_button_pressed):
		_sat_missions.pressed.connect(_on_new_mission_button_pressed)
		_sat_missions.pressed.connect(_close_radial_menu)

var _radial_open: bool = false

func _toggle_radial_menu() -> void:
	_radial_open = not _radial_open
	_radial_overlay.visible = _radial_open
	_sat_base.visible     = _radial_open
	_sat_atlas.visible    = _radial_open
	_sat_build.visible    = _radial_open
	_sat_missions.visible = _radial_open
	# Switch overlay mouse filter: block taps when open, ignore when closed
	_radial_nav.mouse_filter = Control.MOUSE_FILTER_STOP if _radial_open else Control.MOUSE_FILTER_IGNORE
	_hub_button.mouse_filter = Control.MOUSE_FILTER_STOP  # hub always tappable

func _close_radial_menu() -> void:
	if _radial_open:
		_toggle_radial_menu()

func _on_radial_overlay_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and (event as InputEventMouseButton).pressed:
		_close_radial_menu()

func _unhandled_input(event: InputEvent) -> void:
	if not (event is InputEventMouseButton):
		return
	var mouse_event := event as InputEventMouseButton
	if mouse_event.button_index != MOUSE_BUTTON_LEFT or not mouse_event.pressed:
		return
	if _try_launchpad_click_fallback(mouse_event.position):
		var viewport := get_viewport()
		if viewport != null:
			viewport.set_input_as_handled()

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
	if _open_preview_delta(-1):
		return
	scene_manager.navigate_backward()

func _on_forward_button_pressed() -> void:
	if _open_preview_delta(1):
		return
	scene_manager.navigate_forward()

func _on_menu_button_pressed() -> void:
	preload("res://Scripts/UI/GameNavigationMenu.gd").toggle(self)

func _on_market_button_pressed() -> void:
	if not RocketsManager.is_free_operations_unlocked():
		return
	ui_manager.show_panel(UIManager.PanelType.MARKET)

func _on_build_button_pressed() -> void:
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
		var cost_str := "500M F"
		var cost := RocketsManager.get_control_station_build_cost()
		cost_str = NumberFormat.with_symbol(cost)
		options.append({
			"id": "control_station",
			"title": "Control Station",
			"subtitle": "Mission 2 fleet hub. Unlocks structured route planning and Starter Rocket 2 prep.",
			"meta": "COST: " + cost_str
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
	if RocketsManager.is_control_station_built() or not _control_station_build_required():
		return false
	var app = get_tree().root.find_child("AppController", true, false)
	if app == null or not app.has_method("get_franc_balance") or not app.has_method("add_franc_balance"):
		return false
	var cost := RocketsManager.get_control_station_build_cost()
	if not RocketsManager.can_afford_control_station_build(int(app.get_franc_balance())):
		return false
	app.add_franc_balance(-cost, "build_control_station")
	RocketsManager.set_control_station_built(true)
	preload("res://Scripts/Utils/AppControllerHelper.gd").record_tutorial_action("build_control_station")
	_sync_control_station_presence()
	_apply_control_station_visual_tier()
	_apply_tutorial_button_state()
	_build_progression_cards()
	call_deferred("_show_control_station_built_dialogue")
	return true

func _show_control_station_built_dialogue() -> void:
	var vp_w := get_viewport().get_visible_rect().size.x
	var compact := vp_w < COMPACT_LAYOUT_BREAKPOINT

	var backdrop: ColorRect = ControlStationBuiltDialogueScene.instantiate()
	$UILayer.add_child(backdrop)

	var card: PanelContainer = backdrop.get_node("Center/Card")
	card.custom_minimum_size = Vector2(clampf(vp_w - 48.0, 320.0, 660.0), 0.0)
	_apply_glass_callout_panel(card, Color(0.06, 0.10, 0.16, 0.98), 0.65, 20, 28, 26)

	var vbox: VBoxContainer = card.get_node("VBox")
	var eyebrow: Label = vbox.get_node("Eyebrow")
	eyebrow.add_theme_color_override("font_color", Color(0.28, 0.88, 0.96, 1.0))
	eyebrow.add_theme_font_size_override("font_size", 14)

	var title: Label = vbox.get_node("Title")
	title.add_theme_color_override("font_color", Color(0.95, 0.93, 0.90, 1.0))
	title.add_theme_font_size_override("font_size", 34 if compact else 40)

	var body: Label = vbox.get_node("Body")
	body.add_theme_color_override("font_color", Color(0.78, 0.84, 0.92, 1.0))
	body.add_theme_font_size_override("font_size", 20 if compact else 24)

	var chips_box: VBoxContainer = vbox.get_node("ChipsBox")
	for chip_text: String in [
		"STARTER ROCKET 2  •  Now buildable — faster, longer range, bigger haul.",
		"CONTRACTORS  •  Accept a delivery order before launch for a payout bonus.",
		"BELT ACCESS  •  SR2 reaches targets beyond SR1's operating radius.",
	]:
		var chip := PanelContainer.new()
		_apply_glass_callout_panel(chip, GLASS_CARD_SUBTLE_BG, 0.42, 12, 18, 14)
		var chip_label := Label.new()
		chip_label.text = chip_text
		chip_label.add_theme_color_override("font_color", Color(0.78, 0.84, 0.92, 1.0))
		chip_label.add_theme_font_size_override("font_size", 18 if compact else 20)
		chip_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		chip.add_child(chip_label)
		chips_box.add_child(chip)

	var cta: Button = vbox.get_node("CTA")
	PanelStyle.apply_button(cta, true)
	cta.add_theme_font_size_override("font_size", 20)
	cta.pressed.connect(func() -> void:
		if is_instance_valid(backdrop):
			backdrop.queue_free()
		_on_new_mission_button_pressed()
	)

	backdrop.modulate.a = 0.0
	create_tween().tween_property(backdrop, "modulate:a", 1.0, 0.2)

func _complete_scanner_station_build() -> bool:
	if RocketsManager.is_scanner_station_built() or not _scanner_station_build_required():
		return false
	var app = get_tree().root.find_child("AppController", true, false)
	if app == null or not app.has_method("get_franc_balance") or not app.has_method("add_franc_balance"):
		return false
	var cost = RocketsManager.get_scanner_build_cost()
	var balance = int(app.get_franc_balance())
	if not RocketsManager.can_afford_scanner_build(balance):
		return false
	app.add_franc_balance(-cost, "build_scanner_station")
	RocketsManager.set_scanner_station_built(true)
	preload("res://Scripts/Utils/AppControllerHelper.gd").record_tutorial_action("build_scanner_station")
	_apply_tutorial_button_state()
	_build_progression_cards()
	return true

func _on_space_map_button_pressed() -> void:
	if scene_manager:
		scene_manager.change_to_scene("res://Scenes/UI/SpaceMap/space_map.tscn")
	else:
		get_tree().change_scene_to_file("res://Scenes/UI/SpaceMap/space_map.tscn")

func _on_new_mission_button_pressed() -> void:
	if _control_station_build_required():
		_build_progression_cards()
		return
	preload("res://Scripts/Utils/AppControllerHelper.gd").record_tutorial_action("open_launchpad")
	if scene_manager:
		scene_manager.change_to_scene("res://Scenes/Earth/earth_launchpad.tscn")
	else:
		get_tree().change_scene_to_file("res://Scenes/Earth/earth_launchpad.tscn")

func _open_preview_delta(delta: int) -> bool:
	var candidates = RocketsManager.get_preview_candidates()
	if candidates.is_empty():
		return false
	var idx = RocketsManager.get_preview_index()
	idx = (idx + delta) % candidates.size()
	if idx < 0:
		idx = candidates.size() - 1
	RocketsManager.set_preview_index(idx)
	var target = candidates[idx]
	RocketsManager.set_preview_target(
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
	if not RocketsManager.is_unlocked("starterrocket2"):
		return
	var completed_count = int(RocketsManager.get_completed_mission_count())
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
	intro.add_theme_font_size_override("font_size", 36 if get_viewport().get_visible_rect().size.x < COMPACT_LAYOUT_BREAKPOINT else 42)

	var viewport := get_viewport().get_visible_rect().size
	var vp_w := viewport.x
	var compact := viewport.x < COMPACT_LAYOUT_BREAKPOINT
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
	# Free ops unlocks after completing all 4 authored missions
	if int(RocketsManager.get_completed_mission_count()) < 4:
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
		overlay.cta_pressed.connect(_on_new_mission_button_pressed)

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
	var app = AppControllerHelper.get_instance()
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
	return int(RocketsManager.get_completed_mission_count()) == 1 and not RocketsManager.is_control_station_built()

func _scanner_station_build_required() -> bool:
	return false

func _apply_tutorial_button_state() -> void:
	var app = AppControllerHelper.get_instance()
	var tutorial_active := not RocketsManager.is_free_operations_unlocked()
	if app != null and app.has_method("get_tutorial_state"):
		var state: Dictionary = app.get_tutorial_state()
		if not state.is_empty():
			var current_step: Dictionary = state.get("current_step", {}) as Dictionary
			tutorial_active = not bool(state.get("skipped", false)) and not current_step.is_empty()
	# During the tutorial: Atlas tab is available but hidden buttons stay off.
	for btn_path in [
		"UILayer/ButtonContainer/ForwardButton",
	]:
		var btn := get_node_or_null(btn_path) as Button
		if btn:
			btn.disabled = tutorial_active
	_apply_market_button_state(tutorial_active)
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
	# Mirror disabled state onto radial satellite button
	if is_instance_valid(_sat_missions):
		var cs_req := _control_station_build_required()
		var ss_req := _scanner_station_build_required()
		_sat_missions.disabled = cs_req or ss_req

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

func _refresh_tutorial_overlay_when_ready() -> void:
	var tree := get_tree()
	if tree == null:
		return
	await tree.process_frame
	await tree.process_frame
	if not is_inside_tree():
		return
	if tree.root == null:
		return
	var overlay := tree.root.find_child("TutorialCoachOverlay", true, false)
	if overlay == null:
		return
	if overlay.has_method("_try_connect_app_controller"):
		overlay.call("_try_connect_app_controller")
	if overlay.has_method("_pull_state_from_controller"):
		overlay.call("_pull_state_from_controller")
	var app = AppControllerHelper.get_instance()
	if app == null or not app.has_method("get_tutorial_state"):
		return
	var state: Dictionary = app.get_tutorial_state()
	if state.is_empty() or bool(state.get("skipped", false)):
		return
	var current_step: Dictionary = state.get("current_step", {}) as Dictionary
	if current_step.is_empty():
		return
	if overlay.has_method("_on_tutorial_state_updated"):
		overlay.call("_on_tutorial_state_updated", state)
	_refresh_tutorial_owned_ui()

func _build_earth_base_identity() -> void:
	_build_wordmark()
	_build_ambient_stars()
	_build_progression_cards()
	_build_hud_strip()

func _build_hud_strip() -> void:
	var level_label := get_node_or_null("UILayer/HUDStrip/LevelChip/LevelLabel") as Label
	var francs_label := get_node_or_null("UILayer/HUDStrip/FrancsChip/FrancsLabel") as Label
	if level_label == null and francs_label == null:
		return
	var app = AppControllerHelper.get_instance()
	if app == null:
		return
	var lv := 1
	if app.has_method("get_experience_level"):
		lv = int(app.get_experience_level())
	if level_label != null:
		level_label.text = "LV %d" % lv
	if francs_label != null and app.has_method("get_franc_balance"):
		var bal := int(app.get_franc_balance())
		francs_label.text = NumberFormat.with_symbol(bal)
	# Update Jobs pill: count active missions (placed + launched)
	if is_instance_valid(_jobs_label):
		var jobs_count := RocketsManager.get_placed().size() + RocketsManager.get_launched().size()
		_jobs_label.text = "%d JOBS" % jobs_count if jobs_count != 1 else "1 JOB"
	# Update eyebrow with level
	var eyebrow := get_node_or_null("UILayer/TitleBlock/LandnamWordmark") as Label
	if eyebrow != null:
		eyebrow.text = "EARTH BASE · LV %d" % lv
	# Refresh whenever balance changes
	if app.has_signal("franc_balance_updated") and not app.franc_balance_updated.is_connected(_on_franc_balance_updated):
		app.franc_balance_updated.connect(_on_franc_balance_updated)

func _on_franc_balance_updated(_new_balance: int) -> void:
	var francs_label := get_node_or_null("UILayer/HUDStrip/FrancsChip/FrancsLabel") as Label
	if francs_label == null:
		return
	var app = AppControllerHelper.get_instance()
	if app == null or not app.has_method("get_franc_balance"):
		return
	var bal := int(app.get_franc_balance())
	francs_label.text = NumberFormat.with_symbol(bal)

func _on_tutorial_state_updated(_state: Dictionary) -> void:
	call_deferred("_refresh_tutorial_owned_ui")

func _refresh_tutorial_owned_ui() -> void:
	_apply_tutorial_button_state()
	_build_progression_cards()

func _build_wordmark() -> void:
	var ui_layer = get_node_or_null("UILayer")
	if ui_layer == null:
		return
	# Support both old (LandnamWordmark Label) and new (TitleBlock VBoxContainer) layouts.
	var block := ui_layer.get_node_or_null("TitleBlock") as Control
	var wordmark := ui_layer.get_node_or_null("LandnamWordmark") as Label
	if block == null and wordmark == null:
		return
	_apply_wordmark_layout(block if block != null else wordmark)
	if not get_viewport().size_changed.is_connected(_on_earth_base_viewport_resized):
		get_viewport().size_changed.connect(_on_earth_base_viewport_resized)

func _on_earth_base_viewport_resized() -> void:
	var ui_layer = get_node_or_null("UILayer")
	if ui_layer == null:
		return
	var block := ui_layer.get_node_or_null("TitleBlock") as Control
	var wordmark := ui_layer.get_node_or_null("LandnamWordmark") as Label
	if block != null:
		_apply_wordmark_layout(block)
	elif wordmark != null:
		_apply_wordmark_layout(wordmark)
	_apply_nav_safe_area()

func _apply_wordmark_layout(node: Control) -> void:
	var viewport := get_viewport_rect().size
	# Portrait: anchor title block top-left below the TOP_STATUS (notch) zone.
	var top_y := UILayout.zone(UILayout.Zone.TOP_STATUS, viewport).end.y
	node.set_anchors_preset(Control.PRESET_TOP_LEFT)
	node.offset_left   = 20.0
	node.offset_top    = top_y + 110.0  # below HUD strip (which sits at 32-96px)
	node.offset_right  = 680.0          # wide enough for 80-pt title font
	node.offset_bottom = top_y + 300.0  # eyebrow(36) + gap(8) + title(102) + breathing room

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
	# The tutorial coach owns the CTA lane whenever it is visible on Earth base.
	# Do not try to infer intent from tutorial state here; duplicate cards are worse
	# than hiding the scene-owned progression lane while guidance is active.
	if _has_visible_tutorial_overlay():
		cards_root.visible = false
		return
	cards_root.hide_all()
	cards_root.visible = true


	var completed_count = int(RocketsManager.get_completed_mission_count())
	if not active_context.is_empty():
		cards_root.show_active_mission(active_context, _on_active_mission_cta_pressed)
		return
	elif control_station_required:
		cards_root.show_control_station(_on_build_control_station_pressed)
	elif scanner_station_required:
		cards_root.show_scanner_station(_on_build_scanner_station_pressed)
	elif completed_count >= 1:
		cards_root.show_next_mission(int(RocketsManager.get_mission_stage()), _on_new_mission_button_pressed)

func _has_visible_tutorial_overlay() -> bool:
	if not is_inside_tree():
		return false
	var tree := get_tree()
	if tree == null or tree.root == null:
		return false
	var overlay := tree.root.find_child("TutorialCoachOverlay", true, false)
	if overlay == null:
		return false
	if overlay is CanvasItem:
		return (overlay as CanvasItem).visible
	return true

func get_active_mission_context() -> Dictionary:

	var returned: Dictionary = RocketsManager.get_returned_mission()
	if not returned.is_empty():
		return _build_returned_mission_context(returned)

	var awaiting_rocket_id := str(RocketsManager.get_primary_awaiting_rocket_id())
	if awaiting_rocket_id == "":
		for placed_any in RocketsManager.get_placed():
			if typeof(placed_any) != TYPE_DICTIONARY:
				continue
			var placed: Dictionary = placed_any
			if str(placed.get("status", "")) == "awaitingLaunch":
				awaiting_rocket_id = str(placed.get("id", ""))
				if awaiting_rocket_id != "":
					break
	if awaiting_rocket_id != "":
		return _build_awaiting_mission_context(awaiting_rocket_id)

	var placed_by_id := {}
	for placed_any in RocketsManager.get_placed():
		if typeof(placed_any) != TYPE_DICTIONARY:
			continue
		var placed: Dictionary = placed_any
		var placed_id := str(placed.get("id", ""))
		if placed_id == "":
			continue
		placed_by_id[placed_id] = placed

	var missions: Array = RocketsManager.get_missions()
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
	RocketsManager.mark_returned_if_due(rocket_id)
	returned = RocketsManager.get_returned_mission()
	if not returned.is_empty() and str(returned.get("rocket_id", "")) == rocket_id:
		return _build_returned_mission_context(returned)

	var target_id := str(latest_mission.get("target", ""))
	var target_details: Dictionary = RocketsManager.get_target_details(target_id)
	var target_label := str(target_details.get("label", target_id if target_id != "" else "mission target"))
	var target_type := str(target_details.get("type", "asteroid"))
	var status := str(RocketsManager.get_rocket_status(rocket_id))
	var arrived := RocketsManager.has_arrived(rocket_id, target_id)
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

func _build_awaiting_mission_context(rocket_id: String) -> Dictionary:
	var rocket_name := RocketSpecs.get_display_name(rocket_id)
	var target_id := str(RocketsManager.get_selected_target())
	var target_details: Dictionary = RocketsManager.get_target_details(target_id) if target_id != "" else {}
	var target_label := str(target_details.get("label", target_id if target_id != "" else "route selection"))
	var target_type := str(target_details.get("type", "asteroid"))
	var contractor: Dictionary = RocketsManager.get_trip_selected_contractor()
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
	var rocket_id := str(context.get("rocket_id", ""))
	var target_id := str(context.get("target_id", ""))
	var target_label := str(context.get("target_label", target_id))
	var target_type := str(context.get("target_type", "asteroid"))
	if rocket_id == "" or target_id == "":
		return
	RocketsManager.set_preview_target(target_id, target_label, target_type, rocket_id)
	RocketsManager.mark_returned_if_due(rocket_id)
	var status := RocketsManager.get_rocket_status(rocket_id)
	var arrived := RocketsManager.has_arrived(rocket_id, target_id)
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
	var is_portrait_layout := vp_h > vp_w

	# Portrait: swap to radial nav; landscape: keep legacy tab bar.
	if is_portrait_layout:
		container.visible = false
		if is_instance_valid(_radial_nav):
			_radial_nav.visible = true
			_setup_radial_nav()
	else:
		container.visible = true
		if is_instance_valid(_radial_nav):
			_radial_nav.visible = false
		# Portrait: full-width bar, no side margins; safe area bottom for home indicator.
		var margin_h := 24.0
		var bar_h := clampf(vp_h * 0.10, 150.0, 240.0)
		var bottom_margin := 0.0
		container.anchor_left   = 0.0
		container.anchor_top    = 1.0
		container.anchor_right  = 1.0
		container.anchor_bottom = 1.0
		container.offset_left   = margin_h
		container.offset_top    = -(bar_h + bottom_margin)
		container.offset_right  = -margin_h
		container.offset_bottom = -bottom_margin

	# Zoom the camera so the designed 1080-unit world fills the full width in
	# portrait. No zoom needed for portrait (1080×1920); landscape builds that
	# are wider than the design aspect zoom in to avoid empty side margins.
	var camera := get_node_or_null("Camera2D") as Camera2D
	if camera != null:
		var design_aspect := 1080.0 / 1920.0
		var actual_aspect := vp_w / vp_h
		if actual_aspect > design_aspect:
			var z := actual_aspect / design_aspect
			camera.zoom = Vector2(z, z)
		else:
			camera.zoom = Vector2(1.0, 1.0)

	# Position the HUD chip strip at top-right, clear of the notch zone.
	# strip_h is proportional so chips match the larger font sizes in design space.
	var hud_strip := get_node_or_null("UILayer/HUDStrip") as HBoxContainer
	if hud_strip != null:
		var status_zone := UILayout.zone(UILayout.Zone.TOP_STATUS, vp_rect.size)
		var strip_h := 64.0   # accommodates font_size 30 chips (24px cap + 16px padding)
		var top_pad := maxf(32.0, status_zone.end.y + 32.0)
		hud_strip.anchor_left   = 1.0
		hud_strip.anchor_top    = 0.0
		hud_strip.anchor_right  = 1.0
		hud_strip.anchor_bottom = 0.0
		hud_strip.offset_left   = -400.0
		hud_strip.offset_top    = top_pad
		hud_strip.offset_right  = -24.0
		hud_strip.offset_bottom = top_pad + strip_h

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
	var app = AppControllerHelper.get_instance()
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
	"relay_1":    Vector2(800, 1450),
	"refinery_1": Vector2(150, 1450),
}
const _STRUCTURE_SEEN_CFG := "user://structure_intro_seen.cfg"

func _apply_structure_visual_evolution() -> void:
	var app = AppControllerHelper.get_instance()
	var player_level := 1
	if app and app.has_method("get_experience_level"):
		player_level = int(app.get_experience_level())

	# Scale the three starter structures based on their room upgrade tiers.
	# "starterrocket1" is the primary type for tier tracking at L1-L4.
	var primary_type := "starterrocket1"
	var upgrades: Dictionary = RocketsManager.get_type_room_upgrades(primary_type)
	var mining_tier := int(upgrades.get("mining", 1))
	var cargo_tier  := int(upgrades.get("cargo", 1))

	# Satellite Station → scales with scanner (track via mission count as proxy)
	var mission_count := int(RocketsManager.get_completed_mission_count())
	var scanner_tier: int = clamp(1 + int(RocketsManager.is_scanner_station_built()), 1, 2)
	_scale_structure("SatelliteStation", scanner_tier)
	_scale_structure("Launchpad", mining_tier)
	_apply_control_station_visual_tier(cargo_tier)
	_update_building_chip_status()

	# Show construction-project structures when completed
	if player_level >= 5:
		for proj_id in _CONSTRUCTION_STRUCTURE_POSITIONS.keys():
			if preload("res://Scripts/Utils/ConstructionManager.gd").is_project_completed(proj_id):
				_ensure_construction_structure_visible(proj_id)

func _update_building_chip_status() -> void:
	if is_instance_valid(_satellite_chip_status):
		var built := RocketsManager.is_scanner_station_built()
		_satellite_chip_status.text = "SCANNING" if built else "OFFLINE"
		_satellite_chip_status.add_theme_color_override("font_color",
			Color(0.22, 0.851, 0.416) if built else Color(0.478, 0.510, 0.565))
	if is_instance_valid(_launchpad_chip_status):
		var in_flight := RocketsManager.get_launched().size() > 0
		_launchpad_chip_status.text = "IN FLIGHT" if in_flight else "READY"
		_launchpad_chip_status.add_theme_color_override("font_color",
			Color(1.0, 0.702, 0.282) if in_flight else Color(0.22, 0.851, 0.416))
	if is_instance_valid(_control_chip_status):
		var jobs_count := RocketsManager.get_placed().size() + RocketsManager.get_launched().size()
		_control_chip_status.text = "%d JOBS" % jobs_count if jobs_count != 1 else "1 JOB"
		_control_chip_status.add_theme_color_override("font_color",
			Color(0.22, 0.851, 0.416) if jobs_count > 0 else Color(0.478, 0.510, 0.565))

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
		var upgrades: Dictionary = RocketsManager.get_type_room_upgrades("starterrocket1")
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
	sprite.texture = LaunchpadTexture
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
	if RocketsManager.is_control_station_built():
		_ensure_control_station_visible()
	else:
		_remove_control_station()

func _ensure_control_station_visible() -> void:
	var layers := get_node_or_null("StructuresLayer")
	if layers == null:
		return
	# Show the UILayer chip (replaces the old floating world-space label).
	if is_instance_valid(_control_chip):
		_control_chip.visible = true
	if layers.get_node_or_null("ControlStation") != null:
		return
	var structure := Node2D.new()
	structure.name = "ControlStation"
	structure.position = CONTROL_STATION_POSITION
	structure.set_script(ControlStationScript)

	var sprite := Sprite2D.new()
	sprite.name = "Sprite2D"
	sprite.scale = Vector2(0.15, 0.15)
	sprite.texture = load(CONTROL_STATION_TEXTURE_PATH)
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

func _remove_control_station() -> void:
	var layers := get_node_or_null("StructuresLayer")
	if layers == null:
		return
	var structure := layers.get_node_or_null("ControlStation")
	if structure != null:
		structure.queue_free()
	# Hide the UILayer chip (no world-space label to free).
	if is_instance_valid(_control_chip):
		_control_chip.visible = false
