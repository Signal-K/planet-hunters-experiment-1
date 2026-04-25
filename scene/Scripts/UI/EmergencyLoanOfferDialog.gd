extends "res://Scripts/UI/BaseDialogLayer.gd"

class_name EmergencyLoanOfferDialog

const AppControllerHelper = preload("res://Scripts/Utils/AppControllerHelper.gd")
const AppControllerScript = preload("res://Scripts/Systems/AppController.gd")
const NumberFormat = preload("res://Scripts/Utils/NumberFormat.gd")

const SURFACE_BG := Color(0.95, 0.975, 0.98, 0.98)
const SURFACE_EDGE := Color(0.77, 0.86, 0.88, 0.92)
const TITLE_COLOR := Color(0.04, 0.47, 0.43, 1.0)
const BODY_COLOR := Color(0.34, 0.40, 0.44, 1.0)
const MUTED_COLOR := Color(0.46, 0.53, 0.56, 1.0)
const ACCENT_BG := Color(0.85, 0.98, 0.94, 1.0)
const ACCENT_EDGE := Color(0.51, 0.84, 0.78, 0.82)
const CTA_BG := Color(0.04, 0.47, 0.43, 1.0)
const CTA_TEXT := Color(0.96, 0.99, 0.98, 1.0)
const WARN_BG := Color(0.99, 0.93, 0.92, 1.0)
const WARN_EDGE := Color(0.93, 0.72, 0.68, 0.82)
const WARN_TEXT := Color(0.74, 0.29, 0.24, 1.0)

@onready var _panel: PanelContainer = $Center/Panel
@onready var _sidebar: PanelContainer = $Center/Panel/HBox/Sidebar
@onready var _icon_circle: PanelContainer = $Center/Panel/HBox/Sidebar/SidebarVBox/IconCircle
@onready var _icon_label: Label = $Center/Panel/HBox/Sidebar/SidebarVBox/IconCircle/IconLabel
@onready var _auth_label: Label = $Center/Panel/HBox/Sidebar/SidebarVBox/AuthLabel
@onready var _terminal_label: Label = $Center/Panel/HBox/Sidebar/SidebarVBox/TerminalLabel
@onready var _alert_icon: Label = $Center/Panel/HBox/RightMargin/RightContent/TitleRow/AlertIcon
@onready var _title_label: Label = $Center/Panel/HBox/RightMargin/RightContent/TitleRow/TitleLabel
@onready var _body_label: Label = $Center/Panel/HBox/RightMargin/RightContent/BodyLabel
@onready var _credit_card: PanelContainer = $Center/Panel/HBox/RightMargin/RightContent/CreditCard
@onready var _credit_line_label: Label = $Center/Panel/HBox/RightMargin/RightContent/CreditCard/CreditCardBody/CreditLineLabel
@onready var _currency_label: Label = $Center/Panel/HBox/RightMargin/RightContent/CreditCard/CreditCardBody/AmountRow/CurrencyLabel
@onready var _amount_label: Label = $Center/Panel/HBox/RightMargin/RightContent/CreditCard/CreditCardBody/AmountRow/AmountLabel
@onready var _deducted_label: Label = $Center/Panel/HBox/RightMargin/RightContent/CreditCard/CreditCardBody/DeductedLabel
@onready var _warning_card: PanelContainer = $Center/Panel/HBox/RightMargin/RightContent/WarningCard
@onready var _warn_icon: Label = $Center/Panel/HBox/RightMargin/RightContent/WarningCard/WarningHBox/WarnIcon
@onready var _warn_label: Label = $Center/Panel/HBox/RightMargin/RightContent/WarningCard/WarningHBox/WarnLabel
@onready var _guidance_card: PanelContainer = $Center/Panel/HBox/RightMargin/RightContent/GuidanceCard
@onready var _guidance_title: Label = $Center/Panel/HBox/RightMargin/RightContent/GuidanceCard/GuidanceVBox/GuidanceTitle
@onready var _tip_1: Label = $Center/Panel/HBox/RightMargin/RightContent/GuidanceCard/GuidanceVBox/Tip1
@onready var _tip_2: Label = $Center/Panel/HBox/RightMargin/RightContent/GuidanceCard/GuidanceVBox/Tip2
@onready var _tip_3: Label = $Center/Panel/HBox/RightMargin/RightContent/GuidanceCard/GuidanceVBox/Tip3
@onready var _accept_btn: Button = $Center/Panel/HBox/RightMargin/RightContent/ButtonRow/AcceptButton
@onready var _decline_btn: Button = $Center/Panel/HBox/RightMargin/RightContent/ButtonRow/DeclineButton

func _on_dialog_ready() -> void:
	$Backdrop.color = Color(0.84, 0.90, 0.88, 0.54)
	_style_root_panel()
	_bind_layout()

func _style_root_panel() -> void:
	var style := StyleBoxFlat.new()
	style.bg_color = SURFACE_BG
	style.border_color = SURFACE_EDGE
	style.set_border_width_all(1)
	style.set_corner_radius_all(28)
	style.shadow_color = Color(0.18, 0.26, 0.28, 0.14)
	style.shadow_size = 34
	style.shadow_offset = Vector2(0, 10)
	_panel.add_theme_stylebox_override("panel", style)
	_panel.custom_minimum_size = Vector2(720, 0)

func _bind_layout() -> void:
	var icon_style := StyleBoxFlat.new()
	icon_style.bg_color = ACCENT_BG
	icon_style.set_corner_radius_all(36)
	icon_style.content_margin_left = 18
	icon_style.content_margin_top = 14
	icon_style.content_margin_right = 18
	icon_style.content_margin_bottom = 14
	_icon_circle.add_theme_stylebox_override("panel", icon_style)
	_icon_label.text = "🏛"
	_icon_label.add_theme_font_size_override("font_size", 28)
	_icon_label.add_theme_color_override("font_color", TITLE_COLOR)
	_icon_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_icon_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_auth_label.text = "EMERGENCY_LOAN_AVAILABLE  //  AUTH_REF: 882-X"
	_auth_label.add_theme_color_override("font_color", MUTED_COLOR)
	_auth_label.add_theme_font_size_override("font_size", 12)
	_terminal_label.text = "TERMINAL_STATION // Station Omega Command"
	_terminal_label.add_theme_color_override("font_color", MUTED_COLOR)
	_terminal_label.add_theme_font_size_override("font_size", 12)
	_alert_icon.text = "△"
	_alert_icon.add_theme_color_override("font_color", TITLE_COLOR)
	_alert_icon.add_theme_font_size_override("font_size", 18)
	_title_label.text = "LOAN AVAILABLE"
	_title_label.add_theme_color_override("font_color", TITLE_COLOR)
	_title_label.add_theme_font_size_override("font_size", 22)
	_body_label.text = "Your account balance has reached critical depletion. Station Omega Command offers an emergency credit line to ensure continued operations."
	_body_label.add_theme_color_override("font_color", BODY_COLOR)
	_body_label.add_theme_font_size_override("font_size", 16)
	_style_credit_card()
	_style_warning_card()
	_style_guidance_card()
	_accept_btn.text = "ACCEPT LINE"
	_decline_btn.text = "DISMISS"
	_accept_btn.custom_minimum_size = Vector2(0, 60)
	_decline_btn.custom_minimum_size = Vector2(0, 60)
	_apply_primary_button(_accept_btn)
	_apply_secondary_button(_decline_btn)
	if not _accept_btn.pressed.is_connected(_on_accept):
		_accept_btn.pressed.connect(_on_accept)
	if not _decline_btn.pressed.is_connected(_on_decline):
		_decline_btn.pressed.connect(_on_decline)

func _style_credit_card() -> void:
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.98, 0.99, 0.99, 1.0)
	style.border_color = Color(0.84, 0.90, 0.92, 1.0)
	style.set_border_width_all(1)
	style.set_corner_radius_all(18)
	style.shadow_color = Color(0.18, 0.26, 0.28, 0.08)
	style.shadow_size = 18
	style.shadow_offset = Vector2(0, 6)
	style.content_margin_left = 20
	style.content_margin_top = 18
	style.content_margin_right = 20
	style.content_margin_bottom = 18
	_credit_card.add_theme_stylebox_override("panel", style)
	_credit_line_label.text = "CREDIT_LINE_STATION_OMEGA"
	_credit_line_label.add_theme_color_override("font_color", Color(0.37, 0.64, 0.61, 1.0))
	_credit_line_label.add_theme_font_size_override("font_size", 12)
	_currency_label.text = "F"
	_currency_label.add_theme_color_override("font_color", Color(0.34, 0.64, 0.60, 0.84))
	_currency_label.add_theme_font_size_override("font_size", 24)
	_amount_label.text = _format_amount(int(AppControllerScript.LOAN_AMOUNT))
	_amount_label.add_theme_color_override("font_color", TITLE_COLOR)
	_amount_label.add_theme_font_size_override("font_size", 38)
	_deducted_label.text = "AUTO-DEDUCTED FROM NEXT MISSION PAYOUT."
	_deducted_label.add_theme_color_override("font_color", Color(0.36, 0.55, 0.10, 1.0))
	_deducted_label.add_theme_font_size_override("font_size", 12)

func _style_warning_card() -> void:
	var style := StyleBoxFlat.new()
	style.bg_color = WARN_BG
	style.border_color = WARN_EDGE
	style.set_border_width_all(1)
	style.set_corner_radius_all(14)
	style.content_margin_left = 16
	style.content_margin_top = 14
	style.content_margin_right = 16
	style.content_margin_bottom = 14
	_warning_card.add_theme_stylebox_override("panel", style)
	_warn_icon.text = "⚠"
	_warn_icon.add_theme_color_override("font_color", WARN_TEXT)
	_warn_icon.add_theme_font_size_override("font_size", 15)
	_warn_label.text = "Regulatory Note: Repay within 3 standard cycles to avoid asset seizure protocols."
	_warn_label.add_theme_color_override("font_color", WARN_TEXT)
	_warn_label.add_theme_font_size_override("font_size", 13)

func _style_guidance_card() -> void:
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.97, 0.985, 0.98, 1.0)
	style.border_color = Color(0.84, 0.91, 0.90, 0.92)
	style.set_border_width_all(1)
	style.set_corner_radius_all(16)
	style.content_margin_left = 16
	style.content_margin_top = 14
	style.content_margin_right = 16
	style.content_margin_bottom = 14
	_guidance_card.add_theme_stylebox_override("panel", style)
	_guidance_title.text = "How to recover"
	_guidance_title.add_theme_color_override("font_color", TITLE_COLOR)
	_guidance_title.add_theme_font_size_override("font_size", 14)
	var tips := [
		"• Accept the line and launch again immediately. Missions still net positive even with the deduction.",
		"• Repayment is automatic. The next mission cycle clears the line before regular payout lands.",
		"• Prioritize contractor routes with heavier mineral orders if you want the debt gone in one run."
	]
	for idx in range(tips.size()):
		var label: Label = [_tip_1, _tip_2, _tip_3][idx]
		label.text = tips[idx]
		label.add_theme_color_override("font_color", BODY_COLOR)
		label.add_theme_font_size_override("font_size", 13)

func _apply_primary_button(button: Button) -> void:
	var normal := StyleBoxFlat.new()
	normal.bg_color = CTA_BG
	normal.border_color = Color(0.15, 0.72, 0.66, 0.55)
	normal.set_border_width_all(1)
	normal.set_corner_radius_all(18)
	normal.content_margin_left = 24
	normal.content_margin_top = 16
	normal.content_margin_right = 24
	normal.content_margin_bottom = 16
	var hover := normal.duplicate()
	hover.bg_color = CTA_BG.lightened(0.08)
	var pressed := normal.duplicate()
	pressed.bg_color = CTA_BG.darkened(0.08)
	button.add_theme_stylebox_override("normal", normal)
	button.add_theme_stylebox_override("hover", hover)
	button.add_theme_stylebox_override("pressed", pressed)
	button.add_theme_stylebox_override("focus", hover)
	button.add_theme_color_override("font_color", CTA_TEXT)
	button.add_theme_color_override("font_hover_color", CTA_TEXT)
	button.add_theme_color_override("font_pressed_color", CTA_TEXT)
	button.add_theme_font_size_override("font_size", 16)

func _apply_secondary_button(button: Button) -> void:
	var normal := StyleBoxFlat.new()
	normal.bg_color = Color(0.99, 0.995, 0.995, 1.0)
	normal.border_color = Color(0.74, 0.82, 0.85, 1.0)
	normal.set_border_width_all(1)
	normal.set_corner_radius_all(18)
	normal.content_margin_left = 24
	normal.content_margin_top = 16
	normal.content_margin_right = 24
	normal.content_margin_bottom = 16
	var hover := normal.duplicate()
	hover.bg_color = Color(0.96, 0.98, 0.98, 1.0)
	var pressed := normal.duplicate()
	pressed.bg_color = Color(0.94, 0.96, 0.97, 1.0)
	button.add_theme_stylebox_override("normal", normal)
	button.add_theme_stylebox_override("hover", hover)
	button.add_theme_stylebox_override("pressed", pressed)
	button.add_theme_stylebox_override("focus", hover)
	button.add_theme_color_override("font_color", MUTED_COLOR)
	button.add_theme_color_override("font_hover_color", MUTED_COLOR)
	button.add_theme_color_override("font_pressed_color", MUTED_COLOR)
	button.add_theme_font_size_override("font_size", 16)

func _on_accept() -> void:
	var app = AppControllerHelper.get_instance()
	if app and app.has_method("take_loan"):
		app.take_loan()
	close()

func _on_decline() -> void:
	close()

func _format_amount(amount: int) -> String:
	return NumberFormat.commas(str(amount))
