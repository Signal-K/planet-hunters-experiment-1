extends Node
## UX End-to-End Tour — extended for AI-assisted review
##
## Loads each major game scene, drives gameplay (mining, tutorial, annotation,
## transit) and screenshots the result. Produces:
##   - ux_screenshots/*.png  — ordered screenshots of every major screen
##   - ux_report.md          — issues list (CI gating)
##   - tour_manifest.json    — per-screenshot structured context for AI review
##   - tour_ai_context.md    — game overview + review questions for the AI
##
## Questions this tour lets an AI answer:
##   1. Does the flow go through all levels (M1→M4→sandbox, candidate annotation)?
##   2. Are there UI overlaps (text over button) or off-screen elements?
##   3. Does the flow and tutorial make sense to a first-time user?
##
## Run via:
##   DISPLAY=:99 godot --path ./scene res://tests/UXTour.tscn

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
const SCREENSHOT_DIR  := "user://ux_screenshots"
const REPORT_PATH     := "user://ux_report.md"
const MANIFEST_PATH   := "user://tour_manifest.json"
const AI_CONTEXT_PATH := "user://tour_ai_context.md"

const EARTH_MAIN_SCENE        := "res://Scenes/Earth/earth_base_1.tscn"
const DEBRIEF_SCENE           := "res://Scenes/Earth/mission_debrief.tscn"
const LAUNCHPAD_SCENE         := "res://Scenes/Earth/earth_launchpad.tscn"
const TRANSIT_SCENE           := "res://Scenes/Transitions/rocket_transit.tscn"
const ASCENT_SCENE            := "res://Scenes/Transitions/rocket_ascent.tscn"
const RETURN_SCENE            := "res://Scenes/Transitions/rocket_return.tscn"
const LAUNCHPAD_PANEL_SCENE   := "res://Scenes/UI/LaunchpadPanel.tscn"
const NEW_MISSION_PANEL_SCENE := "res://Scenes/UI/NewMissionPanel.tscn"
const SUBCONTRACTORS_SCENE    := "res://Scenes/UI/SubcontractorsPanel.tscn"
const ROCKET_SELECTOR_SCENE   := "res://Scenes/UI/RocketSelectorOverlay.tscn"
const MENU_PANEL_SCENE        := "res://Scenes/UI/MenuPanel.tscn"
const TUTORIAL_OVERLAY_SCENE  := "res://Scenes/UI/TutorialCoachOverlay.tscn"
const CONTROL_STATION_SCENE   := "res://Scenes/UI/ControlStationPanel.tscn"
const SATELLITE_STATION_SCENE := "res://Scenes/UI/SatelliteStationPanel.tscn"
const MINING_MINIGAME_SCENE   := "res://Scenes/UI/MiningMinigame.tscn"
const MINING_PRACTICE_SCENE   := "res://Scenes/UI/MiningPracticePanel.tscn"
const ASTEROID_DETAIL_SCENE   := "res://Scenes/UI/AsteroidDetail/asteroid_detail_view.tscn"
const SPACE_MAP_SCENE         := "res://Scenes/UI/SpaceMap/space_map.tscn"

const MINING_RUN_SECONDS := 12.0
const SCENE_SETTLE  := 2.0
const PANEL_SETTLE  := 1.0
const ANIM_SETTLE   := 0.5
const SNAP_SETTLE   := 1.0   # shorter settle for stage-snapshot phases

# ---------------------------------------------------------------------------
# State
# ---------------------------------------------------------------------------
var _screenshot_index := 0
var _report_lines: Array[String] = []
var _issues: Array[String] = []
var _active_scene: Node = null
var _manifest_entries: Array = []
var _cur_meta: Dictionary = {}   # set before each _screenshot() call

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
# Tutorial state injection
# Writes tutorial_v2.cfg so the next TutorialController._ready() picks it up.
# ---------------------------------------------------------------------------
func _inject_tutorial_state(stage: int, step: int = 0) -> void:
	var cfg := ConfigFile.new()
	cfg.set_value("state", "current_stage", stage)
	cfg.set_value("state", "current_step_index", step)
	cfg.set_value("state", "stage_lock", 0)
	cfg.set_value("state", "skipped", false)
	cfg.set_value("state", "completed_actions", {})
	cfg.set_value("state", "completed_actions_by_stage", {})
	cfg.set_value("state", "completed_steps_by_stage", {})
	cfg.save("user://tutorial_v2.cfg")


# ---------------------------------------------------------------------------
# Tour
# ---------------------------------------------------------------------------
func _run_tour() -> void:

	# ==================================================================
	# Phase 1 — Startup / Intro Splash (fresh first-time user)
	# ==================================================================
	_report("## Phase 1 — Startup / Intro Splash")
	_inject_tutorial_state(1, 0)
	_report("  - Loading EARTH_MAIN_SCENE: %s" % EARTH_MAIN_SCENE)
	var earth := await _load_scene(EARTH_MAIN_SCENE)
	if not earth:
		_report("  - FAILED to load EARTH_MAIN_SCENE")
		_finish()
		return

	_report("  - Scene loaded, waiting for settle (%d s)..." % SCENE_SETTLE)
	await get_tree().create_timer(SCENE_SETTLE).timeout
	_meta("Phase 1 - Startup / Intro Splash", 0,
		"The very first screen a brand-new user sees when launching the game.",
		["Is there a clear Begin Mission CTA?",
		 "Is the game title / branding visible?",
		 "Are any UI elements cut off or hanging off screen edges?",
		 "Would a new user immediately know what to do?"])
	_report("  - Taking first screenshot: 01_startup_intro_splash")
	_screenshot("01_startup_intro_splash")
	_report("  - First screenshot taken.")

	_report("  - Searching for IntroSplash...")
	var splash := _find_node_by_class(get_tree().root, "PlanetHuntersIntroSplash")
	if splash:
		_report("  - Intro splash found. ✓")
		if _find_button_with_text(splash, "Begin Mission"):
			_report("  - 'Begin Mission' CTA visible. ✓")
		else:
			_issue("Intro splash shown but 'Begin Mission' button missing — user cannot proceed.")
	else:
		_report("  - Intro splash not found (expected: splash was removed from AppController).")

	_report("  - Searching for Begin Mission button anywhere...")
	var splash_btn := _find_button_with_text(get_tree().root, "Begin Mission")
	if splash_btn:
		_report("  - Found Begin Mission button, clicking...")
		_click(splash_btn)
		await get_tree().create_timer(ANIM_SETTLE).timeout
	else:
		_report("  - Begin Mission button not found, proceeding directly.")

	_report("  - Taking second screenshot: 02_after_splash_dismissed")
	_meta("Phase 1 - After Splash Dismissed", 0,
		"Earth base hub immediately after the intro splash is dismissed.",
		["Is the tutorial coach overlay visible, guiding the user to the Control Station?",
		 "Are navigation buttons (menu, forward, back) visible?",
		 "Is the FrancBalance (currency) HUD element shown?"])
	_screenshot("02_after_splash_dismissed")
	_report("  - Second screenshot taken.")

	# ==================================================================
	# Phase 2 — Earth Base (Mission 1 state)
	# ==================================================================
	_report("## Phase 2 — Earth Base (Mission 1 state)")
	await get_tree().create_timer(ANIM_SETTLE).timeout
	_meta("Phase 2 - Earth Base Overview (M1)", 1,
		"Earth base hub with Mission 1 tutorial active — what a brand-new user sees after dismissing the splash.",
		["Is the tutorial overlay pointing the user to the Control Station?",
		 "Are all main navigation elements visible and unobscured?",
		 "Is the FrancBalance HUD shown?",
		 "Does anything overlap or hang off the screen?"])
	_screenshot("03_earth_base_m1_overview")
	_check_offscreen_elements(earth, "Earth Base M1")
	_check_label_button_overlaps(earth, "Earth Base M1")

	for btn_name in ["MenuButton", "ForwardButton", "BackButton"]:
		if _find_node_by_name(earth, btn_name):
			_report("  - %s present. ✓" % btn_name)
		else:
			_issue("Earth base missing '%s' — navigation impaired." % btn_name)

	if _find_node_by_name(earth, "FrancBalance"):
		_report("  - FrancBalance HUD present. ✓")
	else:
		_issue("FrancBalance HUD missing from earth base — users cannot see their currency.")

	var tut := get_tree().root.get_node_or_null("TutorialCoachOverlay")
	if tut and tut.visible:
		_report("  - Tutorial coach overlay visible. ✓")
		_meta("Phase 2 - Tutorial Coach (M1 Step 1: Control Station)", 1,
			"Tutorial coach overlay active on earth base, prompting the user to open the Control Station.",
			["Is the step title readable and specific?",
			 "Is the instruction text clear and actionable for a new user?",
			 "Does the coach indicator point at the right element?",
			 "Is any tutorial text obscured by another UI element?"])
		_screenshot("04_tutorial_coach_m1_step1")
		_inspect_tutorial_overlay(tut)
	else:
		_issue("Tutorial coach overlay not visible on first visit — new users may not know what to do.")

	_check_for_placeholder_text(earth, "Earth Base")

	# ==================================================================
	# Phase 2b — Mission Stage Progression Snapshots (M2 → Sandbox)
	# Injects state so the AI can see how the UI evolves across all stages.
	# ==================================================================
	_report("## Phase 2b — Mission Stage Progression Snapshots")
	var _stage_meta := {
		2: {
			"label": "Mission 2 (Contractor Bonus)",
			"desc": "Earth base after completing M1. User is now on M2 — contractor bonuses unlocked. Tutorial should prompt a new step.",
			"checks": ["Does the tutorial prompt reflect M2 (contractor pick)?",
			           "Is any new UI element visible vs. M1?",
			           "Does anything overlap or hang off screen?"]
		},
		3: {
			"label": "Mission 3 (TESS Planet Candidates)",
			"desc": "Earth base after completing M2. M3 introduces real TESS planet candidates as targets — the citizen science hook.",
			"checks": ["Does the tutorial mention planet candidates or TESS?",
			           "Is there any hint the game is connected to real science?",
			           "Does anything overlap or hang off screen?"]
		},
		4: {
			"label": "Mission 4 (Scanner Station + Drones)",
			"desc": "Earth base after completing M3. M4 introduces the Scanner Station build objective — a new base structure appears.",
			"checks": ["Does the tutorial prompt the user to build a Scanner Station?",
			           "Is the Scanner Station build option visible on the base?",
			           "Does anything overlap or hang off screen?"]
		},
		5: {
			"label": "Sandbox / Free Operations",
			"desc": "Earth base in Free Operations mode — all tutorial missions complete. User is in free-play with all mechanics unlocked.",
			"checks": ["Is the tutorial overlay hidden or showing a 'free play' state?",
			           "Does the base feel different from the tutorial stages?",
			           "Can the user clearly tell they have completed the tutorial?",
			           "Does anything overlap or hang off screen?"]
		}
	}

	for stage in [2, 3, 4, 5]:
		_inject_tutorial_state(stage, 0)
		var earth_s := await _load_scene(EARTH_MAIN_SCENE)
		if earth_s:
			await get_tree().create_timer(SNAP_SETTLE).timeout
			var sm: Dictionary = _stage_meta[stage]
			_meta("Phase 2b - Earth Base Stage %d (%s)" % [stage, sm["label"]], stage,
				sm["desc"], sm["checks"])
			_screenshot("stage%d_earth_base" % stage)
			_check_offscreen_elements(earth_s, "Earth Base Stage %d" % stage)

			# Also snapshot the launchpad at this stage
			var lpad_s := await _load_scene(LAUNCHPAD_SCENE)
			if lpad_s:
				await get_tree().create_timer(SNAP_SETTLE).timeout
				_meta("Phase 2b - Launchpad Stage %d (%s)" % [stage, sm["label"]], stage,
					"Launchpad scene at Mission %d state — shows rocket build options, target list, and contractor selection available at this progression point." % stage,
					["Is the target list populated (or empty with explanation)?",
					 "Are contractor options visible?",
					 "Does the tutorial overlay show the correct step for this stage?",
					 "Does anything overlap or hang off screen?"])
				_screenshot("stage%d_launchpad" % stage)
				_check_offscreen_elements(lpad_s, "Launchpad Stage %d" % stage)
				_check_label_button_overlaps(lpad_s, "Launchpad Stage %d" % stage)

	# ==================================================================
	# Phase 3 — Menu Panel
	# ==================================================================
	_report("## Phase 3 — Menu Panel")
	var menu := await _load_scene(MENU_PANEL_SCENE)
	if menu:
		await get_tree().create_timer(PANEL_SETTLE).timeout
		_meta("Phase 3 - Menu Panel", -1,
			"The main menu / settings panel, accessible from the earth base.",
			["Is there a visible close/dismiss button so users can exit?",
			 "Are menu options clearly labelled?",
			 "Does any text overflow or get clipped?"])
		_screenshot("05_menu_panel")
		_check_visible_labels(menu, "Menu Panel", 1)
		_check_for_placeholder_text(menu, "Menu Panel")
		_check_offscreen_elements(menu, "Menu Panel")
		_check_label_button_overlaps(menu, "Menu Panel")
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
		_meta("Phase 4 - Tutorial Coach Overlay (standalone)", -1,
			"The tutorial coach overlay UI in isolation — appears throughout the game to guide new users step by step.",
			["Is there a clear step title?",
			 "Is the instruction message readable?",
			 "Does the overlay have enough contrast against game backgrounds?",
			 "Are any labels empty or showing placeholder text?"])
		_screenshot("06_tutorial_coach_overlay")
		_check_visible_labels(tut_overlay, "Tutorial Coach Overlay", 1)
		_check_offscreen_elements(tut_overlay, "Tutorial Coach Overlay")
		_check_for_placeholder_text(tut_overlay, "Tutorial Coach Overlay")
		if _find_node_by_name(tut_overlay, "TitleLabel"):
			_report("  - TitleLabel node present. ✓")
		else:
			_issue("TutorialCoachOverlay missing TitleLabel — step title won't render.")
		var body_lbl := _find_node_by_name(tut_overlay, "MessageLabel")
		if not body_lbl:
			body_lbl = _find_node_by_name(tut_overlay, "ActionLabel")
		if body_lbl:
			_report("  - Message/ActionLabel present. ✓")
		else:
			_issue("TutorialCoachOverlay missing message label — instructions won't show.")

	# ==================================================================
	# Phase 5 — Control Station Panel
	# ==================================================================
	_report("## Phase 5 — Control Station Panel")
	var csp := await _load_scene(CONTROL_STATION_SCENE)
	if csp:
		await get_tree().create_timer(PANEL_SETTLE).timeout
		_meta("Phase 5 - Control Station Panel", -1,
			"The Control Station panel — shows active missions and fleet status. First panel M1 tutorial directs users to open.",
			["Is there a visible close button?",
			 "Is the panel title clear?",
			 "Does a new user understand what this panel is for?",
			 "Does anything overlap or get clipped at panel edges?"])
		_screenshot("07_control_station_panel")
		_check_visible_labels(csp, "Control Station Panel", 1)
		_check_offscreen_elements(csp, "Control Station Panel")
		_check_label_button_overlaps(csp, "Control Station Panel")
		_check_for_placeholder_text(csp, "Control Station Panel")
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

	# ==================================================================
	# Phase 5b — Space Map
	# ==================================================================
	_report("## Phase 5b — Space Map")
	var space_map := await _load_scene(SPACE_MAP_SCENE)
	if space_map:
		await get_tree().create_timer(SCENE_SETTLE).timeout
		_meta("Phase 5b - Space Map", -1,
			"The Space Map — shows the operational zone, scanned targets, and reachable destinations. Key navigation surface after Mission 4.",
			["Is the map rendering correctly?",
			 "Are there visible labels or points of interest?",
			 "Is there a close/back button?",
			 "Are any UI elements clipped at screen edges?",
			 "Does the map feel navigable and understandable to a new user?"])
		_screenshot("08_space_map")
		_check_visible_labels(space_map, "Space Map", 1)
		_check_offscreen_elements(space_map, "Space Map")
		_check_label_button_overlaps(space_map, "Space Map")
		_check_for_placeholder_text(space_map, "Space Map")
		var sm_back := _find_button_with_text(space_map, "Back")
		if not sm_back:
			sm_back = _find_button_with_text(space_map, "Close")
		if not sm_back:
			sm_back = _find_button_with_text(space_map, "✕")
		if sm_back:
			_report("  - Space Map has a back/close button. ✓")
		else:
			_issue("Space Map has no back/close button — users cannot leave this view.")
	else:
		_report("  - Space Map not loadable (scene may not yet be wired in).")

	# ==================================================================
	# Phase 6 — Satellite Station Panel
	# ==================================================================
	_report("## Phase 6 — Satellite Station Panel")
	var ssp := await _load_scene(SATELLITE_STATION_SCENE)
	if ssp:
		if ssp.has_method("set_local_only"):
			ssp.set_local_only(true)
		await get_tree().create_timer(PANEL_SETTLE).timeout
		_meta("Phase 6 - Satellite Station Panel", -1,
			"The Satellite Station panel — scans for new targets. In CI: no Supabase data, so the list will be empty.",
			["Is there a scan/refresh button?",
			 "Does the panel explain what it does?",
			 "In the empty-data state (CI), does the UI look intentional rather than broken?",
			 "Any text clipped or off-screen?"])
		_screenshot("09_satellite_station_panel")
		_check_visible_labels(ssp, "Satellite Station Panel", 1)
		_check_offscreen_elements(ssp, "Satellite Station Panel")
		_check_for_placeholder_text(ssp, "Satellite Station Panel")
		var scan_btn := _find_button_with_text(ssp, "Scan")
		if not scan_btn:
			scan_btn = _find_button_with_text(ssp, "Refresh")
		if scan_btn:
			_report("  - Satellite Station Panel has a scan/refresh button. ✓")
		else:
			_issue("Satellite Station Panel has no scan/refresh button — users cannot discover targets.")

	# ==================================================================
	# Phase 7 — Launchpad Panel
	# ==================================================================
	_report("## Phase 7 — Launchpad Panel")
	var lp := await _load_scene(LAUNCHPAD_PANEL_SCENE)
	if lp:
		await get_tree().create_timer(PANEL_SETTLE).timeout
		_meta("Phase 7 - Launchpad Panel", -1,
			"The Launchpad panel — where users build and configure rockets before launching on a mission.",
			["Is the 'Launch Facility' title visible?",
			 "Is there a description explaining what to do here?",
			 "Is there a close button?",
			 "Does anything overlap the main action area?"])
		_screenshot("10_launchpad_panel")
		_check_offscreen_elements(lp, "Launchpad Panel")
		_check_label_button_overlaps(lp, "Launchpad Panel")
		if _find_label_with_text(lp, "Launch Facility"):
			_report("  - 'Launch Facility' title visible. ✓")
		else:
			_issue("Launchpad Panel has no 'Launch Facility' title — users may not know where they are.")
		if not _find_node_by_name(lp, "Description"):
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
		_meta("Phase 8 - Subcontractors Panel", 1,
			"The Subcontractors panel — users pick a contractor for a delivery bonus before launching. First introduced in M1.",
			["Is the 'Subcontractors' heading visible?",
			 "Is there explanatory text about what contractors do / the bonus system?",
			 "Is there a close button?",
			 "Is the progression / unlock logic explained?"])
		_screenshot("11_subcontractors_panel")
		_check_offscreen_elements(sub, "Subcontractors Panel")
		_check_label_button_overlaps(sub, "Subcontractors Panel")
		if _find_label_with_text(sub, "Subcontractor"):
			_report("  - 'Subcontractors' heading visible. ✓")
		else:
			_issue("Subcontractors Panel missing heading — users don't know what this screen is.")
		if _find_label_with_text(sub, "Affinity") or _find_label_with_text(sub, "level"):
			_report("  - Subcontractors Panel has progression explanation. ✓")
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
		_meta("Phase 9 - New Mission Panel", -1,
			"The New Mission panel where users select their destination (asteroid or TESS planet candidate). In CI: target list will be empty (no Supabase).",
			["Is the 'New Mission' heading visible?",
			 "Is there a 'Select Rocket' button?",
			 "Is there a close button?",
			 "Even with an empty target list (CI), does the UI communicate why or look intentional?"])
		_screenshot("12_new_mission_panel")
		_check_offscreen_elements(nm, "New Mission Panel")
		_check_label_button_overlaps(nm, "New Mission Panel")
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
				_report("  - AnomalyList present but empty (CI / no Supabase — expected).")
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
		_meta("Phase 10 - Rocket Selector", -1,
			"The Rocket Selector overlay — users choose which rocket to use for a mission.",
			["Are rocket options visible and labelled?",
			 "Is there a close/cancel button?",
			 "Does any text overflow?",
			 "Are elements clipped at screen edges?"])
		_screenshot("13_rocket_selector")
		_check_visible_labels(rs, "Rocket Selector", 1)
		_check_offscreen_elements(rs, "Rocket Selector")
		_check_for_placeholder_text(rs, "Rocket Selector")
	else:
		_report("  - RocketSelectorOverlay.tscn not loadable (skip).")

	# ==================================================================
	# Phase 11 — Rocket Ascent
	# ==================================================================
	_report("## Phase 11 — Rocket Ascent")
	var ascent := await _load_scene(ASCENT_SCENE)
	if ascent:
		await get_tree().create_timer(PANEL_SETTLE).timeout
		_meta("Phase 11 - Rocket Ascent", -1,
			"The rocket ascent animation — plays when a rocket launches from Earth.",
			["Is the ascent animation visually clear?",
			 "Is any status text readable?",
			 "Are any UI elements in unexpected positions?"])
		_screenshot("14_rocket_ascent")
		_check_visible_labels(ascent, "Rocket Ascent", 0)
		_check_offscreen_elements(ascent, "Rocket Ascent")
		_check_for_placeholder_text(ascent, "Rocket Ascent")

	# ==================================================================
	# Phase 12 — Rocket Transit
	# ==================================================================
	_report("## Phase 12 — Rocket Transit")
	var transit := await _load_scene(TRANSIT_SCENE)
	if transit:
		await get_tree().create_timer(SCENE_SETTLE).timeout
		_meta("Phase 12 - Rocket Transit (initial)", -1,
			"Rocket transit animation at the start of flight — the 'in-flight waiting' state users see between Earth and their target.",
			["Is there a target/status label showing where the rocket is going?",
			 "Is there a travel progress bar?",
			 "Is there a back/skip button so users aren't stuck watching the full animation?",
			 "Is the flight status readable?"])
		_screenshot("15_rocket_transit_initial")
		var status_lbl := _find_node_by_name(transit, "TargetLabel")
		if not status_lbl:
			status_lbl = _find_node_by_name(transit, "StatusLabel")
		if status_lbl:
			_report("  - Transit target/status label present. ✓")
		else:
			_issue("Rocket Transit missing target/status label — users can't see flight status.")
		if _find_node_by_name(transit, "TravelBar"):
			_report("  - TravelBar present. ✓")
		else:
			_issue("Rocket Transit missing TravelBar — users can't see travel progress.")

		await get_tree().create_timer(SCENE_SETTLE).timeout
		_meta("Phase 12 - Rocket Transit (mid-flight)", -1,
			"Rocket transit animation a few seconds into the journey.",
			["Has the animation progressed? Is the rocket visibly moving?",
			 "Is the travel progress bar updating?",
			 "Is the back/skip button still visible and accessible?"])
		_screenshot("16_rocket_transit_midway")
		_check_offscreen_elements(transit, "Rocket Transit")

		var back_btn := _find_button_with_text(transit, "Back")
		if not back_btn:
			back_btn = _find_button_with_text(transit, "Skip")
		if back_btn:
			_report("  - Transit has a back/skip button. ✓")
		else:
			_issue("Rocket Transit has no back/skip button — users are stuck watching the full animation.")
		_check_for_placeholder_text(transit, "Rocket Transit")

	# ==================================================================
	# Phase 13 — Mining Practice Panel
	# ==================================================================
	_report("## Phase 13 — Mining Practice Panel")
	var mpp := await _load_scene(MINING_PRACTICE_SCENE)
	if mpp:
		await get_tree().create_timer(PANEL_SETTLE).timeout
		_meta("Phase 13 - Mining Practice Panel", -1,
			"The Mining Practice panel — lets users try mining on preset scenarios before a real mission.",
			["Are practice preset buttons visible?",
			 "Is it clear this is 'practice' vs. a real mission?",
			 "Any text truncated or clipped?"])
		_screenshot("17_mining_practice_panel")
		_check_visible_labels(mpp, "Mining Practice Panel", 1)
		_check_offscreen_elements(mpp, "Mining Practice Panel")
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
	# ==================================================================
	_report("## Phase 14 — Mining Minigame (%d s run)" % int(MINING_RUN_SECONDS))
	var mining := await _load_scene(MINING_MINIGAME_SCENE)
	if mining:
		if mining.has_method("start_mining"):
			mining.call(
				"start_mining",
				false, 1, "ux-tour-warmup",
				{"Iron": 8, "Nickel": 5, "Cobalt": 2},
				0.78, {}
			)
			await get_tree().create_timer(SCENE_SETTLE).timeout
			_meta("Phase 14 - Mining Minigame (initial terrain)", 1,
				"Mining minigame just after starting — asteroid terrain generated, beam not yet active. First thing a user sees when they arrive at an asteroid.",
				["Is the terrain visually distinct and clearly mineable?",
				 "Are HUD elements (fuel, heat, beam, score) all visible and readable?",
				 "Is there a RETURN button?",
				 "Is the tutorial overlay present, explaining how to mine?",
				 "Does anything overlap the main gameplay area?"])
			_screenshot("18_mining_initial_terrain")
			_check_offscreen_elements(mining, "Mining Minigame")

			var sidescroll := _find_node_by_name(mining, "SidescrollMiningCompat")
			if not sidescroll:
				sidescroll = mining.get_node_or_null("SidescrollMiningCompat")
			if sidescroll:
				_report("  - SidescrollMining delegate found. ✓")
				for hud_name in ["FuelBar", "HeatBar", "BeamBar", "ScoreLabel"]:
					if _find_node_by_name(sidescroll, hud_name):
						_report("    • %s present. ✓" % hud_name)
					else:
						_issue("Mining HUD missing '%s' — players can't track resource state." % hud_name)
				sidescroll.set("_is_mining", true)
				await get_tree().create_timer(5.0).timeout
				_meta("Phase 14 - Mining Minigame (beam active)", 1,
					"Mining beam active — terrain is being excavated. The main mining gameplay loop.",
					["Is the mining beam visually clear?",
					 "Is terrain being excavated (pixels removed)?",
					 "Are HUD bars updating (heat rising, fuel depleting)?",
					 "Is any UI element obscured by the beam effect?"])
				_screenshot("19_mining_beam_active")
				await get_tree().create_timer(MINING_RUN_SECONDS - 8.0).timeout
				_meta("Phase 14 - Mining Minigame (mid-run)", 1,
					"Mining mid-run — significant terrain excavated. Shows visual progression of a full mining session.",
					["Is there visibly less terrain (excavation progress)?",
					 "Is the cargo/inventory filling up?",
					 "Is the RETURN button visible and accessible?",
					 "Is the score/haul total updating?"])
				_screenshot("20_mining_mid_run")
				sidescroll.set("_is_mining", false)
				await get_tree().create_timer(1.0).timeout
				_meta("Phase 14 - Mining Minigame (beam released)", 1,
					"Mining beam released — player stopped mining. Post-mining state before returning to Earth.",
					["Is the beam clearly off?",
					 "Is the RETURN button prominent, prompting the user to go home?",
					 "Is the final haul/cargo count visible?"])
				_screenshot("21_mining_beam_released")
				_check_label_button_overlaps(mining, "Mining Minigame")
			else:
				_issue("SidescrollMining delegate not found — cannot drive beam simulation.")
				await get_tree().create_timer(MINING_RUN_SECONDS).timeout
				_screenshot("18_mining_static")

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
			_screenshot("18_mining_no_start")

	# ==================================================================
	# Phase 15 — Rocket Return
	# ==================================================================
	_report("## Phase 15 — Rocket Return")
	var ret := await _load_scene(RETURN_SCENE)
	if ret:
		await get_tree().create_timer(PANEL_SETTLE).timeout
		_meta("Phase 15 - Rocket Return", -1,
			"The rocket return animation — plays as the rocket flies back to Earth after a mission.",
			["Is the animation visually clear?",
			 "Is there any text indicating the rocket is heading home?",
			 "Any UI elements out of place?"])
		_screenshot("22_rocket_return")
		_check_offscreen_elements(ret, "Rocket Return")
		_check_for_placeholder_text(ret, "Rocket Return")

	# ==================================================================
	# Phase 16 — Mission Debrief
	# ==================================================================
	_report("## Phase 16 — Mission Debrief")
	var debrief := await _load_scene(DEBRIEF_SCENE)
	if debrief:
		await get_tree().create_timer(SCENE_SETTLE).timeout
		_meta("Phase 16 - Mission Debrief", -1,
			"The Mission Debrief scene — shows mission results and lets users scrap the rocket to unlock the next mission. In CI: payout data will be empty.",
			["Is there a visible title (e.g., 'Mission Complete')?",
			 "Is the CompleteButton visible and accessible?",
			 "Is the OrbitButton (secondary action) visible?",
			 "Does the debrief feel like a clear 'end of mission' moment?",
			 "Even with no payout data (CI), does the UI look intentional?"])
		_screenshot("23_mission_debrief")
		_check_offscreen_elements(debrief, "Mission Debrief")
		_check_label_button_overlaps(debrief, "Mission Debrief")

		var title_node := _find_node_by_name(debrief, "Title") as Label
		if title_node:
			var tt := title_node.text.strip_edges()
			if "Mission Complete" in tt:
				_report("  - Debrief title: '%s' ✓" % tt)
			elif "No Mission" in tt:
				_report("  - Debrief empty state: '%s' (expected in CI)." % tt)
			elif tt.length() == 0:
				_issue("Debrief Title label is empty.")
			else:
				_report("  - Debrief title: '%s'" % tt)
		else:
			_issue("Debrief scene missing Title label node.")

		if _find_node_by_name(debrief, "CompleteButton"):
			_report("  - CompleteButton present. ✓")
		else:
			_issue("Debrief scene missing CompleteButton — primary action not visible.")

		if _find_node_by_name(debrief, "OrbitButton"):
			_report("  - OrbitButton present. ✓")
		else:
			_issue("Debrief scene missing OrbitButton — secondary action not visible.")

		_check_for_placeholder_text(debrief, "Mission Debrief")

	# ==================================================================
	# Phase 17 — Asteroid / Candidate Detail & Annotation
	# ==================================================================
	_report("## Phase 17 — Asteroid Detail & Annotation (citizen science)")
	var detail := await _load_scene(ASTEROID_DETAIL_SCENE)
	if detail:
		await get_tree().create_timer(PANEL_SETTLE).timeout
		_meta("Phase 17 - Candidate Detail View (empty canvas)", 3,
			"The annotation view for reviewing asteroid or TESS planet candidate images. Users draw on this canvas to mark transit dips or notable features — the citizen science component. This screenshot shows the view before any annotation.",
			["Are the annotation toolbar buttons (Pen, Clear, Save) visible?",
			 "Are drawing mode buttons (free, rect, circle) visible?",
			 "Is there a back button to exit this view?",
			 "Is the drawing canvas area clearly defined?",
			 "Would a new user understand they're supposed to draw/annotate something here?",
			 "Is there any explanatory text about what to annotate and why?"])
		_screenshot("24_candidate_detail_empty_canvas")
		_check_offscreen_elements(detail, "Asteroid Detail View")
		_check_label_button_overlaps(detail, "Asteroid Detail View")

		for btn_text in ["Pen", "Clear", "Save"]:
			if _find_button_with_text(detail, btn_text):
				_report("  - '%s' annotation button present. ✓" % btn_text)
			else:
				_issue("Asteroid detail view missing '%s' annotation button." % btn_text)

		for btn_name in ["PenFreeButton", "PenRectButton", "PenCircleButton"]:
			if _find_node_by_name(detail, btn_name):
				_report("  - %s present. ✓" % btn_name)
			else:
				_issue("Asteroid detail view missing drawing mode button '%s'." % btn_name)

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
			# Activate pen mode, then simulate a drawing stroke across the canvas
			var pen_btn := _find_button_with_text(detail, "Pen")
			if pen_btn:
				_click(pen_btn)
				await get_tree().create_timer(0.3).timeout
			var canvas_rect := (drawing_canvas as Control).get_global_rect()
			var cx := canvas_rect.position.x + canvas_rect.size.x * 0.5
			var cy := canvas_rect.position.y + canvas_rect.size.y * 0.5
			# Press
			var press := InputEventMouseButton.new()
			press.button_index = MOUSE_BUTTON_LEFT
			press.pressed = true
			press.position = Vector2(cx - 80, cy)
			Input.parse_input_event(press)
			await get_tree().create_timer(0.05).timeout
			# Drag a transit-dip curve shape
			for i in range(10):
				var motion := InputEventMouseMotion.new()
				motion.position = Vector2(cx - 80 + i * 16, cy + sin(float(i) / 2.5) * 28)
				motion.button_mask = MOUSE_BUTTON_MASK_LEFT
				Input.parse_input_event(motion)
				await get_tree().create_timer(0.03).timeout
			# Release
			var release := InputEventMouseButton.new()
			release.button_index = MOUSE_BUTTON_LEFT
			release.pressed = false
			release.position = Vector2(cx + 80, cy)
			Input.parse_input_event(release)
			await get_tree().create_timer(0.4).timeout

			_meta("Phase 17 - Candidate Detail View (after annotation stroke)", 3,
				"The annotation view after a simulated drawing stroke — shows the citizen science workflow in action.",
				["Is the annotation stroke visible on the canvas?",
				 "Is the annotation toolbar still accessible?",
				 "Is the Save button clearly visible so the user knows how to submit?",
				 "Does the overall annotation experience feel intuitive for a new user?"])
			_screenshot("25_candidate_detail_annotated")
		else:
			_issue("Asteroid detail view missing DrawingCanvas — annotation drawing is broken.")

		_check_for_placeholder_text(detail, "Asteroid Detail View")

	# ==================================================================
	# Phase 18 — Earth Base (post-M1 debrief / M2 state)
	# ==================================================================
	_report("## Phase 18 — Earth Base (returning from Mission 1 debrief)")
	_inject_tutorial_state(2, 0)
	var earth2 := await _load_scene(EARTH_MAIN_SCENE)
	if earth2:
		await get_tree().create_timer(SCENE_SETTLE).timeout
		_meta("Phase 18 - Earth Base (post-M1 debrief, M2 state)", 2,
			"Earth base after completing Mission 1 and returning from debrief. Tutorial should advance to Mission 2 instructions.",
			["Does the tutorial overlay update to reflect Mission 2?",
			 "Are all navigation buttons still present?",
			 "Does the base feel different from the M1 start state?",
			 "Does anything overlap or get clipped?"])
		_screenshot("26_earth_base_post_m1_debrief")
		_check_offscreen_elements(earth2, "Earth Base Post-M1")
		_check_label_button_overlaps(earth2, "Earth Base Post-M1")
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
		_issue("'%s' panel shows fewer than %d visible text elements (%d found)." \
			% [panel_name, minimum, visible.size()])
	else:
		_report("  - '%s' shows %d visible text elements. ✓" % [panel_name, visible.size()])


func _check_for_placeholder_text(root: Node, context: String) -> void:
	for lbl in _collect_all_labels(root):
		for p in ["TODO", "FIXME", "PLACEHOLDER", "Lorem ipsum", "???", "[unnamed]"]:
			if p.to_lower() in lbl.text.to_lower():
				_issue("Placeholder text in %s: \"%s\"" % [context, lbl.text.strip_edges()])


# ---------------------------------------------------------------------------
# UI overlap / off-screen helpers
# ---------------------------------------------------------------------------
func _collect_visible_controls(root: Node, out: Array) -> void:
	if not root:
		return
	# Skip children of non-visible Windows (e.g. AcceptDialog debug popups)
	if root is Window and not (root as Window).visible:
		return
	if root is Control:
		var ctrl := root as Control
		if ctrl.visible and ctrl.size.x > 2 and ctrl.size.y > 2:
			out.append(ctrl)
	for child in root.get_children():
		_collect_visible_controls(child, out)


func _check_offscreen_elements(root: Node, context: String) -> void:
	if not root:
		return
	var vp_size := get_viewport().get_visible_rect().size
	var controls: Array = []
	_collect_visible_controls(root, controls)
	for item in controls:
		var ctrl := item as Control
		# ScrollContainers intentionally clip content that extends beyond the viewport
		if _is_inside_scroll_container(ctrl):
			continue
		var r := ctrl.get_global_rect()
		if r.size.x < 4 or r.size.y < 4:
			continue
		# 2 px bleed tolerance for sub-pixel anti-aliasing
		if r.position.x < -2.0 or r.position.y < -2.0 \
		   or r.position.x + r.size.x > vp_size.x + 2.0 \
		   or r.position.y + r.size.y > vp_size.y + 2.0:
			_issue("OFF-SCREEN: '%s' (%s) rect=%s extends outside viewport %s in %s" % [
				ctrl.name, ctrl.get_class(), str(r), str(vp_size), context
			])


func _is_ancestor(ancestor: Node, node: Node) -> bool:
	var cur := node.get_parent()
	while cur:
		if cur == ancestor:
			return true
		cur = cur.get_parent()
	return false


func _is_inside_scroll_container(ctrl: Control) -> bool:
	var parent := ctrl.get_parent()
	while parent:
		if parent is ScrollContainer:
			return true
		parent = parent.get_parent()
	return false


func _check_label_button_overlaps(root: Node, context: String) -> void:
	if not root:
		return
	var vp_size := get_viewport().get_visible_rect().size
	var vp_rect := Rect2(Vector2.ZERO, vp_size)
	var all_controls: Array = []
	_collect_visible_controls(root, all_controls)
	var labels: Array = all_controls.filter(func(n): return n is Label)
	var buttons: Array = all_controls.filter(func(n): return n is Button)
	for lbl_item in labels:
		var lbl := lbl_item as Label
		if lbl.text.strip_edges().length() == 0:
			continue
		var lr := lbl.get_global_rect()
		if lr.size.x < 4 or lr.size.y < 4:
			continue
		# Skip elements not actually visible within the viewport (e.g. scrolled off-screen)
		if not lr.intersects(vp_rect):
			continue
		for btn_item in buttons:
			var btn := btn_item as Button
			if _is_ancestor(btn, lbl):
				continue   # label is inside button — expected
			var br := btn.get_global_rect()
			if not br.intersects(vp_rect):
				continue
			if lr.intersects(br):
				_issue("UI OVERLAP: Label '%s' overlaps Button '%s' in %s" % [
					lbl.text.strip_edges(), btn.text.strip_edges(), context
				])


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
# Screenshot + manifest
# ---------------------------------------------------------------------------
func _meta(phase: String, mission_stage: int, description: String, what_to_check: Array) -> void:
	_cur_meta = {
		"phase": phase,
		"mission_stage": mission_stage,
		"description": description,
		"what_to_check": what_to_check
	}


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
		return

	# Append to manifest
	var entry := _cur_meta.duplicate()
	entry["index"] = _screenshot_index
	entry["filename"] = "%02d_%s.png" % [_screenshot_index, label]
	entry["issues_detected_at_this_point"] = _issues.slice(_issues.size() - 1) \
		if not _issues.is_empty() else []
	_manifest_entries.append(entry)
	_cur_meta = {}


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

	var critical_keywords := [
		"CRITICAL:", "cannot proceed", "broken",
		"blank coach overlay", "navigation impaired", "minigame is broken",
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

	# Write report
	var file := FileAccess.open(REPORT_PATH, FileAccess.WRITE)
	if file:
		for line in _report_lines:
			file.store_line(line)
		file.close()
		print("[UX_TOUR] Report written to: " + REPORT_PATH)
	else:
		push_error("[UX_TOUR] Could not write report: " + REPORT_PATH)

	_write_manifest()
	_write_ai_context()

	await get_tree().create_timer(0.5).timeout
	get_tree().quit(0)


# ---------------------------------------------------------------------------
# Manifest output (structured JSON for AI review)
# ---------------------------------------------------------------------------
func _write_manifest() -> void:
	var manifest := {
		"tour_version": "2",
		"generated_at": Time.get_datetime_string_from_system(),
		"total_screenshots": _screenshot_index,
		"total_issues": _issues.size(),
		"all_issues": _issues,
		"screenshots": _manifest_entries
	}
	var f := FileAccess.open(MANIFEST_PATH, FileAccess.WRITE)
	if f:
		f.store_string(JSON.stringify(manifest, "  "))
		f.close()
		print("[UX_TOUR] Manifest written to: " + MANIFEST_PATH)
	else:
		push_error("[UX_TOUR] Could not write manifest: " + MANIFEST_PATH)


# ---------------------------------------------------------------------------
# AI context readme (explains game + review questions)
# ---------------------------------------------------------------------------
func _write_ai_context() -> void:
	var lines: Array[String] = [
		"# Planet Hunters Experiment 1 — UX Tour AI Review Context",
		"",
		"## What is this game?",
		"",
		"Planet Hunters Experiment 1 is a citizen science mobile game where players:",
		"- Build and launch rockets to mine asteroids and visit exoplanet candidates",
		"- Complete a 4-mission tutorial that teaches all core mechanics",
		"- Annotate real TESS space telescope data (drawing on planet candidate images)",
		"- After the tutorial, enter Free Operations (sandbox) to run missions freely",
		"",
		"## Mission Flow — what 'going through all levels' means",
		"",
		"| Stage | Name | Key mechanics introduced |",
		"|-------|------|--------------------------|",
		"| M1    | First Mining Trip | Control Station, Launchpad, basic mining, debrief |",
		"| M2    | Contractor Missions | Contractor bonus system, better rockets |",
		"| M3    | TESS Planet Candidates | Real exoplanet data as targets, annotation view |",
		"| M4    | Scanner + Drones | Scanner Station build objective, drone mining mode |",
		"| Sandbox | Free Operations | All mechanics unlocked, user-directed play |",
		"",
		"## What 'annotation' means",
		"",
		"In Missions 3+, users visit TESS planet candidates (real NASA/ESA exoplanet data).",
		"The Candidate Detail View (asteroid_detail_view.tscn) lets users draw on these",
		"images to mark transit dips or notable surface features. This is the citizen",
		"science contribution — annotations feed into real research pipelines.",
		"",
		"## Screenshot groups and what to look for",
		"",
		"### Level coverage (question 1)",
		"Look at screenshots prefixed: stage2_*, stage3_*, stage4_*, stage5_*",
		"These show earth base and launchpad at each mission stage with injected state.",
		"The tutorial coach overlay text changes at each stage — check that it reflects",
		"the correct mission objective for that level.",
		"",
		"### UI overlaps and off-screen elements (question 2)",
		"The ux_report.md lists all detected OFF-SCREEN and UI OVERLAP issues.",
		"For each screenshot, also visually check:",
		"- Is any text box appearing over a button (label occluding an interactive element)?",
		"- Is any UI element clipped or hanging off the screen edges?",
		"- Is any important button hidden behind another element?",
		"",
		"### Flow and tutorial clarity (question 3)",
		"For each screenshot, consider as a first-time user:",
		"- Would you know what to do next without reading a manual?",
		"- Is the tutorial instruction (coach overlay) clear and actionable?",
		"- Does the UI use game jargon a new user wouldn't understand?",
		"- Is the path from 'I just arrived at this screen' to 'I did the thing' obvious?",
		"",
		"## CI limitations (expected gaps)",
		"",
		"- **Empty target lists**: New Mission Panel and Satellite Station Panel show no",
		"  targets in CI because there is no live Supabase connection. This is expected.",
		"- **Payout data**: Mission Debrief shows empty payout — expected in CI.",
		"- **Tutorial state injection**: Stage progression screenshots inject state via",
		"  config file — full scene reactivity may vary.",
		"",
		"## How to use tour_manifest.json",
		"",
		"Each entry in `screenshots[]` has:",
		"  - filename: the PNG filename",
		"  - phase: human-readable phase name",
		"  - mission_stage: 0=pre-tutorial, 1=M1, 2=M2, 3=M3, 4=M4, 5=sandbox, -1=panel/overlay",
		"  - description: what this screen represents",
		"  - what_to_check: specific questions to answer for this screenshot",
		"",
	]
	var f := FileAccess.open(AI_CONTEXT_PATH, FileAccess.WRITE)
	if f:
		for line in lines:
			f.store_line(line)
		f.close()
		print("[UX_TOUR] AI context written to: " + AI_CONTEXT_PATH)
	else:
		push_error("[UX_TOUR] Could not write AI context: " + AI_CONTEXT_PATH)
