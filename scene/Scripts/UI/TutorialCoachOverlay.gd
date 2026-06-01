extends CanvasLayer
class_name TutorialCoachOverlay

signal cta_pressed(step_id: int)
signal skip_pressed()

var _current_step_id: int = 0

@onready var dimmer: ColorRect = $Dimmer
@onready var spotlight_mask: ColorRect = $SpotlightMask
@onready var spotlight_border: ColorRect = $SpotlightBorder
@onready var coach_card: PanelContainer = $CoachCard
@onready var title_label: Label = $CoachCard/VBox/TitleLabel
@onready var body_label: Label = $CoachCard/VBox/BodyLabel
@onready var step_counter: Label = $CoachCard/VBox/HeaderRow/StepCounter
@onready var cta_button: Button = $CoachCard/VBox/ActionsRow/CTAButton
@onready var skip_button: Button = $CoachCard/VBox/ActionsRow/SkipButton
@onready var dots_row: HBoxContainer = $CoachCard/VBox/DotsRow
@onready var pointer_triangle: ColorRect = $PointerTriangle

const TOTAL_STEPS := 9

func _ready() -> void:
	cta_button.pressed.connect(_on_cta_pressed)
	skip_button.pressed.connect(_on_skip_pressed)
	visible = false

func show_step(step: Dictionary) -> void:
	if step.is_empty():
		visible = false
		return

	_current_step_id = step.get("id", 0)
	title_label.text = step.get("title", "")
	body_label.text = step.get("body", "")
	cta_button.text = step.get("cta", "Continue")
	step_counter.text = "%d / %d" % [_current_step_id, TOTAL_STEPS]

	_update_dots(_current_step_id)
	_position_spotlight(step.get("spot", null))
	_position_card(step.get("anchor", "bottom"))

	visible = true
	_animate_in()

func hide_overlay() -> void:
	visible = false

func _position_spotlight(spot) -> void:
	if spot == null:
		spotlight_mask.visible = false
		spotlight_border.visible = false
		pointer_triangle.visible = false
		return

	spotlight_mask.visible = true
	spotlight_border.visible = true
	spotlight_mask.position = Vector2(spot.x, spot.y)
	spotlight_mask.size = Vector2(spot.w, spot.h)
	# Border sits 2px outside the spotlight
	spotlight_border.position = Vector2(spot.x - 2, spot.y - 2)
	spotlight_border.size = Vector2(spot.w + 4, spot.h + 4)

func _position_card(anchor: String) -> void:
	var vp_size := get_viewport().get_visible_rect().size
	match anchor:
		"top":
			coach_card.anchor_top = 0.0
			coach_card.anchor_bottom = 0.0
			coach_card.offset_top = 60
			coach_card.offset_bottom = 60 + 320
		"center":
			coach_card.anchor_top = 0.5
			coach_card.anchor_bottom = 0.5
			coach_card.offset_top = -160
			coach_card.offset_bottom = 160
		_: # "bottom"
			coach_card.anchor_top = 1.0
			coach_card.anchor_bottom = 1.0
			coach_card.offset_top = -380
			coach_card.offset_bottom = -60

func _update_dots(active_id: int) -> void:
	for child in dots_row.get_children():
		child.queue_free()
	for i in range(1, TOTAL_STEPS + 1):
		var dot := ColorRect.new()
		dot.custom_minimum_size = Vector2(8, 8)
		if i == active_id:
			dot.color = Color(0.247, 0.663, 1.0)   # DS.PRIMARY
		elif i < active_id:
			dot.color = Color(0.224, 0.827, 0.416)  # DS.STATUS_OK
		else:
			dot.color = Color(0.365, 0.451, 0.565)  # DS.TEXT_MUTED
		dots_row.add_child(dot)

func _animate_in() -> void:
	coach_card.modulate.a = 0.0
	var tween := create_tween()
	tween.tween_property(coach_card, "modulate:a", 1.0, 0.22)

func _on_cta_pressed() -> void:
	emit_signal("cta_pressed", _current_step_id)

func _on_skip_pressed() -> void:
	emit_signal("skip_pressed")
