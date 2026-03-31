extends SceneTree

const SCREENSHOT_PATH := "user://launchpad_snapshot_current.png"
const LAUNCHPAD_SCENE := "res://Scenes/Earth/earth_launchpad.tscn"
const RocketsManager := preload("res://Scripts/Utils/RocketsManager.gd")

const STAGE := 2
const STEP := 0
const WITH_LAUNCHPAD_TARGETING := false

var _active_scene: Node = null

func _init() -> void:
	await _run()

func _run() -> void:
	_inject_progress_state(STAGE, WITH_LAUNCHPAD_TARGETING)
	_inject_tutorial_state(STAGE, STEP, false)
	await _reset_root_tutorial_runtime()
	var scene := await _load_scene(LAUNCHPAD_SCENE)
	if scene == null:
		push_error("capture_launchpad_snapshot: failed to load launchpad scene")
		quit(1)
		return
	await create_timer(2.6).timeout
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
	image.save_png(ProjectSettings.globalize_path(SCREENSHOT_PATH))
	print(ProjectSettings.globalize_path(SCREENSHOT_PATH))
	await create_timer(0.1).timeout
	quit()

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
	cfg.set_value("state", "current_stage", stage)
	cfg.set_value("state", "current_step_index", step)
	cfg.set_value("state", "stage_lock", 0)
	cfg.set_value("state", "skipped", skipped)
	cfg.set_value("state", "completed_actions", {})
	cfg.set_value("state", "completed_actions_by_stage", {})
	cfg.set_value("state", "completed_steps_by_stage", {})
	cfg.save("user://tutorial_v2.cfg")

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
	state["detected_targets"] = RocketsManager.get_mission2_targets() if stage == 2 else RocketsManager.get_mission4_targets()
	state["selected_target"] = ""
	state["trip_contract_offer"] = {}
	state["placed"] = []
	if with_launchpad_targeting:
		state["placed"] = [{
			"type": "starterrocket2",
			"id": "starterrocket2-snapshot",
			"x": 960.0,
			"y": 850.0,
			"status": "awaitingLaunch"
		}]
	RocketsManager.save_state(state)
	RocketsManager.ensure_trip_contract_offer(state.get("detected_targets", []))

func _reset_root_tutorial_runtime() -> void:
	if root == null:
		return
	for node_name in ["TutorialCoachOverlay", "TutorialController"]:
		var node := root.get_node_or_null(node_name)
		if node != null:
			node.queue_free()
	await process_frame
	await process_frame

func _prime_launchpad_scene(scene_root: Node) -> void:
	if scene_root == null:
		return
	var launchpad = scene_root.get_node_or_null("StructuresLayer/Launchpad")
	if launchpad == null:
		return
	if launchpad.has_method("_populate_targets"):
		launchpad._populate_targets()
	if launchpad.has_method("_show_selector_panel"):
		launchpad._show_selector_panel()
