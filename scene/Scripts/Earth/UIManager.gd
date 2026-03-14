class_name UIManager
extends CanvasLayer
const AppLogger = preload("res://Scripts/Utils/Logger.gd")

enum PanelType {
	MENU,
	MARKET,
	SPACE_MAP,
	NEW_MISSION
}

var panel_titles = {
	PanelType.MENU: "Main Menu",
	PanelType.MARKET: "Market",
	PanelType.SPACE_MAP: "Space Map",
	PanelType.NEW_MISSION: "New Mission"
}

var current_menu_panel: Control = null

func _ready() -> void:
	# Set layer above the main UI
	layer = 3
	_setup_ui_components()

func _setup_ui_components() -> void:
	"""Initialize all UI components that should be visible on Earth scenes"""
	_add_franc_balance_ui()

func _add_franc_balance_ui() -> void:
	"""Add the franc balance UI component"""
	var franc_scene = load("res://Scenes/UI/FrancBalance.tscn")
	if franc_scene:
		var franc_instance = franc_scene.instantiate()
		add_child(franc_instance)
		AppLogger.d("UIManager: FrancBalance added")
	else:
		AppLogger.w("UIManager: failed to load FrancBalance scene")

func show_panel(panel_type: PanelType) -> void:
	"""Show a panel based on its type"""
	match panel_type:
		PanelType.MENU:
			_show_menu_panel()
		PanelType.NEW_MISSION:
			_show_new_mission_panel()
		_:
			_show_generic_panel(panel_type)

func _show_menu_panel() -> void:
	"""Show menu through AppController-owned runtime menu."""
	var app_controller = _get_app_controller()
	if app_controller and app_controller.has_method("show_menu_panel"):
		app_controller.show_menu_panel()
		return
	AppLogger.w("UIManager: AppController not available for menu open")

func _setup_menu_panel_integration() -> void:
	"""Legacy menu scene integration removed; menu is AppController-owned."""
	return

func _show_new_mission_panel() -> void:
	"""Show the New Mission panel (SatelliteStationPanel)"""
	var panel_scene = load("res://Scenes/UI/NewMissionPanel.tscn")
	if panel_scene:
		var panel_instance = panel_scene.instantiate()
		add_child(panel_instance)
		if panel_instance.has_signal("panel_closed"):
			panel_instance.panel_closed.connect(_on_panel_closed)
		AppLogger.d("New Mission panel opened (SatelliteStationPanel)")
	else:
		AppLogger.w("Failed to load SatelliteStationPanel scene for New Mission")
		_show_generic_panel(PanelType.NEW_MISSION)

func _show_generic_panel(panel_type: PanelType) -> void:
	"""Show a generic styled panel"""
	if panel_type == PanelType.MARKET:
		var market_scene = load("res://Scenes/UI/SubcontractorsPanel.tscn")
		if market_scene:
			var market_instance = market_scene.instantiate()
			add_child(market_instance)
			if market_instance.has_signal("panel_closed"):
				market_instance.panel_closed.connect(_on_panel_closed)
			AppLogger.d("Market panel opened: Subcontractors")
			return
		AppLogger.w("Failed to load SubcontractorsPanel scene for Market")
	var panel = PanelManager.create_styled_panel(panel_titles[panel_type], get_tree())
	add_child(panel)
	AppLogger.d("Panel opened: %s" % panel_titles[panel_type])

func _get_app_controller() -> Node:
	"""Get reference to the AppController"""
	return preload("res://Scripts/Utils/AppControllerHelper.gd").get_instance()

func _on_reset_all() -> void:
	"""Handle reset all from menu panel - relay to AppController"""
	var app_controller = _get_app_controller()
	if app_controller and app_controller.has_method("_on_reset_all"):
		app_controller._on_reset_all()
	else:
		AppLogger.w("UIManager: AppController not found for reset_all")


# Signal handlers
func _on_menu_panel_closed() -> void:
	AppLogger.d("Menu panel closed")
	current_menu_panel = null
	var app_controller = _get_app_controller()
	if app_controller and app_controller.has_method("hide_menu_panel"):
		app_controller.hide_menu_panel()

func _on_menu_counter_changed(new_value: int) -> void:
	"""Update AppController when counter changes in menu"""
	var app_controller = _get_app_controller()
	if app_controller and app_controller.has_method("set_counter_from_react"):
		app_controller.counter = new_value
		AppLogger.d("UIManager: Counter updated to: %s" % new_value)

func _on_panel_closed() -> void:
	AppLogger.d("Panel closed")

func show_structure_panel(panel_scene_path: String) -> void:
	"""Load and display a structure-specific panel from a scene file"""
	var panel_scene = load(panel_scene_path)
	if panel_scene:
		var panel_instance = panel_scene.instantiate()
		add_child(panel_instance)
		# Connect close signal if available
		if panel_instance.has_signal("panel_closed"):
			panel_instance.panel_closed.connect(_on_panel_closed)
		AppLogger.d("Structure panel opened: %s" % panel_scene_path)
	else:
		AppLogger.w("Failed to load panel scene: %s" % panel_scene_path)
