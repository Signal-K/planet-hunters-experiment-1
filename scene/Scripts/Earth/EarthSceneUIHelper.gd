extends RefCounted
class_name EarthSceneUIHelper

var _owner: Node

func setup(owner: Node) -> void:
	_owner = owner

func setup_buttons() -> void:
	"""Setup button styling and connections"""
	var back_btn = _owner.get_node("UILayer/ButtonContainer/BackButton")
	var forward_btn = _owner.get_node("UILayer/ButtonContainer/ForwardButton")
	var menu_btn = _owner.get_node("UILayer/ButtonContainer/MenuButton")
	var market_btn = _owner.get_node("UILayer/ButtonContainer/MarketButton")
	var space_map_btn = _owner.get_node("UILayer/ButtonContainer/SpaceMapButton")
	var new_mission_btn = _owner.get_node("UILayer/ButtonContainer/NewMissionButton")

	var buttons = [back_btn, forward_btn, menu_btn, market_btn, space_map_btn, new_mission_btn]
	for button in buttons:
		_apply_button_style(button)

	# Connect signals
	back_btn.pressed.connect(Callable(_owner, "_on_back_button_pressed"))
	forward_btn.pressed.connect(Callable(_owner, "_on_forward_button_pressed"))
	menu_btn.pressed.connect(Callable(_owner, "_on_menu_button_pressed"))
	market_btn.pressed.connect(Callable(_owner, "_on_market_button_pressed"))
	space_map_btn.pressed.connect(Callable(_owner, "_on_space_map_button_pressed"))
	new_mission_btn.pressed.connect(Callable(_owner, "_on_new_mission_button_pressed"))

	print("All buttons styled and connected")

func _apply_button_style(button: Button) -> void:
	"""Apply styling to a button based on CSS design system"""
	# Normal state - Primary blue background
	var normal_style = StyleBoxFlat.new()
	normal_style.bg_color = Color(0.55, 0.72, 0.92, 1)  # Primary blue
	normal_style.border_width_left = 2
	normal_style.border_width_right = 2
	normal_style.border_width_top = 2
	normal_style.border_width_bottom = 2
	normal_style.border_color = Color(0.45, 0.62, 0.82, 1)
	normal_style.corner_radius_top_left = 8
	normal_style.corner_radius_top_right = 8
	normal_style.corner_radius_bottom_left = 8
	normal_style.corner_radius_bottom_right = 8
	normal_style.set_expand_margin_all(4)
	button.add_theme_stylebox_override("normal", normal_style)

	# Hover state - Lighter blue
	var hover_style = StyleBoxFlat.new()
	hover_style.bg_color = Color(0.65, 0.78, 0.96, 1)
	hover_style.border_width_left = 2
	hover_style.border_width_right = 2
	hover_style.border_width_top = 2
	hover_style.border_width_bottom = 2
	hover_style.border_color = Color(0.55, 0.72, 0.92, 1)
	hover_style.corner_radius_top_left = 8
	hover_style.corner_radius_top_right = 8
	hover_style.corner_radius_bottom_left = 8
	hover_style.corner_radius_bottom_right = 8
	hover_style.set_expand_margin_all(4)
	button.add_theme_stylebox_override("hover", hover_style)

	# Pressed state - Darker blue
	var pressed_style = StyleBoxFlat.new()
	pressed_style.bg_color = Color(0.45, 0.62, 0.82, 1)
	pressed_style.border_width_left = 2
	pressed_style.border_width_right = 2
	pressed_style.border_width_top = 2
	pressed_style.border_width_bottom = 2
	pressed_style.border_color = Color(0.35, 0.52, 0.72, 1)
	pressed_style.corner_radius_top_left = 8
	pressed_style.corner_radius_top_right = 8
	pressed_style.corner_radius_bottom_left = 8
	pressed_style.corner_radius_bottom_right = 8
	pressed_style.set_expand_margin_all(4)
	button.add_theme_stylebox_override("pressed", pressed_style)

	# Focus state
	var focus_style = StyleBoxFlat.new()
	focus_style.bg_color = Color(0.60, 0.75, 0.94, 1)
	focus_style.border_width_left = 2
	focus_style.border_width_right = 2
	focus_style.border_width_top = 2
	focus_style.border_width_bottom = 2
	focus_style.border_color = Color(0.55, 0.18, 0.25, 1)  # Ring color
	focus_style.corner_radius_top_left = 8
	focus_style.corner_radius_top_right = 8
	focus_style.corner_radius_bottom_left = 8
	focus_style.corner_radius_bottom_right = 8
	focus_style.set_expand_margin_all(4)
	button.add_theme_stylebox_override("focus", focus_style)

	# Text color - white with improved rendering
	button.add_theme_color_override("font_color", Color(1, 1, 1, 1))
	button.add_theme_color_override("font_hover_color", Color(1, 1, 1, 1))
	button.add_theme_color_override("font_pressed_color", Color(1, 1, 1, 1))
	button.add_theme_color_override("font_focus_color", Color(1, 1, 1, 1))

	# Improve font rendering quality
	button.add_theme_font_size_override("font_size", 28)  # Larger font size for crisp text
