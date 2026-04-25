extends VBoxContainer
class_name EarthBaseProgressionCards

const PanelStyle = preload("res://Scripts/UI/PanelStyle.gd")
const EarthBaseActionCard = preload("res://Scripts/UI/EarthBaseActionCard.gd")
const GLASS_CARD_BG := Color(0.06, 0.10, 0.16, 0.95)

@onready var _active_mission_card: EarthBaseActionCard = $ActiveMissionCard
@onready var _control_station_card: EarthBaseActionCard = $ControlStationCard
@onready var _scanner_station_card: EarthBaseActionCard = $ScannerStationCard
@onready var _next_mission_card: EarthBaseActionCard = $NextMissionCard

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
		pressed_callable
	)

func show_control_station(pressed_callable: Callable) -> void:
	_configure_card_from_defaults(_control_station_card, pressed_callable)

func show_scanner_station(pressed_callable: Callable) -> void:
	_configure_card_from_defaults(_scanner_station_card, pressed_callable)

func show_next_mission(mission_stage: int, pressed_callable: Callable) -> void:
	var subtitle_text := ""
	match mission_stage:
		1: subtitle_text = "Launch your first mission — pick a contractor, select a target, deploy."
		2: subtitle_text = "Starter Rocket 2 is ready — push further with extended range."
		3: subtitle_text = "Mission 3 is available — fly to a real NASA TESS planet candidate."
		4: subtitle_text = "Mission 4 is the handoff out of the strict tutorial rail. Choose a contract or run your own survey mission from the Launchpad."
		_: subtitle_text = "Free Operations are open — pick any target and contractor."
	_configure_card(
		_next_mission_card,
		_next_mission_card.card_title,
		subtitle_text,
		_next_mission_card.card_hint,
		_next_mission_card.card_cta,
		pressed_callable
	)

func _configure_card_from_defaults(card: EarthBaseActionCard, pressed_callable: Callable) -> void:
	_configure_card(card, card.card_title, card.card_subtitle, card.card_hint, card.card_cta, pressed_callable)

func _configure_card(
	card: EarthBaseActionCard,
	title_text: String,
	subtitle_text: String,
	hint_text: String,
	cta_text: String,
	pressed_callable: Callable
) -> void:
	if card == null:
		return
	card.size_flags_horizontal = Control.SIZE_FILL
	_apply_glass_action_card(card)
	card.set_content(title_text, subtitle_text, hint_text, cta_text)
	var title := card.get_node_or_null("Body/Title") as Label
	if title != null:
		_apply_card_category_label(title)
	var subtitle := card.get_node_or_null("Body/Subtitle") as Label
	if subtitle != null:
		PanelStyle.apply_body_on_dark(subtitle)
	var hint := card.get_node_or_null("Body/Hint") as Label
	if hint != null:
		PanelStyle.apply_muted_on_dark(hint)
	var cta := card.get_cta_button()
	_reset_button_signal(cta)
	PanelStyle.apply_button(cta, true)
	cta.pressed.connect(pressed_callable)
	card.visible = true
	visible = true

func _apply_glass_action_card(panel: PanelContainer) -> void:
	if panel == null:
		return
	panel.set_meta("ui_style_locked", true)
	panel.add_theme_stylebox_override(
		"panel",
		PanelStyle.create_glass_panel_style(GLASS_CARD_BG, 0.58, 18, 22, 18)
	)

func _apply_card_category_label(label: Label) -> void:
	const CYAN := Color(0.28, 0.88, 0.96, 1.0)
	label.add_theme_color_override("font_color", CYAN)
	label.add_theme_font_size_override("font_size", 26)

func _reset_button_signal(button: Button) -> void:
	if button == null:
		return
	for connection in button.pressed.get_connections():
		button.pressed.disconnect(connection.callable)
