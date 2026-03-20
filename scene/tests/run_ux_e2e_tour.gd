extends Node
## UX End-to-End Tour
##
## Loads each major game scene, drives gameplay (mining, tutorial, annotation,
## transit) and screenshots the result. Designed to surface UX clarity issues
## rather than test functional correctness. The node never calls
## change_scene_to_file() so it always remains alive as the scene root.
##
## Run via:
##   DISPLAY=:99 godot --path ./scene res://tests/UXTour.tscn

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
const SCREENSHOT_DIR := "user://ux_screenshots"
const REPORT_PATH    := "user://ux_report.md"

# World / environment scenes
const EARTH_MAIN_SCENE   := "res://Scenes/Earth/earth_base_1.tscn"
const DEBRIEF_SCENE      := "res://Scenes/Earth/mission_debrief.tscn"
const LAUNCHPAD_SCENE    := "res://Scenes/Earth/earth_launchpad.tscn"
const ORBIT_SALE_SCENE   := "res://Scenes/Earth/orbit_sale_preview.tscn"

# Transition scenes
const TRANSIT_SCENE      := "res://Scenes/Transitions/rocket_transit.tscn"
const ASCENT_SCENE       := "res://Scenes/Transitions/rocket_ascent.tscn"
const RETURN_SCENE       := "res://Scenes/Transitions/rocket_return.tscn"

# UI panel / overlay scenes
const LAUNCHPAD_PANEL_SCENE    := "res://Scenes/UI/LaunchpadPanel.tscn"
const NEW_MISSION_PANEL_SCENE  := "res://Scenes/UI/NewMissionPanel.tscn"
const SUBCONTRACTORS_SCENE     := "res://Scenes/UI/SubcontractorsPanel.tscn"
const ROCKET_SELECTOR_SCENE    := "res://Scenes/UI/RocketSelectorOverlay.tscn"
const MENU_PANEL_SCENE         := "res://Scenes/UI/MenuPanel.tscn"
const TUTORIAL_OVERLAY_SCENE   := "res://Scenes/UI/TutorialCoachOverlay.tscn"
const CONTROL_STATION_SCENE    := "res://Scenes/UI/ControlStationPanel.tscn"
const SATELLITE_STATION_SCENE  := "res://Scenes/UI/SatelliteStationPanel.tscn"
const MINING_MINIGAME_SCENE    := "res://Scenes/UI/MiningMinigame.tscn"
const MINING_PRACTICE_SCENE    := "res://Scenes/UI/MiningPracticePanel.tscn"
const ASTEROID_DETAIL_SCENE    := "res://Scenes/UI/AsteroidDetail/asteroid_detail_view.tscn"
const SPACE_MAP_SCENE          := "res://Scenes/UI/SpaceMap/space_map.tscn"

# How long to run the mining minigame before taking screenshots and moving on
const MINING_RUN_SECONDS := 30.0

# Seconds to wait for scene / panel to settle before screenshotting
const SCENE_SETTLE  := 3.0
const PANEL_SETTLE  := 1.5
const ANIM_SETTLE   := 0.8

# ---------------------------------------------------------------------------
# State
# ---------------------------------------------------------------------------
var _screenshot_index := 0
var _report_lines: Array[String] = []
var _issues: Array[String] = []
var _active_scene: Node = null

# ---------------------------------------------------------------------------
# Entry
# ---------------------------------------------------------------------------
func _ready() -> void:
	DirAccess.make_dir_recursive_absolute(SCREENSHOT_DIR)
	_log_header()
	_run_tour.call_deferred()


# ---------------------------------------------------------------------------
# Scene loading
# ---------------------------------------------------------------------------
func _load_scene(path: String) -> Node:
	if _active_scene and is_instance_valid(_active_scene):
		remove_child(_active_scene)
		_active_scene.queue_free()
		_active_scene = null
		await get_tree().create_timer(0.3).timeout

	var packed: PackedScene = load(path)
	if not packed:
		_issue("CRITICAL: Could not load scene: %s" % path)
		return null
	var instance := packed.instantiate()
	add_child(instance)
	_active_scene = instance
	return instance


# ---------------------------------------------------------------------------
# Tour
# ---------------------------------------------------------------------------
func _run_tour() -> void:

	# ==================================================================
	# Phase 1 — Earth base / intro splash
	# ==================================================================
	_report("## Phase 1 — Startup / Intro Splash")
	var earth := await _load_scene(EARTH_MAIN_SCENE)
	if not earth:
		_finish()
		return

	await get_tree().create_timer(SCENE_SETTLE).timeout
	_screenshot("01_startup_intro_splash")

	var splash := _find_node_by_class(get_tree().root, "PlanetHuntersIntroSplash")
	if splash:
		_report("  - Intro splash found. ✓")
		if _find_button_with_text(splash, "Begin Mission"):
			_report("  - 'Begin Mission' CTA visible. ✓")
		else:
			_issue("Intro splash shown but 'Begin Mission' button missing — user cannot proceed.")
	else:
		_report("  - Intro splash skipped (already shown in a previous run).")

	var splash_btn := _find_button_with_text(get_tree().root, "Begin Mission")
	if splash_btn:
		_click(splash_btn)
		await get_tree().create_timer(ANIM_SETTLE).timeout
	_screenshot("02_after_splash_dismissed")

	# ==================================================================
	# Phase 2 — Earth base overview
	# ==================================================================
	_report("## Phase 2 — Earth Base (main hub)")
	await get_tree().create_timer(ANIM_SETTLE).timeout
	_screenshot("03_earth_base_overview")

	for btn_name in ["MenuButton", "ForwardButton", "BackButton"]:
		if _find_node_by_name(earth, btn_name):
			_report("  - %s present. ✓" % btn_name)
		else:
			_issue("Earth base missing '%s' — navigation impaired." % btn_name)

	var franc_node := _find_node_by_name(earth, "FrancBalance")
	if franc_node:
		_report("  - FrancBalance HUD node present. ✓")
	else:
		_issue("FrancBalance HUD node missing from earth base — users cannot see their currency.")

	var tut := get_tree().root.get_node_or_null("TutorialCoachOverlay")
	if tut and tut.visible:
		_report("  - Tutorial coach overlay visible. ✓")
		_screenshot("04_tutorial_overlay_earth")
		_inspect_tutorial_overlay(tut)
	else:
		_issue("Tutorial coach overlay not visible on first visit — new users may not know what to do.")

	_check_for_placeholder_text(earth, "Earth Base")

	# ==================================================================
	# Phase 3 — Menu Panel
	# ==================================================================
	_report("## Phase 3 — Menu Panel")
	var menu := await _load_scene(MENU_PANEL_SCENE)
	if menu:
		await get_tree().create_timer(PANEL_SETTLE).timeout
		_screenshot("05_menu_panel")
		_check_visible_labels(menu, "Menu Panel", 1)
		_check_for_placeholder_text(menu, "Menu Panel")
		var close := _find_button_with_text(menu, "✕")
		if not close:
			close = _find_button_with_text(menu, "Close")
		if close:
			_report("  - Menu Panel has a close/dismiss button. ✓")
		else:
			_issue("Menu Panel has no close/dismiss button — users may feel trapped.")

	# ==================================================================
	# Phase 4 — Tutorial Coach Overlay (standalone)
	# ==================================================================
	_report("## Phase 4 — Tutorial Coach Overlay")
	var tut_overlay := await _load_scene(TUTORIAL_OVERLAY_SCENE)
	if tut_overlay:
		await get_tree().create_timer(PANEL_SETTLE).timeout
		_screenshot("06_tutorial_coach_overlay")
		_check_visible_labels(tut_overlay, "Tutorial Coach Overlay", 1)
		# The overlay should have step title + body text
		# Node names per TutorialCoachOverlay.gd: TitleLabel, MessageLabel
		var title_lbl := _find_node_by_name(tut_overlay, "TitleLabel")
		if title_lbl:
			_report("  - TutorialCoachOverlay has TitleLabel node. ✓")
		else:
			_issue("TutorialCoachOverlay missing TitleLabel node — step title won't render.")
		var body_lbl := _find_node_by_name(tut_overlay, "MessageLabel")
		if not body_lbl:
			body_lbl = _find_node_by_name(tut_overlay, "ActionLabel")
		if body_lbl:
			_report("  - TutorialCoachOverlay has MessageLabel / ActionLabel node. ✓")
		else:
			_issue("TutorialCoachOverlay missing message label — instructions won't show.")
		_check_for_placeholder_text(tut_overlay, "Tutorial Coach Overlay")

	# ==================================================================
	# Phase 5 — Control Station Panel
	# ==================================================================
	_report("## Phase 5 — Control Station Panel")
	var csp := await _load_scene(CONTROL_STATION_SCENE)
	if csp:
		await get_tree().create_timer(PANEL_SETTLE).timeout
		_screenshot("07_control_station_panel")
		_check_visible_labels(csp, "Control Station Panel", 1)
		# Close button uses "×" (U+00D7) per scene file; fall back to node-name search
		var close_btn := _find_button_with_text(csp, "×")
		if not close_btn:
			close_btn = _find_button_with_text(csp, "✕")
		if not close_btn:
			close_btn = _find_button_with_text(csp, "Close") as Button
		if not close_btn:
			close_btn = _find_node_by_name(csp, "CloseButton") as Button
		if close_btn:
			_report("  - Control Station Panel has a close button. ✓")
		else:
			_issue("Control Station Panel has no close button — users may feel trapped.")
		_check_for_placeholder_text(csp, "Control Station Panel")

	# ==================================================================
	# Phase 6 — Satellite Station Panel (offline / local-only mode)
	# ==================================================================
	_report("## Phase 6 — Satellite Station Panel")
	var ssp := await _load_scene(SATELLITE_STATION_SCENE)
	if ssp:
		# Force local_only so it doesn't hang waiting for Supabase
		if ssp.has_method("set_local_only"):
			ssp.set_local_only(true)
		await get_tree().create_timer(PANEL_SETTLE).timeout
		_screenshot("08_satellite_station_panel")
		_check_visible_labels(ssp, "Satellite Station Panel", 1)
		# Check for the scan/refresh button
		var scan_btn := _find_button_with_text(ssp, "Scan")
		if not scan_btn:
			scan_btn = _find_button_with_text(ssp, "Refresh")
		if scan_btn:
			_report("  - Satellite Station Panel has a scan/refresh button. ✓")
		else:
			_issue("Satellite Station Panel has no scan/refresh button — users cannot discover targets.")
		_check_for_placeholder_text(ssp, "Satellite Station Panel")

	# ==================================================================
	# Phase 7 — Launchpad Panel
	# ==================================================================
	_report("## Phase 7 — Launchpad Panel")
	var lp := await _load_scene(LAUNCHPAD_PANEL_SCENE)
	if lp:
		await get_tree().create_timer(PANEL_SETTLE).timeout
		_screenshot("09_launchpad_panel")

		if _find_label_with_text(lp, "Launch Facility"):
			_report("  - 'Launch Facility' title visible. ✓")
		else:
			_issue("Launchpad Panel has no 'Launch Facility' title — users may not know where they are.")

		var desc := _find_node_by_name(lp, "Description")
		if desc:
			_report("  - Launchpad description node present. ✓")
		else:
			_issue("Launchpad Panel missing description node — users don't know what to do here.")

		if _find_button_with_text(lp, "✕"):
			_report("  - Close (✕) button present. ✓")
		else:
			_issue("Launchpad Panel missing close button.")

		_check_for_placeholder_text(lp, "Launchpad Panel")

	# ==================================================================
	# Phase 8 — Subcontractors Panel
	# ==================================================================
	_report("## Phase 8 — Subcontractors / Contractors Panel")
	var sub := await _load_scene(SUBCONTRACTORS_SCENE)
	if sub:
		await get_tree().create_timer(PANEL_SETTLE).timeout
		_screenshot("10_subcontractors_panel")

		if _find_label_with_text(sub, "Subcontractor"):
			_report("  - 'Subcontractors' heading visible. ✓")
		else:
			_issue("Subcontractors Panel missing heading — users don't know what this screen is.")

		if _find_label_with_text(sub, "Affinity") or _find_label_with_text(sub, "level"):
			_report("  - Subcontractors Panel has explanatory text about progression. ✓")
		else:
			_issue("Subcontractors Panel has no progression/unlock explanation — users may be confused.")

		if _find_button_with_text(sub, "Close"):
			_report("  - Close button present. ✓")
		else:
			_issue("Subcontractors Panel missing close button.")

		_check_for_placeholder_text(sub, "Subcontractors Panel")

	# ==================================================================
	# Phase 9 — New Mission Panel (target selection)
	# ==================================================================
	_report("## Phase 9 — New Mission Panel (target selection)")
	var nm := await _load_scene(NEW_MISSION_PANEL_SCENE)
	if nm:
		await get_tree().create_timer(PANEL_SETTLE).timeout
		_screenshot("11_new_mission_panel")

		if _find_label_with_text(nm, "New Mission"):
			_report("  - 'New Mission' heading visible. ✓")
		else:
			_issue("New Mission Panel missing heading — users don't know what this screen is.")

		if _find_button_with_text(nm, "Select Rocket"):
			_report("  - 'Select Rocket' button visible. ✓")
		else:
			_issue("New Mission Panel missing 'Select Rocket' button — users cannot start a mission.")

		if _find_button_with_text(nm, "Close"):
			_report("  - Close button present. ✓")
		else:
			_issue("New Mission Panel missing close button.")

		var anomaly_list := _find_node_by_name(nm, "AnomalyList")
		if anomaly_list:
			if anomaly_list.get_child_count() == 0:
				# Expected in CI — targets come from Supabase; structure is present, data is absent
				_report("  - AnomalyList present but empty (CI has no Supabase data — expected).")
			else:
				_report("  - AnomalyList has %d entries. ✓" % anomaly_list.get_child_count())
		else:
			_issue("New Mission Panel: AnomalyList node not found — target selection is broken.")

		_check_for_placeholder_text(nm, "New Mission Panel")

	# ==================================================================
	# Phase 10 — Rocket Selector
	# ==================================================================
	_report("## Phase 10 — Rocket Selector")
	var rs := await _load_scene(ROCKET_SELECTOR_SCENE)
	if rs:
		await get_tree().create_timer(PANEL_SETTLE).timeout
		_screenshot("12_rocket_selector")
		_check_visible_labels(rs, "Rocket Selector", 1)
		_check_for_placeholder_text(rs, "Rocket Selector")
	else:
		_report("  - RocketSelectorOverlay.tscn not loadable (may be expected — skip).")

	# ==================================================================
	# Phase 11 — Rocket Ascent transition
	# ==================================================================
	_report("## Phase 11 — Rocket Ascent")
	var ascent := await _load_scene(ASCENT_SCENE)
	if ascent:
		await get_tree().create_timer(PANEL_SETTLE).timeout
		_screenshot("13_rocket_ascent")
		_check_visible_labels(ascent, "Rocket Ascent", 0)
		_check_for_placeholder_text(ascent, "Rocket Ascent")

	# ==================================================================
	# Phase 12 — Rocket Transit animation
	# ==================================================================
	_report("## Phase 12 — Rocket Transit")
	var transit := await _load_scene(TRANSIT_SCENE)
	if transit:
		await get_tree().create_timer(SCENE_SETTLE).timeout
		_screenshot("14_rocket_transit_initial")

		# Target / status label (scene uses TargetLabel, not StatusLabel)
		var status_lbl := _find_node_by_name(transit, "TargetLabel")
		if not status_lbl:
			status_lbl = _find_node_by_name(transit, "StatusLabel")
		if status_lbl:
			_report("  - Transit target/status label present. ✓")
		else:
			_issue("Rocket Transit missing target/status label — users can't see flight status.")

		var travel_bar := _find_node_by_name(transit, "TravelBar")
		if travel_bar:
			_report("  - TravelBar progress indicator present. ✓")
		else:
			_issue("Rocket Transit missing TravelBar — users can't see travel progress.")

		# Let the transit animation play for a few seconds then screenshot mid-flight
		await get_tree().create_timer(SCENE_SETTLE).timeout
		_screenshot("15_rocket_transit_midway")

		var back_btn := _find_button_with_text(transit, "Back")
		if not back_btn:
			back_btn = _find_button_with_text(transit, "Skip")
		if back_btn:
			_report("  - Transit has a back/skip button. ✓")
		else:
			_issue("Rocket Transit has no back/skip button — users are stuck watching the full animation.")

		_check_for_placeholder_text(transit, "Rocket Transit")

	# ==================================================================
	# Phase 13 — Mining Practice Panel (preset list)
	# ==================================================================
	_report("## Phase 13 — Mining Practice Panel")
	var mpp := await _load_scene(MINING_PRACTICE_SCENE)
	if mpp:
		await get_tree().create_timer(PANEL_SETTLE).timeout
		_screenshot("16_mining_practice_panel")
		_check_visible_labels(mpp, "Mining Practice Panel", 1)

		# Check that at least one practice preset button / card is listed
		var preset_count := 0
		for child in _get_all_children(mpp):
			if child is Button and child.visible:
				preset_count += 1
		if preset_count > 0:
			_report("  - Mining Practice Panel has %d visible buttons. ✓" % preset_count)
		else:
			_issue("Mining Practice Panel shows no preset buttons — users cannot start practice.")

		_check_for_placeholder_text(mpp, "Mining Practice Panel")

	# ==================================================================
	# Phase 14 — Mining Minigame (actual gameplay)
	#
	# Starts a warm-up asteroid session and runs it for MINING_RUN_SECONDS.
	# Simulates beam-firing so terrain is actually excavated.
	# ==================================================================
	_report("## Phase 14 — Mining Minigame (warm-up asteroid, %d s run)" % int(MINING_RUN_SECONDS))
	var mining := await _load_scene(MINING_MINIGAME_SCENE)
	if mining:
		# start_mining is on the wrapper (MiningMinigame.gd), which delegates to SidescrollMining
		if mining.has_method("start_mining"):
			mining.call(
				"start_mining",
				false,       # is_planet
				1,           # difficulty
				"ux-tour-warmup",  # target_id
				{"Iron": 8, "Nickel": 5, "Cobalt": 2},
				0.78,        # mineable_pct — lots of surface deposits for visible action
				{}           # session_context
			)
			await get_tree().create_timer(SCENE_SETTLE).timeout
			_screenshot("17_mining_initial_terrain")

			# Locate the inner SidescrollMining node and start the beam
			var sidescroll := _find_node_by_name(mining, "SidescrollMiningCompat")
			if not sidescroll:
				# The delegate may be directly named after the scene
				sidescroll = mining.get_node_or_null("SidescrollMiningCompat")
			if sidescroll:
				_report("  - SidescrollMining delegate found. ✓")
				# Check key HUD elements
				for hud_name in ["FuelBar", "HeatBar", "BeamBar", "ScoreLabel"]:
					if _find_node_by_name(sidescroll, hud_name):
						_report("    • %s HUD element present. ✓" % hud_name)
					else:
						_issue("Mining HUD missing '%s' — players can't track resource state." % hud_name)
				# Simulate the beam firing by toggling _is_mining directly
				sidescroll.set("_is_mining", true)
				await get_tree().create_timer(5.0).timeout
				_screenshot("18_mining_beam_active")
				# Fire for the bulk of the run
				await get_tree().create_timer(MINING_RUN_SECONDS - 8.0).timeout
				_screenshot("19_mining_mid_run")
				sidescroll.set("_is_mining", false)
				await get_tree().create_timer(1.0).timeout
				_screenshot("20_mining_beam_released")
			else:
				_issue("SidescrollMining delegate node not found — cannot drive beam simulation.")
				await get_tree().create_timer(MINING_RUN_SECONDS).timeout
				_screenshot("17_mining_static")

			# Check inventory / return button presence
			var return_btn := _find_button_with_text(mining, "RETURN")
			if not return_btn:
				return_btn = _find_button_with_text(mining, "Return")
			if return_btn:
				_report("  - RETURN button present. ✓")
			else:
				_issue("Mining screen missing RETURN button — players cannot end the run.")

		else:
			_issue("CRITICAL: MiningMinigame has no start_mining() method — minigame is broken.")
			await get_tree().create_timer(2.0).timeout
			_screenshot("17_mining_no_start")

	# ==================================================================
	# Phase 15 — Rocket Return transition
	# ==================================================================
	_report("## Phase 15 — Rocket Return")
	var ret := await _load_scene(RETURN_SCENE)
	if ret:
		await get_tree().create_timer(PANEL_SETTLE).timeout
		_screenshot("21_rocket_return")
		_check_for_placeholder_text(ret, "Rocket Return")

	# ==================================================================
	# Phase 16 — Mission Debrief Scene
	# ==================================================================
	_report("## Phase 16 — Mission Debrief Scene")
	var debrief := await _load_scene(DEBRIEF_SCENE)
	if debrief:
		await get_tree().create_timer(SCENE_SETTLE).timeout
		_screenshot("22_mission_debrief")

		var title_node := _find_node_by_name(debrief, "Title") as Label
		if title_node:
			var title_text := title_node.text.strip_edges()
			if "Mission Complete" in title_text:
				_report("  - Debrief title: '%s' ✓" % title_text)
			elif "No Mission Data" in title_text or "No Mission" in title_text:
				_report("  - Debrief empty state: '%s' (expected in CI without live mission)." % title_text)
			elif title_text.length() == 0:
				_issue("Debrief Title label is empty — users see no heading on this screen.")
			else:
				_report("  - Debrief title: '%s'" % title_text)
		else:
			_issue("Debrief scene missing Title label node entirely.")

		if _find_node_by_name(debrief, "CompleteButton"):
			_report("  - CompleteButton present. ✓")
		else:
			_issue("Debrief scene missing CompleteButton — primary debrief action not visible.")

		if _find_node_by_name(debrief, "OrbitButton"):
			_report("  - OrbitButton present. ✓")
		else:
			_issue("Debrief scene missing OrbitButton — secondary orbit action not visible.")

		var payout := _find_node_by_name(debrief, "PayoutLabel") as Label
		if payout and payout.text.strip_edges() == "":
			# Expected in CI — payout is populated by mission result data from Supabase
			_report("  - Debrief PayoutLabel is empty (expected in CI without live mission data).")

		_check_for_placeholder_text(debrief, "Mission Debrief")

	# ==================================================================
	# Phase 17 — Asteroid Detail / Annotation UI
	# ==================================================================
	_report("## Phase 17 — Asteroid Detail & Annotation")
	var detail := await _load_scene(ASTEROID_DETAIL_SCENE)
	if detail:
		await get_tree().create_timer(PANEL_SETTLE).timeout
		_screenshot("23_asteroid_detail_view")

		# Core annotation toolbar buttons
		for btn_text in ["Pen", "Clear", "Save"]:
			if _find_button_with_text(detail, btn_text):
				_report("  - '%s' annotation button present. ✓" % btn_text)
			else:
				_issue("Asteroid detail view missing '%s' annotation button." % btn_text)

		# Drawing mode buttons
		for btn_name in ["PenFreeButton", "PenRectButton", "PenCircleButton"]:
			if _find_node_by_name(detail, btn_name):
				_report("  - %s present. ✓" % btn_name)
			else:
				_issue("Asteroid detail view missing drawing mode button '%s' — annotation options reduced." % btn_name)

		var back_btn := _find_button_with_text(detail, "Back")
		if not back_btn:
			back_btn = _find_button_with_text(detail, "←")
		if back_btn:
			_report("  - Back button present. ✓")
		else:
			_issue("Asteroid detail view missing back button — users are stranded in the annotation view.")

		var drawing_canvas := _find_node_by_name(detail, "DrawingCanvas")
		if drawing_canvas:
			_report("  - DrawingCanvas node present. ✓")
		else:
			_issue("Asteroid detail view missing DrawingCanvas — annotation drawing is broken.")

		_check_for_placeholder_text(detail, "Asteroid Detail View")

	# ==================================================================
	# Phase 18 — Earth base final state
	# ==================================================================
	_report("## Phase 18 — Earth Base (returning from debrief)")
	var earth2 := await _load_scene(EARTH_MAIN_SCENE)
	if earth2:
		await get_tree().create_timer(SCENE_SETTLE).timeout
		_screenshot("24_earth_base_final")
		for btn_name in ["MenuButton", "ForwardButton", "BackButton"]:
			if not _find_node_by_name(earth2, btn_name):
				_issue("Earth base missing '%s' on second load — possible state corruption." % btn_name)
		_check_for_placeholder_text(earth2, "Earth Base (final)")

	# ==================================================================
	# Done
	# ==================================================================
	_finish()


# ---------------------------------------------------------------------------
# Scene-specific helpers
# ---------------------------------------------------------------------------
func _inspect_tutorial_overlay(overlay: Node) -> void:
	var labels := _collect_all_labels(overlay)
	var non_empty := labels.filter(func(l): return l.text.strip_edges().length() > 0)
	if non_empty.is_empty():
		_issue("Tutorial overlay visible but all labels are empty — users see a blank coach overlay.")
	else:
		_report("  - Tutorial overlay has %d non-empty text labels." % non_empty.size())
		for lbl in non_empty:
			_report("    • \"%s\"" % lbl.text.strip_edges())


func _check_visible_labels(root: Node, panel_name: String, minimum: int) -> void:
	var visible := _collect_all_labels(root).filter(
		func(l): return l.visible and l.text.strip_edges().length() > 0
	)
	if visible.size() < minimum:
		_issue("'%s' panel shows fewer than %d visible text elements (%d found) — may not have loaded." \
			% [panel_name, minimum, visible.size()])
	else:
		_report("  - '%s' shows %d visible text elements. ✓" % [panel_name, visible.size()])


func _check_for_placeholder_text(root: Node, context: String) -> void:
	for lbl in _collect_all_labels(root):
		for p in ["TODO", "FIXME", "PLACEHOLDER", "Lorem ipsum", "???", "[unnamed]"]:
			if p.to_lower() in lbl.text.to_lower():
				_issue("Placeholder text in %s: \"%s\"" % [context, lbl.text.strip_edges()])


# ---------------------------------------------------------------------------
# Node search helpers
# ---------------------------------------------------------------------------
func _find_button_with_text(root: Node, search_text: String) -> Button:
	if not root:
		return null
	if root is Button and search_text.to_lower() in (root as Button).text.to_lower():
		return root as Button
	for child in root.get_children():
		var found := _find_button_with_text(child, search_text)
		if found:
			return found
	return null


func _find_label_with_text(root: Node, search_text: String) -> Label:
	if not root:
		return null
	if root is Label and search_text.to_lower() in (root as Label).text.to_lower():
		return root as Label
	for child in root.get_children():
		var found := _find_label_with_text(child, search_text)
		if found:
			return found
	return null


func _find_node_by_name(root: Node, node_name: String) -> Node:
	if not root:
		return null
	if root.name == node_name:
		return root
	for child in root.get_children():
		var found := _find_node_by_name(child, node_name)
		if found:
			return found
	return null


func _find_node_by_class(root: Node, class_name_str: String) -> Node:
	if not root:
		return null
	if root.get_script() and root.get_script().get_global_name() == class_name_str:
		return root
	for child in root.get_children():
		var found := _find_node_by_class(child, class_name_str)
		if found:
			return found
	return null


func _collect_all_labels(root: Node) -> Array[Label]:
	var result: Array[Label] = []
	if not root:
		return result
	if root is Label:
		result.append(root as Label)
	for child in root.get_children():
		result.append_array(_collect_all_labels(child))
	return result


func _get_all_children(root: Node) -> Array[Node]:
	var result: Array[Node] = []
	if not root:
		return result
	for child in root.get_children():
		result.append(child)
		result.append_array(_get_all_children(child))
	return result


# ---------------------------------------------------------------------------
# Interaction
# ---------------------------------------------------------------------------
func _click(btn: Button) -> void:
	if not btn or not is_instance_valid(btn):
		return
	btn.grab_focus()
	btn.emit_signal("pressed")


# ---------------------------------------------------------------------------
# Screenshot
# ---------------------------------------------------------------------------
func _screenshot(label: String) -> void:
	await get_tree().process_frame
	await get_tree().process_frame

	var image := get_viewport().get_texture().get_image()
	if not image:
		_issue("Failed to capture viewport for '%s'." % label)
		return

	_screenshot_index += 1
	var filename := "%s/%02d_%s.png" % [SCREENSHOT_DIR, _screenshot_index, label]
	if image.save_png(filename) == OK:
		_report("  📸 %02d_%s.png" % [_screenshot_index, label])
	else:
		_issue("Failed to save screenshot: %s" % filename)


# ---------------------------------------------------------------------------
# Reporting
# ---------------------------------------------------------------------------
func _log_header() -> void:
	_report("# UX End-to-End Tour Report")
	_report("Generated by `run_ux_e2e_tour.gd` — Planet Hunters Experiment 1")
	_report("")


func _report(line: String) -> void:
	_report_lines.append(line)
	print("[UX_TOUR] " + line)


func _issue(description: String) -> void:
	_issues.append(description)
	_report_lines.append("⚠️  ISSUE: " + description)
	push_warning("[UX_TOUR] ISSUE: " + description)


func _finish() -> void:
	_report("")
	_report("---")
	_report("## Summary")
	_report("- Screenshots taken: %d" % _screenshot_index)
	_report("- Issues found: %d" % _issues.size())
	_report("")

	if _issues.is_empty():
		_report("✅ No UX issues detected.")
	else:
		_report("### All Issues")
		for issue in _issues:
			_report("- " + issue)

	# CRITICAL = things that are definitely broken for the user (not just empty-state notes)
	var critical_keywords := [
		"CRITICAL:",
		"cannot proceed",
		"broken",
		"blank coach overlay",
		"navigation impaired",
		"minigame is broken",
	]
	var critical_count := 0
	_report("")
	_report("### Critical Issues (CI will fail on these)")
	for issue in _issues:
		for kw in critical_keywords:
			if kw.to_lower() in issue.to_lower():
				_report("CRITICAL: " + issue)
				critical_count += 1
				break
	if critical_count == 0:
		_report("None.")

	var file := FileAccess.open(REPORT_PATH, FileAccess.WRITE)
	if file:
		for line in _report_lines:
			file.store_line(line)
		file.close()
		print("[UX_TOUR] Report written to: " + REPORT_PATH)
	else:
		push_error("[UX_TOUR] Could not write report: " + REPORT_PATH)

	await get_tree().create_timer(0.5).timeout
	get_tree().quit(0)
