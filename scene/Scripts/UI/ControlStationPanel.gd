extends Control

signal panel_closed

const PREVIEW_SCENE := "res://Scenes/UI/AsteroidPreview/asteroid_preview.tscn"
const PanelStyle = preload("res://Scripts/UI/PanelStyle.gd")
const RocketSpecs = preload("res://Scripts/Utils/RocketSpecs.gd")
const StoryCardScene = preload("res://Scenes/UI/Templates/ControlStationStoryCard.tscn")
const ActiveMissionCardScene = preload("res://Scenes/UI/Templates/ControlStationActiveMissionCard.tscn")

const STORY_MISSIONS := [
	{"id": 1, "title": "First Contact", "desc": "Your first run to the asteroid belt — pick a contractor and launch."},
	{"id": 2, "title": "Extended Range", "desc": "Push further with Starter Rocket 2 — better range, heavier load."},
	{"id": 3, "title": "Planet Fall", "desc": "Fly to a real NASA TESS exoplanet candidate and mine what's there."},
	{"id": 4, "title": "Scanner Active", "desc": "Build the scanner station and unlock drone-assisted mining."},
	{"id": 5, "title": "Free Operations", "desc": "Tutorial complete — run missions on your own terms."}
]

const MINERAL_ABBREV := {
	"Iron": "Fe",
	"Nickel": "Ni",
	"Cobalt": "Co",
	"Platinum": "Pt",
	"Silicates": "SiO",
	"Rare Earth Elements": "REE",
	"Water Ice": "H₂O",
	"Titanium": "Ti",
	"Chromium": "Cr",
	"Manganese": "Mn",
}

@onready var bg: ColorRect = $Background
@onready var panel: Panel = $Panel
@onready var title: Label = $Panel/Margin/VBox/Title
@onready var subtitle: Label = $Panel/Margin/VBox/Subtitle
@onready var tabs: HBoxContainer = $Panel/Margin/VBox/Tabs
@onready var active_tab: Button = $Panel/Margin/VBox/Tabs/ActiveTab
@onready var story_tab: Button = $Panel/Margin/VBox/Tabs/StoryTab
@onready var missions_list: VBoxContainer = $Panel/Margin/VBox/Scroll/MissionsList
@onready var close_btn: Button = $Panel/Margin/VBox/Header/CloseButton

var _current_tab := "active"

func _ready():
	panel.add_theme_stylebox_override(
		"panel",
		PanelStyle.create_glass_panel_style(Color(0.05, 0.09, 0.14, 0.94), 0.68, 20, 24, 20)
	)
	PanelStyle.apply_title_on_dark(title)
	PanelStyle.apply_muted_on_dark(subtitle)
	PanelStyle.apply_outline_button(close_btn)
	title.add_theme_font_size_override("font_size", 28)
	subtitle.add_theme_font_size_override("font_size", 14)
	close_btn.pressed.connect(_close)

	# Setup tabs
	_apply_tab_styles()
	active_tab.pressed.connect(_show_active_tab)
	story_tab.pressed.connect(_show_story_tab)
	active_tab.add_theme_font_size_override("font_size", 14)
	story_tab.add_theme_font_size_override("font_size", 14)

	bg.color = Color(0.03, 0.06, 0.10, 0.44)
	bg.gui_input.connect(_on_bg_input)
	missions_list.add_theme_constant_override("separation", 14)

	_show_active_tab()

func _apply_tab_styles() -> void:
	if _current_tab == "active":
		PanelStyle.apply_button(active_tab, true)
		PanelStyle.apply_outline_button(story_tab, Color(PanelStyle.ACCENT.r, PanelStyle.ACCENT.g, PanelStyle.ACCENT.b, 0.58))
	else:
		PanelStyle.apply_outline_button(active_tab, Color(PanelStyle.ACCENT.r, PanelStyle.ACCENT.g, PanelStyle.ACCENT.b, 0.58))
		PanelStyle.apply_button(story_tab, true)

func _populate_missions():
	_populate_active_missions()

func _create_story_card(mission: Dictionary) -> PanelContainer:
	var card: PanelContainer = StoryCardScene.instantiate()
	card.add_theme_stylebox_override("panel", PanelStyle.create_glass_card_style(Color(0.07, 0.12, 0.18, 0.96), 0.42))
	var title_lbl: Label = card.get_node("Margin/VBox/TitleLabel")
	title_lbl.text = "Mission %d: %s" % [mission.id, mission.title]
	PanelStyle.apply_body_on_dark(title_lbl)
	title_lbl.add_theme_font_size_override("font_size", 18)
	var desc_lbl: Label = card.get_node("Margin/VBox/DescriptionLabel")
	desc_lbl.text = mission.desc
	PanelStyle.apply_muted_on_dark(desc_lbl)
	desc_lbl.add_theme_font_size_override("font_size", 14)
	return card

## Returns the contractor dict (with requested_minerals) for a given mission record.
## Checks trip offer first (free ops), then falls back to starter offer (tutorial).
func _get_contractor_for_mission(mission: Dictionary) -> Dictionary:
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	var op_mode = str(mission.get("operation_mode", ""))

	# Try the trip contract offer (has randomised requested_minerals per contractor)
	var trip_offer = rm.get_trip_contract_offer()
	if not trip_offer.is_empty():
		var selected_id = str(trip_offer.get("selected_contractor", ""))
		if selected_id != "":
			for c in trip_offer.get("contractors", []):
				if str(c.get("id", "")) == selected_id:
					return c.duplicate(true)

	# Fall back to starter contractor
	if op_mode == "tutorial" or op_mode == "":
		var starter = rm.get_starter_selected_contractor()
		if not starter.is_empty():
			return starter.duplicate(true)

	return {}

## Formats a seconds-until-arrival value into a compact ETA string.
func _format_eta(seconds: int) -> String:
	if seconds <= 0:
		return "arriving soon"
	if seconds < 60:
		return "~%ds" % seconds
	var mins := seconds / 60
	if mins < 60:
		return "~%dm" % mins
	return "~%dh" % (mins / 60)

## Adds mineral chips (e.g. "Fe ×12") to the given HBoxContainer.
## Caps at MAX_CHIPS; shows overflow count if more exist.
## Falls back to an "open market" indicator when no minerals are ordered.
const MAX_MINERAL_CHIPS := 4

func _populate_mineral_chips(row: HBoxContainer, minerals: Dictionary, is_returning: bool) -> void:
	if minerals.is_empty():
		# Open-market sale — no specific order placed
		var lbl = Label.new()
		lbl.text = "open market"
		lbl.add_theme_color_override("font_color",
			Color(PanelStyle.MUTED_ON_DARK.r, PanelStyle.MUTED_ON_DARK.g, PanelStyle.MUTED_ON_DARK.b,
				  0.50 if is_returning else 0.72))
		lbl.add_theme_font_size_override("font_size", 13)
		row.add_child(lbl)
		return

	var shown := 0
	for mineral_name in minerals:
		if shown >= MAX_MINERAL_CHIPS:
			var overflow_lbl = Label.new()
			overflow_lbl.text = "+%d" % (minerals.size() - MAX_MINERAL_CHIPS)
			overflow_lbl.add_theme_color_override("font_color",
				Color(PanelStyle.MUTED_ON_DARK.r, PanelStyle.MUTED_ON_DARK.g, PanelStyle.MUTED_ON_DARK.b, 0.6))
			overflow_lbl.add_theme_font_size_override("font_size", 13)
			row.add_child(overflow_lbl)
			break

		var qty = minerals[mineral_name]
		var abbrev = MINERAL_ABBREV.get(mineral_name, mineral_name.substr(0, 3))
		var chip_label = Label.new()
		chip_label.text = "%s ×%d" % [abbrev, qty]
		var text_alpha = 0.45 if is_returning else 1.0
		chip_label.add_theme_color_override("font_color",
			Color(PanelStyle.ACCENT.r, PanelStyle.ACCENT.g, PanelStyle.ACCENT.b, text_alpha))
		chip_label.add_theme_font_size_override("font_size", 13)

		var chip = PanelContainer.new()
		var chip_style = StyleBoxFlat.new()
		chip_style.bg_color = Color(PanelStyle.ACCENT.r, PanelStyle.ACCENT.g, PanelStyle.ACCENT.b,
									0.05 if is_returning else 0.12)
		chip_style.border_color = Color(PanelStyle.ACCENT.r, PanelStyle.ACCENT.g, PanelStyle.ACCENT.b,
										0.14 if is_returning else 0.36)
		chip_style.set_border_width_all(1)
		chip_style.set_corner_radius_all(6)
		chip_style.content_margin_left = 8
		chip_style.content_margin_right = 8
		chip_style.content_margin_top = 4
		chip_style.content_margin_bottom = 4
		chip.add_theme_stylebox_override("panel", chip_style)
		chip.add_child(chip_label)
		row.add_child(chip)
		shown += 1

func _create_mission_card(rocket_id: String, target_label: String, target_id: String, target_type: String, rocket_status: String, contractor: Dictionary, eta_seconds: int = 0) -> PanelContainer:
	var card: PanelContainer = ActiveMissionCardScene.instantiate()
	var is_returning = rocket_status == "returning"

	# Card border: amber tint for returning, cyan for in-orbit
	var bg_color = Color(0.10, 0.11, 0.14, 0.96) if is_returning else Color(0.07, 0.12, 0.18, 0.96)
	var border_alpha = 0.60 if is_returning else 0.42
	card.add_theme_stylebox_override("panel", PanelStyle.create_glass_card_style(bg_color, border_alpha))

	# Rocket label
	var rocket_lbl: Label = card.get_node("Margin/VBox/HeaderRow/RocketLabel")
	rocket_lbl.text = RocketSpecs.get_display_name(rocket_id)
	PanelStyle.apply_body_on_dark(rocket_lbl)
	rocket_lbl.add_theme_font_size_override("font_size", 18)

	# Status badge — dot prefix adds visual weight without a wrapper element
	var status_badge: Label = card.get_node("Margin/VBox/HeaderRow/StatusBadge")
	if is_returning:
		status_badge.text = "● RETURNING"
		status_badge.add_theme_color_override("font_color", PanelStyle.ACCENT_WARM)
	else:
		status_badge.text = "● IN-ORBIT"
		status_badge.add_theme_color_override("font_color", PanelStyle.ACCENT)
	status_badge.add_theme_font_size_override("font_size", 11)

	# Target label — arrow direction reflects mission direction
	var target_lbl: Label = card.get_node("Margin/VBox/TargetLabel")
	target_lbl.text = ("⟵ " if is_returning else "→ ") + target_label
	if is_returning:
		target_lbl.add_theme_color_override("font_color", PanelStyle.MUTED_ON_DARK)
	else:
		target_lbl.add_theme_color_override("font_color", PanelStyle.ACCENT)
	target_lbl.add_theme_font_size_override("font_size", 14)

	# Contractor label — append ETA for returning rockets so the row carries context
	var contractor_lbl: Label = card.get_node("Margin/VBox/ContractorLabel")
	var contractor_name = str(contractor.get("name", ""))
	if contractor_name == "":
		contractor_name = "Open Market"
	if is_returning and eta_seconds != 0:
		contractor_lbl.text = contractor_name + " · " + _format_eta(eta_seconds)
	else:
		contractor_lbl.text = contractor_name
	PanelStyle.apply_muted_on_dark(contractor_lbl)
	contractor_lbl.add_theme_font_size_override("font_size", 12)

	# Mineral order chips
	var minerals_row: HBoxContainer = card.get_node("Margin/VBox/MineralsRow")
	var minerals: Dictionary = contractor.get("requested_minerals", {})
	_populate_mineral_chips(minerals_row, minerals, is_returning)

	# Action button
	var btn: Button = card.get_node("Margin/VBox/ActionButton")
	btn.add_theme_font_size_override("font_size", 14)
	if is_returning:
		# Disabled — rocket is already inbound, no action is possible
		var eta_str = _format_eta(eta_seconds) if eta_seconds != 0 else ""
		btn.text = "INBOUND" + (" · " + eta_str if eta_str != "" else " ↓")
		btn.disabled = true
		var disabled_style = StyleBoxFlat.new()
		disabled_style.bg_color = Color(0.12, 0.13, 0.16, 0.72)
		disabled_style.border_color = Color(PanelStyle.ACCENT_WARM.r, PanelStyle.ACCENT_WARM.g, PanelStyle.ACCENT_WARM.b, 0.22)
		disabled_style.set_border_width_all(1)
		disabled_style.set_corner_radius_all(14)
		disabled_style.content_margin_left = 18
		disabled_style.content_margin_right = 18
		disabled_style.content_margin_top = 12
		disabled_style.content_margin_bottom = 12
		btn.add_theme_stylebox_override("disabled", disabled_style)
		btn.add_theme_color_override("font_disabled_color",
			Color(PanelStyle.ACCENT_WARM.r, PanelStyle.ACCENT_WARM.g, PanelStyle.ACCENT_WARM.b, 0.45))
	else:
		btn.text = "RESUME"
		PanelStyle.apply_button(btn, true)
		btn.pressed.connect(_resume_mission.bind(rocket_id, target_id, target_type))

	return card

func _resume_mission(rocket_id: String, target_id: String, target_type: String):
	print("[ControlStation] _resume_mission called: rocket=%s, target=%s, type=%s" % [rocket_id, target_id, target_type])
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	rm.set_preview_target(target_id, target_id, target_type, rocket_id)
	print("[ControlStation] Preview target set, changing scene...")
	get_tree().change_scene_to_file(PREVIEW_SCENE)

func _close():
	panel_closed.emit()
	queue_free()

func _on_bg_input(event: InputEvent):
	if event is InputEventMouseButton and event.pressed:
		_close()

func _show_active_tab():
	_current_tab = "active"
	_apply_tab_styles()
	_populate_active_missions()

func _show_story_tab():
	_current_tab = "story"
	_apply_tab_styles()
	_populate_story_missions()

func _populate_active_missions():
	for child in missions_list.get_children():
		child.queue_free()

	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	var missions = rm.get_missions()
	var targets = rm.get_detected_targets()
	var target_map := {}
	for t in targets:
		target_map[str(t.get("id", ""))] = str(t.get("label", ""))

	print("[ControlStation] Active missions count: ", missions.size())

	if missions.is_empty():
		var empty_card := PanelContainer.new()
		empty_card.add_theme_stylebox_override("panel", PanelStyle.create_glass_card_style(Color(0.07, 0.11, 0.16, 0.97), 0.36))
		empty_card.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		var margin := MarginContainer.new()
		margin.add_theme_constant_override("margin_left", 20)
		margin.add_theme_constant_override("margin_top", 18)
		margin.add_theme_constant_override("margin_right", 20)
		margin.add_theme_constant_override("margin_bottom", 18)
		empty_card.add_child(margin)
		var vbox := VBoxContainer.new()
		vbox.add_theme_constant_override("separation", 6)
		margin.add_child(vbox)
		var eyebrow := Label.new()
		eyebrow.text = "MISSION QUEUE"
		eyebrow.add_theme_color_override("font_color", PanelStyle.ACCENT)
		eyebrow.add_theme_font_size_override("font_size", 12)
		vbox.add_child(eyebrow)
		var empty := Label.new()
		empty.text = "No missions in progress.\nLaunch from the Launchpad."
		empty.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		empty.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		PanelStyle.apply_body_on_dark(empty)
		empty.add_theme_font_size_override("font_size", 18)
		vbox.add_child(empty)
		var hint := Label.new()
		hint.text = "Pick a contractor, arm a rocket, then route a target to start the next run."
		hint.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		PanelStyle.apply_muted_on_dark(hint)
		hint.add_theme_font_size_override("font_size", 14)
		vbox.add_child(hint)
		missions_list.add_child(empty_card)
		return

	var now := int(Time.get_unix_time_from_system())
	for m in missions:
		var rocket_id = str(m.get("rocket_id", ""))
		var target_id = str(m.get("target", ""))
		var target_label = target_map.get(target_id, target_id)
		var rocket_status = rm.get_rocket_status(rocket_id)
		var contractor = _get_contractor_for_mission(m)
		var arrival_time = int(m.get("arrival_time", 0))
		var eta_seconds = arrival_time - now if arrival_time > 0 else 0

		print("[ControlStation] Mission: rocket=%s, target=%s, label=%s, status=%s, eta=%ds" % [rocket_id, target_id, target_label, rocket_status, eta_seconds])

		var card = _create_mission_card(rocket_id, target_label, target_id, str(m.get("target_type", "asteroid")), rocket_status, contractor, eta_seconds)
		missions_list.add_child(card)

func _populate_story_missions():
	for child in missions_list.get_children():
		child.queue_free()

	for mission in STORY_MISSIONS:
		var card = _create_story_card(mission)
		missions_list.add_child(card)
