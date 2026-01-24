extends Node

## App Controller for Scene Project
## Manages communication between React Native and Godot
## Handles counter synchronization and window management

signal window_status_update(message: String)
signal counter_updated(new_value: int)
signal tutorial_completed_updated(is_completed: bool)
signal franc_balance_updated(new_value: int)

var counter: int = 0
var tutorial_completed: bool = false
var franc_balance: int = 0
var menu_panel_scene = preload("res://Scenes/UI/MenuPanel.tscn")
var current_menu_panel: Control = null

func _ready() -> void:
	print("AppController ready, counter initialized to: ", counter)
	print("AppController ready, tutorial_completed initialized to: ", tutorial_completed)

	# Load persisted tutorial state from disk (if present)
	load_tutorial_completed()

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
	if current_menu_panel and current_menu_panel.has_method("set_counter"):
		current_menu_panel.set_counter(counter)
	# Emit signals to notify React Native
	counter_updated.emit(counter)
	tutorial_completed_updated.emit(tutorial_completed)

	# Persist tutorial reset
	save_tutorial_completed()
	franc_balance_updated.emit(franc_balance)
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
	var cfg = ConfigFile.new()
	cfg.set_value("tutorial", "completed", tutorial_completed)
	var err = cfg.save("user://tutorial.cfg")
	if err != OK:
		print("[AppController] Failed to save tutorial state: ", err)
	else:
		print("[AppController] Tutorial state saved: ", tutorial_completed)

func load_tutorial_completed() -> void:
	var cfg = ConfigFile.new()
	var err = cfg.load("user://tutorial.cfg")
	if err == OK:
		if cfg.has_section_key("tutorial", "completed"):
			tutorial_completed = bool(cfg.get_value("tutorial", "completed"))
			print("[AppController] Loaded tutorial state from disk: ", tutorial_completed)
			# notify any listeners so UI updates immediately
			tutorial_completed_updated.emit(tutorial_completed)
		else:
			print("[AppController] No tutorial state key in config; using default: ", tutorial_completed)
	else:
		print("[AppController] No saved tutorial config (or failed to load): ", err)

func set_franc_balance_from_react(value: int) -> void:
	"""Set franc balance from React Native"""
	franc_balance = value
	franc_balance_updated.emit(franc_balance)
	print("[AppController] Franc balance set from React Native: ", franc_balance)

func get_franc_balance() -> int:
	"""Get franc balance"""
	return franc_balance