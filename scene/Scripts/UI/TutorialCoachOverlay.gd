extends CanvasLayer
## Tutorial coach overlay — event-driven, game-state-aware.
##
## Visibility rules (in priority order):
##   1. Transit scenes (ascent/transit/return) → always hidden; they're cinematic.
##   2. Mining scene → hidden; the mining HUD coaches the player there.
##   3. Tutorial skipped or all steps done → hidden.
##   4. Mission returned, debrief pending → "Mission complete — open Debrief."
##   5. Mission in flight, player not in a step-relevant scene → "Rocket en route."
##   6. Otherwise → show the current tutorial step.
##
## Startup timing: TutorialController is added via call_deferred so it may not be
## in the tree when _ready() fires.  Two deferred refresh passes cover that window.

const PanelStyle     = preload("res://Scripts/UI/PanelStyle.gd")
const UILayout       = preload("res://Scripts/UI/UILayout.gd")
const RocketsManager = preload("res://Scripts/Utils/RocketsManager.gd")
const TutorialCoachTargeting = preload("res://Scripts/UI/TutorialCoachTargeting.gd")
const PreviewRouting = preload("res://Scripts/UI/NewMissionPreviewRouting.gd")

const TRANSIT_SCENES := ["rocket_ascent", "rocket_transit", "rocket_return"]
const MINING_SCENE   := "SidescrollMining"
const DEBRIEF_SCENE  := "mission_debrief_v2"

const CYAN  := Color(0.247, 0.663, 1.000, 1.0)
const AMBER := Color(0.961, 0.651, 0.137, 1.0)
const POINTER_ARROW_SIZE    := 24.0
const POINTER_TARGET_MARGIN := 12.0
const POINTER_MAX_LENGTH    := 170.0
const POINTER_MIN_LENGTH    := 84.0

@onready var panel:           PanelContainer = $Root/Panel
@onready var title_label:     Label          = $Root/Panel/Margin/VBox/Header/TitleLabel
@onready var stage_label:     Label          = $Root/Panel/Margin/VBox/Header/StageLabel
@onready var collapse_button: Button         = $Root/Panel/Margin/VBox/Header/CollapseButton
@onready var message_label:   Label          = $Root/Panel/Margin/VBox/MessageLabel
@onready var action_label:    Label          = $Root/Panel/Margin/VBox/ActionLabel
@onready var progress_label:  Label          = $Root/Panel/Margin/VBox/ProgressLabel
@onready var skip_button:     Button         = $Root/Panel/Margin/VBox/Buttons/SkipButton
@onready var practice_mining_button: Button  = $Root/Panel/Margin/VBox/Buttons/PracticeMiningButton
@onready var replay_mission_button:  Button  = $Root/Panel/Margin/VBox/Buttons/ReplayMissionButton
@onready var open_launchpad_button:  Button  = $Root/Panel/Margin/VBox/Buttons/OpenLaunchpadButton
@onready var go_to_debrief_button:   Button  = $Root/Panel/Margin/VBox/Buttons/GoToDebriefButton
@onready var resume_mission_button:  Button  = $Root/Panel/Margin/VBox/Buttons/ResumeMissionButton
@onready var _restart_btn:    Button         = $Root/Panel/Margin/VBox/Header/RestartBtn
@onready var _pointer_line:   Line2D         = $Root/TargetPointerLine
@onready var _pointer_head:   Polygon2D      = $Root/TargetPointerHead
@onready var _pointer_head2:  Polygon2D      = $Root/TargetPointerHead2
@onready var _pointer_head3:  Polygon2D      = $Root/TargetPointerHead3
@onready var _target_highlight: ReferenceRect = $Root/TargetHighlight

var _collapsed:      bool       = false
var _app_controller: Node       = null
var _current_state:  Dictionary = {}
var _current_step:   Dictionary = {}
var _layout_timer:   float      = 0.0
var _highlight_tween: Tween     = null

# ── Lifecycle ─────────────────────────────────────────────────────────────────

func _ready() -> void:
	layer = 70
	visible = false  # stay hidden until _display() evaluates the tutorial state
	$Root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	$Root.set_meta("tutorial_zone_exempt", true)
	panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	panel.set_meta("tutorial_zone_exempt", true)
	_apply_style()
	_configure_mouse_passthrough()
	_wire_buttons()
	_try_connect_app_controller()
	# Two deferred passes: first covers the common case where AppController is
	# already in the tree; second covers the deferred-add_child window where
	# TutorialController hasn't fired _ready() yet.
	call_deferred("_deferred_refresh_pass1")

func _try_connect_app_controller() -> void:
	var helper = preload("res://Scripts/Utils/AppControllerHelper.gd")
	var app = helper.get_instance()
	if app == null:
		return
	_app_controller = app
	if app.has_signal("tutorial_state_updated") and \
			not app.tutorial_state_updated.is_connected(_on_tutorial_state_updated):
		app.tutorial_state_updated.connect(_on_tutorial_state_updated)

func _deferred_refresh_pass1() -> void:
	_try_connect_app_controller()
	_pull_state_from_controller()
	await get_tree().process_frame
	_deferred_refresh_pass2()

func _deferred_refresh_pass2() -> void:
	_try_connect_app_controller()
	_pull_state_from_controller()

func _pull_state_from_controller() -> void:
	if _app_controller == null or not _app_controller.has_method("get_tutorial_state"):
		return
	var state: Dictionary = _app_controller.get_tutorial_state()
	if not state.is_empty():
		_on_tutorial_state_updated(state)

func _process(delta: float) -> void:
	_layout_timer += delta
	if _layout_timer < 0.15:
		return
	_layout_timer = 0.0
	if visible:
		_reposition_panel()
		_refresh_target_pointer()

# ── State update entry point ──────────────────────────────────────────────────

func _on_tutorial_state_updated(state: Dictionary) -> void:
	if state.is_empty():
		return
	_current_state = state.duplicate(true)
	_current_step  = (state.get("current_step", {}) as Dictionary).duplicate(true)
	_display()

func _display() -> void:
	var scene := _scene_basename()

	# Rule 1+2: cinematic / mining scenes handle their own coaching
	if scene in TRANSIT_SCENES or scene == MINING_SCENE:
		_hide()
		return

	# Rule 3: tutorial skipped or complete
	if bool(_current_state.get("skipped", false)) or _current_step.is_empty():
		_hide()
		return

	# Rule 4: mission returned, debrief pending (highest-priority positive state)
	if scene != DEBRIEF_SCENE:
		var returned := RocketsManager.get_returned_mission()
		if not returned.is_empty():
			_show_debrief_ready()
			return

	# Rule 5: mission in flight but player is not in a step-relevant scene
	var valid_scenes: Array = _current_step.get("valid_scenes", [])
	var in_valid_scene: bool = valid_scenes.is_empty() or scene in valid_scenes
	var is_inflight_step: bool = MINING_SCENE in valid_scenes
	if not in_valid_scene and not is_inflight_step and RocketsManager.get_missions().size() > 0:
		_show_inflight()
		return

	# Rule 6: normal step
	_show_step()

func _hide() -> void:
	visible = false
	_hide_pointers()

# ── Display modes ─────────────────────────────────────────────────────────────

func _show_step() -> void:
	visible = true
	var stage := int(_current_state.get("current_stage", 1))
	var idx   := int(_current_state.get("current_step_index", 0))
	var total := int(_current_state.get("total_steps", 1))

	title_label.text   = str(_current_step.get("title", "Mission Guidance"))
	stage_label.text   = "Mission %d" % stage
	stage_label.visible = true

	var msg := str(_current_step.get("message", ""))
	message_label.text    = msg
	message_label.visible = msg != "" and not _collapsed

	var hint := _action_hint(_current_step)
	action_label.text    = hint
	action_label.visible = hint != "" and not _collapsed

	progress_label.text    = "Step %d / %d" % [min(idx + 1, max(total, 1)), max(total, 1)]
	progress_label.visible = not _collapsed

	_update_buttons_for_step()
	call_deferred("_reposition_panel")
	call_deferred("_refresh_target_pointer")

func _show_debrief_ready() -> void:
	visible = true
	title_label.text      = "Mission complete"
	stage_label.text      = ""
	stage_label.visible   = false
	message_label.text    = "Your rocket is back. Open the Debrief to sell your cargo and collect payment."
	message_label.visible = not _collapsed
	action_label.text     = "→ Tap Debrief in the bottom bar"
	action_label.visible  = not _collapsed
	progress_label.visible = false
	_hide_all_ctas()
	if go_to_debrief_button:
		go_to_debrief_button.text    = "Open Debrief"
		go_to_debrief_button.visible = true
	_hide_pointers()
	call_deferred("_reposition_panel")

func _show_inflight() -> void:
	visible = true
	title_label.text      = "Mission in progress"
	stage_label.text      = ""
	stage_label.visible   = false
	var missions: Array   = RocketsManager.get_missions()
	var target_label      := _mission_target_label(missions[0] if not missions.is_empty() else {})
	message_label.text    = "Your rocket is heading to %s. It will return automatically when done." % target_label
	message_label.visible = not _collapsed
	action_label.text     = ""
	action_label.visible  = false
	progress_label.visible = false
	_hide_all_ctas()
	if resume_mission_button:
		resume_mission_button.text    = "Watch mission"
		resume_mission_button.visible = true
	_hide_pointers()
	call_deferred("_reposition_panel")

func _mission_target_label(mission: Dictionary) -> String:
	var label := str(mission.get("target_label", mission.get("target", ""))).strip_edges()
	if label == "" or label == "null":
		return "the target"
	return label

# ── Button logic ──────────────────────────────────────────────────────────────

func _update_buttons_for_step() -> void:
	_hide_all_ctas()
	var key   := str(_current_step.get("action_key", ""))
	var scene := _scene_basename()
	var on_base := scene == "earth_base_1"
	var started := bool(_current_state.get("current_mission_started", false))

	# Launchpad / Build CTAs when on earth base
	if on_base:
		match key:
			"open_launchpad", "accept_contractor_offer", "select_launch_target", \
			"create_rocket", "launch_rocket_from_earth":
				if RocketsManager.get_missions().is_empty() and open_launchpad_button:
					open_launchpad_button.text    = "Open New Mission"
					open_launchpad_button.visible = true
			"build_control_station":
				if open_launchpad_button:
					open_launchpad_button.text    = "Build Control Station"
					open_launchpad_button.visible = true
			"build_scanner_station":
				if open_launchpad_button:
					open_launchpad_button.text    = "Build Scanner Station"
					open_launchpad_button.visible = true

	# Debrief CTA
	if key == "resolve_mission_debrief" and not RocketsManager.get_returned_mission().is_empty():
		if go_to_debrief_button:
			go_to_debrief_button.text    = "Open Debrief"
			go_to_debrief_button.visible = true

	# Practice mining
	if key == "mine_target" and practice_mining_button:
		practice_mining_button.visible = true

	# Replay — only if no other CTA is showing and mission has started
	var any_cta := _any_cta_visible()
	if not any_cta and started and replay_mission_button:
		replay_mission_button.visible = true

func _any_cta_visible() -> bool:
	for btn: Button in [open_launchpad_button, go_to_debrief_button, resume_mission_button, practice_mining_button]:
		if btn and btn.visible:
			return true
	return false

func _hide_all_ctas() -> void:
	for btn in [open_launchpad_button, go_to_debrief_button, resume_mission_button,
			replay_mission_button, practice_mining_button]:
		if btn:
			(btn as Button).visible = false

# ── Action hints ──────────────────────────────────────────────────────────────

func _action_hint(step: Dictionary) -> String:
	var key   := str(step.get("action_key", ""))
	var scene := _scene_basename()
	var on_base := scene == "earth_base_1"
	match key:
		"open_launchpad":
			return "→ Tap New Mission in the bottom bar"
		"accept_contractor_offer":
			if on_base: return "→ Tap New Mission in the bottom bar"
			return "→ Pick a contractor and tap Lock Contract"
		"select_launch_target":
			if on_base: return "→ Tap New Mission in the bottom bar"
			return "→ Tap an asteroid on the map, then tap Proceed"
		"create_rocket":
			if on_base: return "→ Tap New Mission in the bottom bar"
			return "→ Tap Proceed in the Fabrication Bay"
		"launch_rocket_from_earth":
			if on_base: return "→ Tap New Mission in the bottom bar"
			return "→ Tap Launch Mission"
		"arrived_at_mining_site":
			return "→ Wait for your rocket to arrive"
		"mine_target":
			return "→ Hold FIRE to deploy the mining laser"
		"return_rocket_home":
			return "→ Tap Return Home when the order is filled"
		"resolve_mission_debrief":
			return "→ Sell cargo then tap Complete Mission"
		"build_control_station":
			return "→ Tap the Control Station pad on the base"
		"build_scanner_station":
			return "→ Tap the Scanner Station pad on the base"
		"classify_candidate":
			if on_base: return "→ Tap New Mission in the bottom bar"
			return "→ Tap Planet or Not a Planet"
		_:
			return ""

# ── Button wiring ─────────────────────────────────────────────────────────────

func _wire_buttons() -> void:
	if _restart_btn:
		_restart_btn.pressed.connect(_on_restart_pressed)
		_apply_pill_button(_restart_btn, false)
	if collapse_button:
		collapse_button.pressed.connect(_on_collapse_pressed)
	if skip_button:
		skip_button.hide()
	if practice_mining_button:
		practice_mining_button.pressed.connect(_on_practice_mining_pressed)
		_apply_pill_button(practice_mining_button, true)
	if replay_mission_button:
		replay_mission_button.pressed.connect(_on_replay_mission_pressed)
		_apply_pill_button(replay_mission_button, false)
	for btn in [open_launchpad_button, go_to_debrief_button, resume_mission_button]:
		if btn == null:
			continue
		(btn as Button).visible = false
		(btn as Button).mouse_filter = Control.MOUSE_FILTER_STOP
		_apply_pill_button(btn as Button, true)
	if open_launchpad_button:
		open_launchpad_button.pressed.connect(_on_open_launchpad_pressed)
	if go_to_debrief_button:
		go_to_debrief_button.pressed.connect(_on_go_to_debrief_pressed)
	if resume_mission_button:
		resume_mission_button.pressed.connect(_on_resume_mission_pressed)

func _on_collapse_pressed() -> void:
	_collapsed = not _collapsed
	collapse_button.text = "+" if _collapsed else "−"
	message_label.visible  = not _collapsed
	action_label.visible   = not _collapsed and action_label.text != ""
	progress_label.visible = not _collapsed
	$Root/Panel/Margin/VBox/Buttons.visible = not _collapsed

func _on_restart_pressed() -> void:
	if _app_controller and _app_controller.has_method("replay_tutorial_for_current_mission"):
		_app_controller.replay_tutorial_for_current_mission()

func _on_replay_mission_pressed() -> void:
	if _app_controller and _app_controller.has_method("replay_tutorial_for_current_mission"):
		_app_controller.replay_tutorial_for_current_mission()

func _on_practice_mining_pressed() -> void:
	preload("res://Scripts/Utils/AppControllerHelper.gd").open_mining_practice_panel("tutorial_overlay")

func _on_open_launchpad_pressed() -> void:
	var key := str(_current_step.get("action_key", ""))
	var helper = preload("res://Scripts/Utils/AppControllerHelper.gd")
	if key == "build_control_station":
		_trigger_build_flow("control_station")
		return
	if key == "build_scanner_station":
		_trigger_build_flow("scanner_station")
		return
	helper.record_tutorial_action("open_launchpad")
	var tree := get_tree()
	if tree == null:
		return
	var sm := tree.get_first_node_in_group("scene_manager")
	if sm and sm.has_method("change_to_scene"):
		sm.change_to_scene("res://Scenes/Earth/earth_launchpad.tscn")
	else:
		tree.change_scene_to_file("res://Scenes/Earth/earth_launchpad.tscn")

func _trigger_build_flow(structure: String) -> void:
	var tree := get_tree()
	if tree == null or tree.current_scene == null:
		return
	var scene := tree.current_scene
	if scene.has_method("_start_guided_build_flow"):
		scene.call("_start_guided_build_flow", structure)
	elif structure == "control_station" and scene.has_method("_on_build_control_station_pressed"):
		scene.call("_on_build_control_station_pressed")
	elif structure == "scanner_station" and scene.has_method("_on_build_scanner_station_pressed"):
		scene.call("_on_build_scanner_station_pressed")

func _on_go_to_debrief_pressed() -> void:
	var tree := get_tree()
	if tree == null:
		return
	var sm := tree.get_first_node_in_group("scene_manager")
	if sm and sm.has_method("change_to_scene"):
		sm.change_to_scene("res://Scenes/Earth/mission_debrief_v2.tscn")
	else:
		tree.change_scene_to_file("res://Scenes/Earth/mission_debrief_v2.tscn")

func _on_resume_mission_pressed() -> void:
	var missions: Array = RocketsManager.get_missions()
	if missions.is_empty():
		return
	var m: Dictionary = missions[0]
	var rocket_id := str(m.get("rocket_id", ""))
	var target_id := str(m.get("target", ""))
	var target_type := str(m.get("target_type", "asteroid"))
	if rocket_id == "" or target_id == "":
		return
	RocketsManager.set_preview_target(target_id, target_id, target_type, rocket_id)
	RocketsManager.mark_returned_if_due(rocket_id)
	var status: String = RocketsManager.get_rocket_status(rocket_id)
	var arrived: bool = RocketsManager.has_arrived(rocket_id, target_id)
	var scene_path := PreviewRouting.resolve_scene_path(status, arrived)
	var tree := get_tree()
	if tree == null:
		return
	var sm := tree.get_first_node_in_group("scene_manager")
	if sm and sm.has_method("change_to_scene"):
		sm.change_to_scene(scene_path)
	else:
		tree.change_scene_to_file(scene_path)

# ── Positioning ───────────────────────────────────────────────────────────────

func _reposition_panel() -> void:
	if not visible:
		return
	var vp := get_viewport()
	if vp == null:
		return
	var vp_size := vp.get_visible_rect().size
	var zone := UILayout.zone(UILayout.Zone.TUTORIAL_COACH, vp_size)
	panel.position = zone.position
	panel.size     = zone.size

# ── Pointer / highlight ───────────────────────────────────────────────────────

func _refresh_target_pointer() -> void:
	if _pointer_line == null or _pointer_head == null:
		return
	if not visible or _collapsed or _current_step.is_empty():
		_hide_pointers()
		return
	var tree := get_tree()
	if tree == null:
		_hide_pointers()
		return
	var target_rect: Rect2 = TutorialCoachTargeting.find_current_target_rect(_current_step, tree)
	if target_rect.size == Vector2.ZERO:
		_hide_pointers()
		return
	_update_target_highlight(target_rect)
	var panel_rect := panel.get_global_rect()
	var from := panel_rect.get_center()
	var target_center := target_rect.get_center()
	var direction := (target_center - from).normalized()
	if direction == Vector2.ZERO:
		direction = Vector2.RIGHT
	var panel_exit := _intersect_line_with_rect(from, direction, panel_rect.grow(4.0))
	if panel_exit != Vector2.INF:
		from = panel_exit
	var target_entry := _intersect_line_with_rect(target_center, -direction, target_rect.grow(POINTER_TARGET_MARGIN))
	var to := target_entry if target_entry != Vector2.INF else target_center
	var line_len := clampf(from.distance_to(to), POINTER_MIN_LENGTH, POINTER_MAX_LENGTH)
	from = to - (direction * line_len)
	_pointer_line.clear_points()
	_pointer_line.add_point(from)
	_pointer_line.add_point(to)
	_pointer_line.visible = true
	_update_pointer_head(to, direction)

func _update_target_highlight(target_rect: Rect2) -> void:
	if _target_highlight == null:
		return
	var padded := target_rect.grow(8.0)
	_target_highlight.position = padded.position
	_target_highlight.size     = padded.size
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
		func(a: float) -> void: _target_highlight.border_color = Color(CYAN.r, CYAN.g, CYAN.b, a),
		0.42, 0.95, 0.75
	).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	_highlight_tween.tween_method(
		func(a: float) -> void: _target_highlight.border_color = Color(CYAN.r, CYAN.g, CYAN.b, a),
		0.95, 0.42, 0.75
	).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)

func _update_pointer_head(tip: Vector2, direction: Vector2) -> void:
	var dir := direction.normalized()
	if dir == Vector2.ZERO:
		dir = Vector2.RIGHT
	var side := dir.orthogonal()
	var step := POINTER_ARROW_SIZE * 2.2
	for i in range(3):
		var head: Polygon2D = [_pointer_head, _pointer_head2, _pointer_head3][i]
		if head == null:
			continue
		var t := tip - dir * (step * i)
		var base := t - dir * POINTER_ARROW_SIZE
		head.polygon = PackedVector2Array([
			t,
			base + side * (POINTER_ARROW_SIZE * 0.5),
			base - side * (POINTER_ARROW_SIZE * 0.5),
		])
		head.visible = true

func _hide_pointers() -> void:
	if _pointer_line:
		_pointer_line.visible = false
		_pointer_line.clear_points()
	for head in [_pointer_head2, _pointer_head3]:
		if head:
			head.visible = false
	if _pointer_head:
		_pointer_head.visible = false
	if _target_highlight:
		_target_highlight.visible = false
	if _highlight_tween != null:
		_highlight_tween.kill()
		_highlight_tween = null

func _intersect_line_with_rect(origin: Vector2, direction: Vector2, rect: Rect2) -> Vector2:
	var dir := direction.normalized()
	if dir == Vector2.ZERO:
		return Vector2.INF
	var best_t := INF
	var best_point := Vector2.INF
	var edges := [
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
		var t     := (point - origin).dot(dir)
		if t > 0.0 and t < best_t:
			best_t     = t
			best_point = point
	return best_point

# ── Style ─────────────────────────────────────────────────────────────────────

func _apply_style() -> void:
	panel.set_meta("ui_style_locked", true)
	var s := StyleBoxFlat.new()
	s.bg_color          = Color(0.027, 0.047, 0.086, 0.94)
	s.border_color      = CYAN
	s.set_border_width_all(2)
	s.set_corner_radius_all(10)
	s.content_margin_left   = 20
	s.content_margin_right  = 20
	s.content_margin_top    = 16
	s.content_margin_bottom = 16
	panel.add_theme_stylebox_override("panel", s)

	# Header
	title_label.add_theme_color_override("font_color", Color(0.902, 0.937, 1.0))
	title_label.add_theme_font_size_override("font_size", 22)
	stage_label.add_theme_color_override("font_color", CYAN)
	stage_label.add_theme_font_size_override("font_size", 16)

	# Body
	message_label.add_theme_color_override("font_color", Color(0.84, 0.88, 0.96))
	message_label.add_theme_font_size_override("font_size", 21)
	message_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART

	# Action hint
	action_label.add_theme_color_override("font_color", AMBER)
	action_label.add_theme_font_size_override("font_size", 19)
	action_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART

	# Progress
	progress_label.add_theme_color_override("font_color", Color(0.50, 0.58, 0.72))
	progress_label.add_theme_font_size_override("font_size", 16)

	_apply_pill_button(collapse_button, false)
	collapse_button.custom_minimum_size = Vector2(48, 34)

func _apply_pill_button(btn: Button, primary: bool) -> void:
	if btn == null:
		return
	btn.set_meta("ui_style_locked", true)
	var col := AMBER if primary else CYAN
	var normal := StyleBoxFlat.new()
	normal.bg_color    = Color(0, 0, 0, 0)
	normal.border_color = col
	normal.set_border_width_all(1)
	normal.set_corner_radius_all(28)
	normal.content_margin_left   = 16
	normal.content_margin_right  = 16
	normal.content_margin_top    = 8
	normal.content_margin_bottom = 8
	var hover: StyleBoxFlat    = normal.duplicate()
	hover.bg_color   = Color(col.r, col.g, col.b, 0.14)
	var pressed: StyleBoxFlat  = normal.duplicate()
	pressed.bg_color = Color(col.r, col.g, col.b, 0.24)
	btn.add_theme_stylebox_override("normal",  normal)
	btn.add_theme_stylebox_override("hover",   hover)
	btn.add_theme_stylebox_override("pressed", pressed)
	btn.add_theme_stylebox_override("focus",   hover)
	btn.add_theme_color_override("font_color",         col)
	btn.add_theme_color_override("font_hover_color",   col)
	btn.add_theme_color_override("font_pressed_color", col)
	btn.add_theme_font_size_override("font_size", 19)

func _configure_mouse_passthrough() -> void:
	for node_path in ["$Root/Panel/Margin", "$Root/Panel/Margin/VBox",
			"$Root/Panel/Margin/VBox/Header"]:
		var n: Node = get_node_or_null(node_path)
		if n is Control:
			(n as Control).mouse_filter = Control.MOUSE_FILTER_IGNORE
	for lbl in [title_label, stage_label, message_label, action_label, progress_label]:
		if lbl:
			lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var btns_row := $Root/Panel/Margin/VBox/Buttons
	if btns_row:
		(btns_row as Control).mouse_filter = Control.MOUSE_FILTER_IGNORE
	for btn in [_restart_btn, collapse_button, skip_button, practice_mining_button,
			replay_mission_button, open_launchpad_button, go_to_debrief_button, resume_mission_button]:
		if btn:
			(btn as Button).mouse_filter = Control.MOUSE_FILTER_STOP

# ── Helpers ───────────────────────────────────────────────────────────────────

func _scene_basename() -> String:
	var tree := get_tree()
	if tree == null or tree.current_scene == null:
		return ""
	return tree.current_scene.scene_file_path.get_file().get_basename()

## Called by SidescrollMining and MiningPracticePanel after they restore visibility.
func _refresh() -> void:
	_pull_state_from_controller()

## Backward-compat alias used by tests and external callers.
func _build_control_station_from_current_scene() -> void:
	_trigger_build_flow("control_station")
