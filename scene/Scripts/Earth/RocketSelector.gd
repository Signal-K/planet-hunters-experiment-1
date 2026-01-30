extends Control

signal create_rocket(rocket_id)

@export var unlocked_rockets := []

const ROCKET_TEXTURES = {
	"starterrocket1": preload("res://assets/Vehicles/StarterRocket1LaunchFrame0.tres"),
	"starterrocket2": preload("res://assets/Structures/ControlStation.png")
}
const RocketSelectorUIBuilder = preload("res://Scripts/Earth/RocketSelectorUIBuilder.gd")
const RocketSelectorDragHelper = preload("res://Scripts/Earth/RocketSelectorDragHelper.gd")

const ROCKET_COST: int = 1000000000

var ui_position: Vector2 = Vector2(80, 160)
var ui_size: Vector2 = Vector2(720, 360)

var _creation_locked: bool = false
var _pending_rocket_id: String = ""
var _confirm_dialog: ConfirmationDialog = null
var _info_dialog: AcceptDialog = null
var _app_controller: Node = null
var _ui_builder := RocketSelectorUIBuilder.new()
var _drag_helper := RocketSelectorDragHelper.new()

func _ready():
	position = ui_position
	size = ui_size
	# Load unlocked rockets from RocketsManager if available
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	unlocked_rockets = rm.get_unlocked()
	# If there is already a persisted awaitingLaunch rocket, disable creation UI
	var placed = rm.get_placed()
	for p in placed:
		if p.get("status", "") == "awaitingLaunch":
			_creation_locked = true
			break
	_find_app_controller()
	_init_dialogs()
	_ui_builder.setup(
		self,
		ui_size,
		ROCKET_TEXTURES,
		_creation_locked,
		Callable(self, "_on_create_pressed"),
		Callable(self, "_on_texture_gui_input")
	)
	_ui_builder.build_ui(unlocked_rockets)
	_drag_helper.setup(self, Callable(self, "_request_purchase"))
	set_process(true)

func _find_app_controller() -> void:
	var root = get_tree().root
	_app_controller = root.find_child("AppController", true, false)
	if _app_controller:
		print("RocketSelector: Found AppController")
	else:
		print("RocketSelector: AppController not found")

func _init_dialogs() -> void:
	_confirm_dialog = ConfirmationDialog.new()
	_confirm_dialog.title = "Confirm Purchase"
	add_child(_confirm_dialog)
	_confirm_dialog.confirmed.connect(_on_purchase_confirmed)
	_confirm_dialog.canceled.connect(func(): _pending_rocket_id = "")

	_info_dialog = AcceptDialog.new()
	_info_dialog.title = "Notice"
	add_child(_info_dialog)

# Public method to unlock creation (called from Launchpad when showing the panel after launch)
func unlock_creation() -> void:
	_creation_locked = false
	# Update button states in the UI
	var panel = get_node_or_null("Panel")
	if panel:
		var vbox = panel.get_node_or_null("VBox")
		if vbox:
			var grid = vbox.get_node_or_null("Grid")
			if grid:
				for child in grid.get_children():
					if child is VBoxContainer:
						for sub in child.get_children():
							if sub is Button and sub.text == "Create":
								sub.disabled = false

func _on_create_pressed(rocket_id):
	print("Create rocket requested:", rocket_id)
	emit_signal("create_rocket", rocket_id)
	_request_purchase(rocket_id)

func _request_purchase(rocket_id: String) -> void:
	if _creation_locked:
		print("RocketSelector: creation locked; cannot purchase")
		return
	var balance = _get_balance()
	if balance < ROCKET_COST:
		_show_info("Insufficient funds to buy this rocket.")
		return
	_pending_rocket_id = rocket_id
	_confirm_dialog.dialog_text = "Buy this rocket for 1B Francs?"
	_confirm_dialog.popup_centered()

func _on_purchase_confirmed() -> void:
	if _pending_rocket_id == "":
		return
	var spawn_ok = _spawn_rocket(_pending_rocket_id)
	if spawn_ok:
		_modify_balance(-ROCKET_COST)
	else:
		_show_info("Rocket could not be created.")
	_pending_rocket_id = ""

func _spawn_rocket(rocket_id: String) -> bool:
	# Try to find the Launchpad node in the current scene and call spawn_rocket
	var root = get_tree().current_scene
	if root:
		var launchpad = root.get_node_or_null("StructuresLayer/Launchpad")
		if launchpad:
			if launchpad.has_method("spawn_rocket"):
				return launchpad.spawn_rocket(rocket_id)
			else:
				# fallback: instantiate the rocket scene directly under Launchpad
				var path = "res://Scenes/Vehicles/StarterRocket1.tscn"
				var scene = load(path)
				if scene:
					var inst = scene.instantiate()
					launchpad.add_child(inst)
					inst.position = Vector2(-110.0, -170.0)
					inst.add_to_group("rocket")
					# persist placed rocket
					var rm = preload("res://Scripts/Utils/RocketsManager.gd")
					var new_id = rm.add_placed(rocket_id, inst.position)
					if typeof(new_id) == TYPE_STRING and new_id != "":
						inst.name = new_id
					return true
	print("Warning: Launchpad not found or failed to spawn rocket")
	return false

func _get_balance() -> int:
	if _app_controller and _app_controller.has_method("get_franc_balance"):
		return int(_app_controller.get_franc_balance())
	return 10000000000

func _set_balance(value: int) -> void:
	if _app_controller and _app_controller.has_method("set_franc_balance_from_react"):
		_app_controller.set_franc_balance_from_react(value)
	else:
		print("RocketSelector: AppController missing; balance not synced")

func _modify_balance(delta: int) -> void:
	var next_value = _get_balance() + delta
	_set_balance(next_value)

func _show_info(message: String) -> void:
	if _info_dialog:
		_info_dialog.dialog_text = message
		_info_dialog.popup_centered()

func _on_texture_gui_input(rocket_id, tex, event):
	# Start drag on left button press
	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
			_drag_helper.start_drag(rocket_id, tex)

func _process(delta):
	_drag_helper.process(delta)
