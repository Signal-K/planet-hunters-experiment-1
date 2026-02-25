extends Resource
class_name NebulaSciTheme

# Nebula color palette
const NEBULA_DEEP_PURPLE := Color(0.08, 0.05, 0.15, 1.0)
const NEBULA_PURPLE := Color(0.25, 0.15, 0.35, 1.0)
const NEBULA_PINK := Color(0.85, 0.35, 0.55, 1.0)
const NEBULA_ORANGE := Color(0.95, 0.45, 0.25, 1.0)
const NEBULA_CYAN := Color(0.25, 0.75, 0.85, 1.0)

# UI colors
const PANEL_BG := Color(0.05, 0.05, 0.08, 0.85)
const PANEL_OUTLINE := Color(0.95, 0.85, 0.95, 1.0)
const BUTTON_BG := Color(0.12, 0.10, 0.15, 0.95)
const BUTTON_HOVER := Color(0.20, 0.15, 0.25, 0.95)
const BUTTON_PRESSED := Color(0.30, 0.20, 0.35, 0.95)
const ACCENT_GREEN := Color(0.25, 0.95, 0.45, 1.0)
const ACCENT_BLUE := Color(0.35, 0.75, 0.95, 1.0)

# Create panel style
static func create_panel_style() -> StyleBoxFlat:
	var style = StyleBoxFlat.new()
	style.bg_color = PANEL_BG
	style.border_width_left = 3
	style.border_width_top = 3
	style.border_width_right = 3
	style.border_width_bottom = 3
	style.border_color = PANEL_OUTLINE
	style.corner_radius_top_left = 12
	style.corner_radius_top_right = 12
	style.corner_radius_bottom_right = 12
	style.corner_radius_bottom_left = 12
	style.content_margin_left = 16
	style.content_margin_top = 12
	style.content_margin_right = 16
	style.content_margin_bottom = 12
	return style

# Create button style
static func create_button_style(state: String = "normal") -> StyleBoxFlat:
	var style = StyleBoxFlat.new()
	match state:
		"hover":
			style.bg_color = BUTTON_HOVER
		"pressed":
			style.bg_color = BUTTON_PRESSED
		_:
			style.bg_color = BUTTON_BG
	
	style.border_width_left = 2
	style.border_width_top = 2
	style.border_width_right = 2
	style.border_width_bottom = 2
	style.border_color = PANEL_OUTLINE
	style.corner_radius_top_left = 8
	style.corner_radius_top_right = 8
	style.corner_radius_bottom_right = 8
	style.corner_radius_bottom_left = 8
	style.content_margin_left = 12
	style.content_margin_top = 8
	style.content_margin_right = 12
	style.content_margin_bottom = 8
	return style

# Create segmented progress bar
static func create_segmented_bar(container: HBoxContainer, segments: int, filled: int, color: Color) -> void:
	for child in container.get_children():
		child.queue_free()
	
	for i in segments:
		var segment = ColorRect.new()
		segment.custom_minimum_size = Vector2(8, 16)
		segment.color = color if i < filled else Color(0.2, 0.2, 0.25, 0.5)
		container.add_child(segment)
		if i < segments - 1:
			var spacer = Control.new()
			spacer.custom_minimum_size = Vector2(2, 16)
			container.add_child(spacer)

# Create nebula background gradient
static func create_nebula_gradient() -> Gradient:
	var gradient = Gradient.new()
	gradient.set_color(0, NEBULA_DEEP_PURPLE)
	gradient.add_point(0.3, NEBULA_PURPLE)
	gradient.add_point(0.6, NEBULA_PINK)
	gradient.add_point(1.0, NEBULA_ORANGE)
	return gradient
