extends Control

signal panel_closed

const PanelStyle = preload("res://Scripts/UI/PanelStyle.gd")
const SimpleDetailView = preload("res://Scenes/UI/SimpleDetail/simple_detail_view.tscn")
const NewMissionAnnotations = preload("res://Scripts/UI/NewMissionAnnotations.gd")
const NewMissionLaunchList = preload("res://Scripts/UI/NewMissionLaunchList.gd")
const RocketSpecs = preload("res://Scripts/Utils/RocketSpecs.gd")

var panel_container: Node = null
var anomaly_list: Node = null
var close_button: Button = null
var select_rocket_button: Button = null
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
		push_error("NewMissionPanel: LaunchedList node not found")
		return

	# Show launched rockets for self-destruct management
	_annotations.setup(self, anomaly_list, SimpleDetailView)
	_launch_list.setup(launched_list_container, _add_refund)
	_display_launched_rockets()
	set_process(true)

func _refresh():
	_annotations.refresh()

func _process(_delta: float) -> void:
	_launch_list.update_progress()


func _display_launched_rockets() -> void:
	_launch_list.display_launched_rockets()

func _add_refund(rocket_id: String) -> void:
	var app_controller = _get_app_controller()
	if app_controller and app_controller.has_method("get_franc_balance") and app_controller.has_method("set_franc_balance_from_react"):
		var balance = int(app_controller.get_franc_balance())
		var refund = RocketSpecs.get_cost(rocket_id)
		app_controller.set_franc_balance_from_react(balance + refund)
	else:
		push_error("NewMissionPanel: AppController not available for refund")

func _apply_panel_style() -> void:
	var panel = $PanelContainer/Panel
	panel.add_theme_stylebox_override(
		"panel",
		PanelStyle.create_glass_panel_style(Color(0.05, 0.09, 0.14, 0.94), 0.68, 20, 24, 20)
	)
	PanelStyle.apply_title_on_dark($PanelContainer/Panel/VBoxContainer/HeaderContainer/Title)
	PanelStyle.apply_separator($PanelContainer/Panel/VBoxContainer/HSeparator)
	PanelStyle.apply_outline_button($PanelContainer/Panel/VBoxContainer/HeaderContainer/CloseButton)
	PanelStyle.apply_button($PanelContainer/Panel/VBoxContainer/HeaderContainer/SelectRocketButton, true)
	var refresh_btn = $PanelContainer/Panel/VBoxContainer/ContentContainer/RefreshContainer/RefreshButton
	if refresh_btn:
		PanelStyle.apply_outline_button(refresh_btn)

func _get_app_controller() -> Node:
	return preload("res://Scripts/Utils/AppControllerHelper.gd").get_instance()
