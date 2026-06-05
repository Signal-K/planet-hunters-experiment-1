extends RefCounted
class_name GameNavigationMenu

const MENU_LAYER_NAME := "PortraitMenuLayer"
const MENU_SCENE := preload("res://Scenes/UI/GameNavigationMenuRoot.tscn")

static func open(owner: Node) -> void:
	var tree := owner.get_tree() if owner else Engine.get_main_loop() as SceneTree
	if tree == null or tree.root == null:
		return
	if tree.root.get_node_or_null(MENU_LAYER_NAME):
		return
	var layer := MENU_SCENE.instantiate()
	layer.name = MENU_LAYER_NAME
	tree.root.add_child(layer)
	var close_button := layer.find_child("CloseButton", true, false)
	if close_button is BaseButton:
		(close_button as BaseButton).pressed.connect(func(): close(owner))

static func close(owner: Node) -> void:
	var tree := owner.get_tree() if owner else Engine.get_main_loop() as SceneTree
	if tree == null or tree.root == null:
		return
	var existing := tree.root.get_node_or_null(MENU_LAYER_NAME)
	if existing:
		existing.queue_free()

static func toggle(owner: Node) -> void:
	var tree := owner.get_tree() if owner else Engine.get_main_loop() as SceneTree
	if is_open(tree):
		close(owner)
	else:
		open(owner)

static func is_open(tree: SceneTree) -> bool:
	return tree != null and tree.root != null and tree.root.get_node_or_null(MENU_LAYER_NAME) != null
