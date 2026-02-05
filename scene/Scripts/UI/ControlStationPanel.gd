extends Control

signal panel_closed

func _ready():
	# Apply consistent panel styling
	_apply_panel_style()
	_populate_orbiting_list()
	
	# Connect close button
	var close_button = $PanelContainer/Panel/VBoxContainer/HeaderContainer/CloseButton
	close_button.pressed.connect(_on_close_button_pressed)
	
	# Connect background click to close
	$Background.gui_input.connect(_on_background_input)

func _apply_panel_style():
	"""Apply polished panel styling"""
	var panel_style = preload("res://Scripts/UI/PanelStyle.gd")
	var panel = $PanelContainer/Panel
	panel_style.apply_panel(panel)

	var title = $PanelContainer/Panel/VBoxContainer/HeaderContainer/Title
	var content = $PanelContainer/Panel/VBoxContainer/ContentContainer/Description
	var orbit_header = $PanelContainer/Panel/VBoxContainer/ContentContainer/OrbitingHeader
	var close_btn = $PanelContainer/Panel/VBoxContainer/HeaderContainer/CloseButton
	var separator = $PanelContainer/Panel/VBoxContainer/HSeparator

	panel_style.apply_title(title)
	panel_style.apply_richtext(content)
	panel_style.apply_body(orbit_header)
	panel_style.apply_button(close_btn, false)
	panel_style.apply_separator(separator)

func _populate_orbiting_list() -> void:
	var list: VBoxContainer = $PanelContainer/Panel/VBoxContainer/ContentContainer/OrbitingList
	for child in list.get_children():
		child.queue_free()
	var panel_style = preload("res://Scripts/UI/PanelStyle.gd")
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	var orbiting: Array = []
	if rm:
		orbiting = rm.get_orbiting_rockets()
	if orbiting.is_empty():
		var empty = Label.new()
		empty.text = "No rockets currently in Earth orbit."
		panel_style.apply_muted(empty)
		list.add_child(empty)
		return
	for entry in orbiting:
		var row = HBoxContainer.new()
		row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		var rocket_id = str(entry.get("rocket_id", ""))
		var target_label = str(entry.get("label", ""))
		if target_label == "":
			target_label = "Unknown target"
		var name_lbl = Label.new()
		name_lbl.text = "Rocket %s" % rocket_id
		name_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		panel_style.apply_body(name_lbl)
		var target_lbl = Label.new()
		target_lbl.text = "From %s" % target_label
		target_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
		panel_style.apply_muted(target_lbl)
		row.add_child(name_lbl)
		row.add_child(target_lbl)
		list.add_child(row)

func _on_close_button_pressed():
	panel_closed.emit()
	queue_free()

func _on_background_input(event: InputEvent):
	if event is InputEventMouseButton and event.pressed:
		panel_closed.emit()
		queue_free()
