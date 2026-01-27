extends TextureRect

var rocket_id = "starterrocket1"

func _ready():
	pass

func _get_drag_data(_pos):
	var drag_preview = TextureRect.new()
	drag_preview.texture = texture
	drag_preview.expand = true
	drag_preview.stretch_mode = stretch_mode
	drag_preview.custom_minimum_size = custom_minimum_size
	set_drag_preview(drag_preview)
	return {"rocket_id": rocket_id}
