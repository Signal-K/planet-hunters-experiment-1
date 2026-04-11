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
@onready var _legacy_shell: Control = $Center/Panel/HBox

var _accept_btn: Button
var _decline_btn: Button

func _on_dialog_ready() -> void:
	$Backdrop.color = Color(0.84, 0.90, 0.88, 0.54)
	if _legacy_shell:
		_legacy_shell.queue_free()
		_legacy_shell = null
	_style_root_panel()
	_build_layout()

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

func _build_layout() -> void:
	for child in _panel.get_children():
		if child != _legacy_shell:
			child.queue_free()

	var margin := MarginContainer.new()
	margin.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	margin.add_theme_constant_override("margin_left", 28)
	margin.add_theme_constant_override("margin_top", 26)
	margin.add_theme_constant_override("margin_right", 28)
	margin.add_theme_constant_override("margin_bottom", 24)
	_panel.add_child(margin)

	var root := VBoxContainer.new()
	root.add_theme_constant_override("separation", 18)
	margin.add_child(root)

	root.add_child(_build_header())
	root.add_child(_build_body_text())
	root.add_child(_build_credit_card())
	root.add_child(_build_warning_card())
	root.add_child(_build_guidance_card())
	root.add_child(_build_button_row())

func _build_header() -> Control:
	var top := HBoxContainer.new()
	top.add_theme_constant_override("separation", 16)

	var icon_shell := PanelContainer.new()
	var icon_style := StyleBoxFlat.new()
	icon_style.bg_color = ACCENT_BG
	icon_style.set_corner_radius_all(36)
	icon_style.content_margin_left = 18
	icon_style.content_margin_top = 14
	icon_style.content_margin_right = 18
	icon_style.content_margin_bottom = 14
	icon_shell.add_theme_stylebox_override("panel", icon_style)
	top.add_child(icon_shell)

	var icon := Label.new()
	icon.text = "🏛"
	icon.add_theme_font_size_override("font_size", 28)
	icon.add_theme_color_override("font_color", TITLE_COLOR)
	icon.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	icon.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	icon_shell.add_child(icon)

	var copy_col := VBoxContainer.new()
	copy_col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	copy_col.add_theme_constant_override("separation", 4)
	top.add_child(copy_col)

	var title := Label.new()
	title.text = "LOAN AVAILABLE"
	title.add_theme_color_override("font_color", TITLE_COLOR)
	title.add_theme_font_size_override("font_size", 22)
	copy_col.add_child(title)

	var auth := Label.new()
	auth.text = "EMERGENCY_LOAN_AVAILABLE  //  AUTH_REF: 882-X"
	auth.add_theme_color_override("font_color", MUTED_COLOR)
	auth.add_theme_font_size_override("font_size", 12)
	copy_col.add_child(auth)

	var station := Label.new()
	station.text = "TERMINAL_STATION // Station Omega Command"
	station.add_theme_color_override("font_color", MUTED_COLOR)
	station.add_theme_font_size_override("font_size", 12)
	copy_col.add_child(station)

	var close_btn := Button.new()
	close_btn.text = "✕"
	close_btn.custom_minimum_size = Vector2(42, 42)
	PanelStyle.apply_outline_button(close_btn, Color(0.78, 0.84, 0.86, 1.0), MUTED_COLOR)
	close_btn.add_theme_font_size_override("font_size", 20)
	close_btn.pressed.connect(close)
	top.add_child(close_btn)

	return top

func _build_body_text() -> Control:
	var label := Label.new()
	label.text = "Your account balance has reached critical depletion. Station Omega Command offers an emergency credit line to ensure continued operations."
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	label.add_theme_color_override("font_color", BODY_COLOR)
	label.add_theme_font_size_override("font_size", 16)
	return label

func _build_credit_card() -> Control:
	var card := PanelContainer.new()
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
	card.add_theme_stylebox_override("panel", style)

	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 10)
	card.add_child(vbox)

	var eyebrow := Label.new()
	eyebrow.text = "CREDIT_LINE_STATION_OMEGA"
	eyebrow.add_theme_color_override("font_color", Color(0.37, 0.64, 0.61, 1.0))
	eyebrow.add_theme_font_size_override("font_size", 12)
	vbox.add_child(eyebrow)

	var amount_row := HBoxContainer.new()
	amount_row.add_theme_constant_override("separation", 4)
	vbox.add_child(amount_row)

	var currency := Label.new()
	currency.text = "F"
	currency.add_theme_color_override("font_color", Color(0.34, 0.64, 0.60, 0.84))
	currency.add_theme_font_size_override("font_size", 24)
	amount_row.add_child(currency)

	var amount := Label.new()
	amount.text = _format_amount(int(AppControllerScript.LOAN_AMOUNT))
	amount.add_theme_color_override("font_color", TITLE_COLOR)
	amount.add_theme_font_size_override("font_size", 38)
	amount_row.add_child(amount)

	var note := Label.new()
	note.text = "AUTO-DEDUCTED FROM NEXT MISSION PAYOUT."
	note.add_theme_color_override("font_color", Color(0.36, 0.55, 0.10, 1.0))
	note.add_theme_font_size_override("font_size", 12)
	vbox.add_child(note)

	return card

func _build_warning_card() -> Control:
	var card := PanelContainer.new()
	var style := StyleBoxFlat.new()
	style.bg_color = WARN_BG
	style.border_color = WARN_EDGE
	style.set_border_width_all(1)
	style.set_corner_radius_all(14)
	style.content_margin_left = 16
	style.content_margin_top = 14
	style.content_margin_right = 16
	style.content_margin_bottom = 14
	card.add_theme_stylebox_override("panel", style)

	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 10)
	card.add_child(row)

	var icon := Label.new()
	icon.text = "⚠"
	icon.add_theme_color_override("font_color", WARN_TEXT)
	icon.add_theme_font_size_override("font_size", 15)
	row.add_child(icon)

	var text := Label.new()
	text.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	text.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	text.text = "Regulatory Note: Repay within 3 standard cycles to avoid asset seizure protocols."
	text.add_theme_color_override("font_color", WARN_TEXT)
	text.add_theme_font_size_override("font_size", 13)
	row.add_child(text)

	return card

func _build_guidance_card() -> Control:
	var card := PanelContainer.new()
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.97, 0.985, 0.98, 1.0)
	style.border_color = Color(0.84, 0.91, 0.90, 0.92)
	style.set_border_width_all(1)
	style.set_corner_radius_all(16)
	style.content_margin_left = 16
	style.content_margin_top = 14
	style.content_margin_right = 16
	style.content_margin_bottom = 14
	card.add_theme_stylebox_override("panel", style)

	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 8)
	card.add_child(vbox)

	var title := Label.new()
	title.text = "How to recover"
	title.add_theme_color_override("font_color", TITLE_COLOR)
	title.add_theme_font_size_override("font_size", 14)
	vbox.add_child(title)

	for line in [
		"Accept the line and launch again immediately. Missions still net positive even with the deduction.",
		"Repayment is automatic. The next mission cycle clears the line before regular payout lands.",
		"Prioritize contractor routes with heavier mineral orders if you want the debt gone in one run."
	]:
		var tip := Label.new()
		tip.text = "• " + line
		tip.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		tip.add_theme_color_override("font_color", BODY_COLOR)
		tip.add_theme_font_size_override("font_size", 13)
		vbox.add_child(tip)

	return card

func _build_button_row() -> Control:
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 14)

	_accept_btn = Button.new()
	_accept_btn.text = "ACCEPT LINE"
	_accept_btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_accept_btn.custom_minimum_size = Vector2(0, 60)
	_apply_primary_button(_accept_btn)
	_accept_btn.pressed.connect(_on_accept)
	row.add_child(_accept_btn)

	_decline_btn = Button.new()
	_decline_btn.text = "DISMISS"
	_decline_btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_decline_btn.custom_minimum_size = Vector2(0, 60)
	_apply_secondary_button(_decline_btn)
	_decline_btn.pressed.connect(_on_decline)
	row.add_child(_decline_btn)

	return row

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
