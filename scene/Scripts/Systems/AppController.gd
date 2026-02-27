extends Node
## App Controller for Scene Project
## Manages communication between React Native and Godot
## Handles counter synchronization and window management
signal window_status_update(message: String)
signal counter_updated(new_value: int)
signal franc_balance_updated(new_value: int)
signal experience_updated(xp: int, level: int)
signal rockets_reset()
signal tutorial_state_updated(state: Dictionary)

var counter: int = 0
var franc_balance: int = 10000000000
var experience_xp: int = 0
var experience_level: int = 1
var menu_panel_scene = preload("res://Scenes/UI/MenuPanel.tscn")
var current_menu_panel: Control = null
var _game_paused: bool = false
var _menu_request_version: int = 0
var _menu_request_action: String = ""
const AppControllerPersistence = preload("res://Scripts/Systems/AppControllerPersistence.gd")
const WebEventBridge = preload("res://Scripts/Systems/WebEventBridge.gd")
const AppLogger = preload("res://Scripts/Utils/Logger.gd")
var _persistence := AppControllerPersistence.new()
const BASE_XP_TO_LEVEL := 10
const XP_AWARD_LAUNCH := 5
const XP_AWARD_SCAN := 2
const MISSION_PROGRESS_TRACKER_SCENE := preload("res://Scenes/UI/MissionProgressTracker.tscn")
const TUTORIAL_CONTROLLER_SCENE := preload("res://Scripts/Tutorial/TutorialController.gd")
const TUTORIAL_OVERLAY_SCENE := preload("res://Scenes/UI/TutorialCoachOverlay.tscn")
const FEEDBACK_BEACON_SCENE := preload("res://Scenes/UI/FeedbackBeacon.tscn")
var _tutorial_controller: Node = null

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	AppLogger.d("AppController ready, counter initialized to: %s" % counter)
	# Load persisted franc balance from disk (if present)
	load_franc_balance()
	# Load persisted experience from disk (if present)
	load_experience()
	_ensure_mission_progress_tracker()
	_ensure_tutorial_runtime()
	_ensure_feedback_beacon()
	WebEventBridge.emit("app_ready", {
		"experience_level": experience_level,
		"experience_xp": experience_xp,
		"franc_balance": franc_balance
	})

func _ensure_tutorial_runtime() -> void:
	if get_tree() == null or get_tree().root == null:
		return
	var root = get_tree().root
	_tutorial_controller = root.get_node_or_null("TutorialController")
	if _tutorial_controller == null:
		_tutorial_controller = TUTORIAL_CONTROLLER_SCENE.new()
		_tutorial_controller.name = "TutorialController"
		root.call_deferred("add_child", _tutorial_controller)
	if _tutorial_controller and _tutorial_controller.has_signal("tutorial_state_updated"):
		_tutorial_controller.tutorial_state_updated.connect(_on_tutorial_state_updated)
	var overlay = root.get_node_or_null("TutorialCoachOverlay")
	if overlay == null:
		var overlay_instance = TUTORIAL_OVERLAY_SCENE.instantiate()
		if overlay_instance:
			overlay_instance.name = "TutorialCoachOverlay"
			root.call_deferred("add_child", overlay_instance)

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
	if current_menu_panel and current_menu_panel.has_method("set_counter"):
		current_menu_panel.set_counter(counter)
		AppLogger.d("[AppController] Updated open menu panel with counter: %s" % counter)
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

func show_menu_panel() -> void:
	"""Show the main menu panel with counter"""
	if current_menu_panel:
		return

	current_menu_panel = menu_panel_scene.instantiate()
	get_tree().root.add_child(current_menu_panel)

	if current_menu_panel.has_method("set_counter"):
		current_menu_panel.set_counter(counter)

	if current_menu_panel.has_signal("panel_closed"):
		current_menu_panel.panel_closed.connect(_on_menu_panel_closed)

	if current_menu_panel.has_signal("counter_changed"):
		current_menu_panel.counter_changed.connect(_on_counter_changed)

	if current_menu_panel.has_signal("reset_all"):
		current_menu_panel.reset_all.connect(_on_reset_all)
	if current_menu_panel.has_signal("skip_tutorial_requested"):
		current_menu_panel.skip_tutorial_requested.connect(skip_tutorial)
	if current_menu_panel.has_signal("replay_mission_tutorial_requested"):
		current_menu_panel.replay_mission_tutorial_requested.connect(replay_tutorial_for_current_mission)
	if current_menu_panel.has_signal("replay_all_tutorial_requested"):
		current_menu_panel.replay_all_tutorial_requested.connect(replay_tutorial_from_mission1)

	AppLogger.d("Menu panel shown with counter: %s" % counter)

func hide_menu_panel() -> void:
	"""Hide the main menu panel"""
	if current_menu_panel:
		current_menu_panel.queue_free()
		current_menu_panel = null
		AppLogger.d("Menu panel hidden")

func _on_menu_panel_closed() -> void:
	"""Handle menu panel being closed"""
	current_menu_panel = null
	window_status_update.emit("Menu panel closed")

func _on_counter_changed(new_value: int) -> void:
	"""Handle counter being changed in Godot UI"""
	counter = new_value
	counter_updated.emit(counter)
	AppLogger.d("Counter changed in Godot UI: %s" % counter)

func _on_reset_all() -> void:
	"""Handle reset all action from menu panel"""
	AppLogger.d("Reset all requested from Godot UI")
	counter = 0
	franc_balance = 10000000000
	experience_xp = 0
	experience_level = 1
	if current_menu_panel and current_menu_panel.has_method("set_counter"):
		current_menu_panel.set_counter(counter)
	counter_updated.emit(counter)
	save_franc_balance()
	save_experience()
	DirAccess.remove_absolute("user://rocket_unlock_popups.cfg")
	franc_balance_updated.emit(franc_balance)
	_emit_experience_updated()
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if rm:
		rm.reset_state()
		AppLogger.d("RocketsManager: persisted rockets state reset")
	if _tutorial_controller and _tutorial_controller.has_method("reset_all"):
		_tutorial_controller.reset_all()
	rockets_reset.emit()
	AppLogger.d("All state reset in Godot. Signals emitted to notify React Native.")

func has_signal_connections(signal_name: String) -> bool:
	"""Check if signal has connections (for React Native compatibility)"""
	return get_signal_connection_list(signal_name).size() > 0

func set_franc_balance_from_react(value: int) -> void:
	"""Set franc balance from React Native"""
	franc_balance = value
	franc_balance_updated.emit(franc_balance)
	AppLogger.d("[AppController] Franc balance set from React Native: %s" % franc_balance)
	save_franc_balance()

func add_franc_balance(amount: int, source: String = "") -> void:
	if amount == 0:
		return
	franc_balance += amount
	franc_balance_updated.emit(franc_balance)
	save_franc_balance()
	if source != "":
		AppLogger.d("[AppController] Franc balance change from %s: %s (balance=%s)" % [source, amount, franc_balance])

func get_franc_balance() -> int:
	"""Get franc balance"""
	return franc_balance

func save_franc_balance() -> void:
	_persistence.save_franc_balance(franc_balance)

func load_franc_balance() -> void:
	var result = _persistence.load_franc_balance(franc_balance)
	if result.get("loaded", false):
		franc_balance = result.get("value", franc_balance)
		franc_balance_updated.emit(franc_balance)

func add_experience(amount: int, source: String = "") -> void:
	if amount <= 0:
		return
	experience_xp += amount
	var leveled_up = false
	while experience_xp >= _xp_required_for_level(experience_level):
		experience_xp -= _xp_required_for_level(experience_level)
		experience_level += 1
		leveled_up = true
	if leveled_up:
		_unlock_rockets_for_level(experience_level)
	_emit_experience_updated()
	save_experience()
	if source != "":
		AppLogger.d("[AppController] Experience gained from %s: +%s (xp=%s level=%s)" % [source, amount, experience_xp, experience_level])

func award_launch_experience() -> void:
	add_experience(XP_AWARD_LAUNCH, "launch")

func award_scan_experience() -> void:
	add_experience(XP_AWARD_SCAN, "scan")

func set_experience_from_react(xp: int, level: int) -> void:
	experience_xp = max(xp, 0)
	experience_level = max(level, 1)
	_unlock_rockets_for_level(experience_level)
	_emit_experience_updated()
	save_experience()

func get_experience_xp() -> int:
	return experience_xp

func get_experience_level() -> int:
	return experience_level

func get_xp_required_for_level(level: int) -> int:
	return _xp_required_for_level(level)

func get_xp_required_for_next_level() -> int:
	return _xp_required_for_level(experience_level)

func get_total_experience() -> int:
	var total = 0
	for lvl in range(1, max(experience_level, 1)):
		total += _xp_required_for_level(lvl)
	total += experience_xp
	return total

func save_experience() -> void:
	_persistence.save_experience(experience_xp, experience_level)

func load_experience() -> void:
	var result = _persistence.load_experience(experience_xp, experience_level)
	if result.get("loaded", false):
		experience_xp = result.get("xp", experience_xp)
		experience_level = result.get("level", experience_level)
	_unlock_rockets_for_level(experience_level)
	_emit_experience_updated()

func _emit_experience_updated() -> void:
	experience_updated.emit(experience_xp, experience_level)

func _xp_required_for_level(level: int) -> int:
	return BASE_XP_TO_LEVEL + max(level, 1)

func _unlock_rockets_for_level(level: int) -> void:
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if rm:
		rm.unlock_for_level(level)

func record_tutorial_action(action_key: String, metadata: Dictionary = {}) -> bool:
	if _tutorial_controller and _tutorial_controller.has_method("record_action"):
		return bool(_tutorial_controller.record_action(action_key, metadata))
	return false

func has_seen_guide_action(action_key: String) -> bool:
	if _tutorial_controller and _tutorial_controller.has_method("has_seen_tutorial_action"):
		return bool(_tutorial_controller.has_seen_tutorial_action(action_key))
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

func replay_tutorial_from_mission1() -> void:
	if _tutorial_controller and _tutorial_controller.has_method("replay_full"):
		_tutorial_controller.replay_full()

func _on_tutorial_state_updated(state: Dictionary) -> void:
	tutorial_state_updated.emit(state)
