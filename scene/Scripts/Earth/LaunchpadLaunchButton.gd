extends RefCounted
class_name LaunchpadLaunchButton

var _launchpad: Node
var _on_show_selector: Callable
var _launch_btn_connected: bool = false
var _launch_button: Button = null
const COUNTDOWN_STEP_TIME := 0.6
const OUTBOUND_TRANSIT_SCENE_PATH := "res://Scenes/Transitions/rocket_transit.tscn"
const ACTION_LAUNCH_ROCKET := "launch_rocket_from_earth"
const HINT_LAUNCH_ROCKET := "Your rocket is launching now."

func setup(launchpad: Node, on_show_selector: Callable) -> void:
	_launchpad = launchpad
	_on_show_selector = on_show_selector

func connect_launch_button() -> void:
	if _launch_btn_connected:
		return
	var root = _launchpad.get_tree().current_scene
	print("Launchpad: connect_launch_button called, root scene=" + root.name)
	var children_names = []
	for c in root.get_children():
		children_names.append(c.name)
	print("Launchpad: root scene children: ", children_names)

	# Check if LaunchHUD exists and what's inside it
	var launch_hud = _find_launch_hud(root)
	if launch_hud:
		var hud_child_names = []
		for _c in launch_hud.get_children():
			hud_child_names.append(_c.name)
		print("Launchpad: LaunchHUD found, children: ", hud_child_names)
	else:
		print("Launchpad: LaunchHUD not found in root")

	# Try to find LaunchButton under LaunchHUD first (be tolerant of instance renaming)
	var btn = null
	var launch_hud_node = _find_launch_hud(root)
	if launch_hud_node:
		for child_node in launch_hud_node.get_children():
			if child_node is Button or child_node.name.ends_with("LaunchButton"):
				btn = child_node
				break
		if btn:
			print("Launchpad: found LaunchButton under LaunchHUD (child name=", btn.name, ")")
		else:
			print("Launchpad: LaunchButton NOT found under LaunchHUD")
	# fallback locations
	if not btn:
		btn = root.get_node_or_null("UILayer/LaunchButton")
		if btn:
			print("Launchpad: found LaunchButton at UILayer/LaunchButton")
		else:
			btn = root.get_node_or_null("UILayer/SelectorPanel/VBox/LaunchButton")
			if btn:
				print("Launchpad: found LaunchButton at UILayer/SelectorPanel/VBox/LaunchButton")
	if not btn:
		print("Launchpad: LaunchButton not found when attempting to connect")
		return
	# Always connect the pressed signal to ensure handler is wired (avoid fragile is_connected checks)
	btn.pressed.connect(Callable(self, "_on_launch_button_pressed"))
	_launch_button = btn
	_launch_button.disabled = false
	_launch_btn_connected = true
	# set visibility based on rocket presence
	var nodes = _launchpad.get_tree().get_nodes_in_group("rocket")
	if nodes.size() > 0:
		var vs = _launchpad.get_viewport().get_visible_rect().size
		btn.position = vs - Vector2(180, 100)
		btn.visible = true
		btn.z_index = 1000
	else:
		btn.visible = false
	print("Launchpad: connected LaunchButton pressed signal (node=", btn.get_path(), ")")

	# Debug: Final count of what's actually in scene
	var all_rockets = _launchpad.get_tree().get_nodes_in_group("rocket")
	print("Launchpad: FINAL rocket count in scene: %d total rockets in 'rocket' group" % all_rockets.size())
	for r in all_rockets:
		print("  - Rocket node: %s at position %s" % [r.name, r.global_position])

func show_standalone_launch_button() -> void:
	var lb = _resolve_launch_button()
	if lb:
		var vs = _launchpad.get_viewport().get_visible_rect().size
		lb.position = vs - Vector2(180, 100)
		lb.visible = true
		lb.z_index = 1000
		lb.disabled = false
		print("Launchpad: showing standalone LaunchButton at", lb.position)

func hide_launch_button() -> void:
	var lb = _resolve_launch_button()
	if lb:
		lb.visible = false

func _on_launch_button_pressed() -> void:
	print("Launchpad: Launch button pressed")
	var nodes = _launchpad.get_tree().get_nodes_in_group("rocket")
	if nodes.size() == 0:
		print("Launchpad: no rockets to launch")
		return
	var rocket = nodes[0]
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if not rm:
		print("Launchpad: RocketsManager not available")
		return
	# Require a selected target before launching
	var target = rm.get_selected_target()
	if target == "":
		print("Launchpad: No target selected — cannot launch. Open Scanner Station to choose a target.")
		if _launch_button:
			_launch_button.disabled = false
		return
	var preview_meta = _resolve_preview_target_meta(target)
	var rocket_level = int(rm.get_rocket_level(rocket.name))
	var target_profile = rm.build_target_profile(target, str(preview_meta.get("type", "asteroid")))
	var required_level = int(target_profile.get("required_level", 1))
	if required_level > rocket_level:
		print("Launchpad: target %s blocked for rocket %s (requires L%d, current L%d)" % [target, rocket.name, required_level, rocket_level])
		if _launch_button:
			_launch_button.disabled = false
		return
	if _launch_button:
		_launch_button.disabled = true
	# Countdown before routing to outbound transit
	await _play_countdown()
	if rocket == null or not is_instance_valid(rocket):
		if _launch_button:
			_launch_button.disabled = false
		return
	# Record mission with launch time (epoch seconds) using TimeHelper
	var time_helper = preload("res://Scripts/Earth/TimeHelper.gd")
	var launch_time = time_helper.get_unix_epoch_seconds()
	var launch_target_id = target
	var mission_travel_seconds = rm.get_mission_duration_seconds_for_rocket(rocket.name)

	var mission_ok = rm.add_mission(rocket.name, target, int(launch_time), mission_travel_seconds)
	if not mission_ok:
		print("Launchpad: failed to record mission for rocket", rocket.name)
	# Mark rocket as launched (preserves existing launched list behavior)
	var set_ok = rm.set_launched(rocket.name)
	if set_ok:
		print("Launchpad: marked rocket %s as launched" % rocket.name)
		_award_launch_experience()
		_show_tutorial_hint_once(ACTION_LAUNCH_ROCKET, HINT_LAUNCH_ROCKET)
	else:
		print("Launchpad: failed to mark rocket as launched")
	var launched_rocket_id = rocket.name
	# Clear selected target after launch
	rm.clear_selected_target()
	# Remove the rocket from the scene after launching
	if is_instance_valid(rocket):
		rocket.queue_free()
	# hide launch button and show selector so player can choose a new rocket
	hide_launch_button()
	if _on_show_selector.is_valid():
		_on_show_selector.call()
	if set_ok:
		_transition_to_outbound_transit(launched_rocket_id, launch_target_id, preview_meta)

func _award_launch_experience() -> void:
	var root = _launchpad.get_tree().root
	var app_controller = root.find_child("AppController", true, false)
	if app_controller and app_controller.has_method("award_launch_experience"):
		app_controller.award_launch_experience()

func _play_countdown() -> void:
	var root = _launchpad.get_tree().current_scene
	if root == null:
		return
	var launch_hud = _find_launch_hud(root)
	var label = launch_hud.get_node_or_null("CountdownLabel") if launch_hud else null
	if label == null:
		return
	label.visible = true
	label.modulate = Color(1, 1, 1, 0)
	label.scale = Vector2(0.6, 0.6)
	for i in range(3, 0, -1):
		label.text = str(i)
		label.modulate = Color(1, 1, 1, 0)
		label.scale = Vector2(0.6, 0.6)
		var tween = label.get_tree().create_tween()
		tween.tween_property(label, "modulate:a", 1.0, COUNTDOWN_STEP_TIME * 0.35).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)
		tween.parallel().tween_property(label, "scale", Vector2(1.25, 1.25), COUNTDOWN_STEP_TIME * 0.7).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)
		tween.tween_property(label, "modulate:a", 0.0, COUNTDOWN_STEP_TIME * 0.35).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN)
		await tween.finished
	label.visible = false

func _resolve_preview_target_meta(target_id: String) -> Dictionary:
	var out := {
		"label": "Asteroid %s" % target_id,
		"type": "asteroid"
	}
	if target_id == "":
		return out
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if not rm:
		return out
	var detected_targets = rm.get_detected_targets()
	for target in detected_targets:
		if str(target.get("id", "")) == target_id:
			out["label"] = str(target.get("label", out["label"]))
			out["type"] = str(target.get("type", out["type"]))
			return out
	var predefined = rm.get_predefined_target_profile(target_id)
	if not predefined.is_empty():
		for stage in [1, 2, 4, 5]:
			var item = rm.get_predefined_mission_target(stage)
			if str(item.get("id", "")) == target_id:
				out["label"] = str(item.get("label", out["label"]))
				out["type"] = str(item.get("type", out["type"]))
				return out
	return out

func _transition_to_outbound_transit(rocket_id: String, target_id: String, preview_meta: Dictionary) -> void:
	if target_id == "" or rocket_id == "":
		return
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if not rm:
		return
	rm.set_preview_target(
		target_id,
		str(preview_meta.get("label", "Asteroid %s" % target_id)),
		str(preview_meta.get("type", "asteroid")),
		rocket_id
	)
	var tree = _launchpad.get_tree()
	if tree == null:
		return
	var scene_manager = tree.get_first_node_in_group("scene_manager")
	if scene_manager and scene_manager.has_method("change_to_scene"):
		scene_manager.change_to_scene(OUTBOUND_TRANSIT_SCENE_PATH)
	else:
		tree.change_scene_to_file(OUTBOUND_TRANSIT_SCENE_PATH)

func _show_tutorial_hint_once(action_key: String, message: String) -> void:
	preload("res://Scripts/Utils/AppControllerHelper.gd").show_tutorial_hint_once(action_key, message)

func _resolve_launch_button() -> Button:
	if _launch_button and is_instance_valid(_launch_button):
		return _launch_button
	var root = _launchpad.get_tree().current_scene
	if root == null:
		return null
	var launch_hud = _find_launch_hud(root)
	if launch_hud:
		for child_node in launch_hud.get_children():
			if child_node is Button or child_node.name.ends_with("LaunchButton"):
				return child_node
	return null

func _find_launch_hud(root: Node) -> Node:
	if root == null:
		return null
	var exact = root.get_node_or_null("LaunchHUD")
	if exact and _hud_has_launch_controls(exact):
		return exact
	for child in root.get_children():
		if str(child.name).begins_with("LaunchHUD") and _hud_has_launch_controls(child):
			return child
	return null

func _hud_has_launch_controls(node: Node) -> bool:
	if node == null:
		return false
	for child_node in node.get_children():
		if child_node is Button or str(child_node.name).ends_with("LaunchButton"):
			return true
	return false
