extends Node

## App Controller for Scene Project
## Manages communication between React Native and Godot
## Handles counter synchronization and window management

signal window_status_update(message: String)
signal counter_updated(new_value: int)

var counter: int = 0
var menu_panel_scene = preload("res://Scenes/UI/MenuPanel.tscn")
var current_menu_panel: Control = null

func _ready() -> void:
	print("AppController ready, counter initialized to: ", counter)

func set_counter_from_react(value: int) -> void:
	"""Set counter value from React Native"""
	counter = value
	counter_updated.emit(counter)
	
	# Update any open menu panels
	if current_menu_panel and current_menu_panel.has_method("set_counter"):
		current_menu_panel.set_counter(counter)
	
	print("[AppController] Counter set from React Native: ", counter)

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

func has_signal_connections(signal_name: String) -> bool:
	"""Check if signal has connections (for React Native compatibility)"""
	return get_signal_connection_list(signal_name).size() > 0