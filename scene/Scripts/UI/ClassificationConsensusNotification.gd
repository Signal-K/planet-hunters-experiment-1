extends CanvasLayer
class_name ClassificationConsensusNotification

signal view_pressed()

@onready var view_button: Button = $Notification/HBox/ViewButton

func _ready() -> void:
	view_button.pressed.connect(_on_view_pressed)

func _on_view_pressed() -> void:
	emit_signal("view_pressed")
	queue_free()
