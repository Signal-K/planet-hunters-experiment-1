class_name UIManager
extends CanvasLayer

enum PanelType {
	MENU,
	MARKET,
	SPACE_MAP,
	NEW_MISSION
}

var panel_titles = {
	PanelType.MENU: "Main Menu",
	PanelType.MARKET: "Market",
	PanelType.SPACE_MAP: "Space Map",
	PanelType.NEW_MISSION: "New Mission"
}

var current_menu_panel: Control = null

func _ready() -> void:
	# Set layer above the main UI
	layer = 3

func show_panel(panel_type: PanelType) -> void:
	# Special handling for MENU panel - use the MenuPanel scene
	if panel_type == PanelType.MENU:
		show_menu_panel()
		return
	
	var panel = create_panel(panel_titles[panel_type])
	add_child(panel)
	print("Panel opened: ", panel_titles[panel_type])

func show_menu_panel() -> void:
	"""Show the Menu panel with counter integration"""
	# Don't open multiple menu panels
	if current_menu_panel != null:
		print("Menu panel already open")
		return
	
	var menu_scene = load("res://Scenes/UI/MenuPanel.tscn")
	if menu_scene:
		current_menu_panel = menu_scene.instantiate()
		add_child(current_menu_panel)
		
		# Get the AppController to sync counter
		var app_controller = get_tree().root.find_child("AppController", true, false)
		if app_controller and current_menu_panel.has_method("set_counter"):
			var counter_value = app_controller.get_counter()
			current_menu_panel.set_counter(counter_value)
			print("Menu panel opened with counter: ", counter_value)
		
		# Connect signals
		if current_menu_panel.has_signal("panel_closed"):
			current_menu_panel.panel_closed.connect(_on_menu_panel_closed)
		if current_menu_panel.has_signal("counter_changed"):
			current_menu_panel.counter_changed.connect(_on_menu_counter_changed)
	else:
		print("Failed to load MenuPanel scene")

func _on_menu_panel_closed() -> void:
	print("Menu panel closed")
	current_menu_panel = null

func _on_menu_counter_changed(new_value: int) -> void:
	"""Update AppController when counter changes in menu"""
	var app_controller = get_tree().root.find_child("AppController", true, false)
	if app_controller and app_controller.has_method("set_counter_from_react"):
		app_controller.counter = new_value
		print("UIManager: Counter updated to: ", new_value)


func show_structure_panel(panel_scene_path: String) -> void:
	"""Load and display a structure-specific panel from a scene file"""
	var panel_scene = load(panel_scene_path)
	if panel_scene:
		var panel_instance = panel_scene.instantiate()
		add_child(panel_instance)
		# Connect close signal if available
		if panel_instance.has_signal("panel_closed"):
			panel_instance.panel_closed.connect(_on_panel_closed)
		print("Structure panel opened: ", panel_scene_path)
	else:
		print("Failed to load panel scene: ", panel_scene_path)

func _on_panel_closed() -> void:
	print("Panel closed")

func create_panel(title: String) -> Control:
	# Create a semi-transparent background overlay
	var overlay = ColorRect.new()
	overlay.color = Color(0, 0, 0, 0.5)
	overlay.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	overlay.mouse_entered.connect(func(): pass)  # Allow clicking through areas
	
	# Create main panel container - 85% of screen, centered
	var panel_container = Control.new()
	panel_container.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	
	# Calculate margins for 85% coverage (7.5% on each side)
	var margin_percent = 0.075
	var screen_size = get_tree().root.get_visible_rect().size
	var margin_x = screen_size.x * margin_percent
	var margin_y = screen_size.y * margin_percent
	
	panel_container.offset_left = margin_x
	panel_container.offset_top = margin_y
	panel_container.offset_right = -margin_x
	panel_container.offset_bottom = -margin_y
	
	# Create main panel
	var panel = Panel.new()
	panel.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	
	# Styling based on your CSS
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
	style_box.shadow_color = Color(0, 0, 0, 0.5)
	style_box.shadow_size = 10
	style_box.shadow_offset = Vector2(0, 4)
	panel.add_theme_stylebox_override("panel", style_box)
	
	panel_container.add_child(panel)
	
	# Create VBox container
	var vbox = VBoxContainer.new()
	vbox.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	vbox.add_theme_constant_override("separation", 20)
	panel_container.add_child(vbox)
	
	# Add margin
	var margin = MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 30)
	margin.add_theme_constant_override("margin_right", 30)
	margin.add_theme_constant_override("margin_top", 30)
	margin.add_theme_constant_override("margin_bottom", 30)
	vbox.add_child(margin)
	
	var content_vbox = VBoxContainer.new()
	content_vbox.add_theme_constant_override("separation", 15)
	margin.add_child(content_vbox)
	
	# Create title
	var title_label = Label.new()
	title_label.text = title
	title_label.add_theme_font_size_override("font_size", 28)
	title_label.add_theme_color_override("font_color", Color(0.55, 0.18, 0.25, 1))  # Primary blue
	content_vbox.add_child(title_label)
	
	# Add spacer
	var spacer = Control.new()
	spacer.custom_minimum_size = Vector2(0, 20)
	content_vbox.add_child(spacer)
	
	# Create close button
	var close_button = Button.new()
	close_button.text = "Close"
	close_button.custom_minimum_size = Vector2(100, 50)
	
	# Style close button
	var button_style = StyleBoxFlat.new()
	button_style.bg_color = Color(0.55, 0.72, 0.92, 1)  # --primary blue
	button_style.border_width_left = 2
	button_style.border_width_right = 2
	button_style.border_width_top = 2
	button_style.border_width_bottom = 2
	button_style.border_color = Color(0.45, 0.62, 0.82, 1)
	button_style.corner_radius_top_left = 8
	button_style.corner_radius_top_right = 8
	button_style.corner_radius_bottom_left = 8
	button_style.corner_radius_bottom_right = 8
	button_style.set_expand_margin_all(4)
	close_button.add_theme_stylebox_override("normal", button_style)
	
	var button_hover = StyleBoxFlat.new()
	button_hover.bg_color = Color(0.65, 0.78, 0.96, 1)
	button_hover.border_width_left = 2
	button_hover.border_width_right = 2
	button_hover.border_width_top = 2
	button_hover.border_width_bottom = 2
	button_hover.border_color = Color(0.55, 0.72, 0.92, 1)
	button_hover.corner_radius_top_left = 8
	button_hover.corner_radius_top_right = 8
	button_hover.corner_radius_bottom_left = 8
	button_hover.corner_radius_bottom_right = 8
	button_hover.set_expand_margin_all(4)
	close_button.add_theme_stylebox_override("hover", button_hover)
	
	close_button.add_theme_color_override("font_color", Color.WHITE)
	close_button.add_theme_color_override("font_hover_color", Color.WHITE)
	
	content_vbox.add_child(close_button)
	
	# Create a wrapper to hold both overlay and panel
	var wrapper = Control.new()
	wrapper.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	wrapper.add_child(overlay)
	wrapper.add_child(panel_container)
	
	# Connect close button to delete entire wrapper
	close_button.pressed.connect(func(): wrapper.queue_free())
	
	return wrapper
