extends Node3D

const ResourceYield = preload("res://Scripts/Utils/ResourceYield.gd")

@onready var minigame_container: Control = $UI/MinigameContainer
@onready var button: Button = $UI/Button
@onready var result_label: Label = $UI/ResultLabel

var _minigame_instance = null
var _target_id_input: LineEdit = null
var _planet_check: CheckBox = null

func _ready() -> void:
	_build_input_ui()
	button.pressed.connect(_on_mine_pressed)
	result_label.text = "Enter target ID and click MINE"

	if AppController.check_auto_start_mining():
		_on_mine_pressed()

func _build_input_ui() -> void:
	var ui: Control = $UI

	var vbox := VBoxContainer.new()
	vbox.layout_mode = 1
	vbox.anchor_left = 0.5
	vbox.anchor_top = 1.0
	vbox.anchor_right = 0.5
	vbox.anchor_bottom = 1.0
	vbox.offset_left = -150.0
	vbox.offset_top = -200.0
	vbox.offset_right = 150.0
	vbox.offset_bottom = -130.0
	vbox.grow_horizontal = 2
	vbox.grow_vertical = 0
	ui.add_child(vbox)

	var lbl := Label.new()
	lbl.text = "Target ID:"
	lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	vbox.add_child(lbl)

	_target_id_input = LineEdit.new()
	_target_id_input.placeholder_text = "e.g. mission-1-training-target"
	_target_id_input.text = "mission-1-training-target"
	vbox.add_child(_target_id_input)

	_planet_check = CheckBox.new()
	_planet_check.text = "Planet (unchecked = asteroid)"
	vbox.add_child(_planet_check)

func _on_mine_pressed() -> void:
	if _minigame_instance:
		_minigame_instance.queue_free()

	var target_id := _target_id_input.text.strip_edges() if _target_id_input else ""
	var is_planet := _planet_check != null and _planet_check.button_pressed
	var target_type := "planet" if is_planet else "asteroid"

	var yield_data := ResourceYield.get_yield_for_target(target_id, target_type, 1, 1.0)
	var minerals: Dictionary = yield_data.get("minerals", {})
	var mineable_pct: float = yield_data.get("mineable_pct", 0.5)

	var MiningScene = preload("res://Scenes/UI/SidescrollMining.tscn")
	_minigame_instance = MiningScene.instantiate()
	minigame_container.add_child(_minigame_instance)

	_minigame_instance.mining_completed.connect(_on_mining_completed)
	_minigame_instance.start_mining(is_planet, 1, target_id, minerals, mineable_pct, {})

	button.visible = false
	result_label.text = "Mining: %s (%s)" % [target_id if target_id != "" else "(random)", target_type]

func _on_mining_completed(minerals: Dictionary, score: int) -> void:
	result_label.text = "Score: %d | %s" % [score, str(minerals)]
	button.visible = true
	button.text = "MINE AGAIN"
