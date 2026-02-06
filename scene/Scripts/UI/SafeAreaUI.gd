extends Node

@export var bottom_inset: float = 0.0
@export var bottom_padding: float = 24.0
@export var top_inset: float = 36.0
@export var horizontal_inset: float = 24.0

func _ready() -> void:
	apply_safe_area()
	get_tree().root.size_changed.connect(apply_safe_area)
	get_tree().node_added.connect(_on_node_added)

func _on_node_added(node: Node) -> void:
	if node == null:
		return
	if node.name == "ButtonContainer" or node.name == "TutorialPanel" or node.name == "FrancBalance":
		# Scene changes do not always trigger window size updates, so force a layout pass.
		call_deferred("apply_safe_area")

func apply_safe_area() -> void:
	var viewport := get_viewport()
	if viewport == null:
		return
	var visible_size := viewport.get_visible_rect().size

	var root = get_tree().root
	if root == null:
		return

	var button_container = root.find_child("ButtonContainer", true, false)
	if button_container and button_container is Control:
		var control := button_container as Control
		# Use top-left anchored coordinates to avoid mixed anchor/offset math across exports.
		control.anchor_left = 0.0
		control.anchor_top = 0.0
		control.anchor_right = 0.0
		control.anchor_bottom = 0.0

		var button_height: float = maxf(control.get_combined_minimum_size().y, 80.0)
		control.offset_left = horizontal_inset
		control.offset_right = visible_size.x - horizontal_inset
		control.offset_bottom = visible_size.y - bottom_inset - bottom_padding
		control.offset_top = control.offset_bottom - button_height

	var tutorial_panel = root.find_child("TutorialPanel", true, false)
	if tutorial_panel and tutorial_panel is Control:
		var panel := tutorial_panel as Control
		panel.offset_left = horizontal_inset
		panel.offset_top = top_inset
		panel.offset_right = visible_size.x - horizontal_inset

	var franc_balance = root.find_child("FrancBalance", true, false)
	if franc_balance and franc_balance is Control:
		var balance := franc_balance as Control
		balance.offset_right = visible_size.x - horizontal_inset
		balance.offset_top = top_inset
