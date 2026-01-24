extends Node

signal window_status_update(message: String)
signal franc_balance_updated(new_value: int)
signal tutorial_completed_updated(is_completed: bool)

# Counter state shared between React Native and Godot
var counter: int = 0

# Franc balance state shared between React Native and Godot
var franc_balance: int = 10000000000  # Default 10B

# Tutorial completion state shared between React Native and Godot
var tutorial_completed: bool = false

#region React Public API

## Set counter value from React Native
func set_counter_from_react(value: int) -> void:
	counter = value
	print("AppController: Counter set from React Native to: ", counter)

## Get counter value for React Native
func get_counter() -> int:
	return counter

## Set Franc balance from React Native
func set_franc_balance_from_react(value: int) -> void:
	franc_balance = value
	print("AppController: Franc balance set from React Native to: ", franc_balance)
	franc_balance_updated.emit(franc_balance)

## Get Franc balance for React Native
func get_franc_balance() -> int:
	return franc_balance

## Set tutorial completion status from React Native
func set_tutorial_completed_from_react(is_completed: bool) -> void:
	tutorial_completed = is_completed
	print("AppController: Tutorial completed set from React Native to: ", tutorial_completed)
	tutorial_completed_updated.emit(tutorial_completed)

## Get tutorial completion status for React Native
func get_tutorial_completed() -> bool:
	return tutorial_completed
func open_window(window_name: String) -> Window:
	window_status_update.emit("Window opened: " + window_name)
	var root = get_tree().root
	var window := Window.new()
	window.world_3d = World3D.new()
	var current_window = get_viewport().get_window()
	window.size = current_window.size
	window.content_scale_size = get_viewport().get_window().content_scale_size
	window.size.y *= float(window.content_scale_size.x)/float(window.size.x)
	window.size.y -= 90
	window.size.x = window.content_scale_size.x - 60
	window.position = current_window.position + Vector2i(30,60) # just for debugging
	window.content_scale_mode = Window.CONTENT_SCALE_MODE_CANVAS_ITEMS
	window.content_scale_aspect = Window.CONTENT_SCALE_ASPECT_EXPAND
	window.tree_exited.connect(func() -> void:
		window.queue_free() # In case it was removed from the tree but not with queue_free
	)
	window.close_requested.connect(func() -> void:
		window.queue_free()
	)
	window.name = window_name
	var scene: PackedScene = load("res://subwindow.tscn") # blocks if not loaded yet
	window.add_child(scene.instantiate())
	root.add_child(window)
	window.get_viewport().scaling_3d_scale = get_viewport().scaling_3d_scale
	return window


func close_window(window_name: String) -> bool:
	window_status_update.emit("Window closed: " + window_name)
	var root = get_tree().root
	var windows: Array[Node] = root.find_children("*", "Window", false, false)
	for window: Window in windows:
		if window.name == window_name:
			window.queue_free()
			return true
	return false
