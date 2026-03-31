extends RefCounted
class_name PanelStyle

const NebulaTheme = preload("res://Resources/NebulaSciTheme.gd")

# ── Colour constants (referenced from TutorialCoachOverlay etc.) ─────────────
const PANEL_BG       := NebulaTheme.PANEL_BG
const PANEL_BORDER   := NebulaTheme.PANEL_OUTLINE
const TEXT_PRIMARY   := Color(0.12, 0.18, 0.24, 1.0)   # deep slate on light shells
const TEXT_MUTED     := Color(0.39, 0.47, 0.55, 1.0)   # soft instrument grey
const TEXT_ON_DARK   := Color(0.92, 0.95, 0.98, 1.0)   # bright shell text for dark panels
const MUTED_ON_DARK  := Color(0.70, 0.78, 0.86, 1.0)   # secondary text for dark panels
const ACCENT         := NebulaTheme.ACCENT_CYAN         # cyan — panel borders, progress fill
const ACCENT_WARM    := NebulaTheme.ACCENT_WARM         # amber — primary CTA buttons only
const ACCENT_SOFT    := Color(0.95, 0.97, 0.98, 0.96)
const BUTTON_PRESSED := NebulaTheme.BUTTON_PRESSED
const TEXT_ON_ACCENT := Color(0.02, 0.08, 0.12, 1.0)   # near-black on cyan

# Font sizes — large enough to read at mobile scale (1920×1080 → ~375px tall)
const FONT_TITLE  := 52
const FONT_BODY   := 40
const FONT_MUTED  := 34
const FONT_BUTTON := 36

# ── Panel / label helpers ────────────────────────────────────────────────────

static func apply_panel(panel: Control, bg_color: Color = PANEL_BG) -> void:
	if panel == null:
		return
	var s := StyleBoxFlat.new()
	s.bg_color     = bg_color
	s.border_color = PANEL_BORDER
	s.set_border_width_all(1)
	s.set_corner_radius_all(18)
	s.shadow_color  = Color(0.16, 0.26, 0.34, 0.10)
	s.shadow_size   = 24
	s.shadow_offset = Vector2(0, 8)
	s.content_margin_left   = 28
	s.content_margin_right  = 28
	s.content_margin_top    = 22
	s.content_margin_bottom = 22
	if panel.is_inside_tree():
		panel.add_theme_stylebox_override("panel", s)

static func apply_title(label: Label) -> void:
	if label == null:
		return
	label.add_theme_color_override("font_color", TEXT_PRIMARY)
	label.add_theme_font_size_override("font_size", FONT_TITLE)

static func apply_title_on_dark(label: Label) -> void:
	if label == null:
		return
	label.add_theme_color_override("font_color", TEXT_ON_DARK)
	label.add_theme_font_size_override("font_size", FONT_TITLE)

static func apply_body(label: Label) -> void:
	if label == null:
		return
	label.add_theme_color_override("font_color", TEXT_PRIMARY)
	label.add_theme_font_size_override("font_size", FONT_BODY)

static func apply_body_on_dark(label: Label) -> void:
	if label == null:
		return
	label.add_theme_color_override("font_color", TEXT_ON_DARK)
	label.add_theme_font_size_override("font_size", FONT_BODY)

static func apply_richtext(label: RichTextLabel) -> void:
	if label == null:
		return
	label.add_theme_color_override("default_color", TEXT_PRIMARY)
	label.add_theme_font_size_override("normal_font_size", FONT_BODY)
	label.add_theme_font_size_override("bold_font_size", FONT_BODY)
	label.add_theme_font_size_override("italic_font_size", FONT_BODY)

static func apply_muted(label: Label) -> void:
	if label == null:
		return
	label.add_theme_color_override("font_color", TEXT_MUTED)
	label.add_theme_font_size_override("font_size", FONT_MUTED)

static func apply_muted_on_dark(label: Label) -> void:
	if label == null:
		return
	label.add_theme_color_override("font_color", MUTED_ON_DARK)
	label.add_theme_font_size_override("font_size", FONT_MUTED)


# ── Button helper ────────────────────────────────────────────────────────────

static func apply_button(button: Button, is_primary: bool = false) -> void:
	if button == null:
		return

	var NebulaRef = preload("res://Resources/NebulaSciTheme.gd")

	var normal := StyleBoxFlat.new()
	normal.set_corner_radius_all(14)
	normal.content_margin_left   = 22
	normal.content_margin_right  = 22
	normal.content_margin_top    = 14
	normal.content_margin_bottom = 14
	normal.bg_color     = NebulaRef.ACCENT_WARM if is_primary else NebulaRef.BUTTON_BG
	normal.border_color = PANEL_BORDER
	normal.set_border_width_all(1)

	var hover    := normal.duplicate()
	hover.bg_color = NebulaRef.BUTTON_HOVER

	var pressed  := normal.duplicate()
	pressed.bg_color = NebulaRef.BUTTON_PRESSED

	var disabled := normal.duplicate()
	disabled.bg_color    = Color(0.88, 0.91, 0.94, 0.54)
	disabled.border_color = Color(PANEL_BORDER.r, PANEL_BORDER.g, PANEL_BORDER.b, 0.28)

	button.add_theme_stylebox_override("normal",   normal)
	button.add_theme_stylebox_override("hover",    hover)
	button.add_theme_stylebox_override("pressed",  pressed)
	button.add_theme_stylebox_override("focus",    hover)
	button.add_theme_stylebox_override("disabled", disabled)

	var font_color := TEXT_ON_ACCENT if is_primary else TEXT_PRIMARY
	button.add_theme_color_override("font_color",          font_color)
	button.add_theme_color_override("font_hover_color",    font_color)
	button.add_theme_color_override("font_pressed_color",  font_color)
	button.add_theme_color_override("font_focus_color",    font_color)
	button.add_theme_color_override("font_disabled_color", Color(TEXT_MUTED.r, TEXT_MUTED.g, TEXT_MUTED.b, 0.82))
	button.add_theme_font_size_override("font_size", FONT_BUTTON)


# ── Misc style factories ─────────────────────────────────────────────────────

static func apply_separator(separator: HSeparator) -> void:
	if separator == null:
		return
	separator.add_theme_color_override("separator", PANEL_BORDER)

static func apply_progress_bar(bar: ProgressBar) -> void:
	if bar == null:
		return
	var bg := StyleBoxFlat.new()
	bg.bg_color = ACCENT_SOFT
	bg.set_corner_radius_all(6)

	var fill := StyleBoxFlat.new()
	fill.bg_color = ACCENT
	fill.set_corner_radius_all(6)

	bar.add_theme_stylebox_override("background", bg)
	bar.add_theme_stylebox_override("fill", fill)
	bar.show_percentage = false

static func create_list_item_style() -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color     = ACCENT_SOFT
	s.border_color = PANEL_BORDER
	s.set_border_width_all(1)
	s.set_corner_radius_all(14)
	s.content_margin_left   = 22
	s.content_margin_right  = 22
	s.content_margin_top    = 16
	s.content_margin_bottom = 16
	return s

static func create_icon_circle_style() -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = Color(ACCENT.r, ACCENT.g, ACCENT.b, 0.18)
	s.border_color = Color(ACCENT.r, ACCENT.g, ACCENT.b, 0.45)
	s.set_border_width_all(1)
	s.set_corner_radius_all(32)
	return s

static func create_card_style() -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color     = ACCENT_SOFT
	s.border_color = PANEL_BORDER
	s.set_border_width_all(1)
	s.set_corner_radius_all(18)
	s.shadow_color = Color(0.16, 0.26, 0.34, 0.08)
	s.shadow_size = 18
	s.shadow_offset = Vector2(0, 4)
	s.content_margin_left   = 20
	s.content_margin_right  = 20
	s.content_margin_top    = 18
	s.content_margin_bottom = 18
	return s

static func create_glass_panel_style(
	bg_color: Color = Color(0.05, 0.09, 0.14, 0.90),
	border_alpha: float = 0.72,
	corner_radius: int = 18,
	padding_x: int = 22,
	padding_y: int = 18
) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = bg_color
	s.border_color = Color(ACCENT.r, ACCENT.g, ACCENT.b, border_alpha)
	s.set_border_width_all(1)
	s.set_corner_radius_all(corner_radius)
	s.shadow_color = Color(0.01, 0.03, 0.06, 0.28)
	s.shadow_size = 28
	s.shadow_offset = Vector2(0, 10)
	s.content_margin_left = padding_x
	s.content_margin_right = padding_x
	s.content_margin_top = padding_y
	s.content_margin_bottom = padding_y
	return s

static func create_glass_card_style(
	bg_color: Color = Color(0.08, 0.13, 0.20, 0.88),
	border_alpha: float = 0.58,
	corner_radius: int = 14,
	padding_x: int = 18,
	padding_y: int = 14
) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = bg_color
	s.border_color = Color(ACCENT.r, ACCENT.g, ACCENT.b, border_alpha)
	s.set_border_width_all(1)
	s.set_corner_radius_all(corner_radius)
	s.shadow_color = Color(0.01, 0.03, 0.06, 0.22)
	s.shadow_size = 18
	s.shadow_offset = Vector2(0, 6)
	s.content_margin_left = padding_x
	s.content_margin_right = padding_x
	s.content_margin_top = padding_y
	s.content_margin_bottom = padding_y
	return s

static func create_glass_pill_style(
	bg_color: Color = Color(0.09, 0.15, 0.22, 0.92),
	border_alpha: float = 0.44,
	corner_radius: int = 999
) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = bg_color
	s.border_color = Color(ACCENT.r, ACCENT.g, ACCENT.b, border_alpha)
	s.set_border_width_all(1)
	s.set_corner_radius_all(corner_radius)
	s.content_margin_left = 12
	s.content_margin_right = 12
	s.content_margin_top = 8
	s.content_margin_bottom = 8
	return s

static func apply_outline_button(
	button: Button,
	border_color: Color = ACCENT,
	text_color: Color = TEXT_ON_DARK
) -> void:
	if button == null:
		return

	var normal := StyleBoxFlat.new()
	normal.bg_color = Color(0.07, 0.11, 0.17, 0.86)
	normal.border_color = border_color
	normal.set_border_width_all(1)
	normal.set_corner_radius_all(14)
	normal.content_margin_left = 18
	normal.content_margin_right = 18
	normal.content_margin_top = 12
	normal.content_margin_bottom = 12

	var hover := normal.duplicate()
	hover.bg_color = Color(border_color.r, border_color.g, border_color.b, 0.18)

	var pressed := normal.duplicate()
	pressed.bg_color = Color(border_color.r, border_color.g, border_color.b, 0.26)

	var disabled := normal.duplicate()
	disabled.bg_color = Color(0.06, 0.09, 0.14, 0.72)
	disabled.border_color = Color(border_color.r, border_color.g, border_color.b, 0.28)

	button.add_theme_stylebox_override("normal", normal)
	button.add_theme_stylebox_override("hover", hover)
	button.add_theme_stylebox_override("pressed", pressed)
	button.add_theme_stylebox_override("focus", hover)
	button.add_theme_stylebox_override("disabled", disabled)
	button.add_theme_color_override("font_color", text_color)
	button.add_theme_color_override("font_hover_color", text_color)
	button.add_theme_color_override("font_pressed_color", text_color)
	button.add_theme_color_override("font_focus_color", text_color)
	button.add_theme_color_override("font_disabled_color", Color(text_color.r, text_color.g, text_color.b, 0.52))
	button.add_theme_font_size_override("font_size", FONT_BUTTON)

static func apply_nav_slot_button(
	button: Button,
	divider_color: Color = ACCENT,
	text_color: Color = TEXT_ON_DARK,
	is_primary: bool = false,
	no_right_divider: bool = false
) -> void:
	if button == null:
		return

	var tint := ACCENT_WARM if is_primary else divider_color
	var fill := Color(tint.r, tint.g, tint.b, 0.16) if is_primary else Color(1.0, 1.0, 1.0, 0.02)
	var hover_fill := Color(tint.r, tint.g, tint.b, 0.24) if is_primary else Color(1.0, 1.0, 1.0, 0.08)
	var pressed_fill := Color(tint.r, tint.g, tint.b, 0.34) if is_primary else Color(1.0, 1.0, 1.0, 0.14)

	var normal := StyleBoxFlat.new()
	normal.bg_color = fill
	normal.border_color = Color(divider_color.r, divider_color.g, divider_color.b, 0.44)
	normal.border_width_right = 0 if no_right_divider else 1
	normal.content_margin_left = 14
	normal.content_margin_right = 14
	normal.content_margin_top = 10
	normal.content_margin_bottom = 10

	var hover := normal.duplicate()
	hover.bg_color = hover_fill

	var pressed := normal.duplicate()
	pressed.bg_color = pressed_fill

	var disabled := normal.duplicate()
	disabled.bg_color = Color(fill.r, fill.g, fill.b, fill.a * 0.5)
	disabled.border_color = Color(divider_color.r, divider_color.g, divider_color.b, 0.18)

	button.add_theme_stylebox_override("normal", normal)
	button.add_theme_stylebox_override("hover", hover)
	button.add_theme_stylebox_override("pressed", pressed)
	button.add_theme_stylebox_override("focus", hover)
	button.add_theme_stylebox_override("disabled", disabled)
	button.add_theme_color_override("font_color", text_color)
	button.add_theme_color_override("font_hover_color", text_color)
	button.add_theme_color_override("font_pressed_color", text_color)
	button.add_theme_color_override("font_focus_color", text_color)
	button.add_theme_color_override("font_disabled_color", Color(text_color.r, text_color.g, text_color.b, 0.50))
	button.add_theme_font_size_override("font_size", FONT_BUTTON)
