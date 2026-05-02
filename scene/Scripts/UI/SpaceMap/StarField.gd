@tool
extends Node2D
## Draws a random starfield. Uses a fixed 1920×1080 canvas in the editor.

@export var star_count: int = 200:
	set(v): star_count = v; queue_redraw()
@export var rng_seed: int = 7331:
	set(v): rng_seed = v; queue_redraw()
@export var star_color: Color = Color(0.90, 0.90, 0.90, 0.70):
	set(v): star_color = v; queue_redraw()

func _draw() -> void:
	var size := Vector2(1920, 1080)
	if not Engine.is_editor_hint():
		var vp := get_viewport()
		if vp:
			size = vp.get_visible_rect().size
	var rng := RandomNumberGenerator.new()
	rng.seed = rng_seed
	for _i in range(star_count):
		var pos   := Vector2(rng.randf_range(0.0, size.x), rng.randf_range(0.0, size.y))
		var r     := rng.randf_range(0.5, 1.8)
		var alpha := rng.randf_range(0.12, 0.65)
		draw_circle(pos, r, Color(star_color.r, star_color.g, star_color.b, alpha))
