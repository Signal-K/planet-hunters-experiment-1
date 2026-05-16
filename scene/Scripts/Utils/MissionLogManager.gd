extends RefCounted
class_name MissionLogManager

const JSONFileManager = preload("res://Scripts/Utils/JSONFileManager.gd")

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
	var json = JSONFileManager
	var data = json.load_json(_get_state_path())
	if typeof(data) != TYPE_DICTIONARY:
		data = {}
	if data.is_empty():
		data = build_default_state()
	if not data.has("missions"):
		data["missions"] = []
	var normalized = _normalize_missions(data.get("missions", []))
	if normalized.get("changed", false):
		data["missions"] = normalized.get("missions", [])
		save_state(data)
	return data

static func build_default_state() -> Dictionary:
	return {"missions": []}

static func save_state(data: Dictionary) -> bool:
	var json = JSONFileManager
	var state_path = _get_state_path()
	var primary_ok = json.save_json(state_path, data)
	return primary_ok

static func reset_state() -> bool:
	return save_state(build_default_state())

static func add_mission(entry: Dictionary) -> bool:
	var data = load_state()
	var missions = data.get("missions", [])
	var incoming_badge = str(entry.get("badge", "")).strip_edges()
	if incoming_badge != "":
		for i in range(missions.size() - 1, -1, -1):
			var existing = missions[i]
			if typeof(existing) != TYPE_DICTIONARY:
				continue
			if str(existing.get("badge", "")).strip_edges() != incoming_badge:
				continue
			missions[i] = _merge_mission_entries(existing, entry)
			data["missions"] = missions
			return save_state(data)
	missions.append(entry)
	data["missions"] = missions
	return save_state(data)

static func get_missions() -> Array:
	var data = load_state()
	return data.get("missions", [])

static func _normalize_missions(missions: Array) -> Dictionary:
	var out := []
	var badge_to_index := {}
	var changed := false
	for item in missions:
		if typeof(item) != TYPE_DICTIONARY:
			out.append(item)
			continue
		var entry: Dictionary = item
		var badge = str(entry.get("badge", "")).strip_edges()
		if badge == "":
			out.append(entry)
			continue
		if badge_to_index.has(badge):
			var idx = int(badge_to_index[badge])
			var prior = out[idx]
			if typeof(prior) == TYPE_DICTIONARY:
				out[idx] = _merge_mission_entries(prior, entry)
				changed = true
			else:
				out.append(entry)
				badge_to_index[badge] = out.size() - 1
		else:
			badge_to_index[badge] = out.size()
			out.append(entry)
	if out.size() != missions.size():
		changed = true
	return {"missions": out, "changed": changed}

static func _merge_mission_entries(existing: Dictionary, incoming: Dictionary) -> Dictionary:
	var merged = existing.duplicate(true)
	var actions = _normalize_actions(existing)
	var payout_delta = int(incoming.get("payout", 0))
	var action_name = str(incoming.get("action", "")).strip_edges()
	actions.append({
		"action": action_name,
		"timestamp": str(incoming.get("timestamp", "")),
		"payout": payout_delta,
		"franc_delta": int(incoming.get("franc_delta", payout_delta)),
		"xp_awarded": int(incoming.get("xp_awarded", 0))
	})
	merged["actions"] = actions
	merged["action"] = _build_action_summary(actions)

	if not merged.has("first_timestamp"):
		merged["first_timestamp"] = str(existing.get("timestamp", ""))
	merged["last_timestamp"] = str(incoming.get("timestamp", ""))
	merged["timestamp"] = str(incoming.get("timestamp", merged.get("timestamp", "")))

	var total = int(merged.get("payout_total", int(existing.get("payout", 0))))
	total += payout_delta
	merged["payout_total"] = total
	merged["payout"] = total

	var keep_keys = {
		"action": true,
		"actions": true,
		"first_timestamp": true,
		"last_timestamp": true,
		"timestamp": true,
		"payout": true,
		"payout_total": true,
		"franc_delta": true,
		"xp_awarded": true
	}
	for raw_key in incoming.keys():
		var key = str(raw_key)
		if keep_keys.has(key):
			continue
		merged[key] = incoming[raw_key]
	return merged

static func _normalize_actions(entry: Dictionary) -> Array:
	var existing_actions = entry.get("actions", [])
	if typeof(existing_actions) == TYPE_ARRAY and existing_actions.size() > 0:
		return existing_actions.duplicate(true)
	return [{
		"action": str(entry.get("action", "")).strip_edges(),
		"timestamp": str(entry.get("timestamp", "")),
		"payout": int(entry.get("payout", 0)),
		"franc_delta": int(entry.get("franc_delta", int(entry.get("payout", 0)))),
		"xp_awarded": int(entry.get("xp_awarded", 0))
	}]

static func _build_action_summary(actions: Array) -> String:
	var labels := []
	var seen := {}
	for item in actions:
		if typeof(item) != TYPE_DICTIONARY:
			continue
		var action_name = str(item.get("action", "")).strip_edges()
		if action_name == "" or seen.has(action_name):
			continue
		seen[action_name] = true
		labels.append(action_name)
	if labels.is_empty():
		return "mission"
	return " + ".join(labels)