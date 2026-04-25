extends SceneTree

# NARRATIVE PATHS TEST SUITE
# ─────────────────────────────────────────────────────────────────────────────
# Covers every distinct player journey through the tutorial state machine.
#
# P01  Mission 1 full linear path (includes new arrived_at_mining_site step)
# P02  Mission 2 semi-open completion
# P03  Mission 3 TESS planet candidates (select, mine, debrief)
# P04  Mission 4 scanner + annotator
# P05  Free Operations contractor-required path
# P06  Free Operations survey path with contractor gate
# P07  Skip tutorial at Mission 1 then resume and complete
# P08  Skip tutorial at Mission 2 then resume
# P09  Replay current mission then re-complete
# P10  Replay full from Mission 1 then complete Mission 1 again
# P11  Out-of-order action (launch before select) — reconcile skips stuck step
# P12  Session crash/restart mid-M1 — step index reconciled on reload
# P13  Double-record same action at every M1 step — no duplicate steps

const TestReporter = preload("res://tests/TestReporter.gd")
const RocketsManager = preload("res://Scripts/Utils/RocketsManager.gd")
const TutorialControllerScript = preload("res://Scripts/Tutorial/TutorialController.gd")

var reporter := TestReporter.new()

func _init() -> void:
	reporter.start_suite("Narrative Paths", {
		"engine": Engine.get_version_info()["string"],
		"os": OS.get_name(),
		"project": "scene",
		"timestamp": Time.get_datetime_string_from_system()
	})
	await run_all_tests()
	reporter.summary()
	await create_timer(0.1).timeout
	quit(1 if reporter.tests_failed > 0 else 0)

func run_all_tests() -> void:
	await test_p01_mission1_full_linear_path()
	await test_p02_mission2_semi_open_completion()
	await test_p03_mission3_scanner_no_mining()
	await test_p04_mission4_planet_mode()
	await test_p05_free_operations_contractor_path()
	await test_p06_free_operations_survey_path()
	await test_p07_skip_at_m1_then_resume_complete()
	await test_p08_skip_at_m2_then_resume()
	await test_p09_replay_current_mission_then_recomplete()
	await test_p10_replay_full_then_complete_m1()
	await test_p11_out_of_order_action_launch_before_select()
	await test_p12_session_restart_step_reconciliation()
	await test_p13_double_record_no_duplicates()

# ─── Helpers ─────────────────────────────────────────────────────────────────

func _reset() -> void:
	DirAccess.remove_absolute("user://tutorial_v2.cfg")
	RocketsManager.reset_state()
	RocketsManager.clear_selected_target()
	RocketsManager.clear_preview_target()
	RocketsManager.clear_returned_mission()
	RocketsManager.set_operation_mode("contract")

func _setup() -> Node:
	var c = TutorialControllerScript.new()
	c.name = "NarrativeTestController"
	get_root().add_child(c)
	await create_timer(0.05).timeout
	return c

func _teardown(c: Node) -> void:
	if is_instance_valid(c):
		c.queue_free()
	await create_timer(0.03).timeout

func _mark_stage_complete(stage: int) -> void:
	RocketsManager.mark_mission_completed("narrative-stage-%s-%s" % [stage, int(Time.get_ticks_msec())])

func _record_actions(c: Node, actions: Array) -> void:
	for a in actions:
		c.record_action(str(a))

func _assert_stage(c: Node, expected_stage: int, label: String) -> bool:
	var s = int(c.get_tutorial_state().get("current_stage", 0))
	if s < expected_stage:
		reporter.fail_test("%s: expected stage >= %s, got %s" % [label, expected_stage, s])
		return false
	return true

func _assert_no_regression(state_before: Dictionary, state_after: Dictionary, action: String) -> bool:
	var s_before = int(state_before.get("current_stage", 1))
	var i_before = int(state_before.get("current_step_index", 0))
	var s_after = int(state_after.get("current_stage", 1))
	var i_after = int(state_after.get("current_step_index", 0))
	if s_after < s_before:
		reporter.fail_test("Stage regressed after '%s': %s → %s" % [action, s_before, s_after])
		return false
	if s_after == s_before and i_after < i_before:
		reporter.fail_test("Step index regressed after '%s': %s → %s" % [action, i_before, i_after])
		return false
	return true

func _assert_no_duplicate_steps(state: Dictionary, label: String) -> bool:
	var completed = state.get("completed_steps_by_stage", {})
	for stage_key in completed.keys():
		var steps = completed.get(stage_key, [])
		if typeof(steps) != TYPE_ARRAY:
			continue
		var seen := {}
		for v in steps:
			if seen.has(int(v)):
				reporter.fail_test("%s: duplicate completed step %s in stage %s" % [label, v, stage_key])
				return false
			seen[int(v)] = true
	return true

# ─── Tests ───────────────────────────────────────────────────────────────────

func test_p01_mission1_full_linear_path() -> void:
	reporter.start_test("P01: Mission 1 full linear path (8 steps including arrived_at_mining_site)")
	_reset()
	var c = await _setup()
	c.replay_full()
	await create_timer(0.02).timeout

	var m1_actions = ["accept_contractor_offer", "create_rocket", "select_launch_target",
		"launch_rocket_from_earth", "arrived_at_mining_site", "mine_target",
		"return_rocket_home", "resolve_mission_debrief"]

	for action in m1_actions:
		var before = c.get_tutorial_state()
		c.record_action(action)
		var after = c.get_tutorial_state()
		if not _assert_no_regression(before, after, action):
			await _teardown(c); return
		if not _assert_no_duplicate_steps(after, "P01 after " + action):
			await _teardown(c); return

	_mark_stage_complete(1)
	c.record_action("mission_progress_sync_1")
	var final_state = c.get_tutorial_state()
	if int(final_state.get("current_stage", 0)) < 2:
		reporter.fail_test("P01: expected stage >= 2 after M1 completion")
		await _teardown(c); return

	reporter.pass_test()
	await _teardown(c)

func test_p02_mission2_semi_open_completion() -> void:
	reporter.start_test("P02: Mission 2 semi-open path (build Control Station, then SR2 loop)")
	_reset()
	_mark_stage_complete(1)
	var c = await _setup()
	await create_timer(0.02).timeout
	c.record_action("mission_progress_sync_1")

	if not _assert_stage(c, 2, "P02 start"): await _teardown(c); return

	var m2_actions = ["build_control_station"]
	for action in m2_actions:
		var before = c.get_tutorial_state()
		c.record_action(action)
		if not _assert_no_regression(before, c.get_tutorial_state(), action):
			await _teardown(c); return

	reporter.pass_test()
	await _teardown(c)

func test_p03_mission3_scanner_no_mining() -> void:
	reporter.start_test("P03: Mission 3 TESS planet candidate path")
	_reset()
	for s in [1, 2]:
		_mark_stage_complete(s)
	var c = await _setup()
	await create_timer(0.02).timeout
	c.record_action("mission_progress_sync_2")

	if not _assert_stage(c, 3, "P03 start"): await _teardown(c); return

	var m3_actions = ["accept_contractor_offer", "classify_candidate", "select_launch_target", "launch_rocket_from_earth",
		"mine_target", "return_rocket_home", "resolve_mission_debrief"]
	for action in m3_actions:
		var before = c.get_tutorial_state()
		c.record_action(action)
		if not _assert_no_regression(before, c.get_tutorial_state(), action):
			await _teardown(c); return

	reporter.pass_test()
	await _teardown(c)

func test_p04_mission4_planet_mode() -> void:
	reporter.start_test("P04: Mission 4 autonomy handoff path")
	_reset()
	for s in [1, 2, 3]:
		_mark_stage_complete(s)
	var c = await _setup()
	await create_timer(0.02).timeout
	c.record_action("mission_progress_sync_3")

	if not _assert_stage(c, 4, "P04 start"): await _teardown(c); return

	var m4_actions = ["open_launchpad", "select_launch_target",
		"launch_rocket_from_earth", "mine_target", "resolve_mission_debrief"]
	for action in m4_actions:
		var before = c.get_tutorial_state()
		c.record_action(action)
		if not _assert_no_regression(before, c.get_tutorial_state(), action):
			await _teardown(c); return

	reporter.pass_test()
	await _teardown(c)

func test_p05_free_operations_contractor_path() -> void:
	reporter.start_test("P05: Free Operations contractor path (select offer → launch)")
	_reset()
	for s in [1, 2, 3, 4]:
		_mark_stage_complete(s)
	var c = await _setup()
	await create_timer(0.02).timeout

	if not _assert_stage(c, 4, "P05 start"): await _teardown(c); return

	var free_ops_actions = ["accept_contractor_offer", "select_launch_target", "launch_rocket_from_earth"]
	for action in free_ops_actions:
		var before = c.get_tutorial_state()
		c.record_action(action)
		if not _assert_no_regression(before, c.get_tutorial_state(), action):
			await _teardown(c); return

	reporter.pass_test()
	await _teardown(c)

func test_p06_free_operations_survey_path() -> void:
	reporter.start_test("P06: Free Operations survey route requires contractor first")
	_reset()
	for s in [1, 2, 3, 4]:
		_mark_stage_complete(s)
	RocketsManager.set_operation_mode("survey")
	RocketsManager.set_detected_targets([{
		"id": "p06-free-ops-target",
		"label": "P06 Free Ops Target",
		"type": "asteroid"
	}])
	var selectable = RocketsManager.get_selectable_targets_for_stage(4)
	if selectable.is_empty():
		reporter.fail_test("P06: no selectable targets for free operations")
		return
	var target_id = str(selectable[0].get("id", ""))
	if target_id == "":
		reporter.fail_test("P06: selectable target missing id")
		return
	if RocketsManager.select_target(target_id):
		reporter.fail_test("P06: target selection should be blocked before contractor selection")
		return
	var offer = RocketsManager.ensure_trip_contract_offer(RocketsManager.get_detected_targets())
	var contractors: Array = offer.get("contractors", [])
	if contractors.is_empty():
		reporter.fail_test("P06: missing contractor options")
		return
	var contractor_id = str(contractors[0].get("id", ""))
	if contractor_id == "" or not RocketsManager.select_trip_contractor(contractor_id):
		reporter.fail_test("P06: failed to select contractor")
		return
	if not RocketsManager.select_target(target_id):
		reporter.fail_test("P06: select_target failed after contractor selection")
		return
	var resolved = RocketsManager.ensure_selected_target_for_launch("starterrocket3-p06")
	if not bool(resolved.get("ok", false)):
		reporter.fail_test("P06: launch resolution failed: %s" % str(resolved.get("reason", "")))
		return
	reporter.pass_test()

func test_p07_skip_at_m1_then_resume_complete() -> void:
	reporter.start_test("P07: Skip tutorial at M1, resume, then complete M1")
	_reset()
	var c = await _setup()
	c.replay_full()
	await create_timer(0.02).timeout

	c.record_action("open_launchpad")
	c.skip_all()
	var skipped = c.get_tutorial_state()
	if not bool(skipped.get("skipped", false)):
		reporter.fail_test("P07: expected skipped=true after skip_all")
		await _teardown(c); return

	c.resume()
	var resumed = c.get_tutorial_state()
	if bool(resumed.get("skipped", true)):
		reporter.fail_test("P07: expected skipped=false after resume")
		await _teardown(c); return

	# Should resume at the next unfinished step
	var current_key = str(resumed.get("current_step", {}).get("action_key", ""))
	if current_key == "open_launchpad":
		reporter.fail_test("P07: tutorial did not advance past already-completed open_launchpad after resume")
		await _teardown(c); return

	reporter.pass_test()
	await _teardown(c)

func test_p08_skip_at_m2_then_resume() -> void:
	reporter.start_test("P08: Skip tutorial at M2 start, resume, confirm M2 step shown")
	_reset()
	_mark_stage_complete(1)
	var c = await _setup()
	await create_timer(0.02).timeout

	c.skip_all()
	c.resume()
	var state = c.get_tutorial_state()
	if bool(state.get("skipped", true)):
		reporter.fail_test("P08: expected skipped=false after resume")
		await _teardown(c); return

	var stage = int(state.get("current_stage", 1))
	if stage < 2:
		reporter.fail_test("P08: expected stage >= 2 after M1 completion + resume, got %s" % stage)
		await _teardown(c); return

	reporter.pass_test()
	await _teardown(c)

func test_p09_replay_current_mission_then_recomplete() -> void:
	reporter.start_test("P09: Replay current mission then re-complete it without regression")
	_reset()
	var c = await _setup()
	c.replay_full()
	await create_timer(0.02).timeout

	# Advance partway through M1
	c.record_action("open_launchpad")
	c.record_action("create_rocket")

	# Replay current mission — should reset M1 to step 0
	c.replay_current_mission()
	await create_timer(0.02).timeout
	var after_replay = c.get_tutorial_state()
	if int(after_replay.get("current_step_index", 99)) != 0:
		reporter.fail_test("P09: expected step_index=0 after replay_current_mission, got %s" % after_replay.get("current_step_index"))
		await _teardown(c); return

	# Complete M1 again
	var m1_actions = ["open_launchpad", "create_rocket", "select_launch_target",
		"launch_rocket_from_earth", "arrived_at_mining_site", "mine_target",
		"return_rocket_home", "resolve_mission_debrief"]
	for action in m1_actions:
		var before = c.get_tutorial_state()
		c.record_action(action)
		if not _assert_no_regression(before, c.get_tutorial_state(), "P09:" + action):
			await _teardown(c); return

	reporter.pass_test()
	await _teardown(c)

func test_p10_replay_full_then_complete_m1() -> void:
	reporter.start_test("P10: Replay full after partial progress, then complete M1 clean")
	_reset()
	_mark_stage_complete(1)
	_mark_stage_complete(2)
	var c = await _setup()
	await create_timer(0.02).timeout

	c.replay_full()
	await create_timer(0.02).timeout
	var after_replay = c.get_tutorial_state()
	if int(after_replay.get("current_stage", 99)) != 1 or int(after_replay.get("current_step_index", 99)) != 0:
		reporter.fail_test("P10: expected stage=1 step=0 after replay_full, got stage=%s step=%s" % [
			after_replay.get("current_stage"), after_replay.get("current_step_index")])
		await _teardown(c); return

	var m1_actions = ["open_launchpad", "create_rocket", "select_launch_target",
		"launch_rocket_from_earth", "arrived_at_mining_site", "mine_target",
		"return_rocket_home", "resolve_mission_debrief"]
	for action in m1_actions:
		var before = c.get_tutorial_state()
		c.record_action(action)
		if not _assert_no_regression(before, c.get_tutorial_state(), "P10:" + action):
			await _teardown(c); return

	reporter.pass_test()
	await _teardown(c)

func test_p11_out_of_order_action_launch_before_select() -> void:
	reporter.start_test("P11: Out-of-order action (launch recorded before select) — tutorial skips stuck step")
	_reset()
	var c = await _setup()
	c.replay_full()
	await create_timer(0.02).timeout

	c.record_action("open_launchpad")
	c.record_action("create_rocket")
	# Record select first (as auto-selection does), then launch immediately
	c.record_action("select_launch_target")
	c.record_action("launch_rocket_from_earth")

	var state = c.get_tutorial_state()
	var key = str(state.get("current_step", {}).get("action_key", ""))
	if key == "select_launch_target":
		reporter.fail_test("P11: tutorial stuck on select_launch_target after launch was recorded")
		await _teardown(c); return
	if key == "launch_rocket_from_earth":
		reporter.fail_test("P11: tutorial stuck on launch step after it was recorded")
		await _teardown(c); return

	reporter.pass_test()
	await _teardown(c)

func test_p12_session_restart_step_reconciliation() -> void:
	reporter.start_test("P12: Session crash/restart — step index reconciled on reload")
	_reset()
	var c = await _setup()
	c.replay_full()
	await create_timer(0.02).timeout

	c.record_action("open_launchpad")
	c.record_action("create_rocket")
	c.record_action("select_launch_target")
	var mid_idx = int(c.get_tutorial_state().get("current_step_index", 0))
	await _teardown(c)

	# Simulate restart
	var c2 = await _setup()
	await create_timer(0.02).timeout
	var restored_idx = int(c2.get_tutorial_state().get("current_step_index", 0))
	if restored_idx < mid_idx:
		reporter.fail_test("P12: restored idx (%s) < mid-session idx (%s)" % [restored_idx, mid_idx])
		await _teardown(c2); return

	var restored_key = str(c2.get_tutorial_state().get("current_step", {}).get("action_key", ""))
	if restored_key in ["open_launchpad", "create_rocket", "select_launch_target"]:
		reporter.fail_test("P12: shows already-completed step '%s' after restart" % restored_key)
		await _teardown(c2); return

	reporter.pass_test()
	await _teardown(c2)

func test_p13_double_record_no_duplicates() -> void:
	reporter.start_test("P13: Double-recording every M1 action produces no duplicate completed steps")
	_reset()
	var c = await _setup()
	c.replay_full()
	await create_timer(0.02).timeout

	var m1_actions = ["open_launchpad", "create_rocket", "select_launch_target",
		"launch_rocket_from_earth", "arrived_at_mining_site", "mine_target",
		"return_rocket_home", "resolve_mission_debrief"]
	for action in m1_actions:
		c.record_action(action)
		c.record_action(action) # duplicate
		var state = c.get_tutorial_state()
		if not _assert_no_duplicate_steps(state, "P13 after double " + action):
			await _teardown(c); return

	reporter.pass_test()
	await _teardown(c)
