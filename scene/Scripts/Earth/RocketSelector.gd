extends Control

signal create_rocket(rocket_id)

@export var unlocked_rockets := []

const ROCKET_TEXTURES = {
	"starterrocket1": preload("res://assets/Vehicles/StarterRocket1.png")
}

var ui_position: Vector2 = Vector2(80, 160)
var ui_size: Vector2 = Vector2(720, 360)

# Drag state
var _dragging: bool = false
var _drag_node: TextureRect = null
var _drag_rocket_id: String = ""

func _ready():
	position = ui_position
	size = ui_size
	# Load unlocked rockets from RocketsManager if available
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	unlocked_rockets = rm.get_unlocked()
	_build_ui()
	set_process(true)

func _build_ui():
	var panel = Panel.new()
	panel.name = "Panel"
	panel.custom_minimum_size = ui_size
	add_child(panel)

	var vbox = VBoxContainer.new()
	vbox.name = "VBox"
	vbox.custom_minimum_size = ui_size
	vbox.anchor_right = 1.0
	vbox.anchor_bottom = 1.0
	panel.add_child(vbox)

	var title = Label.new()
	title.name = "Title"
	title.text = "Available Rockets"
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	vbox.add_child(title)

	var grid = GridContainer.new()
	grid.name = "Grid"
	grid.columns = 3
	grid.custom_minimum_size = Vector2(ui_size.x, ui_size.y - 40)
	vbox.add_child(grid)

	for rocket_id in unlocked_rockets:
		var box = VBoxContainer.new()
		box.add_theme_constant_override("separation", 6)

		var tex = ROCKET_TEXTURES.get(rocket_id, null)
		if tex:
			var tr = TextureRect.new()
			tr.texture = tex
			tr.expand = true
			tr.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
			tr.custom_minimum_size = Vector2(96, 192)
			# support click-to-create and drag-to-place
			tr.connect("gui_input", Callable(self, "_on_texture_gui_input").bind(rocket_id, tex))
			box.add_child(tr)
		else:
			var label = Label.new()
			label.text = rocket_id
			label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
			box.add_child(label)

		var btn = Button.new()
		btn.text = "Create"
		btn.pressed.connect(Callable(self, "_on_create_pressed").bind(rocket_id))
		box.add_child(btn)

		grid.add_child(box)

func _on_create_pressed(rocket_id):
	print("Create rocket requested:", rocket_id)
	emit_signal("create_rocket", rocket_id)
	# Try to find the Launchpad node in the current scene and call spawn_rocket
	var root = get_tree().current_scene
	if root:
		var launchpad = root.get_node_or_null("StructuresLayer/Launchpad")
		if launchpad:
			if launchpad.has_method("spawn_rocket"):
				launchpad.spawn_rocket(rocket_id)
				return
			else:
								# fallback: instantiate the rocket scene directly under Launchpad
								var path = "res://Scenes/Vehicles/StarterRocket1.tscn"
								var scene = load(path)
								if scene:
									var inst = scene.instantiate()
									launchpad.add_child(inst)
									inst.position = Vector2(-110.0, -170.0)
									inst.add_to_group("rocket")
									# persist placed rocket
									var rm = preload("res://Scripts/Utils/RocketsManager.gd")
									var new_id = rm.add_placed(rocket_id, inst.position)
									if typeof(new_id) == TYPE_STRING and new_id != "":
										inst.name = new_id
									return
	print("Warning: Launchpad not found or failed to spawn rocket")

func _on_texture_gui_input(rocket_id, tex, event):
	# Start drag on left button press
	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
			_start_drag(rocket_id, tex)

func _start_drag(rocket_id: String, tex):
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
	get_tree().current_scene.add_child(preview)
	_drag_node = preview

func _process(delta):
	if _dragging and _drag_node:
		var vp = get_viewport()
		var mp = vp.get_mouse_position()
		_drag_node.global_position = mp
		# detect release
		if not Input.is_mouse_button_pressed(MOUSE_BUTTON_LEFT):
			_finish_drag(mp)

func _finish_drag(global_pos: Vector2) -> void:
	if not _dragging:
		return
	var root = get_tree().current_scene
	if root:
		var launchpad = root.get_node_or_null("StructuresLayer/Launchpad")
		if launchpad:
			# convert launchpad global pos
			var lp_global = launchpad.get_global_position()
			var dist = lp_global.distance_to(global_pos)
			if dist < 400:
				# spawn on launchpad
				if launchpad.has_method("spawn_rocket"):
					launchpad.spawn_rocket(_drag_rocket_id)
				else:
					# fallback instantiate and persist
					var path = "res://Scenes/Vehicles/StarterRocket1.tscn"
					var scene = load(path)
					if scene:
							var inst = scene.instantiate()
							launchpad.add_child(inst)
							inst.position = Vector2(-110.0, -170.0)
							inst.add_to_group("rocket")
							var rm = preload("res://Scripts/Utils/RocketsManager.gd")
							var new_id = rm.add_placed(_drag_rocket_id, inst.position)
							if typeof(new_id) == TYPE_STRING and new_id != "":
								inst.name = new_id
	# cleanup preview
	if _drag_node and is_instance_valid(_drag_node):
		_drag_node.queue_free()
	_drag_node = null
	_dragging = false
	_drag_rocket_id = ""
