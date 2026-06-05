## Manager class for handling panel creation and styling
class_name PanelManager
extends RefCounted

const PanelStyle = preload("res://Scripts/UI/PanelStyle.gd")

static var GenericStyledPanelScene: PackedScene = load("res://Scenes/UI/Templates/GenericStyledPanel.tscn") if ResourceLoader.exists("res://Scenes/UI/Templates/GenericStyledPanel.tscn") else null

## Create a styled panel with consistent styling
static func create_styled_panel(title: String, tree: SceneTree) -> Control:
	var wrapper: Control = GenericStyledPanelScene.instantiate()
	if wrapper == null:
		return null

	var panel_container: Control = wrapper.get_node("PanelContainer")
	var margin_percent = 0.075
	var screen_size = tree.root.get_visible_rect().size
	var margin_x = screen_size.x * margin_percent
	var margin_y = screen_size.y * margin_percent
	panel_container.offset_left = margin_x
	panel_container.offset_top = margin_y
	panel_container.offset_right = -margin_x
	panel_container.offset_bottom = -margin_y

	var panel: Panel = wrapper.get_node("PanelContainer/Panel")
	var title_label: Label = wrapper.get_node("PanelContainer/Content/Margin/Body/TitleLabel")
	var close_button: Button = wrapper.get_node("PanelContainer/Content/Margin/Body/CloseButton")
	title_label.text = title

	var panel_style = PanelStyle
	panel_style.apply_panel(panel)
	panel_style.apply_title(title_label)
	panel_style.apply_button(close_button, true)
	close_button.pressed.connect(func(): wrapper.queue_free())
	return wrapper