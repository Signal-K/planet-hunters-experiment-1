extends Control

signal panel_closed

const INITIAL_LOAD_TIME := 3.0  # seconds for initial load
const REFRESH_LOAD_TIME := 10.0  # seconds for refresh
const MAX_ANOMALIES := 5
const ASTEROID_SET := "active-asteroids"
const PLANET_SET := "telescope-tess"
const MIN_DISPLAY_TIME := 0.5

const SatelliteStationPanelData = preload("res://Scripts/UI/SatelliteStationPanelData.gd")
const SatelliteStationPanelList = preload("res://Scripts/UI/SatelliteStationPanelList.gd")
const SatelliteStationPanelDetail = preload("res://Scripts/UI/SatelliteStationPanelDetail.gd")
const SatelliteStationPanelLoading = preload("res://Scripts/UI/SatelliteStationPanelLoading.gd")

var pending_anomalies := []
var current_mode: String = "asteroids"  # Default mode
var local_only: bool = false
var _data := SatelliteStationPanelData.new()
var _list := SatelliteStationPanelList.new()
var _detail := SatelliteStationPanelDetail.new()
var _loading := SatelliteStationPanelLoading.new()

func set_local_only(val: bool) -> void:
	local_only = val

@onready var loading_container: VBoxContainer = $PanelContainer/Panel/VBoxContainer/ContentContainer/LoadingContainer
@onready var anomaly_list: VBoxContainer = $PanelContainer/Panel/VBoxContainer/ContentContainer/AnomalyList
@onready var progress_bar: ProgressBar = $PanelContainer/Panel/VBoxContainer/ContentContainer/LoadingContainer/ProgressBar
@onready var loading_label: Label = $PanelContainer/Panel/VBoxContainer/ContentContainer/LoadingContainer/LoadingLabel
			# Preload the asteroid detail view
@onready var refresh_button: Button = $PanelContainer/Panel/VBoxContainer/ContentContainer/RefreshContainer/RefreshButton
@onready var status_label: Label = $PanelContainer/Panel/VBoxContainer/ContentContainer/StatusContainer/StatusLabel
@onready var content_container: VBoxContainer = $PanelContainer/Panel/VBoxContainer/ContentContainer
@onready var toggle_switch: Button = $PanelContainer/Panel/VBoxContainer/HeaderContainer/ToggleSwitch

func _ready():
	# Apply consistent panel styling
	var title_label = $PanelContainer/Panel/VBoxContainer/HeaderContainer/Title
	var close_button = $PanelContainer/Panel/VBoxContainer/HeaderContainer/CloseButton
	_detail.setup(
		$PanelContainer/Panel,
		loading_container,
		anomaly_list,
		content_container,
		toggle_switch,
		title_label,
		close_button
	)
	_detail.apply_panel_style()
	_apply_panel_style()

	_list.setup(
		anomaly_list,
		Callable(self, "_get_current_mode"),
		Callable(_data, "normalize_anomaly_id"),
		Callable(self, "_on_select_target_pressed"),
		Callable(_detail, "show_detail")
	)

	_loading.setup(
		loading_container,
		anomaly_list,
		progress_bar,
		status_label,
		refresh_button,
		Callable(self, "_on_loading_finished"),
		MIN_DISPLAY_TIME
	)
	
	# Connect close button
	close_button.pressed.connect(_on_close_button_pressed)
	
	# Connect background click to close
	$Background.gui_input.connect(_on_background_input)
	
	# Connect refresh button
	refresh_button.pressed.connect(_on_refresh_pressed)
	
	# Connect toggle switch
	toggle_switch.pressed.connect(_on_toggle_switch_pressed)

	# Start initial load (annotation features archived)
	_start_loading(INITIAL_LOAD_TIME)

	# Default behavior: fetch anomalies from Supabase
	print("SatelliteStationPanel: calling _fetch_anomalies() — starting fetch")
	var sup = preload("res://Scripts/Systems/SupabaseClient.gd").get_instance()
	if sup:
		print("SatelliteStationPanel: Supabase URL -> ", sup.SUPABASE_URL)
	else:
		print("SatelliteStationPanel: SupabaseClient instance not available")

	_fetch_anomalies()

func _apply_panel_style() -> void:
	var panel_style = preload("res://Scripts/UI/PanelStyle.gd")
	panel_style.apply_panel($PanelContainer/Panel)
	panel_style.apply_title($PanelContainer/Panel/VBoxContainer/HeaderContainer/Title)
	panel_style.apply_separator($PanelContainer/Panel/VBoxContainer/HSeparator)
	panel_style.apply_button($PanelContainer/Panel/VBoxContainer/HeaderContainer/CloseButton, false)
	panel_style.apply_button($PanelContainer/Panel/VBoxContainer/HeaderContainer/ToggleSwitch, false)
	panel_style.apply_button($PanelContainer/Panel/VBoxContainer/ContentContainer/RefreshContainer/RefreshButton, true)
	panel_style.apply_body($PanelContainer/Panel/VBoxContainer/ContentContainer/StatusContainer/StatusLabel)
	panel_style.apply_muted($PanelContainer/Panel/VBoxContainer/ContentContainer/LoadingContainer/LoadingLabel)
	panel_style.apply_muted($PanelContainer/Panel/VBoxContainer/ContentContainer/LoadingContainer/ScanningHint)
	panel_style.apply_progress_bar($PanelContainer/Panel/VBoxContainer/ContentContainer/LoadingContainer/ProgressBar)

func _start_loading(duration: float):
	print("SatelliteStationPanel: _start_loading duration=", duration)
	_loading.start_loading(duration)
	# Start processing so _process will run to animate progress
	set_process(true)

func _on_loading_finished() -> void:
	# Display the pending anomalies
	_list.display_anomalies(pending_anomalies)
	pending_anomalies = []
	# Stop processing once loading is finished
	set_process(false)

func _fetch_anomalies():
	print("SatelliteStationPanel: _fetch_anomalies called, mode=", current_mode)
	var supabase = SupabaseClient.get_instance()
	var anomaly_set = PLANET_SET if current_mode == "planets" else ASTEROID_SET
	supabase.fetch_anomalies(anomaly_set, MAX_ANOMALIES, _on_anomalies_fetched)


func _on_anomalies_fetched(data: Array, error: String):
	# Debug logging for callback
	print("SatelliteStationPanel: _on_anomalies_fetched called — error='" + str(error) + "', count=" + str(data.size()))
	if error != "":
		print("SatelliteStationPanel: Error fetching anomalies: ", error)
		pending_anomalies = []
		status_label.text = "Status: Error - " + error
		_loading.mark_anomalies_ready()
		return

	# No error
	pending_anomalies = data
	var target_type = "planets" if current_mode == "planets" else "asteroids"
	status_label.text = "Status: %d %s detected" % [data.size(), target_type]
	_loading.mark_anomalies_ready()
	_award_scan_experience()

	# Persist a lightweight list of detected targets for other UI (e.g., Launchpad)
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if rm:
		var targets := []
		for i in range(data.size()):
			var a = data[i]
			var id = _data.normalize_anomaly_id(a, i + 1)
			var label = "TIC %s" % str(a.get("ticId")) if a.has("ticId") and a.get("ticId") != null and str(a.get("ticId")) != "" else str(a.get("content", id))
			var target_kind = "planet" if current_mode == "planets" else "asteroid"
			targets.append({"id": id, "label": label, "type": target_kind})
		var ok = rm.set_detected_targets(targets)
		print("SatelliteStationPanel: persisted detected_targets count=", targets.size(), " ok=", ok)

func _on_anomaly_item_button_pressed(bound_anomaly: Dictionary):
	"""Called when the overlay button is pressed for an anomaly item."""
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if rm:
		var target_id = _data.normalize_anomaly_id(bound_anomaly, 1)
		var target_type = "planet" if current_mode == "planets" else "asteroid"
		rm.register_target_interaction(target_id, target_type)
	_detail.show_detail(bound_anomaly)

func _on_select_target_pressed(bound_anomaly: Dictionary, index: int, btn: Button) -> void:
	# Persist the selected target via RocketsManager
	var target_id = _data.normalize_anomaly_id(bound_anomaly, index)
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if not rm:
		print("SatelliteStationPanel: RocketsManager not available")
		status_label.text = "Status: Unable to select target"
		return
	var target_type = "planet" if current_mode == "planets" else "asteroid"
	rm.register_target_interaction(target_id, target_type)
	var ok = rm.select_target(target_id)
	if ok:
		status_label.text = "Target selected: %s" % target_id
		print("SatelliteStationPanel: target selected:", target_id)
		if btn:
			btn.text = "Target Selected"
			btn.disabled = true
	else:
		print("SatelliteStationPanel: failed to persist selected target:", target_id)
		status_label.text = "Status: Failed to select target"

func _award_scan_experience() -> void:
	var root = get_tree().root
	var app_controller = root.find_child("AppController", true, false)
	if app_controller and app_controller.has_method("award_scan_experience"):
		app_controller.award_scan_experience()

func _on_refresh_pressed():
	_start_loading(REFRESH_LOAD_TIME)
	_fetch_anomalies()

func _on_toggle_switch_pressed():
	"""Handle toggle switch between asteroids and planets"""
	if current_mode == "asteroids":
		current_mode = "planets"
		toggle_switch.text = "Switch to Asteroids"
		# Fetch and display planets
		_start_loading(REFRESH_LOAD_TIME)
		_fetch_anomalies()
	else:
		current_mode = "asteroids"
		toggle_switch.text = "Switch to Planets"
		# Fetch and display asteroids
		_start_loading(REFRESH_LOAD_TIME)
		_fetch_anomalies()

func _get_current_mode() -> String:
	return current_mode


func _process(delta: float) -> void:
	_loading.on_process(delta)

func _on_close_button_pressed():
	panel_closed.emit()
	queue_free()

func _on_background_input(event: InputEvent):
	if event is InputEventMouseButton and event.pressed:
		panel_closed.emit()
		queue_free()
