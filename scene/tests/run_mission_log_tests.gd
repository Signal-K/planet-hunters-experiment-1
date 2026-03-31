extends SceneTree

const TestReporter = preload("res://tests/TestReporter.gd")
const MissionLogManager = preload("res://Scripts/Utils/MissionLogManager.gd")
const SubcontractorManager = preload("res://Scripts/Utils/SubcontractorManager.gd")
const TEST_LOG_PATH := "res://tests/mission_logs_test.json"

var reporter := TestReporter.new()

class MockAppController:
	extends Node
	var _franc_balance := 0
	var _xp := 0
	var _level := 3

	func add_franc_balance(amount: int, _source: String = "") -> void:
		_franc_balance += amount

	func add_experience(amount: int, _source: String = "") -> void:
		_xp += amount

	func get_franc_balance() -> int:
		return _franc_balance

	func get_experience_level() -> int:
		return _level

	func get_experience_xp() -> int:
		return _xp

	func get_xp_required_for_next_level() -> int:
		return 10 + max(_level, 1)

	func has_outstanding_loan() -> bool:
		return false

	func repay_loan_from_payout(amount: int) -> int:
		return amount

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
	await test_same_badge_actions_merge_into_one_mission()
	await test_legacy_split_entries_migrate_on_load()
	await test_subcontractor_gating_by_level()
	await test_salvage_action_recorded()
	await test_sell_orbit_closes_out_actions()
	await test_scrap_only_applies_when_selected()
	await test_debrief_ui_builds_correctly_with_mission_data()

func _setup_mission_debrief() -> Dictionary:
	var existing = get_root().get_node_or_null("AppController")
	if existing:
		existing.queue_free()
		await create_timer(0.01).timeout
	var app = MockAppController.new()
	app.name = "AppController"
	get_root().add_child(app)
	var scene = MissionDebriefScene.instantiate()
	get_root().add_child(scene)
	await create_timer(0.02).timeout
	scene._returned = {"rocket_id": "starterrocket1-test", "target_id": "A-TEST", "label": "Asteroid A-TEST", "target_type": "asteroid"}
	scene._cargo = {"Iron": 10, "Nickel": 2}
	scene._earth_payout = 10000
	scene._scrap_refund = 200000000
	return {"scene": scene, "app": app}

func _teardown_mission_debrief(ctx: Dictionary) -> void:
	var scene = ctx.get("scene", null)
	var app = ctx.get("app", null)
	if scene and is_instance_valid(scene):
		scene.queue_free()
	if app and is_instance_valid(app):
		app.queue_free()
	await create_timer(0.01).timeout

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

func test_same_badge_actions_merge_into_one_mission() -> void:
	reporter.start_test("Sell + scrap with same badge merge into one mission entry")
	var unique_suffix = str(Time.get_unix_time_from_system()) + "-merge"
	var badge = "merge-%s" % unique_suffix
	var rocket_id = "starterrocket1-%s" % unique_suffix
	var first = {
		"timestamp": "2026-02-08 11:00:%s" % unique_suffix,
		"rocket_id": rocket_id,
		"target_id": "A-MERGE",
		"label": "Asteroid Merge",
		"action": "sell_earth",
		"payout": 500,
		"franc_delta": 500,
		"xp_awarded": 4,
		"cargo": {"Iron": 2},
		"badge": badge
	}
	var second = {
		"timestamp": "2026-02-08 11:01:%s" % unique_suffix,
		"rocket_id": rocket_id,
		"target_id": "A-MERGE",
		"label": "Asteroid Merge",
		"action": "scrap",
		"payout": 100,
		"franc_delta": 100,
		"xp_awarded": 0,
		"cargo": {"Iron": 2},
		"badge": badge
	}
	if not MissionLogManager.add_mission(first):
		reporter.fail_test("Failed to append first mission action")
		return
	if not MissionLogManager.add_mission(second):
		reporter.fail_test("Failed to append second mission action")
		return

	var entries = MissionLogManager.get_missions()
	var matches := []
	for row in entries:
		if typeof(row) != TYPE_DICTIONARY:
			continue
		if str(row.get("badge", "")) == badge:
			matches.append(row)
	if matches.size() != 1:
		reporter.fail_test("Expected exactly one merged entry for badge, got %s" % str(matches.size()))
		return
	var merged = matches[0]
	var actions = merged.get("actions", [])
	if typeof(actions) != TYPE_ARRAY or actions.size() < 2:
		reporter.fail_test("Expected merged actions array with at least 2 items")
		return
	var action_summary = str(merged.get("action", ""))
	if not action_summary.contains("sell_earth") or not action_summary.contains("scrap"):
		reporter.fail_test("Merged action summary missing expected actions")
		return
	if int(merged.get("payout_total", -1)) != 600:
		reporter.fail_test("Expected payout_total 600, got %s" % str(merged.get("payout_total", -1)))
		return
	reporter.pass_test()

func test_legacy_split_entries_migrate_on_load() -> void:
	reporter.start_test("Legacy split mission entries merge by badge on load")
	var unique_suffix = str(Time.get_unix_time_from_system()) + "-legacy"
	var badge = "legacy-%s" % unique_suffix
	var initial = {
		"missions": [
			{"badge": badge, "action": "sell_orbit", "payout": 10, "timestamp": "t1", "rocket_id": "r1", "target_id": "a1"},
			{"badge": badge, "action": "scrap", "payout": 5, "timestamp": "t2", "rocket_id": "r1", "target_id": "a1"}
		]
	}
	MissionLogManager.save_state(initial)
	var rows = MissionLogManager.get_missions()
	var count = 0
	var payout_total = -1
	for row in rows:
		if typeof(row) != TYPE_DICTIONARY:
			continue
		if str(row.get("badge", "")) != badge:
			continue
		count += 1
		payout_total = int(row.get("payout_total", row.get("payout", -1)))
	if count != 1:
		reporter.fail_test("Expected 1 merged legacy entry for badge, got %s" % str(count))
		return
	if payout_total != 15:
		reporter.fail_test("Expected merged legacy payout_total 15, got %s" % str(payout_total))
		return
	reporter.pass_test()

func test_sell_orbit_closes_out_actions() -> void:
	reporter.start_test("Sell in orbit closes out mission and blocks scrap payout")
	MissionLogManager.save_state({"missions": []})
	var ctx = await _setup_mission_debrief()
	var scene = ctx["scene"]
	var app = ctx["app"]
	scene._on_orbit_pressed()
	var after_sell = int(app.get_franc_balance())
	if after_sell <= 0:
		reporter.fail_test("Expected orbit sale to credit balance")
		await _teardown_mission_debrief(ctx)
		return
	scene._on_complete_pressed()  # should be blocked because _done = true
	var after_scrap_attempt = int(app.get_franc_balance())
	if after_scrap_attempt != after_sell:
		reporter.fail_test("Expected scrap attempt after sale to be blocked")
		await _teardown_mission_debrief(ctx)
		return
	var entries = MissionLogManager.get_missions()
	var action_count := 0
	for row in entries:
		if typeof(row) != TYPE_DICTIONARY:
			continue
		if str(row.get("rocket_id", "")) != "starterrocket1-test":
			continue
		if str(row.get("action", "")).contains("leave_orbit"):
			action_count += 1
	if action_count != 1:
		reporter.fail_test("Expected one leave_orbit log entry for mission, got %s" % str(action_count))
		await _teardown_mission_debrief(ctx)
		return
	await _teardown_mission_debrief(ctx)
	reporter.pass_test()

func test_scrap_only_applies_when_selected() -> void:
	reporter.start_test("Scrap action credits balance only when selected")
	MissionLogManager.save_state({"missions": []})
	var ctx = await _setup_mission_debrief()
	var scene = ctx["scene"]
	var app = ctx["app"]
	var before = int(app.get_franc_balance())
	scene._do_complete("scrap")
	var after = int(app.get_franc_balance())
	if after <= before:
		reporter.fail_test("Expected scrap action to credit balance when selected")
		await _teardown_mission_debrief(ctx)
		return
	var entries = MissionLogManager.get_missions()
	var found = false
	for row in entries:
		if typeof(row) != TYPE_DICTIONARY:
			continue
		if str(row.get("rocket_id", "")) != "starterrocket1-test":
			continue
		if str(row.get("action", "")) == "scrap":
			found = true
			break
	if not found:
		reporter.fail_test("Expected scrap action to be written to mission log")
		await _teardown_mission_debrief(ctx)
		return
	await _teardown_mission_debrief(ctx)
	reporter.pass_test()

func test_debrief_ui_builds_correctly_with_mission_data() -> void:
	reporter.start_test("Debrief UI builds correctly with mission data")
	var ctx = await _setup_mission_debrief()
	var scene = ctx["scene"]
	scene._returned = {"rocket_id": "starterrocket1-test", "target_id": "A-FEEDBACK", "label": "Asteroid Feedback", "target_type": "asteroid"}
	scene._cargo = {"Iron": 10, "Nickel": 2}
	scene._earth_payout = 9999
	scene._scrap_refund = 200000000
	scene._build_ui()
	var title = str(scene.title_label.text)
	if title != "Mission Complete!":
		reporter.fail_test("Expected title 'Mission Complete!', got '%s'" % title)
		await _teardown_mission_debrief(ctx)
		return
	var payout_text = str(scene.payout_label.text)
	if not payout_text.contains("9999"):
		reporter.fail_test("Expected payout label to include payout amount, got '%s'" % payout_text)
		await _teardown_mission_debrief(ctx)
		return
	if not payout_text.contains("200000000"):
		reporter.fail_test("Expected payout label to include scrap refund, got '%s'" % payout_text)
		await _teardown_mission_debrief(ctx)
		return
	await _teardown_mission_debrief(ctx)
	reporter.pass_test()
