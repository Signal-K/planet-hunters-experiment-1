extends HBoxContainer
class_name StatusRow

@onready var key_label: Label = $KeyLabel
@onready var status_label: Label = $StatusLabel
@onready var dot: ColorRect = $Dot

func set_status(key: String, status_text: String, color: Color) -> void:
	key_label.text = key
	status_label.text = status_text
	status_label.add_theme_color_override("font_color", color)
	dot.color = color
