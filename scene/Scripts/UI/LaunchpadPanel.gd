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
	"""Apply styling to match existing menu panels"""
	var panel = $PanelContainer/Panel
	var style_box = StyleBoxFlat.new()
	style_box.bg_color = Color(0.99, 1.002, 1.002, 1)  # --card
	style_box.border_color = Color(0.45, 0.62, 0.82, 1)  # --primary
	style_box.border_width_left = 3
	style_box.border_width_right = 3
	style_box.border_width_top = 3
	style_box.border_width_bottom = 3
	style_box.corner_radius_top_left = 12
	style_box.corner_radius_top_right = 12
	style_box.corner_radius_bottom_left = 12
	style_box.corner_radius_bottom_right = 12
	panel.add_theme_stylebox_override("panel", style_box)
	
	# Fix text colors
	var title = $PanelContainer/Panel/VBoxContainer/HeaderContainer/Title
	title.add_theme_color_override("font_color", Color(0, 0, 0, 1))  # Pure black text
	
	var content = $PanelContainer/Panel/VBoxContainer/ContentContainer/Description
	# Set all text colors to pure black to ensure readability on light background
	content.add_theme_color_override("default_color", Color(0, 0, 0, 1))  # Pure black
	content.add_theme_color_override("font_bold_color", Color(0, 0, 0, 1))  # Pure black
	content.add_theme_color_override("font_italic_color", Color(0, 0, 0, 1))  # Pure black
	content.add_theme_color_override("font_code_color", Color(0, 0, 0, 1))  # Pure black
	content.add_theme_color_override("quote_color", Color(0, 0, 0, 1))  # Pure black
	content.add_theme_color_override("tag_color", Color(0, 0, 0, 1))  # Override color tags
	
	var close_btn = $PanelContainer/Panel/VBoxContainer/HeaderContainer/CloseButton
	close_btn.add_theme_color_override("font_color", Color(0, 0, 0, 1))  # Pure black text

func _on_close_button_pressed():
	panel_closed.emit()
	queue_free()

func _on_background_input(event: InputEvent):
	if event is InputEventMouseButton and event.pressed:
		panel_closed.emit()
		queue_free()
