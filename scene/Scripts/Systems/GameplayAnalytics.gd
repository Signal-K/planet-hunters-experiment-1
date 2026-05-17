extends RefCounted
class_name GameplayAnalytics

const WebEventBridge = preload("res://Scripts/Systems/WebEventBridge.gd")
const AppControllerHelper = preload("res://Scripts/Utils/AppControllerHelper.gd")
const RocketsManager = preload("res://Scripts/Utils/RocketsManager.gd")

static var _active_mining_session: Dictionary = {}
static var _mining_attempts_by_target: Dictionary = {}

static func emit_event(event_name: String, payload: Dictionary = {}) -> void:
	if event_name.strip_edges() == "":
		return
	var enriched := payload.duplicate(true)
	_apply_common_context(enriched)
	WebEventBridge.emit(event_name, enriched)

static func emit_feedback_requested(source: String, payload: Dictionary = {}) -> void:
	var enriched := payload.duplicate(true)
	enriched["request_source"] = source
	emit_event("feedback_requested", enriched)

static func emit_target_selected(target_id: String, target_type: String, source: String, payload: Dictionary = {}) -> void:
	var enriched := payload.duplicate(true)
	enriched["target_id"] = target_id
	enriched["target_type"] = _normalize_target_type(target_type)
	enriched["selection_source"] = source
	enriched["target_scan_count"] = int(RocketsManager.get_target_scan_count(target_id, target_type))
	enriched["target_level"] = int(RocketsManager.get_target_level(target_id, target_type))
	emit_event("launch_target_selected", enriched)

static func emit_launch_started(rocket_id: String, target_id: String, target_type: String, payload: Dictionary = {}) -> void:
	var enriched := payload.duplicate(true)
	enriched["rocket_id"] = rocket_id
	enriched["target_id"] = target_id
	enriched["target_type"] = _normalize_target_type(target_type)
	enriched["rocket_unlock_missions"] = int(RocketsManager.get_rocket_unlock_missions(rocket_id))
	enriched["mission_duration_seconds"] = int(RocketsManager.get_mission_duration_seconds_for_rocket(rocket_id))
	emit_event("mission_launch_started", enriched)

static func start_mining_session(payload: Dictionary) -> Dictionary:
	var enriched := payload.duplicate(true)
	var target_id = str(enriched.get("target_id", ""))
	var attempt_index = int(_mining_attempts_by_target.get(target_id, 0)) + 1
	_mining_attempts_by_target[target_id] = attempt_index
	enriched["attempt_index_for_target"] = attempt_index
	enriched["started_at_unix"] = int(Time.get_unix_time_from_system())
	_active_mining_session = enriched.duplicate(true)
	emit_event("mining_run_started", enriched)
	return enriched

static func emit_mining_loop(loop_count: int, payload: Dictionary = {}) -> void:
	if loop_count <= 0:
		return
	var enriched := payload.duplicate(true)
	enriched["loop_count"] = loop_count
	emit_event("mining_loop_repeated", _merge_with_active_mining(enriched))

static func emit_mining_stuck(reason: String, payload: Dictionary = {}) -> void:
	if reason.strip_edges() == "":
		return
	var enriched := payload.duplicate(true)
	enriched["stuck_reason"] = reason
	emit_event("player_stuck_detected", _merge_with_active_mining(enriched))

static func complete_mining_session(payload: Dictionary) -> void:
	var enriched := _merge_with_active_mining(payload)
	emit_event("mining_run_completed", enriched)
	_active_mining_session = {}

static func _merge_with_active_mining(payload: Dictionary) -> Dictionary:
	var merged := _active_mining_session.duplicate(true)
	for key in payload.keys():
		merged[key] = payload[key]
	return merged

static func _apply_common_context(payload: Dictionary) -> void:
	payload["analytics_source"] = "godot"
	payload["scene_name"] = _get_current_scene_name()
	payload["scene_path"] = _get_current_scene_path()
	payload["mission_stage"] = int(RocketsManager.get_mission_stage())
	payload["completed_mission_count"] = int(RocketsManager.get_completed_mission_count())

	var selected_target = RocketsManager.get_selected_target()
	if selected_target != "":
		payload["selected_target_id"] = selected_target

	var preview_target = RocketsManager.get_preview_target()
	if not preview_target.is_empty():
		payload["preview_target_id"] = str(preview_target.get("id", ""))
		payload["preview_target_type"] = _normalize_target_type(str(preview_target.get("type", "asteroid")))

	var app = AppControllerHelper.get_instance()
	if app:
		if app.has_method("get_franc_balance"):
			payload["franc_balance"] = int(app.get_franc_balance())

static func _get_current_scene_name() -> String:
	var tree = Engine.get_main_loop() as SceneTree
	if tree and tree.current_scene:
		return str(tree.current_scene.name)
	return ""

static func _get_current_scene_path() -> String:
	var tree = Engine.get_main_loop() as SceneTree
	if tree and tree.current_scene:
		return str(tree.current_scene.scene_file_path)
	return ""

static func _normalize_target_type(target_type: String) -> String:
	var normalized = target_type.to_lower()
	if normalized == "planets":
		return "planet"
	if normalized == "asteroids":
		return "asteroid"
	if normalized == "planet":
		return "planet"
	return "asteroid"
