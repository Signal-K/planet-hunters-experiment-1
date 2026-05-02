extends "res://Scripts/Earth/Structure.gd"
class_name SatelliteStation

const UIManager = preload("res://Scripts/Earth/UIManager.gd")
const RocketsManager = preload("res://Scripts/Utils/RocketsManager.gd")
const AppControllerHelper = preload("res://Scripts/Utils/AppControllerHelper.gd")
const NumberFormat = preload("res://Scripts/Utils/NumberFormat.gd")

@onready var _build_dialog: ConfirmationDialog = $BuildDialog
@onready var _info_dialog: AcceptDialog = $InfoDialog

func _ready():
	super._ready()
	structure_name = "Scanner Station"
	print("Satellite Station initialized: " + structure_name)
	if _build_dialog and not _build_dialog.confirmed.is_connected(_on_confirm_build_scanner):
		_build_dialog.confirmed.connect(_on_confirm_build_scanner)
	if _info_dialog and not _info_dialog.confirmed.is_connected(_on_unlock_info_confirmed):
		_info_dialog.confirmed.connect(_on_unlock_info_confirmed)
	_ensure_scanner_state_consistency()
	_refresh_visibility()
	call_deferred("_maybe_show_unlock_dialog")
	# Re-evaluate visibility whenever all data is reset so the station hides
	# immediately without requiring a scene reload.
	var app = AppControllerHelper.get_instance()
	if app and app.has_signal("rockets_reset"):
		app.rockets_reset.connect(_on_rockets_reset)

func on_interact():
	_refresh_visibility()
	if not visible:
		return
	var rm = RocketsManager
	if not rm:
		return
	_ensure_scanner_state_consistency(rm)
	if not rm.is_scanner_station_built():
		_prompt_scanner_build_flow()
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


func _on_rockets_reset() -> void:
	_refresh_visibility()

func _refresh_visibility() -> void:
	var rm = RocketsManager
	var unlocked = rm and rm.is_scanner_unlocked()
	visible = unlocked
	if has_node("Sprite2D"):
		var sprite = get_node("Sprite2D")
		if sprite and sprite is CanvasItem:
			sprite.visible = unlocked

func _ensure_dialogs() -> void:
	if _build_dialog == null or _info_dialog == null:
		push_warning("SatelliteStation: expected scene-owned dialogs are missing")

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
			_info_dialog.dialog_text = "Scanner Station available. Older saves may still think it needs to be built, but current progression keeps it online once Mission 3 data access is unlocked. Legacy build cost was %s F." % cost_text
			_info_dialog.call_deferred("popup_centered")
		rm.set_scanner_unlock_dialog_seen(true)
	return

func _prompt_scanner_build_flow() -> void:
	var rm = RocketsManager
	if not rm:
		return
	_ensure_scanner_state_consistency(rm)
	if rm.is_scanner_station_built():
		return
	_ensure_dialogs()
	var current_scene = get_tree().current_scene
	if current_scene and current_scene.has_method("_start_guided_build_flow"):
		current_scene.call("_start_guided_build_flow", "scanner_station")
		return
	_show_info("The Scanner Station should already be available in current progression. If this save is out of date, reopen Earth Base to reconcile the legacy state.")

func _ensure_scanner_state_consistency(rm = null) -> void:
	var rockets_manager = rm
	if rockets_manager == null:
		rockets_manager = RocketsManager
	if not rockets_manager:
		return
	if rockets_manager.is_scanner_unlocked() and not rockets_manager.is_scanner_station_built():
		rockets_manager.set_scanner_station_built(true)
		rockets_manager.set_scanner_unlock_dialog_seen(true)

func _on_confirm_build_scanner() -> void:
	_prompt_scanner_build_flow()

func _show_info(message: String) -> void:
	_ensure_dialogs()
	if _info_dialog and is_instance_valid(_info_dialog):
		_info_dialog.dialog_text = message
		_info_dialog.call_deferred("popup_centered")

func _format_francs(value: int) -> String:
	return NumberFormat.compact(value)
