@tool
extends Node2D
## Draws a single star-system node on the galaxy map. Editor-visible.
## Works for background stars and runtime-placed game targets alike.

@export var star_name: String = "":
	set(v): star_name = v; queue_redraw()
@export var distance_label: String = "":
	set(v): distance_label = v; queue_redraw()
@export var star_color: Color = Color(0.745, 0.776, 0.882, 1.0):
	set(v): star_color = v; queue_redraw()
@export var star_radius: float = 6.0:
	set(v): star_radius = v; queue_redraw()
@export var is_selected: bool = false:
	set(v): is_selected = v; queue_redraw()
@export var is_sol: bool = false:
	set(v): is_sol = v; queue_redraw()
@export var is_candidate: bool = false:
	set(v): is_candidate = v; queue_redraw()
@export var awaiting_review: bool = false:
	set(v): awaiting_review = v; queue_redraw()

const _STEPS := 32

func _draw() -> void:
	var col := star_color
	var r   := star_radius
	var font := ThemeDB.fallback_font
	if font == null:
		return

	# Candidate ring
	if is_candidate:
		if awaiting_review:
			draw_arc(Vector2.ZERO, r + 9.0, 0.0, TAU, 56,
				Color(0.28, 0.88, 0.96, 0.55), 2.0)
		draw_circle(Vector2.ZERO, r + 4.0, Color(col.r, col.g, col.b, 0.18))

	# Sol spinning orbit hint
	if is_sol:
		draw_arc(Vector2.ZERO, r * 2.2, 0.0, TAU, 64,
			Color(col.r, col.g, col.b, 0.28), 0.8)

	# Selection brackets
	if is_selected:
		var box := r + 11.0
		var bl  := box * 0.46
		for sx in [-1.0, 1.0]:
			for sy in [-1.0, 1.0]:
				var cx := float(sx) * box
				var cy := float(sy) * box
				draw_line(Vector2(cx, cy), Vector2(cx - float(sx) * bl, cy),
					Color(col.r, col.g, col.b, 0.90), 1.5)
				draw_line(Vector2(cx, cy), Vector2(cx, cy - float(sy) * bl),
					Color(col.r, col.g, col.b, 0.90), 1.5)
		draw_circle(Vector2.ZERO, r * 2.4, Color(col.r, col.g, col.b, 0.10))

	# Glow + dot
	draw_circle(Vector2.ZERO, r * 1.8, Color(col.r, col.g, col.b, 0.18))
	draw_circle(Vector2.ZERO, r, col)

	# Labels
	var dim := 0.68 if not is_selected else 0.95
	if star_name != "":
		var sz := 12 if is_selected else 11
		draw_string(font, Vector2(r + 5.0, 4.0), star_name.to_upper(),
			HORIZONTAL_ALIGNMENT_LEFT, -1, sz,
			Color(col.r, col.g, col.b, dim))
	if distance_label != "":
		draw_string(font, Vector2(r + 5.0, 16.0), distance_label,
			HORIZONTAL_ALIGNMENT_LEFT, -1, 9,
			Color(col.r, col.g, col.b, dim * 0.65))
