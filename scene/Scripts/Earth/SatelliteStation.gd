class_name SatelliteStation extends Structure

const ACTION_OPEN_SATELLITE := "open_satellite_station"
const HINT_OPEN_SATELLITE := "Use Scanner Station to run scans for new mission targets."
const ACTION_BUILD_SCANNER := "build_scanner_station"
const HINT_BUILD_SCANNER := "Scanner Station is online. You can now scan for targets."

var _build_dialog: ConfirmationDialog = null
var _info_dialog: AcceptDialog = null

func _ready():
	super._ready()
	structure_name = "Scanner Station"
	print("Satellite Station initialized: " + structure_name)
	_refresh_visibility()
	call_deferred("_maybe_show_unlock_dialog")

func on_interact():
	_refresh_visibility()
	if not visible:
		return
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if not rm:
		return
	if not rm.is_scanner_station_built():
		_prompt_build_scanner()
		return
	super.on_interact()
	_show_tutorial_hint_once(ACTION_OPEN_SATELLITE, HINT_OPEN_SATELLITE)
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

func _show_tutorial_hint_once(action_key: String, message: String) -> void:
	var app = get_tree().root.find_child("AppController", true, false)
	if app and app.has_method("show_tutorial_hint_once"):
		app.show_tutorial_hint_once(action_key, message)

func _refresh_visibility() -> void:
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
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

func _maybe_show_unlock_dialog() -> void:
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if not rm or not rm.is_scanner_unlocked():
		return
	if rm.is_scanner_station_built():
		return
	if rm.is_scanner_unlock_dialog_seen():
		return
	_ensure_dialogs()
	if _info_dialog and is_instance_valid(_info_dialog):
		var cost_text = _format_francs(rm.get_scanner_build_cost())
		_info_dialog.dialog_text = "Scanner Station unlocked. Build it for %s F to start scanning." % cost_text
		_info_dialog.call_deferred("popup_centered")
	rm.set_scanner_unlock_dialog_seen(true)

func _prompt_build_scanner() -> void:
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if not rm:
		return
	_ensure_dialogs()
	if _build_dialog and is_instance_valid(_build_dialog):
		var cost_text = _format_francs(rm.get_scanner_build_cost())
		_build_dialog.dialog_text = "Build Scanner Station for %s F?" % cost_text
		_build_dialog.call_deferred("popup_centered")

func _on_confirm_build_scanner() -> void:
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
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
	_show_tutorial_hint_once(ACTION_BUILD_SCANNER, HINT_BUILD_SCANNER)
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
