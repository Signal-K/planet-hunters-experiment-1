extends RefCounted
class_name AppControllerHelper

static func get_instance() -> Node:
	var tree = Engine.get_main_loop() as SceneTree
	if tree:
		return tree.root.find_child("AppController", true, false)
	return null

static func record_tutorial_action(action_key: String, metadata: Dictionary = {}) -> void:
	var app = get_instance()
	if app and app.has_method("record_tutorial_action"):
		app.record_tutorial_action(action_key, metadata)
