extends BaseDialogLayer
## EmergencyLoanOfferDialog.gd
## Self-contained modal dialog shown when the player's balance drops below the
## minimum needed to launch another rocket.
##
## Matches the reference design:
##   Left sidebar  — auth terminal icon, reference ID, station label
##   Right content — EMERGENCY_LOAN_AVAILABLE header, body text, credit line
##                   card (amount + deduction note), seizure warning, debt-
##                   recovery guidance, and two action buttons.
##
## Triggered by earth_base_1._maybe_offer_loan() → instantiate + add_child.
## All styling is applied at _ready() via _on_dialog_ready().

class_name EmergencyLoanOfferDialog

# ── Sidebar ───────────────────────────────────────────────────────────────────
@onready var _sidebar: PanelContainer    = $Center/Panel/HBox/Sidebar
@onready var _icon_circle: PanelContainer= $Center/Panel/HBox/Sidebar/SidebarVBox/IconCircle
@onready var _icon_label: Label          = $Center/Panel/HBox/Sidebar/SidebarVBox/IconCircle/IconLabel
@onready var _auth_label: Label          = $Center/Panel/HBox/Sidebar/SidebarVBox/AuthLabel
@onready var _terminal_label: Label      = $Center/Panel/HBox/Sidebar/SidebarVBox/TerminalLabel

# ── Header / body ─────────────────────────────────────────────────────────────
@onready var _alert_icon: Label    = $Center/Panel/HBox/RightMargin/RightContent/TitleRow/AlertIcon
@onready var _title_label: Label   = $Center/Panel/HBox/RightMargin/RightContent/TitleRow/TitleLabel
@onready var _body_label: Label    = $Center/Panel/HBox/RightMargin/RightContent/BodyLabel

# ── Credit line card ──────────────────────────────────────────────────────────
@onready var _credit_card: PanelContainer  = $Center/Panel/HBox/RightMargin/RightContent/CreditCard
@onready var _credit_line_lbl: Label       = $Center/Panel/HBox/RightMargin/RightContent/CreditCard/CreditCardBody/CreditLineLabel
@onready var _currency_lbl: Label          = $Center/Panel/HBox/RightMargin/RightContent/CreditCard/CreditCardBody/AmountRow/CurrencyLabel
@onready var _amount_lbl: Label            = $Center/Panel/HBox/RightMargin/RightContent/CreditCard/CreditCardBody/AmountRow/AmountLabel
@onready var _deducted_lbl: Label          = $Center/Panel/HBox/RightMargin/RightContent/CreditCard/CreditCardBody/DeductedLabel

# ── Warning card ──────────────────────────────────────────────────────────────
@onready var _warning_card: PanelContainer = $Center/Panel/HBox/RightMargin/RightContent/WarningCard
@onready var _warn_icon: Label             = $Center/Panel/HBox/RightMargin/RightContent/WarningCard/WarningHBox/WarnIcon
@onready var _warn_label: Label            = $Center/Panel/HBox/RightMargin/RightContent/WarningCard/WarningHBox/WarnLabel

# ── Guidance card ─────────────────────────────────────────────────────────────
@onready var _guidance_card: PanelContainer = $Center/Panel/HBox/RightMargin/RightContent/GuidanceCard
@onready var _guidance_title: Label         = $Center/Panel/HBox/RightMargin/RightContent/GuidanceCard/GuidanceVBox/GuidanceTitle
@onready var _tip1: Label                   = $Center/Panel/HBox/RightMargin/RightContent/GuidanceCard/GuidanceVBox/Tip1
@onready var _tip2: Label                   = $Center/Panel/HBox/RightMargin/RightContent/GuidanceCard/GuidanceVBox/Tip2
@onready var _tip3: Label                   = $Center/Panel/HBox/RightMargin/RightContent/GuidanceCard/GuidanceVBox/Tip3

# ── Buttons ───────────────────────────────────────────────────────────────────
@onready var _accept_btn: Button  = $Center/Panel/HBox/RightMargin/RightContent/ButtonRow/AcceptButton
@onready var _decline_btn: Button = $Center/Panel/HBox/RightMargin/RightContent/ButtonRow/DeclineButton

# ── Colour palette ────────────────────────────────────────────────────────────
const _CYAN        := Color(0.28, 0.88, 0.96, 1.0)
const _CYAN_DIM    := Color(0.28, 0.88, 0.96, 0.80)
const _GREEN       := Color(0.20, 0.82, 0.52, 1.0)
const _GREEN_DIM   := Color(0.20, 0.82, 0.52, 0.80)
const _RED         := Color(0.95, 0.40, 0.40, 1.0)
const _RED_BG      := Color(0.30, 0.07, 0.07, 0.70)
const _RED_BORDER  := Color(0.85, 0.28, 0.28, 0.42)
const _TEXT        := Color(0.88, 0.92, 0.96, 1.0)
const _MUTED       := Color(0.70, 0.78, 0.86, 0.85)
const _MUTED_DIM   := Color(0.55, 0.65, 0.75, 0.80)

# Called by BaseDialogLayer._ready() after backdrop + panel are styled.
func _on_dialog_ready() -> void:
	_style_sidebar()
	_style_header()
	_style_credit_card()
	_style_warning_card()
	_style_guidance_card()
	_style_buttons()
	_accept_btn.pressed.connect(_on_accept)
	_decline_btn.pressed.connect(_on_decline)

# ── Sidebar styling ────────────────────────────────────────────────────────────

func _style_sidebar() -> void:
	# Sidebar panel — darker glass, right-border divider, left-rounded corners only
	var s := StyleBoxFlat.new()
	s.bg_color        = Color(0.04, 0.07, 0.12, 0.65)
	s.border_color    = Color(_CYAN.r, _CYAN.g, _CYAN.b, 0.25)
	s.border_width_right = 1
	s.corner_radius_top_left    = 17
	s.corner_radius_bottom_left = 17
	s.content_margin_left   = 20
	s.content_margin_right  = 20
	s.content_margin_top    = 28
	s.content_margin_bottom = 28
	_sidebar.add_theme_stylebox_override("panel", s)

	# Icon circle — teal glow ring
	var cs := StyleBoxFlat.new()
	cs.bg_color     = Color(_CYAN.r, _CYAN.g, _CYAN.b, 0.16)
	cs.border_color = Color(_CYAN.r, _CYAN.g, _CYAN.b, 0.55)
	cs.set_border_width_all(1)
	cs.set_corner_radius_all(40)
	cs.content_margin_left   = 16
	cs.content_margin_right  = 16
	cs.content_margin_top    = 12
	cs.content_margin_bottom = 12
	_icon_circle.add_theme_stylebox_override("panel", cs)

	_icon_label.add_theme_font_size_override("font_size", 30)
	_icon_label.add_theme_color_override("font_color", _CYAN)

	_auth_label.add_theme_color_override("font_color", _CYAN_DIM)
	_auth_label.add_theme_font_size_override("font_size", 11)

	_terminal_label.add_theme_color_override("font_color", _MUTED_DIM)
	_terminal_label.add_theme_font_size_override("font_size", 10)

# ── Header + body ──────────────────────────────────────────────────────────────

func _style_header() -> void:
	# △ alert icon — green
	_alert_icon.add_theme_color_override("font_color", _GREEN)
	_alert_icon.add_theme_font_size_override("font_size", 16)

	# Title — green, all-caps monospace feel
	_title_label.add_theme_color_override("font_color", _GREEN)
	_title_label.add_theme_font_size_override("font_size", 15)

	# Body text
	_body_label.add_theme_color_override("font_color", _TEXT)
	_body_label.add_theme_font_size_override("font_size", 14)

# ── Credit line card ───────────────────────────────────────────────────────────

func _style_credit_card() -> void:
	var s := StyleBoxFlat.new()
	s.bg_color     = Color(0.04, 0.08, 0.13, 0.95)
	s.border_color = Color(_CYAN.r, _CYAN.g, _CYAN.b, 0.28)
	s.set_border_width_all(1)
	s.set_corner_radius_all(12)
	s.content_margin_left   = 18
	s.content_margin_right  = 18
	s.content_margin_top    = 14
	s.content_margin_bottom = 14
	_credit_card.add_theme_stylebox_override("panel", s)

	_credit_line_lbl.add_theme_color_override("font_color", _MUTED_DIM)
	_credit_line_lbl.add_theme_font_size_override("font_size", 10)

	# "F" currency symbol — slightly smaller, cyan, baseline-aligned
	_currency_lbl.add_theme_color_override("font_color", _CYAN_DIM)
	_currency_lbl.add_theme_font_size_override("font_size", 26)

	# Large loan amount — cyan, bold feel
	_amount_lbl.add_theme_color_override("font_color", _CYAN)
	_amount_lbl.add_theme_font_size_override("font_size", 36)

	# "DEDUCTED FROM…" green caps
	_deducted_lbl.add_theme_color_override("font_color", _GREEN_DIM)
	_deducted_lbl.add_theme_font_size_override("font_size", 10)

# ── Warning card ───────────────────────────────────────────────────────────────

func _style_warning_card() -> void:
	var s := StyleBoxFlat.new()
	s.bg_color     = _RED_BG
	s.border_color = _RED_BORDER
	s.set_border_width_all(1)
	s.set_corner_radius_all(10)
	s.content_margin_left   = 14
	s.content_margin_right  = 14
	s.content_margin_top    = 10
	s.content_margin_bottom = 10
	_warning_card.add_theme_stylebox_override("panel", s)

	_warn_icon.add_theme_color_override("font_color", _RED)
	_warn_icon.add_theme_font_size_override("font_size", 14)

	_warn_label.add_theme_color_override("font_color", Color(0.95, 0.72, 0.72, 1.0))
	_warn_label.add_theme_font_size_override("font_size", 12)

# ── Guidance card ──────────────────────────────────────────────────────────────

func _style_guidance_card() -> void:
	var s := StyleBoxFlat.new()
	s.bg_color     = Color(0.06, 0.14, 0.10, 0.55)
	s.border_color = Color(_GREEN.r, _GREEN.g, _GREEN.b, 0.28)
	s.set_border_width_all(1)
	s.set_corner_radius_all(10)
	s.content_margin_left   = 16
	s.content_margin_right  = 16
	s.content_margin_top    = 12
	s.content_margin_bottom = 12
	_guidance_card.add_theme_stylebox_override("panel", s)

	_guidance_title.add_theme_color_override("font_color", _GREEN_DIM)
	_guidance_title.add_theme_font_size_override("font_size", 12)

	for tip in [_tip1, _tip2, _tip3]:
		tip.add_theme_color_override("font_color", Color(0.78, 0.88, 0.82, 0.90))
		tip.add_theme_font_size_override("font_size", 12)

# ── Buttons ────────────────────────────────────────────────────────────────────

func _style_buttons() -> void:
	# ACCEPT LOAN — filled teal CTA
	var a_n := StyleBoxFlat.new()
	a_n.bg_color     = Color(0.12, 0.56, 0.68, 1.0)
	a_n.border_color = Color(_CYAN.r, _CYAN.g, _CYAN.b, 0.55)
	a_n.set_border_width_all(1)
	a_n.set_corner_radius_all(12)
	a_n.content_margin_left   = 22
	a_n.content_margin_right  = 22
	a_n.content_margin_top    = 13
	a_n.content_margin_bottom = 13
	var a_h := a_n.duplicate(); a_h.bg_color = Color(0.18, 0.66, 0.80, 1.0)
	var a_p := a_n.duplicate(); a_p.bg_color = Color(0.08, 0.44, 0.56, 1.0)
	_accept_btn.add_theme_stylebox_override("normal",  a_n)
	_accept_btn.add_theme_stylebox_override("hover",   a_h)
	_accept_btn.add_theme_stylebox_override("pressed", a_p)
	_accept_btn.add_theme_stylebox_override("focus",   a_h)
	_accept_btn.add_theme_color_override("font_color",         Color(0.96, 0.99, 1.0, 1.0))
	_accept_btn.add_theme_color_override("font_hover_color",   Color(0.96, 0.99, 1.0, 1.0))
	_accept_btn.add_theme_color_override("font_pressed_color", Color(0.96, 0.99, 1.0, 1.0))
	_accept_btn.add_theme_font_size_override("font_size", 14)

	# NO THANKS — outline/dashed border secondary
	PanelStyle.apply_outline_button(_decline_btn, Color(_CYAN.r, _CYAN.g, _CYAN.b, 0.60))
	_decline_btn.add_theme_font_size_override("font_size", 14)

# ── Signal handlers ────────────────────────────────────────────────────────────

func _on_accept() -> void:
	var app = preload("res://Scripts/Utils/AppControllerHelper.gd").get_instance()
	if app and app.has_method("take_loan"):
		app.take_loan()
	close()

func _on_decline() -> void:
	close()
