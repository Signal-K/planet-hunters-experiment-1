extends Control

const NavigationMixin = preload("res://Scripts/Utils/NavigationMixin.gd")
const GameplayAnalytics = preload("res://Scripts/Systems/GameplayAnalytics.gd")
const RegionMath = preload("res://Scripts/UI/SidescrollMiningRegionMath.gd")
const VisualSync = preload("res://Scripts/UI/SidescrollMiningVisualSync.gd")
const RoomCatalog = preload("res://Scripts/Utils/RoomCatalog.gd")
const RoomSpriteAtlas = preload("res://Scripts/UI/RoomSpriteAtlas.gd")
const MiningTargetTheme = preload("res://Scripts/UI/MiningTargetTheme.gd")
const RocketsManager = preload("res://Scripts/Utils/RocketsManager.gd")
const SubcontractorManager = preload("res://Scripts/Utils/SubcontractorManager.gd")
const UILayout = preload("res://Scripts/UI/UILayout.gd")
const AppControllerHelper = preload("res://Scripts/Utils/AppControllerHelper.gd")

signal mining_completed(minerals: Dictionary, score: int)

const SCROLL_SPEED = 105.0
const TERRAIN_SEGMENT_WIDTH = 20
const ROCKET_Y = 200
const FUEL_DRAIN_RATE = 2.0
const HEAT_GAIN_RATE = 25.0
const HEAT_COOL_RATE = 18.0
const ASTEROID_DURATION = 90.0
const PLANET_DURATION = 180.0
const MAX_DRONES = 3
const DRONE_COOLDOWN = 5.0
const ROOM_ICON_WIDTH = 76
const ROOM_ICON_HEIGHT = 30
const BEAM_SEGMENTS = 14
const PIXEL_BG_MIN_WIDTH = 160
const PIXEL_BG_MIN_HEIGHT = 90

enum GuideStep {
	INTRO,
	MINE_SURFACE_IRON,
	MINE_SURFACE_NICKEL,
	EXPLAIN_SUBSURFACE,
	DEPLOY_DRONE,
	COMPLETE
}

var _terrain_points: PackedVector2Array = []
var _mineral_regions: Array = []
var _scroll_offset = 0.0
var _terrain_width = 4000
var _loop_count = 0
var _mineral_pool_index := 0
var _is_mining = false
var _fuel = 100.0
var _heat = 0.0
var _heat_warned := false
var _signpost_timer := 0.0  # Seconds remaining in pre-mining signpost pause
var _beam_charges = 100.0
var _max_beam_charges = 100.0
var _score = 0
var _combo = 0
var _collected_minerals = {}
var _frame_index = 0
var _frame_timer = 0.0
var _elapsed_time = 0.0
var _target_duration = ASTEROID_DURATION
var _is_planet = false
var _rocket_name = "StarterRocket1"
var _rocket_level = 1
var _drones_enabled := false
var _current_target_id = ""
var _terrain_loop_container: Node2D = null

@onready var terrain_container: Node2D = $TerrainContainer
@onready var terrain_fill: Polygon2D = $TerrainContainer/TerrainFill
@onready var terrain_line: Line2D = $TerrainContainer/TerrainLine
@onready var rocket: Sprite2D = $Rocket
@onready var laser: Line2D = $Laser
@onready var ui_root: Control = $UI
@onready var top_bar: HBoxContainer = $UI/TopBar
@onready var top_spacer: Control = $UI/TopBar/Spacer
@onready var handbook_button: Button = $UI/HandbookButton
@onready var left_gauges: HBoxContainer = $UI/TopBar/LeftGauges
@onready var right_stats: VBoxContainer = $UI/TopBar/RightStats
@onready var fuel_label: Label = $UI/TopBar/LeftGauges/FuelPanel/VBox/Label
@onready var heat_label: Label = $UI/TopBar/LeftGauges/HeatPanel/VBox/Label
@onready var contract_order_vbox: VBoxContainer = $UI/TopBar/RightStats/ContractOrderPanel/VBox
@onready var fuel_bar: ProgressBar = $UI/TopBar/LeftGauges/FuelPanel/VBox/FuelBar
@onready var heat_bar: ProgressBar = $UI/TopBar/LeftGauges/HeatPanel/VBox/HeatBar
@onready var beam_bar: ProgressBar = $UI/TopBar/LeftGauges/BeamPanel/VBox/BeamBar
@onready var beam_label: Label = $UI/TopBar/LeftGauges/BeamPanel/VBox/Label
@onready var contract_order_panel: PanelContainer = $UI/TopBar/RightStats/ContractOrderPanel
@onready var contract_order_title: Label = $UI/TopBar/RightStats/ContractOrderPanel/VBox/TitleLabel
@onready var contract_order_progress: Label = $UI/TopBar/RightStats/ContractOrderPanel/VBox/ProgressLabel
@onready var bottom_bar: HBoxContainer = $UI/BottomBar
@onready var mine_button: Button = $UI/BottomBar/MineButton
@onready var drone_button: Button = $UI/BottomBar/DroneButton
@onready var return_button: Button = $UI/BottomBar/ReturnButton
@onready var menu_button: Button = $UI/BottomBar/MenuButton
@onready var instructions: Label = $UI/Instructions
@onready var handbook_panel: PanelContainer = $UI/HandbookPanel
@onready var handbook_body: Label = $UI/HandbookPanel/VBox/BodyLabel
@onready var particles_container: Node2D = $ParticlesContainer
@onready var drone_pool: Node2D = $DronePool
@onready var inventory_panel: PanelContainer = $UI/InventoryPanel
@onready var inventory_label: Label = $UI/InventoryPanel/InventoryLabel
@onready var drone_label: Label = $UI/TopBar/LeftGauges/DronePanel/VBox/DroneLabel

var _rocket_frames = []
var _guide_step = GuideStep.INTRO
var _guide_active = true
var _drones_available = MAX_DRONES
var _drone_cooldown_timer = 0.0
var _active_drones = []
var _surface_mined_count = 0
var _target_minerals: Dictionary = {}
var _target_mineable_pct: float = 0.5
var _session_context: Dictionary = {}
var _generation_signature: Dictionary = {}
var _total_deposit_count := 0
var _surface_deposit_count := 0
var _subsurface_deposit_count := 0
var _collected_deposit_count := 0
var _surface_collected_count := 0
var _subsurface_collected_count := 0
var _drones_deployed := 0
var _stuck_reasons_emitted: Dictionary = {}
var _completion_reason := "duration_elapsed"
var _completion_emitted := false
var _completion_report := {}
var _last_progress_elapsed := 0.0
var _starter_contract_active := false
var _starter_contractor_name := ""
var _starter_order_targets: Dictionary = {}
var _collection_by_tool := {"laser": 0, "drone": 0}
var _order_matches_by_tool := {"laser": 0, "drone": 0}
var _order_match_total := 0
var _non_order_total := 0
var _rocket_room_layout: Dictionary = {}
var _science_payout_multiplier := 1.0
var _science_xp_multiplier := 1.0
var _room_panel: PanelContainer = null
var _room_grid: GridContainer = null
var _room_debug_overlay: Control = null
var _room_toggle_button: Button = null
var _room_debug_visible := false
var _compact_layout_active := false
var _room_panel_visible := false
var _beam_glow: Line2D = null
var _mars_background: TextureRect = null
var _mars_bg_size := Vector2i.ZERO
var _tutorial_overlay_was_visible := false
var _terrain_pixel_textures: Dictionary = {}
var _target_theme := "asteroid"
var _target_palette: Dictionary = {}
var _target_palette_key := "asteroid:default"
# True when touch/on-screen buttons should be shown: native mobile OR small viewport
# (web users on phones report OS.has_feature("mobile") as false, so we fall back to width)
var _uses_touch_controls := false
# Mission mode: "contractor", "tutorial", or "free"
var _mission_mode := "free"
# Per-mineral ProgressBar nodes inside the contract order panel.
var _mineral_progress_bars: Dictionary = {}
var _mineral_bar_rows: Dictionary = {}  # key → HBoxContainer row
# Cached tutorial step message shown in the MISSION GOAL panel when no contractor order is active.
var _tutorial_step_message := ""

func _ready():
	_suspend_tutorial_overlay()
	_target_palette = _theme_palette(_target_theme)
	_target_palette_key = str(_target_palette.get("palette_key", "asteroid:default"))
	_setup_mars_background()
	_load_rocket_frames()
	_setup_rocket()
	_generate_terrain()
	_configure_rocket_rooms(1)
	_setup_beam_visuals()
	_apply_responsive_layout()
	laser.visible = false
	mine_button.pressed.connect(_on_fire_pressed)
	mine_button.button_up.connect(_on_fire_released)
	drone_button.pressed.connect(_deploy_drone)
	return_button.pressed.connect(_on_return_pressed)
	menu_button.pressed.connect(_toggle_inventory)
	_setup_button_handbook()
	_uses_touch_controls = _should_use_touch_controls()
	_update_bottom_bar_visibility()
	inventory_panel.visible = false
	_update_drone_display()
	get_viewport().size_changed.connect(_on_viewport_size_changed)

	if not Engine.is_editor_hint():
		_show_guide_step()
		AppControllerHelper.record_tutorial_action("arrived_at_mining_site")

func _setup_button_handbook() -> void:
	if handbook_button == null or handbook_panel == null or handbook_body == null:
		return
	handbook_panel.visible = false
	handbook_button.pressed.connect(_toggle_button_handbook)
	handbook_body.text = _build_button_handbook_text()

func _build_button_handbook_text() -> String:
	var entries := [
		"Mine: Hold FIRE to cut into the surface and collect exposed minerals."
	]
	if _drones_enabled:
		entries.append("Drone: Send a drone after deeper deposits the mining beam cannot reach.")
	entries.append("Inventory: Check what you have collected and how much the load is worth.")
	entries.append("Return to Base: End the run and move into mission debrief.")
	return "\n".join(entries)

func _toggle_button_handbook() -> void:
	if handbook_panel == null:
		return
	if handbook_body and is_instance_valid(handbook_body):
		handbook_body.text = _build_button_handbook_text()
	handbook_panel.visible = not handbook_panel.visible

func _exit_tree() -> void:
	_restore_tutorial_overlay()

func _on_viewport_size_changed() -> void:
	var now_touch = _should_use_touch_controls()
	if now_touch != _uses_touch_controls:
		_uses_touch_controls = now_touch
		_update_bottom_bar_visibility()
	_apply_responsive_layout()
	_refresh_mars_background()
	_position_rocket_lane()

func _update_bottom_bar_visibility() -> void:
	mine_button.visible = _uses_touch_controls
	drone_button.visible = _uses_touch_controls and _drones_enabled
	instructions.visible = not _uses_touch_controls

func _should_use_touch_controls() -> bool:
	var viewport_size := get_viewport_rect().size
	# canvas_items+expand on phones in landscape can expose a wide virtual width
	# even when the device is touch-first, so catch that web case explicitly.
	var is_web_landscape_phone := OS.has_feature("web") and viewport_size.x / maxf(viewport_size.y, 1.0) > 1.85
	if OS.has_feature("mobile") or viewport_size.x < 768.0 or is_web_landscape_phone:
		return true
	return _is_mobile_pwa()

func _is_mobile_pwa() -> bool:
	if not OS.has_feature("web"):
		return false
	var js := "(function(){try{var standalone=false; if(window.matchMedia){standalone=window.matchMedia('(display-mode: standalone)').matches;} var iosStandalone=!!(window.navigator && window.navigator.standalone); var coarse=false; if(window.matchMedia){coarse=window.matchMedia('(pointer: coarse)').matches;} if(!coarse){coarse=('ontouchstart' in window) || ((window.navigator && window.navigator.maxTouchPoints) || 0) > 0;} var narrow=Math.min(window.innerWidth||0, window.innerHeight||0) < 900; return ((standalone||iosStandalone) && (coarse||narrow)) ? '1' : '0';}catch(_e){return '0';}})();"
	return str(JavaScriptBridge.eval(js, true)) == "1"

func _setup_beam_visuals() -> void:
	laser.begin_cap_mode = Line2D.LINE_CAP_ROUND
	laser.end_cap_mode = Line2D.LINE_CAP_ROUND
	laser.antialiased = true
	if _beam_glow and is_instance_valid(_beam_glow):
		return
	_beam_glow = Line2D.new()
	_beam_glow.name = "LaserGlow"
	_beam_glow.antialiased = true
	_beam_glow.begin_cap_mode = Line2D.LINE_CAP_ROUND
	_beam_glow.end_cap_mode = Line2D.LINE_CAP_ROUND
	_beam_glow.visible = false
	add_child(_beam_glow)
	move_child(_beam_glow, laser.get_index())

func _setup_mars_background() -> void:
	if _mars_background and is_instance_valid(_mars_background):
		return
	_mars_background = TextureRect.new()
	_mars_background.name = "MarsPixelBackground"
	_mars_background.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_mars_background.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	_mars_background.stretch_mode = TextureRect.STRETCH_SCALE
	_mars_background.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	_mars_background.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_mars_background)
	move_child(_mars_background, 0)
	_apply_base_bg_color()
	_refresh_mars_background()

const MiningBackgroundGenerator = preload("res://Scripts/UI/MiningBackgroundGenerator.gd")
const MiningTerrainGenerator = preload("res://Scripts/UI/MiningTerrainGenerator.gd")

func _refresh_mars_background() -> void:
	if _mars_background == null:
		return
	var viewport := get_viewport_rect().size
	var texture = MiningBackgroundGenerator.generate_background(viewport, _target_theme, _current_target_id, _session_context)
	_mars_background.texture = texture
	_mars_bg_size = texture.get_size()

func _apply_base_bg_color() -> void:
	var base_bg = get_node_or_null("Background") as ColorRect
	if base_bg == null:
		return
	var theme = _theme_palette(_target_theme)
	base_bg.color = theme.get("base_bg", Color(0.06, 0.04, 0.08, 1.0))

func _theme_palette(theme_name: String) -> Dictionary:
	if theme_name == _target_theme and not _target_palette.is_empty():
		return _target_palette
	return MiningTargetTheme.build_palette(theme_name, _current_target_id, _session_context)

func _build_terrain_pixel_texture(theme_name: String) -> Texture2D:
	var palette = _theme_palette(theme_name)
	var base_a = palette.get("terrain_a", Color8(163, 96, 66, 255))
	var base_b = palette.get("terrain_b", Color8(182, 114, 76, 255))
	var shade = palette.get("terrain_shade", Color8(131, 77, 56, 255))
	var highlight = palette.get("terrain_highlight", Color8(222, 151, 90, 255))
	
	var img_w := 28
	var img_h := 20
	var image := Image.create(img_w, img_h, false, Image.FORMAT_RGBA8)
	var rng := RandomNumberGenerator.new()
	rng.seed = hash(_current_target_id) ^ 0x54455252 # "TERR"
	
	for y in range(img_h):
		for x in range(img_w):
			var noise := rng.randf()
			var c: Color
			if noise < 0.12:
				c = shade
			elif noise < 0.24:
				c = highlight
			elif noise < 0.62:
				c = base_a
			else:
				c = base_b
			
			# Add subtle dither/grain
			if (x + y) % 2 == 0:
				c = c.lightened(rng.randf_range(0.0, 0.04))
			else:
				c = c.darkened(rng.randf_range(0.0, 0.04))
				
			image.set_pixel(x, y, c)
			
	return ImageTexture.create_from_image(image)

func _resolve_target_theme() -> String:
	return MiningTargetTheme.resolve_theme(_session_context, _is_planet)

func _apply_responsive_layout() -> void:
	var viewport := get_viewport_rect().size
	var is_mobile := viewport.x < 900.0
	var is_portrait_mobile := is_mobile and viewport.y > viewport.x
	_compact_layout_active = _is_compact_layout(viewport)
	_set_hud_typography(is_mobile, is_portrait_mobile)
	_ensure_right_stats_parent(ui_root if is_portrait_mobile else top_bar)
	top_spacer.visible = not is_portrait_mobile

	# TOP_HUD zone — top bar spans the full HUD rect from UILayout.
	var hud := UILayout.zone(UILayout.Zone.MINING_HUD, viewport)
	top_bar.offset_left   = hud.position.x
	top_bar.offset_top    = hud.position.y
	top_bar.offset_right  = -(viewport.x - hud.end.x)
	top_bar.offset_bottom = hud.end.y
	top_bar.add_theme_constant_override("separation", 8 if is_portrait_mobile else (12 if is_mobile else 18))
	left_gauges.add_theme_constant_override("separation", 6 if is_portrait_mobile else (10 if is_mobile else 14))
	right_stats.add_theme_constant_override("separation", 5 if is_portrait_mobile else (8 if is_mobile else 10))
	contract_order_vbox.add_theme_constant_override("separation", 6 if is_mobile else 4)

	if is_portrait_mobile:
		_apply_portrait_layout(viewport)
	else:
		_apply_landscape_layout(is_mobile)
	_update_room_panel_visibility(viewport)
	_reposition_handbook_button(viewport)
	_reposition_handbook_panel(viewport)
	_position_rocket_lane()
	# MINING_BOTTOM zone — position the BottomBar via UILayout so it tracks the
	# actual viewport bottom on every screen size (fixes mobile landscape gap).
	if bottom_bar != null:
		UILayout.place(bottom_bar, UILayout.zone(UILayout.Zone.MINING_BOTTOM, viewport))

func _is_compact_layout(viewport: Vector2) -> bool:
	return viewport.y > viewport.x or viewport.x < 1600.0 or viewport.y < 900.0

func _set_hud_typography(is_mobile: bool, is_portrait_mobile: bool) -> void:
	var gauge_font_size = 12 if is_portrait_mobile else (14 if is_mobile else (15 if _compact_layout_active else 18))
	var instructions_font_size = 13 if is_portrait_mobile else (16 if is_mobile else (17 if _compact_layout_active else 22))
	var contract_title_font_size = 13 if is_portrait_mobile else (15 if is_mobile else 17)
	var contract_progress_font_size = 12 if is_portrait_mobile else (14 if is_mobile else 15)
	fuel_label.add_theme_font_size_override("font_size", gauge_font_size)
	heat_label.add_theme_font_size_override("font_size", gauge_font_size)
	beam_label.add_theme_font_size_override("font_size", gauge_font_size)
	drone_label.add_theme_font_size_override("font_size", gauge_font_size)
	instructions.add_theme_font_size_override("font_size", instructions_font_size)
	contract_order_title.add_theme_font_size_override("font_size", contract_title_font_size)
	contract_order_progress.add_theme_font_size_override("font_size", contract_progress_font_size)

func _ensure_right_stats_parent(parent_node: Node) -> void:
	if parent_node == null:
		return
	if right_stats.get_parent() == parent_node:
		return
	var existing_parent = right_stats.get_parent()
	if existing_parent:
		existing_parent.remove_child(right_stats)
	parent_node.add_child(right_stats)

func _apply_portrait_layout(viewport: Vector2) -> void:
	left_gauges.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	contract_order_panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	# right_stats drops below the top bar in portrait.
	var hud := UILayout.zone(UILayout.Zone.MINING_HUD, viewport)
	right_stats.layout_mode = 1
	right_stats.anchor_left   = 0.0
	right_stats.anchor_top    = 0.0
	right_stats.anchor_right  = 1.0
	right_stats.anchor_bottom = 0.0
	right_stats.offset_left   = UILayout.EDGE
	right_stats.offset_top    = hud.end.y + 6.0
	right_stats.offset_right  = -UILayout.EDGE
	right_stats.offset_bottom = right_stats.offset_top + 120.0
	# CONTRACT zone — centered, below right_stats in portrait.
	# INSTRUCTION zone — centered, below right_stats in portrait.
	var instr_zone := UILayout.zone(UILayout.Zone.MINING_INSTRUCTION, viewport)
	instructions.offset_left   = -(instr_zone.size.x * 0.5)
	instructions.offset_right  =   instr_zone.size.x * 0.5
	instructions.offset_top    = right_stats.offset_bottom + 6.0
	instructions.offset_bottom = instructions.offset_top + 54.0
	# MINING_MODAL (inventory overlay) — centered.
	inventory_panel.offset_left   = -(viewport.x * 0.48)
	inventory_panel.offset_right  =  viewport.x * 0.48
	inventory_panel.offset_top    = -(viewport.y * 0.34)
	inventory_panel.offset_bottom =  viewport.y * 0.34
	# ROOMS — positioned via shared helper.
	if _room_panel and is_instance_valid(_room_panel):
		_layout_room_panel(viewport)
	if _room_toggle_button and is_instance_valid(_room_toggle_button):
		_layout_room_toggle_button(viewport)

func _apply_landscape_layout(is_mobile: bool) -> void:
	var viewport := get_viewport_rect().size
	right_stats.layout_mode = 2
	right_stats.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	right_stats.size_flags_stretch_ratio = 0.5
	contract_order_panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	left_gauges.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	# INSTRUCTION zone — centered horizontal band below HUD.
	var instr := UILayout.zone(UILayout.Zone.MINING_INSTRUCTION, viewport)
	instructions.offset_left   = -(instr.size.x * 0.5)
	instructions.offset_right  =  (instr.size.x * 0.5)
	instructions.offset_top    = instr.position.y
	instructions.offset_bottom = instr.end.y
	# ROOMS — positioned via shared helper.
	if _room_panel and is_instance_valid(_room_panel):
		_layout_room_panel(viewport)
	if _room_toggle_button and is_instance_valid(_room_toggle_button):
		_layout_room_toggle_button(viewport)

func _update_room_panel_visibility(viewport: Vector2) -> void:
	if _room_panel == null:
		return
	var compact := _is_compact_layout(viewport)
	if _room_toggle_button and is_instance_valid(_room_toggle_button):
		_room_toggle_button.visible = true
		_room_toggle_button.text = "ROOMS: ON" if _room_panel_visible else "ROOMS"
		_room_toggle_button.custom_minimum_size = Vector2(96, 28 if compact else 30)
	_room_panel.visible = _room_panel_visible
	_layout_room_panel(viewport)
	_layout_room_toggle_button(viewport)
	_render_room_panel()

func _toggle_room_panel() -> void:
	_room_panel_visible = not _room_panel_visible
	if _room_panel:
		_room_panel.visible = _room_panel_visible
	if _room_toggle_button:
		_room_toggle_button.text = "ROOMS: ON" if _room_panel_visible else "ROOMS"

func _layout_room_panel(viewport: Vector2) -> void:
	if _room_panel == null:
		return
	# MINING_ROOMS zone: top-LEFT, below HUD — never conflicts with
	# MINING_HANDBOOK (top-right) or TUTORIAL_COACH (top-right, Earth only).
	var r := UILayout.zone(UILayout.Zone.MINING_ROOMS, viewport)
	# Leave room above for the toggle button (28px + 4px gap).
	r.position.y += 32.0
	r.size.y      -= 32.0
	UILayout.place(_room_panel, UILayout.clamp_to_viewport(r, viewport))

func _layout_room_toggle_button(viewport: Vector2) -> void:
	if _room_toggle_button == null or not is_instance_valid(_room_toggle_button):
		return
	# Toggle sits just above the rooms panel in the MINING_ROOMS zone.
	var rooms := UILayout.zone(UILayout.Zone.MINING_ROOMS, viewport)
	var btn_h  := 28.0
	var btn_r  := Rect2(rooms.position.x, rooms.position.y, rooms.size.x, btn_h)
	UILayout.place(_room_toggle_button, UILayout.clamp_to_viewport(btn_r, viewport))

func _reposition_handbook_panel(viewport: Vector2) -> void:
	if handbook_panel == null or not is_instance_valid(handbook_panel):
		return
	# MINING_HANDBOOK zone: top-right dropdown. Tutorial is suspended during
	# mining so this zone is uncontested. Anchor the panel below the guide
	# button so the button never collides with the order summary in the HUD.
	var r := UILayout.zone(UILayout.Zone.MINING_HANDBOOK, viewport)
	var button_h := maxf(maxf(handbook_button.size.y, handbook_button.custom_minimum_size.y), 40.0)
	r.position.y += button_h + 8.0
	r.size.y = maxf(120.0, r.size.y - (button_h + 8.0))
	UILayout.place(handbook_panel, UILayout.clamp_to_viewport(r, viewport))

func _reposition_handbook_button(viewport: Vector2) -> void:
	if handbook_button == null or not is_instance_valid(handbook_button):
		return
	var handbook_zone := UILayout.zone(UILayout.Zone.MINING_HANDBOOK, viewport)
	var button_width := 128.0 if viewport.x >= 900.0 else 112.0
	var button_height := 40.0
	var button_rect := Rect2(
		handbook_zone.end.x - button_width,
		handbook_zone.position.y,
		button_width,
		button_height
	)
	UILayout.place(handbook_button, UILayout.clamp_to_viewport(button_rect, viewport))

func start_mining(is_planet: bool = false, difficulty: int = 1, target_id: String = "", minerals: Dictionary = {}, mineable_pct: float = 0.5, session_context: Dictionary = {}):
	_is_planet = is_planet
	_target_duration = PLANET_DURATION if is_planet else ASTEROID_DURATION
	_elapsed_time = 0.0
	_loop_count = 0
	_score = 0
	_combo = 0
	_collected_minerals = {}
	_total_deposit_count = 0
	_surface_deposit_count = 0
	_subsurface_deposit_count = 0
	_collected_deposit_count = 0
	_surface_collected_count = 0
	_subsurface_collected_count = 0
	_drones_deployed = 0
	_stuck_reasons_emitted = {}
	_completion_reason = "duration_elapsed"
	_completion_emitted = false
	_last_progress_elapsed = 0.0
	_fuel = 100.0
	_heat = 0.0
	_heat_warned = false
	_signpost_timer = 0.0
	_current_target_id = target_id
	_rocket_level = difficulty
	_configure_rocket_rooms(difficulty)
	if _rocket_level >= 5 and _room_panel == null:
		_setup_room_panel()
	_target_minerals = minerals
	_target_mineable_pct = mineable_pct
	_drones_enabled = int(RocketsManager.get_mission_stage()) >= 4
	if not _drones_enabled:
		_target_mineable_pct = 1.0  # force all-surface deposits; drones not available yet
	_update_bottom_bar_visibility()
	_session_context = session_context.duplicate(true)
	var signature_any = _session_context.get("generation_signature", {})
	if typeof(signature_any) == TYPE_DICTIONARY:
		_generation_signature = (signature_any as Dictionary).duplicate(true)
	else:
		_generation_signature = {}
	_target_theme = _resolve_target_theme()
	_target_palette = _theme_palette(_target_theme)
	_target_palette_key = str(_target_palette.get("palette_key", "%s:default" % _target_theme))
	_apply_base_bg_color()
	_refresh_mars_background()
	_completion_report = {}
	_resolve_starter_contract_context()
	_mission_mode = str(_session_context.get("mission_mode", "free"))
	_tutorial_step_message = _resolve_tutorial_step_message()
	_setup_contract_panel_style()
	_collection_by_tool = {"laser": 0, "drone": 0}
	_order_matches_by_tool = {"laser": 0, "drone": 0}
	_order_match_total = 0
	_non_order_total = 0
	
	# Regenerate terrain with target seed and difficulty
	_generate_terrain()
	_tag_order_target_minerals()
	
	# Beam charges based on difficulty level
	_max_beam_charges = 20.0 + (difficulty * 10.0)
	# Guarantee at least 1.4× the order total so the order is completable
	var _order_total := 0
	for _amt in _starter_order_targets.values():
		_order_total += int(_amt)
	if _order_total > 0:
		_max_beam_charges = max(_max_beam_charges, ceil(_order_total * 1.4))
	_beam_charges = _max_beam_charges
	_update_mineral_header_label()
	return_button.text = "RETURN"
	return_button.modulate = Color(1, 1, 1, 1)
	var analytics_payload := _with_session_context({
		"target_id": _current_target_id,
		"target_type": "planet" if _is_planet else "asteroid",
		"rocket_level": _rocket_level,
		"science_payout_multiplier": snapped(_science_payout_multiplier, 0.01),
		"science_xp_multiplier": snapped(_science_xp_multiplier, 0.01),
		"target_duration_seconds": _target_duration,
		"mineable_pct": _target_mineable_pct,
		"total_deposit_count": _total_deposit_count,
		"surface_deposit_count": _surface_deposit_count,
		"subsurface_deposit_count": _subsurface_deposit_count
	})
	GameplayAnalytics.start_mining_session(analytics_payload)
	_refresh_contract_order_tracker()
	_refresh_contractor_bonus_label()
	_show_mineral_signpost()

	# Update UI after scene is ready
	call_deferred("_update_rocket_ui")

func _update_rocket_ui():
	if beam_bar:
		beam_bar.value = 100.0

func _configure_rocket_rooms(progress_level: int) -> void:
	var rocket_type = "starterrocket1"
	if progress_level >= 3:
		rocket_type = "starterrocket3"
	elif progress_level >= 2:
		rocket_type = "starterrocket2"
	_rocket_room_layout = RoomCatalog.create_layout_for_rocket_type(rocket_type)
	_rocket_level = RoomCatalog.derive_rocket_level(_rocket_room_layout)
	_refresh_science_room_context()
	_render_room_panel()

func _refresh_science_room_context() -> void:
	var science = RoomCatalog.science_multipliers(_rocket_room_layout)
	_science_payout_multiplier = float(science.get("payout_multiplier", 1.0))
	_science_xp_multiplier = float(science.get("xp_multiplier", 1.0))

func _setup_room_panel() -> void:
	var ui_root = get_node_or_null("UI")
	if ui_root == null or not (ui_root is Control):
		return
	_room_panel = PanelContainer.new()
	_room_panel.name = "RoomPanel"
	_room_panel.set_anchors_preset(Control.PRESET_TOP_RIGHT)
	_room_panel.offset_left = -340
	_room_panel.offset_top = 120
	_room_panel.offset_right = -20
	_room_panel.offset_bottom = 320
	ui_root.add_child(_room_panel)

	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 8)
	margin.add_theme_constant_override("margin_top", 8)
	margin.add_theme_constant_override("margin_right", 8)
	margin.add_theme_constant_override("margin_bottom", 8)
	_room_panel.add_child(margin)

	var vbox := VBoxContainer.new()
	margin.add_child(vbox)

	var title := Label.new()
	title.text = "Rocket Rooms"
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	vbox.add_child(title)

	_room_grid = GridContainer.new()
	_room_grid.columns = 2
	_room_grid.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_room_grid.add_theme_constant_override("h_separation", 8)
	_room_grid.add_theme_constant_override("v_separation", 4)
	vbox.add_child(_room_grid)

	_room_debug_overlay = Control.new()
	_room_debug_overlay.name = "RoomDebugOverlay"
	_room_debug_overlay.set_anchors_preset(Control.PRESET_FULL_RECT)
	_room_debug_overlay.visible = false
	_room_debug_overlay.z_index = 20
	_room_debug_overlay.mouse_filter = Control.MOUSE_FILTER_IGNORE
	ui_root.add_child(_room_debug_overlay)

	_room_toggle_button = Button.new()
	_room_toggle_button.name = "RoomPanelToggle"
	_room_toggle_button.text = "ROOMS"
	_room_toggle_button.focus_mode = Control.FOCUS_NONE
	_room_toggle_button.pressed.connect(_toggle_room_panel)
	ui_root.add_child(_room_toggle_button)

func _render_room_panel() -> void:
	if _room_grid == null:
		return
	_room_grid.columns = 2
	for child in _room_grid.get_children():
		child.queue_free()
	var rooms = RoomCatalog.get_installed_rooms(_rocket_room_layout)
	for room_row in rooms:
		var room_id = str(room_row.get("room_id", ""))
		var room_def = RoomCatalog.get_room(room_id)
		if room_def.is_empty():
			continue
		var tile := TextureRect.new()
		tile.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		tile.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		tile.custom_minimum_size = Vector2(56, 24)
		tile.texture = RoomSpriteAtlas.texture_for_room(room_id)
		if tile.texture == null:
			tile.modulate = Color(0.16, 0.22, 0.34, 1.0)
		_room_grid.add_child(tile)
		var label := Label.new()
		var room_name = _truncate_room_name(str(room_def.get("name", room_id)))
		var tier = int(room_row.get("tier", 1))
		label.text = "%s Tier %d" % [room_name, tier]
		label.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
		label.add_theme_font_size_override("font_size", 12 if _compact_layout_active else 14)
		_room_grid.add_child(label)
	_refresh_room_debug_overlay()

func _truncate_room_name(name: String) -> String:
	var max_len := 14
	if name.length() <= max_len:
		return name
	return "%s..." % name.substr(0, max_len - 3)

func _refresh_room_debug_overlay() -> void:
	if _room_debug_overlay == null:
		return
	for child in _room_debug_overlay.get_children():
		child.queue_free()
	_room_debug_overlay.visible = _room_debug_visible
	if not _room_debug_visible:
		return
	if not RoomSpriteAtlas.has_sheet():
		return
	var debug_regions = RoomSpriteAtlas.get_debug_regions()
	if debug_regions.is_empty():
		return
	var sheet = load(RoomSpriteAtlas.SHEET_PATH)
	if sheet == null or not (sheet is Texture2D):
		return
	var texture_rect := TextureRect.new()
	texture_rect.texture = sheet
	texture_rect.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	texture_rect.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	texture_rect.set_anchors_preset(Control.PRESET_TOP_RIGHT)
	texture_rect.offset_left = -540
	texture_rect.offset_top = 330
	texture_rect.offset_right = -20
	texture_rect.offset_bottom = 650
	texture_rect.modulate = Color(1, 1, 1, 0.92)
	_room_debug_overlay.add_child(texture_rect)
	var target_rect := texture_rect.get_rect()
	var sheet_size := Vector2(texture_rect.texture.get_width(), texture_rect.texture.get_height())
	if sheet_size.x <= 0 or sheet_size.y <= 0:
		return
	var scale_x := target_rect.size.x / sheet_size.x
	var scale_y := target_rect.size.y / sheet_size.y
	for entry in debug_regions:
		var r: Rect2 = entry.get("rect", Rect2())
		var marker := ColorRect.new()
		marker.color = Color(0.15, 0.95, 0.95, 0.18)
		marker.position = target_rect.position + Vector2(r.position.x * scale_x, r.position.y * scale_y)
		marker.size = Vector2(r.size.x * scale_x, r.size.y * scale_y)
		_room_debug_overlay.add_child(marker)
		var outline := ColorRect.new()
		outline.color = Color(0.15, 0.95, 0.95, 0.95)
		outline.position = marker.position
		outline.size = Vector2(marker.size.x, 1)
		_room_debug_overlay.add_child(outline)
		var index_label := Label.new()
		index_label.text = "%d %s" % [int(entry.get("index", 0)) + 1, str(entry.get("room_id", ""))]
		index_label.position = marker.position + Vector2(4, 2)
		index_label.add_theme_font_size_override("font_size", 11)
		_room_debug_overlay.add_child(index_label)

func _load_rocket_frames():
	for i in range(1, 9):
		var frame = load("res://assets/Vehicles/StarterRocketStage2Frame%d.png" % i)
		_rocket_frames.append(frame)

func _setup_rocket():
	rocket.texture = _rocket_frames[0]
	rocket.position = Vector2(250, ROCKET_Y)
	rocket.scale = Vector2(0.27, 0.27)  # 80% larger (0.15 * 1.8)
	rocket.rotation = deg_to_rad(90)
	_position_rocket_lane()

func _position_rocket_lane() -> void:
	if rocket == null:
		return
	var viewport := get_viewport_rect().size
	var hud_clearance: float = maxf(top_bar.offset_bottom + 220.0, instructions.offset_bottom + 90.0)
	var target_y: float = clampf(hud_clearance, 320.0, maxf(viewport.y * 0.66, 360.0))
	rocket.position.y = target_y

func _generate_terrain():
	var screen_height = get_viewport_rect().size.y
	var result = MiningTerrainGenerator.generate_terrain(
		_terrain_width, _current_target_id, screen_height, _generation_signature, _rocket_level,
		terrain_container, _target_theme, _theme_palette, _target_palette_key,
		_terrain_pixel_textures, _build_terrain_pixel_texture, _target_minerals,
		_target_mineable_pct, _guide_active
	)
	_terrain_points = result.points
	_mineral_regions = result.mineral_regions
	_total_deposit_count = result.total_deposit_count
	_surface_deposit_count = result.surface_deposit_count
	_subsurface_deposit_count = result.subsurface_deposit_count
	_mineral_pool_index = _mineral_regions.size()
	_rebuild_loop_container()

func _get_terrain_y_at(x: float) -> float:
	return MiningTerrainGenerator._get_terrain_y_at(x, _terrain_points)

func _rebuild_loop_container() -> void:
	if _terrain_loop_container == null:
		_terrain_loop_container = Node2D.new()
		_terrain_loop_container.name = "TerrainLoopContainer"
		terrain_container.get_parent().add_child(_terrain_loop_container)
		terrain_container.get_parent().move_child(_terrain_loop_container, terrain_container.get_index() + 1)

	# Clear previous loop terrain
	for child in _terrain_loop_container.get_children():
		child.queue_free()

	# Duplicate visuals for seamless loop
	var fill_clone = terrain_fill.duplicate()
	var line_clone = terrain_line.duplicate()
	_terrain_loop_container.add_child(fill_clone)
	_terrain_loop_container.add_child(line_clone)
	
	# Clone rocks and minerals
	var rock_pool = terrain_container.get_node_or_null("RockPool")
	if rock_pool:
		_terrain_loop_container.add_child(rock_pool.duplicate())
	var mineral_pool = terrain_container.get_node_or_null("MineralPool")
	if mineral_pool:
		_terrain_loop_container.add_child(mineral_pool.duplicate())

func _process(delta):
	_enforce_tutorial_overlay_hidden()
	_elapsed_time += delta
	
	# Animate particles from pool
	_animate_particles(delta)
	
	_scroll_offset += SCROLL_SPEED * delta
	
	# Loop terrain seamlessly
	if _scroll_offset >= _terrain_width:
		_scroll_offset = fmod(_scroll_offset, _terrain_width)
		_loop_count += 1
		GameplayAnalytics.emit_mining_loop(_loop_count, {
			"elapsed_seconds": snapped(_elapsed_time, 0.1),
			"collected_deposit_count": _collected_deposit_count,
			"drones_deployed": _drones_deployed
		})
		_reset_minerals()
	
	# Position both terrain instances for seamless loop
	terrain_container.position.x = -_scroll_offset
	if _terrain_loop_container and is_instance_valid(_terrain_loop_container):
		_terrain_loop_container.position.x = -_scroll_offset + _terrain_width
	
	# Check if we need to show the loop (when near end)
	if _scroll_offset > _terrain_width * 0.5:
		# We're in second half, prepare for loop by resetting visuals
		pass
	
	_frame_timer += delta
	if _frame_timer >= 0.1:
		_frame_timer = 0.0
		_frame_index = (_frame_index + 1) % _rocket_frames.size()
		rocket.texture = _rocket_frames[_frame_index]
	
	if _signpost_timer > 0.0:
		_signpost_timer -= delta
		if _signpost_timer <= 0.0:
			_signpost_timer = 0.0
			instructions.modulate.a = 0.0
	else:
		_fuel -= FUEL_DRAIN_RATE * delta
	fuel_bar.value = _fuel
	
	beam_bar.value = (_beam_charges / _max_beam_charges) * 100.0
	if beam_label:
		beam_label.text = "BEAM: %d" % int(_beam_charges)
	
	# Check for fuel depletion
	if _fuel <= 0:
		_fuel = 0
		fuel_bar.value = 0
		return_button.text = "FUEL DEPLETED - RETURN"
		return_button.modulate = Color(1, 0.5, 0.5, 1)
		_completion_reason = "fuel_depleted"
		_complete_mining()
		return
	elif _beam_charges <= 0:
		return_button.text = "BEAM DEPLETED - RETURN"
		return_button.modulate = Color(1, 0.7, 0.3, 1)
	
	if _drone_cooldown_timer > 0:
		_drone_cooldown_timer -= delta
		if _drone_cooldown_timer <= 0:
			_update_drone_display()
	
	if _guide_active:
		_update_guide(delta)
	
	if _is_mining and _beam_charges > 0:
		_heat = min(100, _heat + HEAT_GAIN_RATE * delta)
		_fire_laser()
	else:
		_heat = max(0, _heat - HEAT_COOL_RATE * delta)
		laser.visible = false
		if _beam_glow:
			_beam_glow.visible = false
		if _heat == 0 and _combo > 0:
			_combo = 0
			_update_mineral_header_label()
	
	heat_bar.value = _heat

	if not _heat_warned and _heat >= 50.0:
		_heat_warned = true
		instructions.text = "Heat rising — release FIRE to cool"
		instructions.modulate.a = 1.0

	# Allow inventory check anytime
	if Input.is_key_pressed(KEY_E):
		if not inventory_panel.visible:
			inventory_panel.visible = true
			_update_inventory_display()
	else:
		inventory_panel.visible = false
	
	if not _guide_active:
		if Input.is_action_pressed("ui_accept") and not _uses_touch_controls:
			_is_mining = true
		elif Input.is_action_just_released("ui_accept"):
			_is_mining = false

		if _drones_enabled and Input.is_key_pressed(KEY_D) and _drones_available > 0 and _drone_cooldown_timer <= 0:
			_deploy_drone()
	
	if _elapsed_time >= _target_duration:
		_completion_reason = "duration_elapsed"
		_complete_mining()
		return

	_maybe_emit_stuck_signals()

func _fire_laser():
	laser.visible = true
	if _beam_glow:
		_beam_glow.visible = true
	var laser_start := rocket.position + Vector2(0, 8)
	var rocket_terrain_x := fmod(rocket.position.x + _scroll_offset, _terrain_width)
	var terrain_y := _get_terrain_y_at(rocket_terrain_x)
	var laser_end := Vector2(rocket.position.x, terrain_y)
	var points := _build_beam_points(laser_start, laser_end)
	laser.clear_points()
	for point in points:
		laser.add_point(point)
	var heat_pct: float = _heat / 100.0
	laser.width = lerpf(6.0, 9.5, heat_pct)
	laser.default_color = Color(0.20, 0.92, 1.0, 0.95).lerp(Color(1.0, 0.34, 0.22, 0.98), heat_pct)
	if _beam_glow:
		_beam_glow.clear_points()
		for point in points:
			_beam_glow.add_point(point)
		_beam_glow.width = laser.width * 2.4
		_beam_glow.default_color = Color(
			min(laser.default_color.r + 0.22, 1.0),
			min(laser.default_color.g + 0.22, 1.0),
			min(laser.default_color.b + 0.22, 1.0),
			0.35
		)
	_check_mineral_hit()

func _build_beam_points(laser_start: Vector2, laser_end: Vector2) -> PackedVector2Array:
	var points := PackedVector2Array()
	var heat_pct: float = _heat / 100.0
	var amp_primary := lerpf(4.0, 12.0, heat_pct)
	var amp_secondary := amp_primary * 0.5
	for i in range(BEAM_SEGMENTS + 1):
		var t := float(i) / float(BEAM_SEGMENTS)
		var y := lerpf(laser_start.y, laser_end.y, t)
		var taper := sin(t * PI)
		var phase: float = _elapsed_time * 15.0
		var wave_a := sin((t * 13.0) + phase) * amp_primary
		var wave_b := sin((t * 27.0) - (phase * 0.62)) * amp_secondary
		var x := laser_start.x + (wave_a + wave_b) * taper
		points.append(Vector2(x, y))
	return points

func _check_mineral_hit():
	var rocket_x = fmod(rocket.position.x + _scroll_offset, _terrain_width)
	
	for region in _mineral_regions:
		if region.collected:
			continue
		
		if not region.is_surface:  # Skip subsurface deposits
			continue
		
		if rocket_x >= region.x and rocket_x <= region.x + region.width:
			region.collected = true
			_apply_region_visual_state(region)
			
			# Reduce beam charge by 1 per mineral collected
			_beam_charges = max(0, _beam_charges - 1)
			
			if _guide_active:
				_surface_mined_count += 1
				if _guide_step == GuideStep.MINE_SURFACE_IRON and _surface_mined_count >= 1:
					_advance_guide_step(GuideStep.MINE_SURFACE_NICKEL)
				elif _guide_step == GuideStep.MINE_SURFACE_NICKEL and _surface_mined_count >= 2:
					_advance_guide_step(GuideStep.EXPLAIN_SUBSURFACE if _drones_enabled else GuideStep.COMPLETE)
			_record_region_collection(region, "laser")
			_spawn_particles(region)
			
			_fuel = min(100, _fuel + 5)
			break

var _particle_pool_index = 0

func _animate_particles(delta: float):
	"""Animate particles in the pool (currently using tweens, so this is a placeholder)"""
	# Particles are animated via tweens in _spawn_particles
	# This function exists to prevent parse errors
	pass

func _spawn_particles(region):
	# Use pre-created particle pool from scene instead of runtime creation
	var particle_pool = particles_container.get_node_or_null("ParticlePool")
	if not particle_pool:
		return
	
	var particles = particle_pool.get_children()
	var particle_count = 8
	var region_center_x = region.x + region.width / 2.0
	var region_y = _get_terrain_y_at(region_center_x)
	
	for i in range(particle_count):
		if _particle_pool_index >= particles.size():
			_particle_pool_index = 0  # Wrap around and reuse
		
		var particle = particles[_particle_pool_index]
		_particle_pool_index += 1
		
		if not particle is ColorRect:
			continue
		
		particle.size = Vector2(4, 4)
		particle.color = region.mineral.color
		
		var start_x = region_center_x + randf_range(-region.width / 2, region.width / 2)
		particle.position = Vector2(start_x - _scroll_offset, region_y)
		particle.visible = true
		
		var tween = create_tween()
		tween.tween_property(particle, "position", rocket.position, 0.3).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)
		tween.tween_callback(func(): particle.visible = false)

func _record_region_collection(region: Dictionary, source: String) -> void:
	if region.is_empty():
		return
	_collected_deposit_count += 1
	_last_progress_elapsed = _elapsed_time
	if bool(region.get("is_surface", false)):
		_surface_collected_count += 1
		_combo += 1
	else:
		_subsurface_collected_count += 1
		_combo = 0
	var mineral = region.get("mineral", {})
	var mineral_name = str(mineral.get("name", "Unknown"))
	var source_key = source.strip_edges().to_lower()
	if source_key == "":
		source_key = "laser"
	if not _collection_by_tool.has(source_key):
		_collection_by_tool[source_key] = 0
	_collection_by_tool[source_key] = int(_collection_by_tool.get(source_key, 0)) + 1
	if _is_order_target_mineral(mineral_name):
		if not _order_matches_by_tool.has(source_key):
			_order_matches_by_tool[source_key] = 0
		_order_matches_by_tool[source_key] = int(_order_matches_by_tool.get(source_key, 0)) + 1
		_order_match_total += 1
	else:
		_non_order_total += 1
	var mineral_value = int(mineral.get("value", 0))
	var points = mineral_value * max(_combo, 1)
	_score += points
	if not _collected_minerals.has(mineral_name):
		_collected_minerals[mineral_name] = 0
	_collected_minerals[mineral_name] += 1
	_update_mineral_header_label()
	if _collected_deposit_count == 1:
		GameplayAnalytics.emit_event("mining_first_collection", _with_session_context({
			"collection_source": source,
			"elapsed_seconds": snapped(_elapsed_time, 0.1),
			"mineral_name": mineral_name
		}))
	_refresh_contract_order_tracker()

func _maybe_emit_stuck_signals() -> void:
	if _should_emit_stuck_reason("no_collection_30s", _elapsed_time >= 30.0 and _collected_deposit_count == 0):
		GameplayAnalytics.emit_mining_stuck("no_collection_30s", {
			"elapsed_seconds": snapped(_elapsed_time, 0.1),
			"loop_count": _loop_count
		})
	if _should_emit_stuck_reason("looping_low_yield", _loop_count >= 1 and _elapsed_time >= 45.0 and _collected_deposit_count <= 1):
		GameplayAnalytics.emit_mining_stuck("looping_low_yield", {
			"elapsed_seconds": snapped(_elapsed_time, 0.1),
			"loop_count": _loop_count,
			"collected_deposit_count": _collected_deposit_count
		})

func _should_emit_stuck_reason(reason: String, condition: bool) -> bool:
	if not condition:
		return false
	if bool(_stuck_reasons_emitted.get(reason, false)):
		return false
	_stuck_reasons_emitted[reason] = true
	return true

func _with_session_context(payload: Dictionary) -> Dictionary:
	var merged := payload.duplicate(true)
	for key in _session_context.keys():
		merged[key] = _session_context[key]
	return merged

func _on_fire_pressed():
	_is_mining = true

func _on_fire_released():
	_is_mining = false

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo and event.keycode == KEY_F8:
		_room_debug_visible = not _room_debug_visible
		_refresh_room_debug_overlay()

func _toggle_inventory():
	inventory_panel.visible = !inventory_panel.visible
	if inventory_panel.visible:
		_update_inventory_display()

func _update_inventory_display():
	var text = "STORAGE\n"
	text += "─────────────────\n"
	text += "Fuel:  %d%%\n" % int(round(_fuel))
	text += "Heat:  %d%%\n" % int(round(_heat))
	text += "Beam:  %d%%\n" % int(round(_beam_charges / max(_max_beam_charges, 1.0) * 100.0))
	text += "\nMINERALS COLLECTED\n"
	if _collected_minerals.is_empty():
		text += "Nothing yet...\n"
	else:
		for mineral_name in _collected_minerals:
			text += "%s: %d\n" % [mineral_name, _collected_minerals[mineral_name]]
	text += "\nScore: %d" % _score
	inventory_label.text = text

func _complete_mining():
	if _completion_emitted:
		return
	_completion_emitted = true
	var starter_contract_complete = _is_starter_contract_complete()
	var total_passes = max(_loop_count + 1, 1)
	var available_deposit_opportunities = max(_total_deposit_count * total_passes, 1)
	var collection_rate_pct = (float(_collected_deposit_count) / float(available_deposit_opportunities)) * 100.0
	var laser_collected = int(_collection_by_tool.get("laser", 0))
	var drone_collected = int(_collection_by_tool.get("drone", 0))
	var total_collected = max(_collected_deposit_count, 0)
	var order_precision_pct = 0.0
	if total_collected > 0:
		order_precision_pct = (float(_order_match_total) / float(total_collected)) * 100.0
	var laser_order_precision_pct = 0.0
	if laser_collected > 0:
		laser_order_precision_pct = (float(int(_order_matches_by_tool.get("laser", 0))) / float(laser_collected)) * 100.0
	var drone_order_precision_pct = 0.0
	if drone_collected > 0:
		drone_order_precision_pct = (float(int(_order_matches_by_tool.get("drone", 0))) / float(drone_collected)) * 100.0
	var drone_effective_hit_rate_pct = 0.0
	if _drones_deployed > 0:
		drone_effective_hit_rate_pct = (float(drone_collected) / float(_drones_deployed)) * 100.0
	var accuracy_payload := {
		"total_collections": total_collected,
		"laser_collections": laser_collected,
		"drone_collections": drone_collected,
		"drones_deployed": _drones_deployed,
		"drone_effective_hit_rate_pct": snapped(drone_effective_hit_rate_pct, 0.1),
		"starter_order_active": _starter_contract_active and not _starter_order_targets.is_empty(),
		"order_match_count": _order_match_total,
		"non_order_count": _non_order_total,
		"order_precision_pct": snapped(order_precision_pct, 0.1),
		"laser_order_precision_pct": snapped(laser_order_precision_pct, 0.1),
		"drone_order_precision_pct": snapped(drone_order_precision_pct, 0.1)
	}
	accuracy_payload["science_payout_multiplier"] = snapped(_science_payout_multiplier, 0.01)
	accuracy_payload["science_xp_multiplier"] = snapped(_science_xp_multiplier, 0.01)
	accuracy_payload["rooms"] = RoomCatalog.get_installed_rooms(_rocket_room_layout)
	GameplayAnalytics.complete_mining_session({
		"completion_reason": _completion_reason,
		"elapsed_seconds": snapped(_elapsed_time, 0.1),
		"loop_count": _loop_count,
		"passes_completed": total_passes,
		"fuel_remaining_pct": snapped(_fuel, 0.1),
		"beam_remaining_pct": snapped((_beam_charges / max(_max_beam_charges, 1.0)) * 100.0, 0.1),
		"heat_pct": snapped(_heat, 0.1),
		"score": _score,
		"collected_deposit_count": _collected_deposit_count,
		"surface_collected_count": _surface_collected_count,
		"subsurface_collected_count": _subsurface_collected_count,
		"drones_deployed": _drones_deployed,
		"collection_rate_pct": snapped(collection_rate_pct, 0.1),
		"collection_inventory": _collected_minerals.duplicate(true),
		"last_progress_seconds": snapped(_last_progress_elapsed, 0.1),
		"starter_contract_active": _starter_contract_active,
		"starter_contract_complete": starter_contract_complete,
		"accuracy": accuracy_payload.duplicate(true)
	})
	_completion_report = {
		"reason": _completion_reason,
		"starter_contract_active": _starter_contract_active,
		"starter_contract_complete": starter_contract_complete,
		"starter_order": _starter_order_targets.duplicate(true),
		"collected": _collected_minerals.duplicate(true),
		"accuracy": accuracy_payload.duplicate(true)
	}
	
	# Credit minerals to persistent inventory
	if not _collected_minerals.is_empty():
		RocketsManager.add_to_inventory(_collected_minerals)
		
	# Pass to AppController for React Native bridge sync
	var app = preload("res://Scripts/Utils/AppControllerHelper.gd").get_instance()
	if app and app.has_method("set_last_mining_result"):
		app.set_last_mining_result({
			"minerals": _collected_minerals.duplicate(true),
			"score": _score,
			"target_id": _current_target_id
		})
		
	mining_completed.emit(_collected_minerals, _score)

func _advance_guide_step(next_step: GuideStep):
	if _guide_step == next_step:
		return
	_guide_step = next_step
	_show_guide_step()

func _show_guide_step():
	var tween = create_tween()
	tween.set_parallel(true)
	
	instructions.modulate.a = 0.0
	instructions.scale = Vector2(0.8, 0.8)
	
	# If drones aren't unlocked yet, skip the subsurface guide steps entirely.
	if not _drones_enabled and (_guide_step == GuideStep.EXPLAIN_SUBSURFACE or _guide_step == GuideStep.DEPLOY_DRONE):
		_guide_step = GuideStep.COMPLETE

	match _guide_step:
		GuideStep.INTRO:
			if _drones_enabled:
				if _uses_touch_controls:
					instructions.text = "Hold FIRE to mine. Tap DRONE for subsurface. Tap RETURN to leave."
				else:
					instructions.text = "Hold SPACE to mine. Press D for drones. Press RETURN to leave."
			else:
				if _uses_touch_controls:
					instructions.text = "Hold FIRE to mine surface deposits. Tap RETURN to leave."
				else:
					instructions.text = "Hold SPACE to mine surface deposits. Press RETURN to leave."
			if _starter_contract_active and _starter_order_targets.size() > 0:
				instructions.text += " Prioritise your contractor's requested minerals."
		GuideStep.MINE_SURFACE_IRON:
			if _starter_contract_active and _starter_order_targets.size() > 0:
				instructions.text = "Mine only requested surface minerals."
			else:
				instructions.text = "Mine orange surface deposits (iron)."
		GuideStep.MINE_SURFACE_NICKEL:
			if _starter_contract_active and _starter_order_targets.size() > 0:
				instructions.text = "Good. Keep prioritising requested minerals."
			else:
				instructions.text = "Mine yellow surface deposits (nickel)."
		GuideStep.EXPLAIN_SUBSURFACE:
			instructions.text = "Dark deposits are subsurface — deploy a drone to collect them."
		GuideStep.DEPLOY_DRONE:
			if _uses_touch_controls:
				instructions.text = "Tap DRONE while over a dark deposit."
			else:
				instructions.text = "Press D while over a dark deposit."
		GuideStep.COMPLETE:
			if _drones_enabled:
				if _uses_touch_controls:
					instructions.text = "Continue: FIRE mine, DRONE deploy, RETURN exit."
				else:
					instructions.text = "Continue: SPACE mine, D drone, RETURN exit."
			else:
				if _uses_touch_controls:
					instructions.text = "Continue: FIRE mine, RETURN to exit."
				else:
					instructions.text = "Continue: SPACE mine, RETURN to exit."
			_guide_active = false
	
	tween.tween_property(instructions, "modulate:a", 1.0, 0.4).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	tween.tween_property(instructions, "scale", Vector2(1.0, 1.0), 0.4).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)

func _update_guide(delta):
	if Input.is_action_pressed("ui_accept") and not _uses_touch_controls:
		_is_mining = true
	elif Input.is_action_just_released("ui_accept"):
		_is_mining = false

	if _drones_enabled and Input.is_key_pressed(KEY_D) and _drones_available > 0 and _drone_cooldown_timer <= 0:
		_deploy_drone()
	
	match _guide_step:
		GuideStep.INTRO:
			if _elapsed_time >= 3.0:
				_advance_guide_step(GuideStep.MINE_SURFACE_IRON)
		GuideStep.EXPLAIN_SUBSURFACE:
			if _elapsed_time >= _last_progress_elapsed + 2.0:
				_advance_guide_step(GuideStep.DEPLOY_DRONE)

func _deploy_drone():
	var drone = _acquire_drone_from_pool()
	if drone == null:
		return

	_drones_available -= 1
	_drones_deployed += 1
	_drone_cooldown_timer = DRONE_COOLDOWN
	_update_drone_display()
	_active_drones.append(drone)

	drone.deploy(rocket.position)
	var exploded_cb = Callable(self, "_on_drone_exploded")
	if not drone.exploded.is_connected(exploded_cb):
		drone.exploded.connect(exploded_cb)
	
	var subsurface_target = _find_subsurface_target()
	if subsurface_target:
		drone.set_target(subsurface_target)

func _acquire_drone_from_pool() -> Node:
	if drone_pool == null:
		push_warning("DronePool not found - cannot deploy drone")
		return null
	var drones = drone_pool.get_children()
	if drones.is_empty():
		push_warning("DronePool is empty - add drone instances in scene")
		return null
	for drone in drones:
		if drone.has_method("is_available_for_deploy") and bool(drone.is_available_for_deploy()):
			return drone
	return null

func _find_subsurface_target():
	var rocket_x = fmod(rocket.position.x + _scroll_offset, _terrain_width)
	var search_range = 400
	var nearest_region = RegionMath.find_nearest_region(rocket_x, false, _mineral_regions, _terrain_width)
	if nearest_region.is_empty():
		return null
	var distance = RegionMath.distance_to_region_edges(rocket_x, nearest_region, _terrain_width)
	if distance <= search_range:
		return nearest_region
	return null

func _on_drone_exploded(_pos: Vector2, region: Dictionary = {}):
	if not region.is_empty():
		region.collected = true
		_apply_region_visual_state(region)
		_record_region_collection(region, "drone")
		_spawn_particles(region)
		if _guide_active and _guide_step == GuideStep.DEPLOY_DRONE:
			_advance_guide_step(GuideStep.COMPLETE)
	_score += 50
	_update_mineral_header_label()


func _update_drone_display():
	if not _drones_enabled:
		drone_label.text = "DRONES: —"
		return
	var cooldown_text = ""
	if _drone_cooldown_timer > 0:
		cooldown_text = " (%.1fs)" % _drone_cooldown_timer
	if _compact_layout_active:
		drone_label.text = "DRONES: %d/%d%s" % [_drones_available, MAX_DRONES, cooldown_text]
	elif _uses_touch_controls:
		drone_label.text = "DRONES: %d/%d%s\n[TAP DRONE]" % [_drones_available, MAX_DRONES, cooldown_text]
	else:
		drone_label.text = "DRONES: %d/%d%s\n[D] deploy" % [_drones_available, MAX_DRONES, cooldown_text]

func _suspend_tutorial_overlay() -> void:
	var root = get_tree().root if get_tree() else null
	if root == null:
		return
	var overlay = root.find_child("TutorialCoachOverlay", true, false)
	if overlay == null:
		return
	_tutorial_overlay_was_visible = bool(overlay.visible)
	overlay.visible = false
	overlay.process_mode = Node.PROCESS_MODE_DISABLED

func _restore_tutorial_overlay() -> void:
	var root = get_tree().root if get_tree() else null
	if root == null:
		return
	var overlay = root.find_child("TutorialCoachOverlay", true, false)
	if overlay == null:
		return
	overlay.process_mode = Node.PROCESS_MODE_INHERIT
	overlay.visible = _tutorial_overlay_was_visible
	if overlay.has_method("_refresh"):
		overlay.call_deferred("_refresh")

func _enforce_tutorial_overlay_hidden() -> void:
	var root = get_tree().root if get_tree() else null
	if root == null:
		return
	var overlay = root.find_child("TutorialCoachOverlay", true, false)
	if overlay == null:
		return
	if overlay.visible:
		overlay.visible = false
	if overlay.process_mode != Node.PROCESS_MODE_DISABLED:
		overlay.process_mode = Node.PROCESS_MODE_DISABLED

func _reset_minerals():
	# Reset collected state and regenerate positions
	_mineral_pool_index = 0
	for region in _mineral_regions:
		region.collected = false
		_apply_region_visual_state(region)

func _apply_region_visual_state(region: Dictionary) -> void:
	VisualSync.apply_region_visual_state(region, _terrain_loop_container)

func _on_return_pressed():
	# Complete mining early and return to preview
	if _fuel <= 0:
		_completion_reason = "fuel_depleted"
	elif _beam_charges <= 0:
		_completion_reason = "beam_depleted"
	else:
		_completion_reason = "manual_return"
	_complete_mining()

func get_completion_report() -> Dictionary:
	return _completion_report.duplicate(true)

func _resolve_starter_contract_context() -> void:
	_starter_contract_active = false
	_starter_contractor_name = ""
	_starter_order_targets = {}
	var starter_contract = _session_context.get("starter_contract", {})
	if typeof(starter_contract) != TYPE_DICTIONARY or starter_contract.is_empty():
		return
	_starter_contract_active = bool(starter_contract.get("active", false))
	_starter_contractor_name = str(starter_contract.get("name", "Contractor"))
	var requested = starter_contract.get("requested_minerals", {})
	if typeof(requested) != TYPE_DICTIONARY:
		return
	for key in requested.keys():
		var amount = max(int(requested.get(key, 0)), 0)
		if amount > 0:
			_starter_order_targets[str(key)] = amount
	if _starter_order_targets.is_empty():
		_starter_contract_active = false

func _is_starter_contract_complete() -> bool:
	if not _starter_contract_active or _starter_order_targets.is_empty():
		return false
	for key in _starter_order_targets.keys():
		var required_amount = int(_starter_order_targets.get(key, 0))
		var collected_amount = int(_collected_minerals.get(key, 0))
		if collected_amount < required_amount:
			return false
	return true

const _MINERAL_COLOR_HINTS := {
	"iron": "orange",
	"nickel": "yellow",
	"cobalt": "blue",
	"platinum": "white",
	"gold": "bright yellow",
	"silver": "grey",
	"copper": "brown",
	"titanium": "grey-blue",
}

func _setup_contract_panel_style() -> void:
	if contract_order_panel == null:
		return
	var style := StyleBoxFlat.new()
	style.set_corner_radius_all(8)
	style.content_margin_left = 12
	style.content_margin_right = 12
	style.content_margin_top = 8
	style.content_margin_bottom = 8
	match _mission_mode:
		"contractor":
			style.bg_color = Color(0.08, 0.10, 0.04, 0.94)
			style.border_color = Color(0.88, 0.70, 0.08, 0.95)
			style.set_border_width_all(2)
		"tutorial":
			style.bg_color = Color(0.04, 0.08, 0.16, 0.94)
			style.border_color = Color(0.28, 0.80, 0.95, 0.95)
			style.set_border_width_all(2)
		_:
			style.bg_color = Color(0.06, 0.08, 0.14, 0.80)
			style.border_color = Color(0.30, 0.35, 0.50, 0.55)
			style.set_border_width_all(1)
	contract_order_panel.add_theme_stylebox_override("panel", style)
	# Reset per-mineral bar tracking so they're rebuilt on next refresh.
	for row in _mineral_bar_rows.values():
		if is_instance_valid(row):
			row.queue_free()
	_mineral_progress_bars.clear()
	_mineral_bar_rows.clear()

func _update_mineral_header_label() -> void:
	pass  # OrderPanel removed; mineral totals shown via ContractOrderPanel progress bars.

func _refresh_contract_order_tracker() -> void:
	if contract_order_panel == null or contract_order_title == null or contract_order_progress == null:
		return
	# Show for contractor orders or tutorial missions with a known goal.
	var show_order := (_starter_contract_active and not _starter_order_targets.is_empty()) \
		or _mission_mode == "tutorial"
	contract_order_panel.visible = show_order
	if not show_order:
		return

	if _starter_contract_active and not _starter_order_targets.is_empty():
		# Contractor mission — show per-mineral progress bars.
		contract_order_title.text = "%s Order" % _starter_contractor_name
		contract_order_progress.visible = false  # replaced by bar rows
		var keys = _starter_order_targets.keys()
		keys.sort()
		for key in keys:
			var required_amount := int(_starter_order_targets.get(key, 0))
			var collected_amount := int(_collected_minerals.get(key, 0))
			var done := collected_amount >= required_amount
			# Create row on first call.
			if not _mineral_bar_rows.has(key):
				var row := HBoxContainer.new()
				row.add_theme_constant_override("separation", 6)
				contract_order_vbox.add_child(row)
				var name_lbl := Label.new()
				var color_hint = _MINERAL_COLOR_HINTS.get(str(key).to_lower(), "")
				name_lbl.text = "%s%s" % [str(key).capitalize(), " (%s)" % color_hint if color_hint else ""]
				name_lbl.add_theme_color_override("font_color", Color(0.90, 0.90, 0.70))
				name_lbl.add_theme_font_size_override("font_size", 13)
				name_lbl.custom_minimum_size = Vector2(110, 0)
				row.add_child(name_lbl)
				var bar := ProgressBar.new()
				bar.min_value = 0.0
				bar.max_value = float(required_amount)
				bar.size_flags_horizontal = Control.SIZE_EXPAND_FILL
				bar.custom_minimum_size = Vector2(0, 14)
				bar.show_percentage = false
				row.add_child(bar)
				var qty_lbl := Label.new()
				qty_lbl.add_theme_color_override("font_color", Color(1.0, 1.0, 0.85))
				qty_lbl.add_theme_font_size_override("font_size", 13)
				qty_lbl.custom_minimum_size = Vector2(72, 0)
				qty_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
				row.add_child(qty_lbl)
				_mineral_bar_rows[key] = row
				_mineral_progress_bars[key] = bar
				row.set_meta("qty_label", qty_lbl)
			# Update bar and label values.
			var bar: ProgressBar = _mineral_progress_bars.get(key)
			if bar and is_instance_valid(bar):
				bar.value = float(collected_amount)
				var tint := Color(0.20, 0.80, 0.25) if done else Color(0.60, 0.45, 0.10)
				bar.modulate = tint
			var row = _mineral_bar_rows.get(key)
			if row and is_instance_valid(row):
				var qty_lbl: Label = row.get_meta("qty_label") if row.has_meta("qty_label") else null
				if qty_lbl and is_instance_valid(qty_lbl):
					qty_lbl.text = "%d/%d" % [collected_amount, required_amount]
					qty_lbl.add_theme_color_override("font_color",
						Color(0.30, 1.0, 0.45) if done else Color(1.0, 1.0, 0.85))
		if _is_starter_contract_complete():
			contract_order_title.text = "★ Order Complete — Return Home"
			contract_order_title.add_theme_color_override("font_color", Color(0.30, 1.0, 0.45))
		else:
			contract_order_title.add_theme_color_override("font_color", Color(0.90, 0.80, 0.30))
	else:
		# Tutorial mission — show the current tutorial step message dynamically.
		contract_order_title.text = "MISSION GOAL"
		contract_order_title.add_theme_color_override("font_color", Color(0.28, 0.88, 1.0))
		contract_order_progress.visible = true
		contract_order_progress.text = _tutorial_step_message if _tutorial_step_message != "" else "Mine minerals and return to base."

func _resolve_tutorial_step_message() -> String:
	if _mission_mode != "tutorial":
		return ""
	var app = AppControllerHelper.get_instance()
	if app == null or not app.has_method("get_tutorial_state"):
		return ""
	var state: Dictionary = app.get_tutorial_state()
	var step: Dictionary = state.get("current_step", {})
	var msg := str(step.get("message", ""))
	return msg if msg != "" else ""

func _refresh_contractor_bonus_label() -> void:
	pass

func _show_mineral_signpost() -> void:
	const SIGNPOST_DURATION := 3.5
	_signpost_timer = SIGNPOST_DURATION
	# Build mineral list from the unique minerals in the terrain
	var seen := {}
	var mineral_lines := []
	for region in _mineral_regions:
		var mineral = region.get("mineral", {})
		var name = str(mineral.get("name", ""))
		if name != "" and not seen.has(name):
			seen[name] = true
			var surface_tag = "surface" if region.get("is_surface", true) else "subsurface"
			var ordered_tag = " ★ (ordered)" if _is_order_target_mineral(name) else ""
			mineral_lines.append("%s — %s%s" % [name, surface_tag, ordered_tag])
	var signpost_text: String
	if mineral_lines.is_empty():
		signpost_text = "Fly over coloured terrain to mine. Fuel starts burning now."
	else:
		signpost_text = "Minerals ahead: %s" % " | ".join(mineral_lines)
	instructions.text = signpost_text
	instructions.modulate.a = 1.0

func _tag_order_target_minerals() -> void:
	for region in _mineral_regions:
		var mineral = region.get("mineral", {})
		var mineral_name = str(mineral.get("name", ""))
		region["is_order_target"] = _is_order_target_mineral(mineral_name)
		_apply_region_visual_state(region)

func _is_order_target_mineral(mineral_name: String) -> bool:
	if not _starter_contract_active or _starter_order_targets.is_empty():
		return false
	for key in _starter_order_targets.keys():
		if str(key).to_lower() == mineral_name.to_lower():
			return true
	return false
