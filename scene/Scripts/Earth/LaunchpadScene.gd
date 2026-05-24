extends Node2D

const RocketsManager = preload("res://Scripts/Utils/RocketsManager.gd")
const PreviewRouting = preload("res://Scripts/UI/NewMissionPreviewRouting.gd")
const PostHogNativeSurveyBridge = preload("res://Scripts/Systems/PostHogNativeSurveyBridge.gd")

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
		call_deferred("_stabilize_launchpad_layout")

func _stabilize_launchpad_layout() -> void:
	var wizard := get_node_or_null("UILayer/LaunchWizard")
	if wizard == null:
		return
	if wizard.has_method("refresh_layout_for_viewport"):
		wizard.call("refresh_layout_for_viewport")
	var tree := get_tree()
	if tree == null:
		return
	await tree.process_frame
	if wizard and wizard.has_method("refresh_layout_for_viewport"):
		wizard.call("refresh_layout_for_viewport")
	await tree.process_frame
	if wizard and wizard.has_method("refresh_layout_for_viewport"):
		wizard.call("refresh_layout_for_viewport")

func _redirect_to_base() -> void:
	var sm := get_tree().get_first_node_in_group("scene_manager")
	if sm and sm.has_method("change_to_scene"):
		sm.change_to_scene("res://Scenes/Earth/earth_base_1.tscn")
	else:
		get_tree().change_scene_to_file("res://Scenes/Earth/earth_base_1.tscn")

func _go_back() -> void:
	RocketsManager.remove_awaiting_rocket()
	PostHogNativeSurveyBridge.count_and_fire(
		"launchpad_back_cycles", 3, "nav_test",
		PostHogNativeSurveyBridge.SURVEY_IDS.nav_test, "nav_test", {}
	)
	var sm := get_tree().get_first_node_in_group("scene_manager")
	if sm:
		sm.navigate_backward()
	else:
		get_tree().change_scene_to_file("res://Scenes/Earth/earth_base_1.tscn")

func _on_launched(_rocket_id: String, _target_id: String) -> void:
	var destination := PreviewRouting.OUTBOUND_PREVIEW_SCENE_PATH
	var sm := get_tree().get_first_node_in_group("scene_manager")
	if sm:
		sm.change_to_scene(destination)
	else:
		get_tree().change_scene_to_file(destination)
