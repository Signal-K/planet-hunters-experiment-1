extends "res://Scripts/Earth/Structure.gd"
class_name ControlStation

const UIManager = preload("res://Scripts/Earth/UIManager.gd")

func _ready():
	super._ready()
	structure_name = "Control Station"

func on_interact():
	super.on_interact()
	var ui_manager = get_tree().get_first_node_in_group("ui_manager")
	if not ui_manager:
		push_error("ControlStation: UIManager not in 'ui_manager' group")
		return
	ui_manager.show_structure_panel("res://Scenes/UI/ControlStationPanel.tscn")
