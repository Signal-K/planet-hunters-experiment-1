extends Control

signal panel_closed

const PREVIEW_SCENE := "res://Scenes/UI/AsteroidPreview/asteroid_preview.tscn"
const PanelStyle = preload("res://Scripts/UI/PanelStyle.gd")

const STORY_MISSIONS := [
	{"id": 1, "title": "First Launch", "desc": "Launch your first mission"},
	{"id": 2, "title": "Upgrade Path", "desc": "Re-run with upgraded rocket"},
	{"id": 3, "title": "Scanner Online", "desc": "Unlock system scanner"},
	{"id": 4, "title": "Deep Space", "desc": "Mine exoplanets with L3 rocket"},
	{"id": 5, "title": "Fleet Ops", "desc": "Multi-rocket operations"}
]

@onready var bg: ColorRect = $Background
@onready var panel: Panel = $Panel
@onready var title: Label = $Panel/Margin/VBox/Title
@onready var tabs: HBoxContainer = $Panel/Margin/VBox/Tabs
@onready var active_tab: Button = $Panel/Margin/VBox/Tabs/ActiveTab
@onready var story_tab: Button = $Panel/Margin/VBox/Tabs/StoryTab
@onready var missions_list: VBoxContainer = $Panel/Margin/VBox/Scroll/MissionsList
@onready var close_btn: Button = $Panel/Margin/VBox/Header/CloseButton

var _current_tab := "active"

func _ready():
	PanelStyle.apply_panel(panel)
	PanelStyle.apply_title(title)
	PanelStyle.apply_button(close_btn, false)
	close_btn.pressed.connect(_close)
	
	# Setup tabs
	PanelStyle.apply_button(active_tab, true)
	active_tab.pressed.connect(_show_active_tab)
	PanelStyle.apply_button(story_tab, false)
	story_tab.pressed.connect(_show_story_tab)
	
	bg.color = Color(0, 0, 0, 0.7)
	bg.gui_input.connect(_on_bg_input)
	
	_show_active_tab()

func _populate_missions():
	_populate_active_missions()

func _create_story_card(mission: Dictionary) -> PanelContainer:
	var card = PanelContainer.new()
	card.add_theme_stylebox_override("panel", PanelStyle.create_card_style())
	
	var vbox = VBoxContainer.new()
	card.add_child(vbox)
	
	var title_lbl = Label.new()
	title_lbl.text = "Mission %d: %s" % [mission.id, mission.title]
	PanelStyle.apply_body(title_lbl)
	vbox.add_child(title_lbl)
	
	var desc_lbl = Label.new()
	desc_lbl.text = mission.desc
	PanelStyle.apply_muted(desc_lbl)
	vbox.add_child(desc_lbl)
	
	return card

func _create_mission_card(rocket_id: String, target_label: String, target_id: String, target_type: String) -> PanelContainer:
	var card = PanelContainer.new()
	card.add_theme_stylebox_override("panel", PanelStyle.create_card_style())
	
	var hbox = HBoxContainer.new()
	card.add_child(hbox)
	
	var vbox = VBoxContainer.new()
	vbox.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	hbox.add_child(vbox)
	
	var rocket_lbl = Label.new()
	rocket_lbl.text = rocket_id
	PanelStyle.apply_body(rocket_lbl)
	vbox.add_child(rocket_lbl)
	
	var target_lbl = Label.new()
	target_lbl.text = "→ " + target_label
	target_lbl.add_theme_color_override("font_color", PanelStyle.ACCENT)
	vbox.add_child(target_lbl)
	
	var btn = Button.new()
	btn.text = "RESUME"
	PanelStyle.apply_button(btn, true)
	btn.pressed.connect(_resume_mission.bind(rocket_id, target_id, target_type))
	hbox.add_child(btn)
	
	return card

func _resume_mission(rocket_id: String, target_id: String, target_type: String):
	print("[ControlStation] _resume_mission called: rocket=%s, target=%s, type=%s" % [rocket_id, target_id, target_type])
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	rm.set_preview_target(target_id, target_id, target_type, rocket_id)
	print("[ControlStation] Preview target set, changing scene...")
	get_tree().change_scene_to_file(PREVIEW_SCENE)

func _close():
	preload("res://Scripts/Utils/AppControllerHelper.gd").record_tutorial_action("tour_close_control_station")
	panel_closed.emit()
	queue_free()

func _on_bg_input(event: InputEvent):
	if event is InputEventMouseButton and event.pressed:
		_close()

func _show_active_tab():
	_current_tab = "active"
	PanelStyle.apply_button(active_tab, true)
	PanelStyle.apply_button(story_tab, false)
	_populate_active_missions()

func _show_story_tab():
	_current_tab = "story"
	PanelStyle.apply_button(active_tab, false)
	PanelStyle.apply_button(story_tab, true)
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
		var empty = Label.new()
		empty.text = "No active missions"
		PanelStyle.apply_muted(empty)
		empty.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		missions_list.add_child(empty)
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
