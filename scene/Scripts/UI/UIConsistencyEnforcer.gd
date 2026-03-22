extends Node

const PanelStyle = preload("res://Scripts/UI/PanelStyle.gd")
const TutorialLayoutZone = preload("res://Scripts/UI/TutorialLayoutZone.gd")

const META_KEY := "ui_consistency_applied"
const META_LOCK := "ui_style_locked"
const META_ZONE_EXEMPT := "tutorial_zone_exempt"
const META_ZONE_HIDDEN := "tutorial_zone_hidden_by_guard"
const RESERVED_REFRESH_INTERVAL := 0.15

var _reserved_elapsed := 0.0

func _ready() -> void:
	var tree = get_tree()
	if tree == null:
		return
	tree.node_added.connect(_on_tree_node_added)
	set_process(true)
	call_deferred("_apply_current_scene")

func _process(delta: float) -> void:
	_reserved_elapsed += delta
	if _reserved_elapsed < RESERVED_REFRESH_INTERVAL:
		return
	_reserved_elapsed = 0.0
	_enforce_tutorial_reserved_zone()

func _apply_current_scene() -> void:
	var scene_root = get_tree().current_scene
	if scene_root != null:
		_apply_tree(scene_root)

func _on_tree_node_added(node: Node) -> void:
	if node == null:
		return
	if node is Control:
		_apply_tree(node)

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
		if not label.has_theme_font_size_override("font_size"):
			label.add_theme_font_size_override("font_size", PanelStyle.FONT_MUTED)
	else:
		label.add_theme_color_override("font_color", PanelStyle.TEXT_PRIMARY)
		if not label.has_theme_font_size_override("font_size"):
			label.add_theme_font_size_override("font_size", PanelStyle.FONT_BODY)

func _apply_richtext_color(label: RichTextLabel) -> void:
	if label.has_theme_color_override("default_color"):
		return
	label.add_theme_color_override("default_color", PanelStyle.TEXT_PRIMARY)
	if not label.has_theme_font_size_override("normal_font_size"):
		label.add_theme_font_size_override("normal_font_size", PanelStyle.FONT_BODY)

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

func _enforce_tutorial_reserved_zone() -> void:
	# Dedicated tutorial lane is now handled by deterministic layout contracts
	# (TutorialLayoutZone.content_rect) in the UI scripts themselves.
	# Do not auto-move/hide controls globally; that caused layout instability.
	return

func _apply_reserved_zone_to_node(node: Node, reserved: Rect2, viewport_rect: Rect2) -> void:
	if node is Control:
		_apply_reserved_zone_to_control(node as Control, reserved, viewport_rect)
	for child in node.get_children():
		_apply_reserved_zone_to_node(child, reserved, viewport_rect)

func _apply_reserved_zone_to_control(control: Control, reserved: Rect2, viewport_rect: Rect2) -> void:
	if control == null:
		return
	if not is_instance_valid(control) or control.is_queued_for_deletion():
		return
	if not control.is_inside_tree():
		return
	if not _is_zone_candidate(control):
		return
	var rect := control.get_global_rect()
	if rect.size.x < 48.0 or rect.size.y < 32.0:
		return
	var overlap := rect.intersection(reserved)
	if overlap.size.x <= 0.0 or overlap.size.y <= 0.0:
		if bool(control.get_meta(META_ZONE_HIDDEN, false)):
			control.visible = true
			control.set_meta(META_ZONE_HIDDEN, false)
		return
	var target_position := _resolve_non_overlapping_position(rect, reserved, viewport_rect)
	if target_position == Vector2.INF:
		control.visible = false
		control.set_meta(META_ZONE_HIDDEN, true)
		return
	if bool(control.get_meta(META_ZONE_HIDDEN, false)):
		control.visible = true
		control.set_meta(META_ZONE_HIDDEN, false)
	_move_control_global(control, target_position)

func _is_zone_candidate(control: Control) -> bool:
	if not control.is_visible_in_tree():
		return false
	if _is_under_menu_overlay(control):
		return false
	if control.has_meta(META_ZONE_EXEMPT):
		return false
	if _has_zone_exempt_ancestor(control):
		return false
	if control is Container:
		return false
	var parent = control.get_parent()
	if parent is Container:
		return false
	if _has_repositionable_ancestor(control):
		return false
	var size := control.get_global_rect().size
	var viewport_size := get_viewport().get_visible_rect().size
	if size.x >= viewport_size.x * 0.9 and size.y >= viewport_size.y * 0.9:
		return false
	return (
		control is PanelContainer
		or control is Panel
		or control is Button
		or control is HBoxContainer
		or control is VBoxContainer
		or control is TabContainer
		or control is ScrollContainer
		or control is ItemList
		or control is Tree
		or control is Label
		or control is RichTextLabel
	)

func _has_zone_exempt_ancestor(control: Control) -> bool:
	var node: Node = control
	while node != null:
		if node is Control and (node as Control).has_meta(META_ZONE_EXEMPT):
			return true
		node = node.get_parent()
	return false

func _has_repositionable_ancestor(control: Control) -> bool:
	var node: Node = control.get_parent()
	while node != null:
		if node is Control:
			var ancestor := node as Control
			if ancestor is Container:
				return true
			if ancestor.has_meta(META_ZONE_EXEMPT):
				return true
			if (
				ancestor is PanelContainer
				or ancestor is Panel
				or ancestor is HBoxContainer
				or ancestor is VBoxContainer
				or ancestor is TabContainer
				or ancestor is ScrollContainer
				or ancestor is ItemList
				or ancestor is Tree
			):
				return true
		node = node.get_parent()
	return false

func _resolve_non_overlapping_position(rect: Rect2, reserved: Rect2, viewport_rect: Rect2) -> Vector2:
	var gap := TutorialLayoutZone.RESERVED_GAP
	var bounds_left := viewport_rect.position.x + gap
	var bounds_top := viewport_rect.position.y + gap
	var bounds_right := viewport_rect.end.x - rect.size.x - gap
	var bounds_bottom := viewport_rect.end.y - rect.size.y - gap
	if bounds_right < bounds_left or bounds_bottom < bounds_top:
		return Vector2.INF
	var candidates: Array[Vector2] = [
		Vector2(reserved.position.x - rect.size.x - gap, rect.position.y),
		Vector2(rect.position.x, reserved.end.y + gap),
		Vector2(reserved.end.x + gap, rect.position.y),
		Vector2(rect.position.x, reserved.position.y - rect.size.y - gap),
		Vector2(bounds_left, bounds_top),
		Vector2(bounds_left, bounds_bottom),
		Vector2(bounds_right, bounds_top),
		Vector2(bounds_right, bounds_bottom)
	]
	var best := Vector2.INF
	var best_distance := INF
	for candidate in candidates:
		var clamped := Vector2(
			clamp(candidate.x, bounds_left, bounds_right),
			clamp(candidate.y, bounds_top, bounds_bottom)
		)
		var placed := Rect2(clamped, rect.size)
		if placed.intersects(reserved):
			continue
		var distance := clamped.distance_to(rect.position)
		if distance < best_distance:
			best_distance = distance
			best = clamped
	return best

func _move_control_global(control: Control, global_pos: Vector2) -> void:
	var parent = control.get_parent()
	if control.top_level or not (parent is CanvasItem):
		control.global_position = global_pos
		return
	var parent_item := parent as CanvasItem
	control.position = parent_item.to_local(global_pos)

func _is_menu_open() -> bool:
	var app = get_node_or_null("/root/AppController")
	if app == null or not app.has_method("is_menu_open"):
		return false
	return bool(app.is_menu_open())

func _is_under_menu_overlay(control: Control) -> bool:
	if control == null:
		return false
	var node: Node = control
	while node != null:
		if node is CanvasLayer and node.name == "MenuOverlayLayer":
			return true
		node = node.get_parent()
	return false
