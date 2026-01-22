## Manager class for handling panel creation and styling
class_name PanelManager
extends RefCounted

## Create a styled panel with consistent styling
static func create_styled_panel(title: String, tree: SceneTree) -> Control:
	# Create a semi-transparent background overlay
	var overlay = ColorRect.new()
	overlay.color = Color(0, 0, 0, 0.5)
	overlay.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	
	# Create main panel container - 85% of screen, centered
	var panel_container = Control.new()
	panel_container.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	
	# Calculate margins for 85% coverage (7.5% on each side)
	var margin_percent = 0.075
	var screen_size = tree.root.get_visible_rect().size
	var margin_x = screen_size.x * margin_percent
	var margin_y = screen_size.y * margin_percent
	
	panel_container.offset_left = margin_x
	panel_container.offset_top = margin_y
	panel_container.offset_right = -margin_x
	panel_container.offset_bottom = -margin_y
	
	# Create main panel with styling
	var panel = Panel.new()
	panel.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_apply_panel_style(panel)
	
	panel_container.add_child(panel)
	
	# Create content layout
	var content = _create_panel_content(title, panel_container)
	panel_container.add_child(content)
	
	# Create wrapper to hold both overlay and panel
	var wrapper = Control.new()
	wrapper.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	wrapper.add_child(overlay)
	wrapper.add_child(panel_container)
	
	return wrapper

## Apply consistent styling to panel
static func _apply_panel_style(panel: Panel) -> void:
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

## Create the content layout for the panel
static func _create_panel_content(title: String, parent: Control) -> VBoxContainer:
	var vbox = VBoxContainer.new()
	vbox.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	vbox.add_theme_constant_override("separation", 20)
	
	# Add margin container
	var margin = MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 30)
	margin.add_theme_constant_override("margin_right", 30)
	margin.add_theme_constant_override("margin_top", 30)
	margin.add_theme_constant_override("margin_bottom", 30)
	vbox.add_child(margin)
	
	var content_vbox = VBoxContainer.new()
	content_vbox.add_theme_constant_override("separation", 15)
	margin.add_child(content_vbox)
	
	# Create title label
	_create_title_label(title, content_vbox)
	
	# Add spacer
	var spacer = Control.new()
	spacer.custom_minimum_size = Vector2(0, 20)
	content_vbox.add_child(spacer)
	
	# Create close button
	_create_close_button(content_vbox, parent)
	
	return vbox

## Create styled title label
static func _create_title_label(title: String, parent: VBoxContainer) -> void:
	var title_label = Label.new()
	title_label.text = title
	title_label.add_theme_font_size_override("font_size", 28)
	title_label.add_theme_color_override("font_color", Color(0.55, 0.18, 0.25, 1))
	parent.add_child(title_label)

## Create styled close button
static func _create_close_button(parent: VBoxContainer, wrapper: Control) -> void:
	var close_button = Button.new()
	close_button.text = "Close"
	close_button.custom_minimum_size = Vector2(100, 50)
	
	_apply_button_style(close_button)
	parent.add_child(close_button)
	
	# Connect close button to delete entire wrapper
	close_button.pressed.connect(func(): wrapper.queue_free())

## Apply consistent button styling
static func _apply_button_style(button: Button) -> void:
	# Normal style
	var button_style = StyleBoxFlat.new()
	button_style.bg_color = Color(0.55, 0.72, 0.92, 1)
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
	button.add_theme_stylebox_override("normal", button_style)
	
	# Hover style
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
	button.add_theme_stylebox_override("hover", button_hover)
	
	button.add_theme_color_override("font_color", Color.WHITE)
	button.add_theme_color_override("font_hover_color", Color.WHITE)