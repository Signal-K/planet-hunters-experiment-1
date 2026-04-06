extends Control

signal create_rocket(rocket_id)

@export var unlocked_rockets := []

const RocketSpecs = preload("res://Scripts/Utils/RocketSpecs.gd")
const RocketSelectorUIBuilder = preload("res://Scripts/Earth/RocketSelectorUIBuilder.gd")
const RocketSelectorDragHelper = preload("res://Scripts/Earth/RocketSelectorDragHelper.gd")
const RocketsManager = preload("res://Scripts/Utils/RocketsManager.gd")
const AppControllerHelper = preload("res://Scripts/Utils/AppControllerHelper.gd")
const STARTERROCKET1_LAUNCHPAD_POS := Vector2(-110.0, -178.0)


var ui_position: Vector2 = Vector2(80, 160)
var ui_size: Vector2 = Vector2(720, 360)

var _creation_locked: bool = false
var _contractor_gate_locked: bool = false
var _contractor_gate_reason: String = "Select a contractor before building a rocket."
var _pending_rocket_id: String = ""
var _pending_purchase_cost: int = 0
var _armed_rocket_id: String = ""
var _armed_purchase_cost: int = 0
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
		set_anchors_preset(Control.PRESET_TOP_LEFT)
		set_deferred("position", ui_position)
		set_deferred("size", ui_size)
	# Load unlocked rockets from RocketsManager if available
	var rm = RocketsManager
	unlocked_rockets = rm.get_unlocked()
	var mission_stage = _effective_mission_stage_for_ui()
	unlocked_rockets = _filter_rockets_for_stage(unlocked_rockets, mission_stage)
	# If there is already a persisted awaitingLaunch rocket, disable creation UI
	var placed = rm.get_placed()
	for p in placed:
		if p.get("status", "") == "awaitingLaunch":
			_creation_locked = true
			break
	var selected_contractor = rm.get_trip_selected_contractor()
	_contractor_gate_locked = str(selected_contractor.get("id", "")) == ""
	_rocket_textures["starterrocket1"] = load("res://assets/Vehicles/StarterRocket1.png")
	_rocket_textures["starterrocket2"] = load("res://assets/Vehicles/Starter Rocket L2.png")
	_rocket_textures["starterrocket3"] = load("res://assets/Vehicles/Starter Rocket L2.png")
	_find_app_controller()
	_ui_builder.setup(
		self,
		ui_size,
		_rocket_textures,
		_creation_locked,
		Callable(self, "_on_create_pressed"),
		Callable(self, "_on_texture_gui_input")
	)
	_ui_builder.build_ui(unlocked_rockets)
	set_meta("selector_ui_built", true)
	_drag_helper.setup(self, Callable(self, "_on_drag_drop_requested"))
	_refresh_creation_buttons_state()
	_refresh_create_buttons_copy()
	set_process(true)

func _find_app_controller() -> void:
	var root = get_tree().root
	_app_controller = root.find_child("AppController", true, false)
	if _app_controller:
		print("RocketSelector: Found AppController")
	else:
		print("RocketSelector: AppController not found")

func _on_purchase_canceled() -> void:
	_pending_rocket_id = ""
	_pending_purchase_cost = 0

# Public method to unlock creation (called from Launchpad when showing the panel after launch)
func unlock_creation() -> void:
	_creation_locked = false
	_armed_rocket_id = ""
	_armed_purchase_cost = 0
	_refresh_creation_buttons_state()
	_refresh_create_buttons_copy()

func set_contractor_gate_enabled(enabled: bool, reason: String = "") -> void:
	_contractor_gate_locked = not enabled
	if reason != "":
		_contractor_gate_reason = reason
	_refresh_creation_buttons_state()

func _refresh_creation_buttons_state() -> void:
	var disable_all = _contractor_gate_locked or (_creation_locked and _armed_rocket_id == "")
	_set_create_buttons_disabled(disable_all)

func _on_create_pressed(rocket_id):
	print("Create rocket requested:", rocket_id)
	_request_purchase(rocket_id)

func _request_purchase(rocket_id: String) -> void:
	if _creation_locked:
		_show_info("A rocket is already on the launchpad. Use the Mission Target panel to launch it, or remove it to build a different one.")
		return
	if _contractor_gate_locked:
		_show_info(_contractor_gate_reason)
		return
	var mission_stage = _effective_mission_stage_for_ui()
	if not _is_rocket_allowed_for_stage(rocket_id, mission_stage):
		_show_info("%s unlocks later in the mission path. Complete current missions first." % RocketSpecs.get_display_name(rocket_id))
		return
	var range_check = _validate_target_range_for_rocket(rocket_id)
	if not bool(range_check.get("ok", true)):
		var target_label = str(range_check.get("target_label", "Selected target"))
		var required_level = int(range_check.get("required_level", 1))
		var rocket_level = int(range_check.get("rocket_level", 1))
		var distance_au = float(range_check.get("distance_au", 0.0))
		_show_info("%s is %.0f AU away and requires Level %d. %s is Level %d and cannot reach this target." % [
			target_label,
			distance_au,
			required_level,
			RocketSpecs.get_display_name(rocket_id),
			rocket_level
		])
		return
	var cost = _effective_purchase_cost(rocket_id)
	var balance = _get_balance()
	if balance < cost:
		_show_info("Insufficient funds to buy this rocket.")
		return
	_pending_rocket_id = rocket_id
	_pending_purchase_cost = cost
	var summary = "Buy %s for %s Francs?" % [
		RocketSpecs.get_display_name(rocket_id),
		_format_francs(cost)
	]
	var rm = RocketsManager
	if rm and rm.is_free_operations_unlocked():
		var cap = int(rm.get_free_ops_payout_cap())
		if cost > cap:
			summary += "\nFree Operations payout cap is %s F. This purchase may lose money." % _format_francs(cap)
		var selected = rm.get_trip_selected_contractor()
		if str(selected.get("effect", "")) == "build_discount":
			summary += "\nContractor discount applied via %s." % str(selected.get("name", "contractor"))
	var dlg := ConfirmationDialog.new()
	dlg.title = "Confirm Purchase"
	dlg.dialog_text = summary
	var scene_root = get_tree().current_scene
	if scene_root == null:
		_pending_rocket_id = ""
		_pending_purchase_cost = 0
		return
	scene_root.add_child(dlg)
	dlg.popup_centered()
	dlg.confirmed.connect(_on_purchase_confirmed)
	dlg.confirmed.connect(dlg.queue_free)
	dlg.canceled.connect(_on_purchase_canceled)
	dlg.canceled.connect(dlg.queue_free)

func _on_purchase_confirmed() -> void:
	if _pending_rocket_id == "":
		return
	var rocket_id = _pending_rocket_id
	var cost = _pending_purchase_cost
	_pending_rocket_id = ""
	_pending_purchase_cost = 0
	var spawn_ok = _spawn_rocket(rocket_id)
	if not spawn_ok:
		_show_info("Rocket could not be placed on the launchpad.")
		return
	emit_signal("create_rocket", rocket_id)
	AppControllerHelper.record_tutorial_action("create_rocket", {
		"rocket_id": rocket_id
	})
	_modify_balance(-cost)
	_creation_locked = true
	_armed_rocket_id = ""
	_armed_purchase_cost = 0
	_refresh_creation_buttons_state()
	_refresh_create_buttons_copy()
	visible = false
	var root = get_tree().current_scene
	if root:
		var launchpad = root.get_node_or_null("StructuresLayer/Launchpad")
		if launchpad:
			if launchpad.has_method("_show_selector_panel"):
				launchpad._show_selector_panel()
			if launchpad.has_method("_populate_targets"):
				launchpad._populate_targets()

func _on_drag_drop_requested(_rocket_id: String) -> void:
	pass # drag-to-place replaced by direct placement on purchase confirm

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
					var rm = RocketsManager
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
	var scene_root = get_tree().current_scene
	if scene_root == null:
		push_warning("RocketSelector._show_info: no current scene, cannot show dialog")
		return
	var dlg := AcceptDialog.new()
	dlg.title = "Notice"
	dlg.dialog_text = message
	scene_root.add_child(dlg)
	dlg.popup_centered()
	dlg.confirmed.connect(dlg.queue_free)

func _effective_purchase_cost(rocket_id: String) -> int:
	var rm = RocketsManager
	if not rm:
		return RocketSpecs.get_cost(rocket_id)
	return int(rm.get_trip_purchase_cost(rocket_id))


func _format_francs(value: int) -> String:
	var abs_value = abs(value)
	if abs_value >= 1000000000:
		var billions = float(value) / 1000000000.0
		return "%.1fB" % billions
	if abs_value >= 1000000:
		var millions = float(value) / 1000000.0
		return "%.1fM" % millions
	return str(value)

func _on_texture_gui_input(_rocket_id, _tex, _event):
	pass # drag-to-place replaced by direct placement on purchase confirm

func _process(delta):
	_drag_helper.process(delta)

func _set_create_buttons_disabled(disabled: bool) -> void:
	var stack = [self]
	while stack.size() > 0:
		var node = stack.pop_back()
		for child in node.get_children():
			if child is Button and child.name.begins_with("CreateButton_"):
				var rocket_id = child.name.trim_prefix("CreateButton_")
				child.disabled = disabled or (_armed_rocket_id != "" and rocket_id != _armed_rocket_id)
			stack.append(child)

func _refresh_create_buttons_copy() -> void:
	var stack = [self]
	while stack.size() > 0:
		var node = stack.pop_back()
		for child in node.get_children():
			if child is Button and child.name.begins_with("CreateButton_"):
				var rocket_id = child.name.trim_prefix("CreateButton_")
				var display_name = RocketSpecs.get_display_name(rocket_id)
				child.text = "Create %s" % display_name
			stack.append(child)

func _validate_target_range_for_rocket(rocket_id: String) -> Dictionary:
	var rm = RocketsManager
	if not rm:
		return {"ok": true}
	var selected_target = str(rm.get_selected_target())
	if selected_target == "":
		return {"ok": true}
	var detected = rm.get_detected_targets()
	var target_type = "asteroid"
	var target_label = selected_target
	for t_any in detected:
		if typeof(t_any) != TYPE_DICTIONARY:
			continue
		var t: Dictionary = t_any
		if str(t.get("id", "")) != selected_target:
			continue
		target_type = str(t.get("type", "asteroid"))
		target_label = str(t.get("label", selected_target))
		break
	var profile = rm.build_target_profile(selected_target, target_type)
	var required_level = int(profile.get("required_level", 1))
	var rocket_level = int(rm.get_rocket_level(rocket_id))
	if rocket_level >= required_level:
		return {"ok": true}
	return {
		"ok": false,
		"required_level": required_level,
		"rocket_level": rocket_level,
		"distance_au": float(profile.get("distance_au", 0.0)),
		"target_label": target_label
	}

func _filter_rockets_for_stage(rocket_ids: Array, mission_stage: int) -> Array:
	var allowed := _allowed_rockets_for_stage(mission_stage)
	var filtered := []
	for rocket_any in rocket_ids:
		var rocket_id = str(rocket_any)
		if allowed.has(rocket_id):
			filtered.append(rocket_id)
	if filtered.is_empty():
		filtered.append("starterrocket1")
	return filtered

func _allowed_rockets_for_stage(mission_stage: int) -> Array:
	if mission_stage <= 1:
		return ["starterrocket1"]
	if mission_stage <= 3:
		return ["starterrocket1", "starterrocket2"]
	return ["starterrocket1", "starterrocket2", "starterrocket3"]

func _is_rocket_allowed_for_stage(rocket_id: String, mission_stage: int) -> bool:
	return _allowed_rockets_for_stage(mission_stage).has(rocket_id)

func _effective_mission_stage_for_ui() -> int:
	var mission_stage = int(RocketsManager.get_mission_stage())
	var app = AppControllerHelper.get_instance()
	if app and app.has_method("get_tutorial_state"):
		var state = app.get_tutorial_state()
		if typeof(state) == TYPE_DICTIONARY and not bool(state.get("skipped", false)):
			var tutorial_stage = int(state.get("current_stage", mission_stage))
			if tutorial_stage == 1:
				return 1
	return mission_stage
