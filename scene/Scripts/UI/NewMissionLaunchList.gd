extends RefCounted
class_name NewMissionLaunchList

var _launch_list_container: Node
var _on_refund: Callable
const MIN_DISTANCE_KM := 150000.0
const MAX_DISTANCE_KM := 3000000.0
const PreviewRouting = preload("res://Scripts/UI/NewMissionPreviewRouting.gd")
const LaunchRowScene = preload("res://Scenes/UI/Templates/NewMissionLaunchRow.tscn")
const ReturningRowScene = preload("res://Scenes/UI/Templates/NewMissionReturningRow.tscn")
const HeaderLabelScene = preload("res://Scenes/UI/Templates/MenuUnlockHeader.tscn")
const EmptyLabelScene = preload("res://Scenes/UI/Templates/MenuLogbookEmpty.tscn")
var _mission_rows := {}
const TimeHelper = preload("res://Scripts/Earth/TimeHelper.gd")
const RocketsManager = preload("res://Scripts/Utils/RocketsManager.gd")
const PanelStyle = preload("res://Scripts/UI/PanelStyle.gd")
const HashUtils = preload("res://Scripts/Utils/HashUtils.gd")
const NumberFormat = preload("res://Scripts/Utils/NumberFormat.gd")

func setup(launch_list_container: Node, on_refund: Callable) -> void:
	_launch_list_container = launch_list_container
	_on_refund = on_refund

func display_launched_rockets() -> void:
	# Clear existing list
	for c in _launch_list_container.get_children():
		c.queue_free()
	_mission_rows.clear()
	# Load launched rockets from RocketsManager
	var rm = RocketsManager
	var panel_style = PanelStyle
	var launched: Array = []
	var missions: Array = []
	var targets: Array = []
	var returning := {}
	if rm:
		launched = rm.get_launched()
		missions = rm.get_missions()
		targets = rm.get_detected_targets()
		returning = rm.get_returned_mission()
	var has_returning = not returning.is_empty() and str(returning.get("rocket_id", "")) != ""
	if launched.size() == 0 and not has_returning:
		var lbl: Label = EmptyLabelScene.instantiate()
		lbl.text = "No missions in flight."
		panel_style.apply_muted(lbl)
		_launch_list_container.add_child(lbl)
		return

	if launched.size() > 0:
		var header: Label = HeaderLabelScene.instantiate()
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

		var row: HBoxContainer = LaunchRowScene.instantiate()
		var info: VBoxContainer = row.get_node("Info")
		var title_lbl: Label = row.get_node("Info/TitleLabel")
		title_lbl.text = "Rocket %s → %s" % [id, target_label]
		panel_style.apply_body(title_lbl)
		var dist_lbl: Label = row.get_node("Info/DistanceLabel")
		dist_lbl.text = "Distance: %s" % distance_text
		panel_style.apply_muted(dist_lbl)
		var progress: ProgressBar = row.get_node("Info/Progress")
		progress.min_value = 0
		progress.max_value = 100
		panel_style.apply_progress_bar(progress)

		var preview_btn: Button = row.get_node("PreviewButton")
		if target_id == "":
			preview_btn.disabled = true
		else:
			var target_type = _get_target_type(target_map, target_id)
			preview_btn.pressed.connect(Callable(self, "_on_preview_pressed").bind(target_id, target_label, target_type, id))
		panel_style.apply_button(preview_btn, true)

		var btn: Button = row.get_node("ActionButton")
		btn.text = "Self-Destruct"
		btn.pressed.connect(Callable(self, "_on_self_destruct_pressed").bind(id))
		panel_style.apply_button(btn, false)

		_launch_list_container.add_child(row)
		_mission_rows[id] = {
			"progress": progress,
			"launch_time": float(mission.get("launch_time", 0)),
			"arrival_time": float(mission.get("arrival_time", 0))
		}

	if has_returning:
		var returning_header: Label = HeaderLabelScene.instantiate()
		returning_header.text = "Returning to Earth"
		returning_header.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
		panel_style.apply_title(returning_header)
		_launch_list_container.add_child(returning_header)

		var rocket_id = str(returning.get("rocket_id", ""))
		var target_id = str(returning.get("target_id", ""))
		var target_type = str(returning.get("type", "asteroid"))
		var target_label = str(returning.get("label", ""))
		if target_label == "" and target_id != "":
			target_label = "Asteroid %s" % target_id
		if target_label == "":
			target_label = "Unknown target"

		var row: HBoxContainer = ReturningRowScene.instantiate()
		var info: VBoxContainer = row.get_node("Info")
		var title_lbl: Label = row.get_node("Info/TitleLabel")
		title_lbl.text = "Rocket %s → %s" % [rocket_id, target_label]
		panel_style.apply_body(title_lbl)
		var dist_lbl: Label = row.get_node("Info/StatusLabel")
		dist_lbl.text = "Status: Returning"
		panel_style.apply_muted(dist_lbl)

		var preview_btn: Button = row.get_node("PreviewButton")
		if target_id == "":
			preview_btn.disabled = true
		else:
			preview_btn.pressed.connect(Callable(self, "_on_preview_pressed").bind(target_id, target_label, target_type, rocket_id))
		panel_style.apply_button(preview_btn, true)

		_launch_list_container.add_child(row)

	update_progress()

func _on_self_destruct_pressed(rocket_id: String) -> void:
	print("NewMissionPanel: self-destruct requested for", rocket_id)
	var rm = RocketsManager
	if rm:
		var ok = rm.set_destroyed(rocket_id)
		if ok:
			print("NewMissionPanel: rocket", rocket_id, "marked Destroyed")
			if _on_refund.is_valid():
				_on_refund.call(rocket_id)
			# Refresh the launched list UI
			display_launched_rockets()
		else:
			print("NewMissionPanel: failed to mark rocket destroyed:", rocket_id)
	else:
		print("NewMissionPanel: RocketsManager not available")

func _on_preview_pressed(target_id: String, target_label: String, target_type: String, rocket_id: String) -> void:
	var rm = RocketsManager
	if rm:
		rm.set_preview_target(target_id, target_label, target_type, rocket_id)
	var status = ""
	if rm:
		rm.mark_returned_if_due(rocket_id)
		status = rm.get_rocket_status(rocket_id)
	var arrived = _has_arrived(target_id, rocket_id)
	_change_to_scene(PreviewRouting.resolve_scene_path(status, arrived))

func _change_to_scene(scene_path: String) -> void:
	var tree = Engine.get_main_loop() as SceneTree
	if tree == null:
		return
	var scene_manager = null
	if tree.current_scene:
		scene_manager = tree.current_scene.get_node_or_null("SceneManager")
	if scene_manager and scene_manager.has_method("change_to_scene"):
		scene_manager.change_to_scene(scene_path)
	else:
		tree.change_scene_to_file(scene_path)

func _has_arrived(target_id: String, rocket_id: String) -> bool:
	if target_id == "" or rocket_id == "":
		return false
	var rm = RocketsManager
	if not rm:
		return false
	if rm.has_arrived(rocket_id, target_id):
		return true
	var missions: Array = rm.get_missions()
	if missions.is_empty():
		return false
	var now = float(TimeHelper.get_unix_epoch_seconds())
	for m in missions:
		if str(m.get("rocket_id", "")) != rocket_id:
			continue
		if str(m.get("target", "")) != target_id:
			continue
		var arrival_time = float(m.get("arrival_time", 0))
		var arrived = arrival_time > 0.0 and arrival_time <= now
		if arrived:
			rm.mark_arrived(rocket_id, target_id)
		return arrived
	return false

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
	var hash_util = HashUtils
	var seed = hash_util.simple_hash(target_id)
	var rng = RandomNumberGenerator.new()
	rng.seed = seed
	return rng.randf_range(MIN_DISTANCE_KM, MAX_DISTANCE_KM)

func _format_distance_km(distance_km: float) -> String:
	var rounded = int(round(distance_km))
	var fmt = NumberFormat
	return "%s km" % fmt.commas(str(rounded))

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
		var rm = RocketsManager
		var travel_seconds = 60.0
		if rm:
			travel_seconds = float(rm.get_mission_duration_seconds_for_rocket(str(rocket_id)))
		if launch_time > 0 and arrival_time <= launch_time:
			arrival_time = launch_time + travel_seconds
		if launch_time <= 0 or arrival_time <= launch_time:
			bar.value = 0
			continue
		var pct = clamp((now - launch_time) / max(arrival_time - launch_time, 1.0), 0.0, 1.0)
		bar.value = pct * 100.0
