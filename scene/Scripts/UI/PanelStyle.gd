extends RefCounted
class_name PanelStyle

const NebulaTheme = preload("res://Resources/NebulaSciTheme.gd")

const PANEL_BG := NebulaTheme.PANEL_BG
const PANEL_BORDER := NebulaTheme.PANEL_OUTLINE
const PANEL_SHADOW := Color(0, 0, 0, 0.5)
const TEXT_PRIMARY := Color(0.95, 0.95, 0.98, 1)
const TEXT_MUTED := Color(0.7, 0.7, 0.75, 1)
const ACCENT := NebulaTheme.ACCENT_BLUE
const ACCENT_SOFT := NebulaTheme.BUTTON_BG
const BUTTON_PRESSED := NebulaTheme.BUTTON_PRESSED
const TEXT_ON_ACCENT := Color(0.05, 0.05, 0.08, 1)

static var _instance: PanelStyle = null

static func get_instance() -> PanelStyle:
	if _instance == null:
		_instance = PanelStyle.new()
	return _instance

static func apply_panel(panel: Control, bg_color: Color = PANEL_BG) -> void:
	if panel == null:
		return
	var style_box = StyleBoxFlat.new()
	if style_box == null:
		push_error("Failed to create style box for panel")
		return
	style_box.bg_color = bg_color
	style_box.border_color = PANEL_BORDER
	style_box.border_width_left = 3
	style_box.border_width_right = 3
	style_box.border_width_top = 3
	style_box.border_width_bottom = 3
	style_box.corner_radius_top_left = 12
	style_box.corner_radius_top_right = 12
	style_box.corner_radius_bottom_left = 12
	style_box.corner_radius_bottom_right = 12
	style_box.shadow_color = PANEL_SHADOW
	style_box.shadow_size = 16
	style_box.shadow_offset = Vector2(0, 4)
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
	
	var NebulaTheme = preload("res://Resources/NebulaSciTheme.gd")
	
	var normal = StyleBoxFlat.new()
	if normal == null:
		return
	normal.corner_radius_top_left = 8
	normal.corner_radius_top_right = 8
	normal.corner_radius_bottom_left = 8
	normal.corner_radius_bottom_right = 8
	normal.content_margin_left = 16
	normal.content_margin_right = 16
	normal.content_margin_top = 10
	normal.content_margin_bottom = 10
	normal.bg_color = NebulaTheme.ACCENT_BLUE if is_primary else NebulaTheme.BUTTON_BG
	normal.border_color = PANEL_BORDER
	normal.border_width_left = 2
	normal.border_width_right = 2
	normal.border_width_top = 2
	normal.border_width_bottom = 2

	var hover = normal.duplicate()
	if hover == null:
		push_error("Failed to duplicate button style")
		return
	hover.bg_color = NebulaTheme.BUTTON_HOVER

	var pressed = normal.duplicate()
	if pressed == null:
		push_error("Failed to duplicate button style")
		return
	pressed.bg_color = NebulaTheme.BUTTON_PRESSED

	var disabled = normal.duplicate()
	if disabled == null:
		push_error("Failed to duplicate disabled button style")
		return
	disabled.bg_color = Color(PANEL_BG.r, PANEL_BG.g, PANEL_BG.b, 0.5)
	disabled.border_color = Color(PANEL_BORDER.r, PANEL_BORDER.g, PANEL_BORDER.b, 0.5)

	if normal != null:
		button.add_theme_stylebox_override("normal", normal)
	if hover != null:
		button.add_theme_stylebox_override("hover", hover)
	if pressed != null:
		button.add_theme_stylebox_override("pressed", pressed)
		button.add_theme_stylebox_override("focus", hover)
	if disabled != null:
		button.add_theme_stylebox_override("disabled", disabled)
	
	# Update text color
	button.add_theme_color_override("font_color", TEXT_PRIMARY)
	if is_primary:
		button.add_theme_color_override("font_hover_color", Color.WHITE)
	button.add_theme_font_size_override("font_size", 20)
	var font_color = TEXT_ON_ACCENT if is_primary else TEXT_PRIMARY
	button.add_theme_color_override("font_color", font_color)
	button.add_theme_color_override("font_hover_color", font_color)
	button.add_theme_color_override("font_pressed_color", font_color)
	button.add_theme_color_override("font_focus_color", font_color)
	button.add_theme_color_override("font_disabled_color", Color(TEXT_MUTED.r, TEXT_MUTED.g, TEXT_MUTED.b, 0.85))

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
	bg.bg_color = ACCENT_SOFT
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

static func create_list_item_style() -> StyleBoxFlat:
	var style = StyleBoxFlat.new()
	style.bg_color = ACCENT_SOFT
	style.border_color = PANEL_BORDER
	style.border_width_bottom = 1
	style.corner_radius_top_left = 16
	style.corner_radius_top_right = 16
	style.corner_radius_bottom_left = 16
	style.corner_radius_bottom_right = 16
	style.content_margin_left = 18
	style.content_margin_right = 18
	style.content_margin_top = 14
	style.content_margin_bottom = 14
	return style

static func create_icon_circle_style() -> StyleBoxFlat:
	var style = StyleBoxFlat.new()
	style.bg_color = ACCENT
	style.corner_radius_top_left = 30
	style.corner_radius_top_right = 30
	style.corner_radius_bottom_left = 30
	style.corner_radius_bottom_right = 30
	return style

static func create_card_style() -> StyleBoxFlat:
	var style = StyleBoxFlat.new()
	style.bg_color = ACCENT_SOFT
	style.border_color = PANEL_BORDER
	style.border_width_left = 1
	style.border_width_right = 1
	style.border_width_top = 1
	style.border_width_bottom = 1
	style.corner_radius_top_left = 12
	style.corner_radius_top_right = 12
	style.corner_radius_bottom_left = 12
	style.corner_radius_bottom_right = 12
	style.content_margin_left = 14
	style.content_margin_right = 14
	style.content_margin_top = 12
	style.content_margin_bottom = 12
	return style
