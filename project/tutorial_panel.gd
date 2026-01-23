extends CanvasLayer

@onready var tutorial_status_label = $PanelContainer/MarginContainer/HBoxContainer/TutorialStatusBox/TutorialStatus
@onready var app_controller = get_tree().root.find_child("AppController", true, false)

func _ready() -> void:
	print("TutorialPanel: Ready")
	update_tutorial_status()
	
	if app_controller:
		if app_controller.has_signal("tutorial_completed_updated"):
			app_controller.tutorial_completed_updated.connect(_on_tutorial_completed_updated)
			print("TutorialPanel: Connected to tutorial_completed_updated signal")
	else:
		print("TutorialPanel: Could not find AppController")

func _process(_delta: float) -> void:
	# Update the tutorial status display
	if app_controller:
		update_tutorial_status()

func update_tutorial_status() -> void:
	if app_controller:
		var is_completed = app_controller.get_tutorial_completed()
		if is_completed:
			tutorial_status_label.text = "Complete"
			tutorial_status_label.modulate = Color(0, 1, 0, 1)  # Green
		else:
			tutorial_status_label.text = "In Progress"
			tutorial_status_label.modulate = Color(1, 1, 0, 1)  # Yellow

func _on_tutorial_completed_updated(is_completed: bool) -> void:
	print("TutorialPanel: Tutorial completed updated to: ", is_completed)
	update_tutorial_status()
