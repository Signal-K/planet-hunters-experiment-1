extends SceneTree
## Unified Sync Bridge Tests

const TestReporter = preload("res://tests/TestReporter.gd")
const AppControllerScript = preload("res://Scripts/Systems/AppController.gd")
const SyncBridgeScript = preload("res://Scripts/Systems/SyncBridge.gd")

var reporter := TestReporter.new()

func _init():
	reporter.start_suite("Unified Sync Bridge", {
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
	await test_get_state_returns_all_keys()
	await test_set_value_updates_state()
	await test_set_value_updates_app_controller()
	await test_app_controller_changes_update_sync_bridge()
	await test_init_from_react_sets_all_values()
	await test_no_feedback_loop()

func _setup() -> Dictionary:
	var app = AppControllerScript.new()
	app.name = "AppController"
	get_root().add_child(app)

	var sync = SyncBridgeScript.new()
	sync.name = "SyncBridge"
	get_root().add_child(sync)

	await create_timer(0.1).timeout
	return {"app": app, "sync": sync}

func _teardown(app: Node, sync: Node) -> void:
	if is_instance_valid(sync):
		sync.queue_free()
	if is_instance_valid(app):
		app.queue_free()
	await create_timer(0.05).timeout

func test_get_state_returns_all_keys() -> void:
	reporter.start_test("get_state returns all expected keys")
	var ctx = await _setup()
	var sync = ctx["sync"]

	var state = sync.get_state()
	var expected_keys = ["counter", "francBalance", "experienceXp", "experienceLevel"]

	for key in expected_keys:
		if not state.has(key):
			reporter.fail_test("Missing key in state: " + key)
			await _teardown(ctx["app"], sync)
			return

	reporter.pass_test()
	await _teardown(ctx["app"], sync)

func test_set_value_updates_state() -> void:
	reporter.start_test("set_value updates internal state")
	var ctx = await _setup()
	var sync = ctx["sync"]

	sync.set_value("counter", 42)
	var state = sync.get_state()

	if state.get("counter") != 42:
		reporter.fail_test("Expected counter=42, got " + str(state.get("counter")))
		await _teardown(ctx["app"], sync)
		return

	reporter.pass_test()
	await _teardown(ctx["app"], sync)

func test_set_value_updates_app_controller() -> void:
	reporter.start_test("set_value updates AppController")
	var ctx = await _setup()
	var app = ctx["app"]
	var sync = ctx["sync"]

	sync.set_value("counter", 99)
	if app.get_counter() != 99:
		reporter.fail_test("AppController counter should be 99, got " + str(app.get_counter()))
		await _teardown(app, sync)
		return

	sync.set_value("francBalance", 5000)
	if app.get_franc_balance() != 5000:
		reporter.fail_test("AppController francBalance should be 5000")
		await _teardown(app, sync)
		return

	reporter.pass_test()
	await _teardown(app, sync)

func test_app_controller_changes_update_sync_bridge() -> void:
	reporter.start_test("AppController changes update SyncBridge")
	var ctx = await _setup()
	var app = ctx["app"]
	var sync = ctx["sync"]

	app.set_franc_balance_from_react(12345)
	await create_timer(0.05).timeout

	var state = sync.get_state()
	if state.get("francBalance") != 12345:
		reporter.fail_test("SyncBridge should have francBalance=12345, got " + str(state.get("francBalance")))
		await _teardown(app, sync)
		return

	reporter.pass_test()
	await _teardown(app, sync)

func test_init_from_react_sets_all_values() -> void:
	reporter.start_test("init_from_react sets all values")
	var ctx = await _setup()
	var app = ctx["app"]
	var sync = ctx["sync"]

	var initial_state = {
		"counter": 10,
		"francBalance": 50000,
		"experienceXp": 100,
		"experienceLevel": 3
	}

	sync.init_from_react(initial_state)
	var state = sync.get_state()

	if state.get("counter") != 10:
		reporter.fail_test("counter should be 10")
		await _teardown(app, sync)
		return
	if state.get("francBalance") != 50000:
		reporter.fail_test("francBalance should be 50000")
		await _teardown(app, sync)
		return
	if app.get_counter() != 10:
		reporter.fail_test("AppController counter should be 10")
		await _teardown(app, sync)
		return

	reporter.pass_test()
	await _teardown(app, sync)

func test_no_feedback_loop() -> void:
	reporter.start_test("No feedback loop when setting from React")
	var ctx = await _setup()
	var app = ctx["app"]
	var sync = ctx["sync"]

	var signals_received: Array = []
	sync.state_changed.connect(func(key, value, source): signals_received.append({"key": key, "value": value, "source": source}))

	sync.set_value("counter", 77)
	await create_timer(0.1).timeout

	var react_signals = signals_received.filter(func(s): return s.key == "counter" and s.source == "react")
	if react_signals.size() != 1:
		reporter.fail_test("Expected 1 react signal for counter, got " + str(react_signals.size()) + ". All signals: " + str(signals_received))
		await _teardown(app, sync)
		return

	if react_signals[0].source != "react":
		reporter.fail_test("Signal should have source 'react', got " + str(react_signals[0].source))
		await _teardown(app, sync)
		return

	reporter.pass_test()
	await _teardown(app, sync)
