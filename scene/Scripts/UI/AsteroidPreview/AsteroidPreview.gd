extends Node3D

const PREVIEW_SCENE_PATH := "res://Scenes/UI/AsteroidPreview/asteroid_preview.tscn"
const MINING_SCENE_PATH := "res://Scenes/UI/SidescrollMining.tscn"
const PanelStyle = preload("res://Scripts/UI/PanelStyle.gd")
const GameplayAnalytics = preload("res://Scripts/Systems/GameplayAnalytics.gd")
const RocketsManager = preload("res://Scripts/Utils/RocketsManager.gd")
const ResourceYield = preload("res://Scripts/Utils/ResourceYield.gd")
const AppControllerHelper = preload("res://Scripts/Utils/AppControllerHelper.gd")
const MiningInventory = preload("res://Scripts/Utils/MiningInventory.gd")
const MissionObjectiveResolver = preload("res://Scripts/Utils/MissionObjectiveResolver.gd")

const RETRY_PENALTY_FRANCS := 50000000  # 50M franc penalty for retry after fuel depletion

@onready var ui_container: Control = $CanvasLayer/UI
@onready var mine_btn: Button = $CanvasLayer/UI/MineButton
@onready var return_btn: Button = $CanvasLayer/UI/ReturnButton
@onready var target_label: Label = $CanvasLayer/UI/TargetLabel
@onready var minigame_container: Control = $CanvasLayer/MinigameContainer
@onready var salvage_dialog: PanelContainer = $CanvasLayer/SalvageDialog
@onready var salvage_title: Label = $CanvasLayer/SalvageDialog/DialogVBox/Title
@onready var salvage_message: Label = $CanvasLayer/SalvageDialog/DialogVBox/Message
@onready var salvage_button: Button = $CanvasLayer/SalvageDialog/DialogVBox/ButtonRow/SalvageButton
@onready var retry_button: Button = $CanvasLayer/SalvageDialog/DialogVBox/ButtonRow/RetryButton

var _current_target_id := ""
var _current_target_type := ""
var _current_rocket_id := ""
var _current_yield := {}
var _minigame_instance = null
var _starter_contract_context := {}
var _last_mining_collected := {}
var _last_mining_report := {}

func _ready():
	print("[Preview] _ready called")
	
	# Apply shared panel/button/text styling for preview controls.
	PanelStyle.apply_button(mine_btn, true)
	PanelStyle.apply_outline_button(return_btn)
	PanelStyle.apply_body_on_dark(target_label)
	_style_salvage_dialog()
	
	mine_btn.pressed.connect(_on_mine_pressed)
	return_btn.pressed.connect(_on_return_pressed)
	
	var rm = RocketsManager
	var preview = rm.get_preview_target()
	_starter_contract_context = _build_starter_contract_context(rm)
	
	print("[Preview] Preview data: ", preview)
	
	_current_target_id = str(preview.get("id", ""))
	_current_target_type = str(preview.get("type", "asteroid"))
	_current_rocket_id = str(preview.get("rocket_id", ""))
	
	print("[Preview] Parsed: target_id=%s, type=%s, rocket=%s" % [_current_target_id, _current_target_type, _current_rocket_id])
	
	if _current_target_id == "":
		target_label.text = "No target"
		mine_btn.disabled = true
		return_btn.disabled = true
		print("[Preview] ERROR: No target ID!")
		return
	
	# Get yield data
	var resource_yield = ResourceYield
	var targets = rm.get_detected_targets()
	var level = 1
	for t in targets:
		if str(t.get("id", "")) == _current_target_id:
			level = int(t.get("level", 1))
			break
	
	_current_yield = resource_yield.get_yield_for_target(_current_target_id, _current_target_type, level, 1.0)
	
	var rocket_custom = preview.get("rocket_customization", {})
	var custom_text = ""
	if typeof(rocket_custom) == TYPE_DICTIONARY:
		var flag = str(rocket_custom.get("flag", ""))
		var logo = str(rocket_custom.get("logo", ""))
		if flag != "" or logo != "":
			custom_text = " • %s/%s" % [flag if flag != "" else "No Flag", logo if logo != "" else "No Logo"]
	var laser_level = RocketsManager.get_laser_level(_current_rocket_id)
	var depletion_note = ""
	if MiningInventory.is_depleted_for_laser(_current_target_id, laser_level):
		depletion_note = "\n⚠ Depleted at laser level %d — upgrade your laser to mine more" % laser_level
	target_label.text = "Target: %s (Level %d)%s%s" % [_current_target_id, level, custom_text, depletion_note]
	GameplayAnalytics.emit_event("mission_target_preview_opened", {
		"target_id": _current_target_id,
		"target_type": _current_target_type,
		"rocket_id": _current_rocket_id,
		"target_level": level,
		"mineable_pct": float(_current_yield.get("mineable_pct", 0.0))
	})
	
	print("[Preview] Ready - target=%s, rocket=%s, yield=%s" % [_current_target_id, _current_rocket_id, str(_current_yield)])
	# Auto-start mining to skip the blank preview screen entirely.
	call_deferred("_on_mine_pressed")

func _on_mine_pressed():
	print("[Preview] Mine button pressed")
	print("[Preview] _current_yield = ", _current_yield)
	
	if _current_yield.is_empty():
		print("[Preview] ERROR: No yield data")
		return
	GameplayAnalytics.emit_event("mining_entry_requested", {
		"target_id": _current_target_id,
		"target_type": _current_target_type,
		"rocket_id": _current_rocket_id
	})
	AppControllerHelper.record_tutorial_action("start_mining", {
		"target_id": _current_target_id
	})
	
	print("[Preview] Hiding UI...")
	mine_btn.disabled = true
	return_btn.disabled = false
	ui_container.visible = false
	
	print("[Preview] Loading mining scene...")
	var MiningScene = load(MINING_SCENE_PATH)
	_minigame_instance = MiningScene.instantiate()
	print("[Preview] Adding to container...")
	minigame_container.add_child(_minigame_instance)
	
	print("[Preview] Connecting signal...")
	_minigame_instance.mining_completed.connect(_on_mining_completed)
	
	var is_planet = _current_target_type == "planet"
	var level = int(_current_yield.get("level", 1))
	var minerals = _current_yield.get("minerals", {})
	var mineable_pct = float(_current_yield.get("mineable_pct", 0.5))
	var session_context := {}
	session_context["target_type"] = _current_target_type
	var generation_signature = _current_yield.get("generation_signature", {})
	if typeof(generation_signature) == TYPE_DICTIONARY and not generation_signature.is_empty():
		session_context["generation_signature"] = generation_signature.duplicate(true)
	if not _starter_contract_context.is_empty():
		session_context["starter_contract"] = _starter_contract_context.duplicate(true)
	# Tag mission mode so the mining HUD can show the right goal.
	if _is_starter_contract_active():
		session_context["mission_mode"] = "contractor"
	elif RocketsManager.get_mission_stage() <= 4:
		session_context["mission_mode"] = "tutorial"
	else:
		session_context["mission_mode"] = "free"
	
	print("[Preview] Starting mining: level=%d, minerals=%s, mineable=%f" % [level, str(minerals), mineable_pct])
	_minigame_instance.start_mining(is_planet, level, _current_target_id, minerals, mineable_pct, session_context)
	print("[Preview] Mining started!")

func _on_mining_completed(minerals_collected: Dictionary, score: int):
	print("[Preview] Mining completed: score=%d" % score)
	_last_mining_collected = minerals_collected.duplicate(true)
	_last_mining_report = {}
	if _minigame_instance and _minigame_instance.has_method("get_completion_report"):
		_last_mining_report = _minigame_instance.get_completion_report()
	_persist_mining_result(_last_mining_collected)
	if not minerals_collected.is_empty():
		AppControllerHelper.record_tutorial_action("mine_target", {
			"target_id": _current_target_id,
			"score": score
		})

	if _minigame_instance:
		_minigame_instance.queue_free()
		_minigame_instance = null

	# Post-tutorial fuel depletion: offer partial salvage or retry with penalty
	var completion_reason = str(_last_mining_report.get("reason", ""))
	var is_tutorial = _is_starter_contract_active() or RocketsManager.get_mission_stage() <= 1
	if completion_reason == "fuel_depleted" and not is_tutorial:
		_show_salvage_or_retry_dialog(minerals_collected)
		return

	# User pressed Return — skip the choice screen and go straight home
	if completion_reason == "manual_return" or completion_reason == "beam_depleted":
		_on_return_pressed()
		return

	ui_container.visible = true
	mine_btn.disabled = false
	return_btn.disabled = false

	if _is_starter_contract_active() and not _starter_requirements_met(_last_mining_collected):
		target_label.text = "Order incomplete — mine again or return home."

func _show_salvage_or_retry_dialog(minerals_collected: Dictionary) -> void:
	salvage_dialog.add_theme_stylebox_override(
		"panel",
		PanelStyle.create_glass_panel_style(Color(0.06, 0.10, 0.16, 0.97), 0.70, 12, 18, 16)
	)
	salvage_title.text = "Fuel Depleted"
	PanelStyle.apply_title_on_dark(salvage_title)

	if minerals_collected.is_empty():
		salvage_message.text = "You ran out of fuel with nothing collected.\nRetry or return home empty-handed."
	else:
		var total_kg := 0
		for k in minerals_collected:
			total_kg += int(minerals_collected.get(k, 0))
		salvage_message.text = "You ran out of fuel with %d kg collected.\nKeep the partial haul or retry with a penalty." % total_kg
	retry_button.text = "Retry (-%dM F penalty)" % (RETRY_PENALTY_FRANCS / 1000000)
	salvage_dialog.visible = true
	for conn in salvage_button.pressed.get_connections():
		salvage_button.pressed.disconnect(conn.callable)
	for conn in retry_button.pressed.get_connections():
		retry_button.pressed.disconnect(conn.callable)
	salvage_button.pressed.connect(func():
		salvage_dialog.visible = false
		ui_container.visible = true
		mine_btn.disabled = false
		return_btn.disabled = false
		target_label.text = "Partial haul saved — return home or mine again."
	)
	retry_button.pressed.connect(func():
		salvage_dialog.visible = false
		# Reverse the minerals that were auto-added by _complete_mining
		if not minerals_collected.is_empty():
			RocketsManager.consume_from_inventory(minerals_collected)
		_last_mining_collected = {}
		_persist_mining_result({})
		# Apply franc penalty
		var app = AppControllerHelper.get_instance()
		if app and app.has_method("add_franc_balance"):
			app.add_franc_balance(-RETRY_PENALTY_FRANCS, "retry_penalty")
		ui_container.visible = true
		mine_btn.disabled = false
		return_btn.disabled = false
		target_label.text = "Fuel penalty applied. Mine again to collect resources."
	)

func _style_salvage_dialog() -> void:
	if salvage_dialog == null:
		return
	PanelStyle.apply_body_on_dark(salvage_message)
	PanelStyle.apply_button(salvage_button, true)
	PanelStyle.apply_outline_button(retry_button, Color(PanelStyle.ACCENT_WARM.r, PanelStyle.ACCENT_WARM.g, PanelStyle.ACCENT_WARM.b, 0.82))

func _on_return_pressed():
	print("[Preview] Return home pressed")
	GameplayAnalytics.emit_event("mission_return_requested", {
		"rocket_id": _current_rocket_id,
		"target_id": _current_target_id,
		"target_type": _current_target_type
	})
	AppControllerHelper.record_tutorial_action("return_rocket_home", {
		"rocket_id": _current_rocket_id,
		"target_id": _current_target_id
	})
	var rm = RocketsManager
	var target_label = _current_target_id
	var preview = rm.get_preview_target()
	if not preview.is_empty():
		target_label = str(preview.get("label", target_label))
	var operation_mode = rm.get_operation_mode_for_rocket(_current_rocket_id)
	var trip_contractor = rm.get_trip_selected_contractor()
	var trip_offer = rm.get_trip_contract_offer()
	var mission = rm.get_mission_for_rocket(_current_rocket_id)
	var objective = mission.get("objective", {})
	if typeof(objective) != TYPE_DICTIONARY:
		objective = {}
	var objective_complete = MissionObjectiveResolver.is_complete(objective, {
		"complete": true,
		"mining_run_collected": _last_mining_collected
	}) if not objective.is_empty() else _starter_requirements_met(_last_mining_collected)
	rm.set_returned_mission(_current_rocket_id, _current_target_id, target_label, _current_target_type, operation_mode, {
		"mission_objective": objective.duplicate(true),
		"objective_result": {
			"type": str(objective.get("type", "")),
			"complete": objective_complete,
			"minerals": _last_mining_collected.duplicate(true)
		},
		"mining_run_collected": _last_mining_collected.duplicate(true),
		"mining_report": _last_mining_report.duplicate(true),
		"starter_contract_context": _starter_contract_context.duplicate(true),
		"starter_contract_complete": _starter_requirements_met(_last_mining_collected),
		"trip_contractor_id": str(trip_contractor.get("id", "")),
		"trip_contractor_name": str(trip_contractor.get("name", "")),
		"trip_contractor_effect": str(trip_contractor.get("effect", "")),
		"trip_requested_minerals": trip_offer.get("requested_minerals", {}).duplicate(true)
	})
	rm.return_home(_current_rocket_id)
	rm.clear_preview_target()
	get_tree().change_scene_to_file("res://Scenes/Transitions/rocket_return.tscn")

func _build_starter_contract_context(rm) -> Dictionary:
	if rm == null:
		return {}
	var stage := int(rm.get_mission_stage())
	if stage == 1:
		# M1 starter contract — use selected contractor, or fall back to first available
		var selected = rm.get_starter_selected_contractor()
		if selected.is_empty():
			var all_contractors = rm.get_starter_contractors()
			if all_contractors.is_empty():
				return {}
			selected = all_contractors[0]
		var requested = rm.get_starter_requested_minerals(str(selected.get("id", "")))
		if requested.is_empty():
			requested = selected.get("requested_minerals", {})
		if typeof(requested) != TYPE_DICTIONARY or requested.is_empty():
			return {}
		return {
			"active": true,
			"id": str(selected.get("id", "")),
			"name": str(selected.get("name", "Contractor")),
			"requested_minerals": requested.duplicate(true)
		}
	# M2+ trip contractor: read requested_minerals from the offer's contractors array
	var offer: Dictionary = rm.get_trip_contract_offer()
	if offer.is_empty():
		return {}
	var contractors_any = offer.get("contractors", [])
	if typeof(contractors_any) != TYPE_ARRAY or contractors_any.is_empty():
		return {}
	var selected_id := str(offer.get("selected_contractor", ""))
	# Find the selected contractor, or fall back to the first available
	var target_contractor: Dictionary = {}
	for c_any in contractors_any:
		if typeof(c_any) != TYPE_DICTIONARY:
			continue
		if selected_id != "" and str(c_any.get("id", "")) == selected_id:
			target_contractor = c_any
			break
	if target_contractor.is_empty() and typeof(contractors_any[0]) == TYPE_DICTIONARY:
		target_contractor = contractors_any[0]
	if target_contractor.is_empty():
		return {}
	var requested: Dictionary = target_contractor.get("requested_minerals", {})
	if typeof(requested) != TYPE_DICTIONARY or requested.is_empty():
		return {}
	return {
		"active": true,
		"id": str(target_contractor.get("id", "")),
		"name": str(target_contractor.get("name", "Contractor")),
		"requested_minerals": requested.duplicate(true)
	}

func _is_starter_contract_active() -> bool:
	return bool(_starter_contract_context.get("active", false)) and typeof(_starter_contract_context.get("requested_minerals", {})) == TYPE_DICTIONARY

func _starter_requirements_met(collected: Dictionary) -> bool:
	if not _is_starter_contract_active():
		return true
	var requested = _starter_contract_context.get("requested_minerals", {})
	if typeof(requested) != TYPE_DICTIONARY or requested.is_empty():
		return true
	for key in requested.keys():
		var required_amount = max(int(requested.get(key, 0)), 0)
		if required_amount <= 0:
			continue
		var collected_amount = int(collected.get(str(key), 0))
		if collected_amount < required_amount:
			return false
	return true


func _persist_mining_result(collected: Dictionary) -> void:
	if _current_target_id == "":
		return
	var inv = MiningInventory
	if not inv:
		return
	var data = inv.load_state()
	var targets: Dictionary = data.get("targets", {})
	# Preserve existing target metadata (e.g. depleted_laser_levels) when updating
	var existing: Dictionary = targets.get(_current_target_id, {}).duplicate(true)
	var total_collected := 0
	for value in collected.values():
		total_collected += int(value)
	existing["original_mass"] = total_collected
	existing["remaining_mass"] = 0
	existing["collected"] = collected.duplicate(true)
	if not existing.has("depleted_laser_levels"):
		existing["depleted_laser_levels"] = []
	targets[_current_target_id] = existing
	data["targets"] = targets
	inv.save_state(data)

## Returns the player's current mining laser level (1 until room upgrades land).
func _get_laser_level() -> int:
	return RocketsManager.get_laser_level(_current_rocket_id)
