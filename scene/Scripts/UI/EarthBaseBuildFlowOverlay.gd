extends CanvasLayer
class_name EarthBaseBuildFlowOverlay

signal build_confirmed()
signal dismissed()

const BUILD_COST := 500_000_000

@onready var build_button: Button = $Root/Sheet/VBox/BuildButton
@onready var dismiss_button: Button = $Root/Sheet/VBox/DismissButton

func _ready() -> void:
	build_button.pressed.connect(_on_build_pressed)
	dismiss_button.pressed.connect(_on_dismiss_pressed)
	_check_affordability()

func _check_affordability() -> void:
	var ac := get_tree().root.get_node_or_null("AppController")
	if ac == null:
		return
	var bal: int = ac.franc_balance if "franc_balance" in ac else 0
	build_button.disabled = bal < BUILD_COST

func _on_build_pressed() -> void:
	emit_signal("build_confirmed")
	queue_free()

func _on_dismiss_pressed() -> void:
	emit_signal("dismissed")
	queue_free()
