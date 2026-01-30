extends Control

signal panel_closed

const SimpleDetailView = preload("res://Scenes/UI/SimpleDetail/simple_detail_view.tscn")
const NewMissionAnnotations = preload("res://Scripts/UI/NewMissionAnnotations.gd")
const NewMissionLaunchList = preload("res://Scripts/UI/NewMissionLaunchList.gd")

var panel_container: Node = null
var anomaly_list: Node = null
var close_button: Button = null
var select_rocket_button: Button = null
const ROCKET_REFUND: int = 1000000000
var launched_list_container: Node = null
var _annotations := NewMissionAnnotations.new()
var _launch_list := NewMissionLaunchList.new()

func _ready():
	panel_container = get_node_or_null("PanelContainer")
	if panel_container == null:
		push_error("NewMissionPanel: PanelContainer node not found")
		return
	_apply_panel_style()

	# Match the same structure used by SatelliteStationPanel (ContentContainer may be present)
	anomaly_list = get_node_or_null("PanelContainer/Panel/VBoxContainer/ContentContainer/AnomalyList")
	if anomaly_list == null:
		# fallback to older path
		anomaly_list = get_node_or_null("PanelContainer/Panel/VBoxContainer/AnomalyList")
	if anomaly_list == null:
		push_error("NewMissionPanel: AnomalyList node not found at expected paths")
		return

	close_button = get_node_or_null("PanelContainer/Panel/VBoxContainer/HeaderContainer/CloseButton")
	if close_button:
		close_button.pressed.connect(func():
			panel_closed.emit()
			queue_free()
		)

	# Rocket selector button (added in scene)
	select_rocket_button = get_node_or_null("PanelContainer/Panel/VBoxContainer/HeaderContainer/SelectRocketButton")
	if select_rocket_button:
		select_rocket_button.pressed.connect(self._on_select_rocket_pressed)

	# Container where we'll list launched rockets for mission selection
	launched_list_container = get_node_or_null("PanelContainer/Panel/VBoxContainer/LaunchedList")
	if launched_list_container == null:
		# Create a container if missing
		launched_list_container = VBoxContainer.new()
		launched_list_container.name = "LaunchedList"
		var parent_vbox = get_node_or_null("PanelContainer/Panel/VBoxContainer")
		if parent_vbox:
			parent_vbox.add_child(launched_list_container)

	# Show launched rockets for self-destruct management
	_annotations.setup(self, anomaly_list, SimpleDetailView)
	_launch_list.setup(launched_list_container, Callable(self, "_add_refund"))
	_display_launched_rockets()
	set_process(true)

func _refresh():
	_annotations.refresh()

func _process(_delta: float) -> void:
	_launch_list.update_progress()

func _on_select_rocket_pressed() -> void:
	# Attempt to load RocketSelector script (try both Scripts/ and scripts/ paths)
	var script = null
	if ResourceLoader.exists("res://Scripts/Earth/RocketSelector.gd"):
		script = load("res://Scripts/Earth/RocketSelector.gd")
	elif ResourceLoader.exists("res://scripts/Earth/RocketSelector.gd"):
		script = load("res://scripts/Earth/RocketSelector.gd")
	if script == null:
		push_error("NewMissionPanel: RocketSelector script not found")
		return

	var sel = Control.new()
	sel.set_script(script)
	# prefer adding to the current scene so it overlays the scene content
	var root = get_tree().current_scene
	if root:
		root.add_child(sel)
		# place on right side of screen relative to parent
		sel.position = Vector2(1080, 120)
	else:
		get_tree().root.add_child(sel)


func _display_launched_rockets() -> void:
	_launch_list.display_launched_rockets()

func _add_refund() -> void:
	var app_controller = _get_app_controller()
	if app_controller and app_controller.has_method("get_franc_balance") and app_controller.has_method("set_franc_balance_from_react"):
		var balance = int(app_controller.get_franc_balance())
		app_controller.set_franc_balance_from_react(balance + ROCKET_REFUND)
	else:
		print("NewMissionPanel: AppController not available for refund")

func _apply_panel_style() -> void:
	var panel_style = preload("res://Scripts/UI/PanelStyle.gd")
	var panel = $PanelContainer/Panel
	panel_style.apply_panel(panel)
	panel_style.apply_title($PanelContainer/Panel/VBoxContainer/HeaderContainer/Title)
	panel_style.apply_separator($PanelContainer/Panel/VBoxContainer/HSeparator)
	panel_style.apply_button($PanelContainer/Panel/VBoxContainer/HeaderContainer/CloseButton, false)
	panel_style.apply_button($PanelContainer/Panel/VBoxContainer/HeaderContainer/SelectRocketButton, true)
	var refresh_btn = $PanelContainer/Panel/VBoxContainer/ContentContainer/RefreshContainer/RefreshButton
	if refresh_btn:
		panel_style.apply_button(refresh_btn, true)

func _get_app_controller() -> Node:
	return get_tree().root.find_child("AppController", true, false)
