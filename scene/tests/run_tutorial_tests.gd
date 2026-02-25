extends SceneTree

const TestReporter = preload("res://tests/TestReporter.gd")
const TutorialControllerScript = preload("res://Scripts/Tutorial/TutorialController.gd")

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
	await test_state_persists_across_controller_recreation()

func _setup_controller() -> Node:
	var controller = TutorialControllerScript.new()
	controller.name = "TutorialController"
	get_root().add_child(controller)
	await create_timer(0.05).timeout
	return controller

func _teardown_controller(controller: Node) -> void:
	if is_instance_valid(controller):
		controller.queue_free()
	await create_timer(0.05).timeout

func _reset_tutorial_state() -> void:
	DirAccess.remove_absolute("user://tutorial_v2.cfg")

func test_progression_advances_on_expected_actions() -> void:
	reporter.start_test("Tutorial progression advances on ordered mission actions")
	_reset_tutorial_state()
	var controller = await _setup_controller()

	controller.replay_full()
	await create_timer(0.02).timeout
	var before = controller.get_tutorial_state()
	if str(before.get("current_step", {}).get("action_key", "")) != "open_launchpad":
		reporter.fail_test("Expected first action open_launchpad")
		await _teardown_controller(controller)
		return

	controller.record_action("open_launchpad")
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

func test_state_persists_across_controller_recreation() -> void:
	reporter.start_test("Tutorial state persists across controller recreation")
	_reset_tutorial_state()
	var controller = await _setup_controller()
	controller.replay_full()
	controller.record_action("open_launchpad")
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
