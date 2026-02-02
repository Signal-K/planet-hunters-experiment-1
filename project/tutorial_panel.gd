extends CanvasLayer

@onready var tutorial_status_label = $PanelContainer/MarginContainer/HBoxContainer/TutorialStatusBox/TutorialStatus
@onready var app_controller = null

func _get_app_controller():
	if get_tree().root.has_node("AppController"):
		return get_node("/root/AppController")
	else:
		return get_tree().root.find_child("AppController", true, false)

func _ready() -> void:
	app_controller = _get_app_controller()
	update_tutorial_status()
	if app_controller:
		if app_controller.has_signal("tutorial_completed_updated"):
			app_controller.tutorial_completed_updated.connect(_on_tutorial_completed_updated)

func _process(_delta: float) -> void:
	# Update the tutorial status display
	# If AppController wasn't available at ready, try to find it again and connect
	if app_controller == null:
		var root = get_tree().root
		app_controller = root.find_child("AppController", true, false)
		if app_controller and app_controller.has_signal("tutorial_completed_updated"):
			app_controller.tutorial_completed_updated.connect(_on_tutorial_completed_updated)
	# Update status each frame if we have the controller
	if app_controller:
		update_tutorial_status()

func update_tutorial_status() -> void:
	# Read saved config
	var cfg = ConfigFile.new()
	var saved_completed: bool = false
	if cfg.load("user://tutorial.cfg") == OK and cfg.has_section_key("tutorial", "completed"):
		saved_completed = bool(cfg.get_value("tutorial", "completed"))

	var is_completed: bool = false
	if app_controller:
		is_completed = app_controller.get_tutorial_completed()
		if not is_completed and saved_completed:
			if app_controller.has_method("set_tutorial_completed_from_react"):
				app_controller.set_tutorial_completed_from_react(true)
			else:
				app_controller.tutorial_completed = true
				if app_controller.has_signal("tutorial_completed_updated"):
					app_controller.tutorial_completed_updated.emit(true)
			if app_controller.has_method("save_tutorial_completed"):
				app_controller.save_tutorial_completed()
	else:
		is_completed = saved_completed

	if is_completed:
		self.visible = false
		tutorial_status_label.text = "Complete"
		tutorial_status_label.modulate = Color(0, 1, 0, 1)
	else:
		self.visible = true
		tutorial_status_label.text = "In Progress"
		tutorial_status_label.modulate = Color(1, 1, 0, 1)

func _on_tutorial_completed_updated(is_completed: bool) -> void:
	update_tutorial_status()

func _on_skip_pressed() -> void:
	self.visible = false
	if app_controller:
		if app_controller.has_method("set_tutorial_completed_from_react"):
			app_controller.set_tutorial_completed_from_react(true)
		else:
			app_controller.tutorial_completed = true
			if app_controller.has_signal("tutorial_completed_updated"):
				app_controller.tutorial_completed_updated.emit(true)

		if app_controller.has_method("save_tutorial_completed"):
			app_controller.save_tutorial_completed()
