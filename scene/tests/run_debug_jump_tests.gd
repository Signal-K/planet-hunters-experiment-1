extends SceneTree

const TestReporter = preload("res://tests/TestReporter.gd")
const RocketsManager = preload("res://Scripts/Utils/RocketsManager.gd")
const AppController = preload("res://Scripts/Systems/AppController.gd")

var reporter := TestReporter.new()
var _app_instance: Node = null

func _init() -> void:
	reporter.start_suite("Debug Jump & Testing Shortcuts", {
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
	await test_debug_skip_to_mission_updates_stage_and_level()
	await test_instant_mining_sets_flag_and_changes_scene()

func _setup_app() -> Node:
	var app = AppController.new()
	app.name = "AppController"
	get_root().add_child(app)
	await create_timer(0.05).timeout
	return app

func _teardown_app(app: Node) -> void:
	if is_instance_valid(app):
		app.queue_free()
	await create_timer(0.05).timeout

func _reset_state() -> void:
	RocketsManager.reset_state()
	DirAccess.remove_absolute("user://tutorial_v2.cfg")
	DirAccess.remove_absolute("user://franc_balance.cfg")
	DirAccess.remove_absolute("user://experience.cfg")

func test_debug_skip_to_mission_updates_stage_and_level() -> void:
	reporter.start_test("debug_skip_to_mission correctly advances stage, level, and balance")
	_reset_state()
	var app = await _setup_app()
	
	# Initial state
	if RocketsManager.get_mission_stage() != 1:
		reporter.fail_test("Expected initial mission stage 1, got %d" % RocketsManager.get_mission_stage())
		await _teardown_app(app)
		return

	# Jump to Mission 3
	app.debug_skip_to_mission(3)
	await create_timer(0.05).timeout
	
	var stage = RocketsManager.get_mission_stage()
	if stage < 3:
		reporter.fail_test("Expected mission stage >= 3 after jump, got %d" % stage)
		await _teardown_app(app)
		return
		
	if app.experience_level < 3:
		reporter.fail_test("Expected experience level >= 3, got %d" % app.experience_level)
		await _teardown_app(app)
		return
		
	if app.franc_balance < 3000000:
		reporter.fail_test("Expected franc balance >= 3M, got %d" % app.franc_balance)
		await _teardown_app(app)
		return

	reporter.pass_test()
	await _teardown_app(app)

func test_instant_mining_sets_flag_and_changes_scene() -> void:
	reporter.start_test("trigger_instant_mining sets auto-start flag and unpauses")
	_reset_state()
	var app = await _setup_app()
	
	app.set_game_paused(true)
	app.trigger_instant_mining()
	
	if app.get_game_paused():
		reporter.fail_test("Expected game to be unpaused after trigger_instant_mining")
		await _teardown_app(app)
		return
		
	if not app.check_auto_start_mining():
		reporter.fail_test("Expected auto_start_mining flag to be true")
		await _teardown_app(app)
		return

	reporter.pass_test()
	await _teardown_app(app)
