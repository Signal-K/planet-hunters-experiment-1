extends Control

## Menu Panel with Counter Controls
## Displays and allows modification of a counter value that syncs with React Native

signal panel_closed
signal counter_changed(new_value: int)
signal reset_all
signal reset_tutorial

@onready var counter_label: Label = $PanelContainer/Panel/VBoxContainer/ScrollContainer/ContentContainer/CounterCard/CounterContainer/CounterLabel
@onready var decrease_btn: Button = $PanelContainer/Panel/VBoxContainer/ScrollContainer/ContentContainer/CounterCard/CounterContainer/ButtonsContainer/DecreaseButton
@onready var increase_btn: Button = $PanelContainer/Panel/VBoxContainer/ScrollContainer/ContentContainer/CounterCard/CounterContainer/ButtonsContainer/IncreaseButton
@onready var close_btn: Button = $PanelContainer/Panel/VBoxContainer/HeaderContainer/HeaderBackground/HeaderContent/CloseButton
@onready var reset_btn: Button = $PanelContainer/Panel/VBoxContainer/ScrollContainer/ContentContainer/ResetButton
@onready var reset_tutorial_btn: Button = $PanelContainer/Panel/VBoxContainer/ScrollContainer/ContentContainer/ResetTutorialButton
@onready var progress_title: Label = $PanelContainer/Panel/VBoxContainer/ScrollContainer/ContentContainer/ProgressCard/ProgressContainer/ProgressTitle
@onready var level_label: Label = $PanelContainer/Panel/VBoxContainer/ScrollContainer/ContentContainer/ProgressCard/ProgressContainer/LevelRow/LevelLabel
@onready var xp_label: Label = $PanelContainer/Panel/VBoxContainer/ScrollContainer/ContentContainer/ProgressCard/ProgressContainer/LevelRow/XpLabel
@onready var progress_bar: ProgressBar = $PanelContainer/Panel/VBoxContainer/ScrollContainer/ContentContainer/ProgressCard/ProgressContainer/ProgressBar
@onready var next_level_label: Label = $PanelContainer/Panel/VBoxContainer/ScrollContainer/ContentContainer/ProgressCard/ProgressContainer/NextLevelLabel
@onready var unlocks_title: Label = $PanelContainer/Panel/VBoxContainer/ScrollContainer/ContentContainer/ProgressCard/ProgressContainer/UnlocksTitle
@onready var unlocks_list: VBoxContainer = $PanelContainer/Panel/VBoxContainer/ScrollContainer/ContentContainer/ProgressCard/ProgressContainer/UnlocksList

var current_counter: int = 0
const MISSION_UNLOCKS := [
	{"level": 1, "name": "Asteroid mining missions"},
	{"level": 1, "name": "Sell cargo in orbit"},
	{"level": 2, "name": "Sell cargo on Earth"}
]

func _ready() -> void:
	_apply_panel_style()
	# Connect button signals
	close_btn.pressed.connect(_on_close_button_pressed)
	decrease_btn.pressed.connect(_on_decrease_button_pressed)
	increase_btn.pressed.connect(_on_increase_button_pressed)
	reset_btn.pressed.connect(_on_reset_button_pressed)
	reset_tutorial_btn.pressed.connect(_on_reset_tutorial_button_pressed)
	
	# Update display
	update_counter_display()
	_update_experience_ui()
	_connect_experience_updates()
	
	print("MenuPanel ready with counter: ", current_counter)

func _apply_panel_style() -> void:
	var panel_style = preload("res://Scripts/UI/PanelStyle.gd")
	var panel = $PanelContainer/Panel
	panel_style.apply_panel(panel)

	var title = $PanelContainer/Panel/VBoxContainer/HeaderContainer/HeaderBackground/HeaderContent/Title
	var separator = $PanelContainer/Panel/VBoxContainer/HSeparator
	var info_label = $PanelContainer/Panel/VBoxContainer/ScrollContainer/ContentContainer/InfoLabel
	var counter_title = $PanelContainer/Panel/VBoxContainer/ScrollContainer/ContentContainer/CounterCard/CounterContainer/CounterTitle
	var counter_value = $PanelContainer/Panel/VBoxContainer/ScrollContainer/ContentContainer/CounterCard/CounterContainer/CounterLabel

	panel_style.apply_title(title)
	panel_style.apply_separator(separator)
	panel_style.apply_body(counter_title)
	panel_style.apply_title(counter_value)
	panel_style.apply_muted(info_label)

	panel_style.apply_button(close_btn, false)
	panel_style.apply_button(decrease_btn, false)
	panel_style.apply_button(increase_btn, false)
	panel_style.apply_button(reset_btn, true)
	panel_style.apply_button(reset_tutorial_btn, false)
	panel_style.apply_title(progress_title)
	panel_style.apply_body(level_label)
	panel_style.apply_muted(xp_label)
	panel_style.apply_muted(next_level_label)
	panel_style.apply_body(unlocks_title)
	info_label.add_theme_color_override("font_color", Color(0.4, 0.45, 0.55))

func set_counter(value: int) -> void:
	"""Set the counter value from external source (e.g., React Native)"""
	current_counter = value
	update_counter_display()
	print("MenuPanel counter set to: ", current_counter)

func get_counter() -> int:
	"""Get the current counter value"""
	return current_counter

func update_counter_display() -> void:
	"""Update the counter label"""
	if counter_label:
		counter_label.text = str(current_counter)

func _connect_experience_updates() -> void:
	var app = _get_app_controller()
	if app and app.has_signal("experience_updated"):
		app.experience_updated.connect(_on_experience_updated)

func _on_experience_updated(_xp: int, _level: int) -> void:
	_update_experience_ui()

func _update_experience_ui() -> void:
	var app = _get_app_controller()
	if not app:
		return
	var level = int(app.get_experience_level()) if app.has_method("get_experience_level") else 1
	var xp = int(app.get_experience_xp()) if app.has_method("get_experience_xp") else 0
	var total_xp = int(app.get_total_experience()) if app.has_method("get_total_experience") else xp
	var next_req = int(app.get_xp_required_for_next_level()) if app.has_method("get_xp_required_for_next_level") else max(10, xp + 1)
	level_label.text = "Level %s" % str(level)
	xp_label.text = "Total XP: %s • Current: %s" % [str(total_xp), str(xp)]
	progress_bar.max_value = max(next_req, 1)
	progress_bar.value = clamp(xp, 0, progress_bar.max_value)
	var remaining = max(next_req - xp, 0)
	next_level_label.text = "%s XP to next level" % str(remaining)
	_build_unlocks_list(level)

func _build_unlocks_list(current_level: int) -> void:
	for child in unlocks_list.get_children():
		child.queue_free()
	var unlocks_by_level := {}
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if rm:
		for rocket_id in rm.ROCKET_UNLOCK_LEVELS.keys():
			var lvl = int(rm.ROCKET_UNLOCK_LEVELS.get(rocket_id, 1))
			if not unlocks_by_level.has(lvl):
				unlocks_by_level[lvl] = []
			unlocks_by_level[lvl].append("Rocket: %s" % rocket_id)
	var sm = preload("res://Scripts/Utils/SubcontractorManager.gd")
	if sm:
		for idx in range(sm.SUBCONTRACTORS.size()):
			var c = sm.SUBCONTRACTORS[idx]
			var lvl = int(sm.get_unlock_level_for_index(idx))
			if not unlocks_by_level.has(lvl):
				unlocks_by_level[lvl] = []
			var name = str(c.get("name", ""))
			if c.get("hidden", false):
				name = "Classified Subcontractor"
			unlocks_by_level[lvl].append("Subcontractor: %s" % name)
	for m in MISSION_UNLOCKS:
		var lvl = int(m.get("level", 1))
		if not unlocks_by_level.has(lvl):
			unlocks_by_level[lvl] = []
		unlocks_by_level[lvl].append("Mission: %s" % str(m.get("name", "")))
	var levels := unlocks_by_level.keys()
	levels.sort()
	var panel_style = preload("res://Scripts/UI/PanelStyle.gd")
	for lvl in levels:
		var header = Label.new()
		header.text = "Level %s" % str(lvl)
		panel_style.apply_body(header)
		unlocks_list.add_child(header)
		var items: Array = unlocks_by_level[lvl]
		items.sort()
		for item in items:
			var row = Label.new()
			row.text = "• %s" % str(item)
			if lvl <= current_level:
				panel_style.apply_body(row)
			else:
				panel_style.apply_muted(row)
			unlocks_list.add_child(row)

func _get_app_controller() -> Node:
	return get_node_or_null("/root/AppController")

func _on_close_button_pressed() -> void:
	print("MenuPanel close button pressed")
	panel_closed.emit()
	queue_free()

func _on_decrease_button_pressed() -> void:
	current_counter -= 1
	update_counter_display()
	counter_changed.emit(current_counter)
	print("Counter decreased to: ", current_counter)

func _on_increase_button_pressed() -> void:
	current_counter += 1
	update_counter_display()
	counter_changed.emit(current_counter)
	print("Counter increased to: ", current_counter)

func _on_reset_button_pressed() -> void:
	print("MenuPanel reset button pressed")
	reset_all.emit()

func _on_reset_tutorial_button_pressed() -> void:
	print("MenuPanel reset tutorial button pressed")
	reset_tutorial.emit()
