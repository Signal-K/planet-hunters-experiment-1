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
	{"level": 3, "name": "Sell cargo on Earth"}
]
const LAUNCHPAD_SCENE_PATH := "res://Scenes/Earth/earth_launchpad.tscn"

const SatelliteStationPanelData = preload("res://Scripts/UI/SatelliteStationPanelData.gd")
const SatelliteStationPanelList = preload("res://Scripts/UI/SatelliteStationPanelList.gd")
const SatelliteStationPanelDetail = preload("res://Scripts/UI/SatelliteStationPanelDetail.gd")
const SatelliteStationPanelLoading = preload("res://Scripts/UI/SatelliteStationPanelLoading.gd")
const Level2UnlockOverlayScene = preload("res://Scenes/UI/Templates/SatelliteLevel2UnlockOverlay.tscn")
const UnlockItemScene = preload("res://Scenes/UI/Templates/MenuUnlockItem.tscn")

var pending_anomalies := []
var current_mode: String = "asteroids"  # Default mode
var local_only: bool = false
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
	_detail.apply_panel_style()
	_apply_panel_style()

	_list.setup(
		anomaly_list,
		Callable(self, "_get_current_mode"),
		Callable(_data, "normalize_anomaly_id"),
		Callable(self, "_on_select_target_pressed"),
		Callable(self, "_on_view_pressed")
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
	# If scan completed but yielded nothing, provide deterministic offline targets.
	# This covers timeout/hang/empty-result paths where error callbacks are not fired.
	if pending_anomalies.is_empty():
		pending_anomalies = _build_local_anomalies()
		var fallback_type = "planets" if current_mode == "planets" else "asteroids"
		status_label.text = "Status: Using offline %s" % fallback_type
		_award_scan_experience()
	pending_anomalies = _filter_mission3_untargeted_anomalies(pending_anomalies)
	preload("res://Scripts/Utils/AppControllerHelper.gd").record_tutorial_action("scan_targets", {
		"mode": current_mode,
		"count": pending_anomalies.size()
	})

	_persist_detected_targets_and_record_scan(pending_anomalies)

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
		# Keep gameplay moving in web builds even if remote fetch fails.
		# Fallback to deterministic local anomalies so scan always produces targets.
		pending_anomalies = _build_local_anomalies()
		var fallback_type = "planets" if current_mode == "planets" else "asteroids"
		status_label.text = "Status: Using offline %s (%s)" % [fallback_type, error.left(80)]
		_loading.mark_anomalies_ready()
		_award_scan_experience()
		return

	# No error
	pending_anomalies = data
	var target_type = "planets" if current_mode == "planets" else "asteroids"
	status_label.text = "Status: %d %s detected" % [data.size(), target_type]
	_loading.mark_anomalies_ready()
	_award_scan_experience()

	# Persist target data in _on_loading_finished once loading completes.

func _on_anomaly_item_button_pressed(bound_anomaly: Dictionary):
	"""Called when the overlay button is pressed for an anomaly item."""
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if rm:
		var target_id = _data.normalize_anomaly_id(bound_anomaly, 1)
		var target_type = "planet" if current_mode == "planets" else "asteroid"
		rm.register_target_interaction(target_id, target_type)
	_detail.show_detail(bound_anomaly)

func _on_select_target_pressed(bound_anomaly: Dictionary, index: int, btn: Button) -> void:
	_select_target_and_launch(bound_anomaly, index, btn)

func _on_view_pressed(bound_anomaly: Dictionary, index: int) -> void:
	# "View" should go to Launchpad, not open the image/detail page.
	_select_target_and_launch(bound_anomaly, index, null)

func _select_target_and_launch(bound_anomaly: Dictionary, index: int, btn: Button) -> void:
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
		preload("res://Scripts/Utils/AppControllerHelper.gd").record_tutorial_action("select_launch_target", {
			"target_id": target_id,
			"source": "scanner"
		})
		status_label.text = "Target selected: %s" % target_id
		print("SatelliteStationPanel: target selected:", target_id)
		if btn:
			btn.text = "Target Selected"
			btn.disabled = true
		_change_to_launchpad_scene()
	else:
		print("SatelliteStationPanel: failed to persist selected target:", target_id)
		status_label.text = "Status: Failed to select target"

func _change_to_launchpad_scene() -> void:
	var tree = Engine.get_main_loop() as SceneTree
	if tree == null:
		return

	var scene_manager = null
	if tree.current_scene:
		scene_manager = tree.current_scene.get_node_or_null("SceneManager")

	if scene_manager and scene_manager.has_method("change_to_scene"):
		scene_manager.change_to_scene(LAUNCHPAD_SCENE_PATH)
	else:
		tree.change_scene_to_file(LAUNCHPAD_SCENE_PATH)

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
		preload("res://Scripts/Utils/AppControllerHelper.gd").record_tutorial_action("toggle_planet_scanner")
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

func _persist_detected_targets_and_record_scan(anomalies: Array) -> void:
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if not rm:
		return
	var targets := []
	var target_kind = "planet" if current_mode == "planets" else "asteroid"
	for i in range(anomalies.size()):
		var a = anomalies[i]
		var id = _data.normalize_anomaly_id(a, i + 1)
		var label = "TIC %s" % str(a.get("ticId")) if a.has("ticId") and a.get("ticId") != null and str(a.get("ticId")) != "" else str(a.get("content", id))
		targets.append({"id": id, "label": label, "type": target_kind})
	if targets.is_empty():
		return
	var ok = rm.set_detected_targets(targets)
	rm.record_scan_pass(targets)
	print("SatelliteStationPanel: persisted detected_targets count=", targets.size(), " ok=", ok)

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

func _filter_mission3_untargeted_anomalies(anomalies: Array) -> Array:
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if not rm:
		return anomalies
	var mission_stage = int(rm.get_mission_stage())
	if mission_stage == 3 and current_mode != "asteroids":
		return anomalies
	if mission_stage == 4 and current_mode != "planets":
		return anomalies
	if mission_stage != 3 and mission_stage != 4:
		return anomalies
	var targeted_ids = rm.get_targeted_target_ids()
	var filtered := []
	for i in range(anomalies.size()):
		var anomaly = anomalies[i]
		if typeof(anomaly) != TYPE_DICTIONARY:
			continue
		var target_id = _data.normalize_anomaly_id(anomaly, i + 1)
		if target_id == "" or targeted_ids.has(target_id):
			continue
		filtered.append(anomaly)
		if filtered.size() >= 5:
			break
	return filtered


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

	_unlock_overlay = Level2UnlockOverlayScene.instantiate()
	add_child(_unlock_overlay)

	var panel: PanelContainer = _unlock_overlay.get_node("Center/Panel")
	var panel_style = preload("res://Scripts/UI/PanelStyle.gd")
	panel_style.apply_panel(panel)

	var body: VBoxContainer = _unlock_overlay.get_node("Center/Panel/Body")

	var title: Label = _unlock_overlay.get_node("Center/Panel/Body/Title")
	panel_style.apply_title(title)

	var emphasis: Label = _unlock_overlay.get_node("Center/Panel/Body/Emphasis")
	emphasis.add_theme_font_size_override("font_size", 30)
	emphasis.add_theme_color_override("font_color", panel_style.ACCENT)

	var subtitle: Label = _unlock_overlay.get_node("Center/Panel/Body/Subtitle")
	panel_style.apply_muted(subtitle)

	var unlock_list: VBoxContainer = _unlock_overlay.get_node("Center/Panel/Body/UnlockList")
	for c in unlock_list.get_children():
		c.queue_free()
	var unlock_items = _get_unlocks_for_level(PLANET_UNLOCK_LEVEL)
	for item_text in unlock_items:
		var row: Label = UnlockItemScene.instantiate()
		row.text = "• %s" % item_text
		panel_style.apply_body(row)
		unlock_list.add_child(row)

	var cta: Button = _unlock_overlay.get_node("Center/Panel/Body/ConfirmButton")
	panel_style.apply_button(cta, true)
	cta.pressed.connect(_on_level2_overlay_confirmed)

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
	return preload("res://Scripts/Utils/AppControllerHelper.gd").get_instance()
