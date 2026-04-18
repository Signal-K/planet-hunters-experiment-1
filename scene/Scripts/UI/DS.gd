extends RefCounted
class_name DS

## Light mode design system — single source of truth for all colours and sizes.
## All other style files (PanelStyle, NebulaSciTheme) forward to this.
## Actual rendering is done by Themes/Light.tres set as the project default theme.
## Scripts should never call add_theme_*_override; use component scenes instead.

# ── Backgrounds ───────────────────────────────────────────────────────────────
const PAGE_BG  := Color(0.945, 0.961, 0.976, 1.0)  # #F1F5F9
const CARD_BG  := Color(1.0,   1.0,   1.0,   1.0)  # #FFFFFF
const CARD_ALT := Color(0.973, 0.980, 0.988, 1.0)  # #F8FAFC

# ── Borders ───────────────────────────────────────────────────────────────────
const BORDER        := Color(0.886, 0.910, 0.941, 1.0)  # #E2E8F0
const BORDER_STRONG := Color(0.796, 0.835, 0.882, 1.0)  # #CBD5E1

# ── Text ──────────────────────────────────────────────────────────────────────
const TEXT          := Color(0.059, 0.090, 0.165, 1.0)  # #0F172A
const TEXT_MUTED    := Color(0.392, 0.455, 0.545, 1.0)  # #64748B
const TEXT_ON_PRIMARY := Color(1.0, 1.0, 1.0, 1.0)      # white on cyan/red

# ── Primary (sky-600 cyan) ────────────────────────────────────────────────────
const PRIMARY       := Color(0.008, 0.518, 0.780, 1.0)  # #0284C7
const PRIMARY_HOVER := Color(0.012, 0.412, 0.631, 1.0)  # #0369A1
const PRIMARY_PRESS := Color(0.027, 0.349, 0.522, 1.0)  # #075985

# ── Danger (red-600) ──────────────────────────────────────────────────────────
const DANGER        := Color(0.863, 0.149, 0.149, 1.0)  # #DC2626
const DANGER_HOVER  := Color(0.725, 0.110, 0.110, 1.0)  # #B91C1C

# ── Status ────────────────────────────────────────────────────────────────────
const STATUS_OK   := Color(0.086, 0.639, 0.290, 1.0)  # #16A34A  NOMINAL
const STATUS_WARN := Color(0.851, 0.467, 0.024, 1.0)  # #D97706  WARNING
const STATUS_CRIT := Color(0.863, 0.149, 0.149, 1.0)  # #DC2626  CRITICAL

# ── Font sizes (canvas is 1920×1080; these appear ~0.35× on mobile) ───────────
const F_TITLE   := 52
const F_HEADING := 42
const F_BODY    := 36
const F_CAPTION := 28
const F_SECTION := 22
const F_BUTTON  := 34

# ── Radii & padding ───────────────────────────────────────────────────────────
const R_CARD := 12
const R_BTN  := 8
const R_CHIP := 6

# ── Legacy aliases so existing callers don't break ───────────────────────────
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
const BUTTON_BG      := CARD_ALT
const BUTTON_HOVER   := Color(0.945, 0.957, 0.973, 1.0)
const BUTTON_PRESSED := Color(0.886, 0.910, 0.941, 1.0)
const SPACE_VOID     := PAGE_BG
const SPACE_DARK     := CARD_ALT
const SPACE_SURFACE  := CARD_BG
const FONT_TITLE     := F_TITLE
const FONT_BODY      := F_BODY
const FONT_MUTED     := F_CAPTION
const FONT_BUTTON    := F_BUTTON
