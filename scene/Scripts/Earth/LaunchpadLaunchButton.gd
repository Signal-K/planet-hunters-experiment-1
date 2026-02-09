extends RefCounted
class_name LaunchpadLaunchButton

var _launchpad: Node
var _on_show_selector: Callable
var _launch_btn_connected: bool = false
var _launch_button: Button = null
const LAUNCH_SPRITESHEET = preload("res://assets/Vehicles/StarterRocket1LaunchSpritesheet.png")
const LAUNCH_COLUMNS := 6
const LAUNCH_ROWS := 6
const LAUNCH_COL_BOUNDS := [0, 170, 341, 512, 682, 853, 1024]
const LAUNCH_ROW_BOUNDS := [0, 256, 512, 768, 1024, 1280, 1536]
const LAUNCH_FRAME_COUNT := LAUNCH_COLUMNS * LAUNCH_ROWS
const TOTAL_LAUNCH_TIME := 7.0
const LAUNCH_ANIM_PORTION := 0.6
const COUNTDOWN_STEP_TIME := 0.6
const PREVIEW_SCENE_PATH := "res://Scenes/UI/AsteroidPreview/asteroid_preview.tscn"
const AUTO_PREVIEW_DELAY_SECONDS := 5.0
const ACTION_LAUNCH_ROCKET := "launch_rocket_from_earth"
const HINT_LAUNCH_ROCKET := "Your rocket is launching now, and the mission preview opens in a few seconds."

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
	var launch_hud = root.get_node_or_null("LaunchHUD")
	if launch_hud:
		var hud_child_names = []
		for _c in launch_hud.get_children():
			hud_child_names.append(_c.name)
		print("Launchpad: LaunchHUD found, children: ", hud_child_names)
	else:
		print("Launchpad: LaunchHUD not found in root")

	# Try to find LaunchButton under LaunchHUD first (be tolerant of instance renaming)
	var btn = null
	var launch_hud_node = root.get_node_or_null("LaunchHUD")
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
	var lb = _launchpad.get_tree().current_scene.get_node_or_null("UILayer/LaunchButton")
	if lb:
		var vs = _launchpad.get_viewport().get_visible_rect().size
		lb.position = vs - Vector2(180, 100)
		lb.visible = true
		lb.z_index = 1000
		lb.disabled = false
		print("Launchpad: showing standalone LaunchButton at", lb.position)

func hide_launch_button() -> void:
	var lb = _launchpad.get_tree().current_scene.get_node_or_null("UILayer/LaunchButton")
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
		print("Launchpad: No target selected — cannot launch. Open Satellite Station to choose a target.")
		if _launch_button:
			_launch_button.disabled = false
		return
	if _launch_button:
		_launch_button.disabled = true
	# Countdown before launch animation
	await _play_countdown()
	if rocket == null or not is_instance_valid(rocket):
		if _launch_button:
			_launch_button.disabled = false
		return
	# Record mission with launch time (epoch seconds) using TimeHelper
	var time_helper = preload("res://Scripts/Earth/TimeHelper.gd")
	var launch_time = time_helper.get_unix_epoch_seconds()
	var launch_target_id = target
	var preview_meta = _resolve_preview_target_meta(launch_target_id)

	var mission_ok = rm.add_mission(rocket.name, target, int(launch_time), 60)
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
	# Play launch animation before removing rocket
	await _play_launch_animation(rocket)
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
		_start_auto_preview_transition(launched_rocket_id, launch_target_id, preview_meta)

func _award_launch_experience() -> void:
	var root = _launchpad.get_tree().root
	var app_controller = root.find_child("AppController", true, false)
	if app_controller and app_controller.has_method("award_launch_experience"):
		app_controller.award_launch_experience()

func _play_launch_animation(rocket: Node2D) -> void:
	if rocket == null or not is_instance_valid(rocket):
		return
	var original_sprite: Sprite2D = rocket.get_node_or_null("Sprite2D")
	var sprite = original_sprite
	if sprite == null:
		sprite = Sprite2D.new()
		rocket.add_child(sprite)
	var original_scale = sprite.scale
	var original_position = sprite.position
	var original_offset = sprite.offset
	var base_size = Vector2.ZERO
	if sprite.texture:
		base_size = sprite.texture.get_size()
	sprite.texture = _make_launch_frame_texture(LAUNCH_FRAME_COUNT - 1)
	sprite.z_index = 10
	var frame_size = sprite.texture.get_size()
	if base_size != Vector2.ZERO and frame_size.x > 0 and frame_size.y > 0:
		var scale_factor = base_size.y / frame_size.y
		sprite.scale = Vector2(
			original_scale.x * scale_factor,
			original_scale.y * scale_factor
		)
	sprite.position = original_position
	sprite.offset = original_offset

	# Lift-off motion (constant speed to off-screen in TOTAL_LAUNCH_TIME)
	var margin = frame_size.y * sprite.scale.y * 0.6
	var target_y = -margin
	var move_tween = rocket.get_tree().create_tween()
	move_tween.tween_property(rocket, "position:y", target_y, TOTAL_LAUNCH_TIME).set_trans(Tween.TRANS_LINEAR)

	var anim_time = TOTAL_LAUNCH_TIME * LAUNCH_ANIM_PORTION
	var frame_time = anim_time / float(LAUNCH_FRAME_COUNT)
	for i in range(LAUNCH_FRAME_COUNT - 1, -1, -1):
		sprite.texture = _make_launch_frame_texture(i)
		await rocket.get_tree().create_timer(frame_time).timeout
	# Stick to the second-to-last frame (1-based: N-1)
	sprite.texture = _make_launch_frame_texture(max(LAUNCH_FRAME_COUNT - 2, 0))
	await move_tween.finished

func _make_launch_frame_texture(frame_index: int) -> AtlasTexture:
	var atlas := AtlasTexture.new()
	atlas.atlas = LAUNCH_SPRITESHEET
	atlas.region = _get_launch_frame_region(frame_index)
	return atlas

func _get_launch_frame_region(frame_index: int) -> Rect2i:
	var col := frame_index % LAUNCH_COLUMNS
	var row := int(frame_index / LAUNCH_COLUMNS)
	var x0: int = int(LAUNCH_COL_BOUNDS[col])
	var x1: int = int(LAUNCH_COL_BOUNDS[col + 1])
	var y0: int = int(LAUNCH_ROW_BOUNDS[row])
	var y1: int = int(LAUNCH_ROW_BOUNDS[row + 1])
	return Rect2i(x0, y0, x1 - x0, y1 - y0)


func _play_countdown() -> void:
	var root = _launchpad.get_tree().current_scene
	if root == null:
		return
	var label = root.get_node_or_null("LaunchHUD/CountdownLabel")
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
			break
	return out

func _start_auto_preview_transition(rocket_id: String, target_id: String, preview_meta: Dictionary) -> void:
	_transition_to_preview_after_delay(rocket_id, target_id, preview_meta)

func _transition_to_preview_after_delay(rocket_id: String, target_id: String, preview_meta: Dictionary) -> void:
	await _launchpad.get_tree().create_timer(AUTO_PREVIEW_DELAY_SECONDS).timeout
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
		scene_manager.change_to_scene(PREVIEW_SCENE_PATH)
	else:
		tree.change_scene_to_file(PREVIEW_SCENE_PATH)

func _show_tutorial_hint_once(action_key: String, message: String) -> void:
	var tree = _launchpad.get_tree()
	if tree == null:
		return
	var app = tree.root.find_child("AppController", true, false)
	if app and app.has_method("show_tutorial_hint_once"):
		app.show_tutorial_hint_once(action_key, message)
