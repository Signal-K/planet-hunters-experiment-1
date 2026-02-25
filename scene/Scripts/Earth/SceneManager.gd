class_name SceneManager
extends Node

signal scene_changing
signal scene_changed

const SceneFlashOverlayScene = preload("res://Scenes/UI/Templates/SceneFlashOverlay.tscn")

var current_scene_index: int = 0
var scene_list: Array[String] = [
    "res://Scenes/Earth/earth_base_1.tscn"
]

func navigate_forward() -> void:
	current_scene_index = (current_scene_index + 1) % scene_list.size()
	change_to_scene(scene_list[current_scene_index])

func navigate_backward() -> void:
	current_scene_index = (current_scene_index - 1) % scene_list.size()
	if current_scene_index < 0:
		current_scene_index = scene_list.size() - 1
	change_to_scene(scene_list[current_scene_index])

func change_to_scene(scene_path: String) -> void:
	# Add scene transition animation here
	var tween = get_tree().create_tween()
	
	# Flash effect
	var flash_overlay: ColorRect = SceneFlashOverlayScene.instantiate()
	if flash_overlay == null:
		get_tree().change_scene_to_file(scene_path)
		return
	get_tree().current_scene.add_child(flash_overlay)
	
	tween.tween_property(flash_overlay, "modulate:a", 0.8, 0.15)
	tween.tween_callback(func(): get_tree().change_scene_to_file(scene_path))
	tween.tween_property(flash_overlay, "modulate:a", 0.0, 0.15)
