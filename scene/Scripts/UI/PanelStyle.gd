extends RefCounted
class_name PanelStyle

const NebulaTheme = preload("res://Resources/NebulaSciTheme.gd")

# ── Colour constants (referenced from TutorialCoachOverlay etc.) ─────────────
const PANEL_BG       := NebulaTheme.PANEL_BG
const PANEL_BORDER   := NebulaTheme.PANEL_OUTLINE
const TEXT_PRIMARY   := Color(0.95, 0.93, 0.90, 1.0)   # warm white
const TEXT_MUTED     := Color(0.62, 0.60, 0.58, 1.0)   # warm grey
const ACCENT         := NebulaTheme.ACCENT_CYAN         # cyan — panel borders, progress fill
const ACCENT_WARM    := NebulaTheme.ACCENT_WARM         # amber — primary CTA buttons only
const ACCENT_SOFT    := NebulaTheme.BUTTON_BG
const BUTTON_PRESSED := NebulaTheme.BUTTON_PRESSED
const TEXT_ON_ACCENT := Color(0.02, 0.08, 0.12, 1.0)   # near-black on cyan

# Font sizes — large enough to read at mobile scale (1920×1080 → ~375px tall)
const FONT_TITLE  := 52
const FONT_BODY   := 40
const FONT_MUTED  := 34
const FONT_BUTTON := 36

static var _instance: PanelStyle = null

static func get_instance() -> PanelStyle:
	if _instance == null:
		_instance = PanelStyle.new()
	return _instance


# ── Panel / label helpers ────────────────────────────────────────────────────

static func apply_panel(panel: Control, bg_color: Color = PANEL_BG) -> void:
	if panel == null:
		return
	var s := StyleBoxFlat.new()
	s.bg_color     = bg_color
	s.border_color = PANEL_BORDER
	s.set_border_width_all(2)
	s.set_corner_radius_all(6)
	s.shadow_color  = Color(PANEL_BORDER.r, PANEL_BORDER.g, PANEL_BORDER.b, 0.25)
	s.shadow_size   = 18
	s.shadow_offset = Vector2(0, 0)
	s.content_margin_left   = 24
	s.content_margin_right  = 24
	s.content_margin_top    = 18
	s.content_margin_bottom = 18
	if panel.is_inside_tree():
		panel.add_theme_stylebox_override("panel", s)

static func apply_title(label: Label) -> void:
	if label == null:
		return
	label.add_theme_color_override("font_color", TEXT_PRIMARY)
	label.add_theme_font_size_override("font_size", FONT_TITLE)

static func apply_body(label: Label) -> void:
	if label == null:
		return
	label.add_theme_color_override("font_color", TEXT_PRIMARY)
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


# ── Button helper ────────────────────────────────────────────────────────────

static func apply_button(button: Button, is_primary: bool = false) -> void:
	if button == null:
		return

	var NebulaRef = preload("res://Resources/NebulaSciTheme.gd")

	var normal := StyleBoxFlat.new()
	normal.set_corner_radius_all(4)
	normal.content_margin_left   = 20
	normal.content_margin_right  = 20
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
	disabled.bg_color    = Color(PANEL_BG.r, PANEL_BG.g, PANEL_BG.b, 0.45)
	disabled.border_color = Color(PANEL_BORDER.r, PANEL_BORDER.g, PANEL_BORDER.b, 0.35)

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
	button.add_theme_color_override("font_disabled_color", Color(TEXT_MUTED.r, TEXT_MUTED.g, TEXT_MUTED.b, 0.7))
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
	s.border_width_bottom = 1
	s.set_corner_radius_all(8)
	s.content_margin_left   = 22
	s.content_margin_right  = 22
	s.content_margin_top    = 16
	s.content_margin_bottom = 16
	return s

static func create_icon_circle_style() -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = ACCENT
	s.set_corner_radius_all(32)
	return s

static func create_card_style() -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color     = ACCENT_SOFT
	s.border_color = PANEL_BORDER
	s.set_border_width_all(1)
	s.set_corner_radius_all(6)
	s.content_margin_left   = 18
	s.content_margin_right  = 18
	s.content_margin_top    = 14
	s.content_margin_bottom = 14
	return s
