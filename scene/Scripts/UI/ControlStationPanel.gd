extends Control

signal panel_closed

const DS = preload("res://Scripts/UI/DS.gd")
const UILayout = preload("res://Scripts/UI/UILayout.gd")
const PREVIEW_SCENE := "res://Scenes/UI/AsteroidPreview/asteroid_preview.tscn"
const RocketSpecs = preload("res://Scripts/Utils/RocketSpecs.gd")
const RocketsManager = preload("res://Scripts/Utils/RocketsManager.gd")
const ControlStationActiveMissionCardScene = preload("res://Scenes/UI/Templates/ControlStationActiveMissionCard.tscn")
const ControlStationStoryCardScene = preload("res://Scenes/UI/Templates/ControlStationStoryCard.tscn")
const ControlStationQueueRowScene = preload("res://Scenes/UI/Templates/ControlStationQueueRow.tscn")
const ControlStationDataPillScene = preload("res://Scenes/UI/Templates/ControlStationDataPill.tscn")
const ControlStationMineralChipScene = preload("res://Scenes/UI/Templates/ControlStationMineralChip.tscn")
const ControlStationEmptyStateCardScene = preload("res://Scenes/UI/Templates/ControlStationEmptyStateCard.tscn")
const ControlStationLogLineScene = preload("res://Scenes/UI/Templates/ControlStationLogLine.tscn")
const ControlStationMineralEmptyLabelScene = preload("res://Scenes/UI/Templates/ControlStationMineralEmptyLabel.tscn")
const ControlStationMineralOverflowLabelScene = preload("res://Scenes/UI/Templates/ControlStationMineralOverflowLabel.tscn")

const MINERAL_ABBREV := {
	"Iron": "Fe",
	"Nickel": "Ni",
	"Cobalt": "Co",
	"Platinum": "Pt",
	"Silicates": "SiO",
	"Rare Earth Elements": "REE",
	"Water Ice": "H2O",
	"Titanium": "Ti",
	"Chromium": "Cr",
	"Manganese": "Mn",
}

const STORY_STEPS := [
	{"code": "01", "title": "First Contact", "description": "Run the first guided mining loop and learn the return and debrief cadence."},
	{"code": "02", "title": "Contract Upgrade", "description": "Add the fleet hub, route the second rocket, and start managing contractor-backed missions."},
	{"code": "03", "title": "Candidate Review", "description": "Bring TESS candidates into the pipeline and use annotation to unlock trustworthy travel."},
	{"code": "04", "title": "Free Operations", "description": "Operate in generated jobs, handle cooldowns, and keep missions cycling after authored beats end."},
]

const MAX_MINERAL_CHIPS := 3

@onready var background: ColorRect = $Background
@onready var legacy_root: Control = $RootHBox
@onready var _sidebar: PanelContainer = $RootHBox/Sidebar
@onready var _header_panel: PanelContainer = $RootHBox/MainArea/Header
@onready var _subtitle_label_scene: Label = $RootHBox/MainArea/ContentMargin/ContentHBox/MissionsArea/Subtitle
@onready var _mission_status_label_scene: Label = $RootHBox/MainArea/ContentMargin/ContentHBox/MissionsArea/MissionsSectionLabel
@onready var _mission_list_scene: HBoxContainer = $RootHBox/MainArea/ContentMargin/ContentHBox/MissionsArea/MissionsList
@onready var _story_list_scene: VBoxContainer = $RootHBox/MainArea/ContentMargin/ContentHBox/MissionsArea/StoryList
@onready var _queue_list_scene: VBoxContainer = $RootHBox/MainArea/ContentMargin/ContentHBox/RightRail/QueueCard/QueueVBox/QueueList
@onready var _log_list_scene: VBoxContainer = $RootHBox/MainArea/ContentMargin/ContentHBox/RightRail/LogCard/LogVBox/LogList
@onready var _close_button_scene: Button = $RootHBox/MainArea/Header/HeaderRow/CloseButton
@onready var _nav_btn_0: Button = $RootHBox/Sidebar/SidebarVBox/NavBtn0
@onready var _nav_btn_1: Button = $RootHBox/Sidebar/SidebarVBox/NavBtn1
@onready var _nav_btn_2: Button = $RootHBox/Sidebar/SidebarVBox/NavBtn2
@onready var _nav_btn_3: Button = $RootHBox/Sidebar/SidebarVBox/NavBtn3
@onready var _nav_btn_4: Button = $RootHBox/Sidebar/SidebarVBox/NavBtn4
@onready var _footer_tab_telemetry: Button = $RootHBox/MainArea/ContentMargin/ContentHBox/RightRail/FooterTabs/FooterTabTelemetry
@onready var _footer_tab_diagnostics: Button = $RootHBox/MainArea/ContentMargin/ContentHBox/RightRail/FooterTabs/FooterTabDiagnostics
@onready var _footer_tab_missions: Button = $RootHBox/MainArea/ContentMargin/ContentHBox/RightRail/FooterTabs/FooterTabMissions

var _view_mode := "active"
var _mission_list: Container
var _story_list: VBoxContainer
var _subtitle_label: Label
var _active_tab_btn: Button
var _story_tab_btn: Button
var _mission_status_label: Label
var _queue_list: VBoxContainer
var _log_list: VBoxContainer
var _footer_tabs: Array[Button] = []

func _ready() -> void:
	if background and not background.gui_input.is_connected(_on_background_input):
		background.gui_input.connect(_on_background_input)
	background.color = Color(0.94, 0.97, 0.97, 0.98)
	if legacy_root:
		legacy_root.visible = true
		legacy_root.mouse_filter = Control.MOUSE_FILTER_PASS
	_stamp_panel_fonts(self)
	_bind_scene_ui()
	_apply_layout()
	if get_viewport() and not get_viewport().size_changed.is_connected(_apply_layout):
		get_viewport().size_changed.connect(_apply_layout)
	_populate_view()

func _stamp_panel_fonts(node: Node) -> void:
	var disp := DS.font_display()
	var mono := DS.font_mono()
	if disp == null:
		return
	var vp_w := get_viewport_rect().size.x
	var scale := clampf(vp_w / 480.0, 1.0, 2.5)
	for child in node.get_children():
		if child is Label:
			var lbl := child as Label
			lbl.add_theme_font_override("font", disp)
			var sz: int = lbl.theme_override_font_sizes.get("font_size", 0)
			if sz > 0 and sz < 20:
				lbl.add_theme_font_size_override("font_size", int(sz * scale))
		elif child is Button:
			var btn := child as Button
			btn.add_theme_font_override("font", disp)
			var sz: int = btn.theme_override_font_sizes.get("font_size", 0)
			if sz > 0 and sz < 20:
				btn.add_theme_font_size_override("font_size", int(sz * scale))
		if child.get_child_count() > 0:
			_stamp_panel_fonts(child)

func _bind_scene_ui() -> void:
	_subtitle_label = _subtitle_label_scene
	_mission_status_label = _mission_status_label_scene
	_mission_list = _mission_list_scene
	_story_list = _story_list_scene
	_queue_list = _queue_list_scene
	_log_list = _log_list_scene
	_active_tab_btn = _nav_btn_0
	_story_tab_btn = _nav_btn_1
	_footer_tabs = [_footer_tab_telemetry, _footer_tab_diagnostics, _footer_tab_missions]
	_close_button_scene.pressed.connect(_close)
	_active_tab_btn.pressed.connect(func(): _set_view_mode("active"))
	_story_tab_btn.pressed.connect(func(): _set_view_mode("story"))
	_apply_primary_button(_active_tab_btn)
	_apply_secondary_button(_story_tab_btn)
	_active_tab_btn.text = "ACTIVE"
	_story_tab_btn.text = "STORY"
	_active_tab_btn.custom_minimum_size = Vector2(120, 42)
	_story_tab_btn.custom_minimum_size = Vector2(120, 42)
	for button in [_nav_btn_2, _nav_btn_3, _nav_btn_4]:
		_apply_secondary_button(button)
	for idx in range(_footer_tabs.size()):
		apply_footer_button(_footer_tabs[idx], idx == 2)

func apply_footer_button(button: Button, active: bool) -> void:
	if active:
		_apply_primary_button(button)
	else:
		_apply_secondary_button(button)
	button.add_theme_font_override("font", DS.font_display())
	button.add_theme_font_size_override("font_size", DS.F_BUTTON)

func _apply_layout() -> void:
	if legacy_root == null:
		return
	var vp := get_viewport_rect().size
	var portrait := UILayout.is_portrait(vp)
	var compact := portrait or vp.x < 1380.0

	var right_rail := legacy_root.get_node_or_null("MainArea/ContentMargin/ContentHBox/RightRail") as VBoxContainer
	var globe_panel := legacy_root.get_node_or_null("MainArea/ContentMargin/ContentHBox/GlobePanel") as Control
	var missions_area := legacy_root.get_node_or_null("MainArea/ContentMargin/ContentHBox/MissionsArea") as Control
	var content_hbox := legacy_root.get_node_or_null("MainArea/ContentMargin/ContentHBox") as HBoxContainer

	if portrait:
		# Portrait: hide side panels so MissionsArea fills the full APP_BODY lane.
		if right_rail:
			right_rail.visible = false
		if globe_panel:
			globe_panel.visible = false
		if missions_area:
			missions_area.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		if content_hbox:
			content_hbox.add_theme_constant_override("separation", 0)
	elif compact:
		if right_rail:
			right_rail.visible = true
			right_rail.custom_minimum_size = Vector2(280, 0)
		if globe_panel:
			globe_panel.visible = true
			globe_panel.custom_minimum_size = Vector2(220, 180)
	else:
		if right_rail:
			right_rail.visible = true
			right_rail.custom_minimum_size = Vector2(320, 0)
		if globe_panel:
			globe_panel.visible = true
			globe_panel.custom_minimum_size = Vector2(260, 180)

func _set_view_mode(mode: String) -> void:
	_view_mode = mode
	if mode == "active":
		_apply_primary_button(_active_tab_btn)
		_apply_secondary_button(_story_tab_btn)
	else:
		_apply_secondary_button(_active_tab_btn)
		_apply_primary_button(_story_tab_btn)
	_populate_view()

func _populate_view() -> void:
	_clear_children(_mission_list)
	_clear_children(_story_list)
	_clear_children(_queue_list)
	_clear_children(_log_list)
	_populate_sidebar_cards()

	var state: Dictionary = RocketsManager.load_state()
	var missions: Array = RocketsManager.get_missions()
	var targets: Array = RocketsManager.get_detected_targets()
	var target_map: Dictionary = {}
	var placed_map: Dictionary = {}

	for target_any in targets:
		if typeof(target_any) != TYPE_DICTIONARY:
			continue
		var target: Dictionary = target_any
		target_map[str(target.get("id", ""))] = str(target.get("label", ""))

	var placed_any = state.get("placed", [])
	if typeof(placed_any) == TYPE_ARRAY:
		for placed_item in placed_any:
			if typeof(placed_item) != TYPE_DICTIONARY:
				continue
			var placed: Dictionary = placed_item
			placed_map[str(placed.get("id", ""))] = str(placed.get("status", ""))

	if _view_mode == "story":
		_subtitle_label.text = "Mission roadmap through authored onboarding and the shift into generated work."
		_mission_status_label.text = "MISSION ROADMAP"
		_mission_list.visible = false
		_story_list.visible = true
		for step in STORY_STEPS:
			_story_list.add_child(_create_story_card(step))
		return

	_subtitle_label.text = "Fleet telemetry, mission routing, and the current return queue."
	_mission_status_label.text = "ACTIVE ROUTES"
	_mission_list.visible = true
	_story_list.visible = false
	if missions.is_empty():
		_mission_list.add_child(_create_empty_state_card())
	else:
		for mission_any in missions:
			if typeof(mission_any) != TYPE_DICTIONARY:
				continue
			var mission: Dictionary = mission_any
			var rocket_id := str(mission.get("rocket_id", ""))
			var target_id := str(mission.get("target_id", mission.get("target", "")))
			var target_type := str(mission.get("target_type", ""))
			var status := str(mission.get("status", placed_map.get(rocket_id, "")))
			if status == "":
				status = "returning" if str(mission.get("goingTo", "")).to_lower() == "home" else "in-orbit"
			var location_any = mission.get("location", [])
			var fallback_target := target_id
			if typeof(location_any) == TYPE_ARRAY:
				var location_list: Array = location_any
				if not location_list.is_empty():
					fallback_target = str(location_list[0])
			var target_label := str(target_map.get(target_id, fallback_target))
			var contractor := _get_contractor_for_mission(mission)
			var eta_seconds := _extract_eta_seconds(mission)
			_mission_list.add_child(_create_mission_card(rocket_id, target_label, target_id, target_type, status, contractor, eta_seconds))

func _populate_sidebar_cards() -> void:
	for item in [
		{"title": "LUNAR HABITATION UNIT", "value": "74%"},
		{"title": "REFINING RIG ALPHA", "value": "32%"},
		{"title": "OXYGEN SCRUBBER V2", "value": "QUEUED"}
	]:
		_queue_list.add_child(_create_queue_row(item))

	for line in [
		"[14:02:01] - ACK_REQ_001_RECEIVED",
		"[14:02:04] - CALIBRATING_THRUST_VECTORS",
		"[14:02:09] - PING: 12ms TO RELAY_STATION_B",
		"[14:02:15] - SHIELD_EFFICIENCY: 98.4%",
		"[14:02:22] - NO_ANOMALIES_DETECTED"
	]:
		var label: Label = ControlStationLogLineScene.instantiate()
		label.text = line
		label.add_theme_color_override("font_color", DS.TEXT_MUTED)
		label.add_theme_font_override("font", DS.font_mono())
		label.add_theme_font_size_override("font_size", DS.F_CAPTION)
		_log_list.add_child(label)

func _create_queue_row(item: Dictionary) -> Control:
	var row: VBoxContainer = ControlStationQueueRowScene.instantiate()
	var title: Label = row.get_node("TopRow/TitleLabel")
	title.text = str(item.get("title", ""))
	title.add_theme_color_override("font_color", DS.TEXT_MUTED)
	title.add_theme_font_override("font", DS.font_display())
	title.add_theme_font_size_override("font_size", DS.F_CAPTION)

	var value: Label = row.get_node("TopRow/ValueLabel")
	value.text = str(item.get("value", ""))
	value.add_theme_color_override("font_color", DS.PRIMARY)
	value.add_theme_font_override("font", DS.font_mono())
	value.add_theme_font_size_override("font_size", DS.F_CAPTION)

	var fill: ColorRect = row.get_node("ProgressBarShell/ProgressFill")
	fill.anchor_right = 0.74 if str(item.get("value", "")).contains("%") else 0.38
	return row

func _create_story_card(step: Dictionary) -> Control:
	var card: PanelContainer = ControlStationStoryCardScene.instantiate()
	var code: Label = card.get_node("Margin/VBox/CodeLabel")
	code.text = "%s // MILESTONE" % str(step.get("code", ""))
	code.add_theme_color_override("font_color", DS.PRIMARY)
	code.add_theme_font_override("font", DS.font_mono())
	code.add_theme_font_size_override("font_size", DS.F_CAPTION)

	var title: Label = card.get_node("Margin/VBox/TitleLabel")
	title.text = str(step.get("title", ""))
	title.add_theme_color_override("font_color", DS.TEXT)
	title.add_theme_font_override("font", DS.font_display())
	title.add_theme_font_size_override("font_size", DS.F_BODY)

	var body: Label = card.get_node("Margin/VBox/DescriptionLabel")
	body.text = str(step.get("description", ""))
	body.add_theme_color_override("font_color", DS.TEXT_MUTED)
	body.add_theme_font_override("font", DS.font_display())
	body.add_theme_font_size_override("font_size", DS.F_CAPTION)
	return card

func _create_empty_state_card() -> Control:
	var card: PanelContainer = ControlStationEmptyStateCardScene.instantiate()
	var eyebrow: Label = card.get_node("VBox/EyebrowLabel")
	eyebrow.add_theme_color_override("font_color", Color(0.08, 0.52, 0.47, 1.0))
	var title: Label = card.get_node("VBox/TitleLabel")
	title.add_theme_color_override("font_color", Color(0.13, 0.18, 0.20, 1.0))
	var body: Label = card.get_node("VBox/BodyLabel")
	body.add_theme_color_override("font_color", Color(0.36, 0.42, 0.45, 1.0))
	var hint: Label = card.get_node("VBox/HintLabel")
	hint.add_theme_color_override("font_color", Color(0.42, 0.48, 0.50, 1.0))
	return card

func _create_mission_card(
	rocket_id: String,
	target_label: String,
	target_id: String,
	target_type: String,
	rocket_status: String,
	contractor: Dictionary,
	eta_seconds: int
) -> Control:
	var is_returning := rocket_status == "returning"
	var card: PanelContainer = ControlStationActiveMissionCardScene.instantiate()
	var rocket_label: Label = card.get_node("Margin/VBox/HeaderRow/RocketLabel")
	rocket_label.text = RocketSpecs.get_display_name(rocket_id)
	rocket_label.add_theme_color_override("font_color", Color(0.14, 0.18, 0.20, 1.0))
	rocket_label.add_theme_font_size_override("font_size", 24)

	var manifest: Label = card.get_node("Margin/VBox/HeaderRow/StatusBadge")
	manifest.text = "ORDER RECEIPT" if not is_returning else "YIELD LOG"
	manifest.add_theme_color_override("font_color", Color(0.08, 0.52, 0.47, 1.0))
	manifest.add_theme_font_size_override("font_size", 13)

	var subtitle: Label = card.get_node("Margin/VBox/ContractorLabel")
	var contractor_name := str(contractor.get("name", "Open Market"))
	subtitle.text = "%s   %s" % ["IN-ORBIT" if not is_returning else "RETURNING", contractor_name]
	subtitle.add_theme_color_override("font_color", Color(0.36, 0.42, 0.45, 1.0))
	subtitle.add_theme_font_size_override("font_size", 14)

	var target_row: Label = card.get_node("Margin/VBox/TargetLabel")
	var target_display := target_label if target_label != "" else target_id
	target_row.text = "%s  %s" % ["TARGET" if not is_returning else "RETURNING FROM", target_display]

	var action_button: Button = card.get_node("Margin/VBox/ActionButton")
	action_button.text = "RESUME →" if not is_returning else "INBOUND %s" % _format_eta(eta_seconds)
	action_button.custom_minimum_size = Vector2(210, 68)
	if is_returning:
		_apply_secondary_button(action_button)
		action_button.disabled = true
	else:
		_apply_primary_button(action_button)
		action_button.pressed.connect(func(): _resume_mission(rocket_id, target_id, target_type))

	var chips: HBoxContainer = card.get_node("Margin/VBox/MineralsRow")
	_clear_children(chips)
	var minerals_any = contractor.get("requested_minerals", {})
	if typeof(minerals_any) == TYPE_DICTIONARY:
		_populate_mineral_chips(chips, minerals_any as Dictionary, is_returning)
	else:
		_populate_mineral_chips(chips, {}, is_returning)

	return card

func _create_data_pill(title_text: String, value_text: String) -> Control:
	var panel: PanelContainer = ControlStationDataPillScene.instantiate()
	var title: Label = panel.get_node("VBox/TitleLabel")
	title.text = title_text
	title.add_theme_color_override("font_color", Color(0.40, 0.46, 0.48, 1.0))
	title.add_theme_font_size_override("font_size", 12)

	var value: Label = panel.get_node("VBox/ValueLabel")
	value.text = value_text
	value.add_theme_color_override("font_color", Color(0.16, 0.20, 0.21, 1.0))
	value.add_theme_font_size_override("font_size", 18)
	return panel

func _populate_mineral_chips(row: BoxContainer, minerals: Dictionary, dimmed: bool) -> void:
	if minerals.is_empty():
		var empty_label: Label = ControlStationMineralEmptyLabelScene.instantiate()
		row.add_child(empty_label)
		return

	var shown := 0
	for mineral_name in minerals.keys():
		if shown >= MAX_MINERAL_CHIPS:
			var overflow: Label = ControlStationMineralOverflowLabelScene.instantiate()
			overflow.text = "+%d" % (minerals.size() - MAX_MINERAL_CHIPS)
			row.add_child(overflow)
			break
		var quantity := int(minerals[mineral_name])
		var abbreviation := str(MINERAL_ABBREV.get(mineral_name, str(mineral_name).substr(0, 3)))
		var chip: PanelContainer = ControlStationMineralChipScene.instantiate()
		chip.modulate = Color(1, 1, 1, 0.72) if dimmed else Color.WHITE
		var label: Label = chip.get_node("ChipLabel")
		label.text = "%s x%d" % [abbreviation, quantity]
		label.add_theme_color_override("font_color", Color(0.07, 0.50, 0.45, 1.0))
		label.add_theme_font_size_override("font_size", 12)
		row.add_child(chip)
		shown += 1

func _make_card(pad_x: int, pad_y: int, bg: Color, edge: Color) -> PanelContainer:
	var card := PanelContainer.new()
	var style := StyleBoxFlat.new()
	style.bg_color = bg
	style.border_color = edge
	style.set_border_width_all(1)
	style.set_corner_radius_all(22)
	style.shadow_color = Color(0.16, 0.22, 0.24, 0.07)
	style.shadow_size = 18
	style.shadow_offset = Vector2(0, 6)
	style.content_margin_left = pad_x
	style.content_margin_top = pad_y
	style.content_margin_right = pad_x
	style.content_margin_bottom = pad_y
	card.add_theme_stylebox_override("panel", style)
	return card

func _apply_primary_button(button: Button) -> void:
	var normal := StyleBoxFlat.new()
	normal.bg_color = Color(0.07, 0.55, 0.49, 1.0)
	normal.border_color = Color(0.31, 0.92, 0.84, 0.55)
	normal.set_border_width_all(1)
	normal.set_corner_radius_all(18)
	normal.content_margin_left = 18
	normal.content_margin_top = 14
	normal.content_margin_right = 18
	normal.content_margin_bottom = 14
	var hover := normal.duplicate()
	hover.bg_color = normal.bg_color.lightened(0.08)
	var pressed := normal.duplicate()
	pressed.bg_color = normal.bg_color.darkened(0.08)
	button.add_theme_stylebox_override("normal", normal)
	button.add_theme_stylebox_override("hover", hover)
	button.add_theme_stylebox_override("pressed", pressed)
	button.add_theme_stylebox_override("focus", hover)
	button.add_theme_color_override("font_color", Color(0.97, 0.99, 0.99, 1.0))
	button.add_theme_color_override("font_hover_color", Color(0.97, 0.99, 0.99, 1.0))
	button.add_theme_color_override("font_pressed_color", Color(0.97, 0.99, 0.99, 1.0))

func _apply_secondary_button(button: Button) -> void:
	var normal := StyleBoxFlat.new()
	normal.bg_color = Color(0.99, 0.995, 0.995, 1.0)
	normal.border_color = Color(0.76, 0.84, 0.85, 1.0)
	normal.set_border_width_all(1)
	normal.set_corner_radius_all(18)
	normal.content_margin_left = 18
	normal.content_margin_top = 14
	normal.content_margin_right = 18
	normal.content_margin_bottom = 14
	var hover := normal.duplicate()
	hover.bg_color = Color(0.96, 0.98, 0.98, 1.0)
	var pressed := normal.duplicate()
	pressed.bg_color = Color(0.93, 0.95, 0.96, 1.0)
	button.add_theme_stylebox_override("normal", normal)
	button.add_theme_stylebox_override("hover", hover)
	button.add_theme_stylebox_override("pressed", pressed)
	button.add_theme_stylebox_override("focus", hover)
	button.add_theme_color_override("font_color", Color(0.38, 0.42, 0.44, 1.0))
	button.add_theme_color_override("font_hover_color", Color(0.38, 0.42, 0.44, 1.0))
	button.add_theme_color_override("font_pressed_color", Color(0.38, 0.42, 0.44, 1.0))

func _get_contractor_for_mission(mission: Dictionary) -> Dictionary:
	var selected := RocketsManager.get_trip_selected_contractor()
	if not selected.is_empty():
		return selected.duplicate(true)
	var trip_offer = RocketsManager.get_trip_contract_offer()
	if not trip_offer.is_empty():
		var selected_id := str(trip_offer.get("selected_contractor", ""))
		for contractor_any in trip_offer.get("contractors", []):
			if typeof(contractor_any) != TYPE_DICTIONARY:
				continue
			var contractor: Dictionary = contractor_any
			if str(contractor.get("id", "")) == selected_id:
				return contractor.duplicate(true)
	var starter := RocketsManager.get_starter_selected_contractor()
	if not starter.is_empty():
		return starter.duplicate(true)
	var mission_contractor = mission.get("trip_contractor", {})
	if typeof(mission_contractor) == TYPE_DICTIONARY:
		return (mission_contractor as Dictionary).duplicate(true)
	return {}

func _extract_eta_seconds(mission: Dictionary) -> int:
	var eta_seconds := int(mission.get("eta_seconds", 0))
	if eta_seconds > 0:
		return eta_seconds
	var arrival_time := int(mission.get("arrival_time", 0))
	if arrival_time > 0:
		return maxi(arrival_time - int(Time.get_unix_time_from_system()), 0)
	return 0

func _format_eta(seconds: int) -> String:
	if seconds <= 0:
		return "SOON"
	if seconds < 60:
		return "%ds" % seconds
	var mins := seconds / 60
	if mins < 60:
		return "%dm" % mins
	return "%dh" % (mins / 60)

func _resume_mission(rocket_id: String, target_id: String, target_type: String) -> void:
	RocketsManager.set_preview_target(target_id, target_id, target_type, rocket_id)
	get_tree().change_scene_to_file(PREVIEW_SCENE)

func _clear_children(node: Node) -> void:
	for child in node.get_children():
		child.queue_free()

func _close() -> void:
	panel_closed.emit()
	queue_free()

func _on_background_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.pressed:
		_close()
