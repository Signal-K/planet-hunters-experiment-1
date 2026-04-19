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
const RocketsManager  := preload("res://Scripts/Utils/RocketsManager.gd")
const FirstTimeMechanicTracker := preload("res://Scripts/Utils/FirstTimeMechanicTracker.gd")

const EARTH_MAIN_SCENE        := "res://Scenes/Earth/earth_base_1.tscn"
const DEBRIEF_SCENE           := "res://Scenes/Earth/mission_debrief_v2.tscn"
const LAUNCHPAD_SCENE         := "res://Scenes/Earth/earth_launchpad.tscn"
const TRANSIT_SCENE           := "res://Scenes/Transitions/rocket_transit.tscn"
const ASCENT_SCENE            := "res://Scenes/Transitions/rocket_ascent.tscn"
const RETURN_SCENE            := "res://Scenes/Transitions/rocket_return.tscn"
const NEW_MISSION_PANEL_SCENE := "res://Scenes/UI/NewMissionPanel.tscn"
const SUBCONTRACTORS_SCENE    := "res://Scenes/UI/SubcontractorsPanel.tscn"
const ROCKET_SELECTOR_SCENE   := "res://Scenes/UI/LaunchWizard.tscn"
const MENU_PANEL_SCENE        := "res://Scenes/UI/MenuPanel.tscn"
const TUTORIAL_OVERLAY_SCENE  := "res://Scenes/UI/TutorialCoachOverlay.tscn"
const CONTROL_STATION_SCENE   := "res://Scenes/UI/ControlStationPanel.tscn"
const SATELLITE_STATION_SCENE := "res://Scenes/UI/SatelliteStationPanel.tscn"
const MINING_MINIGAME_SCENE   := "res://Scenes/UI/MiningMinigame.tscn"
const MINING_PRACTICE_SCENE   := "res://Scenes/UI/MiningPracticePanel.tscn"
const ASTEROID_DETAIL_SCENE   := "res://Scenes/UI/AsteroidDetail/asteroid_detail_view.tscn"
const SPACE_MAP_SCENE         := "res://Scenes/UI/SpaceMap/space_map.tscn"

const DEFAULT_MINING_RUN_SECONDS := 12.0
const DEFAULT_SCENE_SETTLE  := 2.5
const DEFAULT_PANEL_SETTLE  := 2.0
const DEFAULT_ANIM_SETTLE   := 1.0
const DEFAULT_SNAP_SETTLE   := 2.0   # shorter settle for stage-snapshot phases

var _mining_run_seconds := DEFAULT_MINING_RUN_SECONDS
var _scene_settle := DEFAULT_SCENE_SETTLE
var _panel_settle := DEFAULT_PANEL_SETTLE
var _anim_settle := DEFAULT_ANIM_SETTLE
var _snap_settle := DEFAULT_SNAP_SETTLE

# ---------------------------------------------------------------------------
# State
# ---------------------------------------------------------------------------
var _screenshot_index := 0
var _report_lines: Array[String] = []
var _issues: Array[String] = []
var _active_scene: Node = null
var _manifest_entries: Array = []
var _cur_meta: Dictionary = {}   # set before each _screenshot() call

const _STAGE_TUTORIAL_BASE_STEP := {
	1: {"step": 0, "skipped": false},
	2: {"step": 0, "skipped": false},
	3: {"step": 0, "skipped": false},
	4: {"step": 1, "skipped": false},
	5: {"step": 0, "skipped": true}
}

const _STAGE_TUTORIAL_LAUNCHPAD_STEP := {
	2: {"step": 0, "skipped": false},
	3: {"step": 1, "skipped": false},
	4: {"step": 2, "skipped": false},
	5: {"step": 0, "skipped": true}
}

var _requested_mission := ""
var _is_sandbox := false

# ---------------------------------------------------------------------------
# Entry
# ---------------------------------------------------------------------------
func _ready() -> void:
	_parse_args()
	_configure_runtime_timings()
	DirAccess.make_dir_recursive_absolute(SCREENSHOT_DIR)
	_log_header()
	_run_tour.call_deferred()

func _parse_args() -> void:
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--mission="):
			_requested_mission = arg.split("=")[1].to_upper()
		elif arg == "--sandbox":
			_is_sandbox = true
		elif arg == "--mining-only":
			_requested_mission = "MINING"
	
	if _requested_mission != "":
		print("[UX_TOUR] Requested mission: ", _requested_mission)
	if _is_sandbox:
		print("[UX_TOUR] Sandbox mode enabled.")


# ---------------------------------------------------------------------------
# Scene loading
# ---------------------------------------------------------------------------
func _load_scene(path: String) -> Node:
	if _active_scene and is_instance_valid(_active_scene):
		if _active_scene.get_parent():
			_active_scene.get_parent().remove_child(_active_scene)
		_active_scene.queue_free()
		_active_scene = null
		if get_tree() != null:
			get_tree().current_scene = self
		await _wait(0.3)
	# Remove any CanvasLayer overlays (e.g. MechanicIntroOverlay) that were
	# parented to tree.root by game systems rather than to the active scene.
	# These persist across _load_scene() calls and bleed into later screenshots.
	for child in get_tree().root.get_children():
		if child is CanvasLayer and child != self and not child.is_ancestor_of(self):
			child.queue_free()

	var packed: PackedScene = load(path)
	if not packed:
		_issue("CRITICAL: Could not load scene: %s" % path)
		return null
	var instance := packed.instantiate()
	get_tree().root.add_child(instance)
	get_tree().current_scene = instance
	# For full-screen Control panels loaded into a plain Node parent, the anchor
	# layout may not compute the correct size until the node has been in the tree
	# for a frame. Force the rect so children compute positions against the real
	# viewport size from the start.
	if instance is Control:
		var vp := get_viewport().get_visible_rect()
		(instance as Control).set_deferred("position", vp.position)
		(instance as Control).set_deferred("size", vp.size)
	_active_scene = instance
	return instance

func _wait(seconds: float) -> void:
	var tree := get_tree()
	if tree == null:
		return
	var timer := tree.create_timer(seconds, true, false, true)
	await timer.timeout


# ---------------------------------------------------------------------------
# Tutorial state injection
# Writes tutorial_v2.cfg so the next TutorialController._ready() picks it up.
# ---------------------------------------------------------------------------
func _inject_tutorial_state(stage: int, step: int = 0, skipped: bool = false) -> void:
	var cfg := ConfigFile.new()
	cfg.set_value("state", "current_stage", stage)
	cfg.set_value("state", "current_step_index", step)
	cfg.set_value("state", "stage_lock", 0)
	cfg.set_value("state", "skipped", skipped)
	cfg.set_value("state", "completed_actions", {})
	cfg.set_value("state", "completed_actions_by_stage", {})
	cfg.set_value("state", "completed_steps_by_stage", {})
	cfg.save("user://tutorial_v2.cfg")

func _stage_targets(stage: int) -> Array:
	match stage:
		1:
			var predefined := RocketsManager.get_predefined_mission_target(1)
			return [predefined] if not predefined.is_empty() else []
		2:
			return RocketsManager.get_mission2_targets()
		3:
			return RocketsManager.get_mission3_targets()
		4:
			return RocketsManager.get_mission4_targets()
		_:
			var targets := RocketsManager.get_mission4_targets()
			targets.append_array([
				{
					"id": "free-ops-asteroid-117",
					"label": "117 Lomia",
					"type": "asteroid",
					"distance_au": 17.5,
					"required_level": 3,
					"science_blurb": "Nickel-rich belt object with stable contractor routes."
				},
				{
					"id": "free-ops-tess-901",
					"label": "TOI-901 b",
					"type": "planet",
					"distance_au": 24.0,
					"required_level": 3,
					"science_blurb": "Confirmed TESS candidate with high-value silicate layers."
				}
			])
			return targets

func _inject_progress_state(stage: int, with_launchpad_targeting: bool = false) -> void:
	var app_node = get_tree().root.get_node_or_null("AppController")
	if app_node:
		app_node.set("is_ux_tour_running", true)

	RocketsManager.reset_state()
	RocketsManager.clear_returned_mission()
	RocketsManager.clear_preview_target()
	var state := RocketsManager.load_state()
	
	if _is_sandbox:
		state["completed_mission_badges"] = ["mission-1", "mission-2", "mission-3", "mission-4"]
		state["mission_progress_completed"] = 4
		state["scanner_unlocked"] = true
		state["scanner_station_built"] = true
		state["control_station_built"] = true
		state["unlocked"] = ["starterrocket1", "starterrocket2", "starterrocket3"]
		# Add a billion francs for sandbox testing
		if app_node and app_node.has_method("add_franc_balance"):
			app_node.add_franc_balance(1000000000, "sandbox_tour")
		state["detected_targets"] = _stage_targets(5)
	else:
		var completed: int = maxi(stage - 1, 0)
		var badges: Array = []
		for idx in range(completed):
			badges.append("mission-%d" % (idx + 1))
		state["completed_mission_badges"] = badges
		state["mission_progress_completed"] = completed
		state["scanner_unlocked"] = completed >= 3
		state["scanner_station_built"] = stage >= 4
		state["control_station_built"] = stage >= 2
		state["unlocked"] = ["starterrocket1"]
		if stage >= 2 and not state["unlocked"].has("starterrocket2"):
			state["unlocked"].append("starterrocket2")
		if stage >= 4 and not state["unlocked"].has("starterrocket3"):
			state["unlocked"].append("starterrocket3")
		state["detected_targets"] = _stage_targets(stage)
		
		# Give reasonable starting balance for 'sandbox play' of this stage
		if app_node and app_node.has_method("add_franc_balance"):
			var balance := 1000
			match stage:
				2: balance = 500000000 # 500M
				3: balance = 1000000000 # 1B
				4: balance = 3000000000 # 3B
			app_node.add_franc_balance(balance, "sandbox_tour")

	state["operation_mode"] = "contract"
	state["selected_target"] = ""
	state["trip_contract_offer"] = {}
	state["placed"] = []
	
	if with_launchpad_targeting:
		var rocket_type := "starterrocket1"
		if stage >= 4:
			rocket_type = "starterrocket3"
		elif stage >= 2:
			rocket_type = "starterrocket2"
		state["placed"] = [{
			"type": rocket_type,
			"id": "%s-ux-tour-stage-%d" % [rocket_type, stage],
			"x": 960.0,
			"y": 850.0,
			"status": "awaitingLaunch"
		}]
	
	RocketsManager.save_state(state)
	var trip_targets: Array = state.get("detected_targets", [])
	RocketsManager.ensure_trip_contract_offer(trip_targets)
	if with_launchpad_targeting:
		RocketsManager.select_trip_contractor("aegis_defense")

func _reset_root_tutorial_runtime() -> void:
	var root := get_tree().root
	if root == null:
		return
	for node_name in ["TutorialCoachOverlay", "TutorialController"]:
		var node = root.get_node_or_null(node_name)
		if node != null:
			node.queue_free()
	await get_tree().process_frame
	await get_tree().process_frame

func _prime_launchpad_scene(scene_root: Node) -> void:
	if scene_root == null:
		return
	var launchpad = scene_root.get_node_or_null("StructuresLayer/Launchpad")
	if launchpad == null:
		return
	if launchpad.has_method("_populate_targets"):
		launchpad._populate_targets()
	if launchpad.has_method("_show_selector_panel"):
		launchpad._show_selector_panel()

func _inject_stage_snapshot_state(stage: int, launchpad_view: bool = false) -> void:
	var tutorial_cfg: Dictionary = _STAGE_TUTORIAL_LAUNCHPAD_STEP.get(stage, {"step": 0, "skipped": false}) if launchpad_view else _STAGE_TUTORIAL_BASE_STEP.get(stage, {"step": 0, "skipped": false})
	_inject_progress_state(stage, launchpad_view)
	_inject_tutorial_state(stage, int(tutorial_cfg.get("step", 0)), bool(tutorial_cfg.get("skipped", false)))
	await _reset_root_tutorial_runtime()

func _inject_debrief_state() -> void:
	_inject_progress_state(1, false)
	RocketsManager.set_returned_mission(
		"starterrocket1-ux-tour",
		"mission-1-training-target",
		"433 Eros",
		"asteroid",
		"contract",
		{
			"trip_contractor_id": "aegis_defense",
			"trip_contractor_name": "Aegis Defense Systems",
			"trip_requested_minerals": {"Iron": 130, "Nickel": 95},
			"mining_run_collected": {"Iron": 148, "Nickel": 104}
		}
	)

func _load_rocket_selector_showcase() -> Node:
	if _active_scene and is_instance_valid(_active_scene):
		if _active_scene.get_parent():
			_active_scene.get_parent().remove_child(_active_scene)
		_active_scene.queue_free()
		_active_scene = null
		if get_tree() != null:
			get_tree().current_scene = self
		await _wait(0.3)
	var shell := Control.new()
	shell.name = "RocketSelectorShowcase"
	shell.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	get_tree().root.add_child(shell)
	get_tree().current_scene = shell
	var bg := ColorRect.new()
	bg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	bg.color = Color(0.03, 0.04, 0.08, 1.0)
	shell.add_child(bg)
	var frame := PanelContainer.new()
	frame.set_anchors_preset(Control.PRESET_CENTER)
	frame.anchor_left = 0.12
	frame.anchor_top = 0.10
	frame.anchor_right = 0.88
	frame.anchor_bottom = 0.90
	frame.offset_left = 0.0
	frame.offset_top = 0.0
	frame.offset_right = 0.0
	frame.offset_bottom = 0.0
	shell.add_child(frame)
	var panel_style = StyleBoxFlat.new()
	panel_style.bg_color = Color(0.06, 0.09, 0.16, 0.98)
	panel_style.border_color = Color(0.28, 0.88, 0.96, 1.0)
	panel_style.set_border_width_all(2)
	panel_style.set_corner_radius_all(10)
	panel_style.content_margin_left = 24
	panel_style.content_margin_top = 24
	panel_style.content_margin_right = 24
	panel_style.content_margin_bottom = 24
	frame.add_theme_stylebox_override("panel", panel_style)
	var packed: PackedScene = load(ROCKET_SELECTOR_SCENE)
	if packed == null:
		_issue("CRITICAL: Could not load rocket selector showcase scene.")
		return null
	var selector := packed.instantiate()
	frame.add_child(selector)
	_active_scene = shell
	return shell


# ---------------------------------------------------------------------------
# Specific Mission Tours
# ---------------------------------------------------------------------------
func _run_specific_mission_tour(mission: String) -> void:
	_report("## Specific Mission Tour: %s" % mission)
	var stage := 1
	match mission:
		"M1": stage = 1
		"M2": stage = 2
		"M3": stage = 3
		"M4": stage = 4
		"FREE_OPS", "M5": stage = 5
		"MINING":
			await _run_mining_only_tour()
			return
		_:
			_issue("Unknown mission requested: %s" % mission)
			_finish()
			return

	_report("  - Injecting state for stage %d..." % stage)
	await _inject_stage_snapshot_state(stage, false)
	
	_report("  - Loading EARTH_MAIN_SCENE...")
	var earth := await _load_scene(EARTH_MAIN_SCENE)
	if not earth:
		_finish()
		return
	await _wait(_scene_settle)
	await _screenshot("tour_%s_01_earth_base" % mission)
	
	_report("  - Moving to Launchpad...")
	await _inject_stage_snapshot_state(stage, true)
	var lp := await _load_scene(LAUNCHPAD_SCENE)
	if lp:
		_prime_launchpad_scene(lp)
		await _wait(_panel_settle)
		await _screenshot("tour_%s_02_launchpad" % mission)
	
	_report("  - Moving to Transit...")
	var transit := await _load_scene(TRANSIT_SCENE)
	if transit:
		await _wait(_scene_settle)
		await _screenshot("tour_%s_03_transit" % mission)
	
	_report("  - Moving to Mining...")
	var mining := await _load_scene(MINING_MINIGAME_SCENE)
	if mining:
		var targets := _stage_targets(stage)
		var target = targets[0] if not targets.is_empty() else {}
		var target_id = str(target.get("id", "tour-target"))
		if mining.has_method("start_mining"):
			mining.call(
				"start_mining",
				false, 1, target_id,
				{"Iron": 10, "Nickel": 10},
				0.8,
				{"mission_mode": "contractor"}
			)
			await _wait(_scene_settle)
			await _screenshot("tour_%s_04_mining" % mission)
	
	_report("  - Tour for %s complete." % mission)
	_finish()

func _run_mining_only_tour() -> void:
	_report("## Mining Only Tour")
	_is_sandbox = true # ensure everything is unlocked
	_inject_progress_state(5, false)
	var mining := await _load_scene(MINING_MINIGAME_SCENE)
	if mining:
		if mining.has_method("start_mining"):
			mining.call(
				"start_mining",
				false, 3, "sandbox-asteroid",
				{"Iron": 50, "Gold": 20, "Platinum": 10},
				0.9,
				{"mission_mode": "free_ops"}
			)
			await _wait(_scene_settle)
			await _screenshot("tour_mining_sandbox")
	_finish()

# ---------------------------------------------------------------------------
# State wipe — clears all persisted user:// state so each sandbox tour run
# starts from a fully clean environment, regardless of previous runs.
# ---------------------------------------------------------------------------
func _wipe_state() -> void:
	_report("[SANDBOX] Wiping all persisted state for a clean run...")
	var paths := [
		"user://rockets_state.json",
		"user://tutorial_v2.cfg",
		"user://subcontractors.json",
		"user://mission_logs.json",
		"user://franc_balance.cfg",
		"user://experience.cfg",
		"user://mining_inventory.json",
		"user://mineral_market.json",
		"user://classification_consensus.json",
		"user://earth_inventory.json",
		"user://satellite_station.cfg",
		"user://mechanic_intros_seen.json",
		"user://planet_hunters_intro_v1.cfg",
		"user://rocket_unlock_popups.cfg",
	]
	var wiped := 0
	for path in paths:
		if FileAccess.file_exists(path):
			DirAccess.remove_absolute(path)
			wiped += 1
	_report("[SANDBOX] Wiped %d state file(s). Starting from clean environment." % wiped)


# ---------------------------------------------------------------------------
# Sandbox Tour — Free Operations / post-M4 exploration
#
# Covers every sandbox / post-M3-M4 feature in a structured way:
#   S1  Earth Base (sandbox state, no tutorial overlay)
#   S2  Launchpad — target selection cycle 1 (asteroid)
#   S3  Transit — outbound to asteroid
#   S4  Mining — free_ops mode, drone deploy + mid-run
#   S5  Mission Debrief — cycle 1 results
#   S6  Earth Base — post-debrief, new target has appeared in pool
#   S7  Control Station — 2 concurrent missions (in-orbit + returning)
#   S8  Launchpad — cycle 2 (TESS planet target, non-linear ordering)
#   S9  Space Map — full free-ops target pool
#   S10 Satellite Station — scanner fully unlocked
#   S11 Menu Panel — all unlocks active
# ---------------------------------------------------------------------------
func _run_sandbox_tour() -> void:
	_report("[SANDBOX] ============================================")
	_report("[SANDBOX]  SANDBOX TOUR — Free Operations (post-M4)")
	_report("[SANDBOX] ============================================")

	# ------------------------------------------------------------------
	# Wipe state: guarantees no bleed from any previous run in this
	# container or on the host Godot userdata directory.
	# ------------------------------------------------------------------
	_wipe_state()

	# ==================================================================
	# Phase S1 — Earth Base (Full Sandbox State)
	# ==================================================================
	_report("[SANDBOX] ## Phase S1 — Earth Base (Sandbox State)")
	_inject_progress_state(5, false)
	_inject_tutorial_state(5, 0, true)
	await _reset_root_tutorial_runtime()

	var earth := await _load_scene(EARTH_MAIN_SCENE)
	if not earth:
		_report("[SANDBOX] FAILED to load EARTH_MAIN_SCENE — aborting sandbox tour.")
		_finish()
		return
	await _wait(_scene_settle)
	# Re-inject after settle: AppController._ready() can overwrite badges when
	# the scene initialises.  A second inject locks in the sandbox values.
	_inject_progress_state(5, false)
	await _wait(0.5)

	var state := RocketsManager.load_state()
	var badges: Array = state.get("completed_mission_badges", [])
	var unlocked: Array = state.get("unlocked", [])
	var targets: Array = state.get("detected_targets", [])
	_report("[SANDBOX]   Sandbox state confirmed:")
	_report("[SANDBOX]     completed_mission_badges : %s" % str(badges))
	_report("[SANDBOX]     unlocked rockets         : %s" % str(unlocked))
	_report("[SANDBOX]     detected_targets count   : %d" % targets.size())
	var asteroid_count := 0
	var planet_count := 0
	for t: Dictionary in targets:
		var tt: String = str(t.get("type", ""))
		if tt == "asteroid":
			asteroid_count += 1
			_report("[SANDBOX]       [asteroid] %s  %.1f AU" % [t.get("label", t.get("id", "?")), float(t.get("distance_au", 0.0))])
		elif tt == "planet":
			planet_count += 1
			_report("[SANDBOX]       [planet]   %s  %.1f AU" % [t.get("label", t.get("id", "?")), float(t.get("distance_au", 0.0))])
	_report("[SANDBOX]     asteroid targets: %d  |  planet targets: %d" % [asteroid_count, planet_count])
	_report("[SANDBOX]     scanner_station_built : %s" % str(state.get("scanner_station_built", false)))
	_report("[SANDBOX]     control_station_built : %s" % str(state.get("control_station_built", false)))

	var tut_node := get_tree().root.get_node_or_null("TutorialCoachOverlay")
	if tut_node and tut_node.visible:
		_issue("[SANDBOX] Tutorial overlay is visible in sandbox mode — should be hidden once all missions are complete.")
	else:
		_report("[SANDBOX]   ✓ Tutorial overlay correctly hidden in sandbox mode.")

	_meta("Sandbox S1 - Earth Base (Free Operations)", 5,
		"Earth base in full sandbox / Free Operations mode — all 4 tutorial missions complete, scanner station built, all rockets unlocked. No tutorial overlay should be visible.",
		["Is the tutorial overlay hidden?",
		 "Are all base structures visible (scanner station, control station)?",
		 "Is the FrancBalance HUD showing the sandbox balance?",
		 "Does the base feel like 'free play' rather than tutorial mode?",
		 "Does anything overlap or hang off screen?"])
	await _screenshot("sandbox_S1_earth_base")
	_check_offscreen_elements(earth, "Sandbox Earth Base")
	_check_for_placeholder_text(earth, "Sandbox Earth Base")

	# ==================================================================
	# Phase S2 — Launchpad: Target Selection, Cycle 1 (Asteroid)
	# ==================================================================
	_report("[SANDBOX] ## Phase S2 — Launchpad: Target Selection (Cycle 1: Asteroid)")
	_inject_progress_state(5, true)
	var lp := await _load_scene(LAUNCHPAD_SCENE)
	if lp:
		_prime_launchpad_scene(lp)
		await _wait(_panel_settle)
		var lp_state := RocketsManager.load_state()
		var lp_targets: Array = lp_state.get("detected_targets", [])
		var lp_ast := 0
		var lp_plan := 0
		for t: Dictionary in lp_targets:
			var tt := str(t.get("type", ""))
			if tt == "asteroid": lp_ast += 1
			elif tt == "planet": lp_plan += 1
		_report("[SANDBOX]   Launchpad target pool: %d total  (%d asteroid, %d planet)" % [lp_targets.size(), lp_ast, lp_plan])
		if lp_ast == 0:
			_issue("[SANDBOX] No asteroid targets in sandbox launchpad — free-ops target pool is incomplete.")
		if lp_plan == 0:
			_issue("[SANDBOX] No planet/TESS targets in sandbox launchpad — free-ops target pool is incomplete.")
		_meta("Sandbox S2 - Launchpad Target Selection (Cycle 1: Asteroid)", 5,
			"Launchpad target selector in free-ops mode — should show the full mixed pool of asteroid and TESS planet targets. Player selects an asteroid for Cycle 1.",
			["Are both asteroid and planet/TESS targets visible in the list?",
			 "Is the distance (AU) shown for each target?",
			 "Are planet targets visually distinct from asteroids (e.g. blue border)?",
			 "Can the player freely choose any target (not locked to one path)?",
			 "Does the list scroll without clipping?"])
		await _screenshot("sandbox_S2_launchpad_target_selection_c1")
		_check_offscreen_elements(lp, "Sandbox Launchpad C1")

	# ==================================================================
	# Phase S3 — Transit (Cycle 1: Outbound to Asteroid)
	# ==================================================================
	_report("[SANDBOX] ## Phase S3 — Transit (Cycle 1: Asteroid outbound)")
	_inject_progress_state(5, true)
	RocketsManager.set_preview_target("free-ops-asteroid-117", "117 Lomia", "asteroid")
	var transit := await _load_scene(TRANSIT_SCENE)
	if transit:
		await _wait(_scene_settle)
		_report("[SANDBOX]   Transit scene loaded — outbound to 117 Lomia (asteroid, 17.5 AU).")
		_meta("Sandbox S3 - Transit (Asteroid Outbound, 17.5 AU)", 5,
			"Outbound transit to free-ops asteroid 117 Lomia (17.5 AU). 4-phase animation: EARTH_ORBIT → TRAVEL → TARGET_APPROACH → TARGET_ORBIT.",
			["Is the rocket animation playing?",
			 "Is the target name (117 Lomia) shown?",
			 "Is the current transit phase (EARTH_ORBIT / TRAVEL / etc.) indicated?",
			 "Is there an ETA or distance indicator?",
			 "Does the screen feel like meaningful travel rather than a loading screen?"])
		await _screenshot("sandbox_S3_transit_asteroid_outbound")

	# ==================================================================
	# Phase S4 — Mining (Cycle 1: Free-Ops Asteroid)
	# ==================================================================
	_report("[SANDBOX] ## Phase S4 — Mining (Cycle 1: free_ops asteroid, level 3)")
	var mining := await _load_scene(MINING_MINIGAME_SCENE)
	if mining:
		if mining.has_method("start_mining"):
			mining.call(
				"start_mining",
				false, 3, "free-ops-asteroid-117",
				{"Iron": 50, "Nickel": 30, "Gold": 15},
				0.9,
				{"mission_mode": "free_ops"}
			)
		await _wait(_scene_settle)
		_report("[SANDBOX]   Mining started: level 3 asteroid, free_ops mode, targets = Iron/Nickel/Gold.")
		_meta("Sandbox S4a - Mining (Asteroid, free_ops, initial terrain)", 5,
			"Mining minigame in free-ops mode — level-3 asteroid with Iron/Nickel/Gold. Higher drone count and yield than tutorial mining.",
			["Is the asteroid terrain rendered?",
			 "Are the target minerals (Iron/Nickel/Gold) shown in the UI?",
			 "Is the Deploy Drone button visible and enabled?",
			 "Are there any empty label or broken node warnings?"])
		await _screenshot("sandbox_S4a_mining_asteroid_initial")

		var deploy_btn := _find_button_with_text(mining, "Deploy")
		if not deploy_btn:
			deploy_btn = _find_button_with_text(mining, "DEPLOY")
		if deploy_btn and deploy_btn.visible:
			_report("[SANDBOX]   ✓ Deploy Drone button visible and enabled.")
			_click(deploy_btn)
			await _wait(_anim_settle)
			await _screenshot("sandbox_S4b_mining_asteroid_drone_deployed")
			_report("[SANDBOX]   Drone deployed — screenshot taken.")
		else:
			_issue("[SANDBOX] Deploy Drone button not found or hidden — sandbox mining entry is blocked.")

		await _wait(_mining_run_seconds)
		await _screenshot("sandbox_S4c_mining_asteroid_mid_run")
		_report("[SANDBOX]   Mining run complete (%.1f s)." % _mining_run_seconds)

	# ==================================================================
	# Phase S5 — Mission Debrief (Cycle 1)
	# ==================================================================
	_report("[SANDBOX] ## Phase S5 — Mission Debrief (Cycle 1: Asteroid)")
	_inject_progress_state(5, false)
	RocketsManager.set_returned_mission(
		"starterrocket2-sandbox-c1",
		"free-ops-asteroid-117",
		"117 Lomia",
		"asteroid",
		"free_ops",
		{
			"trip_contractor_id": "aegis_defense",
			"trip_contractor_name": "Aegis Defense Systems",
			"trip_requested_minerals": {"Iron": 50, "Nickel": 30},
			"mining_run_collected": {"Iron": 58, "Nickel": 34, "Gold": 12}
		}
	)
	var debrief := await _load_scene(DEBRIEF_SCENE)
	if debrief:
		await _wait(_panel_settle)
		_report("[SANDBOX]   Debrief loaded — returned from 117 Lomia (Iron 58, Nickel 34, Gold 12).")
		_meta("Sandbox S5 - Mission Debrief (Cycle 1: Asteroid)", 5,
			"Mission debrief after free-ops asteroid run. Should show minerals collected (Iron/Nickel/Gold), the franc payout, and a CTA to continue.",
			["Are the collected minerals listed (Iron/Nickel/Gold with quantities)?",
			 "Is the franc payout / bonus prominently shown?",
			 "Is there a 'Next Mission' or 'Return to Base' CTA?",
			 "Does the debrief show the free-ops contractor name (Aegis Defense)?",
			 "Does anything overlap or get clipped?"])
		await _screenshot("sandbox_S5_debrief_c1_asteroid")
		_check_offscreen_elements(debrief, "Sandbox Debrief C1")

	# ==================================================================
	# Phase S6 — Earth Base (Post-Debrief: New Missions Available)
	# Simulates the target pool refreshing with a newly-scanned TESS candidate.
	# ==================================================================
	_report("[SANDBOX] ## Phase S6 — Earth Base (Post-Debrief, new mission appeared)")
	_inject_progress_state(5, false)
	_inject_tutorial_state(5, 0, true)
	await _reset_root_tutorial_runtime()
	var refresh_state := RocketsManager.load_state()
	var refreshed_targets := _stage_targets(5)
	refreshed_targets.append({
		"id": "sandbox-new-tess-201",
		"label": "TOI-201 c",
		"type": "planet",
		"distance_au": 19.2,
		"required_level": 3,
		"science_blurb": "Newly scanned TESS candidate — potential biosignature markers."
	})
	refresh_state["detected_targets"] = refreshed_targets
	RocketsManager.save_state(refresh_state)

	var earth2 := await _load_scene(EARTH_MAIN_SCENE)
	if earth2:
		await _wait(_scene_settle)
		_report("[SANDBOX]   Earth base reloaded post-debrief.")
		_report("[SANDBOX]   Target pool now %d targets (added new TESS candidate TOI-201 c)." % refreshed_targets.size())
		_meta("Sandbox S6 - Earth Base (Post-Debrief, New Target Appeared)", 5,
			"Earth base after Cycle 1 debrief. The target pool has refreshed — a new TESS candidate (TOI-201 c) has been added, simulating the game offering new missions after each completed run.",
			["Does the base render correctly after returning from debrief?",
			 "Is the FrancBalance updated to reflect the Cycle 1 payout?",
			 "Is there any visual hint that new missions are available (badge, notification, etc.)?",
			 "Is the tutorial overlay still hidden?"])
		await _screenshot("sandbox_S6_earth_base_post_debrief_new_target")

	# ==================================================================
	# Phase S7 — Control Station (Multiple Concurrent Missions)
	# ==================================================================
	_report("[SANDBOX] ## Phase S7 — Control Station (2 concurrent missions)")
	_inject_progress_state(5, false)
	var multi_state := RocketsManager.load_state()
	var now_ts := int(Time.get_unix_time_from_system())
	multi_state["placed"] = [
		{"type": "starterrocket1", "id": "sr1-sandbox-orbit",     "x": 800.0, "y": 850.0, "status": "in-orbit"},
		{"type": "starterrocket2", "id": "sr2-sandbox-returning", "x": 960.0, "y": 850.0, "status": "returning"},
	]
	multi_state["missions"] = [
		{
			"rocket_id": "sr1-sandbox-orbit",
			"target": "free-ops-asteroid-117",
			"launch_time": now_ts - 60,
			"arrival_time": now_ts + 60,
			"operation_mode": "free_ops",
			"goingTo": "free-ops-asteroid-117",
			"location": ["free-ops-asteroid-117"]
		},
		{
			"rocket_id": "sr2-sandbox-returning",
			"target": "free-ops-tess-901",
			"launch_time": now_ts - 180,
			"arrival_time": now_ts - 30,
			"operation_mode": "free_ops",
			"goingTo": "home",
			"location": ["free-ops-tess-901"]
		}
	]
	RocketsManager.save_state(multi_state)
	_report("[SANDBOX]   Injected 2 concurrent missions: sr1 in-orbit @ 117 Lomia, sr2 returning from TOI-901 b.")
	var csp := await _load_scene(CONTROL_STATION_SCENE)
	if csp:
		await _wait(_panel_settle)
		_meta("Sandbox S7 - Control Station (2 Concurrent Missions)", 5,
			"Control Station showing 2 concurrent sandbox missions: SR1 in-orbit at 117 Lomia, SR2 returning from TOI-901 b. Tests multi-card layout at scale.",
			["Are both mission cards visible without scrolling?",
			 "Can the user tell which rocket is in-orbit (cyan) vs. returning (amber)?",
			 "Are the target names (117 Lomia, TOI-901 b) correct on each card?",
			 "Is there a RESUME button for in-orbit and INBOUND for returning?",
			 "Do cards fit without overflow at 2+ entries?"])
		await _screenshot("sandbox_S7_control_station_multi_mission")
		_check_offscreen_elements(csp, "Sandbox Control Station Multi")
		_check_label_button_overlaps(csp, "Sandbox Control Station Multi")

		if _find_label_with_text(csp, "IN-ORBIT"):
			_report("[SANDBOX]   ✓ IN-ORBIT badge present (sr1).")
		else:
			_issue("[SANDBOX] IN-ORBIT badge missing — first rocket card status is unclear.")
		if _find_label_with_text(csp, "RETURNING"):
			_report("[SANDBOX]   ✓ RETURNING badge present (sr2).")
		else:
			_issue("[SANDBOX] RETURNING badge missing — second rocket card status is unclear.")
		if _find_button_with_text(csp, "RESUME"):
			_report("[SANDBOX]   ✓ RESUME button present for in-orbit card.")
		else:
			_issue("[SANDBOX] RESUME button missing — player cannot navigate to in-orbit mission.")

	# Flush renderer after the heavy Control Station panel.  The panel rendered
	# with nodes overflowing the viewport; freeing it takes several frames and
	# can leave the render pipeline in a state where the next get_image() call
	# returns null.  Explicit frame drain + force_draw resets it.
	for _fi in range(12):
		await get_tree().process_frame
	RenderingServer.force_draw(false)
	await _wait(1.5)
	_report("[SANDBOX]   Renderer flush complete after Control Station.")

	# ==================================================================
	# Phase S8 — Launchpad: Cycle 2 (TESS Planet Target)
	# Demonstrates non-linear mission ordering.
	# ==================================================================
	_report("[SANDBOX] ## Phase S8 — Launchpad: Target Selection (Cycle 2: TESS Planet)")
	_inject_progress_state(5, true)
	var lp2 := await _load_scene(LAUNCHPAD_SCENE)
	if lp2:
		_prime_launchpad_scene(lp2)
		await _wait(_panel_settle)
		var lp2_state := RocketsManager.load_state()
		var lp2_targets: Array = lp2_state.get("detected_targets", [])
		var has_planet_target := false
		for t: Dictionary in lp2_targets:
			if str(t.get("type", "")) == "planet":
				has_planet_target = true
				_report("[SANDBOX]   Planet/TESS target available: %s  %.1f AU" % [
					t.get("label", t.get("id", "?")),
					float(t.get("distance_au", 0.0))
				])
		if not has_planet_target:
			_issue("[SANDBOX] No planet/TESS targets in Cycle 2 launchpad — non-linear mission ordering is broken.")
		_meta("Sandbox S8 - Launchpad Target Selection (Cycle 2: TESS Planet)", 5,
			"Launchpad re-opened for Cycle 2. Player can freely choose a TESS planet candidate this time, demonstrating non-linear mission ordering (not forced to repeat asteroid).",
			["Are TESS planet targets selectable (not greyed out)?",
			 "Is the TESS science blurb shown on the planet target card?",
			 "Does the [PLANET] prefix or distinct style appear on planet cards?",
			 "Is the fuel/range indicator shown for out-of-range targets?",
			 "Can the player pick a different target than Cycle 1 without any lock-in?"])
		await _screenshot("sandbox_S8_launchpad_tess_planet_c2")
		_check_offscreen_elements(lp2, "Sandbox Launchpad C2 TESS")

	# ==================================================================
	# Phase S9 — Space Map (Full Free-Ops Target Pool)
	# ==================================================================
	_report("[SANDBOX] ## Phase S9 — Space Map (sandbox target pool)")
	_inject_progress_state(5, false)
	var smap := await _load_scene(SPACE_MAP_SCENE)
	if smap:
		await _wait(_panel_settle)
		_report("[SANDBOX]   Space Map loaded — should show full asteroid + TESS planet mix.")
		_meta("Sandbox S9 - Space Map (Full Free-Ops Pool)", 5,
			"The star map in sandbox mode — shows all selectable asteroid and TESS planet candidate destinations across the full AU range.",
			["Are multiple targets shown (at least 4)?",
			 "Are planet and asteroid targets visually distinct on the map?",
			 "Is the AU scale / distance indicator present?",
			 "Does the map feel more populated than the tutorial's single-target view?",
			 "Are any target labels clipped or overlapping?"])
		await _screenshot("sandbox_S9_space_map")
		_check_offscreen_elements(smap, "Sandbox Space Map")

	# ==================================================================
	# Phase S10 — Satellite Station (Scanner Fully Unlocked)
	# ==================================================================
	_report("[SANDBOX] ## Phase S10 — Satellite Station (scanner unlocked, post-M4)")
	_inject_progress_state(5, false)
	var sat := await _load_scene(SATELLITE_STATION_SCENE)
	if sat:
		await _wait(_panel_settle)
		_report("[SANDBOX]   Satellite Station loaded (scanner_unlocked=true, station built=true).")
		_meta("Sandbox S10 - Satellite Station (Scanner Fully Unlocked)", 5,
			"Satellite Station panel in post-M4 sandbox state — the scanner is built and fully unlocked. The player can scan new TESS candidates to expand the target pool.",
			["Is the Scan button visible and enabled?",
			 "Are candidate images / anomaly thumbnails shown?",
			 "Is the 'scanner unlocked' state clearly different from the locked tutorial state?",
			 "Are there any broken images or empty placeholders?",
			 "Does the panel scroll correctly if there are many candidates?"])
		await _screenshot("sandbox_S10_satellite_station_unlocked")
		_check_offscreen_elements(sat, "Sandbox Satellite Station")
		_check_for_placeholder_text(sat, "Sandbox Satellite Station")

	# ==================================================================
	# Phase S11 — Menu Panel
	# ==================================================================
	_report("[SANDBOX] ## Phase S11 — Menu Panel")
	var menu := await _load_scene(MENU_PANEL_SCENE)
	if menu:
		await _wait(_panel_settle)
		_report("[SANDBOX]   Menu Panel loaded.")
		_meta("Sandbox S11 - Menu Panel (All Unlocks Active)", 5,
			"Main menu / settings panel from sandbox state — all unlocks complete. Should show all options without tutorial-gating.",
			["Are all menu options visible (not hidden behind tutorial gates)?",
			 "Is there a close/dismiss button?",
			 "Does any label overflow or get clipped?"])
		await _screenshot("sandbox_S11_menu_panel")

	# Summary
	_report("[SANDBOX] ============================================")
	_report("[SANDBOX]  Sandbox Tour Complete — %d phases" % 11)
	_report("[SANDBOX]  Phases covered:")
	_report("[SANDBOX]    S1  Earth Base          — sandbox state, no tutorial")
	_report("[SANDBOX]    S2  Launchpad C1         — target selection (asteroid)")
	_report("[SANDBOX]    S3  Transit C1           — outbound to asteroid")
	_report("[SANDBOX]    S4  Mining C1            — free_ops, drone + mid-run")
	_report("[SANDBOX]    S5  Debrief C1           — asteroid results")
	_report("[SANDBOX]    S6  Earth Base post-C1   — new TESS target appeared")
	_report("[SANDBOX]    S7  Control Station      — 2 concurrent missions")
	_report("[SANDBOX]    S8  Launchpad C2         — TESS planet, non-linear pick")
	_report("[SANDBOX]    S9  Space Map            — full free-ops pool")
	_report("[SANDBOX]    S10 Satellite Station    — scanner unlocked")
	_report("[SANDBOX]    S11 Menu Panel           — all unlocks active")
	_report("[SANDBOX] ============================================")

	_finish()


# ---------------------------------------------------------------------------
# Tour
# ---------------------------------------------------------------------------
func _run_tour() -> void:
	if _requested_mission != "":
		await _run_specific_mission_tour(_requested_mission)
		return

	if _is_sandbox:
		await _run_sandbox_tour()
		return

	# ==================================================================
	# Phase 1 — Startup / Intro Splash (fresh first-time user)
	# ==================================================================
	_report("## Phase 1 — Startup / Intro Splash")
	await _inject_stage_snapshot_state(1, false)
	_report("  - Loading EARTH_MAIN_SCENE: %s" % EARTH_MAIN_SCENE)
	var earth := await _load_scene(EARTH_MAIN_SCENE)
	if not earth:
		_report("  - FAILED to load EARTH_MAIN_SCENE")
		_finish()
		return

	_report("  - Scene loaded, waiting for settle (%d s)..." % _scene_settle)
	await _wait(_scene_settle)
	_meta("Phase 1 - Startup / Intro Splash", 0,
		"The very first screen a brand-new user sees when launching the game.",
		["Is there a clear Begin Mission CTA?",
		 "Is the game title / branding visible?",
		 "Are any UI elements cut off or hanging off screen edges?",
		 "Would a new user immediately know what to do?"])
	_report("  - Taking first screenshot: 01_startup_intro_splash")
	await _screenshot("01_startup_intro_splash")
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
		await _wait(_anim_settle)
	else:
		_report("  - Begin Mission button not found, proceeding directly.")

	_report("  - Taking second screenshot: 02_after_splash_dismissed")
	_meta("Phase 1 - After Splash Dismissed", 0,
		"Earth base hub immediately after the intro splash is dismissed.",
		["Is the tutorial coach overlay visible, guiding the user toward the Launchpad flow?",
		 "Are navigation buttons (menu, forward, back) visible?",
		 "Is the FrancBalance (currency) HUD element shown?"])
	await _screenshot("02_after_splash_dismissed")
	_report("  - Second screenshot taken.")

	# ==================================================================
	# Phase 2 — Earth Base (Mission 1 state)
	# ==================================================================
	_report("## Phase 2 — Earth Base (Mission 1 state)")
	await _wait(_anim_settle)
	_meta("Phase 2 - Earth Base Overview (M1)", 1,
		"Earth base hub with Mission 1 tutorial active — what a brand-new user sees after dismissing the splash.",
		["Is the tutorial overlay pointing the user toward the Mission 1 next step?",
		 "Are all main navigation elements visible and unobscured?",
		 "Is the FrancBalance HUD shown?",
		 "Does anything overlap or hang off the screen?"])
	await _screenshot("03_earth_base_m1_overview")
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
		_meta("Phase 2 - Tutorial Coach (M1 Step 1)", 1,
			"Tutorial coach overlay active on earth base, prompting the user into the Mission 1 launch flow.",
			["Is the step title readable and specific?",
			 "Is the instruction text clear and actionable for a new user?",
			 "Does the coach indicator point at the right element?",
			 "Is any tutorial text obscured by another UI element?"])
		await _screenshot("04_tutorial_coach_m1_step1")
		_inspect_tutorial_overlay(tut)
	else:
		_issue("Tutorial coach overlay not visible on first visit — new users may not know what to do.")

	_check_for_placeholder_text(earth, "Earth Base")

	# ==================================================================
	# Phase 2b — Mission Stage Progression Snapshots (base-only, M2 → Sandbox)
	# Keep this on Earth base so the tour follows authored progression rather
	# than bouncing into setup scenes between every mission stage.
	# ==================================================================
	_report("## Phase 2b — Mission Stage Progression Snapshots")
	var _stage_meta := {
		2: {
			"label": "Mission 2 (Contractor Bonus)",
			"desc": "Earth base after completing M1. User is now on M2 — the Control Station must be built before the next launch.",
			"checks": ["Does the tutorial prompt reflect the Control Station build requirement?",
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
		await _inject_stage_snapshot_state(stage, false)
		var earth_s := await _load_scene(EARTH_MAIN_SCENE)
		if earth_s:
			await _wait(_snap_settle)
			var sm: Dictionary = _stage_meta[stage]
			_meta("Phase 2b - Earth Base Stage %d (%s)" % [stage, sm["label"]], stage,
				sm["desc"], sm["checks"])
			await _screenshot("stage%d_earth_base" % stage)
			_check_offscreen_elements(earth_s, "Earth Base Stage %d" % stage)

	# ==================================================================
	# Phase 3 — Menu Panel
	# ==================================================================
	_report("## Phase 3 — Menu Panel")
	var menu := await _load_scene(MENU_PANEL_SCENE)
	if menu:
		await _wait(_panel_settle)
		_meta("Phase 3 - Menu Panel", -1,
			"The main menu / settings panel, accessible from the earth base.",
			["Is there a visible close/dismiss button so users can exit?",
			 "Are menu options clearly labelled?",
			 "Does any text overflow or get clipped?"])
		await _screenshot("05_menu_panel")
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
		await _wait(_panel_settle)
		_meta("Phase 4 - Tutorial Coach Overlay (standalone)", -1,
			"The tutorial coach overlay UI in isolation — appears throughout the game to guide new users step by step.",
			["Is there a clear step title?",
			 "Is the instruction message readable?",
			 "Does the overlay have enough contrast against game backgrounds?",
			 "Are any labels empty or showing placeholder text?"])
		await _screenshot("06_tutorial_coach_overlay")
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
	_report("## Phase 5 — Control Station Panel (empty state)")
	_inject_progress_state(4, false)
	var csp := await _load_scene(CONTROL_STATION_SCENE)
	if csp:
		await _wait(_panel_settle)
		_meta("Phase 5 - Control Station Panel (empty queue)", 4,
			"The Control Station panel with no missions in progress — optional fleet hub unlocked after Mission 3.",
			["Is there a visible close button?",
			 "Is the panel title 'CONTROL STATION' readable?",
			 "Does the empty queue message guide the user toward the Launchpad?",
			 "Are the ACTIVE and STORY tabs both visible?",
			 "Does anything overlap or get clipped at panel edges?"])
		await _screenshot("07_control_station_empty")
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
		var active_tab := _find_button_with_text(csp, "ACTIVE")
		if active_tab:
			_report("  - ACTIVE tab visible. ✓")
		else:
			_issue("Control Station Panel missing ACTIVE tab — users cannot see flight missions.")
		var story_tab := _find_button_with_text(csp, "STORY")
		if story_tab:
			_report("  - STORY tab visible. ✓")
		else:
			_issue("Control Station Panel missing STORY tab.")
		if _find_label_with_text(csp, "No missions"):
			_report("  - Empty queue message present. ✓")
		elif _find_label_with_text(csp, "Launchpad"):
			_report("  - Empty state directs user to Launchpad. ✓")
		else:
			_issue("Control Station Panel empty queue state has no guidance text — user may be confused.")

	# ==================================================================
	# Phase 5b — Control Station Panel (in-orbit mission)
	# ==================================================================
	_report("## Phase 5b — Control Station Panel (in-orbit mission card)")
	# Inject: stage 2, trip contractor selected (Rocketlab), one rocket in-orbit
	_inject_progress_state(4, false)
	RocketsManager.select_trip_contractor("rocketlab")
	var orbit_state := RocketsManager.load_state()
	var orbit_rocket_id := "starterrocket1-tour-orbit"
	orbit_state["placed"] = [{
		"type": "starterrocket1",
		"id": orbit_rocket_id,
		"x": 960.0, "y": 850.0,
		"status": "in-orbit"
	}]
	orbit_state["missions"] = [{
		"rocket_id": orbit_rocket_id,
		"target": "mission-1-training-target",
		"launch_time": int(Time.get_unix_time_from_system()) - 30,
		"arrival_time": int(Time.get_unix_time_from_system()) + 30,
		"operation_mode": "contract",
		"goingTo": "mission-1-training-target",
		"location": ["mission-1-training-target"]
	}]
	orbit_state["detected_targets"] = [{"id": "mission-1-training-target", "label": "433 Eros", "type": "asteroid"}]
	RocketsManager.save_state(orbit_state)
	var csp_orbit := await _load_scene(CONTROL_STATION_SCENE)
	if csp_orbit:
		await _wait(_panel_settle)
		_meta("Phase 5b - Control Station Panel (in-orbit mission card)", 4,
			"Control Station showing one rocket in orbit. Card should display: rocket name, IN-ORBIT badge, target, contractor name (Rocketlab), mineral chips (Fe/Ni), and a RESUME button.",
			["Is the rocket name visible on the card?",
			 "Is the IN-ORBIT status badge visible and correctly coloured (cyan)?",
			 "Is the target label shown with a forward arrow (→)?",
			 "Is the contractor name (e.g. Rocketlab) visible?",
			 "Are mineral chips visible (e.g. Fe, Ni with quantities)?",
			 "Is the RESUME button visible and styled as a primary CTA?",
			 "Does the card fit within the panel without scrolling or clipping?"])
		await _screenshot("07b_control_station_in_orbit")
		_check_offscreen_elements(csp_orbit, "Control Station In-Orbit")
		_check_label_button_overlaps(csp_orbit, "Control Station In-Orbit")
		_check_for_placeholder_text(csp_orbit, "Control Station In-Orbit")
		if _find_label_with_text(csp_orbit, "IN-ORBIT"):
			_report("  - IN-ORBIT status badge visible (with dot prefix). ✓")
		else:
			_issue("Control Station in-orbit card missing IN-ORBIT status badge — status not scannable at a glance.")
		if _find_button_with_text(csp_orbit, "RESUME"):
			_report("  - RESUME button present on in-orbit card. ✓")
		else:
			_issue("Control Station in-orbit card missing RESUME button — user cannot navigate to mission.")
		if _find_label_with_text(csp_orbit, "433 Eros") or _find_label_with_text(csp_orbit, "→"):
			_report("  - Target label visible on in-orbit card. ✓")
		else:
			_issue("Control Station in-orbit card missing target label.")
		if _find_label_with_text(csp_orbit, "Rocketlab"):
			_report("  - Contractor name (Rocketlab) visible on card. ✓")
		else:
			_issue("Control Station in-orbit card missing contractor name — user cannot see who ordered this mission.")
		# Check for at least one mineral chip (Fe or Ni)
		if _find_label_with_text(csp_orbit, "Fe") or _find_label_with_text(csp_orbit, "Ni"):
			_report("  - Mineral order chips visible on in-orbit card. ✓")
		else:
			_issue("Control Station in-orbit card missing mineral chips — user cannot see the delivery order.")

	# ==================================================================
	# Phase 5c — Control Station Panel (returning mission)
	# ==================================================================
	_report("## Phase 5c — Control Station Panel (returning mission card)")
	# Inject: same setup but rocket status = returning
	_inject_progress_state(4, false)
	RocketsManager.select_trip_contractor("rocketlab")
	var ret_state := RocketsManager.load_state()
	var ret_rocket_id := "starterrocket1-tour-return"
	ret_state["placed"] = [{
		"type": "starterrocket1",
		"id": ret_rocket_id,
		"x": 960.0, "y": 850.0,
		"status": "returning"
	}]
	ret_state["missions"] = [{
		"rocket_id": ret_rocket_id,
		"target": "mission-1-training-target",
		"launch_time": int(Time.get_unix_time_from_system()) - 90,
		"arrival_time": int(Time.get_unix_time_from_system()) - 30,
		"operation_mode": "contract",
		"goingTo": "home",
		"location": ["mission-1-training-target"]
	}]
	ret_state["detected_targets"] = [{"id": "mission-1-training-target", "label": "433 Eros", "type": "asteroid"}]
	RocketsManager.save_state(ret_state)
	var csp_ret := await _load_scene(CONTROL_STATION_SCENE)
	if csp_ret:
		await _wait(_panel_settle)
		_meta("Phase 5c - Control Station Panel (returning mission card)", 4,
			"Control Station showing one rocket returning to Earth. Card should show: rocket name, RETURNING badge (amber), target with back-arrow (⟵), contractor name, dimmed mineral chips, and a RECALL button.",
			["Is the RETURNING badge visible and amber/warm-coloured (not cyan)?",
			 "Is the target shown with a back arrow (⟵)?",
			 "Is the contractor name still visible?",
			 "Are mineral chips present but visually dimmed?",
			 "Is the RECALL button visible (distinct from RESUME)?",
			 "Does the card visually differ from the in-orbit state so users can tell it apart?"])
		await _screenshot("07c_control_station_returning")
		_check_offscreen_elements(csp_ret, "Control Station Returning")
		_check_label_button_overlaps(csp_ret, "Control Station Returning")
		if _find_label_with_text(csp_ret, "RETURNING"):
			_report("  - RETURNING status badge visible. ✓")
		else:
			_issue("Control Station returning card missing RETURNING status badge — user cannot tell rocket is inbound.")
		# Button is disabled and shows INBOUND (with optional ETA) instead of RECALL
		if _find_button_with_text(csp_ret, "INBOUND"):
			_report("  - INBOUND button present and disabled on returning card. ✓")
		else:
			_issue("Control Station returning card missing INBOUND button — returning state not communicated.")
		if _find_label_with_text(csp_ret, "Rocketlab"):
			_report("  - Contractor name still visible on returning card. ✓")
		else:
			_issue("Control Station returning card missing contractor name.")

	# ==================================================================
	# Phase 5d — Control Station Panel (Story tab)
	# ==================================================================
	_report("## Phase 5d — Control Station Panel (Story tab)")
	_inject_progress_state(4, false)
	var csp_story := await _load_scene(CONTROL_STATION_SCENE)
	if csp_story:
		await _wait(_panel_settle)
		var story_tab_btn := _find_button_with_text(csp_story, "STORY")
		if story_tab_btn:
			_click(story_tab_btn)
			await _wait(_anim_settle)
			_meta("Phase 5d - Control Station Panel (Story tab)", 4,
				"Control Station with the STORY tab active — shows the mission roadmap cards (First Contact → Free Operations).",
				["Are story mission cards visible (at least 3)?",
				 "Is there a 'First Contact' mission card?",
				 "Are mission descriptions readable?",
				 "Does the tab switch feel responsive?"])
			await _screenshot("07d_control_station_story_tab")
			_check_offscreen_elements(csp_story, "Control Station Story Tab")
			if _find_label_with_text(csp_story, "First Contact"):
				_report("  - 'First Contact' story card visible. ✓")
			else:
				_issue("Control Station Story tab missing 'First Contact' — roadmap is empty or broken.")
			if _find_label_with_text(csp_story, "Free Operations"):
				_report("  - 'Free Operations' story card visible. ✓")
			else:
				_issue("Control Station Story tab missing 'Free Operations' final milestone.")
		else:
			_issue("Control Station Panel missing STORY tab button — cannot switch to story view.")

	# ==================================================================
	# Phase 5b — Space Map
	# ==================================================================
	_report("## Phase 5b — Space Map")
	var space_map := await _load_scene(SPACE_MAP_SCENE)
	if space_map:
		await _wait(_scene_settle)
		_meta("Phase 5b - Space Map", -1,
			"The Space Map — shows the operational zone, scanned targets, and reachable destinations. Key navigation surface after Mission 4.",
			["Is the map rendering correctly?",
			 "Are there visible labels or points of interest?",
			 "Is there a close/back button?",
			 "Are any UI elements clipped at screen edges?",
			 "Does the map feel navigable and understandable to a new user?"])
		await _screenshot("08_space_map")
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
	# Phase 7 — Launchpad Panel
	# ==================================================================
	_report("## Phase 7 — Launchpad Panel")
	await _inject_stage_snapshot_state(1, true)
	var lp := await _load_scene(LAUNCHPAD_SCENE)
	if lp:
		_prime_launchpad_scene(lp)
		await _wait(_panel_settle)
		_meta("Phase 7 - Launchpad Panel", -1,
			"The first launchpad mission-setup scene in the authored flow: contractor first, rocket on the pad, then target planning.",
			["Is the mission setup UI populated instead of showing an empty shell?",
			 "Are contractor/rocket/target affordances visible?",
			 "Does anything overlap the main action area?",
			 "Does the flow read clearly as a pre-launch setup screen?"])
		await _screenshot("10_launchpad_panel")
		_check_offscreen_elements(lp, "Launchpad Panel")
		_check_label_button_overlaps(lp, "Launchpad Panel")
		if _find_label_with_text(lp, "Select Contractor") or _find_label_with_text(lp, "Mission"):
			_report("  - Wizard step title visible. ✓")
		else:
			_issue("Launchpad scene missing wizard title — users may not know where they are.")
		if _find_node_by_name(lp, "LaunchWizard"):
			_report("  - LaunchWizard present. ✓")
		else:
			_issue("Launchpad scene missing LaunchWizard — mission setup is not visible.")
		_check_for_placeholder_text(lp, "Launchpad Panel")

	# ==================================================================
	# Phase 8 — Subcontractors Panel
	# ==================================================================
	_report("## Phase 8 — Subcontractors / Contractors Panel")
	var sub := await _load_scene(SUBCONTRACTORS_SCENE)
	if sub:
		await _wait(_panel_settle)
		_meta("Phase 8 - Subcontractors Panel", 1,
			"The Subcontractors panel — users pick a contractor for a delivery bonus before launching. First introduced in M1.",
			["Is the 'Subcontractors' heading visible?",
			 "Is there explanatory text about what contractors do / the bonus system?",
			 "Is there a close button?",
			 "Is the progression / unlock logic explained?"])
		await _screenshot("11_subcontractors_panel")
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
		await _wait(_panel_settle)
		_meta("Phase 9 - New Mission Panel", -1,
			"The New Mission panel where users select their destination (asteroid or TESS planet candidate). In CI: target list will be empty (no Supabase).",
			["Is the 'New Mission' heading visible?",
			 "Is there a 'Select Rocket' button?",
			 "Is there a close button?",
			 "Even with an empty target list (CI), does the UI communicate why or look intentional?"])
		await _screenshot("12_new_mission_panel")
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
	_inject_progress_state(5, false)
	var rs := await _load_rocket_selector_showcase()
	if rs:
		await _wait(_panel_settle)
		_meta("Phase 10 - Rocket Selector", -1,
			"The Rocket Selector mounted inside a presentation frame so the card list renders in a realistic launchpad-like container.",
			["Are rocket options visible and labelled?",
			 "Does the selector feel like a complete panel rather than a floating fragment?",
			 "Does any text overflow?",
			 "Are elements clipped at screen edges?"])
		await _screenshot("13_rocket_selector")
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
		await _wait(_panel_settle)
		_meta("Phase 11 - Rocket Ascent", -1,
			"The rocket ascent animation — plays when a rocket launches from Earth.",
			["Is the ascent animation visually clear?",
			 "Is any status text readable?",
			 "Are any UI elements in unexpected positions?"])
		await _screenshot("14_rocket_ascent")
		_check_visible_labels(ascent, "Rocket Ascent", 0)
		_check_offscreen_elements(ascent, "Rocket Ascent")
		_check_for_placeholder_text(ascent, "Rocket Ascent")

	# ==================================================================
	# Phase 12 — Rocket Transit
	# ==================================================================
	_report("## Phase 12 — Rocket Transit")
	var transit := await _load_scene(TRANSIT_SCENE)
	if transit:
		await _wait(_scene_settle)
		_meta("Phase 12 - Rocket Transit (initial)", -1,
			"Rocket transit animation at the start of flight — the 'in-flight waiting' state users see between Earth and their target.",
			["Is there a target/status label showing where the rocket is going?",
			 "Is there a travel progress bar?",
			 "Is there a back/skip button so users aren't stuck watching the full animation?",
			 "Is the flight status readable?"])
		await _screenshot("15_rocket_transit_initial")
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

		await _wait(_scene_settle)
		_meta("Phase 12 - Rocket Transit (mid-flight)", -1,
			"Rocket transit animation a few seconds into the journey.",
			["Has the animation progressed? Is the rocket visibly moving?",
			 "Is the travel progress bar updating?",
			 "Is the back/skip button still visible and accessible?"])
		await _screenshot("16_rocket_transit_midway")
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
		await _wait(_panel_settle)
		_meta("Phase 13 - Mining Practice Panel", -1,
			"The Mining Practice panel — lets users try mining on preset scenarios before a real mission.",
			["Are practice preset buttons visible?",
			 "Is it clear this is 'practice' vs. a real mission?",
			 "Any text truncated or clipped?"])
		await _screenshot("17_mining_practice_panel")
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
	_report("## Phase 14 — Mining Minigame (%d s run)" % int(_mining_run_seconds))
	var mining := await _load_scene(MINING_MINIGAME_SCENE)
	if mining:
		if mining.has_method("start_mining"):
			mining.call(
				"start_mining",
				false, 1, "ux-tour-warmup",
				{"Iron": 8, "Nickel": 5, "Cobalt": 2, "Silicate": 4},
				0.78,
				{
					"starter_contract": {
						"active": true,
						"name": "Axiom Mining Co.",
						"requested_minerals": {"Iron": 4, "Nickel": 3, "Silicate": 2}
					},
					"mission_mode": "contractor"
				}
			)
			await _wait(_scene_settle)
			_meta("Phase 14 - Mining Minigame (initial terrain)", 1,
				"Mining minigame just after starting — asteroid terrain generated, beam not yet active. First thing a user sees when they arrive at an asteroid.",
				["Is the terrain visually distinct and clearly mineable?",
				 "Are HUD elements (fuel, heat, beam, score) all visible and readable?",
				 "Is there a RETURN button?",
				 "Is the tutorial overlay present, explaining how to mine?",
				 "Does anything overlap the main gameplay area?"])
			await _screenshot("18_mining_initial_terrain")
			_check_offscreen_elements(mining, "Mining Minigame")

			var sidescroll := _find_node_by_name(mining, "SidescrollMiningCompat")
			if not sidescroll:
				sidescroll = mining.get_node_or_null("SidescrollMiningCompat")
			if sidescroll:
				_report("  - SidescrollMining delegate found. ✓")
				for hud_name in ["FuelBar", "HeatBar", "BeamBar", "OrderLabel"]:
					if _find_node_by_name(sidescroll, hud_name):
						_report("    • %s present. ✓" % hud_name)
					else:
						_issue("Mining HUD missing '%s' — players can't track delivery order progress." % hud_name)
				sidescroll.set("_is_mining", true)
				await _wait(4.0)
				
				# Deploy a drone (Mission 4+ mechanic)
				_report("  - Testing Drone mechanic (Mission 4+)...")
				sidescroll.set("_drones_enabled", true)
				sidescroll.call("_deploy_drone")
				await _wait(1.0)
				
				_meta("Phase 14 - Mining Minigame (drone deployed)", 4,
					"Mining minigame with a drone deployed — Mission 4+ mechanic. Drones target dark subsurface deposits.",
					["Is the drone visible and moving towards a target?",
					 "Is the drone HUD (count/cooldown) updating?",
					 "Does the drone contrast well with the terrain?"])
				await _screenshot("19b_mining_drone_deployed")
				
				await _wait(2.0)
				_meta("Phase 14 - Mining Minigame (beam active)", 1,
					"Mining beam active — terrain is being excavated. The main mining gameplay loop.",
					["Is the mining beam visually clear?",
					 "Is terrain being excavated (pixels removed)?",
					 "Are HUD bars updating (heat rising, fuel depleting)?",
					 "Is any UI element obscured by the beam effect?"])
				await _screenshot("19_mining_beam_active")
				await _wait(max(_mining_run_seconds - 4.0, 0.5))
				_meta("Phase 14 - Mining Minigame (mid-run)", 1,
					"Mining mid-run — significant terrain excavated. Shows visual progression of a full mining session.",
					["Is there visibly less terrain (excavation progress)?",
					 "Is the cargo/inventory filling up?",
					 "Is the RETURN button visible and accessible?",
					 "Is the score/haul total updating?"])
				await _screenshot("20_mining_mid_run")
				
				# Check inventory panel (HUD overlay)
				_report("  - Checking Mining Inventory panel...")
				sidescroll.call("_toggle_inventory")
				await _wait(1.0)
				_meta("Phase 14 - Mining Inventory Overlay", 1,
					"Mining minigame with the inventory panel open — showing current fuel, heat, beam, and minerals collected.",
					["Is the inventory list populated with collected minerals?",
					 "Are fuel/heat/beam percentages readable?",
					 "Is the score/total value visible?",
					 "Does the panel obscure too much of the gameplay area (is it dismissible)?"])
				await _screenshot("20b_mining_inventory_overlay")
				sidescroll.call("_toggle_inventory") # dismiss
				await _wait(0.5)
				
				sidescroll.set("_is_mining", false)
				await _wait(1.0)
				_meta("Phase 14 - Mining Minigame (beam released)", 1,
					"Mining beam released — player stopped mining. Post-mining state before returning to Earth.",
					["Is the beam clearly off?",
					 "Is the RETURN button prominent, prompting the user to go home?",
					 "Is the final haul/cargo count visible?"])
				await _screenshot("21_mining_beam_released")
				_check_label_button_overlaps(mining, "Mining Minigame")
			else:
				_issue("SidescrollMining delegate not found — cannot drive beam simulation.")
				await _wait(_mining_run_seconds)
				await _screenshot("18_mining_static")

			var return_btn := _find_button_with_text(mining, "RETURN")
			if not return_btn:
				return_btn = _find_button_with_text(mining, "Return")
			if return_btn:
				_report("  - RETURN button present. ✓")
			else:
				_issue("Mining screen missing RETURN button — players cannot end the run.")
		else:
			_issue("CRITICAL: MiningMinigame has no start_mining() method — minigame is broken.")
			await _wait(2.0)
			await _screenshot("18_mining_no_start")

	# ==================================================================
	# Phase 15 — Rocket Return
	# ==================================================================
	_report("## Phase 15 — Rocket Return")
	var ret := await _load_scene(RETURN_SCENE)
	if ret:
		await _wait(_panel_settle)
		_meta("Phase 15 - Rocket Return", -1,
			"The rocket return animation — plays as the rocket flies back to Earth after a mission.",
			["Is the animation visually clear?",
			 "Is there any text indicating the rocket is heading home?",
			 "Any UI elements out of place?"])
		await _screenshot("22_rocket_return")
		_check_offscreen_elements(ret, "Rocket Return")
		_check_for_placeholder_text(ret, "Rocket Return")

	# ==================================================================
	# Phase 16 — Mission Debrief
	# ==================================================================
	_report("## Phase 16 — Mission Debrief")
	_inject_debrief_state()
	var debrief := await _load_scene(DEBRIEF_SCENE)
	if debrief:
		await _wait(_scene_settle)
		_meta("Phase 16 - Mission Debrief", -1,
			"The Mission Debrief scene — shows mission results and lets users scrap the rocket to unlock the next mission. In CI: payout data will be empty.",
			["Is there a visible title (e.g., 'Mission Complete')?",
			 "Is the CompleteButton visible and accessible?",
			 "Is the OrbitButton (secondary action) visible?",
			 "Does the debrief feel like a clear 'end of mission' moment?",
			 "Even with no payout data (CI), does the UI look intentional?"])
		await _screenshot("23_mission_debrief")
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
		await _wait(_panel_settle)
		_meta("Phase 17 - Candidate Detail View (empty canvas)", 3,
			"The annotation view for reviewing asteroid or TESS planet candidate images. Users draw on this canvas to mark transit dips or notable features — the citizen science component. This screenshot shows the view before any annotation.",
			["Are the annotation toolbar buttons (Pen, Clear, Save) visible?",
			 "Are drawing mode buttons (free, rect, circle) visible?",
			 "Is there a back button to exit this view?",
			 "Is the drawing canvas area clearly defined?",
			 "Would a new user understand they're supposed to draw/annotate something here?",
			 "Is there any explanatory text about what to annotate and why?"])
		await _screenshot("24_candidate_detail_empty_canvas")
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
				await _wait(0.3)
			var canvas_rect := (drawing_canvas as Control).get_global_rect()
			var cx := canvas_rect.position.x + canvas_rect.size.x * 0.5
			var cy := canvas_rect.position.y + canvas_rect.size.y * 0.5
			# Press
			var press := InputEventMouseButton.new()
			press.button_index = MOUSE_BUTTON_LEFT
			press.pressed = true
			press.position = Vector2(cx - 80, cy)
			Input.parse_input_event(press)
			await _wait(0.05)
			# Drag a transit-dip curve shape
			for i in range(10):
				var motion := InputEventMouseMotion.new()
				motion.position = Vector2(cx - 80 + i * 16, cy + sin(float(i) / 2.5) * 28)
				motion.button_mask = MOUSE_BUTTON_MASK_LEFT
				Input.parse_input_event(motion)
				await _wait(0.03)
			# Release
			var release := InputEventMouseButton.new()
			release.button_index = MOUSE_BUTTON_LEFT
			release.pressed = false
			release.position = Vector2(cx + 80, cy)
			Input.parse_input_event(release)
			await _wait(0.4)

			_meta("Phase 17 - Candidate Detail View (after annotation stroke)", 3,
				"The annotation view after a simulated drawing stroke — shows the citizen science workflow in action.",
				["Is the annotation stroke visible on the canvas?",
				 "Is the annotation toolbar still accessible?",
				 "Is the Save button clearly visible so the user knows how to submit?",
				 "Does the overall annotation experience feel intuitive for a new user?"])
			await _screenshot("25_candidate_detail_annotated")
		else:
			_issue("Asteroid detail view missing DrawingCanvas — annotation drawing is broken.")

		_check_for_placeholder_text(detail, "Asteroid Detail View")

	# ==================================================================
	# Phase 18 — Earth Base (post-M1 debrief / M2 state)
	# ==================================================================
	_report("## Phase 18 — Earth Base (returning from Mission 1 debrief)")
	await _inject_stage_snapshot_state(2, false)
	var earth2 := await _load_scene(EARTH_MAIN_SCENE)
	if earth2:
		await _wait(_scene_settle)
		_meta("Phase 18 - Earth Base (post-M1 debrief, M2 state)", 2,
			"Earth base after completing Mission 1 and returning from debrief. Tutorial should advance to Mission 2 instructions.",
			["Does the tutorial overlay update to reflect Mission 2?",
			 "Are all navigation buttons still present?",
			 "Does the base feel different from the M1 start state?",
			 "Does anything overlap or get clipped?"])
		await _screenshot("26_earth_base_post_m1_debrief")
		_check_offscreen_elements(earth2, "Earth Base Post-M1")
		_check_label_button_overlaps(earth2, "Earth Base Post-M1")
		for btn_name in ["MenuButton", "ForwardButton", "BackButton"]:
			if not _find_node_by_name(earth2, btn_name):
				_issue("Earth base missing '%s' on second load — possible state corruption." % btn_name)
		_check_for_placeholder_text(earth2, "Earth Base (final)")

	# ==================================================================
	# Phase 19 — Satellite Station Panel (post-unlock)
	# ==================================================================
	_report("## Phase 19 — Satellite Station Panel (post-unlock)")
	await _inject_stage_snapshot_state(4, false)
	FirstTimeMechanicTracker.mark_seen("scanner_station")
	var ssp := await _load_scene(SATELLITE_STATION_SCENE)
	if ssp:
		if ssp.has_method("set_local_only"):
			ssp.set_local_only(true)
		await _wait(_panel_settle)
		_meta("Phase 19 - Satellite Station Panel", 4,
			"The Satellite Station panel after Mission 4 unlock. It should appear late in the tour, after the player has reached scanner progression.",
			["Is there a scan/refresh button?",
			 "Does the panel explain what it does?",
			 "In the empty-data state (CI), does the UI look intentional rather than broken?",
			 "Any text clipped or off-screen?"])
		await _screenshot("27_satellite_station_panel")
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
		if ctrl.is_visible_in_tree() and ctrl.size.x > 2 and ctrl.size.y > 2:
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


func _capture_viewport_image() -> Image:
	var renderer_name := DisplayServer.get_name().to_lower()
	if renderer_name.find("headless") != -1:
		return null
	for _i in range(3):
		await get_tree().process_frame
	RenderingServer.force_draw(false)
	var texture := get_viewport().get_texture()
	if texture == null:
		return null
	var image := texture.get_image()
	var attempts := 0
	while (image == null or image.get_width() <= 0 or image.get_height() <= 0) and attempts < 6:
		await _wait(0.05)
		await get_tree().process_frame
		RenderingServer.force_draw(false)
		texture = get_viewport().get_texture()
		if texture == null:
			return null
		image = texture.get_image()
		attempts += 1
	return image

func _screenshot(label: String) -> void:
	var image := await _capture_viewport_image()
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

	await _wait(0.5)
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
		"| M1    | First Mining Trip | Launchpad, basic mining, debrief |",
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
func _configure_runtime_timings() -> void:
	var renderer_name := DisplayServer.get_name().to_lower()
	var fast_headless := OS.has_feature("headless") or renderer_name.find("headless") != -1
	if not fast_headless:
		return
	# The Docker/Xvfb harness does not need theatrical settle times.
	_mining_run_seconds = 6.0
	_scene_settle = 0.75
	_panel_settle = 0.5
	_anim_settle = 0.25
	_snap_settle = 0.4
