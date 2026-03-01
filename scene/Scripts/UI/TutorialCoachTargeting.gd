extends RefCounted

static func find_current_target(current_step: Dictionary, tree: SceneTree) -> Node:
	var action_key = str(current_step.get("action_key", ""))
	if action_key == "":
		return null
	return _find_target_for_action(action_key, tree)

static func find_current_target_rect(current_step: Dictionary, tree: SceneTree) -> Rect2:
	var target = find_current_target(current_step, tree)
	if target == null:
		return Rect2()
	return _build_target_rect(target)

static func build_target_rect(target: Node) -> Rect2:
	if target == null:
		return Rect2()
	return _build_target_rect(target)

static func action_hint_for_step(action_key: String) -> String:
	match action_key:
		"open_launchpad":
			return "Launchpad"
		"create_rocket":
			return "Create button in Rocket Selector"
		"select_launch_target":
			return "Select target button"
		"launch_rocket_from_earth":
			return "Launch button"
		"mine_target":
			return "MINE button"
		"return_rocket_home":
			return "RETURN HOME button"
		"resolve_mission_debrief":
			return "Choose any enabled debrief action"
		"build_scanner_station":
			return "Scanner Station structure"
		"scan_targets":
			return "Refresh button in scanner panel"
		"toggle_planet_scanner":
			return "Scanner toggle switch"
		"accept_contractor_offer":
			return "Accept contractor button"
		"complete_contractor_mission":
			return "Complete debrief for contractor mission"
	return action_key

static func _find_target_for_action(action_key: String, tree: SceneTree) -> Node:
	match action_key:
		"open_launchpad":
			return _find_node_path_any(tree, [
				"StructuresLayer/Launchpad",
				"StructuresLayer/Launchpad/InteractionArea"
			])
		"build_scanner_station":
			return _find_node_path_any(tree, [
				"StructuresLayer/SatelliteStation",
				"StructuresLayer/SatelliteStation/InteractionArea"
			])
		"create_rocket":
			var create_btn = _find_visible_button(tree, func(btn: Button) -> bool:
				return btn.name.begins_with("CreateButton_") and not btn.disabled
			)
			if create_btn:
				return create_btn
			return _find_node_path_any(tree, ["UILayer/SelectorPanel/VBox/RocketSelector"])
		"select_launch_target":
			return _find_visible_button(tree, func(btn: Button) -> bool:
				if btn.disabled:
					return false
				var text = btn.text.to_lower()
				return text.find("select") != -1 or text.find("target") != -1
			)
		"launch_rocket_from_earth":
			return _find_visible_button(tree, func(btn: Button) -> bool:
				return not btn.disabled and (btn.name.ends_with("LaunchButton") or btn.text.to_lower().find("launch") != -1)
			)
		"scan_targets":
			return _find_node_path_any(tree, ["PanelContainer/Panel/VBoxContainer/ContentContainer/RefreshContainer/RefreshButton"])
		"toggle_planet_scanner":
			return _find_node_path_any(tree, ["PanelContainer/Panel/VBoxContainer/HeaderContainer/ToggleSwitch"])
		"mine_target":
			return _find_node_path_any(tree, ["CanvasLayer/UI/MineButton", "UI/FireButton"])
		"return_rocket_home":
			return _find_node_path_any(tree, ["CanvasLayer/UI/ReturnButton", "UI/ReturnButton"])
		"resolve_mission_debrief", "complete_contractor_mission":
			return _find_visible_button(tree, func(btn: Button) -> bool:
				if btn.disabled:
					return false
				var key = btn.name
				return key == "SellOrbitButton" or key == "SellEarthButton" or key == "KeepButton" or key == "ScrapButton" or key == "SalvageButton" or key == "LeaveButton" or key == "ArchiveButton"
			)
		"accept_contractor_offer":
			return _find_visible_button(tree, func(btn: Button) -> bool:
				return not btn.disabled and btn.text.to_lower().find("accept") != -1
			)
	return null

static func _build_target_rect(target: Node) -> Rect2:
	if target is Control:
		return (target as Control).get_global_rect()
	if target is CollisionShape2D:
		var shape_node = target as CollisionShape2D
		if shape_node.shape is RectangleShape2D:
			var rect_shape := shape_node.shape as RectangleShape2D
			var center = shape_node.get_global_transform_with_canvas().origin
			var size = rect_shape.size * shape_node.global_scale.abs()
			return Rect2(center - (size * 0.5), size)
	if target is Area2D:
		var area := target as Area2D
		for child in area.get_children():
			if child is CollisionShape2D:
				return _build_target_rect(child)
		var center = area.get_global_transform_with_canvas().origin
		return Rect2(center - Vector2(64, 64), Vector2(128, 128))
	if target is Sprite2D:
		var sprite := target as Sprite2D
		if sprite.texture:
			var size = sprite.texture.get_size() * sprite.global_scale.abs()
			var center = sprite.get_global_transform_with_canvas().origin
			return Rect2(center - (size * 0.5), size)
	if target is CanvasItem:
		var center = (target as CanvasItem).get_global_transform_with_canvas().origin
		return Rect2(center - Vector2(72, 72), Vector2(144, 144))
	return Rect2()

static func _find_visible_button(tree: SceneTree, predicate: Callable) -> Button:
	var root = tree.current_scene
	if root == null:
		return null
	var stack: Array[Node] = [root]
	while not stack.is_empty():
		var node = stack.pop_back()
		if node is Button:
			var btn := node as Button
			if btn.is_visible_in_tree() and bool(predicate.call(btn)):
				return btn
		var children = node.get_children()
		for i in range(children.size() - 1, -1, -1):
			stack.append(children[i])
	return null

static func _find_node_path_any(tree: SceneTree, paths: Array[String]) -> Node:
	var root = tree.current_scene
	if root == null:
		return null
	for path in paths:
		var node = root.get_node_or_null(path)
		if node and (not (node is CanvasItem) or (node as CanvasItem).is_visible_in_tree()):
			return node
	var stack: Array[Node] = [root]
	while not stack.is_empty():
		var node = stack.pop_back()
		for child in node.get_children():
			for path in paths:
				if str(child.get_path()).find(path) != -1 and (not (child is CanvasItem) or (child as CanvasItem).is_visible_in_tree()):
					return child
			stack.append(child)
	return null
