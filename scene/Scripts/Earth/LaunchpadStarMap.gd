extends Control
class_name LaunchpadStarMap
## Star map target picker for the launchpad.
## Renders asteroid belt groupings, TESS planet sector, solar system reference bodies,
## ship range overlays, and distance-based rarity cues.
## Implements: awmju4 (belt groups), s0e57m (range overlays), sp9jcr (rarity cues).

signal target_pressed(target_id)

const SUN_COLOR          := Color(0.98, 0.92, 0.65, 1.0)
const EARTH_COLOR        := Color(0.35, 0.65, 0.95, 1.0)
const ORBIT_COLOR        := Color(0.42, 0.55, 0.76, 0.28)
const BELT_BAND_COLOR    := Color(0.60, 0.65, 0.75, 0.08)
const ASTEROID_COLOR     := Color(0.76, 0.78, 0.82, 1.0)
const PLANET_COLOR       := Color(0.55, 0.85, 0.55, 1.0)
const BLOCKED_COLOR      := Color(0.38, 0.44, 0.55, 0.95)
const SELECTED_RING_COLOR := Color(0.28, 0.88, 0.96, 0.95)
const STAR_COLOR         := Color(0.92, 0.96, 1.0, 0.7)
const PANEL_OUTLINE      := Color(0.28, 0.88, 0.96, 0.24)
const DEEP_SPACE_FILL    := Color(0.04, 0.08, 0.14, 0.85)
const RARITY_MID_COLOR   := Color(0.94, 0.75, 0.35, 0.85)
const RARITY_HIGH_COLOR  := Color(0.98, 0.86, 0.20, 1.0)
const SOLAR_REF_COLOR    := Color(0.72, 0.78, 0.92, 0.55)

# Range overlay colours per rocket slot (SR1 blue, SR2 amber, SR3 green)
const RANGE_COLORS := [
	Color(0.30, 0.65, 1.0, 0.55),
	Color(0.94, 0.69, 0.19, 0.55),
	Color(0.55, 0.85, 0.55, 0.55),
]

# AU→pixel scale: outermost orbit ring represents this many AU from the sun.
# Belt placement and range circles both use this constant.
const AU_MAX_VISUAL := 20.0

const SOLAR_RING_COUNT := 4
const STAR_COUNT := 80

var _entries: Array = []
var _rocket_ranges: Array = []   # [{name, max_range_au}]
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
var _au_px_scale := 1.0   # pixels per AU at the current viewport size


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_STOP
	focus_mode = Control.FOCUS_NONE
	custom_minimum_size.y = max(custom_minimum_size.y, 140.0)
	_label_font = ThemeDB.fallback_font
	_rebuild_layout()


## entries: Array of {id, label, type, blocked, distance_au, recommended, disposition}
## selected_target_id: currently selected target id
## rocket_ranges: optional Array of {name, max_range_au} for each unlocked ship
func setup(entries: Array, selected_target_id: String, rocket_ranges: Array = []) -> void:
	_entries = []
	for entry_any in entries:
		if typeof(entry_any) != TYPE_DICTIONARY:
			continue
		_entries.append((entry_any as Dictionary).duplicate(true))
	_selected_target_id = selected_target_id
	_rocket_ranges = rocket_ranges.duplicate(true)
	_rebuild_layout()


func _notification(what: int) -> void:
	if what == NOTIFICATION_RESIZED:
		_rebuild_layout()


func _gui_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		if event.pressed:
			var click_pos: Vector2 = event.position
			for target_id in _marker_positions.keys():
				var marker: Dictionary = _marker_positions[target_id]
				var radius = float(marker.get("click_radius", 18.0))
				if click_pos.distance_to(marker.get("pos", Vector2.ZERO)) <= radius:
					target_pressed.emit(str(target_id))
					accept_event()
					return
			accept_event()
			return
		accept_event()


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

	# pixels-per-AU: outermost ring maps to AU_MAX_VISUAL
	_au_px_scale = _orbit_radii[SOLAR_RING_COUNT - 1] / AU_MAX_VISUAL

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


## Map distance in AU to a belt-ring index.
## Inner targets (< 5 AU) land on rings 0–1; mid (5–12) on ring 2; outer (12+) on ring 3.
func _au_to_ring(distance_au: float) -> int:
	if distance_au < 2.5:
		return 0
	elif distance_au < 5.0:
		return 1
	elif distance_au < 12.0:
		return 2
	else:
		return SOLAR_RING_COUNT - 1


## 0 = standard, 1 = mid-yield (amber), 2 = high-yield (gold)
func _rarity_tier(distance_au: float) -> int:
	if distance_au >= 12.0:
		return 2
	elif distance_au >= 5.0:
		return 1
	return 0


func _build_marker_positions() -> void:
	var belt_ring_counts := {}
	for i in range(SOLAR_RING_COUNT):
		belt_ring_counts[i] = 0

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
			var distance_au = float(entry.get("distance_au", 0.0))
			var belt_ring = _au_to_ring(distance_au)
			var ring_count = int(belt_ring_counts.get(belt_ring, 0))
			_marker_positions[target_id] = _build_asteroid_marker(entry, belt_ring, ring_count)
			belt_ring_counts[belt_ring] = ring_count + 1


func _build_asteroid_marker(entry: Dictionary, belt_ring: int, ring_index: int) -> Dictionary:
	var target_id = str(entry.get("id", ""))
	var h = _simple_hash(target_id)
	var angle = (float(abs(h) % 360) / 360.0) * TAU
	angle += float(ring_index) * 0.55
	var radius = _orbit_radii[min(belt_ring, _orbit_radii.size() - 1)]
	# Small radial jitter so multiple targets on the same ring don't pile up
	var jitter = float(abs(int(h / 13)) % 8) - 4.0
	radius += jitter
	var pos = _solar_center + Vector2(cos(angle), sin(angle)) * radius
	return {
		"pos": pos,
		"draw_radius": 8.0,
		"click_radius": 18.0,
		"type": "asteroid",
		"belt_ring": belt_ring,
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

	_draw_belt_bands()
	for r in _orbit_radii:
		draw_arc(_solar_center, r, 0.0, TAU, 100, ORBIT_COLOR, 1.4, true)
	_draw_solar_reference_planets()
	_draw_ship_range_overlays()

	draw_circle(_solar_center, _sun_radius * 1.4, Color(1.0, 0.84, 0.42, 0.18))
	draw_circle(_solar_center, _sun_radius, SUN_COLOR)

	if _orbit_radii.size() > 1:
		_earth_pos = _solar_center + Vector2(cos(-0.8), sin(-0.8)) * _orbit_radii[1]
		draw_circle(_earth_pos, _sun_radius * 0.55, EARTH_COLOR)
		draw_circle(_earth_pos, _sun_radius * 0.55 + 3.0, Color(EARTH_COLOR.r, EARTH_COLOR.g, EARTH_COLOR.b, 0.35), false, 1.5)

	draw_rect(_deep_space_rect, DEEP_SPACE_FILL, true)
	draw_rect(_deep_space_rect, PANEL_OUTLINE, false, 1.0)
	for s_any in _stars:
		var s: Dictionary = s_any
		draw_circle(s.get("pos", Vector2.ZERO), float(s.get("r", 1.0)), STAR_COLOR)
	_draw_deep_space_grid()
	_draw_targets()
	_draw_labels()


## Faint shaded bands showing inner-belt and main-belt zones.
func _draw_belt_bands() -> void:
	if _orbit_radii.size() < SOLAR_RING_COUNT:
		return
	var inner_lo: float = float(_orbit_radii[0]) - 5.0
	var inner_hi: float = float(_orbit_radii[1]) + 5.0
	var r: float = inner_lo
	while r < inner_hi:
		draw_arc(_solar_center, r, 0.0, TAU, 60, BELT_BAND_COLOR, 2.5, true)
		r += 2.5
	var main_lo: float = float(_orbit_radii[2]) - 5.0
	var main_hi: float = float(_orbit_radii[3]) + 5.0
	r = main_lo
	while r < main_hi:
		draw_arc(_solar_center, r, 0.0, TAU, 60, BELT_BAND_COLOR, 2.5, true)
		r += 2.5


## Faint Mars and Jupiter reference markers at approximate orbital distances.
## These are non-interactive; they anchor the AU scale for the player.
func _draw_solar_reference_planets() -> void:
	if _au_px_scale <= 0.0 or _orbit_radii.is_empty():
		return
	var solar_width = _last_size.x * 0.58
	var mars_r = 1.52 * _au_px_scale
	var jupiter_r = 5.2 * _au_px_scale
	if mars_r > _sun_radius and mars_r < solar_width:
		draw_arc(_solar_center, mars_r, 0.0, TAU, 60, Color(SOLAR_REF_COLOR.r, SOLAR_REF_COLOR.g, SOLAR_REF_COLOR.b, 0.16), 1.0, true)
		var mars_pos = _solar_center + Vector2(cos(1.2), sin(1.2)) * mars_r
		draw_circle(mars_pos, 3.0, Color(0.85, 0.48, 0.30, 0.70))
	if jupiter_r > _sun_radius and jupiter_r < solar_width:
		draw_arc(_solar_center, jupiter_r, 0.0, TAU, 80, Color(SOLAR_REF_COLOR.r, SOLAR_REF_COLOR.g, SOLAR_REF_COLOR.b, 0.12), 1.0, true)
		var jupiter_pos = _solar_center + Vector2(cos(2.5), sin(2.5)) * jupiter_r
		draw_circle(jupiter_pos, 5.0, Color(0.78, 0.68, 0.50, 0.60))


## Dashed range arcs centered on the solar system showing each ship's maximum reach.
func _draw_ship_range_overlays() -> void:
	if _rocket_ranges.is_empty() or _au_px_scale <= 0.0:
		return
	var seg_count := 48
	for i in range(_rocket_ranges.size()):
		var rr: Dictionary = _rocket_ranges[i] if typeof(_rocket_ranges[i]) == TYPE_DICTIONARY else {}
		var max_range_au = float(rr.get("max_range_au", 0.0))
		if max_range_au <= 0.0:
			continue
		var range_px = max_range_au * _au_px_scale
		var c_idx = min(i, RANGE_COLORS.size() - 1)
		var range_color = RANGE_COLORS[c_idx]
		var seg_on := true
		for seg in range(seg_count):
			var a_start = float(seg) / float(seg_count) * TAU
			var a_end = float(seg + 1) / float(seg_count) * TAU
			if seg_on:
				draw_arc(_solar_center, range_px, a_start, a_end, 4, range_color, 1.8, true)
			seg_on = not seg_on


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
		var distance_au = float(entry.get("distance_au", 0.0))
		var tier = 0 if blocked else _rarity_tier(distance_au)

		var base_color: Color
		if blocked:
			base_color = BLOCKED_COLOR
		elif target_type == "planet":
			base_color = PLANET_COLOR
		elif tier == 2:
			base_color = RARITY_HIGH_COLOR
		elif tier == 1:
			base_color = RARITY_MID_COLOR
		else:
			base_color = ASTEROID_COLOR

		# Rarity glow behind marker
		if not blocked and tier >= 1:
			var glow_c = RARITY_HIGH_COLOR if tier == 2 else RARITY_MID_COLOR
			draw_circle(pos, draw_radius + 6.0, Color(glow_c.r, glow_c.g, glow_c.b, 0.18))

		if target_id == _selected_target_id:
			draw_circle(pos, draw_radius + 7.0, Color(SELECTED_RING_COLOR.r, SELECTED_RING_COLOR.g, SELECTED_RING_COLOR.b, 0.20))
			draw_circle(pos, draw_radius + 4.0, SELECTED_RING_COLOR)
		elif not blocked:
			draw_circle(pos, draw_radius + 4.0, Color(base_color.r, base_color.g, base_color.b, 0.14))
		draw_circle(pos, draw_radius, base_color)
		if target_type == "planet":
			draw_arc(pos, draw_radius + 4.0, -0.55, 2.4, 28, Color(base_color.r, base_color.g, base_color.b, 0.85), 1.4, true)


func _draw_labels() -> void:
	if _label_font == null:
		return

	# Section headings
	draw_string(_label_font, Vector2(16.0, 22.0), "Inner System", HORIZONTAL_ALIGNMENT_LEFT, -1.0, 14, Color(0.86, 0.92, 1.0, 0.92))
	draw_string(_label_font, Vector2(_deep_space_rect.position.x + 12.0, 22.0), "Outer Systems", HORIZONTAL_ALIGNMENT_LEFT, -1.0, 14, Color(0.86, 0.92, 1.0, 0.92))

	# Launch site label on Earth
	if _orbit_radii.size() > 1:
		draw_string(_label_font, _earth_pos + Vector2(10.0, -10.0), "Launch Site", HORIZONTAL_ALIGNMENT_LEFT, -1.0, 11, Color(0.55, 0.75, 1.0, 0.88))

	# Solar system reference planet labels
	if _au_px_scale > 0.0:
		var solar_width = _last_size.x * 0.58
		var mars_r = 1.52 * _au_px_scale
		var jupiter_r = 5.2 * _au_px_scale
		if mars_r > _sun_radius and mars_r < solar_width:
			var mars_pos = _solar_center + Vector2(cos(1.2), sin(1.2)) * mars_r
			draw_string(_label_font, mars_pos + Vector2(5.0, -4.0), "Mars", HORIZONTAL_ALIGNMENT_LEFT, -1.0, 9, Color(0.85, 0.55, 0.40, 0.50))
		if jupiter_r > _sun_radius and jupiter_r < solar_width:
			var jupiter_pos = _solar_center + Vector2(cos(2.5), sin(2.5)) * jupiter_r
			draw_string(_label_font, jupiter_pos + Vector2(7.0, -5.0), "Jupiter", HORIZONTAL_ALIGNMENT_LEFT, -1.0, 9, Color(0.85, 0.75, 0.55, 0.50))

	# Belt zone labels (only when those rings hold targets)
	var inner_has_targets := false
	var main_has_targets := false
	for entry_any in _entries:
		if typeof(entry_any) != TYPE_DICTIONARY:
			continue
		var entry: Dictionary = entry_any
		var tid = str(entry.get("id", ""))
		if not _marker_positions.has(tid):
			continue
		var m: Dictionary = _marker_positions[tid]
		if str(m.get("type", "")) == "asteroid":
			if int(m.get("belt_ring", 0)) <= 1:
				inner_has_targets = true
			else:
				main_has_targets = true
	var belt_color = Color(0.70, 0.78, 0.90, 0.50)
	if inner_has_targets and _orbit_radii.size() >= 2:
		var label_pos = _solar_center + Vector2(_orbit_radii[0] * 0.68, -_orbit_radii[0] * 0.72)
		draw_string(_label_font, label_pos, "Inner Belt", HORIZONTAL_ALIGNMENT_LEFT, -1.0, 10, belt_color)
	if main_has_targets and _orbit_radii.size() >= SOLAR_RING_COUNT:
		var label_pos = _solar_center + Vector2(_orbit_radii[2] * 0.60, -_orbit_radii[2] * 0.76)
		draw_string(_label_font, label_pos, "Main Belt", HORIZONTAL_ALIGNMENT_LEFT, -1.0, 10, belt_color)

	# Range overlay labels
	if _au_px_scale > 0.0:
		for i in range(_rocket_ranges.size()):
			var rr: Dictionary = _rocket_ranges[i] if typeof(_rocket_ranges[i]) == TYPE_DICTIONARY else {}
			var max_range_au = float(rr.get("max_range_au", 0.0))
			if max_range_au <= 0.0:
				continue
			var range_px = max_range_au * _au_px_scale
			var c_idx = min(i, RANGE_COLORS.size() - 1)
			var range_color = RANGE_COLORS[c_idx]
			var label_pos = _solar_center + Vector2(0.0, -range_px)
			if label_pos.y >= 8.0:
				var rname = str(rr.get("name", "Ship %d" % (i + 1)))
				draw_string(_label_font, label_pos + Vector2(4.0, 0.0), "%s range" % rname, HORIZONTAL_ALIGNMENT_LEFT, -1.0, 10, Color(range_color.r, range_color.g, range_color.b, 0.85))

	# Target labels + rarity indicators
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
		var distance_au = float(entry.get("distance_au", 0.0))
		var tier = 0 if blocked else _rarity_tier(distance_au)
		var label_color: Color
		if blocked:
			label_color = Color(0.62, 0.70, 0.82, 0.92)
		elif tier == 2:
			label_color = Color(RARITY_HIGH_COLOR.r, RARITY_HIGH_COLOR.g, RARITY_HIGH_COLOR.b, 0.95)
		elif tier == 1:
			label_color = Color(RARITY_MID_COLOR.r, RARITY_MID_COLOR.g, RARITY_MID_COLOR.b, 0.95)
		else:
			label_color = Color(0.90, 0.94, 1.0, 0.94)
		draw_string(_label_font, pos + Vector2(12.0, 5.0), label, HORIZONTAL_ALIGNMENT_LEFT, 160.0, 11, label_color)
		if tier == 2 and not blocked:
			draw_string(_label_font, pos + Vector2(12.0, 17.0), "HIGH YIELD", HORIZONTAL_ALIGNMENT_LEFT, -1.0, 9, Color(RARITY_HIGH_COLOR.r, RARITY_HIGH_COLOR.g, RARITY_HIGH_COLOR.b, 0.72))


func _simple_hash(value: String) -> int:
	var h := 0
	for c in value.to_utf8_buffer():
		h = (h * 31 + int(c)) & 0x7fffffff
	return h
