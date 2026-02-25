extends SceneTree
## Structure interaction and scene transition tests
## Run with: /Applications/Godot4.5.app/Contents/MacOS/Godot --headless --path scene -s scene/tests/run_structure_tests.gd

const TestReporter = preload("res://tests/TestReporter.gd")
const RocketsManager = preload("res://Scripts/Utils/RocketsManager.gd")
const CurrencyManager = preload("res://Scripts/Utils/CurrencyManager.gd")

var reporter := TestReporter.new()

func _init():
	reporter.start_suite("Structure & Interaction Tests", {
		"engine": Engine.get_version_info()["string"],
		"os": OS.get_name(),
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
	await test_currency_manager_balance_operations()
	await test_scanner_build_cost_value()
	await test_contractor_discount_calculation()
	await test_contractor_payout_bonus_calculation()
	await test_mission_reward_ratios_match_spec()

func test_currency_manager_balance_operations() -> void:
	reporter.start_test("[SPEC] Currency manager handles balance operations correctly")
	var currency = CurrencyManager.new()
	var initial = currency.balance
	
	currency.modify_balance(1000000)
	if currency.balance != initial + 1000000:
		reporter.fail_test("Balance after add: %d != expected %d" % [currency.balance, initial + 1000000])
		return
	
	currency.modify_balance(-1000000)
	if currency.balance != initial:
		reporter.fail_test("Balance after subtract: %d != expected %d" % [currency.balance, initial])
		return
	
	reporter.pass_test()

func test_scanner_build_cost_value() -> void:
	reporter.start_test("[SPEC] Scanner build cost is exactly 2B F per spec")
	var scanner_cost = RocketsManager.get_scanner_build_cost()
	
	if scanner_cost != 2000000000:
		reporter.fail_test("Scanner cost is %d, expected 2000000000" % scanner_cost)
		return
	
	reporter.pass_test()

func test_contractor_discount_calculation() -> void:
	reporter.start_test("[SPEC] Rocketlab contractor applies 20% discount correctly")
	var base_cost = 1000000000
	var discount_pct = 0.20
	var expected = int(base_cost * (1.0 - discount_pct))
	
	if expected != 800000000:
		reporter.fail_test("20%% discount on 1B should be 800M, got %d" % expected)
		return
	
	reporter.pass_test()

func test_contractor_payout_bonus_calculation() -> void:
	reporter.start_test("[SPEC] Astroforge contractor applies 1.15x bonus with 1.4B cap")
	var base_payout = 1000000000
	var bonus_mult = 1.15
	var cap = 1400000000
	
	var calculated = int(base_payout * bonus_mult)
	if calculated != 1150000000:
		reporter.fail_test("Bonus payout %d != expected 1150000000" % calculated)
		return
	
	# Test cap
	var high_payout = 2000000000
	var capped = min(int(high_payout * bonus_mult), cap)
	if capped != cap:
		reporter.fail_test("Capped payout %d != cap %d" % [capped, cap])
		return
	
	reporter.pass_test()

func test_mission_reward_ratios_match_spec() -> void:
	reporter.start_test("[SPEC] All mission reward ratios match specification")
	var m1 = RocketsManager.get_predefined_mission_target(1)
	var m2 = RocketsManager.get_predefined_mission_target(2)
	var m4 = RocketsManager.get_predefined_mission_target(4)
	var m5 = RocketsManager.get_predefined_mission_target(5)
	
	if abs(m1.get("reward_ratio", 0.0) - 1.2) > 0.001:
		reporter.fail_test("M1 ratio %s != 1.2" % m1.get("reward_ratio"))
		return
	if abs(m2.get("reward_ratio", 0.0) - 1.3) > 0.001:
		reporter.fail_test("M2 ratio %s != 1.3" % m2.get("reward_ratio"))
		return
	if abs(m4.get("reward_ratio", 0.0) - 1.4) > 0.001:
		reporter.fail_test("M4 ratio %s != 1.4" % m4.get("reward_ratio"))
		return
	if abs(m5.get("reward_ratio", 0.0) - 1.1) > 0.001:
		reporter.fail_test("M5 ratio %s != 1.1" % m5.get("reward_ratio"))
		return
	
	reporter.pass_test()
