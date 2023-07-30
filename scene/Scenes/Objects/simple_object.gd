@tool
extends StaticBody2D

@export_range(0, 3, 1) var size: int:
	set(value):
		size = value
		update_sprite()
@export_enum('Bush', 'Rock') var style: int:
	set(value):
		style = value
		update_sprite()
@export var random: bool = true
@export_tool_button('Randomize button', "Callable") var randmizer = randomize

func _ready() -> void:
	if has_node("Sprite2D"):
		print("Simple object _ready - random: ", random, " hframes: ", $Sprite2D.hframes, " vframes: ", $Sprite2D.vframes)
		if random:
			var old_size = size
			var old_style = style
			size = randi_range(0, $Sprite2D.hframes - 1)
			style = randi_range(0, $Sprite2D.vframes - 1)  # Use vframes instead of hardcoded array
			print("Randomizing: old (", old_size, ",", old_style, ") -> new (", size, ",", style, ")")
		update_sprite()
		$CollisionShape2D.disabled = size < 2
		z_index = -1 if size < 2 else 0

func update_sprite():
	if has_node("Sprite2D"):
		print("Updating sprite to frame_coords: ", Vector2i(size, style))
		$Sprite2D.frame_coords = Vector2i(size, style)

func randomize():
	size = randi_range(0, $Sprite2D.hframes - 1)
	style = [0, 1].pick_random()
	$Sprite2D.frame_coords = Vector2i(size, style)
