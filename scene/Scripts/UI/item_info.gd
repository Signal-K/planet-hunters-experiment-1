extends TextureRect

func set_item_info(item_texture: Texture, value) -> void:
	$MarginContainer/TextureRect.texture = item_texture
	set_label(value)
	
func set_label(value) -> void:
	$MarginContainer/TextureRect/Label.text = str(value)
	
func play_flash_animation() -> void:
	$AnimationPlayer.play("Flash")
