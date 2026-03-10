extends RefCounted
class_name LaunchpadLaunchButton

const AppLogger = preload("res://Scripts/Utils/Logger.gd")
const GameplayAnalytics = preload("res://Scripts/Systems/GameplayAnalytics.gd")
const RocketsManager = preload("res://Scripts/Utils/RocketsManager.gd")
const AppControllerHelper = preload("res://Scripts/Utils/AppControllerHelper.gd")
const TimeHelper = preload("res://Scripts/Earth/TimeHelper.gd")
const RoomCatalog = preload("res://Scripts/Utils/RoomCatalog.gd")
var _launchpad: Node
var _on_show_selector: Callable
var _launch_btn_connected: bool = false
var _launch_button: Button = null
var _connect_attempts: int = 0
const MAX_CONNECT_ATTEMPTS := 8
const COUNTDOWN_STEP_TIME := 0.6
const OUTBOUND_TRANSIT_SCENE_PATH := "res://Scenes/Transitions/rocket_ascent.tscn"

func setup(launchpad: Node, on_show_selector: Callable) -> void:
	_launchpad = launchpad
	_on_show_selector = on_show_selector

func connect_launch_button() -> void:
	if _launch_btn_connected:
		return
	var root = _launchpad.get_tree().current_scene
	AppLogger.d("Launchpad: connect_launch_button called, root scene=%s" % root.name)
	var children_names = []
	for c in root.get_children():
		children_names.append(c.name)
	AppLogger.d("Launchpad: root scene children: %s" % [children_names])

	# Check if LaunchHUD exists and what's inside it
	var launch_hud = _find_launch_hud(root)
	if launch_hud:
		var hud_child_names = []
		for _c in launch_hud.get_children():
			hud_child_names.append(_c.name)
		AppLogger.d("Launchpad: LaunchHUD found, children: %s" % [hud_child_names])
	else:
		AppLogger.d("Launchpad: LaunchHUD not found in root")

	# Try to find LaunchButton under LaunchHUD first (be tolerant of instance renaming)
	var btn = null
	var launch_hud_node = _find_launch_hud(root)
	if launch_hud_node:
		for child_node in launch_hud_node.get_children():
			if child_node is Button or child_node.name.ends_with("LaunchButton"):
				btn = child_node
				break
		if btn:
			AppLogger.d("Launchpad: found LaunchButton under LaunchHUD (child name=%s)" % btn.name)
		else:
			AppLogger.d("Launchpad: LaunchButton NOT found under LaunchHUD")
	# fallback locations
	if not btn:
		btn = root.get_node_or_null("UILayer/LaunchButton")
		if btn:
			AppLogger.d("Launchpad: found LaunchButton at UILayer/LaunchButton")
		else:
			btn = root.get_node_or_null("UILayer/SelectorPanel/VBox/LaunchButton")
			if btn:
				AppLogger.d("Launchpad: found LaunchButton at UILayer/SelectorPanel/VBox/LaunchButton")
	if not btn:
		_connect_attempts += 1
		if _connect_attempts < MAX_CONNECT_ATTEMPTS:
			# LaunchHUD may be instanced a few frames later; retry before warning.
			_launchpad.call_deferred("connect_launch_button")
		else:
			AppLogger.w("Launchpad: LaunchButton not found when attempting to connect")
		return
	_connect_attempts = 0
	# Always connect the pressed signal to ensure handler is wired (avoid fragile is_connected checks)
	btn.pressed.connect(Callable(self, "_on_launch_button_pressed"))
	_launch_button = btn
	_launch_button.disabled = false
	_launch_btn_connected = true
	# set visibility based on rocket presence
	var nodes = _launchpad.get_tree().get_nodes_in_group("rocket")
	if nodes.size() > 0:
		btn.position = _resolve_safe_launch_button_position(btn)
		btn.visible = true
		btn.z_index = 1000
	else:
		btn.visible = false
	AppLogger.d("Launchpad: connected LaunchButton pressed signal (node=%s)" % btn.get_path())

	# Debug: Final count of what's actually in scene
	var all_rockets = _launchpad.get_tree().get_nodes_in_group("rocket")
	AppLogger.d("Launchpad: FINAL rocket count in scene: %d total rockets in 'rocket' group" % all_rockets.size())
	for r in all_rockets:
		AppLogger.d("  - Rocket node: %s at position %s" % [r.name, r.global_position])

func show_standalone_launch_button() -> void:
	var lb = _resolve_launch_button()
	if lb:
		lb.position = _resolve_safe_launch_button_position(lb)
		lb.visible = true
		lb.z_index = 1000
		lb.disabled = false
		AppLogger.d("Launchpad: showing standalone LaunchButton at %s" % [lb.position])

func hide_launch_button() -> void:
	var lb = _resolve_launch_button()
	if lb:
		lb.visible = false

func _resolve_safe_launch_button_position(btn: Button) -> Vector2:
	var viewport_size = _launchpad.get_viewport().get_visible_rect().size
	var pos = viewport_size - Vector2(180, 100)
	var scene = _launchpad.get_tree().current_scene
	if scene:
		var selector_panel = scene.get_node_or_null("UILayer/SelectorPanel")
		if selector_panel and selector_panel is Control and selector_panel.visible:
			var selector_rect = (selector_panel as Control).get_global_rect()
			pos.x = max(pos.x, selector_rect.end.x + 24.0)
	pos.x = clamp(pos.x, 24.0, max(viewport_size.x - btn.size.x - 24.0, 24.0))
	pos.y = clamp(pos.y, 24.0, max(viewport_size.y - btn.size.y - 24.0, 24.0))
	return pos

func _on_launch_button_pressed() -> void:
	AppLogger.d("Launchpad: Launch button pressed")
	var nodes = _launchpad.get_tree().get_nodes_in_group("rocket")
	if nodes.size() == 0:
		AppLogger.w("Launchpad: no rockets to launch")
		RocketsManager.set_launch_guidance_notice("Launch blocked: create or drag a rocket onto the launchpad first.")
		return
	var rocket = nodes[0]
	var rm = RocketsManager
	if not rm:
		AppLogger.w("Launchpad: RocketsManager not available")
		return
	if rm.get_mission5_selected_contractor().is_empty():
		AppLogger.w("Launchpad: contractor must be selected before launch")
		RocketsManager.set_launch_guidance_notice("Launch blocked: select a contractor for this trip, then choose a mission target.")
		if _on_show_selector.is_valid():
			_on_show_selector.call()
		if _launchpad and _launchpad.has_method("_populate_targets"):
			_launchpad._populate_targets()
		if _launch_button:
			_launch_button.disabled = false
		return
	# Require a selected target before launching
	var resolved = rm.ensure_selected_target_for_launch(rocket.name)
	if not bool(resolved.get("ok", false)):
		AppLogger.w("Launchpad: No playable target available for launch (%s)" % str(resolved.get("reason", "unknown reason")))
		RocketsManager.set_launch_guidance_notice("Launch blocked: no valid target is currently selectable. Open Scanner Station and pick a reachable target.")
		if _on_show_selector.is_valid():
			_on_show_selector.call()
		if _launchpad and _launchpad.has_method("_populate_targets"):
			_launchpad._populate_targets()
		if _launch_button:
			_launch_button.disabled = false
		return
	var target = str(resolved.get("target_id", ""))
	if target == "":
		AppLogger.w("Launchpad: target resolution returned empty target id")
		RocketsManager.set_launch_guidance_notice("Launch blocked: mission target could not be resolved. Re-open target selection and try again.")
		if _launch_button:
			_launch_button.disabled = false
		return
	var preview_meta = _resolve_preview_target_meta(target)
	if bool(resolved.get("fallback_used", false)):
		preview_meta["label"] = str(resolved.get("target_label", preview_meta.get("label", target)))
		preview_meta["type"] = str(resolved.get("target_type", preview_meta.get("type", "asteroid")))
		# Auto-selection counts as completing the "select a target" tutorial step so
		# the overlay doesn't stay stuck on "Select Target" while the rocket is in flight.
		AppControllerHelper.record_tutorial_action("select_launch_target", {
			"target_id": target,
			"auto_selected": true
		})
	var rocket_level = int(rm.get_rocket_level(rocket.name))
	var target_profile = rm.build_target_profile(target, str(preview_meta.get("type", "asteroid")))
	var required_level = int(target_profile.get("required_level", 1))
	if required_level > rocket_level:
		AppLogger.w("Launchpad: target %s blocked for rocket %s (requires L%d, current L%d)" % [target, rocket.name, required_level, rocket_level])
		RocketsManager.set_launch_guidance_notice("Launch blocked: selected target requires rocket level L%d. Current rocket is L%d." % [required_level, rocket_level])
		if _launch_button:
			_launch_button.disabled = false
		return
	# Room config warning (non-blocking): warn if no mining room installed
	var layout = RoomCatalog.create_layout_for_rocket_type(rocket.name)
	var installed_rooms = RoomCatalog.get_installed_rooms(layout)
	var has_mining_room := false
	for room_inst in installed_rooms:
		var room_def = RoomCatalog.get_room(str(room_inst.get("room_id", "")))
		if str(room_def.get("category", "")) == "mining":
			has_mining_room = true
			break
	if not has_mining_room:
		AppLogger.w("Launchpad: rocket has no mining room — cargo collection may be impaired")
		RocketsManager.set_launch_guidance_notice("⚠ No mining room installed. You can still launch, but mineral collection will be very limited.")
	if _launch_button:
		_launch_button.disabled = true
	# Countdown before routing to outbound transit
	await _play_countdown()
	if rocket == null or not is_instance_valid(rocket):
		if _launch_button:
			_launch_button.disabled = false
		return
	# Record mission with launch time (epoch seconds) using TimeHelper
	var time_helper = TimeHelper
	var launch_time = time_helper.get_unix_epoch_seconds()
	var launch_target_id = target
	var mission_travel_seconds = rm.get_mission_duration_seconds_for_rocket(rocket.name)

	var mission_ok = rm.add_mission(rocket.name, target, int(launch_time), mission_travel_seconds)
	if not mission_ok:
		AppLogger.w("Launchpad: failed to record mission for rocket %s" % rocket.name)
		RocketsManager.set_launch_guidance_notice("Launch blocked: mission record failed to save. Retry launch in a moment.")
	# Mark rocket as launched (preserves existing launched list behavior)
	var set_ok = rm.set_launched(rocket.name)
	if set_ok:
		AppLogger.d("Launchpad: marked rocket %s as launched" % rocket.name)
		GameplayAnalytics.emit_launch_started(
			rocket.name,
			launch_target_id,
			str(preview_meta.get("type", "asteroid")),
			{
				"target_label": str(preview_meta.get("label", launch_target_id)),
				"operation_mode": str(rm.get_operation_mode())
			}
		)
		_award_launch_experience()
		AppControllerHelper.record_tutorial_action("launch_rocket_from_earth", {
			"rocket_id": rocket.name,
			"target_id": launch_target_id
		})
	else:
		AppLogger.w("Launchpad: failed to mark rocket as launched")
		RocketsManager.set_launch_guidance_notice("Launch blocked: rocket launch state did not finalize. Re-open Launchpad and try again.")
	var launched_rocket_id = rocket.name
	# Clear selected target after launch
	rm.clear_selected_target()
	if int(rm.get_mission_stage()) >= 3 and not rm.is_free_operations_unlocked():
		# Force a fresh scanner pass for scanner-gated mission flows.
		rm.set_detected_targets([])
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
	var rm = RocketsManager
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
		for stage in [1, 2, 4]:
			var item = rm.get_predefined_mission_target(stage)
			if str(item.get("id", "")) == target_id:
				out["label"] = str(item.get("label", out["label"]))
				out["type"] = str(item.get("type", out["type"]))
				return out
	return out

func _transition_to_outbound_transit(rocket_id: String, target_id: String, preview_meta: Dictionary) -> void:
	if target_id == "" or rocket_id == "":
		return
	var rm = RocketsManager
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
