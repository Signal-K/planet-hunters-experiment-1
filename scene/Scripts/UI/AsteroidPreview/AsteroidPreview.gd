extends Node3D

const PREVIEW_SCENE_PATH := "res://Scenes/UI/AsteroidPreview/asteroid_preview.tscn"
const MINING_SCENE_PATH := "res://Scenes/UI/SidescrollMining.tscn"
const PanelStyle = preload("res://Scripts/UI/PanelStyle.gd")
const GameplayAnalytics = preload("res://Scripts/Systems/GameplayAnalytics.gd")
const RocketsManager = preload("res://Scripts/Utils/RocketsManager.gd")
const ResourceYield = preload("res://Scripts/Utils/ResourceYield.gd")
const AppControllerHelper = preload("res://Scripts/Utils/AppControllerHelper.gd")
const MiningInventory = preload("res://Scripts/Utils/MiningInventory.gd")

@onready var ui_container: Control = $CanvasLayer/UI
@onready var mine_btn: Button = $CanvasLayer/UI/MineButton
@onready var return_btn: Button = $CanvasLayer/UI/ReturnButton
@onready var target_label: Label = $CanvasLayer/UI/TargetLabel
@onready var minigame_container: Control = $CanvasLayer/MinigameContainer

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
	PanelStyle.apply_button(return_btn, false)
	PanelStyle.apply_body(target_label)
	
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
	target_label.text = "Target: %s (Level %d)%s" % [_current_target_id, level, custom_text]
	GameplayAnalytics.emit_event("mission_target_preview_opened", {
		"target_id": _current_target_id,
		"target_type": _current_target_type,
		"rocket_id": _current_rocket_id,
		"target_level": level,
		"mineable_pct": float(_current_yield.get("mineable_pct", 0.0))
	})
	
	print("[Preview] Ready - target=%s, rocket=%s, yield=%s" % [_current_target_id, _current_rocket_id, str(_current_yield)])

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
	
	if _should_restart_starter_run():
		await _restart_starter_run("Order incomplete. Restarting mining run...")
		return
	
	ui_container.visible = true
	mine_btn.disabled = false
	return_btn.disabled = false

func _on_return_pressed():
	if _is_starter_contract_active() and not _starter_requirements_met(_last_mining_collected):
		await _restart_starter_run("Complete the contractor order before returning.")
		return
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
	rm.set_returned_mission(_current_rocket_id, _current_target_id, target_label, _current_target_type, operation_mode, {
		"mining_run_collected": _last_mining_collected.duplicate(true),
		"mining_report": _last_mining_report.duplicate(true),
		"starter_contract_context": _starter_contract_context.duplicate(true),
		"starter_contract_complete": _starter_requirements_met(_last_mining_collected)
	})
	rm.return_home(_current_rocket_id)
	rm.clear_preview_target()
	get_tree().change_scene_to_file("res://Scenes/Transitions/rocket_return.tscn")

func _build_starter_contract_context(rm) -> Dictionary:
	if rm == null:
		return {}
	if int(rm.get_mission_stage()) != 1:
		return {}
	var selected = rm.get_starter_selected_contractor()
	if selected.is_empty():
		return {}
	var requested = rm.get_starter_requested_minerals(str(selected.get("id", "")))
	if requested.is_empty():
		return {}
	return {
		"active": true,
		"id": str(selected.get("id", "")),
		"name": str(selected.get("name", "Contractor")),
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

func _should_restart_starter_run() -> bool:
	if not _is_starter_contract_active():
		return false
	var reason = str(_last_mining_report.get("reason", ""))
	if reason == "":
		return not _starter_requirements_met(_last_mining_collected)
	return not _starter_requirements_met(_last_mining_collected)

func _restart_starter_run(message: String) -> void:
	ui_container.visible = true
	mine_btn.disabled = true
	return_btn.disabled = true
	target_label.text = message
	await get_tree().create_timer(1.0).timeout
	target_label.text = "Target: %s" % _current_target_id
	_on_mine_pressed()

func _persist_mining_result(collected: Dictionary) -> void:
	if _current_target_id == "":
		return
	var inv = MiningInventory
	if not inv:
		return
	var data = inv.load_state()
	var targets: Dictionary = data.get("targets", {})
	var total_collected := 0
	for value in collected.values():
		total_collected += int(value)
	targets[_current_target_id] = {
		"original_mass": total_collected,
		"remaining_mass": 0,
		"collected": collected.duplicate(true)
	}
	data["targets"] = targets
	inv.save_state(data)
