extends CanvasLayer
## Tutorial coach overlay — Landnam portrait design.
##
## Two display modes, matching the tutorial.jsx prototype:
##   POINT: bottom floating card (amber border) for steps with real UI actions.
##   INFO:  top floating card  (cyan border)   for status messages and info steps.
##
## Visibility rules (in priority order):
##   1. Transit scenes (ascent/transit/return) → always hidden.
##   2. Mining scene → hidden (mining HUD coaches the player there).
##   3. Tutorial skipped or all steps done → hidden.
##   4. Mission returned, debrief pending → INFO card "Mission complete / Open Debrief".
##   5. Mission in flight, not in a step-relevant scene → INFO card "Rocket en route".
##   6. Otherwise → POINT card for the current tutorial step.

const PanelStyle     = preload("res://Scripts/UI/PanelStyle.gd")
const DS             = preload("res://Scripts/UI/DS.gd")
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

# ── PointBar (POINT mode) ─────────────────────────────────────────────────────
@onready var _point_card:  PanelContainer = $Root/PointBar
@onready var _pb_title:    Label          = $Root/PointBar/PBMargin/PBRow/PBText/PBTitle
@onready var _pb_action:   Label          = $Root/PointBar/PBMargin/PBRow/PBText/PBAction
@onready var _pb_dots:     HBoxContainer  = $Root/PointBar/PBMargin/PBRow/PBText/PBDots
@onready var _pb_skip:     Button         = $Root/PointBar/PBMargin/PBRow/PBSkip
@onready var _pb_avatar:   Panel          = $Root/PointBar/PBMargin/PBRow/PBAvatar

# ── CoachCard (INFO mode) ─────────────────────────────────────────────────────
@onready var _coach_card:      PanelContainer = $Root/CoachCard
@onready var _cc_step_counter: Label          = $Root/CoachCard/CCMargin/CCVBox/CCHeader/CCHeaderText/CCStepCounter
@onready var _cc_title:        Label          = $Root/CoachCard/CCMargin/CCVBox/CCTitle
@onready var _cc_body:         Label          = $Root/CoachCard/CCMargin/CCVBox/CCBody
@onready var _cc_dots:         HBoxContainer  = $Root/CoachCard/CCMargin/CCVBox/CCDots
@onready var _cc_skip:         Button         = $Root/CoachCard/CCMargin/CCVBox/CCButtonRow/CCSkip
@onready var _cc_cta:          Button         = $Root/CoachCard/CCMargin/CCVBox/CCButtonRow/CCCta
@onready var _cc_avatar:       Panel          = $Root/CoachCard/CCMargin/CCVBox/CCHeader/CCAvatar
@onready var _dimmer:          ColorRect      = $Root/Dimmer

# ── Pointer / highlight ───────────────────────────────────────────────────────
@onready var _pointer_line:     Line2D       = $Root/TargetPointerLine
@onready var _pointer_head:     Polygon2D    = $Root/TargetPointerHead
@onready var _pointer_head2:    Polygon2D    = $Root/TargetPointerHead2
@onready var _pointer_head3:    Polygon2D    = $Root/TargetPointerHead3
@onready var _target_highlight: ReferenceRect = $Root/TargetHighlight

var _app_controller: Node       = null
var _current_state:  Dictionary = {}
var _current_step:   Dictionary = {}
var _layout_timer:   float      = 0.0
var _highlight_tween: Tween     = null
var _bob_tweens:      Array     = []
var _cta_action: String         = ""   # what CCCta does when pressed

# ── Lifecycle ─────────────────────────────────────────────────────────────────

func _ready() -> void:
	layer = 70
	visible = false
	$Root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	$Root.set_meta("tutorial_zone_exempt", true)
	_wire_buttons()
	var viewport := get_viewport()
	if viewport and not viewport.size_changed.is_connected(_apply_layout):
		viewport.size_changed.connect(_apply_layout)
	_try_connect_app_controller()
	call_deferred("_apply_layout")
	call_deferred("_deferred_refresh_pass1")
	call_deferred("_start_coach_bob")

func _apply_layout() -> void:
	var viewport_node := get_viewport()
	var viewport := viewport_node.get_visible_rect().size if viewport_node else Vector2.ZERO
	if viewport == Vector2.ZERO or _coach_card == null:
		return
	if UILayout.is_portrait(viewport):
		_coach_card.set_anchor_and_offset(SIDE_LEFT, 0.0, 28.0)
		_coach_card.set_anchor_and_offset(SIDE_TOP, 0.0, 80.0)
		_coach_card.set_anchor_and_offset(SIDE_RIGHT, 1.0, -28.0)
		_coach_card.set_anchor_and_offset(SIDE_BOTTOM, 0.0, 460.0)
	else:
		UILayout.place(_coach_card, UILayout.zone(UILayout.Zone.TUTORIAL_COACH, viewport))

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

	if scene in TRANSIT_SCENES or scene == MINING_SCENE:
		_hide()
		return

	if bool(_current_state.get("skipped", false)) or _current_step.is_empty():
		_hide()
		return

	if scene != DEBRIEF_SCENE:
		var returned := RocketsManager.get_returned_mission()
		if not returned.is_empty():
			_show_debrief_ready()
			return

	var valid_scenes: Array = _current_step.get("valid_scenes", [])
	var in_valid_scene: bool = valid_scenes.is_empty() or scene in valid_scenes
	var is_inflight_step: bool = MINING_SCENE in valid_scenes
	if not in_valid_scene and not is_inflight_step and RocketsManager.get_missions().size() > 0:
		_show_inflight()
		return

	_show_step()

func _hide() -> void:
	visible = false
	_hide_pointers()
	_point_card.visible = false
	_coach_card.visible = false
	_dimmer.visible = false

# ── Display modes ─────────────────────────────────────────────────────────────

func _show_step() -> void:
	visible = true
	var idx   := int(_current_state.get("current_step_index", 0))
	var total := int(_current_state.get("total_steps", 1))

	var title := str(_current_step.get("title", "Mission Guidance"))
	var hint  := _action_hint(_current_step)

	# Show POINT card at bottom
	_point_card.visible  = true
	_coach_card.visible  = false
	_dimmer.visible      = false

	_pb_title.text  = title
	_pb_action.text = "→ " + hint if hint != "" else ""
	_pb_action.visible = hint != ""
	_update_dots(_pb_dots, idx, total)

	call_deferred("_refresh_target_pointer")

func _show_debrief_ready() -> void:
	visible = true
	_point_card.visible = false
	_coach_card.visible = true
	_dimmer.visible     = true

	_cc_step_counter.text = ""
	_cc_title.text = "Mission complete"
	_cc_body.text  = "Your rocket is back. Open the Debrief to sell cargo and collect payment."
	_update_dots(_cc_dots, 0, 0)
	_cc_skip.visible = false
	_cc_cta.text     = "Open Debrief"
	_cta_action      = "debrief"
	_hide_pointers()

func _show_inflight() -> void:
	visible = true
	_point_card.visible = false
	_coach_card.visible = true
	_dimmer.visible     = false

	_cc_step_counter.text = ""
	var missions: Array = RocketsManager.get_missions()
	var target_label := _mission_target_label(missions[0] if not missions.is_empty() else {})
	_cc_title.text = "Mission in Progress"
	_cc_body.text  = "Your rocket is heading to %s. It will return when done." % target_label
	_update_dots(_cc_dots, 0, 0)
	_cc_skip.visible = false
	_cc_cta.text     = "Watch Mission"
	_cta_action      = "watch"
	_hide_pointers()

func _mission_target_label(mission: Dictionary) -> String:
	var label := str(mission.get("target_label", mission.get("target", ""))).strip_edges()
	if label == "" or label == "null":
		return "the target"
	return label

# ── Progress dots ─────────────────────────────────────────────────────────────

func _update_dots(container: HBoxContainer, current_idx: int, total: int) -> void:
	for child in container.get_children():
		child.queue_free()
	if total <= 0:
		return
	for i in range(total):
		var dot := Panel.new()
		var s := StyleBoxFlat.new()
		s.set_corner_radius_all(999)
		if i < current_idx:
			# completed — green
			dot.custom_minimum_size = Vector2(6, 6)
			s.bg_color = Color(0.224, 0.827, 0.416, 1.0)
		elif i == current_idx:
			# active — amber, wider pill
			dot.custom_minimum_size = Vector2(16, 6)
			s.bg_color = Color(0.961, 0.651, 0.137, 1.0)
		else:
			# future — ghost
			dot.custom_minimum_size = Vector2(6, 6)
			s.bg_color = Color(0.529, 0.812, 0.980, 0.25)
		dot.add_theme_stylebox_override("panel", s)
		dot.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		container.add_child(dot)

# ── Action hints ──────────────────────────────────────────────────────────────

func _action_hint(step: Dictionary) -> String:
	var key   := str(step.get("action_key", ""))
	var scene := _scene_basename()
	var on_base := scene == "earth_base_1"
	match key:
		"open_launchpad":
			return "Tap New Mission in the bottom bar"
		"accept_contractor_offer":
			if on_base: return "Tap New Mission in the bottom bar"
			return "Pick a contractor and tap Lock Contract"
		"select_launch_target":
			if on_base: return "Tap New Mission in the bottom bar"
			return "Tap an asteroid on the map, then tap Proceed"
		"create_rocket":
			if on_base: return "Tap New Mission in the bottom bar"
			return "Tap Proceed in the Fabrication Bay"
		"launch_rocket_from_earth":
			if on_base: return "Tap New Mission in the bottom bar"
			return "Tap Launch Mission"
		"mine_target":
			return "Mine the ore in the asteroid"
		"return_rocket_home":
			return "Tap Return Home"
		"arrived_at_mining_site":
			return "Tap the ore deposits"
		"resolve_mission_debrief":
			return "Open the Debrief and collect payment"
		"build_control_station":
			return "Tap Build in the nav menu"
		"build_scanner_station":
			return "Tap Build in the nav menu"
		_:
			return ""

# ── Button wiring ─────────────────────────────────────────────────────────────

func _wire_buttons() -> void:
	if _pb_skip:
		_pb_skip.pressed.connect(_on_skip_pressed)
	if _cc_skip:
		_cc_skip.pressed.connect(_on_skip_pressed)
	if _cc_cta:
		_cc_cta.pressed.connect(_on_cta_pressed)

func _on_skip_pressed() -> void:
	if _app_controller and _app_controller.has_method("skip_tutorial"):
		_app_controller.skip_tutorial()
	else:
		_hide()

func _on_cta_pressed() -> void:
	match _cta_action:
		"debrief":
			_on_go_to_debrief_pressed()
		"watch":
			_on_resume_mission_pressed()
		"launchpad":
			_on_open_launchpad_pressed()
		"build_control_station":
			_trigger_build_flow("control_station")
		"build_scanner_station":
			_trigger_build_flow("scanner_station")
		"gotit":
			_hide()

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

# ── Pointer / highlight ───────────────────────────────────────────────────────

func _refresh_target_pointer() -> void:
	if _pointer_line == null or _pointer_head == null:
		return
	if not visible or _current_step.is_empty():
		_hide_pointers()
		return
	# Only show pointer in POINT mode
	if not _point_card.visible:
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
	var card_rect := _point_card.get_global_rect()
	var from := card_rect.get_center()
	var target_center := target_rect.get_center()
	var direction := (target_center - from).normalized()
	if direction == Vector2.ZERO:
		direction = Vector2.RIGHT
	var card_exit := _intersect_line_with_rect(from, direction, card_rect.grow(4.0))
	if card_exit != Vector2.INF:
		from = card_exit
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
		func(a: float) -> void: _target_highlight.border_color = Color(AMBER.r, AMBER.g, AMBER.b, a),
		0.42, 0.95, 0.75
	).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	_highlight_tween.tween_method(
		func(a: float) -> void: _target_highlight.border_color = Color(AMBER.r, AMBER.g, AMBER.b, a),
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
	for head in [_pointer_head, _pointer_head2, _pointer_head3]:
		if head:
			head.visible = false
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
		[rect.end, rect.end - Vector2(rect.size.x, 0)],
		[rect.end - Vector2(rect.size.x, 0), rect.position],
	]
	for edge in edges:
		var p1: Vector2 = edge[0]
		var p2: Vector2 = edge[1]
		var d2 := p2 - p1
		var denom := dir.x * d2.y - dir.y * d2.x
		if abs(denom) < 1e-6:
			continue
		var diff := p1 - origin
		var t := (diff.x * d2.y - diff.y * d2.x) / denom
		var s := (diff.x * dir.y - diff.y * dir.x) / denom
		if t > 0.0 and t < best_t and s >= 0.0 and s <= 1.0:
			best_t     = t
			best_point = origin + dir * t
	return best_point

# ── Coach bob animation (±2 px Y, 1.2 s loop, matches design spec) ───────────

func _start_coach_bob() -> void:
	for t in _bob_tweens:
		if t != null:
			t.kill()
	_bob_tweens.clear()
	if _pb_avatar != null:
		_bob_tweens.append(_make_bob_tween(_pb_avatar))
	if _cc_avatar != null:
		_bob_tweens.append(_make_bob_tween(_cc_avatar))

func _make_bob_tween(av: Control) -> Tween:
	var base_y: float = av.position.y
	var tw := create_tween()
	tw.set_loops()
	tw.tween_method(
		func(y: float) -> void: av.position.y = y,
		base_y, base_y - 2.0, 0.6
	).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	tw.tween_method(
		func(y: float) -> void: av.position.y = y,
		base_y - 2.0, base_y, 0.6
	).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	return tw

# ── Helpers ───────────────────────────────────────────────────────────────────

func _scene_basename() -> String:
	var tree := get_tree()
	if tree == null or tree.current_scene == null:
		return ""
	return tree.current_scene.scene_file_path.get_file().get_basename()

## Called by SidescrollMining and MiningPracticePanel after they restore visibility.
func _refresh() -> void:
	_display()
