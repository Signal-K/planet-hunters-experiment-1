extends SceneTree

const DEFAULT_SCREENSHOT_PATH := "user://launchpad_snapshot_current.png"
const LAUNCHPAD_SCENE := "res://Scenes/Earth/earth_launchpad.tscn"
const RocketsManager := preload("res://Scripts/Utils/RocketsManager.gd")

var _active_scene: Node = null
var _stage := 2
var _step := 0
var _tutorial_skipped := false
var _with_awaiting_rocket := false
var _select_contractor := false
var _select_target := false
var _rocket_type := ""
var _screenshot_path := DEFAULT_SCREENSHOT_PATH

func _init() -> void:
	_parse_args()
	await _run()

func _run() -> void:
	_inject_progress_state(_stage, _with_awaiting_rocket)
	_inject_tutorial_state(_stage, _step, _tutorial_skipped)
	await _reset_root_tutorial_runtime()
	var scene := await _load_scene(LAUNCHPAD_SCENE)
	if scene == null:
		push_error("capture_launchpad_snapshot: failed to load launchpad scene")
		quit(1)
		return
	await create_timer(2.6).timeout
	await _apply_runtime_tutorial_state(_stage, _step, _tutorial_skipped)
	_inject_progress_state(_stage, _with_awaiting_rocket)
	await process_frame
	_prime_launchpad_scene(scene)
	await process_frame
	await create_timer(1.4).timeout
	var renderer_name := DisplayServer.get_name().to_lower()
	if renderer_name.find("headless") != -1:
		print("capture_launchpad_snapshot: screenshot capture unavailable under headless renderer")
		await create_timer(0.1).timeout
		quit()
		return
	var viewport_texture := root.get_viewport().get_texture()
	if viewport_texture == null:
		print("capture_launchpad_snapshot: viewport texture unavailable in this renderer")
		await create_timer(0.1).timeout
		quit()
		return
	var image := viewport_texture.get_image()
	if image == null:
		print("capture_launchpad_snapshot: viewport image unavailable in this renderer")
		await create_timer(0.1).timeout
		quit()
		return
	image.save_png(ProjectSettings.globalize_path(_screenshot_path))
	print(ProjectSettings.globalize_path(_screenshot_path))
	await create_timer(0.1).timeout
	quit()

func _parse_args() -> void:
	for arg in OS.get_cmdline_user_args():
		if not arg.begins_with("--"):
			continue
		var parts := arg.substr(2).split("=", false, 1)
		var key := parts[0]
		var value := parts[1] if parts.size() > 1 else "true"
		match key:
			"stage":
				_stage = maxi(int(value), 1)
			"step":
				_step = maxi(int(value), 0)
			"skipped":
				_tutorial_skipped = _parse_bool(value)
			"awaiting-rocket":
				_with_awaiting_rocket = _parse_bool(value)
			"select-contractor":
				_select_contractor = _parse_bool(value)
			"select-target":
				_select_target = _parse_bool(value)
			"rocket":
				_rocket_type = value.strip_edges()
			"output":
				_screenshot_path = value.strip_edges()

func _parse_bool(value: String) -> bool:
	var normalized := value.strip_edges().to_lower()
	return normalized in ["1", "true", "yes", "y", "on"]

func _load_scene(path: String) -> Node:
	if _active_scene and is_instance_valid(_active_scene):
		if _active_scene.get_parent():
			_active_scene.get_parent().remove_child(_active_scene)
		_active_scene.queue_free()
		_active_scene = null
		current_scene = null
		await create_timer(0.2).timeout
	for child in root.get_children():
		if child is CanvasLayer and child != _active_scene:
			child.queue_free()
	var packed: PackedScene = load(path)
	if packed == null:
		return null
	var instance := packed.instantiate()
	root.add_child(instance)
	current_scene = instance
	_active_scene = instance
	return instance

func _inject_tutorial_state(stage: int, step: int = 0, skipped: bool = false) -> void:
	var cfg := ConfigFile.new()
	for key in _build_tutorial_state(stage, step, skipped).keys():
		cfg.set_value("state", key, _build_tutorial_state(stage, step, skipped)[key])
	cfg.save("user://tutorial_v2.cfg")

func _build_tutorial_state(stage: int, step: int, skipped: bool) -> Dictionary:
	return {
		"current_stage": stage,
		"current_step_index": step,
		"stage_lock": 0,
		"skipped": skipped,
		"completed_actions": {},
		"completed_actions_by_stage": {},
		"completed_steps_by_stage": {}
	}

func _inject_progress_state(stage: int, with_launchpad_targeting: bool = false) -> void:
	RocketsManager.reset_state()
	RocketsManager.clear_returned_mission()
	RocketsManager.clear_preview_target()
	var state := RocketsManager.load_state()
	var completed := maxi(stage - 1, 0)
	var badges: Array = []
	for idx in range(completed):
		badges.append("mission_%d" % (idx + 1))
	state["completed_mission_badges"] = badges
	state["mission_progress_completed"] = completed
	state["scanner_unlocked"] = completed >= 3
	state["scanner_station_built"] = stage >= 4
	state["operation_mode"] = "contract"
	state["unlocked"] = ["starterrocket1"]
	if stage >= 2 and not state["unlocked"].has("starterrocket2"):
		state["unlocked"].append("starterrocket2")
	if stage >= 4 and not state["unlocked"].has("starterrocket3"):
		state["unlocked"].append("starterrocket3")
	if stage <= 1:
		var mission1 = RocketsManager.get_predefined_mission_target(1)
		state["detected_targets"] = [mission1] if not mission1.is_empty() else []
	elif stage == 2:
		state["detected_targets"] = RocketsManager.get_mission2_targets()
	elif stage == 3:
		state["detected_targets"] = RocketsManager.get_mission3_targets()
	else:
		state["detected_targets"] = RocketsManager.get_mission4_targets()
	state["selected_target"] = ""
	state["trip_contract_offer"] = {}
	state["placed"] = []
	if with_launchpad_targeting:
		var rocket_type := _rocket_type if _rocket_type != "" else _default_rocket_for_stage(stage)
		state["placed"] = [{
			"type": rocket_type,
			"id": "%s-snapshot" % rocket_type,
			"x": 960.0,
			"y": 850.0,
			"status": "awaitingLaunch"
		}]
	RocketsManager.save_state(state)
	var offer := RocketsManager.ensure_trip_contract_offer(state.get("detected_targets", []))
	if _select_contractor:
		var contractors: Array = offer.get("contractors", [])
		if not contractors.is_empty():
			var contractor_id := str((contractors[0] as Dictionary).get("id", ""))
			if contractor_id != "":
				RocketsManager.select_trip_contractor(contractor_id)
	if _select_target:
		var targets: Array = state.get("detected_targets", [])
		if not targets.is_empty():
			var target_id := str((targets[0] as Dictionary).get("id", ""))
			if target_id != "":
				RocketsManager.select_target(target_id)

func _default_rocket_for_stage(stage: int) -> String:
	if stage >= 4:
		return "starterrocket3"
	if stage >= 2:
		return "starterrocket2"
	return "starterrocket1"

func _reset_root_tutorial_runtime() -> void:
	if root == null:
		return
	for node_name in ["TutorialCoachOverlay", "TutorialController"]:
		var node := root.get_node_or_null(node_name)
		if node != null:
			node.queue_free()
	await process_frame
	await process_frame

func _apply_runtime_tutorial_state(stage: int, step: int, skipped: bool) -> void:
	if root == null:
		return
	var app = root.get_node_or_null("AppController")
	if app != null and app.has_method("_ensure_tutorial_controller"):
		app.call("_ensure_tutorial_controller")
	var controller := await _wait_for_tutorial_controller()
	if controller == null:
		return
	controller.set("_state", _build_tutorial_state(stage, step, skipped))
	controller.call("_persist_and_emit")
	controller.call("_emit_step_changed")

func _wait_for_tutorial_controller() -> Node:
	for _idx in range(20):
		var controller := root.get_node_or_null("TutorialController")
		if controller != null and controller.is_inside_tree():
			return controller
		await process_frame
	return null

func _prime_launchpad_scene(scene_root: Node) -> void:
	if scene_root == null:
		return
	var launchpad = scene_root.get_node_or_null("StructuresLayer/Launchpad")
	if launchpad == null:
		return
	if launchpad.has_method("center_visual_in_viewport"):
		launchpad.center_visual_in_viewport()
	if launchpad.has_method("_populate_targets"):
		launchpad._populate_targets()
	if launchpad.has_method("_show_selector_panel"):
		launchpad._show_selector_panel()
