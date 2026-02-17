extends Node3D

const ROTATION_SPEED := Vector3(0.15, 0.35, 0.08)
const MIN_RADIUS := 0.72
const MAX_RADIUS := 0.96
const ORBIT_ROTATION_SPEED := 0.25
const ORBIT_RADIUS_PX := 416.0
const ORBIT_SEGMENTS := 64
const TARGET_LEVEL_SIZE := 5
const NumberFormat = preload("res://Scripts/Utils/NumberFormat.gd")
const RocketSpecs = preload("res://Scripts/Utils/RocketSpecs.gd")
const RETURN_SCENE_PATH := "res://Scenes/Transitions/rocket_return.tscn"
const ROCKET_TIP_PADDING_PX := 8.0
const ACTION_OPEN_PREVIEW := "open_asteroid_preview"
const ACTION_MINE_TARGET := "mine_target"
const ACTION_RETURN_HOME := "return_rocket_home"
const HINT_OPEN_PREVIEW := "This preview shows your rocket at the target and what you can collect."
const HINT_MINE_TARGET := "Press Mine to collect minerals from this target."
const HINT_RETURN_HOME := "Press Return Home to send this rocket back to Earth with its cargo."

@onready var asteroid_pivot: Node3D = $AsteroidPivot
@onready var asteroid_mesh: MeshInstance3D = $AsteroidPivot/Asteroid
@onready var camera_3d: Camera3D = $Camera3D
@onready var prev_button: Button = $CanvasLayer/UI/ButtonContainer/PrevButton
@onready var back_button: Button = $CanvasLayer/UI/Margin/VBox/Header/BackButton
@onready var target_label: Label = $CanvasLayer/UI/Margin/VBox/Header/TargetLabel
@onready var next_button: Button = $CanvasLayer/UI/ButtonContainer/NextButton
@onready var minerals_panel: Button = $CanvasLayer/UI/Margin/VBox/MineralsPanel
@onready var minerals_title: Label = $CanvasLayer/UI/Margin/VBox/MineralsPanel/MineralsMargin/MineralsContent/MineralsTitle
@onready var minerals_summary: Label = $CanvasLayer/UI/Margin/VBox/MineralsPanel/MineralsMargin/MineralsContent/MineralsSummary
@onready var minerals_list: VBoxContainer = $CanvasLayer/UI/Margin/VBox/MineralsPanel/MineralsMargin/MineralsContent/MineralsList
@onready var orbit_root: Node2D = $CanvasLayer/Orbit2D
@onready var orbit_circle: Line2D = $CanvasLayer/Orbit2D/OrbitCircle
@onready var orbit_heading: Line2D = $CanvasLayer/Orbit2D/OrbitHeading
@onready var orbit_rocket: AnimatedSprite2D = $CanvasLayer/Orbit2D/OrbitRocket2D
@onready var return_home_button: Button = $CanvasLayer/UI/ControlPanel/ControlPanelMargin/ControlPanelButtons/ReturnHomeButton
@onready var mine_button: Button = $CanvasLayer/UI/ControlPanel/ControlPanelMargin/ControlPanelButtons/MineButton
@onready var mine_cooldown_label: Label = $CanvasLayer/UI/ControlPanel/ControlPanelMargin/ControlPanelButtons/MineCooldownLabel
@onready var mining_layer: Node2D = $CanvasLayer/MiningLayer
@onready var mining_beam: Line2D = $CanvasLayer/MiningLayer/MiningBeam
@onready var inventory_panel: Button = $CanvasLayer/UI/InventoryPanel
@onready var inventory_title: Label = $CanvasLayer/UI/InventoryPanel/InventoryMargin/InventoryContent/InventoryTitle
@onready var inventory_summary: Label = $CanvasLayer/UI/InventoryPanel/InventoryMargin/InventoryContent/InventorySummary
@onready var inventory_total: Label = $CanvasLayer/UI/InventoryPanel/InventoryMargin/InventoryContent/InventoryTotal
@onready var inventory_list: VBoxContainer = $CanvasLayer/UI/InventoryPanel/InventoryMargin/InventoryContent/InventoryList

var _orbit_angle := 0.0
var _mine_ready_at := 0
var _current_rocket_id := ""
var _stage2_sprite_frames: SpriteFrames = null

var _current_target_id := ""
var _current_target_type := ""
var _current_target_label := ""
var _current_yield: Dictionary = {}
var _mining_target_pos := Vector2.ZERO
var _mining_active := false
var _minerals_expanded := true
var _inventory_expanded := true

func _ready() -> void:
	var panel_style = preload("res://Scripts/UI/PanelStyle.gd")
	panel_style.apply_button(prev_button, false)
	panel_style.apply_button(back_button, false)
	panel_style.apply_button(next_button, false)
	panel_style.apply_title(target_label)
	panel_style.apply_button(minerals_panel, false)
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
		target = _resolve_preview_target_context(rm)
	var target_id = str(target.get("id", ""))
	var label = str(target.get("label", ""))
	var target_type = str(target.get("type", "asteroid"))
	var rocket_id = str(target.get("rocket_id", ""))
	if target_id != "" and rocket_id == "":
		var rm2 = preload("res://Scripts/Utils/RocketsManager.gd")
		if rm2:
			rocket_id = str(rm2.resolve_preview_rocket_id(target_id))
	if rocket_id == "":
		rocket_id = "starterrocket1"
	_current_rocket_id = rocket_id
	_current_target_id = target_id
	_current_target_type = target_type
	_current_target_label = label
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
	_show_tutorial_hint_once(ACTION_OPEN_PREVIEW, HINT_OPEN_PREVIEW)

	if return_home_button:
		return_home_button.pressed.connect(_on_return_home_pressed)
	if mine_button:
		mine_button.pressed.connect(_on_mine_pressed)
		_update_mine_button_state()
	if mine_cooldown_label:
		panel_style.apply_muted(mine_cooldown_label)
	if inventory_panel:
		panel_style.apply_button(inventory_panel, false)
		panel_style.apply_title(inventory_title)
		panel_style.apply_body(inventory_summary)
		panel_style.apply_body(inventory_total)
		panel_style.apply_separator($CanvasLayer/UI/InventoryPanel/InventoryMargin/InventoryContent/InventorySeparator)
	_configure_readout_buttons()

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
		var orbit_utils = preload("res://Scripts/Utils/OrbitVisuals.gd")
		orbit_utils.update_heading_line(orbit_heading, orbit_rocket)
	if _mining_active and mining_beam and mining_beam.visible:
		var rocket_pos = _get_rocket_screen_pos()
		mining_beam.set_point_position(0, rocket_pos)
		mining_beam.set_point_position(1, _mining_target_pos)
	_update_mine_button_state()

func _generate_asteroid(target_id: String) -> void:
	if asteroid_mesh == null:
		return
	var builder = preload("res://Scripts/Utils/ProceduralBodyBuilder.gd")
	builder.build_asteroid(asteroid_mesh, target_id, MIN_RADIUS, MAX_RADIUS, Color(0.35, 0.35, 0.35))

func _on_back_pressed() -> void:
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if rm:
		rm.set_return_to_new_mission_panel(true)
		rm.clear_preview_target()
	_change_scene_to_base()

func _on_return_home_pressed() -> void:
	if _current_rocket_id == "":
		return
	_show_tutorial_hint_once(ACTION_RETURN_HOME, HINT_RETURN_HOME)
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if rm:
		rm.set_returned_mission(_current_rocket_id, _current_target_id, _current_target_label, _current_target_type)
		rm.return_home(_current_rocket_id)
		rm.clear_preview_target()
	_change_scene_to_return()

func _on_mine_pressed() -> void:
	var now = Time.get_ticks_msec()
	if now < _mine_ready_at:
		return
	_show_tutorial_hint_once(ACTION_MINE_TARGET, HINT_MINE_TARGET)
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
	# Guard against incomplete preview context so the button never appears "dead".
	if _current_target_id == "" or _current_yield.is_empty():
		mine_button.disabled = true
		if mine_cooldown_label:
			mine_cooldown_label.text = "No target"
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
	_mining_target_pos = target_pos
	_mining_active = true
	mining_beam.clear_points()
	mining_beam.add_point(rocket_pos)
	mining_beam.add_point(target_pos)
	mining_beam.visible = true
	mining_beam.modulate = Color(1, 1, 1, 1)
	var tween = create_tween()
	tween.tween_property(mining_beam, "modulate:a", 0.0, 0.4)
	tween.finished.connect(func():
		mining_beam.visible = false
		_mining_active = false
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
		var tip_offset = _get_rocket_tip_offset()
		return orbit_root.position + orbit_rocket.position + tip_offset
	var size = get_viewport().get_visible_rect().size
	return size * 0.5

func _get_rocket_tip_offset() -> Vector2:
	if orbit_rocket == null:
		return Vector2.ZERO
	var frames = orbit_rocket.sprite_frames
	if frames == null or not frames.has_animation("default") or frames.get_frame_count("default") == 0:
		return Vector2.ZERO
	var tex: Texture2D = frames.get_frame_texture("default", 0)
	if tex == null:
		return Vector2.ZERO
	var size = tex.get_size()
	var scale = orbit_rocket.scale
	if scale == Vector2.ZERO:
		scale = Vector2.ONE
	# Sprite is centered; tip is near the top edge in local space.
	var local = Vector2(0.0, -size.y * 0.5 + ROCKET_TIP_PADDING_PX) * scale
	return local.rotated(orbit_rocket.rotation)

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
	var mining_multiplier = RocketSpecs.get_mining_multiplier(_current_rocket_id)
	var state = inventory.apply_mining(_current_target_id, capacity, minerals, mining_multiplier)
	_update_inventory_ui(state)

func _show_tutorial_hint_once(action_key: String, message: String) -> void:
	var app = get_tree().root.find_child("AppController", true, false)
	if app and app.has_method("show_tutorial_hint_once"):
		app.show_tutorial_hint_once(action_key, message)

func _configure_readout_buttons() -> void:
	if minerals_panel:
		minerals_panel.focus_mode = Control.FOCUS_NONE
		minerals_panel.pressed.connect(_on_minerals_pressed)
	if inventory_panel:
		inventory_panel.focus_mode = Control.FOCUS_NONE
		inventory_panel.pressed.connect(_on_inventory_pressed)
	_update_readout_visibility()

func _on_minerals_pressed() -> void:
	_minerals_expanded = not _minerals_expanded
	_update_readout_visibility()

func _on_inventory_pressed() -> void:
	_inventory_expanded = not _inventory_expanded
	_update_readout_visibility()

func _update_readout_visibility() -> void:
	if minerals_summary:
		minerals_summary.visible = _minerals_expanded
	if minerals_list:
		minerals_list.visible = _minerals_expanded
	if inventory_summary:
		inventory_summary.visible = _inventory_expanded
	if inventory_total:
		inventory_total.visible = _inventory_expanded
	if inventory_list:
		inventory_list.visible = _inventory_expanded

func _update_inventory_ui(state_override: Dictionary = {}) -> void:
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
	var state = state_override
	if state.is_empty():
		state = inventory.get_target_state(_current_target_id, capacity)
	var remaining = float(state.get("remaining_mass", capacity))
	inventory_summary.text = "Remaining: %s kg" % NumberFormat.commas(str(int(round(remaining))))
	var collected: Dictionary = state.get("collected", {})
	var total_collected := 0
	for v in collected.values():
		total_collected += int(v)
	inventory_total.text = "Total Collected: %s kg" % NumberFormat.commas(str(total_collected))
	var panel_style = preload("res://Scripts/UI/PanelStyle.gd")
	for name in collected.keys():
		var row = HBoxContainer.new()
		row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		var name_lbl = Label.new()
		name_lbl.text = str(name)
		name_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		panel_style.apply_body(name_lbl)
		var amount_lbl = Label.new()
		amount_lbl.text = "%s kg" % NumberFormat.commas(str(collected.get(name, 0)))
		panel_style.apply_muted(amount_lbl)
		amount_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
		row.add_child(name_lbl)
		row.add_child(amount_lbl)
		inventory_list.add_child(row)
	_update_minerals_available(state)

func _update_minerals_available(state: Dictionary) -> void:
	if _current_yield.is_empty():
		return
	var minerals: Dictionary = _current_yield.get("minerals", {})
	var collected: Dictionary = state.get("collected", {})
	var remaining_minerals := {}
	for name in minerals.keys():
		var original = int(minerals.get(name, 0))
		var mined = int(collected.get(name, 0))
		remaining_minerals[name] = max(original - mined, 0)
	_build_minerals_list(remaining_minerals)
	var remaining_mass = int(round(float(state.get("remaining_mass", _current_yield.get("capacity", 0)))))
	_update_minerals_summary(remaining_mass)

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

func _change_scene_to_return() -> void:
	var tree = Engine.get_main_loop() as SceneTree
	if tree == null:
		return
	var scene_manager = null
	if tree.current_scene:
		scene_manager = tree.current_scene.get_node_or_null("SceneManager")
	if scene_manager and scene_manager.has_method("change_to_scene"):
		scene_manager.change_to_scene(RETURN_SCENE_PATH)
	else:
		tree.change_scene_to_file(RETURN_SCENE_PATH)

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
	var cargo_multiplier = RocketSpecs.get_cargo_multiplier(_current_rocket_id)
	var yield_data = resource_yield.get_yield_for_target(target_id, target_type, level, cargo_multiplier)
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
		NumberFormat.commas(str(capacity))
	]

	_build_minerals_list(minerals)

func _build_minerals_list(minerals: Dictionary) -> void:
	if minerals_list == null:
		return
	for child in minerals_list.get_children():
		child.queue_free()
	var resource_yield = preload("res://Scripts/Utils/ResourceYield.gd")
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

func _update_minerals_summary(capacity_override: int) -> void:
	if _current_yield.is_empty():
		return
	var mineable_pct = float(_current_yield.get("mineable_pct", 0.0))
	var level_display = int(_current_yield.get("level", 1))
	var type_label = "Planet" if str(_current_yield.get("type", "asteroid")) == "planet" else "Asteroid"
	minerals_summary.text = "%s Level %d • Mineable: %d%% • %s units" % [
		type_label,
		level_display,
		int(round(mineable_pct * 100.0)),
		NumberFormat.commas(str(capacity_override))
	]

func _setup_orbit_preview(target_id: String, rocket_id: String) -> void:
	if orbit_root == null or orbit_rocket == null or orbit_circle == null:
		return
	orbit_root.visible = false
	if orbit_heading:
		orbit_heading.visible = false
	if target_id == "":
		return
	var effective_rocket_id = rocket_id
	if effective_rocket_id == "":
		var rm_resolve = preload("res://Scripts/Utils/RocketsManager.gd")
		if rm_resolve:
			effective_rocket_id = str(rm_resolve.resolve_preview_rocket_id(target_id))
	if effective_rocket_id == "":
		effective_rocket_id = "starterrocket1"
	if not _rocket_has_arrived(target_id, effective_rocket_id):
		var rm_mark = preload("res://Scripts/Utils/RocketsManager.gd")
		if rm_mark:
			rm_mark.mark_arrived(effective_rocket_id, target_id)
	_current_rocket_id = effective_rocket_id
	orbit_root.visible = true
	_orbit_angle = 0.0
	if camera_3d and asteroid_pivot:
		orbit_root.position = camera_3d.unproject_position(asteroid_pivot.global_position)
	else:
		var size = get_viewport().get_visible_rect().size
		orbit_root.position = size * 0.5
	var orbit_utils = preload("res://Scripts/Utils/OrbitVisuals.gd")
	orbit_utils.build_orbit_circle(orbit_circle, ORBIT_RADIUS_PX, ORBIT_SEGMENTS)
	orbit_rocket.position = Vector2(ORBIT_RADIUS_PX, 0)
	orbit_rocket.scale = Vector2(0.2, 0.2)
	_set_orbit_rocket_visual(effective_rocket_id)
	var orbit_utils2 = preload("res://Scripts/Utils/OrbitVisuals.gd")
	orbit_utils2.update_heading_line(orbit_heading, orbit_rocket)

func _set_orbit_rocket_visual(rocket_id: String) -> void:
	if orbit_rocket == null:
		return
	var helper = preload("res://Scripts/Utils/RocketSpriteHelper.gd")
	helper.apply_orbit_sprite(orbit_rocket, rocket_id)

func _rocket_has_arrived(target_id: String, rocket_id: String) -> bool:
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	var missions: Array = []
	if rm:
		if rm.has_arrived(rocket_id, target_id):
			return true
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
		var arrived = arrival_time > 0 and arrival_time <= now
		if arrived and rm:
			rm.mark_arrived(rocket_id, target_id)
		return arrived
	return false

func _resolve_preview_target_context(rm) -> Dictionary:
	var target: Dictionary = rm.get_preview_target()
	var target_id = str(target.get("id", ""))
	var label = str(target.get("label", ""))
	var target_type = str(target.get("type", "asteroid"))
	var rocket_id = str(target.get("rocket_id", ""))

	if target_id == "":
		var candidates = rm.get_preview_candidates()
		if not candidates.is_empty():
			var idx = clamp(rm.get_preview_index(), 0, candidates.size() - 1)
			var candidate: Dictionary = candidates[idx]
			target_id = str(candidate.get("target_id", ""))
			if label == "":
				label = str(candidate.get("label", ""))
			target_type = str(candidate.get("type", target_type))
			if rocket_id == "":
				rocket_id = str(candidate.get("rocket_id", ""))

	if target_id == "" and rocket_id != "":
		var mission = rm.get_mission_for_rocket(rocket_id)
		target_id = str(mission.get("target", ""))

	if rocket_id == "" and target_id != "":
		rocket_id = rm.resolve_preview_rocket_id(target_id)

	if target_id != "":
		rm.set_preview_target(target_id, label, target_type, rocket_id)
		target = rm.get_preview_target()

	return target
