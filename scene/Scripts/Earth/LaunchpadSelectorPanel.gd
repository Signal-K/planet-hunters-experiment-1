extends RefCounted
class_name LaunchpadSelectorPanel

signal selected_target(target_id)
signal target_confirmed(target_id)

var _launchpad: Node
var _pending_target_id := ""
var _map_overlay_open := false
const RocketSpecs = preload("res://Scripts/Utils/RocketSpecs.gd")
const PanelStyle = preload("res://Scripts/UI/PanelStyle.gd")
const TargetCardScene = preload("res://Scenes/UI/Templates/LaunchpadTargetCard.tscn")
const HeaderLabelScene = preload("res://Scenes/UI/Templates/MenuUnlockHeader.tscn")
const EmptyLabelScene = preload("res://Scenes/UI/Templates/MenuLogbookEmpty.tscn")
const LabelActionRowScene = preload("res://Scenes/UI/Templates/LabelActionRow.tscn")
const LaunchpadContractorCardScene = preload("res://Scenes/UI/Templates/LaunchpadContractorCard.tscn")
const LaunchpadTargetInfoCardScene = preload("res://Scenes/UI/Templates/LaunchpadTargetInfoCard.tscn")
const LaunchpadMissionBriefingCardScene = preload("res://Scenes/UI/Templates/LaunchpadMissionBriefingCard.tscn")
const RocketSelectorOverlayScene = preload("res://Scenes/UI/RocketSelectorOverlay.tscn")
const SelectorPanelScene = preload("res://Scenes/UI/LaunchpadSelectorPanel.tscn")
const LaunchpadStarMap = preload("res://Scripts/Earth/LaunchpadStarMap.gd")
const AppLogger = preload("res://Scripts/Utils/Logger.gd")
const GameplayAnalytics = preload("res://Scripts/Systems/GameplayAnalytics.gd")
const RocketsManager = preload("res://Scripts/Utils/RocketsManager.gd")
const AppControllerHelper = preload("res://Scripts/Utils/AppControllerHelper.gd")
const NumberFormat = preload("res://Scripts/Utils/NumberFormat.gd")
const RoomCatalog = preload("res://Scripts/Utils/RoomCatalog.gd")
const TutorialLayoutZone = preload("res://Scripts/UI/TutorialLayoutZone.gd")
const UILayout = preload("res://Scripts/UI/UILayout.gd")
const SubcontractorManager = preload("res://Scripts/Utils/SubcontractorManager.gd")
const MissionNarrativeAPI = preload("res://Scripts/Utils/MissionNarrativeAPI.gd")
const SIDEBAR_WIDTH_MAX := 560.0
const SIDEBAR_WIDTH_MIN := 420.0
const SIDEBAR_VIEWPORT_RATIO := 0.42
const SELECTOR_LAYOUT_VERSION := "launchpad_selector_v5"
const MAX_VISIBLE_TARGETS := 3
const MAX_VISIBLE_TARGETS_MISSION3 := 5
const MAX_VISIBLE_TARGETS_MISSION4 := 5
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
		"reward_ratio": 1.2,
		"unlocks": "Mission 3 and Scanner station access"
	},
	3: {
		"objective": "Visit a confirmed planet target from scanner results.",
		"mechanics": "Pick from a short list of real NASA TESS possible planet targets.",
		"required_rocket_level": 2,
		"target_type": "Possible Planet Target",
		"reward_ratio": 1.3,
		"unlocks": "Mission 4 and Starter Rocket 3"
	},
	4: {
		"objective": "Planetary expansion: mine for your own goals or the open market.",
		"mechanics": "Take your own initiative: explore planets or trade on the open market.",
		"required_rocket_level": 3,
		"target_type": "Planet",
		"reward_ratio": 1.4,
		"unlocks": "Full autonomy: Free Operations mode"
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
		var rm = RocketsManager
		var has_awaiting := false
		if rm:
			var placed = rm.get_placed()
			for p in placed:
				if p.get("status", "") == "awaitingLaunch":
					has_awaiting = true
					break
		_set_selector_panel_layout(has_awaiting)
		if not has_awaiting and root_scene:
			var rocket_selector = _get_rocket_selector(root_scene.get_node_or_null("UILayer/SelectorPanel"))
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
	var contractor_section = panel.get_node_or_null("VBox/Body/LeftColumn/ContractorSection/SectionVBox/Content")
	var rocket_section = panel.get_node_or_null("VBox/Body/RightColumn/RocketSection/SectionVBox/Content")
	var target_section = panel.get_node_or_null("MapOverlay/OverlayVBox/TargetSection/SectionVBox/Content")
	if contractor_section == null or rocket_section == null or target_section == null:
		push_error("Launchpad: dedicated section nodes missing from selector panel")
		return
	_style_selector_panel(panel, vbox)
	AppLogger.d("Launchpad: found SelectorPanel VBox")
	_clear_container(contractor_section)
	_clear_rocket_section_extras(rocket_section)
	_clear_container(target_section)

	var rm = RocketsManager
	if not rm:
		return
	var mission_stage_raw = int(rm.get_mission_stage())
	var mission_stage = _effective_mission_stage_for_ui(mission_stage_raw)
	var free_ops_unlocked = rm.is_free_operations_unlocked()
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
		targets = rm.get_detected_targets() if free_ops_unlocked else rm.get_mission4_targets()
	else:
		targets = rm.get_detected_targets()
	AppLogger.d("Launchpad: _populate_targets -> detected targets count=%s" % targets.size())
	var selected_target = rm.get_selected_target()
	var awaiting_rocket_id = str(rm.get_primary_awaiting_rocket_id())
	var awaiting_rocket_level = int(rm.get_rocket_level(awaiting_rocket_id))
	var has_awaiting_rocket = awaiting_rocket_id != ""
	_set_rocket_selector_visibility(vbox, not has_awaiting_rocket)
	_set_title_for_state(panel, has_awaiting_rocket)

	var operation_mode := str(rm.get_operation_mode())
	var trip_offer := rm.ensure_trip_contract_offer(targets)
	var trip_selected = rm.get_trip_selected_contractor()
	var trip_selected_contractor := str(trip_selected.get("id", ""))
	var trip_recommended_target_id := str(trip_offer.get("recommended_target_id", ""))
	var forced_phase = _tutorial_forced_phase()
	if forced_phase == "contractor" and trip_selected_contractor != "":
		rm.clear_trip_contract_offer()
		rm.clear_selected_target()
		trip_offer = rm.ensure_trip_contract_offer(targets)
		trip_selected = rm.get_trip_selected_contractor()
		trip_selected_contractor = str(trip_selected.get("id", ""))
		trip_recommended_target_id = str(trip_offer.get("recommended_target_id", ""))
	var flow_phase = _selector_flow_phase(trip_selected_contractor, has_awaiting_rocket)
	flow_phase = _resolve_tutorial_flow_phase(flow_phase, trip_selected_contractor, has_awaiting_rocket)
	if flow_phase != "target":
		_map_overlay_open = false
	_set_map_overlay_visible(panel, _map_overlay_open and flow_phase == "target")
	_set_selector_panel_layout(has_awaiting_rocket, flow_phase)
	_set_section_visibility(panel, flow_phase)
	if flow_phase == "contractor" or flow_phase == "rocket":
		_ensure_rocket_selector_ready(panel)
	var show_rocket = not has_awaiting_rocket
	_set_rocket_selector_visibility(vbox, show_rocket)
	_apply_rocket_creation_gate(vbox, trip_selected_contractor != "")
	_update_status_strip(panel, mission_stage, trip_selected, awaiting_rocket_id, selected_target, flow_phase, rm)

	_render_trip_contract_brief(contractor_section, trip_offer, trip_selected_contractor, awaiting_rocket_id)
	if flow_phase == "contractor":
		_boost_label_contrast(contractor_section)
		_render_phase_placeholder(rocket_section, "Pick a contractor first, then drag your purchased rocket onto the pad.")
		_normalize_selector_typography(panel)

	if flow_phase == "rocket":
		_boost_label_contrast(rocket_section)
		_normalize_selector_typography(panel)

	if not _map_overlay_open:
		var tutorial_complete = mission_stage > 3
		if tutorial_complete:
			_render_rocket_customization_controls(target_section, rm, awaiting_rocket_id)
			_render_required_room_guidance(target_section, awaiting_rocket_id)
		_render_target_prep_card(
			target_section,
			mission_stage,
			awaiting_rocket_id,
			awaiting_rocket_level,
			free_ops_unlocked,
			trip_offer,
			rm
		)

	if targets.size() == 0:
		var lbl: Label = EmptyLabelScene.instantiate()
		if mission_stage == 3:
			lbl.text = "No possible planet targets right now. Scan again soon."
		elif mission_stage >= 4:
			lbl.text = "No scanned targets right now. Open Scanner Station and run a scan."
		else:
			lbl.text = "No detected targets available."
		lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
		PanelStyle.apply_muted_on_dark(lbl)
		target_section.add_child(lbl)
		return

	var visible_targets = _build_visible_targets(targets, selected_target, mission_stage, awaiting_rocket_level, rm)
	_render_starmap_target_picker(
		target_section,
		visible_targets,
		selected_target,
		mission_stage,
		awaiting_rocket_id,
		awaiting_rocket_level,
		operation_mode,
		trip_selected_contractor,
		trip_recommended_target_id,
		free_ops_unlocked,
		rm
	)

	var hidden_count = max(targets.size() - visible_targets.size(), 0)
	if hidden_count > 0:
		var hidden_lbl: Label = EmptyLabelScene.instantiate()
		hidden_lbl.name = "HiddenTargetsNotice"
		hidden_lbl.text = "%d additional targets hidden for clarity." % hidden_count
		hidden_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
		PanelStyle.apply_muted_on_dark(hidden_lbl)
		target_section.add_child(hidden_lbl)
	_boost_label_contrast(target_section)
	_normalize_selector_typography(panel)


func on_selector_target_pressed(target_id: String, _btn: Button = null) -> void:
	_pending_target_id = target_id
	selected_target.emit(target_id)
	AppLogger.d("Launchpad: target selected in starmap: %s" % target_id)
	populate_targets()

func _on_confirm_target_pressed() -> void:
	var target_id = _pending_target_id
	if target_id == "":
		return
	var rm = RocketsManager
	if not rm:
		return
	var ok = rm.select_target(target_id)
	if not ok:
		AppLogger.w("Launchpad: failed to persist confirmed target selection %s" % target_id)
		return
	var target = rm.get_target_details(target_id)
	GameplayAnalytics.emit_target_selected(
		target_id,
		str(target.get("type", "asteroid")),
		"launchpad_selector",
		{
			"target_label": str(target.get("label", target_id))
		}
	)
	_record_tutorial_action("select_launch_target", {
		"target_id": target_id
	})
	target_confirmed.emit(target_id)
	_map_overlay_open = false
	AppLogger.d("Launchpad: target confirmed from starmap: %s" % target_id)
	populate_targets()

func _on_trip_contractor_pressed(contractor_id: String) -> void:
	var rm = RocketsManager
	if not rm:
		return
	var ok = rm.select_trip_contractor(contractor_id)
	if ok:
		_record_tutorial_action("accept_contractor_offer", {
			"contractor_id": contractor_id
		})
		populate_targets()

func _on_starter_contractor_pressed(contractor_id: String) -> void:
	var rm = RocketsManager
	if not rm:
		return
	var ok = rm.select_starter_contractor(contractor_id)
	if ok:
		_record_tutorial_action("accept_starter_contractor", {
			"contractor_id": contractor_id
		})
		GameplayAnalytics.emit_event("contractor_signed", {
			"contractor_id": contractor_id,
			"contract_type": "starter",
		})
		populate_targets()

func _render_starter_contract_brief(targets_section: VBoxContainer, offer: Dictionary, selected_contractor: String) -> void:
	if targets_section == null or offer.is_empty():
		return
	var options: Array = offer.get("contractors", [])
	if selected_contractor != "":
		for entry_any in options:
			if typeof(entry_any) != TYPE_DICTIONARY:
				continue
			var selected_entry: Dictionary = entry_any
			if str(selected_entry.get("id", "")) != selected_contractor:
				continue
			var requested_selected: Dictionary = selected_entry.get("requested_minerals", {})
			var selected_parts := []
			for key in requested_selected.keys():
				selected_parts.append("%s %s kg" % [str(key), str(requested_selected.get(key, 0))])
			selected_parts.sort()
			var signed_lbl: Label = EmptyLabelScene.instantiate()
			signed_lbl.text = "Signed: %s" % str(selected_entry.get("name", selected_contractor))
			signed_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
			PanelStyle.apply_muted_on_dark(signed_lbl)
			targets_section.add_child(signed_lbl)
			var order_summary: Label = EmptyLabelScene.instantiate()
			order_summary.text = "Order: %s" % ", ".join(selected_parts)
			order_summary.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
			PanelStyle.apply_muted_on_dark(order_summary)
			targets_section.add_child(order_summary)
			return
		return

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
		row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		row.add_theme_constant_override("separation", 4)

		var action_row: HBoxContainer = LabelActionRowScene.instantiate()
		action_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		action_row.add_theme_constant_override("separation", 8)
		var label: Label = action_row.get_node("TextLabel")
		label.text = str(entry.get("name", contractor_id))
		label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		label.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
		PanelStyle.apply_muted_on_dark(label)
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
		PanelStyle.apply_muted_on_dark(order_lbl)
		row.add_child(order_lbl)
		targets_section.add_child(row)

func _render_trip_contract_brief(targets_section: VBoxContainer, offer: Dictionary, selected_contractor: String, rocket_id: String = "") -> void:
	if targets_section == null or offer.is_empty():
		return
	var recommended_label = str(offer.get("recommended_target_label", offer.get("recommended_target_id", "")))
	if recommended_label != "":
		var target_lbl: Label = EmptyLabelScene.instantiate()
		target_lbl.text = "Suggested target: %s" % recommended_label
		target_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
		target_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		PanelStyle.apply_muted_on_dark(target_lbl)
		targets_section.add_child(target_lbl)

	var options: Array = offer.get("contractors", [])
	for entry_any in options:
		if typeof(entry_any) != TYPE_DICTIONARY:
			continue
		var entry: Dictionary = entry_any
		var contractor_id = str(entry.get("id", ""))
		var is_selected = selected_contractor == contractor_id and contractor_id != ""
		var cooldown_remaining = int(SubcontractorManager.get_cooldown_remaining(contractor_id))
		var on_cooldown = cooldown_remaining > 0

		var card: PanelContainer = LaunchpadContractorCardScene.instantiate()
		card.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		card.set_meta("ui_style_locked", true)
		card.add_theme_stylebox_override("panel", _target_card_style())
		targets_section.add_child(card)
		var card_col: VBoxContainer = card.get_node("Body")
		var name_lbl: Label = card.get_node("Body/MainRow/TextColumn/NameLabel")
		name_lbl.text = str(entry.get("name", contractor_id))
		name_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		name_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
		PanelStyle.apply_body_on_dark(name_lbl)
		if on_cooldown:
			name_lbl.add_theme_color_override("font_color", Color(0.6, 0.6, 0.6, 1.0))

		var contractor_requested: Dictionary = entry.get("requested_minerals", {})
		var order_lbl: Label = card.get_node("Body/MainRow/TextColumn/OrderLabel")
		if not contractor_requested.is_empty():
			order_lbl.text = _compact_order_text(contractor_requested)
			order_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
			order_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
			if on_cooldown:
				order_lbl.add_theme_color_override("font_color", Color(0.5, 0.5, 0.5, 1.0))
			else:
				order_lbl.add_theme_color_override("font_color", Color(1.0, 0.85, 0.3, 1.0))
		else:
			order_lbl.visible = false

		var role_text = str(entry.get("role", ""))
		var role_lbl: Label = card.get_node("Body/MainRow/TextColumn/RoleLabel")
		if role_text != "":
			role_lbl.text = _compact_role_text(role_text)
			role_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
			role_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
			PanelStyle.apply_muted_on_dark(role_lbl)
			if on_cooldown:
				role_lbl.add_theme_color_override("font_color", Color(0.5, 0.5, 0.5, 1.0))
		else:
			role_lbl.visible = false

		var btn: Button = card.get_node("Body/MainRow/ActionButton")
		if is_selected:
			btn.text = "Selected"
		elif on_cooldown:
			btn.text = "Unavailable"
		else:
			btn.text = "Select"
		btn.custom_minimum_size = Vector2(104, 40)
		btn.disabled = is_selected or on_cooldown
		PanelStyle.apply_button(btn, not btn.disabled)
		if btn.disabled:
			_style_selector_action_button(btn, false)
		btn.pressed.connect(Callable(self, "_on_trip_contractor_pressed").bind(contractor_id))

		if on_cooldown:
			var cd_lbl: Label = card.get_node("Body/CooldownLabel")
			cd_lbl.visible = true
			var mins = int(ceil(float(cooldown_remaining) / 60.0))
			cd_lbl.text = "I don't have any missions for you right now. (%d min remaining)" % mins
			cd_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
			cd_lbl.add_theme_color_override("font_color", Color(1.0, 0.55, 0.35, 1.0))
			cd_lbl.add_theme_font_size_override("font_size", 13)

func _render_mission_briefing(targets_section: VBoxContainer, offer: Dictionary, contractor_id: String, target_label: String) -> void:
	var sub_info = SubcontractorManager.get_subcontractor(contractor_id)
	var sub_name := str(sub_info.get("name", contractor_id))
	var sub_role := str(sub_info.get("role", "Resource acquisition"))
	var affinity := int(SubcontractorManager.get_affinity(contractor_id))
	var requested: Dictionary = offer.get("requested_minerals", {})
	# Pick the mineral with the largest quantity as primary
	var primary_mineral := "Iron"
	var primary_qty := 0
	for m in requested.keys():
		var q := int(requested.get(m, 0))
		if q > primary_qty:
			primary_qty = q
			primary_mineral = str(m)

	var params := {
		"contractor_id": contractor_id,
		"contractor_name": sub_name,
		"contractor_role": sub_role,
		"mission_type": "extraction",
		"mineral": primary_mineral,
		"quantity": primary_qty,
		"target_label": target_label,
		"target_type": str(offer.get("recommended_target_type", "asteroid")),
		"narrative_tone": "professional",
		"payout_tier": "standard",
		"affinity_level": affinity,
	}

	# Briefing card container
	var card: PanelContainer = LaunchpadMissionBriefingCardScene.instantiate()
	card.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	card.set_meta("ui_style_locked", true)
	card.add_theme_stylebox_override("panel", _target_card_style())
	targets_section.add_child(card)
	var col: VBoxContainer = card.get_node("Body")
	col.add_theme_constant_override("separation", 6)
	var header_lbl: Label = card.get_node("Body/HeaderLabel")
	PanelStyle.apply_muted_on_dark(header_lbl)
	header_lbl.add_theme_color_override("font_color", Color(0.55, 0.86, 0.98, 0.98))
	header_lbl.add_theme_font_size_override("font_size", 11)

	# Narrative labels — created first with placeholder text, updated by callback
	var title_lbl: Label = card.get_node("Body/TitleLabel")
	PanelStyle.apply_body_on_dark(title_lbl)
	title_lbl.add_theme_font_size_override("font_size", 16)
	title_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART

	var desc_lbl: Label = card.get_node("Body/DescriptionLabel")
	PanelStyle.apply_muted_on_dark(desc_lbl)
	desc_lbl.add_theme_font_size_override("font_size", 13)
	desc_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART

	var quote_lbl: Label = card.get_node("Body/QuoteLabel")
	quote_lbl.add_theme_color_override("font_color", Color(0.66, 0.94, 0.78, 1.0))
	quote_lbl.add_theme_font_size_override("font_size", 12)
	quote_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART

	MissionNarrativeAPI.generate(params, func(narrative: Dictionary) -> void:
		if not is_instance_valid(title_lbl):
			return
		title_lbl.text = str(narrative.get("title", ""))
		desc_lbl.text = str(narrative.get("description", ""))
		var q := str(narrative.get("contractor_quote", ""))
		if q != "":
			quote_lbl.text = '"%s"  \u2014 %s' % [q, sub_name]
		else:
			quote_lbl.text = ""
	)

func _compact_order_text(requested: Dictionary) -> String:
	var order_parts := []
	for mineral in requested.keys():
		order_parts.append("%dkg %s" % [int(requested.get(mineral, 0)), _mineral_short_name(str(mineral))])
	order_parts.sort()
	return "Order: %s" % ", ".join(order_parts)

func _compact_role_text(role_text: String) -> String:
	var compact = role_text.strip_edges()
	compact = compact.replace(" — ", " / ")
	return compact

func _mineral_short_name(mineral: String) -> String:
	match mineral.to_lower():
		"nickel":
			return "Ni"
		"iron":
			return "Fe"
		"cobalt":
			return "Co"
		"silicates":
			return "Si"
		_:
			return mineral

func _apply_rocket_creation_gate(vbox: Control, contractor_selected: bool) -> void:
	if vbox == null:
		return
	var rocket_selector = _get_rocket_selector(vbox.get_parent())
	if rocket_selector == null:
		return
	if rocket_selector.has_method("set_contractor_gate_enabled"):
		rocket_selector.set_contractor_gate_enabled(contractor_selected, "Select a contractor first, then build a rocket.")

func _render_open_operation_mode_picker(targets_section: VBoxContainer, mode: String) -> void:
	if targets_section == null:
		return
	var heading: Label = HeaderLabelScene.instantiate()
	heading.text = "Route"
	heading.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	PanelStyle.apply_muted_on_dark(heading)
	targets_section.add_child(heading)

	var row: HBoxContainer = LabelActionRowScene.instantiate()
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_theme_constant_override("separation", 8)
	var survey_btn: Button = row.get_node("ActionButton")
	survey_btn.text = "Survey Route"
	survey_btn.disabled = mode == "survey"
	PanelStyle.apply_button(survey_btn, mode == "survey")
	survey_btn.pressed.connect(Callable(self, "_on_open_operation_mode_selected").bind("survey"))
	var left_label: Label = row.get_node("TextLabel")
	left_label.text = "Choose run type"
	left_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	PanelStyle.apply_muted_on_dark(left_label)
	var contract_btn := Button.new()
	contract_btn.text = "Contract Route"
	contract_btn.disabled = mode == "contract"
	PanelStyle.apply_button(contract_btn, mode == "contract")
	contract_btn.pressed.connect(Callable(self, "_on_open_operation_mode_selected").bind("contract"))
	row.add_child(contract_btn)
	targets_section.add_child(row)

func _on_open_operation_mode_selected(mode: String) -> void:
	var rm = RocketsManager
	if not rm:
		return
	var ok = rm.set_operation_mode(mode)
	if ok:
		_record_tutorial_action("set_operation_mode", {
			"mode": mode
		})
	populate_targets()

func _record_tutorial_action(action_key: String, metadata: Dictionary = {}) -> void:
	var app = AppControllerHelper.get_instance()
	if app and app.has_method("record_tutorial_action"):
		app.record_tutorial_action(action_key, metadata)
		return
	if _launchpad == null:
		return
	var tree = _launchpad.get_tree()
	if tree == null or tree.root == null:
		return
	var tutorial_controller = tree.root.get_node_or_null("TutorialController")
	if tutorial_controller and tutorial_controller.has_method("record_action"):
		tutorial_controller.record_action(action_key, metadata)

func _effective_mission_stage_for_ui(raw_stage: int) -> int:
	var stage = max(raw_stage, 1)
	var app = AppControllerHelper.get_instance()
	if app and app.has_method("get_tutorial_state"):
		var state = app.get_tutorial_state()
		if typeof(state) == TYPE_DICTIONARY and not bool(state.get("skipped", false)):
			var tutorial_stage = int(state.get("current_stage", stage))
			if tutorial_stage == 1:
				return 1
	return stage

func _render_rocket_customization_controls(targets_section: VBoxContainer, rm, rocket_id: String) -> void:
	if targets_section == null or rm == null or rocket_id == "":
		return
	var customization: Dictionary = rm.get_rocket_customization(rocket_id)
	var summary: Label = EmptyLabelScene.instantiate()
	summary.text = "Ship style: %s / %s" % [
		str(customization.get("flag", "Earth Union")),
		str(customization.get("logo", "Star"))
	]
	summary.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	PanelStyle.apply_muted_on_dark(summary)
	targets_section.add_child(summary)
	var wear_points = int(rm.get_rocket_wear(rocket_id))
	var wear_tier = int(rm.get_rocket_wear_tier(rocket_id))
	var wear_label: Label = EmptyLabelScene.instantiate()
	wear_label.text = "Wear: Tier %d (%d points)" % [wear_tier, wear_points]
	wear_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	PanelStyle.apply_muted_on_dark(wear_label)
	targets_section.add_child(wear_label)

	var controls := HBoxContainer.new()
	controls.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	controls.add_theme_constant_override("separation", 8)
	var flag_btn := Button.new()
	flag_btn.text = "Flag"
	PanelStyle.apply_button(flag_btn, false)
	_style_selector_action_button(flag_btn, true)
	flag_btn.pressed.connect(Callable(self, "_on_cycle_rocket_flag").bind(rocket_id))
	controls.add_child(flag_btn)
	var logo_btn := Button.new()
	logo_btn.text = "Logo"
	PanelStyle.apply_button(logo_btn, false)
	_style_selector_action_button(logo_btn, true)
	logo_btn.pressed.connect(Callable(self, "_on_cycle_rocket_logo").bind(rocket_id))
	controls.add_child(logo_btn)
	targets_section.add_child(controls)

func _on_cycle_rocket_flag(rocket_id: String) -> void:
	var rm = RocketsManager
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
	var rm = RocketsManager
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
	return NumberFormat.compact(value)

func _build_stage2_checklist_text() -> String:
	var app = AppControllerHelper.get_instance()
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
	var rm = RocketsManager
	if not rm:
		return
	var ok = rm.debug_complete_mission_for_progression()
	AppLogger.d("Launchpad: debug skip mission -> %s" % ok)
	populate_targets()

func _on_debug_mining_test_pressed() -> void:
	var rm = RocketsManager
	if not rm:
		return
	var ok = rm.debug_launch_mining_test()
	AppLogger.d("Launchpad: debug mining test -> %s" % ok)
	if ok:
		var tree = _launchpad.get_tree()
		if tree:
			tree.change_scene_to_file("res://Scenes/UI/AsteroidPreview/asteroid_preview.tscn")

func _on_open_mining_practice_pressed() -> void:
	var opened = AppControllerHelper.open_mining_practice_panel("launchpad_selector")
	AppLogger.d("Launchpad: open mining practice shortcut -> %s" % opened)
	if opened:
		hide_selector_panel(true)

func _is_linear_tutorial_active() -> bool:
	var app = AppControllerHelper.get_instance()
	if app == null or not app.has_method("get_tutorial_state"):
		return false
	var state = app.get_tutorial_state()
	if typeof(state) != TYPE_DICTIONARY:
		return false
	if bool(state.get("skipped", false)):
		return false
	var step = state.get("current_step", {})
	return typeof(step) == TYPE_DICTIONARY and not (step as Dictionary).is_empty()

func _render_mining_practice_shortcut(targets_section: VBoxContainer) -> void:
	if targets_section == null:
		return
	var row := HBoxContainer.new()
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_theme_constant_override("separation", 8)
	var btn := Button.new()
	btn.text = "Open Mining Academy"
	PanelStyle.apply_button(btn, false)
	btn.pressed.connect(Callable(self, "_on_open_mining_practice_pressed"))
	row.add_child(btn)
	targets_section.add_child(row)
	var helper: Label = EmptyLabelScene.instantiate()
	helper.text = "Practice side-scrolling mining directly without mission progression."
	helper.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	PanelStyle.apply_muted_on_dark(helper)
	targets_section.add_child(helper)

func _render_required_room_guidance(targets_section: VBoxContainer, rocket_id: String) -> void:
	if targets_section == null or rocket_id == "":
		return
	var layout = RoomCatalog.create_layout_for_rocket_type(rocket_id)
	var installed = RoomCatalog.get_installed_rooms(layout)
	var installed_categories := {}
	for room_any in installed:
		if typeof(room_any) != TYPE_DICTIONARY:
			continue
		var room_def = RoomCatalog.get_room(str(room_any.get("room_id", "")))
		var category = str(room_def.get("category", ""))
		if category != "":
			installed_categories[category] = true

	var required_categories = ["mining", "storage"]
	var heading: Label = HeaderLabelScene.instantiate()
	heading.text = "Required Rooms"
	heading.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	PanelStyle.apply_muted_on_dark(heading)
	targets_section.add_child(heading)

	var lines := []
	var missing := false
	for category in required_categories:
		var has_category = installed_categories.has(category)
		var marker = "✓" if has_category else "!"
		lines.append("%s %s" % [marker, category.capitalize()])
		if not has_category:
			missing = true
	var body: Label = EmptyLabelScene.instantiate()
	body.text = "\n".join(lines)
	body.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	PanelStyle.apply_muted_on_dark(body)
	targets_section.add_child(body)
	if missing:
		var warn: Label = EmptyLabelScene.instantiate()
		warn.text = "Warning: missing room categories reduce mission effectiveness (launch remains allowed)."
		warn.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
		PanelStyle.apply_muted_on_dark(warn)
		targets_section.add_child(warn)

func _render_target_prep_card(
	targets_section: VBoxContainer,
	mission_stage: int,
	awaiting_rocket_id: String,
	awaiting_rocket_level: int,
	free_ops_unlocked: bool,
	trip_offer: Dictionary,
	rm
) -> void:
	if targets_section == null:
		return
	var prep_items = _build_target_prep_items(
		mission_stage,
		awaiting_rocket_id,
		awaiting_rocket_level,
		free_ops_unlocked,
		trip_offer,
		rm
	)
	if prep_items.is_empty():
		return
	var card := PanelContainer.new()
	card.name = "TargetPrepCard"
	card.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	card.set_meta("ui_style_locked", true)
	card.add_theme_stylebox_override("panel", _target_card_style())
	targets_section.add_child(card)

	var body := VBoxContainer.new()
	body.name = "Body"
	body.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	body.add_theme_constant_override("separation", 6)
	card.add_child(body)

	var title := Label.new()
	title.name = "Title"
	title.text = "Route Prep"
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	PanelStyle.apply_body_on_dark(title)
	title.add_theme_color_override("font_color", Color(0.90, 0.96, 1.0, 1.0))
	title.add_theme_font_size_override("font_size", 16)
	body.add_child(title)

	for item_any in prep_items:
		if typeof(item_any) != TYPE_DICTIONARY:
			continue
		var item: Dictionary = item_any
		var line := Label.new()
		line.text = str(item.get("text", ""))
		line.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
		line.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		line.add_theme_font_size_override("font_size", 13)
		var tone = str(item.get("tone", "muted"))
		match tone:
			"warning":
				line.add_theme_color_override("font_color", Color(1.0, 0.74, 0.44, 1.0))
			"positive":
				line.add_theme_color_override("font_color", Color(0.62, 0.98, 0.76, 1.0))
			"accent":
				line.add_theme_color_override("font_color", Color(0.78, 0.90, 1.0, 0.98))
			_:
				PanelStyle.apply_muted_on_dark(line)
		body.add_child(line)

func _build_target_prep_items(
	mission_stage: int,
	awaiting_rocket_id: String,
	awaiting_rocket_level: int,
	free_ops_unlocked: bool,
	trip_offer: Dictionary,
	rm
) -> Array:
	var items: Array = []
	if mission_stage == 2 and awaiting_rocket_level < 2:
		items.append({
			"tone": "warning",
			"text": "Mission 2 needs Starter Rocket 2 on the pad before you can lock a route."
		})
	if mission_stage == 2:
		items.append({
			"tone": "muted",
			"text": _build_stage2_checklist_text().replace("\n", "  •  ")
		})
	if mission_stage == 4 and awaiting_rocket_level < 3:
		items.append({
			"tone": "warning",
			"text": "Mission 4 targets need Starter Rocket 3 for planetary range."
		})
	if free_ops_unlocked:
		items.append({
			"tone": "accent",
			"text": "Free Operations is live: choose a route, lock a contractor, then confirm any scanned target."
		})
		var app_for_lvl = AppControllerHelper.get_instance()
		var player_lvl := 1
		if app_for_lvl and app_for_lvl.has_method("get_experience_level"):
			player_lvl = int(app_for_lvl.get_experience_level())
		if player_lvl >= 5:
			var ConstMgr = preload("res://Scripts/Utils/ConstructionManager.gd")
			if not ConstMgr.is_project_completed("relay_1"):
				items.append({
					"tone": "positive",
					"text": "First Settlement: mine Iron (500 kg) and Nickel (200 kg), then contribute them from Construction after the run."
				})
	if awaiting_rocket_id != "":
		var payout_cap = int(trip_offer.get("payout_cap", rm.get_free_ops_payout_cap()))
		var current_cost = RocketSpecs.get_cost(awaiting_rocket_id)
		if current_cost > payout_cap:
			items.append({
				"tone": "warning",
				"text": "Mission payout caps at %s F, but this ship costs %s F." % [_fmt_francs(payout_cap), _fmt_francs(current_cost)]
			})
	return items

func _style_selector_panel(panel: Panel, vbox: Control) -> void:
	# Lock before UIConsistencyEnforcer deferred scan can overwrite.
	panel.set_meta("ui_style_locked", true)
	var shell := StyleBoxFlat.new()
	shell.bg_color = Color(0, 0, 0, 0)
	shell.border_color = Color(0, 0, 0, 0)
	shell.set_border_width_all(0)
	shell.set_corner_radius_all(0)
	panel.add_theme_stylebox_override("panel", shell)
	if vbox:
		vbox.set_meta("ui_style_locked", true)
	_apply_selector_surface_styles(panel)
	_ensure_selector_template_defaults(panel)
	var title = panel.get_node_or_null("VBox/HeaderBar/HeaderCopy/Title")
	if title and title is Label:
		PanelStyle.apply_title_on_dark(title)
		title.text = "Launchpad Mission Setup"
		title.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
		title.add_theme_font_size_override("font_size", 28)
	var eyebrow = panel.get_node_or_null("VBox/HeaderBar/HeaderCopy/Eyebrow")
	if eyebrow and eyebrow is Label:
		eyebrow.add_theme_color_override("font_color", Color(PanelStyle.ACCENT.r, PanelStyle.ACCENT.g, PanelStyle.ACCENT.b, 0.94))
		eyebrow.add_theme_font_size_override("font_size", 12)
	var subtitle = panel.get_node_or_null("VBox/HeaderBar/HeaderCopy/Subtitle")
	if subtitle and subtitle is Label:
		PanelStyle.apply_muted_on_dark(subtitle)
		subtitle.text = "Use the side rails for contractor, rocket, and route setup. Keep the pad clear for staging."
		subtitle.add_theme_font_size_override("font_size", 13)
	var back = panel.get_node_or_null("VBox/HeaderBar/BackButton")
	if back and back is Button:
		back.set_meta("ui_style_locked", true)
		back.custom_minimum_size = Vector2(170, 46)
		back.text = "Back to Base"
		_style_selector_action_button(back, false)

func _apply_selector_surface_styles(panel: Panel) -> void:
	if panel == null:
		return
	for path in [
		"VBox/Body/LeftColumn/ContractorSection",
		"VBox/Body/RightColumn/RocketSection",
		"VBox/BottomDock",
		"MapOverlay/OverlayVBox/TargetSection",
	]:
		var node = panel.get_node_or_null(path) as Control
		if node:
			node.set_meta("ui_style_locked", true)
			node.add_theme_stylebox_override("panel", PanelStyle.create_glass_panel_style(Color(0.05, 0.09, 0.14, 0.94), 0.44, 18, 18, 16))

	var overlay = panel.get_node_or_null("MapOverlay") as PanelContainer
	if overlay:
		overlay.add_theme_stylebox_override("panel", PanelStyle.create_glass_panel_style(Color(0.03, 0.06, 0.10, 0.96), 0.58, 20, 24, 20))

	for path in [
		"VBox/BottomDock/DockVBox/StatusRow/RoutePill",
		"VBox/BottomDock/DockVBox/StatusRow/ContractorPill",
		"VBox/BottomDock/DockVBox/StatusRow/RocketPill",
		"VBox/BottomDock/DockVBox/ActionRow/TargetPill",
	]:
		var pill = panel.get_node_or_null(path) as PanelContainer
		if pill:
			pill.add_theme_stylebox_override("panel", PanelStyle.create_glass_pill_style())

	for path in [
		"VBox/BottomDock/DockVBox/ActionRow/OpenMapButton",
		"MapOverlay/OverlayVBox/Toolbar/MapBackButton",
	]:
		var btn = panel.get_node_or_null(path) as Button
		if btn:
			_style_selector_action_button(btn, false)

	var launch_message = panel.get_node_or_null("VBox/BottomDock/DockVBox/LaunchMessage") as Label
	if launch_message:
		launch_message.add_theme_color_override("font_color", PanelStyle.MUTED_ON_DARK)
		launch_message.add_theme_font_size_override("font_size", 14)

func _ensure_selector_template_defaults(panel: Panel) -> void:
	if panel == null:
		return
	for path in [
		"VBox/Body/LeftColumn/ContractorSection/SectionVBox/Header/Title",
		"VBox/Body/RightColumn/RocketSection/SectionVBox/Header/Title",
		"VBox/BottomDock/DockVBox/Header/Title",
		"MapOverlay/OverlayVBox/TargetSection/SectionVBox/Header/Title",
	]:
		var label = panel.get_node_or_null(path) as Label
		if label:
			PanelStyle.apply_title_on_dark(label)
	for path in [
		"VBox/Body/LeftColumn/ContractorSection/SectionVBox/Blurb",
		"VBox/Body/RightColumn/RocketSection/SectionVBox/Blurb",
		"VBox/BottomDock/DockVBox/LaunchMessage",
		"MapOverlay/OverlayVBox/Toolbar/MapHint",
		"MapOverlay/OverlayVBox/TargetSection/SectionVBox/Blurb",
	]:
		var label = panel.get_node_or_null(path) as Label
		if label:
			PanelStyle.apply_muted_on_dark(label)
	for path in [
		"VBox/BottomDock/DockVBox/StatusRow/RoutePill/Label",
		"VBox/BottomDock/DockVBox/StatusRow/ContractorPill/Label",
		"VBox/BottomDock/DockVBox/StatusRow/RocketPill/Label",
		"VBox/BottomDock/DockVBox/ActionRow/TargetPill/Label",
		"MapOverlay/OverlayVBox/Toolbar/MapTitle",
	]:
		var label = panel.get_node_or_null(path) as Label
		if label:
			PanelStyle.apply_body_on_dark(label)

func _set_selector_panel_layout(_has_awaiting: bool, flow_phase: String = "") -> void:
	var root_scene = _launchpad.get_tree().current_scene
	if not root_scene:
		return
	var panel = _ensure_selector_panel_exists(root_scene)
	if panel == null:
		return
	var viewport_size = _launchpad.get_viewport().get_visible_rect().size
	var content_rect = _launchpad.get_viewport().get_visible_rect()
	# Keep the stage nearly full-width so the right dock can sit on the screen edge
	# while the launchpad remains clear in the center lane.
	var width_ratio := 0.992
	var width_min := 1320.0
	var width_max := 1880.0
	var panel_width = clamp(viewport_size.x * width_ratio, width_min, width_max)
	panel_width = min(panel_width, max(420.0, content_rect.size.x - 8.0))
	var widget_zone := UILayout.zone(UILayout.Zone.EARTH_WIDGET, viewport_size)
	var panel_top = max(content_rect.position.y + 8.0, widget_zone.end.y + 18.0)
	var panel_height = clamp(content_rect.size.y - (panel_top - content_rect.position.y) - 28.0, 620.0, 940.0)
	var panel_left = content_rect.position.x + 4.0
	panel.anchor_left = 0.0
	panel.anchor_top = 0.0
	panel.anchor_right = 0.0
	panel.anchor_bottom = 0.0
	panel.offset_left = panel_left
	panel.offset_top = panel_top
	panel.offset_right = panel_left + panel_width
	panel.offset_bottom = panel_top + panel_height
	panel.clip_contents = true

	var vbox = panel.get_node_or_null("VBox") as Control
	if vbox:
		vbox.anchor_left = 0.0
		vbox.anchor_top = 0.0
		vbox.anchor_right = 1.0
		vbox.anchor_bottom = 1.0
		vbox.offset_left = 0.0
		vbox.offset_top = 0.0
		vbox.offset_right = 0.0
		vbox.offset_bottom = 0.0
	var body = panel.get_node_or_null("VBox/Body") as Control
	var left_column = panel.get_node_or_null("VBox/Body/LeftColumn") as VBoxContainer
	var left_section = panel.get_node_or_null("VBox/Body/LeftColumn/ContractorSection") as Control
	var center_spacer = panel.get_node_or_null("VBox/Body/CenterSpacer") as Control
	var right_column = panel.get_node_or_null("VBox/Body/RightColumn") as VBoxContainer
	var right_section = panel.get_node_or_null("VBox/Body/RightColumn/RocketSection") as Control
	var bottom_dock = panel.get_node_or_null("VBox/BottomDock") as Control
	var header_bar = panel.get_node_or_null("VBox/HeaderBar") as Control
	var step_rail = panel.get_node_or_null("VBox/StepRail") as Control
	var left_width = clamp(panel_width * 0.245, 360.0, 440.0)
	var right_width = clamp(panel_width * 0.145, 240.0, 290.0)
	var header_width: float = clampf(left_width + 160.0, 520.0, 620.0)
	var rail_width: float = clampf(left_width + 130.0, 500.0, 600.0)
	var header_height: float = 56.0
	var rail_top: float = 74.0
	var rail_height: float = 30.0
	var body_top: float = rail_top + rail_height + 16.0
	var bottom_height: float = 164.0
	var body_height: float = max(panel_height - body_top - bottom_height - 24.0, 380.0)
	var left_margin: float = 18.0
	var right_margin: float = 12.0
	var center_left: float = left_margin + left_width + 34.0
	var center_right: float = panel_width - right_margin - right_width - 34.0
	var center_gap: float = max(center_right - center_left, 520.0)
	if header_bar:
		header_bar.anchor_left = 0.0
		header_bar.anchor_top = 0.0
		header_bar.anchor_right = 0.0
		header_bar.anchor_bottom = 0.0
		header_bar.offset_left = left_margin
		header_bar.offset_top = 8.0
		header_bar.offset_right = left_margin + header_width
		header_bar.offset_bottom = 8.0 + header_height
		header_bar.custom_minimum_size = Vector2(header_width, header_height)
	if step_rail:
		step_rail.anchor_left = 0.0
		step_rail.anchor_top = 0.0
		step_rail.anchor_right = 0.0
		step_rail.anchor_bottom = 0.0
		step_rail.offset_left = left_margin
		step_rail.offset_top = rail_top
		step_rail.offset_right = left_margin + rail_width
		step_rail.offset_bottom = rail_top + rail_height
		step_rail.custom_minimum_size = Vector2(rail_width, rail_height)
	if body:
		body.anchor_left = 0.0
		body.anchor_top = 0.0
		body.anchor_right = 1.0
		body.anchor_bottom = 0.0
		body.offset_left = 0.0
		body.offset_top = body_top
		body.offset_right = 0.0
		body.offset_bottom = body_top + body_height
	if left_column:
		left_column.anchor_left = 0.0
		left_column.anchor_top = 0.0
		left_column.anchor_right = 0.0
		left_column.anchor_bottom = 0.0
		left_column.offset_left = left_margin
		left_column.offset_top = 0.0
		left_column.offset_right = left_margin + left_width
		left_column.offset_bottom = body_height
		left_column.custom_minimum_size.x = left_width
	if left_section:
		left_section.custom_minimum_size.x = left_width
		left_section.custom_minimum_size.y = clamp(body_height * 0.72, 360.0, 560.0)
	if right_column:
		right_column.anchor_left = 1.0
		right_column.anchor_top = 0.0
		right_column.anchor_right = 1.0
		right_column.anchor_bottom = 0.0
		right_column.offset_left = -right_width - right_margin
		right_column.offset_top = 26.0
		right_column.offset_right = -right_margin
		right_column.offset_bottom = min(body_height, 520.0)
		right_column.custom_minimum_size.x = right_width
	if right_section:
		right_section.custom_minimum_size.x = right_width
		right_section.custom_minimum_size.y = clamp(body_height * 0.74, 340.0, 500.0)
	if center_spacer:
		center_spacer.anchor_left = 0.0
		center_spacer.anchor_top = 0.0
		center_spacer.anchor_right = 0.0
		center_spacer.anchor_bottom = 0.0
		center_spacer.offset_left = center_left
		center_spacer.offset_top = 0.0
		center_spacer.offset_right = center_left + center_gap
		center_spacer.offset_bottom = body_height
		center_spacer.custom_minimum_size = Vector2(center_gap, body_height)
	if bottom_dock:
		var dock_width: float = clampf(left_width + 72.0, 440.0, 540.0)
		bottom_dock.anchor_left = 0.0
		bottom_dock.anchor_top = 0.0
		bottom_dock.anchor_right = 0.0
		bottom_dock.anchor_bottom = 0.0
		bottom_dock.offset_left = left_margin
		bottom_dock.offset_top = body_top + body_height + 12.0
		bottom_dock.offset_right = left_margin + dock_width
		bottom_dock.offset_bottom = body_top + body_height + bottom_height
		bottom_dock.custom_minimum_size = Vector2(dock_width, bottom_height)
		bottom_dock.size_flags_horizontal = Control.SIZE_FILL
	var map_overlay = panel.get_node_or_null("MapOverlay") as Control
	if map_overlay:
		map_overlay.anchor_left = 0.0
		map_overlay.anchor_top = 0.0
		map_overlay.anchor_right = 1.0
		map_overlay.anchor_bottom = 1.0
		map_overlay.offset_left = 0.0
		map_overlay.offset_top = 0.0
		map_overlay.offset_right = 0.0
		map_overlay.offset_bottom = 0.0

func _render_launch_guidance_notice(targets_section: VBoxContainer) -> void:
	if targets_section == null:
		return
	var rm = RocketsManager
	if rm == null:
		return
	var notice = str(rm.consume_launch_guidance_notice())
	if notice == "":
		return
	var guidance: Label = EmptyLabelScene.instantiate()
	guidance.text = notice
	guidance.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	guidance.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	PanelStyle.apply_muted_on_dark(guidance)
	targets_section.add_child(guidance)

func _render_starmap_target_picker(
	target_section: VBoxContainer,
	visible_targets: Array,
	selected_target: String,
	mission_stage: int,
	awaiting_rocket_id: String,
	awaiting_rocket_level: int,
	operation_mode: String,
	trip_selected_contractor: String,
	trip_recommended_target_id: String,
	free_ops_unlocked: bool,
	rm
) -> void:
	if target_section == null:
		return
	var available_ids := {}
	for item_any in visible_targets:
		if typeof(item_any) != TYPE_DICTIONARY:
			continue
		var item: Dictionary = item_any
		available_ids[str(item.get("id", ""))] = true
	if _pending_target_id == "" or not available_ids.has(_pending_target_id):
		_pending_target_id = selected_target if available_ids.has(selected_target) else str(visible_targets[0].get("id", "")) if not visible_targets.is_empty() else ""

	var map_entries := []
	for t_any in visible_targets:
		if typeof(t_any) != TYPE_DICTIONARY:
			continue
		var t: Dictionary = t_any
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
			trip_selected_contractor,
			target_id
		)
		var disposition = _planet_disposition_text(t)
		map_entries.append({
			"id": target_id,
			"label": str(t.get("label", target_id)),
			"type": _normalize_target_type(target_type),
			"blocked": blocked,
			"distance_au": distance_au,
			"recommended": trip_recommended_target_id == target_id,
			"disposition": disposition,
		})

	var map_card := PanelContainer.new()
	map_card.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	map_card.set_meta("ui_style_locked", true)
	map_card.add_theme_stylebox_override("panel", _target_card_style())
	target_section.add_child(map_card)
	var map_column := VBoxContainer.new()
	map_column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	map_column.add_theme_constant_override("separation", 8)
	map_card.add_child(map_column)

	var map_view := LaunchpadStarMap.new()
	map_view.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	map_view.custom_minimum_size = Vector2(0.0, 140.0)
	map_view.setup(map_entries, _pending_target_id, _build_rocket_range_data())
	map_view.target_pressed.connect(Callable(self, "on_selector_target_pressed"))
	map_column.add_child(map_view)

	var selected_entry = _find_target_entry_by_id(visible_targets, _pending_target_id)
	if selected_entry.is_empty():
		return
	var info_card: PanelContainer = LaunchpadTargetInfoCardScene.instantiate()
	info_card.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	info_card.set_meta("ui_style_locked", true)
	info_card.add_theme_stylebox_override("panel", _planet_card_style() if _is_planet_target(selected_entry) else _target_card_style())
	target_section.add_child(info_card)
	var info_column: VBoxContainer = info_card.get_node("Body")
	var title: Label = info_card.get_node("Body/TitleLabel")
	var title_text = str(selected_entry.get("label", _pending_target_id))
	if trip_recommended_target_id == _pending_target_id:
		title_text = "%s (Recommended)" % title_text
	title.text = title_text
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	PanelStyle.apply_body_on_dark(title)
	title.add_theme_font_size_override("font_size", 18)
	title.add_theme_color_override("font_color", Color(0.88, 0.96, 1.0, 1.0))

	var chip_row: HBoxContainer = info_card.get_node("Body/ChipRow")
	for chip_text in _build_target_preview_chips(selected_entry, rm, trip_recommended_target_id == _pending_target_id):
		chip_row.add_child(_make_preview_chip(chip_text))

	var summary: Label = info_card.get_node("Body/SummaryLabel")
	summary.text = _build_starmap_info_text(
		selected_entry,
		mission_stage,
		awaiting_rocket_id,
		awaiting_rocket_level,
		operation_mode,
		trip_selected_contractor,
		free_ops_unlocked,
		rm
	)
	summary.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	summary.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	PanelStyle.apply_muted_on_dark(summary)

	var science_preview: Label = info_card.get_node("Body/SciencePreviewLabel")
	science_preview.text = _build_target_science_preview(selected_entry)
	science_preview.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	science_preview.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	science_preview.add_theme_color_override("font_color", Color(0.80, 0.88, 0.96, 0.96))
	science_preview.add_theme_font_size_override("font_size", 12)

	var composition: Label = info_card.get_node("Body/CompositionLabel")
	composition.text = _estimate_target_composition(_pending_target_id, _is_planet_target(selected_entry))
	composition.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	composition.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	composition.add_theme_color_override("font_color", Color(0.5, 0.95, 0.65, 1.0))
	composition.add_theme_font_size_override("font_size", 13)

	var confirm_btn: Button = info_card.get_node("Body/ActionRow/ConfirmButton")
	var persisted_selected = selected_target == _pending_target_id and selected_target != ""
	var blocked = _is_target_blocked_for_selection(
		mission_stage,
		awaiting_rocket_level,
		int(rm.build_target_profile(_pending_target_id, str(selected_entry.get("type", "asteroid"))).get("required_level", 1)),
		operation_mode,
		trip_selected_contractor,
		_pending_target_id
	)
	confirm_btn.text = "Route Confirmed" if persisted_selected else "Confirm Target"
	confirm_btn.disabled = blocked or persisted_selected
	PanelStyle.apply_button(confirm_btn, not confirm_btn.disabled)
	_style_selector_action_button(confirm_btn, not confirm_btn.disabled)
	if not confirm_btn.disabled:
		confirm_btn.pressed.connect(Callable(self, "_on_confirm_target_pressed"))
	_update_target_summary_card(selected_entry, persisted_selected, blocked, rm, awaiting_rocket_id)

func _build_starmap_info_text(
	target: Dictionary,
	mission_stage: int,
	awaiting_rocket_id: String,
	awaiting_rocket_level: int,
	operation_mode: String,
	trip_selected_contractor: String,
	free_ops_unlocked: bool,
	rm
) -> String:
	var target_id = str(target.get("id", ""))
	var target_type = str(target.get("type", "asteroid"))
	var normalized_type = _normalize_target_type(target_type)
	var profile = rm.build_target_profile(target_id, target_type)
	var required_level = int(profile.get("required_level", 1))
	var distance_au = float(profile.get("distance_au", 0.0))
	var lines := [
		"Profile: %s" % _target_profile_summary(normalized_type, required_level),
		"Distance: %.0f AU" % distance_au,
	]
	var fuel_text = _estimated_fuel_cost_text(distance_au, awaiting_rocket_id)
	if fuel_text != "":
		lines.append(fuel_text)
	if _is_target_blocked_for_selection(
		mission_stage,
		awaiting_rocket_level,
		required_level,
		operation_mode,
		trip_selected_contractor,
		target_id
	):
		lines.append(_blocked_reason_for_target(
			mission_stage,
			awaiting_rocket_level,
			required_level,
			operation_mode,
			trip_selected_contractor,
			target_id
		))
	return "\n".join(lines)

func _target_profile_summary(normalized_type: String, required_level: int) -> String:
	var type_label = "Planetary scan" if normalized_type == "planet" else "Asteroid run"
	return "%s • Level %d+" % [type_label, required_level]

func _estimated_fuel_cost_text(distance_au: float, awaiting_rocket_id: String) -> String:
	if awaiting_rocket_id == "":
		return "Fuel cost: awaiting ship selection"
	var max_range_au = max(RocketSpecs.get_max_range_au(awaiting_rocket_id), 0.01)
	var load_pct = int(round((distance_au / max_range_au) * 100.0))
	if distance_au > max_range_au:
		return "Fuel cost: %d%% of range budget (out of range)" % load_pct
	return "Fuel cost: %d%% of range budget" % load_pct

func _planet_disposition_text(target: Dictionary) -> String:
	var explicit_value = str(target.get("disposition", ""))
	if explicit_value != "":
		return explicit_value
	var blurb = str(target.get("science_blurb", "")).to_lower()
	if blurb.find("confirmed") != -1:
		return "Confirmed"
	if blurb.find("candidate") != -1:
		return "Candidate"
	return "Candidate"

func _find_target_entry_by_id(targets: Array, target_id: String) -> Dictionary:
	for target_any in targets:
		if typeof(target_any) != TYPE_DICTIONARY:
			continue
		var target: Dictionary = target_any
		if str(target.get("id", "")) == target_id:
			return target
	return {}

func _is_planet_target(target: Dictionary) -> bool:
	return _normalize_target_type(str(target.get("type", "asteroid"))) == "planet"

## Returns [{name, max_range_au}] for each unlocked rocket, ordered by range.
## Passed to LaunchpadStarMap.setup() so range overlays stay in sync with player progress.
func _build_rocket_range_data() -> Array:
	var ranges := []
	var unlocked: Array = RocketsManager.get_unlocked()
	for rocket_id in unlocked:
		var spec = RocketSpecs.get_spec(rocket_id)
		ranges.append({
			"name": str(spec.get("display_name", rocket_id.to_upper())),
			"max_range_au": RocketSpecs.get_max_range_au(rocket_id),
		})
	ranges.sort_custom(func(a, b): return float(a.get("max_range_au", 0)) < float(b.get("max_range_au", 0)))
	return ranges


func _normalize_target_type(target_type: String) -> String:
	var normalized = target_type.to_lower()
	return "planet" if normalized == "planet" or normalized == "tess" else "asteroid"

func _target_card_style() -> StyleBoxFlat:
	return PanelStyle.create_glass_card_style(Color(0.06, 0.10, 0.15, 0.97), 0.38, 14, 16, 12)

func _planet_card_style() -> StyleBoxFlat:
	return PanelStyle.create_glass_card_style(Color(0.08, 0.14, 0.20, 0.97), 0.52, 14, 16, 12)

func _set_rocket_selector_visibility(vbox: Control, visible: bool) -> void:
	var rocket_selector = _get_rocket_selector(vbox.get_parent() if vbox else null)
	if rocket_selector:
		rocket_selector.visible = visible

func _set_title_for_state(panel: Panel, has_awaiting_rocket: bool) -> void:
	if panel == null:
		return
	var title = panel.get_node_or_null("VBox/HeaderBar/HeaderCopy/Title")
	if title and title is Label:
		title.text = "Launchpad Mission Setup"
	var subtitle = panel.get_node_or_null("VBox/HeaderBar/HeaderCopy/Subtitle")
	if subtitle and subtitle is Label:
		subtitle.text = "Mission-control setup for contractor, ship, target, and launch."

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
	return MAX_VISIBLE_TARGETS

func _is_target_blocked_for_selection(
	mission_stage: int,
	awaiting_rocket_level: int,
	required_level: int,
	operation_mode: String,
	trip_selected_contractor: String,
	target_id: String
) -> bool:
	var rm = RocketsManager
	if awaiting_rocket_level > 0 and required_level > awaiting_rocket_level:
		return true
	if trip_selected_contractor == "":
		return true
	if rm and rm.is_candidate_visit_blocked(target_id):
		return true
	return false

func _blocked_reason_for_target(
	mission_stage: int,
	awaiting_rocket_level: int,
	required_level: int,
	operation_mode: String,
	trip_selected_contractor: String,
	target_id: String
) -> String:
	var rm = RocketsManager
	if trip_selected_contractor == "":
		return "Select one contractor in the Contractor section first"
	if rm and rm.is_candidate_visit_blocked(target_id):
		return "Target not confirmed yet; run another scan and classify again"
	if awaiting_rocket_level > 0 and required_level > awaiting_rocket_level:
		return "Requires Level %d rocket" % required_level
	return "Not selectable yet"

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
		panel = SelectorPanelScene.instantiate() as Panel
		if panel == null:
			return null
		panel.name = "SelectorPanel"
		ui_layer.add_child(panel)

	_rebuild_selector_panel_layout(panel)
	_wire_panel_buttons(panel)
	panel.z_index = 120
	return panel

func _rebuild_selector_panel_layout(panel: Panel) -> void:
	if panel == null:
		return
	if str(panel.get_meta("layout_version", "")) == SELECTOR_LAYOUT_VERSION:
		return
	var rocket_content = panel.get_node_or_null("VBox/Body/RightColumn/RocketSection/SectionVBox/Content")
	if rocket_content and _get_rocket_selector(panel) == null and RocketSelectorOverlayScene:
		var rocket_selector = RocketSelectorOverlayScene.instantiate()
		if rocket_selector:
			rocket_selector.name = "RocketSelector"
			if rocket_selector is Control:
				var rocket_control := rocket_selector as Control
				rocket_control.size_flags_horizontal = Control.SIZE_EXPAND_FILL
				rocket_control.size_flags_vertical = Control.SIZE_EXPAND_FILL
				rocket_control.custom_minimum_size = Vector2(0, 280)
			rocket_content.add_child(rocket_selector)
	panel.set_meta("layout_version", SELECTOR_LAYOUT_VERSION)

func _get_rocket_selector(panel: Node) -> Control:
	if panel == null:
		return null
	return panel.get_node_or_null("VBox/Body/RightColumn/RocketSection/SectionVBox/Content/RocketSelector") as Control

func _ensure_rocket_selector_ready(panel: Panel) -> void:
	if panel == null:
		return
	var rocket_content = panel.get_node_or_null("VBox/Body/RightColumn/RocketSection/SectionVBox/Content")
	if rocket_content == null:
		return
	var rocket_selector = _get_rocket_selector(panel)
	if rocket_selector == null:
		_attach_fresh_rocket_selector(rocket_content)
		return
	# Let freshly-instanced selectors finish _ready() and build their UI first.
	if not bool(rocket_selector.get_meta("selector_ui_built", false)):
		return
	if _count_create_buttons(rocket_selector) > 0:
		return
	# If selector exists but has no actionable buttons, recreate it to recover from stale/blank state.
	rocket_content.remove_child(rocket_selector)
	rocket_selector.queue_free()
	_attach_fresh_rocket_selector(rocket_content)

func _attach_fresh_rocket_selector(rocket_content: Node) -> void:
	if RocketSelectorOverlayScene == null or rocket_content == null:
		return
	var fresh = RocketSelectorOverlayScene.instantiate()
	if fresh == null:
		return
	fresh.name = "RocketSelector"
	if fresh is Control:
		var ctrl := fresh as Control
		ctrl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		ctrl.size_flags_vertical = Control.SIZE_EXPAND_FILL
		ctrl.custom_minimum_size = Vector2(0, 280)
	rocket_content.add_child(fresh)

func _count_create_buttons(root: Node) -> int:
	if root == null:
		return 0
	var count := 0
	var stack: Array[Node] = [root]
	while not stack.is_empty():
		var node = stack.pop_back()
		if node is Button and node.name.begins_with("CreateButton_"):
			count += 1
		for child in node.get_children():
			stack.append(child)
	return count

func _clear_container(container: Node) -> void:
	if container == null:
		return
	for child in container.get_children():
		container.remove_child(child)
		child.queue_free()

func _clear_rocket_section_extras(container: Node) -> void:
	if container == null:
		return
	for child in container.get_children():
		if child.name == "RocketSelector":
			continue
		if child is Label and (child as Label).text == "Rocket":
			continue
		container.remove_child(child)
		child.queue_free()

func _selector_flow_phase(selected_contractor_id: String, has_awaiting_rocket: bool) -> String:
	if selected_contractor_id == "":
		return "contractor"
	if not has_awaiting_rocket:
		return "rocket"
	return "target"

func _resolve_tutorial_flow_phase(default_phase: String, selected_contractor_id: String, has_awaiting_rocket: bool) -> String:
	var forced = _tutorial_forced_phase()
	if forced == "":
		return default_phase
	if forced == "contractor":
		return "contractor"
	if forced == "rocket":
		return "rocket" if selected_contractor_id != "" else "contractor"
	if forced == "target":
		if selected_contractor_id == "":
			return "contractor"
		if not has_awaiting_rocket:
			return "rocket"
		return "target"
	return default_phase

func _tutorial_forced_phase() -> String:
	var state = _read_tutorial_state()
	if typeof(state) != TYPE_DICTIONARY:
		return ""
	if bool(state.get("skipped", false)):
		return ""
	var step = state.get("current_step", {})
	if typeof(step) != TYPE_DICTIONARY or (step as Dictionary).is_empty():
		return ""
	var action_key = str((step as Dictionary).get("action_key", ""))
	match action_key:
		"accept_contractor_offer", "accept_starter_contractor":
			return "contractor"
		"create_rocket":
			return "rocket"
		"select_launch_target", "launch_rocket_from_earth":
			return "target"
		_:
			if RocketsManager.get_mission_stage() <= 1:
				return "contractor"
			return ""

func _read_tutorial_state() -> Dictionary:
	var app = AppControllerHelper.get_instance()
	if app != null and app.has_method("get_tutorial_state"):
		var from_app = app.get_tutorial_state()
		if typeof(from_app) == TYPE_DICTIONARY:
			return from_app
	if _launchpad != null and _launchpad.get_tree() != null and _launchpad.get_tree().root != null:
		var tc = _launchpad.get_tree().root.get_node_or_null("TutorialController")
		if tc != null and tc.has_method("get_tutorial_state"):
			var from_controller = tc.get_tutorial_state()
			if typeof(from_controller) == TYPE_DICTIONARY:
				return from_controller
	return {}

func _set_section_visibility(panel: Panel, phase: String) -> void:
	if panel == null:
		return
	var contractor_card = panel.get_node_or_null("VBox/Body/LeftColumn/ContractorSection") as Control
	var center_card = panel.get_node_or_null("VBox/BottomDock") as Control
	var rocket_card = panel.get_node_or_null("VBox/Body/RightColumn/RocketSection") as Control
	var target_card = panel.get_node_or_null("MapOverlay/OverlayVBox/TargetSection") as Control
	if center_card:
		center_card.visible = phase != "contractor"
	_apply_section_state(contractor_card, phase == "contractor", phase != "contractor")
	_apply_section_state(center_card, phase == "target", phase != "contractor")
	_apply_section_state(rocket_card, phase == "rocket", phase == "target")
	_apply_section_state(target_card, phase == "target" and _map_overlay_open, false)
	_update_step_chip(panel.get_node_or_null("VBox/StepRail/ContractorStep") as PanelContainer, phase == "contractor", phase != "contractor")
	_update_step_chip(panel.get_node_or_null("VBox/StepRail/RocketStep") as PanelContainer, phase == "rocket", phase == "target")
	_update_step_chip(panel.get_node_or_null("VBox/StepRail/TargetStep") as PanelContainer, phase == "target", false)
	_update_step_chip(panel.get_node_or_null("VBox/StepRail/LaunchStep") as PanelContainer, false, phase == "target" and RocketsManager.get_selected_target() != "")

func _boost_label_contrast(container: Node) -> void:
	if container == null:
		return
	var stack: Array[Node] = [container]
	while not stack.is_empty():
		var node = stack.pop_back()
		if node is Label:
			var label := node as Label
			label.add_theme_color_override("font_color", PanelStyle.TEXT_ON_DARK)
		for child in node.get_children():
			stack.append(child)

func _normalize_selector_typography(panel: Panel) -> void:
	if panel == null:
		return
	var stack: Array[Node] = [panel]
	while not stack.is_empty():
		var node = stack.pop_back()
		if node is Label:
			var label := node as Label
			var text_size := 15
			if label.name == "Title":
				text_size = 20
			elif label.text in ["Contractor", "Rocket", "Mission Target", "Required Rooms"]:
				text_size = 16
			elif label.text.begins_with("Step "):
				text_size = 14
			label.add_theme_font_size_override("font_size", text_size)
			var lowered := "%s %s" % [label.name.to_lower(), label.text.to_lower()]
			var muted := lowered.contains("subtitle") or lowered.contains("blurb") or lowered.contains("hint") or lowered.contains("message")
			label.add_theme_color_override("font_color", PanelStyle.MUTED_ON_DARK if muted else PanelStyle.TEXT_ON_DARK)
		elif node is Button:
			var btn := node as Button
			btn.custom_minimum_size.y = max(btn.custom_minimum_size.y, 42.0)
			btn.add_theme_font_size_override("font_size", 16)
			# Keep RocketSelector create buttons on their dedicated warm CTA palette.
			if not btn.disabled and not btn.name.begins_with("CreateButton_"):
				btn.add_theme_color_override("font_color", PanelStyle.TEXT_ON_DARK)
				btn.add_theme_color_override("font_hover_color", PanelStyle.TEXT_ON_DARK)
				btn.add_theme_color_override("font_pressed_color", PanelStyle.TEXT_ON_DARK)
		for child in node.get_children():
			stack.append(child)

func _style_selector_action_button(btn: Button, emphasize: bool) -> void:
	if btn == null:
		return
	btn.set_meta("ui_style_locked", true)
	var normal := StyleBoxFlat.new()
	normal.bg_color = Color(0.11, 0.18, 0.30, 0.92) if not emphasize else Color(0.16, 0.22, 0.36, 0.95)
	normal.border_color = Color(0.28, 0.88, 0.96, 0.80)
	normal.set_border_width_all(1)
	normal.set_corner_radius_all(6)
	normal.content_margin_left = 16
	normal.content_margin_right = 16
	normal.content_margin_top = 10
	normal.content_margin_bottom = 10
	var hover := normal.duplicate()
	hover.bg_color = Color(0.18, 0.30, 0.48, 0.96)
	var pressed := normal.duplicate()
	pressed.bg_color = Color(0.10, 0.16, 0.28, 0.96)
	var disabled := normal.duplicate()
	disabled.bg_color = Color(0.08, 0.12, 0.20, 0.88)
	disabled.border_color = Color(0.34, 0.52, 0.70, 0.78)
	btn.add_theme_stylebox_override("normal", normal)
	btn.add_theme_stylebox_override("hover", hover)
	btn.add_theme_stylebox_override("pressed", pressed)
	btn.add_theme_stylebox_override("focus", hover)
	btn.add_theme_stylebox_override("disabled", disabled)
	btn.add_theme_color_override("font_color", PanelStyle.TEXT_ON_DARK)
	btn.add_theme_color_override("font_hover_color", PanelStyle.TEXT_ON_DARK)
	btn.add_theme_color_override("font_pressed_color", PanelStyle.TEXT_ON_DARK)
	btn.add_theme_color_override("font_disabled_color", Color(0.78, 0.86, 0.94, 1.0))

func _wire_panel_buttons(panel: Panel) -> void:
	if panel == null:
		return
	var back_button = panel.get_node_or_null("VBox/HeaderBar/BackButton") as Button
	var open_map_button = panel.get_node_or_null("VBox/BottomDock/DockVBox/ActionRow/OpenMapButton") as Button
	var map_back_button = panel.get_node_or_null("MapOverlay/OverlayVBox/Toolbar/MapBackButton") as Button
	var cb = Callable(self, "_on_back_to_base_pressed")
	if back_button and not back_button.pressed.is_connected(cb):
		back_button.pressed.connect(cb)
	var open_cb = Callable(self, "_on_open_target_map_pressed")
	if open_map_button and not open_map_button.pressed.is_connected(open_cb):
		open_map_button.pressed.connect(open_cb)
	var map_back_cb = Callable(self, "_on_close_target_map_pressed")
	if map_back_button and not map_back_button.pressed.is_connected(map_back_cb):
		map_back_button.pressed.connect(map_back_cb)

func _set_map_overlay_visible(panel: Panel, visible: bool) -> void:
	if panel == null:
		return
	var overlay = panel.get_node_or_null("MapOverlay") as Control
	if overlay:
		overlay.visible = visible
		overlay.mouse_filter = Control.MOUSE_FILTER_STOP if visible else Control.MOUSE_FILTER_IGNORE

func _on_open_target_map_pressed() -> void:
	if _launchpad == null or _launchpad.get_tree() == null:
		return
	var panel = _launchpad.get_tree().current_scene.get_node_or_null("UILayer/SelectorPanel") as Panel
	if panel == null:
		return
	_map_overlay_open = true
	_set_map_overlay_visible(panel, true)
	populate_targets()

func _on_close_target_map_pressed() -> void:
	if _launchpad == null or _launchpad.get_tree() == null:
		return
	var panel = _launchpad.get_tree().current_scene.get_node_or_null("UILayer/SelectorPanel") as Panel
	if panel == null:
		return
	_map_overlay_open = false
	_set_map_overlay_visible(panel, false)

func _render_phase_placeholder(container: VBoxContainer, message: String) -> void:
	if container == null:
		return
	var lbl: Label = EmptyLabelScene.instantiate()
	lbl.text = message
	lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	PanelStyle.apply_muted_on_dark(lbl)
	container.add_child(lbl)

func _build_target_preview_chips(target: Dictionary, rm, recommended: bool = false) -> Array[String]:
	var chips: Array[String] = []
	var target_type = _normalize_target_type(str(target.get("type", "asteroid")))
	chips.append("Type: %s" % ("Planet" if target_type == "planet" else "Asteroid"))
	var target_id = str(target.get("id", ""))
	var profile = rm.build_target_profile(target_id, str(target.get("type", "asteroid")))
	chips.append("Range: %.0f AU" % float(profile.get("distance_au", 0.0)))
	var science_source = str(target.get("science_source", "")).strip_edges()
	if science_source != "":
		chips.append(science_source)
	var scan_count = max(int(rm.get_target_scan_count(target_id, str(target.get("type", "asteroid")))), 1)
	chips.append("%d scan%s" % [scan_count, "" if scan_count == 1 else "s"])
	var status = _target_status_chip_text(target, rm)
	if status != "":
		chips.append(status)
	if recommended:
		chips.append("Recommended")
	return chips

func _make_preview_chip(text: String) -> PanelContainer:
	var chip := PanelContainer.new()
	var style := PanelStyle.create_glass_pill_style(Color(0.08, 0.14, 0.22, 0.94), 0.52, 8)
	chip.add_theme_stylebox_override("panel", style)
	var lbl := Label.new()
	lbl.text = text
	lbl.add_theme_font_size_override("font_size", 11)
	lbl.add_theme_color_override("font_color", PanelStyle.TEXT_ON_DARK)
	chip.add_child(lbl)
	return chip

func _build_target_science_preview(target: Dictionary) -> String:
	var blurb = str(target.get("science_blurb", "")).strip_edges()
	if blurb != "":
		var source = str(target.get("science_source", "")).strip_edges()
		if source != "":
			return "%s. Source: %s." % [blurb.trim_suffix("."), source]
		return blurb
	if _is_planet_target(target):
		return "Live scan preview: atmospheric and orbital readings are still being refined before contract lock."
	return "Live scan preview: ore profile is extrapolated from remote returns and will sharpen after confirmation."

func _target_status_chip_text(target: Dictionary, rm) -> String:
	var classification = str(target.get("classification_status", "")).strip_edges()
	if classification != "":
		return "Status: %s" % classification.capitalize()
	var target_id = str(target.get("id", ""))
	if _is_planet_target(target):
		var verdict = str(rm.get_tess_classification(target_id)).strip_edges()
		if verdict != "":
			return "Classified: %s" % verdict.capitalize()
	return "Status: %s" % _planet_disposition_text(target)

func _update_status_strip(panel: Panel, mission_stage: int, selected_contractor: Dictionary, awaiting_rocket_id: String, selected_target: String, flow_phase: String, rm) -> void:
	if panel == null:
		return
	var route_value = panel.get_node_or_null("VBox/BottomDock/DockVBox/StatusRow/RoutePill/Label") as Label
	var contractor_value = panel.get_node_or_null("VBox/BottomDock/DockVBox/StatusRow/ContractorPill/Label") as Label
	var rocket_value = panel.get_node_or_null("VBox/BottomDock/DockVBox/StatusRow/RocketPill/Label") as Label
	var target_value = panel.get_node_or_null("VBox/BottomDock/DockVBox/ActionRow/TargetPill/Label") as Label
	var open_map_button = panel.get_node_or_null("VBox/BottomDock/DockVBox/ActionRow/OpenMapButton") as Button
	var launch_message = panel.get_node_or_null("VBox/BottomDock/DockVBox/LaunchMessage") as Label
	if route_value:
		route_value.text = "Mission %d" % mission_stage if not rm.is_free_operations_unlocked() else "Free Ops"
	if contractor_value:
		contractor_value.text = str(selected_contractor.get("name", "Awaiting contractor")) if not selected_contractor.is_empty() else "Awaiting contractor"
	if target_value:
		target_value.text = str(rm.get_target_details(selected_target).get("label", "No target locked")) if selected_target != "" else "No target locked"
	if open_map_button:
		open_map_button.disabled = flow_phase != "target"
		if flow_phase == "contractor":
			open_map_button.text = "Sign Contractor First"
		elif flow_phase == "rocket":
			open_map_button.text = "Drag Rocket To Pad"
		elif selected_target != "":
			open_map_button.text = "Reopen Target Map"
		else:
			open_map_button.text = "Open Target Map"
	if launch_message:
		if flow_phase == "contractor":
			launch_message.text = "Pick one contractor to unlock route planning."
		elif flow_phase == "rocket":
			launch_message.text = "Drag a rocket onto the pad, then move to target planning."
		elif selected_target == "":
			launch_message.text = "Open Target Map, confirm a route, then return to the pad to launch."
		else:
			launch_message.text = "Route locked. Return from the map and press Launch on the pad when ready."
	if rocket_value:
		rocket_value.text = RocketSpecs.get_display_name(awaiting_rocket_id) if awaiting_rocket_id != "" else "No ship armed"

func _update_target_summary_card(selected_entry: Dictionary, persisted_selected: bool, blocked: bool, rm, awaiting_rocket_id: String) -> void:
	var root_scene = _launchpad.get_tree().current_scene
	if root_scene == null:
		return
	var panel = root_scene.get_node_or_null("UILayer/SelectorPanel") as Panel
	if panel == null:
		return
	var launch_message = panel.get_node_or_null("VBox/BottomDock/DockVBox/LaunchMessage") as Label
	var rocket_pill = panel.get_node_or_null("VBox/BottomDock/DockVBox/StatusRow/RocketPill/Label") as Label
	var target_pill = panel.get_node_or_null("VBox/BottomDock/DockVBox/ActionRow/TargetPill/Label") as Label
	if launch_message:
		if blocked:
			launch_message.text = _blocked_reason_for_target(
				int(rm.get_mission_stage()),
				int(rm.get_rocket_level(awaiting_rocket_id)),
				int(rm.build_target_profile(str(selected_entry.get("id", "")), str(selected_entry.get("type", "asteroid"))).get("required_level", 1)),
				str(rm.get_operation_mode()),
				str(rm.get_trip_selected_contractor().get("id", "")),
				str(selected_entry.get("id", ""))
			)
		elif persisted_selected:
			launch_message.text = "Target lock confirmed. Press Launch on the pad when the crew is ready."
		else:
			launch_message.text = "Review route fit, then confirm this target to arm the launch sequence."
	if rocket_pill:
		rocket_pill.text = RocketSpecs.get_display_name(awaiting_rocket_id) if awaiting_rocket_id != "" else "No ship armed"
	if target_pill:
		var label = str(selected_entry.get("label", selected_entry.get("id", "")))
		target_pill.text = "%s%s" % [label, " locked" if persisted_selected else ""]

func _apply_section_state(card: Control, active: bool, complete: bool) -> void:
	if card == null:
		return
	card.modulate = Color(1, 1, 1, 1.0) if active else (Color(1, 1, 1, 0.94) if complete else Color(1, 1, 1, 0.76))

func _update_step_chip(chip: PanelContainer, active: bool, complete: bool) -> void:
	if chip == null:
		return
	chip.modulate = Color(1, 1, 1, 1)
	var bg := Color(0.08, 0.13, 0.19, 0.88)
	var border_alpha := 0.30
	var badge_color := PanelStyle.MUTED_ON_DARK
	var label_color := PanelStyle.MUTED_ON_DARK
	if active:
		bg = Color(0.11, 0.20, 0.30, 0.96)
		border_alpha = 0.78
		badge_color = PanelStyle.ACCENT_WARM
		label_color = PanelStyle.TEXT_ON_DARK
	elif complete:
		bg = Color(0.08, 0.15, 0.22, 0.92)
		border_alpha = 0.54
		badge_color = Color(PanelStyle.ACCENT.r, PanelStyle.ACCENT.g, PanelStyle.ACCENT.b, 0.88)
		label_color = PanelStyle.TEXT_ON_DARK
	chip.add_theme_stylebox_override("panel", PanelStyle.create_glass_pill_style(bg, border_alpha, 14))
	var badge := chip.get_node_or_null("HBox/Badge") as Label
	var label := chip.get_node_or_null("HBox/Label") as Label
	if badge:
		badge.add_theme_color_override("font_color", badge_color)
	if label:
		label.add_theme_color_override("font_color", label_color)

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

## Returns a deterministic estimated mineral composition string for a target.
## Asteroids are metal-rich; planets are silicate/rock-dominant.
func _estimate_target_composition(target_id: String, is_planet: bool) -> String:
	var h := absi(target_id.hash())
	var parts: Array = []
	if is_planet:
		# Planets: silicate/rock dominant, trace metals
		var silicates_pct := 35 + (h % 20)        # 35–54%
		var rock_pct := 25 + ((h >> 4) % 18)       # 25–42%
		var remaining := 100 - silicates_pct - rock_pct
		var rare_names: Array[String] = ["Iron", "Nickel", "Cobalt", "Titanium"]
		var rare_pct := maxi(remaining, 5)
		var rare_name: String = rare_names[(h >> 8) % rare_names.size()]
		parts = [
			"Silicates %d%%" % silicates_pct,
			"Rock %d%%" % rock_pct,
			"%s %d%%" % [rare_name, rare_pct]
		]
	else:
		# Asteroids: iron/nickel core, with 1-2 rarer minerals
		var iron_pct := 30 + (h % 22)              # 30–51%
		var nickel_pct := 20 + ((h >> 5) % 18)     # 20–37%
		var remaining := 100 - iron_pct - nickel_pct
		var rare_names: Array[String] = ["Cobalt", "Silicates", "Titanium", "Platinum"]
		var rare_name: String = rare_names[(h >> 10) % rare_names.size()]
		var rare_pct := remaining
		parts = [
			"Iron %d%%" % iron_pct,
			"Nickel %d%%" % nickel_pct,
			"%s %d%%" % [rare_name, rare_pct]
		]
	return "Est: " + ", ".join(parts)
