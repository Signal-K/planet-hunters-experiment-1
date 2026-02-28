extends Node2D

const ORBIT_MULTIPLIER := 0.8
const EARTH_MULTIPLIER := 1.0
const SUBCONTRACTOR_FEE := 0
const EARTH_SALE_MIN_LEVEL := 3
const SCRAP_REFUND_PCT := 0.20
const SALVAGE_REFUND_PCT := 0.10
const MISSION4_AFFINITY_GATE := 3
const MISSION5_AFFINITY_GAIN := 2
const GameplayAnalytics = preload("res://Scripts/Systems/GameplayAnalytics.gd")
const RocketSpecs = preload("res://Scripts/Utils/RocketSpecs.gd")
const NavigationMixin = preload("res://Scripts/Utils/NavigationMixin.gd")
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
var _last_exposure_awarded := 0
var _science_card: PanelContainer = null

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
	_build_science_card()

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
	var custom = _returned.get("rocket_customization", {})
	var custom_suffix = ""
	if typeof(custom) == TYPE_DICTIONARY:
		var flag = str(custom.get("flag", ""))
		var logo = str(custom.get("logo", ""))
		if flag != "" or logo != "":
			custom_suffix = " • %s/%s" % [flag if flag != "" else "No Flag", logo if logo != "" else "No Logo"]
	subtitle_label.text = "Rocket %s returning from %s%s" % [rocket_id if rocket_id != "" else "", label, custom_suffix]
	var subcontractor_name = str(_subcontractor.get("name", "Subcontractor"))
	status_label.text = _build_progress_feedback_text("Estimated orbit sale (%s): %s F" % [subcontractor_name, str(_total_value)])
	_apply_mission4_buyer_hint()
	_refresh_action_buttons()

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
		_award_mission_exposure(app)
	var sm = preload("res://Scripts/Utils/SubcontractorManager.gd")
	if sm:
		var affinity_gain = MISSION5_AFFINITY_GAIN if rm and int(rm.get_mission_stage()) >= 5 else 1
		sm.add_affinity(str(_subcontractor.get("id", "")), affinity_gain)
	_add_mission_log("sell_earth" if to_earth else "sell_orbit", net)
	preload("res://Scripts/Utils/AppControllerHelper.gd").record_tutorial_action("resolve_mission_debrief", {
		"mode": "sell_earth" if to_earth else "sell_orbit"
	})
	_sold = true
	_closed_out = true
	_last_exposure_awarded = _mission_exposure_reward()
	status_label.text = _build_progress_feedback_text("Sale complete. Credited %s F. Exposure +%s." % [str(net), _last_exposure_awarded], _last_exposure_awarded)
	_clear_cargo()
	if rm:
		rm.remove_orbiting_rocket(str(_returned.get("rocket_id", "")))
		if int(rm.get_mission_stage()) >= 5:
			rm.clear_mission5_contract_offer()
	_lock_action_buttons()
	_show_science_card()

func _keep_cargo() -> void:
	_last_exposure_awarded = _mission_exposure_reward()
	status_label.text = _build_progress_feedback_text("Cargo stored. You can sell later.", _last_exposure_awarded)
	var app = _get_app_controller()
	if app:
		_award_mission_exposure(app)
	_add_mission_log("keep_cargo", 0)
	preload("res://Scripts/Utils/AppControllerHelper.gd").record_tutorial_action("resolve_mission_debrief", {
		"mode": "keep_cargo"
	})
	_closed_out = true
	_show_science_card()

func _archive_ship() -> void:
	if _closed_out:
		return
	var app = _get_app_controller()
	if app:
		_award_mission_exposure(app)
	_add_mission_log("archive", 0)
	preload("res://Scripts/Utils/AppControllerHelper.gd").record_tutorial_action("resolve_mission_debrief", {
		"mode": "archive"
	})
	status_label.text = "Ship archived."
	_last_exposure_awarded = _mission_exposure_reward()
	status_label.text = _build_progress_feedback_text("Ship archived.", _last_exposure_awarded)
	_closed_out = true
	_lock_action_buttons()
	_show_science_card()

func _scrap_ship(refund_pct: float) -> void:
	if _closed_out:
		return
	var rocket_id = str(_returned.get("rocket_id", ""))
	var refund = int(round(_rocket_cost(rocket_id) * refund_pct))
	var app = _get_app_controller()
	if app:
		app.add_franc_balance(refund, "scrap")
		_award_mission_exposure(app)
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if rm:
		rm.set_destroyed(rocket_id)
		rm.remove_orbiting_rocket(rocket_id)
	_add_mission_log("scrap" if refund_pct >= 0.2 else "salvage", refund)
	preload("res://Scripts/Utils/AppControllerHelper.gd").record_tutorial_action("resolve_mission_debrief", {
		"mode": "scrap" if refund_pct >= 0.2 else "salvage"
	})
	_last_exposure_awarded = _mission_exposure_reward()
	status_label.text = _build_progress_feedback_text("Ship processed. Refund %s F. Exposure +%s." % [str(refund), _last_exposure_awarded], _last_exposure_awarded)
	_closed_out = true
	_lock_action_buttons()
	_show_science_card()

func _leave_in_orbit() -> void:
	if _closed_out:
		return
	var app = _get_app_controller()
	if app:
		_award_mission_exposure(app)
	_add_mission_log("leave_orbit", 0)
	preload("res://Scripts/Utils/AppControllerHelper.gd").record_tutorial_action("resolve_mission_debrief", {
		"mode": "leave_orbit"
	})
	_last_exposure_awarded = _mission_exposure_reward()
	status_label.text = _build_progress_feedback_text("Ship left in orbit.", _last_exposure_awarded)
	_closed_out = true
	_lock_action_buttons()
	_show_science_card()

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

func _refresh_action_buttons() -> void:
	var has_cargo = not _collected.is_empty()
	var can_act = not _closed_out
	sell_orbit_button.disabled = (not can_act) or (not has_cargo)
	var app = _get_app_controller()
	if app:
		var level = int(app.get_experience_level())
		if level < EARTH_SALE_MIN_LEVEL:
			sell_earth_button.disabled = true
			sell_earth_button.text = "Bring to Earth (Locked • Lvl %s)" % str(EARTH_SALE_MIN_LEVEL)
		else:
			sell_earth_button.disabled = (not can_act) or (not has_cargo)
			sell_earth_button.text = "Sell on Earth"
	else:
		sell_earth_button.disabled = (not can_act) or (not has_cargo)
	keep_button.disabled = true
	salvage_button.disabled = true
	scrap_button.disabled = not can_act
	leave_button.disabled = not can_act
	if archive_button:
		archive_button.disabled = not can_act

func _set_empty_state() -> void:
	title_label.text = "Mission Debrief"
	subtitle_label.text = "No returned mission found."
	status_label.text = _build_progress_feedback_text("Open missions from Launchpad to continue.")
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
		"operation_mode": str(_returned.get("operation_mode", "contract")),
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
		"target_type": str(_returned.get("type", "asteroid")),
		"label": str(entry.get("label", "")),
		"badge": str(entry.get("badge", "")),
		"mission_count": mission_count,
		"cargo_units": _count_cargo_units(),
		"cargo_types": _collected.size(),
		"subcontractor_id": str(_subcontractor.get("id", "")),
		"subcontractor_name": str(_subcontractor.get("name", ""))
	}
	GameplayAnalytics.emit_event("mission_debrief_resolved", event_payload)
	if completed_count >= 1:
		if rm:
			rm.unlock("starterrocket2")
	if completed_count == 1:
		GameplayAnalytics.emit_event("first_mission_completed", event_payload)
		call_deferred("_show_mission_complete_beat")
	if rm and int(rm.get_mission_stage()) >= 5:
		preload("res://Scripts/Utils/AppControllerHelper.gd").record_tutorial_action("complete_contractor_mission", {
			"badge": badge
		})

func _count_cargo_units() -> int:
	var total := 0
	for value in _collected.values():
		total += int(value)
	return total

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

func _mission_exposure_reward() -> int:
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if not rm:
		return 4
	var stage = int(rm.get_mission_stage())
	return int(rm.get_mission_exposure_reward(stage))

func _build_progress_feedback_text(primary_line: String, awarded_exposure: int = -1) -> String:
	var objective_done = not _returned.is_empty() and str(_returned.get("target_id", "")) != ""
	var objective_line = "Objective: %s" % ("Completed" if objective_done else "Pending")

	var exposure_value = awarded_exposure if awarded_exposure >= 0 else _mission_exposure_reward()
	var exposure_prefix = "Exposure gained" if awarded_exposure >= 0 else "Exposure on resolve"
	var exposure_line = "%s: +%s" % [exposure_prefix, exposure_value]

	var unlock_line = "Next unlock progress: unavailable"
	var app = _get_app_controller()
	if app:
		var level = int(app.get_experience_level())
		var xp = 0
		if app.has_method("get_experience_xp"):
			xp = int(app.get_experience_xp())
		var xp_to_next = 0
		if app.has_method("get_xp_required_for_next_level"):
			xp_to_next = int(app.get_xp_required_for_next_level())
		var next_level = level + 1
		if xp_to_next > 0:
			unlock_line = "Next unlock progress: L%s -> L%s (%s/%s XP)" % [level, next_level, xp, xp_to_next]
		else:
			unlock_line = "Next unlock progress: L%s" % level

	var lines := []
	if primary_line.strip_edges() != "":
		lines.append(primary_line)
	lines.append(objective_line)
	lines.append(exposure_line)
	lines.append(unlock_line)
	lines.append_array(_build_advanced_stat_lines(exposure_value))
	return "\n".join(lines)

func _build_advanced_stat_lines(exposure_value: int) -> Array:
	var lines: Array = []
	var mode = str(_returned.get("operation_mode", "contract")).strip_edges().to_lower()
	if mode == "":
		mode = "contract"
	var mode_label = "Survey Route" if mode == "survey" else "Contract Route"
	lines.append("Operation mode: %s" % mode_label)

	var target_id = str(_returned.get("target_id", ""))
	var target_type = str(_returned.get("type", "asteroid"))
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if rm and target_id != "":
		var profile = rm.build_target_profile(target_id, target_type)
		var distance_au = float(profile.get("distance_au", 0.0))
		var required_level = int(profile.get("required_level", 1))
		lines.append("Target profile: %.0f AU • Required L%d • %s" % [distance_au, required_level, target_type.capitalize()])

	var cargo_units = _count_cargo_units()
	if cargo_units > 0:
		var value_per_unit = float(_total_value) / float(cargo_units)
		lines.append("Cargo efficiency: %s units • %.1f F/unit" % [cargo_units, value_per_unit])
		lines.append("Exposure efficiency: %.3f exposure/unit" % (float(exposure_value) / float(cargo_units)))
	else:
		lines.append("Cargo efficiency: 0 units")
		lines.append("Exposure efficiency: n/a")
	return lines

func _award_mission_exposure(app_controller: Node) -> void:
	if app_controller == null:
		return
	var exposure = _mission_exposure_reward()
	if exposure <= 0:
		return
	app_controller.add_experience(exposure, "mission_exposure")

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


func _show_mission_complete_beat() -> void:
	var canvas = CanvasLayer.new()
	canvas.layer = 150
	add_child(canvas)

	var overlay = ColorRect.new()
	overlay.color = Color(0.0, 0.0, 0.0, 0.0)
	overlay.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	overlay.mouse_filter = Control.MOUSE_FILTER_IGNORE
	canvas.add_child(overlay)

	var center = CenterContainer.new()
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	center.mouse_filter = Control.MOUSE_FILTER_IGNORE
	canvas.add_child(center)

	var panel = PanelContainer.new()
	panel.custom_minimum_size = Vector2(560, 0)
	panel.modulate.a = 0.0
	center.add_child(panel)

	var style = StyleBoxFlat.new()
	style.bg_color = Color(0.04, 0.10, 0.20, 0.97)
	style.border_color = Color(0.25, 0.65, 1.0, 1.0)
	style.set_border_width_all(2)
	style.set_corner_radius_all(10)
	style.content_margin_left = 32
	style.content_margin_right = 32
	style.content_margin_top = 28
	style.content_margin_bottom = 28
	panel.add_theme_stylebox_override("panel", style)

	var vbox = VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 12)
	panel.add_child(vbox)

	var panel_style = preload("res://Scripts/UI/PanelStyle.gd")

	var title = Label.new()
	title.text = "Mission 1 Complete!"
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	panel_style.apply_title(title)
	title.add_theme_color_override("font_color", Color(0.4, 0.85, 1.0))
	vbox.add_child(title)

	var body = Label.new()
	body.text = "Your mission data has been recorded.\nCitizen science contribution confirmed."
	body.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	body.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	panel_style.apply_body(body)
	vbox.add_child(body)

	var tween = create_tween()
	tween.tween_property(panel, "modulate:a", 1.0, 0.4)
	tween.tween_interval(2.2)
	tween.tween_property(panel, "modulate:a", 0.0, 0.4)
	tween.tween_callback(canvas.queue_free)

func _build_science_card() -> void:
	var vbox = $UI/Root/Panel/VBox
	if vbox == null:
		return
	var target_type = str(_returned.get("type", "asteroid"))
	var dataset = "Active Asteroids Programme" if target_type == "asteroid" else "NASA TESS Mission"
	var label_text = str(_returned.get("label", "Unknown Target"))

	_science_card = PanelContainer.new()
	var style = StyleBoxFlat.new()
	style.bg_color = Color(0.04, 0.10, 0.20, 0.95)
	style.border_color = Color(0.25, 0.65, 1.0, 0.8)
	style.set_border_width_all(2)
	style.set_corner_radius_all(6)
	style.content_margin_left = 12
	style.content_margin_right = 12
	style.content_margin_top = 10
	style.content_margin_bottom = 10
	_science_card.add_theme_stylebox_override("panel", style)
	_science_card.visible = false

	var inner = VBoxContainer.new()
	inner.add_theme_constant_override("separation", 6)
	_science_card.add_child(inner)

	var panel_style = preload("res://Scripts/UI/PanelStyle.gd")

	var header = Label.new()
	header.text = "Scientific Observation Complete"
	panel_style.apply_body(header)
	header.add_theme_color_override("font_color", Color(0.4, 0.8, 1.0))
	inner.add_child(header)

	var sep = HSeparator.new()
	inner.add_child(sep)

	var target_label = Label.new()
	target_label.text = "Target: %s" % label_text
	panel_style.apply_muted(target_label)
	inner.add_child(target_label)

	var dataset_label = Label.new()
	dataset_label.text = "Dataset: %s" % dataset
	panel_style.apply_muted(dataset_label)
	inner.add_child(dataset_label)

	var contribution = Label.new()
	contribution.text = "Your mission data contributes to real citizen science research at starsailors.space"
	contribution.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	panel_style.apply_muted(contribution)
	inner.add_child(contribution)

	var footer = vbox.get_node_or_null("Footer")
	if footer:
		vbox.add_child(_science_card)
		vbox.move_child(_science_card, footer.get_index())
	else:
		vbox.add_child(_science_card)

func _show_science_card() -> void:
	if _science_card and is_instance_valid(_science_card):
		_science_card.visible = true

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
		NavigationMixin.go_back_to_earth(tree)
