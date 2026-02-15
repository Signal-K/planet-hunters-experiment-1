extends Node2D

const PREVIEW_SCENE_PATH := "res://Scenes/UI/AsteroidPreview/asteroid_preview.tscn"
const SPACE_TOP := Color(0.03, 0.03, 0.07, 1.0)
const SPACE_BOTTOM := Color(0.0, 0.0, 0.0, 1.0)

const EARTH_ORBIT_TIME := 3.5
const EARTH_FADE_TIME := 2.5
const TRAVEL_TIME := 20.0
const TARGET_APPROACH_TIME := 6.0

const EARTH_TEXTURE := preload("res://assets/Backdrops/Earth1.png")

const TRAVEL_DISTANCE_TOTAL_KM := 420000.0
const NumberFormat = preload("res://Scripts/Utils/NumberFormat.gd")
const MIN_TIMELINE_EPSILON := 0.01

@onready var background: TextureRect = $Background
@onready var rocket_container: Node2D = $RocketContainer
@onready var rocket: Sprite2D = $RocketContainer/Rocket
@onready var status_label: Label = $UI/StatusLabel
@onready var back_button: Button = $UI/BackButton
@onready var travel_panel: Panel = $UI/TravelPanel
@onready var travel_title: Label = $UI/TravelPanel/TravelMargin/TravelContent/TravelTitle
@onready var travel_bar: ProgressBar = $UI/TravelPanel/TravelMargin/TravelContent/TravelBar
@onready var travel_speed: Label = $UI/TravelPanel/TravelMargin/TravelContent/TravelSpeed
@onready var mining_panel: Panel = $UI/MiningPanel
@onready var mining_title: Label = $UI/MiningPanel/MiningMargin/MiningContent/MiningTitle
@onready var mining_summary: Label = $UI/MiningPanel/MiningMargin/MiningContent/MiningSummary
@onready var mining_total: Label = $UI/MiningPanel/MiningMargin/MiningContent/MiningTotal

var _gradient := Gradient.new()
var _gradient_texture := GradientTexture2D.new()
var _elapsed := 0.0
var _last_size := Vector2.ZERO
var _orbit_center := Vector2.ZERO
var _orbit_radius := 120.0
var _orbit_angle := 0.0
var _earth_alpha := 1.0
var _earth_radius := 140.0
var _target_alpha := 0.0
var _target_center := Vector2.ZERO
var _target_radius := 140.0
var _target_scale := 0.0
var _phase_time := 0.0
var _travel_active := false
var _return_data := {}

enum Phase {
	EARTH_ORBIT,
	TRAVEL,
	TARGET_APPROACH,
	TARGET_ORBIT
}

var _phase := Phase.EARTH_ORBIT

func _ready() -> void:
	_setup_background()
	_setup_label()
	_recalculate_layout()
	_setup_earth()
	_setup_panels()
	_setup_back_button()
	_start_earth_orbit()
	_resume_from_elapsed_outbound_time()

func _process(delta: float) -> void:
	_elapsed += delta
	_phase_time += delta
	_update_background()
	if _phase == Phase.EARTH_ORBIT:
		_update_orbit(delta)
		if _phase_time >= EARTH_ORBIT_TIME:
			_start_travel()
	elif _phase == Phase.TRAVEL:
		_update_travel()
	elif _phase == Phase.TARGET_APPROACH:
		_target_alpha = clamp(_phase_time / max(TARGET_APPROACH_TIME * 0.4, 0.01), 0.0, 1.0)
		if _phase_time >= TARGET_APPROACH_TIME:
			_start_target_orbit()
	elif _phase == Phase.TARGET_ORBIT:
		_update_orbit(delta)
	var size = get_viewport_rect().size
	if size != _last_size:
		_recalculate_layout()
	queue_redraw()

func _setup_background() -> void:
	if background == null:
		return
	background.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_gradient.offsets = PackedFloat32Array([0.0, 1.0])
	_gradient_texture.gradient = _gradient
	background.texture = _gradient_texture
	background.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	background.stretch_mode = TextureRect.STRETCH_SCALE

func _setup_label() -> void:
	if status_label == null:
		return
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if rm:
		var target = rm.get_preview_target()
		var label = str(target.get("label", ""))
		if label != "":
			status_label.text = "Departing Earth → %s" % label
		else:
			status_label.text = "Departing Earth..."
	status_label.position = Vector2(24, 24)
	status_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	status_label.vertical_alignment = VERTICAL_ALIGNMENT_TOP
	var panel_style = preload("res://Scripts/UI/PanelStyle.gd")
	panel_style.apply_title(status_label)

func _recalculate_layout() -> void:
	_last_size = get_viewport_rect().size
	var center = _last_size * 0.5
	_orbit_center = center
	_orbit_radius = min(_last_size.x, _last_size.y) * 0.16
	_target_center = center
	_earth_radius = min(_last_size.x, _last_size.y) * 0.18
	_target_radius = min(_last_size.x, _last_size.y) * 0.13
	_target_scale = min(_last_size.x, _last_size.y) * 0.0014
	if rocket_container and _phase in [Phase.EARTH_ORBIT, Phase.TARGET_ORBIT]:
		rocket_container.position = _orbit_center + Vector2(cos(_orbit_angle), sin(_orbit_angle)) * _orbit_radius
	if rocket:
		rocket.scale = Vector2(2.0, 2.0)

func _setup_earth() -> void:
	pass

func _update_background() -> void:
	_gradient.colors = PackedColorArray([SPACE_TOP, SPACE_BOTTOM])
	_gradient_texture.gradient = _gradient

func _start_earth_orbit() -> void:
	_phase = Phase.EARTH_ORBIT
	_phase_time = 0.0
	_earth_alpha = 1.0
	_target_alpha = 0.0
	_travel_active = false
	if mining_panel:
		mining_panel.visible = false
	if travel_panel:
		travel_panel.visible = false
	status_label.text = "Departing Earth..."

func _start_travel() -> void:
	_phase = Phase.TRAVEL
	_phase_time = 0.0
	_travel_active = true
	_target_alpha = 0.0
	status_label.text = "Cruising to target..."
	_earth_alpha = 1.0
	if travel_panel:
		travel_panel.visible = true
		travel_panel.modulate.a = 1.0

func _update_travel() -> void:
	if not _travel_active:
		return
	var pct = clamp(_phase_time / TRAVEL_TIME, 0.0, 1.0)
	_earth_alpha = clamp(1.0 - (_phase_time / max(EARTH_FADE_TIME, 0.01)), 0.0, 1.0)
	if travel_bar:
		travel_bar.value = pct
	if travel_speed:
		var remaining_km = max(int(round(TRAVEL_DISTANCE_TOTAL_KM * (1.0 - pct))), 0)
		travel_speed.text = "Distance to destination: %s km" % NumberFormat.commas(str(remaining_km))
	if pct >= 1.0:
		_start_target_approach()

func _start_target_approach() -> void:
	_phase = Phase.TARGET_APPROACH
	_phase_time = 0.0
	_travel_active = false
	_target_alpha = 0.0
	status_label.text = "Target acquired..."
	if travel_panel:
		travel_panel.visible = false
		travel_panel.modulate.a = 0.0

func _start_target_orbit() -> void:
	_phase = Phase.TARGET_ORBIT
	_phase_time = 0.0
	_orbit_angle = 0.0
	status_label.text = "Orbiting target..."
	if mining_panel:
		mining_panel.visible = true
		mining_panel.modulate.a = 1.0
	var delay = get_tree().create_timer(0.8)
	delay.timeout.connect(func():
		_advance_to_preview()
	)

func _update_orbit(delta: float) -> void:
	_orbit_angle += delta * 2.1
	if rocket_container:
		rocket_container.position = _orbit_center + Vector2(cos(_orbit_angle), sin(_orbit_angle)) * _orbit_radius

func _setup_panels() -> void:
	var panel_style = preload("res://Scripts/UI/PanelStyle.gd")
	if travel_panel:
		panel_style.apply_panel(travel_panel)
		panel_style.apply_title(travel_title)
		panel_style.apply_body(travel_speed)
		panel_style.apply_progress_bar(travel_bar)
		travel_panel.visible = false
	if mining_panel:
		panel_style.apply_panel(mining_panel)
		panel_style.apply_title(mining_title)
		panel_style.apply_body(mining_summary)
		panel_style.apply_body(mining_total)
		mining_panel.visible = false
	_build_mining_panel()

func _build_mining_panel() -> void:
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	var target := {}
	if rm:
		target = rm.get_preview_target()
	var target_id = str(target.get("id", ""))
	if target_id == "":
		mining_summary.text = "Remaining: 0 kg"
		mining_total.text = "Total Collected: 0 kg"
		return
	var inv = preload("res://Scripts/Utils/MiningInventory.gd")
	var state = inv.load_state()
	var targets = state.get("targets", {})
	var entry = targets.get(target_id, {})
	var remaining = int(round(float(entry.get("remaining_mass", 0.0))))
	var collected: Dictionary = entry.get("collected", {})
	var total := 0
	for v in collected.values():
		total += int(v)
	mining_summary.text = "Remaining: %s kg" % NumberFormat.commas(str(remaining))
	mining_total.text = "Total Collected: %s kg" % NumberFormat.commas(str(total))

func _setup_back_button() -> void:
	if back_button == null:
		return
	back_button.text = "Back"
	back_button.custom_minimum_size = Vector2(140, 44)
	back_button.position = Vector2(24, 64)
	var panel_style = preload("res://Scripts/UI/PanelStyle.gd")
	panel_style.apply_button(back_button, false)
	back_button.pressed.connect(_on_back_pressed)

func _on_back_pressed() -> void:
	_advance_to_preview()

func _draw() -> void:
	if _last_size == Vector2.ZERO:
		return
	if _earth_alpha > 0.01:
		draw_circle(_orbit_center, _earth_radius, Color(0.2, 0.45, 0.85, _earth_alpha))
		draw_circle(_orbit_center + Vector2(-24, -14), _earth_radius * 0.45, Color(0.25, 0.5, 0.9, _earth_alpha))
	if _target_alpha > 0.01:
		draw_circle(_target_center, _target_radius, Color(0.45, 0.45, 0.48, _target_alpha))
		draw_circle(_target_center + Vector2(-18, -12), _target_radius * 0.35, Color(0.5, 0.5, 0.54, _target_alpha))
		draw_circle(_target_center + Vector2(22, 16), _target_radius * 0.28, Color(0.38, 0.38, 0.42, _target_alpha))

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

func _resume_from_elapsed_outbound_time() -> void:
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if not rm:
		return
	var target = rm.get_preview_target()
	var rocket_id = str(target.get("rocket_id", ""))
	if rocket_id == "":
		return
	var progress = float(rm.get_outbound_progress(rocket_id))
	if progress <= 0.0:
		return
	var total_timeline = EARTH_ORBIT_TIME + TRAVEL_TIME + TARGET_APPROACH_TIME
	var elapsed_timeline = clamp(progress * total_timeline, 0.0, total_timeline - MIN_TIMELINE_EPSILON)
	_set_timeline_elapsed(elapsed_timeline)

func _set_timeline_elapsed(elapsed_timeline: float) -> void:
	var travel_start = EARTH_ORBIT_TIME
	var approach_start = EARTH_ORBIT_TIME + TRAVEL_TIME
	if elapsed_timeline < travel_start:
		_start_earth_orbit()
		_phase_time = elapsed_timeline
	elif elapsed_timeline < approach_start:
		_start_travel()
		_phase_time = elapsed_timeline - travel_start
		_update_travel()
	else:
		_start_target_approach()
		_phase_time = elapsed_timeline - approach_start
		_target_alpha = clamp(_phase_time / max(TARGET_APPROACH_TIME * 0.4, 0.01), 0.0, 1.0)
	_update_orbit(0.0)
