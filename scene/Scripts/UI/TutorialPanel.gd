extends CanvasLayer

const STEPS := [
	{
		"action": "create_rocket",
		"title": "Build your first rocket",
		"instruction": "Open Launchpad and create a rocket.",
		"context": "Mission 1 uses a predefined target."
	},
	{
		"action": "launch_rocket_from_earth",
		"title": "Launch mission",
		"instruction": "Press Launch to start Mission 1.",
		"context": "Send your rocket to the assigned target."
	},
	{
		"action": "mine_target",
		"title": "Mine resources",
		"instruction": "At the target preview, press Mine.",
		"context": "Collect cargo."
	},
	{
		"action": "return_rocket_home",
		"title": "Return to Earth",
		"instruction": "Press Return Home with cargo.",
		"context": "Bring cargo back."
	},
	{
		"action": "resolve_mission_debrief",
		"title": "Complete debrief",
		"instruction": "In debrief, choose one outcome to finish the mission.",
		"context": "Progress to the next mission."
	},
	{
		"action": "build_scanner_station",
		"title": "Build Scanner Station",
		"instruction": "Mission 3 unlocks Scanner Station. Build it for 2.0B F.",
		"context": "Scanning unlocks after construction."
	},
	{
		"action": "scan_targets",
		"title": "Run your first scan",
		"instruction": "Open Scanner Station and run a scan.",
		"context": "Reveal new mission targets."
	},
	{
		"action": "select_launch_target",
		"title": "Choose scanned target",
		"instruction": "Select one scanned target.",
		"context": "Set your next mission destination."
	}
]

@onready var panel: PanelContainer = $CoachPanel
@onready var progress_label: Label = $CoachPanel/Margin/Root/TopRow/Progress
@onready var instruction_label: Label = $CoachPanel/Margin/Root/Instruction
@onready var skip_button: Button = $CoachPanel/Margin/Root/TopRow/SkipButton

var app_controller: Node = null
var _focus_target: CanvasItem = null
var _focus_tween: Tween = null
var _focus_base_modulate: Color = Color(1, 1, 1, 1)
var _pointer_label: Label = null

func _ready() -> void:
	visible = true
	if skip_button:
		skip_button.pressed.connect(_on_skip_pressed)
	_pointer_label = Label.new()
	# Use ASCII fallback so web exports don't show missing-glyph boxes.
	_pointer_label.text = "v"
	_pointer_label.visible = false
	_pointer_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_pointer_label.add_theme_font_size_override("font_size", 28)
	_pointer_label.add_theme_color_override("font_color", Color(0.98, 0.82, 0.35, 1))
	_pointer_label.modulate = Color(0.98, 0.82, 0.35, 1)
	add_child(_pointer_label)
	_find_app_controller()
	_connect_app_controller_signals()
	_apply_responsive_layout()
	_refresh_ui()

func _process(_delta: float) -> void:
	if app_controller == null:
		_find_app_controller()
		_connect_app_controller_signals()
	_apply_responsive_layout()
	_refresh_ui()
	_update_focus_marker()

func _find_app_controller() -> void:
	if get_tree().root.has_node("AppController"):
		app_controller = get_node("/root/AppController")
	else:
		app_controller = get_tree().root.find_child("AppController", true, false)

func _connect_app_controller_signals() -> void:
	if app_controller == null:
		return
	if app_controller.has_signal("tutorial_completed_updated"):
		var complete_cb = Callable(self, "_on_tutorial_completed_updated")
		if not app_controller.tutorial_completed_updated.is_connected(complete_cb):
			app_controller.tutorial_completed_updated.connect(complete_cb)
	if app_controller.has_signal("tutorial_progress_updated"):
		var progress_cb = Callable(self, "_on_tutorial_progress_updated")
		if not app_controller.tutorial_progress_updated.is_connected(progress_cb):
			app_controller.tutorial_progress_updated.connect(progress_cb)
	if app_controller.has_signal("experience_updated"):
		var xp_cb = Callable(self, "_on_experience_updated")
		if not app_controller.experience_updated.is_connected(xp_cb):
			app_controller.experience_updated.connect(xp_cb)

func _is_tutorial_completed() -> bool:
	if app_controller and app_controller.has_method("get_tutorial_completed"):
		return bool(app_controller.get_tutorial_completed())
	var cfg = ConfigFile.new()
	if cfg.load("user://tutorial.cfg") == OK and cfg.has_section_key("tutorial", "completed"):
		return bool(cfg.get_value("tutorial", "completed"))
	return false

func _get_progress() -> Dictionary:
	var fallback := {
		"current_step": 0,
		"total_steps": STEPS.size(),
		"is_completed": _is_tutorial_completed()
	}
	if app_controller and app_controller.has_method("get_tutorial_progress"):
		var value = app_controller.get_tutorial_progress()
		if typeof(value) == TYPE_DICTIONARY:
			return value
	return fallback

func _refresh_ui() -> void:
	if _is_tutorial_completed():
		_clear_focus_target()
		visible = false
		return
	if _should_hide_for_current_scene():
		_clear_focus_target()
		visible = false
		return
	visible = true
	var progress = _get_progress()
	var current_step = int(progress.get("current_step", 0))
	var total_steps = max(int(progress.get("total_steps", STEPS.size())), 1)
	var active_index = clamp(current_step, 0, STEPS.size() - 1)
	var step = STEPS[active_index]

	if progress_label:
		progress_label.text = "Step %d/%d" % [active_index + 1, total_steps]
	if instruction_label:
		instruction_label.text = _instruction_for_scene(active_index, str(step.get("instruction", "")))
	_set_focus_target(_resolve_focus_target(active_index))

func _instruction_for_scene(step_index: int, fallback: String) -> String:
	var scene_name = _current_scene_name()
	match step_index:
		0:
			if scene_name == "LaunchpadScene":
				return "Tap Create on a rocket card."
			if scene_name == "EarthBase1":
				return "Open New Mission to reach Launchpad and create a rocket."
		1:
			if scene_name == "LaunchpadScene":
				return "Press Launch to start Mission 1."
		2:
			if scene_name == "AsteroidPreview":
				return "Press Mine to collect minerals."
			return "Open target preview and mine once."
		3:
			if scene_name == "AsteroidPreview":
				return "Press Return Home to send cargo back."
			return "Return to target preview and press Return Home."
		4:
			if scene_name == "MissionDebrief":
				return "Pick one: Sell Orbit, Sell Earth, Salvage, Scrap, Keep, or Leave."
			return "Open mission debrief and complete one payout action."
		5:
			if scene_name == "EarthBase1":
				return "Mission 3 is unlocked. Open Scanner Station and build it for 2.0B F."
			return "Return to Earth Base and build Scanner Station."
		6:
			if scene_name == "EarthBase1":
				return "Open Scanner Station and run a scan."
			return "Return to Earth Base to run your first scan."
		7:
			if scene_name == "EarthBase1":
				return "Pick one scanned target to set your next mission."
			if scene_name == "LaunchpadScene":
				return "Select target is now scanner-driven. Return to Scanner Station."
	return fallback

func _apply_responsive_layout() -> void:
	if panel == null:
		return
	var width = get_viewport().get_visible_rect().size.x
	var card_width = clamp(width * 0.72, 320.0, 760.0)
	panel.offset_left = -card_width * 0.5
	panel.offset_right = card_width * 0.5
	panel.offset_bottom = panel.offset_top + (112.0 if width < 900.0 else 124.0)
	var compact = width < 900.0
	if instruction_label:
		instruction_label.add_theme_font_size_override("font_size", 16 if compact else 18)
	if progress_label:
		progress_label.add_theme_font_size_override("font_size", 14 if compact else 15)
	if skip_button:
		skip_button.add_theme_font_size_override("font_size", 14 if compact else 15)

func _current_scene_name() -> String:
	var scene = get_tree().current_scene
	if scene == null:
		return ""
	return str(scene.name)

func _current_scene_path() -> String:
	var scene = get_tree().current_scene
	if scene == null:
		return ""
	return str(scene.scene_file_path)

func _should_hide_for_current_scene() -> bool:
	var scene = get_tree().current_scene
	if scene == null:
		return false
	if scene.has_method("should_hide_tutorial_panel"):
		return bool(scene.call("should_hide_tutorial_panel"))
	var travel_panel = scene.get_node_or_null("CanvasLayer/UI/TravelPanel")
	if travel_panel == null:
		travel_panel = scene.get_node_or_null("UI/TravelPanel")
	if travel_panel is CanvasItem and travel_panel.visible:
		return true
	return false

func _resolve_focus_target(step_index: int) -> CanvasItem:
	var scene = get_tree().current_scene
	if scene == null:
		return null
	var scene_name = _current_scene_name()
	match step_index:
		0:
			if scene_name == "LaunchpadScene":
				return _find_button_by_text(scene, "Create")
		1:
			if scene_name == "LaunchpadScene":
				var launch_hud = scene.get_node_or_null("LaunchHUD")
				if launch_hud:
					for child in launch_hud.get_children():
						if child is Button:
							return child
				return _find_button_by_text(scene, "Launch")
		2:
			if scene_name == "AsteroidPreview":
				return scene.get_node_or_null("CanvasLayer/UI/ControlPanel/ControlPanelMargin/ControlPanelButtons/MineButton")
		3:
			if scene_name == "AsteroidPreview":
				return scene.get_node_or_null("CanvasLayer/UI/ControlPanel/ControlPanelMargin/ControlPanelButtons/ReturnHomeButton")
		4:
			if scene_name == "MissionDebrief":
				var candidates = [
					"UI/Root/Panel/VBox/Actions/SellRow/SellOrbitButton",
					"UI/Root/Panel/VBox/Actions/SellRow/SellEarthButton",
					"UI/Root/Panel/VBox/Actions/ShipRow/SalvageButton",
					"UI/Root/Panel/VBox/Actions/ShipRow/ScrapButton",
					"UI/Root/Panel/VBox/Actions/KeepButton",
					"UI/Root/Panel/VBox/Actions/ShipRow/LeaveButton"
				]
				for path in candidates:
					var node = scene.get_node_or_null(path)
					if node is Button and not node.disabled:
						return node
		5:
			if scene_name == "EarthBase1":
				return scene.get_node_or_null("StructuresLayer/SatelliteStation/Sprite2D")
		6:
			if scene_name == "EarthBase1":
				return scene.get_node_or_null("StructuresLayer/SatelliteStation/Sprite2D")
		7:
			if scene_name == "EarthBase1":
				return _find_button_by_text(get_tree().root, "Select")
	return null

func _find_button_by_text(root: Node, expected_text: String) -> Button:
	if root == null:
		return null
	var stack := [root]
	while not stack.is_empty():
		var node = stack.pop_back()
		for child in node.get_children():
			if child is Button:
				var text = str(child.text).to_lower()
				if text.begins_with(expected_text.to_lower()):
					return child
			stack.append(child)
	return null

func _set_focus_target(new_target: CanvasItem) -> void:
	if _focus_target == new_target:
		return
	_clear_focus_target()
	if new_target == null:
		return
	_focus_target = new_target
	_focus_base_modulate = _focus_target.modulate
	_focus_tween = create_tween().set_loops()
	_focus_tween.tween_property(_focus_target, "modulate", Color(1, 0.9, 0.45, 1), 0.45)
	_focus_tween.tween_property(_focus_target, "modulate", _focus_base_modulate, 0.45)
	if _pointer_label:
		_pointer_label.visible = true
	_update_focus_marker()

func _update_focus_marker() -> void:
	if _pointer_label == null:
		return
	if _focus_target == null or not is_instance_valid(_focus_target):
		_pointer_label.visible = false
		return
	var point := Vector2.ZERO
	if _focus_target is Control:
		var control := _focus_target as Control
		var rect = control.get_global_rect()
		point = rect.position + Vector2(rect.size.x * 0.5, -14)
	elif _focus_target is Node2D:
		var node2d := _focus_target as Node2D
		point = node2d.get_global_transform_with_canvas().origin + Vector2(0, -70)
	else:
		_pointer_label.visible = false
		return
	_pointer_label.position = point - Vector2(_pointer_label.size.x * 0.5, 0)
	_pointer_label.visible = true

func _clear_focus_target() -> void:
	if _focus_tween:
		_focus_tween.kill()
		_focus_tween = null
	if _focus_target and is_instance_valid(_focus_target):
		_focus_target.modulate = _focus_base_modulate
	_focus_target = null
	if _pointer_label:
		_pointer_label.visible = false

func _on_skip_pressed() -> void:
	if app_controller and app_controller.has_method("set_tutorial_completed_from_react"):
		app_controller.set_tutorial_completed_from_react(true)
	_refresh_ui()

func _on_tutorial_completed_updated(_is_completed: bool) -> void:
	_refresh_ui()

func _on_tutorial_progress_updated(_current_step: int, _total_steps: int, _action_key: String) -> void:
	_refresh_ui()

func _on_experience_updated(_xp: int, _level: int) -> void:
	_refresh_ui()
