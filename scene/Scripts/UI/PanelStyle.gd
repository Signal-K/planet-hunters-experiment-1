extends RefCounted
class_name PanelStyle

## PanelStyle — thin compatibility shim over DS.
## All colour constants now read from DS (light mode palette).
## The apply_* methods are no-ops: Themes/Light.tres and component scenes
## (Scenes/UI/Components/) are the single source of styling truth.
## Existing callers will compile and run without error; they just stop
## fighting the theme instead of overriding it.

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

# ── apply_* are intentional no-ops ────────────────────────────────────────
# The project default theme (Themes/Light.tres) handles all base styles.
# For variant buttons (primary/danger) use the component scenes in
# Scenes/UI/Components/ instead of calling these functions.

static func apply_panel(_panel: Control, _bg_color: Color = DS.CARD_BG) -> void:
	pass

static func apply_title(_label: Label) -> void:
	pass

static func apply_title_on_dark(_label: Label) -> void:
	pass

static func apply_body(_label: Label) -> void:
	pass

static func apply_body_on_dark(_label: Label) -> void:
	pass

static func apply_richtext(_label: RichTextLabel) -> void:
	pass

static func apply_muted(_label: Label) -> void:
	pass

static func apply_muted_on_dark(_label: Label) -> void:
	pass

static func apply_button(_button: Button, _is_primary: bool = false) -> void:
	pass

static func apply_separator(_separator: HSeparator) -> void:
	pass

static func apply_progress_bar(_bar: ProgressBar) -> void:
	pass

static func apply_outline_button(
	_button: Button,
	_border_color: Color = DS.PRIMARY,
	_text_color: Color = DS.TEXT
) -> void:
	pass

static func apply_nav_slot_button(
	_button: Button,
	_divider_color: Color = DS.PRIMARY,
	_text_color: Color = DS.TEXT,
	_is_primary: bool = false,
	_no_right_divider: bool = false
) -> void:
	pass

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
	s.set_corner_radius_all(12)
	s.shadow_color  = Color(DS.TEXT.r, DS.TEXT.g, DS.TEXT.b, 0.06)
	s.shadow_size   = 8
	s.shadow_offset = Vector2(0, 2)
	s.content_margin_left   = 20
	s.content_margin_right  = 20
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
