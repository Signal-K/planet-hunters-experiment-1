extends "res://Scenes/Earth/earth_scene_base.gd"
## Earth Launchpad Scene
##
## This scene shows the launchpad area and overrides navigation behavior
## to return to the earth base scene when the back button is pressed.

func _on_back_button_pressed() -> void:
	print("Launchpad back button pressed - returning to earth base")
	# Navigate specifically back to the earth base scene
	scene_manager.change_to_scene("res://Scenes/Earth/earth_base_1.tscn")
