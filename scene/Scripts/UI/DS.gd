extends RefCounted
class_name DS

## Terminal Ethereal — Light-Fi design system.
## Teal-green primary, warm gray-green surfaces, Cyan-Mist shadows.
## The No-Line Rule: no 1px borders for layout sectioning; use tonal surface shifts.

# ── Surfaces ──────────────────────────────────────────────────────────────
const PAGE_BG         := Color(0.973, 0.980, 0.976, 1.0)  # #f8faf9  base layer
const SURFACE_LOW     := Color(0.941, 0.957, 0.953, 1.0)  # #f0f4f3  secondary zones
const SURFACE_LOWEST  := Color(1.000, 1.000, 1.000, 1.0)  # #ffffff  elevated cards
const SURFACE_HIGH    := Color(0.878, 0.906, 0.898, 1.0)  # #e0e7e4  recessed / sec button
const SURFACE_HIGHEST := Color(0.835, 0.863, 0.855, 1.0)  # #d5dcda  pressed surface
const SURFACE_BRIGHT  := Color(0.988, 0.996, 0.992, 1.0)  # #fcfefe  overlay backdrop

# Backwards-compat surface aliases
const CARD_BG  := SURFACE_LOWEST
const CARD_ALT := SURFACE_LOW

# ── Primary — Teal Green (#006c5c) ────────────────────────────────────────
const PRIMARY           := Color(0.000, 0.424, 0.361, 1.0)  # #006c5c
const PRIMARY_HOVER     := Color(0.000, 0.353, 0.298, 1.0)  # #005a4c
const PRIMARY_PRESS     := Color(0.000, 0.282, 0.235, 1.0)  # #004840
const PRIMARY_CONTAINER := Color(0.408, 0.980, 0.867, 1.0)  # #68fadd
const PRIMARY_FIXED_DIM := Color(0.310, 0.800, 0.710, 1.0)  # #4fcdb5
const ON_PRIMARY        := Color(1.000, 1.000, 1.000, 1.0)

# ── Secondary — Olive Green (#496900) bio / green-zone data ───────────────
const SECONDARY       := Color(0.286, 0.412, 0.000, 1.0)  # #496900
const SECONDARY_FIXED := Color(0.776, 0.933, 0.667, 1.0)  # #c6eeaa  micro-bar accent

# ── Text ──────────────────────────────────────────────────────────────────
const TEXT            := Color(0.176, 0.204, 0.200, 1.0)  # #2d3433
const TEXT_MUTED      := Color(0.349, 0.376, 0.376, 1.0)  # #596060
const TEXT_ON_PRIMARY := Color(1.000, 1.000, 1.000, 1.0)
const INVERSE_SURFACE := Color(0.043, 0.059, 0.059, 1.0)  # #0b0f0f  deep contrast

# ── Borders (ghost only — never for layout sectioning) ────────────────────
const OUTLINE_VARIANT := Color(0.675, 0.702, 0.698, 1.0)  # #acb3b2
const BORDER          := Color(0.675, 0.702, 0.698, 0.15)  # 15% ghost — dense grids
const BORDER_STRONG   := Color(0.675, 0.702, 0.698, 0.40)  # 40% ghost

# ── Danger ────────────────────────────────────────────────────────────────
const DANGER       := Color(0.863, 0.149, 0.149, 1.0)  # #DC2626
const DANGER_HOVER := Color(0.725, 0.110, 0.110, 1.0)  # #B91C1C

# ── Status ────────────────────────────────────────────────────────────────
const STATUS_OK   := Color(0.086, 0.639, 0.290, 1.0)  # #16A34A
const STATUS_WARN := Color(0.851, 0.467, 0.024, 1.0)  # #D97706
const STATUS_CRIT := Color(0.863, 0.149, 0.149, 1.0)  # #DC2626

# ── Secondary button interaction states ───────────────────────────────────
const BUTTON_HOVER    := SURFACE_HIGH
const BUTTON_PRESSED  := SURFACE_HIGHEST

# ── Typography (px at 1920×1080) ──────────────────────────────────────────
const F_DISPLAY  := 72  # primary telemetry readouts, deck designations
const F_TITLE    := 52  # panel / screen titles
const F_HEADLINE := 36  # section headers (headline-sm)
const F_BODY     := 28  # body text
const F_CAPTION  := 22  # captions, labels
const F_BUTTON   := 28  # command triggers
const F_LABEL    := 18  # uppercase instrument markings
const F_MICRO    := 14  # annotations

# Legacy size aliases
const F_HEADING := F_HEADLINE
const F_SECTION := F_CAPTION

# ── Radii ─────────────────────────────────────────────────────────────────
const R_CARD := 16   # standard containers (lg)
const R_MODULE := 24  # dashboard modules (xl)
const R_BTN  := 12   # buttons (md)
const R_CHIP := 8    # chips

# ── Legacy aliases — keep existing callers compiling ──────────────────────
const TEXT_PRIMARY   := TEXT
const TEXT_ON_DARK   := TEXT_ON_PRIMARY
const MUTED_ON_DARK  := TEXT_MUTED
const ACCENT         := PRIMARY
const ACCENT_CYAN    := PRIMARY
const ACCENT_WARM    := PRIMARY
const ACCENT_GREEN   := STATUS_OK
const ACCENT_RED     := DANGER
const PANEL_BG       := CARD_BG
const PANEL_BORDER   := BORDER
const PANEL_OUTLINE  := BORDER
const BUTTON_BG      := SURFACE_HIGH
const SPACE_VOID     := PAGE_BG
const SPACE_DARK     := SURFACE_LOW
const SPACE_SURFACE  := SURFACE_LOWEST
const FONT_TITLE     := F_TITLE
const FONT_BODY      := F_BODY
const FONT_MUTED     := F_CAPTION
const FONT_BUTTON    := F_BUTTON
