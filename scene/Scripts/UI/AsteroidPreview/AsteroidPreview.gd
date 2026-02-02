extends Node3D

const ROTATION_SPEED := Vector3(0.15, 0.35, 0.08)
const MIN_RADIUS := 0.72
const MAX_RADIUS := 0.96
const ORBIT_ROTATION_SPEED := 0.25
const ORBIT_RADIUS_PX := 416.0
const ORBIT_SEGMENTS := 64
const TARGET_LEVEL_SIZE := 5

@onready var asteroid_pivot: Node3D = $AsteroidPivot
@onready var asteroid_mesh: MeshInstance3D = $AsteroidPivot/Asteroid
@onready var camera_3d: Camera3D = $Camera3D
@onready var prev_button: Button = $CanvasLayer/UI/ButtonContainer/PrevButton
@onready var back_button: Button = $CanvasLayer/UI/Margin/VBox/Header/BackButton
@onready var target_label: Label = $CanvasLayer/UI/Margin/VBox/Header/TargetLabel
@onready var next_button: Button = $CanvasLayer/UI/ButtonContainer/NextButton
@onready var minerals_panel: Panel = $CanvasLayer/UI/Margin/VBox/MineralsPanel
@onready var minerals_title: Label = $CanvasLayer/UI/Margin/VBox/MineralsPanel/MineralsMargin/MineralsContent/MineralsTitle
@onready var minerals_summary: Label = $CanvasLayer/UI/Margin/VBox/MineralsPanel/MineralsMargin/MineralsContent/MineralsSummary
@onready var minerals_list: VBoxContainer = $CanvasLayer/UI/Margin/VBox/MineralsPanel/MineralsMargin/MineralsContent/MineralsList
@onready var orbit_root: Node2D = $CanvasLayer/Orbit2D
@onready var orbit_circle: Line2D = $CanvasLayer/Orbit2D/OrbitCircle
@onready var orbit_rocket: Sprite2D = $CanvasLayer/Orbit2D/OrbitRocket2D
@onready var return_home_button: Button = $CanvasLayer/UI/ControlPanel/ControlPanelMargin/ControlPanelButtons/ReturnHomeButton
@onready var mine_button: Button = $CanvasLayer/UI/ControlPanel/ControlPanelMargin/ControlPanelButtons/MineButton
@onready var mine_cooldown_label: Label = $CanvasLayer/UI/ControlPanel/ControlPanelMargin/ControlPanelButtons/MineCooldownLabel
@onready var mining_layer: Node2D = $CanvasLayer/MiningLayer
@onready var mining_beam: Line2D = $CanvasLayer/MiningLayer/MiningBeam
@onready var inventory_panel: Panel = $CanvasLayer/UI/InventoryPanel
@onready var inventory_title: Label = $CanvasLayer/UI/InventoryPanel/InventoryMargin/InventoryContent/InventoryTitle
@onready var inventory_summary: Label = $CanvasLayer/UI/InventoryPanel/InventoryMargin/InventoryContent/InventorySummary
@onready var inventory_total: Label = $CanvasLayer/UI/InventoryPanel/InventoryMargin/InventoryContent/InventoryTotal
@onready var inventory_list: VBoxContainer = $CanvasLayer/UI/InventoryPanel/InventoryMargin/InventoryContent/InventoryList

var _orbit_angle := 0.0
var _mine_ready_at := 0
var _current_rocket_id := ""
var _current_target_id := ""
var _current_target_type := ""
var _current_yield: Dictionary = {}

func _ready() -> void:
	var panel_style = preload("res://Scripts/UI/PanelStyle.gd")
	panel_style.apply_button(prev_button, false)
	panel_style.apply_button(back_button, false)
	panel_style.apply_button(next_button, false)
	panel_style.apply_title(target_label)
	panel_style.apply_panel(minerals_panel)
	panel_style.apply_title(minerals_title)
	panel_style.apply_body(minerals_summary)
	if back_button:
		back_button.pressed.connect(_on_back_pressed)
	if prev_button:
		prev_button.pressed.connect(_on_prev_pressed)
	if next_button:
		next_button.pressed.connect(_on_next_pressed)

	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	var target := {}
	if rm:
		target = rm.get_preview_target()
	var target_id = str(target.get("id", ""))
	var label = str(target.get("label", ""))
	var target_type = str(target.get("type", "asteroid"))
	var rocket_id = str(target.get("rocket_id", ""))
	_current_rocket_id = rocket_id
	_current_target_id = target_id
	_current_target_type = target_type
	if target_label:
		if label != "":
			target_label.text = "Preview: %s" % label
		elif target_id != "":
			target_label.text = "Preview: Asteroid %s" % target_id
		else:
			target_label.text = "Asteroid Preview"

	_populate_minerals(target_id, target_type)
	_setup_orbit_preview(target_id, rocket_id)
	_generate_asteroid(target_id)
	_update_inventory_ui()

	if return_home_button:
		return_home_button.pressed.connect(_on_return_home_pressed)
	if mine_button:
		mine_button.pressed.connect(_on_mine_pressed)
		mine_button.text = "Mine"
		_update_mine_button_state()
	if mine_cooldown_label:
		panel_style.apply_muted(mine_cooldown_label)
	if inventory_panel:
		panel_style.apply_panel(inventory_panel)
		panel_style.apply_title(inventory_title)
		panel_style.apply_body(inventory_summary)
		panel_style.apply_body(inventory_total)
		panel_style.apply_separator($CanvasLayer/UI/InventoryPanel/InventoryMargin/InventoryContent/InventorySeparator)

func _process(delta: float) -> void:
	if asteroid_pivot:
		asteroid_pivot.rotate_x(ROTATION_SPEED.x * delta)
		asteroid_pivot.rotate_y(ROTATION_SPEED.y * delta)
		asteroid_pivot.rotate_z(ROTATION_SPEED.z * delta)
	if orbit_root and orbit_root.visible:
		if camera_3d and asteroid_pivot:
			orbit_root.position = camera_3d.unproject_position(asteroid_pivot.global_position)
		_orbit_angle += ORBIT_ROTATION_SPEED * delta
		var offset = Vector2(cos(_orbit_angle), sin(_orbit_angle)) * ORBIT_RADIUS_PX
		orbit_rocket.position = offset
		orbit_rocket.rotation = _orbit_angle + PI
	_update_mine_button_state()

func _generate_asteroid(target_id: String) -> void:
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

	var base_radius = rng.randf_range(MIN_RADIUS, MAX_RADIUS)
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

func _palette_color(direction: float, offset: float, rng: RandomNumberGenerator) -> Color:
	var hue = fmod(direction + offset * 0.35, 1.0)
	var sat = rng.randf_range(0.12, 0.32)
	var val = rng.randf_range(0.68, 0.94)
	return Color.from_hsv(hue, sat, val)

func _on_back_pressed() -> void:
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if rm:
		rm.set_return_to_new_mission_panel(true)
		rm.clear_preview_target()
	_change_scene_to_base()

func _on_return_home_pressed() -> void:
	if _current_rocket_id == "":
		return
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if rm:
		rm.return_home(_current_rocket_id)
		rm.clear_preview_target()
	_change_scene_to_base()

func _on_mine_pressed() -> void:
	var now = Time.get_ticks_msec()
	if now < _mine_ready_at:
		return
	_mine_ready_at = now + 6000
	if mine_button:
		mine_button.text = "Mining..."
		mine_button.disabled = true
		var t = get_tree().create_timer(0.6)
		t.timeout.connect(func():
			if mine_button:
				mine_button.text = "Mine"
				mine_button.disabled = false
		)
	_fire_mining_beam()
	_apply_mining_yield()

func _update_mine_button_state() -> void:
	if mine_button == null:
		return
	var remaining = max(_mine_ready_at - Time.get_ticks_msec(), 0)
	if mine_cooldown_label:
		mine_cooldown_label.text = "" if remaining == 0 else "%ds" % int(ceil(float(remaining) / 1000.0))
	if remaining == 0:
		mine_button.disabled = false
		if mine_button.text != "Mine":
			mine_button.text = "Mine"
	else:
		mine_button.disabled = true

func _fire_mining_beam() -> void:
	if mining_beam == null:
		return
	var rocket_pos = _get_rocket_screen_pos()
	var target_pos = _get_target_screen_pos()
	mining_beam.clear_points()
	mining_beam.add_point(rocket_pos)
	mining_beam.add_point(target_pos)
	mining_beam.visible = true
	mining_beam.modulate = Color(1, 1, 1, 1)
	var tween = create_tween()
	tween.tween_property(mining_beam, "modulate:a", 0.0, 0.4)
	tween.finished.connect(func():
		mining_beam.visible = false
	)
	_spawn_debris(target_pos, rocket_pos)

func _spawn_debris(from_pos: Vector2, to_pos: Vector2) -> void:
	if mining_layer == null:
		return
	var rng = RandomNumberGenerator.new()
	rng.randomize()
	for _i in range(14):
		var debris = Polygon2D.new()
		debris.color = Color(0.85, 0.85, 0.85, 1)
		debris.polygon = PackedVector2Array([Vector2(-3, -2), Vector2(3, -1), Vector2(1, 3), Vector2(-2, 2)])
		debris.position = from_pos + Vector2(rng.randf_range(-10, 10), rng.randf_range(-10, 10))
		debris.rotation = rng.randf_range(0.0, TAU)
		mining_layer.add_child(debris)
		var travel = to_pos + Vector2(rng.randf_range(-16, 16), rng.randf_range(-16, 16))
		var tween = create_tween()
		tween.tween_property(debris, "position", travel, 0.7).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
		tween.parallel().tween_property(debris, "modulate:a", 0.0, 0.7)
		tween.parallel().tween_property(debris, "rotation", debris.rotation + rng.randf_range(-1.5, 1.5), 0.7)
		tween.finished.connect(func():
			if is_instance_valid(debris):
				debris.queue_free()
		)

func _get_rocket_screen_pos() -> Vector2:
	if orbit_root and orbit_rocket:
		return orbit_root.position + orbit_rocket.position
	var size = get_viewport().get_visible_rect().size
	return size * 0.5

func _get_target_screen_pos() -> Vector2:
	if camera_3d and asteroid_pivot:
		return camera_3d.unproject_position(asteroid_pivot.global_position)
	var size = get_viewport().get_visible_rect().size
	return size * 0.5

func _apply_mining_yield() -> void:
	if _current_target_id == "" or _current_yield.is_empty():
		return
	var minerals: Dictionary = _current_yield.get("minerals", {})
	var capacity = float(_current_yield.get("capacity", 0))
	var inventory = preload("res://Scripts/Utils/MiningInventory.gd")
	inventory.apply_mining(_current_target_id, capacity, minerals)
	_update_inventory_ui()

func _update_inventory_ui() -> void:
	if inventory_list == null:
		return
	for child in inventory_list.get_children():
		child.queue_free()
	if _current_target_id == "":
		inventory_summary.text = "Remaining: 0 kg"
		inventory_total.text = "Total Collected: 0 kg"
		return
	var inventory = preload("res://Scripts/Utils/MiningInventory.gd")
	var capacity = float(_current_yield.get("capacity", 0))
	var state = inventory.get_target_state(_current_target_id, capacity)
	var remaining = float(state.get("remaining_mass", capacity))
	inventory_summary.text = "Remaining: %s kg" % _format_number_with_commas(str(int(round(remaining))))
	var collected: Dictionary = state.get("collected", {})
	var total_collected := 0
	for v in collected.values():
		total_collected += int(v)
	inventory_total.text = "Total Collected: %s kg" % _format_number_with_commas(str(total_collected))
	var panel_style = preload("res://Scripts/UI/PanelStyle.gd")
	for name in collected.keys():
		var row = HBoxContainer.new()
		row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		var name_lbl = Label.new()
		name_lbl.text = str(name)
		name_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		panel_style.apply_body(name_lbl)
		var amount_lbl = Label.new()
		amount_lbl.text = "%s kg" % _format_number_with_commas(str(collected.get(name, 0)))
		panel_style.apply_muted(amount_lbl)
		amount_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
		row.add_child(name_lbl)
		row.add_child(amount_lbl)
		inventory_list.add_child(row)

func _on_prev_pressed() -> void:
	_cycle_preview(-1)

func _on_next_pressed() -> void:
	_cycle_preview(1)

func _cycle_preview(delta: int) -> void:
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if not rm:
		_change_scene_to_base()
		return
	var candidates = rm.get_preview_candidates()
	if candidates.is_empty():
		_change_scene_to_base()
		return
	var idx = rm.get_preview_index()
	if delta < 0 and idx == 0:
		_change_scene_to_base()
		return
	if delta > 0 and idx >= candidates.size() - 1:
		_change_scene_to_base()
		return
	idx = clamp(idx + delta, 0, candidates.size() - 1)
	rm.set_preview_index(idx)
	var target = candidates[idx]
	rm.set_preview_target(
		str(target.get("target_id", "")),
		str(target.get("label", "")),
		str(target.get("type", "asteroid")),
		str(target.get("rocket_id", ""))
	)
	_change_scene_to_preview()

func _change_scene_to_base() -> void:
	var tree = Engine.get_main_loop() as SceneTree
	if tree == null:
		return
	var scene_manager = null
	if tree.current_scene:
		scene_manager = tree.current_scene.get_node_or_null("SceneManager")
	if scene_manager and scene_manager.has_method("change_to_scene"):
		scene_manager.change_to_scene("res://Scenes/Earth/earth_base_1.tscn")
	else:
		tree.change_scene_to_file("res://Scenes/Earth/earth_base_1.tscn")

func _change_scene_to_preview() -> void:
	var tree = Engine.get_main_loop() as SceneTree
	if tree == null:
		return
	var scene_manager = null
	if tree.current_scene:
		scene_manager = tree.current_scene.get_node_or_null("SceneManager")
	if scene_manager and scene_manager.has_method("change_to_scene"):
		scene_manager.change_to_scene("res://Scenes/UI/AsteroidPreview/asteroid_preview.tscn")
	else:
		tree.change_scene_to_file("res://Scenes/UI/AsteroidPreview/asteroid_preview.tscn")

func _hash_string(value: String) -> int:
	var hash := 0
	for i in range(value.length()):
		hash = int((hash * 31 + value.unicode_at(i)) & 0x7fffffff)
	return max(hash, 1)

func _populate_minerals(target_id: String, target_type: String) -> void:
	if minerals_list == null:
		return
	for child in minerals_list.get_children():
		child.queue_free()
	if target_id == "":
		minerals_summary.text = "No target selected."
		return
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	var rank := 1
	if rm:
		rank = rm.register_target_interaction(target_id, target_type)
	var level = int(floor(float(max(rank - 1, 0)) / float(TARGET_LEVEL_SIZE))) + 1
	var resource_yield = preload("res://Scripts/Utils/ResourceYield.gd")
	var yield_data = resource_yield.get_yield_for_target(target_id, target_type, level)
	_current_yield = yield_data
	var minerals: Dictionary = yield_data.get("minerals", {})
	var capacity = int(yield_data.get("capacity", 0))
	var mineable_pct = float(yield_data.get("mineable_pct", 0.0))
	var level_display = int(yield_data.get("level", level))

	minerals_title.text = "Minerals Available"
	var type_label = "Planet" if str(yield_data.get("type", "asteroid")) == "planet" else "Asteroid"
	minerals_summary.text = "%s Level %d • Mineable: %d%% • %s units" % [
		type_label,
		level_display,
		int(round(mineable_pct * 100.0)),
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

func _format_number_with_commas(value: String) -> String:
	var out := ""
	var count := 0
	for i in range(value.length() - 1, -1, -1):
		out = value[i] + out
		count += 1
		if count % 3 == 0 and i > 0:
			out = "," + out
	return out

func _setup_orbit_preview(target_id: String, rocket_id: String) -> void:
	if orbit_root == null or orbit_rocket == null or orbit_circle == null:
		return
	orbit_root.visible = false
	if target_id == "" or rocket_id == "":
		return
	if not _rocket_has_arrived(target_id, rocket_id):
		return
	orbit_root.visible = true
	_orbit_angle = 0.0
	if camera_3d and asteroid_pivot:
		orbit_root.position = camera_3d.unproject_position(asteroid_pivot.global_position)
	else:
		var size = get_viewport().get_visible_rect().size
		orbit_root.position = size * 0.5
	_build_orbit_circle(ORBIT_RADIUS_PX, ORBIT_SEGMENTS)
	orbit_rocket.position = Vector2(ORBIT_RADIUS_PX, 0)
	orbit_rocket.scale = Vector2(0.2, 0.2)
	orbit_rocket.texture = _rocket_texture_for_id(rocket_id)

func _rocket_has_arrived(target_id: String, rocket_id: String) -> bool:
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	var missions: Array = []
	if rm:
		missions = rm.get_missions()
	if missions.is_empty():
		return false
	var time_helper = preload("res://Scripts/Earth/TimeHelper.gd")
	var now = int(time_helper.get_unix_epoch_seconds())
	for m in missions:
		if str(m.get("rocket_id", "")) != rocket_id:
			continue
		if str(m.get("target", "")) != target_id:
			continue
		var arrival_time = int(m.get("arrival_time", 0))
		return arrival_time > 0 and arrival_time <= now
	return false

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
