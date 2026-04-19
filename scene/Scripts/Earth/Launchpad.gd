extends Node2D
## Launchpad structure on the Earth base scene.
## Handles sprite click → open launch wizard.

func on_interact() -> void:
	preload("res://Scripts/Utils/AppControllerHelper.gd").record_tutorial_action("open_launchpad")
	var sm := get_tree().get_first_node_in_group("scene_manager")
	if sm:
		sm.change_to_scene("res://Scenes/Earth/earth_launchpad.tscn")
	else:
		get_tree().change_scene_to_file("res://Scenes/Earth/earth_launchpad.tscn")

func get_visual_bounds_rect_in_viewport() -> Rect2:
	var sprite := get_node_or_null("Sprite2D") as Sprite2D
	if sprite == null or sprite.texture == null:
		return Rect2()
	var size := sprite.texture.get_size() * sprite.global_scale.abs()
	var top_left := sprite.global_position - size * 0.5
	return Rect2(top_left, size)
