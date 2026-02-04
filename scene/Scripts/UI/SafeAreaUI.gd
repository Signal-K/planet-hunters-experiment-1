extends Node

@export var bottom_inset: float = 120.0
@export var top_inset: float = 36.0
@export var horizontal_inset: float = 24.0

func _ready() -> void:
	apply_safe_area()
	get_tree().root.size_changed.connect(apply_safe_area)

func apply_safe_area() -> void:
	var root = get_tree().root
	if root == null:
		return

	var button_container = root.find_child("ButtonContainer", true, false)
	if button_container and button_container is Control:
		var control := button_container as Control
		control.offset_left = horizontal_inset
		control.offset_right = root.size.x - horizontal_inset
		control.offset_bottom = root.size.y - bottom_inset
		control.offset_top = control.offset_bottom - max(control.custom_minimum_size.y, 80)

	var tutorial_panel = root.find_child("TutorialPanel", true, false)
	if tutorial_panel and tutorial_panel is Control:
		var panel := tutorial_panel as Control
		panel.offset_left = horizontal_inset
		panel.offset_top = top_inset
		panel.offset_right = root.size.x - horizontal_inset

	var franc_balance = root.find_child("FrancBalance", true, false)
	if franc_balance and franc_balance is Control:
		var balance := franc_balance as Control
		balance.offset_right = root.size.x - horizontal_inset
		balance.offset_top = top_inset
