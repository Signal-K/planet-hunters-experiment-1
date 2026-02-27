extends Node

signal window_status_update(message: String)
signal franc_balance_updated(new_value: int)

var counter: int = 0
var franc_balance: int = 10000000000
var _game_paused: bool = false
var _menu_request_version: int = 0
var _menu_request_action: String = ""

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS

func set_counter_from_react(value: int) -> void:
	counter = value
	print("AppController: Counter set from React Native to: ", counter)

func get_counter() -> int:
	return counter

func set_franc_balance_from_react(value: int) -> void:
	franc_balance = value
	print("AppController: Franc balance set from React Native to: ", franc_balance)
	franc_balance_updated.emit(franc_balance)

func get_franc_balance() -> int:
	return franc_balance

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
	window.position = current_window.position + Vector2i(30,60)
	window.content_scale_mode = Window.CONTENT_SCALE_MODE_CANVAS_ITEMS
	window.content_scale_aspect = Window.CONTENT_SCALE_ASPECT_EXPAND
	window.tree_exited.connect(func() -> void:
		window.queue_free()
	)
	window.close_requested.connect(func() -> void:
		window.queue_free()
	)
	window.name = window_name
	var scene: PackedScene = load("res://subwindow.tscn")
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

func has_signal_connections(signal_name: String) -> bool:
	return get_signal_connection_list(signal_name).size() > 0
