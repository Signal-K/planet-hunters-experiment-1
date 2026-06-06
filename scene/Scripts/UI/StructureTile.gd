extends Button

const FONT_DISPLAY := preload("res://design_system_source/fonts/Oxanium-Bold.ttf")
const FONT_BODY := preload("res://design_system_source/fonts/Oxanium-Regular.ttf")
const FONT_MONO := preload("res://design_system_source/fonts/TurretRoad-Regular.ttf")

@onready var art_frame: Panel = $ArtFrame
@onready var art: TextureRect = $ArtFrame/Art
@onready var title_label: Label = $Title
@onready var subtitle_label: Label = $Subtitle
@onready var pill: Panel = $StatusPill
@onready var status_label: Label = $StatusPill/Status

func _ready() -> void:
	_style()

func set_state(state: Dictionary) -> void:
	custom_minimum_size = state.get("size", Vector2(120, 128))
	size = custom_minimum_size
	text = ""
	art.texture = state.get("texture", null)
	title_label.text = str(state.get("title", ""))
	subtitle_label.text = str(state.get("subtitle", ""))
	status_label.text = str(state.get("status", ""))
	var active := bool(state.get("active", false))
	disabled = not active
	modulate = Color(1, 1, 1, 1) if active else Color(1, 1, 1, 0.72)
	var accent: Color = state.get("accent", Color("#5d7390"))
	_style_button(self, Color(0.02, 0.04, 0.07, 0.55) if active else Color(0.02, 0.04, 0.07, 0.42), accent)
	_style_panel(art_frame, Color(0.04, 0.06, 0.10, 0.82) if active else Color(0.03, 0.05, 0.08, 0.68), accent)
	_style_panel(pill, Color(0.03, 0.07, 0.12, 0.88), accent if active else Color("#31445c"))
	_style_label(title_label, FONT_DISPLAY, 9, Color("#e6efff") if active else Color("#5d7390"), true)
	_style_label(subtitle_label, FONT_BODY, 7, Color("#a9b8ce") if active else Color("#5d7390"))
	_style_label(status_label, FONT_DISPLAY, 7, accent if active else Color("#5d7390"), true)

func _style() -> void:
	_style_button(self, Color(0.02, 0.04, 0.07, 0.55), Color("#3fa9ff"))
	_style_panel(art_frame, Color(0.04, 0.06, 0.10, 0.82), Color("#3fa9ff"))
	_style_panel(pill, Color(0.03, 0.07, 0.12, 0.88), Color("#31445c"))
	_style_label(title_label, FONT_DISPLAY, 9, Color("#e6efff"), true)
	_style_label(subtitle_label, FONT_BODY, 7, Color("#a9b8ce"))
	_style_label(status_label, FONT_DISPLAY, 7, Color("#5d7390"), true)
	title_label.autowrap_mode = TextServer.AUTOWRAP_OFF
	subtitle_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	status_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER

func _style_button(button: Button, fill: Color, fg: Color) -> void:
	button.add_theme_font_override("font", FONT_DISPLAY)
	button.add_theme_font_size_override("font_size", 10)
	button.add_theme_color_override("font_color", fg)
	var normal := StyleBoxFlat.new()
	normal.bg_color = fill
	normal.border_color = fg
	normal.set_border_width_all(1)
	normal.set_corner_radius_all(8)
	normal.anti_aliasing = true
	normal.content_margin_left = 8
	normal.content_margin_right = 8
	normal.content_margin_top = 8
	normal.content_margin_bottom = 8
	button.add_theme_stylebox_override("normal", normal)
	button.add_theme_stylebox_override("hover", normal.duplicate())
	button.add_theme_stylebox_override("pressed", normal.duplicate())

func _style_label(label: Label, font: Font, size: int, color: Color, caps := false) -> void:
	label.add_theme_font_override("font", font)
	label.add_theme_font_size_override("font_size", size)
	label.add_theme_color_override("font_color", color)
	label.text = label.text.to_upper() if caps else label.text

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
