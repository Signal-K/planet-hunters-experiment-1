extends Control

signal panel_closed

const PREVIEW_SCENE := "res://Scenes/UI/AsteroidPreview/asteroid_preview.tscn"

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
	var NebulaTheme = preload("res://Resources/NebulaSciTheme.gd")
	var style = NebulaTheme.create_panel_style()
	panel.add_theme_stylebox_override("panel", style)
	
	title.add_theme_color_override("font_color", Color(0.95, 0.95, 0.98))
	title.add_theme_font_size_override("font_size", 28)
	
	var btn_style = NebulaTheme.create_button_style()
	close_btn.add_theme_stylebox_override("normal", btn_style)
	close_btn.pressed.connect(_close)
	
	# Setup tabs
	var tab_normal = NebulaTheme.create_button_style()
	var tab_active = NebulaTheme.create_button_style("pressed")
	active_tab.add_theme_stylebox_override("normal", tab_active)
	active_tab.pressed.connect(_show_active_tab)
	story_tab.add_theme_stylebox_override("normal", tab_normal)
	story_tab.pressed.connect(_show_story_tab)
	
	bg.color = Color(0, 0, 0, 0.7)
	bg.gui_input.connect(_on_bg_input)
	
	_show_active_tab()

func _populate_missions():
	_populate_active_missions()

func _create_story_card(mission: Dictionary) -> PanelContainer:
	var NebulaTheme = preload("res://Resources/NebulaSciTheme.gd")
	
	var card = PanelContainer.new()
	var card_style = StyleBoxFlat.new()
	card_style.bg_color = NebulaTheme.BUTTON_BG
	card_style.border_color = NebulaTheme.PANEL_OUTLINE
	card_style.border_width_left = 2
	card_style.border_width_top = 2
	card_style.border_width_right = 2
	card_style.border_width_bottom = 2
	card_style.corner_radius_top_left = 8
	card_style.corner_radius_top_right = 8
	card_style.corner_radius_bottom_left = 8
	card_style.corner_radius_bottom_right = 8
	card.add_theme_stylebox_override("panel", card_style)
	
	var vbox = VBoxContainer.new()
	card.add_child(vbox)
	
	var title_lbl = Label.new()
	title_lbl.text = "Mission %d: %s" % [mission.id, mission.title]
	title_lbl.add_theme_color_override("font_color", Color(0.95, 0.95, 0.98))
	title_lbl.add_theme_font_size_override("font_size", 18)
	vbox.add_child(title_lbl)
	
	var desc_lbl = Label.new()
	desc_lbl.text = mission.desc
	desc_lbl.add_theme_color_override("font_color", Color(0.7, 0.7, 0.75))
	vbox.add_child(desc_lbl)
	
	return card

func _create_mission_card(rocket_id: String, target_label: String, target_id: String, target_type: String) -> PanelContainer:
	var NebulaTheme = preload("res://Resources/NebulaSciTheme.gd")
	
	var card = PanelContainer.new()
	var card_style = StyleBoxFlat.new()
	card_style.bg_color = NebulaTheme.BUTTON_BG
	card_style.border_color = NebulaTheme.PANEL_OUTLINE
	card_style.border_width_left = 2
	card_style.border_width_top = 2
	card_style.border_width_right = 2
	card_style.border_width_bottom = 2
	card_style.corner_radius_top_left = 8
	card_style.corner_radius_top_right = 8
	card_style.corner_radius_bottom_left = 8
	card_style.corner_radius_bottom_right = 8
	card.add_theme_stylebox_override("panel", card_style)
	
	var hbox = HBoxContainer.new()
	card.add_child(hbox)
	
	var vbox = VBoxContainer.new()
	vbox.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	hbox.add_child(vbox)
	
	var rocket_lbl = Label.new()
	rocket_lbl.text = rocket_id
	rocket_lbl.add_theme_color_override("font_color", Color(0.95, 0.95, 0.98))
	rocket_lbl.add_theme_font_size_override("font_size", 18)
	vbox.add_child(rocket_lbl)
	
	var target_lbl = Label.new()
	target_lbl.text = "→ " + target_label
	target_lbl.add_theme_color_override("font_color", NebulaTheme.ACCENT_BLUE)
	vbox.add_child(target_lbl)
	
	var btn = Button.new()
	btn.text = "RESUME"
	var btn_style = NebulaTheme.create_button_style()
	btn.add_theme_stylebox_override("normal", btn_style)
	btn.add_theme_color_override("font_color", Color(0.95, 0.95, 0.98))
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
	panel_closed.emit()
	queue_free()

func _on_bg_input(event: InputEvent):
	if event is InputEventMouseButton and event.pressed:
		_close()

func _show_active_tab():
	_current_tab = "active"
	var NebulaTheme = preload("res://Resources/NebulaSciTheme.gd")
	active_tab.add_theme_stylebox_override("normal", NebulaTheme.create_button_style("pressed"))
	story_tab.add_theme_stylebox_override("normal", NebulaTheme.create_button_style())
	_populate_active_missions()

func _show_story_tab():
	_current_tab = "story"
	var NebulaTheme = preload("res://Resources/NebulaSciTheme.gd")
	active_tab.add_theme_stylebox_override("normal", NebulaTheme.create_button_style())
	story_tab.add_theme_stylebox_override("normal", NebulaTheme.create_button_style("pressed"))
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
		empty.add_theme_color_override("font_color", Color(0.7, 0.7, 0.75))
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
