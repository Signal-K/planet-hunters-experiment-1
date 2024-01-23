extends Node3D

const PREVIEW_SCENE_PATH := "res://Scenes/UI/AsteroidPreview/asteroid_preview.tscn"

const EARTH_ORBIT_TIME := 3.5
const EARTH_FADE_TIME := 2.5
const TRAVEL_TIME := 20.0
const TARGET_APPROACH_TIME := 6.0
const ORBIT_ROTATION_SPEED := 0.25
const ORBIT_RADIUS_PX := 416.0
const ORBIT_SEGMENTS := 64

const SPEED_MIN_KMH := 32000.0
const SPEED_MAX_KMH := 140000.0
const NumberFormat = preload("res://Scripts/Utils/NumberFormat.gd")


@onready var asteroid_pivot: Node3D = $AsteroidPivot
@onready var asteroid_mesh: MeshInstance3D = $AsteroidPivot/Asteroid
@onready var camera_3d: Camera3D = $Camera3D
@onready var orbit_root: Node2D = $CanvasLayer/Orbit2D
@onready var orbit_circle: Line2D = $CanvasLayer/Orbit2D/OrbitCircle
@onready var orbit_heading: Line2D = $CanvasLayer/Orbit2D/OrbitHeading
@onready var orbit_rocket: AnimatedSprite2D = $CanvasLayer/Orbit2D/OrbitRocket2D
@onready var back_button: Button = $CanvasLayer/UI/Margin/VBox/Header/BackButton
@onready var target_label: Label = $CanvasLayer/UI/Margin/VBox/Header/TargetLabel
@onready var minerals_panel: Panel = $CanvasLayer/UI/Margin/VBox/MineralsPanel
@onready var minerals_title: Label = $CanvasLayer/UI/Margin/VBox/MineralsPanel/MineralsMargin/MineralsContent/MineralsTitle
@onready var minerals_summary: Label = $CanvasLayer/UI/Margin/VBox/MineralsPanel/MineralsMargin/MineralsContent/MineralsSummary
@onready var minerals_list: VBoxContainer = $CanvasLayer/UI/Margin/VBox/MineralsPanel/MineralsMargin/MineralsContent/MineralsList
@onready var control_panel: Panel = $CanvasLayer/UI/ControlPanel
@onready var return_home_button: Button = $CanvasLayer/UI/ControlPanel/ControlPanelMargin/ControlPanelButtons/ReturnHomeButton
@onready var mine_button: Button = $CanvasLayer/UI/ControlPanel/ControlPanelMargin/ControlPanelButtons/MineButton
@onready var inventory_panel: Panel = $CanvasLayer/UI/InventoryPanel
@onready var travel_panel: Panel = $CanvasLayer/UI/TravelPanel
@onready var travel_title: Label = $CanvasLayer/UI/TravelPanel/TravelMargin/TravelContent/TravelTitle
@onready var travel_bar: ProgressBar = $CanvasLayer/UI/TravelPanel/TravelMargin/TravelContent/TravelBar
@onready var travel_speed: Label = $CanvasLayer/UI/TravelPanel/TravelMargin/TravelContent/TravelSpeed

var _orbit_angle := 0.0
var _phase_time := 0.0
var _earth_alpha := 1.0
var _target_alpha := 0.0
var _current_target_id := ""
var _current_target_label := ""
var _current_target_type := ""
var _current_rocket_id := ""
var _earth_pivot: Node3D
var _earth_mesh: MeshInstance3D
var _traveling := false

enum Phase {
	EARTH_ORBIT,
	TRAVEL,
	TARGET_APPROACH,
	TARGET_ORBIT
}

var _phase := Phase.EARTH_ORBIT

func _ready() -> void:
	_setup_ui()
	_load_target_data()
	_generate_target_asteroid(_current_target_id)
	_setup_earth()
	_setup_orbit_visual()
	_start_earth_orbit()

func _process(delta: float) -> void:
	_phase_time += delta
	_update_orbit(delta)
	_apply_earth_alpha()
	if _phase == Phase.EARTH_ORBIT and _phase_time >= EARTH_ORBIT_TIME:
		_start_travel()
	elif _phase == Phase.TRAVEL:
		_update_travel()
	elif _phase == Phase.TARGET_APPROACH and _phase_time >= TARGET_APPROACH_TIME:
		_start_target_orbit()
	_update_target_label()

func _setup_ui() -> void:
	var panel_style = preload("res://Scripts/UI/PanelStyle.gd")
	panel_style.apply_button(back_button, false)
	panel_style.apply_title(target_label)
	panel_style.apply_panel(minerals_panel)
	panel_style.apply_title(minerals_title)
	panel_style.apply_body(minerals_summary)
	panel_style.apply_panel(inventory_panel)
	panel_style.apply_panel(control_panel)
	panel_style.apply_button(return_home_button, false)
	panel_style.apply_button(mine_button, true)
	panel_style.apply_panel(travel_panel)
	panel_style.apply_title(travel_title)
	panel_style.apply_body(travel_speed)
	panel_style.apply_progress_bar(travel_bar)
	travel_panel.visible = false
	minerals_panel.visible = false
	control_panel.visible = false
	inventory_panel.visible = false
	back_button.pressed.connect(_on_back_pressed)
	if mine_button:
		mine_button.pressed.connect(_on_mine_pressed)
	if return_home_button:
		return_home_button.pressed.connect(_on_return_home_pressed)

func _load_target_data() -> void:
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	var target := {}
	if rm:
		target = rm.get_preview_target()
	_current_target_id = str(target.get("id", ""))
	_current_target_label = str(target.get("label", ""))
	_current_target_type = str(target.get("type", "asteroid"))
	_current_rocket_id = str(target.get("rocket_id", ""))

func _update_target_label() -> void:
	if target_label == null:
		return
	if _current_target_label != "":
		target_label.text = "En route to %s" % _current_target_label
	elif _current_target_id != "":
		target_label.text = "En route to Asteroid %s" % _current_target_id
	else:
		target_label.text = "En route to target"

func _setup_earth() -> void:
	_earth_pivot = Node3D.new()
	_earth_pivot.name = "EarthPivot"
	add_child(_earth_pivot)
	_earth_mesh = MeshInstance3D.new()
	_earth_mesh.name = "Earth"
	_earth_pivot.add_child(_earth_mesh)
	_generate_earth()
	_earth_mesh.visible = true
	if asteroid_mesh:
		asteroid_mesh.visible = false

func _setup_orbit_visual() -> void:
	if orbit_root == null or orbit_circle == null or orbit_rocket == null or orbit_heading == null:
		return
	orbit_root.visible = true
	_orbit_angle = 0.0
	var orbit_utils = preload("res://Scripts/Utils/OrbitVisuals.gd")
	orbit_utils.build_orbit_circle(orbit_circle, ORBIT_RADIUS_PX, ORBIT_SEGMENTS)
	orbit_rocket.position = Vector2(ORBIT_RADIUS_PX, 0)
	orbit_rocket.scale = Vector2(0.2, 0.2)
	_set_orbit_rocket_visual(_current_rocket_id)
	var orbit_utils2 = preload("res://Scripts/Utils/OrbitVisuals.gd")
	orbit_utils2.update_heading_line(orbit_heading, orbit_rocket)

func _start_earth_orbit() -> void:
	_phase = Phase.EARTH_ORBIT
	_phase_time = 0.0
	_earth_alpha = 1.0
	_target_alpha = 0.0
	_traveling = false
	travel_panel.visible = false
	minerals_panel.visible = false
	control_panel.visible = false
	inventory_panel.visible = false
	if orbit_circle:
		orbit_circle.visible = true
	if _earth_mesh:
		_earth_mesh.visible = true
	if asteroid_mesh:
		asteroid_mesh.visible = false

func _start_travel() -> void:
	_phase = Phase.TRAVEL
	_phase_time = 0.0
	_traveling = true
	travel_panel.visible = true
	travel_panel.modulate.a = 0.0
	get_tree().create_tween().tween_property(travel_panel, "modulate:a", 1.0, 0.6)
	get_tree().create_tween().tween_property(self, "_earth_alpha", 0.0, EARTH_FADE_TIME)
	if orbit_circle:
		orbit_circle.visible = false

func _update_travel() -> void:
	if not _traveling:
		return
	var pct = clamp(_phase_time / TRAVEL_TIME, 0.0, 1.0)
	if travel_bar:
		travel_bar.value = pct
	if travel_speed:
		var eased = pct * pct * (3.0 - 2.0 * pct)
		var speed = lerp(SPEED_MIN_KMH, SPEED_MAX_KMH, eased)
		travel_speed.text = "Speed: %s km/h" % NumberFormat.commas(str(int(round(speed))))
	if pct >= 1.0:
		_start_target_approach()

func _start_target_approach() -> void:
	_phase = Phase.TARGET_APPROACH
	_phase_time = 0.0
	_traveling = false
	if travel_panel:
		var fade = get_tree().create_tween()
		fade.tween_property(travel_panel, "modulate:a", 0.0, 0.6)
		fade.finished.connect(func():
			travel_panel.visible = false
		)
	_target_alpha = 1.0
	if asteroid_mesh:
		asteroid_mesh.visible = true
		asteroid_pivot.scale = Vector3(0.35, 0.35, 0.35)
		var grow = get_tree().create_tween()
		grow.tween_property(asteroid_pivot, "scale", Vector3.ONE, TARGET_APPROACH_TIME)\
			.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)
	if _earth_mesh:
		_earth_mesh.visible = false

func _start_target_orbit() -> void:
	_phase = Phase.TARGET_ORBIT
	_phase_time = 0.0
	minerals_panel.visible = true
	control_panel.visible = true
	inventory_panel.visible = true
	minerals_panel.modulate.a = 0.0
	inventory_panel.modulate.a = 0.0
	control_panel.modulate.a = 0.0
	if orbit_circle:
		orbit_circle.visible = true
	if orbit_heading:
		orbit_heading.visible = true
	var t = get_tree().create_tween()
	t.tween_property(minerals_panel, "modulate:a", 1.0, 0.6)
	t.parallel().tween_property(inventory_panel, "modulate:a", 1.0, 0.6)
	t.parallel().tween_property(control_panel, "modulate:a", 1.0, 0.6)
	_build_minerals_list()

func _update_orbit(delta: float) -> void:
	if orbit_root == null or orbit_rocket == null:
		return
	_orbit_angle += ORBIT_ROTATION_SPEED * delta
	if _phase == Phase.TRAVEL:
		orbit_rocket.position = Vector2.ZERO
		orbit_rocket.rotation = 0.0
	else:
		var offset = Vector2(cos(_orbit_angle), sin(_orbit_angle)) * ORBIT_RADIUS_PX
		orbit_rocket.position = offset
		orbit_rocket.rotation = _orbit_angle + PI
	if camera_3d and asteroid_pivot:
		if _phase in [Phase.EARTH_ORBIT, Phase.TRAVEL]:
			orbit_root.position = camera_3d.unproject_position(_earth_pivot.global_position)
		else:
			orbit_root.position = camera_3d.unproject_position(asteroid_pivot.global_position)
	var orbit_utils3 = preload("res://Scripts/Utils/OrbitVisuals.gd")
	orbit_utils3.update_heading_line(orbit_heading, orbit_rocket)

func _build_minerals_list() -> void:
	if minerals_list == null:
		return
	for child in minerals_list.get_children():
		child.queue_free()
	var resource_yield = preload("res://Scripts/Utils/ResourceYield.gd")
	var yield_data = resource_yield.get_yield_for_target(_current_target_id, _current_target_type, 1)
	var minerals: Dictionary = yield_data.get("minerals", {})
	var capacity = int(yield_data.get("capacity", 0))
	minerals_title.text = "Minerals Available"
	minerals_summary.text = "Asteroid Level 1 • Mineable: %d%% • %s units" % [
		int(round(float(yield_data.get("mineable_pct", 0.1)) * 100.0)),
		NumberFormat.commas(str(capacity))
	]
	var panel_style = preload("res://Scripts/UI/PanelStyle.gd")
	for name in resource_yield.MINERALS:
		if not minerals.has(name):
			continue
		var row = HBoxContainer.new()
		var name_lbl = Label.new()
		name_lbl.text = str(name)
		name_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		panel_style.apply_body(name_lbl)
		var amount_lbl = Label.new()
		amount_lbl.text = NumberFormat.commas(str(minerals.get(name, 0)))
		panel_style.apply_muted(amount_lbl)
		row.add_child(name_lbl)
		row.add_child(amount_lbl)
		minerals_list.add_child(row)

func _generate_target_asteroid(target_id: String) -> void:
	if asteroid_mesh == null:
		return
	var builder = preload("res://Scripts/Utils/ProceduralBodyBuilder.gd")
	builder.build_asteroid(asteroid_mesh, target_id, 0.72, 0.96, Color(0.35, 0.35, 0.35))

func _generate_earth() -> void:
	if _earth_mesh == null:
		return
	var builder = preload("res://Scripts/Utils/ProceduralBodyBuilder.gd")
	builder.build_earth(_earth_mesh, "earth:%s" % _current_target_id, Color(0.1, 0.2, 0.4))
	_apply_earth_alpha()

func _apply_earth_alpha() -> void:
	if _earth_mesh == null:
		return
	var material: StandardMaterial3D = _earth_mesh.material_override
	if material:
		material.albedo_color.a = _earth_alpha

func _set_orbit_rocket_visual(rocket_id: String) -> void:
	if orbit_rocket == null:
		return
	var helper = preload("res://Scripts/Utils/RocketSpriteHelper.gd")
	helper.apply_orbit_sprite(orbit_rocket, rocket_id)

func _advance_to_preview() -> void:
	var tree = Engine.get_main_loop() as SceneTree
	if tree == null:
		return
	var scene_manager = null
	if tree.current_scene:
		scene_manager = tree.current_scene.get_node_or_null("SceneManager")
	if scene_manager and scene_manager.has_method("change_to_scene"):
		scene_manager.change_to_scene(PREVIEW_SCENE_PATH)
	else:
		tree.change_scene_to_file(PREVIEW_SCENE_PATH)

func _on_back_pressed() -> void:
	_advance_to_preview()

func _on_mine_pressed() -> void:
	# This scene is a transit presentation; move into the interactive preview
	# where mining gameplay is handled.
	_advance_to_preview()

func _on_return_home_pressed() -> void:
	# Keep behavior deterministic even if player presses return during transit preview:
	# jump to interactive preview where return flow is available.
	_advance_to_preview()
