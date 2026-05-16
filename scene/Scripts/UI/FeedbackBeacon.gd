extends CanvasLayer

const PanelStyle = preload("res://Scripts/UI/PanelStyle.gd")

const GameplayAnalytics = preload("res://Scripts/Systems/GameplayAnalytics.gd")

@onready var feedback_button: Button = $Anchor/Panel/VBox/FeedbackButton
@onready var hint_label: Label = $Anchor/Panel/VBox/HintLabel

var _request_count := 0

func _ready() -> void:
	layer = 20
	visible = OS.has_feature("web")
	if not visible:
		return
	var panel_style = PanelStyle
	panel_style.apply_button(feedback_button, true)
	panel_style.apply_muted_on_dark(hint_label)
	feedback_button.pressed.connect(_on_feedback_pressed)

func _on_feedback_pressed() -> void:
	_request_count += 1
	var scene = get_tree().current_scene
	hint_label.text = "Opening feedback..."
	GameplayAnalytics.emit_feedback_requested("feedback_beacon", {
		"request_index": _request_count,
		"current_scene": str(scene.name if scene else ""),
		"context": "manual_help_request"
	})
	var tween = create_tween()
	tween.tween_property(hint_label, "modulate:a", 0.6, 0.15)
	tween.tween_property(hint_label, "modulate:a", 1.0, 0.15)
	hint_label.text = "Tell us where you got stuck."