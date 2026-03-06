class_name SatelliteStation extends Structure

const RocketsManager = preload("res://Scripts/Utils/RocketsManager.gd")
const AppControllerHelper = preload("res://Scripts/Utils/AppControllerHelper.gd")

var _build_dialog: ConfirmationDialog = null
var _info_dialog: AcceptDialog = null

func _ready():
	super._ready()
	structure_name = "Scanner Station"
	print("Satellite Station initialized: " + structure_name)
	_ensure_scanner_state_consistency()
	_refresh_visibility()
	call_deferred("_maybe_show_unlock_dialog")

func on_interact():
	_refresh_visibility()
	if not visible:
		return
	var rm = RocketsManager
	if not rm:
		return
	_ensure_scanner_state_consistency(rm)
	if not rm.is_scanner_station_built():
		_prompt_build_scanner()
		return
	super.on_interact()
	print("Satellite Station clicked: " + structure_name)
	
	# Get the UIManager from the scene tree
	var ui_manager = get_tree().get_first_node_in_group("ui_manager")
	print("Found UIManager in group: ", ui_manager != null)
	
	if not ui_manager:
		# Try to get from main scene
		var main_scene = get_tree().current_scene
		for child in main_scene.get_children():
			if child is UIManager:
				ui_manager = child
				break
		print("Found UIManager as child: ", ui_manager != null)
	
	if ui_manager:
		print("Calling show_structure_panel...")
		ui_manager.show_structure_panel("res://Scenes/UI/SatelliteStationPanel.tscn")
	else:
		print("ERROR: UIManager not found for Satellite Station")


func _refresh_visibility() -> void:
	var rm = RocketsManager
	var unlocked = rm and rm.is_scanner_unlocked()
	visible = unlocked
	if has_node("Sprite2D"):
		var sprite = get_node("Sprite2D")
		if sprite and sprite is CanvasItem:
			sprite.visible = unlocked

func _ensure_dialogs() -> void:
	if _build_dialog and is_instance_valid(_build_dialog) and _info_dialog and is_instance_valid(_info_dialog):
		return
	var host: Node = self
	if get_tree() and get_tree().current_scene:
		host = get_tree().current_scene
	if not (_build_dialog and is_instance_valid(_build_dialog)):
		_build_dialog = ConfirmationDialog.new()
		_build_dialog.title = "Build Scanner Station"
		host.call_deferred("add_child", _build_dialog)
		_build_dialog.confirmed.connect(_on_confirm_build_scanner)
	if not (_info_dialog and is_instance_valid(_info_dialog)):
		_info_dialog = AcceptDialog.new()
		_info_dialog.title = "Scanner Station"
		host.call_deferred("add_child", _info_dialog)
		_info_dialog.confirmed.connect(_on_unlock_info_confirmed)

func _on_unlock_info_confirmed() -> void:
	var rm = RocketsManager
	if not rm:
		return
	_ensure_scanner_state_consistency(rm)
	if not rm.is_scanner_unlocked():
		return
	if rm.is_scanner_station_built():
		return
	# Leave build prompt to explicit station interaction to avoid repeated modal chaining.

func _maybe_show_unlock_dialog() -> void:
	var rm = RocketsManager
	if not rm or not rm.is_scanner_unlocked():
		return
	_ensure_scanner_state_consistency(rm)
	if rm.is_scanner_station_built():
		return
	_ensure_dialogs()
	if not rm.is_scanner_unlock_dialog_seen():
		if _info_dialog and is_instance_valid(_info_dialog):
			var cost_text = _format_francs(rm.get_scanner_build_cost())
			_info_dialog.dialog_text = "Scanner Station unlocked. Build it for %s F to start scanning." % cost_text
			_info_dialog.call_deferred("popup_centered")
		rm.set_scanner_unlock_dialog_seen(true)
	return

func _prompt_build_scanner() -> void:
	var rm = RocketsManager
	if not rm:
		return
	_ensure_scanner_state_consistency(rm)
	if rm.is_scanner_station_built():
		return
	_ensure_dialogs()
	if _build_dialog and is_instance_valid(_build_dialog):
		var cost_text = _format_francs(rm.get_scanner_build_cost())
		_build_dialog.dialog_text = "Build Scanner Station for %s F?" % cost_text
		_build_dialog.call_deferred("popup_centered")

func _ensure_scanner_state_consistency(rm = null) -> void:
	var rockets_manager = rm
	if rockets_manager == null:
		rockets_manager = RocketsManager
	if not rockets_manager:
		return
	# Mission 4+ implies scanner flow was already completed.
	if not rockets_manager.is_scanner_station_built() and int(rockets_manager.get_mission_stage()) >= 4:
		rockets_manager.set_scanner_station_built(true)

func _on_confirm_build_scanner() -> void:
	var rm = RocketsManager
	if not rm:
		return
	var app = get_tree().root.find_child("AppController", true, false)
	if app == null or not app.has_method("get_franc_balance") or not app.has_method("add_franc_balance"):
		_show_info("Unable to access balance. Scanner build cancelled.")
		return
	var cost = rm.get_scanner_build_cost()
	var balance = int(app.get_franc_balance())
	if not rm.can_afford_scanner_build(balance):
		_show_info("Insufficient funds. Scanner build requires %s F." % _format_francs(cost))
		return
	app.add_franc_balance(-cost, "build_scanner_station")
	rm.set_scanner_station_built(true)
	AppControllerHelper.record_tutorial_action("build_scanner_station")
	_refresh_visibility()
	_show_info("Scanner Station constructed. You can now run scans.")

func _show_info(message: String) -> void:
	_ensure_dialogs()
	if _info_dialog and is_instance_valid(_info_dialog):
		_info_dialog.dialog_text = message
		_info_dialog.call_deferred("popup_centered")

func _format_francs(value: int) -> String:
	var abs_value = abs(value)
	if abs_value >= 1000000000:
		var billions = float(value) / 1000000000.0
		return "%.1fB" % billions
	if abs_value >= 1000000:
		var millions = float(value) / 1000000.0
		return "%.1fM" % millions
	return str(value)
