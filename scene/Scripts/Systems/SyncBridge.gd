extends Node
## Unified Sync Bridge

signal state_changed(key: String, value: Variant, source: String)

const STATE_KEYS := [
	"counter",
	"francBalance",
	"experienceXp",
	"experienceLevel",
	"playerStateVersion",
	"missionStage",
	"completedMissions",
	"controlStationBuilt",
	"scannerStationBuilt",
	"scannerUnlocked",
	"operationMode",
	"freeOperationsUnlocked",
	"activeMissionsCount",
	"hasReturnedMission",
	"pendingMissionGuidanceId",
	"unlockedRockets"
]

const MUTABLE_STATE_KEYS := {
	"counter": true,
	"francBalance": true,
	"experienceXp": true,
	"experienceLevel": true
}

var _state := {
	"counter": 0,
	"francBalance": 0,
	"experienceXp": 0,
	"experienceLevel": 1,
	"playerStateVersion": 0,
	"missionStage": 1,
	"completedMissions": 0,
	"controlStationBuilt": false,
	"scannerStationBuilt": false,
	"scannerUnlocked": false,
	"operationMode": "contract",
	"freeOperationsUnlocked": false,
	"activeMissionsCount": 0,
	"hasReturnedMission": false,
	"pendingMissionGuidanceId": 0,
	"unlockedRockets": []
}

var _applying_from_react := false

func _ready() -> void:
	_connect_to_app_controller()
	print("[SyncBridge] Ready")

func _get_app_controller() -> Node:
	var app = preload("res://Scripts/Utils/AppControllerHelper.gd").get_instance()
	if app:
		return app
	app = get_parent().get_node_or_null("AppController")
	if app:
		return app
	if get_tree() and get_tree().root:
		app = get_tree().root.find_child("AppController", true, false)
	return app

func _connect_to_app_controller() -> void:
	var app = _get_app_controller()
	if not app:
		print("[SyncBridge] No AppController found, will retry later")
		await get_tree().create_timer(0.5).timeout
		app = _get_app_controller()
		if not app:
			print("[SyncBridge] AppController still not found")
			return

	_state["counter"] = app.get_counter() if app.has_method("get_counter") else 0
	_state["francBalance"] = app.get_franc_balance() if app.has_method("get_franc_balance") else 0
	_state["experienceXp"] = app.get_experience_xp() if app.has_method("get_experience_xp") else 0
	_state["experienceLevel"] = app.get_experience_level() if app.has_method("get_experience_level") else 1
	if app.has_method("get_player_state_snapshot"):
		_apply_snapshot(app.get_player_state_snapshot("sync_bridge_connect"), "")

	if app.has_signal("counter_updated"):
		app.counter_updated.connect(_on_counter_updated)
	if app.has_signal("franc_balance_updated"):
		app.franc_balance_updated.connect(_on_balance_updated)
	if app.has_signal("experience_updated"):
		app.experience_updated.connect(_on_experience_updated)
	if app.has_signal("player_state_snapshot_updated"):
		app.player_state_snapshot_updated.connect(_on_player_state_snapshot_updated)

	print("[SyncBridge] Connected to AppController")

func get_state() -> Dictionary:
	return _state.duplicate(true)

func get_value(key: String) -> Variant:
	return _state.get(key, null)

func set_value(key: String, value: Variant) -> void:
	if not _state.has(key):
		print("[SyncBridge] Unknown key: ", key)
		return
	if not MUTABLE_STATE_KEYS.has(key):
		print("[SyncBridge] Ignoring write to read-only key: ", key)
		return

	_applying_from_react = true
	_state[key] = value
	_apply_to_app_controller(key, value)
	_applying_from_react = false

	state_changed.emit(key, value, "react")

func set_values(updates: Dictionary) -> void:
	_applying_from_react = true
	for key in updates.keys():
		if _state.has(key) and MUTABLE_STATE_KEYS.has(key):
			_state[key] = updates[key]
			_apply_to_app_controller(key, updates[key])
	_applying_from_react = false

func init_from_react(initial_state: Dictionary) -> void:
	print("[SyncBridge] Initializing from React Native: ", initial_state)
	set_values(initial_state)

func _apply_to_app_controller(key: String, value: Variant) -> void:
	var app = _get_app_controller()
	if not app:
		return

	match key:
		"counter":
			if app.has_method("set_counter_from_react"):
				app.set_counter_from_react(int(value))
		"francBalance":
			if app.has_method("set_franc_balance_from_react"):
				app.set_franc_balance_from_react(int(value))
		"experienceXp", "experienceLevel":
			if app.has_method("set_experience_from_react"):
				var xp: int = int(_state.get("experienceXp", 0))
				var level: int = int(_state.get("experienceLevel", 1))
				app.set_experience_from_react(xp, level)

func _on_counter_updated(value: int) -> void:
	if _applying_from_react:
		return
	_state["counter"] = value
	state_changed.emit("counter", value, "godot")

func _on_balance_updated(value: int) -> void:
	if _applying_from_react:
		return
	_state["francBalance"] = value
	state_changed.emit("francBalance", value, "godot")

func _on_experience_updated(xp: int, level: int) -> void:
	if _applying_from_react:
		return
	_state["experienceXp"] = xp
	_state["experienceLevel"] = level
	state_changed.emit("experienceXp", xp, "godot")
	state_changed.emit("experienceLevel", level, "godot")

func _on_player_state_snapshot_updated(snapshot: Dictionary) -> void:
	if _applying_from_react:
		return
	_apply_snapshot(snapshot, "godot")

func _apply_snapshot(snapshot: Dictionary, source: String) -> void:
	if typeof(snapshot) != TYPE_DICTIONARY:
		return
	var mappings := {
		"schema_version": "playerStateVersion",
		"counter": "counter",
		"franc_balance": "francBalance",
		"experience_xp": "experienceXp",
		"experience_level": "experienceLevel",
		"mission_stage": "missionStage",
		"completed_missions": "completedMissions",
		"control_station_built": "controlStationBuilt",
		"scanner_station_built": "scannerStationBuilt",
		"scanner_unlocked": "scannerUnlocked",
		"operation_mode": "operationMode",
		"free_operations_unlocked": "freeOperationsUnlocked",
		"active_missions_count": "activeMissionsCount",
		"has_returned_mission": "hasReturnedMission",
		"pending_mission_guidance_id": "pendingMissionGuidanceId",
		"unlocked_rockets": "unlockedRockets"
	}
	for snapshot_key in mappings.keys():
		if not snapshot.has(snapshot_key):
			continue
		var state_key = str(mappings[snapshot_key])
		var next_value = snapshot.get(snapshot_key)
		if _state.get(state_key) == next_value:
			continue
		_state[state_key] = next_value
		if source != "":
			state_changed.emit(state_key, next_value, source)
