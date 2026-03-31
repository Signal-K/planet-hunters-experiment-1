extends Resource
class_name NebulaSciTheme

# ── Out There: Omega palette ─────────────────────────────────────────────────
# Airy sci-fi palette: pale instrument surfaces, cyan telemetry edges,
# and warm amber CTAs against deep-space backdrops.

# Space atmosphere (used for backgrounds / gradients)
const SPACE_VOID    := Color(0.02, 0.02, 0.03, 1.0)
const SPACE_DARK    := Color(0.05, 0.05, 0.07, 0.94)
const SPACE_SURFACE := Color(0.12, 0.13, 0.16, 0.86)

# UI chrome
const PANEL_BG      := Color(0.93, 0.95, 0.96, 0.90)   # luminous shell
const PANEL_OUTLINE := Color(0.38, 0.83, 0.93, 0.78)   # softened cyan edge
const BUTTON_BG     := Color(0.85, 0.90, 0.94, 0.94)   # pale control surface
const BUTTON_HOVER  := Color(0.90, 0.94, 0.97, 0.98)
const BUTTON_PRESSED:= Color(0.77, 0.84, 0.90, 0.98)

# Accents
const ACCENT_WARM   := Color(0.941, 0.690, 0.188, 1.0)  # amber #F0B030 — primary CTA
const ACCENT_CYAN   := Color(0.28, 0.88, 0.96, 1.0)    # cyan   — secondary
const ACCENT_GREEN  := Color(0.28, 0.94, 0.52, 1.0)    # green  — success
const ACCENT_RED    := Color(0.96, 0.30, 0.26, 1.0)    # red    — danger/warning

# Backwards-compat aliases used elsewhere in the codebase
const ACCENT_BLUE          := ACCENT_CYAN
const NEBULA_CYAN          := ACCENT_CYAN
const NEBULA_DEEP_PURPLE   := SPACE_VOID
const NEBULA_PURPLE        := SPACE_DARK
const NEBULA_PINK          := ACCENT_RED
const NEBULA_ORANGE        := ACCENT_WARM


# ── StyleBox factories ───────────────────────────────────────────────────────

static func create_panel_style() -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = PANEL_BG
	s.border_color = PANEL_OUTLINE
	s.set_border_width_all(1)
	s.set_corner_radius_all(16)
	s.shadow_color  = Color(0.18, 0.32, 0.40, 0.12)
	s.shadow_size   = 22
	s.shadow_offset = Vector2(0, 6)
	s.content_margin_left   = 20
	s.content_margin_right  = 20
	s.content_margin_top    = 16
	s.content_margin_bottom = 16
	return s

static func create_button_style(state: String = "normal") -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	match state:
		"hover":   s.bg_color = BUTTON_HOVER
		"pressed": s.bg_color = BUTTON_PRESSED
		_:         s.bg_color = BUTTON_BG
	s.border_color = PANEL_OUTLINE
	s.set_border_width_all(1)
	s.set_corner_radius_all(14)
	s.content_margin_left   = 16
	s.content_margin_right  = 16
	s.content_margin_top    = 12
	s.content_margin_bottom = 12
	return s

# Segmented progress bar (unchanged logic, new colours)
static func create_segmented_bar(container: HBoxContainer, segments: int, filled: int, color: Color) -> void:
	for child in container.get_children():
		child.queue_free()
	for i in segments:
		var seg := ColorRect.new()
		seg.custom_minimum_size = Vector2(10, 18)
		seg.color = color if i < filled else Color(0.18, 0.18, 0.22, 0.5)
		container.add_child(seg)
		if i < segments - 1:
			var spacer := Control.new()
			spacer.custom_minimum_size = Vector2(3, 18)
			container.add_child(spacer)

# Nebula background gradient (kept for any scene that still uses it)
static func create_nebula_gradient() -> Gradient:
	var g := Gradient.new()
	g.set_color(0, SPACE_VOID)
	g.add_point(0.5, SPACE_DARK)
	g.add_point(1.0, SPACE_SURFACE)
	return g
