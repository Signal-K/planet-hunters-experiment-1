extends Node

signal window_status_update(message: String)
signal franc_balance_updated(new_value: int)
signal experience_updated(xp: int, level: int)

var counter: int = 0
var franc_balance: int = 10000000000
var experience_xp: int = 0
var experience_level: int = 1
var _game_paused: bool = false
var _menu_request_version: int = 0
var _menu_request_action: String = ""
var _last_mining_result: Dictionary = {}
var _last_mining_result_synced: bool = true

const BASE_XP_TO_LEVEL := 10
const XP_AWARD_LAUNCH := 5
const XP_AWARD_SCAN := 2

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	print("Project AppController ready")
	load_experience()

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

func add_experience(amount: int, source: String = "") -> void:
	if amount <= 0:
		return
	experience_xp += amount
	while experience_xp >= _xp_required_for_level(experience_level):
		experience_xp -= _xp_required_for_level(experience_level)
		experience_level += 1
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
	_emit_experience_updated()
	save_experience()

func get_experience_xp() -> int:
	return experience_xp

func get_experience_level() -> int:
	return experience_level

func save_experience() -> void:
	var cfg = ConfigFile.new()
	cfg.set_value("experience", "xp", experience_xp)
	cfg.set_value("experience", "level", experience_level)
	var err = cfg.save("user://experience.cfg")
	if err != OK:
		print("[AppController] Failed to save experience: ", err)
	else:
		print("[AppController] Experience saved: xp=", experience_xp, " level=", experience_level)

func load_experience() -> void:
	var cfg = ConfigFile.new()
	var err = cfg.load("user://experience.cfg")
	if err == OK:
		if cfg.has_section_key("experience", "xp") and cfg.has_section_key("experience", "level"):
			experience_xp = int(cfg.get_value("experience", "xp"))
			experience_level = int(cfg.get_value("experience", "level"))
			print("[AppController] Loaded experience from disk: xp=", experience_xp, " level=", experience_level)
			_emit_experience_updated()
		else:
			print("[AppController] No experience keys in config; using defaults")
	else:
		print("[AppController] No saved experience config (or failed to load): ", err)

func _emit_experience_updated() -> void:
	experience_updated.emit(experience_xp, experience_level)

func _xp_required_for_level(level: int) -> int:
	return BASE_XP_TO_LEVEL + max(level, 1)

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

func set_last_mining_result(result: Dictionary) -> void:
	_last_mining_result = result
	_last_mining_result_synced = false
	print("AppController: New mining result set: ", result)

func mark_mining_result_synced() -> void:
	_last_mining_result_synced = true
	print("AppController: Mining result marked as synced")

func trigger_instant_mining() -> void:
	print("AppController: Triggering instant mining...")
	var root = get_tree().root
	var current_scene = root.get_child(root.get_child_count() - 1)

	if current_scene.has_method("_on_mine_pressed"):
		current_scene._on_mine_pressed()
	else:
		print("AppController: Current scene doesn't support mining. Loading test_mining...")
		_auto_start_mining = true
		get_tree().change_scene_to_file("res://test_mining.tscn")

func check_auto_start_mining() -> bool:
	var val = _auto_start_mining
	_auto_start_mining = false
	return val

func has_signal_connections(signal_name: String) -> bool:
	return get_signal_connection_list(signal_name).size() > 0
