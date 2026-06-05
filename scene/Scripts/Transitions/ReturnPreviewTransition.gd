extends Node3D

## ReturnPreviewTransition — cinematic return flight from asteroid back to Earth.
## Phases: TARGET_ORBIT → DEPART_TARGET → TRAVEL → EARTH_APPROACH → EARTH_ORBIT
## Auto-advances to mission_debrief_v2 on arrival.

const RETURN_DESTINATION := "res://Scenes/Earth/mission_debrief_v2.tscn"

const TARGET_ORBIT_TIME    := 2.5
const DEPART_TIME          := 2.5
const TRAVEL_TIME          := 20.0
const EARTH_APPROACH_TIME  := 6.0
const ORBIT_ROTATION_SPEED := 0.25
const ORBIT_RADIUS_PX      := 416.0
const ORBIT_SEGMENTS       := 64
const TRAVEL_DISTANCE_KM   := 420000.0
const EARTH_VALUE_MULT     := 1.35

const NumberFormat          = preload("res://Scripts/Utils/NumberFormat.gd")
const RocketSpecs           = preload("res://Scripts/Utils/RocketSpecs.gd")
static var ResourceValueRowScene: PackedScene = load("res://Scenes/UI/Templates/ResourceValueRow.tscn") if ResourceLoader.exists("res://Scenes/UI/Templates/ResourceValueRow.tscn") else null
static var EmptyLabelScene: PackedScene = load("res://Scenes/UI/Templates/MenuLogbookEmpty.tscn") if ResourceLoader.exists("res://Scenes/UI/Templates/MenuLogbookEmpty.tscn") else null
const PanelStyle            = preload("res://Scripts/UI/PanelStyle.gd")
const RocketsManager        = preload("res://Scripts/Utils/RocketsManager.gd")
const OrbitVisuals          = preload("res://Scripts/Utils/OrbitVisuals.gd")
const MiningInventory       = preload("res://Scripts/Utils/MiningInventory.gd")
const MineralPricing        = preload("res://Scripts/Utils/MineralPricing.gd")
const ProceduralBodyBuilder = preload("res://Scripts/Utils/ProceduralBodyBuilder.gd")
const RocketSpriteHelper    = preload("res://Scripts/Utils/RocketSpriteHelper.gd")

# ── 3D nodes ─────────────────────────────────────────────────────────────────
@onready var asteroid_pivot: Node3D          = $AsteroidPivot
@onready var asteroid_mesh:  MeshInstance3D  = $AsteroidPivot/Asteroid
@onready var camera_3d:      Camera3D        = $Camera3D

# ── 2D overlay ────────────────────────────────────────────────────────────────
@onready var orbit_root:    Node2D           = $CanvasLayer/Orbit2D
@onready var orbit_circle:  Line2D           = $CanvasLayer/Orbit2D/OrbitCircle
@onready var orbit_heading: Line2D           = $CanvasLayer/Orbit2D/OrbitHeading
@onready var orbit_rocket:  AnimatedSprite2D = $CanvasLayer/Orbit2D/OrbitRocket2D

# ── Header ────────────────────────────────────────────────────────────────────
@onready var _ui_margin:   MarginContainer = $CanvasLayer/UI/Margin
@onready var skip_button:  Button          = $CanvasLayer/UI/Margin/VBox/Header/SkipButton
@onready var phase_label:  Label           = $CanvasLayer/UI/Margin/VBox/Header/PhaseLabel

# ── Travel panel (left — visible during TRAVEL) ───────────────────────────────
@onready var travel_panel: Panel        = $CanvasLayer/UI/TravelPanel
@onready var travel_title: Label        = $CanvasLayer/UI/TravelPanel/TC/TravelContent/TravelTitle
@onready var travel_bar:   ProgressBar  = $CanvasLayer/UI/TravelPanel/TC/TravelContent/TravelBar
@onready var travel_dist:  Label        = $CanvasLayer/UI/TravelPanel/TC/TravelContent/TravelDist
@onready var travel_speed: Label        = $CanvasLayer/UI/TravelPanel/TC/TravelContent/TravelDist

# ── Cargo panel (right — visible during TRAVEL and EARTH_ORBIT) ───────────────
@onready var cargo_panel: Panel         = $CanvasLayer/UI/CargoPanel
@onready var cargo_title: Label         = $CanvasLayer/UI/CargoPanel/CC/CargoContent/CargoTitle
@onready var cargo_list:  VBoxContainer = $CanvasLayer/UI/CargoPanel/CC/CargoContent/CargoList
@onready var cargo_value: Label         = $CanvasLayer/UI/CargoPanel/CC/CargoContent/CargoValue

# ── Phase state ───────────────────────────────────────────────────────────────
enum Phase { TARGET_ORBIT, DEPART_TARGET, TRAVEL, EARTH_APPROACH, EARTH_ORBIT }
var _phase      := Phase.TARGET_ORBIT
var _phase_time := 0.0

# ── Runtime ───────────────────────────────────────────────────────────────────
var _current_target_id    := ""
var _current_target_label := ""
var _current_target_type  := ""
var _current_rocket_id    := ""
var _orbit_angle          := 0.0
var _orbit_radius         := ORBIT_RADIUS_PX
var _center_locked        := false
var _depart_start_pos     := Vector2.ZERO
var _earth_alpha          := 0.0
var _earth_pivot:  Node3D
var _earth_mesh:   MeshInstance3D
var _cargo_shown          := false
var _auto_advance_started := false
var _last_viewport_size   := Vector2.ZERO


func _ready() -> void:
	_load_mission_data()
	_build_starfield()
	_setup_ui()
	_generate_asteroid()
	_setup_earth()
	_setup_orbit_visual()
	_apply_responsive_layout()
	if _should_skip_to_earth():
		_start_earth_orbit()
	else:
		_start_target_orbit()


func _process(delta: float) -> void:
	var vp_size := get_viewport().get_visible_rect().size
	if vp_size != _last_viewport_size:
		_last_viewport_size = vp_size
		_apply_responsive_layout()
	_phase_time += delta
	_update_orbit(delta)
	_apply_earth_alpha()
	if _phase != Phase.EARTH_ORBIT and _should_skip_to_earth():
		_start_earth_orbit()
	match _phase:
		Phase.TARGET_ORBIT:
			if _phase_time >= TARGET_ORBIT_TIME:
				_start_depart()
		Phase.DEPART_TARGET:
			if _phase_time >= DEPART_TIME:
				_start_travel()
		Phase.TRAVEL:
			_tick_travel()
		Phase.EARTH_APPROACH:
			if _phase_time >= EARTH_APPROACH_TIME:
				_start_earth_orbit()
	_refresh_phase_label()


# ── Data ──────────────────────────────────────────────────────────────────────

func _load_mission_data() -> void:
	var rm := RocketsManager
	var returned: Dictionary = rm.get_returned_mission() if rm else {}
	_current_target_id    = str(returned.get("target_id", ""))
	_current_target_label = str(returned.get("label",     ""))
	_current_target_type  = str(returned.get("type",      "asteroid"))
	_current_rocket_id    = str(returned.get("rocket_id", ""))


func _should_skip_to_earth() -> bool:
	var rm := RocketsManager
	if not rm:
		return false
	rm.mark_returned_if_due(_current_rocket_id)
	if rm.get_rocket_status(_current_rocket_id) == "returned":
		return true
	return rm.has_return_completed(_current_rocket_id)


# ── Setup ─────────────────────────────────────────────────────────────────────

func _setup_ui() -> void:
	PanelStyle.apply_button(skip_button, false)
	skip_button.text = "Skip"
	skip_button.pressed.connect(_on_skip_pressed)
	PanelStyle.apply_title(phase_label)

	PanelStyle.apply_panel(travel_panel)
	PanelStyle.apply_muted(travel_title)
	travel_title.text = "EN ROUTE TO EARTH"
	PanelStyle.apply_progress_bar(travel_bar)
	PanelStyle.apply_body(travel_dist)

	PanelStyle.apply_panel(cargo_panel)
	PanelStyle.apply_muted(cargo_title)
	cargo_title.text = "MISSION CARGO"
	PanelStyle.apply_body(cargo_value)

	travel_panel.visible = false
	cargo_panel.visible  = false


func _build_starfield() -> void:
	var canvas := $CanvasLayer as CanvasLayer
	if canvas == null:
		return
	var bg := ColorRect.new()
	bg.name = "StarfieldBg"
	bg.color = Color(0.02, 0.02, 0.06, 1.0)
	bg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	bg.mouse_filter = Control.MOUSE_FILTER_IGNORE
	canvas.add_child(bg)
	canvas.move_child(bg, 0)
	var vp_size := Vector2(1920, 1080)
	var img := Image.create(int(vp_size.x), int(vp_size.y), false, Image.FORMAT_RGBA8)
	img.fill(Color(0, 0, 0, 0))
	var rng := RandomNumberGenerator.new()
	rng.seed = 77
	for _i in range(320):
		var px := int(rng.randi() % int(vp_size.x))
		var py := int(rng.randi() % int(vp_size.y))
		var b  := rng.randf_range(0.30, 1.0)
		var radius := int(rng.randi() % 2)
		for dy in range(-radius, radius + 1):
			for dx in range(-radius, radius + 1):
				var nx := px + dx
				var ny := py + dy
				if nx >= 0 and nx < int(vp_size.x) and ny >= 0 and ny < int(vp_size.y):
					img.set_pixel(nx, ny, Color(b, b, b + 0.06, b))
	var star_tex := ImageTexture.create_from_image(img)
	var stars_rect := TextureRect.new()
	stars_rect.name = "StarfieldDots"
	stars_rect.texture = star_tex
	stars_rect.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	stars_rect.stretch_mode = TextureRect.STRETCH_SCALE
	stars_rect.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	stars_rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	canvas.add_child(stars_rect)
	canvas.move_child(stars_rect, 1)


func _generate_asteroid() -> void:
	if asteroid_mesh == null:
		return
	ProceduralBodyBuilder.build_asteroid(
		asteroid_mesh, _current_target_id, 0.72, 0.96, Color(0.35, 0.35, 0.35)
	)


func _setup_earth() -> void:
	_earth_pivot = Node3D.new()
	_earth_pivot.name = "EarthPivot"
	add_child(_earth_pivot)
	_earth_mesh = MeshInstance3D.new()
	_earth_mesh.name = "Earth"
	_earth_pivot.add_child(_earth_mesh)
	ProceduralBodyBuilder.build_earth(_earth_mesh, "earth:%s" % _current_target_id, Color(0.1, 0.2, 0.4))
	_earth_mesh.visible = false
	_apply_earth_alpha()


func _setup_orbit_visual() -> void:
	if orbit_root == null or orbit_circle == null or orbit_rocket == null:
		return
	orbit_root.visible = true
	_orbit_angle = 0.0
	OrbitVisuals.build_orbit_circle(orbit_circle, _orbit_radius, ORBIT_SEGMENTS)
	orbit_rocket.position = Vector2(_orbit_radius, 0)
	orbit_rocket.scale    = Vector2(0.2, 0.2)
	RocketSpriteHelper.apply_orbit_sprite(orbit_rocket, _current_rocket_id)
	if orbit_heading:
		OrbitVisuals.update_heading_line(orbit_heading, orbit_rocket)


func _apply_responsive_layout() -> void:
	var vp := get_viewport().get_visible_rect().size
	if vp == Vector2.ZERO:
		return
	var compact     := vp.x < 1360.0 or vp.y < 860.0
	var edge        := 16.0
	var panel_w: float = clamp(vp.x * (0.33 if compact else 0.28), 300.0, 420.0)
	var right_w: float = clamp(vp.x * (0.30 if compact else 0.26), 360.0, 460.0)
	var safe_top    := 90.0 if vp.x / max(vp.y, 1.0) > 1.85 else 0.0
	var safe_bottom := 90.0 if vp.x / max(vp.y, 1.0) > 1.85 else 0.0
	if _ui_margin:
		_ui_margin.offset_top = 24.0 + safe_top
	if travel_panel:
		travel_panel.anchor_left   = 0.0
		travel_panel.anchor_right  = 0.0
		travel_panel.anchor_top    = 0.0
		travel_panel.anchor_bottom = 0.0
		travel_panel.offset_left   = edge
		travel_panel.offset_top    = 96.0 + safe_top
		travel_panel.offset_right  = edge + panel_w
		travel_panel.offset_bottom = 216.0 + safe_top
		travel_panel.custom_minimum_size.x = panel_w
	if cargo_panel:
		cargo_panel.anchor_left   = 1.0
		cargo_panel.anchor_right  = 1.0
		cargo_panel.anchor_top    = 0.0
		cargo_panel.anchor_bottom = 0.0
		cargo_panel.offset_left   = -edge - right_w
		cargo_panel.offset_top    = (96.0 if compact else 120.0) + safe_top
		cargo_panel.offset_right  = -edge
		cargo_panel.offset_bottom = (96.0 if compact else 120.0) + safe_top + (260.0 if compact else 300.0)
		cargo_panel.custom_minimum_size.x = right_w
	# Suppress unused warning
	var _sb := safe_bottom


# ── Phases ────────────────────────────────────────────────────────────────────

func _start_target_orbit() -> void:
	_phase        = Phase.TARGET_ORBIT
	_phase_time   = 0.0
	_orbit_radius = ORBIT_RADIUS_PX
	_center_locked = false
	_earth_alpha  = 0.0
	travel_panel.visible = false
	cargo_panel.visible  = false
	if orbit_circle:
		orbit_circle.visible = true
	if asteroid_mesh:
		asteroid_mesh.visible = true
	if _earth_mesh:
		_earth_mesh.visible = false
	OrbitVisuals.build_orbit_circle(orbit_circle, _orbit_radius, ORBIT_SEGMENTS)


func _start_depart() -> void:
	_phase        = Phase.DEPART_TARGET
	_phase_time   = 0.0
	_center_locked = true
	if orbit_rocket:
		_depart_start_pos = orbit_rocket.position
	_orbit_radius = 0.0
	if orbit_circle:
		orbit_circle.visible = false
	var viewport_center := get_viewport().get_visible_rect().size * 0.5
	if orbit_root:
		get_tree().create_tween()\
			.tween_property(orbit_root, "position", viewport_center, 0.6)\
			.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)


func _start_travel() -> void:
	_phase        = Phase.TRAVEL
	_phase_time   = 0.0
	_center_locked = true
	_orbit_radius = 0.0
	if asteroid_mesh:
		asteroid_mesh.visible = false
	travel_panel.modulate.a = 0.0
	travel_panel.visible    = true
	get_tree().create_tween().tween_property(travel_panel, "modulate:a", 1.0, 0.6)
	_show_cargo_panel()


func _tick_travel() -> void:
	var pct: float = clamp(_phase_time / TRAVEL_TIME, 0.0, 1.0)
	if travel_bar:
		travel_bar.value = pct
	if travel_dist:
		var km_left: int = max(int(round(TRAVEL_DISTANCE_KM * (1.0 - pct))), 0)
		travel_dist.text = "Distance to Earth: %s km" % NumberFormat.commas(str(km_left))
	if pct >= 1.0:
		_start_earth_approach()

func _update_travel() -> void:
	_tick_travel()


func _start_earth_approach() -> void:
	_phase        = Phase.EARTH_APPROACH
	_phase_time   = 0.0
	_center_locked = false
	if travel_panel:
		var t := get_tree().create_tween()
		t.tween_property(travel_panel, "modulate:a", 0.0, 0.6)
		t.finished.connect(func(): travel_panel.visible = false)
	if _earth_mesh:
		_earth_mesh.visible = true
		_earth_alpha = 0.0
		get_tree().create_tween()\
			.tween_property(self, "_earth_alpha", 1.0, EARTH_APPROACH_TIME * 0.6)


func _start_earth_orbit() -> void:
	_phase        = Phase.EARTH_ORBIT
	_phase_time   = 0.0
	_orbit_radius = ORBIT_RADIUS_PX
	_center_locked = false
	travel_panel.visible = false
	OrbitVisuals.build_orbit_circle(orbit_circle, _orbit_radius, ORBIT_SEGMENTS)
	if orbit_circle:
		orbit_circle.visible = true
	if orbit_root:
		orbit_root.position = get_viewport().get_visible_rect().size * 0.5
	_show_cargo_panel()
	if not _auto_advance_started:
		_auto_advance_started = true
		get_tree().create_timer(1.35).timeout.connect(func(): call_deferred("_on_skip_pressed"))


# ── UI helpers ────────────────────────────────────────────────────────────────

func _refresh_phase_label() -> void:
	if phase_label == null:
		return
	match _phase:
		Phase.TARGET_ORBIT, Phase.DEPART_TARGET:
			var name := _current_target_label if _current_target_label != "" else _current_target_id
			phase_label.text = "Leaving %s" % name if name != "" else "Departing target"
		Phase.TRAVEL:
			phase_label.text = "Returning to Earth"
		Phase.EARTH_APPROACH, Phase.EARTH_ORBIT:
			phase_label.text = "Approaching Earth"


func _show_cargo_panel() -> void:
	if cargo_panel == null or _cargo_shown:
		return
	_cargo_shown = true
	_populate_cargo()
	cargo_panel.modulate.a = 0.0
	cargo_panel.visible    = true
	get_tree().create_tween().tween_property(cargo_panel, "modulate:a", 1.0, 0.6)


func _populate_cargo() -> void:
	if cargo_list == null:
		return
	for c in cargo_list.get_children():
		c.queue_free()
	var inv    := MiningInventory
	var state  := inv.load_state()
	var targets: Dictionary = state.get("targets", {})
	var entry: Dictionary   = targets.get(_current_target_id, {})
	var collected: Dictionary = entry.get("collected", {})
	var total_value := 0
	if collected.is_empty():
		var empty := EmptyLabelScene.instantiate() as Label
		empty.text = "No cargo recorded."
		PanelStyle.apply_muted(empty)
		cargo_list.add_child(empty)
	else:
		for mineral_name in collected.keys():
			var row: HBoxContainer = ResourceValueRowScene.instantiate()
			var name_lbl: Label    = row.get_node("NameLabel")
			name_lbl.text          = str(mineral_name)
			PanelStyle.apply_body(name_lbl)
			var amount  := int(collected.get(mineral_name, 0))
			var val_lbl: Label = row.get_node("ValueLabel")
			val_lbl.text       = "%s kg" % NumberFormat.commas(str(amount))
			PanelStyle.apply_muted(val_lbl)
			cargo_list.add_child(row)
			total_value += MineralPricing.price_for(mineral_name, amount)
	if cargo_value:
		var earth_val := int(round(total_value * EARTH_VALUE_MULT))
		cargo_value.text = "Est. value: %s F" % NumberFormat.commas(str(earth_val))


# ── Orbit update ──────────────────────────────────────────────────────────────

func _update_orbit(delta: float) -> void:
	if orbit_root == null or orbit_rocket == null:
		return
	match _phase:
		Phase.DEPART_TARGET:
			var pct: float = clamp(_phase_time / max(DEPART_TIME, 0.01), 0.0, 1.0)
			orbit_rocket.position = _depart_start_pos.lerp(Vector2.ZERO, pct)
		Phase.TRAVEL:
			orbit_rocket.position = Vector2.ZERO
		_:
			_orbit_angle += ORBIT_ROTATION_SPEED * delta
			var offset := Vector2(cos(_orbit_angle), sin(_orbit_angle)) * _orbit_radius
			orbit_rocket.position = offset
			orbit_rocket.rotation = _orbit_angle + PI
			if not _center_locked and camera_3d:
				if _phase in [Phase.EARTH_APPROACH, Phase.EARTH_ORBIT]:
					orbit_root.position = camera_3d.unproject_position(_earth_pivot.global_position)
				else:
					orbit_root.position = camera_3d.unproject_position(asteroid_pivot.global_position)
	OrbitVisuals.build_orbit_circle(orbit_circle, _orbit_radius, ORBIT_SEGMENTS)
	if orbit_heading:
		OrbitVisuals.update_heading_line(orbit_heading, orbit_rocket)


func _apply_earth_alpha() -> void:
	if _earth_mesh == null:
		return
	var mat := _earth_mesh.material_override as StandardMaterial3D
	if mat:
		mat.albedo_color.a = _earth_alpha


# ── Navigation ────────────────────────────────────────────────────────────────

func _on_skip_pressed() -> void:
	var tree := Engine.get_main_loop() as SceneTree
	if tree == null:
		return
	var sm = null
	if tree.current_scene:
		sm = tree.current_scene.get_node_or_null("SceneManager")
	if sm and sm.has_method("change_to_scene"):
		sm.change_to_scene(RETURN_DESTINATION)
	else:
		tree.change_scene_to_file(RETURN_DESTINATION)
