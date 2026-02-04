extends SceneTree

const TestReporter = preload("res://tests/TestReporter.gd")
const MissionLogManager = preload("res://Scripts/Utils/MissionLogManager.gd")

var reporter := TestReporter.new()

func _init():
	reporter.start_suite("Mission Log", {
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
	await test_append_log()

func test_append_log() -> void:
	reporter.start_test("Append mission log entry")
	var before = MissionLogManager.get_missions().size()
	var entry = {
		"timestamp": "test",
		"rocket_id": "starterrocket1",
		"target_id": "A-1",
		"action": "sell_orbit",
		"payout": 10
	}
	MissionLogManager.add_mission(entry)
	var after = MissionLogManager.get_missions().size()
	if after <= before:
		reporter.fail_test("Expected mission log count to increase")
		return
	reporter.pass_test()
