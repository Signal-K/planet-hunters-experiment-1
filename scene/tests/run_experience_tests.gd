extends SceneTree
## Experience/Unlock tests for AppController + RocketsManager
## Run with: godot --headless --path scene -s scene/tests/run_experience_tests.gd

const TestReporter = preload("res://tests/TestReporter.gd")
const AppControllerScript = preload("res://Scripts/Systems/AppController.gd")
const RocketsManager = preload("res://Scripts/Utils/RocketsManager.gd")

var reporter := TestReporter.new()

func _init():
	reporter.start_suite("Experience + Unlocks", {
		"engine": Engine.get_version_info()["string"],
		"os": OS.get_name(),
		"project": "scene",
		"timestamp": Time.get_datetime_string_from_system()
	})
	await run_all_tests()
	reporter.summary()
	await create_timer(0.1).timeout
	if reporter.tests_failed > 0:
		quit(1)
	else:
		quit(0)

func run_all_tests() -> void:
	await test_xp_accumulates()
	await test_level_up_threshold()
	await test_multi_level_up()
	await test_unlocks_at_level_two()
	await test_award_helpers()

func _new_controller() -> Node:
	var app = AppControllerScript.new()
	app.experience_xp = 0
	app.experience_level = 1
	return app

func test_xp_accumulates() -> void:
	reporter.start_test("XP accumulates without leveling")
	var app = _new_controller()
	app.add_experience(5, "test")
	if app.get_experience_level() != 1:
		reporter.fail_test("Expected level 1 after +5 XP")
		return
	if app.get_experience_xp() != 5:
		reporter.fail_test("Expected XP=5 after +5 XP")
		return
	reporter.pass_test()

func test_level_up_threshold() -> void:
	reporter.start_test("Level up at 10 + level XP")
	var app = _new_controller()
	app.add_experience(11, "test")
	if app.get_experience_level() != 2:
		reporter.fail_test("Expected level 2 after +11 XP from level 1")
		return
	if app.get_experience_xp() != 0:
		reporter.fail_test("Expected XP rollover to 0 after level-up")
		return
	reporter.pass_test()

func test_multi_level_up() -> void:
	reporter.start_test("Multiple level-ups roll over correctly")
	var app = _new_controller()
	app.add_experience(23, "test")
	if app.get_experience_level() != 3:
		reporter.fail_test("Expected level 3 after +23 XP from level 1")
		return
	if app.get_experience_xp() != 0:
		reporter.fail_test("Expected XP rollover to 0 after multi level-up")
		return
	reporter.pass_test()

func test_unlocks_at_level_two() -> void:
	reporter.start_test("Unlocks starterrocket2 at level 2")
	var reset_ok = RocketsManager.reset_state()
	if not reset_ok:
		reporter.fail_test("Failed to reset rocket state")
		return
	var app = _new_controller()
	app.set_experience_from_react(0, 2)
	var unlocked = RocketsManager.get_unlocked()
	if not unlocked.has("starterrocket2"):
		reporter.fail_test("starterrocket2 not unlocked at level 2")
		return
	reporter.pass_test()

func test_award_helpers() -> void:
	reporter.start_test("Award helpers add XP")
	var app = _new_controller()
	app.award_launch_experience()
	if app.get_experience_xp() <= 0:
		reporter.fail_test("award_launch_experience did not add XP")
		return
	var after_launch = app.get_experience_xp()
	app.award_scan_experience()
	if app.get_experience_xp() <= after_launch:
		reporter.fail_test("award_scan_experience did not add XP")
		return
	reporter.pass_test()
