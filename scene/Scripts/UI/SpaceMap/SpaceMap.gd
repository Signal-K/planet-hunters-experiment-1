extends Node2D

const ORBIT_COUNT := 6
const STAR_COUNT := 220
const SUN_COLOR := Color(0.98, 0.92, 0.65, 1)
const EARTH_COLOR := Color(0.35, 0.65, 0.95, 1)
const ASTEROID_COLOR := Color(0.72, 0.72, 0.72, 1)
const PLANET_COLOR := Color(0.55, 0.85, 0.55, 1)
const ORBIT_COLOR := Color(0.6, 0.65, 0.75, 0.35)
const STAR_COLOR := Color(0.9, 0.9, 0.9, 0.8)

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

const EARTH_CLICK_RADIUS := 26.0
const TARGET_CLICK_RADIUS := 22.0

@onready var back_button: Button = $CanvasLayer/UI/BackButton

func _ready() -> void:
	if back_button:
		back_button.pressed.connect(_on_back_pressed)
		preload("res://Scripts/UI/PanelStyle.gd").apply_button(back_button, false)
	set_process_unhandled_input(true)
	set_process_input(true)
	_label_font = ThemeDB.fallback_font
	_ignore_click_until = Time.get_ticks_msec() + 200
	_refresh_targets()
	_rebuild_layout()

func _process(_delta: float) -> void:
	var size = get_viewport_rect().size
	if size != _last_size:
		_rebuild_layout()

func _refresh_targets() -> void:
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if rm:
		_targets = rm.get_detected_targets()
	else:
		_targets = []

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
		var hash_util = preload("res://Scripts/Utils/HashUtils.gd")
		var seed = hash_util.simple_hash(target_id)
		var rng = RandomNumberGenerator.new()
		rng.seed = seed
		var angle = rng.randf_range(0.0, TAU)
		var ring = _ring_for_target(seed, target_type)
		var radius = _orbit_radii[ring] + rng.randf_range(-8.0, 8.0)
		var draw_radius = _last_sun_radius * (0.28 if target_type == "planet" else 0.18)
		_target_positions[target_id] = {
			"pos": Vector2(cos(angle), sin(angle)) * radius,
			"type": target_type,
			"label": str(t.get("label", target_id)),
			"radius": draw_radius
		}

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

	# Draw nebula gradient background covering the full viewport rect (including
	# any negative origin offset from canvas_items+expand stretch mode)
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

	for target_id in _target_positions.keys():
		var entry = _target_positions[target_id]
		var pos = center + entry["pos"]
		var t = str(entry.get("type", "asteroid"))
		var color = PLANET_COLOR if t == "planet" else ASTEROID_COLOR
		var radius = float(entry.get("radius", sun_r * 0.18))
		draw_circle(pos, radius, color)
		draw_string(_label_font, pos + Vector2(10, -10), str(entry.get("label", target_id)), HORIZONTAL_ALIGNMENT_LEFT, -1, 16, Color(0.95, 0.95, 0.98, 0.95))

func _input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		if Time.get_ticks_msec() < _ignore_click_until:
			return
		_handle_click(event.position)

func _handle_click(pos: Vector2) -> void:
	if _earth_pos != Vector2.ZERO and pos.distance_to(_earth_pos) <= max(EARTH_CLICK_RADIUS, _earth_radius):
		_change_scene_to_base()
		return
	for target_id in _target_positions.keys():
		var entry = _target_positions[target_id]
		var center = _last_size * 0.5
		var target_pos = center + entry["pos"]
		var radius = float(entry.get("radius", TARGET_CLICK_RADIUS))
		if pos.distance_to(target_pos) <= max(TARGET_CLICK_RADIUS, radius):
			_open_target_preview(target_id, entry)
			return

func _open_target_preview(target_id: String, entry: Dictionary) -> void:
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if rm:
		rm.set_preview_target(
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
