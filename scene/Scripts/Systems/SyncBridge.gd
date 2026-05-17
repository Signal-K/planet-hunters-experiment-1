extends Node
## Unified Sync Bridge — Web/PWA edition.
## Observes EventBus, pushes state changes to the Next.js PWA via JavaScriptBridge (postMessage).
## Receives inbound Supabase-reconciled snapshots from the PWA and applies them to AppController.

signal state_changed(key: String, value: Variant, source: String)

const WebEventBridge = preload("res://Scripts/Systems/WebEventBridge.gd")

var _js_message_callback: JavaScriptObject = null

func _ready() -> void:
	_connect_event_bus()
	if OS.has_feature("web"):
		_register_pwa_listener()
	print("[SyncBridge] Ready")

func _connect_event_bus() -> void:
	EventBus.player_state_changed.connect(_on_player_state_changed)
	EventBus.franc_balance_changed.connect(_on_franc_balance_changed)
	EventBus.counter_changed.connect(_on_counter_changed)
	EventBus.pwa_state_received.connect(_on_pwa_state_received)

func _register_pwa_listener() -> void:
	_js_message_callback = JavaScriptBridge.create_callback(_handle_pwa_message)
	JavaScriptBridge.get_interface("window").addEventListener("message", _js_message_callback)

func _handle_pwa_message(args: Array) -> void:
	var event = args[0]
	if event == null:
		return
	var data_str: String = str(event.data)
	var json := JSON.new()
	if json.parse(data_str) != OK:
		return
	var data = json.get_data()
	if typeof(data) != TYPE_DICTIONARY:
		return
	if data.get("source") != "landnam-pwa":
		return
	var payload = data.get("payload", {})
	if typeof(payload) == TYPE_DICTIONARY:
		EventBus.pwa_state_received.emit(payload)

func _on_player_state_changed(snapshot: Dictionary) -> void:
	WebEventBridge.emit("player_state_changed", snapshot)
	state_changed.emit("playerSnapshot", snapshot, "godot")

func _on_franc_balance_changed(new_balance: int) -> void:
	WebEventBridge.emit("franc_balance_changed", {"francBalance": new_balance})
	state_changed.emit("francBalance", new_balance, "godot")

func _on_counter_changed(new_value: int) -> void:
	WebEventBridge.emit("counter_changed", {"counter": new_value})
	state_changed.emit("counter", new_value, "godot")

func _on_pwa_state_received(payload: Dictionary) -> void:
	var app: Node = get_node_or_null("/root/AppController")
	if not app:
		return
	if payload.has("franc_balance") and app.has_method("set_franc_balance_from_react"):
		app.set_franc_balance_from_react(int(payload["franc_balance"]))
	if payload.has("counter") and app.has_method("set_counter_from_react"):
		app.set_counter_from_react(int(payload["counter"]))

# Public read API — reads from PlayerManager, no shadow state.
func get_state() -> Dictionary:
	return PlayerManager.get_snapshot()

func get_value(key: String) -> Variant:
	var snapshot := PlayerManager.get_snapshot()
	var camel_to_snake := {
		"counter": "counter",
		"francBalance": "franc_balance",
		"missionStage": "mission_stage",
		"completedMissions": "completed_missions",
		"controlStationBuilt": "control_station_built",
		"scannerStationBuilt": "scanner_station_built",
		"scannerUnlocked": "scanner_unlocked",
		"operationMode": "operation_mode",
		"freeOperationsUnlocked": "free_operations_unlocked",
		"activeMissionsCount": "active_missions_count",
		"hasReturnedMission": "has_returned_mission",
		"pendingMissionGuidanceId": "pending_mission_guidance_id",
		"unlockedRockets": "unlocked_rockets"
	}
	return snapshot.get(camel_to_snake.get(key, key), null)

func push_full_state() -> void:
	WebEventBridge.emit("player_state_changed", PlayerManager.get_snapshot())
