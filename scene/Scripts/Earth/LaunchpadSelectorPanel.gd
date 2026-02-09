extends RefCounted
class_name LaunchpadSelectorPanel

var _launchpad: Node
const ACTION_SELECT_TARGET := "select_launch_target"
const HINT_SELECT_TARGET := "Pick one target so your rocket knows where to fly."

func setup(launchpad: Node) -> void:
	_launchpad = launchpad

func hide_selector_panel(hide_primary: bool = false) -> void:
	# Hide SelectorPanel nodes. By default hide duplicates only; if hide_primary is true hide the primary too.
	var root_scene = _launchpad.get_tree().current_scene
	if not root_scene:
		return
	var primary = root_scene.get_node_or_null("UILayer/SelectorPanel")
	var hidden_count = 0
	# Traverse and hide any SelectorPanel nodes according to hide_primary
	var stack = [root_scene]
	while stack.size() > 0:
		var node = stack.pop_back()
		for child in node.get_children():
			if child.name == "SelectorPanel":
				if hide_primary:
					child.visible = false
					hidden_count += 1
				else:
					if primary == null or child.get_path() != primary.get_path():
						child.visible = false
						hidden_count += 1
			stack.append(child)
	if hidden_count > 0:
		if hide_primary:
			print("Launchpad: selector panel hidden (all instances), count=", hidden_count)
		else:
			print("Launchpad: selector panel hidden (duplicates only), count=", hidden_count)

func show_selector_panel() -> void:
	# Show the first SelectorPanel found and hide any duplicates to prevent overlap
	var root_scene = _launchpad.get_tree().current_scene
	if not root_scene:
		return
	var first_shown = false
	var stack = [root_scene]
	while stack.size() > 0:
		var node = stack.pop_back()
		for child in node.get_children():
			if child.name == "SelectorPanel":
				if not first_shown:
					child.visible = true
					first_shown = true
				else:
					child.visible = false
			stack.append(child)
	if first_shown:
		print("Launchpad: selector panel shown (primary instance)")
		# Populate selector panel with detected targets
		populate_targets()
		# Ensure the RocketSelector (creation UI) is visible again if there are
		# no persisted awaitingLaunch rockets. This returns the panel to create/select mode.
		var rm = preload("res://Scripts/Utils/RocketsManager.gd")
		var has_awaiting := false
		if rm:
			var placed = rm.get_placed()
			for p in placed:
				if p.get("status", "") == "awaitingLaunch":
					has_awaiting = true
					break
		if not has_awaiting and root_scene:
			var rocket_selector = root_scene.get_node_or_null("UILayer/SelectorPanel/VBox/RocketSelector")
			if rocket_selector:
				rocket_selector.visible = true
				# Unlock creation by calling the RocketSelector's unlock_creation method
				if rocket_selector.has_method("unlock_creation"):
					rocket_selector.unlock_creation()
				# Re-enable any Create buttons inside RocketSelector so creation is available again
				var node_stack = [rocket_selector]
				while node_stack.size() > 0:
					var node = node_stack.pop_back()
					for c in node.get_children():
						if c is Button:
							c.disabled = false
						node_stack.append(c)
				print("Launchpad: RocketSelector restored and Create buttons enabled (no awaiting rockets)")
	else:
		print("Launchpad: no SelectorPanel found to show")

	# Debug: print UI visibility summary
	var root = _launchpad.get_tree().current_scene
	if root:
		var s = root.get_node_or_null("UILayer/SelectorPanel")
		var hud = root.get_node_or_null("LaunchHUD")
		var lb = null
		if hud:
			for c in hud.get_children():
				if c.name.ends_with("LaunchButton"):
					lb = c
		print("Launchpad: UI visibility summary -> UILayer/SelectorPanel=", s != null and s.visible or false, ", LaunchHUD=", hud != null and hud.visible or false, ", LaunchButton=", lb != null and lb.visible or false)

func populate_targets() -> void:
	print("Launchpad: _populate_targets called")
	var root_scene = _launchpad.get_tree().current_scene
	if not root_scene:
		return
	var panel = root_scene.get_node_or_null("UILayer/SelectorPanel")
	if not panel:
		return
	var vbox = panel.get_node_or_null("VBox")
	if not vbox:
		return
	print("Launchpad: found SelectorPanel VBox")
	# Clear existing entries except Title/BackButton (keep Title at top)
	for child in vbox.get_children():
		if child.name in ["Title", "BackButton", "RocketSelector", "LaunchedList"]:
			continue
		child.queue_free()

	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if not rm:
		return
	var targets = rm.get_detected_targets()
	print("Launchpad: _populate_targets -> detected targets count=", targets.size())
	if targets.size() == 0:
		var lbl = Label.new()
		lbl.text = "No detected targets available."
		lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		vbox.add_child(lbl)
		return

	for t in targets:
		var entry = HBoxContainer.new()
		entry.custom_minimum_size = Vector2(0, 40)
		var name_lbl = Label.new()
		name_lbl.text = str(t.get("label", t.get("id")))
		name_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		entry.add_child(name_lbl)
		var btn = Button.new()
		btn.text = "Select"
		btn.focus_mode = Control.FOCUS_NONE
		# bind id
		btn.pressed.connect(Callable(self, "on_selector_target_pressed").bind(str(t.get("id")), btn))
		entry.add_child(btn)
		vbox.add_child(entry)

func on_selector_target_pressed(target_id: String, btn: Button) -> void:
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if not rm:
		return
	var ok = rm.select_target(target_id)
	if ok:
		_show_tutorial_hint_once(ACTION_SELECT_TARGET, HINT_SELECT_TARGET)
		print("Launchpad: target selected from selector:", target_id)
		# update buttons in this panel to reflect selection
		var root_scene = _launchpad.get_tree().current_scene
		if root_scene:
			var panel = root_scene.get_node_or_null("UILayer/SelectorPanel")
			if panel:
				var vbox = panel.get_node_or_null("VBox")
				if vbox:
					for child in vbox.get_children():
						if child is HBoxContainer:
							for c in child.get_children():
								if c is Button:
									c.text = "Select"
									c.disabled = false
				btn.text = "Target Selected"
				btn.disabled = true
	else:
		print("Launchpad: failed to persist target selection from selector", target_id)

func _show_tutorial_hint_once(action_key: String, message: String) -> void:
	var tree = _launchpad.get_tree()
	if tree == null:
		return
	var app = tree.root.find_child("AppController", true, false)
	if app and app.has_method("show_tutorial_hint_once"):
		app.show_tutorial_hint_once(action_key, message)
