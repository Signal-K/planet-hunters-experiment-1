extends SceneTree

# WHAT THESE TESTS COVER
# ─────────────────────────────────────────────────────────────────────────────
# This suite validates tutorial state-machine coherence across authored missions
# and free operations readiness: no step regressions, no duplicate completed-step entries, and that
# launch-target resolution succeeds at each stage.
#
# WHAT THEY DO NOT COVER (by design — tested in companion suites)
# ─────────────────────────────────────────────────────────────────────────────
# • Real-time animation delays (transit, mining) — validated by
#   test_transit_and_mining_timing_delays_are_intentionally_non_trivial() below
# • Scene rendering or asset loading
# • Actual user interaction or input events
#
# WHY THESE TESTS ARE FAST (~1 second)
# ─────────────────────────────────────────────────────────────────────────────
# State transitions are triggered by direct record_action() calls rather than
# waiting for timers or scene transitions. Transit animations (EARTH_ORBIT_TIME
# + TRAVEL_TIME + TARGET_APPROACH_TIME ≈ 30 s) and mining sessions
# (ASTEROID_DURATION = 90 s, PLANET_DURATION = 180 s) run at game speed and
# are intentional delays for the player experience — not tested here.

const TestReporter = preload("res://tests/TestReporter.gd")
const RocketsManager = preload("res://Scripts/Utils/RocketsManager.gd")
const MissionLogManager = preload("res://Scripts/Utils/MissionLogManager.gd")
const TutorialControllerScript = preload("res://Scripts/Tutorial/TutorialController.gd")

var reporter := TestReporter.new()

func _init() -> void:
	reporter.start_suite("Mission E2E Flow", {
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
	await test_transit_and_mining_timing_delays_are_intentionally_non_trivial()
	await test_fresh_start_to_open_operations_without_tutorial_duplicates_or_blockers()
	await test_free_operations_launch_requires_contractor_selection()

func test_transit_and_mining_timing_delays_are_intentionally_non_trivial() -> void:
	reporter.start_test("Transit and mining timing constants enforce intentional real-time delays")
	# These constants are NOT just numbers — they are the intentional delays that
	# make the rocket launch feel like a real journey (not a teleport) and give
	# mining sessions a sense of weight and commitment.
	# If someone accidentally zeros these out, this test will catch it.
	const TransitScript = preload("res://Scripts/Transitions/OutboundPreviewTransition.gd")
	const MiningScript = preload("res://Scripts/UI/SidescrollMining.gd")

	if TransitScript.EARTH_ORBIT_TIME < 1.0:
		reporter.fail_test("EARTH_ORBIT_TIME must be >= 1 s (got %s) — departure has no visual lift-off moment" % TransitScript.EARTH_ORBIT_TIME)
		return
	if TransitScript.TRAVEL_TIME < 5.0:
		reporter.fail_test("TRAVEL_TIME must be >= 5 s (got %s) — transit feels instant; loses sense of distance" % TransitScript.TRAVEL_TIME)
		return
	if TransitScript.TARGET_APPROACH_TIME < 1.0:
		reporter.fail_test("TARGET_APPROACH_TIME must be >= 1 s (got %s) — arrival has no sense of approach" % TransitScript.TARGET_APPROACH_TIME)
		return
	if MiningScript.ASTEROID_DURATION < 30.0:
		reporter.fail_test("ASTEROID_DURATION must be >= 30 s (got %s) — session too short to feel exploratory" % MiningScript.ASTEROID_DURATION)
		return
	if MiningScript.PLANET_DURATION <= MiningScript.ASTEROID_DURATION:
		reporter.fail_test("PLANET_DURATION (%s) must exceed ASTEROID_DURATION (%s) — planets should reward deeper investment" % [MiningScript.PLANET_DURATION, MiningScript.ASTEROID_DURATION])
		return
	var total_outbound_s = TransitScript.EARTH_ORBIT_TIME + TransitScript.TRAVEL_TIME + TransitScript.TARGET_APPROACH_TIME
	if total_outbound_s < 20.0:
		reporter.fail_test("Total outbound transit (EARTH_ORBIT + TRAVEL + APPROACH = %s s) must be >= 20 s" % total_outbound_s)
		return
	reporter.pass_test()

func _reset_runtime_state() -> void:
	DirAccess.remove_absolute(ProjectSettings.globalize_path("user://tutorial_v2.cfg"))
	MissionLogManager.reset_state()
	RocketsManager.reset_state()
	RocketsManager.clear_selected_target()
	RocketsManager.clear_preview_target()
	RocketsManager.clear_returned_mission()
	RocketsManager.clear_trip_contract_offer()
	RocketsManager.set_operation_mode("contract")

func _setup_controller() -> Node:
	var controller = TutorialControllerScript.new()
	controller.name = "TutorialControllerE2E"
	get_root().add_child(controller)
	await create_timer(0.05).timeout
	return controller

func _teardown_controller(controller: Node) -> void:
	if is_instance_valid(controller):
		controller.queue_free()
	await create_timer(0.03).timeout

func _assert_no_duplicate_completed_steps(state: Dictionary) -> String:
	var completed_steps = state.get("completed_steps_by_stage", {})
	if typeof(completed_steps) != TYPE_DICTIONARY:
		return "completed_steps_by_stage is not a dictionary"
	for stage_key in completed_steps.keys():
		var steps = completed_steps.get(stage_key, [])
		if typeof(steps) != TYPE_ARRAY:
			return "completed steps for stage %s should be an array" % str(stage_key)
		var seen := {}
		for value in steps:
			var idx = int(value)
			if seen.has(idx):
				return "duplicate completed tutorial step detected for stage %s at index %s" % [str(stage_key), str(idx)]
			seen[idx] = true
	return ""

func _assert_launch_resolvable_for_stage(stage: int, rocket_id: String) -> String:
	var selectable = RocketsManager.get_selectable_targets_for_stage(stage)
	if selectable.is_empty():
		return "stage %s has no selectable targets" % stage
	if RocketsManager.is_free_operations_unlocked() and RocketsManager.get_trip_selected_contractor().is_empty():
		var offer = RocketsManager.ensure_trip_contract_offer(RocketsManager.get_detected_targets())
		var contractors: Array = offer.get("contractors", [])
		if contractors.is_empty():
			return "stage %s missing contractor options for free operations" % stage
		var contractor_id = str(contractors[0].get("id", ""))
		if contractor_id == "" or not RocketsManager.select_trip_contractor(contractor_id):
			return "stage %s failed to select contractor before launch resolution" % stage
	RocketsManager.clear_selected_target()
	var resolved = RocketsManager.ensure_selected_target_for_launch(rocket_id)
	if not bool(resolved.get("ok", false)):
		return "stage %s launch target resolution failed: %s" % [stage, str(resolved.get("reason", "unknown"))]
	if str(resolved.get("target_id", "")) == "":
		return "stage %s launch target resolution returned empty target id" % stage
	return ""

func _mark_stage_complete(stage: int) -> void:
	RocketsManager.mark_mission_completed("e2e-stage-%s-%s" % [stage, int(Time.get_ticks_msec())])

func test_fresh_start_to_open_operations_without_tutorial_duplicates_or_blockers() -> void:
	reporter.start_test("Fresh-start mission progression reaches open operations with no duplicate tutorial steps or launch blockers")
	_reset_runtime_state()
	var controller = await _setup_controller()
	controller.replay_full()
	await create_timer(0.02).timeout

	var stage_actions := {
		1: ["accept_contractor_offer", "create_rocket", "select_launch_target", "launch_rocket_from_earth", "arrived_at_mining_site", "mine_target", "return_rocket_home", "resolve_mission_debrief"],
		2: ["build_control_station"],
		3: ["accept_contractor_offer", "classify_candidate", "select_launch_target", "launch_rocket_from_earth", "mine_target", "return_rocket_home", "resolve_mission_debrief"],
		4: ["open_launchpad", "select_launch_target", "launch_rocket_from_earth", "mine_target", "resolve_mission_debrief"]
	}
	var stage_rocket := {
		1: "starterrocket1-e2e",
		2: "starterrocket2-e2e",
		3: "starterrocket2-e2e",
		4: "starterrocket3-e2e"
	}

	for stage in [1, 2, 3, 4]:
		var launch_error = _assert_launch_resolvable_for_stage(stage, str(stage_rocket[stage]))
		if launch_error != "":
			reporter.fail_test(launch_error)
			await _teardown_controller(controller)
			return

		var actions: Array = stage_actions.get(stage, [])
		for action_any in actions:
			var action = str(action_any)
			var before_action = controller.get_tutorial_state()
			var step_before = int(before_action.get("current_step_index", 0))
			var stage_before_action = int(before_action.get("current_stage", stage))
			controller.record_action(action)
			var after_first = controller.get_tutorial_state()
			var step_after_first = int(after_first.get("current_step_index", 0))
			var stage_after_first = int(after_first.get("current_stage", stage_before_action))
			if stage_after_first < stage_before_action:
				reporter.fail_test("Tutorial stage regressed after action %s at stage %s" % [action, stage])
				await _teardown_controller(controller)
				return
			if stage_after_first == stage_before_action and step_after_first < step_before:
				reporter.fail_test("Tutorial step index regressed after action %s at stage %s" % [action, stage])
				await _teardown_controller(controller)
				return
			controller.record_action(action) # duplicate action should not re-advance same content
			var after_duplicate = controller.get_tutorial_state()
			var step_after_duplicate = int(after_duplicate.get("current_step_index", 0))
			if step_after_duplicate != step_after_first:
				reporter.fail_test("Duplicate tutorial action advanced unexpectedly (%s at stage %s)" % [action, stage])
				await _teardown_controller(controller)
				return

			var dedupe_error = _assert_no_duplicate_completed_steps(after_duplicate)
			if dedupe_error != "":
				reporter.fail_test(dedupe_error)
				await _teardown_controller(controller)
				return

		if stage < 4:
			_mark_stage_complete(stage)
			await _teardown_controller(controller)
			controller = await _setup_controller()

	await _teardown_controller(controller)
	reporter.pass_test()

func test_free_operations_launch_requires_contractor_selection() -> void:
	reporter.start_test("Free Operations launch flow requires contractor selection and resolves after selection")
	_reset_runtime_state()
	for stage in [1, 2, 3, 4]:
		_mark_stage_complete(stage)
	var mission_stage = int(RocketsManager.get_mission_stage())
	if mission_stage < 4:
		reporter.fail_test("Expected mission stage 4 after four completions, got %s" % mission_stage)
		return
	var mode_ok = RocketsManager.set_operation_mode("contract")
	if not mode_ok:
		reporter.fail_test("Failed to set operation mode to contract")
		return
	var target_id = "free-ops-survey-target"
	var scan_ok = RocketsManager.set_detected_targets([{
		"id": target_id,
		"label": "Free Ops Survey Target",
		"type": "planet",
		"anomalySet": "telescope-tess",
		"classification_status": "confirmed",
		"tess_disposition": "CP"
	}])
	if not scan_ok:
		reporter.fail_test("Failed to seed free-operations detected target")
		return
	var offer = RocketsManager.ensure_trip_contract_offer(RocketsManager.get_detected_targets())
	var selectable = RocketsManager.get_selectable_targets_for_stage(4)
	if selectable.is_empty():
		reporter.fail_test("Expected selectable free-operations targets for survey route")
		return
	var first_target_id = str(selectable[0].get("id", ""))
	if first_target_id == "":
		reporter.fail_test("Free-operations selectable target is missing id")
		return
	if RocketsManager.select_target(first_target_id):
		reporter.fail_test("Expected target selection to be blocked before contractor selection")
		return
	var contractors: Array = offer.get("contractors", [])
	if contractors.is_empty():
		reporter.fail_test("Expected contractor options in free operations")
		return
	var contractor_id = str(contractors[0].get("id", ""))
	if contractor_id == "" or not RocketsManager.select_trip_contractor(contractor_id):
		reporter.fail_test("Failed to select contractor in free operations")
		return
	if not RocketsManager.select_target(first_target_id):
		reporter.fail_test("Expected target selection to succeed after contractor selection")
		return
	var resolved = RocketsManager.ensure_selected_target_for_launch("starterrocket3-survey-e2e")
	if not bool(resolved.get("ok", false)):
		reporter.fail_test("Expected launch resolution to succeed in free operations")
		return
	reporter.pass_test()
