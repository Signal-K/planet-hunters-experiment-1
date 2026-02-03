extends RefCounted
class_name NewMissionLaunchList

var _launch_list_container: Node
var _on_refund: Callable
const PREVIEW_SCENE_PATH := "res://Scenes/Transitions/rocket_transit.tscn"
const MIN_DISTANCE_KM := 150000.0
const MAX_DISTANCE_KM := 3000000.0
const TRAVEL_SECONDS := 60.0
var _mission_rows := {}
const TimeHelper = preload("res://Scripts/Earth/TimeHelper.gd")

func setup(launch_list_container: Node, on_refund: Callable) -> void:
	_launch_list_container = launch_list_container
	_on_refund = on_refund

func display_launched_rockets() -> void:
	# Clear existing list
	for c in _launch_list_container.get_children():
		c.queue_free()
	_mission_rows.clear()
	# Load launched rockets from RocketsManager
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	var panel_style = preload("res://Scripts/UI/PanelStyle.gd")
	var launched: Array = []
	var missions: Array = []
	var targets: Array = []
	if rm:
		launched = rm.get_launched()
		missions = rm.get_missions()
		targets = rm.get_detected_targets()
	if launched.size() == 0:
		var lbl = Label.new()
		lbl.text = "No missions in flight."
		lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		panel_style.apply_muted(lbl)
		_launch_list_container.add_child(lbl)
		return

	var header = Label.new()
	header.text = "Missions in flight"
	header.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	panel_style.apply_title(header)
	_launch_list_container.add_child(header)

	var target_map := _build_target_map(targets)
	var missions_by_rocket := _build_missions_by_rocket(missions, launched)

	# For each launched rocket, add a row with target info and controls
	for i in range(launched.size()):
		var id = str(launched[i])
		var mission = missions_by_rocket.get(id, {})
		var target_id = str(mission.get("target", ""))
		var target_label = _get_target_label(target_map, target_id)
		var distance_text = "Unknown"
		if target_id != "":
			var distance_km = _distance_for_target(target_id)
			distance_text = _format_distance_km(distance_km)

		var row = HBoxContainer.new()
		row.custom_minimum_size = Vector2(0, 88)

		var info = VBoxContainer.new()
		info.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		var title_lbl = Label.new()
		title_lbl.text = "Rocket %s → %s" % [id, target_label]
		panel_style.apply_body(title_lbl)
		var dist_lbl = Label.new()
		dist_lbl.text = "Distance: %s" % distance_text
		panel_style.apply_muted(dist_lbl)
		var progress = ProgressBar.new()
		progress.custom_minimum_size = Vector2(260, 18)
		progress.min_value = 0
		progress.max_value = 100
		panel_style.apply_progress_bar(progress)
		info.add_child(title_lbl)
		info.add_child(dist_lbl)
		info.add_child(progress)
		row.add_child(info)

		var preview_btn = Button.new()
		preview_btn.text = "Preview"
		preview_btn.custom_minimum_size = Vector2(120, 40)
		if target_id == "":
			preview_btn.disabled = true
		else:
			var target_type = _get_target_type(target_map, target_id)
			preview_btn.pressed.connect(Callable(self, "_on_preview_pressed").bind(target_id, target_label, target_type, id))
		panel_style.apply_button(preview_btn, true)
		row.add_child(preview_btn)

		var btn = Button.new()
		btn.text = "Self-Destruct"
		btn.custom_minimum_size = Vector2(160, 40)
		btn.pressed.connect(Callable(self, "_on_self_destruct_pressed").bind(id))
		panel_style.apply_button(btn, false)
		row.add_child(btn)

		_launch_list_container.add_child(row)
		_mission_rows[id] = {
			"progress": progress,
			"launch_time": float(mission.get("launch_time", 0)),
			"arrival_time": float(mission.get("arrival_time", 0))
		}

	update_progress()

func _on_self_destruct_pressed(rocket_id: String) -> void:
	print("NewMissionPanel: self-destruct requested for", rocket_id)
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if rm:
		var ok = rm.set_destroyed(rocket_id)
		if ok:
			print("NewMissionPanel: rocket", rocket_id, "marked Destroyed")
			if _on_refund.is_valid():
				_on_refund.call()
			# Refresh the launched list UI
			display_launched_rockets()
		else:
			print("NewMissionPanel: failed to mark rocket destroyed:", rocket_id)
	else:
		print("NewMissionPanel: RocketsManager not available")

func _on_preview_pressed(target_id: String, target_label: String, target_type: String, rocket_id: String) -> void:
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if rm:
		rm.set_preview_target(target_id, target_label, target_type, rocket_id)
	_change_to_preview_scene()

func _change_to_preview_scene() -> void:
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

func _build_target_map(targets: Array) -> Dictionary:
	var map := {}
	for t in targets:
		var id = str(t.get("id", ""))
		if id == "":
			continue
		var label = str(t.get("label", id))
		var target_type = str(t.get("type", "asteroid"))
		map[id] = {"label": label, "type": target_type}
	return map

func _build_missions_by_rocket(missions: Array, launched: Array) -> Dictionary:
	var map := {}
	for m in missions:
		var rocket_id = str(m.get("rocket_id", ""))
		if rocket_id != "" and launched.has(rocket_id):
			map[rocket_id] = m
	return map

func _get_target_label(target_map: Dictionary, target_id: String) -> String:
	if target_id != "" and target_map.has(target_id):
		var entry = target_map[target_id]
		if typeof(entry) == TYPE_DICTIONARY:
			return str(entry.get("label", target_id))
		return str(entry)
	if target_id != "":
		return "Asteroid %s" % target_id
	return "Unknown target"

func _get_target_type(target_map: Dictionary, target_id: String) -> String:
	if target_id != "" and target_map.has(target_id):
		var entry = target_map[target_id]
		if typeof(entry) == TYPE_DICTIONARY:
			return str(entry.get("type", "asteroid"))
	return "asteroid"

func _distance_for_target(target_id: String) -> float:
	var seed = _hash_string(target_id)
	var rng = RandomNumberGenerator.new()
	rng.seed = seed
	return rng.randf_range(MIN_DISTANCE_KM, MAX_DISTANCE_KM)

func _format_distance_km(distance_km: float) -> String:
	var rounded = int(round(distance_km))
	return "%s km" % _format_number_with_commas(str(rounded))

func _format_number_with_commas(value: String) -> String:
	var out := ""
	var count := 0
	for i in range(value.length() - 1, -1, -1):
		out = value[i] + out
		count += 1
		if count % 3 == 0 and i > 0:
			out = "," + out
	return out

func _hash_string(value: String) -> int:
	var hash := 0
	for i in range(value.length()):
		hash = int((hash * 31 + value.unicode_at(i)) & 0x7fffffff)
	return max(hash, 1)

func update_progress() -> void:
	if _mission_rows.is_empty():
		return
	var now = float(TimeHelper.get_unix_epoch_seconds())
	for rocket_id in _mission_rows.keys():
		var data = _mission_rows[rocket_id]
		if not data.has("progress"):
			continue
		var bar: ProgressBar = data["progress"]
		var launch_time = float(data.get("launch_time", 0))
		var arrival_time = float(data.get("arrival_time", 0))
		if launch_time > 0 and arrival_time <= launch_time:
			arrival_time = launch_time + TRAVEL_SECONDS
		if launch_time <= 0 or arrival_time <= launch_time:
			bar.value = 0
			continue
		var pct = clamp((now - launch_time) / max(arrival_time - launch_time, 1.0), 0.0, 1.0)
		bar.value = pct * 100.0
