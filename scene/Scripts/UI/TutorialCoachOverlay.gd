extends CanvasLayer

const PanelStyle = preload("res://Scripts/UI/PanelStyle.gd")
const Targeting = preload("res://Scripts/UI/TutorialCoachTargeting.gd")
const PANEL_MARGIN := 20.0
# Scenes where the tutorial overlay should be suppressed entirely — the player
# is watching an automated transit animation and cannot act on any tutorial step.
const TRANSIT_SCENE_BASENAMES := ["rocket_ascent", "rocket_transit", "rocket_return"]
const PANEL_DEFAULT_SIZE := Vector2(520.0, 340.0)
const PANEL_MIN_SIZE := Vector2(440.0, 260.0)
const LAYOUT_REFRESH_INTERVAL := 0.15
const HIGHLIGHT_PADDING := 14.0
const GUIDE_PULSE_SPEED := 4.8
const GUIDE_LINE_ALPHA_MIN := 0.50
const GUIDE_LINE_ALPHA_MAX := 1.0
const GUIDE_ARROW_SWAY_PX := 10.0
const HIGHLIGHT_BG_ALPHA_MIN := 0.05
const HIGHLIGHT_BG_ALPHA_MAX := 0.18
const HIGHLIGHT_BORDER_ALPHA_MIN := 0.65
const HIGHLIGHT_BORDER_ALPHA_MAX := 1.0
const TARGET_FLASH_BLEND := 0.38
const LOW_INTENSITY_ACTIONS := [
	"tour_open_control_station",
	"tour_close_control_station",
	"accept_starter_contractor",
	"create_rocket"
]
# Accent colours — Out There: Omega palette
const CYAN  := Color(0.28, 0.88, 0.96, 1.0)   # #47E0F5 — panel borders, guide line
const AMBER := Color(0.941, 0.690, 0.188, 1.0) # #F0B030 — primary CTA only
# Dashed guide line: segment length and gap length in viewport pixels
const DASH_ON  := 22.0
const DASH_OFF := 14.0

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

var _collapsed := false
var _app_controller: Node = null
var _layout_elapsed := 0.0
var _current_state: Dictionary = {}
var _current_step: Dictionary = {}
var _transit_suppressed := false
var _off_course := false

var _highlight_box: Panel = null
var _guide_line: Line2D = null
var _guide_arrow: Polygon2D = null
var _guide_label: Label = null
var _guide_target_rect := Rect2()
var _guide_source_point := Vector2.ZERO
var _guide_target_node: Node = null
var _highlight_style: StyleBoxFlat = null
var _pulse_elapsed := 0.0
var _active_flash_target: CanvasItem = null
var _active_flash_base_modulate := Color(1, 1, 1, 1)

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
	collapse_button.pressed.connect(_on_collapse_pressed)
	skip_button.pressed.connect(_on_skip_pressed)
	practice_mining_button.pressed.connect(_on_practice_mining_pressed)
	replay_mission_button.pressed.connect(_on_replay_mission_pressed)
	replay_all_button.pressed.connect(_on_replay_all_pressed)
	set_process(true)
	_refresh()

func _process(delta: float) -> void:
	_pulse_elapsed += delta
	_animate_guidance_overlay()
	_layout_elapsed += delta
	if _layout_elapsed < LAYOUT_REFRESH_INTERVAL:
		return
	_layout_elapsed = 0.0
	_apply_transit_suppression()
	_apply_off_course_check()
	_reposition_panel()
	_update_guidance_overlay()

func _apply_transit_suppression() -> void:
	var in_transit = _is_transit_scene()
	if in_transit == _transit_suppressed:
		return
	_transit_suppressed = in_transit
	if in_transit:
		visible = false
		_hide_guide_overlay()
	else:
		# Resuming from transit — re-read current state and restore the panel.
		_off_course = false
		_refresh()

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
		message_label.text = "This area isn't part of the current step. Head back to the base to continue."
		if action_label:
			action_label.text = "← Return to the base"
		_hide_guide_overlay()
	elif in_valid_scene and _off_course:
		_off_course = false
		_on_tutorial_state_updated(_current_state)

func _is_transit_scene() -> bool:
	var tree = get_tree()
	if tree == null or tree.current_scene == null:
		return false
	var basename = tree.current_scene.scene_file_path.get_file().get_basename().to_lower()
	return basename in TRANSIT_SCENE_BASENAMES

func _apply_style() -> void:
	# Lock panel and buttons so UIConsistencyEnforcer (which runs deferred) cannot
	# overwrite these custom amber styles after _ready() completes.
	panel.set_meta("ui_style_locked", true)

	# Panel: dark translucent bg + bright cyan border — Out There: Omega style
	var panel_style := StyleBoxFlat.new()
	panel_style.bg_color     = Color(0.04, 0.06, 0.12, 0.82)  # dark, slightly transparent
	panel_style.border_color = CYAN                            # full-opacity cyan, clearly visible
	panel_style.set_border_width_all(2)
	panel_style.set_corner_radius_all(6)
	panel_style.shadow_color  = Color(CYAN.r, CYAN.g, CYAN.b, 0.25)  # cyan glow shadow
	panel_style.shadow_size   = 18
	panel_style.shadow_offset = Vector2(0, 0)
	panel_style.content_margin_left   = 28
	panel_style.content_margin_right  = 28
	panel_style.content_margin_top    = 22
	panel_style.content_margin_bottom = 22
	if panel.is_inside_tree():
		panel.add_theme_stylebox_override("panel", panel_style)

	# Text — use panel-appropriate sizes (panel is ~420px wide, not fullscreen)
	PanelStyle.apply_title(title_label)
	title_label.add_theme_font_size_override("font_size", 32)
	PanelStyle.apply_muted(stage_label)
	stage_label.add_theme_font_size_override("font_size", 26)
	PanelStyle.apply_body(message_label)
	message_label.add_theme_font_size_override("font_size", 32)
	if action_label:
		action_label.add_theme_color_override("font_color", Color(0.62, 0.60, 0.58, 1.0))
		action_label.add_theme_font_size_override("font_size", 28)
	PanelStyle.apply_muted(progress_label)
	progress_label.add_theme_font_size_override("font_size", 28)

	# Buttons — pill outline: cyan outline for secondary, amber for primary CTA
	for btn in [skip_button, replay_mission_button, replay_all_button]:
		_apply_pill_outline_button(btn, false)
	_apply_pill_outline_button(practice_mining_button, true)
	_apply_collapse_button_style()


func _apply_pill_outline_button(btn: Button, is_primary: bool) -> void:
	if btn == null:
		return
	# Prevent UIConsistencyEnforcer (deferred) from overwriting our pill style.
	btn.set_meta("ui_style_locked", true)
	var col: Color  = AMBER if is_primary else CYAN
	var col_d: Color = Color(col.r, col.g, col.b, 0.5)

	var normal := StyleBoxFlat.new()
	normal.bg_color = Color(0, 0, 0, 0)
	normal.border_color = col
	normal.set_border_width_all(1)
	normal.set_corner_radius_all(32)
	normal.content_margin_left   = 24
	normal.content_margin_right  = 24
	normal.content_margin_top    = 10
	normal.content_margin_bottom = 10

	var hover := normal.duplicate()
	hover.bg_color = Color(col.r, col.g, col.b, 0.12)

	var pressed := normal.duplicate()
	pressed.bg_color = Color(col.r, col.g, col.b, 0.22)

	btn.add_theme_stylebox_override("normal",  normal)
	btn.add_theme_stylebox_override("hover",   hover)
	btn.add_theme_stylebox_override("pressed", pressed)
	btn.add_theme_stylebox_override("focus",   hover)
	btn.add_theme_color_override("font_color",         col)
	btn.add_theme_color_override("font_hover_color",   col)
	btn.add_theme_color_override("font_pressed_color", col)
	btn.add_theme_color_override("font_disabled_color",col_d)
	btn.add_theme_font_size_override("font_size", 28)

func _apply_collapse_button_style() -> void:
	if collapse_button == null:
		return
	collapse_button.set_meta("ui_style_locked", true)
	var col := CYAN
	var normal := StyleBoxFlat.new()
	normal.bg_color = Color(0, 0, 0, 0)
	normal.border_color = Color(col.r, col.g, col.b, 0.5)
	normal.set_border_width_all(1)
	normal.set_corner_radius_all(32)
	normal.content_margin_left   = 14
	normal.content_margin_right  = 14
	normal.content_margin_top    = 6
	normal.content_margin_bottom = 6
	var hover := normal.duplicate()
	hover.bg_color = Color(col.r, col.g, col.b, 0.12)
	var pressed := normal.duplicate()
	pressed.bg_color = Color(col.r, col.g, col.b, 0.22)
	collapse_button.add_theme_stylebox_override("normal",  normal)
	collapse_button.add_theme_stylebox_override("hover",   hover)
	collapse_button.add_theme_stylebox_override("pressed", pressed)
	collapse_button.add_theme_stylebox_override("focus",   hover)
	collapse_button.add_theme_color_override("font_color", col)
	collapse_button.add_theme_color_override("font_hover_color", col)
	collapse_button.add_theme_color_override("font_pressed_color", col)
	collapse_button.add_theme_font_size_override("font_size", 28)

func _on_collapse_pressed() -> void:
	_collapsed = !_collapsed
	collapse_button.text = "+" if _collapsed else "−"
	message_label.visible = !_collapsed
	action_label.visible = !_collapsed
	progress_label.visible = !_collapsed
	$Root/Panel/Margin/VBox/Buttons.visible = !_collapsed
	call_deferred("_reposition_panel")

func _setup_guide_nodes() -> void:
	_highlight_box = Panel.new()
	_highlight_box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_highlight_box.visible = false
	_highlight_box.set_meta("ui_style_locked", true)
	# Cyan highlight box — Out There: Omega style
	_highlight_style = StyleBoxFlat.new()
	_highlight_style.bg_color     = Color(CYAN.r, CYAN.g, CYAN.b, 0.06)
	_highlight_style.border_color = Color(CYAN.r, CYAN.g, CYAN.b, 0.96)
	_highlight_style.set_border_width_all(2)
	_highlight_style.set_corner_radius_all(4)
	_highlight_box.add_theme_stylebox_override("panel", _highlight_style)
	$Root.add_child(_highlight_box)

	# Dashed guide line
	_guide_line = Line2D.new()
	_guide_line.visible = false
	_guide_line.width = 2.5
	_guide_line.default_color = Color(CYAN.r, CYAN.g, CYAN.b, 0.90)
	_guide_line.antialiased = true
	_guide_line.begin_cap_mode = Line2D.LINE_CAP_ROUND
	_guide_line.end_cap_mode   = Line2D.LINE_CAP_ROUND
	add_child(_guide_line)

	_guide_arrow = Polygon2D.new()
	_guide_arrow.visible = false
	_guide_arrow.color = Color(CYAN.r, CYAN.g, CYAN.b, 0.96)
	_guide_arrow.polygon = PackedVector2Array([
		Vector2(0, 0),
		Vector2(-18, -10),
		Vector2(-18, 10)
	])
	add_child(_guide_arrow)

	_guide_label = Label.new()
	_guide_label.visible = false
	_guide_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_guide_label.text = "Tap here"
	_guide_label.add_theme_font_size_override("font_size", 30)
	_guide_label.add_theme_color_override("font_color", Color(CYAN.r, CYAN.g, CYAN.b, 0.90))
	_guide_label.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.85))
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
	_off_course = false
	_current_state = state.duplicate(true)
	if state.is_empty():
		visible = false
		_hide_guide_overlay()
		return
	var skipped = bool(state.get("skipped", false))
	var step: Dictionary = state.get("current_step", {})
	_current_step = step.duplicate(true)
	if skipped:
		visible = false
		_hide_guide_overlay()
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
	var action_key = str(step.get("action_key", ""))
	action_label.text = Targeting.navigation_hint_for_action(action_key)
	progress_label.text = "Step %d/%d" % [min(current_idx + 1, max(total, 1)), max(total, 1)]
	practice_mining_button.visible = _step_supports_practice(step)
	call_deferred("_reposition_panel")
	call_deferred("_update_guidance_overlay")

func _reposition_panel() -> void:
	if not visible:
		return
	var viewport_rect := get_viewport().get_visible_rect()
	var panel_size = _panel_layout_size(viewport_rect)
	var blockers: Array[Rect2] = []
	_collect_blocking_rects(get_tree().root, blockers)
	var target_rect = Targeting.find_current_target_rect(_current_step, get_tree())
	if _has_rect(target_rect):
		blockers.append(target_rect)
	var best_overlap := INF
	var best_rect := Rect2(Vector2.ZERO, panel_size)
	for candidate in _candidate_rects(viewport_rect, panel_size, target_rect):
		var overlap := _rect_overlap_area(candidate, blockers)
		if overlap < best_overlap:
			best_overlap = overlap
			best_rect = candidate
	# Hide when a menu/screen is covering the viewport — the user can't act on
	# tutorial steps while another panel is open, so the overlay would only obstruct.
	var panel_area: float = panel_size.x * panel_size.y
	if best_overlap > panel_area * 0.15:
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
	var center_x := viewport_rect.position.x + (viewport_rect.size.x - size.x) * 0.5
	# On mobile landscape viewports (wider than 16:9), prefer a centred position.
	# The first candidate wins when overlap is equal, so centering is the default.
	var out: Array[Rect2] = []
	if viewport_rect.size.y > 0 and viewport_rect.size.x / viewport_rect.size.y > 1.85:
		out.append(Rect2(Vector2(center_x, bottom), size))  # centre-bottom preferred
		out.append(Rect2(Vector2(center_x, top), size))     # centre-top fallback
	out.append_array([
		Rect2(Vector2(left, top), size),
		Rect2(Vector2(right, top), size),
		Rect2(Vector2(left, bottom), size),
		Rect2(Vector2(right, bottom), size)
	])
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
	if _collapsed:
		return Vector2(max(PANEL_MIN_SIZE.x, min_size.x), min_size.y)
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
	_guide_target_node = Targeting.find_current_target(_current_step, get_tree())
	var target_rect = Targeting.build_target_rect(_guide_target_node)
	if not _has_rect(target_rect):
		_hide_guide_overlay()
		var action_key := str(_current_step.get("action_key", ""))
		if action_key != "" and action_label != null:
			action_label.text = Targeting.navigation_hint_for_action(action_key)
		return
	var action_key := str(_current_step.get("action_key", ""))
	var low_intensity = _is_low_intensity_action(action_key)
	if low_intensity:
		_set_active_flash_target(null)
	else:
		_set_active_flash_target(_guide_target_node)
	_guide_target_rect = target_rect
	_highlight_box.visible = true
	_highlight_box.position = target_rect.position - Vector2(HIGHLIGHT_PADDING, HIGHLIGHT_PADDING)
	_highlight_box.size = target_rect.size + Vector2(HIGHLIGHT_PADDING * 2.0, HIGHLIGHT_PADDING * 2.0)
	if low_intensity:
		_guide_line.visible = false
		_guide_arrow.visible = false
		_guide_label.visible = false
		return

	var target_center = target_rect.position + (target_rect.size * 0.5)
	_guide_source_point = target_center + Vector2(-240, -120)
	if panel.visible:
		var panel_rect = Rect2(panel.global_position, panel.size)
		_guide_source_point = _closest_point_on_rect(panel_rect, target_center)
	_guide_line.visible = true
	_guide_line.points = _dashed_points(_guide_source_point, target_center)

	var direction = (target_center - _guide_source_point).normalized()
	_guide_arrow.visible = true
	_guide_arrow.position = target_center
	_guide_arrow.rotation = direction.angle()

	_guide_label.visible = true
	_guide_label.text = "Click here ->"
	_guide_label.position = Vector2(
		clamp(target_rect.position.x - 160.0, 8.0, get_viewport().get_visible_rect().size.x - 200.0),
		max(target_rect.position.y - 36.0, 8.0)
	)

func _is_low_intensity_action(action_key: String) -> bool:
	return action_key in LOW_INTENSITY_ACTIONS

func _hide_guide_overlay() -> void:
	_set_active_flash_target(null)
	_highlight_box.visible = false
	_guide_line.visible = false
	_guide_arrow.visible = false
	_guide_label.visible = false
	_guide_target_rect = Rect2()
	_guide_target_node = null

func _animate_guidance_overlay() -> void:
	if not _guide_line or not _guide_arrow or not _guide_label:
		return
	if not _guide_line.visible:
		return
	var pulse: float = (sin(_pulse_elapsed * GUIDE_PULSE_SPEED) + 1.0) * 0.5
	var line_alpha: float = lerp(GUIDE_LINE_ALPHA_MIN, GUIDE_LINE_ALPHA_MAX, pulse)
	var cyan_line: Color = Color(CYAN.r, CYAN.g, CYAN.b, line_alpha)

	if _highlight_style:
		_highlight_style.bg_color = Color(CYAN.r, CYAN.g, CYAN.b,
			lerp(HIGHLIGHT_BG_ALPHA_MIN, HIGHLIGHT_BG_ALPHA_MAX, pulse))
		_highlight_style.border_color = Color(CYAN.r, CYAN.g, CYAN.b,
			lerp(HIGHLIGHT_BORDER_ALPHA_MIN, HIGHLIGHT_BORDER_ALPHA_MAX, pulse))
		var bw := int(round(2.0 + pulse * 1.5))
		_highlight_style.set_border_width_all(bw)

	_guide_line.default_color = cyan_line
	_guide_arrow.color = cyan_line
	_guide_label.modulate = Color(1, 1, 1, lerp(0.55, 1.0, pulse))

	if _has_rect(_guide_target_rect):
		var target_center := _guide_target_rect.position + (_guide_target_rect.size * 0.5)
		var direction := (target_center - _guide_source_point).normalized()
		var orthogonal := Vector2(-direction.y, direction.x)
		var sway := orthogonal * sin(_pulse_elapsed * GUIDE_PULSE_SPEED * 0.85) * GUIDE_ARROW_SWAY_PX
		var animated_source := _guide_source_point + sway
		# Build dashed points
		_guide_line.points = _dashed_points(animated_source, target_center)
		_guide_arrow.position = target_center
		_guide_arrow.rotation = (target_center - animated_source).angle()
	_apply_target_flash(pulse)


# Build a PackedVector2Array that represents a dashed line from start → end.
# Line2D draws each consecutive pair of points as a segment, so we alternate
# real dash segments with zero-length "gap" segments (duplicate points).
func _dashed_points(start: Vector2, end: Vector2) -> PackedVector2Array:
	var pts := PackedVector2Array()
	var dir := (end - start).normalized()
	var total := start.distance_to(end)
	var d := 0.0
	var on := true
	while d < total:
		var p := start + dir * d
		if on:
			pts.append(p)
			d += DASH_ON
			var p2: Vector2 = start + dir * minf(d, total)
			pts.append(p2)
			# Duplicate to start a "gap" (zero-length invisible segment)
			pts.append(p2)
		else:
			d += DASH_OFF
			var p2: Vector2 = start + dir * minf(d, total)
			# Duplicate at gap end to restart next dash segment
			pts.append(p2)
		on = !on
	return pts

func _set_active_flash_target(target: Node) -> void:
	var resolved_target = _resolve_flash_target(target)
	if resolved_target == _active_flash_target:
		return
	_clear_active_flash_target()
	if resolved_target == null:
		return
	_active_flash_target = resolved_target
	_active_flash_base_modulate = _active_flash_target.modulate

func _resolve_flash_target(target: Node) -> CanvasItem:
	if target == null:
		return null
	var candidate = target
	if candidate is CollisionShape2D:
		candidate = candidate.get_parent()
	if candidate is Area2D:
		var area_parent = candidate.get_parent()
		if area_parent is CanvasItem:
			return area_parent as CanvasItem
	if candidate is CanvasItem:
		return candidate as CanvasItem
	var cursor = candidate
	while cursor != null:
		cursor = cursor.get_parent()
		if cursor is CanvasItem:
			return cursor as CanvasItem
	return null

func _apply_target_flash(pulse: float) -> void:
	if _active_flash_target == null:
		return
	if not is_instance_valid(_active_flash_target):
		_active_flash_target = null
		return
	var blend = pulse * TARGET_FLASH_BLEND
	var base = _active_flash_base_modulate
	var accent = PanelStyle.ACCENT
	_active_flash_target.modulate = Color(
		lerp(base.r, accent.r, blend),
		lerp(base.g, accent.g, blend),
		lerp(base.b, accent.b, blend),
		base.a
	)

func _clear_active_flash_target() -> void:
	if _active_flash_target and is_instance_valid(_active_flash_target):
		_active_flash_target.modulate = _active_flash_base_modulate
	_active_flash_target = null
	_active_flash_base_modulate = Color(1, 1, 1, 1)

func _exit_tree() -> void:
	_clear_active_flash_target()

func _closest_point_on_rect(rect: Rect2, point: Vector2) -> Vector2:
	return Vector2(
		clamp(point.x, rect.position.x, rect.end.x),
		clamp(point.y, rect.position.y, rect.end.y)
	)

func _has_rect(rect: Rect2) -> bool:
	return rect.size.x > 0.0 and rect.size.y > 0.0

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
