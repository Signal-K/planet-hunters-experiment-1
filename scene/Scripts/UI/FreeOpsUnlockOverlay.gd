extends CanvasLayer
class_name FreeOpsUnlockOverlay

signal closed()

@onready var cta_button: Button = $Root/Popup/VBox/CTAButton

func _ready() -> void:
	cta_button.pressed.connect(_on_cta_pressed)

func _on_cta_pressed() -> void:
	emit_signal("closed")
	queue_free()
