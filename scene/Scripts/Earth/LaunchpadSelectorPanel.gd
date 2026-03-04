extends RefCounted
class_name LaunchpadSelectorPanel

var _launchpad: Node
const RocketSpecs = preload("res://Scripts/Utils/RocketSpecs.gd")
const PanelStyle = preload("res://Scripts/UI/PanelStyle.gd")
const TargetCardScene = preload("res://Scenes/UI/Templates/LaunchpadTargetCard.tscn")
const HeaderLabelScene = preload("res://Scenes/UI/Templates/MenuUnlockHeader.tscn")
const EmptyLabelScene = preload("res://Scenes/UI/Templates/MenuLogbookEmpty.tscn")
const LabelActionRowScene = preload("res://Scenes/UI/Templates/LabelActionRow.tscn")
const RocketSelectorOverlayScene = preload("res://Scenes/UI/RocketSelectorOverlay.tscn")
const AppLogger = preload("res://Scripts/Utils/Logger.gd")
const GameplayAnalytics = preload("res://Scripts/Systems/GameplayAnalytics.gd")
const MAX_VISIBLE_TARGETS := 3
const MAX_VISIBLE_TARGETS_MISSION3 := 5
const MAX_VISIBLE_TARGETS_MISSION4 := 5
const MAX_VISIBLE_TARGETS_MISSION5 := 5
const MISSION_BRIEFINGS := {
	1: {
		"objective": "Complete your first mining loop (launch, mine, return, debrief).",
		"mechanics": "Single-route starter mission with one predefined target and guided progression prompts.",
		"required_rocket_level": 1,
		"target_type": "Asteroid",
		"reward_ratio": 1.2,
		"unlocks": "Level 2 mission route and Starter Rocket 2"
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
			AppLogger.d("Launchpad: selector panel hidden (all instances), count=%s" % hidden_count)
		else:
			AppLogger.d("Launchpad: selector panel hidden (duplicates only), count=%s" % hidden_count)

func show_selector_panel() -> void:
	# Show the first SelectorPanel found and hide any duplicates to prevent overlap
	var root_scene = _launchpad.get_tree().current_scene
	if not root_scene:
		return
	_ensure_selector_panel_exists(root_scene)
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
		AppLogger.d("Launchpad: selector panel shown (primary instance)")
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
				AppLogger.d("Launchpad: RocketSelector restored and Create buttons enabled (no awaiting rockets)")
		# Populate selector panel with detected targets
		populate_targets()
	else:
		AppLogger.w("Launchpad: no SelectorPanel found to show")

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
		AppLogger.d("Launchpad: UI visibility summary -> UILayer/SelectorPanel=%s, LaunchHUD=%s, LaunchButton=%s" % [s != null and s.visible or false, hud != null and hud.visible or false, lb != null and lb.visible or false])

func populate_targets() -> void:
	AppLogger.d("Launchpad: _populate_targets called")
	var root_scene = _launchpad.get_tree().current_scene
	if not root_scene:
		return
	var panel = _ensure_selector_panel_exists(root_scene)
	if not panel:
		return
	var vbox = panel.get_node_or_null("VBox")
	if not vbox:
		return
	_style_selector_panel(panel, vbox)
	AppLogger.d("Launchpad: found SelectorPanel VBox")
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
		if mission_stage == 1:
			var predefined = rm.get_predefined_mission_target(mission_stage)
			if not predefined.is_empty():
				targets = [predefined]
		else:
			targets = rm.get_mission2_targets()
	elif mission_stage == 3:
		targets = rm.get_mission3_targets()
	elif mission_stage == 4:
		targets = rm.get_mission4_targets()
	elif mission_stage == 5:
		targets = rm.get_mission5_targets()
	else:
		targets = rm.get_detected_targets()
	AppLogger.d("Launchpad: _populate_targets -> detected targets count=%s" % targets.size())
	var selected_target = rm.get_selected_target()
	var awaiting_rocket_id = str(rm.get_primary_awaiting_rocket_id())
	var awaiting_rocket_level = int(rm.get_rocket_level(awaiting_rocket_id))
	var has_awaiting_rocket = awaiting_rocket_id != ""
	_set_selector_panel_layout(has_awaiting_rocket)
	_set_rocket_selector_visibility(vbox, not has_awaiting_rocket)
	_set_title_for_state(panel, has_awaiting_rocket)

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
	targets_title.add_theme_font_size_override("font_size", 24)
	targets_section.add_child(targets_title)
	var mission5_offer := {}
	var mission5_selected_contractor := ""
	var mission5_recommended_target_id := ""
	var starter_offer := {}
	var starter_selected_contractor := ""
	var operation_mode := "contract"
	if mission_stage == 1:
		starter_offer = rm.ensure_starter_contract_offer()
		starter_selected_contractor = str(starter_offer.get("selected_contractor", ""))
		_render_starter_contract_brief(targets_section, starter_offer, starter_selected_contractor)
		if starter_selected_contractor == "":
			var starter_pick_hint: Label = EmptyLabelScene.instantiate()
			starter_pick_hint.text = "Pick a contractor before selecting the mission target."
			starter_pick_hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
			PanelStyle.apply_muted(starter_pick_hint)
			targets_section.add_child(starter_pick_hint)
	if not has_awaiting_rocket:
		var guidance: Label = EmptyLabelScene.instantiate()
		guidance.text = "Create a rocket first. Target selection unlocks after a rocket is on the launchpad."
		guidance.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
		PanelStyle.apply_muted(guidance)
		targets_section.add_child(guidance)
		return
	_render_rocket_customization_controls(targets_section, rm, awaiting_rocket_id)

	if mission_stage == 2 and awaiting_rocket_level < 2:
		var mission2_hint: Label = EmptyLabelScene.instantiate()
		mission2_hint.text = "Mission 2 requires Starter Rocket 2 (L2)."
		mission2_hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
		PanelStyle.apply_muted(mission2_hint)
		targets_section.add_child(mission2_hint)
	if mission_stage == 2:
		var mission2_checklist: Label = EmptyLabelScene.instantiate()
		mission2_checklist.text = _build_stage2_checklist_text()
		mission2_checklist.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
		PanelStyle.apply_muted(mission2_checklist)
		targets_section.add_child(mission2_checklist)
	if mission_stage == 4 and awaiting_rocket_level < 3:
		var mission4_hint: Label = EmptyLabelScene.instantiate()
		mission4_hint.text = "Mission 4 requires Starter Rocket 3 (L3) for planetary range."
		mission4_hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
		PanelStyle.apply_muted(mission4_hint)
		targets_section.add_child(mission4_hint)
	if mission_stage == 5:
		operation_mode = str(rm.get_operation_mode())
		_render_open_operation_mode_picker(targets_section, operation_mode)
		mission5_offer = rm.ensure_mission5_contract_offer(targets)
		mission5_selected_contractor = str(mission5_offer.get("selected_contractor", ""))
		mission5_recommended_target_id = str(mission5_offer.get("recommended_target_id", ""))
		_render_mission5_contract_brief(targets_section, mission5_offer, mission5_selected_contractor)
		if operation_mode == "contract" and mission5_selected_contractor == "":
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
		if mission_stage >= 3:
			lbl.text = "No scanned targets available. Open Scanner Station, run a scan, and select a target."
		else:
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
		var blocked = _is_target_blocked_for_selection(
			mission_stage,
			awaiting_rocket_level,
			required_level,
			operation_mode,
			mission5_selected_contractor,
			starter_selected_contractor
		)
		var entry_panel: PanelContainer = TargetCardScene.instantiate()
		entry_panel.add_theme_stylebox_override("panel", _target_card_style())
		var name_lbl: Label = entry_panel.get_node("Entry/Header/NameLabel")
		var is_recommended_target = mission_stage == 5 and mission5_recommended_target_id != "" and mission5_recommended_target_id == target_id
		name_lbl.text = "%s (Recommended)" % str(t.get("label", target_id)) if is_recommended_target else str(t.get("label", target_id))
		PanelStyle.apply_body(name_lbl)
		var btn: Button = entry_panel.get_node("Entry/Header/SelectButton")
		btn.focus_mode = Control.FOCUS_NONE
		PanelStyle.apply_button(btn, false)
		if selected_target == target_id:
			btn.text = "Target Selected"
			btn.disabled = true
		elif blocked:
			if mission_stage == 1 and starter_selected_contractor == "":
				btn.text = "Sign Contract"
			elif mission_stage == 5 and operation_mode == "contract" and mission5_selected_contractor == "":
				btn.text = "Accept Contractor"
			else:
				btn.text = "Blocked"
			btn.disabled = true
		# bind id
		btn.pressed.connect(Callable(self, "on_selector_target_pressed").bind(target_id, btn))
		var details_lbl: Label = entry_panel.get_node("Entry/DetailsLabel")
		var details_text = "Distance: %.0f AU • Required: L%d" % [distance_au, required_level]
		if awaiting_rocket_level > 0:
			details_text += " • Current rocket: L%d" % awaiting_rocket_level
		if blocked:
			details_text += " • Too far for current rocket"
		elif mission_stage == 5:
			var profile_text = "Survey Route" if operation_mode == "survey" else "Contract Route"
			details_text += " • %s" % profile_text
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


func on_selector_target_pressed(target_id: String, _btn: Button) -> void:
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if not rm:
		return
	var ok = rm.select_target(target_id)
	if ok:
		var target = rm.get_target_details(target_id)
		GameplayAnalytics.emit_target_selected(
			target_id,
			str(target.get("type", "asteroid")),
			"launchpad_selector",
			{
				"target_label": str(target.get("label", target_id))
			}
		)
		preload("res://Scripts/Utils/AppControllerHelper.gd").record_tutorial_action("select_launch_target", {
			"target_id": target_id
		})
		AppLogger.d("Launchpad: target selected from selector: %s" % target_id)
		populate_targets()
	else:
		AppLogger.w("Launchpad: failed to persist target selection from selector %s" % target_id)

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

func _on_starter_contractor_pressed(contractor_id: String) -> void:
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if not rm:
		return
	var ok = rm.select_starter_contractor(contractor_id)
	if ok:
		preload("res://Scripts/Utils/AppControllerHelper.gd").record_tutorial_action("accept_starter_contractor", {
			"contractor_id": contractor_id
		})
		populate_targets()

func _render_starter_contract_brief(targets_section: VBoxContainer, offer: Dictionary, selected_contractor: String) -> void:
	if targets_section == null or offer.is_empty():
		return
	var heading: Label = HeaderLabelScene.instantiate()
	heading.text = "Starter Contractor Mission"
	heading.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	PanelStyle.apply_muted(heading)
	targets_section.add_child(heading)

	var summary_lbl: Label = EmptyLabelScene.instantiate()
	summary_lbl.text = "Sign with one contractor to receive your first mineral order."
	summary_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	PanelStyle.apply_muted(summary_lbl)
	targets_section.add_child(summary_lbl)

	var options: Array = offer.get("contractors", [])
	for entry_any in options:
		if typeof(entry_any) != TYPE_DICTIONARY:
			continue
		var entry: Dictionary = entry_any
		var contractor_id = str(entry.get("id", ""))
		var requested: Dictionary = entry.get("requested_minerals", {})
		var request_parts := []
		for key in requested.keys():
			request_parts.append("%s %s kg" % [str(key), str(requested.get(key, 0))])
		request_parts.sort()
		var row: VBoxContainer = VBoxContainer.new()
		row.add_theme_constant_override("separation", 4)

		var action_row: HBoxContainer = LabelActionRowScene.instantiate()
		action_row.add_theme_constant_override("separation", 8)
		var label: Label = action_row.get_node("TextLabel")
		label.text = "%s — %s" % [str(entry.get("name", contractor_id)), str(entry.get("focus", ""))]
		label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		label.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
		PanelStyle.apply_muted(label)
		var btn: Button = action_row.get_node("ActionButton")
		var is_selected = selected_contractor == contractor_id and contractor_id != ""
		btn.text = "Signed" if is_selected else "Sign"
		btn.disabled = is_selected
		PanelStyle.apply_button(btn, false)
		btn.pressed.connect(Callable(self, "_on_starter_contractor_pressed").bind(contractor_id))
		row.add_child(action_row)

		var order_lbl: Label = EmptyLabelScene.instantiate()
		order_lbl.text = "Order: %s" % ", ".join(request_parts)
		order_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
		PanelStyle.apply_muted(order_lbl)
		row.add_child(order_lbl)
		targets_section.add_child(row)

func _render_mission5_contract_brief(targets_section: VBoxContainer, offer: Dictionary, selected_contractor: String) -> void:
	if targets_section == null or offer.is_empty():
		return
	var heading: Label = HeaderLabelScene.instantiate()
	heading.text = "Mission 5 Contract"
	heading.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	PanelStyle.apply_muted(heading)
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

func _render_open_operation_mode_picker(targets_section: VBoxContainer, mode: String) -> void:
	if targets_section == null:
		return
	var heading: Label = HeaderLabelScene.instantiate()
	heading.text = "Open Operations Route"
	heading.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	PanelStyle.apply_muted(heading)
	targets_section.add_child(heading)

	var summary: Label = EmptyLabelScene.instantiate()
	summary.text = "Current route: %s" % ("Survey (fewer constraints)" if mode == "survey" else "Contract (bonus modifiers)")
	summary.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	PanelStyle.apply_muted(summary)
	targets_section.add_child(summary)

	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 8)
	var survey_btn := Button.new()
	survey_btn.text = "Survey Route"
	survey_btn.disabled = mode == "survey"
	PanelStyle.apply_button(survey_btn, mode == "survey")
	survey_btn.pressed.connect(Callable(self, "_on_open_operation_mode_selected").bind("survey"))
	row.add_child(survey_btn)
	var contract_btn := Button.new()
	contract_btn.text = "Contract Route"
	contract_btn.disabled = mode == "contract"
	PanelStyle.apply_button(contract_btn, mode == "contract")
	contract_btn.pressed.connect(Callable(self, "_on_open_operation_mode_selected").bind("contract"))
	row.add_child(contract_btn)
	targets_section.add_child(row)

func _on_open_operation_mode_selected(mode: String) -> void:
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if not rm:
		return
	var ok = rm.set_operation_mode(mode)
	if ok:
		preload("res://Scripts/Utils/AppControllerHelper.gd").record_tutorial_action("set_operation_mode", {
			"mode": mode
		})
	populate_targets()

func _render_rocket_customization_controls(targets_section: VBoxContainer, rm, rocket_id: String) -> void:
	if targets_section == null or rm == null or rocket_id == "":
		return
	var options = rm.get_rocket_customization_options()
	var flags: Array = options.get("flags", [])
	var logos: Array = options.get("logos", [])
	var customization: Dictionary = rm.get_rocket_customization(rocket_id)

	var heading: Label = HeaderLabelScene.instantiate()
	heading.text = "Rocket Identity"
	heading.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	PanelStyle.apply_muted(heading)
	heading.add_theme_font_size_override("font_size", 24)
	targets_section.add_child(heading)

	var summary: Label = EmptyLabelScene.instantiate()
	summary.text = "Flag: %s • Logo: %s" % [str(customization.get("flag", "Earth Union")), str(customization.get("logo", "Star"))]
	summary.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	PanelStyle.apply_muted(summary)
	targets_section.add_child(summary)

	var flag_row: HBoxContainer = LabelActionRowScene.instantiate()
	var flag_label: Label = flag_row.get_node("TextLabel")
	flag_label.text = "Cycle ship flag (%d options)" % max(flags.size(), 1)
	PanelStyle.apply_muted(flag_label)
	var flag_btn: Button = flag_row.get_node("ActionButton")
	flag_btn.text = "Change Flag"
	PanelStyle.apply_button(flag_btn, false)
	flag_btn.pressed.connect(Callable(self, "_on_cycle_rocket_flag").bind(rocket_id))
	targets_section.add_child(flag_row)

	var logo_row: HBoxContainer = LabelActionRowScene.instantiate()
	var logo_label: Label = logo_row.get_node("TextLabel")
	logo_label.text = "Cycle ship logo (%d options)" % max(logos.size(), 1)
	PanelStyle.apply_muted(logo_label)
	var logo_btn: Button = logo_row.get_node("ActionButton")
	logo_btn.text = "Change Logo"
	PanelStyle.apply_button(logo_btn, false)
	logo_btn.pressed.connect(Callable(self, "_on_cycle_rocket_logo").bind(rocket_id))
	targets_section.add_child(logo_row)

func _on_cycle_rocket_flag(rocket_id: String) -> void:
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if not rm:
		return
	var options = rm.get_rocket_customization_options()
	var flags: Array = options.get("flags", [])
	if flags.is_empty():
		return
	var customization = rm.get_rocket_customization(rocket_id)
	var current = str(customization.get("flag", flags[0]))
	var next = _next_option(flags, current)
	rm.set_rocket_customization(rocket_id, {"flag": next})
	populate_targets()

func _on_cycle_rocket_logo(rocket_id: String) -> void:
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if not rm:
		return
	var options = rm.get_rocket_customization_options()
	var logos: Array = options.get("logos", [])
	if logos.is_empty():
		return
	var customization = rm.get_rocket_customization(rocket_id)
	var current = str(customization.get("logo", logos[0]))
	var next = _next_option(logos, current)
	rm.set_rocket_customization(rocket_id, {"logo": next})
	populate_targets()

func _next_option(options: Array, current: String) -> String:
	if options.is_empty():
		return current
	var index = options.find(current)
	if index == -1:
		return str(options[0])
	return str(options[(index + 1) % options.size()])

func _fmt_francs(value: int) -> String:
	var abs_value = abs(value)
	if abs_value >= 1000000000:
		return "%.1fB" % (float(value) / 1000000000.0)
	if abs_value >= 1000000:
		return "%.1fM" % (float(value) / 1000000.0)
	return str(value)

func _build_stage2_checklist_text() -> String:
	var app = preload("res://Scripts/Utils/AppControllerHelper.gd").get_instance()
	var has_seen := false
	if app and app.has_method("has_seen_guide_action"):
		has_seen = bool(app.has_seen_guide_action("create_rocket"))
	var checks := [
		"[x] Build/drag Starter Rocket 2" if has_seen else "[ ] Build/drag Starter Rocket 2",
		"[ ] Select one mission variant target",
		"[ ] Launch, mine, return, debrief"
	]
	return "Mission 2 Checklist:\n%s" % "\n".join(checks)

func _on_debug_skip_mission_pressed() -> void:
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if not rm:
		return
	var ok = rm.debug_complete_mission_for_progression()
	AppLogger.d("Launchpad: debug skip mission -> %s" % ok)
	populate_targets()

func _on_debug_mining_test_pressed() -> void:
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if not rm:
		return
	var ok = rm.debug_launch_mining_test()
	AppLogger.d("Launchpad: debug mining test -> %s" % ok)
	if ok:
		var tree = _launchpad.get_tree()
		if tree:
			tree.change_scene_to_file("res://Scenes/UI/AsteroidPreview/asteroid_preview.tscn")


func _style_selector_panel(panel: Panel, vbox: VBoxContainer) -> void:
	# Lock before UIConsistencyEnforcer deferred scan can overwrite.
	panel.set_meta("ui_style_locked", true)
	PanelStyle.apply_panel(panel, Color(0.04, 0.06, 0.12, 0.88))
	if vbox:
		vbox.add_theme_constant_override("separation", 12)
	var title = panel.get_node_or_null("VBox/Title")
	if title and title is Label:
		PanelStyle.apply_title(title)
		title.text = "Select Your Rocket"
		title.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
		title.add_theme_font_size_override("font_size", 36)
	var back = panel.get_node_or_null("VBox/BackButton")
	if back and back is Button:
		back.set_meta("ui_style_locked", true)
		back.custom_minimum_size = Vector2(0, 56)
		back.text = "Back to Base"
		PanelStyle.apply_button(back, false)

func _set_selector_panel_layout(has_awaiting: bool) -> void:
	var root_scene = _launchpad.get_tree().current_scene
	if not root_scene:
		return
	var panel = _ensure_selector_panel_exists(root_scene)
	if panel == null:
		return
	if has_awaiting:
		# Narrow sidebar — leaves rocket visible on the right.
		panel.anchor_left = 0.0
		panel.anchor_top = 0.0
		panel.anchor_right = 0.0
		panel.anchor_bottom = 0.0
		panel.offset_left = 16.0
		panel.offset_top = 16.0
		panel.offset_right = 520.0
		panel.offset_bottom = 620.0
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
	style.bg_color    = Color(0.06, 0.10, 0.16, 0.70)
	style.border_color = Color(0.28, 0.88, 0.96, 0.70)   # cyan, partial opacity
	style.set_border_width_all(1)
	style.set_corner_radius_all(4)
	style.content_margin_left   = 14
	style.content_margin_top    = 10
	style.content_margin_right  = 14
	style.content_margin_bottom = 10
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

func _is_target_blocked_for_selection(
	mission_stage: int,
	awaiting_rocket_level: int,
	required_level: int,
	operation_mode: String,
	mission5_selected_contractor: String,
	starter_selected_contractor: String
) -> bool:
	if awaiting_rocket_level > 0 and required_level > awaiting_rocket_level:
		return true
	if mission_stage == 1 and starter_selected_contractor == "":
		return true
	if mission_stage == 5 and operation_mode == "contract" and mission5_selected_contractor == "":
		return true
	return false

func _ensure_selector_panel_exists(root_scene: Node) -> Panel:
	if root_scene == null:
		return null
	var ui_layer = root_scene.get_node_or_null("UILayer")
	if ui_layer == null:
		ui_layer = CanvasLayer.new()
		ui_layer.name = "UILayer"
		root_scene.add_child(ui_layer)

	var existing = root_scene.get_node_or_null("UILayer/SelectorPanel")
	if existing and not (existing is Panel):
		existing.queue_free()
		existing = null

	var panel = existing as Panel
	if panel == null:
		panel = Panel.new()
		panel.name = "SelectorPanel"
		panel.anchor_left = 0.0
		panel.anchor_top = 0.0
		panel.anchor_right = 1.0
		panel.anchor_bottom = 1.0
		panel.offset_left = 16.0
		panel.offset_top = 16.0
		panel.offset_right = -16.0
		panel.offset_bottom = -16.0
		ui_layer.add_child(panel)

		var vbox := VBoxContainer.new()
		vbox.name = "VBox"
		vbox.anchor_left = 0.0
		vbox.anchor_top = 0.0
		vbox.anchor_right = 1.0
		vbox.anchor_bottom = 1.0
		vbox.offset_left = 20.0
		vbox.offset_top = 16.0
		vbox.offset_right = -20.0
		vbox.offset_bottom = -16.0
		vbox.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		vbox.size_flags_vertical = Control.SIZE_EXPAND_FILL
		panel.add_child(vbox)

		var title := Label.new()
		title.name = "Title"
		title.text = "Select Your Rocket"
		title.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
		vbox.add_child(title)

		var back_button := Button.new()
		back_button.name = "BackButton"
		back_button.text = "Back to Base"
		back_button.size_flags_horizontal = Control.SIZE_FILL
		vbox.add_child(back_button)

		if RocketSelectorOverlayScene:
			var rocket_selector = RocketSelectorOverlayScene.instantiate()
			if rocket_selector:
				rocket_selector.name = "RocketSelector"
				if rocket_selector is Control:
					var rocket_control := rocket_selector as Control
					rocket_control.size_flags_horizontal = Control.SIZE_EXPAND_FILL
					rocket_control.size_flags_vertical = Control.SIZE_EXPAND_FILL
				vbox.add_child(rocket_selector)

		var targets_section := VBoxContainer.new()
		targets_section.name = "TargetsSection"
		targets_section.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		targets_section.size_flags_vertical = Control.SIZE_EXPAND_FILL
		vbox.add_child(targets_section)

	_wire_back_button(panel)
	return panel

func _wire_back_button(panel: Panel) -> void:
	if panel == null:
		return
	var back_button = panel.get_node_or_null("VBox/BackButton") as Button
	if back_button == null:
		return
	var cb = Callable(self, "_on_back_to_base_pressed")
	if not back_button.pressed.is_connected(cb):
		back_button.pressed.connect(cb)

func _on_back_to_base_pressed() -> void:
	if _launchpad == null:
		return
	var tree = _launchpad.get_tree()
	if tree == null:
		return
	var scene_manager = tree.get_first_node_in_group("scene_manager")
	if scene_manager and scene_manager.has_method("change_to_scene"):
		scene_manager.change_to_scene("res://Scenes/Earth/earth_base_1.tscn")
	else:
		tree.change_scene_to_file("res://Scenes/Earth/earth_base_1.tscn")
