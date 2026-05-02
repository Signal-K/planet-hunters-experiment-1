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
	await test_numeric_database_id_normalization_stays_stable()
	await test_planet_detection_aliases()
	await test_only_planet_candidates_expose_classification()
	await test_title_builder_avoids_duplicate_tic_prefix()

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

func test_numeric_database_id_normalization_stays_stable() -> void:
	reporter.start_test("Numeric database id normalization stays stable")
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

func test_only_planet_candidates_expose_classification() -> void:
	reporter.start_test("Only TESS planet candidates expose classification controls")
	if not model.is_candidate({"anomalySet": "telescope-tess", "tess_disposition": "PC"}):
		reporter.fail_test("Expected unconfirmed TESS candidate to be classifiable")
		return
	if model.is_candidate({"anomalySet": "active-asteroids", "classification_status": "candidate"}):
		reporter.fail_test("Did not expect active-asteroids candidate to remain classifiable in the current release")
		return
	reporter.pass_test()

func test_title_builder_avoids_duplicate_tic_prefix() -> void:
	reporter.start_test("Planet title builder keeps a single TIC prefix")
	var title = model.build_title({
		"ticId": "TIC 150428135",
		"anomalySet": "telescope-tess"
	}, "150428135", true)
	if title != "TIC 150428135":
		reporter.fail_test("Expected a single TIC prefix, got %s" % title)
		return
	reporter.pass_test()
