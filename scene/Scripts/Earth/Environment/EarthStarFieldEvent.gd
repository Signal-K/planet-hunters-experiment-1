extends Node2D
class_name EarthStarFieldEvent

@export var star_count: int = 110
@export_range(0.1, 1.0, 0.01) var sky_height_ratio: float = 0.62
@export_range(0.0, 1.0, 0.01) var max_alpha: float = 0.95
@export_range(0.0, 2.0, 0.01) var twinkle_speed: float = 0.55

var _stars: Array[Dictionary] = []
var _night_factor: float = 0.0
var _twinkle_t: float = 0.0

func _ready() -> void:
	_rebuild_stars()
	queue_redraw()

func _process(delta: float) -> void:
	_twinkle_t += delta * twinkle_speed
	if _night_factor > 0.01:
		queue_redraw()

func on_day_night_tick(_cycle_t: float, night_factor: float, _delta: float) -> void:
	_night_factor = night_factor
	visible = night_factor > 0.02
	queue_redraw()

func _draw() -> void:
	if _night_factor <= 0.01:
		return
	for i in range(_stars.size()):
		var star = _stars[i]
		var phase = float(star.get("phase", 0.0))
		var base_alpha = float(star.get("alpha", 1.0))
		var twinkle = 0.7 + 0.3 * sin(_twinkle_t + phase)
		var alpha = clamp(_night_factor * max_alpha * base_alpha * twinkle, 0.0, 1.0)
		var color = Color(0.9, 0.95, 1.0, alpha)
		draw_circle(star["pos"], float(star["radius"]), color)

func _notification(what: int) -> void:
	if what == NOTIFICATION_WM_SIZE_CHANGED:
		_rebuild_stars()
		queue_redraw()

func _rebuild_stars() -> void:
	_stars.clear()
	var size = get_viewport_rect().size
	if size.x <= 0.0 or size.y <= 0.0:
		return
	var sky_h = size.y * sky_height_ratio
	var rng = RandomNumberGenerator.new()
	rng.seed = 0xEA7126
	for _i in range(star_count):
		_stars.append({
			"pos": Vector2(rng.randf_range(0.0, size.x), rng.randf_range(0.0, sky_h)),
			"radius": rng.randf_range(0.6, 1.9),
			"alpha": rng.randf_range(0.55, 1.0),
			"phase": rng.randf_range(0.0, TAU)
		})
