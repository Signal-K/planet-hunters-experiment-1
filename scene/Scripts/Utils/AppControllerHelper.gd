extends RefCounted
class_name AppControllerHelper

const FirstTimeMechanicTracker = preload("res://Scripts/Utils/FirstTimeMechanicTracker.gd")
const MINING_PRACTICE_LAYER_NAME := "MiningPracticeOverlayLayer"
const MINING_PRACTICE_LAYER_INDEX := 130

static func get_instance() -> Node:
	var tree = Engine.get_main_loop() as SceneTree
	if tree:
		return tree.root.find_child("AppController", true, false)
	return null

static func record_tutorial_action(action_key: String, metadata: Dictionary = {}) -> void:
	var app = get_instance()
	if app and app.has_method("record_tutorial_action"):
		app.record_tutorial_action(action_key, metadata)

static func is_menu_open() -> bool:
	var app = get_instance()
	if app and app.has_method("is_menu_open"):
		return bool(app.is_menu_open())
	return false

## Show a first-time mechanic introduction overlay exactly once per key.
## Key must have an entry in MechanicIntroCatalog.
## Call this from any scene that introduces a new game mechanic.
static func maybe_show_mechanic_intro(mechanic_key: String) -> void:
	var tree := Engine.get_main_loop() as SceneTree
	FirstTimeMechanicTracker.maybe_show(mechanic_key, tree)

static func open_mining_practice_panel(entry_point: String = "menu_panel") -> bool:
	var tree = Engine.get_main_loop() as SceneTree
	if tree == null or tree.root == null:
		return false
	var root = tree.root
	var layer = root.get_node_or_null(MINING_PRACTICE_LAYER_NAME) as CanvasLayer
	if layer == null:
		layer = CanvasLayer.new()
		layer.name = MINING_PRACTICE_LAYER_NAME
		layer.layer = MINING_PRACTICE_LAYER_INDEX
		root.add_child(layer)
	# Reuse existing panel if already open.
	var existing = layer.get_node_or_null("MiningPracticePanel")
	if existing != null:
		return true
	var scene := load("res://Scenes/UI/MiningPracticePanel.tscn")
	if scene == null:
		return false
	var panel = scene.instantiate()
	if panel == null:
		return false
	panel.set_meta("entry_point", entry_point)
	layer.add_child(panel)
	return true
