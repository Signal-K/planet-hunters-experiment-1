extends Button

const FONT_DISPLAY := preload("res://design_system_source/fonts/Oxanium-Bold.ttf")
const FONT_BODY := preload("res://design_system_source/fonts/Oxanium-Regular.ttf")
const FONT_MONO := preload("res://design_system_source/fonts/TurretRoad-Regular.ttf")

signal mission_selected(mission_id: String)

@onready var icon_frame: Panel = $IconFrame
@onready var mission_icon: TextureRect = $IconFrame/Icon
@onready var tag_label: Label = $Tag
@onready var title_label: Label = $Title
@onready var company_label: Label = $Company
@onready var brief_label: Label = $Brief
@onready var payout_label: Label = $Payout
@onready var xp_label: Label = $Xp
@onready var target_button: Button = $TargetButton

var mission_id := ""

func _ready() -> void:
	_style()
	pressed.connect(_emit_selected)
	target_button.pressed.connect(_emit_selected)

func set_state(state: Dictionary) -> void:
	mission_id = str(state.get("id", ""))
	text = ""
	mission_icon.texture = state.get("icon", null)
	tag_label.text = str(state.get("tag", ""))
	title_label.text = str(state.get("title", ""))
	company_label.text = str(state.get("company", ""))
	brief_label.text = str(state.get("brief", ""))
	payout_label.text = "▲ %s" % str(state.get("payout", "0"))
	xp_label.text = "+%s XP" % str(state.get("xp", "0"))
	target_button.text = "%s TARGETS >" % str(state.get("targets", "1"))
	var accent: Color = state.get("accent", Color("#3fa9ff"))
	var active := bool(state.get("active", true))
	disabled = not active
	target_button.disabled = not active
	modulate = Color(1, 1, 1, 1) if active else Color(1, 1, 1, 0.7)
	_style_panel(icon_frame, Color(0.04, 0.06, 0.10, 0.86), accent)
	_style_button(self, Color(0.05, 0.08, 0.11, 0.92), accent)
	_style_button(target_button, Color(0.03, 0.07, 0.12, 0.82), accent)
	_style_label(tag_label, FONT_DISPLAY, 8, accent, true)
	_style_label(title_label, FONT_DISPLAY, 16, Color("#e6efff"))
	_style_label(company_label, FONT_DISPLAY, 9, Color("#5d7390"), true)
	_style_label(brief_label, FONT_BODY, 11, Color("#a9b8ce"))
	_style_label(payout_label, FONT_DISPLAY, 11, Color("#f5a623"), true)
	_style_label(xp_label, FONT_MONO, 10, Color("#7ec8ff"), true)

func _emit_selected() -> void:
	mission_selected.emit(mission_id)

func _style() -> void:
	_style_panel(icon_frame, Color(0.04, 0.06, 0.10, 0.86), Color("#3fa9ff"))
	_style_button(self, Color(0.05, 0.08, 0.11, 0.92), Color("#3fa9ff"))
	_style_button(target_button, Color(0.03, 0.07, 0.12, 0.82), Color("#3fa9ff"))
	_style_label(tag_label, FONT_DISPLAY, 8, Color("#3fa9ff"), true)
	_style_label(title_label, FONT_DISPLAY, 16, Color("#e6efff"))
	_style_label(company_label, FONT_DISPLAY, 9, Color("#5d7390"), true)
	_style_label(brief_label, FONT_BODY, 11, Color("#a9b8ce"))
	_style_label(payout_label, FONT_DISPLAY, 11, Color("#f5a623"), true)
	_style_label(xp_label, FONT_MONO, 10, Color("#7ec8ff"), true)
	target_button.text = "TARGETS >"

func _style_label(label: Label, font: Font, size: int, color: Color, caps := false) -> void:
	label.add_theme_font_override("font", font)
	label.add_theme_font_size_override("font_size", size)
	label.add_theme_color_override("font_color", color)
	label.text = label.text.to_upper() if caps else label.text
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART

func _style_button(button: Button, fill: Color, fg: Color) -> void:
	button.add_theme_font_override("font", FONT_DISPLAY)
	button.add_theme_font_size_override("font_size", 10)
	button.add_theme_color_override("font_color", fg)
	button.add_theme_color_override("font_hover_color", Color("#e6efff"))
	button.add_theme_color_override("font_pressed_color", Color("#06121f"))
	var normal := StyleBoxFlat.new()
	normal.bg_color = fill
	normal.border_color = fg
	normal.set_border_width_all(1)
	normal.set_corner_radius_all(8)
	normal.anti_aliasing = true
	normal.content_margin_left = 8
	normal.content_margin_right = 8
	normal.content_margin_top = 6
	normal.content_margin_bottom = 6
	button.add_theme_stylebox_override("normal", normal)
	button.add_theme_stylebox_override("hover", normal.duplicate())
	button.add_theme_stylebox_override("pressed", normal.duplicate())

func _style_panel(panel: Panel, fill: Color, border: Color) -> void:
	var style := StyleBoxFlat.new()
	style.bg_color = fill
	style.border_color = border
	style.set_border_width_all(1)
	style.set_corner_radius_all(8)
	style.anti_aliasing = true
	style.shadow_color = Color(0, 0, 0, 0.24)
	style.shadow_size = 8
	style.shadow_offset = Vector2(0, 2)
	panel.add_theme_stylebox_override("panel", style)
