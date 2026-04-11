extends Control
## ControlStationPanel.gd
## Clean light-themed control panel showing active missions + globe.
## Redesigned: sidebar navigation, horizontal mission card grid, globe panel.

signal panel_closed

const PREVIEW_SCENE := "res://Scenes/UI/AsteroidPreview/asteroid_preview.tscn"
const PanelStyle = preload("res://Scripts/UI/PanelStyle.gd")
const RocketSpecs = preload("res://Scripts/Utils/RocketSpecs.gd")

const MINERAL_ABBREV := {
	"Iron": "Fe", "Nickel": "Ni", "Cobalt": "Co", "Platinum": "Pt",
	"Silicates": "SiO", "Rare Earth Elements": "REE", "Water Ice": "H₂O",
	"Titanium": "Ti", "Chromium": "Cr", "Manganese": "Mn",
}

@onready var title: Label           = $RootHBox/MainArea/Header/HeaderRow/Title
@onready var subtitle: Label        = $RootHBox/MainArea/ContentMargin/ContentHBox/MissionsArea/Subtitle
@onready var missions_list: HBoxContainer = $RootHBox/MainArea/ContentMargin/ContentHBox/MissionsArea/MissionsList
@onready var close_btn: Button      = $RootHBox/MainArea/Header/HeaderRow/CloseButton
@onready var fleet_label: Label     = $RootHBox/MainArea/StatusBar/StatusRow/FleetLabel
@onready var bg: ColorRect          = $Background

func _ready() -> void:
	close_btn.pressed.connect(_close)
	bg.gui_input.connect(_on_bg_input)
	_populate_active_missions()

func _populate_active_missions():
	for child in missions_list.get_children():
		child.queue_free()

	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	var missions = rm.get_missions()
	var targets = rm.get_detected_targets()
	var target_map: Dictionary = {}
	for t in targets:
		target_map[str(t.get("id", ""))] = str(t.get("label", ""))

	if missions.is_empty():
		_add_empty_state()
		return

	for mission in missions:
		var rocket_id:   String = str(mission.get("rocket_id", ""))
		var target_id:   String = str(mission.get("target_id", ""))
		var target_type: String = str(mission.get("target_type", ""))
		var status:      String = str(mission.get("status", ""))
		var target_lbl:  String = target_map.get(target_id, target_id)
		var contractor:  Dictionary = _get_contractor_for_mission(mission)
		var eta:         int = int(mission.get("eta_seconds", 0))
		var card        := _create_mission_card(rocket_id, target_lbl, target_id, target_type, status, contractor, eta)
		missions_list.add_child(card)

func _add_empty_state() -> void:
	var lbl := Label.new()
	lbl.text = "No missions in progress.\nLaunch from the Launchpad."
	lbl.add_theme_color_override("font_color", Color(0.35, 0.46, 0.56, 0.80))
	lbl.add_theme_font_size_override("font_size", 14)
	lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	missions_list.add_child(lbl)

func _get_contractor_for_mission(mission: Dictionary) -> Dictionary:
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	var op_mode = str(mission.get("operation_mode", ""))
	var trip_offer = rm.get_trip_contract_offer()
	if not trip_offer.is_empty():
		var selected_id = str(trip_offer.get("selected_contractor", ""))
		if selected_id != "":
			for c in trip_offer.get("contractors", []):
				if str(c.get("id", "")) == selected_id:
					return c.duplicate(true)
	if op_mode == "tutorial" or op_mode == "":
		var starter = rm.get_starter_selected_contractor()
		if not starter.is_empty():
			return starter.duplicate(true)
	return {}

func _format_eta(seconds: int) -> String:
	if seconds <= 0: return "arriving soon"
	if seconds < 60:  return "~%ds" % seconds
	var mins := seconds / 60
	if mins < 60: return "~%dm" % mins
	return "~%dh" % (mins / 60)

const MAX_MINERAL_CHIPS := 3

func _create_mission_card(rocket_id: String, target_label: String, target_id: String,
		target_type: String, rocket_status: String, contractor: Dictionary, eta_seconds: int = 0) -> PanelContainer:
	var is_returning := rocket_status == "returning"

	# --- Card shell ---
	var card := PanelContainer.new()
	card.custom_minimum_size = Vector2(200, 0)
	card.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var card_style := StyleBoxFlat.new()
	card_style.bg_color = Color(0.93, 0.95, 0.97, 1.0)
	card_style.border_color = Color(0.65, 0.74, 0.82, 0.55)
	card_style.set_border_width_all(1)
	card_style.set_corner_radius_all(12)
	card_style.content_margin_left = 18
	card_style.content_margin_top = 14
	card_style.content_margin_right = 18
	card_style.content_margin_bottom = 14
	card.add_theme_stylebox_override("panel", card_style)

	var margin := MarginContainer.new()
	card.add_child(margin)

	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 8)
	margin.add_child(vbox)

	# Rocket name + badge row
	var header_row := HBoxContainer.new()
	header_row.add_theme_constant_override("separation", 8)
	vbox.add_child(header_row)

	var rocket_lbl := Label.new()
	rocket_lbl.text = RocketSpecs.get_display_name(rocket_id)
	rocket_lbl.add_theme_color_override("font_color", Color(0.10, 0.18, 0.28, 1.0))
	rocket_lbl.add_theme_font_size_override("font_size", 16)
	rocket_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	header_row.add_child(rocket_lbl)

	# Status badge
	var badge := PanelContainer.new()
	var badge_style := StyleBoxFlat.new()
	if is_returning:
		badge_style.bg_color = Color(0.88, 0.98, 0.90, 1.0)
		badge_style.border_color = Color(0.18, 0.72, 0.38, 0.60)
	else:
		badge_style.bg_color = Color(0.88, 0.96, 1.0, 1.0)
		badge_style.border_color = Color(0.22, 0.65, 0.90, 0.60)
	badge_style.set_border_width_all(1)
	badge_style.set_corner_radius_all(6)
	badge_style.content_margin_left = 8
	badge_style.content_margin_top = 3
	badge_style.content_margin_right = 8
	badge_style.content_margin_bottom = 3
	badge.add_theme_stylebox_override("panel", badge_style)
	var badge_lbl := Label.new()
	if is_returning:
		badge_lbl.text = "RETURNING"
		badge_lbl.add_theme_color_override("font_color", Color(0.12, 0.56, 0.28, 1.0))
	else:
		badge_lbl.text = "IN-ORBIT"
		badge_lbl.add_theme_color_override("font_color", Color(0.14, 0.54, 0.82, 1.0))
	badge_lbl.add_theme_font_size_override("font_size", 10)
	badge.add_child(badge_lbl)
	header_row.add_child(badge)

	# Target
	var target_row := HBoxContainer.new()
	target_row.add_theme_constant_override("separation", 4)
	vbox.add_child(target_row)
	var target_muted := Label.new()
	target_muted.text = "Target"
	target_muted.add_theme_color_override("font_color", Color(0.40, 0.52, 0.62, 0.80))
	target_muted.add_theme_font_size_override("font_size", 11)
	target_row.add_child(target_muted)
	var target_lbl2 := Label.new()
	target_lbl2.text = target_label
	target_lbl2.add_theme_color_override("font_color", Color(0.10, 0.22, 0.36, 1.0))
	target_lbl2.add_theme_font_size_override("font_size", 13)
	target_row.add_child(target_lbl2)

	# Minerals row
	var minerals_row := HBoxContainer.new()
	minerals_row.add_theme_constant_override("separation", 6)
	vbox.add_child(minerals_row)
	var minerals: Dictionary = contractor.get("requested_minerals", {})
	_populate_mineral_chips(minerals_row, minerals)

	return card

func _populate_mineral_chips(row: HBoxContainer, minerals: Dictionary) -> void:
	if minerals.is_empty():
		var lbl := Label.new()
		lbl.text = "open market"
		lbl.add_theme_color_override("font_color", Color(0.40, 0.52, 0.62, 0.70))
		lbl.add_theme_font_size_override("font_size", 11)
		row.add_child(lbl)
		return
	var shown := 0
	for mineral_name in minerals:
		if shown >= MAX_MINERAL_CHIPS:
			var overflow := Label.new()
			overflow.text = "+%d" % (minerals.size() - MAX_MINERAL_CHIPS)
			overflow.add_theme_color_override("font_color", Color(0.40, 0.52, 0.62, 0.70))
			overflow.add_theme_font_size_override("font_size", 11)
			row.add_child(overflow)
			break
		var qty  = minerals[mineral_name]
		var abbr = MINERAL_ABBREV.get(mineral_name, mineral_name.substr(0, 3))
		var chip := PanelContainer.new()
		var chip_style := StyleBoxFlat.new()
		chip_style.bg_color = Color(0.22, 0.68, 0.90, 0.10)
		chip_style.border_color = Color(0.22, 0.65, 0.90, 0.40)
		chip_style.set_border_width_all(1)
		chip_style.set_corner_radius_all(6)
		chip_style.content_margin_left = 7
		chip_style.content_margin_right = 7
		chip_style.content_margin_top = 3
		chip_style.content_margin_bottom = 3
		chip.add_theme_stylebox_override("panel", chip_style)
		var chip_lbl := Label.new()
		chip_lbl.text = "%s x%d" % [abbr, qty]
		chip_lbl.add_theme_color_override("font_color", Color(0.14, 0.50, 0.78, 1.0))
		chip_lbl.add_theme_font_size_override("font_size", 11)
		chip.add_child(chip_lbl)
		row.add_child(chip)
		shown += 1

func _resume_mission(rocket_id: String, target_id: String, target_type: String):
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	rm.set_preview_target(target_id, target_id, target_type, rocket_id)
	get_tree().change_scene_to_file(PREVIEW_SCENE)

func _close():
	panel_closed.emit()
	queue_free()

func _on_bg_input(event: InputEvent):
	if event is InputEventMouseButton and event.pressed:
		_close()
