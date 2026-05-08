@tool
extends Node2D
## Draws an elliptical orbit ring, visible in the Godot editor.

@export var radius_x: float = 100.0:
	set(v): radius_x = v; queue_redraw()
@export var radius_y: float = 80.0:
	set(v): radius_y = v; queue_redraw()
@export var line_color: Color = Color(0.4, 0.6, 0.8, 0.3):
	set(v): line_color = v; queue_redraw()
@export var line_width: float = 1.0:
	set(v): line_width = v; queue_redraw()
@export var is_dotted: bool = false:
	set(v): is_dotted = v; queue_redraw()
@export_range(24, 128, 1) var segments: int = 64:
	set(v): segments = v; queue_redraw()

func _draw() -> void:
	if is_dotted:
		for i in range(segments):
			if i % 4 == 3:
				continue
			var a1 := (float(i)     / float(segments)) * TAU
			var a2 := (float(i + 1) / float(segments)) * TAU
			draw_line(
				Vector2(cos(a1) * radius_x, sin(a1) * radius_y),
				Vector2(cos(a2) * radius_x, sin(a2) * radius_y),
				line_color, line_width)
	else:
		var pts := PackedVector2Array()
		pts.resize(segments + 1)
		for i in range(segments + 1):
			var a := (float(i) / float(segments)) * TAU
			pts[i] = Vector2(cos(a) * radius_x, sin(a) * radius_y)
		draw_polyline(pts, line_color, line_width, true)
