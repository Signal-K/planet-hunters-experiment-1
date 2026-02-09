extends SceneTree

const TestReporter = preload("res://tests/TestReporter.gd")
const AsteroidDetailModel = preload("res://Scripts/UI/AsteroidDetail/AsteroidDetailModel.gd")

var reporter := TestReporter.new()
var model := AsteroidDetailModel.new()

func _init():
	reporter.start_suite("Annotation Model", {
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
	await test_planet_uses_tic_id_for_annotation_key()
	await test_asteroid_uses_numeric_database_id()
	await test_planet_detection_aliases()

func test_planet_uses_tic_id_for_annotation_key() -> void:
	reporter.start_test("Planet normalization prefers ticId over row id")
	var anomaly = {
		"id": 12345,
		"ticId": "TIC 7654321",
		"anomalySet": "telescope-tess"
	}
	var is_planet = model.is_planet(anomaly)
	var normalized = model.normalize_anomaly_id(anomaly, is_planet)
	if normalized != "7654321":
		reporter.fail_test("Expected normalized tic id 7654321, got %s" % normalized)
		return
	reporter.pass_test()

func test_asteroid_uses_numeric_database_id() -> void:
	reporter.start_test("Asteroid normalization keeps numeric DB id stable")
	var anomaly = {
		"id": 63769326.0,
		"content": "TIC 63769326",
		"anomalySet": "active-asteroids"
	}
	var normalized = model.normalize_anomaly_id(anomaly, false)
	if normalized != "63769326":
		reporter.fail_test("Expected normalized asteroid id 63769326, got %s" % normalized)
		return
	reporter.pass_test()

func test_planet_detection_aliases() -> void:
	reporter.start_test("Planet detection accepts telescope and generic aliases")
	if not model.is_planet({"anomalySet": "telescope-tess"}):
		reporter.fail_test("Expected telescope-tess to be treated as planet")
		return
	if not model.is_planet({"anomalySet": "planets"}):
		reporter.fail_test("Expected planets alias to be treated as planet")
		return
	if model.is_planet({"anomalySet": "active-asteroids"}):
		reporter.fail_test("Did not expect asteroid set to be treated as planet")
		return
	reporter.pass_test()
