extends Control
## MissionDebriefV2 — clean mission completion screen.
## Shows goal status, cargo collected, and a sell + complete action.
## Triggered when a rocket returns to Earth (goingTo == "Earth" on arrival).

const RocketSpecs           = preload("res://Scripts/Utils/RocketSpecs.gd")
const RocketsManager        = preload("res://Scripts/Utils/RocketsManager.gd")
const MineralPricing        = preload("res://Scripts/Utils/MineralPricing.gd")
const MiningInventory       = preload("res://Scripts/Utils/MiningInventory.gd")
const SectorRevealManager   = preload("res://Scripts/Utils/SectorRevealManager.gd")
const SubcontractorManager  = preload("res://Scripts/Utils/SubcontractorManager.gd")
const AppControllerHelper   = preload("res://Scripts/Utils/AppControllerHelper.gd")
const MissionLogManager     = preload("res://Scripts/Utils/MissionLogManager.gd")
const NumberFormat          = preload("res://Scripts/Utils/NumberFormat.gd")
const NavigationMixin       = preload("res://Scripts/Utils/NavigationMixin.gd")
const AppLogger             = preload("res://Scripts/Utils/Logger.gd")
const ResearchManager       = preload("res://Scripts/Utils/ResearchManager.gd")
const EarthSceneUIHelper    = preload("res://Scripts/Earth/EarthSceneUIHelper.gd")
const ResourceValueRowScene = preload("res://Scenes/UI/Templates/ResourceValueRow.tscn")
const SummaryCardScene      = preload("res://Scenes/UI/Templates/MissionDebriefSummaryCard.tscn")
const SectionCardScene      = preload("res://Scenes/UI/Templates/MissionDebriefSectionCard.tscn")
const PayoutCardScene       = preload("res://Scenes/UI/Templates/MissionDebriefPayoutCard.tscn")
const MissionDebriefBulletRowScene = preload("res://Scenes/UI/Templates/MissionDebriefBulletRow.tscn")
const MissionDebriefDetailRowScene = preload("res://Scenes/UI/Templates/MissionDebriefDetailRow.tscn")
const PanelStyle           = preload("res://Scripts/UI/PanelStyle.gd")

const EARTH_SCENE               := "res://Scenes/Earth/earth_base_1.tscn"
const LAUNCHPAD_SCENE           := "res://Scenes/Earth/earth_launchpad.tscn"
const CONTRACTOR_ROUTE_MULT     := 1.2
const AFFINITY_BONUS_PER_POINT  := 0.005
const AFFINITY_BONUS_CAP        := 0.25
const ORDER_BONUS_CAP           := 0.15
const DISCOVERY_BONUS_MULT      := 1.10

const PANEL_BG    := Color(0.03, 0.05, 0.09, 0.98)
const CYAN        := PanelStyle.ACCENT
const AMBER       := PanelStyle.ACCENT_WARM
const GREEN       := Color(0.30, 1.0, 0.45, 1.0)
const RED         := Color(1.0, 0.35, 0.35, 1.0)
const TEXT_COLOR  := PanelStyle.TEXT_ON_DARK
const TEXT_MUTED  := PanelStyle.MUTED_ON_DARK
const TITLE_COLOR := PanelStyle.TEXT_ON_DARK

var _returned: Dictionary       = {}
var _cargo: Dictionary          = {}
var _requested: Dictionary      = {}
var _contractor_id: String      = ""
var _contractor_name: String    = ""
var _operation_mode: String     = ""
var _order_ratio: float         = 1.0
var _affinity_before: int       = 0
var _payout: int                = 0
var _done := false
var _reward_resolved := false
var _debrief_resolved := false
var _salvage_applied := false
var _salvage_refund := 0
var _next_mission_brief: Dictionary = {}
var _phase := "reward"
var _guide_visible := false
var scene_manager: SceneManager
var ui_manager: UIManager
var _ui_helper := EarthSceneUIHelper.new()
@onready var _background: ColorRect = $Background
@onready var _center: MarginContainer = $Center
@onready var _panel: PanelContainer = $Center/Panel
@onready var _content_vbox: VBoxContainer = $Center/Panel/Margin/ContentVBox
@onready var _empty_state: VBoxContainer = $Center/EmptyState
@onready var _empty_label: Label = $Center/EmptyState/EmptyLabel
@onready var _empty_button: Button = $Center/EmptyState/EmptyButton
@onready var _header_section: VBoxContainer = $Center/Panel/Margin/ContentVBox/HeaderSection
@onready var _header_eyebrow: Label = $Center/Panel/Margin/ContentVBox/HeaderSection/HeaderTopRow/TitleColumn/EyebrowLabel
@onready var _header_title: Label = $Center/Panel/Margin/ContentVBox/HeaderSection/HeaderTopRow/TitleColumn/TitleLabel
@onready var _header_hint: Label = $Center/Panel/Margin/ContentVBox/HeaderSection/HeaderTopRow/TitleColumn/HintLabel
@onready var _phase_chip: PanelContainer = $Center/Panel/Margin/ContentVBox/HeaderSection/HeaderTopRow/HeaderControls/PhaseChip
@onready var _phase_chip_label: Label = $Center/Panel/Margin/ContentVBox/HeaderSection/HeaderTopRow/HeaderControls/PhaseChip/PhaseChipLabel
@onready var _guide_button: Button = $Center/Panel/Margin/ContentVBox/HeaderSection/HeaderTopRow/HeaderControls/GuideButton
@onready var _header_separator: HBoxContainer = $Center/Panel/Margin/ContentVBox/HeaderSection/HeaderSeparator
@onready var _guide_card: PanelContainer = $Center/Panel/Margin/ContentVBox/GuideCard
@onready var _guide_rows: VBoxContainer = $Center/Panel/Margin/ContentVBox/GuideCard/Content/Rows
@onready var _guide_footer: Label = $Center/Panel/Margin/ContentVBox/GuideCard/Content/FooterLabel
@onready var _success_banner: PanelContainer = $Center/Panel/Margin/ContentVBox/MainRow/LeftColumn/SuccessBanner
@onready var _success_icon: Label = $Center/Panel/Margin/ContentVBox/MainRow/LeftColumn/SuccessBanner/Margin/Row/StatusIcon
@onready var _success_title: Label = $Center/Panel/Margin/ContentVBox/MainRow/LeftColumn/SuccessBanner/Margin/Row/TextColumn/StatusLabel
@onready var _success_detail: Label = $Center/Panel/Margin/ContentVBox/MainRow/LeftColumn/SuccessBanner/Margin/Row/TextColumn/StatusDetailLabel
@onready var _summary_grid: VBoxContainer = $Center/Panel/Margin/ContentVBox/MainRow/LeftColumn/SummaryGrid
@onready var _body_grid: VBoxContainer = $Center/Panel/Margin/ContentVBox/MainRow/BodyGrid
@onready var _manifest_card: PanelContainer = $Center/Panel/Margin/ContentVBox/MainRow/LeftColumn/SummaryGrid/ManifestCard
@onready var _manifest_target_value: Label = $Center/Panel/Margin/ContentVBox/MainRow/LeftColumn/SummaryGrid/ManifestCard/Margin/Content/Rows/TargetRow/TargetValue
@onready var _manifest_contractor_value: Label = $Center/Panel/Margin/ContentVBox/MainRow/LeftColumn/SummaryGrid/ManifestCard/Margin/Content/Rows/ContractorRow/ContractorValue
@onready var _manifest_vessel_value: Label = $Center/Panel/Margin/ContentVBox/MainRow/LeftColumn/SummaryGrid/ManifestCard/Margin/Content/Rows/VesselRow/VesselValue
@onready var _manifest_duration_value: Label = $Center/Panel/Margin/ContentVBox/MainRow/LeftColumn/SummaryGrid/ManifestCard/Margin/Content/Rows/DurationRow/DurationValue
@onready var _payout_card: PanelContainer = $Center/Panel/Margin/ContentVBox/MainRow/BodyGrid/RecoveryColumn/PayoutCard
@onready var _combined_cargo_card: PanelContainer = $Center/Panel/Margin/ContentVBox/MainRow/BodyGrid/RecoveryColumn/CombinedCargoCard
@onready var _recovery_primary_chip: PanelContainer = $Center/Panel/Margin/ContentVBox/MainRow/BodyGrid/RecoveryColumn/CombinedCargoCard/Margin/Content/ChipsRow/PrimaryChip
@onready var _recovery_secondary_chip: PanelContainer = $Center/Panel/Margin/ContentVBox/MainRow/BodyGrid/RecoveryColumn/CombinedCargoCard/Margin/Content/ChipsRow/SecondaryChip
@onready var _findings_card: PanelContainer = $Center/Panel/Margin/ContentVBox/MainRow/BodyGrid/ProgressColumn/FindingsCard
@onready var _phase_card: PanelContainer = $Center/Panel/Margin/ContentVBox/MainRow/BodyGrid/ProgressColumn/PhaseCard
@onready var _actions_card: PanelContainer = $Center/Panel/Margin/ContentVBox/ActionsCard
@onready var _actions_row: HBoxContainer = $Center/Panel/Margin/ContentVBox/ActionsCard/Margin/Content/Rows/ActionsRow
@onready var _primary_action_button: Button = $Center/Panel/Margin/ContentVBox/ActionsCard/Margin/Content/Rows/ActionsRow/PrimaryActionButton
@onready var _secondary_action_button: Button = $Center/Panel/Margin/ContentVBox/ActionsCard/Margin/Content/Rows/ActionsRow/SecondaryActionButton
@onready var _tertiary_action_button: Button = $Center/Panel/Margin/ContentVBox/ActionsCard/Margin/Content/Rows/ActionsRow/TertiaryActionButton


func _ready() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	scene_manager = SceneManager.new()
	add_child(scene_manager)
	scene_manager.add_to_group("scene_manager")
	ui_manager = UIManager.new()
	add_child(ui_manager)
	ui_manager.add_to_group("ui_manager")
	_ui_helper.setup(self)
	_ui_helper.setup_buttons()
	call_deferred("_apply_nav_safe_area")
	_apply_scene_nav_state()
	_empty_button.pressed.connect(_return_to_base)
	_guide_button.pressed.connect(_toggle_button_guide)
	_returned = RocketsManager.get_returned_mission()
	if _returned.is_empty():
		_build_empty_ui()
		return
	_cargo          = _resolve_cargo(_returned)
	_operation_mode = str(_returned.get("operation_mode", "contract")).strip_edges().to_lower()
	_resolve_contractor_context()
	_payout         = _calc_payout()
	_reward_resolved = _cargo.is_empty()
	_salvage_refund = _calc_salvage_refund()
	_next_mission_brief = _build_next_mission_brief()
	_render_ui()

func _apply_scene_nav_state() -> void:
	var forward_btn := get_node_or_null("UILayer/ButtonContainer/ForwardButton") as Button
	if forward_btn:
		forward_btn.disabled = true

func _apply_nav_safe_area() -> void:
	_ui_helper.apply_nav_layout()

func _on_back_button_pressed() -> void:
	_return_to_base()

func _on_forward_button_pressed() -> void:
	pass

func _on_menu_button_pressed() -> void:
	preload("res://Scripts/UI/GameNavigationMenu.gd").toggle(self)

func _on_market_button_pressed() -> void:
	AppLogger.w("Market not available in this version")
	return

func _on_space_map_button_pressed() -> void:
	if scene_manager:
		scene_manager.change_to_scene("res://Scenes/UI/SpaceMap/galaxy_map.tscn")
	else:
		get_tree().change_scene_to_file("res://Scenes/UI/SpaceMap/galaxy_map.tscn")

func _on_new_mission_button_pressed() -> void:
	if scene_manager:
		scene_manager.change_to_scene(LAUNCHPAD_SCENE)
	else:
		get_tree().change_scene_to_file(LAUNCHPAD_SCENE)


# ---------------------------------------------------------------------------
# Data helpers
# ---------------------------------------------------------------------------

func _resolve_cargo(payload: Dictionary) -> Dictionary:
	var run_collected = payload.get("mining_run_collected", {})
	if typeof(run_collected) == TYPE_DICTIONARY and not run_collected.is_empty():
		return run_collected.duplicate(true)
	var tid = str(payload.get("target_id", ""))
	if tid == "":
		return {}
	var state = MiningInventory.load_state()
	var collected = state.get("targets", {}).get(tid, {}).get("collected", {})
	return collected.duplicate(true) if typeof(collected) == TYPE_DICTIONARY else {}


func _resolve_contractor_context() -> void:
	var starter_ctx = _returned.get("starter_contract_context", {})
	if typeof(starter_ctx) == TYPE_DICTIONARY and bool(starter_ctx.get("active", false)):
		_contractor_id   = str(starter_ctx.get("id", ""))
		_contractor_name = str(starter_ctx.get("name", "Contractor"))
		_requested       = starter_ctx.get("requested_minerals", {}).duplicate(true)
	else:
		_contractor_id   = str(_returned.get("trip_contractor_id", ""))
		_contractor_name = str(_returned.get("trip_contractor_name", ""))
		_requested       = _returned.get("trip_requested_minerals", {}).duplicate(true)
		if _contractor_id == "":
			var sel = RocketsManager.get_trip_selected_contractor()
			_contractor_id   = str(sel.get("id", ""))
			_contractor_name = str(sel.get("name", _contractor_name))
		if _requested.is_empty():
			var offer = RocketsManager.get_trip_contract_offer()
			if typeof(offer) == TYPE_DICTIONARY:
				_requested = offer.get("requested_minerals", {}).duplicate(true)
	if _contractor_name == "":
		var sub = SubcontractorManager.get_subcontractor(_contractor_id)
		_contractor_name = str(sub.get("name", ""))
	_affinity_before = SubcontractorManager.get_affinity(_contractor_id)
	_order_ratio     = _compute_order_ratio(_cargo, _requested)


func _compute_order_ratio(collected: Dictionary, requested: Dictionary) -> float:
	if requested.is_empty():
		return 1.0
	var req_total := 0
	var matched   := 0
	for k in requested.keys():
		var req: int = max(int(requested.get(k, 0)), 0)
		if req <= 0:
			continue
		req_total += req
		matched   += min(int(collected.get(str(k), 0)), req)
	if req_total <= 0:
		return 1.0
	return clamp(float(matched) / float(req_total), 0.0, 1.0)


func _calc_payout() -> int:
	var base := 0
	for mineral in _cargo.keys():
		base += MineralPricing.price_for(str(mineral), int(_cargo.get(mineral, 0)))
	var gross := int(round(float(base) * CONTRACTOR_ROUTE_MULT))
	var tid := str(_returned.get("target_id", ""))
	if tid != "" and not RocketsManager.has_discovery_bonus_claimed(tid):
		gross = int(round(float(gross) * DISCOVERY_BONUS_MULT))
	if _contractor_id != "":
		var aff_mult: float = 1.0 + min(float(_affinity_before) * AFFINITY_BONUS_PER_POINT, float(AFFINITY_BONUS_CAP))
		var ord_mult := 1.0 + (ORDER_BONUS_CAP * _order_ratio)
		gross = int(round(float(gross) * ord_mult * aff_mult))
	gross = min(gross, RocketsManager.get_free_ops_payout_cap())
	return RocketsManager.calibrate_onboarding_payout(gross, str(_returned.get("rocket_id", "")))

func _format_manifest_duration(rocket_id: String) -> String:
	if rocket_id == "":
		return "Recovered"
	var total_seconds := RocketsManager.get_mission_duration_seconds_for_rocket(rocket_id) + RocketsManager.get_return_duration_seconds_for_rocket(rocket_id)
	var hours := int(total_seconds / 3600)
	var minutes := int((total_seconds % 3600) / 60)
	var seconds := int(total_seconds % 60)
	return "%02d:%02d:%02d UTC" % [hours, minutes, seconds]


# ---------------------------------------------------------------------------
# UI construction
# ---------------------------------------------------------------------------

func _render_ui() -> void:
	_panel.visible = false
	_empty_state.visible = false
	if _returned.is_empty():
		_build_empty_ui()
		return
	_build_ui()


func _build_ui() -> void:
	var vp := get_viewport()
	var vp_w := vp.get_visible_rect().size.x if vp else 1280.0
	var vp_h := vp.get_visible_rect().size.y if vp else 768.0

	_background.color = PANEL_BG
	_panel.visible = true
	_empty_state.visible = false
	_panel.custom_minimum_size = Vector2(clampf(vp_w - 220.0, 980.0, 1420.0), clampf(vp_h - 220.0, 620.0, 860.0))
	_content_vbox.add_theme_constant_override("separation", 28)
	_bind_header()
	_bind_success_banner()
	_bind_button_guide()
	_bind_summary()
	if _phase == "reward":
		_bind_reward_snapshot()
		_bind_reward_actions()
	else:
		_bind_handoff_sections()
		_bind_handoff_actions()

func _clear_container(container: Node) -> void:
	if container == null:
		return
	for child in container.get_children():
		container.remove_child(child)
		child.queue_free()

func _reset_button(button: Button, text: String, primary: bool) -> void:
	if button == null:
		return
	for connection in button.pressed.get_connections():
		button.pressed.disconnect(connection.callable)
	button.text = text
	button.disabled = false
	button.visible = true
	button.custom_minimum_size.y = 48
	if primary:
		PanelStyle.apply_button(button, true)
	else:
		PanelStyle.apply_outline_button(button, CYAN, TEXT_COLOR)
	button.add_theme_font_size_override("font_size", 16)

func _bind_header() -> void:
	_header_section.visible = true
	_header_eyebrow.text = "#DEBRIEF_07X"
	_header_eyebrow.add_theme_font_size_override("font_size", 10)
	_header_eyebrow.add_theme_color_override("font_color", Color(0.42, 0.46, 0.63, 0.72))
	_header_title.text = "MISSION DEBRIEF"
	_header_title.add_theme_font_size_override("font_size", 34)
	_header_title.add_theme_color_override("font_color", TITLE_COLOR)
	var stage := int(RocketsManager.get_mission_stage())
	var hint := "MISSION PARAMETERS FULFILLED. DATA AND RESOURCE RECOVERY COMPLETE."
	var unlock_hint := _stage_hint(stage)
	if unlock_hint != "":
		hint += "  " + unlock_hint.to_upper()
	_header_hint.visible = hint != ""
	_header_hint.text = hint
	_header_hint.add_theme_font_size_override("font_size", 12)
	_header_hint.add_theme_color_override("font_color", TEXT_MUTED)
	_phase_chip.visible = false
	var phase_text := "Reward Pending" if _phase == "reward" and not _reward_resolved else ("Reward Cleared" if _phase == "handoff" else "Mission Summary")
	var phase_color := AMBER if _phase == "reward" and not _reward_resolved else CYAN
	_phase_chip_label.text = phase_text
	_phase_chip_label.add_theme_font_size_override("font_size", 13)
	_phase_chip_label.add_theme_color_override("font_color", phase_color)
	_guide_button.add_theme_font_size_override("font_size", 12)

func _bind_success_banner() -> void:
	_success_banner.visible = true
	_success_banner.add_theme_stylebox_override("panel", _success_banner_style())
	_success_icon.text = "✓"
	_success_icon.add_theme_font_size_override("font_size", 54)
	_success_icon.add_theme_color_override("font_color", Color(0.88, 0.91, 0.98, 1.0))
	_success_title.text = "MISSION\nCOMPLETE"
	_success_title.add_theme_font_size_override("font_size", 28)
	_success_title.add_theme_color_override("font_color", TITLE_COLOR)
	_success_detail.text = "Return trajectory complete. Cargo and findings are ready for review."
	_success_detail.add_theme_font_size_override("font_size", 13)
	_success_detail.add_theme_color_override("font_color", TEXT_MUTED)

func _bind_button_guide() -> void:
	_guide_card.visible = _guide_visible
	_guide_card.add_theme_stylebox_override("panel", PanelStyle.create_glass_card_style(Color(0.08, 0.12, 0.19, 0.98), 0.56, 12, 18, 14))
	var header: Label = _guide_card.get_node("Content/HeaderLabel")
	header.text = "Debrief Controls"
	header.add_theme_font_size_override("font_size", 14)
	header.add_theme_color_override("font_color", CYAN)
	_guide_footer.visible = false
	_clear_container(_guide_rows)
	if not _guide_visible:
		return
	for line in _build_button_guide_text().split("\n", false):
		var item: Label = MissionDebriefBulletRowScene.instantiate()
		item.text = "• %s" % line
		item.add_theme_color_override("font_color", TEXT_COLOR)
		item.add_theme_font_size_override("font_size", 14)
		_guide_rows.add_child(item)

func _bind_summary() -> void:
	_manifest_card.visible = true
	_manifest_card.add_theme_stylebox_override("panel", _soft_card_style())
	var header: Label = _manifest_card.get_node("Margin/Content/HeaderLabel")
	header.add_theme_font_size_override("font_size", 16)
	header.add_theme_color_override("font_color", Color(0.72, 0.76, 0.88, 0.96))
	var separator: HSeparator = _manifest_card.get_node("Margin/Content/Separator")
	separator.add_theme_color_override("separator", Color(0.52, 0.56, 0.68, 0.30))
	for path in [
		"Margin/Content/Rows/TargetRow/TargetKey",
		"Margin/Content/Rows/ContractorRow/ContractorKey",
		"Margin/Content/Rows/VesselRow/VesselKey",
		"Margin/Content/Rows/DurationRow/DurationKey"
	]:
		var key_label := _manifest_card.get_node(path) as Label
		key_label.add_theme_font_size_override("font_size", 14)
		key_label.add_theme_color_override("font_color", TEXT_MUTED)
	for value_label in [_manifest_target_value, _manifest_contractor_value, _manifest_vessel_value, _manifest_duration_value]:
		value_label.add_theme_font_size_override("font_size", 15)
		value_label.add_theme_color_override("font_color", TEXT_COLOR)
		value_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_manifest_target_value.text = str(_returned.get("label", str(_returned.get("target_id", "Unknown"))))
	_manifest_contractor_value.text = _contractor_name if _contractor_name != "" else "Mission Control"
	var rocket_id := str(_returned.get("rocket_id", ""))
	_manifest_vessel_value.text = RocketSpecs.get_display_name(rocket_id) if rocket_id != "" else "—"
	_manifest_duration_value.text = _format_manifest_duration(rocket_id)

func _bind_reward_snapshot() -> void:
	_payout_card.visible = true
	_phase_card.visible = false
	_actions_card.visible = true
	_combined_cargo_card.visible = true
	_findings_card.visible = true
	_payout_card.add_theme_stylebox_override("panel", _highlight_card_style())
	var payout_label: Label = _payout_card.get_node("Content/Label")
	payout_label.text = "NET PAYOUT"
	payout_label.add_theme_font_size_override("font_size", 14)
	payout_label.add_theme_color_override("font_color", TEXT_COLOR)
	var payout_value: Label = _payout_card.get_node("Content/Value")
	payout_value.text = "[ %s F ]" % NumberFormat.commas(str(_payout))
	payout_value.add_theme_font_size_override("font_size", 28)
	payout_value.add_theme_color_override("font_color", TITLE_COLOR)
	_bind_findings_card()
	_bind_recovery_chips()
	_bind_combined_cargo_card()

func _bind_recovery_chips() -> void:
	var chip_labels: Array[Label] = [
		_recovery_primary_chip.get_node("Label") as Label,
		_recovery_secondary_chip.get_node("Label") as Label
	]
	var chips: Array[PanelContainer] = [_recovery_primary_chip, _recovery_secondary_chip]
	for chip in chips:
		chip.visible = false
	var chip_entries: Array = []
	if not _requested.is_empty():
		var req_keys := _requested.keys()
		req_keys.sort_custom(func(a, b): return int(_requested.get(a, 0)) > int(_requested.get(b, 0)))
		for mineral in req_keys:
			var need := int(_requested.get(mineral, 0))
			if need > 0:
				chip_entries.append("%s: %dT" % [str(mineral).to_upper(), need])
	else:
		var cargo_keys := _cargo.keys()
		cargo_keys.sort_custom(func(a, b): return int(_cargo.get(a, 0)) > int(_cargo.get(b, 0)))
		for mineral in cargo_keys:
			var amount := int(_cargo.get(mineral, 0))
			if amount > 0:
				chip_entries.append("%s: %dT" % [str(mineral).to_upper(), amount])
	for idx in range(min(chip_entries.size(), chips.size())):
		chips[idx].visible = true
		chip_labels[idx].text = str(chip_entries[idx])
		chip_labels[idx].add_theme_font_size_override("font_size", 12)
		chip_labels[idx].add_theme_color_override("font_color", TEXT_COLOR)

func _bind_combined_cargo_card() -> void:
	_combined_cargo_card.add_theme_stylebox_override("panel", _soft_card_style())
	var header: Label = _combined_cargo_card.get_node("Margin/Content/HeaderLabel")
	var rows: VBoxContainer = _combined_cargo_card.get_node("Margin/Content/Rows")
	var footer: Label = _combined_cargo_card.get_node("Margin/Content/FooterLabel")
	rows.add_theme_constant_override("separation", 10)
	_clear_container(rows)
	footer.visible = false
	if _cargo.is_empty():
		header.text = "RECOVERY REPORT"
		header.add_theme_font_size_override("font_size", 17)
		header.add_theme_color_override("font_color", CYAN)
		var empty := Label.new()
		empty.text = "No minerals collected."
		empty.add_theme_font_size_override("font_size", 17)
		empty.add_theme_color_override("font_color", TEXT_COLOR)
		rows.add_child(empty)
		return
	if not _requested.is_empty():
		header.text = "RECOVERY REPORT"
		header.add_theme_font_size_override("font_size", 17)
		header.add_theme_color_override("font_color", AMBER)
		var all_met := true
		var req_keys := _requested.keys()
		req_keys.sort()
		for mineral in req_keys:
			var need := int(_requested.get(mineral, 0))
			var have := int(_cargo.get(str(mineral), 0))
			var done := have >= need
			if not done:
				all_met = false
			var row: HBoxContainer = ResourceValueRowScene.instantiate()
			rows.add_child(row)
			var name_lbl: Label = row.get_node("NameLabel")
			name_lbl.text = "%s  %s" % ["✓" if done else "—", str(mineral).capitalize()]
			name_lbl.add_theme_font_size_override("font_size", 18)
			name_lbl.add_theme_color_override("font_color", GREEN if done else TEXT_COLOR)
			var qty_lbl: Label = row.get_node("ValueLabel")
			qty_lbl.text = "%d / %d kg" % [have, need]
			qty_lbl.add_theme_font_size_override("font_size", 18)
			qty_lbl.add_theme_color_override("font_color", GREEN if done else RED)
			qty_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
		for mineral in _cargo.keys():
			if _requested.has(mineral):
				continue
			var amt := int(_cargo.get(mineral, 0))
			if amt <= 0:
				continue
			var row: HBoxContainer = ResourceValueRowScene.instantiate()
			rows.add_child(row)
			var name_lbl: Label = row.get_node("NameLabel")
			name_lbl.text = str(mineral).capitalize()
			name_lbl.add_theme_font_size_override("font_size", 18)
			name_lbl.add_theme_color_override("font_color", TEXT_COLOR)
			var qty_lbl: Label = row.get_node("ValueLabel")
			qty_lbl.text = "%d kg" % amt
			qty_lbl.add_theme_font_size_override("font_size", 18)
			qty_lbl.add_theme_color_override("font_color", CYAN)
			qty_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
		footer.visible = true
		footer.text = "Order filled — bonus applied." if all_met else "Partial order — standard payout."
		footer.add_theme_font_size_override("font_size", 16)
		footer.add_theme_color_override("font_color", GREEN if all_met else AMBER)
	else:
		header.text = "RECOVERY REPORT"
		header.add_theme_font_size_override("font_size", 17)
		header.add_theme_color_override("font_color", CYAN)
		var cargo_keys := _cargo.keys()
		cargo_keys.sort_custom(func(a, b): return int(_cargo.get(a, 0)) > int(_cargo.get(b, 0)))
		for mineral in cargo_keys:
			var amt := int(_cargo.get(mineral, 0))
			if amt <= 0:
				continue
			var row: HBoxContainer = ResourceValueRowScene.instantiate()
			rows.add_child(row)
			var name_lbl: Label = row.get_node("NameLabel")
			name_lbl.text = str(mineral).capitalize()
			name_lbl.add_theme_font_size_override("font_size", 18)
			name_lbl.add_theme_color_override("font_color", TEXT_COLOR)
			var qty_lbl: Label = row.get_node("ValueLabel")
			qty_lbl.text = "%d kg" % amt
			qty_lbl.add_theme_font_size_override("font_size", 18)
			qty_lbl.add_theme_color_override("font_color", CYAN)
			qty_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT

func _bind_findings_card() -> void:
	_findings_card.visible = true
	_findings_card.add_theme_stylebox_override("panel", _soft_card_style())
	var header: Label = _findings_card.get_node("Margin/Content/HeaderLabel")
	var rows: VBoxContainer = _findings_card.get_node("Margin/Content/Rows")
	var footer: Label = _findings_card.get_node("Margin/Content/FooterLabel")
	header.text = "FINDINGS & PROGRESSION"
	header.text = "SCAN INTEGRITY: 100%"
	header.add_theme_font_size_override("font_size", 16)
	header.add_theme_color_override("font_color", TITLE_COLOR)
	_clear_container(rows)
	footer.visible = true
	footer.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	footer.add_theme_font_size_override("font_size", 13)
	footer.add_theme_color_override("font_color", TEXT_MUTED)

	var order_row: HBoxContainer = MissionDebriefDetailRowScene.instantiate()
	rows.add_child(order_row)
	(order_row.get_node("KeyLabel") as Label).text = "Rank achieved"
	(order_row.get_node("ValueLabel") as Label).text = "%d%%" % int(round(_order_ratio * 100.0))

	var payout_row: HBoxContainer = MissionDebriefDetailRowScene.instantiate()
	rows.add_child(payout_row)
	(payout_row.get_node("KeyLabel") as Label).text = "Reward status"
	(payout_row.get_node("ValueLabel") as Label).text = "Pending cargo resolution" if not _reward_resolved else "Payout delivered"

	var unlock_row: HBoxContainer = MissionDebriefDetailRowScene.instantiate()
	rows.add_child(unlock_row)
	(unlock_row.get_node("KeyLabel") as Label).text = "Next unlock"
	(unlock_row.get_node("ValueLabel") as Label).text = str(_next_mission_brief.get("title", "Next mission ready"))

	for row in [order_row, payout_row, unlock_row]:
		var key := row.get_node("KeyLabel") as Label
		var value := row.get_node("ValueLabel") as Label
		key.add_theme_font_size_override("font_size", 15)
		key.add_theme_color_override("font_color", TEXT_MUTED)
		value.add_theme_font_size_override("font_size", 15)
		value.add_theme_color_override("font_color", TEXT_COLOR)
	footer.text = str(_next_mission_brief.get("note", _stage_hint(int(RocketsManager.get_mission_stage()))))

func _bind_reward_actions() -> void:
	_reset_button(_primary_action_button, "Next Mission →", false)
	_primary_action_button.name = "CompleteButton"
	_primary_action_button.custom_minimum_size.x = 220
	_primary_action_button.disabled = not _reward_resolved
	if not _primary_action_button.disabled:
		_primary_action_button.pressed.connect(_on_complete_pressed)
	else:
		_primary_action_button.add_theme_color_override("font_disabled_color", TEXT_MUTED)
	if not _cargo.is_empty():
		var label := "₣ Sell Cargo to %s" % _contractor_name if _contractor_name != "" else "₣ Sell Cargo"
		_reset_button(_secondary_action_button, label, true)
		_secondary_action_button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		_secondary_action_button.pressed.connect(_on_sell_pressed.bind(_secondary_action_button))
		_secondary_action_button.visible = true
	else:
		_secondary_action_button.visible = false
	_reset_button(_tertiary_action_button, "Return to Base", false)
	_tertiary_action_button.name = "OrbitButton"
	_tertiary_action_button.custom_minimum_size.x = 170
	_tertiary_action_button.pressed.connect(_return_to_base)
	_tertiary_action_button.visible = true

func _bind_handoff_sections() -> void:
	_payout_card.visible = false
	_combined_cargo_card.visible = false
	_phase_card.visible = true
	_findings_card.visible = true
	_bind_findings_card()
	_phase_card.add_theme_stylebox_override("panel", _soft_card_style())
	var header: Label = _phase_card.get_node("Margin/Content/HeaderLabel")
	var rows: VBoxContainer = _phase_card.get_node("Margin/Content/Rows")
	var footer: Label = _phase_card.get_node("Margin/Content/FooterLabel")
	_clear_container(rows)
	footer.visible = false
	if _reward_resolved:
		header.text = "NEXT MISSION"
		header.add_theme_font_size_override("font_size", 12)
		header.add_theme_color_override("font_color", CYAN)
		var title := Label.new()
		title.text = str(_next_mission_brief.get("title", "Your next mission is ready"))
		title.add_theme_font_size_override("font_size", 22)
		title.add_theme_color_override("font_color", TITLE_COLOR)
		rows.add_child(title)
		for pair in [
			["Location", str(_next_mission_brief.get("location", "Earth Launchpad"))],
			["Contractor", str(_next_mission_brief.get("contractor", "Mission Control"))],
			["Mission", str(_next_mission_brief.get("objective", "Prepare the next launch."))]
		]:
			var row: HBoxContainer = MissionDebriefDetailRowScene.instantiate()
			rows.add_child(row)
			var key: Label = row.get_node("KeyLabel")
			key.text = pair[0]
			key.add_theme_font_size_override("font_size", 15)
			key.add_theme_color_override("font_color", TEXT_MUTED)
			var value: Label = row.get_node("ValueLabel")
			value.text = pair[1]
			value.add_theme_font_size_override("font_size", 15)
			value.add_theme_color_override("font_color", TEXT_COLOR)
		footer.visible = true
		footer.text = str(_next_mission_brief.get("note", "Open the launchpad to continue the loop."))
		footer.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		footer.add_theme_font_size_override("font_size", 14)
		footer.add_theme_color_override("font_color", AMBER)
	else:
		header.text = "REWARD CONFIRMED"
		header.add_theme_font_size_override("font_size", 12)
		header.add_theme_color_override("font_color", AMBER)
		var payout_lbl := Label.new()
		payout_lbl.text = "Payout delivered: +%s F" % NumberFormat.commas(str(_payout))
		payout_lbl.add_theme_font_size_override("font_size", 24)
		payout_lbl.add_theme_color_override("font_color", GREEN)
		rows.add_child(payout_lbl)
		footer.visible = true
		footer.text = "Mission closed. Choose the next destination before leaving debrief."
		footer.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		footer.add_theme_font_size_override("font_size", 14)
		footer.add_theme_color_override("font_color", TEXT_MUTED)

func _bind_handoff_actions() -> void:
	_actions_card.visible = true
	_reset_button(_primary_action_button, _primary_handoff_action_label(), true)
	_primary_action_button.name = "CompleteButton"
	_primary_action_button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_primary_action_button.pressed.connect(_on_primary_handoff_pressed)
	_reset_button(_secondary_action_button, "Scrap / Salvage Ship  (+%s F)" % NumberFormat.commas(str(_salvage_refund)), false)
	_secondary_action_button.custom_minimum_size.x = 280
	_secondary_action_button.disabled = _salvage_applied or _salvage_refund <= 0
	if not _secondary_action_button.disabled:
		_secondary_action_button.pressed.connect(_on_salvage_pressed.bind(_secondary_action_button))
	if _should_show_return_to_base_action():
		_reset_button(_tertiary_action_button, "Return to Base", false)
		_tertiary_action_button.name = "OrbitButton"
		_tertiary_action_button.custom_minimum_size.x = 170
		_tertiary_action_button.pressed.connect(_return_to_base)
		_tertiary_action_button.visible = true
	else:
		_tertiary_action_button.visible = false


func _build_empty_ui() -> void:
	_background.color = PANEL_BG
	_panel.visible = false
	_empty_state.visible = true
	PanelStyle.apply_muted_on_dark(_empty_label)
	_empty_label.add_theme_font_size_override("font_size", 18)
	var empty_btn := _empty_button
	empty_btn.custom_minimum_size = Vector2(220, 52)
	PanelStyle.apply_outline_button(empty_btn, CYAN, TEXT_COLOR)
	empty_btn.add_theme_font_size_override("font_size", 18)


func _add_sep(vbox: VBoxContainer, color: Color) -> void:
	var sep := HSeparator.new()
	sep.add_theme_color_override("separator", Color(color.r, color.g, color.b, 0.28))
	vbox.add_child(sep)


func _add_header(vbox: VBoxContainer) -> void:
	var shell := VBoxContainer.new()
	shell.add_theme_constant_override("separation", 10)
	vbox.add_child(shell)

	var row := HBoxContainer.new()
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_theme_constant_override("separation", 12)
	shell.add_child(row)

	var col := VBoxContainer.new()
	col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	col.add_theme_constant_override("separation", 2)
	row.add_child(col)

	var eyebrow := Label.new()
	eyebrow.text = "MISSION COMPLETE"
	eyebrow.add_theme_font_size_override("font_size", 14)
	eyebrow.add_theme_color_override("font_color", CYAN)
	col.add_child(eyebrow)

	var title := Label.new()
	title.name = "Title"
	title.text = "◎ Debrief"
	title.add_theme_font_size_override("font_size", 30)
	title.add_theme_color_override("font_color", TITLE_COLOR)
	col.add_child(title)

	var stage := int(RocketsManager.get_mission_stage())
	var hint := _stage_hint(stage)
	if hint != "":
		var hint_lbl := Label.new()
		hint_lbl.text = hint
		hint_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		hint_lbl.add_theme_font_size_override("font_size", 14)
		hint_lbl.add_theme_color_override("font_color", AMBER)
		col.add_child(hint_lbl)

	var controls := HBoxContainer.new()
	controls.alignment = BoxContainer.ALIGNMENT_END
	controls.add_theme_constant_override("separation", 10)
	row.add_child(controls)

	var phase_chip := _make_header_chip("Reward Pending" if _phase == "reward" and not _reward_resolved else ("Reward Cleared" if _phase == "handoff" else "Mission Summary"), AMBER if _phase == "reward" and not _reward_resolved else CYAN)
	controls.add_child(phase_chip)

	var guide_btn := _make_button("Guide", false)
	guide_btn.custom_minimum_size = Vector2(112, 42)
	guide_btn.add_theme_font_size_override("font_size", 15)
	guide_btn.pressed.connect(_toggle_button_guide)
	controls.add_child(guide_btn)

	_add_sep(shell, CYAN)


func _add_button_guide(vbox: VBoxContainer) -> void:
	var panel := PanelContainer.new()
	var style := PanelStyle.create_glass_card_style(Color(0.08, 0.12, 0.19, 0.98), 0.56, 12, 18, 14)
	panel.add_theme_stylebox_override("panel", style)
	vbox.add_child(panel)

	var body := VBoxContainer.new()
	body.add_theme_constant_override("separation", 6)
	panel.add_child(body)

	var title := Label.new()
	title.text = "Debrief Controls"
	title.add_theme_font_size_override("font_size", 14)
	title.add_theme_color_override("font_color", CYAN)
	body.add_child(title)

	for line in _build_button_guide_text().split("\n", false):
		var item := Label.new()
		item.text = "• %s" % line
		item.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		item.add_theme_color_override("font_color", TEXT_COLOR)
		item.add_theme_font_size_override("font_size", 14)
		body.add_child(item)


func _build_button_guide_text() -> String:
	var entries: Array[String] = []
	if _phase == "reward":
		if not _cargo.is_empty():
			entries.append("Sell Cargo: Convert this run's cargo into francs and lock in the payout.")
		entries.append("Next Mission: Move from reward resolution into the next-mission briefing.")
		if not _reward_resolved:
			entries.append("Next Mission stays locked until the cargo payout is resolved.")
	else:
		entries.append("%s: %s" % [_primary_handoff_action_label().trim_suffix(" →"), _primary_handoff_action_description()])
		if _salvage_refund > 0:
			entries.append("Scrap / Salvage Ship: Retire this ship now and receive the listed salvage refund.")
		else:
			entries.append("Scrap / Salvage Ship: No salvage value is available for this ship on this run.")
		if _should_show_return_to_base_action():
			entries.append("Return to Base: Leave debrief and go back to Earth base without opening launchpad.")
	return "\n".join(entries)


func _add_summary(vbox: VBoxContainer) -> void:
	var target_label := str(_returned.get("label", str(_returned.get("target_id", "Unknown"))))
	var rocket_id    := str(_returned.get("rocket_id", ""))
	var vp_w := get_viewport().get_visible_rect().size.x if get_viewport() else 1280.0
	var grid := GridContainer.new()
	grid.columns = 1 if vp_w < 900.0 else 3
	grid.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	grid.add_theme_constant_override("h_separation", 12)
	grid.add_theme_constant_override("v_separation", 12)
	vbox.add_child(grid)

	_add_summary_card(grid, "◎", "Target", target_label)
	_add_summary_card(grid, "▲", "Rocket", RocketSpecs.get_display_name(rocket_id) if rocket_id != "" else "—")
	_add_summary_card(grid, "◆", "Contractor", _contractor_name if _contractor_name != "" else "—")

func _add_summary_card(grid: GridContainer, icon_text: String, label_text: String, value_text: String) -> void:
	var card: PanelContainer = SummaryCardScene.instantiate()
	card.add_theme_stylebox_override("panel", _soft_card_style())
	grid.add_child(card)
	var icon: Label = card.get_node("Row/IconLabel")
	icon.text = icon_text
	icon.add_theme_font_size_override("font_size", 22)
	icon.add_theme_color_override("font_color", CYAN)
	var k: Label = card.get_node("Row/Content/KeyLabel")
	k.text = label_text
	k.add_theme_font_size_override("font_size", 13)
	k.add_theme_color_override("font_color", TEXT_MUTED)
	var v: Label = card.get_node("Row/Content/ValueLabel")
	v.text = value_text
	v.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	v.add_theme_font_size_override("font_size", 18)
	v.add_theme_color_override("font_color", TEXT_COLOR)

func _add_reward_snapshot(vbox: VBoxContainer) -> void:
	vbox.add_child(_build_payout_card())
	vbox.add_child(_build_combined_cargo_card())

func _build_goal_card() -> PanelContainer:
	var card: PanelContainer = SectionCardScene.instantiate()
	card.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	card.add_theme_stylebox_override("panel", _soft_card_style())
	var col: VBoxContainer = card.get_node("Content")
	var header: Label = card.get_node("Content/HeaderLabel")
	header.text = "◎ Goal"
	header.add_theme_font_size_override("font_size", 15)
	header.add_theme_color_override("font_color", AMBER)
	var rows: VBoxContainer = card.get_node("Content/Rows")

	var all_met := true
	var keys := _requested.keys()
	keys.sort()
	for mineral in keys:
		var need := int(_requested.get(mineral, 0))
		var have := int(_cargo.get(str(mineral), 0))
		var done := have >= need
		if not done:
			all_met = false
		var row: HBoxContainer = ResourceValueRowScene.instantiate()
		rows.add_child(row)
		var name_lbl: Label = row.get_node("NameLabel")
		name_lbl.text = "%s %s" % ["✓" if done else "•", str(mineral).capitalize()]
		name_lbl.add_theme_font_size_override("font_size", 16)
		name_lbl.add_theme_color_override("font_color", GREEN if done else TEXT_COLOR)
		var qty_lbl: Label = row.get_node("ValueLabel")
		qty_lbl.text = "%d/%d kg" % [have, need]
		qty_lbl.add_theme_font_size_override("font_size", 16)
		qty_lbl.add_theme_color_override("font_color", GREEN if done else RED)
		var value_align := qty_lbl
		value_align.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT

	var verdict: Label = card.get_node("Content/FooterLabel")
	verdict.visible = true
	verdict.text = "Bonus payout ready." if all_met else "Partial order. Standard payout."
	verdict.add_theme_font_size_override("font_size", 14)
	verdict.add_theme_color_override("font_color", GREEN if all_met else TEXT_MUTED)
	return card

func _build_cargo_card() -> PanelContainer:
	var card: PanelContainer = SectionCardScene.instantiate()
	card.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	card.add_theme_stylebox_override("panel", _soft_card_style())
	var header: Label = card.get_node("Content/HeaderLabel")
	header.text = "◌ Cargo"
	header.add_theme_font_size_override("font_size", 15)
	header.add_theme_color_override("font_color", CYAN)
	var rows: VBoxContainer = card.get_node("Content/Rows")
	var footer: Label = card.get_node("Content/FooterLabel")

	if _cargo.is_empty():
		var empty := Label.new()
		empty.text = "No minerals collected."
		empty.add_theme_font_size_override("font_size", 16)
		empty.add_theme_color_override("font_color", TEXT_MUTED)
		rows.add_child(empty)
		return card

	var keys := _cargo.keys()
	keys.sort_custom(func(a, b): return int(_cargo.get(a, 0)) > int(_cargo.get(b, 0)))
	var visible_count := mini(keys.size(), 4)
	for idx in range(visible_count):
		var mineral = keys[idx]
		var amt := int(_cargo.get(mineral, 0))
		if amt <= 0:
			continue
		var row: HBoxContainer = ResourceValueRowScene.instantiate()
		rows.add_child(row)
		var name_lbl: Label = row.get_node("NameLabel")
		name_lbl.text = str(mineral).capitalize()
		name_lbl.add_theme_font_size_override("font_size", 15)
		name_lbl.add_theme_color_override("font_color", TEXT_COLOR)
		var qty_lbl: Label = row.get_node("ValueLabel")
		qty_lbl.text = "%d kg" % amt
		qty_lbl.add_theme_font_size_override("font_size", 15)
		qty_lbl.add_theme_color_override("font_color", CYAN)
		qty_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT

	if keys.size() > visible_count:
		footer.visible = true
		footer.text = "+%d more mineral types" % (keys.size() - visible_count)
		footer.add_theme_font_size_override("font_size", 14)
		footer.add_theme_color_override("font_color", TEXT_MUTED)
	return card

func _build_payout_card() -> PanelContainer:
	var card: PanelContainer = PayoutCardScene.instantiate()
	card.add_theme_stylebox_override("panel", _highlight_card_style())
	card.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var label: Label = card.get_node("Content/Label")
	label.text = "₣ PAYOUT"
	label.add_theme_font_size_override("font_size", 12)
	label.add_theme_color_override("font_color", AMBER)
	var value: Label = card.get_node("Content/Value")
	value.text = "+%s F" % NumberFormat.commas(str(_payout))
	value.add_theme_font_size_override("font_size", 36)
	value.add_theme_color_override("font_color", GREEN)
	var content := card.get_node("Content") as VBoxContainer
	content.add_theme_constant_override("separation", 4)
	return card


func _build_combined_cargo_card() -> PanelContainer:
	var card: PanelContainer = SectionCardScene.instantiate()
	card.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	card.add_theme_stylebox_override("panel", _soft_card_style())
	var header: Label = card.get_node("Content/HeaderLabel")
	var rows: VBoxContainer = card.get_node("Content/Rows")
	rows.add_theme_constant_override("separation", 10)
	var footer: Label = card.get_node("Content/FooterLabel")

	if _cargo.is_empty():
		header.text = "◌ Cargo"
		header.add_theme_font_size_override("font_size", 17)
		header.add_theme_color_override("font_color", CYAN)
		var empty := Label.new()
		empty.text = "No minerals collected."
		empty.add_theme_font_size_override("font_size", 17)
		empty.add_theme_color_override("font_color", TEXT_COLOR)
		rows.add_child(empty)
		return card

	if not _requested.is_empty():
		header.text = "◎ Cargo & Order"
		header.add_theme_font_size_override("font_size", 17)
		header.add_theme_color_override("font_color", AMBER)
		var all_met := true
		var req_keys := _requested.keys()
		req_keys.sort()
		for mineral in req_keys:
			var need := int(_requested.get(mineral, 0))
			var have := int(_cargo.get(str(mineral), 0))
			var done := have >= need
			if not done:
				all_met = false
			var row: HBoxContainer = ResourceValueRowScene.instantiate()
			rows.add_child(row)
			var name_lbl: Label = row.get_node("NameLabel")
			name_lbl.text = "%s  %s" % ["✓" if done else "—", str(mineral).capitalize()]
			name_lbl.add_theme_font_size_override("font_size", 18)
			name_lbl.add_theme_color_override("font_color", GREEN if done else TEXT_COLOR)
			var qty_lbl: Label = row.get_node("ValueLabel")
			qty_lbl.text = "%d / %d kg" % [have, need]
			qty_lbl.add_theme_font_size_override("font_size", 18)
			qty_lbl.add_theme_color_override("font_color", GREEN if done else RED)
			qty_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
		for mineral in _cargo.keys():
			if _requested.has(mineral):
				continue
			var amt := int(_cargo.get(mineral, 0))
			if amt <= 0:
				continue
			var row: HBoxContainer = ResourceValueRowScene.instantiate()
			rows.add_child(row)
			var name_lbl: Label = row.get_node("NameLabel")
			name_lbl.text = str(mineral).capitalize()
			name_lbl.add_theme_font_size_override("font_size", 18)
			name_lbl.add_theme_color_override("font_color", TEXT_COLOR)
			var qty_lbl: Label = row.get_node("ValueLabel")
			qty_lbl.text = "%d kg" % amt
			qty_lbl.add_theme_font_size_override("font_size", 18)
			qty_lbl.add_theme_color_override("font_color", CYAN)
			qty_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
		footer.visible = true
		footer.text = "Order filled — bonus applied." if all_met else "Partial order — standard payout."
		footer.add_theme_font_size_override("font_size", 16)
		footer.add_theme_color_override("font_color", GREEN if all_met else AMBER)
	else:
		header.text = "◌ Cargo"
		header.add_theme_font_size_override("font_size", 17)
		header.add_theme_color_override("font_color", CYAN)
		var cargo_keys := _cargo.keys()
		cargo_keys.sort_custom(func(a, b): return int(_cargo.get(a, 0)) > int(_cargo.get(b, 0)))
		for mineral in cargo_keys:
			var amt := int(_cargo.get(mineral, 0))
			if amt <= 0:
				continue
			var row: HBoxContainer = ResourceValueRowScene.instantiate()
			rows.add_child(row)
			var name_lbl: Label = row.get_node("NameLabel")
			name_lbl.text = str(mineral).capitalize()
			name_lbl.add_theme_font_size_override("font_size", 18)
			name_lbl.add_theme_color_override("font_color", TEXT_COLOR)
			var qty_lbl: Label = row.get_node("ValueLabel")
			qty_lbl.text = "%d kg" % amt
			qty_lbl.add_theme_font_size_override("font_size", 18)
			qty_lbl.add_theme_color_override("font_color", CYAN)
			qty_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	return card


func _add_goal_section(vbox: VBoxContainer) -> void:
	var header := Label.new()
	header.text = "MISSION GOAL"
	header.add_theme_font_size_override("font_size", 15)
	header.add_theme_color_override("font_color", AMBER)
	vbox.add_child(header)

	var all_met := true
	var keys := _requested.keys()
	keys.sort()
	for mineral in keys:
		var need := int(_requested.get(mineral, 0))
		var have := int(_cargo.get(str(mineral), 0))
		var done := have >= need
		if not done:
			all_met = false

		var row := HBoxContainer.new()
		row.add_theme_constant_override("separation", 8)
		vbox.add_child(row)

		var name_lbl := Label.new()
		name_lbl.text = str(mineral).capitalize()
		name_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		name_lbl.add_theme_font_size_override("font_size", 19)
		name_lbl.add_theme_color_override("font_color", TEXT_COLOR)
		row.add_child(name_lbl)

		var qty_lbl := Label.new()
		qty_lbl.text = "%d / %d kg  %s" % [min(have, need), need, "✓" if done else "✗"]
		qty_lbl.add_theme_font_size_override("font_size", 19)
		qty_lbl.add_theme_color_override("font_color", GREEN if done else RED)
		row.add_child(qty_lbl)

	var verdict := Label.new()
	verdict.text = "Order fulfilled — bonus payout applied." if all_met \
		else "Order incomplete — standard payout."
	verdict.add_theme_font_size_override("font_size", 17)
	verdict.add_theme_color_override("font_color", GREEN if all_met else TEXT_MUTED)
	verdict.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	vbox.add_child(verdict)


func _add_cargo_section(vbox: VBoxContainer) -> void:
	var header := Label.new()
	header.text = "CARGO"
	header.add_theme_font_size_override("font_size", 15)
	header.add_theme_color_override("font_color", CYAN)
	vbox.add_child(header)

	if _cargo.is_empty():
		var empty := Label.new()
		empty.text = "No minerals collected."
		empty.add_theme_font_size_override("font_size", 18)
		empty.add_theme_color_override("font_color", TEXT_MUTED)
		vbox.add_child(empty)
		return

	var keys := _cargo.keys()
	keys.sort()
	for mineral in keys:
		var amt := int(_cargo.get(mineral, 0))
		if amt <= 0:
			continue
		var row := HBoxContainer.new()
		row.add_theme_constant_override("separation", 8)
		vbox.add_child(row)
		var name_lbl := Label.new()
		name_lbl.text = str(mineral).capitalize()
		name_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		name_lbl.add_theme_font_size_override("font_size", 16)
		name_lbl.add_theme_color_override("font_color", TEXT_COLOR)
		row.add_child(name_lbl)
		var qty_lbl := Label.new()
		qty_lbl.text = "%d kg" % amt
		qty_lbl.add_theme_font_size_override("font_size", 16)
		qty_lbl.add_theme_color_override("font_color", CYAN)
		row.add_child(qty_lbl)


func _add_reward_actions(vbox: VBoxContainer) -> void:
	var acts := HBoxContainer.new()
	acts.add_theme_constant_override("separation", 10)
	acts.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	vbox.add_child(acts)

	if not _cargo.is_empty():
		var label := "₣ Sell Cargo to %s" % _contractor_name \
			if _contractor_name != "" \
			else "₣ Sell Cargo"
		var sell_btn := _make_button(label, true)
		sell_btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		sell_btn.pressed.connect(_on_sell_pressed.bind(sell_btn))
		acts.add_child(sell_btn)

	var complete_btn := _make_button("Next Mission →", false)
	complete_btn.name = "CompleteButton"
	complete_btn.custom_minimum_size = Vector2(220, 0)
	complete_btn.disabled = not _reward_resolved
	if not complete_btn.disabled:
		complete_btn.pressed.connect(_on_complete_pressed)
	else:
		complete_btn.add_theme_color_override("font_disabled_color", TEXT_MUTED)
	acts.add_child(complete_btn)

	var orbit_btn := _make_button("Return to Base", false)
	orbit_btn.name = "OrbitButton"
	orbit_btn.custom_minimum_size = Vector2(170, 0)
	orbit_btn.pressed.connect(_return_to_base)
	acts.add_child(orbit_btn)


func _add_reward_feedback(vbox: VBoxContainer) -> void:
	var card := PanelContainer.new()
	card.add_theme_stylebox_override("panel", _soft_card_style())
	vbox.add_child(card)

	var body := VBoxContainer.new()
	body.add_theme_constant_override("separation", 6)
	card.add_child(body)

	var header := Label.new()
	header.text = "REWARD CONFIRMED"
	header.add_theme_font_size_override("font_size", 12)
	header.add_theme_color_override("font_color", AMBER)
	body.add_child(header)

	var payout_lbl := Label.new()
	payout_lbl.text = "Payout delivered: +%s F" % NumberFormat.commas(str(_payout))
	payout_lbl.add_theme_font_size_override("font_size", 24)
	payout_lbl.add_theme_color_override("font_color", GREEN)
	body.add_child(payout_lbl)

	var feedback := Label.new()
	feedback.text = "Mission closed. Choose the next destination before leaving debrief."
	feedback.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	feedback.add_theme_font_size_override("font_size", 14)
	feedback.add_theme_color_override("font_color", TEXT_MUTED)
	body.add_child(feedback)


func _add_next_mission_handoff(vbox: VBoxContainer) -> void:
	var card := PanelContainer.new()
	card.add_theme_stylebox_override("panel", _soft_card_style())
	vbox.add_child(card)

	var col := VBoxContainer.new()
	col.add_theme_constant_override("separation", 10)
	card.add_child(col)

	var header := Label.new()
	header.text = "NEXT MISSION"
	header.add_theme_font_size_override("font_size", 12)
	header.add_theme_color_override("font_color", CYAN)
	col.add_child(header)

	var title := Label.new()
	title.text = str(_next_mission_brief.get("title", "Your next mission is ready"))
	title.add_theme_font_size_override("font_size", 22)
	title.add_theme_color_override("font_color", TITLE_COLOR)
	col.add_child(title)

	for pair in [
		["Location", str(_next_mission_brief.get("location", "Earth Launchpad"))],
		["Contractor", str(_next_mission_brief.get("contractor", "Mission Control"))],
		["Mission", str(_next_mission_brief.get("objective", "Prepare the next launch."))]
	]:
		var row := HBoxContainer.new()
		row.add_theme_constant_override("separation", 12)
		col.add_child(row)
		var key := Label.new()
		key.text = pair[0]
		key.custom_minimum_size = Vector2(120, 0)
		key.add_theme_font_size_override("font_size", 15)
		key.add_theme_color_override("font_color", TEXT_MUTED)
		row.add_child(key)
		var value := Label.new()
		value.text = pair[1]
		value.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		value.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		value.add_theme_font_size_override("font_size", 15)
		value.add_theme_color_override("font_color", TEXT_COLOR)
		row.add_child(value)

	var note := Label.new()
	note.text = str(_next_mission_brief.get("note", "Open the launchpad to continue the loop."))
	note.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	note.add_theme_font_size_override("font_size", 14)
	note.add_theme_color_override("font_color", AMBER)
	col.add_child(note)


func _add_handoff_actions(vbox: VBoxContainer) -> void:
	var shell := PanelContainer.new()
	shell.add_theme_stylebox_override("panel", _soft_card_style())
	vbox.add_child(shell)

	var dock := VBoxContainer.new()
	dock.add_theme_constant_override("separation", 10)
	shell.add_child(dock)

	var acts := HBoxContainer.new()
	acts.add_theme_constant_override("separation", 10)
	acts.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	dock.add_child(acts)

	var primary_btn := _make_button(_primary_handoff_action_label(), true)
	primary_btn.name = "CompleteButton"
	primary_btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	primary_btn.pressed.connect(_on_primary_handoff_pressed)
	acts.add_child(primary_btn)

	var salvage_btn := _make_button(
		"Scrap / Salvage Ship  (+%s F)" % NumberFormat.commas(str(_salvage_refund)),
		false
	)
	salvage_btn.custom_minimum_size = Vector2(280, 0)
	salvage_btn.disabled = _salvage_applied or _salvage_refund <= 0
	if not salvage_btn.disabled:
		salvage_btn.pressed.connect(_on_salvage_pressed.bind(salvage_btn))
	acts.add_child(salvage_btn)

	if _should_show_return_to_base_action():
		var return_btn := _make_button("Return to Base", false)
		return_btn.name = "OrbitButton"
		return_btn.custom_minimum_size = Vector2(170, 0)
		return_btn.pressed.connect(_return_to_base)
		acts.add_child(return_btn)

	pass


func _make_button(text: String, primary: bool) -> Button:
	var btn := Button.new()
	btn.text = text
	btn.custom_minimum_size = Vector2(0, 48)
	if primary:
		PanelStyle.apply_button(btn, true)
	else:
		PanelStyle.apply_outline_button(btn, CYAN, TEXT_COLOR)
	btn.add_theme_font_size_override("font_size", 16)
	return btn

func _soft_card_style() -> StyleBoxFlat:
	# Distinctly lighter than panel background so cards are visible
	return PanelStyle.create_glass_card_style(Color(0.14, 0.20, 0.30, 1.0), 0.72, 12, 18, 14)

func _success_banner_style() -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.08, 0.12, 0.19, 0.96)
	style.border_color = Color(CYAN.r, CYAN.g, CYAN.b, 0.52)
	style.border_width_left = 1
	style.border_width_top = 1
	style.border_width_right = 1
	style.border_width_bottom = 1
	style.set_corner_radius_all(14)
	style.shadow_color = Color(CYAN.r, CYAN.g, CYAN.b, 0.16)
	style.shadow_size = 14
	style.shadow_offset = Vector2(0, 3)
	return style

func _highlight_card_style() -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.14, 0.18, 0.26, 1.0)
	style.border_color = Color(AMBER.r, AMBER.g, AMBER.b, 1.0)
	style.border_width_left = 4
	style.border_width_top = 1
	style.border_width_right = 1
	style.border_width_bottom = 1
	style.set_corner_radius_all(12)
	style.shadow_color = Color(AMBER.r, AMBER.g, AMBER.b, 0.18)
	style.shadow_size = 16
	style.shadow_offset = Vector2(0, 4)
	style.content_margin_left = 20
	style.content_margin_right = 20
	style.content_margin_top = 16
	style.content_margin_bottom = 16
	return style

func _make_header_chip(text: String, color: Color) -> PanelContainer:
	var pill := PanelContainer.new()
	pill.add_theme_stylebox_override("panel", PanelStyle.create_glass_pill_style(Color(0.10, 0.15, 0.22, 0.96), 0.46, 9))
	var label := Label.new()
	label.text = text
	label.add_theme_font_size_override("font_size", 13)
	label.add_theme_color_override("font_color", color)
	pill.add_child(label)
	return pill

func _build_payout_breakdown_rows() -> Array[Dictionary]:
	var rows: Array[Dictionary] = []
	var base_value := 0
	for mineral in _cargo.keys():
		base_value += MineralPricing.price_for(str(mineral), int(_cargo.get(mineral, 0)))
	rows.append({"label": "Cargo base value", "amount": base_value})

	var route_total := int(round(float(base_value) * CONTRACTOR_ROUTE_MULT))
	rows.append({"label": "Contractor route uplift", "amount": route_total - base_value})

	var discovered_total := route_total
	var tid := str(_returned.get("target_id", ""))
	if tid != "" and not RocketsManager.has_discovery_bonus_claimed(tid):
		discovered_total = int(round(float(route_total) * DISCOVERY_BONUS_MULT))
		rows.append({"label": "Discovery bonus", "amount": discovered_total - route_total})

	var after_order := discovered_total
	if _contractor_id != "":
		var ord_mult := 1.0 + (ORDER_BONUS_CAP * _order_ratio)
		after_order = int(round(float(discovered_total) * ord_mult))
		rows.append({"label": "Order completion bonus", "amount": after_order - discovered_total})

		var aff_mult: float = 1.0 + min(float(_affinity_before) * AFFINITY_BONUS_PER_POINT, float(AFFINITY_BONUS_CAP))
		var after_affinity := int(round(float(after_order) * aff_mult))
		rows.append({"label": "Affinity bonus", "amount": after_affinity - after_order})
		var adjusted := _payout - after_affinity
		if adjusted > 0:
			rows.append({"label": "Onboarding payout floor", "amount": adjusted})
	else:
		var adjusted := _payout - discovered_total
		if adjusted > 0:
			rows.append({"label": "Onboarding payout floor", "amount": adjusted})
	return rows

func _build_payout_explainer_text() -> String:
	if _reward_resolved:
		return "Cargo has already been resolved. This payout is locked in."
	if _contractor_id == "":
		return "Free Operations payout uses cargo value, discovery bonuses, and early-run calibration when needed."
	return "Payout is built from cargo value, contractor route uplift, order progress, affinity, and any discovery bonus."


func _toggle_button_guide() -> void:
	_guide_visible = not _guide_visible
	_render_ui()


# ---------------------------------------------------------------------------
# Actions
# ---------------------------------------------------------------------------

func _on_sell_pressed(btn: Button) -> void:
	if _done:
		return
	btn.disabled = true
	btn.text = "Sold ✓"

	var app = AppControllerHelper.get_instance()
	var tid := str(_returned.get("target_id", ""))

	RocketsManager.consume_from_inventory(_cargo)
	for mineral in _cargo.keys():
		MineralPricing.record_player_sale(str(mineral))

	if tid != "" and not RocketsManager.has_discovery_bonus_claimed(tid):
		RocketsManager.mark_discovery_bonus_claimed(tid)
	if tid != "":
		SectorRevealManager.reveal_for_target(tid)

	if app:
		var net := _payout
		if app.has_outstanding_loan():
			net = app.repay_loan_from_payout(net)
		app.add_franc_balance(net, "mission_sale")

	if _contractor_id != "" and app:
		SubcontractorManager.add_affinity(_contractor_id, 1)
		SubcontractorManager.record_mission_completion(_contractor_id)

	RocketsManager.clear_trip_contract_offer()
	_clear_cargo(tid)
	_reward_resolved = true
	_render_ui()


func _on_complete_pressed() -> void:
	if _done or not _reward_resolved:
		return
	_resolve_debrief_once()
	_next_mission_brief = _build_next_mission_brief()
	_phase = "handoff"
	_render_ui()


func _resolve_debrief_once() -> void:
	if _debrief_resolved:
		return
	_done = true

	var app    = AppControllerHelper.get_instance()
	var rid    := str(_returned.get("rocket_id", ""))
	var tid    := str(_returned.get("target_id", ""))
	if app:
		_unlock_rockets_on_mission_complete()

	MissionLogManager.add_mission({
		"timestamp":           Time.get_datetime_string_from_system(),
		"rocket_id":           rid,
		"target_id":           tid,
		"label":               str(_returned.get("label", "")),
		"target_type":         str(_returned.get("type", "asteroid")),
		"operation_mode":      _operation_mode,
		"subcontractor_id":    _contractor_id,
		"subcontractor_name":  _contractor_name,
		"payout":              _payout,
		"cargo":               _cargo.duplicate(true),
		"requested_minerals":  _requested.duplicate(true),
		"order_completion_pct": int(round(_order_ratio * 100.0)),
		"affinity_before":     _affinity_before
	})

	var now_ts := int(Time.get_unix_time_from_system())
	var mission_badge := "mission-%s-%d" % [tid if tid != "" else "unknown", now_ts]
	RocketsManager.mark_mission_completed(mission_badge)
	AppControllerHelper.record_tutorial_action("resolve_mission_debrief")
	RocketsManager.finalize_return(rid)
	RocketsManager.clear_returned_mission()
	_debrief_resolved = true


func _on_open_launchpad_pressed() -> void:
	_resolve_debrief_once()
	_prepare_launchpad_handoff()
	var tree := Engine.get_main_loop() as SceneTree
	if tree == null:
		return
	var sm = tree.current_scene.get_node_or_null("SceneManager") if tree.current_scene else null
	if sm and sm.has_method("change_to_scene"):
		sm.change_to_scene(LAUNCHPAD_SCENE)
	else:
		tree.change_scene_to_file(LAUNCHPAD_SCENE)


func _on_salvage_pressed(btn: Button) -> void:
	if _salvage_applied:
		return
	_resolve_debrief_once()
	var rocket_id = str(_returned.get("rocket_id", ""))
	if rocket_id == "":
		return
	var app = AppControllerHelper.get_instance()
	if app and _salvage_refund > 0:
		app.add_franc_balance(_salvage_refund, "rocket_salvage")
	var ok = RocketsManager.set_destroyed(rocket_id, "scrapped_after_debrief")
	if ok:
		_salvage_applied = true
		btn.disabled = true
		btn.text = "Ship Salvaged ✓"
	_render_ui()


func _clear_cargo(target_id: String) -> void:
	if target_id == "":
		return
	var data    = MiningInventory.load_state()
	var targets = data.get("targets", {})
	targets.erase(target_id)
	data["targets"] = targets
	MiningInventory.save_state(data)


func _stage_hint(stage: int) -> String:
	match stage:
		1: return "Complete debrief to unlock Mission 2."
		2: return "Complete debrief to unlock Mission 3."
		3: return "Complete debrief to unlock Mission 4."
		4: return "Complete debrief to unlock Free Operations."
	return ""


func _return_to_base() -> void:
	_resolve_debrief_once()
	var tree := Engine.get_main_loop() as SceneTree
	if tree == null:
		return
	var sm = tree.current_scene.get_node_or_null("SceneManager") if tree.current_scene else null
	if sm and sm.has_method("change_to_scene"):
		sm.change_to_scene(EARTH_SCENE)
	else:
		NavigationMixin.go_back_to_earth(tree)


func _calc_salvage_refund() -> int:
	var rocket_id = str(_returned.get("rocket_id", ""))
	if rocket_id == "":
		return 0
	var base_cost = RocketSpecs.get_cost(rocket_id)
	var salvage_pct = ResearchManager.get_salvage_refund_multiplier()
	if salvage_pct <= 0.0:
		salvage_pct = RocketSpecs.get_salvage_refund_pct(rocket_id)
	return int(round(float(base_cost) * salvage_pct))


func _unlock_rockets_on_mission_complete() -> void:
	var app = AppControllerHelper.get_instance()
	if app and app.has_method("_unlock_rockets_for_mission_stage"):
		app._unlock_rockets_for_mission_stage(RocketsManager.get_completed_mission_count())

func _build_next_mission_brief() -> Dictionary:
	var current_stage = _infer_returned_mission_stage()
	var next_stage = current_stage + 1 if current_stage < 4 else 4
	var base_setup_key := _next_stage_base_setup_key(current_stage)
	if base_setup_key != "":
		return {
			"stage": next_stage,
			"target_id": "",
			"location": "Earth Base",
			"contractor": "Base Operations",
			"title": _next_mission_title(current_stage),
			"objective": _next_mission_objective(current_stage, "Earth Base"),
			"note": _next_mission_note(current_stage),
			"requires_base_setup": true,
			"base_setup_key": base_setup_key,
			"primary_cta": _primary_handoff_label_for_base_setup(base_setup_key),
		}
	var targets = RocketsManager.get_selectable_targets_for_stage(next_stage)
	var target: Dictionary = {}
	if not targets.is_empty() and typeof(targets[0]) == TYPE_DICTIONARY:
		target = (targets[0] as Dictionary).duplicate(true)
	else:
		target = RocketsManager.get_predefined_mission_target(next_stage)
	var target_id = str(target.get("id", ""))
	var target_label = str(target.get("label", "Earth Launchpad"))
	var contractor = "Choose in Launchpad"
	# Launchpad shortcut is only available once free ops are unlocked (post-M4).
	# Before that, players must return to base and launch manually.
	if not RocketsManager.is_free_operations_unlocked():
		return {
			"stage": next_stage,
			"target_id": target_id,
			"location": target_label,
			"contractor": contractor,
			"title": _next_mission_title(current_stage),
			"objective": _next_mission_objective(current_stage, target_label),
			"note": _next_mission_note(current_stage),
			"requires_base_setup": true,
			"base_setup_key": "",
			"primary_cta": "Return to Base →",
		}
	return {
		"stage": next_stage,
		"target_id": target_id,
		"location": target_label,
		"contractor": contractor,
		"title": _next_mission_title(current_stage),
		"objective": _next_mission_objective(current_stage, target_label),
		"note": _next_mission_note(current_stage),
		"requires_base_setup": false,
		"base_setup_key": "",
		"primary_cta": "Open Launchpad →",
	}


func _next_mission_title(current_stage: int) -> String:
	match current_stage:
		1:
			return "Mission 2 starts at the Control Station"
		2:
			return "Mission 3 is ready"
		3:
			return "Mission 4 opens into your first self-directed run"
		_:
			return "Your next mission is ready"


func _next_mission_objective(current_stage: int, target_label: String) -> String:
	match current_stage:
		1:
			return "Return to Earth base and build the Control Station so Mission 2 launch prep can begin."
		2:
			return "Prepare the first planet-target mission and route toward %s." % target_label
		3:
			return "Return to Earth base, reopen the Launchpad, and choose how you want to approach %s." % target_label
		_:
			return "Open the launchpad, pick a contractor, and line up the next operation."


func _next_mission_note(current_stage: int) -> String:
	match current_stage:
		1:
			return "Build the Control Station first; it unlocks mission planning for Starter Rocket 2."
		2:
			return "Contractor choice still happens first on every run. Target lock comes after the ship is ready."
		3:
			return "Mission 4 is the transition into autonomy: take a contract for structure or launch a survey run on your own."
		_:
			return "Free Operations is open; use the launchpad to continue the loop."


func _prepare_launchpad_handoff() -> void:
	RocketsManager.clear_selected_target()
	var location = str(_next_mission_brief.get("location", "the next mission"))
	RocketsManager.set_launch_guidance_notice("Next mission ready: %s. Pick a contractor, build a ship, then choose the route." % location)

func _infer_returned_mission_stage() -> int:
	var target_id := str(_returned.get("target_id", ""))
	var target_type := str(_returned.get("type", "asteroid")).strip_edges().to_lower()
	var rocket_type := RocketSpecs.rocket_type_from_id(str(_returned.get("rocket_id", "")))
	var mission1_id := str(RocketsManager.get_predefined_mission_target(1).get("id", ""))
	var mission2_id := str(RocketsManager.get_predefined_mission_target(2).get("id", ""))
	var mission4_id := str(RocketsManager.get_predefined_mission_target(4).get("id", ""))
	if target_id == mission1_id:
		return 1
	if target_id == mission2_id or target_id.begins_with("mission-2-"):
		return 2
	if target_id == mission4_id:
		return 4
	if target_id.begins_with("mission-3-"):
		return 3
	match rocket_type:
		"starterrocket1":
			return 1
		"starterrocket3":
			return 4
		"starterrocket2":
			return 3 if target_type == "planet" else 2
	return max(int(RocketsManager.get_mission_stage()), 1)

func _next_stage_base_setup_key(current_stage: int) -> String:
	match current_stage:
		1:
			return "control_station" if not RocketsManager.is_control_station_built() else ""
		_:
			return ""

func _primary_handoff_label_for_base_setup(base_setup_key: String) -> String:
	match base_setup_key:
		"control_station":
			return "Build Control Station →"
		"scanner_station":
			return "Build Scanner Station →"
		_:
			return "Return to Base →"

func _primary_handoff_action_label() -> String:
	return str(_next_mission_brief.get("primary_cta", "Open Launchpad →"))

func _primary_handoff_action_description() -> String:
	var base_setup_key := str(_next_mission_brief.get("base_setup_key", ""))
	match base_setup_key:
		"control_station":
			return "Return to Earth base and construct the Control Station before reopening the Launchpad."
		"scanner_station":
			return "Return to Earth base, pay the scanner build cost, then run a scan before launch prep."
		_:
			return "Leave debrief and start setting up the next mission in the Launchpad."

func _should_show_return_to_base_action() -> bool:
	return not bool(_next_mission_brief.get("requires_base_setup", false))

func _on_primary_handoff_pressed() -> void:
	_resolve_debrief_once()
	var tree := Engine.get_main_loop() as SceneTree
	if tree == null:
		return
	var destination := EARTH_SCENE if bool(_next_mission_brief.get("requires_base_setup", false)) else LAUNCHPAD_SCENE
	if destination == LAUNCHPAD_SCENE:
		_prepare_launchpad_handoff()
	var sm = tree.current_scene.get_node_or_null("SceneManager") if tree.current_scene else null
	if sm and sm.has_method("change_to_scene"):
		sm.change_to_scene(destination)
	else:
		tree.change_scene_to_file(destination)
