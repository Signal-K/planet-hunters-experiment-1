extends Node
## App Controller for Scene Project
## Manages communication between React Native and Godot
## Handles counter synchronization and window management
signal window_status_update(message: String)
signal counter_updated(new_value: int)
signal franc_balance_updated(new_value: int)
signal loan_updated(loan_balance: int)
signal rockets_reset()
signal tutorial_state_updated(state: Dictionary)
signal citizen_science_dialogue_toggled(enabled: bool)
signal player_state_snapshot_updated(snapshot: Dictionary)

const DEFAULT_FRANC_BALANCE := 10000000000
const DEFAULT_CITIZEN_SCIENCE_DIALOGUE_ENABLED := true
const MAIN_SCENE_PATH := "res://Scenes/Earth/earth_base_1.tscn"

var counter: int = 0
var franc_balance: int = DEFAULT_FRANC_BALANCE
var loan_balance: int = 0
var citizen_science_dialogue_enabled: bool = DEFAULT_CITIZEN_SCIENCE_DIALOGUE_ENABLED
var _game_paused: bool = false
var _menu_request_version: int = 0
var _menu_request_action: String = ""
var _last_mining_result: Dictionary = {}
var _last_mining_result_synced: bool = true
var _auto_start_mining: bool = false
var is_ux_tour_running: bool = false

const AppControllerPersistence = preload("res://Scripts/Systems/AppControllerPersistence.gd")
const WebEventBridge = preload("res://Scripts/Systems/WebEventBridge.gd")
const AppLogger = preload("res://Scripts/Utils/Logger.gd")
const RocketsManager = preload("res://Scripts/Utils/RocketsManager.gd")
const MissionLogManager = preload("res://Scripts/Utils/MissionLogManager.gd")
const SubcontractorManager = preload("res://Scripts/Utils/SubcontractorManager.gd")
const FirstTimeMechanicTracker = preload("res://Scripts/Utils/FirstTimeMechanicTracker.gd")
const MissionNarrativeAPI = preload("res://Scripts/Utils/MissionNarrativeAPI.gd")
var _persistence := AppControllerPersistence.new()
const MISSION_PROGRESS_TRACKER_SCENE := preload("res://Scenes/UI/MissionProgressTracker.tscn")
const TUTORIAL_CONTROLLER_SCENE := preload("res://Scripts/Tutorial/TutorialController.gd")
const TUTORIAL_OVERLAY_SCENE := preload("res://Scenes/UI/TutorialCoachOverlay.tscn")
const FEEDBACK_BEACON_SCENE := preload("res://Scenes/UI/FeedbackBeacon.tscn")
const INTRO_SPLASH_SCENE := preload("res://Scenes/UI/PlanetHuntersIntroSplash.tscn")
const INTRO_SPLASH_FLAG_PATH := "user://planet_hunters_intro_v1.cfg"
var _tutorial_controller: Node = null
# Actions recorded before the TutorialController's _ready() has run are queued
# here and replayed in order once the controller is fully initialised.
var _pending_tutorial_actions: Array = []

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	is_ux_tour_running = OS.has_environment("GODOT_UX_TOUR")
	AppLogger.d("AppController ready, counter initialized to: %s, is_ux_tour_running: %s" % [counter, is_ux_tour_running])
	load_franc_balance()
	_unlock_rockets_for_mission_stage(RocketsManager.get_completed_mission_count())
	load_preferences()
	_ensure_mission_progress_tracker()
	_ensure_tutorial_controller()
	_ensure_feedback_beacon()
	_set_tutorial_overlay_suspended(false)
	WebEventBridge.emit("app_ready", {
		"franc_balance": franc_balance,
		"citizen_science_dialogue_enabled": citizen_science_dialogue_enabled
	})
	_emit_player_state_snapshot("ready")

func _ensure_tutorial_runtime() -> void:
	_ensure_tutorial_controller()
	if get_tree() == null or get_tree().root == null:
		return
	var root = get_tree().root
	var overlay = root.get_node_or_null("TutorialCoachOverlay")
	if overlay != null and overlay.is_queued_for_deletion():
		overlay = null
	if overlay == null:
		var overlay_instance = TUTORIAL_OVERLAY_SCENE.instantiate()
		if overlay_instance:
			overlay_instance.name = "TutorialCoachOverlay"
			root.call_deferred("add_child", overlay_instance)

func _ensure_tutorial_controller() -> void:
	if get_tree() == null or get_tree().root == null:
		return
	var root = get_tree().root
	_tutorial_controller = root.get_node_or_null("TutorialController")
	if _tutorial_controller != null and _tutorial_controller.is_queued_for_deletion():
		_tutorial_controller = null
	if _tutorial_controller == null:
		_tutorial_controller = TUTORIAL_CONTROLLER_SCENE.new()
		_tutorial_controller.name = "TutorialController"
		root.call_deferred("add_child", _tutorial_controller)
		# Drain any actions that were recorded before the controller entered the
		# tree (and therefore before its _ready() loaded persisted state).
		# Using the `ready` signal guarantees _ready() has already run.
		_tutorial_controller.ready.connect(_drain_pending_tutorial_actions, CONNECT_ONE_SHOT)
	if _tutorial_controller and _tutorial_controller.has_signal("tutorial_state_updated") and not _tutorial_controller.tutorial_state_updated.is_connected(_on_tutorial_state_updated):
		_tutorial_controller.tutorial_state_updated.connect(_on_tutorial_state_updated)

func _ensure_mission_progress_tracker() -> void:
	if get_tree() == null or get_tree().root == null:
		return
	var existing = get_tree().root.get_node_or_null("MissionProgressTracker")
	if existing:
		return
	var tracker = MISSION_PROGRESS_TRACKER_SCENE.instantiate()
	if tracker:
		tracker.name = "MissionProgressTracker"
		get_tree().root.call_deferred("add_child", tracker)

func _ensure_feedback_beacon() -> void:
	if get_tree() == null or get_tree().root == null:
		return
	var existing = get_tree().root.get_node_or_null("FeedbackBeacon")
	if existing:
		return
	var beacon = FEEDBACK_BEACON_SCENE.instantiate()
	if beacon:
		beacon.name = "FeedbackBeacon"
		get_tree().root.call_deferred("add_child", beacon)

func set_counter_from_react(value: int) -> void:
	"""Set counter value from React Native"""
	AppLogger.d("[AppController] set_counter_from_react CALLED with value: %s" % value)
	counter = value
	counter_updated.emit(counter)
	AppLogger.d("[AppController] Counter now set to: %s" % counter)

func get_counter() -> int:
	"""Get current counter value"""
	AppLogger.d("[AppController] get_counter() called, returning: %s" % counter)
	return counter

func open_window(window_name: String) -> void:
	"""Open a window/panel"""
	AppLogger.d("Opening window: %s" % window_name)
	match window_name:
		"menu", "main_menu":
			show_menu_panel()
		_:
			AppLogger.w("Unknown window: %s" % window_name)

	window_status_update.emit("Opened " + window_name)

func close_window(window_name: String) -> void:
	"""Close a window/panel"""
	AppLogger.d("Closing window: %s" % window_name)

	match window_name:
		"menu", "main_menu":
			hide_menu_panel()
		_:
			AppLogger.w("Unknown window: %s" % window_name)

	window_status_update.emit("Closed " + window_name)

func set_game_paused(paused: bool) -> void:
	_game_paused = paused
	get_tree().paused = paused
	AppLogger.d("[AppController] Game paused set to: %s" % paused)

func get_game_paused() -> bool:
	return _game_paused

func request_menu_open() -> void:
	_menu_request_version += 1
	_menu_request_action = "open"
	window_status_update.emit("Opened menu")

func request_menu_close() -> void:
	_menu_request_version += 1
	_menu_request_action = "close"
	window_status_update.emit("Closed menu")

func get_menu_request_version() -> int:
	return _menu_request_version

func get_menu_request_action() -> String:
	return _menu_request_action

func set_last_mining_result(result: Dictionary) -> void:
	_last_mining_result = result
	_last_mining_result_synced = false
	AppLogger.d("AppController: New mining result set: %s" % str(result))

func get_last_mining_result() -> Dictionary:
	var result = _last_mining_result.duplicate(true)
	result["synced"] = _last_mining_result_synced
	return result

func mark_mining_result_synced() -> void:
	_last_mining_result_synced = true
	AppLogger.d("AppController: Mining result marked as synced")

func check_auto_start_mining() -> bool:
	var val = _auto_start_mining
	_auto_start_mining = false
	return val

func _unhandled_input(event: InputEvent) -> void:
	if not _is_debug_debrief_shortcut(event):
		return
	if debug_skip_active_mission_to_debrief():
		var viewport := get_viewport()
		if viewport != null:
			viewport.set_input_as_handled()

func debug_skip_active_mission_to_debrief() -> bool:
	if not _debug_mission_skip_allowed():
		return false
	var result = RocketsManager.debug_complete_active_mission_to_debrief()
	if not bool(result.get("ok", false)):
		return false
	var rocket_id = str(result.get("rocket_id", ""))
	var target_id = str(result.get("target_id", ""))
	record_tutorial_action("mine_target", {
		"rocket_id": rocket_id,
		"target_id": target_id,
		"debug_completed": true
	})
	record_tutorial_action("return_rocket_home", {
		"rocket_id": rocket_id,
		"target_id": target_id,
		"debug_completed": true
	})
	set_game_paused(false)
	hide_menu_panel()
	if get_tree():
		get_tree().change_scene_to_file("res://Scenes/Earth/mission_debrief_v2.tscn")
	return true

func _is_debug_debrief_shortcut(event: InputEvent) -> bool:
	if event == null or not (event is InputEventKey):
		return false
	var key_event := event as InputEventKey
	if not key_event.pressed or key_event.echo:
		return false
	if key_event.keycode != KEY_E and key_event.physical_keycode != KEY_E:
		return false
	return key_event.meta_pressed

func _debug_mission_skip_allowed() -> bool:
	if OS.has_feature("web") or OS.has_feature("mobile"):
		return false
	if OS.has_feature("editor"):
		return true
	return OS.get_name() in ["macOS", "Windows", "Linux", "FreeBSD", "NetBSD", "OpenBSD"]

func debug_skip_to_mission(stage: int) -> void:
	AppLogger.d("AppController Debug: Jumping to Mission %d" % stage)
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if not rm: return
	
	# 1. Reset state if jumping back to M1
	if stage <= 1:
		_on_reset_all()
		set_game_paused(false)
		return

	# 2. Sequential completion up to stage-1
	# Clear existing badges to avoid duplicates and ensure clean jump
	var s = rm.load_state()
	s["completed_mission_badges"] = []
	s["mission_progress_completed"] = 0
	rm.save_state(s)

	var target_completed = stage - 1
	for i in range(target_completed):
		rm.mark_mission_completed("debug-skip-%d" % (i + 1))
	
	# 3. Force Level and Francs for that stage
	# M1 (Start): 0
	# M2 (Upgrade): 500M
	# M3 (Scanner): 1B
	# M4 (Planetary): 3B
	# M5 (Free Ops): 5B
	var balances = {
		2: 500000000,
		3: 1000000000,
		4: 3000000000,
		5: 5000000000
	}
	var target_francs = balances.get(stage, 1000000)

	set_franc_balance_from_react(target_francs)

	# 4. Special unlocks for later stages
	if stage >= 2:
		rm.set_control_station_built(true)
	if stage >= 3:
		rm.unlock("starterrocket2")
	if stage >= 4:
		rm.unlock("starterrocket3")

	# 5. Refresh tutorial state
	if _tutorial_controller and _tutorial_controller.has_method("replay_current_mission"):
		_tutorial_controller.replay_current_mission()

	# 6. Unpause and close menu
	set_game_paused(false)
	hide_menu_panel()
	AppLogger.d("AppController Debug: Jump Complete. Stage: %d, Francs: %d" % [rm.get_mission_stage(), target_francs])

func show_menu_panel() -> void:
	"""Show the runtime menu via the single menu service."""
	if get_tree() == null or get_tree().root == null:
		return
	var service = preload("res://Scripts/UI/GameNavigationMenu.gd")
	service.open(self)

func hide_menu_panel() -> void:
	"""Hide the runtime menu via the single menu service."""
	if get_tree() == null or get_tree().root == null:
		return
	var service = preload("res://Scripts/UI/GameNavigationMenu.gd")
	service.close(self)

func is_menu_open() -> bool:
	if get_tree() == null:
		return false
	var service = preload("res://Scripts/UI/GameNavigationMenu.gd")
	return service.is_open(get_tree())

func _set_tutorial_overlay_suspended(suspended: bool) -> void:
	var root = get_tree().root if get_tree() else null
	if root == null:
		return
	var overlay = root.get_node_or_null("TutorialCoachOverlay")
	if overlay == null:
		return
	overlay.visible = not suspended
	if not suspended and overlay.has_method("_refresh"):
		overlay.call_deferred("_refresh")

func _show_intro_splash_if_needed() -> void:
	_set_tutorial_overlay_suspended(false)

func _mark_tutorial_zone_exempt_recursive(node: Node) -> void:
	if node == null:
		return
	if node is Control:
		(node as Control).set_meta("tutorial_zone_exempt", true)
	for child in node.get_children():
		_mark_tutorial_zone_exempt_recursive(child)

func full_factory_reset() -> void:
	AppLogger.d("[AppController] CRITICAL: Performing full factory reset.")
	
	# 1. Reset core managers (they manage their own files)
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if rm:
		rm.reset_state()
	
	if _tutorial_controller and _tutorial_controller.has_method("reset_all"):
		_tutorial_controller.reset_all()
	
	# 2. Reset persistence (Experience, Francs, Preferences)
	_persistence.reset_all()
	
	# 3. Clear mission logs and subcontractors
	var json = preload("res://Scripts/Utils/JSONFileManager.gd")
	json.save_json("user://mission_logs.json", MissionLogManager.build_default_state())
	json.save_json("user://subcontractors.json", SubcontractorManager.build_default_state())
	
	# 4. Clear other state files
	DirAccess.remove_absolute("user://rocket_unlock_popups.cfg")
	DirAccess.remove_absolute(INTRO_SPLASH_FLAG_PATH)
	DirAccess.remove_absolute("user://construction_state.json")
	DirAccess.remove_absolute("user://first_time_mechanics.json")
	
	# 5. Reset local variables
	counter = 0
	franc_balance = DEFAULT_FRANC_BALANCE
	loan_balance = 0
	citizen_science_dialogue_enabled = DEFAULT_CITIZEN_SCIENCE_DIALOGUE_ENABLED
	_menu_request_version = 0
	_menu_request_action = ""
	_last_mining_result = {}
	_last_mining_result_synced = true
	_auto_start_mining = false

	# 6. Reset singleton trackers
	FirstTimeMechanicTracker.reset_all()
	MissionNarrativeAPI.reset_session_state()

	counter_updated.emit(counter)
	franc_balance_updated.emit(franc_balance)
	loan_updated.emit(loan_balance)
	citizen_science_dialogue_toggled.emit(citizen_science_dialogue_enabled)
	rockets_reset.emit()
	_emit_player_state_snapshot("factory_reset")
	
	AppLogger.d("[AppController] Factory reset complete. Reloading main scene.")
	
	# 8. Reload
	_return_to_fresh_player_scene()

func _on_reset_all() -> void:
	"""Handle reset all action from menu panel"""
	AppLogger.d("Reset all requested from Godot UI")
	_persistence.reset_all()
	counter = 0
	franc_balance = DEFAULT_FRANC_BALANCE
	loan_balance = 0
	citizen_science_dialogue_enabled = DEFAULT_CITIZEN_SCIENCE_DIALOGUE_ENABLED
	_menu_request_version = 0
	_menu_request_action = ""
	_last_mining_result = {}
	_last_mining_result_synced = true
	_auto_start_mining = false
	counter_updated.emit(counter)
	save_franc_balance()
	save_preferences()
	loan_updated.emit(loan_balance)
	_unlock_rockets_for_mission_stage(RocketsManager.get_completed_mission_count())
	_clear_runtime_progression_state()
	DirAccess.remove_absolute("user://rocket_unlock_popups.cfg")
	DirAccess.remove_absolute(INTRO_SPLASH_FLAG_PATH)
	franc_balance_updated.emit(franc_balance)
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if rm:
		rm.reset_state()
		AppLogger.d("RocketsManager: persisted rockets state reset")
	if _tutorial_controller and _tutorial_controller.has_method("reset_all"):
		_tutorial_controller.reset_all()
	rockets_reset.emit()
	_emit_player_state_snapshot("reset_all")
	_return_to_fresh_player_scene()
	AppLogger.d("All state reset in Godot. Signals emitted to notify React Native.")

func _clear_runtime_progression_state() -> void:
	var json = preload("res://Scripts/Utils/JSONFileManager.gd")
	json.save_json("user://mission_logs.json", MissionLogManager.build_default_state())
	json.save_json("user://subcontractors.json", SubcontractorManager.build_default_state())
	FirstTimeMechanicTracker.reset_all()
	MissionNarrativeAPI.reset_session_state()
	if OS.has_feature("web"):
		JavaScriptBridge.eval("(function(){try{window.localStorage.removeItem('planet_hunters_xp_state_v1');}catch(_e){}})();", true)

func _return_to_fresh_player_scene() -> void:
	set_game_paused(false)
	if get_tree() == null or get_tree().current_scene == null:
		return
	get_tree().call_deferred("change_scene_to_file", MAIN_SCENE_PATH)

func has_signal_connections(signal_name: String) -> bool:
	"""Check if signal has connections (for React Native compatibility)"""
	return get_signal_connection_list(signal_name).size() > 0

func set_franc_balance_from_react(value: int) -> void:
	"""Set franc balance from React Native"""
	franc_balance = value
	franc_balance_updated.emit(franc_balance)
	AppLogger.d("[AppController] Franc balance set from React Native: %s" % franc_balance)
	save_franc_balance()
	_emit_player_state_snapshot("franc_balance")

func add_franc_balance(amount: int, source: String = "") -> void:
	if amount == 0:
		return
	franc_balance += amount
	franc_balance_updated.emit(franc_balance)
	save_franc_balance()
	_emit_player_state_snapshot("franc_balance")
	if source != "":
		AppLogger.d("[AppController] Franc balance change from %s: %s (balance=%s)" % [source, amount, franc_balance])

func get_franc_balance() -> int:
	"""Get franc balance"""
	return franc_balance

const LOAN_AMOUNT := 1500000000      # 1.5 B F — covers SR1 plus fuel margin
const LOAN_REPAY_MULT := 1.03        # 3% interest

func save_franc_balance() -> void:
	_persistence.save_franc_balance(franc_balance, loan_balance)

func load_franc_balance() -> void:
	var result = _persistence.load_franc_balance(franc_balance)
	if result.get("loaded", false):
		franc_balance = result.get("value", franc_balance)
		loan_balance = int(result.get("loan", 0))
		franc_balance_updated.emit(franc_balance)
		if loan_balance > 0:
			loan_updated.emit(loan_balance)

func get_loan_balance() -> int:
	return loan_balance

func has_outstanding_loan() -> bool:
	return loan_balance > 0

func can_take_loan() -> bool:
	if RocketsManager.get_completed_mission_count() <= 0:
		return false
	var cheapest = preload("res://Scripts/Utils/RocketSpecs.gd").get_cost("starterrocket1")
	return franc_balance < cheapest and not has_outstanding_loan()

func take_loan() -> bool:
	if not can_take_loan():
		return false
	var repay_amount := int(ceil(float(LOAN_AMOUNT) * LOAN_REPAY_MULT))
	loan_balance = repay_amount
	add_franc_balance(LOAN_AMOUNT, "loan")
	loan_updated.emit(loan_balance)
	_persistence.save_franc_balance(franc_balance, loan_balance)
	AppLogger.d("[AppController] Loan taken: %s F, repay: %s F" % [LOAN_AMOUNT, repay_amount])
	return true

func repay_loan_from_payout(payout: int) -> int:
	if loan_balance <= 0:
		return payout
	var repay: int = mini(payout, loan_balance)
	loan_balance -= repay
	var remainder: int = payout - repay
	_persistence.save_franc_balance(franc_balance, loan_balance)
	loan_updated.emit(loan_balance)
	AppLogger.d("[AppController] Loan repaid: %s F, remaining loan: %s F" % [repay, loan_balance])
	return remainder


func save_preferences() -> void:
	_persistence.save_citizen_science_dialogue_enabled(citizen_science_dialogue_enabled)

func load_preferences() -> void:
	citizen_science_dialogue_enabled = _persistence.load_citizen_science_dialogue_enabled(true)
	citizen_science_dialogue_toggled.emit(citizen_science_dialogue_enabled)

func get_player_state_snapshot(source: String = "") -> Dictionary:
	var missions := RocketsManager.get_missions()
	var returned := RocketsManager.get_returned_mission()
	return {
		"schema_version": 1,
		"source": source,
		"counter": counter,
		"franc_balance": franc_balance,
		"loan_balance": loan_balance,
		"mission_stage": RocketsManager.get_mission_stage(),
		"completed_missions": RocketsManager.get_completed_mission_count(),
		"control_station_built": RocketsManager.is_control_station_built(),
		"operation_mode": RocketsManager.get_operation_mode(),
		"free_operations_unlocked": RocketsManager.is_free_operations_unlocked(),
		"active_missions_count": missions.size(),
		"has_returned_mission": not returned.is_empty(),
		"pending_mission_guidance_id": RocketsManager.get_pending_mission_guidance_id(),
		"unlocked_rockets": RocketsManager.get_unlocked()
	}

func _emit_player_state_snapshot(source: String = "") -> void:
	player_state_snapshot_updated.emit(get_player_state_snapshot(source))

func set_citizen_science_dialogue_enabled(enabled: bool) -> void:
	var next_enabled = bool(enabled)
	if citizen_science_dialogue_enabled == next_enabled:
		return
	citizen_science_dialogue_enabled = next_enabled
	save_preferences()
	citizen_science_dialogue_toggled.emit(citizen_science_dialogue_enabled)

func is_citizen_science_dialogue_enabled() -> bool:
	return citizen_science_dialogue_enabled

func _unlock_rockets_for_mission_stage(completed_missions: int) -> void:
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if rm:
		rm.unlock_for_mission_stage(completed_missions)

func record_tutorial_action(action_key: String, metadata: Dictionary = {}) -> bool:
	# Guard against the deferred add_child window: _tutorial_controller exists as
	# an object but _ready() hasn't loaded persisted state yet, so recording now
	# would be overwritten.  Queue and replay instead.
	if _tutorial_controller and _tutorial_controller.is_inside_tree() and _tutorial_controller.has_method("record_action"):
		_drain_pending_tutorial_actions()
		return bool(_tutorial_controller.record_action(action_key, metadata))
	_pending_tutorial_actions.append({"action": action_key, "meta": metadata})
	return false

func _drain_pending_tutorial_actions() -> void:
	if _pending_tutorial_actions.is_empty():
		return
	if not (_tutorial_controller and _tutorial_controller.is_inside_tree() and _tutorial_controller.has_method("record_action")):
		return
	while _pending_tutorial_actions.size() > 0:
		var entry = _pending_tutorial_actions.pop_front()
		_tutorial_controller.record_action(str(entry.get("action", "")), entry.get("meta", {}))

func has_seen_guide_action(action_key: String) -> bool:
	if _tutorial_controller and _tutorial_controller.has_method("has_seen_tutorial_action"):
		return bool(_tutorial_controller.has_seen_tutorial_action(action_key))
	return false

func has_seen_guide_action_for_stage(action_key: String, stage: int) -> bool:
	if _tutorial_controller and _tutorial_controller.has_method("has_seen_tutorial_action_for_stage"):
		return bool(_tutorial_controller.has_seen_tutorial_action_for_stage(action_key, stage))
	return false

func get_tutorial_state() -> Dictionary:
	if _tutorial_controller and _tutorial_controller.has_method("get_tutorial_state"):
		return _tutorial_controller.get_tutorial_state()
	return {}

func skip_tutorial() -> void:
	if _tutorial_controller and _tutorial_controller.has_method("skip_all"):
		_tutorial_controller.skip_all()

func replay_tutorial_for_current_mission() -> void:
	if _tutorial_controller and _tutorial_controller.has_method("replay_current_mission"):
		_tutorial_controller.replay_current_mission()

func _on_tutorial_state_updated(state: Dictionary) -> void:
	tutorial_state_updated.emit(state)

