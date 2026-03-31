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

func _create_mission_card(rocket_id: String, target_label: String, target_id: String, target_type: String) -> PanelContainer:
	var card: PanelContainer = ActiveMissionCardScene.instantiate()
	card.add_theme_stylebox_override("panel", PanelStyle.create_glass_card_style(Color(0.07, 0.12, 0.18, 0.96), 0.42))
	var rocket_lbl: Label = card.get_node("Margin/HBox/ContentVBox/RocketLabel")
	rocket_lbl.text = RocketSpecs.get_display_name(rocket_id)
	PanelStyle.apply_body_on_dark(rocket_lbl)
	rocket_lbl.add_theme_font_size_override("font_size", 18)
	var target_lbl: Label = card.get_node("Margin/HBox/ContentVBox/TargetLabel")
	target_lbl.text = "→ " + target_label
	target_lbl.add_theme_color_override("font_color", PanelStyle.ACCENT)
	target_lbl.add_theme_font_size_override("font_size", 14)
	var btn: Button = card.get_node("Margin/HBox/ResumeButton")
	PanelStyle.apply_button(btn, true)
	btn.add_theme_font_size_override("font_size", 14)
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
	
	for m in missions:
		var rocket_id = str(m.get("rocket_id", ""))
		var target_id = str(m.get("target", ""))
		var target_label = target_map.get(target_id, target_id)
		
		print("[ControlStation] Mission: rocket=%s, target=%s, label=%s" % [rocket_id, target_id, target_label])
		
		var card = _create_mission_card(rocket_id, target_label, target_id, str(m.get("target_type", "asteroid")))
		missions_list.add_child(card)

func _populate_story_missions():
	for child in missions_list.get_children():
		child.queue_free()
	
	for mission in STORY_MISSIONS:
		var card = _create_story_card(mission)
		missions_list.add_child(card)
