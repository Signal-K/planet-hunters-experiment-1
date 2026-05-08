@tool
extends Node2D
## Draws a moon's local orbit ring, dot, and label around its parent planet. Editor-visible.

@export var orbit_radius: float = 16.0:
	set(v): orbit_radius = v; queue_redraw()
@export var moon_radius: float = 3.0:
	set(v): moon_radius = v; queue_redraw()
@export var moon_angle: float = 0.5:
	set(v): moon_angle = v; queue_redraw()
@export var moon_label: String = "":
	set(v): moon_label = v; queue_redraw()
@export var moon_color: Color = Color(0.50, 0.52, 0.56, 0.85):
	set(v): moon_color = v; queue_redraw()

func _draw() -> void:
	var col := moon_color
	# Orbit arc
	draw_arc(Vector2.ZERO, orbit_radius, 0.0, TAU, 32,
		Color(col.r, col.g, col.b, 0.32), 0.8)
	# Moon dot
	var mpos := Vector2(cos(moon_angle) * orbit_radius, sin(moon_angle) * orbit_radius)
	draw_circle(mpos, moon_radius, col)
	# Label
	var font := ThemeDB.fallback_font
	if font and moon_label != "":
		draw_string(font, mpos + Vector2(moon_radius + 2.0, 3.0), moon_label,
			HORIZONTAL_ALIGNMENT_LEFT, -1, 8, Color(col.r, col.g, col.b, 0.65))
