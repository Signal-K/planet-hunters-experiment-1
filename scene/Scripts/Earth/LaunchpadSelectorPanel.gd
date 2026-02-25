extends RefCounted
class_name LaunchpadSelectorPanel

var _launchpad: Node
const RocketSpecs = preload("res://Scripts/Utils/RocketSpecs.gd")
const PanelStyle = preload("res://Scripts/UI/PanelStyle.gd")
const TargetCardScene = preload("res://Scenes/UI/Templates/LaunchpadTargetCard.tscn")
const HeaderLabelScene = preload("res://Scenes/UI/Templates/MenuUnlockHeader.tscn")
const EmptyLabelScene = preload("res://Scenes/UI/Templates/MenuLogbookEmpty.tscn")
const LabelActionRowScene = preload("res://Scenes/UI/Templates/LabelActionRow.tscn")
const MAX_VISIBLE_TARGETS := 3
const MAX_VISIBLE_TARGETS_MISSION3 := 5
const MAX_VISIBLE_TARGETS_MISSION4 := 5
const MAX_VISIBLE_TARGETS_MISSION5 := 5
const MISSION_BRIEFINGS := {
	1: {
		"objective": "Complete your first launch loop (launch, mine, return, debrief).",
		"mechanics": "Starter mission with predefined target and basic mining flow.",
		"required_rocket_level": 1,
		"target_type": "Asteroid",
		"reward_ratio": 1.2,
		"unlocks": "Mission 2 and Starter Rocket 2"
	},
	2: {
		"objective": "Run the same loop with an upgraded rocket to improve yields.",
		"mechanics": "Upgrade path mission with stronger rocket requirement.",
		"required_rocket_level": 2,
		"target_type": "Asteroid",
		"reward_ratio": 1.3,
		"unlocks": "Mission 3 and Scanner station access"
	},
	3: {
		"objective": "Build scanner station and launch toward a scanned target.",
		"mechanics": "First scanner-driven target selection mission.",
		"required_rocket_level": 2,
		"target_type": "Asteroid (scanned)",
		"reward_ratio": 1.3,
		"unlocks": "Mission 4 and Starter Rocket 3"
	},
	4: {
		"objective": "Switch to planets and complete long-range exploration mission.",
		"mechanics": "Planet target flow with higher mining yield.",
		"required_rocket_level": 3,
		"target_type": "Planet",
		"reward_ratio": 1.4,
		"unlocks": "Mission 5 and contractor flow"
	},
	5: {
		"objective": "Accept a contractor offer and complete a contract mission.",
		"mechanics": "Contractor effects modify discounts/payouts with capped rewards.",
		"required_rocket_level": 1,
		"target_type": "Asteroid (contract target)",
		"reward_ratio": 1.1,
		"unlocks": "Contractor affinity progression"
	}
}

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
	elif mission_stage == 3:
		targets = rm.get_mission3_targets()
	elif mission_stage == 4:
		targets = rm.get_mission4_targets()
	elif mission_stage == 5:
		targets = rm.get_mission5_targets()
	else:
		targets = rm.get_detected_targets()
	print("Launchpad: _populate_targets -> detected targets count=", targets.size())
	var selected_target = rm.get_selected_target()
	var awaiting_rocket_id = str(rm.get_primary_awaiting_rocket_id())
	var awaiting_rocket_level = int(rm.get_rocket_level(awaiting_rocket_id))
	var has_awaiting_rocket = awaiting_rocket_id != ""
	_set_selector_panel_layout(has_awaiting_rocket)
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

	var targets_section = vbox.get_node_or_null("TargetsSection")
	if targets_section == null:
		push_error("Launchpad: TargetsSection node missing from selector panel")
		return
	for c in targets_section.get_children():
		c.queue_free()

	var targets_title: Label = HeaderLabelScene.instantiate()
	targets_title.text = "Mission Target"
	targets_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	PanelStyle.apply_muted(targets_title)
	targets_title.add_theme_font_size_override("font_size", 16)
	targets_section.add_child(targets_title)
	if not has_awaiting_rocket:
		var guidance: Label = EmptyLabelScene.instantiate()
		guidance.text = "Create a rocket first. Target selection unlocks after a rocket is on the launchpad."
		guidance.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
		PanelStyle.apply_muted(guidance)
		targets_section.add_child(guidance)
		return
	if _render_mission_briefing_gate(targets_section, rm, mission_stage):
		return

	if auto_selected_target != "":
		var guidance: Label = EmptyLabelScene.instantiate()
		guidance.text = "Auto-selected target for Mission %d progression." % mission_stage
		guidance.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
		PanelStyle.apply_muted(guidance)
		targets_section.add_child(guidance)
	if mission_stage == 2 and awaiting_rocket_level < 2:
		var mission2_hint: Label = EmptyLabelScene.instantiate()
		mission2_hint.text = "Mission 2 requires Starter Rocket 2 (L2)."
		mission2_hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
		PanelStyle.apply_muted(mission2_hint)
		targets_section.add_child(mission2_hint)
	if mission_stage == 4 and awaiting_rocket_level < 3:
		var mission4_hint: Label = EmptyLabelScene.instantiate()
		mission4_hint.text = "Mission 4 requires Starter Rocket 3 (L3) for planetary range."
		mission4_hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
		PanelStyle.apply_muted(mission4_hint)
		targets_section.add_child(mission4_hint)
	var mission5_offer := {}
	var mission5_selected_contractor := ""
	var mission5_recommended_target_id := ""
	if mission_stage == 5:
		mission5_offer = rm.ensure_mission5_contract_offer(targets)
		mission5_selected_contractor = str(mission5_offer.get("selected_contractor", ""))
		mission5_recommended_target_id = str(mission5_offer.get("recommended_target_id", ""))
		_render_mission5_contract_brief(targets_section, mission5_offer, mission5_selected_contractor)
		if mission5_selected_contractor == "":
			var mission5_pick_hint: Label = EmptyLabelScene.instantiate()
			mission5_pick_hint.text = "Accept one contractor request before selecting a target."
			mission5_pick_hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
			PanelStyle.apply_muted(mission5_pick_hint)
			targets_section.add_child(mission5_pick_hint)
		if awaiting_rocket_id != "":
			var payout_cap = int(mission5_offer.get("payout_cap", rm.get_mission5_payout_cap()))
			var current_cost = RocketSpecs.get_cost(awaiting_rocket_id)
			if current_cost > payout_cap:
				var mission5_cost_warning: Label = EmptyLabelScene.instantiate()
				mission5_cost_warning.text = "Warning: mission payout is capped at %s F. Current rocket costs %s F." % [_fmt_francs(payout_cap), _fmt_francs(current_cost)]
				mission5_cost_warning.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
				PanelStyle.apply_muted(mission5_cost_warning)
				targets_section.add_child(mission5_cost_warning)

	if targets.size() == 0:
		var lbl: Label = EmptyLabelScene.instantiate()
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
		if mission_stage == 5 and mission5_selected_contractor == "":
			blocked = true
		var entry_panel: PanelContainer = TargetCardScene.instantiate()
		entry_panel.add_theme_stylebox_override("panel", _target_card_style())
		var name_lbl: Label = entry_panel.get_node("Entry/Header/NameLabel")
		var is_recommended_target = mission_stage == 5 and mission5_recommended_target_id != "" and mission5_recommended_target_id == target_id
		name_lbl.text = "%s (Recommended)" % str(t.get("label", target_id)) if is_recommended_target else str(t.get("label", target_id))
		PanelStyle.apply_body(name_lbl)
		name_lbl.add_theme_font_size_override("font_size", 16)
		var btn: Button = entry_panel.get_node("Entry/Header/SelectButton")
		btn.focus_mode = Control.FOCUS_NONE
		PanelStyle.apply_button(btn, false)
		if selected_target == target_id:
			btn.text = "Target Selected"
			btn.disabled = true
		elif blocked:
			btn.text = "Accept Contractor" if mission_stage == 5 and mission5_selected_contractor == "" else "Blocked"
			btn.disabled = true
		# bind id
		btn.pressed.connect(Callable(self, "on_selector_target_pressed").bind(target_id, btn))
		var details_lbl: Label = entry_panel.get_node("Entry/DetailsLabel")
		var details_text = "Distance: %.0f AU • Required: L%d" % [distance_au, required_level]
		if awaiting_rocket_level > 0:
			details_text += " • Current rocket: L%d" % awaiting_rocket_level
		if blocked:
			details_text += " • Too far for current rocket"
		details_lbl.text = details_text
		details_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
		PanelStyle.apply_muted(details_lbl)
		targets_section.add_child(entry_panel)

	var hidden_count = max(targets.size() - visible_targets.size(), 0)
	if hidden_count > 0:
		var hidden_lbl: Label = EmptyLabelScene.instantiate()
		hidden_lbl.name = "HiddenTargetsNotice"
		hidden_lbl.text = "%d additional targets hidden for clarity." % hidden_count
		hidden_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
		PanelStyle.apply_muted(hidden_lbl)
		targets_section.add_child(hidden_lbl)

func _render_mission_briefing_gate(targets_section: VBoxContainer, rm, mission_stage: int) -> bool:
	# Mission briefings were creating visual clutter in the launchpad flow.
	# Keep target selection immediately available.
	return false

func on_selector_target_pressed(target_id: String, _btn: Button) -> void:
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if not rm:
		return
	var ok = rm.select_target(target_id)
	if ok:
		preload("res://Scripts/Utils/AppControllerHelper.gd").record_tutorial_action("select_launch_target", {
			"target_id": target_id
		})
		print("Launchpad: target selected from selector:", target_id)
		populate_targets()
	else:
		print("Launchpad: failed to persist target selection from selector", target_id)

func _on_mission5_contractor_pressed(contractor_id: String) -> void:
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if not rm:
		return
	var ok = rm.select_mission5_contractor(contractor_id)
	if ok:
		preload("res://Scripts/Utils/AppControllerHelper.gd").record_tutorial_action("accept_contractor_offer", {
			"contractor_id": contractor_id
		})
		populate_targets()

func _render_mission5_contract_brief(targets_section: VBoxContainer, offer: Dictionary, selected_contractor: String) -> void:
	if targets_section == null or offer.is_empty():
		return
	var heading: Label = HeaderLabelScene.instantiate()
	heading.text = "Mission 5 Contract"
	heading.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	PanelStyle.apply_muted(heading)
	heading.add_theme_font_size_override("font_size", 16)
	targets_section.add_child(heading)

	var requested: Dictionary = offer.get("requested_minerals", {})
	var requested_text := []
	for key in requested.keys():
		requested_text.append("%s: %s kg" % [str(key), str(requested.get(key, 0))])
	var summary_lbl: Label = EmptyLabelScene.instantiate()
	summary_lbl.text = "%s | Suggested target: %s" % [
		", ".join(requested_text),
		str(offer.get("recommended_target_label", offer.get("recommended_target_id", "")))
	]
	summary_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	PanelStyle.apply_muted(summary_lbl)
	targets_section.add_child(summary_lbl)

	var options: Array = offer.get("contractors", [])
	for entry_any in options:
		if typeof(entry_any) != TYPE_DICTIONARY:
			continue
		var entry: Dictionary = entry_any
		var row: HBoxContainer = LabelActionRowScene.instantiate()
		row.add_theme_constant_override("separation", 8)
		var label: Label = row.get_node("TextLabel")
		var contractor_id = str(entry.get("id", ""))
		var effect = str(entry.get("effect", ""))
		var effect_text = "15% ship discount" if effect == "build_discount" else "15% mineral payout bonus"
		label.text = "%s - %s" % [str(entry.get("name", contractor_id)), effect_text]
		label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		label.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
		PanelStyle.apply_muted(label)
		var btn: Button = row.get_node("ActionButton")
		var is_selected = selected_contractor == contractor_id and contractor_id != ""
		btn.text = "Accepted" if is_selected else "Accept"
		btn.disabled = is_selected
		PanelStyle.apply_button(btn, false)
		btn.pressed.connect(Callable(self, "_on_mission5_contractor_pressed").bind(contractor_id))
		targets_section.add_child(row)

	var cap_lbl: Label = EmptyLabelScene.instantiate()
	cap_lbl.text = "Mission payout cap: %s F" % _fmt_francs(int(offer.get("payout_cap", 1400000000)))
	cap_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	PanelStyle.apply_muted(cap_lbl)
	targets_section.add_child(cap_lbl)

func _fmt_francs(value: int) -> String:
	var abs_value = abs(value)
	if abs_value >= 1000000000:
		return "%.1fB" % (float(value) / 1000000000.0)
	if abs_value >= 1000000:
		return "%.1fM" % (float(value) / 1000000.0)
	return str(value)

func _on_debug_skip_mission_pressed() -> void:
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if not rm:
		return
	var ok = rm.debug_complete_mission_for_progression()
	print("Launchpad: debug skip mission -> ", ok)
	populate_targets()

func _on_debug_mining_test_pressed() -> void:
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if not rm:
		return
	var ok = rm.debug_launch_mining_test()
	print("Launchpad: debug mining test -> ", ok)
	if ok:
		var tree = _launchpad.get_tree()
		if tree:
			tree.change_scene_to_file("res://Scenes/UI/AsteroidPreview/asteroid_preview.tscn")


func _style_selector_panel(panel: Panel, vbox: VBoxContainer) -> void:
	PanelStyle.apply_panel(panel, Color(0.08, 0.11, 0.15, 0.9))
	if vbox:
		vbox.add_theme_constant_override("separation", 8)
	var title = panel.get_node_or_null("VBox/Title")
	if title and title is Label:
		PanelStyle.apply_title(title)
		title.text = "Select Your Rocket"
		title.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
		title.add_theme_font_size_override("font_size", 24)
	var back = panel.get_node_or_null("VBox/BackButton")
	if back and back is Button:
		back.custom_minimum_size = Vector2(0, 44)
		back.text = "Back to Base"
		PanelStyle.apply_button(back, false)

func _set_selector_panel_layout(has_awaiting: bool) -> void:
	var root_scene = _launchpad.get_tree().current_scene
	if not root_scene:
		return
	var panel = root_scene.get_node_or_null("UILayer/SelectorPanel")
	if panel == null:
		return
	if has_awaiting:
		# Compact target-selection mode after rocket exists.
		panel.anchor_left = 0.0
		panel.anchor_top = 0.0
		panel.anchor_right = 0.0
		panel.anchor_bottom = 0.0
		panel.offset_left = 16.0
		panel.offset_top = 16.0
		panel.offset_right = 780.0
		panel.offset_bottom = 700.0
	else:
		# Full-width creation mode before rocket exists.
		panel.anchor_left = 0.0
		panel.anchor_top = 0.0
		panel.anchor_right = 1.0
		panel.anchor_bottom = 1.0
		panel.offset_left = 16.0
		panel.offset_top = 16.0
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
		if ordered.size() >= _target_visibility_limit_for_stage(mission_stage):
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
		if ordered.size() >= _target_visibility_limit_for_stage(mission_stage):
			break
		var tid = str(t.get("id", ""))
		if tid == "" or seen.has(tid):
			continue
		ordered.append(t)
		seen[tid] = true

	if ordered.is_empty():
		ordered.append(targets[0])
	return ordered

func _target_visibility_limit_for_stage(mission_stage: int) -> int:
	if mission_stage == 3:
		return MAX_VISIBLE_TARGETS_MISSION3
	if mission_stage == 4:
		return MAX_VISIBLE_TARGETS_MISSION4
	if mission_stage == 5:
		return MAX_VISIBLE_TARGETS_MISSION5
	return MAX_VISIBLE_TARGETS
