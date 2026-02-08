extends RefCounted
class_name MissionLogManager

const STATE_PATH := "user://mission_logs.json"
const DEFAULT_STATE_PATH := "res://mission_logs.json"
static var _state_path_override := ""
static var _default_state_path_override := ""

static func set_path_overrides(state_path: String = "", default_state_path: String = "") -> void:
	_state_path_override = state_path
	_default_state_path_override = default_state_path

static func clear_path_overrides() -> void:
	_state_path_override = ""
	_default_state_path_override = ""

static func _get_state_path() -> String:
	if _state_path_override != "":
		return _state_path_override
	return STATE_PATH

static func _get_default_state_path() -> String:
	if _default_state_path_override != "":
		return _default_state_path_override
	return DEFAULT_STATE_PATH

static func load_state() -> Dictionary:
	var json = preload("res://Scripts/Utils/JSONFileManager.gd")
	var data = json.load_json(_get_state_path())
	if typeof(data) != TYPE_DICTIONARY:
		data = {}
	if data.is_empty():
		var fallback = json.load_json(_get_default_state_path())
		if typeof(fallback) == TYPE_DICTIONARY and not fallback.is_empty():
			data = fallback
	if not data.has("missions"):
		data["missions"] = []
	return data

static func save_state(data: Dictionary) -> bool:
	var json = preload("res://Scripts/Utils/JSONFileManager.gd")
	var state_path = _get_state_path()
	var default_path = _get_default_state_path()
	var primary_ok = json.save_json(state_path, data)
	var default_ok = true
	if default_path != "":
		default_ok = json.save_json(default_path, data)
	return primary_ok or default_ok

static func add_mission(entry: Dictionary) -> bool:
	var data = load_state()
	var missions = data.get("missions", [])
	missions.append(entry)
	data["missions"] = missions
	return save_state(data)

static func get_missions() -> Array:
	var data = load_state()
	return data.get("missions", [])
