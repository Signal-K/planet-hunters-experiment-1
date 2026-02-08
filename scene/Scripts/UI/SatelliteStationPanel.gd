extends Control

signal panel_closed

const INITIAL_LOAD_TIME := 3.0  # seconds for initial load
const REFRESH_LOAD_TIME := 10.0  # seconds for refresh
const MAX_ANOMALIES := 5
const ASTEROID_SET := "active-asteroids"
const PLANET_SET := "telescope-tess"
const PLANET_UNLOCK_LEVEL := 2
const MIN_DISPLAY_TIME := 0.5
const UNLOCK_CONFIG_PATH := "user://satellite_station.cfg"
const UNLOCK_CONFIG_SECTION := "unlocks"
const UNLOCK_LEVEL2_SEEN_KEY := "level2_overlay_seen"
const LEVEL_UNLOCK_MISSIONS := [
	{"level": 2, "name": "Sell cargo on Earth"}
]

const SatelliteStationPanelData = preload("res://Scripts/UI/SatelliteStationPanelData.gd")
const SatelliteStationPanelList = preload("res://Scripts/UI/SatelliteStationPanelList.gd")
const SatelliteStationPanelDetail = preload("res://Scripts/UI/SatelliteStationPanelDetail.gd")
const SatelliteStationPanelLoading = preload("res://Scripts/UI/SatelliteStationPanelLoading.gd")

var pending_anomalies := []
var current_mode: String = "asteroids"  # Default mode
var local_only: bool = false
var use_archived_detail: bool = false
var _player_level: int = 1
var _unlock_overlay: ColorRect = null
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
	_detail.set_use_archived_detail(use_archived_detail)
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
	_connect_experience_updates()
	_refresh_player_level()
	_refresh_planet_unlock_ui(false)

	# Start initial load (annotation features archived)
	_start_loading(INITIAL_LOAD_TIME)
	if local_only:
		_apply_local_anomalies()
		return

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
	if local_only:
		_apply_local_anomalies()
		return
	_fetch_anomalies()

func _on_toggle_switch_pressed():
	"""Handle toggle switch between asteroids and planets"""
	if _player_level < PLANET_UNLOCK_LEVEL:
		status_label.text = "Status: Planets unlock at Level %d" % PLANET_UNLOCK_LEVEL
		return
	if current_mode == "asteroids":
		current_mode = "planets"
		toggle_switch.text = "Switch to Asteroids"
		if local_only:
			_start_loading(REFRESH_LOAD_TIME)
			_apply_local_anomalies()
			return
		# Fetch and display planets
		_start_loading(REFRESH_LOAD_TIME)
		_fetch_anomalies()
	else:
		current_mode = "asteroids"
		toggle_switch.text = "Switch to Planets"
		if local_only:
			_start_loading(REFRESH_LOAD_TIME)
			_apply_local_anomalies()
			return
		# Fetch and display asteroids
		_start_loading(REFRESH_LOAD_TIME)
		_fetch_anomalies()

func _get_current_mode() -> String:
	return current_mode

func _apply_local_anomalies() -> void:
	pending_anomalies = _build_local_anomalies()
	var target_type = "planets" if current_mode == "planets" else "asteroids"
	status_label.text = "Status: %d local %s loaded" % [pending_anomalies.size(), target_type]
	_loading.mark_anomalies_ready()

func _build_local_anomalies() -> Array:
	if current_mode == "planets":
		return [
			{
				"id": 9101,
				"ticId": "9101",
				"content": "9101",
				"anomalytype": "telescope_tess",
				"temperature": 290
			}
		]
	return [
		{
			"id": 4201,
			"content": "4201",
			"anomalytype": "active-asteroids",
			"classification_status": "confirmed"
		}
	]


func _process(delta: float) -> void:
	_loading.on_process(delta)

func _on_close_button_pressed():
	panel_closed.emit()
	queue_free()

func _on_background_input(event: InputEvent):
	if event is InputEventMouseButton and event.pressed:
		panel_closed.emit()
		queue_free()

func _connect_experience_updates() -> void:
	var app = _get_app_controller()
	if app and app.has_signal("experience_updated") and not app.experience_updated.is_connected(_on_experience_updated):
		app.experience_updated.connect(_on_experience_updated)

func _on_experience_updated(_xp: int, level: int) -> void:
	var previous_level = _player_level
	_player_level = max(level, 1)
	var crossed_planet_unlock = previous_level < PLANET_UNLOCK_LEVEL and _player_level >= PLANET_UNLOCK_LEVEL
	_refresh_planet_unlock_ui(crossed_planet_unlock)

func _refresh_player_level() -> void:
	var app = _get_app_controller()
	if app and app.has_method("get_experience_level"):
		_player_level = max(int(app.get_experience_level()), 1)
	else:
		_player_level = 1

func _refresh_planet_unlock_ui(show_overlay_if_needed: bool) -> void:
	var planets_unlocked = _player_level >= PLANET_UNLOCK_LEVEL
	if not planets_unlocked:
		current_mode = "asteroids"
		toggle_switch.disabled = true
		toggle_switch.text = "Planets unlock at Level %d" % PLANET_UNLOCK_LEVEL
		if not _loading.is_loading():
			status_label.text = "Status: Reach Level %d to unlock planet discovery" % PLANET_UNLOCK_LEVEL
		return

	toggle_switch.disabled = false
	if current_mode == "planets":
		toggle_switch.text = "Switch to Asteroids"
	else:
		toggle_switch.text = "Switch to Planets"

	var has_seen_overlay = _has_seen_level2_unlock_overlay()
	if show_overlay_if_needed or not has_seen_overlay:
		_show_level2_unlock_overlay()

func _show_level2_unlock_overlay() -> void:
	if _unlock_overlay and is_instance_valid(_unlock_overlay):
		return

	_unlock_overlay = ColorRect.new()
	_unlock_overlay.name = "Level2UnlockOverlay"
	_unlock_overlay.color = Color(0, 0, 0, 0.62)
	_unlock_overlay.mouse_filter = Control.MOUSE_FILTER_STOP
	_unlock_overlay.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(_unlock_overlay)

	var center = CenterContainer.new()
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_unlock_overlay.add_child(center)

	var panel = PanelContainer.new()
	panel.custom_minimum_size = Vector2(640, 0)
	center.add_child(panel)
	var panel_style = preload("res://Scripts/UI/PanelStyle.gd")
	panel_style.apply_panel(panel)

	var body = VBoxContainer.new()
	body.add_theme_constant_override("separation", 10)
	panel.add_child(body)

	var title = Label.new()
	title.text = "Level 2 Reached: New Unlocks"
	panel_style.apply_title(title)
	body.add_child(title)

	var emphasis = Label.new()
	emphasis.text = "Planet Discovery is now online."
	emphasis.add_theme_font_size_override("font_size", 30)
	emphasis.add_theme_color_override("font_color", panel_style.ACCENT)
	body.add_child(emphasis)

	var subtitle = Label.new()
	subtitle.text = "You can now scan entries from anomalySet: telescope-tess."
	panel_style.apply_muted(subtitle)
	body.add_child(subtitle)

	var unlock_items = _get_unlocks_for_level(PLANET_UNLOCK_LEVEL)
	for item_text in unlock_items:
		var row = Label.new()
		row.text = "• %s" % item_text
		panel_style.apply_body(row)
		body.add_child(row)

	var cta = Button.new()
	cta.text = "Start Planet Scan"
	panel_style.apply_button(cta, true)
	cta.pressed.connect(_on_level2_overlay_confirmed)
	body.add_child(cta)

func _on_level2_overlay_confirmed() -> void:
	_mark_level2_unlock_overlay_seen()
	if _unlock_overlay and is_instance_valid(_unlock_overlay):
		_unlock_overlay.queue_free()
	_unlock_overlay = null
	_focus_planets_after_unlock()

func _focus_planets_after_unlock() -> void:
	current_mode = "planets"
	toggle_switch.text = "Switch to Asteroids"
	var t = create_tween()
	t.tween_property(toggle_switch, "scale", Vector2(1.09, 1.09), 0.12)
	t.tween_property(toggle_switch, "scale", Vector2.ONE, 0.18)
	_start_loading(REFRESH_LOAD_TIME)
	_fetch_anomalies()

func _get_unlocks_for_level(level: int) -> Array:
	var items := []
	if level == PLANET_UNLOCK_LEVEL:
		items.append("Planet discovery targets (telescope-tess anomalies)")

	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if rm:
		for rocket_id in rm.ROCKET_UNLOCK_LEVELS.keys():
			if int(rm.ROCKET_UNLOCK_LEVELS.get(rocket_id, 1)) == level:
				items.append("Rocket: %s" % rocket_id)

	var sm = preload("res://Scripts/Utils/SubcontractorManager.gd")
	if sm:
		for idx in range(sm.SUBCONTRACTORS.size()):
			if int(sm.get_unlock_level_for_index(idx)) != level:
				continue
			var entry = sm.SUBCONTRACTORS[idx]
			var name = str(entry.get("name", ""))
			if entry.get("hidden", false):
				name = "Classified Subcontractor"
			items.append("Subcontractor: %s" % name)

	for mission in LEVEL_UNLOCK_MISSIONS:
		if int(mission.get("level", 1)) == level:
			items.append("Mission: %s" % str(mission.get("name", "")))

	return items

func _has_seen_level2_unlock_overlay() -> bool:
	var cfg = ConfigFile.new()
	var err = cfg.load(UNLOCK_CONFIG_PATH)
	if err != OK:
		return false
	return bool(cfg.get_value(UNLOCK_CONFIG_SECTION, UNLOCK_LEVEL2_SEEN_KEY, false))

func _mark_level2_unlock_overlay_seen() -> void:
	var cfg = ConfigFile.new()
	cfg.load(UNLOCK_CONFIG_PATH)
	cfg.set_value(UNLOCK_CONFIG_SECTION, UNLOCK_LEVEL2_SEEN_KEY, true)
	cfg.save(UNLOCK_CONFIG_PATH)

func _get_app_controller() -> Node:
	return get_tree().root.find_child("AppController", true, false)
