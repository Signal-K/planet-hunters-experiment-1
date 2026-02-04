extends Node2D

const PREVIEW_SCENE_PATH := "res://Scenes/UI/AsteroidPreview/asteroid_preview.tscn"
const SKY_TOP := Color(0.45, 0.72, 0.98, 1.0)
const SKY_BOTTOM := Color(0.70, 0.88, 1.0, 1.0)
const SPACE_TOP := Color(0.03, 0.03, 0.07, 1.0)
const SPACE_BOTTOM := Color(0.0, 0.0, 0.0, 1.0)

const RISE_TIME := 2.2
const PULL_TIME := 1.6
const TOTAL_TIME := RISE_TIME + PULL_TIME

@onready var background: TextureRect = $Background
@onready var rocket_container: Node2D = $RocketContainer
@onready var rocket: Sprite2D = $RocketContainer/Rocket
@onready var status_label: Label = $UI/StatusLabel

var _gradient := Gradient.new()
var _gradient_texture := GradientTexture2D.new()
var _elapsed := 0.0
var _last_size := Vector2.ZERO
var _start_pos := Vector2.ZERO
var _mid_pos := Vector2.ZERO
var _end_pos := Vector2.ZERO

func _ready() -> void:
	_setup_background()
	_setup_label()
	_recalculate_layout()
	_start_animation()

func _process(delta: float) -> void:
	_elapsed += delta
	_update_background(_elapsed / max(TOTAL_TIME, 0.001))
	_update_label()
	var size = get_viewport_rect().size
	if size != _last_size:
		_recalculate_layout()

func _setup_background() -> void:
	if background == null:
		return
	background.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_gradient.offsets = PackedFloat32Array([0.0, 1.0])
	_gradient_texture.gradient = _gradient
	background.texture = _gradient_texture
	background.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	background.stretch_mode = TextureRect.STRETCH_SCALE

func _setup_label() -> void:
	if status_label == null:
		return
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if rm:
		var target = rm.get_preview_target()
		var label = str(target.get("label", ""))
		if label != "":
			status_label.text = "En route to %s" % label
		else:
			status_label.text = "Entering orbit..."
	status_label.position = Vector2(24, 24)
	status_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	status_label.vertical_alignment = VERTICAL_ALIGNMENT_TOP
	var panel_style = preload("res://Scripts/UI/PanelStyle.gd")
	panel_style.apply_title(status_label)

func _recalculate_layout() -> void:
	_last_size = get_viewport_rect().size
	var center = _last_size * 0.5
	_start_pos = Vector2(center.x, _last_size.y * 0.78)
	_mid_pos = Vector2(center.x + 28.0, _last_size.y * 0.45)
	_end_pos = Vector2(center.x - 14.0, _last_size.y * 0.26)
	if rocket_container:
		rocket_container.position = _start_pos
	if rocket:
		rocket.scale = Vector2(4.2, 4.2)

func _start_animation() -> void:
	if rocket_container == null:
		return
	var tween = get_tree().create_tween()
	tween.tween_property(rocket_container, "position", _mid_pos, RISE_TIME)\
		.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)
	tween.parallel().tween_property(rocket_container, "scale", Vector2(3.2, 3.2), RISE_TIME)\
		.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)
	tween.tween_property(rocket_container, "position", _end_pos, PULL_TIME)\
		.set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_IN)
	tween.parallel().tween_property(rocket_container, "scale", Vector2(2.0, 2.0), PULL_TIME)\
		.set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_IN)
	tween.tween_callback(Callable(self, "_advance_to_preview"))

func _update_background(t: float) -> void:
	var pct = clamp(t, 0.0, 1.0)
	var top = SKY_TOP.lerp(SPACE_TOP, pct)
	var bottom = SKY_BOTTOM.lerp(SPACE_BOTTOM, pct)
	_gradient.colors = PackedColorArray([top, bottom])
	_gradient_texture.gradient = _gradient

func _update_label() -> void:
	if status_label == null:
		return
	var pct = clamp(_elapsed / max(TOTAL_TIME, 0.001), 0.0, 1.0)
	status_label.modulate.a = 1.0 - clamp((pct - 0.6) / 0.4, 0.0, 1.0)

func _advance_to_preview() -> void:
	var tree = Engine.get_main_loop() as SceneTree
	if tree == null:
		return
	var scene_manager = null
	if tree.current_scene:
		scene_manager = tree.current_scene.get_node_or_null("SceneManager")
	if scene_manager and scene_manager.has_method("change_to_scene"):
		scene_manager.change_to_scene(PREVIEW_SCENE_PATH)
	else:
		tree.change_scene_to_file(PREVIEW_SCENE_PATH)
