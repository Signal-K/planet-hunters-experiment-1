class_name UIManager
extends CanvasLayer

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
		print("UIManager: FrancBalance added")
	else:
		print("UIManager: failed to load FrancBalance scene")

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
	"""Show the Menu panel with counter integration"""
	if current_menu_panel != null:
		print("Menu panel already open")
		return
	
	var menu_scene = load("res://Scenes/UI/MenuPanel.tscn")
	if menu_scene:
		current_menu_panel = menu_scene.instantiate()
		add_child(current_menu_panel)
		_setup_menu_panel_integration()
		var app_controller = _get_app_controller()
		if app_controller and app_controller.has_method("request_menu_open"):
			app_controller.request_menu_open()
	else:
		print("Failed to load MenuPanel scene")

func _setup_menu_panel_integration() -> void:
	"""Setup counter integration and signal connections for menu panel"""
	var app_controller = _get_app_controller()
	if app_controller and current_menu_panel.has_method("set_counter"):
		var counter_value = app_controller.get_counter()
		current_menu_panel.set_counter(counter_value)
		print("Menu panel opened with counter: ", counter_value)
	
	# Connect signals
	if current_menu_panel.has_signal("panel_closed"):
		current_menu_panel.panel_closed.connect(_on_menu_panel_closed)
	if current_menu_panel.has_signal("counter_changed"):
		current_menu_panel.counter_changed.connect(_on_menu_counter_changed)
	if current_menu_panel.has_signal("reset_all"):
		current_menu_panel.reset_all.connect(_on_reset_all)
	if current_menu_panel.has_signal("reset_tutorial"):
		current_menu_panel.reset_tutorial.connect(_on_reset_tutorial)

func _show_new_mission_panel() -> void:
	"""Show the New Mission panel (SatelliteStationPanel)"""
	var panel_scene = load("res://Scenes/UI/NewMissionPanel.tscn")
	if panel_scene:
		var panel_instance = panel_scene.instantiate()
		add_child(panel_instance)
		if panel_instance.has_signal("panel_closed"):
			panel_instance.panel_closed.connect(_on_panel_closed)
		print("New Mission panel opened (SatelliteStationPanel)")
	else:
		print("Failed to load SatelliteStationPanel scene for New Mission")
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
			print("Market panel opened: Subcontractors")
			return
		print("Failed to load SubcontractorsPanel scene for Market")
	var panel = PanelManager.create_styled_panel(panel_titles[panel_type], get_tree())
	add_child(panel)
	print("Panel opened: ", panel_titles[panel_type])

func _get_app_controller() -> Node:
	"""Get reference to the AppController"""
	return preload("res://Scripts/Utils/AppControllerHelper.gd").get_instance()

func _on_reset_all() -> void:
	"""Handle reset all from menu panel - relay to AppController"""
	var app_controller = _get_app_controller()
	if app_controller and app_controller.has_method("_on_reset_all"):
		app_controller._on_reset_all()
	else:
		print("UIManager: AppController not found for reset_all")

func _on_reset_tutorial() -> void:
	"""Handle reset tutorial from menu panel - relay to AppController"""
	var app_controller = _get_app_controller()
	if app_controller and app_controller.has_method("_on_reset_tutorial"):
		app_controller._on_reset_tutorial()
	else:
		print("UIManager: AppController not found for reset_tutorial")

# Signal handlers
func _on_menu_panel_closed() -> void:
	print("Menu panel closed")
	current_menu_panel = null
	var app_controller = _get_app_controller()
	if app_controller and app_controller.has_method("request_menu_close"):
		app_controller.request_menu_close()

func _on_menu_counter_changed(new_value: int) -> void:
	"""Update AppController when counter changes in menu"""
	var app_controller = _get_app_controller()
	if app_controller and app_controller.has_method("set_counter_from_react"):
		app_controller.counter = new_value
		print("UIManager: Counter updated to: ", new_value)

func _on_panel_closed() -> void:
	print("Panel closed")

func show_structure_panel(panel_scene_path: String) -> void:
	"""Load and display a structure-specific panel from a scene file"""
	var panel_scene = load(panel_scene_path)
	if panel_scene:
		var panel_instance = panel_scene.instantiate()
		add_child(panel_instance)
		# Connect close signal if available
		if panel_instance.has_signal("panel_closed"):
			panel_instance.panel_closed.connect(_on_panel_closed)
		print("Structure panel opened: ", panel_scene_path)
	else:
		print("Failed to load panel scene: ", panel_scene_path)
