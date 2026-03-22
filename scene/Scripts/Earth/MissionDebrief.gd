extends Node2D
## MissionDebrief.gd
## Simple single-action mission completion screen.
## Shows cargo + payout, then the player taps one button to complete.

const SCRAP_REFUND_PCT := 0.20
const CONTRACTOR_ROUTE_MULT := 1.2
const MARKET_ROUTE_MULT := 0.8
const AFFINITY_BONUS_PER_POINT := 0.005
const AFFINITY_BONUS_CAP := 0.25
const ORDER_BONUS_CAP := 0.15
const DISCOVERY_BONUS_MULT := 1.10
const XP_BY_MISSION_STAGE := {1: 80, 2: 120, 3: 160, 4: 200}
const XP_AWARD_FREE_OPS_MISSION := 100

const RocketSpecs = preload("res://Scripts/Utils/RocketSpecs.gd")
const NavigationMixin = preload("res://Scripts/Utils/NavigationMixin.gd")
const PanelStyle = preload("res://Scripts/UI/PanelStyle.gd")
const RocketsManager = preload("res://Scripts/Utils/RocketsManager.gd")
const MineralPricing = preload("res://Scripts/Utils/MineralPricing.gd")
const MiningInventory = preload("res://Scripts/Utils/MiningInventory.gd")
const SectorRevealManager = preload("res://Scripts/Utils/SectorRevealManager.gd")
const SubcontractorManager = preload("res://Scripts/Utils/SubcontractorManager.gd")
const AppControllerHelper = preload("res://Scripts/Utils/AppControllerHelper.gd")
const MissionLogManager = preload("res://Scripts/Utils/MissionLogManager.gd")

@onready var title_label: Label = $UI/Root/Panel/VBox/Title
@onready var subtitle_label: Label = $UI/Root/Panel/VBox/Subtitle
@onready var hint_label: Label = $UI/Root/Panel/VBox/HintLabel
@onready var minerals_list: VBoxContainer = $UI/Root/Panel/VBox/Minerals/MineralsList
@onready var payout_label: Label = $UI/Root/Panel/VBox/PayoutLabel
@onready var complete_button: Button = $UI/Root/Panel/VBox/Actions/CompleteButton
@onready var orbit_button: Button = $UI/Root/Panel/VBox/Actions/OrbitButton
@onready var status_label: Label = $UI/Root/Panel/VBox/StatusLabel

var _returned: Dictionary = {}
var _cargo: Dictionary = {}
var _contractor_id: String = ""
var _contractor_name: String = "No Contractor"
var _operation_mode: String = "contract"
var _requested_minerals: Dictionary = {}
var _order_ratio: float = 1.0
var _affinity_before: int = 0
var _earth_payout: int = 0
var _scrap_refund: int = 0
var _done := false

func _ready() -> void:
	_apply_style()
	_returned = RocketsManager.get_returned_mission()
	if _returned.is_empty():
		_show_empty()
		return
	_cargo = _resolve_cargo(_returned)
	_operation_mode = str(_returned.get("operation_mode", "contract")).strip_edges().to_lower()
	if _operation_mode != "survey":
		_operation_mode = "contract"
	_resolve_contractor_context()
	_earth_payout = _calc_payout()
	var rocket_id = str(_returned.get("rocket_id", ""))
	_scrap_refund = int(round(float(RocketSpecs.get_cost(rocket_id)) * SCRAP_REFUND_PCT))
	_build_ui()
	complete_button.pressed.connect(_on_complete_pressed)
	orbit_button.pressed.connect(_on_orbit_pressed)

func _apply_style() -> void:
	PanelStyle.apply_title(title_label)
	title_label.add_theme_font_size_override("font_size", 26)
	PanelStyle.apply_body(subtitle_label)
	PanelStyle.apply_body(hint_label)
	hint_label.add_theme_color_override("font_color", Color(0.941, 0.690, 0.188, 1.0))
	hint_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	PanelStyle.apply_muted(payout_label)
	PanelStyle.apply_muted(status_label)
	status_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	PanelStyle.apply_button(complete_button, true)
	PanelStyle.apply_button(orbit_button, false)

func _resolve_cargo(payload: Dictionary) -> Dictionary:
	var run_collected = payload.get("mining_run_collected", {})
	if typeof(run_collected) == TYPE_DICTIONARY and not run_collected.is_empty():
		return run_collected.duplicate(true)
	var target_id = str(payload.get("target_id", ""))
	if target_id == "":
		return {}
	var state = MiningInventory.load_state()
	var entry = state.get("targets", {}).get(target_id, {})
	var collected = entry.get("collected", {})
	return collected.duplicate(true) if typeof(collected) == TYPE_DICTIONARY else {}

func _resolve_contractor_context() -> void:
	var starter_ctx = _returned.get("starter_contract_context", {})
	if typeof(starter_ctx) == TYPE_DICTIONARY and bool(starter_ctx.get("active", false)):
		_contractor_id = str(starter_ctx.get("id", ""))
		_contractor_name = str(starter_ctx.get("name", "Contractor"))
		_requested_minerals = starter_ctx.get("requested_minerals", {}).duplicate(true)
	else:
		_contractor_id = str(_returned.get("trip_contractor_id", ""))
		_contractor_name = str(_returned.get("trip_contractor_name", ""))
		_requested_minerals = _returned.get("trip_requested_minerals", {}).duplicate(true)
		if _contractor_id == "":
			var selected = RocketsManager.get_trip_selected_contractor()
			_contractor_id = str(selected.get("id", ""))
			_contractor_name = str(selected.get("name", _contractor_name))
		if _requested_minerals.is_empty():
			var offer = RocketsManager.get_trip_contract_offer()
			if typeof(offer) == TYPE_DICTIONARY:
				_requested_minerals = offer.get("requested_minerals", {}).duplicate(true)
	if _contractor_name == "":
		var sub = SubcontractorManager.get_subcontractor(_contractor_id)
		_contractor_name = str(sub.get("name", "No Contractor"))
	_affinity_before = SubcontractorManager.get_affinity(_contractor_id)
	_order_ratio = _compute_order_ratio(_cargo, _requested_minerals)

func _compute_order_ratio(collected: Dictionary, requested: Dictionary) -> float:
	if requested.is_empty():
		return 1.0
	var req_total := 0
	var matched := 0
	for k in requested.keys():
		var req = max(int(requested.get(k, 0)), 0)
		if req <= 0:
			continue
		req_total += req
		matched += min(int(collected.get(str(k), 0)), req)
	if req_total <= 0:
		return 1.0
	return clamp(float(matched) / float(req_total), 0.0, 1.0)

func _calc_payout() -> int:
	var base := 0
	for mineral in _cargo.keys():
		base += MineralPricing.price_for(str(mineral), int(_cargo.get(mineral, 0)))
	var route_mult = CONTRACTOR_ROUTE_MULT if _operation_mode == "contract" else MARKET_ROUTE_MULT
	var gross = int(round(float(base) * route_mult))
	var tid = str(_returned.get("target_id", ""))
	if tid != "" and not RocketsManager.has_discovery_bonus_claimed(tid):
		gross = int(round(float(gross) * DISCOVERY_BONUS_MULT))
	if _operation_mode == "contract":
		var aff_mult = 1.0 + min(float(_affinity_before) * AFFINITY_BONUS_PER_POINT, AFFINITY_BONUS_CAP)
		var ord_mult = 1.0 + (ORDER_BONUS_CAP * _order_ratio)
		gross = int(round(float(gross) * ord_mult * aff_mult))
	return min(gross, RocketsManager.get_free_ops_payout_cap())

func _build_ui() -> void:
	var rocket_id = str(_returned.get("rocket_id", ""))
	var rocket_display = RocketSpecs.get_display_name(rocket_id)
	var target_label = str(_returned.get("label", "Unknown Target"))
	title_label.text = "Mission Complete!"
	var sub_parts = [rocket_display, target_label]
	if _contractor_name != "" and _contractor_name != "No Contractor":
		sub_parts.append(_contractor_name)
	subtitle_label.text = "  •  ".join(sub_parts)

	var stage = int(RocketsManager.get_mission_stage())
	hint_label.text = _next_mission_hint(stage)
	hint_label.visible = hint_label.text != ""

	for c in minerals_list.get_children():
		c.queue_free()
	if _cargo.is_empty():
		var empty = Label.new()
		empty.text = "No cargo collected."
		PanelStyle.apply_muted(empty)
		minerals_list.add_child(empty)
	else:
		var keys = _cargo.keys()
		keys.sort()
		for mineral in keys:
			var lbl = Label.new()
			var kg = int(_cargo.get(mineral, 0))
			var req = int(_requested_minerals.get(str(mineral), 0))
			var suffix = (" (order: %d kg)" % req) if req > 0 else ""
			lbl.text = "• %s: %d kg%s" % [str(mineral), kg, suffix]
			PanelStyle.apply_body(lbl)
			minerals_list.add_child(lbl)

	payout_label.text = "Sale: %d F  •  Scrap: +%d F" % [_earth_payout, _scrap_refund]
	complete_button.text = "Sell & Scrap Ship →"
	orbit_button.text = "Leave Ship in Orbit"
	status_label.text = ""

func _next_mission_hint(stage: int) -> String:
	match stage:
		1: return "Debrief to unlock Mission 2 — Starter Rocket 2 with extended range."
		2: return "Debrief to unlock Mission 3 — fly to a real NASA TESS planet candidate."
		3: return "Debrief to unlock Mission 4 — install the Scanner Station and try drone mining."
		4: return "Debrief to unlock Free Operations — run missions on your own terms."
	return ""

func _on_complete_pressed() -> void:
	if _done:
		return
	_do_complete("scrap")

func _on_orbit_pressed() -> void:
	if _done:
		return
	_do_complete("leave_orbit")

func _do_complete(ship_mode: String) -> void:
	_done = true
	complete_button.disabled = true
	orbit_button.disabled = true
	var rocket_id = str(_returned.get("rocket_id", ""))
	var target_id = str(_returned.get("target_id", ""))
	var app = AppControllerHelper.get_instance()

	# Sell cargo — auto-repay any outstanding loan first
	if not _cargo.is_empty():
		RocketsManager.consume_from_inventory(_cargo)
		for mineral in _cargo.keys():
			MineralPricing.record_player_sale(str(mineral))
		if target_id != "" and not RocketsManager.has_discovery_bonus_claimed(target_id):
			RocketsManager.mark_discovery_bonus_claimed(target_id)
		if target_id != "":
			SectorRevealManager.reveal_for_target(target_id)
		if app:
			var net_payout := _earth_payout
			if app.has_outstanding_loan():
				net_payout = app.repay_loan_from_payout(_earth_payout)
			app.add_franc_balance(net_payout, "mission_sale")
		if _operation_mode == "contract" and _contractor_id != "":
			SubcontractorManager.add_affinity(_contractor_id, 1)
			SubcontractorManager.record_mission_completion(_contractor_id)
			if app:
				app.add_experience(1, "affinity")
		RocketsManager.clear_trip_contract_offer()
		_clear_cargo(target_id)

	# Resolve ship
	var refund := 0
	if ship_mode == "scrap":
		refund = _scrap_refund
		RocketsManager.set_destroyed(rocket_id, "scrap")
		if app and refund > 0:
			app.add_franc_balance(refund, "scrap")
	else:
		RocketsManager.remove_orbiting_rocket(rocket_id)

	# XP — tutorial stages get fixed values; free ops uses flat award
	if app:
		var stage = int(RocketsManager.get_mission_stage())
		var xp_amount: int = XP_BY_MISSION_STAGE.get(stage, XP_AWARD_FREE_OPS_MISSION)
		app.add_experience(xp_amount, "mission_completion")

	# Log
	_add_mission_log(ship_mode, refund)

	# Tutorial action — fire before finalize_return so stage advance sees the completed debrief
	AppControllerHelper.record_tutorial_action("resolve_mission_debrief")

	# Finalize
	RocketsManager.finalize_return(rocket_id)
	RocketsManager.clear_returned_mission()
	_return_to_base()

func _add_mission_log(ship_mode: String, refund: int) -> void:
	MissionLogManager.add_mission({
		"timestamp": Time.get_datetime_string_from_system(),
		"rocket_id": str(_returned.get("rocket_id", "")),
		"target_id": str(_returned.get("target_id", "")),
		"label": str(_returned.get("label", "")),
		"target_type": str(_returned.get("target_type", "asteroid")),
		"operation_mode": _operation_mode,
		"subcontractor_id": _contractor_id,
		"subcontractor_name": _contractor_name,
		"action": ship_mode,
		"payout": _earth_payout,
		"cargo": _cargo.duplicate(true),
		"requested_minerals": _requested_minerals.duplicate(true),
		"order_completion_pct": int(round(_order_ratio * 100.0)),
		"affinity_before": _affinity_before
	})

func _clear_cargo(target_id: String) -> void:
	if target_id == "":
		return
	var data = MiningInventory.load_state()
	var targets = data.get("targets", {})
	targets.erase(target_id)
	data["targets"] = targets
	MiningInventory.save_state(data)

func _show_empty() -> void:
	title_label.text = "No Mission Data"
	subtitle_label.text = "No returned mission found."
	hint_label.visible = false
	payout_label.text = ""
	complete_button.text = "Return to Base"
	complete_button.pressed.connect(_return_to_base)
	orbit_button.visible = false
	status_label.text = "Open Launchpad and run a mission first."

func _return_to_base() -> void:
	var tree = Engine.get_main_loop() as SceneTree
	if tree == null:
		return
	var scene_manager = null
	if tree.current_scene:
		scene_manager = tree.current_scene.get_node_or_null("SceneManager")
	if scene_manager and scene_manager.has_method("change_to_scene"):
		scene_manager.change_to_scene("res://Scenes/Earth/earth_base_1.tscn")
	else:
		NavigationMixin.go_back_to_earth(tree)
