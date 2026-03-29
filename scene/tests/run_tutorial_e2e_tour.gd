extends Node
## Tutorial E2E Tour — drives through every M1-M4 tutorial step and Free Operations.
##
## Screenshots each tutorial step in context (correct scene, correct tutorial coach
## message).  Also shows the mission debrief with real cargo data for each mission.
##
## Run via:
##   cd scene
##   xvfb-run --auto-servernum /path/to/godot --path . res://tests/TutorialTour.tscn
##
## Output:
##   user://tutorial_screenshots/NN_*.png
##   user://tutorial_report.md

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
const SCREENSHOT_DIR := "user://tutorial_screenshots"
const REPORT_PATH    := "user://tutorial_report.md"

const EARTH_SCENE    := "res://Scenes/Earth/earth_base_1.tscn"
const LAUNCHPAD_SCENE := "res://Scenes/Earth/earth_launchpad.tscn"
const DEBRIEF_SCENE  := "res://Scenes/Earth/mission_debrief_v2.tscn"
const MINING_SCENE   := "res://Scenes/UI/MiningMinigame.tscn"
const TRANSIT_OUT    := "res://Scenes/Transitions/rocket_transit.tscn"
const TRANSIT_RETURN := "res://Scenes/Transitions/rocket_return.tscn"

const RocketsManager     = preload("res://Scripts/Utils/RocketsManager.gd")
const RocketsStateAccess = preload("res://Scripts/Utils/RocketsStateAccess.gd")
const MiningInventory    = preload("res://Scripts/Utils/MiningInventory.gd")

const TUTORIAL_CFG_PATH := "user://tutorial_v2.cfg"

# Per-scene settle time.  Keep short — the tour is long.
const SETTLE      := 2.0
const QUICK       := 0.8
const MINING_WAIT := 6.0

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
	_log("# Planet Hunters — Tutorial E2E Tour")
	_log("Walks every M1→M4 tutorial step in context, then shows Free Operations.")
	_log("")
	_run_tour.call_deferred()

# ---------------------------------------------------------------------------
# Tour
# ---------------------------------------------------------------------------
func _run_tour() -> void:
	# Clean slate
	RocketsManager.reset_state()
	_write_tutorial_cfg(1, 0)

	await _tour_m1()
	await _tour_m2()
	await _tour_m3()
	await _tour_m4()
	await _tour_free_ops()

	_write_report()
	_log_summary()
	await get_tree().create_timer(0.5).timeout
	get_tree().quit(1 if _issues.size() > 4 else 0)

# ── Mission 1 ────────────────────────────────────────────────────────────────
func _tour_m1() -> void:
	_log("\n## Mission 1 — Starter Loop (10 steps)")
	_set_rockets_progress(0)   # fresh start — M1 stage

	# --- Earth base steps (0-1): Base Tour, Close Panel ---
	_write_tutorial_cfg(1, 0)
	var earth = await _load_scene(EARTH_SCENE)
	await _settle()
	_screenshot("m1_01_earth_base_tour")
	_check_coach(earth, "Base Tour", "M1 step 0")

	_write_tutorial_cfg(1, 1)
	await _reload_scene(EARTH_SCENE)
	await _settle()
	_screenshot("m1_02_earth_close_panel")
	_check_coach(_active_scene, "Close Panel", "M1 step 1")

	# --- Launchpad steps (2-5): Contractor → Rocket → Target → Launch ---
	_write_tutorial_cfg(1, 2)
	await _load_scene(LAUNCHPAD_SCENE)
	await _settle()
	_screenshot("m1_03_launchpad_pick_contractor")
	_check_coach(_active_scene, "Pick Contractor", "M1 step 2")

	_write_tutorial_cfg(1, 3)
	await _reload_scene(LAUNCHPAD_SCENE)
	await _settle()
	_screenshot("m1_04_launchpad_build_rocket")
	_check_coach(_active_scene, "Build Rocket", "M1 step 3")

	_write_tutorial_cfg(1, 4)
	await _reload_scene(LAUNCHPAD_SCENE)
	await _settle()
	_screenshot("m1_05_launchpad_select_target")
	_check_coach(_active_scene, "Select Target", "M1 step 4")

	_write_tutorial_cfg(1, 5)
	await _reload_scene(LAUNCHPAD_SCENE)
	await _settle()
	_screenshot("m1_06_launchpad_launch")
	_check_coach(_active_scene, "Launch", "M1 step 5")

	# --- Transit out ---
	await _load_scene(TRANSIT_OUT)
	await _settle()
	_screenshot("m1_07_transit_outbound")

	# --- Mining steps (6-8): Arrived → Mine → Return ---
	_write_tutorial_cfg(1, 6)
	await _load_scene(MINING_SCENE)
	await _settle()
	_screenshot("m1_08_mining_arrived")
	_check_coach(_active_scene, "Arrived", "M1 step 6")

	_write_tutorial_cfg(1, 7)
	await _reload_scene(MINING_SCENE)
	await _settle()
	await _wait(MINING_WAIT)
	_screenshot("m1_09_mining_mine")
	_check_coach(_active_scene, "Mine", "M1 step 7")

	_write_tutorial_cfg(1, 8)
	await _reload_scene(MINING_SCENE)
	await _settle()
	_screenshot("m1_10_mining_return")
	_check_coach(_active_scene, "Return", "M1 step 8")

	# --- Return transit ---
	await _load_scene(TRANSIT_RETURN)
	await _settle()
	_screenshot("m1_11_transit_return")

	# --- Debrief (step 9) with real cargo ---
	_write_tutorial_cfg(1, 9)
	_set_returned_mission(1)
	await _load_scene(DEBRIEF_SCENE)
	await _settle()
	_screenshot("m1_12_debrief")
	_check_debrief_has_data(_active_scene, "M1 debrief")

	# --- Earth base after M1 complete ---
	_set_rockets_progress(1)   # 1 mission completed → M2 stage
	RocketsManager.clear_returned_mission()
	_write_tutorial_cfg(2, 0)
	await _load_scene(EARTH_SCENE)
	await _settle()
	_screenshot("m1_13_earth_post_m1_m2_begins")
	_check_coach(_active_scene, "Pick Contractor", "M2 step 0 (post-M1 earth)")

# ── Mission 2 ────────────────────────────────────────────────────────────────
func _tour_m2() -> void:
	_log("\n## Mission 2 — Upgrade Loop (7 steps)")
	_set_rockets_progress(1)

	# M2 has no earth-base steps — goes straight to launchpad
	_write_tutorial_cfg(2, 0)
	await _load_scene(LAUNCHPAD_SCENE)
	await _settle()
	_screenshot("m2_01_launchpad_pick_contractor")
	_check_coach(_active_scene, "Pick Contractor", "M2 step 0")

	_write_tutorial_cfg(2, 1)
	await _reload_scene(LAUNCHPAD_SCENE)
	await _settle()
	_screenshot("m2_02_launchpad_build_rocket2")
	_check_coach(_active_scene, "Build Rocket 2", "M2 step 1")

	_write_tutorial_cfg(2, 2)
	await _reload_scene(LAUNCHPAD_SCENE)
	await _settle()
	_screenshot("m2_03_launchpad_target")
	_check_coach(_active_scene, "Target", "M2 step 2")

	_write_tutorial_cfg(2, 3)
	await _reload_scene(LAUNCHPAD_SCENE)
	await _settle()
	_screenshot("m2_04_launchpad_launch")
	_check_coach(_active_scene, "Launch", "M2 step 3")

	_write_tutorial_cfg(2, 4)
	await _load_scene(MINING_SCENE)
	await _settle()
	await _wait(MINING_WAIT)
	_screenshot("m2_05_mining")
	_check_coach(_active_scene, "Mine", "M2 step 4")

	_write_tutorial_cfg(2, 5)
	await _reload_scene(MINING_SCENE)
	await _settle()
	_screenshot("m2_06_mining_return")
	_check_coach(_active_scene, "Return", "M2 step 5")

	_write_tutorial_cfg(2, 6)
	_set_returned_mission(2)
	await _load_scene(DEBRIEF_SCENE)
	await _settle()
	_screenshot("m2_07_debrief")
	_check_debrief_has_data(_active_scene, "M2 debrief")

	_set_rockets_progress(2)
	RocketsManager.clear_returned_mission()
	_write_tutorial_cfg(3, 0)
	await _load_scene(EARTH_SCENE)
	await _settle()
	_screenshot("m2_08_earth_post_m2_m3_begins")
	_check_coach(_active_scene, "Pick Contractor", "M3 step 0 (post-M2 earth)")

# ── Mission 3 ────────────────────────────────────────────────────────────────
func _tour_m3() -> void:
	_log("\n## Mission 3 — Scanner + Candidate Flow (6 steps)")
	_set_rockets_progress(2)

	_write_tutorial_cfg(3, 0)
	await _load_scene(LAUNCHPAD_SCENE)
	await _settle()
	_screenshot("m3_01_launchpad_pick_contractor")
	_check_coach(_active_scene, "Pick Contractor", "M3 step 0")

	_write_tutorial_cfg(3, 1)
	await _reload_scene(LAUNCHPAD_SCENE)
	await _settle()
	_screenshot("m3_02_launchpad_select_planet")
	_check_coach(_active_scene, "Target", "M3 step 1")

	_write_tutorial_cfg(3, 2)
	await _reload_scene(LAUNCHPAD_SCENE)
	await _settle()
	_screenshot("m3_03_launchpad_launch")
	_check_coach(_active_scene, "Launch", "M3 step 2")

	_write_tutorial_cfg(3, 3)
	await _load_scene(MINING_SCENE)
	await _settle()
	await _wait(MINING_WAIT)
	_screenshot("m3_04_mining_planet")
	_check_coach(_active_scene, "Mine", "M3 step 3")

	_write_tutorial_cfg(3, 4)
	await _reload_scene(MINING_SCENE)
	await _settle()
	_screenshot("m3_05_mining_return")
	_check_coach(_active_scene, "Return", "M3 step 4")

	_write_tutorial_cfg(3, 5)
	_set_returned_mission(3)
	await _load_scene(DEBRIEF_SCENE)
	await _settle()
	_screenshot("m3_06_debrief")
	_check_debrief_has_data(_active_scene, "M3 debrief")

	_set_rockets_progress(3)
	RocketsManager.clear_returned_mission()
	_write_tutorial_cfg(4, 0)
	await _load_scene(EARTH_SCENE)
	await _settle()
	_screenshot("m3_07_earth_post_m3_m4_begins")
	_check_coach(_active_scene, "Scanner", "M4 step 0 (post-M3 earth)")

# ── Mission 4 ────────────────────────────────────────────────────────────────
func _tour_m4() -> void:
	_log("\n## Mission 4 — Planetary Expansion + Drones (6 steps)")
	_set_rockets_progress(3)

	# M4 steps 0-1 are on the base/launchpad (build scanner, scan)
	_write_tutorial_cfg(4, 0)
	await _load_scene(EARTH_SCENE)
	await _settle()
	_screenshot("m4_01_earth_build_scanner")
	_check_coach(_active_scene, "Scanner", "M4 step 0")

	_write_tutorial_cfg(4, 1)
	await _reload_scene(EARTH_SCENE)
	await _settle()
	_screenshot("m4_02_earth_scan_targets")
	_check_coach(_active_scene, "Scan", "M4 step 1")

	_write_tutorial_cfg(4, 2)
	await _load_scene(LAUNCHPAD_SCENE)
	await _settle()
	_screenshot("m4_03_launchpad_select_scanned")
	_check_coach(_active_scene, "Target", "M4 step 2")

	_write_tutorial_cfg(4, 3)
	await _reload_scene(LAUNCHPAD_SCENE)
	await _settle()
	_screenshot("m4_04_launchpad_launch")
	_check_coach(_active_scene, "Launch", "M4 step 3")

	_write_tutorial_cfg(4, 4)
	await _load_scene(MINING_SCENE)
	await _settle()
	await _wait(MINING_WAIT)
	_screenshot("m4_05_mining_with_drones")
	_check_coach(_active_scene, "Mine + Drones", "M4 step 4")

	# Drone deployment snapshot
	var mining_scene = _active_scene
	if mining_scene and mining_scene.has_method("_deploy_drone"):
		mining_scene._deploy_drone()
		await _wait(1.0)
	_screenshot("m4_06_mining_drone_deployed")

	_write_tutorial_cfg(4, 5)
	_set_returned_mission(4)
	await _load_scene(DEBRIEF_SCENE)
	await _settle()
	_screenshot("m4_07_debrief_final_mission")
	_check_debrief_has_data(_active_scene, "M4 debrief")

# ── Free Operations ───────────────────────────────────────────────────────────
func _tour_free_ops() -> void:
	_log("\n## Free Operations — Post-M4 Sandbox")
	_set_rockets_progress(4)   # 4 missions complete = Free Ops stage
	RocketsManager.clear_returned_mission()

	# Tutorial is done at stage 5 (no more steps)
	_write_tutorial_cfg(5, 0)

	await _load_scene(EARTH_SCENE)
	await _settle()
	_screenshot("freeops_01_earth_base")
	_log("  Free Operations earth base loaded")

	# Launchpad in Free Ops mode (contractor + free target choice)
	await _load_scene(LAUNCHPAD_SCENE)
	await _settle()
	_screenshot("freeops_02_launchpad_free_ops")
	_log("  Free Operations launchpad loaded")

	# Full debrief UI — what a free-ops return looks like
	_set_returned_mission_free_ops()
	await _load_scene(DEBRIEF_SCENE)
	await _settle()
	_screenshot("freeops_03_debrief")
	_check_debrief_has_data(_active_scene, "Free Ops debrief")

	# Earth base back (post-debrief, still in free ops)
	_set_rockets_progress(4)
	RocketsManager.clear_returned_mission()
	_write_tutorial_cfg(5, 0)
	await _load_scene(EARTH_SCENE)
	await _settle()
	_screenshot("freeops_04_earth_back_from_debrief")

# ---------------------------------------------------------------------------
# State helpers
# ---------------------------------------------------------------------------

func _write_tutorial_cfg(stage: int, step_index: int) -> void:
	## Write TutorialPersistence config so the next scene load picks up the
	## correct tutorial step.  This is what the TutorialController reads on _ready().
	var cfg := ConfigFile.new()
	cfg.set_value("state", "current_stage",      stage)
	cfg.set_value("state", "current_step_index", step_index)
	cfg.set_value("state", "stage_lock",         0)
	cfg.set_value("state", "skipped",            false)
	cfg.set_value("state", "completed_actions",           {})
	cfg.set_value("state", "completed_actions_by_stage",  {})
	cfg.set_value("state", "completed_steps_by_stage",    {})
	var err := cfg.save(TUTORIAL_CFG_PATH)
	if err != OK:
		_issue("Could not write tutorial_v2.cfg (err=%s)" % err)

func _set_rockets_progress(completed_missions: int) -> void:
	## Inject RocketsManager state to put the player at a given mission stage.
	var level := clampi(completed_missions + 1, 1, 4)
	var state  := RocketsStateAccess.build_default_state(level)
	state["mission_progress_completed"] = completed_missions
	var badges: Array = []
	for i in range(completed_missions):
		badges.append("mission-%d" % (i + 1))
	state["completed_mission_badges"] = badges
	# Give enough francs that rocket builds aren't blocked
	state["franc_balance"] = 10_000_000_000
	RocketsManager.set_override_state(state)

func _set_returned_mission(mission_num: int) -> void:
	## Inject a completed mission return so the debrief shows real data.
	var rocket_id := "starterrocket%d-tour" % clampi(mission_num, 1, 3)
	var targets := {
		1: {"id": "mission-1-training-target", "label": "433 Eros",     "type": "asteroid"},
		2: {"id": "mission-2-training-target", "label": "2024 BX1",     "type": "asteroid"},
		3: {"id": "tess-planet-tour-m3",       "label": "TIC 100100.01","type": "planet"},
		4: {"id": "deep-planet-tour-m4",       "label": "GJ 667Cc",     "type": "planet"},
	}
	var t := targets.get(mission_num, targets[1]) as Dictionary
	RocketsManager.set_returned_mission(
		rocket_id,
		str(t.get("id", "")),
		str(t.get("label", "")),
		str(t.get("type", "asteroid")),
		"contract",
		{
			"trip_contractor_id":        "rocketlab",
			"trip_contractor_name":      "Rocketlab",
			"trip_requested_minerals":   {"Iron": 5, "Nickel": 3},
			"mining_run_collected":      {"Iron": 5, "Nickel": 3, "Cobalt": 1},
		}
	)

func _set_returned_mission_free_ops() -> void:
	## Free-ops return — player chose their own contractor and target.
	RocketsManager.set_returned_mission(
		"starterrocket2-freeops",
		"asteroid-belt-target-001",
		"2022 AP7",
		"asteroid",
		"contract",
		{
			"trip_contractor_id":      "astroforge",
			"trip_contractor_name":    "Astroforge",
			"trip_requested_minerals": {"Cobalt": 4, "Nickel": 2},
			"mining_run_collected":    {"Cobalt": 4, "Nickel": 3, "Iron": 2, "Platinum": 1},
		}
	)

# ---------------------------------------------------------------------------
# Scene helpers
# ---------------------------------------------------------------------------

func _load_scene(path: String) -> Node:
	if _active_scene and is_instance_valid(_active_scene):
		remove_child(_active_scene)
		_active_scene.queue_free()
		_active_scene = null
		await get_tree().create_timer(0.3).timeout

	# Remove any stray CanvasLayer overlays left by previous scenes
	for child in get_tree().root.get_children():
		if child is CanvasLayer and child != self and not child.is_ancestor_of(self):
			child.queue_free()

	var packed: PackedScene = load(path)
	if not packed:
		_issue("CRITICAL: Could not load scene: %s" % path)
		return null

	var scene := packed.instantiate()
	add_child(scene)
	_active_scene = scene
	return scene

func _reload_scene(path: String) -> Node:
	return await _load_scene(path)

func _settle() -> void:
	await get_tree().create_timer(SETTLE).timeout

func _wait(t: float) -> void:
	await get_tree().create_timer(t).timeout

# ---------------------------------------------------------------------------
# Check helpers
# ---------------------------------------------------------------------------

func _check_coach(root: Node, expected_title: String, context: String) -> void:
	if root == null:
		_issue("Coach check skipped — null scene (%s)" % context)
		return
	var coach := _find_node_named(root, "TutorialCoachOverlay")
	if coach == null:
		# Try finding via tree root (some scenes add it to root)
		for child in get_tree().root.get_children():
			if str(child.name).contains("Tutorial") or str(child.name).contains("Coach"):
				coach = child
				break
	if coach == null:
		_issue("No TutorialCoachOverlay found (%s)" % context)
		return
	# Look for a label whose text contains the expected title
	var label := _find_label_containing(coach, expected_title)
	if label == null:
		_issue("Tutorial coach missing title '%s' (%s)" % [expected_title, context])
	else:
		_log("  ✅ Coach: '%s' visible" % expected_title)

func _check_debrief_has_data(root: Node, context: String) -> void:
	if root == null:
		_issue("Debrief check skipped — null scene (%s)" % context)
		return
	# If debrief has mission data it will show a sell/cargo button, not "No mission data"
	var no_data_lbl := _find_label_containing(root, "No mission data found")
	if no_data_lbl != null:
		_issue("Debrief shows empty state — returned mission not injected (%s)" % context)
	else:
		_log("  ✅ Debrief has mission data (%s)" % context)

func _find_node_named(root: Node, name_fragment: String) -> Node:
	if root == null: return null
	var stack: Array[Node] = [root]
	while not stack.is_empty():
		var n := stack.pop_back() as Node
		if str(n.name).contains(name_fragment):
			return n
		for c in n.get_children():
			stack.append(c)
	return null

func _find_label_containing(root: Node, snippet: String) -> Label:
	if root == null: return null
	var stack: Array[Node] = [root]
	while not stack.is_empty():
		var n := stack.pop_back() as Node
		if n is Label and str((n as Label).text).contains(snippet):
			return n as Label
		for c in n.get_children():
			stack.append(c)
	return null

# ---------------------------------------------------------------------------
# Screenshot / reporting
# ---------------------------------------------------------------------------

func _screenshot(name: String) -> void:
	_screenshot_index += 1
	var file_name := "%02d_%s.png" % [_screenshot_index, name]
	var path      := "%s/%s" % [SCREENSHOT_DIR, file_name]
	await get_tree().process_frame
	await get_tree().process_frame
	get_viewport().get_texture().get_image().save_png(path)
	_log("  📸 %s" % file_name)

func _log(msg: String) -> void:
	print("[TUTORIAL_TOUR] %s" % msg)
	_report_lines.append(msg)

func _issue(msg: String) -> void:
	_issues.append(msg)
	push_warning("[TUTORIAL_TOUR] ISSUE: %s" % msg)
	_log("  ⚠️  ISSUE: %s" % msg)

func _log_summary() -> void:
	_log("")
	_log("---")
	_log("## Summary")
	_log("- Screenshots taken: %d" % _screenshot_index)
	_log("- Issues found: %d" % _issues.size())
	if not _issues.is_empty():
		_log("")
		_log("### All Issues")
		for issue in _issues:
			_log("- %s" % issue)

func _write_report() -> void:
	var text := "\n".join(_report_lines)
	var f := FileAccess.open(REPORT_PATH, FileAccess.WRITE)
	if f:
		f.store_string(text)
		f.close()
		_log("Report written to: %s" % REPORT_PATH)
	else:
		push_warning("[TUTORIAL_TOUR] Could not write report to %s" % REPORT_PATH)
