extends CanvasLayer

const PanelStyle = preload("res://Scripts/UI/PanelStyle.gd")
const PANEL_MARGIN := 20.0
const PANEL_DEFAULT_SIZE := Vector2(560.0, 240.0)
const PANEL_MIN_SIZE := Vector2(420.0, 172.0)
const LAYOUT_REFRESH_INTERVAL := 0.15
const HIGHLIGHT_PADDING := 12.0

@onready var panel: PanelContainer = $Root/Panel
@onready var title_label: Label = $Root/Panel/Margin/VBox/Header/TitleLabel
@onready var stage_label: Label = $Root/Panel/Margin/VBox/Header/StageLabel
@onready var message_label: Label = $Root/Panel/Margin/VBox/MessageLabel
@onready var action_label: Label = $Root/Panel/Margin/VBox/ActionLabel
@onready var progress_label: Label = $Root/Panel/Margin/VBox/ProgressLabel
@onready var skip_button: Button = $Root/Panel/Margin/VBox/Buttons/SkipButton
@onready var replay_mission_button: Button = $Root/Panel/Margin/VBox/Buttons/ReplayMissionButton
@onready var replay_all_button: Button = $Root/Panel/Margin/VBox/Buttons/ReplayAllButton

var _app_controller: Node = null
var _layout_elapsed := 0.0
var _current_state: Dictionary = {}
var _current_step: Dictionary = {}

var _highlight_box: Panel = null
var _guide_line: Line2D = null
var _guide_arrow: Polygon2D = null
var _guide_label: Label = null
var _guide_target_rect := Rect2()

func _ready() -> void:
	layer = 70
	$Root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	panel.mouse_filter = Control.MOUSE_FILTER_STOP
	panel.size = PANEL_DEFAULT_SIZE
	_apply_style()
	_setup_guide_nodes()
	_app_controller = preload("res://Scripts/Utils/AppControllerHelper.gd").get_instance()
	if _app_controller and _app_controller.has_signal("tutorial_state_updated"):
		_app_controller.tutorial_state_updated.connect(_on_tutorial_state_updated)
	skip_button.pressed.connect(_on_skip_pressed)
	replay_mission_button.pressed.connect(_on_replay_mission_pressed)
	replay_all_button.pressed.connect(_on_replay_all_pressed)
	set_process(true)
	_refresh()

func _process(delta: float) -> void:
	_layout_elapsed += delta
	if _layout_elapsed < LAYOUT_REFRESH_INTERVAL:
		return
	_layout_elapsed = 0.0
	_reposition_panel()
	_update_guidance_overlay()

func _apply_style() -> void:
	PanelStyle.apply_panel(panel)
	PanelStyle.apply_title(title_label)
	PanelStyle.apply_muted(stage_label)
	PanelStyle.apply_body(message_label)
	PanelStyle.apply_muted(action_label)
	PanelStyle.apply_muted(progress_label)
	PanelStyle.apply_button(skip_button, false)
	PanelStyle.apply_button(replay_mission_button, false)
	PanelStyle.apply_button(replay_all_button, false)

func _setup_guide_nodes() -> void:
	_highlight_box = Panel.new()
	_highlight_box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_highlight_box.visible = false
	# Intentional opt-out from generic panel style: this is a guidance/highlight affordance.
	var highlight_style = StyleBoxFlat.new()
	highlight_style.bg_color = Color(0.39, 0.78, 0.98, 0.12)
	highlight_style.border_color = Color(PanelStyle.ACCENT.r, PanelStyle.ACCENT.g, PanelStyle.ACCENT.b, 0.96)
	highlight_style.border_width_left = 3
	highlight_style.border_width_top = 3
	highlight_style.border_width_right = 3
	highlight_style.border_width_bottom = 3
	highlight_style.corner_radius_top_left = 8
	highlight_style.corner_radius_top_right = 8
	highlight_style.corner_radius_bottom_left = 8
	highlight_style.corner_radius_bottom_right = 8
	_highlight_box.add_theme_stylebox_override("panel", highlight_style)
	$Root.add_child(_highlight_box)

	_guide_line = Line2D.new()
	_guide_line.visible = false
	_guide_line.width = 4.0
	_guide_line.default_color = Color(PanelStyle.ACCENT.r, PanelStyle.ACCENT.g, PanelStyle.ACCENT.b, 0.96)
	_guide_line.antialiased = true
	add_child(_guide_line)

	_guide_arrow = Polygon2D.new()
	_guide_arrow.visible = false
	_guide_arrow.color = Color(PanelStyle.ACCENT.r, PanelStyle.ACCENT.g, PanelStyle.ACCENT.b, 0.96)
	_guide_arrow.polygon = PackedVector2Array([
		Vector2(0, 0),
		Vector2(-16, -9),
		Vector2(-16, 9)
	])
	add_child(_guide_arrow)

	_guide_label = Label.new()
	_guide_label.visible = false
	_guide_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_guide_label.text = "Click here ->"
	_guide_label.add_theme_font_size_override("font_size", 18)
	_guide_label.add_theme_color_override("font_color", PanelStyle.TEXT_PRIMARY)
	_guide_label.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.8))
	_guide_label.add_theme_constant_override("shadow_offset_x", 2)
	_guide_label.add_theme_constant_override("shadow_offset_y", 2)
	$Root.add_child(_guide_label)

func _refresh() -> void:
	if not _app_controller or not _app_controller.has_method("get_tutorial_state"):
		visible = false
		return
	var state = _app_controller.get_tutorial_state()
	_on_tutorial_state_updated(state)

func _on_tutorial_state_updated(state: Dictionary) -> void:
	_current_state = state.duplicate(true)
	if state.is_empty():
		visible = false
		_hide_guide_overlay()
		return
	var skipped = bool(state.get("skipped", false))
	var step: Dictionary = state.get("current_step", {})
	_current_step = step.duplicate(true)
	if skipped:
		visible = true
		title_label.text = "Onboarding Paused"
		stage_label.text = "Tutorial skipped."
		message_label.text = "You can resume onboarding at any time from this panel or the main menu."
		action_label.text = ""
		progress_label.text = ""
		_hide_guide_overlay()
		call_deferred("_reposition_panel")
		return
	if step.is_empty():
		visible = false
		_hide_guide_overlay()
		return
	visible = true
	var stage = int(state.get("current_stage", 1))
	var current_idx = int(state.get("current_step_index", 0))
	var total = int(state.get("total_steps", 0))
	title_label.text = str(step.get("title", "Mission Guidance"))
	stage_label.text = "Mission %d" % stage
	message_label.text = str(step.get("message", ""))
	action_label.text = "Next click: %s" % _action_hint_for_step(str(step.get("action_key", "")))
	progress_label.text = "Step %d/%d" % [min(current_idx + 1, max(total, 1)), max(total, 1)]
	call_deferred("_reposition_panel")
	call_deferred("_update_guidance_overlay")

func _reposition_panel() -> void:
	if not visible:
		return
	var viewport_rect := get_viewport().get_visible_rect()
	var panel_size = _panel_layout_size(viewport_rect)
	var blockers: Array[Rect2] = []
	_collect_blocking_rects(get_tree().root, blockers)
	var target_rect = _find_current_target_rect()
	if _has_rect(target_rect):
		blockers.append(target_rect)
	var best_overlap := INF
	var best_rect := Rect2(Vector2.ZERO, panel_size)
	for candidate in _candidate_rects(viewport_rect, panel_size, target_rect):
		var overlap := _rect_overlap_area(candidate, blockers)
		if overlap < best_overlap:
			best_overlap = overlap
			best_rect = candidate
	if best_overlap > 0.0:
		panel.visible = false
		return
	panel.visible = true
	panel.size = panel_size
	panel.position = _clamp_panel_position(best_rect.position, panel_size, viewport_rect)

func _candidate_rects(viewport_rect: Rect2, size: Vector2, target_rect: Rect2) -> Array[Rect2]:
	var left := viewport_rect.position.x + PANEL_MARGIN
	var top := viewport_rect.position.y + PANEL_MARGIN
	var right := viewport_rect.position.x + viewport_rect.size.x - size.x - PANEL_MARGIN
	var bottom := viewport_rect.position.y + viewport_rect.size.y - size.y - PANEL_MARGIN
	var out: Array[Rect2] = [
		Rect2(Vector2(left, top), size),
		Rect2(Vector2(right, top), size),
		Rect2(Vector2(left, bottom), size),
		Rect2(Vector2(right, bottom), size)
	]
	if _has_rect(target_rect):
		out.append(Rect2(Vector2(
			clamp(target_rect.position.x - size.x - PANEL_MARGIN, left, right),
			clamp(target_rect.position.y, top, bottom)
		), size))
		out.append(Rect2(Vector2(
			clamp(target_rect.end.x + PANEL_MARGIN, left, right),
			clamp(target_rect.position.y, top, bottom)
		), size))
		out.append(Rect2(Vector2(
			clamp(target_rect.position.x, left, right),
			clamp(target_rect.position.y - size.y - PANEL_MARGIN, top, bottom)
		), size))
		out.append(Rect2(Vector2(
			clamp(target_rect.position.x, left, right),
			clamp(target_rect.end.y + PANEL_MARGIN, top, bottom)
		), size))
	return out

func _panel_layout_size(viewport_rect: Rect2) -> Vector2:
	var min_size = panel.get_combined_minimum_size()
	var size = Vector2(
		max(PANEL_MIN_SIZE.x, max(PANEL_DEFAULT_SIZE.x, min_size.x)),
		max(PANEL_MIN_SIZE.y, max(PANEL_DEFAULT_SIZE.y, min_size.y))
	)
	var max_width = max(viewport_rect.size.x - (PANEL_MARGIN * 2.0), PANEL_MIN_SIZE.x)
	var max_height = max(viewport_rect.size.y - (PANEL_MARGIN * 2.0), PANEL_MIN_SIZE.y)
	size.x = min(size.x, max_width)
	size.y = min(size.y, max_height)
	return size

func _clamp_panel_position(position: Vector2, panel_size: Vector2, viewport_rect: Rect2) -> Vector2:
	var min_x = viewport_rect.position.x + PANEL_MARGIN
	var min_y = viewport_rect.position.y + PANEL_MARGIN
	var max_x = max(viewport_rect.position.x + viewport_rect.size.x - panel_size.x - PANEL_MARGIN, min_x)
	var max_y = max(viewport_rect.position.y + viewport_rect.size.y - panel_size.y - PANEL_MARGIN, min_y)
	return Vector2(
		clamp(position.x, min_x, max_x),
		clamp(position.y, min_y, max_y)
	)

func _collect_blocking_rects(node: Node, blockers: Array[Rect2]) -> void:
	if node == self:
		return
	if node is Control:
		var control := node as Control
		if control == $Root or $Root.is_ancestor_of(control):
			return
		if control.is_visible_in_tree() and _is_blocking_control(control):
			var rect := control.get_global_rect()
			if rect.size.x >= 56.0 and rect.size.y >= 40.0:
				blockers.append(rect)
	for child in node.get_children():
		_collect_blocking_rects(child, blockers)

func _is_blocking_control(control: Control) -> bool:
	return (
		control is PanelContainer
		or control is ScrollContainer
		or control is ItemList
		or control is Tree
		or control is TabContainer
		or control is BaseButton
	)

func _rect_overlap_area(rect: Rect2, blockers: Array[Rect2]) -> float:
	var total := 0.0
	for blocker in blockers:
		var overlap := rect.intersection(blocker)
		if overlap.size.x > 0.0 and overlap.size.y > 0.0:
			total += overlap.size.x * overlap.size.y
	return total

func _update_guidance_overlay() -> void:
	if not visible or _current_step.is_empty():
		_hide_guide_overlay()
		return
	var target_rect = _find_current_target_rect()
	if not _has_rect(target_rect):
		_hide_guide_overlay()
		return
	_guide_target_rect = target_rect
	_highlight_box.visible = true
	_highlight_box.position = target_rect.position - Vector2(HIGHLIGHT_PADDING, HIGHLIGHT_PADDING)
	_highlight_box.size = target_rect.size + Vector2(HIGHLIGHT_PADDING * 2.0, HIGHLIGHT_PADDING * 2.0)

	var target_center = target_rect.position + (target_rect.size * 0.5)
	var source_point = target_center + Vector2(-240, -120)
	if panel.visible:
		var panel_rect = Rect2(panel.global_position, panel.size)
		source_point = _closest_point_on_rect(panel_rect, target_center)
	_guide_line.visible = true
	_guide_line.points = PackedVector2Array([source_point, target_center])

	var direction = (target_center - source_point).normalized()
	_guide_arrow.visible = true
	_guide_arrow.position = target_center
	_guide_arrow.rotation = direction.angle()

	_guide_label.visible = true
	_guide_label.text = "Click here ->"
	_guide_label.position = Vector2(
		clamp(target_rect.position.x - 160.0, 8.0, get_viewport().get_visible_rect().size.x - 200.0),
		max(target_rect.position.y - 36.0, 8.0)
	)

func _hide_guide_overlay() -> void:
	_highlight_box.visible = false
	_guide_line.visible = false
	_guide_arrow.visible = false
	_guide_label.visible = false
	_guide_target_rect = Rect2()

func _find_current_target_rect() -> Rect2:
	var action_key = str(_current_step.get("action_key", ""))
	if action_key == "":
		return Rect2()
	var target = _find_target_for_action(action_key)
	if target == null:
		return Rect2()
	return _build_target_rect(target)

func _find_target_for_action(action_key: String) -> Node:
	match action_key:
		"open_launchpad":
			return _find_node_path_any([
				"StructuresLayer/Launchpad/InteractionArea",
				"StructuresLayer/Launchpad"
			])
		"build_scanner_station":
			return _find_node_path_any([
				"StructuresLayer/SatelliteStation/InteractionArea",
				"StructuresLayer/SatelliteStation"
			])
		"create_rocket":
			var create_btn = _find_visible_button(func(btn: Button) -> bool:
				return btn.name.begins_with("CreateButton_") and not btn.disabled
			)
			if create_btn:
				return create_btn
			return _find_node_path_any(["UILayer/SelectorPanel/VBox/RocketSelector"])
		"select_launch_target":
			return _find_visible_button(func(btn: Button) -> bool:
				if btn.disabled:
					return false
				var text = btn.text.to_lower()
				return text.find("select") != -1 or text.find("target") != -1
			)
		"launch_rocket_from_earth":
			return _find_visible_button(func(btn: Button) -> bool:
				return not btn.disabled and (btn.name.ends_with("LaunchButton") or btn.text.to_lower().find("launch") != -1)
			)
		"scan_targets":
			return _find_node_path_any(["PanelContainer/Panel/VBoxContainer/ContentContainer/RefreshContainer/RefreshButton"])
		"toggle_planet_scanner":
			return _find_node_path_any(["PanelContainer/Panel/VBoxContainer/HeaderContainer/ToggleSwitch"])
		"mine_target":
			return _find_node_path_any(["CanvasLayer/UI/MineButton"])
		"return_rocket_home":
			return _find_node_path_any(["CanvasLayer/UI/ReturnButton"])
		"resolve_mission_debrief", "complete_contractor_mission":
			return _find_visible_button(func(btn: Button) -> bool:
				if btn.disabled:
					return false
				var key = btn.name
				return key == "SellOrbitButton" or key == "SellEarthButton" or key == "KeepButton" or key == "ScrapButton" or key == "SalvageButton" or key == "LeaveButton" or key == "ArchiveButton"
			)
		"accept_contractor_offer":
			return _find_visible_button(func(btn: Button) -> bool:
				return not btn.disabled and btn.text.to_lower().find("accept") != -1
			)
	return null

func _build_target_rect(target: Node) -> Rect2:
	if target is Control:
		var rect = (target as Control).get_global_rect()
		return rect
	if target is CollisionShape2D:
		var shape_node = target as CollisionShape2D
		if shape_node.shape is RectangleShape2D:
			var rect_shape := shape_node.shape as RectangleShape2D
			var center = shape_node.get_global_transform_with_canvas().origin
			var size = rect_shape.size * shape_node.global_scale.abs()
			return Rect2(center - (size * 0.5), size)
	if target is Area2D:
		var area := target as Area2D
		for child in area.get_children():
			if child is CollisionShape2D:
				return _build_target_rect(child)
		var center = area.get_global_transform_with_canvas().origin
		return Rect2(center - Vector2(64, 64), Vector2(128, 128))
	if target is Sprite2D:
		var sprite := target as Sprite2D
		if sprite.texture:
			var size = sprite.texture.get_size() * sprite.global_scale.abs()
			var center = sprite.get_global_transform_with_canvas().origin
			return Rect2(center - (size * 0.5), size)
	if target is CanvasItem:
		var center = (target as CanvasItem).get_global_transform_with_canvas().origin
		return Rect2(center - Vector2(72, 72), Vector2(144, 144))
	return Rect2()

func _find_visible_button(predicate: Callable) -> Button:
	var root = get_tree().current_scene
	if root == null:
		return null
	var stack: Array[Node] = [root]
	while not stack.is_empty():
		var node = stack.pop_back()
		if node is Button:
			var btn := node as Button
			if btn.is_visible_in_tree() and bool(predicate.call(btn)):
				return btn
		for child in node.get_children():
			stack.append(child)
	return null

func _find_node_path_any(paths: Array[String]) -> Node:
	var root = get_tree().current_scene
	if root == null:
		return null
	for path in paths:
		var node = root.get_node_or_null(path)
		if node and (not (node is CanvasItem) or (node as CanvasItem).is_visible_in_tree()):
			return node
	var stack: Array[Node] = [root]
	while not stack.is_empty():
		var node = stack.pop_back()
		for child in node.get_children():
			for path in paths:
				if str(child.get_path()).find(path) != -1 and (not (child is CanvasItem) or (child as CanvasItem).is_visible_in_tree()):
					return child
			stack.append(child)
	return null

func _closest_point_on_rect(rect: Rect2, point: Vector2) -> Vector2:
	return Vector2(
		clamp(point.x, rect.position.x, rect.end.x),
		clamp(point.y, rect.position.y, rect.end.y)
	)

func _has_rect(rect: Rect2) -> bool:
	return rect.size.x > 0.0 and rect.size.y > 0.0

func _action_hint_for_step(action_key: String) -> String:
	match action_key:
		"open_launchpad":
			return "Launchpad"
		"create_rocket":
			return "Create button in Rocket Selector"
		"select_launch_target":
			return "Select target button"
		"launch_rocket_from_earth":
			return "Launch button"
		"mine_target":
			return "MINE button"
		"return_rocket_home":
			return "RETURN HOME button"
		"resolve_mission_debrief":
			return "Choose any enabled debrief action"
		"build_scanner_station":
			return "Scanner Station structure"
		"scan_targets":
			return "Refresh button in scanner panel"
		"toggle_planet_scanner":
			return "Scanner toggle switch"
		"accept_contractor_offer":
			return "Accept contractor button"
		"complete_contractor_mission":
			return "Complete debrief for contractor mission"
	return action_key

func _on_skip_pressed() -> void:
	if _app_controller and _app_controller.has_method("skip_tutorial"):
		_app_controller.skip_tutorial()

func _on_replay_mission_pressed() -> void:
	if _app_controller and _app_controller.has_method("replay_tutorial_for_current_mission"):
		_app_controller.replay_tutorial_for_current_mission()

func _on_replay_all_pressed() -> void:
	if _app_controller and _app_controller.has_method("replay_tutorial_from_mission1"):
		_app_controller.replay_tutorial_from_mission1()
