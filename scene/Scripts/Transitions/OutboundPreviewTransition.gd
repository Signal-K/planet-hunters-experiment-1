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

var _orbit_angle := 0.0
var _phase_time := 0.0
var _earth_alpha := 1.0
var _target_alpha := 0.0
var _current_target_id := ""
var _current_target_label := ""
var _current_target_type := ""
var _current_rocket_id := ""
var _stage2_frames: SpriteFrames = null
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
	panel_style.apply_panel(travel_panel)
	panel_style.apply_title(travel_title)
	panel_style.apply_body(travel_speed)
	panel_style.apply_progress_bar(travel_bar)
	travel_panel.visible = false
	minerals_panel.visible = false
	control_panel.visible = false
	inventory_panel.visible = false
	back_button.pressed.connect(_on_back_pressed)

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
	_build_orbit_circle(ORBIT_RADIUS_PX, ORBIT_SEGMENTS)
	orbit_rocket.position = Vector2(ORBIT_RADIUS_PX, 0)
	orbit_rocket.scale = Vector2(0.2, 0.2)
	_set_orbit_rocket_visual(_current_rocket_id)
	_update_heading_line()

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
		travel_speed.text = "Speed: %s km/h" % _format_number_with_commas(str(int(round(speed))))
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

func _hash_string(value: String) -> int:
	var hash := 0
	for i in range(value.length()):
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
