extends Node
## App Controller for Scene Project
## Manages communication between React Native and Godot
## Handles counter synchronization and window management
signal window_status_update(message: String)
signal counter_updated(new_value: int)
signal tutorial_completed_updated(is_completed: bool)
signal franc_balance_updated(new_value: int)
signal experience_updated(xp: int, level: int)
signal rockets_reset()

var counter: int = 0
var tutorial_completed: bool = false
var franc_balance: int = 10000000000
var experience_xp: int = 0
var experience_level: int = 1
var menu_panel_scene = preload("res://Scenes/UI/MenuPanel.tscn")
var current_menu_panel: Control = null
var _game_paused: bool = false
var _menu_request_version: int = 0
var _menu_request_action: String = ""
const AppControllerPersistence = preload("res://Scripts/Systems/AppControllerPersistence.gd")
var _persistence := AppControllerPersistence.new()
const BASE_XP_TO_LEVEL := 10
const XP_AWARD_LAUNCH := 5
const XP_AWARD_SCAN := 2

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	print("AppController ready, counter initialized to: ", counter)
	print("AppController ready, tutorial_completed initialized to: ", tutorial_completed)
	# Load persisted tutorial state from disk (if present)
	load_tutorial_completed()
	# Load persisted franc balance from disk (if present)
	load_franc_balance()
	# Load persisted experience from disk (if present)
	load_experience()

func set_counter_from_react(value: int) -> void:
	"""Set counter value from React Native"""
	print("[AppController] set_counter_from_react CALLED with value: ", value)
	counter = value
	counter_updated.emit(counter)
	# Update any open menu panels
	if current_menu_panel and current_menu_panel.has_method("set_counter"):
		current_menu_panel.set_counter(counter)
		print("[AppController] Updated open menu panel with counter: ", counter)
	print("[AppController] Counter now set to: ", counter)

func get_counter() -> int:
	"""Get current counter value"""
	print("[AppController] get_counter() called, returning: ", counter)
	return counter

func open_window(window_name: String) -> void:
	"""Open a window/panel"""
	print("Opening window: ", window_name)
	match window_name:
		"menu", "main_menu":
			show_menu_panel()
		_:
			print("Unknown window: ", window_name)
	
	window_status_update.emit("Opened " + window_name)

func close_window(window_name: String) -> void:
	"""Close a window/panel"""
	print("Closing window: ", window_name)
	
	match window_name:
		"menu", "main_menu":
			hide_menu_panel()
		_:
			print("Unknown window: ", window_name)
	
	window_status_update.emit("Closed " + window_name)

func set_game_paused(paused: bool) -> void:
	_game_paused = paused
	get_tree().paused = paused
	print("[AppController] Game paused set to: ", paused)

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
		return  # Already showing
	
	current_menu_panel = menu_panel_scene.instantiate()
	get_tree().root.add_child(current_menu_panel)
	
	# Set initial counter value
	if current_menu_panel.has_method("set_counter"):
		current_menu_panel.set_counter(counter)
	
	# Connect signals
	if current_menu_panel.has_signal("panel_closed"):
		current_menu_panel.panel_closed.connect(_on_menu_panel_closed)
	
	if current_menu_panel.has_signal("counter_changed"):
		current_menu_panel.counter_changed.connect(_on_counter_changed)

	# Connect reset_all signal
	if current_menu_panel.has_signal("reset_all"):
		current_menu_panel.reset_all.connect(_on_reset_all)
	
	# Connect reset_tutorial signal
	if current_menu_panel.has_signal("reset_tutorial"):
		current_menu_panel.reset_tutorial.connect(_on_reset_tutorial)
	
	print("Menu panel shown with counter: ", counter)

func hide_menu_panel() -> void:
	"""Hide the main menu panel"""
	if current_menu_panel:
		current_menu_panel.queue_free()
		current_menu_panel = null
		print("Menu panel hidden")

func _on_menu_panel_closed() -> void:
	"""Handle menu panel being closed"""
	current_menu_panel = null
	window_status_update.emit("Menu panel closed")

func _on_counter_changed(new_value: int) -> void:
	"""Handle counter being changed in Godot UI"""
	counter = new_value
	counter_updated.emit(counter)
	
	# Here you would typically sync back to React Native
	# For now, just log it
	print("Counter changed in Godot UI: ", counter)

func _on_reset_all() -> void:
	"""Handle reset all action from menu panel"""
	print("Reset all requested from Godot UI")
	# Reset all state
	counter = 0
	tutorial_completed = false
	franc_balance = 10000000000
	experience_xp = 0
	experience_level = 1
	if current_menu_panel and current_menu_panel.has_method("set_counter"):
		current_menu_panel.set_counter(counter)
	# Emit signals to notify React Native
	counter_updated.emit(counter)
	tutorial_completed_updated.emit(tutorial_completed)

	# Persist tutorial reset
	save_tutorial_completed()
	save_franc_balance()
	save_experience()
	franc_balance_updated.emit(franc_balance)
	_emit_experience_updated()
	# Reset rockets persisted state and notify any in-scene systems to clear rockets
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if rm:
		# RocketsManager.reset_state is a static function, call directly
		rm.reset_state()
		print("RocketsManager: persisted rockets state reset")
	rockets_reset.emit()
	print("All state reset in Godot. Signals emitted to notify React Native.")

func _on_reset_tutorial() -> void:
	print("Reset tutorial requested from Godot UI")
	tutorial_completed = false
	tutorial_completed_updated.emit(tutorial_completed)
	# TODO: Notify React Native to reset tutorial state as well
	print("Tutorial state reset in Godot. Notify React Native to do the same.")

	# Persist reset
	save_tutorial_completed()

func has_signal_connections(signal_name: String) -> bool:
	"""Check if signal has connections (for React Native compatibility)"""
	return get_signal_connection_list(signal_name).size() > 0

func set_tutorial_completed_from_react(is_completed: bool) -> void:
	"""Set tutorial completed status from React Native"""
	# Update in-memory state, notify listeners and persist
	tutorial_completed = is_completed
	print("[AppController] Tutorial completed set from React Native to: ", tutorial_completed)
	tutorial_completed_updated.emit(tutorial_completed)

	# Persist the new value so reloads remember the choice
	save_tutorial_completed()

func get_tutorial_completed() -> bool:
	"""Get tutorial completed status"""
	return tutorial_completed


### Persistence helpers
func save_tutorial_completed() -> void:
	_persistence.save_tutorial_completed(tutorial_completed)

func load_tutorial_completed() -> void:
	var result = _persistence.load_tutorial_completed(tutorial_completed)
	if result.get("loaded", false):
		tutorial_completed = result.get("value", tutorial_completed)
		# notify any listeners so UI updates immediately
		tutorial_completed_updated.emit(tutorial_completed)

func set_franc_balance_from_react(value: int) -> void:
	"""Set franc balance from React Native"""
	franc_balance = value
	franc_balance_updated.emit(franc_balance)
	print("[AppController] Franc balance set from React Native: ", franc_balance)
	save_franc_balance()

func add_franc_balance(amount: int, source: String = "") -> void:
	if amount == 0:
		return
	franc_balance += amount
	franc_balance_updated.emit(franc_balance)
	save_franc_balance()
	if source != "":
		print("[AppController] Franc balance change from ", source, ": ", amount, " (balance=", franc_balance, ")")

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
		print("[AppController] Experience gained from ", source, ": +", amount, " (xp=", experience_xp, " level=", experience_level, ")")

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
