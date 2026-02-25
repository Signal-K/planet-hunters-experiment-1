extends Node2D

const ORBIT_MULTIPLIER := 0.8
const EARTH_MULTIPLIER := 1.0
const SUBCONTRACTOR_FEE := 0
const EARTH_SALE_MIN_LEVEL := 3
const SCRAP_REFUND_PCT := 0.20
const SALVAGE_REFUND_PCT := 0.10
const XP_AWARD_MISSION := 4
const ACTION_RESOLVE_DEBRIEF := "resolve_mission_debrief"
const HINT_RESOLVE_DEBRIEF := "Great. You completed debrief by choosing how to process the mission return."
const ACTION_UNLOCK_MISSION_2 := "unlock_mission_2"
const HINT_UNLOCK_MISSION_2 := "Mission 2 unlocked. Starter Rocket 2 is now available in Launchpad."
const MISSION4_AFFINITY_GATE := 3
const MISSION5_AFFINITY_GAIN := 2
const WebEventBridge = preload("res://Scripts/Systems/WebEventBridge.gd")
const RocketSpecs = preload("res://Scripts/Utils/RocketSpecs.gd")
const ResourceValueRowScene = preload("res://Scenes/UI/Templates/ResourceValueRow.tscn")
const EmptyLabelScene = preload("res://Scenes/UI/Templates/MenuLogbookEmpty.tscn")

@onready var title_label: Label = $UI/Root/Panel/VBox/Title
@onready var subtitle_label: Label = $UI/Root/Panel/VBox/Subtitle
@onready var minerals_list: VBoxContainer = $UI/Root/Panel/VBox/Minerals/MineralsList
@onready var sell_orbit_button: Button = $UI/Root/Panel/VBox/Actions/SellRow/SellOrbitButton
@onready var sell_earth_button: Button = $UI/Root/Panel/VBox/Actions/SellRow/SellEarthButton
@onready var keep_button: Button = $UI/Root/Panel/VBox/Actions/KeepButton
@onready var scrap_button: Button = $UI/Root/Panel/VBox/Actions/ShipRow/ScrapButton
@onready var salvage_button: Button = $UI/Root/Panel/VBox/Actions/ShipRow/SalvageButton
@onready var leave_button: Button = $UI/Root/Panel/VBox/Actions/ShipRow/LeaveButton
@onready var archive_button: Button = $UI/Root/Panel/VBox/Actions/ShipRow/ArchiveButton if has_node("UI/Root/Panel/VBox/Actions/ShipRow/ArchiveButton") else null
@onready var back_button: Button = $UI/Root/Panel/VBox/Footer/BackButton
@onready var status_label: Label = $UI/Root/Panel/VBox/Footer/Status

var _returned := {}
var _collected := {}
var _total_value := 0
var _sold := false
var _closed_out := false
var _subcontractor := {}

func _ready() -> void:
	var panel_style = preload("res://Scripts/UI/PanelStyle.gd")
	panel_style.apply_title(title_label)
	panel_style.apply_body(subtitle_label)
	panel_style.apply_body(status_label)
	panel_style.apply_button(sell_orbit_button, true)
	panel_style.apply_button(sell_earth_button, true)
	panel_style.apply_button(keep_button, false)
	panel_style.apply_button(scrap_button, false)
	panel_style.apply_button(salvage_button, false)
	panel_style.apply_button(leave_button, false)
	if archive_button:
		panel_style.apply_button(archive_button, false)
	panel_style.apply_button(back_button, false)

	_returned = _load_returned_mission()
	if _returned.is_empty():
		_set_empty_state()
		return
	_register_orbiting()
	_build_mineral_list()
	_select_subcontractor()
	_update_labels()

	sell_orbit_button.pressed.connect(func(): _sell(false))
	sell_earth_button.pressed.connect(func(): _sell(true))
	keep_button.pressed.connect(func(): _keep_cargo())
	scrap_button.pressed.connect(func(): _scrap_ship(SCRAP_REFUND_PCT))
	salvage_button.pressed.connect(func(): _scrap_ship(SALVAGE_REFUND_PCT))
	leave_button.pressed.connect(func(): _leave_in_orbit())
	if archive_button:
		archive_button.pressed.connect(func(): _archive_ship())
	back_button.pressed.connect(func(): _return_to_base())

func _load_returned_mission() -> Dictionary:
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	var data := {}
	if rm:
		data = rm.get_returned_mission()
	return data

func _register_orbiting() -> void:
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if rm:
		rm.add_orbiting_rocket(
			str(_returned.get("rocket_id", "")),
			str(_returned.get("target_id", "")),
			str(_returned.get("label", "")),
			str(_returned.get("type", "asteroid"))
		)

func _build_mineral_list() -> void:
	for c in minerals_list.get_children():
		c.queue_free()
	_collected = _get_collected_minerals()
	_total_value = 0
	var panel_style = preload("res://Scripts/UI/PanelStyle.gd")
	if _collected.is_empty():
		var empty_label: Label = EmptyLabelScene.instantiate()
		empty_label.text = "No cargo recorded for this mission."
		panel_style.apply_muted(empty_label)
		minerals_list.add_child(empty_label)
		return
	for k in _collected.keys():
		var row: HBoxContainer = ResourceValueRowScene.instantiate()
		var name_label: Label = row.get_node("NameLabel")
		name_label.text = str(k)
		panel_style.apply_body(name_label)
		var amount = int(_collected.get(k, 0))
		var amount_label: Label = row.get_node("ValueLabel")
		amount_label.text = "%s kg" % str(amount)
		panel_style.apply_muted(amount_label)
		minerals_list.add_child(row)
		var pricing = preload("res://Scripts/Utils/MineralPricing.gd")
		_total_value += pricing.price_for(k, amount)

func _get_collected_minerals() -> Dictionary:
	var target_id = str(_returned.get("target_id", ""))
	if target_id == "":
		return {}
	var inv = preload("res://Scripts/Utils/MiningInventory.gd")
	if not inv:
		return {}
	var state = inv.load_state()
	var targets = state.get("targets", {})
	var entry = targets.get(target_id, {})
	return entry.get("collected", {})

func _update_labels() -> void:
	var rocket_id = str(_returned.get("rocket_id", ""))
	var label = str(_returned.get("label", ""))
	if label == "" and _returned.get("target_id", "") != "":
		label = "Target %s" % str(_returned.get("target_id"))
	if label == "":
		label = "Unknown Target"
	title_label.text = "Mission Debrief"
	subtitle_label.text = "Rocket %s returning from %s" % [rocket_id if rocket_id != "" else "", label]
	var subcontractor_name = str(_subcontractor.get("name", "Subcontractor"))
	status_label.text = "Estimated orbit sale (%s): %s F" % [subcontractor_name, str(_total_value)]
	_apply_mission4_buyer_hint()
	var app = _get_app_controller()
	if app:
		var balance = app.get_franc_balance()
		var level = int(app.get_experience_level())
		if level < EARTH_SALE_MIN_LEVEL:
			sell_earth_button.disabled = true
			sell_earth_button.text = "Bring to Earth (Locked • Lvl %s)" % str(EARTH_SALE_MIN_LEVEL)
		else:
			sell_earth_button.disabled = false
			sell_earth_button.text = "Sell on Earth"
	# Save/salvage reserved for later unlocks
	keep_button.disabled = true
	salvage_button.disabled = true

func _sell(to_earth: bool) -> void:
	if _sold or _closed_out:
		return
	if _collected.is_empty():
		status_label.text = "No cargo to sell."
		return
	var gross := 0
	if to_earth:
		var multiplier = EARTH_MULTIPLIER
		gross = int(round(_total_value * multiplier))
	else:
		gross = _orbit_sale_value()
	var net = gross
	if to_earth:
		net = max(gross - SUBCONTRACTOR_FEE, 0)
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if rm:
		net = int(rm.apply_mission5_payout_terms(net, str(_subcontractor.get("id", ""))))
	var app = _get_app_controller()
	if app:
		app.add_franc_balance(net, "mission_sale")
		app.add_experience(XP_AWARD_MISSION, "mission")
	var sm = preload("res://Scripts/Utils/SubcontractorManager.gd")
	if sm:
		var affinity_gain = MISSION5_AFFINITY_GAIN if rm and int(rm.get_mission_stage()) >= 5 else 1
		sm.add_affinity(str(_subcontractor.get("id", "")), affinity_gain)
	_add_mission_log("sell_earth" if to_earth else "sell_orbit", net)
	_sold = true
	_closed_out = true
	status_label.text = "Sale complete. Credited %s F." % str(net)
	_clear_cargo()
	_show_tutorial_hint_once(ACTION_RESOLVE_DEBRIEF, HINT_RESOLVE_DEBRIEF)
	if rm:
		rm.remove_orbiting_rocket(str(_returned.get("rocket_id", "")))
		if int(rm.get_mission_stage()) >= 5:
			rm.clear_mission5_contract_offer()
	_lock_action_buttons()

func _keep_cargo() -> void:
	status_label.text = "Cargo stored. You can sell later."
	_add_mission_log("keep_cargo", 0)
	_show_tutorial_hint_once(ACTION_RESOLVE_DEBRIEF, HINT_RESOLVE_DEBRIEF)
	_closed_out = true

func _archive_ship() -> void:
	if _closed_out:
		return
	_add_mission_log("archive", 0)
	status_label.text = "Ship archived."
	_show_tutorial_hint_once(ACTION_RESOLVE_DEBRIEF, HINT_RESOLVE_DEBRIEF)
	_closed_out = true
	_lock_action_buttons()

func _scrap_ship(refund_pct: float) -> void:
	if _closed_out:
		return
	var rocket_id = str(_returned.get("rocket_id", ""))
	var refund = int(round(_rocket_cost(rocket_id) * refund_pct))
	var app = _get_app_controller()
	if app:
		app.add_franc_balance(refund, "scrap")
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if rm:
		rm.set_destroyed(rocket_id)
		rm.remove_orbiting_rocket(rocket_id)
	_add_mission_log("scrap" if refund_pct >= 0.2 else "salvage", refund)
	status_label.text = "Ship processed. Refund %s F." % str(refund)
	_show_tutorial_hint_once(ACTION_RESOLVE_DEBRIEF, HINT_RESOLVE_DEBRIEF)
	_closed_out = true
	_lock_action_buttons()

func _leave_in_orbit() -> void:
	if _closed_out:
		return
	_add_mission_log("leave_orbit", 0)
	status_label.text = "Ship left in orbit."
	_show_tutorial_hint_once(ACTION_RESOLVE_DEBRIEF, HINT_RESOLVE_DEBRIEF)
	_closed_out = true
	_lock_action_buttons()

func _lock_action_buttons() -> void:
	if sell_orbit_button:
		sell_orbit_button.disabled = true
	if sell_earth_button:
		sell_earth_button.disabled = true
	if keep_button:
		keep_button.disabled = true
	if scrap_button:
		scrap_button.disabled = true
	if salvage_button:
		salvage_button.disabled = true
	if leave_button:
		leave_button.disabled = true
	if archive_button:
		archive_button.disabled = true

func _set_empty_state() -> void:
	title_label.text = "Mission Debrief"
	subtitle_label.text = "No returned mission found."
	status_label.text = "Open missions from Launchpad to continue."
	_lock_action_buttons()
	if back_button:
		back_button.disabled = false

func _clear_cargo() -> void:
	var target_id = str(_returned.get("target_id", ""))
	if target_id == "":
		return
	var inv = preload("res://Scripts/Utils/MiningInventory.gd")
	if not inv:
		return
	var data = inv.load_state()
	var targets = data.get("targets", {})
	if targets.has(target_id):
		targets.erase(target_id)
		data["targets"] = targets
		inv.save_state(data)

func _add_mission_log(action: String, payout: int) -> void:
	var log = preload("res://Scripts/Utils/MissionLogManager.gd")
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if not log:
		return
	var badge = _make_badge()
	var entry = {
		"timestamp": Time.get_datetime_string_from_system(),
		"rocket_id": str(_returned.get("rocket_id", "")),
		"target_id": str(_returned.get("target_id", "")),
		"label": str(_returned.get("label", "")),
		"subcontractor_id": str(_subcontractor.get("id", "")),
		"subcontractor_name": str(_subcontractor.get("name", "")),
		"action": action,
		"payout": payout,
		"cargo": _collected.duplicate(true),
		"badge": badge
	}
	log.add_mission(entry)
	var completed_count := 0
	if rm:
		rm.mark_mission_completed(badge)
		completed_count = int(rm.get_completed_mission_count())
	var mission_rows: Array = log.get_missions()
	var mission_count = mission_rows.size()
	var event_payload := {
		"action": action,
		"payout": payout,
		"rocket_id": str(entry.get("rocket_id", "")),
		"target_id": str(entry.get("target_id", "")),
		"label": str(entry.get("label", "")),
		"badge": str(entry.get("badge", "")),
		"mission_count": mission_count
	}
	WebEventBridge.emit("mission_debrief_resolved", event_payload)
	if completed_count >= 1:
		if rm:
			rm.unlock("starterrocket2")
	if completed_count == 1:
		_show_tutorial_hint_once(ACTION_UNLOCK_MISSION_2, HINT_UNLOCK_MISSION_2)
		WebEventBridge.emit("first_mission_completed", event_payload)

func _select_subcontractor() -> void:
	var app = _get_app_controller()
	var level = 1
	if app:
		level = int(app.get_experience_level())
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	var sm = preload("res://Scripts/Utils/SubcontractorManager.gd")
	if sm and rm and int(rm.get_mission_stage()) >= 5:
		var selected = rm.get_mission5_selected_contractor()
		if not selected.is_empty():
			var selected_id = str(selected.get("id", ""))
			_subcontractor = sm.get_subcontractor(selected_id)
			return
	if sm and rm and int(rm.get_mission_stage()) >= 4:
		_subcontractor = sm.get_subcontractor("spacex")
	elif sm:
		_subcontractor = sm.pick_subcontractor(level)
	else:
		_subcontractor = {}

func _apply_mission4_buyer_hint() -> void:
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	var sm = preload("res://Scripts/Utils/SubcontractorManager.gd")
	if not rm or not sm:
		return
	if int(rm.get_mission_stage()) < 4:
		return
	var buyer_ids = ["spacex", "rocketlab", "astroforge"]
	var buyer_labels := []
	for idx in range(buyer_ids.size()):
		var buyer_id = buyer_ids[idx]
		var buyer = sm.get_subcontractor(buyer_id)
		var buyer_name = str(buyer.get("name", buyer_id))
		if idx == 0:
			buyer_labels.append("%s (available)" % buyer_name)
			continue
		var affinity = int(sm.get_affinity(buyer_id))
		if affinity >= MISSION4_AFFINITY_GATE:
			buyer_labels.append("%s (available)" % buyer_name)
		else:
			buyer_labels.append("%s (locked %d/%d affinity)" % [buyer_name, affinity, MISSION4_AFFINITY_GATE])
	status_label.text += "\nBuyers: %s" % ", ".join(buyer_labels)

func _orbit_sale_value() -> int:
	if _collected.is_empty():
		return 0
	var pricing = preload("res://Scripts/Utils/MineralPricing.gd")
	return pricing.total_value(_collected, ORBIT_MULTIPLIER, _subcontractor.get("bonus", {}))

func _make_badge() -> String:
	var rocket_id = str(_returned.get("rocket_id", ""))
	var target_id = str(_returned.get("target_id", ""))
	if rocket_id == "" or target_id == "":
		return "Mission"
	var return_stamp = ""
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if rm:
		return_stamp = str(int(rm.get_status_changed_at(rocket_id, "returned")))
	if return_stamp == "" or return_stamp == "0":
		return_stamp = str(int(Time.get_unix_time_from_system()))
	return "%s-%s-%s" % [rocket_id, target_id, return_stamp]

func _rocket_cost(rocket_id: String) -> int:
	if rocket_id == "":
		return 0
	return RocketSpecs.get_cost(rocket_id)

func _get_app_controller() -> Node:
	return preload("res://Scripts/Utils/AppControllerHelper.gd").get_instance()

func _show_tutorial_hint_once(action_key: String, message: String) -> void:
	preload("res://Scripts/Utils/AppControllerHelper.gd").show_tutorial_hint_once(action_key, message)

func _return_to_base() -> void:
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if rm:
		var rocket_id = str(_returned.get("rocket_id", ""))
		if rocket_id != "":
			rm.finalize_return(rocket_id)
		rm.clear_returned_mission()
	var tree = Engine.get_main_loop() as SceneTree
	if tree == null:
		return
	var scene_manager = null
	if tree.current_scene:
		scene_manager = tree.current_scene.get_node_or_null("SceneManager")
	if scene_manager and scene_manager.has_method("change_to_scene"):
		scene_manager.change_to_scene("res://Scenes/Earth/earth_base_1.tscn")
	else:
		tree.change_scene_to_file("res://Scenes/Earth/earth_base_1.tscn")
