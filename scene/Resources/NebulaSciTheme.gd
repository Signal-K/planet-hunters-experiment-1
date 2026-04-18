extends Resource
class_name NebulaSciTheme

## NebulaSciTheme — forwards all constants to DS (the light-mode design system).
## Kept for backwards compatibility. Prefer DS.* directly in new code.

const DS = preload("res://Scripts/UI/DS.gd")

# Backgrounds
const SPACE_VOID    := DS.PAGE_BG
const SPACE_DARK    := DS.CARD_ALT
const SPACE_SURFACE := DS.CARD_BG
const PANEL_BG      := DS.CARD_BG
const PANEL_OUTLINE := DS.BORDER

# Buttons
const BUTTON_BG      := DS.CARD_ALT
const BUTTON_HOVER   := DS.BUTTON_HOVER
const BUTTON_PRESSED := DS.BUTTON_PRESSED

# Accents
const ACCENT_WARM  := DS.PRIMARY
const ACCENT_CYAN  := DS.PRIMARY
const ACCENT_GREEN := DS.STATUS_OK
const ACCENT_RED   := DS.DANGER

# Backwards-compat aliases
const ACCENT_BLUE        := ACCENT_CYAN
const NEBULA_CYAN        := ACCENT_CYAN
const NEBULA_DEEP_PURPLE := SPACE_VOID
const NEBULA_PURPLE      := SPACE_DARK
const NEBULA_PINK        := ACCENT_RED
const NEBULA_ORANGE      := ACCENT_WARM

static func create_panel_style() -> StyleBoxFlat:
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

static func create_button_style(state: String = "normal") -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	match state:
		"hover":   s.bg_color = DS.BUTTON_HOVER
		"pressed": s.bg_color = DS.BUTTON_PRESSED
		_:         s.bg_color = DS.CARD_BG
	s.border_color = DS.BORDER_STRONG
	s.set_border_width_all(1)
	s.set_corner_radius_all(8)
	s.content_margin_left   = 20
	s.content_margin_right  = 20
	s.content_margin_top    = 12
	s.content_margin_bottom = 12
	return s

static func create_segmented_bar(container: HBoxContainer, segments: int, filled: int, color: Color) -> void:
	for child in container.get_children():
		child.queue_free()
	for i in segments:
		var seg := ColorRect.new()
		seg.custom_minimum_size = Vector2(10, 18)
		seg.color = color if i < filled else Color(DS.BORDER.r, DS.BORDER.g, DS.BORDER.b, 0.8)
		container.add_child(seg)
		if i < segments - 1:
			var spacer := Control.new()
			spacer.custom_minimum_size = Vector2(3, 18)
			container.add_child(spacer)

static func create_nebula_gradient() -> Gradient:
	var g := Gradient.new()
	g.set_color(0, DS.PAGE_BG)
	g.add_point(0.5, DS.CARD_ALT)
	g.add_point(1.0, DS.CARD_BG)
	return g
