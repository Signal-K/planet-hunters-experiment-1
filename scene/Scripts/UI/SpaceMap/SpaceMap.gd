extends Node2D

const RocketsManager = preload("res://Scripts/Utils/RocketsManager.gd")
const SectorRevealManager = preload("res://Scripts/Utils/SectorRevealManager.gd")
const PanelStyle = preload("res://Scripts/UI/PanelStyle.gd")

const ORBIT_COUNT := 6
const STAR_COUNT := 220
const SUN_COLOR := Color(0.98, 0.92, 0.65, 1)
const EARTH_COLOR := Color(0.35, 0.65, 0.95, 1)
const ASTEROID_COLOR := Color(0.72, 0.72, 0.72, 1)
const PLANET_COLOR := Color(0.55, 0.85, 0.55, 1)
const DISCOVERY_COLOR := Color(1.0, 0.85, 0.25, 1)      # Gold for personal discoveries
const FOG_COLOR := Color(0.05, 0.08, 0.14, 0.82)
const ORBIT_COLOR := Color(0.6, 0.65, 0.75, 0.35)
const STAR_COLOR := Color(0.9, 0.9, 0.9, 0.8)

var _view_mode: String = "solar"  # "solar" or "stars"
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

func _ready() -> void:
	if back_button:
		back_button.pressed.connect(_on_back_pressed)
		PanelStyle.apply_button(back_button, false)
	_build_view_toggle()
	set_process_unhandled_input(true)
	set_process_input(true)
	_label_font = ThemeDB.fallback_font
	_ignore_click_until = Time.get_ticks_msec() + 200
	_refresh_targets()
	_rebuild_layout()

func _build_view_toggle() -> void:
	var ui = $CanvasLayer/UI as Control
	if ui == null:
		return

	var container := HBoxContainer.new()
	container.set_anchors_preset(Control.PRESET_TOP_RIGHT)
	container.grow_horizontal = Control.GROW_DIRECTION_BEGIN
	container.offset_right = -24.0
	container.offset_top = 24.0
	container.offset_bottom = 68.0
	container.add_theme_constant_override("separation", 6)
	ui.add_child(container)

	var solar_btn := Button.new()
	solar_btn.text = "Solar System"
	solar_btn.name = "SolarBtn"
	PanelStyle.apply_button(solar_btn, true)
	solar_btn.pressed.connect(func(): _set_view_mode("solar"))
	container.add_child(solar_btn)

	var stars_btn := Button.new()
	stars_btn.text = "Star Systems"
	stars_btn.name = "StarsBtn"
	PanelStyle.apply_button(stars_btn, false)
	stars_btn.pressed.connect(func(): _set_view_mode("stars"))
	container.add_child(stars_btn)

func _set_view_mode(mode: String) -> void:
	_view_mode = mode
	# Update button styles
	var ui = $CanvasLayer/UI as Control
	if ui:
		var container = ui.get_node_or_null("HBoxContainer") as HBoxContainer
		if container == null:
			# find by position in children
			for child in ui.get_children():
				if child is HBoxContainer:
					container = child
					break
		if container:
			var solar_btn = container.get_node_or_null("SolarBtn") as Button
			var stars_btn = container.get_node_or_null("StarsBtn") as Button
			if solar_btn:
				PanelStyle.apply_button(solar_btn, mode == "solar")
			if stars_btn:
				PanelStyle.apply_button(stars_btn, mode == "stars")
	_rebuild_layout()

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

	# Nebula gradient background
	var vp_rect := get_viewport_rect()
	var gradient = NebulaTheme.create_nebula_gradient()
	for i in range(4):
		var t = float(i) / 3.0
		var color = gradient.sample(t)
		color.a = 1.0
		var rect_height = vp_rect.size.y / 4.0
		draw_rect(Rect2(vp_rect.position.x, vp_rect.position.y + i * rect_height, vp_rect.size.x, rect_height), color, true)

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
	if RocketsManager:
		RocketsManager.set_preview_target(
			target_id,
			str(entry.get("label", target_id)),
			str(entry.get("type", "asteroid")),
			""
		)
	var tree = Engine.get_main_loop() as SceneTree
	if tree == null:
		return
	var scene_manager = null
	if tree.current_scene:
		scene_manager = tree.current_scene.get_node_or_null("SceneManager")
	if scene_manager and scene_manager.has_method("change_to_scene"):
		scene_manager.change_to_scene("res://Scenes/UI/AsteroidPreview/asteroid_preview.tscn")
	else:
		tree.change_scene_to_file("res://Scenes/UI/AsteroidPreview/asteroid_preview.tscn")

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
