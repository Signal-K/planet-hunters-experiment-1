extends RefCounted
class_name LaunchpadSelectorPanel

var _launchpad: Node
const ACTION_SELECT_TARGET := "select_launch_target"
const HINT_SELECT_TARGET := "Pick one target so your rocket knows where to fly."
const HINT_PRESET_TARGET := "Mission target is pre-assigned for this early mission."
const PanelStyle = preload("res://Scripts/UI/PanelStyle.gd")
const MAX_VISIBLE_TARGETS := 3

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
		_set_selector_panel_layout(has_awaiting)
		if not has_awaiting and root_scene:
			var rocket_selector = root_scene.get_node_or_null("UILayer/SelectorPanel/VBox/RocketSelector")
			if rocket_selector:
				rocket_selector.visible = true
				rocket_selector.size_flags_horizontal = Control.SIZE_EXPAND_FILL
				rocket_selector.size_flags_vertical = Control.SIZE_EXPAND_FILL
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
		# Populate selector panel with detected targets
		populate_targets()
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
	var mission_stage = int(rm.get_mission_stage())
	var targets: Array = []
	if mission_stage <= 2:
		var predefined = rm.get_predefined_mission_target(mission_stage)
		if not predefined.is_empty():
			targets = [predefined]
	else:
		targets = rm.get_detected_targets()
	print("Launchpad: _populate_targets -> detected targets count=", targets.size())
	var selected_target = rm.get_selected_target()
	var awaiting_rocket_id = str(rm.get_primary_awaiting_rocket_id())
	var awaiting_rocket_level = int(rm.get_rocket_level(awaiting_rocket_id))
	var has_awaiting_rocket = awaiting_rocket_id != ""
	_set_rocket_selector_visibility(vbox, not has_awaiting_rocket)
	_set_title_for_state(panel, has_awaiting_rocket)
	var auto_selected_target = ""
	if has_awaiting_rocket and selected_target == "":
		if mission_stage == 1 and targets.size() > 0:
			auto_selected_target = str(targets[0].get("id", ""))
		elif mission_stage == 2:
			auto_selected_target = str(targets[0].get("id", "")) if targets.size() > 0 else ""
		if auto_selected_target != "":
			rm.select_target(auto_selected_target)
			selected_target = auto_selected_target
			_show_tutorial_hint_once(ACTION_SELECT_TARGET, HINT_PRESET_TARGET)

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
	if not has_awaiting_rocket:
		var guidance = Label.new()
		guidance.text = "Create a rocket first. Target selection unlocks after a rocket is on the launchpad."
		guidance.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
		PanelStyle.apply_muted(guidance)
		targets_section.add_child(guidance)
		return

	if auto_selected_target != "":
		var guidance = Label.new()
		guidance.text = "Auto-selected target for Mission %d progression." % mission_stage
		guidance.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
		PanelStyle.apply_muted(guidance)
		targets_section.add_child(guidance)

	if targets.size() == 0:
		var lbl = Label.new()
		lbl.text = "No detected targets available."
		lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
		PanelStyle.apply_muted(lbl)
		targets_section.add_child(lbl)
		return

	var visible_targets = _build_visible_targets(targets, selected_target, mission_stage, awaiting_rocket_level, rm)
	for t in visible_targets:
		var target_id = str(t.get("id", ""))
		var target_type = str(t.get("type", "asteroid"))
		var profile = rm.build_target_profile(target_id, target_type)
		var required_level = int(profile.get("required_level", 1))
		var distance_au = float(profile.get("distance_au", 0.0))
		var blocked = awaiting_rocket_level > 0 and required_level > awaiting_rocket_level
		var entry_panel = PanelContainer.new()
		entry_panel.add_theme_stylebox_override("panel", _target_card_style())
		var entry = VBoxContainer.new()
		entry.custom_minimum_size = Vector2(0, 72)
		entry.add_theme_constant_override("separation", 6)
		entry_panel.add_child(entry)
		var header = HBoxContainer.new()
		header.add_theme_constant_override("separation", 8)
		entry.add_child(header)
		var name_lbl = Label.new()
		name_lbl.text = str(t.get("label", target_id))
		name_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		PanelStyle.apply_body(name_lbl)
		name_lbl.add_theme_font_size_override("font_size", 16)
		header.add_child(name_lbl)
		var btn = Button.new()
		btn.text = "Select"
		btn.focus_mode = Control.FOCUS_NONE
		PanelStyle.apply_button(btn, false)
		btn.custom_minimum_size = Vector2(120, 36)
		if selected_target == target_id:
			btn.text = "Target Selected"
			btn.disabled = true
		elif blocked:
			btn.text = "Blocked"
			btn.disabled = true
		# bind id
		btn.pressed.connect(Callable(self, "on_selector_target_pressed").bind(target_id, btn))
		header.add_child(btn)
		var details_lbl = Label.new()
		var details_text = "Distance: %.0f AU • Required: L%d" % [distance_au, required_level]
		if awaiting_rocket_level > 0:
			details_text += " • Current rocket: L%d" % awaiting_rocket_level
		if blocked:
			details_text += " • Too far for current rocket"
		details_lbl.text = details_text
		details_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
		PanelStyle.apply_muted(details_lbl)
		entry.add_child(details_lbl)
		targets_section.add_child(entry_panel)

	var hidden_count = max(targets.size() - visible_targets.size(), 0)
	if hidden_count > 0:
		var hidden_lbl = Label.new()
		hidden_lbl.name = "HiddenTargetsNotice"
		hidden_lbl.text = "%d additional targets hidden for clarity." % hidden_count
		hidden_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
		PanelStyle.apply_muted(hidden_lbl)
		targets_section.add_child(hidden_lbl)

func on_selector_target_pressed(target_id: String, _btn: Button) -> void:
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if not rm:
		return
	var ok = rm.select_target(target_id)
	if ok:
		_show_tutorial_hint_once(ACTION_SELECT_TARGET, HINT_SELECT_TARGET)
		print("Launchpad: target selected from selector:", target_id)
		populate_targets()
	else:
		print("Launchpad: failed to persist target selection from selector", target_id)

func _on_debug_skip_mission_pressed() -> void:
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if not rm:
		return
	var ok = rm.debug_complete_mission_for_progression()
	print("Launchpad: debug skip mission -> ", ok)
	populate_targets()

func _show_tutorial_hint_once(action_key: String, message: String) -> void:
	var tree = _launchpad.get_tree()
	if tree == null:
		return
	var app = tree.root.find_child("AppController", true, false)
	if app and app.has_method("show_tutorial_hint_once"):
		app.show_tutorial_hint_once(action_key, message)

func _style_selector_panel(panel: Panel, vbox: VBoxContainer) -> void:
	PanelStyle.apply_panel(panel, Color(0.08, 0.11, 0.15, 0.9))
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

func _set_selector_panel_layout(has_awaiting: bool) -> void:
	var root_scene = _launchpad.get_tree().current_scene
	if not root_scene:
		return
	var panel = root_scene.get_node_or_null("UILayer/SelectorPanel")
	if panel == null:
		return
	panel.anchor_left = 0.0
	panel.anchor_top = 0.0
	panel.anchor_right = 1.0
	panel.anchor_bottom = 1.0
	panel.offset_left = 16.0
	panel.offset_top = 16.0
	if has_awaiting:
		panel.offset_right = -300.0
		panel.offset_bottom = -120.0
	else:
		panel.offset_right = -16.0
		panel.offset_bottom = -16.0

	var vbox = panel.get_node_or_null("VBox")
	if vbox:
		vbox.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		vbox.size_flags_vertical = Control.SIZE_EXPAND_FILL

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

func _set_rocket_selector_visibility(vbox: VBoxContainer, visible: bool) -> void:
	if vbox == null:
		return
	var rocket_selector = vbox.get_node_or_null("RocketSelector")
	if rocket_selector:
		rocket_selector.visible = visible

func _set_title_for_state(panel: Panel, has_awaiting_rocket: bool) -> void:
	if panel == null:
		return
	var title = panel.get_node_or_null("VBox/Title")
	if title and title is Label:
		title.text = "Select Mission Target" if has_awaiting_rocket else "Select Your Rocket"

func _build_visible_targets(targets: Array, selected_target: String, mission_stage: int, awaiting_rocket_level: int, rm) -> Array:
	if targets.is_empty():
		return []
	var by_id := {}
	for t in targets:
		by_id[str(t.get("id", ""))] = t

	var ordered := []
	var seen := {}
	var preferred_id = selected_target
	if preferred_id == "" and mission_stage == 1:
		preferred_id = str(targets[0].get("id", ""))
	if preferred_id != "" and by_id.has(preferred_id):
		ordered.append(by_id[preferred_id])
		seen[preferred_id] = true
		if mission_stage <= 2:
			return ordered

	for t in targets:
		if ordered.size() >= MAX_VISIBLE_TARGETS:
			break
		var tid = str(t.get("id", ""))
		if tid == "" or seen.has(tid):
			continue
		var profile = rm.build_target_profile(tid, str(t.get("type", "asteroid")))
		var required_level = int(profile.get("required_level", 1))
		if required_level <= awaiting_rocket_level:
			ordered.append(t)
			seen[tid] = true

	for t in targets:
		if ordered.size() >= MAX_VISIBLE_TARGETS:
			break
		var tid = str(t.get("id", ""))
		if tid == "" or seen.has(tid):
			continue
		ordered.append(t)
		seen[tid] = true

	if ordered.is_empty():
		ordered.append(targets[0])
	return ordered
