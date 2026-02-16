extends RefCounted
class_name LaunchpadSelectorPanel

var _launchpad: Node
const ACTION_SELECT_TARGET := "select_launch_target"
const HINT_SELECT_TARGET := "Pick one target so your rocket knows where to fly."
const PanelStyle = preload("res://Scripts/UI/PanelStyle.gd")

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
	_style_selector_panel(panel, vbox)
	print("Launchpad: found SelectorPanel VBox")
	# Clear existing entries except the core nodes.
	for child in vbox.get_children():
		if child.name in ["Title", "BackButton", "RocketSelector", "LaunchedList", "TargetsSection"]:
			continue
		child.queue_free()

	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if not rm:
		return
	var targets = rm.get_detected_targets()
	print("Launchpad: _populate_targets -> detected targets count=", targets.size())
	var targets_section = vbox.get_node_or_null("TargetsSection")
	if targets_section == null:
		targets_section = VBoxContainer.new()
		targets_section.name = "TargetsSection"
		targets_section.add_theme_constant_override("separation", 8)
		var idx_back = vbox.get_children().find(vbox.get_node_or_null("BackButton"))
		if idx_back == -1:
			vbox.add_child(targets_section)
		else:
			vbox.add_child(targets_section)
			vbox.move_child(targets_section, idx_back)
	for c in targets_section.get_children():
		c.queue_free()

	var targets_title = Label.new()
	targets_title.text = "Mission Target"
	targets_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	PanelStyle.apply_muted(targets_title)
	targets_title.add_theme_font_size_override("font_size", 16)
	targets_section.add_child(targets_title)

	if targets.size() == 0:
		var lbl = Label.new()
		lbl.text = "No detected targets available."
		lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
		PanelStyle.apply_muted(lbl)
		targets_section.add_child(lbl)
		return

	for t in targets:
		var entry_panel = PanelContainer.new()
		entry_panel.add_theme_stylebox_override("panel", _target_card_style())
		var entry = HBoxContainer.new()
		entry.custom_minimum_size = Vector2(0, 42)
		entry.add_theme_constant_override("separation", 8)
		entry_panel.add_child(entry)
		var name_lbl = Label.new()
		name_lbl.text = str(t.get("label", t.get("id")))
		name_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		PanelStyle.apply_body(name_lbl)
		name_lbl.add_theme_font_size_override("font_size", 16)
		entry.add_child(name_lbl)
		var btn = Button.new()
		btn.text = "Select"
		btn.focus_mode = Control.FOCUS_NONE
		PanelStyle.apply_button(btn, false)
		btn.custom_minimum_size = Vector2(120, 36)
		# bind id
		btn.pressed.connect(Callable(self, "on_selector_target_pressed").bind(str(t.get("id")), btn))
		entry.add_child(btn)
		targets_section.add_child(entry_panel)

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

func _style_selector_panel(panel: Panel, vbox: VBoxContainer) -> void:
	PanelStyle.apply_panel(panel, Color(0.08, 0.11, 0.15, 0.9))
	panel.custom_minimum_size = Vector2(1120, 720)
	if vbox:
		vbox.add_theme_constant_override("separation", 10)
	var title = panel.get_node_or_null("VBox/Title")
	if title and title is Label:
		PanelStyle.apply_title(title)
		title.text = "Select Your Rocket"
		title.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
		title.add_theme_font_size_override("font_size", 32)
	var back = panel.get_node_or_null("VBox/BackButton")
	if back and back is Button:
		back.custom_minimum_size = Vector2(0, 52)
		back.text = "Back to Base"
		PanelStyle.apply_button(back, false)

func _target_card_style() -> StyleBoxFlat:
	var style = StyleBoxFlat.new()
	style.bg_color = Color(0.15, 0.20, 0.25, 0.55)
	style.border_color = Color(0.35, 0.45, 0.55, 0.55)
	style.border_width_left = 1
	style.border_width_right = 1
	style.border_width_top = 1
	style.border_width_bottom = 1
	style.corner_radius_top_left = 10
	style.corner_radius_top_right = 10
	style.corner_radius_bottom_left = 10
	style.corner_radius_bottom_right = 10
	style.content_margin_left = 8
	style.content_margin_top = 6
	style.content_margin_right = 8
	style.content_margin_bottom = 6
	return style
