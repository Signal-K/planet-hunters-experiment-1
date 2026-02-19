extends Control

signal create_rocket(rocket_id)

@export var unlocked_rockets := []

const RocketSpecs = preload("res://Scripts/Utils/RocketSpecs.gd")
const RocketSelectorUIBuilder = preload("res://Scripts/Earth/RocketSelectorUIBuilder.gd")
const RocketSelectorDragHelper = preload("res://Scripts/Earth/RocketSelectorDragHelper.gd")
const STARTERROCKET1_LAUNCHPAD_POS := Vector2(-110.0, -178.0)

const ACTION_CREATE_ROCKET := "create_rocket"
const HINT_CREATE_ROCKET := "Buy a rocket here before you select a target and launch."

var ui_position: Vector2 = Vector2(80, 160)
var ui_size: Vector2 = Vector2(720, 360)

var _creation_locked: bool = false
var _pending_rocket_id: String = ""
var _pending_purchase_cost: int = 0
var _confirm_dialog: ConfirmationDialog = null
var _info_dialog: AcceptDialog = null
var _app_controller: Node = null
var _rocket_textures := {
	"starterrocket1": null,
	"starterrocket2": null,
	"starterrocket3": null
}
var _ui_builder := RocketSelectorUIBuilder.new()
var _drag_helper := RocketSelectorDragHelper.new()

func _ready():
	if get_parent() is Container:
		size_flags_horizontal = Control.SIZE_EXPAND_FILL
		size_flags_vertical = Control.SIZE_EXPAND_FILL
	else:
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
	_rocket_textures["starterrocket1"] = load("res://assets/Vehicles/StarterRocket1.png")
	_rocket_textures["starterrocket2"] = load("res://assets/Vehicles/Starter Rocket L2.png")
	_rocket_textures["starterrocket3"] = load("res://assets/Vehicles/Starter Rocket L2.png")
	_find_app_controller()
	_init_dialogs()
	_ui_builder.setup(
		self,
		ui_size,
		_rocket_textures,
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
	if _confirm_dialog and is_instance_valid(_confirm_dialog) and _info_dialog and is_instance_valid(_info_dialog):
		return
	var dialog_host: Node = self
	var tree = get_tree()
	if tree and tree.current_scene:
		dialog_host = tree.current_scene
	if not (_confirm_dialog and is_instance_valid(_confirm_dialog)):
		_confirm_dialog = ConfirmationDialog.new()
		_confirm_dialog.title = "Confirm Purchase"
		dialog_host.call_deferred("add_child", _confirm_dialog)
		_confirm_dialog.confirmed.connect(_on_purchase_confirmed)
		_confirm_dialog.canceled.connect(func(): _pending_rocket_id = "")
	if not (_info_dialog and is_instance_valid(_info_dialog)):
		_info_dialog = AcceptDialog.new()
		_info_dialog.title = "Notice"
		dialog_host.call_deferred("add_child", _info_dialog)

# Public method to unlock creation (called from Launchpad when showing the panel after launch)
func unlock_creation() -> void:
	_creation_locked = false
	_set_create_buttons_disabled(false)

func _on_create_pressed(rocket_id):
	print("Create rocket requested:", rocket_id)
	emit_signal("create_rocket", rocket_id)
	_request_purchase(rocket_id)

func _request_purchase(rocket_id: String) -> void:
	_init_dialogs()
	if _creation_locked:
		print("RocketSelector: creation locked; cannot purchase")
		return
	var cost = _effective_purchase_cost(rocket_id)
	var balance = _get_balance()
	if balance < cost:
		_show_info("Insufficient funds to buy this rocket.")
		return
	_pending_rocket_id = rocket_id
	_pending_purchase_cost = cost
	if not (_confirm_dialog and is_instance_valid(_confirm_dialog)):
		_show_info("Unable to open purchase confirmation dialog.")
		return
	var summary = "Buy %s for %s Francs?" % [
		RocketSpecs.get_display_name(rocket_id),
		_format_francs(cost)
	]
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if rm and int(rm.get_mission_stage()) >= 5:
		var cap = int(rm.get_mission5_payout_cap())
		if cost > cap:
			summary += "\nMission 5 payout cap is %s F. This purchase may lose money." % _format_francs(cap)
		var selected = rm.get_mission5_selected_contractor()
		if str(selected.get("effect", "")) == "build_discount":
			summary += "\nMission discount applied via %s." % str(selected.get("name", "contractor"))
	_confirm_dialog.dialog_text = summary
	_confirm_dialog.popup_centered()

func _on_purchase_confirmed() -> void:
	if _pending_rocket_id == "":
		return
	var spawn_ok = _spawn_rocket(_pending_rocket_id)
	if spawn_ok:
		_show_tutorial_hint_once(ACTION_CREATE_ROCKET, HINT_CREATE_ROCKET)
		_modify_balance(-_pending_purchase_cost)
	else:
		_show_info("Rocket could not be created.")
	_pending_rocket_id = ""
	_pending_purchase_cost = 0

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
				var mapping = {
					"starterrocket1": "res://Scenes/Vehicles/StarterRocket1.tscn",
					"starterrocket2": "res://Scenes/Vehicles/StarterRocket2.tscn",
					"starterrocket3": "res://Scenes/Vehicles/StarterRocket3.tscn"
				}
				var path = str(mapping.get(rocket_id, "res://Scenes/Vehicles/StarterRocket1.tscn"))
				var scene = load(path)
				if scene:
					var inst = scene.instantiate()
					launchpad.add_child(inst)
					inst.position = STARTERROCKET1_LAUNCHPAD_POS
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
	_init_dialogs()
	if _info_dialog and is_instance_valid(_info_dialog):
		_info_dialog.dialog_text = message
		_info_dialog.popup_centered()

func _effective_purchase_cost(rocket_id: String) -> int:
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if not rm:
		return RocketSpecs.get_cost(rocket_id)
	return int(rm.get_mission5_purchase_cost(rocket_id))

func _show_tutorial_hint_once(action_key: String, message: String) -> void:
	if _app_controller and _app_controller.has_method("show_tutorial_hint_once"):
		_app_controller.show_tutorial_hint_once(action_key, message)

func _format_francs(value: int) -> String:
	var abs_value = abs(value)
	if abs_value >= 1000000000:
		var billions = float(value) / 1000000000.0
		return "%.1fB" % billions
	if abs_value >= 1000000:
		var millions = float(value) / 1000000.0
		return "%.1fM" % millions
	return str(value)

func _on_texture_gui_input(rocket_id, tex, event):
	# Start drag on left button press
	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
			_drag_helper.start_drag(rocket_id, tex)

func _process(delta):
	_drag_helper.process(delta)

func _set_create_buttons_disabled(disabled: bool) -> void:
	var stack = [self]
	while stack.size() > 0:
		var node = stack.pop_back()
		for child in node.get_children():
			if child is Button and child.name.begins_with("CreateButton_"):
				child.disabled = disabled
			stack.append(child)
