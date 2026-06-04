extends RefCounted
class_name PanelStyle
## PanelStyle — static helpers that apply DS-consistent styling to Panel/Label/Button nodes.

const DS_SURFACE        := Color(0.071, 0.133, 0.212)   # DS.SURFACE
const DS_SURFACE_2      := Color(0.094, 0.188, 0.294)   # DS.SURFACE_2
const DS_TEXT           := Color(0.902, 0.937, 1.0)     # DS.TEXT
const DS_TEXT_DIM       := Color(0.663, 0.722, 0.808)   # DS.TEXT_DIM
const DS_PRIMARY        := Color(0.247, 0.663, 1.0)     # DS.PRIMARY
const DS_AMBER          := Color(0.961, 0.651, 0.137)   # DS.AMBER
const DS_HAIRLINE       := Color(0.247, 0.663, 1.0, 0.18)

static func apply_panel(panel: Panel) -> void:
	if panel == null:
		return
	var sb := StyleBoxFlat.new()
	sb.bg_color = DS_SURFACE
	sb.border_color = DS_HAIRLINE
	sb.set_border_width_all(1)
	sb.set_corner_radius_all(8)
	sb.content_margin_left   = 16
	sb.content_margin_right  = 16
	sb.content_margin_top    = 12
	sb.content_margin_bottom = 12
	panel.add_theme_stylebox_override("panel", sb)

static func apply_title(label: Label) -> void:
	if label == null:
		return
	label.add_theme_color_override("font_color", DS_TEXT)
	label.add_theme_font_size_override("font_size", 22)

static func apply_button(button: Button, primary: bool = false) -> void:
	if button == null:
		return
	var normal := StyleBoxFlat.new()
	normal.bg_color = DS_SURFACE_2 if not primary else DS_PRIMARY
	normal.set_corner_radius_all(8)
	normal.content_margin_left   = 16
	normal.content_margin_right  = 16
	normal.content_margin_top    = 10
	normal.content_margin_bottom = 10
	button.add_theme_stylebox_override("normal", normal)
	button.add_theme_color_override("font_color", DS_TEXT)
	button.add_theme_font_size_override("font_size", 16)
