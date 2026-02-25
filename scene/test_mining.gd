extends Node3D

@onready var minigame_container: Control = $UI/MinigameContainer
@onready var button: Button = $UI/Button
@onready var result_label: Label = $UI/ResultLabel

var _minigame_instance = null

func _ready() -> void:
	button.pressed.connect(_on_mine_pressed)
	result_label.text = "Click MINE to start"

func _on_mine_pressed() -> void:
	if _minigame_instance:
		_minigame_instance.queue_free()
	
	var MiningScene = preload("res://Scenes/UI/SidescrollMining.tscn")
	_minigame_instance = MiningScene.instantiate()
	minigame_container.add_child(_minigame_instance)
	
	_minigame_instance.mining_completed.connect(_on_mining_completed)
	_minigame_instance.start_mining(false, 1)
	
	button.visible = false
	result_label.text = "Mining..."

func _on_mining_completed(minerals: Dictionary, score: int) -> void:
	result_label.text = "Score: %d | Minerals: %s" % [score, str(minerals)]
	button.visible = true
	button.text = "MINE AGAIN"
