extends RefCounted
class_name RocketSelectorDragHelper

var _parent: Node
var _on_drop: Callable
var _dragging: bool = false
var _drag_node: TextureRect = null
var _drag_rocket_id: String = ""

func setup(parent: Node, on_drop: Callable) -> void:
	_parent = parent
	_on_drop = on_drop

func start_drag(rocket_id: String, tex: Texture2D) -> void:
	if _dragging:
		return
	_dragging = true
	_drag_rocket_id = rocket_id
	# create a temporary preview sprite that follows the mouse
	var preview = TextureRect.new()
	preview.texture = tex
	preview.expand = true
	preview.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	preview.custom_minimum_size = Vector2(160, 320)
	preview.z_index = 10000
	_parent.get_tree().current_scene.add_child(preview)
	_drag_node = preview

func process(delta: float) -> void:
	if _dragging and _drag_node:
		var vp = _parent.get_viewport()
		var mp = vp.get_mouse_position()
		_drag_node.global_position = mp
		# detect release
		if not Input.is_mouse_button_pressed(MOUSE_BUTTON_LEFT):
			_finish_drag(mp)

func _finish_drag(global_pos: Vector2) -> void:
	if not _dragging:
		return
	var root = _parent.get_tree().current_scene
	if root:
		var launchpad = root.get_node_or_null("StructuresLayer/Launchpad")
		if launchpad:
			# convert launchpad global pos
			var lp_global = launchpad.get_global_position()
			var dist = lp_global.distance_to(global_pos)
			if dist < 400 and _on_drop.is_valid():
				# spawn on launchpad
				_on_drop.call(_drag_rocket_id)
	# cleanup preview
	if _drag_node and is_instance_valid(_drag_node):
		_drag_node.queue_free()
	_drag_node = null
	_dragging = false
	_drag_rocket_id = ""
