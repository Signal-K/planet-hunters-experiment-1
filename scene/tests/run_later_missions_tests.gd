extends SceneTree

## Later Missions Tests (M2, M3, M4)
## Verifies that Missions 2, 3, and 4 are fully playable end-to-end for a
## player who progressed from Mission 1. Each mission's tutorial steps,
## unlock gates, and stage transitions are exercised.

const TestReporter = preload("res://tests/TestReporter.gd")
const RocketsManager = preload("res://Scripts/Utils/RocketsManager.gd")
const TutorialControllerScript = preload("res://Scripts/Tutorial/TutorialController.gd")
const TutorialCatalog = preload("res://Scripts/Tutorial/TutorialCatalog.gd")

var reporter := TestReporter.new()

func _init() -> void:
	reporter.start_suite("Later Missions (M2, M3, M4 End-to-End)", {
		"engine": Engine.get_version_info()["string"],
		"os": OS.get_name(),
		"project": "scene",
		"timestamp": Time.get_datetime_string_from_system()
	})
	await _remove_runtime_singletons()
	await run_all_tests()
	reporter.summary()
	await create_timer(0.1).timeout
	quit(1 if reporter.tests_failed > 0 else 0)

## ── Helpers ──────────────────────────────────────────────────────────────────

func _save_clean_state(badges: Array, extra: Dictionary = {}) -> void:
	var s := {
		"unlocked": ["starterrocket1"],
		"placed": [],
		"launched": [],
		"destroyed": [],
		"missions": [],
		"selected_target": "",
		"preview_target": {},
		"detected_targets": [],
		"seen_asteroids": [],
		"seen_planets": [],
		"scan_counts": {},
		"status_changed_at": {},
		"mission_progress_completed": badges.size(),
		"completed_mission_badges": badges.duplicate(),
		"control_station_built": false,
		"scanner_station_built": false,
		"scanner_unlocked": badges.size() >= 3,
		"scanner_unlock_dialog_seen": false,
		"scanner_next_scan_at": 0,
		"trip_contract_offer": {},
			"operation_mode": "contract",
			"candidate_visit_blocks": {},
			"target_annotation_levels": {},
			"tess_classifications": {},
			"discovery_bonus_claimed": {},
		"rocket_customizations": {},
		"rocket_wear": {},
		"archived_rocket_wear": {},
		"mission_briefings_seen": {},
		"returned_mission": {},
		"mission_progress_schema_version": 2
	}
	for key in extra.keys():
		s[key] = extra[key]
	RocketsManager.save_state(s)

func _reset_to_stage(stage: int, extra: Dictionary = {}) -> void:
	await _remove_runtime_singletons()
	RocketsManager.clear_override_state()
	var badges := []
	for i in range(stage - 1):
		badges.append("mission-%d" % (i + 1))
	_save_clean_state(badges, extra)
	RocketsManager.clear_returned_mission()
	RocketsManager.clear_preview_target()
	RocketsManager.clear_trip_contract_offer()
	RocketsManager.set_pending_mission_guidance_id(0)
	DirAccess.remove_absolute(ProjectSettings.globalize_path("user://tutorial_v2.cfg"))

func _remove_runtime_singletons() -> void:
	for node_name in ["SyncBridge", "AppController"]:
		var node := get_root().find_child(node_name, true, false)
		if node != null:
			node.queue_free()
	await create_timer(0.02).timeout

func _setup_controller() -> Node:
	var c = TutorialControllerScript.new()
	c.name = "TutorialControllerLaterTest"
	get_root().add_child(c)
	await create_timer(0.05).timeout
	return c

func _teardown(c: Node) -> void:
	if is_instance_valid(c):
		c.queue_free()
	await create_timer(0.04).timeout

## ── Run all tests ────────────────────────────────────────────────────────────

func run_all_tests() -> void:
	# ── Mission 2 ──
	await test_m2_01_stage_2_state_correct()
	await test_m2_02_m2_targets_available()
	await test_m2_03_control_station_gates_first_step()
	await test_m2_04_control_station_built_completes_m2_overlay()
	await test_m2_05_sr2_unlocked_at_stage_2()
	await test_m2_06_control_station_action_does_not_advance_to_m3()
	await test_m2_07_completing_m2_advances_to_stage_3()
	# ── Mission 3 ──
	await test_m3_01_stage_3_state_correct()
	await test_m3_02_m3_targets_available()
	await test_m3_03_candidate_classification_controls_reveal_and_access()
	await test_m3_04_all_steps_advance_in_sequence()
	await test_m3_05_completing_m3_advances_to_stage_4()
	# ── Mission 4 ──
	await test_m4_01_stage_4_state_correct()
	await test_m4_02_free_ops_handoff_starts_at_launchpad()
	await test_m4_03_scanner_is_treated_as_available_once_stage4_begins()
	await test_m4_04_all_steps_advance_in_sequence()
	await test_m4_05_completing_m4_unlocks_free_operations()

# ─── M2 Test 1 ───────────────────────────────────────────────────────────────

func test_m2_01_stage_2_state_correct() -> void:
	reporter.start_test("M2-01: After M1 complete, mission stage is 2 with no placed rockets")
	_reset_to_stage(2)
	await create_timer(0.02).timeout
	var stage := RocketsManager.get_mission_stage()
	if stage != 2:
		reporter.fail_test("Expected stage 2, got %d" % stage)
		return
	var placed: Array = RocketsManager.get_placed() as Array
	if placed.size() != 0:
		reporter.fail_test("Expected no placed rockets at stage 2 start, got %d" % placed.size())
		return
	reporter.pass_test()

# ─── M2 Test 2 ───────────────────────────────────────────────────────────────

func test_m2_02_m2_targets_available() -> void:
	reporter.start_test("M2-02: Mission 2 has asteroid targets available")
	_reset_to_stage(2)
	await create_timer(0.02).timeout
	var targets: Array = RocketsManager.get_mission2_targets() as Array
	if targets.size() == 0:
		reporter.fail_test("get_mission2_targets() returned empty at stage 2")
		return
	var first: Dictionary = targets[0] as Dictionary
	if str(first.get("id", "")) == "":
		reporter.fail_test("First M2 target has no id")
		return
	if str(first.get("type", "")) != "asteroid":
		reporter.fail_test("M2 targets should be asteroids, got '%s'" % first.get("type", ""))
		return
	reporter.pass_test()

# ─── M2 Test 3 ───────────────────────────────────────────────────────────────

func test_m2_03_control_station_gates_first_step() -> void:
	reporter.start_test("M2-03: Tutorial M2 first step is 'build_control_station' when not built")
	_reset_to_stage(2)
	var tc = await _setup_controller()
	var state: Dictionary = tc.get_tutorial_state() as Dictionary
	var step: Dictionary = state.get("current_step", {}) as Dictionary
	var key := str(step.get("action_key", ""))
	if key != "build_control_station":
		reporter.fail_test("Expected 'build_control_station', got '%s'" % key)
		await _teardown(tc)
		return
	await _teardown(tc)
	reporter.pass_test()

# ─── M2 Test 4 ───────────────────────────────────────────────────────────────

func test_m2_04_control_station_built_completes_m2_overlay() -> void:
	reporter.start_test("M2-04: When Control Station is built, Mission 2 overlay has no checklist steps")
	_reset_to_stage(2)
	RocketsManager.set_control_station_built(true)
	var tc = await _setup_controller()
	# The reconciler should auto-satisfy build_control_station since is_control_station_built() is true
	var state: Dictionary = tc.get_tutorial_state() as Dictionary
	var step: Dictionary = state.get("current_step", {}) as Dictionary
	var key := str(step.get("action_key", ""))
	if key != "":
		reporter.fail_test("Expected no overlay step after control station built, got '%s'" % key)
		await _teardown(tc)
		return
	if int(state.get("current_stage", 0)) != 2:
		reporter.fail_test("Expected tutorial to remain on mission stage 2 until M2 is complete")
		await _teardown(tc)
		return
	await _teardown(tc)
	reporter.pass_test()

# ─── M2 Test 5 ───────────────────────────────────────────────────────────────

func test_m2_05_sr2_unlocked_at_stage_2() -> void:
	reporter.start_test("M2-05: Starter Rocket 2 can be unlocked at stage 2")
	_reset_to_stage(2)
	# SR2 isn't auto-unlocked — it needs to be unlocked explicitly (simulating purchase/progression)
	var ok := RocketsManager.unlock("starterrocket2")
	if not ok:
		reporter.fail_test("unlock('starterrocket2') returned false")
		return
	var unlocked: Array = RocketsManager.get_unlocked() as Array
	if not unlocked.has("starterrocket2"):
		reporter.fail_test("SR2 not in unlocked list after unlock()")
		return
	reporter.pass_test()

# ─── M2 Test 6 ───────────────────────────────────────────────────────────────

func test_m2_06_control_station_action_does_not_advance_to_m3() -> void:
	reporter.start_test("M2-06: Mission 2 tutorial is only the Control Station gate and does not advance to M3 early")
	_reset_to_stage(2)
	var tc = await _setup_controller()
	var catalog := TutorialCatalog.new()
	var m2_steps: Array = catalog.get_mission_steps(2) as Array
	if m2_steps.size() != 1:
		reporter.fail_test("Expected 1 M2 tutorial gate, got %d" % m2_steps.size())
		await _teardown(tc)
		return
	var expected_key := str((m2_steps[0] as Dictionary).get("action_key", ""))
	if expected_key != "build_control_station":
		reporter.fail_test("Expected M2 gate 'build_control_station', got '%s'" % expected_key)
		await _teardown(tc)
		return
	tc.record_action("build_control_station")
	await create_timer(0.02).timeout
	var final_state: Dictionary = tc.get_tutorial_state() as Dictionary
	var final_key := str(final_state.get("current_step", {}).get("action_key", ""))
	if final_key == "build_control_station":
		reporter.fail_test("After the M2 gate clears, the tutorial should not keep repeating the Control Station step")
		await _teardown(tc)
		return
	await _teardown(tc)
	reporter.pass_test()

# ─── M2 Test 7 ───────────────────────────────────────────────────────────────

func test_m2_07_completing_m2_advances_to_stage_3() -> void:
	reporter.start_test("M2-07: Marking M2 complete advances game stage to 3")
	_reset_to_stage(2)
	await create_timer(0.02).timeout
	var s: Dictionary = RocketsManager.load_state() as Dictionary
	s["completed_mission_badges"] = ["mission-1", "mission-2"]
	s["mission_progress_completed"] = 2
	RocketsManager.save_state(s)
	await create_timer(0.02).timeout
	var stage := RocketsManager.get_mission_stage()
	if stage < 3:
		reporter.fail_test("Expected stage 3 or later after M2 complete, got %d" % stage)
		return
	reporter.pass_test()

# ─── M3 Test 1 ───────────────────────────────────────────────────────────────

func test_m3_01_stage_3_state_correct() -> void:
	reporter.start_test("M3-01: After M2 complete, mission stage is 3")
	_reset_to_stage(3)
	await create_timer(0.02).timeout
	var stage := RocketsManager.get_mission_stage()
	if stage != 3:
		reporter.fail_test("Expected stage 3, got %d" % stage)
		return
	reporter.pass_test()

# ─── M3 Test 2 ───────────────────────────────────────────────────────────────

func test_m3_02_m3_targets_available() -> void:
	reporter.start_test("M3-02: Mission 3 has cached TESS planet candidate targets and star systems")
	_reset_to_stage(3)
	await create_timer(0.02).timeout
	var targets: Array = RocketsManager.get_mission3_targets() as Array
	if targets.size() < 3:
		reporter.fail_test("Expected at least 3 cached M3 TESS candidates, got %d" % targets.size())
		return
	var first: Dictionary = targets[0] as Dictionary
	if str(first.get("id", "")) == "":
		reporter.fail_test("First M3 target has no id")
		return
	if str(first.get("anomalySet", "")) != "telescope-tess" or str(first.get("tess_disposition", "")) != "PC":
		reporter.fail_test("First M3 target should be an unconfirmed TESS candidate")
		return
	if str(first.get("ticId", "")) == "" or str(first.get("parent_star", "")) == "":
		reporter.fail_test("M3 candidate is missing cached TIC or parent star metadata")
		return
	var systems: Array = RocketsManager.get_unlocked_star_systems(3)
	if systems.size() < 2:
		reporter.fail_test("Expected multiple star systems for M3 map context, got %d" % systems.size())
		return
	reporter.pass_test()

# ─── M3 Test 3 ───────────────────────────────────────────────────────────────

func test_m3_03_candidate_classification_controls_reveal_and_access() -> void:
	reporter.start_test("M3-03: Candidate classification is planet-only in Mission 3")
	_reset_to_stage(3)
	await create_timer(0.02).timeout
	var targets: Array = RocketsManager.get_mission3_targets() as Array
	
	var tess_cand: Dictionary = {}
	for t_any in targets:
		var t: Dictionary = t_any as Dictionary
		if str(t.get("anomalySet", "")) == "telescope-tess" and tess_cand.is_empty():
			tess_cand = t
	
	if tess_cand.is_empty():
		reporter.fail_test("No TESS candidate found in M3 targets")
		return

	var tess_id := str(tess_cand.get("id", ""))
	var tess_result := RocketsManager.classify_candidate_target(tess_id, "planet", 2)
	if not bool(tess_result.get("confirmed", false)):
		reporter.fail_test("TESS 'planet' classification should confirm the candidate")
		return

	for target_any in targets:
		var target: Dictionary = target_any as Dictionary
		if str(target.get("anomalySet", "")) != "telescope-tess":
			reporter.fail_test("Mission 3 target list should not include non-TESS candidates")
			return

	if RocketsManager.is_candidate_visit_blocked(tess_id):
		reporter.fail_test("Confirmed planet candidate should not be visit-blocked")
		return
		
	reporter.pass_test()

# ─── M3 Test 4 ───────────────────────────────────────────────────────────────

func test_m3_04_all_steps_advance_in_sequence() -> void:
	reporter.start_test("M3-04: All 7 Mission 3 tutorial steps advance in correct order")
	_reset_to_stage(3)
	var tc = await _setup_controller()
	var catalog := TutorialCatalog.new()
	var m3_steps: Array = catalog.get_mission_steps(3) as Array
	if m3_steps.size() != 7:
		reporter.fail_test("Expected 7 M3 steps, got %d" % m3_steps.size())
		await _teardown(tc)
		return
	if str((m3_steps[1] as Dictionary).get("action_key", "")) != "classify_candidate":
		reporter.fail_test("M3 should introduce classification before target selection")
		await _teardown(tc)
		return
	for i in range(m3_steps.size()):
		var expected_key := str((m3_steps[i] as Dictionary).get("action_key", ""))
		var cur_state: Dictionary = tc.get_tutorial_state() as Dictionary
		var cur_step: Dictionary = cur_state.get("current_step", {}) as Dictionary
		var cur_key := str(cur_step.get("action_key", ""))
		if cur_key != expected_key:
			reporter.fail_test("M3 Step %d: expected '%s', got '%s'" % [i, expected_key, cur_key])
			await _teardown(tc)
			return
		tc.record_action(expected_key)
		await create_timer(0.02).timeout
	var final_state: Dictionary = tc.get_tutorial_state() as Dictionary
	var final_stage := int(final_state.get("current_stage", 3))
	if final_stage != 3:
		reporter.fail_test("After all M3 tutorial steps, stage should remain 3 until M3 completion is recorded, got %d" % final_stage)
		await _teardown(tc)
		return
	await _teardown(tc)
	reporter.pass_test()

# ─── M3 Test 5 ───────────────────────────────────────────────────────────────

func test_m3_05_completing_m3_advances_to_stage_4() -> void:
	reporter.start_test("M3-05: Marking M3 complete advances game stage to 4")
	_reset_to_stage(3)
	await create_timer(0.02).timeout
	var s: Dictionary = RocketsManager.load_state() as Dictionary
	s["completed_mission_badges"] = ["mission-1", "mission-2", "mission-3"]
	s["mission_progress_completed"] = 3
	RocketsManager.save_state(s)
	await create_timer(0.02).timeout
	var stage := RocketsManager.get_mission_stage()
	if stage != 4:
		reporter.fail_test("Expected stage 4 after M3 complete, got %d" % stage)
		return
	reporter.pass_test()

# ─── M4 Test 1 ───────────────────────────────────────────────────────────────

func test_m4_01_stage_4_state_correct() -> void:
	reporter.start_test("M4-01: After M3 complete, mission stage is 4 and scanner is unlocked")
	_reset_to_stage(4)
	await create_timer(0.02).timeout
	var stage := RocketsManager.get_mission_stage()
	if stage != 4:
		reporter.fail_test("Expected stage 4, got %d" % stage)
		return
	if not RocketsManager.is_scanner_unlocked():
		reporter.fail_test("Scanner should be unlocked at stage 4 (3 completed missions)")
		return
	reporter.pass_test()

# ─── M4 Test 2 ───────────────────────────────────────────────────────────────

func test_m4_02_free_ops_handoff_starts_at_launchpad() -> void:
	reporter.start_test("M4-02: Tutorial M4 starts by handing the player back to the Launchpad")
	_reset_to_stage(4)
	var tc = await _setup_controller()
	var state: Dictionary = tc.get_tutorial_state() as Dictionary
	var step: Dictionary = state.get("current_step", {}) as Dictionary
	var key := str(step.get("action_key", ""))
	if key != "open_launchpad":
		reporter.fail_test("Expected 'open_launchpad', got '%s'" % key)
		await _teardown(tc)
		return
	await _teardown(tc)
	reporter.pass_test()

# ─── M4 Test 3 ───────────────────────────────────────────────────────────────

func test_m4_03_scanner_is_treated_as_available_once_stage4_begins() -> void:
	reporter.start_test("M4-03: Stage 4 reconciles legacy scanner build state")
	_reset_to_stage(4, {"scanner_station_built": true})
	var tc = await _setup_controller()
	if not RocketsManager.is_scanner_station_built():
		reporter.fail_test("Expected scanner station to be treated as built once stage 4 begins")
		await _teardown(tc)
		return
	var state: Dictionary = tc.get_tutorial_state() as Dictionary
	var step: Dictionary = state.get("current_step", {}) as Dictionary
	var key := str(step.get("action_key", ""))
	if key != "open_launchpad":
		reporter.fail_test("Expected 'open_launchpad' after scanner reconciliation, got '%s'" % key)
		await _teardown(tc)
		return
	await _teardown(tc)
	reporter.pass_test()

# ─── M4 Test 4 ───────────────────────────────────────────────────────────────

func test_m4_04_all_steps_advance_in_sequence() -> void:
	reporter.start_test("M4-04: Mission 4 autonomy steps advance in correct order")
	_reset_to_stage(4)
	var tc = await _setup_controller()
	var catalog := TutorialCatalog.new()
	var m4_steps: Array = catalog.get_mission_steps(4) as Array
	if m4_steps.size() != 5:
		reporter.fail_test("Expected 5 M4 steps, got %d" % m4_steps.size())
		await _teardown(tc)
		return
	for i in range(m4_steps.size()):
		var expected_key := str((m4_steps[i] as Dictionary).get("action_key", ""))
		var cur_state: Dictionary = tc.get_tutorial_state() as Dictionary
		var cur_step: Dictionary = cur_state.get("current_step", {}) as Dictionary
		var cur_key := str(cur_step.get("action_key", ""))
		if cur_key != expected_key:
			reporter.fail_test("M4 Step %d: expected '%s', got '%s'" % [i, expected_key, cur_key])
			await _teardown(tc)
			return
		tc.record_action(expected_key)
		await create_timer(0.02).timeout
	# M4 is the last authored mission — stage stays at 4 (Free Operations)
	var final_state: Dictionary = tc.get_tutorial_state() as Dictionary
	var final_stage := int(final_state.get("current_stage", 4))
	if final_stage < 4:
		reporter.fail_test("After all M4 steps, stage should be >= 4, got %d" % final_stage)
		await _teardown(tc)
		return
	await _teardown(tc)
	reporter.pass_test()

# ─── M4 Test 5 ───────────────────────────────────────────────────────────────

func test_m4_05_completing_m4_unlocks_free_operations() -> void:
	reporter.start_test("M4-05: Completing M4 (4 missions total) unlocks Free Operations")
	_reset_to_stage(4)
	await create_timer(0.02).timeout
	# Free Operations requires 4 completed missions (SCANNER_UNLOCK = 3, Free Ops = 4)
	if RocketsManager.is_free_operations_unlocked():
		reporter.fail_test("Free Operations should NOT be unlocked before M4 completion")
		return
	var s: Dictionary = RocketsManager.load_state() as Dictionary
	s["completed_mission_badges"] = ["mission-1", "mission-2", "mission-3", "mission-4"]
	s["mission_progress_completed"] = 4
	RocketsManager.save_state(s)
	await create_timer(0.02).timeout
	if not RocketsManager.is_free_operations_unlocked():
		reporter.fail_test("Free Operations should be unlocked after 4 completed missions")
		return
	reporter.pass_test()
