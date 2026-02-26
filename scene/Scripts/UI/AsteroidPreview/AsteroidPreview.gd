extends Node3D

const PREVIEW_SCENE_PATH := "res://Scenes/UI/AsteroidPreview/asteroid_preview.tscn"
const MINING_SCENE_PATH := "res://Scenes/UI/SidescrollMining.tscn"
const PanelStyle = preload("res://Scripts/UI/PanelStyle.gd")

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

func _ready():
	print("[Preview] _ready called")
	
	# Apply shared panel/button/text styling for preview controls.
	PanelStyle.apply_button(mine_btn, true)
	PanelStyle.apply_button(return_btn, false)
	PanelStyle.apply_body(target_label)
	
	mine_btn.pressed.connect(_on_mine_pressed)
	return_btn.pressed.connect(_on_return_pressed)
	
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	var preview = rm.get_preview_target()
	
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
	var resource_yield = preload("res://Scripts/Utils/ResourceYield.gd")
	var targets = rm.get_detected_targets()
	var level = 1
	for t in targets:
		if str(t.get("id", "")) == _current_target_id:
			level = int(t.get("level", 1))
			break
	
	_current_yield = resource_yield.get_yield_for_target(_current_target_id, _current_target_type, level, 1.0)
	
	target_label.text = "Target: %s (Level %d)" % [_current_target_id, level]
	
	print("[Preview] Ready - target=%s, rocket=%s, yield=%s" % [_current_target_id, _current_rocket_id, str(_current_yield)])

func _on_mine_pressed():
	print("[Preview] Mine button pressed")
	print("[Preview] _current_yield = ", _current_yield)
	
	if _current_yield.is_empty():
		print("[Preview] ERROR: No yield data")
		return
	preload("res://Scripts/Utils/AppControllerHelper.gd").record_tutorial_action("start_mining", {
		"target_id": _current_target_id
	})
	
	print("[Preview] Hiding UI...")
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
	
	print("[Preview] Starting mining: level=%d, minerals=%s, mineable=%f" % [level, str(minerals), mineable_pct])
	_minigame_instance.start_mining(is_planet, level, _current_target_id, minerals, mineable_pct)
	print("[Preview] Mining started!")

func _on_mining_completed(minerals_collected: Dictionary, score: int):
	print("[Preview] Mining completed: score=%d" % score)
	if not minerals_collected.is_empty():
		preload("res://Scripts/Utils/AppControllerHelper.gd").record_tutorial_action("mine_target", {
			"target_id": _current_target_id,
			"score": score
		})
	
	if _minigame_instance:
		_minigame_instance.queue_free()
		_minigame_instance = null
	
	ui_container.visible = true

func _on_return_pressed():
	print("[Preview] Return home pressed")
	preload("res://Scripts/Utils/AppControllerHelper.gd").record_tutorial_action("return_rocket_home", {
		"rocket_id": _current_rocket_id,
		"target_id": _current_target_id
	})
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	rm.return_home(_current_rocket_id)
	rm.clear_preview_target()
	get_tree().change_scene_to_file("res://Scenes/Transitions/rocket_return.tscn")
