extends CanvasLayer

const PanelStyle = preload("res://Scripts/UI/PanelStyle.gd")
const TutorialLayoutZone = preload("res://Scripts/UI/TutorialLayoutZone.gd")
const TutorialCoachTargeting = preload("res://Scripts/UI/TutorialCoachTargeting.gd")

const TRANSIT_SCENE_BASENAMES := ["rocket_ascent", "rocket_transit", "rocket_return"]
const DEBRIEF_SCENE_BASENAMES := ["mission_debrief_v2"]
const PreviewRouting = preload("res://Scripts/UI/NewMissionPreviewRouting.gd")
const LAYOUT_REFRESH_INTERVAL := 0.15
const CYAN := Color(0.28, 0.88, 0.96, 1.0)
const AMBER := Color(0.941, 0.690, 0.188, 1.0)
const POINTER_ARROW_SIZE := 24.0
const POINTER_TARGET_MARGIN := 12.0
const POINTER_MAX_LENGTH := 170.0
const POINTER_MIN_LENGTH := 84.0

@onready var panel: PanelContainer = $Root/Panel
@onready var title_label: Label = $Root/Panel/Margin/VBox/Header/TitleLabel
@onready var stage_label: Label = $Root/Panel/Margin/VBox/Header/StageLabel
@onready var collapse_button: Button = $Root/Panel/Margin/VBox/Header/CollapseButton
@onready var message_label: Label = $Root/Panel/Margin/VBox/MessageLabel
@onready var action_label: Label = $Root/Panel/Margin/VBox/ActionLabel
@onready var progress_label: Label = $Root/Panel/Margin/VBox/ProgressLabel
@onready var skip_button: Button = $Root/Panel/Margin/VBox/Buttons/SkipButton
@onready var practice_mining_button: Button = $Root/Panel/Margin/VBox/Buttons/PracticeMiningButton
@onready var replay_mission_button: Button = $Root/Panel/Margin/VBox/Buttons/ReplayMissionButton
@onready var replay_all_button: Button = $Root/Panel/Margin/VBox/Buttons/ReplayAllButton
@onready var open_launchpad_button: Button = $Root/Panel/Margin/VBox/Buttons/OpenLaunchpadButton
@onready var go_to_debrief_button: Button = $Root/Panel/Margin/VBox/Buttons/GoToDebriefButton
@onready var resume_mission_button: Button = $Root/Panel/Margin/VBox/Buttons/ResumeMissionButton
@onready var buttons_row: HBoxContainer = $Root/Panel/Margin/VBox/Buttons

var _collapsed := false
var _app_controller: Node = null
var _layout_elapsed := 0.0
var _current_state: Dictionary = {}
var _current_step: Dictionary = {}
var _transit_suppressed := false
var _off_course := false
var _pointer_line: Line2D = null
var _pointer_head: Polygon2D = null
var _target_highlight: ReferenceRect = null
var _highlight_tween: Tween = null

func _ready() -> void:
	layer = 70
	$Root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	$Root.set_meta("tutorial_zone_exempt", true)
	panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	panel.set_meta("tutorial_zone_exempt", true)
	_apply_style()
	_configure_mouse_passthrough()
	_setup_context_action_button()
	_setup_pointer_indicator()
	_app_controller = preload("res://Scripts/Utils/AppControllerHelper.gd").get_instance()
	if _app_controller and _app_controller.has_signal("tutorial_state_updated"):
		_app_controller.tutorial_state_updated.connect(_on_tutorial_state_updated)
	collapse_button.pressed.connect(_on_collapse_pressed)
	skip_button.hide()
	practice_mining_button.pressed.connect(_on_practice_mining_pressed)
	replay_mission_button.pressed.connect(_on_replay_mission_pressed)
	replay_all_button.pressed.connect(_on_replay_all_pressed)
	set_process(true)
	_refresh()

func _setup_context_action_button() -> void:
	if buttons_row == null:
		return
	for btn in [open_launchpad_button, go_to_debrief_button, resume_mission_button]:
		if btn == null:
			continue
		btn.visible = false
		btn.mouse_filter = Control.MOUSE_FILTER_STOP
		_apply_pill_button(btn, true)
	if open_launchpad_button:
		open_launchpad_button.pressed.connect(_on_open_launchpad_pressed)
	if go_to_debrief_button:
		go_to_debrief_button.pressed.connect(_on_go_to_debrief_pressed)
	if resume_mission_button:
		resume_mission_button.pressed.connect(_on_resume_mission_pressed)

func _configure_mouse_passthrough() -> void:
	var margin = $Root/Panel/Margin
	var vbox = $Root/Panel/Margin/VBox
	var header = $Root/Panel/Margin/VBox/Header
	if margin:
		margin.mouse_filter = Control.MOUSE_FILTER_IGNORE
	if vbox:
		vbox.mouse_filter = Control.MOUSE_FILTER_IGNORE
	if header:
		header.mouse_filter = Control.MOUSE_FILTER_IGNORE
	for label_node in [title_label, stage_label, message_label, action_label, progress_label]:
		if label_node:
			label_node.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var buttons_row = $Root/Panel/Margin/VBox/Buttons
	if buttons_row:
		buttons_row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	for btn in [collapse_button, skip_button, practice_mining_button, replay_mission_button, replay_all_button, open_launchpad_button, go_to_debrief_button, resume_mission_button]:
		if btn:
			btn.mouse_filter = Control.MOUSE_FILTER_STOP

func _process(delta: float) -> void:
	if _is_launchpad_scene_with_embedded_guidance():
		if visible:
			visible = false
			_hide_target_pointer()
		return
	elif not visible and not _current_state.is_empty() and not _transit_suppressed:
		_on_tutorial_state_updated(_current_state)
	_layout_elapsed += delta
	if _layout_elapsed < LAYOUT_REFRESH_INTERVAL:
		return
	_layout_elapsed = 0.0
	_apply_transit_suppression()
	_apply_off_course_check()
	_reposition_panel()
	_refresh_target_pointer()

func _apply_transit_suppression() -> void:
	var in_transit := _is_transit_scene()
	var in_debrief := _is_debrief_scene()
	var should_suppress := in_transit or in_debrief
	if should_suppress == _transit_suppressed:
		return
	_transit_suppressed = should_suppress
	if should_suppress:
		visible = false
	else:
		_off_course = false
		_refresh()

func _is_debrief_scene() -> bool:
	var tree := get_tree()
	if tree == null or tree.current_scene == null:
		return false
	var basename := tree.current_scene.scene_file_path.get_file().get_basename().to_lower()
	return basename in DEBRIEF_SCENE_BASENAMES

func _apply_off_course_check() -> void:
	if not visible:
		return
	var valid_scenes: Array = _current_step.get("valid_scenes", [])
	if valid_scenes.is_empty():
		if _off_course:
			_off_course = false
			_on_tutorial_state_updated(_current_state)
		return
	var tree = get_tree()
	if tree == null or tree.current_scene == null:
		return
	var basename: String = tree.current_scene.scene_file_path.get_file().get_basename()
	var in_valid_scene: bool = basename in valid_scenes
	if not in_valid_scene and not _off_course:
		_off_course = true
		_apply_off_course_display()
	elif in_valid_scene and _off_course:
		_off_course = false
		_on_tutorial_state_updated(_current_state)

func _apply_off_course_display() -> void:
	stage_label.visible = false
	progress_label.visible = false
	action_label.visible = false
	message_label.text = _resume_hint_for_step(_current_step)
	message_label.visible = true
	skip_button.visible = false
	replay_mission_button.visible = false
	replay_all_button.visible = false
	practice_mining_button.visible = false
	var valid_scenes: Array = _current_step.get("valid_scenes", [])
	var is_inflight_step = "SidescrollMining" in valid_scenes
	if resume_mission_button:
		resume_mission_button.visible = is_inflight_step
	_update_context_action_button()

func _resume_hint_for_step(step: Dictionary) -> String:
	var valid_scenes: Array = step.get("valid_scenes", [])
	if "earth_launchpad" in valid_scenes:
		return "Open the Launchpad to continue."
	if "SidescrollMining" in valid_scenes:
		return "Your mission is in flight."
	if "mission_debrief_v2" in valid_scenes:
		return "Return to base to complete your debrief."
	return "Navigate to continue your mission."

func _is_transit_scene() -> bool:
	var tree = get_tree()
	if tree == null or tree.current_scene == null:
		return false
	var basename = tree.current_scene.scene_file_path.get_file().get_basename().to_lower()
	return basename in TRANSIT_SCENE_BASENAMES

func _apply_style() -> void:
	panel.set_meta("ui_style_locked", true)
	var panel_style := StyleBoxFlat.new()
	panel_style.bg_color = Color(0.04, 0.06, 0.12, 0.90)
	panel_style.border_color = CYAN
	panel_style.set_border_width_all(2)
	panel_style.set_corner_radius_all(8)
	panel_style.content_margin_left = 24
	panel_style.content_margin_right = 24
	panel_style.content_margin_top = 20
	panel_style.content_margin_bottom = 20
	panel.add_theme_stylebox_override("panel", panel_style)

	PanelStyle.apply_title_on_dark(title_label)
	title_label.add_theme_font_size_override("font_size", 24)
	PanelStyle.apply_muted_on_dark(stage_label)
	stage_label.add_theme_font_size_override("font_size", 18)
	PanelStyle.apply_body_on_dark(message_label)
	message_label.add_theme_font_size_override("font_size", 22)
	message_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	PanelStyle.apply_muted_on_dark(action_label)
	action_label.add_theme_font_size_override("font_size", 19)
	action_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	PanelStyle.apply_muted_on_dark(progress_label)
	progress_label.add_theme_font_size_override("font_size", 18)

	for btn in [replay_mission_button, replay_all_button]:
		_apply_pill_button(btn, false)
	_apply_pill_button(practice_mining_button, true)
	_apply_pill_button(collapse_button, false)
	collapse_button.custom_minimum_size = Vector2(56, 36)

func _apply_pill_button(btn: Button, is_primary: bool) -> void:
	if btn == null:
		return
	btn.set_meta("ui_style_locked", true)
	var col := AMBER if is_primary else CYAN
	var normal := StyleBoxFlat.new()
	normal.bg_color = Color(0, 0, 0, 0)
	normal.border_color = col
	normal.set_border_width_all(1)
	normal.set_corner_radius_all(28)
	normal.content_margin_left = 18
	normal.content_margin_right = 18
	normal.content_margin_top = 9
	normal.content_margin_bottom = 9
	var hover := normal.duplicate()
	hover.bg_color = Color(col.r, col.g, col.b, 0.12)
	var pressed := normal.duplicate()
	pressed.bg_color = Color(col.r, col.g, col.b, 0.22)
	btn.add_theme_stylebox_override("normal", normal)
	btn.add_theme_stylebox_override("hover", hover)
	btn.add_theme_stylebox_override("pressed", pressed)
	btn.add_theme_stylebox_override("focus", hover)
	btn.add_theme_color_override("font_color", col)
	btn.add_theme_color_override("font_hover_color", col)
	btn.add_theme_color_override("font_pressed_color", col)
	btn.add_theme_font_size_override("font_size", 20)

func _refresh() -> void:
	if not _app_controller or not _app_controller.has_method("get_tutorial_state"):
		visible = false
		return
	_on_tutorial_state_updated(_app_controller.get_tutorial_state())

func _on_tutorial_state_updated(state: Dictionary) -> void:
	_off_course = false
	_current_state = state.duplicate(true)
	if state.is_empty():
		visible = false
		return
	if _is_launchpad_scene_with_embedded_guidance():
		visible = false
		_hide_target_pointer()
		return
	var skipped = bool(state.get("skipped", false))
	var step: Dictionary = state.get("current_step", {})
	_current_step = step.duplicate(true)
	if skipped or step.is_empty():
		visible = false
		_hide_target_pointer()
		return
	visible = true
	if not _collapsed:
		stage_label.visible = true
		message_label.visible = true
		action_label.visible = true
		progress_label.visible = true
	var stage = int(state.get("current_stage", 1))
	var current_idx = int(state.get("current_step_index", 0))
	var total = int(state.get("total_steps", 0))
	title_label.text = str(step.get("title", "Mission Guidance"))
	stage_label.text = "Mission %d" % stage
	message_label.text = str(step.get("message", ""))
	action_label.text = _action_copy_for_step(step)
	progress_label.text = "Step %d/%d" % [min(current_idx + 1, max(total, 1)), max(total, 1)]
	practice_mining_button.visible = _step_supports_practice(step)
	_update_context_action_button()
	call_deferred("_reposition_panel")
	call_deferred("_refresh_target_pointer")

func _is_launchpad_scene_with_embedded_guidance() -> bool:
	var tree := get_tree()
	if tree == null or tree.current_scene == null:
		return false
	return tree.current_scene.scene_file_path.get_file().get_basename() == "earth_launchpad"

func _setup_pointer_indicator() -> void:
	if _pointer_line and _pointer_head and _target_highlight:
		return
	_pointer_line = Line2D.new()
	_pointer_line.name = "TargetPointerLine"
	_pointer_line.width = 7.0
	_pointer_line.default_color = CYAN
	_pointer_line.begin_cap_mode = Line2D.LINE_CAP_ROUND
	_pointer_line.end_cap_mode = Line2D.LINE_CAP_ROUND
	_pointer_line.z_index = 240
	_pointer_line.show_behind_parent = false
	_pointer_line.visible = false
	$Root.add_child(_pointer_line)

	_pointer_head = Polygon2D.new()
	_pointer_head.name = "TargetPointerHead"
	_pointer_head.color = CYAN
	_pointer_head.z_index = 241
	_pointer_head.visible = false
	$Root.add_child(_pointer_head)

	_target_highlight = ReferenceRect.new()
	_target_highlight.name = "TargetHighlight"
	_target_highlight.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_target_highlight.z_index = 239
	_target_highlight.visible = false
	_target_highlight.editor_only = false
	_target_highlight.border_color = Color(CYAN.r, CYAN.g, CYAN.b, 0.95)
	_target_highlight.border_width = 4.0
	$Root.add_child(_target_highlight)

func _refresh_target_pointer() -> void:
	if _pointer_line == null or _pointer_head == null:
		return
	if not visible or _collapsed or _current_step.is_empty():
		_hide_target_pointer()
		return
	var tree := get_tree()
	if tree == null:
		_hide_target_pointer()
		return
	var target_rect: Rect2 = TutorialCoachTargeting.find_current_target_rect(_current_step, tree)
	if target_rect.size == Vector2.ZERO:
		_hide_target_pointer()
		return
	_update_target_highlight(target_rect)
	var panel_rect = panel.get_global_rect()
	var from = panel_rect.get_center()
	var target_center = target_rect.get_center()
	var to = target_center
	var to_direction = (target_center - from).normalized()
	if to_direction == Vector2.ZERO:
		to_direction = Vector2.RIGHT
	var panel_limit = _intersect_line_with_rect(from, to_direction, panel_rect.grow(4.0))
	if panel_limit != Vector2.INF:
		from = panel_limit
	var target_limit = _intersect_line_with_rect(target_center, -to_direction, target_rect.grow(POINTER_TARGET_MARGIN))
	if target_limit != Vector2.INF:
		to = target_limit
	var line_len = clamp(from.distance_to(to), POINTER_MIN_LENGTH, POINTER_MAX_LENGTH)
	from = to - (to_direction * line_len)
	_pointer_line.clear_points()
	_pointer_line.add_point(from)
	_pointer_line.add_point(to)
	_pointer_line.visible = true
	_update_pointer_head(to, to_direction)

func _hide_target_pointer() -> void:
	if _pointer_line:
		_pointer_line.visible = false
		_pointer_line.clear_points()
	if _pointer_head:
		_pointer_head.visible = false
	if _target_highlight:
		_target_highlight.visible = false
	if _highlight_tween != null:
		_highlight_tween.kill()
		_highlight_tween = null

func _update_target_highlight(target_rect: Rect2) -> void:
	if _target_highlight == null:
		return
	var padded = target_rect.grow(8.0)
	_target_highlight.position = padded.position
	_target_highlight.size = padded.size
	if not _target_highlight.visible:
		_target_highlight.visible = true
		_start_highlight_pulse()

func _start_highlight_pulse() -> void:
	if _target_highlight == null:
		return
	if _highlight_tween != null:
		_highlight_tween.kill()
	_highlight_tween = create_tween()
	_highlight_tween.set_loops()
	_highlight_tween.tween_method(
		func(a: float) -> void:
			_target_highlight.border_color = Color(CYAN.r, CYAN.g, CYAN.b, a),
		0.42, 0.95, 0.75
	).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	_highlight_tween.tween_method(
		func(a: float) -> void:
			_target_highlight.border_color = Color(CYAN.r, CYAN.g, CYAN.b, a),
		0.95, 0.42, 0.75
	).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)

func _update_pointer_head(tip: Vector2, direction: Vector2) -> void:
	if _pointer_head == null:
		return
	var dir = direction.normalized()
	if dir == Vector2.ZERO:
		dir = Vector2.RIGHT
	var side = dir.orthogonal()
	var base = tip - (dir * POINTER_ARROW_SIZE)
	var p1 = tip
	var p2 = base + (side * (POINTER_ARROW_SIZE * 0.5))
	var p3 = base - (side * (POINTER_ARROW_SIZE * 0.5))
	_pointer_head.polygon = PackedVector2Array([p1, p2, p3])
	_pointer_head.visible = true

func _intersect_line_with_rect(origin: Vector2, direction: Vector2, rect: Rect2) -> Vector2:
	var dir = direction.normalized()
	if dir == Vector2.ZERO:
		return Vector2.INF
	var best_t := INF
	var best_point := Vector2.INF
	var edges = [
		[rect.position, rect.position + Vector2(rect.size.x, 0)],
		[rect.position + Vector2(rect.size.x, 0), rect.end],
		[rect.end, rect.position + Vector2(0, rect.size.y)],
		[rect.position + Vector2(0, rect.size.y), rect.position]
	]
	for edge in edges:
		var a: Vector2 = edge[0]
		var b: Vector2 = edge[1]
		var hit = Geometry2D.segment_intersects_segment(origin, origin + (dir * 6000.0), a, b)
		if hit == null:
			continue
		var point := hit as Vector2
		var t = (point - origin).dot(dir)
		if t > 0.0 and t < best_t:
			best_t = t
			best_point = point
	return best_point

func _action_copy_for_step(step: Dictionary) -> String:
	var key = str(step.get("action_key", ""))
	var stage = int(_current_state.get("current_stage", 1))
	var scene_name := ""
	if get_tree() and get_tree().current_scene:
		scene_name = get_tree().current_scene.scene_file_path.get_file().get_basename()
	var on_base := scene_name == "earth_base_1"
	match key:
		"build_control_station":
			return "Build the Control Station from the base card before starting Mission 2."
		"accept_contractor_offer", "accept_starter_contractor":
			if on_base:
				return "Press New Mission to open Launchpad, then select a contractor."
			return "Tap a contractor card and press Select. They give you a target order — delivering it earns a payout bonus on top of the base price."
		"create_rocket":
			if on_base:
				return "Press New Mission to open Launchpad, then build the required rocket."
			if stage <= 1:
				return "Create Starter Rocket 1."
			if stage == 2:
				return "Create Starter Rocket 2."
			return "Build a rocket that matches this mission."
		"select_launch_target":
			if on_base:
				return "Press New Mission to open Launchpad, then select a target."
			return "Select the highlighted Mission 1 target."
		"launch_rocket_from_earth":
			if on_base:
				return "Press New Mission to open Launchpad, then launch."
			return "Press Launch when contractor, rocket, and target are ready."
		"mine_target":
			return "Mine required cargo at the target."
		"return_rocket_home":
			return "Return to Earth with cargo."
		"resolve_mission_debrief":
			return "Complete the debrief to advance."
		_:
			return "Complete the current objective."

func _reposition_panel() -> void:
	if not visible:
		return
	var viewport_rect := get_viewport().get_visible_rect()
	var reserved := _reserved_rect_for_scene(viewport_rect)
	panel.position = reserved.position
	panel.size = reserved.size

func _reserved_rect_for_scene(viewport_rect: Rect2) -> Rect2:
	var tree := get_tree()
	if tree == null or tree.current_scene == null:
		return TutorialLayoutZone.reserved_rect(viewport_rect)
	var scene_name := tree.current_scene.scene_file_path.get_file().get_basename()
	if scene_name == "earth_launchpad":
		return _launchpad_reserved_rect(viewport_rect)
	return TutorialLayoutZone.reserved_rect(viewport_rect)

func _launchpad_reserved_rect(viewport_rect: Rect2) -> Rect2:
	var vp := viewport_rect.size
	var widget_zone := UILayout.zone(UILayout.Zone.EARTH_WIDGET, vp)
	var reserved := TutorialLayoutZone.reserved_rect(viewport_rect)
	var margin := 12.0
	var width: float = clampf(minf(reserved.size.x, vp.x * 0.31), 300.0, 360.0)
	var height: float = reserved.size.y
	var x: float = viewport_rect.end.x - width - margin
	var y: float = maxf(viewport_rect.position.y + 18.0, widget_zone.end.y + 18.0)
	return UILayout.clamp_to_viewport(Rect2(Vector2(x, y), Vector2(width, height)), vp)

func _on_collapse_pressed() -> void:
	_collapsed = !_collapsed
	collapse_button.text = "+" if _collapsed else "−"
	message_label.visible = !_collapsed
	action_label.visible = !_collapsed
	progress_label.visible = !_collapsed
	$Root/Panel/Margin/VBox/Buttons.visible = !_collapsed

func _on_skip_pressed() -> void:
	if _app_controller and _app_controller.has_method("skip_tutorial"):
		_app_controller.skip_tutorial()

func _on_replay_mission_pressed() -> void:
	if _app_controller and _app_controller.has_method("replay_tutorial_for_current_mission"):
		_app_controller.replay_tutorial_for_current_mission()

func _on_replay_all_pressed() -> void:
	if _app_controller and _app_controller.has_method("replay_tutorial_from_mission1"):
		_app_controller.replay_tutorial_from_mission1()

func _on_practice_mining_pressed() -> void:
	preload("res://Scripts/Utils/AppControllerHelper.gd").open_mining_practice_panel("tutorial_overlay")

func _step_supports_practice(step: Dictionary) -> bool:
	var action_key = str(step.get("action_key", ""))
	var mechanic = str(step.get("mechanic", ""))
	return action_key == "mine_target" or mechanic == "mining"

func _update_context_action_button() -> void:
	if open_launchpad_button == null:
		return
	var show_launchpad := _needs_launchpad_cta()
	var show_debrief   := _needs_debrief_cta()
	var show_any_cta   := show_launchpad or show_debrief
	open_launchpad_button.visible = show_launchpad
	if go_to_debrief_button:
		go_to_debrief_button.visible = show_debrief
	# Avoid right-edge overflow: when a CTA is shown, hide replay buttons.
	if not _off_course:
		replay_mission_button.visible = not show_any_cta
		replay_all_button.visible = not show_any_cta
		if resume_mission_button:
			resume_mission_button.visible = false

func _needs_launchpad_cta() -> bool:
	if _current_step.is_empty():
		return false
	var tree = get_tree()
	if tree == null or tree.current_scene == null:
		return false
	var scene_name = tree.current_scene.scene_file_path.get_file().get_basename()
	if scene_name != "earth_base_1":
		return false
	var valid_scenes: Array = _current_step.get("valid_scenes", [])
	return "earth_launchpad" in valid_scenes and not ("earth_base_1" in valid_scenes)

func _needs_debrief_cta() -> bool:
	if _current_step.is_empty():
		return false
	var tree := get_tree()
	if tree == null or tree.current_scene == null:
		return false
	var scene_name := tree.current_scene.scene_file_path.get_file().get_basename()
	if scene_name != "earth_base_1":
		return false
	var valid_scenes: Array = _current_step.get("valid_scenes", [])
	return "mission_debrief_v2" in valid_scenes

func _on_go_to_debrief_pressed() -> void:
	var tree := get_tree()
	if tree == null:
		return
	var scene_manager := tree.get_first_node_in_group("scene_manager")
	if scene_manager and scene_manager.has_method("change_to_scene"):
		scene_manager.change_to_scene("res://Scenes/Earth/mission_debrief_v2.tscn")
	else:
		tree.change_scene_to_file("res://Scenes/Earth/mission_debrief_v2.tscn")

func _on_open_launchpad_pressed() -> void:
	var tree = get_tree()
	if tree == null:
		return
	preload("res://Scripts/Utils/AppControllerHelper.gd").record_tutorial_action("open_launchpad")
	var scene_manager = tree.get_first_node_in_group("scene_manager")
	if scene_manager and scene_manager.has_method("change_to_scene"):
		scene_manager.change_to_scene("res://Scenes/Earth/earth_launchpad.tscn")
		return
	tree.change_scene_to_file("res://Scenes/Earth/earth_launchpad.tscn")

func _on_resume_mission_pressed() -> void:
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	var missions: Array = rm.get_missions()
	if missions.is_empty():
		return
	var m: Dictionary = missions[0]
	var rocket_id := str(m.get("rocket_id", ""))
	var target_id := str(m.get("target", ""))
	var target_type := str(m.get("target_type", "asteroid"))
	if rocket_id == "" or target_id == "":
		return
	rm.set_preview_target(target_id, target_id, target_type, rocket_id)
	rm.mark_returned_if_due(rocket_id)
	var status := rm.get_rocket_status(rocket_id)
	var arrived := rm.has_arrived(rocket_id, target_id)
	var scene_path := PreviewRouting.resolve_scene_path(status, arrived)
	var tree = get_tree()
	if tree == null:
		return
	var scene_manager = tree.get_first_node_in_group("scene_manager")
	if scene_manager and scene_manager.has_method("change_to_scene"):
		scene_manager.change_to_scene(scene_path)
	else:
		tree.change_scene_to_file(scene_path)
