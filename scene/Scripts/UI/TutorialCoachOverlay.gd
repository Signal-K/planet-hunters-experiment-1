extends CanvasLayer
class_name TutorialCoachOverlay

signal cta_pressed(step_id: int)
signal skip_pressed()

var _current_step_id: int = 0
var _tc_connected: bool = false

@onready var dimmer: ColorRect          = $Dimmer
@onready var spotlight_mask: ColorRect  = $SpotlightMask
@onready var spotlight_border: ColorRect= $SpotlightBorder
@onready var coach_card: PanelContainer = $CoachCard
@onready var title_label: Label         = $CoachCard/VBox/TitleLabel
@onready var body_label: Label          = $CoachCard/VBox/BodyLabel
# StepCounter lives inside HeaderInfo (child of HeaderRow)
@onready var step_counter: Label        = $CoachCard/VBox/HeaderRow/HeaderInfo/StepCounter
@onready var cta_button: Button         = $CoachCard/VBox/ActionsRow/CTAButton
@onready var skip_button: Button        = $CoachCard/VBox/ActionsRow/SkipButton
@onready var dots_row: HBoxContainer    = $CoachCard/VBox/DotsRow
@onready var pointer_triangle: ColorRect= $PointerTriangle

# Keep in sync with M1_STEPS count in TutorialController
const TOTAL_STEPS := 11

func _ready() -> void:
	cta_button.pressed.connect(_on_cta_pressed)
	skip_button.pressed.connect(_on_skip_pressed)
	visible = false

func _process(_delta: float) -> void:
	if _tc_connected:
		return
	_try_connect_to_tutorial_controller()

func _try_connect_to_tutorial_controller() -> void:
	var tc := _find_tc()
	if tc == null:
		return
	# Connect state change signal
	if tc.has_signal("tutorial_state_updated"):
		if not tc.tutorial_state_updated.is_connected(_on_tutorial_state_updated):
			tc.tutorial_state_updated.connect(_on_tutorial_state_updated)
	_tc_connected = true
	set_process(false)

	# Show the current step immediately
	if bool(tc.tutorial_active):
		var step: Dictionary = tc.current_step()
		show_step(step)

# ── Public API ────────────────────────────────────────────────────────────
func show_step(step: Dictionary) -> void:
	if step.is_empty():
		visible = false
		return

	_current_step_id = step.get("id", 0)
	title_label.text = step.get("title", "")
	body_label.text  = step.get("body", "")
	cta_button.text  = "  %s  ›" % step.get("cta", "Continue").to_upper()
	step_counter.text = "%d / %d" % [_current_step_id, TOTAL_STEPS]

	_update_dots(_current_step_id)
	_position_spotlight(step.get("spot", null))
	_position_card(step.get("anchor", "bottom"))

	visible = true
	_animate_in()

func hide_overlay() -> void:
	visible = false

# ── Internals ─────────────────────────────────────────────────────────────
func _find_tc() -> Node:
	var root := get_tree().root
	var tc := root.get_node_or_null("TutorialController")
	if tc:
		return tc
	var ac := root.get_node_or_null("AppController")
	if ac and "_tutorial_controller" in ac:
		return ac._tutorial_controller
	return null

func _position_spotlight(spot) -> void:
	if spot == null:
		spotlight_mask.visible  = false
		spotlight_border.visible = false
		pointer_triangle.visible = false
		dimmer.color = Color(0.012, 0.024, 0.047, 0.55)
		return

	# Scale spotlight from 402px prototype coords to 1080px Godot canvas
	var scale := 1080.0 / 402.0
	var sx := float(spot.get("x", 0)) * scale
	var sy := float(spot.get("y", 0)) * scale
	var sw := float(spot.get("w", 64)) * scale
	var sh := float(spot.get("h", 64)) * scale

	spotlight_mask.visible   = true
	spotlight_border.visible = true
	spotlight_mask.position  = Vector2(sx, sy)
	spotlight_mask.size      = Vector2(sw, sh)
	spotlight_border.position = Vector2(sx - 3, sy - 3)
	spotlight_border.size     = Vector2(sw + 6, sh + 6)

	# Pointer triangle: show below card if anchor=bottom, above if anchor=top
	pointer_triangle.visible = true
	dimmer.color = Color(0.012, 0.024, 0.047, 0.78)

func _position_card(anchor: String) -> void:
	var viewport_size := get_viewport().get_visible_rect().size
	var margin := 28.0
	var rail_width := clampf(viewport_size.x * 0.46, 360.0, 520.0)
	coach_card.anchor_left  = 1.0
	coach_card.anchor_right = 1.0
	coach_card.offset_left = -rail_width - margin
	coach_card.offset_right = -margin
	match anchor:
		"top":
			coach_card.anchor_top    = 0.0
			coach_card.anchor_bottom = 0.0
			coach_card.offset_top    = 130
			coach_card.offset_bottom = 560
		"center":
			coach_card.anchor_top    = 0.5
			coach_card.anchor_bottom = 0.5
			coach_card.offset_top    = -240
			coach_card.offset_bottom = 240
		_: # "bottom"
			coach_card.anchor_top    = 0.0
			coach_card.anchor_bottom = 0.0
			coach_card.offset_top    = 220
			coach_card.offset_bottom = 700

func _update_dots(active_id: int) -> void:
	for child in dots_row.get_children():
		child.queue_free()
	for i in range(1, TOTAL_STEPS + 1):
		var dot := ColorRect.new()
		dot.custom_minimum_size = Vector2(20 if i == active_id else 8, 8)
		if i == active_id:
			dot.color = Color(0.961, 0.651, 0.137)   # amber — current
		elif i < active_id:
			dot.color = Color(0.224, 0.827, 0.416)   # green — done
		else:
			dot.color = Color(0.365, 0.451, 0.565, 0.5)  # dim — upcoming
		dots_row.add_child(dot)

func _animate_in() -> void:
	coach_card.modulate.a = 0.0
	var tween := create_tween()
	tween.tween_property(coach_card, "modulate:a", 1.0, 0.22)

# ── Signal handlers ───────────────────────────────────────────────────────
func _on_tutorial_state_updated(state: Dictionary) -> void:
	if not bool(state.get("tutorial_active", true)):
		hide_overlay()
		return
	var tc := _find_tc()
	if tc == null:
		return
	var step: Dictionary = tc.current_step()
	# Don't re-animate if the same step is already showing
	if visible and not step.is_empty() and step.get("id", -1) == _current_step_id:
		return
	show_step(step)

func _on_cta_pressed() -> void:
	emit_signal("cta_pressed", _current_step_id)
	var tc := _find_tc()
	# Capture the step before it gets cleared, then perform the action
	# (action may change the screen and complete the step itself), then
	# ensure the step is marked done.
	var step: Dictionary = tc.current_step() if tc else {}
	_perform_step_action(step)
	# complete_step is idempotent — safe to call even if the action already did it
	if tc and tc.has_method("complete_step"):
		tc.complete_step(_current_step_id)

func _on_skip_pressed() -> void:
	emit_signal("skip_pressed")
	var tc := _find_tc()
	if tc and tc.has_method("skip_tutorial"):
		tc.skip_tutorial()
	hide_overlay()

# ── Step actions — each CTA performs the same action as the real button ───
func _perform_step_action(step: Dictionary) -> void:
	var screen := str(step.get("screen", ""))
	var cta    := str(step.get("cta", ""))

	match screen:
		"hub":
			var home := _find_node("Home")
			if "Build" in cta:
				# Open build mode (also sets tc.set_screen("build_mode"))
				if home and home.has_method("_open_build_mode"):
					home._open_build_mode()
			elif "Mission" in cta:
				# Navigate to LaunchWizard
				if ResourceLoader.exists("res://Scenes/UI/LaunchWizard.tscn"):
					get_tree().change_scene_to_file("res://Scenes/UI/LaunchWizard.tscn")

		"build_mode":
			# Place the Launchpad in the center slot
			var home := _find_node("Home")
			if home and home.has_method("_place_structure"):
				home._place_structure("launchpad")
			# _place_structure → _close_build_mode → tc.set_screen("hub")

		"missions", "targets", "fab":
			# LaunchWizard handles its own step; calling _on_cta() also
			# updates the tutorial screen for us via _show_step().
			var lw := _find_node("LaunchWizard")
			if lw and lw.has_method("_on_cta"):
				lw._on_cta()

		"mining":
			# Mining scene is a stub; nothing to do yet.
			pass

		"debrief":
			var debrief := _find_node("MissionDebrief")
			if debrief and debrief.has_method("_on_return"):
				debrief._on_return()

func _find_node(scene_root_name: String) -> Node:
	return get_tree().root.get_node_or_null(scene_root_name)
