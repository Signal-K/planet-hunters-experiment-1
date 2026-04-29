extends SceneTree

const TestReporter = preload("res://tests/TestReporter.gd")
const TutorialControllerScript = preload("res://Scripts/Tutorial/TutorialController.gd")
const TutorialTargeting = preload("res://Scripts/UI/TutorialCoachTargeting.gd")
const RocketsManager = preload("res://Scripts/Utils/RocketsManager.gd")

var reporter := TestReporter.new()

func _init() -> void:
	reporter.start_suite("Tutorial Infrastructure", {
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
	await test_progression_advances_on_expected_actions()
	await test_skip_and_replay_controls()
	await test_current_mission_started_only_after_stage_progress()
	await test_state_persists_across_controller_recreation()
	await test_targeting_prefers_structure_nodes_for_world_actions()
	await test_targeting_finds_launch_button_for_launch_action()
	await test_targeting_prefers_target_map_cta_over_contractor_select()
	await test_advance_if_match_skips_past_out_of_order_completed_actions()
	await test_reconcile_step_index_fast_forwards_past_completed_actions()

func _setup_controller() -> Node:
	var controller = TutorialControllerScript.new()
	controller.name = "TutorialControllerTest"
	get_root().add_child(controller)
	await create_timer(0.05).timeout
	return controller

func _teardown_controller(controller: Node) -> void:
	if is_instance_valid(controller):
		controller.queue_free()
	await create_timer(0.05).timeout

func _reset_tutorial_state() -> void:
	DirAccess.remove_absolute(ProjectSettings.globalize_path("user://tutorial_v2.cfg"))
	RocketsManager.reset_state()
	RocketsManager.clear_trip_contract_offer()
	RocketsManager.clear_selected_target()
	RocketsManager.clear_preview_target()
	RocketsManager.clear_returned_mission()

func test_progression_advances_on_expected_actions() -> void:
	reporter.start_test("Tutorial progression advances on ordered mission actions")
	_reset_tutorial_state()
	var controller = await _setup_controller()

	controller.replay_full()
	await create_timer(0.02).timeout
	var before = controller.get_tutorial_state()
	if str(before.get("current_step", {}).get("action_key", "")) != "accept_contractor_offer":
		reporter.fail_test("Expected first action accept_contractor_offer")
		await _teardown_controller(controller)
		return

	controller.record_action("accept_contractor_offer")
	controller.record_action("create_rocket")
	controller.record_action("select_launch_target")
	var after = controller.get_tutorial_state()
	if int(after.get("current_step_index", 0)) < 3:
		reporter.fail_test("Expected current_step_index >= 3 after first actions")
		await _teardown_controller(controller)
		return

	reporter.pass_test()
	await _teardown_controller(controller)

func test_skip_and_replay_controls() -> void:
	reporter.start_test("Tutorial supports skip and mission/full replay")
	_reset_tutorial_state()
	var controller = await _setup_controller()

	controller.skip_all()
	var skipped = controller.get_tutorial_state()
	if not bool(skipped.get("skipped", false)):
		reporter.fail_test("Expected skipped=true after skip_all")
		await _teardown_controller(controller)
		return

	controller.replay_current_mission()
	var replay_mission = controller.get_tutorial_state()
	if bool(replay_mission.get("skipped", true)):
		reporter.fail_test("Expected skipped=false after replay_current_mission")
		await _teardown_controller(controller)
		return

	controller.record_action("open_launchpad")
	controller.replay_full()
	var replay_full = controller.get_tutorial_state()
	if int(replay_full.get("current_stage", 0)) != 1 or int(replay_full.get("current_step_index", -1)) != 0:
		reporter.fail_test("Expected replay_full to reset stage/index")
		await _teardown_controller(controller)
		return

	reporter.pass_test()
	await _teardown_controller(controller)

func test_current_mission_started_only_after_stage_progress() -> void:
	reporter.start_test("Tutorial marks current mission started only after current-stage progress")
	_reset_tutorial_state()
	var controller = await _setup_controller()
	controller.replay_full()
	await create_timer(0.02).timeout

	var fresh = controller.get_tutorial_state()
	if bool(fresh.get("current_mission_started", true)):
		reporter.fail_test("Expected fresh tutorial mission to be unstarted")
		await _teardown_controller(controller)
		return

	controller.record_action("accept_contractor_offer")
	var started = controller.get_tutorial_state()
	if not bool(started.get("current_mission_started", false)):
		reporter.fail_test("Expected current mission to be started after first current-stage action")
		await _teardown_controller(controller)
		return

	await _teardown_controller(controller)
	_reset_tutorial_state()
	RocketsManager.mark_mission_completed("tutorial-started-stage-1")
	var next_controller = await _setup_controller()
	var next_stage = next_controller.get_tutorial_state()
	if int(next_stage.get("current_stage", 1)) < 2:
		reporter.fail_test("Expected tutorial to advance to stage 2 after mission completion")
		await _teardown_controller(next_controller)
		return
	if bool(next_stage.get("current_mission_started", true)):
		reporter.fail_test("Expected newly advanced mission stage to be unstarted")
		await _teardown_controller(next_controller)
		return

	reporter.pass_test()
	await _teardown_controller(next_controller)

func test_state_persists_across_controller_recreation() -> void:
	reporter.start_test("Tutorial state persists across controller recreation")
	_reset_tutorial_state()
	var controller = await _setup_controller()
	controller.replay_full()
	controller.record_action("accept_contractor_offer")
	controller.record_action("create_rocket")
	await create_timer(0.02).timeout
	await _teardown_controller(controller)

	var reloaded = await _setup_controller()
	var state = reloaded.get_tutorial_state()
	if int(state.get("current_step_index", 0)) < 2:
		reporter.fail_test("Expected persisted step index >= 2, got %s" % str(state.get("current_step_index", 0)))
		await _teardown_controller(reloaded)
		return

	reporter.pass_test()
	await _teardown_controller(reloaded)

func _setup_mock_scene_root() -> Node2D:
	var scene_root := Node2D.new()
	scene_root.name = "MockScene"
	var structures := Node2D.new()
	structures.name = "StructuresLayer"
	scene_root.add_child(structures)
	var launchpad := Node2D.new()
	launchpad.name = "Launchpad"
	structures.add_child(launchpad)
	var launchpad_interaction := Area2D.new()
	launchpad_interaction.name = "InteractionArea"
	launchpad.add_child(launchpad_interaction)
	var satellite := Node2D.new()
	satellite.name = "SatelliteStation"
	structures.add_child(satellite)
	var satellite_interaction := Area2D.new()
	satellite_interaction.name = "InteractionArea"
	satellite.add_child(satellite_interaction)
	var ui_root := Control.new()
	ui_root.name = "UIRoot"
	scene_root.add_child(ui_root)
	var launch_button := Button.new()
	launch_button.name = "PrimaryLaunchButton"
	launch_button.text = "Launch Mission"
	ui_root.add_child(launch_button)
	get_root().add_child(scene_root)
	current_scene = scene_root
	await create_timer(0.02).timeout
	return scene_root

func _teardown_mock_scene_root(scene_root: Node) -> void:
	if current_scene == scene_root:
		current_scene = null
	if is_instance_valid(scene_root):
		scene_root.queue_free()
	await create_timer(0.02).timeout

func test_targeting_prefers_structure_nodes_for_world_actions() -> void:
	reporter.start_test("Tutorial targeting prefers structure nodes over interaction children")
	var scene_root = await _setup_mock_scene_root()
	var launch_target = TutorialTargeting.find_current_target({"action_key": "open_launchpad"}, self)
	var scanner_target = TutorialTargeting.find_current_target({"action_key": "build_scanner_station"}, self)
	if launch_target == null or launch_target.name != "Launchpad":
		reporter.fail_test("Expected open_launchpad target to resolve to Launchpad node")
		await _teardown_mock_scene_root(scene_root)
		return
	if scanner_target == null or scanner_target.name != "SatelliteStation":
		reporter.fail_test("Expected build_scanner_station target to resolve to SatelliteStation node")
		await _teardown_mock_scene_root(scene_root)
		return
	reporter.pass_test()
	await _teardown_mock_scene_root(scene_root)

func test_targeting_finds_launch_button_for_launch_action() -> void:
	reporter.start_test("Tutorial targeting resolves visible launch button for launch action")
	var scene_root = await _setup_mock_scene_root()
	var launch_target = TutorialTargeting.find_current_target({"action_key": "launch_rocket_from_earth"}, self)
	if launch_target == null or not (launch_target is Button):
		reporter.fail_test("Expected launch_rocket_from_earth target to resolve to a visible Button")
		await _teardown_mock_scene_root(scene_root)
		return
	if str((launch_target as Button).name) != "PrimaryLaunchButton":
		reporter.fail_test("Unexpected launch target button resolved: %s" % str((launch_target as Button).name))
		await _teardown_mock_scene_root(scene_root)
		return
	reporter.pass_test()
	await _teardown_mock_scene_root(scene_root)

func test_targeting_prefers_target_map_cta_over_contractor_select() -> void:
	reporter.start_test("Tutorial targeting resolves target-selection CTA before contractor select buttons")
	var scene_root = await _setup_mock_scene_root()
	var selector_panel := Panel.new()
	selector_panel.name = "SelectorPanel"
	var contractor_section := VBoxContainer.new()
	contractor_section.name = "ContractorSection"
	selector_panel.add_child(contractor_section)
	var contractor_select := Button.new()
	contractor_select.name = "ContractorSelectButton"
	contractor_select.text = "Select"
	contractor_section.add_child(contractor_select)
	var bottom_dock := VBoxContainer.new()
	bottom_dock.name = "BottomDock"
	selector_panel.add_child(bottom_dock)
	var action_row := HBoxContainer.new()
	action_row.name = "ActionRow"
	bottom_dock.add_child(action_row)
	var open_map := Button.new()
	open_map.name = "OpenMapButton"
	open_map.text = "Open Target Map"
	action_row.add_child(open_map)
	var ui_layer := scene_root.get_node("UIRoot")
	ui_layer.add_child(selector_panel)
	await create_timer(0.02).timeout
	var target = TutorialTargeting.find_current_target({"action_key": "select_launch_target"}, self)
	if target == null or not (target is Button):
		reporter.fail_test("Expected target-selection CTA to resolve to a Button")
		await _teardown_mock_scene_root(scene_root)
		return
	if str((target as Button).name) != "OpenMapButton":
		reporter.fail_test("Expected target-selection CTA to resolve to OpenMapButton, got %s" % str((target as Button).name))
		await _teardown_mock_scene_root(scene_root)
		return
	reporter.pass_test()
	await _teardown_mock_scene_root(scene_root)

func test_advance_if_match_skips_past_out_of_order_completed_actions() -> void:
	reporter.start_test("Tutorial advances past stuck steps whose action is already in completed_actions")
	_reset_tutorial_state()
	var controller = await _setup_controller()
	controller.replay_full()
	await create_timer(0.02).timeout

	# Advance normally through the first two steps to reach select_launch_target:
	controller.record_action("accept_contractor_offer")
	controller.record_action("create_rocket")
	var pre_state = controller.get_tutorial_state()
	var step_idx_before = int(pre_state.get("current_step_index", 0))

	# Record select then launch in order. Without the advance-if-match fix,
	# launch_rocket_from_earth would leave the tutorial stuck on select_launch_target.
	controller.record_action("select_launch_target")
	controller.record_action("launch_rocket_from_earth")
	var after = controller.get_tutorial_state()
	var step_idx_after = int(after.get("current_step_index", 0))
	if step_idx_after <= step_idx_before:
		reporter.fail_test("Tutorial did not advance past launch step (idx before=%s, after=%s)" % [step_idx_before, step_idx_after])
		await _teardown_controller(controller)
		return
	if str(after.get("current_step", {}).get("action_key", "")) == "select_launch_target":
		reporter.fail_test("Tutorial is still stuck on select_launch_target after launch was recorded")
		await _teardown_controller(controller)
		return

	reporter.pass_test()
	await _teardown_controller(controller)

func test_reconcile_step_index_fast_forwards_past_completed_actions() -> void:
	reporter.start_test("Tutorial reconciles step index past completed actions on startup")
	_reset_tutorial_state()
	var controller = await _setup_controller()
	controller.replay_full()
	await create_timer(0.02).timeout

	# Complete the first two steps then capture the index:
	controller.record_action("accept_contractor_offer")
	controller.record_action("create_rocket")
	var mid_state = controller.get_tutorial_state()
	var idx_after_two = int(mid_state.get("current_step_index", 0))

	# Simulate crash/restart by freeing and recreating the controller.
	# The new instance loads persisted state and must fast-forward.
	await _teardown_controller(controller)
	var controller2 = await _setup_controller()
	await create_timer(0.02).timeout
	var restored = controller2.get_tutorial_state()
	var restored_idx = int(restored.get("current_step_index", 0))

	if restored_idx < idx_after_two:
		reporter.fail_test("Reconciled index (%s) is behind mid-session index (%s) — completed actions not fast-forwarded on startup" % [restored_idx, idx_after_two])
		await _teardown_controller(controller2)
		return
	var restored_key = str(restored.get("current_step", {}).get("action_key", ""))
	if restored_key in ["accept_contractor_offer", "create_rocket"]:
		reporter.fail_test("Tutorial shows already-completed step (%s) after restart" % restored_key)
		await _teardown_controller(controller2)
		return

	reporter.pass_test()
	await _teardown_controller(controller2)
