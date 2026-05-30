extends RefCounted
class_name DS

## Deep Command — Dark-space design system for Landnam.
## Navy surfaces, Command Cyan primary, Vulcan Amber selection/currency.
## Hairline Rule: ghost cyan borders at 18% alpha; selection jumps to 45%.

# ── Surfaces — deep navy command ──────────────────────────────────────────
const PAGE_BG         := Color(0.039, 0.071, 0.114, 1.0)  # #0a121d  base layer
const SURFACE_LOW     := Color(0.055, 0.094, 0.157, 1.0)  # #0e1828  grid/bg
const SURFACE_LOWEST  := Color(0.071, 0.133, 0.212, 1.0)  # #122236  primary cards, panels
const SURFACE_HIGH    := Color(0.094, 0.188, 0.294, 1.0)  # #18304b  elevated / selected-idle
const SURFACE_HIGHEST := Color(0.122, 0.239, 0.369, 1.0)  # #1f3d5e  hover
const SURFACE_BRIGHT  := Color(0.024, 0.035, 0.059, 1.0)  # #06090f  outermost void

# Backwards-compat surface aliases
const CARD_BG  := SURFACE_LOWEST
const CARD_ALT := SURFACE_LOW

# ── Primary — Command Cyan (#3fa9ff) ──────────────────────────────────────
const PRIMARY           := Color(0.247, 0.663, 1.000, 1.0)  # #3fa9ff
const PRIMARY_HOVER     := Color(0.424, 0.761, 1.000, 1.0)  # #6cc2ff
const PRIMARY_PRESS     := Color(0.110, 0.529, 0.863, 1.0)  # #1c87dc
const PRIMARY_CONTAINER := Color(0.247, 0.663, 1.000, 0.16) # cyan soft bg
const PRIMARY_FIXED_DIM := Color(0.247, 0.663, 1.000, 0.35) # cyan mid border
const ON_PRIMARY        := Color(0.024, 0.071, 0.149, 1.0)  # #061226 text-on-cyan

# ── Secondary — Vulcan Amber (#f5a623) selection, currency, propulsion ────
const SECONDARY       := Color(0.961, 0.651, 0.137, 1.0)  # #f5a623
const SECONDARY_FIXED := Color(0.961, 0.651, 0.137, 0.14) # amber soft bg

# ── Text ──────────────────────────────────────────────────────────────────
const TEXT            := Color(0.902, 0.937, 1.000, 1.0)  # #e6efff  primary readouts
const TEXT_MUTED      := Color(0.663, 0.722, 0.808, 1.0)  # #a9b8ce  body / secondary
const TEXT_ON_PRIMARY := Color(0.024, 0.071, 0.149, 1.0)  # #061226  on cyan buttons
const INVERSE_SURFACE := Color(0.024, 0.035, 0.059, 1.0)  # #06090f  deep contrast

# ── Borders / hairlines (ghosted cyan, never solid neutral) ──────────────
const OUTLINE_VARIANT := Color(0.247, 0.663, 1.000, 0.45)  # 45% — focused/selected
const BORDER          := Color(0.247, 0.663, 1.000, 0.18)  # 18% ghost panel edge
const BORDER_STRONG   := Color(0.247, 0.663, 1.000, 0.45)  # 45% ghost

# ── Danger ────────────────────────────────────────────────────────────────
const DANGER       := Color(1.000, 0.353, 0.416, 1.0)  # #ff5a6a
const DANGER_HOVER := Color(0.839, 0.271, 0.329, 1.0)  # darker crit

# ── Text dim (between TEXT and TEXT_MUTED) ───────────────────────────────
const TEXT_DIM := Color(0.663, 0.722, 0.808, 1.0)   # #a9b8ce  secondary body text

# ── Status ────────────────────────────────────────────────────────────────
const STATUS_OK   := Color(0.224, 0.827, 0.416, 1.0)  # #39d36a  ready / online
const STATUS_WARN := Color(1.000, 0.702, 0.278, 1.0)  # #ffb347  low power / pending
const STATUS_CRIT := Color(1.000, 0.353, 0.416, 1.0)  # #ff5a6a  abort / overload

# ── Status soft backgrounds (18% alpha fill) ─────────────────────────────
const STATUS_OK_SOFT   := Color(0.224, 0.827, 0.416, 0.18)  # ok tint
const STATUS_WARN_SOFT := Color(1.000, 0.702, 0.278, 0.18)  # warn tint
const STATUS_CRIT_SOFT := Color(1.000, 0.353, 0.416, 0.18)  # crit tint

# ── Mineral palette ───────────────────────────────────────────────────────
# Matches --ln-mineral-* CSS tokens in portrait/colors_and_type.css
const MINERAL_SILICON := Color(0.725, 0.847, 1.000, 1.0)  # #b9d8ff
const MINERAL_IRON    := Color(0.851, 0.443, 0.314, 1.0)  # #d97150
const MINERAL_ICE     := Color(0.608, 0.925, 1.000, 1.0)  # #9becff
const MINERAL_CARBON  := Color(0.416, 0.447, 0.502, 1.0)  # #6a7280
const MINERAL_GOLD    := Color(1.000, 0.820, 0.400, 1.0)  # #ffd166
const MINERAL_RARE    := Color(0.753, 0.518, 1.000, 1.0)  # #c084ff

# ── Secondary button interaction states ───────────────────────────────────
const BUTTON_HOVER    := SURFACE_HIGH
const BUTTON_PRESSED  := SURFACE_HIGHEST

# ── Typography (px at 1920×1080) ──────────────────────────────────────────
const F_DISPLAY  := 72  # hero readouts, Franc totals, mission outcomes
const F_TITLE    := 48  # screen / overlay titles
const F_HEADLINE := 36  # card / module headers
const F_BODY     := 22  # body text
const F_CAPTION  := 16  # instrument labels (uppercase tracked)
const F_BUTTON   := 20  # CTA button copy
const F_LABEL    := 16  # uppercase instrument markings
const F_MICRO    := 13  # annotations, axis ticks

# Legacy size aliases
const F_HEADING := F_HEADLINE
const F_SECTION := F_CAPTION

# ── Radii ─────────────────────────────────────────────────────────────────
const R_CARD   := 8    # standard containers — soft but not bubbly
const R_MODULE := 14   # primary CTA button, big overlays
const R_BTN    := 6    # standard buttons
const R_CHIP   := 2    # mineral chips, micro-tags

# ── Legacy aliases — keep existing callers compiling ──────────────────────
const TEXT_PRIMARY   := TEXT
const TEXT_ON_DARK   := TEXT_ON_PRIMARY
const MUTED_ON_DARK  := TEXT_MUTED
const ACCENT         := PRIMARY
const ACCENT_CYAN    := PRIMARY
const ACCENT_WARM    := SECONDARY
const ACCENT_GREEN   := STATUS_OK
const ACCENT_RED     := DANGER
const PANEL_BG       := CARD_BG
const PANEL_BORDER   := BORDER
const PANEL_OUTLINE  := BORDER
const BUTTON_BG      := SURFACE_LOW
const SPACE_VOID     := PAGE_BG
const SPACE_DARK     := SURFACE_LOW
const SPACE_SURFACE  := SURFACE_LOWEST
const FONT_TITLE     := F_TITLE
const FONT_BODY      := F_BODY
const FONT_MUTED     := F_CAPTION
const FONT_BUTTON    := F_BUTTON

# ── Typefaces ─────────────────────────────────────────────────────────────
## Oxanium-Bold: display, UI labels, buttons, chips, headings
const FONT_DISPLAY_FACE  := "res://Resources/Fonts/Oxanium-Bold.ttf"
## TurretRoad-Bold: monospace instrument readouts, coordinates, data values
const FONT_MONO_FACE     := "res://Resources/Fonts/TurretRoad-Bold.ttf"

static func font_display() -> Font:
	return load(FONT_DISPLAY_FACE) as Font

static func font_mono() -> Font:
	return load(FONT_MONO_FACE) as Font
