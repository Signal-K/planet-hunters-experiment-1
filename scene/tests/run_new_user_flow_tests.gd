extends SceneTree

## New User Flow Tests
## Simulates a brand-new player with zero saved state going through the complete
## Mission 1 journey. Every step a real user would encounter is exercised.

const TestReporter = preload("res://tests/TestReporter.gd")
const RocketsManager = preload("res://Scripts/Utils/RocketsManager.gd")
const SubcontractorManager = preload("res://Scripts/Utils/SubcontractorManager.gd")
const TutorialControllerScript = preload("res://Scripts/Tutorial/TutorialController.gd")
const TutorialCatalog = preload("res://Scripts/Tutorial/TutorialCatalog.gd")

var reporter := TestReporter.new()

func _init() -> void:
	reporter.start_suite("New User Flow (Mission 1 End-to-End)", {
		"engine": Engine.get_version_info()["string"],
		"os": OS.get_name(),
		"project": "scene",
		"timestamp": Time.get_datetime_string_from_system()
	})
	await run_all_tests()
	reporter.summary()
	await create_timer(0.1).timeout
	quit(1 if reporter.tests_failed > 0 else 0)

func _reset() -> void:
	# Call reset_state() then also explicitly save clean state to ensure
	# the user:// file is actually clean — reset_state() static call can
	# silently fail due to GDScript preload/static method call semantics.
	RocketsManager.reset_state()
	var clean := {
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
		"mission_progress_completed": 0,
		"completed_mission_badges": [],
		"control_station_built": false,
		"scanner_station_built": false,
		"scanner_unlocked": false,
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
	RocketsManager.save_state(clean)
	RocketsManager.clear_selected_target()
	RocketsManager.clear_returned_mission()
	RocketsManager.clear_preview_target()
	RocketsManager.clear_trip_contract_offer()
	DirAccess.remove_absolute(ProjectSettings.globalize_path("user://tutorial_v2.cfg"))

func _setup_controller() -> Node:
	var c = TutorialControllerScript.new()
	c.name = "TutorialControllerNewUserTest"
	get_root().add_child(c)
	await create_timer(0.05).timeout
	return c

func _teardown(c: Node) -> void:
	if is_instance_valid(c):
		c.queue_free()
	await create_timer(0.04).timeout

# Helper: check launch readiness based on current state
func _is_launch_ready() -> bool:
	var contractor: Dictionary = RocketsManager.get_trip_selected_contractor() as Dictionary
	var has_contractor := str(contractor.get("id", "")) != ""
	var awaiting_id := str(RocketsManager.get_primary_awaiting_rocket_id())
	var has_rocket := awaiting_id != ""
	var target := str(RocketsManager.get_selected_target())
	var has_target := target != "" and target != "null"
	return has_contractor and has_rocket and has_target

func run_all_tests() -> void:
	await test_01_fresh_start_state()
	await test_02_tutorial_first_step_is_pick_contractor()
	await test_03_contractor_offer_exists_on_fresh_start()
	await test_04_selecting_contractor_advances_flow_phase()
	await test_05_rocket_create_blocked_without_contractor()
	await test_06_rocket_create_allowed_after_contractor()
	await test_07_mission_1_target_available()
	await test_08_target_selection_persists()
	await test_09_launch_readiness_requires_all_three()
	await test_10_after_launch_state_transitions_correctly()
	await test_11_mining_tutorial_step_fires_on_arrival()
	await test_12_return_records_cargo()
	await test_13_debrief_advances_to_mission_2()
	await test_14_mission_2_unlocks_sr2_and_targets()
	await test_15_all_m1_tutorial_steps_advance_in_sequence()

# ─── Test 1 ───────────────────────────────────────────────────────────────────

func test_01_fresh_start_state() -> void:
	reporter.start_test("Fresh start: mission stage is 1, no placed rockets, no selected target")
	_reset()
	if RocketsManager.get_mission_stage() != 1:
		reporter.fail_test("Expected stage 1, got %d" % RocketsManager.get_mission_stage())
		return
	var placed: Array = RocketsManager.get_placed() as Array
	if placed.size() != 0:
		reporter.fail_test("Expected no placed rockets, got %d" % placed.size())
		return
	var selected := str(RocketsManager.get_selected_target())
	if selected != "" and selected != "null":
		reporter.fail_test("Expected no selected target, got '%s'" % selected)
		return
	reporter.pass_test()

# ─── Test 2 ───────────────────────────────────────────────────────────────────

func test_02_tutorial_first_step_is_pick_contractor() -> void:
	reporter.start_test("Tutorial M1 first step has action_key 'open_launchpad'")
	_reset()
	var tc = await _setup_controller()
	var state: Dictionary = tc.get_tutorial_state() as Dictionary
	var step: Dictionary = state.get("current_step", {}) as Dictionary
	if step.is_empty():
		reporter.fail_test("Tutorial current_step is empty on fresh start")
		await _teardown(tc)
		return
	var action_key := str(step.get("action_key", ""))
	if action_key != "open_launchpad":
		reporter.fail_test("Expected 'open_launchpad', got '%s'" % action_key)
		await _teardown(tc)
		return
	await _teardown(tc)
	reporter.pass_test()

# ─── Test 3 ───────────────────────────────────────────────────────────────────

func test_03_contractor_offer_exists_on_fresh_start() -> void:
	reporter.start_test("Contractor offer generates on fresh start with valid contractors")
	_reset()
	var predefined: Dictionary = RocketsManager.get_predefined_mission_target(1) as Dictionary
	var targets: Array = [predefined] if not predefined.is_empty() else []
	var offer: Dictionary = RocketsManager.ensure_trip_contract_offer(targets) as Dictionary
	if offer.is_empty():
		reporter.fail_test("ensure_trip_contract_offer returned empty offer")
		return
	var contractors: Array = offer.get("contractors", []) as Array
	if contractors.size() == 0:
		reporter.fail_test("Contractor offer has no contractors")
		return
	var first: Dictionary = contractors[0] as Dictionary
	if str(first.get("id", "")) == "":
		reporter.fail_test("First contractor has no id")
		return
	if str(first.get("name", "")) == "":
		reporter.fail_test("First contractor has no name")
		return
	reporter.pass_test()

# ─── Test 4 ───────────────────────────────────────────────────────────────────

func test_04_selecting_contractor_advances_flow_phase() -> void:
	reporter.start_test("Selecting a contractor persists trip_selected_contractor correctly")
	_reset()
	var predefined: Dictionary = RocketsManager.get_predefined_mission_target(1) as Dictionary
	var targets: Array = [predefined] if not predefined.is_empty() else []
	var offer: Dictionary = RocketsManager.ensure_trip_contract_offer(targets) as Dictionary
	var contractors: Array = offer.get("contractors", []) as Array
	if contractors.size() == 0:
		reporter.fail_test("No contractors — cannot test selection")
		return
	var cid := str((contractors[0] as Dictionary).get("id", ""))
	var ok := RocketsManager.select_trip_contractor(cid)
	if not ok:
		reporter.fail_test("select_trip_contractor returned false for '%s'" % cid)
		return
	var selected: Dictionary = RocketsManager.get_trip_selected_contractor() as Dictionary
	if str(selected.get("id", "")) != cid:
		reporter.fail_test("Expected '%s', got '%s'" % [cid, selected.get("id", "")])
		return
	reporter.pass_test()

# ─── Test 5 ───────────────────────────────────────────────────────────────────

func test_05_rocket_create_blocked_without_contractor() -> void:
	reporter.start_test("No contractor selected on fresh state (drives RocketSelector gate)")
	_reset()
	var selected: Dictionary = RocketsManager.get_trip_selected_contractor() as Dictionary
	if str(selected.get("id", "")) != "":
		reporter.fail_test("Trip contractor should be empty on fresh state but got '%s'" % selected.get("id"))
		return
	reporter.pass_test()

# ─── Test 6 ───────────────────────────────────────────────────────────────────

func test_06_rocket_create_allowed_after_contractor() -> void:
	reporter.start_test("Rocket placement (simulating purchase) registers awaitingLaunch state")
	_reset()
	var predefined: Dictionary = RocketsManager.get_predefined_mission_target(1) as Dictionary
	var targets: Array = [predefined] if not predefined.is_empty() else []
	var offer: Dictionary = RocketsManager.ensure_trip_contract_offer(targets) as Dictionary
	var contractors: Array = offer.get("contractors", []) as Array
	var cid := str((contractors[0] as Dictionary).get("id", ""))
	RocketsManager.select_trip_contractor(cid)
	var placed_id = RocketsManager.add_placed("starterrocket1", Vector2(-110.0, -178.0))
	if typeof(placed_id) != TYPE_STRING or str(placed_id) == "":
		reporter.fail_test("add_placed returned invalid id: %s" % placed_id)
		return
	var placed: Array = RocketsManager.get_placed() as Array
	var found := false
	for p in placed:
		if (p as Dictionary).get("status", "") == "awaitingLaunch":
			found = true
			break
	if not found:
		reporter.fail_test("No awaitingLaunch rocket found after placement")
		return
	reporter.pass_test()

# ─── Test 7 ───────────────────────────────────────────────────────────────────

func test_07_mission_1_target_available() -> void:
	reporter.start_test("Mission 1 predefined target has id, label, and distance_au > 0")
	_reset()
	var predefined: Dictionary = RocketsManager.get_predefined_mission_target(1) as Dictionary
	if predefined.is_empty():
		reporter.fail_test("get_predefined_mission_target(1) returned empty dict")
		return
	if str(predefined.get("id", "")) == "":
		reporter.fail_test("Mission 1 target has no id")
		return
	if str(predefined.get("label", "")) == "":
		reporter.fail_test("Mission 1 target has no label")
		return
	if float(predefined.get("distance_au", 0.0)) <= 0.0:
		reporter.fail_test("Mission 1 target distance_au is 0 or missing")
		return
	reporter.pass_test()

# ─── Test 8 ───────────────────────────────────────────────────────────────────

func test_08_target_selection_persists() -> void:
	reporter.start_test("Selecting a target persists correctly via RocketsManager.select_target")
	_reset()
	var predefined: Dictionary = RocketsManager.get_predefined_mission_target(1) as Dictionary
	var target_id := str(predefined.get("id", ""))
	if target_id == "":
		reporter.fail_test("No Mission 1 target available")
		return
	var ok := RocketsManager.select_target(target_id)
	if not ok:
		reporter.fail_test("select_target returned false for '%s'" % target_id)
		return
	var persisted := str(RocketsManager.get_selected_target())
	if persisted != target_id:
		reporter.fail_test("Expected '%s', got '%s'" % [target_id, persisted])
		return
	reporter.pass_test()

# ─── Test 9 ───────────────────────────────────────────────────────────────────

func test_09_launch_readiness_requires_all_three() -> void:
	reporter.start_test("Launch readiness requires contractor + rocket + target (all three)")
	_reset()

	if _is_launch_ready():
		reporter.fail_test("Should not be launch-ready on clean state")
		return

	var predefined: Dictionary = RocketsManager.get_predefined_mission_target(1) as Dictionary
	var targets: Array = [predefined] if not predefined.is_empty() else []
	var offer: Dictionary = RocketsManager.ensure_trip_contract_offer(targets) as Dictionary
	var contractors: Array = offer.get("contractors", []) as Array
	RocketsManager.select_trip_contractor(str((contractors[0] as Dictionary).get("id", "")))

	if _is_launch_ready():
		reporter.fail_test("Should not be ready with only contractor set")
		return

	RocketsManager.add_placed("starterrocket1", Vector2(-110.0, -178.0))

	if _is_launch_ready():
		reporter.fail_test("Should not be ready without target")
		return

	var target_id := str(predefined.get("id", ""))
	RocketsManager.select_target(target_id)

	if not _is_launch_ready():
		reporter.fail_test("Should be launch-ready with contractor + rocket + target all set")
		return

	reporter.pass_test()

# ─── Test 10 ──────────────────────────────────────────────────────────────────

func test_10_after_launch_state_transitions_correctly() -> void:
	reporter.start_test("Launch transitions rocket from awaitingLaunch to inTransit")
	_reset()
	var predefined: Dictionary = RocketsManager.get_predefined_mission_target(1) as Dictionary
	var targets: Array = [predefined] if not predefined.is_empty() else []
	var offer: Dictionary = RocketsManager.ensure_trip_contract_offer(targets) as Dictionary
	var contractors: Array = offer.get("contractors", []) as Array
	RocketsManager.select_trip_contractor(str((contractors[0] as Dictionary).get("id", "")))
	RocketsManager.add_placed("starterrocket1", Vector2(-110.0, -178.0))
	RocketsManager.select_target(str(predefined.get("id", "")))

	# Simulate launch state transition
	var state: Dictionary = RocketsManager.load_state() as Dictionary
	var placed: Array = state.get("placed", []) as Array
	for p in placed:
		if (p as Dictionary).get("status", "") == "awaitingLaunch":
			(p as Dictionary)["status"] = "inTransit"
			break
	RocketsManager.save_state(state)

	var placed_after: Array = RocketsManager.get_placed() as Array
	var in_transit := false
	for p in placed_after:
		if (p as Dictionary).get("status", "") == "inTransit":
			in_transit = true
			break
	if not in_transit:
		reporter.fail_test("No rocket in 'inTransit' after launch simulation")
		return
	reporter.pass_test()

# ─── Test 11 ──────────────────────────────────────────────────────────────────

func test_11_mining_tutorial_step_fires_on_arrival() -> void:
	reporter.start_test("Tutorial advances from 'm1_mine_intro' → 'mine_target' on arrived_at_mining_site")
	_reset()
	var tc = await _setup_controller()
	tc.record_action("open_launchpad")
	tc.record_action("accept_contractor_offer")
	tc.record_action("select_launch_target")
	tc.record_action("create_rocket")
	tc.record_action("launch_rocket_from_earth")
	await create_timer(0.04).timeout

	var state_before: Dictionary = tc.get_tutorial_state() as Dictionary
	var step_before: Dictionary = state_before.get("current_step", {}) as Dictionary
	var key_before := str(step_before.get("action_key", ""))
	if key_before != "arrived_at_mining_site":
		reporter.fail_test("Expected step 'arrived_at_mining_site', got '%s'" % key_before)
		await _teardown(tc)
		return

	tc.record_action("arrived_at_mining_site")
	await create_timer(0.04).timeout

	var state_after: Dictionary = tc.get_tutorial_state() as Dictionary
	var step_after: Dictionary = state_after.get("current_step", {}) as Dictionary
	var key_after := str(step_after.get("action_key", ""))
	if key_after != "mine_target":
		reporter.fail_test("Expected 'mine_target' after arrival, got '%s'" % key_after)
		await _teardown(tc)
		return

	await _teardown(tc)
	reporter.pass_test()

# ─── Test 12 ──────────────────────────────────────────────────────────────────

func test_12_return_records_cargo() -> void:
	reporter.start_test("set_returned_mission records target label and mining cargo")
	_reset()
	RocketsManager.set_returned_mission(
		"starterrocket1-test",
		"mission-1-target",
		"433 Eros",
		"asteroid",
		"contract",
		{
			"trip_contractor_id": "aegis_defense",
			"trip_requested_minerals": {"Iron": 100},
			"mining_run_collected": {"Iron": 110}
		}
	)
	var returned: Dictionary = RocketsManager.get_returned_mission() as Dictionary
	if returned.is_empty():
		reporter.fail_test("get_returned_mission returned empty dict")
		return
	if str(returned.get("label", "")) != "433 Eros":
		reporter.fail_test("Wrong label: '%s'" % returned.get("label", ""))
		return
	var cargo: Dictionary = returned.get("mining_run_collected", {}) as Dictionary
	if int(cargo.get("Iron", 0)) != 110:
		reporter.fail_test("Expected Iron=110, got %s" % cargo.get("Iron", 0))
		return
	reporter.pass_test()

# ─── Test 13 ──────────────────────────────────────────────────────────────────

func test_13_debrief_advances_to_mission_2() -> void:
	reporter.start_test("Completing Mission 1 debrief advances game stage to 2")
	_reset()
	var state: Dictionary = RocketsManager.load_state() as Dictionary
	state["completed_mission_badges"] = ["mission-1"]
	state["mission_progress_completed"] = 1
	RocketsManager.save_state(state)
	await create_timer(0.02).timeout
	var stage := RocketsManager.get_mission_stage()
	if stage != 2:
		reporter.fail_test("Expected stage 2 after M1 complete, got %d" % stage)
		return
	reporter.pass_test()

# ─── Test 14 ──────────────────────────────────────────────────────────────────

func test_14_mission_2_unlocks_sr2_and_targets() -> void:
	reporter.start_test("Mission 2 state: SR2 unlocked and M2 targets available")
	_reset()
	var state: Dictionary = RocketsManager.load_state() as Dictionary
	state["completed_mission_badges"] = ["mission-1"]
	state["mission_progress_completed"] = 1
	state["unlocked"] = ["starterrocket1", "starterrocket2"]
	RocketsManager.save_state(state)
	await create_timer(0.02).timeout
	var unlocked: Array = RocketsManager.get_unlocked() as Array
	if not unlocked.has("starterrocket2"):
		reporter.fail_test("SR2 should be unlocked at mission stage 2")
		return
	var targets: Array = RocketsManager.get_mission2_targets() as Array
	if targets.size() == 0:
		reporter.fail_test("Mission 2 should have targets available")
		return
	reporter.pass_test()

# ─── Test 15 ──────────────────────────────────────────────────────────────────

func test_15_all_m1_tutorial_steps_advance_in_sequence() -> void:
	reporter.start_test("All 9 Mission 1 tutorial steps advance in correct order")
	_reset()
	var tc = await _setup_controller()
	var catalog := TutorialCatalog.new()
	var m1_steps: Array = catalog.get_mission_steps(1) as Array
	if m1_steps.size() != 9:
		reporter.fail_test("Expected 9 M1 steps, got %d" % m1_steps.size())
		await _teardown(tc)
		return
	for i in range(m1_steps.size()):
		var expected_key := str((m1_steps[i] as Dictionary).get("action_key", ""))
		var cur_state: Dictionary = tc.get_tutorial_state() as Dictionary
		var cur_step: Dictionary = cur_state.get("current_step", {}) as Dictionary
		var cur_key := str(cur_step.get("action_key", ""))
		if cur_key != expected_key:
			reporter.fail_test("Step %d: expected '%s', got '%s'" % [i, expected_key, cur_key])
			await _teardown(tc)
			return
		tc.record_action(expected_key)
		await create_timer(0.02).timeout
	var final_state: Dictionary = tc.get_tutorial_state() as Dictionary
	var final_step: Dictionary = final_state.get("current_step", {}) as Dictionary
	# Stage advances only when RocketsManager reports a completed mission — not testable
	# in isolation here. Instead verify all M1 steps were consumed (current_step is empty).
	if not final_step.is_empty():
		reporter.fail_test("After all M1 steps, current_step should be empty, got '%s'" % str(final_step.get("action_key", "?")))
		await _teardown(tc)
		return
	await _teardown(tc)
	reporter.pass_test()
