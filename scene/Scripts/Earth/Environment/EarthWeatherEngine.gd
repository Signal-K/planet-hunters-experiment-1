extends Node
class_name EarthWeatherEngine

signal cycle_updated(cycle_t: float, night_factor: float)

@export var cycle_duration_seconds: float = 60.0
@export var auto_start: bool = true
@export var start_cycle_t: float = 0.0

var _running := false
var _elapsed := 0.0
var _event_nodes: Array[Node] = []

func _ready() -> void:
	_elapsed = clamp(start_cycle_t, 0.0, 1.0) * max(cycle_duration_seconds, 0.001)
	_running = auto_start
	_refresh_event_nodes()
	_emit_cycle_update(0.0)

func _process(delta: float) -> void:
	if not _running:
		return
	var duration = max(cycle_duration_seconds, 0.001)
	_elapsed = fmod(_elapsed + delta, duration)
	_emit_cycle_update(delta)

func start() -> void:
	_running = true

func stop() -> void:
	_running = false

func set_cycle_t(value: float) -> void:
	var duration = max(cycle_duration_seconds, 0.001)
	_elapsed = clamp(value, 0.0, 1.0) * duration
	_emit_cycle_update(0.0)

func register_event(event_node: Node) -> void:
	if event_node == null:
		return
	if _event_nodes.has(event_node):
		return
	_event_nodes.append(event_node)

func unregister_event(event_node: Node) -> void:
	_event_nodes.erase(event_node)

func get_cycle_t() -> float:
	return _elapsed / max(cycle_duration_seconds, 0.001)

func get_night_factor() -> float:
	var t = get_cycle_t()
	return 0.5 - 0.5 * cos(TAU * t)

func _emit_cycle_update(delta: float) -> void:
	var cycle_t = get_cycle_t()
	var night_factor = get_night_factor()
	cycle_updated.emit(cycle_t, night_factor)
	for node in _event_nodes:
		if is_instance_valid(node) and node.has_method("on_day_night_tick"):
			node.call("on_day_night_tick", cycle_t, night_factor, delta)

func _refresh_event_nodes() -> void:
	_event_nodes.clear()
	var scene_root = get_tree().current_scene
	if scene_root == null:
		return
	_collect_event_nodes(scene_root)

func _collect_event_nodes(node: Node) -> void:
	if node != self and node.has_method("on_day_night_tick"):
		_event_nodes.append(node)
	for child in node.get_children():
		_collect_event_nodes(child)
