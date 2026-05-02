extends Node2D

const SpaceMapTargetDialogueScene = preload("res://Scenes/UI/Templates/SpaceMapTargetDialogue.tscn")
const SpaceMapContractorRowScene = preload("res://Scenes/UI/Templates/SpaceMapContractorRow.tscn")
const AsteroidDetailViewScene = preload("res://Scenes/UI/AsteroidDetail/asteroid_detail_view.tscn")

const RocketsManager = preload("res://Scripts/Utils/RocketsManager.gd")
const SectorRevealManager = preload("res://Scripts/Utils/SectorRevealManager.gd")
const PanelStyle = preload("res://Scripts/UI/PanelStyle.gd")
const EarthSceneUIHelper = preload("res://Scripts/Earth/EarthSceneUIHelper.gd")
const SceneManager = preload("res://Scripts/Earth/SceneManager.gd")
const UIManager = preload("res://Scripts/Earth/UIManager.gd")

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
const CANDIDATE_RING_COLOR := Color(0.3, 0.9, 1.0, 0.9)   # Cyan ring for unclassified planet candidates
const CANDIDATE_PULSE_COLOR := Color(0.3, 0.9, 1.0, 0.35)
const GRID_COLOR := Color(0.28, 0.88, 0.96, 0.08)
const RING_COLOR := Color(0.28, 0.88, 0.96, 0.16)
const SWEEP_COLOR := Color(0.28, 0.88, 0.96, 0.32)
const FIELD_COLORS := [
	Color(0.40, 0.92, 0.98, 0.85),
	Color(0.58, 0.95, 0.33, 0.82),
	Color(0.99, 0.64, 0.28, 0.82),
	Color(0.86, 0.42, 0.98, 0.82),
	Color(0.98, 0.36, 0.46, 0.82),
	Color(0.44, 0.68, 1.00, 0.82),
]

var _view_mode: String = "stars"  # "solar" or "stars" — galaxy view is default
var _tess_classifications: Dictionary = {}  # target_id → verdict
var scene_manager: SceneManager
var ui_manager: UIManager
var _ui_helper := EarthSceneUIHelper.new()
var _orbit_radii: Array = []
var _stars: Array = []
var _constellations: Array = []
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
var _scan_revision := 0

const EARTH_CLICK_RADIUS := 26.0
const TARGET_CLICK_RADIUS := 22.0

@onready var back_button: Button = get_node_or_null("CanvasLayer/UI/BackButton") as Button
@onready var solar_btn: Button = get_node_or_null("CanvasLayer/UI/Header/HeaderRow/ModeToggle/SolarBtn") as Button
@onready var stars_btn: Button = get_node_or_null("CanvasLayer/UI/Header/HeaderRow/ModeToggle/StarsBtn") as Button
@onready var deep_scan_button: Button = get_node_or_null("CanvasLayer/UI/DeepScanButton") as Button
@onready var sector_card: PanelContainer = get_node_or_null("CanvasLayer/UI/HudCards/SectorCard") as PanelContainer
@onready var primary_target_card: PanelContainer = get_node_or_null("CanvasLayer/UI/HudCards/PrimaryTargetCard") as PanelContainer
@onready var secondary_target_card: PanelContainer = get_node_or_null("CanvasLayer/UI/HudCards/SecondaryTargetCard") as PanelContainer

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
		back_button.visible = true
	if solar_btn:
		solar_btn.pressed.connect(func(): _set_view_mode("solar"))
	if stars_btn:
		stars_btn.pressed.connect(func(): _set_view_mode("stars"))
	if deep_scan_button:
		deep_scan_button.pressed.connect(_on_deep_scan_pressed)
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
		solar_btn.add_theme_color_override("font_color", Color(0.28, 0.88, 0.96, 1.0) if _view_mode == "solar" else Color(0.58, 0.65, 0.74, 0.9))
	if stars_btn:
		stars_btn.add_theme_color_override("font_color", Color(0.28, 0.88, 0.96, 1.0) if _view_mode == "stars" else Color(0.58, 0.65, 0.74, 0.9))

func _process(_delta: float) -> void:
	var size = get_viewport_rect().size
	if size != _last_size:
		_rebuild_layout()
	queue_redraw()

func _refresh_targets() -> void:
	if RocketsManager:
		_targets = RocketsManager.get_detected_targets()
	else:
		_targets = []
	_revealed_sectors = SectorRevealManager.get_revealed_sectors()
	_personal_discoveries = _load_personal_discoveries()
	_tess_classifications = RocketsManager.get_all_tess_classifications()

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
	_refresh_hud_cards()
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
	_constellations.clear()
	var rng = RandomNumberGenerator.new()
	rng.seed = 1337 + (_scan_revision * 17)
	for _i in range(STAR_COUNT):
		var p = Vector2(rng.randf_range(0, _last_size.x), rng.randf_range(0, _last_size.y))
		var r = rng.randf_range(0.6, 1.6)
		var alpha = rng.randf_range(0.18, 0.72)
		_stars.append({"pos": p, "r": r, "alpha": alpha})

	var cluster_count := 26
	for idx in range(cluster_count):
		var center = Vector2(
			rng.randf_range(_last_size.x * 0.08, _last_size.x * 0.92),
			rng.randf_range(_last_size.y * 0.12, _last_size.y * 0.90)
		)
		var node_count = rng.randi_range(4, 8)
		var nodes: Array = []
		var links: Array = []
		var angle = rng.randf_range(0.0, TAU)
		for node_idx in range(node_count):
			angle += rng.randf_range(0.4, 1.2)
			var radial = rng.randf_range(24.0, 120.0)
			var wobble = Vector2(rng.randf_range(-18.0, 18.0), rng.randf_range(-18.0, 18.0))
			var pos = center + Vector2(cos(angle), sin(angle)) * radial + wobble
			pos.x = clampf(pos.x, 28.0, _last_size.x - 28.0)
			pos.y = clampf(pos.y, 76.0, _last_size.y - 28.0)
			nodes.append({
				"pos": pos,
				"r": rng.randf_range(1.5, 4.0),
				"highlight": node_idx == 0 or rng.randf() < 0.18,
			})
			if node_idx > 0:
				links.append([node_idx - 1, node_idx])
			if node_idx > 2 and rng.randf() < 0.35:
				links.append([rng.randi_range(0, node_idx - 2), node_idx])
		_constellations.append({
			"nodes": nodes,
			"links": links,
			"color": FIELD_COLORS[idx % FIELD_COLORS.size()],
		})

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
			var is_planet_type := target_type.to_lower() == "planet"
			var already_classified := _tess_classifications.has(target_id)
			var awaiting_review := is_planet_type and not already_classified
			_target_positions[target_id] = {
				"pos": pos,  # absolute, not relative to center
				"type": target_type,
				"label": str(t.get("label", target_id)),
				"radius": draw_radius,
				"revealed": revealed or awaiting_review,  # always show candidates needing review
				"sector": sector,
				"is_discovery": target_id in _personal_discoveries,
				"awaiting_review": awaiting_review,
				"target_data": t,
			}

func _refresh_hud_cards() -> void:
	if _view_mode == "solar":
		_bind_hud_card(
			sector_card,
			"ORBITAL GRID",
			"Earth Launch Lanes",
			"Review orbital routes, nearby asteroids, and launch-ready traffic before returning to mission setup.",
			"TRACKED",
			"%d TARGETS" % _target_positions.size(),
			Color(0.28, 0.88, 0.96, 1.0),
			0.72,
			true
		)
		var solar_entries := _sorted_visible_entries()
		_bind_target_cards(solar_entries)
		return

	var revealed_count := _revealed_sectors.size()
	var sector_target_counts := {}
	for entry_any in _target_positions.values():
		if typeof(entry_any) != TYPE_DICTIONARY:
			continue
		var entry: Dictionary = entry_any
		if not bool(entry.get("revealed", false)):
			continue
		var sector_id := int(entry.get("sector", -1))
		sector_target_counts[sector_id] = int(sector_target_counts.get(sector_id, 0)) + 1

	var primary_sector := -1
	var highest_count := -1
	for sector_key in sector_target_counts.keys():
		var count := int(sector_target_counts.get(sector_key, 0))
		if count > highest_count:
			highest_count = count
			primary_sector = int(sector_key)
	if primary_sector == -1 and not _revealed_sectors.is_empty():
		primary_sector = int(_revealed_sectors[0])

	var sector_name := "Deep Field"
	if primary_sector != -1:
		sector_name = str(SectorRevealManager.SECTOR_NAMES.get(primary_sector, "Sector %d" % primary_sector))
	var sector_ratio := float(revealed_count) / float(max(SectorRevealManager.SECTOR_COUNT, 1))
	_bind_hud_card(
		sector_card,
		"GALAXY SURVEY",
		sector_name,
		"%d sectors revealed. %d targets are currently plotted in the tactical field." % [revealed_count, _sorted_visible_entries().size()],
		"FIELD STATUS",
		"REVEALED",
		Color(0.28, 0.88, 0.96, 1.0),
		sector_ratio,
		true
	)

	_bind_target_cards(_sorted_visible_entries())

func _on_deep_scan_pressed() -> void:
	_scan_revision += 1
	_refresh_targets()
	_rebuild_layout()

func _bind_target_cards(entries: Array) -> void:
	var first_entry: Dictionary = entries[0] if not entries.is_empty() else {}
	var second_entry: Dictionary = entries[1] if entries.size() > 1 else {}
	_bind_target_card(primary_target_card, first_entry)
	_bind_target_card(secondary_target_card, second_entry)

func _bind_target_card(card: PanelContainer, entry: Dictionary) -> void:
	if card == null:
		return
	if entry.is_empty():
		card.visible = false
		return
	var target_type := str(entry.get("type", "asteroid")).to_lower()
	var awaiting_review := bool(entry.get("awaiting_review", false))
	var is_discovery := bool(entry.get("is_discovery", false))
	var eyebrow := "ASTEROID TARGET"
	var detail := "Tap to inspect the plotted route and available mission details."
	var footer := "TARGET TYPE"
	var value := target_type.capitalize()
	var dot := ASTEROID_COLOR
	var meter := 0.64
	if awaiting_review:
		eyebrow = "PLANET CANDIDATE"
		detail = "Classification required. Open the review screen to inspect the lightcurve and mark a verdict."
		footer = "REVIEW"
		value = "REQUIRED"
		dot = CANDIDATE_RING_COLOR
		meter = 0.28
	elif is_discovery:
		eyebrow = "DISCOVERY TARGET"
		detail = "Personally discovered and logged. Review the target again or route a future mission back through this sector."
		footer = "STATUS"
		value = "LOGGED"
		dot = DISCOVERY_COLOR
		meter = 0.92
	elif target_type == "planet":
		eyebrow = "PLANET TARGET"
		detail = "Confirmed survey target. Tap to inspect this system and review the current classification state."
		footer = "STATUS"
		value = "CONFIRMED"
		dot = PLANET_COLOR
		meter = 0.78
	_bind_hud_card(
		card,
		eyebrow,
		str(entry.get("label", "Target")),
		detail,
		footer,
		value,
		dot,
		meter,
		true
	)

func _bind_hud_card(card: PanelContainer, eyebrow: String, title: String, detail: String, footer: String, value: String, dot_color: Color, meter_ratio: float, shown: bool) -> void:
	if card == null:
		return
	card.visible = shown
	if not shown:
		return
	var eyebrow_label := card.get_node_or_null("Margin/Content/HeaderRow/EyebrowLabel") as Label
	var title_label := card.get_node_or_null("Margin/Content/TitleLabel") as Label
	var detail_label := card.get_node_or_null("Margin/Content/DetailLabel") as Label
	var footer_label := card.get_node_or_null("Margin/Content/FooterRow/FooterLabel") as Label
	var value_label := card.get_node_or_null("Margin/Content/FooterRow/ValueLabel") as Label
	var status_dot := card.get_node_or_null("Margin/Content/HeaderRow/StatusDot") as ColorRect
	var meter_fill := card.get_node_or_null("Margin/Content/MeterBackground/MeterFill") as PanelContainer
	if eyebrow_label:
		eyebrow_label.text = eyebrow
		eyebrow_label.add_theme_color_override("font_color", Color(dot_color.r, dot_color.g, dot_color.b, 0.78))
	if title_label:
		title_label.text = title
	if detail_label:
		detail_label.text = detail
	if footer_label:
		footer_label.text = footer
	if value_label:
		value_label.text = value
		value_label.add_theme_color_override("font_color", dot_color)
	if status_dot:
		status_dot.color = dot_color
	if meter_fill:
		meter_fill.size_flags_horizontal = 0
		meter_fill.custom_minimum_size.x = clampf(224.0 * meter_ratio, 36.0, 224.0)

func _sorted_visible_entries() -> Array:
	var entries: Array = []
	for target_id_any in _target_positions.keys():
		var target_id := str(target_id_any)
		var entry: Dictionary = _target_positions[target_id]
		if _view_mode == "stars" and not bool(entry.get("revealed", false)):
			continue
		entry = entry.duplicate(true)
		entry["target_id"] = target_id
		entries.append(entry)
	entries.sort_custom(func(a: Dictionary, b: Dictionary) -> bool:
		var a_score := _entry_priority(a)
		var b_score := _entry_priority(b)
		if a_score == b_score:
			return str(a.get("label", "")).nocasecmp_to(str(b.get("label", ""))) < 0
		return a_score > b_score
	)
	return entries

func _entry_priority(entry: Dictionary) -> int:
	if bool(entry.get("awaiting_review", false)):
		return 30
	if bool(entry.get("is_discovery", false)):
		return 20
	return 10

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

	draw_rect(get_viewport_rect(), BG_COLOR, true)
	_draw_nebula_haze(size)
	_draw_tactical_grid(size)

	if _view_mode == "solar":
		_draw_solar_system(size)
	else:
		_draw_galaxy_tactical(size)

func _draw_nebula_haze(size: Vector2) -> void:
	var haze_centers := [
		{"pos": Vector2(size.x * 0.22, size.y * 0.18), "radius": min(size.x, size.y) * 0.22, "color": Color(0.22, 0.28, 0.52, 0.14)},
		{"pos": Vector2(size.x * 0.76, size.y * 0.26), "radius": min(size.x, size.y) * 0.28, "color": Color(0.36, 0.20, 0.54, 0.12)},
		{"pos": Vector2(size.x * 0.58, size.y * 0.68), "radius": min(size.x, size.y) * 0.24, "color": Color(0.16, 0.36, 0.48, 0.10)},
	]
	for haze_any in haze_centers:
		var haze: Dictionary = haze_any
		draw_circle(haze["pos"], haze["radius"], haze["color"])
	for s_any in _stars:
		var s: Dictionary = s_any
		draw_circle(s["pos"], s["r"], Color(STAR_COLOR.r, STAR_COLOR.g, STAR_COLOR.b, float(s["alpha"])))

func _draw_tactical_grid(size: Vector2) -> void:
	var minor_step: float = 92.0
	var major_step: float = minor_step * 4.0
	var x: float = 0.0
	while x <= size.x:
		var is_major := fmod(x, major_step) < 0.5
		draw_line(Vector2(x, 0), Vector2(x, size.y), Color(GRID_COLOR.r, GRID_COLOR.g, GRID_COLOR.b, 0.18 if is_major else 0.08), 1.4 if is_major else 1.0)
		x += minor_step
	var y: float = 0.0
	while y <= size.y:
		var is_major_y := fmod(y, major_step) < 0.5
		draw_line(Vector2(0, y), Vector2(size.x, y), Color(GRID_COLOR.r, GRID_COLOR.g, GRID_COLOR.b, 0.18 if is_major_y else 0.08), 1.4 if is_major_y else 1.0)
		y += minor_step

	var center := size * 0.5
	var radar_radius: float = min(size.x, size.y) * 0.43
	for ratio in [0.42, 0.67, 0.94]:
		draw_arc(center, radar_radius * ratio, 0.0, TAU, 192, RING_COLOR, 1.2, true)
	draw_arc(center, radar_radius * 1.12, PI * 0.12, PI * 1.86, 192, Color(RING_COLOR.r, RING_COLOR.g, RING_COLOR.b, 0.08), 1.0, true)
	_draw_scan_sweep(center, radar_radius)

func _draw_scan_sweep(center: Vector2, radius: float) -> void:
	var sweep_angle := fmod((Time.get_ticks_msec() / 1000.0) * 0.28 + float(_scan_revision) * 0.75, TAU)
	for trail_idx in range(5):
		var fade := 1.0 - (float(trail_idx) / 5.0)
		var angle := sweep_angle - trail_idx * 0.08
		var end := center + Vector2(cos(angle), sin(angle)) * radius
		draw_line(center, end, Color(SWEEP_COLOR.r, SWEEP_COLOR.g, SWEEP_COLOR.b, 0.12 + 0.20 * fade), 2.4 - trail_idx * 0.28)
	draw_circle(center, 4.0, Color(0.40, 0.92, 0.98, 0.72))

func _draw_solar_system(size: Vector2) -> void:
	var center = size * 0.5

	for r in _orbit_radii:
		draw_arc(center, r, 0.0, TAU, 160, Color(RING_COLOR.r, RING_COLOR.g, RING_COLOR.b, 0.22), 1.3, true)

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

func _draw_galaxy_tactical(size: Vector2) -> void:
	_draw_sector_overlays(size)
	_draw_constellation_field()
	_draw_tactical_targets()

func _draw_sector_overlays(size: Vector2) -> void:
	var sector_w = size.x / 4.0
	var sector_h = size.y / 2.0
	for sector_id in range(SectorRevealManager.SECTOR_COUNT):
		var frac: Vector2 = SectorRevealManager.SECTOR_POSITIONS.get(sector_id, Vector2(0.5, 0.5))
		var cx = frac.x * size.x
		var cy = frac.y * size.y
		var is_revealed = sector_id in _revealed_sectors
		var sector_rect = Rect2(cx - sector_w * 0.5, cy - sector_h * 0.5, sector_w, sector_h)
		var border_alpha := 0.10 if is_revealed else 0.05
		draw_rect(sector_rect, Color(RING_COLOR.r, RING_COLOR.g, RING_COLOR.b, border_alpha), false, 1.0)
		if not is_revealed:
			draw_rect(sector_rect, Color(FOG_COLOR.r, FOG_COLOR.g, FOG_COLOR.b, 0.18), true)

func _draw_constellation_field() -> void:
	for cluster_any in _constellations:
		var cluster: Dictionary = cluster_any
		var color: Color = cluster.get("color", FIELD_COLORS[0])
		var nodes: Array = cluster.get("nodes", [])
		var links: Array = cluster.get("links", [])
		for link_any in links:
			var link: Array = link_any
			if link.size() < 2:
				continue
			var start_idx := int(link[0])
			var end_idx := int(link[1])
			if start_idx >= nodes.size() or end_idx >= nodes.size():
				continue
			var start_node: Dictionary = nodes[start_idx]
			var end_node: Dictionary = nodes[end_idx]
			draw_line(start_node["pos"], end_node["pos"], Color(color.r, color.g, color.b, 0.52), 1.4)
		for node_any in nodes:
			var node: Dictionary = node_any
			var pos: Vector2 = node["pos"]
			var radius := float(node.get("r", 2.0))
			var highlight := bool(node.get("highlight", false))
			draw_circle(pos, radius + 2.0, Color(color.r, color.g, color.b, 0.12 if highlight else 0.06))
			draw_circle(pos, radius, Color(color.r, color.g, color.b, 0.94 if highlight else 0.80))

func _draw_tactical_targets() -> void:
	for target_id in _target_positions.keys():
		var entry: Dictionary = _target_positions[target_id]
		var revealed: bool = bool(entry.get("revealed", false))
		if not revealed:
			continue
		var pos: Vector2 = entry["pos"]
		var is_discovery: bool = bool(entry.get("is_discovery", false))
		var awaiting_review: bool = bool(entry.get("awaiting_review", false))
		var draw_radius = float(entry.get("radius", _last_sun_radius * 0.28))
		var star_color := _star_color_for_hash(_simple_hash(target_id))

		if awaiting_review:
			draw_circle(pos, draw_radius + 10.0, CANDIDATE_PULSE_COLOR)
			draw_arc(pos, draw_radius + 6.0, 0.0, TAU, 56, CANDIDATE_RING_COLOR, 2.0, true)
		elif is_discovery:
			draw_circle(pos, draw_radius + 4.0, Color(DISCOVERY_COLOR.r, DISCOVERY_COLOR.g, DISCOVERY_COLOR.b, 0.35))
		draw_circle(pos, draw_radius * 1.5, Color(star_color.r, star_color.g, star_color.b, 0.25))
		draw_circle(pos, draw_radius, star_color)
		draw_line(pos + Vector2(draw_radius + 4.0, 0.0), pos + Vector2(draw_radius + 22.0, 0.0), Color(0.80, 0.90, 0.98, 0.38), 1.0)
		draw_line(pos + Vector2(draw_radius + 22.0, 0.0), pos + Vector2(draw_radius + 22.0, 14.0), Color(0.80, 0.90, 0.98, 0.24), 1.0)

		if awaiting_review and _label_font:
			draw_string(_label_font, pos + Vector2(draw_radius + 4, -2), "?", HORIZONTAL_ALIGNMENT_LEFT, -1, 16, CANDIDATE_RING_COLOR)
		elif is_discovery and _label_font:
			draw_string(_label_font, pos + Vector2(draw_radius + 4, -2), "★", HORIZONTAL_ALIGNMENT_LEFT, -1, 14, DISCOVERY_COLOR)

		if _label_font:
			var label = str(entry.get("label", target_id))
			var label_color: Color
			if awaiting_review:
				label_color = CANDIDATE_RING_COLOR
			elif is_discovery:
				label_color = Color(1.0, 0.95, 0.7, 1.0)
			else:
				label_color = Color(0.85, 0.90, 0.98, 0.9)
			draw_string(_label_font, pos + Vector2(draw_radius + 2, 14), label, HORIZONTAL_ALIGNMENT_LEFT, -1, 12, label_color)
			if awaiting_review:
				draw_string(_label_font, pos + Vector2(draw_radius + 2, 28), "Awaiting Review", HORIZONTAL_ALIGNMENT_LEFT, -1, 10, Color(CANDIDATE_RING_COLOR.r, CANDIDATE_RING_COLOR.g, CANDIDATE_RING_COLOR.b, 0.8))

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
	# Planet candidates awaiting review → open annotation/classification screen
	if bool(entry.get("awaiting_review", false)):
		_open_annotation_screen(target_id, entry)
		return

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

func _open_annotation_screen(target_id: String, entry: Dictionary) -> void:
	# Close any existing overlay first
	var existing := get_node_or_null("CanvasLayer/AnnotationOverlay")
	if existing:
		existing.queue_free()
		return

	var canvas: CanvasLayer = $CanvasLayer

	# Full-screen backdrop
	var overlay := ColorRect.new()
	overlay.name = "AnnotationOverlay"
	overlay.color = Color(0.02, 0.03, 0.08, 0.98)
	overlay.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	canvas.add_child(overlay)

	# Detail view container
	var detail_view = AsteroidDetailViewScene.instantiate()
	overlay.add_child(detail_view)
	detail_view.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)

	var target_data: Dictionary = entry.get("target_data", {})
	if target_data.is_empty():
		target_data = {
			"id": target_id,
			"label": str(entry.get("label", target_id)),
			"type": str(entry.get("type", "planet")),
		}
	detail_view.initialize(target_data, true)

	if detail_view.has_signal("back_pressed"):
		detail_view.back_pressed.connect(func():
			overlay.queue_free()
			_refresh_targets()
			_rebuild_layout()
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
