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
	var panel_style = preload("res://Scripts/UI/PanelStyle.gd")
	var panel = $PanelContainer/Panel
	# Lock before UIConsistencyEnforcer deferred scan can overwrite .tscn styles.
	panel.set_meta("ui_style_locked", true)
	panel.add_theme_stylebox_override(
		"panel",
		panel_style.create_glass_panel_style(Color(0.05, 0.09, 0.14, 0.95), 0.70, 20, 24, 20)
	)

	var title = $PanelContainer/Panel/VBoxContainer/HeaderContainer/Title
	var content = $PanelContainer/Panel/VBoxContainer/ContentContainer/Description
	var close_btn = $PanelContainer/Panel/VBoxContainer/HeaderContainer/CloseButton
	var separator = $PanelContainer/Panel/VBoxContainer/HSeparator

	panel_style.apply_title_on_dark(title)
	panel_style.apply_richtext(content)
	content.add_theme_color_override("default_color", panel_style.TEXT_ON_DARK)
	close_btn.set_meta("ui_style_locked", true)
	panel_style.apply_outline_button(close_btn)
	panel_style.apply_separator(separator)

func _on_close_button_pressed():
	panel_closed.emit()
	queue_free()

func _on_background_input(event: InputEvent):
	if event is InputEventMouseButton and event.pressed:
		panel_closed.emit()
		queue_free()
