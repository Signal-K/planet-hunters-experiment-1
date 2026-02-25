extends RefCounted
class_name NavigationMixin

## Reusable navigation patterns for scene transitions
## Use this to avoid duplicate _on_back_pressed() implementations

const EARTH_SCENE := "res://Scenes/Earth/earth_base_1.tscn"

static func go_back_to_earth(tree: SceneTree) -> void:
	"""Navigate back to Earth base scene"""
	if tree:
		tree.change_scene_to_file(EARTH_SCENE)

static func go_to_scene(tree: SceneTree, scene_path: String) -> void:
	"""Navigate to specified scene"""
	if tree:
		tree.change_scene_to_file(scene_path)

static func close_panel(node: Node) -> void:
	"""Close/free a panel node"""
	if node:
		node.queue_free()

static func setup_back_button(button: Button, tree: SceneTree) -> void:
	"""Setup a back button to return to Earth"""
	if button and not button.pressed.is_connected(go_back_to_earth.bind(tree)):
		button.pressed.connect(func(): go_back_to_earth(tree))

static func setup_close_button(button: Button, panel: Node) -> void:
	"""Setup a close button to free the panel"""
	if button and not button.pressed.is_connected(close_panel.bind(panel)):
		button.pressed.connect(func(): close_panel(panel))
