extends SceneTree

const TestReporter = preload("res://tests/TestReporter.gd")
const MiningInventory = preload("res://Scripts/Utils/MiningInventory.gd")

var reporter := TestReporter.new()

func _init():
	reporter.start_suite("Mining Inventory", {
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
	await test_apply_mining_updates_totals()
	await test_state_persists_between_loads()

func _reset_inventory() -> void:
	MiningInventory.save_state({"targets": {}})

func test_apply_mining_updates_totals() -> void:
	reporter.start_test("Mining updates remaining and collected totals")
	_reset_inventory()
	var target_id = "test-target-mining"
	var minerals = {"Iron": 6, "Nickel": 3, "Platinum": 1}
	var original_mass = 10.0
	var state = MiningInventory.apply_mining(target_id, original_mass, minerals)
	var remaining = int(round(float(state.get("remaining_mass", -1.0))))
	var collected: Dictionary = state.get("collected", {})
	var total_collected = 0
	for v in collected.values():
		total_collected += int(v)
	if remaining != 9:
		reporter.fail_test("Expected remaining=9 after first mine, got %s" % str(remaining))
		return
	if total_collected != 1:
		reporter.fail_test("Expected total_collected=1 after first mine, got %s" % str(total_collected))
		return
	reporter.pass_test()

func test_state_persists_between_loads() -> void:
	reporter.start_test("Mining state persists across reload")
	_reset_inventory()
	var target_id = "test-target-persist"
	var minerals = {"Iron": 100, "Nickel": 50}
	var original_mass = 150.0
	var state1 = MiningInventory.apply_mining(target_id, original_mass, minerals)
	var saved1 = MiningInventory.load_state()
	var saved_target1 = saved1.get("targets", {}).get(target_id, {})
	if saved_target1.is_empty():
		reporter.fail_test("Expected target state to be written to storage")
		return
	var state2 = MiningInventory.get_target_state(target_id, original_mass)
	var rem1 = int(round(float(state1.get("remaining_mass", -1.0))))
	var rem2 = int(round(float(state2.get("remaining_mass", -1.0))))
	if rem1 != rem2:
		reporter.fail_test("Expected persisted remaining=%s, got %s" % [str(rem1), str(rem2)])
		return
	var collected1: Dictionary = state1.get("collected", {})
	var collected2: Dictionary = state2.get("collected", {})
	for key in collected1.keys():
		if int(collected1.get(key, -1)) != int(collected2.get(key, -1)):
			reporter.fail_test("Expected persisted collected[%s]=%s, got %s" % [str(key), str(collected1.get(key, -1)), str(collected2.get(key, -1))])
			return
	reporter.pass_test()
