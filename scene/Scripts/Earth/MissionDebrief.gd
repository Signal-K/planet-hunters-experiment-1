extends Node2D

const ORBIT_MULTIPLIER := 0.8
const EARTH_MULTIPLIER := 1.0
const SCRAP_REFUND_PCT := 0.20
const SALVAGE_REFUND_PCT := 0.10
const AFFINITY_BONUS_PER_POINT := 0.005
const AFFINITY_BONUS_CAP := 0.25
const ORDER_BONUS_CAP := 0.15
const XP_AWARD_MISSION_COMPLETE := 1

const RocketSpecs = preload("res://Scripts/Utils/RocketSpecs.gd")
const NavigationMixin = preload("res://Scripts/Utils/NavigationMixin.gd")
const ResourceValueRowScene = preload("res://Scenes/UI/Templates/ResourceValueRow.tscn")
const EmptyLabelScene = preload("res://Scenes/UI/Templates/MenuLogbookEmpty.tscn")
const PanelStyle = preload("res://Scripts/UI/PanelStyle.gd")
const RocketsManager = preload("res://Scripts/Utils/RocketsManager.gd")
const MineralPricing = preload("res://Scripts/Utils/MineralPricing.gd")
const MiningInventory = preload("res://Scripts/Utils/MiningInventory.gd")
const SubcontractorManager = preload("res://Scripts/Utils/SubcontractorManager.gd")
const AppControllerHelper = preload("res://Scripts/Utils/AppControllerHelper.gd")
const MissionLogManager = preload("res://Scripts/Utils/MissionLogManager.gd")

@onready var title_label: Label = $UI/Root/Panel/VBox/Title
@onready var subtitle_label: Label = $UI/Root/Panel/VBox/Subtitle
@onready var minerals_list: VBoxContainer = $UI/Root/Panel/VBox/Minerals/MineralsList
@onready var actions_container: VBoxContainer = $UI/Root/Panel/VBox/Actions
@onready var sell_row: HBoxContainer = $UI/Root/Panel/VBox/Actions/SellRow
@onready var sell_orbit_button: Button = $UI/Root/Panel/VBox/Actions/SellRow/SellOrbitButton
@onready var sell_earth_button: Button = $UI/Root/Panel/VBox/Actions/SellRow/SellEarthButton
@onready var keep_button: Button = $UI/Root/Panel/VBox/Actions/KeepButton
@onready var ship_row: HBoxContainer = $UI/Root/Panel/VBox/Actions/ShipRow
@onready var scrap_button: Button = $UI/Root/Panel/VBox/Actions/ShipRow/ScrapButton
@onready var salvage_button: Button = $UI/Root/Panel/VBox/Actions/ShipRow/SalvageButton
@onready var leave_button: Button = $UI/Root/Panel/VBox/Actions/ShipRow/LeaveButton
@onready var back_button: Button = $UI/Root/Panel/VBox/Footer/BackButton
@onready var status_label: Label = $UI/Root/Panel/VBox/Footer/Status

var _returned: Dictionary = {}
var _cargo: Dictionary = {}
var _cargo_base_value: int = 0

var _contractor: Dictionary = {}
var _contractor_id: String = ""
var _contractor_name: String = "No Contractor"
var _contractor_effect: String = ""
var _requested_minerals: Dictionary = {}
var _order_ratio: float = 0.0
var _order_bonus_mult: float = 1.0
var _affinity_before: int = 0
var _affinity_bonus_mult: float = 1.0

var _cargo_resolved := false
var _ship_resolved := false

func _ready() -> void:
	_apply_style()
	back_button.pressed.connect(_return_to_base)
	_returned = RocketsManager.get_returned_mission()
	if _returned.is_empty():
		_set_empty_state()
		return

	_cargo = _resolve_cargo(_returned)
	_cargo_base_value = _base_cargo_value(_cargo)
	_resolve_contractor_context()
	_build_minerals_list()
	_update_header()
	_update_status_for_review()
	_update_action_states()

	sell_orbit_button.pressed.connect(func(): _sell(false))
	sell_earth_button.pressed.connect(func(): _sell(true))
	keep_button.pressed.connect(_keep_cargo)
	scrap_button.pressed.connect(func(): _resolve_ship("scrap", SCRAP_REFUND_PCT))
	salvage_button.pressed.connect(func(): _resolve_ship("salvage", SALVAGE_REFUND_PCT))
	leave_button.pressed.connect(func(): _resolve_ship("leave_orbit", 0.0))

func _apply_style() -> void:
	PanelStyle.apply_title(title_label)
	PanelStyle.apply_body(subtitle_label)
	PanelStyle.apply_body(status_label)
	status_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	PanelStyle.apply_button(sell_orbit_button, true)
	PanelStyle.apply_button(sell_earth_button, true)
	PanelStyle.apply_button(keep_button, false)
	PanelStyle.apply_button(scrap_button, false)
	PanelStyle.apply_button(salvage_button, false)
	PanelStyle.apply_button(leave_button, false)
	PanelStyle.apply_button(back_button, false)

func _resolve_cargo(returned_payload: Dictionary) -> Dictionary:
	var run_collected = returned_payload.get("mining_run_collected", {})
	if typeof(run_collected) == TYPE_DICTIONARY and not run_collected.is_empty():
		return run_collected.duplicate(true)
	var target_id = str(returned_payload.get("target_id", ""))
	if target_id == "":
		return {}
	var state = MiningInventory.load_state()
	var targets = state.get("targets", {})
	var entry = targets.get(target_id, {})
	var collected = entry.get("collected", {})
	return collected.duplicate(true) if typeof(collected) == TYPE_DICTIONARY else {}

func _resolve_contractor_context() -> void:
	var starter_ctx = _returned.get("starter_contract_context", {})
	if typeof(starter_ctx) == TYPE_DICTIONARY and bool(starter_ctx.get("active", false)):
		_contractor_id = str(starter_ctx.get("id", ""))
		_contractor_name = str(starter_ctx.get("name", "Contractor"))
		_requested_minerals = starter_ctx.get("requested_minerals", {}).duplicate(true)
		_contractor_effect = "starter_order"
	else:
		_contractor_id = str(_returned.get("trip_contractor_id", ""))
		_contractor_name = str(_returned.get("trip_contractor_name", ""))
		_contractor_effect = str(_returned.get("trip_contractor_effect", ""))
		_requested_minerals = _returned.get("trip_requested_minerals", {}).duplicate(true)
		if _contractor_id == "":
			var selected = RocketsManager.get_trip_selected_contractor()
			_contractor_id = str(selected.get("id", ""))
			_contractor_name = str(selected.get("name", _contractor_name))
			_contractor_effect = str(selected.get("effect", _contractor_effect))
		if _requested_minerals.is_empty():
			var offer = RocketsManager.get_trip_contract_offer()
			if typeof(offer) == TYPE_DICTIONARY:
				_requested_minerals = offer.get("requested_minerals", {}).duplicate(true)

	_contractor = SubcontractorManager.get_subcontractor(_contractor_id)
	if _contractor_name == "":
		_contractor_name = str(_contractor.get("name", "No Contractor"))
	_affinity_before = SubcontractorManager.get_affinity(_contractor_id)
	_affinity_bonus_mult = 1.0 + min(float(_affinity_before) * AFFINITY_BONUS_PER_POINT, AFFINITY_BONUS_CAP)
	_order_ratio = _compute_order_fulfillment_ratio(_cargo, _requested_minerals)
	_order_bonus_mult = 1.0 + (ORDER_BONUS_CAP * _order_ratio)

func _compute_order_fulfillment_ratio(collected: Dictionary, requested: Dictionary) -> float:
	if requested.is_empty():
		return 1.0
	var req_total := 0
	var matched_total := 0
	for k in requested.keys():
		var req = max(int(requested.get(k, 0)), 0)
		if req <= 0:
			continue
		req_total += req
		var got = max(int(collected.get(str(k), 0)), 0)
		matched_total += min(got, req)
	if req_total <= 0:
		return 1.0
	return clamp(float(matched_total) / float(req_total), 0.0, 1.0)

func _build_minerals_list() -> void:
	for c in minerals_list.get_children():
		c.queue_free()
	if _cargo.is_empty():
		var empty_label: Label = EmptyLabelScene.instantiate()
		empty_label.text = "No cargo recorded."
		PanelStyle.apply_muted(empty_label)
		minerals_list.add_child(empty_label)
		return
	var keys = _cargo.keys()
	keys.sort()
	for mineral in keys:
		var row: HBoxContainer = ResourceValueRowScene.instantiate()
		var name_label: Label = row.get_node("NameLabel")
		var value_label: Label = row.get_node("ValueLabel")
		var kg = int(_cargo.get(mineral, 0))
		var marker = ""
		if not _requested_minerals.is_empty():
			var req = int(_requested_minerals.get(str(mineral), 0))
			if req > 0:
				marker = " (order %dkg)" % req
		name_label.text = "%s%s" % [str(mineral), marker]
		value_label.text = "%d kg" % kg
		PanelStyle.apply_body(name_label)
		PanelStyle.apply_muted(value_label)
		minerals_list.add_child(row)

func _base_cargo_value(cargo: Dictionary) -> int:
	var total := 0
	for mineral in cargo.keys():
		total += MineralPricing.price_for(str(mineral), int(cargo.get(mineral, 0)))
	return total

func _update_header() -> void:
	var rocket_id = str(_returned.get("rocket_id", ""))
	var target_label = str(_returned.get("label", "Unknown Target"))
	title_label.text = "Mission Review"
	subtitle_label.text = "Rocket %s • Target %s • Contractor %s" % [rocket_id, target_label, _contractor_name]

func _calc_payout(to_earth: bool) -> Dictionary:
	var multiplier = EARTH_MULTIPLIER if to_earth else ORBIT_MULTIPLIER
	var gross = int(round(float(_cargo_base_value) * multiplier))
	var with_contractor = gross
	if _contractor_effect == "payout_bonus":
		with_contractor = RocketsManager.apply_trip_payout_terms(gross, _contractor_id)
	var with_order = int(round(float(with_contractor) * _order_bonus_mult))
	var with_affinity = int(round(float(with_order) * _affinity_bonus_mult))
	var capped = min(with_affinity, RocketsManager.get_free_ops_payout_cap())
	return {
		"base": gross,
		"contractor": with_contractor,
		"order": with_order,
		"final": capped
	}

func _update_status_for_review() -> void:
	var orbit = _calc_payout(false)
	var earth = _calc_payout(true)
	var lines := []
	lines.append("Contractor: %s (%s)" % [_contractor_name, _contractor_effect if _contractor_effect != "" else "no special effect"])
	lines.append("Affinity: %d (bonus +%d%%)" % [_affinity_before, int(round((_affinity_bonus_mult - 1.0) * 100.0))])
	lines.append("Order completion: %d%% (bonus +%d%%)" % [
		int(round(_order_ratio * 100.0)),
		int(round((_order_bonus_mult - 1.0) * 100.0))
	])
	lines.append("Orbit sale preview: %d F" % int(orbit.get("final", 0)))
	lines.append("Earth sale preview: %d F" % int(earth.get("final", 0)))
	if _contractor_id == "":
		lines.append("Warning: No contractor bound to this run.")
	status_label.text = "\n".join(lines)

func _sell(to_earth: bool) -> void:
	if _cargo_resolved or _cargo.is_empty():
		return
	var payout_data = _calc_payout(to_earth)
	var payout = int(payout_data.get("final", 0))
	var app = _get_app_controller()
	if app:
		app.add_franc_balance(payout, "mission_sale")
	if _contractor_id != "":
		var affinity_after = SubcontractorManager.add_affinity(_contractor_id, 1)
		if app:
			app.add_experience(1, "affinity")
		status_label.text += "\nAffinity increased: %d -> %d" % [_affinity_before, affinity_after]
	_add_mission_log("sell_earth" if to_earth else "sell_orbit", payout)
	_cargo_resolved = true
	_clear_cargo()
	RocketsManager.clear_trip_contract_offer()
	status_label.text = "Sale complete: +%d F.\nNow resolve the ship (scrap/salvage/leave)." % payout
	_update_action_states()

func _keep_cargo() -> void:
	if _cargo_resolved:
		return
	_cargo_resolved = true
	_add_mission_log("keep_cargo", 0)
	status_label.text = "Cargo kept. Now resolve the ship (scrap/salvage/leave)."
	_update_action_states()

func _resolve_ship(mode: String, refund_pct: float) -> void:
	if _ship_resolved:
		return
	var rocket_id = str(_returned.get("rocket_id", ""))
	var refund = 0
	if mode == "scrap" or mode == "salvage":
		refund = int(round(float(RocketSpecs.get_cost(rocket_id)) * refund_pct))
		var app = _get_app_controller()
		if app:
			app.add_franc_balance(refund, mode)
	if mode == "scrap" or mode == "salvage":
		RocketsManager.set_destroyed(rocket_id, mode)
	else:
		RocketsManager.remove_orbiting_rocket(rocket_id)
	_ship_resolved = true
	_add_mission_log(mode, refund)
	var app = _get_app_controller()
	if app:
		app.add_experience(XP_AWARD_MISSION_COMPLETE, "mission_completion")
	status_label.text = "Ship resolved via %s%s. Press Return to Base." % [mode, (" (+%d F)" % refund) if refund > 0 else ""]
	_update_action_states()

func _update_action_states() -> void:
	var has_cargo = not _cargo.is_empty()
	sell_orbit_button.disabled = _cargo_resolved or not has_cargo
	sell_earth_button.disabled = _cargo_resolved or not has_cargo
	keep_button.disabled = _cargo_resolved
	var can_resolve_ship = _cargo_resolved and not _ship_resolved
	scrap_button.disabled = not can_resolve_ship
	salvage_button.disabled = not can_resolve_ship
	leave_button.disabled = not can_resolve_ship
	back_button.disabled = not _ship_resolved
	if _ship_resolved:
		back_button.text = "Return to Base"

func _add_mission_log(action: String, payout: int) -> void:
	var entry = {
		"timestamp": Time.get_datetime_string_from_system(),
		"rocket_id": str(_returned.get("rocket_id", "")),
		"target_id": str(_returned.get("target_id", "")),
		"label": str(_returned.get("label", "")),
		"operation_mode": str(_returned.get("operation_mode", "contract")),
		"subcontractor_id": _contractor_id,
		"subcontractor_name": _contractor_name,
		"action": action,
		"payout": payout,
		"cargo": _cargo.duplicate(true),
		"requested_minerals": _requested_minerals.duplicate(true),
		"order_completion_pct": int(round(_order_ratio * 100.0)),
		"affinity_before": _affinity_before
	}
	MissionLogManager.add_mission(entry)

func _clear_cargo() -> void:
	var target_id = str(_returned.get("target_id", ""))
	if target_id == "":
		return
	var data = MiningInventory.load_state()
	var targets = data.get("targets", {})
	if targets.has(target_id):
		targets.erase(target_id)
		data["targets"] = targets
		MiningInventory.save_state(data)

func _set_empty_state() -> void:
	title_label.text = "Mission Review"
	subtitle_label.text = "No returned mission data found."
	status_label.text = "Open Launchpad and run a mission."
	sell_orbit_button.disabled = true
	sell_earth_button.disabled = true
	keep_button.disabled = true
	scrap_button.disabled = true
	salvage_button.disabled = true
	leave_button.disabled = true
	back_button.disabled = false

func _return_to_base() -> void:
	var rocket_id = str(_returned.get("rocket_id", ""))
	if rocket_id != "":
		RocketsManager.finalize_return(rocket_id)
	RocketsManager.clear_returned_mission()
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

func _get_app_controller() -> Node:
	return AppControllerHelper.get_instance()
