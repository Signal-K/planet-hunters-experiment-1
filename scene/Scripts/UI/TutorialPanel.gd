extends CanvasLayer

@onready var tutorial_status_label = $PanelContainer/MarginContainer/HBoxContainer/TutorialStatusBox/TutorialStatus
@onready var skip_button = $PanelContainer/MarginContainer/HBoxContainer/SkipButton
var app_controller: Node

func _ready() -> void:
	# Force visible initially - will be hidden if tutorial is completed
	self.visible = true
	print("TutorialPanel: _ready called, forcing visible = true")
	
	# Prefer the autoload singleton at /root/AppController
	if get_tree().root.has_node("AppController"):
		app_controller = get_node("/root/AppController")
	else:
		# Fallback: find AppController node in the scene tree
		app_controller = get_tree().root.find_child("AppController", true, false)
		if not app_controller:
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
	# If AppController wasn't available at ready, try to find and connect again
	if app_controller == null:
		app_controller = get_tree().root.find_child("AppController", true, false)
		if not app_controller:
			var parent = get_parent()
			if parent:
				app_controller = parent.find_child("AppController", true, false)
			# If found, connect signal and update
			if app_controller and app_controller.has_signal("tutorial_completed_updated"):
				app_controller.tutorial_completed_updated.connect(_on_tutorial_completed_updated)
				print("TutorialPanel: Late-connected to AppController signal")
	# Update status each frame if we have the controller
	if app_controller:
		update_tutorial_status()

func update_tutorial_status() -> void:
	print("TutorialPanel: update_tutorial_status called, app_controller=", app_controller)
	# Determine completion from AppController if available, else fall back to saved config
	var is_completed: bool = false
	var saved_completed: bool = false

	# Read saved value from disk
	var cfg = ConfigFile.new()
	if cfg.load("user://tutorial.cfg") == OK and cfg.has_section_key("tutorial", "completed"):
		saved_completed = bool(cfg.get_value("tutorial", "completed"))

	if app_controller and app_controller.has_method("get_tutorial_completed"):
		is_completed = app_controller.get_tutorial_completed()
		# If controller disagrees but saved value says completed, restore controller and persist
		if not is_completed and saved_completed:
			print("TutorialPanel: Restoring AppController state from saved config")
			if app_controller.has_method("set_tutorial_completed_from_react"):
				app_controller.set_tutorial_completed_from_react(true)
			else:
				app_controller.tutorial_completed = true
				if app_controller.has_signal("tutorial_completed_updated"):
					app_controller.tutorial_completed_updated.emit(true)
			# Ensure persistence
			if app_controller.has_method("save_tutorial_completed"):
				app_controller.save_tutorial_completed()

	# If no controller, rely solely on saved value
	if not app_controller:
		is_completed = saved_completed

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


func _on_skip_pressed() -> void:
	print("TutorialPanel: Skip pressed - marking tutorial complete")
	# Immediately hide panel for user feedback and to avoid race
	self.visible = false

	if app_controller:
		# Prefer public API if available
		if app_controller.has_method("set_tutorial_completed_from_react"):
			app_controller.set_tutorial_completed_from_react(true)
		else:
			# Directly set state and emit
			app_controller.tutorial_completed = true
			if app_controller.has_signal("tutorial_completed_updated"):
				app_controller.tutorial_completed_updated.emit(true)

		# Persist immediately if controller exposes helper
		if app_controller.has_method("save_tutorial_completed"):
			app_controller.save_tutorial_completed()
		else:
			# Try to call via available method name (project variant)
			if app_controller.has_method("save_tutorial_completed"):
				app_controller.save_tutorial_completed()
			# Otherwise rely on controller's own persistence
	else:
		# No app controller found; just hide locally
		print("TutorialPanel: No AppController found to persist tutorial state")

func _on_tutorial_completed_updated(is_completed: bool) -> void:
	print("TutorialPanel: Tutorial completed updated to: ", is_completed)
	update_tutorial_status()
