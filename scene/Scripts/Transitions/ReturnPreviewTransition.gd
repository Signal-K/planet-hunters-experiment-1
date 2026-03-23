extends Node3D

const RETURN_DESTINATION := "res://Scenes/Earth/mission_debrief_v2.tscn"

const TARGET_ORBIT_TIME := 2.5
const TARGET_FADE_TIME := 2.5
const TRAVEL_TIME := 20.0
const EARTH_APPROACH_TIME := 6.0
const ORBIT_ROTATION_SPEED := 0.25
const ORBIT_RADIUS_PX := 416.0
const ORBIT_SEGMENTS := 64

const TRAVEL_DISTANCE_TOTAL_KM := 420000.0
const NumberFormat = preload("res://Scripts/Utils/NumberFormat.gd")
const RocketSpecs = preload("res://Scripts/Utils/RocketSpecs.gd")
const ResourceValueRowScene = preload("res://Scenes/UI/Templates/ResourceValueRow.tscn")
const EmptyLabelScene = preload("res://Scenes/UI/Templates/MenuLogbookEmpty.tscn")
const RocketsManager = preload("res://Scripts/Utils/RocketsManager.gd")
const PanelStyle = preload("res://Scripts/UI/PanelStyle.gd")
const OrbitVisuals = preload("res://Scripts/Utils/OrbitVisuals.gd")
const MiningInventory = preload("res://Scripts/Utils/MiningInventory.gd")
const MineralPricing = preload("res://Scripts/Utils/MineralPricing.gd")
const ResourceYield = preload("res://Scripts/Utils/ResourceYield.gd")
const ProceduralBodyBuilder = preload("res://Scripts/Utils/ProceduralBodyBuilder.gd")
const RocketSpriteHelper = preload("res://Scripts/Utils/RocketSpriteHelper.gd")

const ORBIT_MULTIPLIER := 1.0
const EARTH_MULTIPLIER := 1.35

@onready var asteroid_pivot: Node3D = $AsteroidPivot
@onready var asteroid_mesh: MeshInstance3D = $AsteroidPivot/Asteroid
@onready var camera_3d: Camera3D = $Camera3D
@onready var orbit_root: Node2D = $CanvasLayer/Orbit2D
@onready var orbit_circle: Line2D = $CanvasLayer/Orbit2D/OrbitCircle
@onready var orbit_heading: Line2D = $CanvasLayer/Orbit2D/OrbitHeading
@onready var orbit_rocket: AnimatedSprite2D = $CanvasLayer/Orbit2D/OrbitRocket2D
@onready var _ui_margin: MarginContainer = $CanvasLayer/UI/Margin
@onready var back_button: Button = $CanvasLayer/UI/Margin/VBox/Header/BackButton
@onready var target_label: Label = $CanvasLayer/UI/Margin/VBox/Header/TargetLabel
@onready var minerals_panel: Panel = $CanvasLayer/UI/Margin/VBox/MineralsPanel
@onready var minerals_title: Label = $CanvasLayer/UI/Margin/VBox/MineralsPanel/MineralsMargin/MineralsContent/MineralsTitle
@onready var minerals_summary: Label = $CanvasLayer/UI/Margin/VBox/MineralsPanel/MineralsMargin/MineralsContent/MineralsSummary
@onready var minerals_list: VBoxContainer = $CanvasLayer/UI/Margin/VBox/MineralsPanel/MineralsMargin/MineralsContent/MineralsList
@onready var control_panel: Panel = $CanvasLayer/UI/ControlPanel
@onready var inventory_panel: Panel = $CanvasLayer/UI/InventoryPanel
@onready var travel_panel: Panel = $CanvasLayer/UI/TravelPanel
@onready var travel_title: Label = $CanvasLayer/UI/TravelPanel/TravelMargin/TravelContent/TravelTitle
@onready var travel_bar: ProgressBar = $CanvasLayer/UI/TravelPanel/TravelMargin/TravelContent/TravelBar
@onready var travel_speed: Label = $CanvasLayer/UI/TravelPanel/TravelMargin/TravelContent/TravelSpeed
@onready var summary_panel: Panel = $CanvasLayer/UI/SummaryPanel
@onready var summary_title: Label = $CanvasLayer/UI/SummaryPanel/SummaryMargin/SummaryContent/SummaryTitle
@onready var summary_list: VBoxContainer = $CanvasLayer/UI/SummaryPanel/SummaryMargin/SummaryContent/SummaryList
@onready var summary_orbit: Label = $CanvasLayer/UI/SummaryPanel/SummaryMargin/SummaryContent/SummaryOrbit
@onready var summary_earth: Label = $CanvasLayer/UI/SummaryPanel/SummaryMargin/SummaryContent/SummaryEarth
@onready var prev_button: Button = $CanvasLayer/UI/ButtonContainer/PrevButton
@onready var next_button: Button = $CanvasLayer/UI/ButtonContainer/NextButton

var _orbit_angle := 0.0
var _orbit_radius := ORBIT_RADIUS_PX
var _heading_angle := 0.0
var _center_locked := false
var _phase_time := 0.0
var _target_alpha := 1.0
var _earth_alpha := 0.0
var _current_target_id := ""
var _current_target_label := ""
var _current_target_type := ""
var _current_rocket_id := ""
var _earth_pivot: Node3D
var _earth_mesh: MeshInstance3D
var _traveling := false
var _auto_advance_started := false
var _depart_start_rocket_pos := Vector2.ZERO
var _last_viewport_size := Vector2.ZERO

enum Phase {
	TARGET_ORBIT,
	DEPART_TARGET,
	TRAVEL,
	EARTH_APPROACH,
	EARTH_ORBIT
}

var _phase := Phase.TARGET_ORBIT

func _should_start_at_earth_orbit() -> bool:
	var rm = RocketsManager
	if not rm:
		return false
	rm.mark_returned_if_due(_current_rocket_id)
	if rm.get_rocket_status(_current_rocket_id) == "returned":
		return true
	return rm.has_return_completed(_current_rocket_id)

func _ready() -> void:
	_setup_ui()
	_load_target_data()
	_generate_target_asteroid(_current_target_id)
	_setup_earth()
	_setup_orbit_visual()
	_apply_responsive_layout()
	if _should_start_at_earth_orbit():
		_start_earth_orbit()
	else:
		_start_target_orbit()

func _process(delta: float) -> void:
	var viewport_size = get_viewport().get_visible_rect().size
	if viewport_size != _last_viewport_size:
		_last_viewport_size = viewport_size
		_apply_responsive_layout()
	_phase_time += delta
	_update_orbit(delta)
	_apply_earth_alpha()
	if _phase != Phase.EARTH_ORBIT and _should_start_at_earth_orbit():
		_start_earth_orbit()
	if _phase == Phase.TARGET_ORBIT and _phase_time >= TARGET_ORBIT_TIME:
		_start_depart_target()
	elif _phase == Phase.DEPART_TARGET and _phase_time >= TARGET_FADE_TIME:
		_start_travel()
	elif _phase == Phase.TRAVEL:
		_update_travel()
	elif _phase == Phase.EARTH_APPROACH and _phase_time >= EARTH_APPROACH_TIME:
		_start_earth_orbit()
	_update_target_label()

func _setup_ui() -> void:
	var panel_style = PanelStyle
	panel_style.apply_button(back_button, false)
	panel_style.apply_title(target_label)
	panel_style.apply_panel(minerals_panel)
	panel_style.apply_title(minerals_title)
	panel_style.apply_body(minerals_summary)
	panel_style.apply_panel(inventory_panel)
	panel_style.apply_panel(control_panel)
	panel_style.apply_panel(travel_panel)
	panel_style.apply_title(travel_title)
	panel_style.apply_body(travel_speed)
	panel_style.apply_progress_bar(travel_bar)
	panel_style.apply_panel(summary_panel)
	panel_style.apply_title(summary_title)
	panel_style.apply_body(summary_orbit)
	panel_style.apply_body(summary_earth)
	travel_panel.visible = false
	summary_panel.visible = false
	summary_panel.modulate.a = 0.0
	control_panel.visible = false
	if prev_button:
		prev_button.visible = false
	if next_button:
		next_button.visible = false
	back_button.text = "Skip"
	back_button.visible = true
	back_button.pressed.connect(_on_continue_pressed)

func _apply_responsive_layout() -> void:
	var viewport = get_viewport().get_visible_rect().size
	if viewport == Vector2.ZERO:
		return
	var compact = viewport.x < 1360.0 or viewport.y < 860.0
	var edge_margin = 16.0
	var left_panel_width = clamp(viewport.x * (0.34 if compact else 0.30), 300.0, 420.0)
	var right_panel_width = clamp(viewport.x * (0.30 if compact else 0.26), 420.0, 520.0)
	# Safe area: compensate for Dynamic Island / notch and home indicator (landscape iPhone)
	var safe_top = 90.0 if viewport.x / max(viewport.y, 1.0) > 1.85 else 0.0
	var safe_bottom = 90.0 if viewport.x / max(viewport.y, 1.0) > 1.85 else 0.0
	if _ui_margin:
		_ui_margin.offset_top = 24.0 + safe_top
	if travel_panel:
		travel_panel.anchor_left = 0.0
		travel_panel.anchor_right = 0.0
		travel_panel.anchor_top = 0.0
		travel_panel.anchor_bottom = 0.0
		travel_panel.offset_left = edge_margin
		travel_panel.offset_top = 96.0 + safe_top
		travel_panel.offset_right = edge_margin + left_panel_width
		travel_panel.offset_bottom = 216.0 + safe_top
		travel_panel.custom_minimum_size.x = left_panel_width
	if summary_panel:
		summary_panel.custom_minimum_size.x = right_panel_width
		summary_panel.anchor_left = 1.0
		summary_panel.anchor_right = 1.0
		summary_panel.anchor_top = 0.0
		summary_panel.anchor_bottom = 0.0
		summary_panel.offset_left = -edge_margin - right_panel_width
		var summary_top = (96.0 if compact else 128.0) + safe_top
		summary_panel.offset_top = summary_top
		summary_panel.offset_right = -edge_margin
		summary_panel.offset_bottom = summary_top + (300.0 if compact else 360.0)
	if control_panel:
		control_panel.custom_minimum_size.x = right_panel_width
		control_panel.offset_left = -edge_margin - right_panel_width
		control_panel.offset_right = -edge_margin
	if inventory_panel:
		inventory_panel.custom_minimum_size.x = right_panel_width
		inventory_panel.offset_left = -edge_margin - right_panel_width
		inventory_panel.offset_right = -edge_margin
	# Bottom nav buttons: clear home indicator
	if prev_button:
		var btn_container = prev_button.get_parent()
		if btn_container:
			btn_container.offset_bottom = -safe_bottom

func _load_target_data() -> void:
	var rm = RocketsManager
	var returned := {}
	if rm:
		returned = rm.get_returned_mission()
	_current_target_id = str(returned.get("target_id", ""))
	_current_target_label = str(returned.get("label", ""))
	_current_target_type = str(returned.get("type", "asteroid"))
	_current_rocket_id = str(returned.get("rocket_id", ""))

func _update_target_label() -> void:
	if target_label == null:
		return
	if _phase in [Phase.EARTH_ORBIT, Phase.EARTH_APPROACH]:
		target_label.text = "Returning to Earth..."
		return
	if _current_target_label != "":
		target_label.text = "Leaving %s" % _current_target_label
	elif _current_target_id != "":
		target_label.text = "Leaving Asteroid %s" % _current_target_id
	else:
		target_label.text = "Leaving target"

func _setup_earth() -> void:
	_earth_pivot = Node3D.new()
	_earth_pivot.name = "EarthPivot"
	add_child(_earth_pivot)
	_earth_mesh = MeshInstance3D.new()
	_earth_mesh.name = "Earth"
	_earth_pivot.add_child(_earth_mesh)
	_generate_earth()
	_earth_mesh.visible = false

func _setup_orbit_visual() -> void:
	if orbit_root == null or orbit_circle == null or orbit_rocket == null or orbit_heading == null:
		return
	orbit_root.visible = true
	_orbit_angle = 0.0
	var orbit_utils = OrbitVisuals
	orbit_utils.build_orbit_circle(orbit_circle, _orbit_radius, ORBIT_SEGMENTS)
	orbit_rocket.position = Vector2(_orbit_radius, 0)
	orbit_rocket.scale = Vector2(0.2, 0.2)
	_set_orbit_rocket_visual(_current_rocket_id)
	var orbit_utils2 = OrbitVisuals
	orbit_utils2.update_heading_line(orbit_heading, orbit_rocket)

func _start_target_orbit() -> void:
	_phase = Phase.TARGET_ORBIT
	_phase_time = 0.0
	_target_alpha = 1.0
	_earth_alpha = 0.0
	_traveling = false
	_heading_angle = 0.0
	_center_locked = false
	minerals_panel.visible = true
	inventory_panel.visible = true
	control_panel.visible = false
	minerals_panel.modulate.a = 1.0
	inventory_panel.modulate.a = 1.0
	if orbit_circle:
		orbit_circle.visible = true
	if asteroid_mesh:
		asteroid_mesh.visible = true
	_build_minerals_list()

func _start_depart_target() -> void:
	_phase = Phase.DEPART_TARGET
	_phase_time = 0.0
	_heading_angle = orbit_rocket.rotation if orbit_rocket else 0.0
	_center_locked = true
	if orbit_rocket:
		_depart_start_rocket_pos = orbit_rocket.position
	minerals_panel.modulate.a = 1.0
	inventory_panel.modulate.a = 1.0
	var fade = get_tree().create_tween()
	fade.tween_property(minerals_panel, "modulate:a", 0.0, TARGET_FADE_TIME)
	fade.parallel().tween_property(inventory_panel, "modulate:a", 0.0, TARGET_FADE_TIME)
	fade.finished.connect(func():
		minerals_panel.visible = false
		inventory_panel.visible = false
	)
	_orbit_radius = 0.0
	if orbit_circle:
		orbit_circle.visible = false
	var size = get_viewport().get_visible_rect().size
	var center = size * 0.5
	if orbit_root:
		var tween = get_tree().create_tween()
		tween.tween_property(orbit_root, "position", center, 0.6)\
			.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)

func _start_travel() -> void:
	_phase = Phase.TRAVEL
	_phase_time = 0.0
	_traveling = true
	_orbit_radius = 0.0
	_center_locked = true
	travel_panel.visible = true
	travel_panel.modulate.a = 0.0
	get_tree().create_tween().tween_property(travel_panel, "modulate:a", 1.0, 0.6)
	_target_alpha = 0.0
	if asteroid_mesh:
		asteroid_mesh.visible = false

func _update_travel() -> void:
	if not _traveling:
		return
	var pct = clamp(_phase_time / TRAVEL_TIME, 0.0, 1.0)
	if travel_bar:
		travel_bar.value = pct
	if travel_speed:
		var remaining_km = max(int(round(TRAVEL_DISTANCE_TOTAL_KM * (1.0 - pct))), 0)
		travel_speed.text = "Distance to Earth: %s km" % NumberFormat.commas(str(remaining_km))
	if pct >= 1.0:
		_start_earth_approach()

func _start_earth_approach() -> void:
	_phase = Phase.EARTH_APPROACH
	_phase_time = 0.0
	_traveling = false
	_center_locked = false
	if travel_panel:
		var fade = get_tree().create_tween()
		fade.tween_property(travel_panel, "modulate:a", 0.0, 0.6)
		fade.finished.connect(func():
			travel_panel.visible = false
		)
	if _earth_mesh:
		_earth_mesh.visible = true
		_earth_alpha = 0.0
		get_tree().create_tween().tween_property(self, "_earth_alpha", 1.0, EARTH_APPROACH_TIME * 0.6)

func _start_earth_orbit() -> void:
	_phase = Phase.EARTH_ORBIT
	_phase_time = 0.0
	_orbit_radius = ORBIT_RADIUS_PX
	var orbit_utils3 = OrbitVisuals
	orbit_utils3.build_orbit_circle(orbit_circle, _orbit_radius, ORBIT_SEGMENTS)
	if orbit_circle:
		orbit_circle.visible = true
	_center_locked = false
	_traveling = false
	travel_panel.visible = false
	if orbit_root:
		var size = get_viewport().get_visible_rect().size
		orbit_root.position = size * 0.5
	_show_summary_panel()
	if not _auto_advance_started:
		_auto_advance_started = true
		var t = get_tree().create_timer(1.2)
		t.timeout.connect(func():
			_on_continue_pressed()
		)

func _show_summary_panel() -> void:
	if summary_panel == null:
		return
	_summary_content()
	summary_panel.visible = true
	var tween = get_tree().create_tween()
	tween.tween_property(summary_panel, "modulate:a", 1.0, 0.6)

func _summary_content() -> void:
	if summary_list == null:
		return
	for c in summary_list.get_children():
		c.queue_free()
	var inv = MiningInventory
	var state = inv.load_state()
	var targets = state.get("targets", {})
	var entry = targets.get(_current_target_id, {})
	var collected: Dictionary = entry.get("collected", {})
	var total_value := 0
	var panel_style = PanelStyle
	if collected.is_empty():
		var empty: Label = EmptyLabelScene.instantiate()
		empty.text = "No cargo recorded."
		panel_style.apply_muted(empty)
		summary_list.add_child(empty)
	else:
		for name in collected.keys():
			var row: HBoxContainer = ResourceValueRowScene.instantiate()
			var name_lbl: Label = row.get_node("NameLabel")
			name_lbl.text = str(name)
			panel_style.apply_body(name_lbl)
			var amount = int(collected.get(name, 0))
			var amount_lbl: Label = row.get_node("ValueLabel")
			amount_lbl.text = "%s kg" % NumberFormat.commas(str(amount))
			panel_style.apply_muted(amount_lbl)
			summary_list.add_child(row)
			var pricing = MineralPricing
			total_value += pricing.price_for(name, amount)
	var orbit_value = int(round(total_value * ORBIT_MULTIPLIER))
	var earth_value = int(round(total_value * EARTH_MULTIPLIER))
	summary_orbit.text = "Sell in Orbit: %s F" % NumberFormat.commas(str(orbit_value))
	summary_earth.text = "Sell on Earth: %s F" % NumberFormat.commas(str(earth_value))

func _update_orbit(delta: float) -> void:
	if orbit_root == null or orbit_rocket == null:
		return
	if _phase == Phase.DEPART_TARGET:
		var depart_pct = clamp(_phase_time / max(TARGET_FADE_TIME, 0.01), 0.0, 1.0)
		orbit_rocket.position = _depart_start_rocket_pos.lerp(Vector2.ZERO, depart_pct)
		orbit_rocket.rotation = _heading_angle
		if not _center_locked:
			var size_depart = get_viewport().get_visible_rect().size
			orbit_root.position = size_depart * 0.5
	elif _phase == Phase.TRAVEL:
		orbit_rocket.position = Vector2.ZERO
		orbit_rocket.rotation = _heading_angle
		if not _center_locked:
			var size = get_viewport().get_visible_rect().size
			orbit_root.position = size * 0.5
	else:
		_orbit_angle += ORBIT_ROTATION_SPEED * delta
		var offset = Vector2(cos(_orbit_angle), sin(_orbit_angle)) * _orbit_radius
		orbit_rocket.position = offset
		orbit_rocket.rotation = _orbit_angle + PI
		if not _center_locked and camera_3d and asteroid_pivot:
			if _phase in [Phase.EARTH_APPROACH, Phase.EARTH_ORBIT]:
				orbit_root.position = camera_3d.unproject_position(_earth_pivot.global_position)
			else:
				orbit_root.position = camera_3d.unproject_position(asteroid_pivot.global_position)
	var orbit_utils4 = OrbitVisuals
	orbit_utils4.build_orbit_circle(orbit_circle, _orbit_radius, ORBIT_SEGMENTS)
	var orbit_utils5 = OrbitVisuals
	orbit_utils5.update_heading_line(orbit_heading, orbit_rocket)

func _build_minerals_list() -> void:
	if minerals_list == null:
		return
	for child in minerals_list.get_children():
		child.queue_free()
	var resource_yield = ResourceYield
	var cargo_multiplier = RocketSpecs.get_cargo_multiplier(_current_rocket_id)
	var yield_data = resource_yield.get_yield_for_target(_current_target_id, _current_target_type, 1, cargo_multiplier)
	var minerals: Dictionary = yield_data.get("minerals", {})
	var capacity = int(yield_data.get("capacity", 0))
	minerals_title.text = "Minerals Available"
	var body_type = "Planet" if _current_target_type == "planet" else "Asteroid"
	minerals_summary.text = "%s • Mineable: %d%% • %s units" % [
		body_type,
		int(round(float(yield_data.get("mineable_pct", 0.1)) * 100.0)),
		NumberFormat.commas(str(capacity))
	]
	var panel_style = PanelStyle
	for name in resource_yield.MINERALS:
		if not minerals.has(name):
			continue
		var row: HBoxContainer = ResourceValueRowScene.instantiate()
		var name_lbl: Label = row.get_node("NameLabel")
		name_lbl.text = str(name)
		panel_style.apply_body(name_lbl)
		var amount_lbl: Label = row.get_node("ValueLabel")
		amount_lbl.text = NumberFormat.commas(str(minerals.get(name, 0)))
		panel_style.apply_muted(amount_lbl)
		minerals_list.add_child(row)

func _generate_target_asteroid(target_id: String) -> void:
	if asteroid_mesh == null:
		return
	var builder = ProceduralBodyBuilder
	builder.build_asteroid(asteroid_mesh, target_id, 0.72, 0.96, Color(0.35, 0.35, 0.35))

func _generate_earth() -> void:
	if _earth_mesh == null:
		return
	var builder = ProceduralBodyBuilder
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
	var helper = RocketSpriteHelper
	helper.apply_orbit_sprite(orbit_rocket, rocket_id)

func _on_continue_pressed() -> void:
	var tree = Engine.get_main_loop() as SceneTree
	if tree == null:
		return
	var scene_manager = null
	if tree.current_scene:
		scene_manager = tree.current_scene.get_node_or_null("SceneManager")
	if scene_manager and scene_manager.has_method("change_to_scene"):
		scene_manager.change_to_scene(RETURN_DESTINATION)
	else:
		tree.change_scene_to_file(RETURN_DESTINATION)
