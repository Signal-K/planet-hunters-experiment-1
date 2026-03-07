extends Node2D
class_name EarthSkyMapEvent

@export_range(0.0, 1.0, 0.01) var show_from_night: float = 0.24
@export_range(0.0, 1.0, 0.01) var max_alpha: float = 0.55
@export_range(0.1, 1.0, 0.01) var sky_height_ratio: float = 0.62

var _night_factor: float = 0.0
var _anchors: Array[Vector2] = []
var _chains: Array[PackedInt32Array] = []

func _ready() -> void:
	_rebuild_layout()
	queue_redraw()

func on_day_night_tick(_cycle_t: float, night_factor: float, _delta: float) -> void:
	_night_factor = night_factor
	var visible_t = clamp((_night_factor - show_from_night) / max(1.0 - show_from_night, 0.001), 0.0, 1.0)
	visible = visible_t > 0.01
	queue_redraw()

func _draw() -> void:
	if _anchors.is_empty():
		return
	var visible_t = clamp((_night_factor - show_from_night) / max(1.0 - show_from_night, 0.001), 0.0, 1.0)
	if visible_t <= 0.0:
		return
	var line_color = Color(0.64, 0.74, 0.96, max_alpha * 0.7 * visible_t)
	var star_color = Color(0.86, 0.92, 1.0, max_alpha * visible_t)
	for chain in _chains:
		for i in range(chain.size() - 1):
			var a = int(chain[i])
			var b = int(chain[i + 1])
			if a >= 0 and a < _anchors.size() and b >= 0 and b < _anchors.size():
				draw_line(_anchors[a], _anchors[b], line_color, 1.4)
	for anchor in _anchors:
		draw_circle(anchor, 1.8, star_color)

func _notification(what: int) -> void:
	if what == NOTIFICATION_WM_SIZE_CHANGED:
		_rebuild_layout()
		queue_redraw()

func _rebuild_layout() -> void:
	_anchors.clear()
	_chains.clear()
	var size = get_viewport_rect().size
	if size.x <= 0.0 or size.y <= 0.0:
		return
	var sky_h = size.y * sky_height_ratio
	var points = [
		Vector2(0.10, 0.18), Vector2(0.16, 0.14), Vector2(0.23, 0.19), Vector2(0.28, 0.13),
		Vector2(0.57, 0.10), Vector2(0.63, 0.16), Vector2(0.68, 0.11), Vector2(0.73, 0.17),
		Vector2(0.42, 0.22), Vector2(0.47, 0.27), Vector2(0.52, 0.23), Vector2(0.58, 0.29)
	]
	for p in points:
		_anchors.append(Vector2(p.x * size.x, p.y * sky_h))
	_chains = [
		PackedInt32Array([0, 1, 2, 3]),
		PackedInt32Array([4, 5, 6, 7]),
		PackedInt32Array([8, 9, 10, 11])
	]
