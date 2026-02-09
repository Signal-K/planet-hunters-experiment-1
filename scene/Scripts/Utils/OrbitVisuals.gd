extends RefCounted
class_name OrbitVisuals

static func build_orbit_circle(line: Line2D, radius: float, segments: int) -> void:
	if line == null:
		return
	var points := PackedVector2Array()
	for i in range(segments + 1):
		var t = float(i) / float(segments) * TAU
		points.append(Vector2(cos(t), sin(t)) * radius)
	line.points = points

static func update_heading_line(line: Line2D, rocket: Node2D, start_offset: float = 24.0, end_offset: float = 74.0) -> void:
	if line == null or rocket == null:
		return
	line.visible = true
	var dir = Vector2(0, -1).rotated(rocket.rotation)
	var start = rocket.position + dir * start_offset
	var end = rocket.position + dir * end_offset
	line.points = PackedVector2Array([start, end])
