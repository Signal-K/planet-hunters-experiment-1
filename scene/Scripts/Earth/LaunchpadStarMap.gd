extends Control
class_name LaunchpadStarMap

signal target_pressed(target_id)

const SUN_COLOR := Color(0.98, 0.92, 0.65, 1.0)
const EARTH_COLOR := Color(0.35, 0.65, 0.95, 1.0)
const ORBIT_COLOR := Color(0.42, 0.55, 0.76, 0.28)
const ASTEROID_COLOR := Color(0.76, 0.78, 0.82, 1.0)
const PLANET_COLOR := Color(0.55, 0.85, 0.55, 1.0)
const BLOCKED_COLOR := Color(0.38, 0.44, 0.55, 0.95)
const SELECTED_RING_COLOR := Color(0.28, 0.88, 0.96, 0.95)
const STAR_COLOR := Color(0.92, 0.96, 1.0, 0.7)
const PANEL_OUTLINE := Color(0.28, 0.88, 0.96, 0.24)
const DEEP_SPACE_FILL := Color(0.04, 0.08, 0.14, 0.85)

const SOLAR_RING_COUNT := 4
const STAR_COUNT := 80

var _entries: Array = []
var _selected_target_id := ""
var _marker_positions := {}
var _stars: Array = []
var _label_font: Font = null
var _last_size := Vector2.ZERO
var _deep_space_rect := Rect2()
var _solar_center := Vector2.ZERO
var _orbit_radii: Array = []
var _sun_radius := 0.0
var _earth_pos := Vector2.ZERO

func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_STOP
	focus_mode = Control.FOCUS_NONE
	custom_minimum_size = Vector2(0.0, 320.0)
	_label_font = ThemeDB.fallback_font
	_rebuild_layout()

func setup(entries: Array, selected_target_id: String) -> void:
	_entries = []
	for entry_any in entries:
		if typeof(entry_any) != TYPE_DICTIONARY:
			continue
		_entries.append((entry_any as Dictionary).duplicate(true))
	_selected_target_id = selected_target_id
	_rebuild_layout()

func _notification(what: int) -> void:
	if what == NOTIFICATION_RESIZED:
		_rebuild_layout()

func _gui_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		var click_pos: Vector2 = event.position
		for target_id in _marker_positions.keys():
			var marker: Dictionary = _marker_positions[target_id]
			var radius = float(marker.get("click_radius", 18.0))
			if click_pos.distance_to(marker.get("pos", Vector2.ZERO)) <= radius:
				target_pressed.emit(str(target_id))
				accept_event()
				return

func _rebuild_layout() -> void:
	_last_size = size
	_marker_positions.clear()
	_stars.clear()
	if _last_size.x <= 0.0 or _last_size.y <= 0.0:
		queue_redraw()
		return

	var solar_width = _last_size.x * 0.58
	_solar_center = Vector2(solar_width * 0.48, _last_size.y * 0.53)
	_sun_radius = min(_last_size.x, _last_size.y) * 0.035
	_deep_space_rect = Rect2(solar_width, 18.0, max(_last_size.x - solar_width - 10.0, 120.0), max(_last_size.y - 36.0, 120.0))

	_orbit_radii.clear()
	var base = min(solar_width, _last_size.y) * 0.16
	var step = min(solar_width, _last_size.y) * 0.11
	for i in range(SOLAR_RING_COUNT):
		_orbit_radii.append(base + step * i)

	_build_starfield()
	_build_marker_positions()
	queue_redraw()

func _build_starfield() -> void:
	var rng = RandomNumberGenerator.new()
	rng.seed = 4107
	for _i in range(STAR_COUNT):
		_stars.append({
			"pos": Vector2(
				rng.randf_range(_deep_space_rect.position.x + 10.0, _deep_space_rect.end.x - 10.0),
				rng.randf_range(_deep_space_rect.position.y + 8.0, _deep_space_rect.end.y - 8.0)
			),
			"r": rng.randf_range(0.7, 1.6)
		})

func _build_marker_positions() -> void:
	var asteroid_index := 0
	var planet_index := 0
	for entry_any in _entries:
		if typeof(entry_any) != TYPE_DICTIONARY:
			continue
		var entry: Dictionary = entry_any
		var target_id = str(entry.get("id", ""))
		if target_id == "":
			continue
		var target_type = str(entry.get("type", "asteroid")).to_lower()
		if target_type == "planet" or target_type == "tess":
			_marker_positions[target_id] = _build_planet_marker(entry, planet_index)
			planet_index += 1
		else:
			_marker_positions[target_id] = _build_asteroid_marker(entry, asteroid_index)
			asteroid_index += 1

func _build_asteroid_marker(entry: Dictionary, index: int) -> Dictionary:
	var target_id = str(entry.get("id", ""))
	var h = _simple_hash(target_id)
	var orbit = int(abs(h) % max(_orbit_radii.size(), 1))
	var angle = (float(abs(h) % 360) / 360.0) * TAU
	angle += float(index) * 0.33
	var radius = _orbit_radii[min(orbit, _orbit_radii.size() - 1)]
	var pos = _solar_center + Vector2(cos(angle), sin(angle)) * radius
	return {
		"pos": pos,
		"draw_radius": 8.0,
		"click_radius": 18.0,
		"type": "asteroid",
	}

func _build_planet_marker(entry: Dictionary, index: int) -> Dictionary:
	var target_id = str(entry.get("id", ""))
	var sector_cols := 2
	var sector_rows := 2
	var cell_w = _deep_space_rect.size.x / float(sector_cols)
	var cell_h = _deep_space_rect.size.y / float(sector_rows)
	var h = _simple_hash(target_id)
	var col = abs(h) % sector_cols
	var row = int(abs(int(h / 7))) % sector_rows
	var rng = RandomNumberGenerator.new()
	rng.seed = h
	var pos = Vector2(
		_deep_space_rect.position.x + cell_w * (float(col) + 0.5) + rng.randf_range(-cell_w * 0.18, cell_w * 0.18),
		_deep_space_rect.position.y + cell_h * (float(row) + 0.5) + rng.randf_range(-cell_h * 0.18, cell_h * 0.18)
	)
	pos.y += float(index % 2) * 8.0
	return {
		"pos": pos,
		"draw_radius": 10.0,
		"click_radius": 20.0,
		"type": "planet",
	}

func _draw() -> void:
	if _last_size == Vector2.ZERO:
		return

	draw_rect(Rect2(Vector2.ZERO, _last_size), Color(0.03, 0.06, 0.11, 0.94), true)
	draw_rect(Rect2(Vector2.ZERO, _last_size), PANEL_OUTLINE, false, 1.0)

	for r in _orbit_radii:
		draw_arc(_solar_center, r, 0.0, TAU, 100, ORBIT_COLOR, 1.4, true)
	draw_circle(_solar_center, _sun_radius * 1.4, Color(1.0, 0.84, 0.42, 0.18))
	draw_circle(_solar_center, _sun_radius, SUN_COLOR)

	if _orbit_radii.size() > 1:
		_earth_pos = _solar_center + Vector2(cos(-0.8), sin(-0.8)) * _orbit_radii[1]
		draw_circle(_earth_pos, _sun_radius * 0.42, EARTH_COLOR)

	draw_rect(_deep_space_rect, DEEP_SPACE_FILL, true)
	draw_rect(_deep_space_rect, PANEL_OUTLINE, false, 1.0)
	for s_any in _stars:
		var s: Dictionary = s_any
		draw_circle(s.get("pos", Vector2.ZERO), float(s.get("r", 1.0)), STAR_COLOR)
	_draw_deep_space_grid()
	_draw_targets()
	_draw_labels()

func _draw_deep_space_grid() -> void:
	var cols := 2
	var rows := 2
	var cell_w = _deep_space_rect.size.x / float(cols)
	var cell_h = _deep_space_rect.size.y / float(rows)
	for i in range(1, cols):
		var x = _deep_space_rect.position.x + cell_w * i
		draw_line(Vector2(x, _deep_space_rect.position.y), Vector2(x, _deep_space_rect.end.y), PANEL_OUTLINE, 1.0)
	for j in range(1, rows):
		var y = _deep_space_rect.position.y + cell_h * j
		draw_line(Vector2(_deep_space_rect.position.x, y), Vector2(_deep_space_rect.end.x, y), PANEL_OUTLINE, 1.0)

func _draw_targets() -> void:
	for entry_any in _entries:
		if typeof(entry_any) != TYPE_DICTIONARY:
			continue
		var entry: Dictionary = entry_any
		var target_id = str(entry.get("id", ""))
		if not _marker_positions.has(target_id):
			continue
		var marker: Dictionary = _marker_positions[target_id]
		var pos: Vector2 = marker.get("pos", Vector2.ZERO)
		var draw_radius = float(marker.get("draw_radius", 8.0))
		var blocked = bool(entry.get("blocked", false))
		var target_type = str(marker.get("type", "asteroid"))
		var color = BLOCKED_COLOR if blocked else PLANET_COLOR if target_type == "planet" else ASTEROID_COLOR
		if target_id == _selected_target_id:
			draw_circle(pos, draw_radius + 7.0, Color(SELECTED_RING_COLOR.r, SELECTED_RING_COLOR.g, SELECTED_RING_COLOR.b, 0.20))
			draw_circle(pos, draw_radius + 4.0, SELECTED_RING_COLOR)
		elif not blocked:
			draw_circle(pos, draw_radius + 4.0, Color(color.r, color.g, color.b, 0.14))
		draw_circle(pos, draw_radius, color)
		if target_type == "planet":
			draw_arc(pos, draw_radius + 4.0, -0.55, 2.4, 28, Color(color.r, color.g, color.b, 0.85), 1.4, true)

func _draw_labels() -> void:
	if _label_font == null:
		return
	draw_string(_label_font, Vector2(16.0, 22.0), "Inner System", HORIZONTAL_ALIGNMENT_LEFT, -1.0, 14, Color(0.86, 0.92, 1.0, 0.92))
	draw_string(_label_font, Vector2(_deep_space_rect.position.x + 12.0, 22.0), "Outer Systems", HORIZONTAL_ALIGNMENT_LEFT, -1.0, 14, Color(0.86, 0.92, 1.0, 0.92))
	draw_string(_label_font, _earth_pos + Vector2(10.0, -8.0), "Home", HORIZONTAL_ALIGNMENT_LEFT, -1.0, 12, Color(0.78, 0.88, 1.0, 0.9))

	for entry_any in _entries:
		if typeof(entry_any) != TYPE_DICTIONARY:
			continue
		var entry: Dictionary = entry_any
		var target_id = str(entry.get("id", ""))
		if not _marker_positions.has(target_id):
			continue
		var label = str(entry.get("label", target_id))
		var pos: Vector2 = (_marker_positions[target_id] as Dictionary).get("pos", Vector2.ZERO)
		var blocked = bool(entry.get("blocked", false))
		var color = Color(0.62, 0.70, 0.82, 0.92) if blocked else Color(0.90, 0.94, 1.0, 0.94)
		draw_string(_label_font, pos + Vector2(12.0, 5.0), label, HORIZONTAL_ALIGNMENT_LEFT, 160.0, 11, color)

func _simple_hash(value: String) -> int:
	var h := 0
	for c in value.to_utf8_buffer():
		h = (h * 31 + int(c)) & 0x7fffffff
	return h
