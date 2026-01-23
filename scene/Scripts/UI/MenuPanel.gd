extends Control

## Menu Panel with Counter Controls
## Displays and allows modification of a counter value that syncs with React Native

signal panel_closed
signal counter_changed(new_value: int)
signal reset_all
signal reset_tutorial

@onready var counter_label: Label = $PanelContainer/Panel/VBoxContainer/ContentContainer/CounterContainer/CounterLabel
@onready var decrease_btn: Button = $PanelContainer/Panel/VBoxContainer/ContentContainer/CounterContainer/ButtonsContainer/DecreaseButton
@onready var increase_btn: Button = $PanelContainer/Panel/VBoxContainer/ContentContainer/CounterContainer/ButtonsContainer/IncreaseButton
@onready var close_btn: Button = $PanelContainer/Panel/VBoxContainer/HeaderContainer/CloseButton
@onready var reset_btn: Button = $PanelContainer/Panel/VBoxContainer/ContentContainer/ResetButton
@onready var reset_tutorial_btn: Button = $PanelContainer/Panel/VBoxContainer/ContentContainer/ResetTutorialButton

var current_counter: int = 0

func _ready() -> void:
	# Connect button signals
	close_btn.pressed.connect(_on_close_button_pressed)
	decrease_btn.pressed.connect(_on_decrease_button_pressed)
	increase_btn.pressed.connect(_on_increase_button_pressed)
	reset_btn.pressed.connect(_on_reset_button_pressed)
	reset_tutorial_btn.pressed.connect(_on_reset_tutorial_button_pressed)
	
	# Update display
	update_counter_display()
	
	print("MenuPanel ready with counter: ", current_counter)

func set_counter(value: int) -> void:
	"""Set the counter value from external source (e.g., React Native)"""
	current_counter = value
	update_counter_display()
	print("MenuPanel counter set to: ", current_counter)

func get_counter() -> int:
	"""Get the current counter value"""
	return current_counter

func update_counter_display() -> void:
	"""Update the counter label"""
	if counter_label:
		counter_label.text = str(current_counter)

func _on_close_button_pressed() -> void:
	print("MenuPanel close button pressed")
	panel_closed.emit()
	queue_free()

func _on_decrease_button_pressed() -> void:
	current_counter -= 1
	update_counter_display()
	counter_changed.emit(current_counter)
	print("Counter decreased to: ", current_counter)

func _on_increase_button_pressed() -> void:
	current_counter += 1
	update_counter_display()
	counter_changed.emit(current_counter)
	print("Counter increased to: ", current_counter)

func _on_reset_button_pressed() -> void:
	print("MenuPanel reset button pressed")
	reset_all.emit()

func _on_reset_tutorial_button_pressed() -> void:
	print("MenuPanel reset tutorial button pressed")
	reset_tutorial.emit()
