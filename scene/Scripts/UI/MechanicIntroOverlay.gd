extends CanvasLayer
class_name MechanicIntroOverlay

signal closed()

@onready var close_button: Button = $Root/Card/VBox/CloseButton
@onready var eyebrow_label: Label = $Root/Card/VBox/Eyebrow
@onready var title_label: Label = $Root/Card/VBox/TitleLabel
@onready var body_label: Label = $Root/Card/VBox/BodyLabel

func _ready() -> void:
	close_button.pressed.connect(_on_close_pressed)

func populate(eyebrow: String, title: String, body: String) -> void:
	eyebrow_label.text = eyebrow
	title_label.text = title
	body_label.text = body

func _on_close_pressed() -> void:
	emit_signal("closed")
	queue_free()
