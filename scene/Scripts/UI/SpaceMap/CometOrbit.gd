@tool
extends Node2D
## Draws an eccentric comet orbit arc (near-parabolic). Editor-visible.

@export var semi_latus_rectum: float = 170.0:
	set(v): semi_latus_rectum = v; queue_redraw()
@export var eccentricity: float = 0.992:
	set(v): eccentricity = v; queue_redraw()
@export var perihelion_angle: float = -2.0:
	set(v): perihelion_angle = v; queue_redraw()
@export var y_flatten: float = 0.82:
	set(v): y_flatten = v; queue_redraw()
@export_range(0.3, 3.14, 0.05) var arc_half_angle: float = 2.1:
	set(v): arc_half_angle = v; queue_redraw()
@export var line_color: Color = Color(0.80, 0.90, 1.00, 0.24):
	set(v): line_color = v; queue_redraw()
@export var tail_color: Color = Color(0.80, 0.90, 1.00, 0.60):
	set(v): tail_color = v; queue_redraw()
@export var max_reach: float = 680.0:
	set(v): max_reach = v; queue_redraw()
@export var comet_label: String = "Hale-Bopp":
	set(v): comet_label = v; queue_redraw()

const _STEPS := 72

func _draw() -> void:
	var e := eccentricity
	var p := semi_latus_rectum
	var pa := perihelion_angle
	var pts := PackedVector2Array()
	pts.resize(_STEPS + 1)
	for i in range(_STEPS + 1):
		var theta: float = lerp(-arc_half_angle, arc_half_angle, float(i) / float(_STEPS))
		var r: float = minf(p / (1.0 + e * cos(theta)), max_reach)
		var a: float = theta + pa
		pts[i] = Vector2(cos(a) * r, sin(a) * r * y_flatten)
	draw_polyline(pts, line_color, 1.2, false)

	# Comet icon at perihelion
	var peri_r := p / (1.0 + e)
	var ppos   := Vector2(cos(pa) * peri_r, sin(pa) * peri_r * y_flatten)
	draw_circle(ppos, 4.0, tail_color)

	# Tail pointing away from origin (Sol)
	var away := -ppos.normalized()
	draw_line(ppos, ppos + away * 18.0, tail_color, 2.0)
	draw_line(ppos, ppos + away.rotated(0.26) * 12.0, Color(tail_color.r, tail_color.g, tail_color.b, 0.45), 1.5)
	draw_line(ppos, ppos + away.rotated(-0.26) * 10.0, Color(tail_color.r, tail_color.g, tail_color.b, 0.35), 1.2)

	# Label
	var font := ThemeDB.fallback_font
	if font and comet_label != "":
		draw_string(font, ppos + Vector2(6.0, -4.0), comet_label,
			HORIZONTAL_ALIGNMENT_LEFT, -1, 9,
			Color(tail_color.r, tail_color.g, tail_color.b, 0.80))
