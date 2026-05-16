extends Node2D

const RocketsManager = preload("res://Scripts/Utils/RocketsManager.gd")
const PanelStyle = preload("res://Scripts/UI/PanelStyle.gd")

const ASCENT_DURATION := 4.0
const NEXT_SCENE := "res://Scenes/Transitions/rocket_transit.tscn"
const SKY_GROUND := Color(0.53, 0.81, 0.98)
const SKY_SPACE := Color(0.01, 0.01, 0.04)
const HAZE_COLOR := Color(0.62, 0.86, 1.0, 0.45)
const HORIZON_COLOR := Color(0.78, 0.9, 1.0, 0.75)
const STAR_COUNT := 60

const RocketSpriteHelper = preload("res://Scripts/Utils/RocketSpriteHelper.gd")

var _altitude := 0.0
var _sky_bg: ColorRect
var _earth_sprite: Sprite2D
var _horizon_line: Line2D
var _haze_overlay: ColorRect
var _star_field: Node2D
var _rocket_sprite: AnimatedSprite2D
var _skip_button: Button
var _tween: Tween
var _transitioning := false

func _ready() -> void:
	var vp = get_viewport_rect().size
	_build_sky(vp)
	_build_earth(vp)
	_build_horizon()
	_build_haze(vp)
	_build_stars(vp)
	_build_rocket(vp)
	_build_ui()
	_start_ascent()

func _build_sky(vp: Vector2) -> void:
	_sky_bg = ColorRect.new()
	_sky_bg.size = vp
	_sky_bg.color = SKY_GROUND
	_sky_bg.z_index = -10
	add_child(_sky_bg)

func _build_earth(vp: Vector2) -> void:
	_earth_sprite = Sprite2D.new()
	_earth_sprite.texture = load("res://assets/Backdrops/Earth2.png")
	_earth_sprite.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	_earth_sprite.position = Vector2(vp.x * 0.5, vp.y * 0.72)
	_earth_sprite.scale = Vector2(3.2, 3.2)
	_earth_sprite.z_index = -5
	add_child(_earth_sprite)

func _build_haze(vp: Vector2) -> void:
	_haze_overlay = ColorRect.new()
	_haze_overlay.size = vp
	_haze_overlay.color = HAZE_COLOR
	_haze_overlay.z_index = 5
	add_child(_haze_overlay)

func _build_horizon() -> void:
	_horizon_line = Line2D.new()
	_horizon_line.width = 4.0
	_horizon_line.default_color = HORIZON_COLOR
	_horizon_line.z_index = -3
	add_child(_horizon_line)

func _build_stars(vp: Vector2) -> void:
	_star_field = Node2D.new()
	_star_field.modulate.a = 0.0
	_star_field.z_index = 2
	add_child(_star_field)
	var rng := RandomNumberGenerator.new()
	rng.seed = 12345
	for i in range(STAR_COUNT):
		var star = ColorRect.new()
		var star_size = rng.randf_range(1.5, 3.5)
		star.size = Vector2(star_size, star_size)
		star.color = Color(1.0, 1.0, 1.0, rng.randf_range(0.6, 1.0))
		star.position = Vector2(
			rng.randf_range(0.0, vp.x),
			rng.randf_range(0.0, vp.y * 0.72)
		)
		_star_field.add_child(star)

func _build_rocket(vp: Vector2) -> void:
	_rocket_sprite = AnimatedSprite2D.new()
	var rm = RocketsManager
	var rocket_id := ""
	if rm:
		var preview = rm.get_preview_target()
		rocket_id = str(preview.get("rocket_id", ""))
	RocketSpriteHelper.apply_launch_sprite(_rocket_sprite, rocket_id)
	_rocket_sprite.position = Vector2(vp.x * 0.5, vp.y * 0.65)
	_rocket_sprite.scale = Vector2(1.5, 1.5)
	_rocket_sprite.rotation = 0.08
	_rocket_sprite.z_index = 10
	add_child(_rocket_sprite)

func _build_ui() -> void:
	var ui_layer = CanvasLayer.new()
	ui_layer.layer = 100
	add_child(ui_layer)
	_skip_button = Button.new()
	_skip_button.text = "Skip"
	_skip_button.custom_minimum_size = Vector2(80, 36)
	var panel_style = PanelStyle
	panel_style.apply_button(_skip_button, false)
	_skip_button.pressed.connect(_on_skip_pressed)
	ui_layer.add_child(_skip_button)
	_position_skip_button()

func _start_ascent() -> void:
	_tween = create_tween()
	_tween.tween_property(self, "_altitude", 1.0, ASCENT_DURATION)\
		.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	_tween.finished.connect(_on_ascent_complete)

func _process(_delta: float) -> void:
	if _transitioning:
		return
	var vp = get_viewport_rect().size
	_sky_bg.size = vp
	_haze_overlay.size = vp
	_sky_bg.color = SKY_GROUND.lerp(SKY_SPACE, _altitude)
	var haze_alpha = lerp(HAZE_COLOR.a, 0.0, _altitude)
	_haze_overlay.color = Color(HAZE_COLOR.r, HAZE_COLOR.g, HAZE_COLOR.b, haze_alpha)
	var star_t = clamp((_altitude - 0.35) / 0.65, 0.0, 1.0)
	_star_field.modulate.a = lerp(0.0, 1.0, star_t)
	_earth_sprite.position = Vector2(vp.x * 0.5, lerp(vp.y * 0.72, vp.y * 1.4, _altitude))
	_earth_sprite.scale = Vector2.ONE * lerp(3.2, 0.4, _altitude)
	_update_horizon(vp)
	_rocket_sprite.position = Vector2(vp.x * 0.5, lerp(vp.y * 0.65, vp.y * 0.22, _altitude))
	_rocket_sprite.scale = Vector2.ONE * lerp(1.5, 0.3, _altitude)
	_rocket_sprite.rotation = lerp(0.08, 0.0, _altitude)
	_position_skip_button()

func _position_skip_button() -> void:
	if _skip_button == null:
		return
	var vp = get_viewport_rect().size
	_skip_button.position = Vector2(vp.x - 144.0, 16.0)
	_skip_button.size = Vector2(96.0, 36.0)

func _update_horizon(vp: Vector2) -> void:
	if _horizon_line == null:
		return
	var curve_t = clamp((_altitude - 0.25) / 0.75, 0.0, 1.0)
	_horizon_line.visible = curve_t > 0.01
	if not _horizon_line.visible:
		return
	var base_y = lerp(vp.y * 0.72, vp.y * 0.92, _altitude)
	var curvature = lerp(0.0, vp.y * 0.08, curve_t)
	var points: PackedVector2Array = []
	var segments := 28
	for i in range(segments + 1):
		var t = float(i) / float(segments)
		var x = t * vp.x
		var x_norm = (t - 0.5) * 2.0
		var y = base_y + curvature * x_norm * x_norm
		points.append(Vector2(x, y))
	_horizon_line.points = points
	_horizon_line.modulate.a = lerp(0.0, HORIZON_COLOR.a, curve_t)

func _on_ascent_complete() -> void:
	_transition_to_transit()

func _on_skip_pressed() -> void:
	if _transitioning:
		return
	_altitude = 1.0
	if _tween and _tween.is_valid():
		_tween.kill()
	call_deferred("_transition_to_transit")

func _transition_to_transit() -> void:
	if _transitioning:
		return
	_transitioning = true
	var tree = get_tree()
	if tree == null:
		return
	var sm = tree.get_first_node_in_group("scene_manager")
	if sm and sm.has_method("change_to_scene"):
		sm.change_to_scene(NEXT_SCENE)
	else:
		tree.change_scene_to_file(NEXT_SCENE)