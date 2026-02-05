extends Node3D

const RETURN_DESTINATION := "res://Scenes/Earth/mission_debrief.tscn"

const TARGET_ORBIT_TIME := 2.5
const TARGET_FADE_TIME := 2.5
const TRAVEL_TIME := 20.0
const EARTH_APPROACH_TIME := 6.0
const ORBIT_ROTATION_SPEED := 0.25
const ORBIT_RADIUS_PX := 416.0
const ORBIT_SEGMENTS := 64

const SPEED_MIN_KMH := 32000.0
const SPEED_MAX_KMH := 140000.0

const ORBIT_MULTIPLIER := 1.0
const EARTH_MULTIPLIER := 1.35
const MINERAL_PRICES := {
	"Iron": 12,
	"Nickel": 24,
	"Cobalt": 36,
	"Platinum": 120,
	"Silicates": 8
}

const STAGE2_FRAME_PATHS := [
	"res://assets/Vehicles/StarterRocketStage2Frame1.png",
	"res://assets/Vehicles/StarterRocketStage2Frame2.png",
	"res://assets/Vehicles/StarterRocketStage2Frame3.png",
	"res://assets/Vehicles/StarterRocketStage2Frame4.png",
	"res://assets/Vehicles/StarterRocketStage2Frame5.png",
	"res://assets/Vehicles/StarterRocketStage2Frame6.png",
	"res://assets/Vehicles/StarterRocketStage2Frame7.png",
	"res://assets/Vehicles/StarterRocketStage2Frame8.png"
]

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
var _phase_time := 0.0
var _target_alpha := 1.0
var _earth_alpha := 0.0
var _current_target_id := ""
var _current_target_label := ""
var _current_target_type := ""
var _current_rocket_id := ""
var _stage2_frames: SpriteFrames = null
var _earth_pivot: Node3D
var _earth_mesh: MeshInstance3D
var _traveling := false

enum Phase {
	TARGET_ORBIT,
	DEPART_TARGET,
	TRAVEL,
	EARTH_APPROACH,
	EARTH_ORBIT
}

var _phase := Phase.TARGET_ORBIT

func _ready() -> void:
	_setup_ui()
	_load_target_data()
	_generate_target_asteroid(_current_target_id)
	_setup_earth()
	_setup_orbit_visual()
	_start_target_orbit()

func _process(delta: float) -> void:
	_phase_time += delta
	_update_orbit(delta)
	_apply_earth_alpha()
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
	var panel_style = preload("res://Scripts/UI/PanelStyle.gd")
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
	back_button.text = "Continue"
	back_button.pressed.connect(_on_continue_pressed)

func _load_target_data() -> void:
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
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
	_build_orbit_circle(_orbit_radius, ORBIT_SEGMENTS)
	orbit_rocket.position = Vector2(_orbit_radius, 0)
	orbit_rocket.scale = Vector2(0.2, 0.2)
	_set_orbit_rocket_visual(_current_rocket_id)
	_update_heading_line()

func _start_target_orbit() -> void:
	_phase = Phase.TARGET_ORBIT
	_phase_time = 0.0
	_target_alpha = 1.0
	_earth_alpha = 0.0
	_traveling = false
	_heading_angle = 0.0
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

func _start_travel() -> void:
	_phase = Phase.TRAVEL
	_phase_time = 0.0
	_traveling = true
	_orbit_radius = 0.0
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
		var eased = pct * pct * (3.0 - 2.0 * pct)
		var speed = lerp(SPEED_MIN_KMH, SPEED_MAX_KMH, eased)
		travel_speed.text = "Speed: %s km/h" % _format_number_with_commas(str(int(round(speed))))
	if pct >= 1.0:
		_start_earth_approach()

func _start_earth_approach() -> void:
	_phase = Phase.EARTH_APPROACH
	_phase_time = 0.0
	_traveling = false
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
	_build_orbit_circle(_orbit_radius, ORBIT_SEGMENTS)
	if orbit_circle:
		orbit_circle.visible = true
	_show_summary_panel()

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
	var inv = preload("res://Scripts/Utils/MiningInventory.gd")
	var state = inv.load_state()
	var targets = state.get("targets", {})
	var entry = targets.get(_current_target_id, {})
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
			amount_lbl.text = "%s kg" % _format_number_with_commas(str(amount))
			amount_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
			panel_style.apply_muted(amount_lbl)
			row.add_child(name_lbl)
			row.add_child(amount_lbl)
			summary_list.add_child(row)
			total_value += _price_for_mineral(name, amount)
	var orbit_value = int(round(total_value * ORBIT_MULTIPLIER))
	var earth_value = int(round(total_value * EARTH_MULTIPLIER))
	summary_orbit.text = "Sell in Orbit: %s F" % _format_number_with_commas(str(orbit_value))
	summary_earth.text = "Sell on Earth: %s F" % _format_number_with_commas(str(earth_value))

func _update_orbit(delta: float) -> void:
	if orbit_root == null or orbit_rocket == null:
		return
	if _phase in [Phase.DEPART_TARGET, Phase.TRAVEL]:
		orbit_rocket.position = Vector2.ZERO
		orbit_rocket.rotation = _heading_angle
		var size = get_viewport().get_visible_rect().size
		orbit_root.position = size * 0.5
	else:
		_orbit_angle += ORBIT_ROTATION_SPEED * delta
		var offset = Vector2(cos(_orbit_angle), sin(_orbit_angle)) * _orbit_radius
		orbit_rocket.position = offset
		orbit_rocket.rotation = _orbit_angle + PI
		if camera_3d and asteroid_pivot:
			if _phase in [Phase.EARTH_APPROACH, Phase.EARTH_ORBIT]:
				orbit_root.position = camera_3d.unproject_position(_earth_pivot.global_position)
			else:
				orbit_root.position = camera_3d.unproject_position(asteroid_pivot.global_position)
	_build_orbit_circle(_orbit_radius, ORBIT_SEGMENTS)
	_update_heading_line()

func _update_heading_line() -> void:
	if orbit_heading == null or orbit_rocket == null:
		return
	orbit_heading.visible = true
	var dir = Vector2(0, -1).rotated(orbit_rocket.rotation)
	var start = orbit_rocket.position + dir * 24.0
	var end = orbit_rocket.position + dir * 74.0
	orbit_heading.points = PackedVector2Array([start, end])

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
		_format_number_with_commas(str(capacity))
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
		amount_lbl.text = _format_number_with_commas(str(minerals.get(name, 0)))
		panel_style.apply_muted(amount_lbl)
		row.add_child(name_lbl)
		row.add_child(amount_lbl)
		minerals_list.add_child(row)

func _generate_target_asteroid(target_id: String) -> void:
	if asteroid_mesh == null:
		return
	var seed = _hash_string(target_id)
	var rng = RandomNumberGenerator.new()
	rng.seed = seed

	var shape_noise = FastNoiseLite.new()
	shape_noise.seed = seed
	shape_noise.noise_type = FastNoiseLite.TYPE_SIMPLEX
	shape_noise.frequency = rng.randf_range(1.4, 2.4)
	shape_noise.fractal_type = FastNoiseLite.FRACTAL_FBM
	shape_noise.fractal_octaves = int(rng.randi_range(4, 6))
	shape_noise.fractal_gain = 0.55
	shape_noise.fractal_lacunarity = rng.randf_range(1.8, 2.2)

	var detail_noise = FastNoiseLite.new()
	detail_noise.seed = seed + 31
	detail_noise.noise_type = FastNoiseLite.TYPE_SIMPLEX
	detail_noise.frequency = rng.randf_range(2.6, 3.6)
	detail_noise.fractal_type = FastNoiseLite.FRACTAL_RIDGED
	detail_noise.fractal_octaves = 2
	detail_noise.fractal_gain = 0.5

	var color_noise = FastNoiseLite.new()
	color_noise.seed = seed + 77
	color_noise.noise_type = FastNoiseLite.TYPE_SIMPLEX
	color_noise.frequency = rng.randf_range(1.2, 2.0)
	color_noise.fractal_type = FastNoiseLite.FRACTAL_FBM
	color_noise.fractal_octaves = 3
	color_noise.fractal_gain = 0.5

	var base_mesh = SphereMesh.new()
	base_mesh.radial_segments = 12
	base_mesh.rings = 8
	base_mesh.radius = 1.0

	var arrays = base_mesh.get_mesh_arrays()
	var verts: PackedVector3Array = arrays[Mesh.ARRAY_VERTEX]
	var colors := PackedColorArray()
	colors.resize(verts.size())

	var base_radius = rng.randf_range(0.72, 0.96)
	var palette_rng = RandomNumberGenerator.new()
	palette_rng.seed = _hash_string("palette:%s" % target_id)
	var palette_dir = palette_rng.randf_range(0.0, 1.0)
	var primary = _palette_color(palette_dir, 0.0, palette_rng)
	var secondary = _palette_color(palette_dir, 0.45, palette_rng)
	var accent = _palette_color(palette_dir, 0.85, palette_rng)

	for i in range(verts.size()):
		var v = verts[i]
		var n = v.normalized()
		var nval = shape_noise.get_noise_3d(n.x * 1.6, n.y * 1.6, n.z * 1.6)
		var detail = detail_noise.get_noise_3d(n.x * 3.0, n.y * 3.0, n.z * 3.0)
		var displacement = (nval * 0.22) + (detail * 0.08)
		verts[i] = n * (base_radius + displacement)

		var cval = color_noise.get_noise_3d(n.x * 2.0, n.y * 2.0, n.z * 2.0)
		var band = clamp((cval + 1.0) * 0.5, 0.0, 1.0)
		var mix_a = primary.lerp(secondary, band)
		var mix_b = mix_a.lerp(accent, clamp((nval + 0.35) * 0.55, 0.0, 1.0))
		colors[i] = mix_b

	arrays[Mesh.ARRAY_VERTEX] = verts
	arrays[Mesh.ARRAY_COLOR] = colors

	var temp_mesh = ArrayMesh.new()
	temp_mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arrays)

	var st = SurfaceTool.new()
	st.create_from(temp_mesh, 0)
	st.index()
	st.generate_normals(true)
	var final_mesh = st.commit()

	asteroid_mesh.mesh = final_mesh

	var material = StandardMaterial3D.new()
	material.vertex_color_use_as_albedo = true
	material.roughness = 0.95
	material.metallic = 0.0
	material.emission_enabled = true
	material.emission = Color(0.35, 0.35, 0.35)
	material.shading_mode = BaseMaterial3D.SHADING_MODE_PER_PIXEL
	asteroid_mesh.material_override = material

func _generate_earth() -> void:
	if _earth_mesh == null:
		return
	var seed = _hash_string("earth:%s" % _current_target_id)
	var rng = RandomNumberGenerator.new()
	rng.seed = seed

	var shape_noise = FastNoiseLite.new()
	shape_noise.seed = seed
	shape_noise.noise_type = FastNoiseLite.TYPE_SIMPLEX
	shape_noise.frequency = 1.6
	shape_noise.fractal_type = FastNoiseLite.FRACTAL_FBM
	shape_noise.fractal_octaves = 4
	shape_noise.fractal_gain = 0.55

	var base_mesh = SphereMesh.new()
	base_mesh.radial_segments = 24
	base_mesh.rings = 16
	base_mesh.radius = 1.1

	var arrays = base_mesh.get_mesh_arrays()
	var verts: PackedVector3Array = arrays[Mesh.ARRAY_VERTEX]
	var colors := PackedColorArray()
	colors.resize(verts.size())

	for i in range(verts.size()):
		var v = verts[i]
		var n = v.normalized()
		var nval = shape_noise.get_noise_3d(n.x * 1.5, n.y * 1.5, n.z * 1.5)
		verts[i] = n * (1.0 + nval * 0.03)
		var ocean = Color(0.18, 0.35, 0.65)
		var land = Color(0.22, 0.55, 0.35)
		var ice = Color(0.85, 0.9, 0.95)
		var band = clamp((nval + 1.0) * 0.5, 0.0, 1.0)
		var base = ocean.lerp(land, band)
		var polar = abs(n.y)
		if polar > 0.75:
			base = base.lerp(ice, (polar - 0.75) / 0.25)
		colors[i] = base

	arrays[Mesh.ARRAY_VERTEX] = verts
	arrays[Mesh.ARRAY_COLOR] = colors

	var temp_mesh = ArrayMesh.new()
	temp_mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arrays)

	var st = SurfaceTool.new()
	st.create_from(temp_mesh, 0)
	st.index()
	st.generate_normals(true)
	var final_mesh = st.commit()

	_earth_mesh.mesh = final_mesh
	var material = StandardMaterial3D.new()
	material.vertex_color_use_as_albedo = true
	material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	material.roughness = 0.7
	material.metallic = 0.05
	material.emission_enabled = true
	material.emission = Color(0.1, 0.2, 0.4)
	material.shading_mode = BaseMaterial3D.SHADING_MODE_PER_PIXEL
	_earth_mesh.material_override = material
	_apply_earth_alpha()

func _apply_earth_alpha() -> void:
	if _earth_mesh == null:
		return
	var material: StandardMaterial3D = _earth_mesh.material_override
	if material:
		material.albedo_color.a = _earth_alpha

func _palette_color(direction: float, offset: float, rng: RandomNumberGenerator) -> Color:
	var hue = fmod(direction + offset * 0.35, 1.0)
	var sat = rng.randf_range(0.12, 0.32)
	var val = rng.randf_range(0.68, 0.94)
	return Color.from_hsv(hue, sat, val)

func _set_orbit_rocket_visual(rocket_id: String) -> void:
	if orbit_rocket == null:
		return
	var rocket_type = _rocket_type_from_id(rocket_id)
	if rocket_type == "starterrocket1":
		orbit_rocket.sprite_frames = _get_stage2_sprite_frames()
		orbit_rocket.animation = &"default"
		orbit_rocket.play()
		return
	var frames := SpriteFrames.new()
	frames.add_animation("default")
	frames.set_animation_speed("default", 1.0)
	frames.set_animation_loop("default", false)
	frames.add_frame("default", _rocket_texture_for_id(rocket_id))
	orbit_rocket.sprite_frames = frames
	orbit_rocket.animation = &"default"
	orbit_rocket.stop()

func _get_stage2_sprite_frames() -> SpriteFrames:
	if _stage2_frames != null:
		return _stage2_frames
	var frames := SpriteFrames.new()
	frames.add_animation("default")
	frames.set_animation_speed("default", 8.0)
	frames.set_animation_loop("default", true)
	for path in STAGE2_FRAME_PATHS:
		frames.add_frame("default", load(path))
	_stage2_frames = frames
	return frames

func _rocket_texture_for_id(rocket_id: String) -> Texture2D:
	var rocket_type = _rocket_type_from_id(rocket_id)
	var textures = {
		"starterrocket1": preload("res://assets/Vehicles/StarterRocket1.png")
	}
	return textures.get(rocket_type, textures["starterrocket1"])

func _rocket_type_from_id(rocket_id: String) -> String:
	if rocket_id.find("-") != -1:
		var parts = rocket_id.split("-")
		if parts.size() > 0:
			return str(parts[0])
	return rocket_id

func _build_orbit_circle(radius: float, segments: int) -> void:
	if orbit_circle == null:
		return
	var points := PackedVector2Array()
	for i in range(segments + 1):
		var t = float(i) / float(segments) * TAU
		points.append(Vector2(cos(t), sin(t)) * radius)
	orbit_circle.points = points

func _price_for_mineral(name: String, amount: int) -> int:
	var unit = int(MINERAL_PRICES.get(name, 5))
	return unit * amount

func _hash_string(value: String) -> int:
	var hash := 0
	for i in range(value.length() - 1, -1, -1):
		hash = int((hash * 31 + value.unicode_at(i)) & 0x7fffffff)
	return max(hash, 1)

func _format_number_with_commas(value: String) -> String:
	var out := ""
	var count := 0
	for i in range(value.length() - 1, -1, -1):
		out = value[i] + out
		count += 1
		if count % 3 == 0 and i > 0:
			out = "," + out
	return out

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
