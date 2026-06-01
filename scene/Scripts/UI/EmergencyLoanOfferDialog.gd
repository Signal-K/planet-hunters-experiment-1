extends CanvasLayer
class_name EmergencyLoanOfferDialog

signal accepted()
signal declined()

@onready var accept_button: Button = $Root/Sheet/VBox/AcceptButton
@onready var decline_button: Button = $Root/Sheet/VBox/DeclineButton

func _ready() -> void:
	accept_button.pressed.connect(_on_accept_pressed)
	decline_button.pressed.connect(_on_decline_pressed)

func _on_accept_pressed() -> void:
	emit_signal("accepted")
	queue_free()

func _on_decline_pressed() -> void:
	emit_signal("declined")
	queue_free()
