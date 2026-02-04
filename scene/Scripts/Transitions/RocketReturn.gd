extends Node2D

const RETURN_DESTINATION := "res://Scenes/Earth/mission_debrief.tscn"
const SKY_TOP := Color(0.45, 0.72, 0.98, 1.0)
const SKY_BOTTOM := Color(0.70, 0.88, 1.0, 1.0)
const SPACE_TOP := Color(0.03, 0.03, 0.07, 1.0)
const SPACE_BOTTOM := Color(0.0, 0.0, 0.0, 1.0)

const ORBIT_TIME := 1.1
const ESCAPE_TIME := 1.8
const DESCEND_TIME := 1.6

const LAUNCH_SPRITESHEET = preload("res://assets/Vehicles/StarterRocket1LaunchSpritesheet.png")
const LAUNCH_COLUMNS := 6
const LAUNCH_ROWS := 6
const LAUNCH_COL_BOUNDS := [0, 170, 341, 512, 682, 853, 1024]
const LAUNCH_ROW_BOUNDS := [0, 256, 512, 768, 1024, 1280, 1536]
const LAUNCH_FRAME_COUNT := LAUNCH_COLUMNS * LAUNCH_ROWS

@onready var background: TextureRect = $Background
@onready var rocket_container: Node2D = $RocketContainer
@onready var rocket: Sprite2D = $RocketContainer/Rocket
@onready var status_label: Label = $UI/StatusLabel

var _gradient := Gradient.new()
var _gradient_texture := GradientTexture2D.new()
var _elapsed := 0.0
var _orbit_angle := 0.0
var _orbiting := true
var _escape_started := false
var _last_size := Vector2.ZERO
var _orbit_center := Vector2.ZERO
var _orbit_radius := 120.0
var _escape_pos := Vector2.ZERO
var _final_pos := Vector2.ZERO
var _earth_pos := Vector2.ZERO
var _earth_radius := 40.0
var _earth_orbit_radius := 80.0
var _frame_index := 0
var _frame_timer := 0.0
var _frame_time := 0.06

func _ready() -> void:
	_setup_background()
	_setup_label()
	_recalculate_layout()
	_apply_launch_frame(_frame_index)

func _process(delta: float) -> void:
	_elapsed += delta
	_update_background()
	_update_flames(delta)
	if _orbiting:
		_orbit_angle += delta * 2.1
		if rocket_container:
			rocket_container.position = _orbit_center + Vector2(cos(_orbit_angle), sin(_orbit_angle)) * _orbit_radius
	if _elapsed >= ORBIT_TIME and not _escape_started:
		_start_escape()
	var size = get_viewport_rect().size
	if size != _last_size:
		_recalculate_layout()
	queue_redraw()

func _draw() -> void:
	if _last_size == Vector2.ZERO:
		return
	draw_circle(_earth_pos, _earth_radius, Color(0.35, 0.65, 0.95, 1.0))
	draw_arc(_earth_pos, _earth_orbit_radius, 0.0, TAU, 160, Color(0.65, 0.75, 0.9, 0.35), 2.0, true)

func _setup_background() -> void:
	if background == null:
		return
	background.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	background.z_index = -10
	_gradient.offsets = PackedFloat32Array([0.0, 1.0])
	_gradient_texture.gradient = _gradient
	background.texture = _gradient_texture
	background.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	background.stretch_mode = TextureRect.STRETCH_SCALE
	_gradient.colors = PackedColorArray([SPACE_TOP, SPACE_BOTTOM])

func _setup_label() -> void:
	if status_label == null:
		return
	status_label.text = "Returning to Earth..."
	status_label.position = Vector2(24, 24)
	status_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	status_label.vertical_alignment = VERTICAL_ALIGNMENT_TOP
	var panel_style = preload("res://Scripts/UI/PanelStyle.gd")
	panel_style.apply_title(status_label)

func _recalculate_layout() -> void:
	_last_size = get_viewport_rect().size
	var center = _last_size * 0.5
	_orbit_center = center
	_orbit_radius = min(_last_size.x, _last_size.y) * 0.12
	_escape_pos = Vector2(center.x + 24.0, _last_size.y * 0.42)
	_final_pos = Vector2(center.x, _last_size.y * 0.72)
	_earth_pos = Vector2(center.x, _last_size.y * 0.82)
	_earth_radius = min(_last_size.x, _last_size.y) * 0.08
	_earth_orbit_radius = _earth_radius * 1.9
	if rocket_container:
		if _orbiting:
			rocket_container.position = _orbit_center + Vector2(cos(_orbit_angle), sin(_orbit_angle)) * _orbit_radius
		rocket_container.scale = Vector2(2.2, 2.2)
	if rocket_container:
		rocket_container.z_index = 10
	if status_label:
		status_label.z_index = 30

func _start_escape() -> void:
	_escape_started = true
	_orbiting = false
	if rocket_container == null:
		return
	var tween = get_tree().create_tween()
	tween.tween_property(rocket_container, "position", _escape_pos, ESCAPE_TIME)\
		.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)
	tween.parallel().tween_property(rocket_container, "scale", Vector2(3.2, 3.2), ESCAPE_TIME)\
		.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)
	tween.tween_property(rocket_container, "position", _final_pos, DESCEND_TIME)\
		.set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_IN)
	tween.parallel().tween_property(rocket_container, "scale", Vector2(4.2, 4.2), DESCEND_TIME)\
		.set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_IN)
	tween.tween_callback(Callable(self, "_advance_to_base"))

func _update_background() -> void:
	var travel_time = ESCAPE_TIME + DESCEND_TIME
	var pct = clamp((_elapsed - ORBIT_TIME) / max(travel_time, 0.001), 0.0, 1.0)
	var top = SPACE_TOP.lerp(SKY_TOP, pct)
	var bottom = SPACE_BOTTOM.lerp(SKY_BOTTOM, pct)
	_gradient.colors = PackedColorArray([top, bottom])
	_gradient_texture.gradient = _gradient

func _update_flames(delta: float) -> void:
	_frame_timer += delta
	if _frame_timer < _frame_time:
		return
	_frame_timer = 0.0
	_frame_index = (_frame_index + 1) % LAUNCH_FRAME_COUNT
	_apply_launch_frame(_frame_index)

func _apply_launch_frame(frame_index: int) -> void:
	if rocket == null:
		return
	var base_size = Vector2.ZERO
	if rocket.texture:
		base_size = rocket.texture.get_size()
	rocket.texture = _make_launch_frame_texture(frame_index)
	var frame_size = rocket.texture.get_size()
	if base_size != Vector2.ZERO and frame_size.y > 0:
		var scale_factor = base_size.y / frame_size.y
		rocket.scale = Vector2(1.0, 1.0) * scale_factor

func _make_launch_frame_texture(frame_index: int) -> AtlasTexture:
	var atlas := AtlasTexture.new()
	atlas.atlas = LAUNCH_SPRITESHEET
	atlas.region = _get_launch_frame_region(frame_index)
	return atlas

func _get_launch_frame_region(frame_index: int) -> Rect2i:
	var col := frame_index % LAUNCH_COLUMNS
	var row := int(frame_index / LAUNCH_COLUMNS)
	var x0: int = int(LAUNCH_COL_BOUNDS[col])
	var x1: int = int(LAUNCH_COL_BOUNDS[col + 1])
	var y0: int = int(LAUNCH_ROW_BOUNDS[row])
	var y1: int = int(LAUNCH_ROW_BOUNDS[row + 1])
	return Rect2i(x0, y0, x1 - x0, y1 - y0)

func _advance_to_base() -> void:
	var tree = Engine.get_main_loop() as SceneTree
	if tree == null:
		return
	var scene_manager = null
	if tree.current_scene:
		scene_manager = tree.current_scene.get_node_or_null("SceneManager")
	if scene_manager and scene_manager.has_method("change_to_scene"):
		scene_manager.change_to_scene(RETURN_DESTINATION)
	else:
		tree.change_scene_to_file(RETURN_DESTINATION)
