extends VBoxContainer
class_name EarthBaseProgressionCards

const PanelStyle = preload("res://Scripts/UI/PanelStyle.gd")
const EarthBaseActionCard = preload("res://Scripts/UI/EarthBaseActionCard.gd")
const DS = preload("res://Scripts/UI/DS.gd")

@onready var _active_mission_card:  EarthBaseActionCard = $ActiveMissionCard
@onready var _control_station_card: EarthBaseActionCard = $ControlStationCard
@onready var _scanner_station_card: EarthBaseActionCard = $ScannerStationCard
@onready var _next_mission_card:    EarthBaseActionCard = $NextMissionCard

# Accent colors matching the design spec priority states
const _ACCENT_MISSION := Color(0.494, 0.784, 1.000, 1.0)   # #7ec8ff — active mission
const _ACCENT_LAUNCH  := Color(0.961, 0.651, 0.137, 1.0)   # #f5a623 — launch ready / next mission
const _ACCENT_DEBRIEF := Color(0.224, 0.827, 0.416, 1.0)   # #39d36a — debrief ready
const _ACCENT_BUILD   := Color(0.961, 0.651, 0.137, 1.0)   # #f5a623 — build required

func hide_all() -> void:
	for card in [_active_mission_card, _control_station_card, _scanner_station_card, _next_mission_card]:
		if card == null:
			continue
		card.visible = false

func show_active_mission(context: Dictionary, pressed_callable: Callable) -> void:
	_configure_card(
		_active_mission_card,
		str(context.get("title", _active_mission_card.card_title)),
		str(context.get("subtitle", _active_mission_card.card_subtitle)),
		str(context.get("hint", _active_mission_card.card_hint)),
		str(context.get("cta", _active_mission_card.card_cta)),
		_ACCENT_MISSION,
		pressed_callable
	)

func show_control_station(pressed_callable: Callable) -> void:
	_configure_card_from_defaults(_control_station_card, _ACCENT_BUILD, pressed_callable)

func show_scanner_station(pressed_callable: Callable) -> void:
	_configure_card_from_defaults(_scanner_station_card, _ACCENT_BUILD, pressed_callable)

func show_next_mission(mission_stage: int, pressed_callable: Callable) -> void:
	var subtitle_text := ""
	match mission_stage:
		1: subtitle_text = "Launch your first mission — pick a contractor, select a target, deploy."
		2: subtitle_text = "Starter Rocket 2 is ready — push further with extended range."
		3: subtitle_text = "Mission 3 is available — fly to a real TESS candidate."
		4: subtitle_text = "Mission 4 — choose a contract or run your own survey mission from the Launchpad."
		_: subtitle_text = "Free Operations are open — pick any target and contractor."
	_configure_card(
		_next_mission_card,
		_next_mission_card.card_title,
		subtitle_text,
		_next_mission_card.card_hint,
		_next_mission_card.card_cta,
		_ACCENT_LAUNCH,
		pressed_callable
	)

func _configure_card_from_defaults(card: EarthBaseActionCard, accent: Color, pressed_callable: Callable) -> void:
	_configure_card(card, card.card_title, card.card_subtitle, card.card_hint, card.card_cta, accent, pressed_callable)

func _configure_card(
	card: EarthBaseActionCard,
	title_text: String,
	subtitle_text: String,
	hint_text: String,
	cta_text: String,
	accent: Color,
	pressed_callable: Callable
) -> void:
	if card == null:
		return
	card.size_flags_horizontal = Control.SIZE_FILL
	card.set_meta("ui_style_locked", true)
	card.set_content(title_text, subtitle_text, hint_text, cta_text)
	card.set_accent_color(accent)
	# Style the CTA button to match accent color
	var cta := card.get_cta_button()
	_reset_button_signal(cta)
	if cta != null:
		var btn_style := StyleBoxFlat.new()
		btn_style.bg_color = accent
		btn_style.set_corner_radius_all(999)
		btn_style.content_margin_left   = 20.0
		btn_style.content_margin_right  = 20.0
		btn_style.content_margin_top    = 8.0
		btn_style.content_margin_bottom = 8.0
		var btn_pressed := btn_style.duplicate() as StyleBoxFlat
		btn_pressed.bg_color = Color(accent.r * 0.8, accent.g * 0.8, accent.b * 0.8, accent.a)
		cta.add_theme_stylebox_override("normal",  btn_style)
		cta.add_theme_stylebox_override("hover",   btn_style)
		cta.add_theme_stylebox_override("pressed", btn_pressed)
		cta.add_theme_stylebox_override("focus",   btn_style)
		cta.add_theme_color_override("font_color",         Color(0.024, 0.071, 0.122, 1.0))
		cta.add_theme_color_override("font_hover_color",   Color(0.024, 0.071, 0.122, 1.0))
		cta.add_theme_color_override("font_pressed_color", Color(0.024, 0.071, 0.122, 1.0))
		cta.set_meta("ui_style_locked", true)
		cta.pressed.connect(pressed_callable)
	card.visible = true
	visible = true

func _reset_button_signal(button: Button) -> void:
	if button == null:
		return
	for connection in button.pressed.get_connections():
		button.pressed.disconnect(connection.callable)
