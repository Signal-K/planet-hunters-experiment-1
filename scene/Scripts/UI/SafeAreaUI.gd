extends Node

@export var bottom_inset: float = 0.0
@export var bottom_padding: float = 24.0
@export var top_inset: float = 36.0
@export var horizontal_inset: float = 24.0

func _ready() -> void:
	# Layout is authored in scene files; do not mutate anchors/offsets in script.
	pass

func _on_node_added(_node: Node) -> void:
	pass

func apply_safe_area() -> void:
	pass
