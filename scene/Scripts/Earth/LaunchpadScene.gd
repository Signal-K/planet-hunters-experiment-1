extends Node2D

const RocketsManager = preload("res://Scripts/Utils/RocketsManager.gd")

func _ready() -> void:
	# Redirect guards — evaluated before wizard setup
	if not RocketsManager.get_missions().is_empty():
		# Mission in flight — resume from Earth base via Active Mission card
		_redirect_to_base()
		return
	var stage := RocketsManager.get_mission_stage()
	if stage >= 2 and not RocketsManager.is_free_operations_unlocked() and not RocketsManager.is_control_station_built():
		# Control Station must be built before M2 can launch
		_redirect_to_base()
		return
	var wizard := get_node_or_null("UILayer/LaunchWizard")
	if wizard:
		wizard.back_pressed.connect(_go_back)
		wizard.launched.connect(_on_launched)

func _redirect_to_base() -> void:
	var sm := get_tree().get_first_node_in_group("scene_manager")
	if sm and sm.has_method("change_to_scene"):
		sm.change_to_scene("res://Scenes/Earth/earth_base_1.tscn")
	else:
		get_tree().change_scene_to_file("res://Scenes/Earth/earth_base_1.tscn")

func _go_back() -> void:
	RocketsManager.remove_awaiting_rocket()
	var sm := get_tree().get_first_node_in_group("scene_manager")
	if sm:
		sm.navigate_backward()
	else:
		get_tree().change_scene_to_file("res://Scenes/Earth/earth_base_1.tscn")

func _on_launched(_rocket_id: String, _target_id: String) -> void:
	var sm := get_tree().get_first_node_in_group("scene_manager")
	if sm:
		sm.change_to_scene("res://Scenes/Transitions/rocket_ascent.tscn")
	else:
		get_tree().change_scene_to_file("res://Scenes/Transitions/rocket_ascent.tscn")
