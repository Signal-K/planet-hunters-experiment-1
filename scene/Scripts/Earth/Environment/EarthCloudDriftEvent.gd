extends Node2D
class_name EarthCloudDriftEvent

@export var cloud_count: int = 8
@export_range(0.1, 1.0, 0.01) var sky_height_ratio: float = 0.58
@export_range(20.0, 240.0, 1.0) var min_speed: float = 24.0
@export_range(20.0, 240.0, 1.0) var max_speed: float = 70.0

var _clouds: Array[Dictionary] = []
var _night_factor: float = 0.0

func _ready() -> void:
	_rebuild_clouds()
	queue_redraw()

func _process(delta: float) -> void:
	if _clouds.is_empty():
		return
	var size = get_viewport_rect().size
	var wrap_width = size.x + 340.0
	for cloud in _clouds:
		cloud["x"] = float(cloud["x"]) + float(cloud["speed"]) * delta
		if float(cloud["x"]) > wrap_width:
			cloud["x"] = -float(cloud["width"]) - randf() * 200.0
	queue_redraw()

func on_day_night_tick(_cycle_t: float, night_factor: float, _delta: float) -> void:
	_night_factor = night_factor

func _draw() -> void:
	for cloud in _clouds:
		var x = float(cloud["x"])
		var y = float(cloud["y"])
		var w = float(cloud["width"])
		var h = float(cloud["height"])
		var opacity = (1.0 - (_night_factor * 0.65)) * float(cloud.get("alpha", 0.18))
		var c = Color(1.0, 1.0, 1.0, clamp(opacity, 0.0, 1.0))
		_draw_cloud_blob(Vector2(x, y), w, h, c)

func _draw_cloud_blob(center: Vector2, width: float, height: float, color: Color) -> void:
	draw_circle(center + Vector2(-width * 0.22, 0.0), height * 0.35, color)
	draw_circle(center + Vector2(0.0, -height * 0.08), height * 0.44, color)
	draw_circle(center + Vector2(width * 0.24, 0.0), height * 0.32, color)
	draw_rect(Rect2(center + Vector2(-width * 0.34, -height * 0.05), Vector2(width * 0.68, height * 0.36)), color)

func _notification(what: int) -> void:
	if what == NOTIFICATION_WM_SIZE_CHANGED:
		_rebuild_clouds()
		queue_redraw()

func _rebuild_clouds() -> void:
	_clouds.clear()
	var size = get_viewport_rect().size
	if size.x <= 0.0 or size.y <= 0.0:
		return
	var max_y = size.y * sky_height_ratio
	var rng = RandomNumberGenerator.new()
	rng.seed = 0xC10D26
	for _i in range(cloud_count):
		var w = rng.randf_range(160.0, 300.0)
		_clouds.append({
			"x": rng.randf_range(-size.x * 0.2, size.x * 1.2),
			"y": rng.randf_range(40.0, max(max_y, 41.0)),
			"width": w,
			"height": rng.randf_range(48.0, 90.0),
			"speed": rng.randf_range(min_speed, max(max_speed, min_speed + 1.0)),
			"alpha": rng.randf_range(0.10, 0.24)
		})
