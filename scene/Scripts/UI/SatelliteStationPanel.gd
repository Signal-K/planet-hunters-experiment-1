extends Control

const GameplayAnalytics = preload("res://Scripts/Systems/GameplayAnalytics.gd")
const FirstTimeMechanicTracker = preload("res://Scripts/Utils/FirstTimeMechanicTracker.gd")

signal panel_closed

const INITIAL_LOAD_TIME := 3.0  # seconds for initial load
const REFRESH_LOAD_TIME := 10.0  # seconds for refresh
const MAX_ANOMALIES := 5
const ASTEROID_SET := "active-asteroids"
const PLANET_SET := "telescope-tess"
const PLANET_UNLOCK_LEVEL := 2
const SCANNER_RANGE_UNLOCK_LEVEL := 8
const MIN_DISPLAY_TIME := 0.5
const UNLOCK_CONFIG_PATH := "user://satellite_station.cfg"
const UNLOCK_CONFIG_SECTION := "unlocks"
const UNLOCK_LEVEL2_SEEN_KEY := "level2_overlay_seen"
const LEVEL_UNLOCK_MISSIONS := [
	{"level": 3, "name": "Sell cargo on Earth"}
]
const LAUNCHPAD_SCENE_PATH := "res://Scenes/Earth/earth_launchpad.tscn"
const REFRESH_BUTTON_BASE_TEXT := "Refresh Scan"

const SatelliteStationPanelData = preload("res://Scripts/UI/SatelliteStationPanelData.gd")
const SatelliteStationPanelList = preload("res://Scripts/UI/SatelliteStationPanelList.gd")
const SatelliteStationPanelDetail = preload("res://Scripts/UI/SatelliteStationPanelDetail.gd")
const SatelliteStationPanelLoading = preload("res://Scripts/UI/SatelliteStationPanelLoading.gd")
const Level2UnlockOverlayScene = preload("res://Scenes/UI/Templates/SatelliteLevel2UnlockOverlay.tscn")
const UnlockItemScene = preload("res://Scenes/UI/Templates/MenuUnlockItem.tscn")
const AppLogger = preload("res://Scripts/Utils/Logger.gd")
const SupabaseClient = preload("res://Scripts/Systems/SupabaseClient.gd")
const PanelStyle = preload("res://Scripts/UI/PanelStyle.gd")
const AppControllerHelper = preload("res://Scripts/Utils/AppControllerHelper.gd")
const RocketsManager = preload("res://Scripts/Utils/RocketsManager.gd")
const SubcontractorManager = preload("res://Scripts/Utils/SubcontractorManager.gd")

var pending_anomalies := []
var current_mode: String = "asteroids"  # Default mode
var local_only: bool = false
var use_archived_detail: bool = false
var _player_level: int = 1
var _unlock_overlay: ColorRect = null
var _citizen_science_hint_label: Label = null
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
	# First-time scanner station intro
	FirstTimeMechanicTracker.maybe_show("scanner_station", get_tree())

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
	_connect_preference_updates()
	_refresh_player_level()
	_refresh_planet_unlock_ui(false)
	_ensure_citizen_science_hint()
	_refresh_citizen_science_hint()
	_refresh_scan_cooldown_ui()

	# Start initial load (annotation features archived)
	_start_loading(INITIAL_LOAD_TIME)
	if local_only:
		_apply_local_anomalies()
		return

	# Default behavior: fetch anomalies from Supabase
	AppLogger.d("SatelliteStationPanel: calling _fetch_anomalies() - starting fetch")
	var sup = SupabaseClient.get_instance()
	if sup:
		AppLogger.d("SatelliteStationPanel: Supabase URL -> %s" % sup.SUPABASE_URL)
	else:
		AppLogger.w("SatelliteStationPanel: SupabaseClient instance not available")

	_fetch_anomalies()

func _apply_panel_style() -> void:
	var panel_style = PanelStyle
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
	AppLogger.d("SatelliteStationPanel: _start_loading duration=%s" % duration)
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
	AppControllerHelper.record_tutorial_action("scan_targets", {
		"mode": current_mode,
		"count": pending_anomalies.size()
	})
	GameplayAnalytics.emit_event("scanner_scan_completed", {
		"scanner_mode": current_mode,
		"detected_count": pending_anomalies.size()
	})

	_persist_detected_targets_and_record_scan(pending_anomalies)

	# Display the pending anomalies
	_list.display_anomalies(pending_anomalies)
	pending_anomalies = []
	# Stop processing once loading is finished
	set_process(false)
	_refresh_scan_cooldown_ui()

func _fetch_anomalies():
	AppLogger.d("SatelliteStationPanel: _fetch_anomalies called, mode=%s" % current_mode)
	var supabase = SupabaseClient.get_instance()
	var anomaly_set = PLANET_SET if current_mode == "planets" else ASTEROID_SET
	supabase.fetch_anomalies(anomaly_set, MAX_ANOMALIES, _on_anomalies_fetched)


func _on_anomalies_fetched(data: Array, error: String):
	# Debug logging for callback
	AppLogger.d("SatelliteStationPanel: _on_anomalies_fetched called - error='%s', count=%s" % [str(error), data.size()])
	if error != "":
		AppLogger.w("SatelliteStationPanel: Error fetching anomalies: %s" % error)
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
	var range_note = " • Range: %s" % get_scanner_range_label() if _player_level >= PLANET_UNLOCK_LEVEL else ""
	status_label.text = "Status: %d %s detected%s" % [data.size(), target_type, range_note]
	_loading.mark_anomalies_ready()
	_award_scan_experience()

	# Persist target data in _on_loading_finished once loading completes.

func _on_anomaly_item_button_pressed(bound_anomaly: Dictionary):
	"""Called when the overlay button is pressed for an anomaly item."""
	var rm = RocketsManager
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
	var rm = RocketsManager
	if not rm:
		AppLogger.w("SatelliteStationPanel: RocketsManager not available")
		status_label.text = "Status: Unable to select target"
		return
	var target_type = "planet" if current_mode == "planets" else "asteroid"
	rm.register_target_interaction(target_id, target_type)
	var ok = rm.select_target(target_id)
	if not ok:
		ok = bool(rm.force_select_detected_target(target_id))
	if ok:
		GameplayAnalytics.emit_target_selected(target_id, target_type, "scanner_station", {
			"target_index": index
		})
		AppControllerHelper.record_tutorial_action("select_launch_target", {
			"target_id": target_id,
			"source": "scanner"
		})
		status_label.text = "Target selected: %s" % target_id
		AppLogger.d("SatelliteStationPanel: target selected: %s" % target_id)
		if btn:
			btn.text = "Target Selected"
			btn.disabled = true
		_change_to_launchpad_scene()
	else:
		AppLogger.w("SatelliteStationPanel: failed to persist selected target: %s" % target_id)
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

func _connect_preference_updates() -> void:
	var app = AppControllerHelper.get_instance()
	if app and app.has_signal("citizen_science_dialogue_toggled"):
		app.citizen_science_dialogue_toggled.connect(_on_citizen_science_dialogue_toggled)

func _on_citizen_science_dialogue_toggled(_enabled: bool) -> void:
	_refresh_citizen_science_hint()

func _ensure_citizen_science_hint() -> void:
	if _citizen_science_hint_label and is_instance_valid(_citizen_science_hint_label):
		return
	_citizen_science_hint_label = Label.new()
	_citizen_science_hint_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	_citizen_science_hint_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_citizen_science_hint_label.add_theme_font_size_override("font_size", 14)
	var panel_style = PanelStyle
	panel_style.apply_muted(_citizen_science_hint_label)
	var status_container = $PanelContainer/Panel/VBoxContainer/ContentContainer/StatusContainer
	if status_container:
		status_container.add_child(_citizen_science_hint_label)

func _refresh_citizen_science_hint() -> void:
	if not _citizen_science_hint_label:
		return
	var enabled = AppControllerHelper.is_citizen_science_dialogue_enabled(true)
	_citizen_science_hint_label.visible = enabled
	if enabled:
		_citizen_science_hint_label.text = "Citizen science tip: your classifications improve how confident target results are."


func _on_refresh_pressed():
	if not _try_start_scan_with_cooldown(REFRESH_LOAD_TIME):
		return
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
		GameplayAnalytics.emit_event("scanner_mode_toggled", {
			"scanner_mode": "planets"
		})
		AppControllerHelper.record_tutorial_action("toggle_planet_scanner")
		toggle_switch.text = "Switch to Asteroids"
		if local_only:
			if not _try_start_scan_with_cooldown(REFRESH_LOAD_TIME):
				return
			_apply_local_anomalies()
			return
		# Fetch and display planets
		if not _try_start_scan_with_cooldown(REFRESH_LOAD_TIME):
			return
		_fetch_anomalies()
	else:
		current_mode = "asteroids"
		GameplayAnalytics.emit_event("scanner_mode_toggled", {
			"scanner_mode": "asteroids"
		})
		toggle_switch.text = "Switch to Planets"
		if local_only:
			if not _try_start_scan_with_cooldown(REFRESH_LOAD_TIME):
				return
			_apply_local_anomalies()
			return
		# Fetch and display asteroids
		if not _try_start_scan_with_cooldown(REFRESH_LOAD_TIME):
			return
		_fetch_anomalies()

func _get_current_mode() -> String:
	return current_mode

func _apply_local_anomalies() -> void:
	pending_anomalies = _build_local_anomalies()
	var target_type = "planets" if current_mode == "planets" else "asteroids"
	var local_range_note = " • Range: %s" % get_scanner_range_label() if _player_level >= PLANET_UNLOCK_LEVEL else ""
	status_label.text = "Status: %d local %s loaded%s" % [pending_anomalies.size(), target_type, local_range_note]
	_loading.mark_anomalies_ready()

func _persist_detected_targets_and_record_scan(anomalies: Array) -> void:
	var rm = RocketsManager
	if not rm:
		return
	var targets := []
	var target_kind = "planet" if current_mode == "planets" else "asteroid"
	for i in range(anomalies.size()):
		var a = anomalies[i]
		var id = _data.normalize_anomaly_id(a, i + 1)
		var label = "TIC %s" % str(a.get("ticId")) if a.has("ticId") and a.get("ticId") != null and str(a.get("ticId")) != "" else str(a.get("content", id))
		targets.append({
			"id": id,
			"label": label,
			"type": target_kind,
			"anomalySet": str(a.get("anomalySet", "")),
			"classification_status": str(a.get("classification_status", "")),
			"tess_disposition": str(a.get("tess_disposition", ""))
		})
	targets = _ensure_free_ops_candidate_option(targets, rm)
	if targets.is_empty():
		return
	var ok = rm.set_detected_targets(targets)
	rm.record_scan_pass(targets)
	AppLogger.d("SatelliteStationPanel: persisted detected_targets count=%s ok=%s" % [targets.size(), ok])

func _ensure_free_ops_candidate_option(targets: Array, rm) -> Array:
	if rm == null or not rm.is_free_operations_unlocked() or current_mode != "planets":
		return targets
	var has_candidate := false
	var has_confirmed := false
	for row_any in targets:
		if typeof(row_any) != TYPE_DICTIONARY:
			continue
		var row: Dictionary = row_any
		var disposition = str(row.get("tess_disposition", ""))
		var status = str(row.get("classification_status", "")).to_lower()
		if disposition == "" or disposition == "PC" or status == "candidate" or status == "unconfirmed":
			has_candidate = true
		if disposition == "CP" or status == "confirmed":
			has_confirmed = true
	var enriched = targets.duplicate(true)
	var now = int(Time.get_unix_time_from_system())
	if not has_candidate:
		enriched.append({
			"id": "free-ops-candidate-%s" % now,
			"label": "Possible Planet Signal",
			"type": "planet",
			"anomalySet": PLANET_SET,
			"classification_status": "candidate",
			"tess_disposition": "PC",
			"science_source": "TESS Candidate Feed",
			"science_blurb": "Unconfirmed signal. Classify it to unlock travel."
		})
	if not has_confirmed:
		enriched.append({
			"id": "free-ops-confirmed-%s" % now,
			"label": "Known Planet Target",
			"type": "planet",
			"anomalySet": PLANET_SET,
			"classification_status": "confirmed",
			"tess_disposition": "CP",
			"science_source": "TESS Confirmed Archive",
			"science_blurb": "Reliable destination while candidate checks continue."
		})
	return enriched

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
	var rm = RocketsManager
	if not rm:
		return anomalies
	var mission_stage = int(rm.get_mission_stage())
	if rm.is_free_operations_unlocked():
		return anomalies
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
	_refresh_scan_cooldown_ui()

func _on_close_button_pressed():
	panel_closed.emit()
	queue_free()

func _on_background_input(event: InputEvent):
	if event is InputEventMouseButton and event.pressed:
		panel_closed.emit()
		queue_free()

func _try_start_scan_with_cooldown(duration: float) -> bool:
	var rm = RocketsManager
	if rm == null:
		_start_loading(duration)
		return true
	var now = int(Time.get_unix_time_from_system())
	var next_scan_at = int(rm.get_scanner_next_scan_at())
	if next_scan_at > now:
		var remaining = next_scan_at - now
		status_label.text = "Status: Scanner cooling down (%ss remaining)" % remaining
		_refresh_scan_cooldown_ui()
		return false
	var cooldown = int(rm.get_scanner_soft_cooldown_seconds())
	rm.set_scanner_next_scan_at(now + cooldown)
	_start_loading(duration)
	_refresh_scan_cooldown_ui()
	return true

func _refresh_scan_cooldown_ui() -> void:
	var rm = RocketsManager
	if refresh_button == null:
		return
	# Remove any previous early-scan button
	var existing_early = refresh_button.get_parent().get_node_or_null("EarlyScanButton") if refresh_button.get_parent() else null
	if existing_early:
		existing_early.queue_free()
	if rm == null:
		refresh_button.disabled = false
		refresh_button.text = REFRESH_BUTTON_BASE_TEXT
		return
	var now = int(Time.get_unix_time_from_system())
	var next_scan_at = int(rm.get_scanner_next_scan_at())
	var remaining = max(next_scan_at - now, 0)
	if remaining > 0:
		refresh_button.disabled = true
		refresh_button.text = "Refresh (%ss)" % remaining
		# Soft cooldown: add an override button so player can scan early if they choose
		var parent = refresh_button.get_parent()
		if parent:
			var early_btn := Button.new()
			early_btn.name = "EarlyScanButton"
			early_btn.text = "Scan early (cooldown active)"
			early_btn.add_theme_font_size_override("font_size", 14)
			early_btn.modulate = Color(0.9, 0.8, 0.4, 0.85)
			early_btn.tooltip_text = "Scanner quality may be lower when used before cooldown completes."
			parent.add_child(early_btn)
			early_btn.pressed.connect(func():
				RocketsManager.set_scanner_next_scan_at(0)
				_try_start_scan_with_cooldown(REFRESH_LOAD_TIME)
			)
		return
	refresh_button.disabled = false
	refresh_button.text = REFRESH_BUTTON_BASE_TEXT

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

## Returns true if the player has the L8 scanner range upgrade.
func has_extended_scanner_range() -> bool:
	return _player_level >= SCANNER_RANGE_UNLOCK_LEVEL

## Returns a human-readable range descriptor for the current scanner.
func get_scanner_range_label() -> String:
	if has_extended_scanner_range():
		return "Extended (light-year scale)"
	return "Standard (stellar neighbourhood)"

func _show_level2_unlock_overlay() -> void:
	if _unlock_overlay and is_instance_valid(_unlock_overlay):
		return

	_unlock_overlay = Level2UnlockOverlayScene.instantiate()
	add_child(_unlock_overlay)

	var panel: PanelContainer = _unlock_overlay.get_node("Center/Panel")
	var panel_style = PanelStyle
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

	var rm = RocketsManager
	if rm:
		for rocket_id in rm.ROCKET_UNLOCK_LEVELS.keys():
			if int(rm.ROCKET_UNLOCK_LEVELS.get(rocket_id, 1)) == level:
				items.append("Rocket: %s" % rocket_id)

	var sm = SubcontractorManager
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
	return AppControllerHelper.get_instance()
