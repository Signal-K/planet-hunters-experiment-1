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
const UILayout = preload("res://Scripts/UI/UILayout.gd")
const AppControllerHelper = preload("res://Scripts/Utils/AppControllerHelper.gd")
const RocketsManager = preload("res://Scripts/Utils/RocketsManager.gd")
const SubcontractorManager = preload("res://Scripts/Utils/SubcontractorManager.gd")

const STATION_BACKDROP := Color(0.84, 0.90, 0.90, 0.54)
const STATION_PANEL_BG := Color(0.98, 0.992, 0.992, 0.98)
const STATION_PANEL_EDGE := Color(0.80, 0.88, 0.88, 1.0)
const STATION_PANEL_INNER := Color(0.94, 0.97, 0.97, 1.0)
const STATION_CARD_BG := Color(0.99, 0.995, 0.995, 1.0)
const STATION_CARD_ALT := Color(0.95, 0.98, 0.98, 1.0)
const STATION_TEXT := Color(0.16, 0.20, 0.22, 1.0)
const STATION_MUTED := Color(0.40, 0.46, 0.49, 1.0)
const STATION_TELEMETRY := Color(0.05, 0.49, 0.45, 1.0)
const STATION_PRIMARY := Color(0.07, 0.55, 0.49, 1.0)
const STATION_PRIMARY_HOVER := Color(0.12, 0.62, 0.56, 1.0)
const STATION_PRIMARY_PRESSED := Color(0.05, 0.46, 0.41, 1.0)
const STATION_BUTTON_BG := Color(0.99, 0.995, 0.995, 1.0)
const STATION_BUTTON_HOVER := Color(0.96, 0.98, 0.98, 1.0)
const STATION_BUTTON_PRESSED := Color(0.93, 0.95, 0.95, 1.0)

var pending_anomalies := []
var current_mode: String = "planets"
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

@onready var scroll: ScrollContainer = $PanelContainer/Panel/Scroll
@onready var scroll_content: VBoxContainer = $PanelContainer/Panel/Scroll/VBoxContainer
@onready var loading_container: VBoxContainer = $PanelContainer/Panel/Scroll/VBoxContainer/ContentContainer/LoadingContainer
@onready var anomaly_scroll: ScrollContainer = $PanelContainer/Panel/Scroll/VBoxContainer/ContentContainer/AnomalyScroll
@onready var anomaly_list: VBoxContainer = $PanelContainer/Panel/Scroll/VBoxContainer/ContentContainer/AnomalyScroll/AnomalyList
@onready var progress_bar: ProgressBar = $PanelContainer/Panel/Scroll/VBoxContainer/ContentContainer/LoadingContainer/ProgressBar
@onready var loading_label: Label = $PanelContainer/Panel/Scroll/VBoxContainer/ContentContainer/LoadingContainer/LoadingLabel
@onready var refresh_button: Button = $PanelContainer/Panel/Scroll/VBoxContainer/ContentContainer/RefreshContainer/RefreshButton
@onready var status_label: Label = $PanelContainer/Panel/Scroll/VBoxContainer/ContentContainer/StatusContainer/StatusLabel
@onready var status_container: HBoxContainer = $PanelContainer/Panel/Scroll/VBoxContainer/ContentContainer/StatusContainer
@onready var scan_summary_card: PanelContainer = $PanelContainer/Panel/Scroll/VBoxContainer/ContentContainer/StatusContainer/ScanSummaryCard
@onready var summary_vbox: VBoxContainer = $PanelContainer/Panel/Scroll/VBoxContainer/ContentContainer/StatusContainer/ScanSummaryCard/SummaryMargin/SummaryVBox
@onready var mode_badge: Label = $PanelContainer/Panel/Scroll/VBoxContainer/ContentContainer/StatusContainer/ScanSummaryCard/SummaryMargin/SummaryVBox/SummaryTopRow/ModeBadge
@onready var count_label: Label = $PanelContainer/Panel/Scroll/VBoxContainer/ContentContainer/StatusContainer/ScanSummaryCard/SummaryMargin/SummaryVBox/SummaryTopRow/CountLabel
@onready var range_label: Label = $PanelContainer/Panel/Scroll/VBoxContainer/ContentContainer/StatusContainer/ScanSummaryCard/SummaryMargin/SummaryVBox/SummaryTopRow/RangeLabel
@onready var guidance_label: Label = $PanelContainer/Panel/Scroll/VBoxContainer/ContentContainer/StatusContainer/ScanSummaryCard/SummaryMargin/SummaryVBox/GuidanceLabel
@onready var art_underlay: Control = $PanelContainer/Panel/ArtUnderlay
@onready var warm_glow: ColorRect = $PanelContainer/Panel/ArtUnderlay/WarmGlow
@onready var cool_glow: ColorRect = $PanelContainer/Panel/ArtUnderlay/CoolGlow
@onready var top_wash: ColorRect = $PanelContainer/Panel/ArtUnderlay/TopWash
@onready var telemetry_strip: HBoxContainer = $PanelContainer/Panel/Scroll/VBoxContainer/TelemetryStrip
@onready var telemetry_label: Label = $PanelContainer/Panel/Scroll/VBoxContainer/TelemetryStrip/TelemetryLabel
@onready var telemetry_separator: VSeparator = $PanelContainer/Panel/Scroll/VBoxContainer/TelemetryStrip/TelemetrySeparator
@onready var sweep_label: Label = $PanelContainer/Panel/Scroll/VBoxContainer/TelemetryStrip/SweepLabel
@onready var sync_separator: VSeparator = $PanelContainer/Panel/Scroll/VBoxContainer/TelemetryStrip/SyncSeparator
@onready var sync_label: Label = $PanelContainer/Panel/Scroll/VBoxContainer/TelemetryStrip/SyncLabel
@onready var content_container: VBoxContainer = $PanelContainer/Panel/Scroll/VBoxContainer/ContentContainer
@onready var toggle_switch: Button = $PanelContainer/Panel/Scroll/VBoxContainer/HeaderContainer/ToggleSwitch
@onready var citizen_science_hint_label: Label = $PanelContainer/Panel/Scroll/VBoxContainer/ContentContainer/StatusContainer/ScanSummaryCard/SummaryMargin/SummaryVBox/CitizenScienceHintLabel
@onready var early_scan_button: Button = $PanelContainer/Panel/Scroll/VBoxContainer/ContentContainer/RefreshContainer/EarlyScanButton

func _ready():
	# Apply consistent panel styling
	var title_label = $PanelContainer/Panel/Scroll/VBoxContainer/HeaderContainer/Title
	var close_button = $PanelContainer/Panel/Scroll/VBoxContainer/HeaderContainer/CloseButton
	_detail.setup(
		$PanelContainer/Panel,
		loading_container,
		anomaly_scroll,
		content_container,
		toggle_switch,
		title_label,
		close_button
	)
	_detail.apply_panel_style()
	_apply_layout()
	_apply_panel_style()
	get_viewport().size_changed.connect(_apply_layout)
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
		anomaly_scroll,
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
	_refresh_scan_summary()

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
	var title_label := $PanelContainer/Panel/Scroll/VBoxContainer/HeaderContainer/Title as Label
	var close_button := $PanelContainer/Panel/Scroll/VBoxContainer/HeaderContainer/CloseButton as Button
	var divider := $PanelContainer/Panel/Scroll/VBoxContainer/HSeparator as HSeparator
	$Background.color = STATION_BACKDROP
	_apply_station_panel($PanelContainer/Panel, STATION_PANEL_BG, STATION_PANEL_EDGE, 1, 18)
	_apply_station_panel(scan_summary_card, STATION_CARD_BG, Color(STATION_PANEL_EDGE.r, STATION_PANEL_EDGE.g, STATION_PANEL_EDGE.b, 0.55), 1, 14, 18)
	title_label.add_theme_color_override("font_color", STATION_TEXT)
	title_label.add_theme_font_size_override("font_size", 38)
	status_label.add_theme_color_override("font_color", STATION_MUTED)
	status_label.add_theme_font_size_override("font_size", 15)
	status_label.uppercase = true
	divider.add_theme_color_override("separator", Color(STATION_PANEL_EDGE.r, STATION_PANEL_EDGE.g, STATION_PANEL_EDGE.b, 0.45))
	telemetry_separator.add_theme_color_override("separator", Color(STATION_MUTED.r, STATION_MUTED.g, STATION_MUTED.b, 0.28))
	sync_separator.add_theme_color_override("separator", Color(STATION_MUTED.r, STATION_MUTED.g, STATION_MUTED.b, 0.28))
	for label in [telemetry_label, sweep_label, sync_label]:
		label.add_theme_color_override("font_color", STATION_MUTED)
		label.add_theme_font_size_override("font_size", 12)
		label.uppercase = true
	mode_badge.add_theme_color_override("font_color", STATION_TELEMETRY)
	mode_badge.add_theme_font_size_override("font_size", 14)
	mode_badge.uppercase = true
	count_label.add_theme_color_override("font_color", STATION_TEXT)
	count_label.add_theme_font_size_override("font_size", 18)
	range_label.add_theme_color_override("font_color", STATION_MUTED)
	range_label.add_theme_font_size_override("font_size", 14)
	guidance_label.add_theme_color_override("font_color", STATION_MUTED)
	guidance_label.add_theme_font_size_override("font_size", 14)
	loading_label.add_theme_color_override("font_color", STATION_TEXT)
	loading_label.add_theme_font_size_override("font_size", 22)
	var scanning_hint := $PanelContainer/Panel/Scroll/VBoxContainer/ContentContainer/LoadingContainer/ScanningHint as Label
	scanning_hint.add_theme_color_override("font_color", STATION_MUTED)
	scanning_hint.add_theme_font_size_override("font_size", 15)
	_apply_station_button(close_button, false)
	_apply_station_button(toggle_switch, false)
	_apply_station_button(refresh_button, true)
	_apply_station_button(early_scan_button, false)
	early_scan_button.add_theme_font_size_override("font_size", 14)
	_apply_station_progress_bar(progress_bar)
	warm_glow.color = Color(0.81, 0.93, 0.89, 0.40)
	cool_glow.color = Color(0.88, 0.96, 0.95, 0.50)
	top_wash.color = Color(0.97, 0.99, 0.99, 0.84)

func _apply_layout() -> void:
	var viewport := get_viewport().get_visible_rect().size
	var safe := UILayout.safe_rect(viewport)
	var shell = $PanelContainer as Control
	shell.offset_left = safe.position.x
	shell.offset_top = safe.position.y
	shell.offset_right = -(viewport.x - safe.end.x)
	shell.offset_bottom = -(viewport.y - safe.end.y)
	var panel = $PanelContainer/Panel as Control
	panel.custom_minimum_size.x = clampf(viewport.x * 0.78, 920.0, 1320.0)
	panel.custom_minimum_size.y = clampf(safe.size.y * 0.72, 420.0, 820.0)
	scroll.custom_minimum_size = Vector2(0.0, 0.0)
	scroll_content.custom_minimum_size.x = maxf(panel.size.x - 56.0, panel.custom_minimum_size.x - 56.0)
	anomaly_scroll.custom_minimum_size = Vector2(0.0, clampf(panel.custom_minimum_size.y * 0.40, 180.0, 300.0))
	var title := $PanelContainer/Panel/Scroll/VBoxContainer/HeaderContainer/Title as Label
	title.add_theme_font_size_override("font_size", 28 if viewport.x < 1200.0 else 36)
	toggle_switch.custom_minimum_size.x = 160.0 if viewport.x < 1200.0 else 190.0
	status_container.alignment = BoxContainer.ALIGNMENT_BEGIN
	scan_summary_card.custom_minimum_size = Vector2(340.0 if viewport.x >= 1120.0 else 0.0, 0.0)
	status_label.custom_minimum_size.x = 220.0 if viewport.x >= 1120.0 else 0.0
	telemetry_strip.visible = viewport.x >= 960.0
	warm_glow.visible = viewport.x >= 960.0
	cool_glow.visible = viewport.x >= 960.0

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
		status_label.text = "Offline catalog engaged — local %s contacts restored." % fallback_type
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
	_refresh_scan_summary(pending_anomalies)
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
		status_label.text = "Network unavailable — showing local %s" % fallback_type
		_refresh_scan_summary(pending_anomalies)
		_loading.mark_anomalies_ready()
		_award_scan_experience()
		return

	# No error
	pending_anomalies = data
	var target_type = "planets" if current_mode == "planets" else "asteroids"
	var range_note = " • Range: %s" % get_scanner_range_label() if _player_level >= PLANET_UNLOCK_LEVEL else ""
	status_label.text = "%d %s detected%s" % [data.size(), target_type, range_note]
	_refresh_scan_summary(data)
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
		status_label.text = "Target selection failed — try again"
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
		var display_label = str(bound_anomaly.get("label", bound_anomaly.get("name", target_id)))
		status_label.text = "Target selected: %s" % display_label
		AppLogger.d("SatelliteStationPanel: target selected: %s" % target_id)
		if btn:
			btn.text = "Target Selected"
			btn.disabled = true
		_change_to_launchpad_scene()
	else:
		AppLogger.w("SatelliteStationPanel: failed to persist selected target: %s" % target_id)
		status_label.text = "Could not confirm target — try again"

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
	if not citizen_science_hint_label:
		return
	citizen_science_hint_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	citizen_science_hint_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	citizen_science_hint_label.add_theme_color_override("font_color", STATION_MUTED)
	citizen_science_hint_label.add_theme_font_size_override("font_size", 13)

func _refresh_citizen_science_hint() -> void:
	if not citizen_science_hint_label:
		return
	var enabled = AppControllerHelper.is_citizen_science_dialogue_enabled(true)
	citizen_science_hint_label.visible = enabled
	if enabled:
		citizen_science_hint_label.text = "These scans feed the real TESS candidate review loop. The annotation surface is part of the game’s live science promise."


func _on_refresh_pressed():
	if not _try_start_scan_with_cooldown(REFRESH_LOAD_TIME):
		return
	_refresh_scan_summary()
	if local_only:
		_apply_local_anomalies()
		return
	_fetch_anomalies()

func _on_toggle_switch_pressed():
	if _player_level < PLANET_UNLOCK_LEVEL:
		status_label.text = "Planet targets unlock at Level %d." % PLANET_UNLOCK_LEVEL
		return
	current_mode = "planets"
	status_label.text = "Planet hunter sweep locked for this release."
	_refresh_scan_summary()

func _get_current_mode() -> String:
	return current_mode

func _apply_local_anomalies() -> void:
	pending_anomalies = _build_local_anomalies()
	var local_range_note = " • Range: %s" % get_scanner_range_label() if _player_level >= PLANET_UNLOCK_LEVEL else ""
	status_label.text = "%d local planet contacts loaded%s" % [pending_anomalies.size(), local_range_note]
	_refresh_scan_summary(pending_anomalies)
	_loading.mark_anomalies_ready()

func _refresh_scan_summary(anomalies: Array = []) -> void:
	if not is_instance_valid(mode_badge):
		return
	var count := anomalies.size()
	mode_badge.text = "PLANET SWEEP"
	count_label.text = "%d planet%s" % [count, "" if count == 1 else "s"]
	if _player_level >= PLANET_UNLOCK_LEVEL:
		range_label.text = get_scanner_range_label()
	else:
		range_label.text = "Level %d unlocks planets" % PLANET_UNLOCK_LEVEL
	if count > 0:
		guidance_label.text = "Route a contact to the Launchpad, or inspect it first to confirm mission fit and science value."
	elif _loading.is_loading():
		guidance_label.text = "Sweep in progress. Fresh contacts will populate here once telemetry resolves."
	else:
		guidance_label.text = "No planetary contacts on this pass. Refresh for another sweep."

func _apply_station_panel(panel: Control, bg_color: Color, border_color: Color, border_width: int = 1, corner_radius: int = 10, shadow_size: int = 12) -> void:
	if panel == null:
		return
	var style := PanelStyle.create_glass_panel_style(bg_color, 0.36, corner_radius, 20, 16)
	style.border_color = border_color
	style.set_border_width_all(border_width)
	style.shadow_size = shadow_size
	style.shadow_offset = Vector2(0, 6)
	panel.add_theme_stylebox_override("panel", style)

func _apply_station_button(button: Button, is_primary: bool) -> void:
	if button == null:
		return
	if is_primary:
		PanelStyle.apply_button(button, true)
	else:
		PanelStyle.apply_outline_button(button, STATION_PANEL_EDGE, STATION_TEXT)
	button.add_theme_font_size_override("font_size", 16)

func _build_station_button_style(bg_color: Color, border_color: Color) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = bg_color
	style.border_color = border_color
	style.set_border_width_all(1)
	style.set_corner_radius_all(8)
	style.content_margin_left = 18
	style.content_margin_right = 18
	style.content_margin_top = 12
	style.content_margin_bottom = 12
	return style

func _apply_station_progress_bar(bar: ProgressBar) -> void:
	if bar == null:
		return
	var bg := StyleBoxFlat.new()
	bg.bg_color = Color(0.92, 0.95, 0.95, 1.0)
	bg.border_color = Color(STATION_PANEL_EDGE.r, STATION_PANEL_EDGE.g, STATION_PANEL_EDGE.b, 0.60)
	bg.set_border_width_all(1)
	bg.set_corner_radius_all(10)
	var fill := StyleBoxFlat.new()
	fill.bg_color = STATION_TELEMETRY
	fill.set_corner_radius_all(10)
	bar.add_theme_stylebox_override("background", bg)
	bar.add_theme_stylebox_override("fill", fill)
	bar.show_percentage = false

func _persist_detected_targets_and_record_scan(anomalies: Array) -> void:
	var rm = RocketsManager
	if not rm:
		return
	var targets := []
	for i in range(anomalies.size()):
		var a = anomalies[i]
		var id = _data.normalize_anomaly_id(a, i + 1)
		var label = "TIC %s" % str(a.get("ticId")) if a.has("ticId") and a.get("ticId") != null and str(a.get("ticId")) != "" else str(a.get("content", id))
		targets.append({
			"id": id,
			"label": label,
			"type": "planet",
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
	return [
		{
			"id": 9101,
			"ticId": "9101",
			"content": "9101",
			"anomalySet": PLANET_SET,
			"anomalytype": "telescope_tess",
			"classification_status": "candidate",
			"tess_disposition": "PC",
			"temperature": 290
		}
	]

func _filter_mission3_untargeted_anomalies(anomalies: Array) -> Array:
	var rm = RocketsManager
	if not rm:
		return anomalies
	var mission_stage = int(rm.get_mission_stage())
	if rm.is_free_operations_unlocked():
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
		var cd_text = "%d min" % int(ceil(float(remaining) / 60.0)) if remaining >= 60 else "%d sec" % remaining
		status_label.text = "Scanner cooling down — %s remaining" % cd_text
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
	if early_scan_button:
		early_scan_button.visible = false
		if early_scan_button.pressed.is_connected(_on_early_scan_pressed):
			early_scan_button.pressed.disconnect(_on_early_scan_pressed)
	if rm == null:
		refresh_button.disabled = false
		refresh_button.text = REFRESH_BUTTON_BASE_TEXT
		return
	var now = int(Time.get_unix_time_from_system())
	var next_scan_at = int(rm.get_scanner_next_scan_at())
	var remaining = max(next_scan_at - now, 0)
	if remaining > 0:
		refresh_button.disabled = true
		var btn_cd = "%d min" % int(ceil(float(remaining) / 60.0)) if remaining >= 60 else "%ds" % remaining
		refresh_button.text = "Refresh (%s)" % btn_cd
		if early_scan_button:
			early_scan_button.visible = true
			early_scan_button.tooltip_text = "Scanner quality may be lower when used before cooldown completes."
			early_scan_button.pressed.connect(_on_early_scan_pressed, CONNECT_ONE_SHOT)
		return
	refresh_button.disabled = false
	refresh_button.text = REFRESH_BUTTON_BASE_TEXT

func _on_early_scan_pressed() -> void:
	RocketsManager.set_scanner_next_scan_at(0)
	_try_start_scan_with_cooldown(REFRESH_LOAD_TIME)

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
		current_mode = "planets"
		toggle_switch.disabled = true
		toggle_switch.text = "Planets unlock at Level %d" % PLANET_UNLOCK_LEVEL
		if not _loading.is_loading():
			status_label.text = "Reach Level %d to unlock planet targets" % PLANET_UNLOCK_LEVEL
		return

	current_mode = "planets"
	toggle_switch.disabled = false
	toggle_switch.text = "Distant Signals Active"

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
	var panel: PanelContainer = _unlock_overlay.get_node("Center/Panel")
	var vp_w := get_viewport().get_visible_rect().size.x
	panel.custom_minimum_size.x = clampf(vp_w - 48.0, 300.0, 640.0)
	add_child(_unlock_overlay)
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
	toggle_switch.text = "Distant Signals Active"
	var t = create_tween()
	t.tween_property(toggle_switch, "scale", Vector2(1.09, 1.09), 0.12)
	t.tween_property(toggle_switch, "scale", Vector2.ONE, 0.18)
	_start_loading(REFRESH_LOAD_TIME)
	_fetch_anomalies()

func _get_unlocks_for_level(level: int) -> Array:
	var items := []
	if level == PLANET_UNLOCK_LEVEL:
		items.append("NASA TESS planet candidates unlocked as mission targets")

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
