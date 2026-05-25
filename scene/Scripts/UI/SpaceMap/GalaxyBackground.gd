@tool
extends Node2D
## Galaxy map background: nebula haze, tactical grid, constellation lines, edge greeblies.
## Positions mirror the baked GalaxyLayer/Stars/* node positions (base 1920×1080).

@export var grid_color: Color = Color(0.745, 0.776, 0.882, 0.055):
	set(v): grid_color = v; queue_redraw()
@export var line_color: Color = Color(0.745, 0.776, 0.882, 0.20):
	set(v): line_color = v; queue_redraw()
@export var nebula_col1: Color = Color(0.10, 0.08, 0.24, 0.13):
	set(v): nebula_col1 = v; queue_redraw()
@export var nebula_col2: Color = Color(0.08, 0.12, 0.28, 0.10):
	set(v): nebula_col2 = v; queue_redraw()

# Must match star node positions baked into GalaxyLayer/Stars/* tscn nodes.
const _CONNECTIONS: Array = [
	[Vector2(0, 0),      Vector2(160, 45)],   # Sol → Alpha Centauri
	[Vector2(0, 0),      Vector2(-130, 120)],  # Sol → Barnard's Star
	[Vector2(0, 0),      Vector2(-230, -105)], # Sol → Procyon
	[Vector2(0, 0),      Vector2(280, -175)],  # Sol → Sirius
	[Vector2(280, -175), Vector2(110, -330)],  # Sirius → Vega
	[Vector2(160, 45),   Vector2(400, 175)],   # Alpha Centauri → Altair
	[Vector2(-130, 120), Vector2(-300, 280)],  # Barnard's Star → Fomalhaut
	[Vector2(-230,-105), Vector2(110, -330)],  # Procyon → Vega
	[Vector2(160, 45),   Vector2(-130, 120)],  # Alpha Centauri → Barnard's Star
]

func _draw() -> void:
	var sz := _vp_size()
	_draw_nebula(sz)
	_draw_grid(sz)
	_draw_constellation_lines()
	_draw_greeblies(sz)

func _vp_size() -> Vector2:
	if Engine.is_editor_hint():
		return Vector2(1080, 1920)
	var vp := get_viewport()
	return vp.get_visible_rect().size if vp else Vector2(1080, 1920)

func _draw_nebula(sz: Vector2) -> void:
	draw_circle(Vector2(-sz.x * 0.20, -sz.y * 0.10), sz.x * 0.38, nebula_col1)
	draw_circle(Vector2(sz.x * 0.22,  sz.y * 0.12),  sz.x * 0.30, nebula_col2)

func _draw_grid(sz: Vector2) -> void:
	var step := 100.0
	var hw := sz.x * 0.5; var hh := sz.y * 0.5
	var col := grid_color
	var x := -hw - fmod(hw, step)
	while x <= hw:
		draw_line(Vector2(x, -hh), Vector2(x, hh), col, 1.0)
		x += step
	var y := -hh - fmod(hh, step)
	while y <= hh:
		draw_line(Vector2(-hw, y), Vector2(hw, y), col, 1.0)
		y += step

func _draw_constellation_lines() -> void:
	for pair in _CONNECTIONS:
		_dashed_line(pair[0] as Vector2, pair[1] as Vector2, line_color, 1.0, 5.0, 5.0)

func _dashed_line(a: Vector2, b: Vector2, col: Color, w: float, dash: float, gap: float) -> void:
	var total := a.distance_to(b)
	if total < 0.1:
		return
	var dir := (b - a) / total
	var d := 0.0; var on := true
	while d < total:
		var seg := dash if on else gap
		var nxt := minf(d + seg, total)
		if on:
			draw_line(a + dir * d, a + dir * nxt, col, w)
		d = nxt; on = not on

func _draw_greeblies(sz: Vector2) -> void:
	var col := Color(line_color.r, line_color.g, line_color.b, 0.40)
	var hw := sz.x * 0.5; var hh := sz.y * 0.5
	for i in range(7):
		var y := -54.0 + float(i) * 18.0
		var tw := 14.0 if (i % 3 == 0) else 7.0
		draw_line(Vector2(-hw, y), Vector2(-hw + tw, y), col, 1.0)
		draw_line(Vector2(hw,  y), Vector2(hw  - tw, y), col, 1.0)
