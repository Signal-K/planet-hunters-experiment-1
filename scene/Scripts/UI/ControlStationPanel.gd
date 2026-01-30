extends Control

signal panel_closed

func _ready():
	# Apply consistent panel styling
	_apply_panel_style()
	
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
	var close_btn = $PanelContainer/Panel/VBoxContainer/HeaderContainer/CloseButton
	var separator = $PanelContainer/Panel/VBoxContainer/HSeparator

	panel_style.apply_title(title)
	panel_style.apply_richtext(content)
	panel_style.apply_button(close_btn, false)
	panel_style.apply_separator(separator)

func _on_close_button_pressed():
	panel_closed.emit()
	queue_free()

func _on_background_input(event: InputEvent):
	if event is InputEventMouseButton and event.pressed:
		panel_closed.emit()
		queue_free()
