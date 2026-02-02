extends RefCounted
class_name PanelStyle

const PANEL_BG := Color(0.975, 0.98, 0.99, 1)
const PANEL_BORDER := Color(0.86, 0.89, 0.94, 1)
const PANEL_SHADOW := Color(0, 0, 0, 0.12)
const TEXT_PRIMARY := Color(0.10, 0.12, 0.16, 1)
const TEXT_MUTED := Color(0.42, 0.45, 0.52, 1)
const ACCENT := Color(0.16, 0.48, 0.92, 1)
const ACCENT_SOFT := Color(0.88, 0.93, 0.99, 1)

static func apply_panel(panel: Control, bg_color: Color = PANEL_BG) -> void:
	if panel == null:
		return
	var style_box = StyleBoxFlat.new()
	if style_box == null:
		push_error("Failed to create style box for panel")
		return
	style_box.bg_color = bg_color
	style_box.border_color = PANEL_BORDER
	style_box.border_width_left = 1
	style_box.border_width_right = 1
	style_box.border_width_top = 1
	style_box.border_width_bottom = 1
	style_box.corner_radius_top_left = 20
	style_box.corner_radius_top_right = 20
	style_box.corner_radius_bottom_left = 20
	style_box.corner_radius_bottom_right = 20
	style_box.shadow_color = PANEL_SHADOW
	style_box.shadow_size = 12
	style_box.shadow_offset = Vector2(0, 6)
	if style_box != null:
		panel.add_theme_stylebox_override("panel", style_box)

static func apply_title(label: Label) -> void:
	if label == null:
		return
	label.add_theme_color_override("font_color", TEXT_PRIMARY)
	label.add_theme_font_size_override("font_size", 32)

static func apply_body(label: Label) -> void:
	if label == null:
		return
	label.add_theme_color_override("font_color", TEXT_PRIMARY)
	label.add_theme_font_size_override("font_size", 22)

static func apply_richtext(label: RichTextLabel) -> void:
	if label == null:
		return
	label.add_theme_color_override("default_color", TEXT_PRIMARY)
	label.add_theme_font_size_override("normal_font_size", 22)
	label.add_theme_font_size_override("bold_font_size", 22)
	label.add_theme_font_size_override("italic_font_size", 22)

static func apply_muted(label: Label) -> void:
	if label == null:
		return
	label.add_theme_color_override("font_color", TEXT_MUTED)
	label.add_theme_font_size_override("font_size", 20)

static func apply_button(button: Button, is_primary: bool = false) -> void:
	if button == null:
		return
	var normal = StyleBoxFlat.new()
	if normal == null:
		return
	normal.corner_radius_top_left = 12
	normal.corner_radius_top_right = 12
	normal.corner_radius_bottom_left = 12
	normal.corner_radius_bottom_right = 12
	normal.content_margin_left = 16
	normal.content_margin_right = 16
	normal.content_margin_top = 10
	normal.content_margin_bottom = 10
	normal.bg_color = PANEL_BG
	normal.border_color = PANEL_BORDER
	normal.border_width_left = 1
	normal.border_width_right = 1
	normal.border_width_top = 1
	normal.border_width_bottom = 1

	var hover = normal.duplicate()
	if hover == null:
		push_error("Failed to duplicate button style")
		return
	hover.bg_color = Color(0.94, 0.95, 0.97, 1)

	var pressed = normal.duplicate()
	if pressed == null:
		push_error("Failed to duplicate button style")
		return
	pressed.bg_color = Color(0.90, 0.92, 0.95, 1)

	if normal != null:
		button.add_theme_stylebox_override("normal", normal)
	if hover != null:
		button.add_theme_stylebox_override("hover", hover)
	if pressed != null:
		button.add_theme_stylebox_override("pressed", pressed)
		button.add_theme_stylebox_override("focus", hover)
	button.add_theme_font_size_override("font_size", 20)
	button.add_theme_color_override("font_color", TEXT_PRIMARY)
	button.add_theme_color_override("font_hover_color", TEXT_PRIMARY)
	button.add_theme_color_override("font_pressed_color", TEXT_PRIMARY)

static func apply_separator(separator: HSeparator) -> void:
	if separator == null:
		return
	separator.add_theme_color_override("separator", PANEL_BORDER)

static func apply_progress_bar(bar: ProgressBar) -> void:
	if bar == null:
		return
	var bg = StyleBoxFlat.new()
	if bg == null:
		push_error("Failed to create background style for progress bar")
		return
	bg.bg_color = Color(0.92, 0.94, 0.97, 1)
	bg.corner_radius_top_left = 8
	bg.corner_radius_top_right = 8
	bg.corner_radius_bottom_left = 8
	bg.corner_radius_bottom_right = 8
	
	var fill = StyleBoxFlat.new()
	if fill == null:
		push_error("Failed to create fill style for progress bar")
		return
	fill.bg_color = ACCENT
	fill.corner_radius_top_left = 8
	fill.corner_radius_top_right = 8
	fill.corner_radius_bottom_left = 8
	fill.corner_radius_bottom_right = 8
	
	if bg != null:
		bar.add_theme_stylebox_override("background", bg)
	if fill != null:
		bar.add_theme_stylebox_override("fill", fill)
	bar.show_percentage = false
