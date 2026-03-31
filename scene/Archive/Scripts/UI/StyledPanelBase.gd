extends PanelContainer
class_name StyledPanelBase

## Base class for styled panels with automatic styling applied
## Inherit from this scene to get consistent panel styling

@onready var title_label: Label = $Panel/HeaderContainer/Title
@onready var close_button: Button = $Panel/HeaderContainer/CloseButton
@onready var content_container: VBoxContainer = $Panel/ContentContainer
@onready var body_label: Label = $Panel/ContentContainer/BodyLabel

func _ready():
	_apply_styles()
	if close_button:
		close_button.pressed.connect(_on_close_pressed)

func _apply_styles():
	var panel_style = preload("res://Scripts/UI/PanelStyle.gd")
	if title_label:
		panel_style.apply_title(title_label)
	if close_button:
		panel_style.apply_button(close_button, false)
	if body_label:
		panel_style.apply_body(body_label)
	panel_style.apply_panel(self)

func _on_close_pressed():
	queue_free()

func set_title(text: String):
	if title_label:
		title_label.text = text

func set_body(text: String):
	if body_label:
		body_label.text = text
