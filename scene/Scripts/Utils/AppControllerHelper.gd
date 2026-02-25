extends RefCounted
class_name AppControllerHelper

static func get_instance() -> Node:
	var tree = Engine.get_main_loop() as SceneTree
	if tree:
		return tree.root.find_child("AppController", true, false)
	return null

static func show_tutorial_hint_once(action_key: String, message: String) -> void:
	var app = get_instance()
	if app and app.has_method("show_tutorial_hint_once"):
		app.show_tutorial_hint_once(action_key, message)
