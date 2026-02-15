extends Node2D

const RETURN_DESTINATION := "res://Scenes/Earth/mission_debrief.tscn"
const MAIN_SCENE_PATH := "res://Scenes/Earth/earth_base_1.tscn"
const SPACE_TOP := Color(0.02, 0.04, 0.08, 1.0)
const SPACE_BOTTOM := Color(0.0, 0.0, 0.02, 1.0)

const TARGET_ORBIT_TIME := 3.5
const TARGET_FADE_TIME := 2.5
const TRAVEL_TIME := 20.0
const EARTH_APPROACH_TIME := 6.0

const EARTH_TEXTURE := preload("res://assets/Backdrops/Earth1.png")

const STAGE2_FRAME_PATHS := {
	"starterrocket1": [
		"res://assets/Vehicles/StarterRocketStage2Frame1.png",
		"res://assets/Vehicles/StarterRocketStage2Frame2.png",
		"res://assets/Vehicles/StarterRocketStage2Frame3.png",
		"res://assets/Vehicles/StarterRocketStage2Frame4.png",
		"res://assets/Vehicles/StarterRocketStage2Frame5.png",
		"res://assets/Vehicles/StarterRocketStage2Frame6.png",
		"res://assets/Vehicles/StarterRocketStage2Frame7.png",
		"res://assets/Vehicles/StarterRocketStage2Frame8.png"
	]
}

@onready var background: TextureRect = $Background
@onready var rocket_container: Node2D = $RocketContainer
@onready var rocket: AnimatedSprite2D = $RocketContainer/Rocket
@onready var earth: Sprite2D = $Earth
@onready var status_label: Label = $UI/StatusLabel
@onready var back_button: Button = $UI/BackButton
@onready var mining_panel: Panel = $UI/MiningPanel
@onready var mining_title: Label = $UI/MiningPanel/MiningMargin/MiningContent/MiningTitle
@onready var mining_summary: Label = $UI/MiningPanel/MiningMargin/MiningContent/MiningSummary
@onready var mining_total: Label = $UI/MiningPanel/MiningMargin/MiningContent/MiningTotal
@onready var travel_panel: Panel = $UI/TravelPanel
@onready var travel_title: Label = $UI/TravelPanel/TravelMargin/TravelContent/TravelTitle
@onready var travel_bar: ProgressBar = $UI/TravelPanel/TravelMargin/TravelContent/TravelBar
@onready var travel_speed: Label = $UI/TravelPanel/TravelMargin/TravelContent/TravelSpeed
@onready var summary_panel: Panel = $UI/SummaryPanel
@onready var summary_title: Label = $UI/SummaryPanel/SummaryMargin/SummaryContent/SummaryTitle
@onready var summary_list: VBoxContainer = $UI/SummaryPanel/SummaryMargin/SummaryContent/SummaryList
@onready var summary_orbit: Label = $UI/SummaryPanel/SummaryMargin/SummaryContent/SummaryOrbit
@onready var summary_earth: Label = $UI/SummaryPanel/SummaryMargin/SummaryContent/SummaryEarth

var _gradient := Gradient.new()
var _gradient_texture := GradientTexture2D.new()
var _elapsed := 0.0
var _orbit_angle := 0.0
var _orbiting := true
var _last_size := Vector2.ZERO
var _orbit_center := Vector2.ZERO
var _orbit_radius := 120.0
var _earth_scale := 0.0
var _stars: PackedVector2Array = PackedVector2Array()
var _rocket_type := "starterrocket1"
var _stage2_frames: SpriteFrames = null
var _phase_time := 0.0
var _target_alpha := 1.0
var _target_center := Vector2.ZERO
var _target_radius := 140.0
var _travel_start_pos := Vector2.ZERO
var _travel_end_pos := Vector2.ZERO
var _travel_active := false
var _return_data := {}

const TRAVEL_DISTANCE_TOTAL_KM := 420000.0
const NumberFormat = preload("res://Scripts/Utils/NumberFormat.gd")
const ORBIT_MULTIPLIER := 1.0
const EARTH_MULTIPLIER := 1.35
const MIN_TIMELINE_EPSILON := 0.01
enum Phase {
	TARGET_ORBIT,
	TRAVEL,
	EARTH_APPROACH,
	EARTH_ORBIT
}

var _phase := Phase.TARGET_ORBIT

func _ready() -> void:
	_setup_background()
	_setup_label()
	_recalculate_layout()
	_setup_rocket_animation()
	_setup_earth()
	_setup_back_button()
	_setup_panels()
	_start_target_orbit()
	_resume_from_elapsed_return_time()

func _process(delta: float) -> void:
	_elapsed += delta
	_phase_time += delta
	_update_background()
	if _orbiting:
		_orbit_angle += delta * 2.1
		if rocket_container:
			rocket_container.position = _orbit_center + Vector2(cos(_orbit_angle), sin(_orbit_angle)) * _orbit_radius
	if _phase == Phase.TARGET_ORBIT and _phase_time >= TARGET_ORBIT_TIME:
		_start_travel()
	if _phase == Phase.TRAVEL:
		_update_travel()
	if _phase == Phase.EARTH_APPROACH and _phase_time >= EARTH_APPROACH_TIME:
		_start_earth_orbit()
	var size = get_viewport_rect().size
	if size != _last_size:
		_recalculate_layout()
	queue_redraw()

func _draw() -> void:
	if _last_size == Vector2.ZERO:
		return
	for star in _stars:
		draw_circle(star, 1.0, Color(0.85, 0.9, 1.0, 0.6))
	if _target_alpha > 0.01:
		var base = Color(0.45, 0.45, 0.48, _target_alpha)
		draw_circle(_target_center, _target_radius, base)
		draw_circle(_target_center + Vector2(-18, -12), _target_radius * 0.35, Color(0.5, 0.5, 0.54, _target_alpha))
		draw_circle(_target_center + Vector2(22, 16), _target_radius * 0.28, Color(0.38, 0.38, 0.42, _target_alpha))

func _setup_background() -> void:
	if background == null:
		return
	background.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	background.z_index = -10
	_gradient.offsets = PackedFloat32Array([0.0, 1.0])
	_gradient_texture.gradient = _gradient
	background.texture = _gradient_texture
	background.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	background.stretch_mode = TextureRect.STRETCH_SCALE
	_gradient.colors = PackedColorArray([SPACE_TOP, SPACE_BOTTOM])

func _setup_label() -> void:
	if status_label == null:
		return
	status_label.text = "Departing asteroid..."
	status_label.position = Vector2(24, 80)
	status_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	status_label.vertical_alignment = VERTICAL_ALIGNMENT_TOP
	var panel_style = preload("res://Scripts/UI/PanelStyle.gd")
	panel_style.apply_title(status_label)

func _setup_back_button() -> void:
	if back_button == null:
		return
	back_button.text = "Back"
	back_button.custom_minimum_size = Vector2(140, 44)
	back_button.position = Vector2(24, 24)
	var panel_style = preload("res://Scripts/UI/PanelStyle.gd")
	panel_style.apply_button(back_button, false)
	back_button.pressed.connect(_on_back_pressed)

func _recalculate_layout() -> void:
	_last_size = get_viewport_rect().size
	var center = _last_size * 0.5
	_target_center = center
	_orbit_center = center
	_orbit_radius = min(_last_size.x, _last_size.y) * 0.16
	_target_radius = min(_last_size.x, _last_size.y) * 0.13
	_earth_scale = min(_last_size.x, _last_size.y) * 0.0014
	if rocket_container:
		if _orbiting:
			rocket_container.position = _orbit_center + Vector2(cos(_orbit_angle), sin(_orbit_angle)) * _orbit_radius
		rocket_container.scale = Vector2(2.0, 2.0)
	if rocket_container:
		rocket_container.z_index = 10
	if status_label:
		status_label.z_index = 30
	if back_button:
		back_button.z_index = 30
	if earth:
		earth.position = center
		earth.scale = Vector2.ONE * _earth_scale
		earth.z_index = 1
	_generate_stars()

func _start_target_orbit() -> void:
	_phase = Phase.TARGET_ORBIT
	_phase_time = 0.0
	_orbiting = true
	_target_alpha = 1.0
	if mining_panel:
		mining_panel.visible = true
		mining_panel.modulate.a = 1.0
	if travel_panel:
		travel_panel.visible = false
	if summary_panel:
		summary_panel.visible = false
		summary_panel.modulate.a = 0.0
	if earth:
		earth.visible = false
	status_label.text = "Departing asteroid..."

func _start_travel() -> void:
	_phase = Phase.TRAVEL
	_phase_time = 0.0
	_orbiting = false
	_travel_active = true
	status_label.text = "Cruising to Earth..."
	if travel_panel:
		travel_panel.visible = true
	if mining_panel:
		var fade = get_tree().create_tween()
		fade.tween_property(mining_panel, "modulate:a", 0.0, TARGET_FADE_TIME)\
			.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)
		fade.finished.connect(func():
			mining_panel.visible = false
		)
	var target_fade = get_tree().create_tween()
	target_fade.tween_property(self, "_target_alpha", 0.0, TARGET_FADE_TIME)\
		.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)
	if rocket_container:
		_travel_start_pos = rocket_container.position
		_travel_end_pos = _orbit_center + Vector2(0.0, -_orbit_radius * 0.4)
		rocket_container.position = _travel_start_pos
	if travel_panel:
		travel_panel.modulate.a = 0.0
		var travel_fade = get_tree().create_tween()
		travel_fade.tween_property(travel_panel, "modulate:a", 1.0, 0.8)

func _update_travel() -> void:
	if not _travel_active:
		return
	var pct = clamp(_phase_time / TRAVEL_TIME, 0.0, 1.0)
	if rocket_container:
		rocket_container.position = _travel_start_pos.lerp(_travel_end_pos, pct)
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
	_travel_active = false
	status_label.text = "Approaching Earth..."
	if travel_panel:
		var fade = get_tree().create_tween()
		fade.tween_property(travel_panel, "modulate:a", 0.0, 0.8)
		fade.finished.connect(func():
			travel_panel.visible = false
		)
	if earth:
		earth.visible = true
		earth.modulate.a = 0.0
		earth.scale = Vector2.ONE * (_earth_scale * 0.35)
		var earth_tween = get_tree().create_tween()
		earth_tween.tween_property(earth, "modulate:a", 1.0, EARTH_APPROACH_TIME * 0.4)\
			.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)
		earth_tween.parallel().tween_property(earth, "scale", Vector2.ONE * (_earth_scale * 1.6), EARTH_APPROACH_TIME)\
			.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)

func _start_earth_orbit() -> void:
	_phase = Phase.EARTH_ORBIT
	_phase_time = 0.0
	_orbiting = true
	if earth:
		_orbit_center = earth.position
	_orbit_radius = min(_last_size.x, _last_size.y) * 0.18
	status_label.text = "Orbiting Earth..."
	_show_summary_panel()

func _update_background() -> void:
	_gradient.colors = PackedColorArray([SPACE_TOP, SPACE_BOTTOM])
	_gradient_texture.gradient = _gradient

func _setup_rocket_animation() -> void:
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	var returned := {}
	if rm:
		returned = rm.get_returned_mission()
	_return_data = returned
	var rocket_id = str(returned.get("rocket_id", "starterrocket1"))
	_rocket_type = _rocket_type_from_id(rocket_id)
	_stage2_frames = _get_stage2_frames_for_type(_rocket_type)
	if rocket and _stage2_frames:
		rocket.sprite_frames = _stage2_frames
		rocket.animation = &"default"
		rocket.play()

func _get_stage2_frames_for_type(rocket_type: String) -> SpriteFrames:
	var frames := SpriteFrames.new()
	frames.add_animation("default")
	frames.set_animation_speed("default", 8.0)
	frames.set_animation_loop("default", true)
	var paths: Array = STAGE2_FRAME_PATHS.get(rocket_type, [])
	if paths.is_empty() and rocket_type != "starterrocket1":
		paths = STAGE2_FRAME_PATHS.get("starterrocket1", [])
	if paths.is_empty():
		return frames
	for path in paths:
		frames.add_frame("default", load(path))
	return frames

func _rocket_type_from_id(rocket_id: String) -> String:
	if rocket_id.find("-") != -1:
		var parts = rocket_id.split("-")
		if parts.size() > 0:
			return str(parts[0])
	return rocket_id

func _setup_earth() -> void:
	if earth == null:
		return
	earth.texture = EARTH_TEXTURE
	earth.visible = false
	earth.modulate.a = 0.0

func _setup_panels() -> void:
	var panel_style = preload("res://Scripts/UI/PanelStyle.gd")
	if mining_panel:
		panel_style.apply_panel(mining_panel)
		panel_style.apply_title(mining_title)
		panel_style.apply_body(mining_summary)
		panel_style.apply_body(mining_total)
	if travel_panel:
		panel_style.apply_panel(travel_panel)
		panel_style.apply_title(travel_title)
		panel_style.apply_body(travel_speed)
		panel_style.apply_progress_bar(travel_bar)
		travel_panel.visible = false
	if summary_panel:
		panel_style.apply_panel(summary_panel)
		panel_style.apply_title(summary_title)
		panel_style.apply_body(summary_orbit)
		panel_style.apply_body(summary_earth)
		summary_panel.visible = false
		summary_panel.modulate.a = 0.0
	_build_mining_panel()
	_build_summary_panel()

func _build_mining_panel() -> void:
	var target_id = str(_return_data.get("target_id", ""))
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

func _build_summary_panel() -> void:
	if summary_list == null:
		return
	for c in summary_list.get_children():
		c.queue_free()
	var target_id = str(_return_data.get("target_id", ""))
	if target_id == "":
		var empty = Label.new()
		empty.text = "No cargo recorded."
		summary_list.add_child(empty)
		summary_orbit.text = "Sell in Orbit: 0 F"
		summary_earth.text = "Sell on Earth: 0 F"
		return
	var inv = preload("res://Scripts/Utils/MiningInventory.gd")
	var state = inv.load_state()
	var targets = state.get("targets", {})
	var entry = targets.get(target_id, {})
	var collected: Dictionary = entry.get("collected", {})
	var total_value := 0
	var panel_style = preload("res://Scripts/UI/PanelStyle.gd")
	if collected.is_empty():
		var empty = Label.new()
		empty.text = "No cargo recorded."
		summary_list.add_child(empty)
	else:
		for name in collected.keys():
			var row = HBoxContainer.new()
			row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
			var name_lbl = Label.new()
			name_lbl.text = str(name)
			name_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
			panel_style.apply_body(name_lbl)
			var amount = int(collected.get(name, 0))
			var amount_lbl = Label.new()
			amount_lbl.text = "%s kg" % NumberFormat.commas(str(amount))
			amount_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
			panel_style.apply_muted(amount_lbl)
			row.add_child(name_lbl)
			row.add_child(amount_lbl)
			summary_list.add_child(row)
			var pricing = preload("res://Scripts/Utils/MineralPricing.gd")
			total_value += pricing.price_for(name, amount)
	var orbit_value = int(round(total_value * ORBIT_MULTIPLIER))
	var earth_value = int(round(total_value * EARTH_MULTIPLIER))
	summary_orbit.text = "Sell in Orbit: %s F" % NumberFormat.commas(str(orbit_value))
	summary_earth.text = "Sell on Earth: %s F" % NumberFormat.commas(str(earth_value))

func _show_summary_panel() -> void:
	if summary_panel == null:
		return
	summary_panel.visible = true
	var tween = get_tree().create_tween()
	tween.tween_property(summary_panel, "modulate:a", 1.0, 0.8)

func _generate_stars() -> void:
	_stars.clear()
	var rng = RandomNumberGenerator.new()
	rng.seed = int(Time.get_ticks_msec() % 100000)
	for _i in range(120):
		_stars.append(Vector2(rng.randf_range(0, _last_size.x), rng.randf_range(0, _last_size.y)))

func _on_back_pressed() -> void:
	var tree = Engine.get_main_loop() as SceneTree
	if tree == null:
		return
	var scene_manager = null
	if tree.current_scene:
		scene_manager = tree.current_scene.get_node_or_null("SceneManager")
	if scene_manager and scene_manager.has_method("change_to_scene"):
		scene_manager.change_to_scene(MAIN_SCENE_PATH)
	else:
		tree.change_scene_to_file(MAIN_SCENE_PATH)

func _resume_from_elapsed_return_time() -> void:
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if not rm:
		return
	var progress = float(rm.get_return_progress(str(_return_data.get("rocket_id", ""))))
	if progress <= 0.0:
		return
	var total_timeline = TARGET_ORBIT_TIME + TARGET_FADE_TIME + TRAVEL_TIME + EARTH_APPROACH_TIME
	var elapsed_timeline = clamp(progress * total_timeline, 0.0, total_timeline - MIN_TIMELINE_EPSILON)
	_set_timeline_elapsed(elapsed_timeline)

func _set_timeline_elapsed(elapsed_timeline: float) -> void:
	var travel_start = TARGET_ORBIT_TIME
	var approach_start = TARGET_ORBIT_TIME + TRAVEL_TIME
	if elapsed_timeline < travel_start:
		_start_target_orbit()
		_phase_time = elapsed_timeline
		return
	if elapsed_timeline < approach_start:
		_start_travel()
		_phase_time = elapsed_timeline - travel_start
		var fade_pct = clamp(_phase_time / max(TARGET_FADE_TIME, 0.01), 0.0, 1.0)
		_target_alpha = clamp(1.0 - fade_pct, 0.0, 1.0)
		if mining_panel:
			mining_panel.modulate.a = 1.0 - fade_pct
			if fade_pct >= 1.0:
				mining_panel.visible = false
		_update_travel()
		return
	_start_earth_approach()
	_phase_time = elapsed_timeline - approach_start
	var approach_pct = clamp(_phase_time / max(EARTH_APPROACH_TIME, 0.01), 0.0, 1.0)
	if earth:
		earth.visible = true
		earth.modulate.a = approach_pct
		earth.scale = Vector2.ONE * lerp(_earth_scale * 0.35, _earth_scale * 1.6, approach_pct)
