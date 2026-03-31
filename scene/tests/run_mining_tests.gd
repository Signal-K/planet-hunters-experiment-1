extends SceneTree

const TestReporter = preload("res://tests/TestReporter.gd")
const MiningInventory = preload("res://Scripts/Utils/MiningInventory.gd")
const ResourceYield = preload("res://Scripts/Utils/ResourceYield.gd")
const MineralPricing = preload("res://Scripts/Utils/MineralPricing.gd")
const RocketSpecs = preload("res://Scripts/Utils/RocketSpecs.gd")

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
	await test_sr2_mining_laser_extracts_more_per_cycle()
	await test_sr2_cargo_capacity_multiplier_applies_to_yield()
	await test_mission1_full_mine_plus_scrap_is_near_120_percent()
	await test_mission2_full_mine_plus_scrap_is_near_120_percent()
	await test_mission4_full_mine_plus_scrap_is_near_140_percent()
	await test_sr1_rocket_specs_validation()
	await test_sr2_rocket_specs_validation()
	await test_sr3_rocket_specs_validation()
	await test_sr2_speed_and_range_multipliers()
	await test_sr3_range_is_ten_times_sr2()
	await test_sr2_unlock_after_first_mission()
	await test_sr1_cost_and_salvage_values()
	await test_sr2_cost_and_salvage_values()
	await test_sr3_cost_and_salvage_values()

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

func test_sr2_mining_laser_extracts_more_per_cycle() -> void:
	reporter.start_test("SR2 mining laser extracts about 50% more per cycle")
	_reset_inventory()
	var minerals = {"Iron": 150}
	var base = MiningInventory.apply_mining("target-sr1", 150.0, minerals, 1.0)
	var boosted = MiningInventory.apply_mining("target-sr2", 150.0, minerals, 1.5)
	var base_collected = _sum_collected(base.get("collected", {}))
	var boosted_collected = _sum_collected(boosted.get("collected", {}))
	if boosted_collected <= base_collected:
		reporter.fail_test("Expected boosted extraction to exceed base extraction")
		return
	if float(boosted_collected) < float(base_collected) * 1.4:
		reporter.fail_test("Expected boosted extraction to be ~50%% higher (base=%s boosted=%s)" % [str(base_collected), str(boosted_collected)])
		return
	reporter.pass_test()

func test_sr2_cargo_capacity_multiplier_applies_to_yield() -> void:
	reporter.start_test("SR2 cargo multiplier increases mineable target capacity")
	var normal = ResourceYield.get_yield_for_target("target-capacity", "asteroid", 1, 1.0)
	var boosted = ResourceYield.get_yield_for_target("target-capacity", "asteroid", 1, 1.5)
	var normal_capacity = int(normal.get("capacity", 0))
	var boosted_capacity = int(boosted.get("capacity", 0))
	if boosted_capacity <= normal_capacity:
		reporter.fail_test("Expected boosted capacity > base capacity")
		return
	var expected = int(round(float(normal_capacity) * 1.5))
	if boosted_capacity != expected:
		reporter.fail_test("Expected boosted capacity=%s, got %s" % [str(expected), str(boosted_capacity)])
		return
	reporter.pass_test()

func test_mission1_full_mine_plus_scrap_is_near_120_percent() -> void:
	reporter.start_test("Mission 1 full mine + scrap lands near 120% of SR1 cost")
	var ratio = _full_mine_plus_scrap_ratio("mission-1-training-target", "starterrocket1")
	if ratio < 1.18 or ratio > 1.22:
		reporter.fail_test("Expected Mission 1 ratio near 1.20, got %s" % str(ratio))
		return
	reporter.pass_test()

func test_mission2_full_mine_plus_scrap_is_near_120_percent() -> void:
	reporter.start_test("Mission 2 full mine + scrap lands near 120% of SR2 cost")
	var ratio = _full_mine_plus_scrap_ratio("mission-2-upgrade-target", "starterrocket2", "asteroid")
	if ratio < 1.18 or ratio > 1.22:
		reporter.fail_test("Expected Mission 2 ratio near 1.20, got %s" % str(ratio))
		return
	reporter.pass_test()

func test_mission4_full_mine_plus_scrap_is_near_140_percent() -> void:
	reporter.start_test("Mission 4 full mine + scrap lands near 140% of SR3 cost")
	var ratio = _full_mine_plus_scrap_ratio("mission-4-exoplanet-target", "starterrocket3", "planet")
	if ratio < 1.38 or ratio > 1.42:
		reporter.fail_test("Expected Mission 4 ratio near 1.40, got %s" % str(ratio))
		return
	reporter.pass_test()

func test_sr1_rocket_specs_validation() -> void:
	reporter.start_test("SR1 specs are correctly configured")
	var sr1_cost = RocketSpecs.get_cost("starterrocket1")
	var sr1_display = RocketSpecs.get_display_name("starterrocket1")
	var sr1_salvage = RocketSpecs.get_salvage_refund_pct("starterrocket1")
	
	if sr1_cost != 1000000000:
		reporter.fail_test("Expected SR1 cost 1B, got %d" % sr1_cost)
		return
	if sr1_display != "Starter Rocket 1":
		reporter.fail_test("Expected SR1 display name 'Starter Rocket 1', got '%s'" % sr1_display)
		return
	if sr1_salvage != 0.20:
		reporter.fail_test("Expected SR1 salvage 20%%, got %f%%" % (sr1_salvage * 100.0))
		return
	reporter.pass_test()

func test_sr2_rocket_specs_validation() -> void:
	reporter.start_test("SR2 specs are correctly configured")
	var sr2_cost = RocketSpecs.get_cost("starterrocket2")
	var sr2_display = RocketSpecs.get_display_name("starterrocket2")
	var sr2_salvage = RocketSpecs.get_salvage_refund_pct("starterrocket2")
	
	if sr2_cost != 1300000000:
		reporter.fail_test("Expected SR2 cost 1.3B, got %d" % sr2_cost)
		return
	if sr2_display != "Starter Rocket 2":
		reporter.fail_test("Expected SR2 display name 'Starter Rocket 2', got '%s'" % sr2_display)
		return
	if sr2_salvage != 0.20:
		reporter.fail_test("Expected SR2 salvage 20%%, got %f%%" % (sr2_salvage * 100.0))
		return
	reporter.pass_test()

func test_sr3_rocket_specs_validation() -> void:
	reporter.start_test("SR3 specs are correctly configured")
	var sr3_cost = RocketSpecs.get_cost("starterrocket3")
	var sr3_display = RocketSpecs.get_display_name("starterrocket3")
	var sr3_salvage = RocketSpecs.get_salvage_refund_pct("starterrocket3")
	var sr3_mining = RocketSpecs.get_mining_multiplier("starterrocket3")
	var sr3_cargo = RocketSpecs.get_cargo_multiplier("starterrocket3")
	if sr3_cost != 4000000000:
		reporter.fail_test("Expected SR3 cost 4B, got %d" % sr3_cost)
		return
	if sr3_display != "Starter Rocket 3":
		reporter.fail_test("Expected SR3 display name 'Starter Rocket 3', got '%s'" % sr3_display)
		return
	if sr3_salvage != 0.20:
		reporter.fail_test("Expected SR3 salvage 20%%, got %f%%" % (sr3_salvage * 100.0))
		return
	if abs(sr3_mining - 3.0) > 0.001:
		reporter.fail_test("Expected SR3 mining multiplier 3.0x, got %f" % sr3_mining)
		return
	if abs(sr3_cargo - 7.5) > 0.001:
		reporter.fail_test("Expected SR3 cargo multiplier 7.5x, got %f" % sr3_cargo)
		return
	reporter.pass_test()

func test_sr2_speed_and_range_multipliers() -> void:
	reporter.start_test("SR2 has 2x speed and range multipliers")
	var sr1_speed = RocketSpecs.get_speed_multiplier("starterrocket1")
	var sr2_speed = RocketSpecs.get_speed_multiplier("starterrocket2")
	var sr1_range = RocketSpecs.get_range_multiplier("starterrocket1")
	var sr2_range = RocketSpecs.get_range_multiplier("starterrocket2")
	
	if sr1_speed != 1.0:
		reporter.fail_test("Expected SR1 speed multiplier 1.0x, got %f" % sr1_speed)
		return
	if sr2_speed != 2.0:
		reporter.fail_test("Expected SR2 speed multiplier 2.0x, got %f" % sr2_speed)
		return
	if sr1_range != 1.0:
		reporter.fail_test("Expected SR1 range multiplier 1.0x, got %f" % sr1_range)
		return
	if sr2_range != 2.0:
		reporter.fail_test("Expected SR2 range multiplier 2.0x, got %f" % sr2_range)
		return
	
	# Verify mission/return times are affected by speed
	var sr1_mission_secs = RocketSpecs.get_mission_seconds("starterrocket1", 60)
	var sr2_mission_secs = RocketSpecs.get_mission_seconds("starterrocket2", 60)
	if sr2_mission_secs >= sr1_mission_secs:
		reporter.fail_test("Expected SR2 mission time (%d) < SR1 mission time (%d)" % [sr2_mission_secs, sr1_mission_secs])
		return
	reporter.pass_test()

func test_sr3_range_is_ten_times_sr2() -> void:
	reporter.start_test("SR3 range is 10x SR2 range")
	var sr2_range = RocketSpecs.get_range_multiplier("starterrocket2")
	var sr3_range = RocketSpecs.get_range_multiplier("starterrocket3")
	if abs(sr3_range - sr2_range * 10.0) > 0.001:
		reporter.fail_test("Expected SR3 range to be 10x SR2 (sr2=%s sr3=%s)" % [str(sr2_range), str(sr3_range)])
		return
	reporter.pass_test()

func test_sr2_unlock_after_first_mission() -> void:
	reporter.start_test("SR2 is available as a rocket type for selection")
	var sr2_spec = RocketSpecs.get_spec("starterrocket2")
	if sr2_spec.is_empty():
		reporter.fail_test("Expected SR2 spec to be defined")
		return
	# Verify all required fields are present
	if not sr2_spec.has("cost"):
		reporter.fail_test("SR2 spec missing 'cost'")
		return
	if not sr2_spec.has("speed_multiplier"):
		reporter.fail_test("SR2 spec missing 'speed_multiplier'")
		return
	if not sr2_spec.has("range_multiplier"):
		reporter.fail_test("SR2 spec missing 'range_multiplier'")
		return
	if not sr2_spec.has("cargo_multiplier"):
		reporter.fail_test("SR2 spec missing 'cargo_multiplier'")
		return
	if not sr2_spec.has("mining_multiplier"):
		reporter.fail_test("SR2 spec missing 'mining_multiplier'")
		return
	reporter.pass_test()

func test_sr1_cost_and_salvage_values() -> void:
	reporter.start_test("SR1 salvage refund is 20% of 1B cost")
	var sr1_cost = RocketSpecs.get_cost("starterrocket1")
	var sr1_salvage_pct = RocketSpecs.get_salvage_refund_pct("starterrocket1")
	var expected_refund = int(round(float(sr1_cost) * sr1_salvage_pct))
	
	if expected_refund != 200000000:
		reporter.fail_test("Expected SR1 salvage refund 200M F, got %d" % expected_refund)
		return
	reporter.pass_test()

func test_sr2_cost_and_salvage_values() -> void:
	reporter.start_test("SR2 salvage refund is 20% of 1.3B cost")
	var sr2_cost = RocketSpecs.get_cost("starterrocket2")
	var sr2_salvage_pct = RocketSpecs.get_salvage_refund_pct("starterrocket2")
	var expected_refund = int(round(float(sr2_cost) * sr2_salvage_pct))
	
	if expected_refund != 260000000:
		reporter.fail_test("Expected SR2 salvage refund 260M F, got %d" % expected_refund)
		return
	reporter.pass_test()

func test_sr3_cost_and_salvage_values() -> void:
	reporter.start_test("SR3 salvage refund is 20% of 4B cost")
	var sr3_cost = RocketSpecs.get_cost("starterrocket3")
	var sr3_salvage_pct = RocketSpecs.get_salvage_refund_pct("starterrocket3")
	var expected_refund = int(round(float(sr3_cost) * sr3_salvage_pct))
	if expected_refund != 800000000:
		reporter.fail_test("Expected SR3 salvage refund 800M F, got %d" % expected_refund)
		return
	reporter.pass_test()

func _sum_collected(collected: Dictionary) -> int:
	var total = 0
	for value in collected.values():
		total += int(value)
	return total

func _full_mine_plus_scrap_ratio(target_id: String, rocket_type: String, target_type: String = "asteroid") -> float:
	_reset_inventory()
	var cargo_multiplier = RocketSpecs.get_cargo_multiplier(rocket_type)
	var mining_multiplier = RocketSpecs.get_mining_multiplier(rocket_type)
	var yield_data = ResourceYield.get_yield_for_target(target_id, target_type, 1, cargo_multiplier)
	var minerals: Dictionary = yield_data.get("minerals", {})
	var capacity = float(yield_data.get("capacity", 0))
	var state = {}
	var guard = 0
	while guard < 300:
		state = MiningInventory.apply_mining(target_id, capacity, minerals, mining_multiplier)
		var remaining = float(state.get("remaining_mass", 0))
		if remaining <= 0.0:
			break
		guard += 1
	if state.is_empty():
		return 0.0
	var collected: Dictionary = state.get("collected", {})
	var orbit_sale = MineralPricing.total_value(collected, 0.8, {})
	var rocket_cost = RocketSpecs.get_cost(rocket_type)
	var scrap_refund = int(round(float(rocket_cost) * RocketSpecs.get_salvage_refund_pct(rocket_type)))
	return float(orbit_sale + scrap_refund) / float(max(rocket_cost, 1))
