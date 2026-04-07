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
	var badges := []
	for i in range(stage - 1):
		badges.append("mission-%d" % (i + 1))
	_save_clean_state(badges, extra)
	RocketsManager.clear_returned_mission()
	RocketsManager.clear_preview_target()
	RocketsManager.clear_trip_contract_offer()
	DirAccess.remove_absolute("user://tutorial_v2.cfg")

func _setup_controller() -> Node:
	var c = TutorialControllerScript.new()
	c.name = "TutorialController"
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
	await test_m2_04_control_station_built_skips_to_contractor()
	await test_m2_05_sr2_unlocked_at_stage_2()
	await test_m2_06_all_steps_advance_in_sequence()
	await test_m2_07_completing_m2_advances_to_stage_3()
	# ── Mission 3 ──
	await test_m3_01_stage_3_state_correct()
	await test_m3_02_m3_targets_available()
	await test_m3_03_all_steps_advance_in_sequence()
	await test_m3_04_completing_m3_advances_to_stage_4()
	# ── Mission 4 ──
	await test_m4_01_stage_4_state_correct()
	await test_m4_02_scanner_gates_first_step()
	await test_m4_03_scanner_built_skips_to_scan()
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

func test_m2_04_control_station_built_skips_to_contractor() -> void:
	reporter.start_test("M2-04: When Control Station is built, tutorial skips to 'accept_contractor_offer'")
	_reset_to_stage(2, {"control_station_built": true})
	var tc = await _setup_controller()
	# The reconciler should auto-satisfy build_control_station since is_control_station_built() is true
	var state: Dictionary = tc.get_tutorial_state() as Dictionary
	var step: Dictionary = state.get("current_step", {}) as Dictionary
	var key := str(step.get("action_key", ""))
	if key != "accept_contractor_offer":
		reporter.fail_test("Expected 'accept_contractor_offer' after control station built, got '%s'" % key)
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

func test_m2_06_all_steps_advance_in_sequence() -> void:
	reporter.start_test("M2-06: All 8 Mission 2 tutorial steps advance in correct order")
	_reset_to_stage(2)
	var tc = await _setup_controller()
	var catalog := TutorialCatalog.new()
	var m2_steps: Array = catalog.get_mission_steps(2) as Array
	if m2_steps.size() != 8:
		reporter.fail_test("Expected 8 M2 steps, got %d" % m2_steps.size())
		await _teardown(tc)
		return
	for i in range(m2_steps.size()):
		var expected_key := str((m2_steps[i] as Dictionary).get("action_key", ""))
		var cur_state: Dictionary = tc.get_tutorial_state() as Dictionary
		var cur_step: Dictionary = cur_state.get("current_step", {}) as Dictionary
		var cur_key := str(cur_step.get("action_key", ""))
		if cur_key != expected_key:
			reporter.fail_test("M2 Step %d: expected '%s', got '%s'" % [i, expected_key, cur_key])
			await _teardown(tc)
			return
		tc.record_action(expected_key)
		await create_timer(0.02).timeout
	var final_state: Dictionary = tc.get_tutorial_state() as Dictionary
	var final_stage := int(final_state.get("current_stage", 2))
	if final_stage < 3:
		reporter.fail_test("After all M2 steps, stage should be >= 3, got %d" % final_stage)
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
	if stage != 3:
		reporter.fail_test("Expected stage 3 after M2 complete, got %d" % stage)
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
	reporter.start_test("M3-02: Mission 3 has TESS planet candidate targets available")
	_reset_to_stage(3)
	await create_timer(0.02).timeout
	var targets: Array = RocketsManager.get_mission3_targets() as Array
	if targets.size() == 0:
		reporter.fail_test("get_mission3_targets() returned empty at stage 3")
		return
	var first: Dictionary = targets[0] as Dictionary
	if str(first.get("id", "")) == "":
		reporter.fail_test("First M3 target has no id")
		return
	reporter.pass_test()

# ─── M3 Test 3 ───────────────────────────────────────────────────────────────

func test_m3_03_all_steps_advance_in_sequence() -> void:
	reporter.start_test("M3-03: All 6 Mission 3 tutorial steps advance in correct order")
	_reset_to_stage(3)
	var tc = await _setup_controller()
	var catalog := TutorialCatalog.new()
	var m3_steps: Array = catalog.get_mission_steps(3) as Array
	if m3_steps.size() != 6:
		reporter.fail_test("Expected 6 M3 steps, got %d" % m3_steps.size())
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
	if final_stage < 4:
		reporter.fail_test("After all M3 steps, stage should be >= 4, got %d" % final_stage)
		await _teardown(tc)
		return
	await _teardown(tc)
	reporter.pass_test()

# ─── M3 Test 4 ───────────────────────────────────────────────────────────────

func test_m3_04_completing_m3_advances_to_stage_4() -> void:
	reporter.start_test("M3-04: Marking M3 complete advances game stage to 4")
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

func test_m4_02_scanner_gates_first_step() -> void:
	reporter.start_test("M4-02: Tutorial M4 first step is 'build_scanner_station' when not built")
	_reset_to_stage(4)
	var tc = await _setup_controller()
	var state: Dictionary = tc.get_tutorial_state() as Dictionary
	var step: Dictionary = state.get("current_step", {}) as Dictionary
	var key := str(step.get("action_key", ""))
	if key != "build_scanner_station":
		reporter.fail_test("Expected 'build_scanner_station', got '%s'" % key)
		await _teardown(tc)
		return
	await _teardown(tc)
	reporter.pass_test()

# ─── M4 Test 3 ───────────────────────────────────────────────────────────────

func test_m4_03_scanner_built_skips_to_scan() -> void:
	reporter.start_test("M4-03: When Scanner Station is built, tutorial skips to 'scan_targets'")
	_reset_to_stage(4, {"scanner_station_built": true})
	var tc = await _setup_controller()
	var state: Dictionary = tc.get_tutorial_state() as Dictionary
	var step: Dictionary = state.get("current_step", {}) as Dictionary
	var key := str(step.get("action_key", ""))
	if key != "scan_targets":
		reporter.fail_test("Expected 'scan_targets' after scanner built, got '%s'" % key)
		await _teardown(tc)
		return
	await _teardown(tc)
	reporter.pass_test()

# ─── M4 Test 4 ───────────────────────────────────────────────────────────────

func test_m4_04_all_steps_advance_in_sequence() -> void:
	reporter.start_test("M4-04: All 6 Mission 4 tutorial steps advance in correct order")
	_reset_to_stage(4)
	var tc = await _setup_controller()
	var catalog := TutorialCatalog.new()
	var m4_steps: Array = catalog.get_mission_steps(4) as Array
	if m4_steps.size() != 6:
		reporter.fail_test("Expected 6 M4 steps, got %d" % m4_steps.size())
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
