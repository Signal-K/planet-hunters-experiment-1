extends "res://Scenes/Earth/earth_scene_base.gd"
## Example Earth scene demonstrating template usage
##
## This scene shows how to:
## - Inherit from the Earth Scene Template
## - Add custom structures
## - Use ground positioning helpers
## - Override template behavior

func _custom_ready() -> void:
	print("Earth Base Example initialized!")
	
	# Example: Position structures using helper functions
	# (Assuming structures are added in the scene editor)
	
	# If you have structures in the scene, position them like this:
	# var satellite = $StructuresLayer/SatelliteStation
	# satellite.position.x = 500
	# snap_to_ground(satellite)
	
	# var launch_pad = $StructuresLayer/LaunchPad
	# launch_pad.position.x = 1200
	# snap_to_ground(launch_pad, -15)  # Slightly elevated
	
	# Example: Add soil visualization
	_setup_soil_visuals()

func _setup_soil_visuals() -> void:
	"""Optional: Add visual representation of soil layer"""
	# You can add soil sprites, tilemaps, or other visuals here
	# For example, a colored rectangle to show the soil zone:
	
	var soil_visual = ColorRect.new()
	soil_visual.color = Color(0.4, 0.3, 0.2, 0.3)  # Semi-transparent brown
	soil_visual.position = Vector2(0, SOIL_TOP)
	soil_visual.size = Vector2(3840, SOIL_BOTTOM - SOIL_TOP)  # Wide enough for scrolling
	$SoilLayer.add_child(soil_visual)

# Optional: Override button behavior for custom functionality
func _on_menu_button_pressed() -> void:
	# Call parent implementation first
	super._on_menu_button_pressed()
	
	# Add custom behavior
	print("Custom menu logic for this Earth base!")
