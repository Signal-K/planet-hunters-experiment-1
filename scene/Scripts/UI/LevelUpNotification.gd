extends CanvasLayer

@onready var panel: PanelContainer = $Center/Panel
@onready var level_label: Label = $Center/Panel/VBox/LevelLabel
@onready var unlocks_label: Label = $Center/Panel/VBox/UnlocksLabel

func _resolve_nodes() -> void:
	if panel == null:
		panel = get_node_or_null("Center/Panel") as PanelContainer
	if level_label == null:
		level_label = get_node_or_null("Center/Panel/VBox/LevelLabel") as Label
	if unlocks_label == null:
		unlocks_label = get_node_or_null("Center/Panel/VBox/UnlocksLabel") as Label

func show_level(level: int, unlocks: Array) -> void:
	_resolve_nodes()
	if panel == null or level_label == null or unlocks_label == null:
		return
	level_label.text = "You reached Level %d" % level
	if unlocks.is_empty():
		unlocks_label.visible = false
	else:
		unlocks_label.visible = true
		unlocks_label.text = "New Unlocks:\n• " + "\n• ".join(unlocks)

	panel.modulate.a = 0.0
	var tween = create_tween()
	tween.tween_property(panel, "modulate:a", 1.0, 0.5).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	tween.tween_interval(4.0)
	tween.tween_property(panel, "modulate:a", 0.0, 0.5).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_IN)
	tween.tween_callback(queue_free)
