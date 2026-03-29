extends Control

signal mining_completed(minerals: Dictionary, score: int)

const SIDESCROLL_MINING_SCENE := preload("res://Scenes/UI/SidescrollMining.tscn")

var _mining_instance: Control = null


func _ready() -> void:
	# Keep the legacy scene openable/editable in Godot.
	# Runtime delegation happens on explicit start_mining() calls.
	pass


func start_mining(
	is_planet: bool = false,
	difficulty: int = 1,
	target_id: String = "",
	minerals: Dictionary = {},
	mineable_pct: float = 0.5,
	session_context: Dictionary = {}
) -> void:
	_attach_delegate()
	if _mining_instance and _mining_instance.has_method("start_mining"):
		_mining_instance.call(
			"start_mining",
			is_planet,
			difficulty,
			target_id,
			minerals,
			mineable_pct,
			session_context
		)


func _attach_delegate() -> void:
	if _mining_instance and is_instance_valid(_mining_instance):
		if _mining_instance.get_parent() != self:
			add_child(_mining_instance)
		return
	_mining_instance = SIDESCROLL_MINING_SCENE.instantiate()
	_mining_instance.name = "SidescrollMiningCompat"
	add_child(_mining_instance)
	if _mining_instance.has_signal("mining_completed"):
		_mining_instance.mining_completed.connect(_on_delegate_completed)
	# Hide all legacy ring-minigame nodes — SidescrollMining covers the full screen.
	for node_name in ["Background", "RingContainer", "ProgressPanel",
			"InstructionLabel", "FeedbackLabel", "DifficultyLabel"]:
		var n = get_node_or_null(node_name) as CanvasItem
		if n:
			n.visible = false


func _on_delegate_completed(minerals: Dictionary, score: int) -> void:
	mining_completed.emit(minerals, score)
