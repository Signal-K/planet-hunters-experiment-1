class_name SatelliteStation extends Structure

const ACTION_OPEN_SATELLITE := "open_satellite_station"
const HINT_OPEN_SATELLITE := "Use the Satellite Station to find mission targets."

func _ready():
	super._ready()
	structure_name = "Satellite Station"
	
	print("Satellite Station initialized: " + structure_name)

func on_interact():
	super.on_interact()
	_show_tutorial_hint_once(ACTION_OPEN_SATELLITE, HINT_OPEN_SATELLITE)
	print("Satellite Station clicked: " + structure_name)
	
	# Get the UIManager from the scene tree
	var ui_manager = get_tree().get_first_node_in_group("ui_manager")
	print("Found UIManager in group: ", ui_manager != null)
	
	if not ui_manager:
		# Try to get from main scene
		var main_scene = get_tree().current_scene
		for child in main_scene.get_children():
			if child is UIManager:
				ui_manager = child
				break
		print("Found UIManager as child: ", ui_manager != null)
	
	if ui_manager:
		print("Calling show_structure_panel...")
		ui_manager.show_structure_panel("res://Scenes/UI/SatelliteStationPanel.tscn")
	else:
		print("ERROR: UIManager not found for Satellite Station")

func _show_tutorial_hint_once(action_key: String, message: String) -> void:
	var app = get_tree().root.find_child("AppController", true, false)
	if app and app.has_method("show_tutorial_hint_once"):
		app.show_tutorial_hint_once(action_key, message)
