@tool
extends Node2D
## Draws a single planet/body icon (circle outline + symbol + label), visible in editor.

@export var label_text: String = "":
	set(v): label_text = v; queue_redraw()
@export var icon_color: Color = Color(0.5, 0.7, 0.9, 1.0):
	set(v): icon_color = v; queue_redraw()
@export var icon_radius: float = 8.0:
	set(v): icon_radius = v; queue_redraw()
@export var symbol: String = "":
	set(v): symbol = v; queue_redraw()
@export var is_home: bool = false:
	set(v): is_home = v; queue_redraw()
@export var is_star: bool = false:
	set(v): is_star = v; queue_redraw()
@export var has_ring: bool = false:
	set(v): has_ring = v; queue_redraw()
@export var label_size: int = 12:
	set(v): label_size = v; queue_redraw()

const _CIRCLE_STEPS := 32

func _draw() -> void:
	var col := icon_color
	var r   := icon_radius
	var font := ThemeDB.fallback_font
	if font == null:
		return

	if is_star:
		# Sol: multilayer glow + filled circle
		draw_circle(Vector2.ZERO, r * 2.8, Color(col.r, col.g, col.b, 0.12))
		draw_circle(Vector2.ZERO, r * 1.8, Color(col.r, col.g, col.b, 0.20))
		draw_circle(Vector2.ZERO, r,       col)
		if label_text != "":
			draw_string(font, Vector2(-r * 0.3, r * 0.35), label_text if symbol == "" else symbol,
				HORIZONTAL_ALIGNMENT_CENTER, -1, int(r * 0.9), Color(0.1, 0.06, 0.02, 0.9))
		draw_string(font, Vector2(r + 5.0, 5.0), label_text,
			HORIZONTAL_ALIGNMENT_LEFT, -1, label_size, Color(col.r, col.g, col.b, 0.85))
		return

	if is_home:
		# Earth: selection glow + bracket marks
		draw_circle(Vector2.ZERO, r * 2.4, Color(col.r, col.g, col.b, 0.10))
		draw_circle(Vector2.ZERO, r * 1.6, Color(col.r, col.g, col.b, 0.14))
		var box := r + 8.0
		var bl  := box * 0.50
		for sx in [-1.0, 1.0]:
			for sy in [-1.0, 1.0]:
				var cx: float = float(sx) * box
				var cy: float = float(sy) * box
				draw_line(Vector2(cx, cy), Vector2(cx - float(sx) * bl, cy), col, 2.0)
				draw_line(Vector2(cx, cy), Vector2(cx, cy - float(sy) * bl), col, 2.0)
	else:
		draw_circle(Vector2.ZERO, r * 1.5, Color(col.r, col.g, col.b, 0.08))

	# Circle outline
	var pts := PackedVector2Array()
	pts.resize(_CIRCLE_STEPS + 1)
	for i in range(_CIRCLE_STEPS + 1):
		var a := (float(i) / float(_CIRCLE_STEPS)) * TAU
		pts[i] = Vector2(cos(a) * r, sin(a) * r)
	draw_polyline(pts, col, 1.5, true)

	# Saturn ring band
	if has_ring:
		var rpts := PackedVector2Array()
		rpts.resize(_CIRCLE_STEPS + 1)
		for i in range(_CIRCLE_STEPS + 1):
			var a := (float(i) / float(_CIRCLE_STEPS)) * TAU
			rpts[i] = Vector2(cos(a) * (r * 1.85), sin(a) * (r * 0.55))
		draw_polyline(rpts, Color(col.r, col.g, col.b, 0.55), 2.0, true)

	# Symbol inside circle
	if symbol != "":
		var sym_size := maxi(int(r * 1.05), 7)
		draw_string(font, Vector2(-r * 0.36, r * 0.35), symbol,
			HORIZONTAL_ALIGNMENT_CENTER, -1, sym_size, col)

	# Name label to the right
	if label_text != "":
		var lbl_col := col if is_home else Color(col.r, col.g, col.b, 0.88)
		draw_string(font, Vector2(r + 5.0, 5.0), label_text,
			HORIZONTAL_ALIGNMENT_LEFT, -1, label_size, lbl_col)
