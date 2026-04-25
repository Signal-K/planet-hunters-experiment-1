extends Node2D

const SpaceMapTargetDialogueScene = preload("res://Scenes/UI/Templates/SpaceMapTargetDialogue.tscn")
const SpaceMapContractorRowScene = preload("res://Scenes/UI/Templates/SpaceMapContractorRow.tscn")

const RocketsManager = preload("res://Scripts/Utils/RocketsManager.gd")
const SectorRevealManager = preload("res://Scripts/Utils/SectorRevealManager.gd")
const PanelStyle = preload("res://Scripts/UI/PanelStyle.gd")
const EarthSceneUIHelper = preload("res://Scripts/Earth/EarthSceneUIHelper.gd")

const ORBIT_COUNT := 6
const STAR_COUNT := 220
const BG_COLOR    := Color(0.03, 0.04, 0.09, 1.0)   # forced dark — DS palette is light-mode
const SUN_COLOR := Color(0.98, 0.92, 0.65, 1)
const EARTH_COLOR := Color(0.35, 0.65, 0.95, 1)
const ASTEROID_COLOR := Color(0.72, 0.72, 0.72, 1)
const PLANET_COLOR := Color(0.55, 0.85, 0.55, 1)
const DISCOVERY_COLOR := Color(1.0, 0.85, 0.25, 1)      # Gold for personal discoveries
const FOG_COLOR := Color(0.05, 0.08, 0.14, 0.82)
const ORBIT_COLOR := Color(0.6, 0.65, 0.75, 0.35)
const STAR_COLOR := Color(0.9, 0.9, 0.9, 0.8)

var _view_mode: String = "solar"  # "solar" or "stars"
var scene_manager: SceneManager
var ui_manager: UIManager
var _ui_helper := EarthSceneUIHelper.new()
var _orbit_radii: Array = []
var _stars: Array = []
var _targets: Array = []
var _target_positions: Dictionary = {}
var _earth_pos := Vector2.ZERO
var _last_size := Vector2.ZERO
var _last_sun_radius := 0.0
var _label_font: Font = null
var _ignore_click_until := 0
var _earth_radius := 0.0
var _personal_discoveries: Array = []  # Array of target_ids player personally discovered
var _revealed_sectors: Array = []

const EARTH_CLICK_RADIUS := 26.0
const TARGET_CLICK_RADIUS := 22.0

@onready var back_button: Button = $CanvasLayer/UI/BackButton
@onready var solar_btn: Button = $CanvasLayer/UI/ModeToggle/SolarBtn
@onready var stars_btn: Button = $CanvasLayer/UI/ModeToggle/StarsBtn

func _ready() -> void:
	scene_manager = SceneManager.new()
	add_child(scene_manager)
	scene_manager.add_to_group("scene_manager")
	ui_manager = UIManager.new()
	add_child(ui_manager)
	ui_manager.add_to_group("ui_manager")
	_ui_helper.setup(self)
	_ui_helper.setup_buttons()
	call_deferred("_apply_nav_safe_area")
	if back_button:
		back_button.pressed.connect(_on_back_pressed)
		PanelStyle.apply_button(back_button, false)
		back_button.visible = false
	if solar_btn:
		solar_btn.pressed.connect(func(): _set_view_mode("solar"))
	if stars_btn:
		stars_btn.pressed.connect(func(): _set_view_mode("stars"))
	_apply_view_toggle_style()
	set_process_unhandled_input(true)
	set_process_input(true)
	_label_font = ThemeDB.fallback_font
	_ignore_click_until = Time.get_ticks_msec() + 200
	_refresh_targets()
	_rebuild_layout()
	_apply_scene_nav_state()

func _apply_scene_nav_state() -> void:
	var forward_btn := get_node_or_null("UILayer/ButtonContainer/ForwardButton") as Button
	if forward_btn:
		forward_btn.disabled = true

func _apply_nav_safe_area() -> void:
	_ui_helper.apply_nav_layout()

func _on_back_button_pressed() -> void:
	_change_scene_to_base()

func _on_forward_button_pressed() -> void:
	pass

func _on_menu_button_pressed() -> void:
	preload("res://Scripts/UI/GameNavigationMenu.gd").toggle(self)

func _on_market_button_pressed() -> void:
	if ui_manager:
		ui_manager.show_panel(UIManager.PanelType.MARKET)

func _on_space_map_button_pressed() -> void:
	pass

func _on_new_mission_button_pressed() -> void:
	if scene_manager:
		scene_manager.change_to_scene("res://Scenes/Earth/earth_launchpad.tscn")
	else:
		get_tree().change_scene_to_file("res://Scenes/Earth/earth_launchpad.tscn")

func _set_view_mode(mode: String) -> void:
	_view_mode = mode
	_apply_view_toggle_style()
	_rebuild_layout()

func _apply_view_toggle_style() -> void:
	if solar_btn:
		PanelStyle.apply_button(solar_btn, _view_mode == "solar")
	if stars_btn:
		PanelStyle.apply_button(stars_btn, _view_mode == "stars")

func _process(_delta: float) -> void:
	var size = get_viewport_rect().size
	if size != _last_size:
		_rebuild_layout()

func _refresh_targets() -> void:
	if RocketsManager:
		_targets = RocketsManager.get_detected_targets()
	else:
		_targets = []
	_revealed_sectors = SectorRevealManager.get_revealed_sectors()
	_personal_discoveries = _load_personal_discoveries()

func _load_personal_discoveries() -> Array:
	var result: Array = []
	if not RocketsManager:
		return result
	var s = RocketsManager.load_state()
	var claimed: Dictionary = s.get("discovery_bonus_claimed", {})
	for target_id in claimed.keys():
		if claimed[target_id]:
			result.append(str(target_id))
	return result

func _rebuild_layout() -> void:
	_last_size = get_viewport_rect().size
	_last_sun_radius = min(_last_size.x, _last_size.y) * 0.045
	_build_orbits()
	_build_stars()
	_build_target_positions()
	queue_redraw()

func _build_orbits() -> void:
	_orbit_radii.clear()
	var min_dim = min(_last_size.x, _last_size.y)
	var base = min_dim * 0.14
	var step = min_dim * 0.08
	for i in range(ORBIT_COUNT):
		_orbit_radii.append(base + step * i)

func _build_stars() -> void:
	_stars.clear()
	var rng = RandomNumberGenerator.new()
	rng.seed = 1337
	for _i in range(STAR_COUNT):
		var p = Vector2(rng.randf_range(0, _last_size.x), rng.randf_range(0, _last_size.y))
		var r = rng.randf_range(0.6, 1.6)
		_stars.append({"pos": p, "r": r})

func _build_target_positions() -> void:
	_target_positions.clear()
	if _orbit_radii.is_empty():
		return

	for t in _targets:
		var target_id = str(t.get("id", ""))
		if target_id == "":
			continue
		var target_type = str(t.get("type", "asteroid"))
		var is_solar = target_type.to_lower() == "asteroid"

		if _view_mode == "solar" and not is_solar:
			continue
		if _view_mode == "stars" and is_solar:
			continue

		var revealed = SectorRevealManager.is_target_revealed(target_id, target_type)

		if _view_mode == "solar":
			# Orbital ring placement (existing logic)
			var h = _simple_hash(target_id)
			var rng = RandomNumberGenerator.new()
			rng.seed = h
			var angle = rng.randf_range(0.0, TAU)
			var ring = _ring_for_target(h, target_type)
			var radius = _orbit_radii[ring] + rng.randf_range(-8.0, 8.0)
			var draw_radius = _last_sun_radius * 0.18
			_target_positions[target_id] = {
				"pos": Vector2(cos(angle), sin(angle)) * radius,
				"type": target_type,
				"label": str(t.get("label", target_id)),
				"radius": draw_radius,
				"revealed": true,
				"is_discovery": target_id in _personal_discoveries,
			}
		else:
			# Star systems grid placement by sector
			var sector = SectorRevealManager.get_sector_for_target(target_id)
			var sector_pos_frac: Vector2 = SectorRevealManager.SECTOR_POSITIONS.get(sector, Vector2(0.5, 0.5))
			var h = _simple_hash(target_id)
			var rng = RandomNumberGenerator.new()
			rng.seed = h
			# Scatter within the sector quadrant
			var sector_w = _last_size.x / 4.0
			var sector_h = _last_size.y / 2.0
			var center_x = sector_pos_frac.x * _last_size.x
			var center_y = sector_pos_frac.y * _last_size.y
			var pos = Vector2(
				center_x + rng.randf_range(-sector_w * 0.35, sector_w * 0.35),
				center_y + rng.randf_range(-sector_h * 0.30, sector_h * 0.30)
			)
			var draw_radius = _last_sun_radius * 0.28
			_target_positions[target_id] = {
				"pos": pos,  # absolute, not relative to center
				"type": target_type,
				"label": str(t.get("label", target_id)),
				"radius": draw_radius,
				"revealed": revealed,
				"sector": sector,
				"is_discovery": target_id in _personal_discoveries,
			}

func _simple_hash(s: String) -> int:
	var h := 0
	for c in s.to_utf8_buffer():
		h = (h * 31 + int(c)) & 0x7FFFFFFF
	return h

func _ring_for_target(seed: int, target_type: String) -> int:
	var idx = abs(seed) % ORBIT_COUNT
	var t = target_type.to_lower()
	if t == "planet":
		return clamp(3 + idx % 3, 0, ORBIT_COUNT - 1)
	return clamp(idx % 3, 0, ORBIT_COUNT - 1)

func _draw() -> void:
	var size = _last_size
	if size == Vector2.ZERO:
		return

	var NebulaTheme = preload("res://Resources/NebulaSciTheme.gd")

	draw_rect(get_viewport_rect(), BG_COLOR, true)

	for s in _stars:
		draw_circle(s["pos"], s["r"], STAR_COLOR)

	if _view_mode == "solar":
		_draw_solar_system(size, NebulaTheme)
	else:
		_draw_star_systems(size, NebulaTheme)

func _draw_solar_system(size: Vector2, NebulaTheme) -> void:
	var center = size * 0.5

	for r in _orbit_radii:
		draw_arc(center, r, 0.0, TAU, 160, Color(NebulaTheme.PANEL_OUTLINE.r, NebulaTheme.PANEL_OUTLINE.g, NebulaTheme.PANEL_OUTLINE.b, 0.3), 1.5, true)

	var sun_r = _last_sun_radius
	draw_circle(center, sun_r * 1.4, Color(1, 0.9, 0.5, 0.25))
	draw_circle(center, sun_r, SUN_COLOR)

	if _orbit_radii.size() > 2:
		_earth_pos = center + Vector2(cos(-0.7), sin(-0.7)) * _orbit_radii[2]
		_earth_radius = sun_r * 0.45
		draw_circle(_earth_pos, _earth_radius, EARTH_COLOR)
		if _label_font:
			draw_string(_label_font, _earth_pos + Vector2(-20, -_earth_radius - 6), "Earth", HORIZONTAL_ALIGNMENT_CENTER, -1, 13, EARTH_COLOR)

	for target_id in _target_positions.keys():
		var entry = _target_positions[target_id]
		var pos = center + entry["pos"]
		var is_discovery: bool = bool(entry.get("is_discovery", false))
		var color = DISCOVERY_COLOR if is_discovery else ASTEROID_COLOR
		var radius = float(entry.get("radius", sun_r * 0.18))
		if is_discovery:
			draw_circle(pos, radius + 3.0, Color(DISCOVERY_COLOR.r, DISCOVERY_COLOR.g, DISCOVERY_COLOR.b, 0.4))
		draw_circle(pos, radius, color)
		if _label_font:
			var label_color = Color(1.0, 0.95, 0.7, 1.0) if is_discovery else Color(0.85, 0.85, 0.9, 0.85)
			draw_string(_label_font, pos + Vector2(8, -8), str(entry.get("label", target_id)), HORIZONTAL_ALIGNMENT_LEFT, -1, 13, label_color)

	# Legend
	_draw_legend_solar(size)

func _draw_star_systems(size: Vector2, _NebulaTheme) -> void:
	# Draw sector grid and labels
	var sector_w = size.x / 4.0
	var sector_h = size.y / 2.0
	for sector_id in range(SectorRevealManager.SECTOR_COUNT):
		var frac: Vector2 = SectorRevealManager.SECTOR_POSITIONS.get(sector_id, Vector2(0.5, 0.5))
		var cx = frac.x * size.x
		var cy = frac.y * size.y
		var is_revealed = sector_id in _revealed_sectors
		var sector_rect = Rect2(cx - sector_w * 0.5, cy - sector_h * 0.5, sector_w, sector_h)

		# Sector outline
		var outline_color = Color(0.35, 0.45, 0.65, 0.35) if is_revealed else Color(0.1, 0.12, 0.2, 0.6)
		draw_rect(sector_rect, outline_color, false, 1.0)

		if not is_revealed:
			# Fog of war
			draw_rect(sector_rect, FOG_COLOR, true)
			if _label_font:
				draw_string(_label_font, Vector2(cx - 30, cy), "Unexplored", HORIZONTAL_ALIGNMENT_CENTER, -1, 12, Color(0.4, 0.45, 0.6, 0.7))
		else:
			# Sector name
			var sector_name = SectorRevealManager.SECTOR_NAMES.get(sector_id, "Sector %d" % sector_id)
			if _label_font:
				draw_string(_label_font, Vector2(cx - 50, cy - sector_h * 0.4), sector_name, HORIZONTAL_ALIGNMENT_CENTER, -1, 12, Color(0.55, 0.65, 0.85, 0.7))

	# Draw targets
	for target_id in _target_positions.keys():
		var entry = _target_positions[target_id]
		var revealed: bool = bool(entry.get("revealed", false))
		if not revealed:
			continue
		var pos: Vector2 = entry["pos"]  # absolute position
		var is_discovery: bool = bool(entry.get("is_discovery", false))
		var draw_radius = float(entry.get("radius", _last_sun_radius * 0.28))

		# Star icon: colored circle with a subtle glow
		var h = _simple_hash(target_id)
		var star_color := _star_color_for_hash(h)

		if is_discovery:
			draw_circle(pos, draw_radius + 4.0, Color(DISCOVERY_COLOR.r, DISCOVERY_COLOR.g, DISCOVERY_COLOR.b, 0.35))
		draw_circle(pos, draw_radius * 1.5, Color(star_color.r, star_color.g, star_color.b, 0.25))
		draw_circle(pos, draw_radius, star_color)

		if is_discovery and _label_font:
			draw_string(_label_font, pos + Vector2(draw_radius + 4, -2), "★", HORIZONTAL_ALIGNMENT_LEFT, -1, 14, DISCOVERY_COLOR)

		if _label_font:
			var label = str(entry.get("label", target_id))
			var label_color = Color(1.0, 0.95, 0.7, 1.0) if is_discovery else Color(0.85, 0.90, 0.98, 0.9)
			draw_string(_label_font, pos + Vector2(draw_radius + 2, 14), label, HORIZONTAL_ALIGNMENT_LEFT, -1, 12, label_color)

	_draw_legend_stars(size)

func _star_color_for_hash(h: int) -> Color:
	# Map hash to a stellar spectral class colour (simplified)
	match (abs(h) % 6):
		0: return Color(0.98, 0.90, 0.60, 1)  # G-type (Sun-like, yellow)
		1: return Color(0.70, 0.85, 1.00, 1)  # A-type (blue-white)
		2: return Color(1.00, 0.60, 0.35, 1)  # K-type (orange)
		3: return Color(0.60, 0.80, 1.00, 1)  # F-type (white-blue)
		4: return Color(0.95, 0.55, 0.35, 1)  # M-type (red-orange)
		_: return Color(0.78, 0.90, 1.00, 1)  # B-type (blue)
	return Color(1, 1, 1, 1)

func _draw_legend_solar(size: Vector2) -> void:
	if _label_font == null:
		return
	var y = size.y - 20.0
	var x = 16.0
	draw_circle(Vector2(x + 6, y), 5, ASTEROID_COLOR)
	draw_string(_label_font, Vector2(x + 15, y + 5), "Asteroid target", HORIZONTAL_ALIGNMENT_LEFT, -1, 12, Color(0.8, 0.8, 0.85))
	x += 130
	draw_circle(Vector2(x + 6, y), 6, DISCOVERY_COLOR)
	draw_string(_label_font, Vector2(x + 15, y + 5), "Your discovery", HORIZONTAL_ALIGNMENT_LEFT, -1, 12, Color(0.8, 0.8, 0.85))
	draw_circle(Vector2(x + 4, y), 10, Color(DISCOVERY_COLOR.r, DISCOVERY_COLOR.g, DISCOVERY_COLOR.b, 0.3))

func _draw_legend_stars(size: Vector2) -> void:
	if _label_font == null:
		return
	var y = size.y - 20.0
	var x = 16.0
	draw_circle(Vector2(x + 6, y), 6, Color(0.7, 0.85, 1, 1))
	draw_string(_label_font, Vector2(x + 15, y + 5), "Star system", HORIZONTAL_ALIGNMENT_LEFT, -1, 12, Color(0.8, 0.8, 0.85))
	x += 120
	draw_circle(Vector2(x + 6, y), 6, DISCOVERY_COLOR)
	draw_string(_label_font, Vector2(x + 15, y + 5), "Your discovery", HORIZONTAL_ALIGNMENT_LEFT, -1, 12, Color(0.8, 0.8, 0.85))
	x += 130
	draw_rect(Rect2(x, y - 6, 12, 12), FOG_COLOR, true)
	draw_rect(Rect2(x, y - 6, 12, 12), Color(0.3, 0.4, 0.6, 0.5), false, 1.0)
	draw_string(_label_font, Vector2(x + 16, y + 5), "Unexplored sector", HORIZONTAL_ALIGNMENT_LEFT, -1, 12, Color(0.8, 0.8, 0.85))

func _input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		if Time.get_ticks_msec() < _ignore_click_until:
			return
		_handle_click(event.position)

func _handle_click(pos: Vector2) -> void:
	if _view_mode == "solar":
		if _earth_pos != Vector2.ZERO and pos.distance_to(_earth_pos) <= max(EARTH_CLICK_RADIUS, _earth_radius):
			_change_scene_to_base()
			return
		var center = _last_size * 0.5
		for target_id in _target_positions.keys():
			var entry = _target_positions[target_id]
			var target_pos = center + entry["pos"]
			var radius = float(entry.get("radius", TARGET_CLICK_RADIUS))
			if pos.distance_to(target_pos) <= max(TARGET_CLICK_RADIUS, radius):
				_open_target_preview(target_id, entry)
				return
	else:
		# Star systems view: click on revealed targets only
		for target_id in _target_positions.keys():
			var entry = _target_positions[target_id]
			if not bool(entry.get("revealed", false)):
				continue
			var target_pos: Vector2 = entry["pos"]
			var radius = float(entry.get("radius", TARGET_CLICK_RADIUS))
			if pos.distance_to(target_pos) <= max(TARGET_CLICK_RADIUS, radius):
				_open_target_preview(target_id, entry)
				return

func _open_target_preview(target_id: String, entry: Dictionary) -> void:
	# Close any existing target dialogue first
	var existing := get_node_or_null("CanvasLayer/TargetDialogue")
	if existing:
		existing.queue_free()
		return

	var canvas: CanvasLayer = $CanvasLayer
	var target_label := str(entry.get("label", target_id))
	var target_type  := str(entry.get("type", "asteroid"))
	var is_free_ops  := RocketsManager.is_free_operations_unlocked()

	# Colours (space map always dark)
	const C_BG    := Color(0.04, 0.06, 0.12, 0.97)
	const C_CYAN  := Color(0.28, 0.88, 0.96, 1.0)
	const C_AMBER := Color(0.941, 0.690, 0.188, 1.0)
	const C_TEXT  := Color(0.90, 0.92, 0.95, 1.0)
	const C_MUTED := Color(0.55, 0.60, 0.68, 1.0)

	# Backdrop
	var backdrop: ColorRect = SpaceMapTargetDialogueScene.instantiate()
	canvas.add_child(backdrop)

	var vp_w := get_viewport().get_visible_rect().size.x if get_viewport() else 1280.0
	var vp_h := get_viewport().get_visible_rect().size.y if get_viewport() else 768.0

	var panel: PanelContainer = backdrop.get_node("Center/Panel")
	panel.custom_minimum_size = Vector2(clampf(vp_w - 48.0, 320.0, 720.0), 0.0)

	var pstyle := StyleBoxFlat.new()
	pstyle.bg_color = C_BG
	pstyle.border_color = C_CYAN
	pstyle.set_border_width_all(2)
	pstyle.set_corner_radius_all(8)
	pstyle.content_margin_left = 24
	pstyle.content_margin_right = 24
	pstyle.content_margin_top = 20
	pstyle.content_margin_bottom = 20
	panel.add_theme_stylebox_override("panel", pstyle)

	var scroll: ScrollContainer = backdrop.get_node("Center/Panel/Scroll")
	scroll.custom_minimum_size = Vector2(0, clampf(vp_h * 0.70, 240.0, 560.0))
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	var vbox: VBoxContainer = backdrop.get_node("Center/Panel/Scroll/Body")
	vbox.add_theme_constant_override("separation", 14)

	var type_icon := "☄" if target_type == "asteroid" else "🪐"
	var title_lbl: Label = backdrop.get_node("Center/Panel/Scroll/Body/HeaderRow/TitleLabel")
	title_lbl.text = "%s  %s" % [type_icon, target_label]
	title_lbl.add_theme_font_size_override("font_size", 26)
	title_lbl.add_theme_color_override("font_color", C_TEXT)

	var close_btn: Button = backdrop.get_node("Center/Panel/Scroll/Body/HeaderRow/CloseButton")
	_style_dialogue_button(close_btn, C_CYAN, false)
	close_btn.pressed.connect(func(): backdrop.queue_free())

	var sep: HSeparator = backdrop.get_node("Center/Panel/Scroll/Body/PrimarySeparator")
	sep.add_theme_color_override("separator", Color(C_CYAN.r, C_CYAN.g, C_CYAN.b, 0.3))

	var type_lbl: Label = backdrop.get_node("Center/Panel/Scroll/Body/TypeLabel")
	type_lbl.text = "Type: %s" % target_type.capitalize()
	type_lbl.add_theme_font_size_override("font_size", 16)
	type_lbl.add_theme_color_override("font_color", C_MUTED)

	var id_lbl: Label = backdrop.get_node("Center/Panel/Scroll/Body/IdLabel")
	id_lbl.text = "ID: %s" % target_id
	id_lbl.add_theme_font_size_override("font_size", 14)
	id_lbl.add_theme_color_override("font_color", C_MUTED)

	var sep2: HSeparator = backdrop.get_node("Center/Panel/Scroll/Body/SecondarySeparator")
	sep2.add_theme_color_override("separator", Color(C_CYAN.r, C_CYAN.g, C_CYAN.b, 0.2))

	# ── Contractor missions relevant to this target ───────────────────────────
	var AppControllerHelper = preload("res://Scripts/Utils/AppControllerHelper.gd")
	var app = AppControllerHelper.get_instance()
	var level := 1
	if app and app.has_method("get_experience_level"):
		level = int(app.get_experience_level())

	var SubcontractorManager = preload("res://Scripts/Utils/SubcontractorManager.gd")
	var contractors: Array = SubcontractorManager.get_roster(level)
	var relevant: Array = []
	for c in contractors:
		var bonus: Dictionary = c.get("bonus", {})
		if bonus.is_empty():
			relevant.append(c)  # general cargo — always relevant
		elif target_type == "asteroid":
			relevant.append(c)  # asteroid targets match all contractors for now

	if not relevant.is_empty():
		var ctitle: Label = backdrop.get_node("Center/Panel/Scroll/Body/ContractorsHeader")
		ctitle.text = "AVAILABLE CONTRACTORS"
		ctitle.visible = true
		ctitle.add_theme_font_size_override("font_size", 13)
		ctitle.add_theme_color_override("font_color", C_MUTED)
		var contractors_list: VBoxContainer = backdrop.get_node("Center/Panel/Scroll/Body/ContractorsList")

		for c in relevant:
			var crow: HBoxContainer = SpaceMapContractorRowScene.instantiate()
			contractors_list.add_child(crow)
			var cname_lbl: Label = crow.get_node("NameLabel")
			cname_lbl.text = str(c.get("name", "Unknown"))
			cname_lbl.add_theme_font_size_override("font_size", 17)
			cname_lbl.add_theme_color_override("font_color", C_TEXT)
			var on_cooldown := SubcontractorManager.is_on_cooldown(str(c.get("id", "")))
			var status_lbl: Label = crow.get_node("StatusLabel")
			status_lbl.text = "Cooldown" if on_cooldown else "Ready"
			status_lbl.add_theme_font_size_override("font_size", 15)
			status_lbl.add_theme_color_override("font_color", Color(0.9, 0.45, 0.2) if on_cooldown else Color(0.3, 0.85, 0.55))

		var sep3: HSeparator = backdrop.get_node("Center/Panel/Scroll/Body/TertiarySeparator")
		sep3.visible = true
		sep3.add_theme_color_override("separator", Color(C_CYAN.r, C_CYAN.g, C_CYAN.b, 0.2))

	# ── Launch button ─────────────────────────────────────────────────────────
	if is_free_ops:
		var launch_btn: Button = backdrop.get_node("Center/Panel/Scroll/Body/LaunchButton")
		launch_btn.text = "Launch Mission to %s" % target_label
		launch_btn.visible = true
		_style_dialogue_button(launch_btn, C_AMBER, true)
		launch_btn.pressed.connect(func():
			backdrop.queue_free()
			RocketsManager.set_preview_target(target_id, target_label, target_type, "")
			var t := Engine.get_main_loop() as SceneTree
			if t == null:
				return
			var sm = t.current_scene.get_node_or_null("SceneManager") if t.current_scene else null
			if sm and sm.has_method("change_to_scene"):
				sm.change_to_scene("res://Scenes/Earth/earth_launchpad.tscn")
			else:
				t.change_scene_to_file("res://Scenes/Earth/earth_launchpad.tscn")
		)
	else:
		var locked_lbl: Label = backdrop.get_node("Center/Panel/Scroll/Body/LockedLabel")
		locked_lbl.text = "Free Operations locked — complete Mission 4 to launch from the map."
		locked_lbl.visible = true
		locked_lbl.add_theme_font_size_override("font_size", 16)
		locked_lbl.add_theme_color_override("font_color", C_MUTED)

	# Close on backdrop click outside panel
	backdrop.gui_input.connect(func(event: InputEvent):
		if event is InputEventMouseButton and event.pressed:
			if not panel.get_global_rect().has_point(event.global_position):
				backdrop.queue_free()
	)

func _style_dialogue_button(btn: Button, col: Color, primary: bool) -> void:
	if btn == null:
		return
	btn.focus_mode = Control.FOCUS_NONE
	btn.custom_minimum_size = Vector2(0, 54)
	var normal := StyleBoxFlat.new()
	normal.bg_color = Color(col.r, col.g, col.b, 0.12) if primary else Color(0, 0, 0, 0)
	normal.border_color = col
	normal.set_border_width_all(1)
	normal.set_corner_radius_all(27)
	normal.content_margin_left = 18
	normal.content_margin_right = 18
	var hover := normal.duplicate()
	hover.bg_color = Color(col.r, col.g, col.b, 0.22)
	var pressed := normal.duplicate()
	pressed.bg_color = Color(col.r, col.g, col.b, 0.32)
	btn.add_theme_stylebox_override("normal", normal)
	btn.add_theme_stylebox_override("hover", hover)
	btn.add_theme_stylebox_override("pressed", pressed)
	btn.add_theme_color_override("font_color", col)
	btn.add_theme_color_override("font_hover_color", col)
	btn.add_theme_font_size_override("font_size", 20)

func _on_back_pressed() -> void:
	_change_scene_to_base()

func _change_scene_to_base() -> void:
	var tree = Engine.get_main_loop() as SceneTree
	if tree == null:
		return
	var scene_manager = null
	if tree.current_scene:
		scene_manager = tree.current_scene.get_node_or_null("SceneManager")
	if scene_manager and scene_manager.has_method("change_to_scene"):
		scene_manager.change_to_scene("res://Scenes/Earth/earth_base_1.tscn")
	else:
		tree.change_scene_to_file("res://Scenes/Earth/earth_base_1.tscn")
