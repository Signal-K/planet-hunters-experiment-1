extends Control

signal action_requested(action: String)
signal menu_requested

const FONT_DISPLAY := preload("res://design_system_source/fonts/Oxanium-Bold.ttf")
const FONT_BODY := preload("res://design_system_source/fonts/Oxanium-Regular.ttf")
const FONT_MONO := preload("res://design_system_source/fonts/TurretRoad-Regular.ttf")

@onready var eyebrow_label: Label = $Header/Eyebrow
@onready var title_label: Label = $Header/Title
@onready var francs_label: Label = $Resources/Francs
@onready var jobs_label: Label = $Resources/Jobs
@onready var progress_card: Panel = $ProgressCard
@onready var objective_label: Label = $ProgressCard/Objective
@onready var step_title_label: Label = $ProgressCard/StepTitle
@onready var step_body_label: Label = $ProgressCard/StepBody
@onready var step_count_label: Label = $ProgressCard/StepCount
@onready var action_button: Button = $ProgressCard/ActionButton
@onready var hint_label: Label = $Hint
@onready var menu_button: Button = $MenuButton

func _ready() -> void:
	_style()
	action_button.pressed.connect(_on_action_pressed)
	menu_button.pressed.connect(func(): menu_requested.emit())

func set_state(state: Dictionary) -> void:
	eyebrow_label.text = str(state.get("eyebrow", ""))
	title_label.text = str(state.get("title", ""))
	francs_label.text = "▲ %s" % str(state.get("francs", "0"))
	jobs_label.text = "%s Jobs" % str(state.get("jobs", "0"))
	objective_label.text = str(state.get("objective", "OBJECTIVE"))
	step_title_label.text = str(state.get("step_title", ""))
	step_body_label.text = str(state.get("step_body", ""))
	step_count_label.text = str(state.get("step_count", ""))
	action_button.text = str(state.get("action_text", "OPEN"))
	action_button.disabled = not bool(state.get("action_enabled", true))
	hint_label.text = str(state.get("hint", ""))
	hint_label.visible = hint_label.text != ""
	jobs_label.visible = bool(state.get("show_jobs", false))
	progress_card.visible = bool(state.get("show_progress", true))
	visible = bool(state.get("visible", true))

func _on_action_pressed() -> void:
	action_requested.emit("primary")

func _style() -> void:
	_style_label(eyebrow_label, FONT_BODY, 9, Color("#5d7390"), true)
	_style_label(title_label, FONT_DISPLAY, 25, Color("#e6efff"))
	_style_label(francs_label, FONT_DISPLAY, 12, Color("#f5a623"), true)
	_style_label(jobs_label, FONT_DISPLAY, 9, Color("#ffb347"), true)
	_style_label(objective_label, FONT_BODY, 9, Color("#3fa9ff"), true)
	_style_label(step_title_label, FONT_DISPLAY, 18, Color("#e6efff"))
	_style_label(step_body_label, FONT_BODY, 11, Color("#a9b8ce"))
	_style_label(step_count_label, FONT_MONO, 9, Color("#5d7390"), true)
	_style_label(hint_label, FONT_DISPLAY, 10, Color("#a9b8ce"), true)
	_style_button(action_button, Color("#f5a623"), Color("#081120"))
	_style_button(menu_button, Color("#081120"), Color("#3fa9ff"))
	_style_panel(progress_card, Color("#122236"), Color(0.247, 0.663, 1.0, 0.18))

func _style_label(label: Label, font: Font, size: int, color: Color, caps := false) -> void:
	label.add_theme_font_override("font", font)
	label.add_theme_font_size_override("font_size", size)
	label.add_theme_color_override("font_color", color)
	label.text = label.text.to_upper() if caps else label.text

func _style_button(button: Button, fill: Color, fg: Color) -> void:
	button.add_theme_font_override("font", FONT_DISPLAY)
	button.add_theme_font_size_override("font_size", 10)
	button.add_theme_color_override("font_color", fg)
	button.add_theme_color_override("font_hover_color", Color("#e6efff"))
	button.add_theme_color_override("font_pressed_color", fg.darkened(0.2))
	var normal := StyleBoxFlat.new()
	normal.bg_color = fill
	normal.border_color = fg
	normal.set_border_width_all(1)
	normal.set_corner_radius_all(999 if button == menu_button else 8)
	normal.content_margin_left = 10
	normal.content_margin_right = 10
	normal.content_margin_top = 7
	normal.content_margin_bottom = 7
	button.add_theme_stylebox_override("normal", normal)
	button.add_theme_stylebox_override("hover", normal.duplicate())
	button.add_theme_stylebox_override("pressed", normal.duplicate())

func _style_panel(panel: Panel, fill: Color, border: Color) -> void:
	var style := StyleBoxFlat.new()
	style.bg_color = fill
	style.border_color = border
	style.set_border_width_all(1)
	style.set_corner_radius_all(8)
	panel.add_theme_stylebox_override("panel", style)
