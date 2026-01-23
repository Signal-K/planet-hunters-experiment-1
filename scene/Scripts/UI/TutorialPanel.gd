extends CanvasLayer

@onready var tutorial_status_label = $PanelContainer/MarginContainer/HBoxContainer/TutorialStatusBox/TutorialStatus
@onready var skip_button = $PanelContainer/MarginContainer/HBoxContainer/SkipButton
var app_controller: Node

func _ready() -> void:
	# Force visible initially - will be hidden if tutorial is completed
	self.visible = true
	print("TutorialPanel: _ready called, forcing visible = true")
	
	# Find AppController in the scene tree
	app_controller = get_tree().root.find_child("AppController", true, false)
	
	if not app_controller:
		# Try to find it in the parent scene
		var parent = get_parent()
		if parent:
			app_controller = parent.find_child("AppController", true, false)
	
	print("TutorialPanel: Ready, AppController found: ", app_controller != null)
	
	update_tutorial_status()
	
	if app_controller and app_controller.has_signal("tutorial_completed_updated"):
		app_controller.tutorial_completed_updated.connect(_on_tutorial_completed_updated)
		print("TutorialPanel: Connected to tutorial_completed_updated signal")

	# Connect skip button to mark tutorial complete
	if skip_button:
		skip_button.connect("pressed", Callable(self, "_on_skip_pressed"))
		print("TutorialPanel: Skip button connected")

func _process(_delta: float) -> void:
	# Update the tutorial status display
	if app_controller:
		update_tutorial_status()

func update_tutorial_status() -> void:
	print("TutorialPanel: update_tutorial_status called, app_controller=", app_controller)
	if app_controller and app_controller.has_method("get_tutorial_completed"):
		var is_completed = app_controller.get_tutorial_completed()
		print("TutorialPanel: is_completed = ", is_completed)
		if is_completed:
			# Hide tutorial panel when completed
			self.visible = false
			tutorial_status_label.text = "Complete"
			tutorial_status_label.modulate = Color(0, 1, 0, 1)  # Green
		else:
			# Show tutorial panel when not completed
			self.visible = true
			tutorial_status_label.text = "In Progress"
			tutorial_status_label.modulate = Color(1, 1, 0, 1)  # Yellow
	else:
		# No app controller - default to visible
		print("TutorialPanel: No app_controller or method, defaulting to visible")
		self.visible = true

func _on_skip_pressed() -> void:
	print("TutorialPanel: Skip pressed - marking tutorial complete")
	if app_controller and app_controller.has_method("set_tutorial_completed_from_react"):
		app_controller.set_tutorial_completed_from_react(true)
	else:
		# Fallback: set local status and emit signal if available
		if app_controller:
			app_controller.tutorial_completed = true
			if app_controller.has_signal("tutorial_completed_updated"):
				app_controller.tutorial_completed_updated.emit(true)

func _on_tutorial_completed_updated(is_completed: bool) -> void:
	print("TutorialPanel: Tutorial completed updated to: ", is_completed)
	update_tutorial_status()
