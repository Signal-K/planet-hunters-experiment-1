extends RefCounted
class_name PanelStyle

## PanelStyle — applies Deep Command design tokens to runtime-built nodes.

const DS = preload("res://Scripts/UI/DS.gd")

# ── Colour constants (all forwarded from DS) ───────────────────────────────
const PANEL_BG       := DS.CARD_BG
const PANEL_BORDER   := DS.BORDER
const TEXT_PRIMARY   := DS.TEXT
const TEXT_MUTED     := DS.TEXT_MUTED
const TEXT_ON_DARK   := DS.TEXT_ON_PRIMARY
const MUTED_ON_DARK  := DS.TEXT_MUTED
const ACCENT         := DS.PRIMARY
const ACCENT_WARM    := DS.PRIMARY
const ACCENT_SOFT    := DS.CARD_ALT
const BUTTON_PRESSED := DS.BUTTON_PRESSED
const TEXT_ON_ACCENT := DS.TEXT_ON_PRIMARY

const FONT_TITLE  := DS.F_TITLE
const FONT_BODY   := DS.F_BODY
const FONT_MUTED  := DS.F_CAPTION
const FONT_BUTTON := DS.F_BUTTON

static func apply_panel(panel: Control, bg_color: Color = DS.CARD_BG) -> void:
	if panel == null:
		return
	var s := StyleBoxFlat.new()
	s.bg_color = bg_color
	s.border_color = DS.BORDER
	s.set_border_width_all(1)
	s.set_corner_radius_all(DS.R_CARD)
	s.shadow_color  = Color(0, 0, 0, 0.45)
	s.shadow_size   = 24
	s.shadow_offset = Vector2(0, 8)
	s.content_margin_left   = 24
	s.content_margin_right  = 24
	s.content_margin_top    = 16
	s.content_margin_bottom = 16
	panel.add_theme_stylebox_override("panel", s)

static func apply_title(label: Label) -> void:
	if label == null: return
	label.add_theme_color_override("font_color", DS.TEXT)
	label.add_theme_font_size_override("font_size", DS.F_HEADLINE)

static func apply_title_on_dark(label: Label) -> void:
	if label == null: return
	label.add_theme_color_override("font_color", DS.TEXT)
	label.add_theme_font_size_override("font_size", DS.F_HEADLINE)

static func apply_body(label: Label) -> void:
	if label == null: return
	label.add_theme_color_override("font_color", DS.TEXT_MUTED)
	label.add_theme_font_size_override("font_size", DS.F_BODY)

static func apply_body_on_dark(label: Label) -> void:
	if label == null: return
	label.add_theme_color_override("font_color", DS.TEXT_MUTED)
	label.add_theme_font_size_override("font_size", DS.F_BODY)

static func apply_richtext(label: RichTextLabel) -> void:
	if label == null: return
	label.add_theme_color_override("default_color", DS.TEXT_MUTED)
	label.add_theme_font_size_override("normal_font_size", DS.F_BODY)

static func apply_muted(label: Label) -> void:
	if label == null: return
	label.add_theme_color_override("font_color", DS.TEXT_MUTED)
	label.add_theme_font_size_override("font_size", DS.F_CAPTION)

static func apply_muted_on_dark(label: Label) -> void:
	if label == null: return
	label.add_theme_color_override("font_color", DS.TEXT_MUTED)
	label.add_theme_font_size_override("font_size", DS.F_CAPTION)

static func apply_button(button: Button, is_primary: bool = false) -> void:
	if button == null: return
	var c := DS.PRIMARY if is_primary else DS.PRIMARY
	var n := StyleBoxFlat.new()
	n.bg_color = Color(c.r, c.g, c.b, 0.16) if is_primary else Color(0, 0, 0, 0)
	n.border_color = c
	n.set_border_width_all(1)
	n.set_corner_radius_all(DS.R_BTN)
	n.content_margin_left = 20; n.content_margin_right = 20
	n.content_margin_top = 10; n.content_margin_bottom = 10
	var h := n.duplicate() as StyleBoxFlat
	h.bg_color = Color(c.r, c.g, c.b, 0.24)
	h.border_color = DS.PRIMARY_HOVER
	var p := n.duplicate() as StyleBoxFlat
	p.bg_color = Color(c.r, c.g, c.b, 0.32)
	button.add_theme_stylebox_override("normal", n)
	button.add_theme_stylebox_override("hover", h)
	button.add_theme_stylebox_override("pressed", p)
	button.add_theme_stylebox_override("focus", h)
	button.add_theme_color_override("font_color", c)
	button.add_theme_color_override("font_hover_color", DS.PRIMARY_HOVER)
	button.add_theme_font_size_override("font_size", DS.F_BUTTON)

static func apply_separator(separator: HSeparator) -> void:
	if separator == null: return
	separator.add_theme_color_override("separation_color", DS.BORDER)

static func apply_progress_bar(bar: ProgressBar) -> void:
	if bar == null: return
	var bg := StyleBoxFlat.new()
	bg.bg_color = DS.SURFACE_LOW
	bg.set_corner_radius_all(DS.R_CHIP)
	var fill := StyleBoxFlat.new()
	fill.bg_color = DS.PRIMARY
	fill.set_corner_radius_all(DS.R_CHIP)
	bar.add_theme_stylebox_override("background", bg)
	bar.add_theme_stylebox_override("fill", fill)

static func apply_outline_button(
	button: Button,
	border_color: Color = DS.PRIMARY,
	text_color: Color = DS.TEXT
) -> void:
	if button == null: return
	var n := StyleBoxFlat.new()
	n.bg_color = Color(0, 0, 0, 0)
	n.border_color = border_color
	n.set_border_width_all(1)
	n.set_corner_radius_all(DS.R_BTN)
	n.content_margin_left = 18; n.content_margin_right = 18
	n.content_margin_top = 10; n.content_margin_bottom = 10
	var h := n.duplicate() as StyleBoxFlat
	h.bg_color = Color(border_color.r, border_color.g, border_color.b, 0.12)
	button.add_theme_stylebox_override("normal", n)
	button.add_theme_stylebox_override("hover", h)
	button.add_theme_stylebox_override("pressed", h)
	button.add_theme_stylebox_override("focus", h)
	button.add_theme_color_override("font_color", text_color)
	button.add_theme_color_override("font_hover_color", text_color)
	button.add_theme_font_size_override("font_size", DS.F_BUTTON)

static func apply_nav_slot_button(
	button: Button,
	divider_color: Color = DS.PRIMARY,
	text_color: Color = DS.TEXT,
	is_primary: bool = false,
	no_right_divider: bool = false
) -> void:
	if button == null: return
	var n := StyleBoxFlat.new()
	n.bg_color = Color(0, 0, 0, 0)
	n.border_color = Color(divider_color.r, divider_color.g, divider_color.b, 0.30)
	if not no_right_divider:
		n.border_width_right = 1
	var h := n.duplicate() as StyleBoxFlat
	h.bg_color = Color(divider_color.r, divider_color.g, divider_color.b, 0.10)
	h.border_color = divider_color
	button.add_theme_stylebox_override("normal", n)
	button.add_theme_stylebox_override("hover", h)
	button.add_theme_stylebox_override("pressed", h)
	button.add_theme_stylebox_override("focus", h)
	button.add_theme_color_override("font_color", text_color)
	button.add_theme_color_override("font_hover_color", text_color)
	if is_primary:
		button.add_theme_color_override("font_color", DS.SECONDARY)

# ── Style factories (still return usable StyleBoxFlat for callers that
#    genuinely need a dynamic style, but now use light colours) ─────────────

static func create_list_item_style() -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color     = DS.CARD_ALT
	s.border_color = DS.BORDER
	s.set_border_width_all(1)
	s.set_corner_radius_all(8)
	s.content_margin_left   = 20
	s.content_margin_right  = 20
	s.content_margin_top    = 14
	s.content_margin_bottom = 14
	return s

static func create_icon_circle_style() -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color     = Color(DS.PRIMARY.r, DS.PRIMARY.g, DS.PRIMARY.b, 0.12)
	s.border_color = Color(DS.PRIMARY.r, DS.PRIMARY.g, DS.PRIMARY.b, 0.35)
	s.set_border_width_all(1)
	s.set_corner_radius_all(999)
	return s

static func create_card_style() -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color     = DS.CARD_BG
	s.border_color = DS.BORDER
	s.set_border_width_all(1)
	s.set_corner_radius_all(DS.R_CARD)
	s.shadow_color  = Color(0, 0, 0, 0.45)
	s.shadow_size   = 24
	s.shadow_offset = Vector2(0, 8)
	s.content_margin_left   = 24
	s.content_margin_right  = 24
	s.content_margin_top    = 16
	s.content_margin_bottom = 16
	return s

static func create_glass_panel_style(
	bg_color: Color = DS.CARD_BG,
	_border_alpha: float = 1.0,
	corner_radius: int = 12,
	padding_x: int = 20,
	padding_y: int = 16
) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color     = bg_color
	s.border_color = DS.BORDER
	s.set_border_width_all(1)
	s.set_corner_radius_all(corner_radius)
	s.shadow_color  = Color(DS.TEXT.r, DS.TEXT.g, DS.TEXT.b, 0.08)
	s.shadow_size   = 12
	s.shadow_offset = Vector2(0, 4)
	s.content_margin_left   = padding_x
	s.content_margin_right  = padding_x
	s.content_margin_top    = padding_y
	s.content_margin_bottom = padding_y
	return s

static func create_glass_card_style(
	bg_color: Color = DS.CARD_ALT,
	_border_alpha: float = 1.0,
	corner_radius: int = 8,
	padding_x: int = 16,
	padding_y: int = 12
) -> StyleBoxFlat:
	return create_glass_panel_style(bg_color, 1.0, corner_radius, padding_x, padding_y)

static func create_glass_pill_style(
	bg_color: Color = DS.CARD_ALT,
	_border_alpha: float = 1.0,
	corner_radius: int = 999
) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color     = bg_color
	s.border_color = DS.BORDER
	s.set_border_width_all(1)
	s.set_corner_radius_all(corner_radius)
	s.content_margin_left   = 12
	s.content_margin_right  = 12
	s.content_margin_top    = 8
	s.content_margin_bottom = 8
	return s
