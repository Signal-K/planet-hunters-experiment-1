extends RefCounted
class_name MissionLogManager

const STATE_PATH := "user://mission_logs.json"
const DEFAULT_STATE_PATH := "res://mission_logs.json"

static func load_state() -> Dictionary:
	var json = preload("res://Scripts/Utils/JSONFileManager.gd")
	var data = json.load_json(STATE_PATH)
	if typeof(data) != TYPE_DICTIONARY:
		data = {}
	if not data.has("missions"):
		data["missions"] = []
	return data

static func save_state(data: Dictionary) -> bool:
	var json = preload("res://Scripts/Utils/JSONFileManager.gd")
	var ok = json.save_json(STATE_PATH, data)
	json.save_json(DEFAULT_STATE_PATH, data)
	return ok

static func add_mission(entry: Dictionary) -> bool:
	var data = load_state()
	var missions = data.get("missions", [])
	missions.append(entry)
	data["missions"] = missions
	return save_state(data)

static func get_missions() -> Array:
	var data = load_state()
	return data.get("missions", [])
