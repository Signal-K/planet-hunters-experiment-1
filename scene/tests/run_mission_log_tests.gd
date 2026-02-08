extends SceneTree

const TestReporter = preload("res://tests/TestReporter.gd")
const MissionLogManager = preload("res://Scripts/Utils/MissionLogManager.gd")
const SubcontractorManager = preload("res://Scripts/Utils/SubcontractorManager.gd")
const TEST_LOG_PATH := "res://tests/mission_logs_test.json"

var reporter := TestReporter.new()

func _init():
	MissionLogManager.set_path_overrides(TEST_LOG_PATH, TEST_LOG_PATH)
	reporter.start_suite("Mission Log", {
		"engine": Engine.get_version_info()["string"],
		"os": OS.get_name(),
		"project": "scene",
		"timestamp": Time.get_datetime_string_from_system()
	})
	await run_all_tests()
	reporter.summary()
	MissionLogManager.clear_path_overrides()
	await create_timer(0.1).timeout
	if reporter.tests_failed > 0:
		quit(1)
	else:
		quit(0)

func run_all_tests() -> void:
	await test_append_log()
	await test_log_entry_preserves_all_fields()
	await test_subcontractor_gating_by_level()
	await test_salvage_action_recorded()

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

func test_log_entry_preserves_all_fields() -> void:
	reporter.start_test("Mission log preserves complete entry fields")
	var unique_suffix = str(Time.get_unix_time_from_system())
	var entry = {
		"timestamp": "2026-02-08 10:00:%s" % unique_suffix,
		"rocket_id": "starterrocket1-test-%s" % unique_suffix,
		"target_id": "A-99",
		"target_label": "Asteroid A-99",
		"target_type": "asteroid",
		"action": "sell_earth",
		"payout": 123456,
		"franc_delta": 123456,
		"xp_awarded": 5,
		"cargo": {"Nickel": 10, "Iron": 5}
	}
	var ok = MissionLogManager.add_mission(entry)
	if not ok:
		reporter.fail_test("MissionLogManager.add_mission returned false")
		return
	var all_entries = MissionLogManager.get_missions()
	if all_entries.is_empty():
		reporter.fail_test("Mission log is empty after append")
		return
	var found = false
	for i in range(all_entries.size() - 1, -1, -1):
		var row = all_entries[i]
		if typeof(row) != TYPE_DICTIONARY:
			continue
		if str(row.get("rocket_id", "")) != str(entry["rocket_id"]):
			continue
		found = true
		for key in entry.keys():
			if not row.has(key):
				reporter.fail_test("Expected key '%s' missing from stored mission entry" % str(key))
				return
		if int(row.get("payout", -1)) != int(entry["payout"]):
			reporter.fail_test("Stored payout mismatch")
			return
		if typeof(row.get("cargo", {})) != TYPE_DICTIONARY:
			reporter.fail_test("Stored cargo should be a dictionary")
			return
		break
	if not found:
		reporter.fail_test("Could not find appended mission entry by rocket_id")
		return
	reporter.pass_test()

func test_subcontractor_gating_by_level() -> void:
	reporter.start_test("Subcontractor roster is gated by level")
	var level1 = SubcontractorManager.get_available_for_level(1)
	var level2 = SubcontractorManager.get_available_for_level(2)
	if level1.size() != 3:
		reporter.fail_test("Expected 3 subcontractors at level 1, got %s" % str(level1.size()))
		return
	if level2.size() <= level1.size():
		reporter.fail_test("Expected more subcontractors at level 2 than level 1")
		return
	for entry in level1:
		if int(entry.get("min_level", 1)) > 1:
			reporter.fail_test("Found level-gated subcontractor in level 1 roster")
			return
	reporter.pass_test()

func test_salvage_action_recorded() -> void:
	reporter.start_test("Salvage action is recorded in mission log")
	var unique_suffix = str(Time.get_unix_time_from_system()) + "-salvage"
	var entry = {
		"timestamp": "2026-02-08 10:30:%s" % unique_suffix,
		"rocket_id": "starterrocket1-%s" % unique_suffix,
		"target_id": "A-SALVAGE",
		"target_label": "Asteroid Salvage",
		"target_type": "asteroid",
		"action": "salvage",
		"payout": 1000,
		"franc_delta": 1000,
		"xp_awarded": 0,
		"cargo": {"Iron": 3, "Nickel": 1}
	}
	var ok = MissionLogManager.add_mission(entry)
	if not ok:
		reporter.fail_test("MissionLogManager.add_mission returned false for salvage action")
		return
	var all_entries = MissionLogManager.get_missions()
	for i in range(all_entries.size() - 1, -1, -1):
		var row = all_entries[i]
		if typeof(row) != TYPE_DICTIONARY:
			continue
		if str(row.get("rocket_id", "")) != str(entry["rocket_id"]):
			continue
		if str(row.get("action", "")) != "salvage":
			reporter.fail_test("Expected action=salvage for stored mission entry")
			return
		var cargo = row.get("cargo", {})
		if typeof(cargo) != TYPE_DICTIONARY or int(cargo.get("Iron", 0)) != 3:
			reporter.fail_test("Stored salvage cargo mismatch")
			return
		reporter.pass_test()
		return
	reporter.fail_test("Could not find salvage mission entry by rocket_id")
