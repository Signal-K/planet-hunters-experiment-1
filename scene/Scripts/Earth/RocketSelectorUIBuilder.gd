extends RefCounted
class_name RocketSelectorUIBuilder

var _parent: Node
var _ui_size: Vector2
var _rocket_textures: Dictionary
var _creation_locked: bool
var _on_create: Callable
var _on_texture_input: Callable

func setup(
	parent: Node,
	ui_size: Vector2,
	rocket_textures: Dictionary,
	creation_locked: bool,
	on_create: Callable,
	on_texture_input: Callable
) -> void:
	_parent = parent
	_ui_size = ui_size
	_rocket_textures = rocket_textures
	_creation_locked = creation_locked
	_on_create = on_create
	_on_texture_input = on_texture_input

func build_ui(unlocked_rockets: Array) -> void:
	var panel = Panel.new()
	panel.name = "Panel"
	panel.custom_minimum_size = _ui_size
	_parent.add_child(panel)

	var vbox = VBoxContainer.new()
	vbox.name = "VBox"
	vbox.custom_minimum_size = _ui_size
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
	grid.custom_minimum_size = Vector2(_ui_size.x, _ui_size.y - 40)
	vbox.add_child(grid)

	for rocket_id in unlocked_rockets:
		var box = VBoxContainer.new()
		box.add_theme_constant_override("separation", 6)

		var tex = _rocket_textures.get(rocket_id, null)
		if tex:
			var tr = TextureRect.new()
			tr.texture = tex
			tr.expand = true
			tr.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
			tr.custom_minimum_size = Vector2(96, 192)
			# support click-to-create and drag-to-place
			tr.connect("gui_input", _on_texture_input.bind(rocket_id, tex))
			box.add_child(tr)
		else:
			var label = Label.new()
			label.text = rocket_id
			label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
			box.add_child(label)

		var btn = Button.new()
		btn.text = "Create"
		btn.disabled = _creation_locked
		btn.pressed.connect(_on_create.bind(rocket_id))
		box.add_child(btn)

		grid.add_child(box)
