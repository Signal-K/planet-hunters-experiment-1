class_name ControlStation extends Structure


func _ready():
	super._ready()
	structure_name = "Control Station"
	
	print("Control Station initialized: " + structure_name)

func on_interact():
	super.on_interact()
	print("Control Station clicked: " + structure_name)
	
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
		print("Opening Control Station panel...")
		if ui_manager.has_method("show_structure_panel"):
			ui_manager.show_structure_panel("res://Scenes/UI/ControlStationPanel.tscn")
		else:
			ui_manager.show_panel(UIManager.PanelType.NEW_MISSION)
	else:
		print("ERROR: UIManager not found for Control Station")

