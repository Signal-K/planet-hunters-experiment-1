extends Node

const PanelStyle = preload("res://Scripts/UI/PanelStyle.gd")

const META_KEY := "ui_consistency_applied"
const META_LOCK := "ui_style_locked"

func _ready() -> void:
	var tree = get_tree()
	if tree == null:
		return
	tree.node_added.connect(_on_tree_node_added)
	call_deferred("_apply_current_scene")

func _apply_current_scene() -> void:
	var scene_root = get_tree().current_scene
	if scene_root != null:
		_apply_tree(scene_root)

func _on_tree_node_added(node: Node) -> void:
	if node == null:
		return
	if node is Control:
		call_deferred("_apply_tree", node)

func _apply_tree(root: Node) -> void:
	if root == null:
		return
	if root is Control:
		_apply_control(root as Control)
	for child in root.get_children():
		_apply_tree(child)

func _apply_control(control: Control) -> void:
	if control == null:
		return
	if control.has_meta(META_LOCK):
		return
	if control.has_meta(META_KEY):
		return

	if control is PanelContainer or control is Panel:
		PanelStyle.apply_panel(control)
	elif control is Button:
		PanelStyle.apply_button(control as Button, _is_primary_button(control as Button))
	elif control is ProgressBar:
		PanelStyle.apply_progress_bar(control as ProgressBar)
	elif control is HSeparator:
		PanelStyle.apply_separator(control as HSeparator)
	elif control is RichTextLabel:
		_apply_richtext_color(control as RichTextLabel)
	elif control is Label:
		_apply_label_color(control as Label)

	control.set_meta(META_KEY, true)

func _is_primary_button(button: Button) -> bool:
	var n := button.name.to_lower()
	var t := button.text.to_lower()
	if n.contains("close") or t.contains("close"):
		return false
	if n.contains("cancel") or t.contains("cancel"):
		return false
	if n.contains("back") or t.contains("back"):
		return false
	if n.contains("primary"):
		return true
	if n.contains("launch") or t.contains("launch"):
		return true
	if n.contains("sell") or t.contains("sell"):
		return true
	if n.contains("start") or t.contains("start"):
		return true
	if n.contains("build") or t.contains("build"):
		return true
	if n.contains("continue") or t.contains("continue"):
		return true
	return false

func _apply_label_color(label: Label) -> void:
	if label.has_theme_color_override("font_color"):
		return
	if _is_muted_label(label):
		label.add_theme_color_override("font_color", PanelStyle.TEXT_MUTED)
	else:
		label.add_theme_color_override("font_color", PanelStyle.TEXT_PRIMARY)

func _apply_richtext_color(label: RichTextLabel) -> void:
	if label.has_theme_color_override("default_color"):
		return
	label.add_theme_color_override("default_color", PanelStyle.TEXT_PRIMARY)

func _is_muted_label(label: Label) -> bool:
	var name_lower := label.name.to_lower()
	if name_lower.contains("subtitle"):
		return true
	if name_lower.contains("hint"):
		return true
	if name_lower.contains("status"):
		return true
	if name_lower.contains("muted"):
		return true
	if name_lower.contains("caption"):
		return true
	if name_lower.contains("secondary"):
		return true
	if name_lower.contains("empty"):
		return true
	if name_lower.contains("details"):
		return true
	return false
