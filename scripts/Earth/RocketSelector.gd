extends Control

signal create_rocket(rocket_id)

@export var unlocked_rockets := ["starterrocket1"]

const ROCKET_TEXTURES = {
    "starterrocket1": preload("res://assets/Vehicles/StarterRocket1.png")
}

var ui_position: Vector2 = Vector2(80, 160)
var ui_size: Vector2 = Vector2(720, 360)

func _ready():
    position = ui_position
    size = ui_size
    _build_ui()

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
                    inst.position = Vector2(0, -520)
                    return
    print("Warning: Launchpad not found or failed to spawn rocket")
