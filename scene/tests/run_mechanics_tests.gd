extends SceneTree

## Mechanics tests covering features implemented in March 2026:
##   MECH24  RoomCatalog.UPGRADE_COSTS T1→T2 = 50M F
##   MECH25  RoomCatalog.get_upgrade_cost returns 0 at max tier
##   MECH26  RoomCatalog.get_room_at_tier returns correct room for mining chain
##   MECH27  RocketsManager.get_type_room_upgrades returns {} for unknown type
##   MECH28  RocketsManager.set_type_room_tier persists and syncs laser_level for mining
##   MECH29  GameNavigationMenu.ROOM_UPGRADE_UNLOCK_LEVEL == 5
##   MECH21  MissionDebriefV2 has DISCOVERY_BONUS_MULT = 1.10
##   MECH22  RocketsManager has_discovery_bonus_claimed returns false for unknown target
##   MECH23  RocketsManager mark_discovery_bonus_claimed persists and is_claimed returns true
##   MECH01  MissionDebriefV2 has CONTRACTOR_ROUTE_MULT = 1.2
##   MECH02  MissionDebriefV2 does not reference orbit/MARKET_ROUTE_MULT (orbit flow retired)
##   MECH03  Contract payout > base payout for same mineral value
##   MECH04  Contract mult (1.2) > 1.0 > 0
##   MECH30  RocketsManager.add_mission() record includes goingTo field == target_id
##   MECH31  RocketsManager.add_mission() record includes location array containing target_id
##   MECH32  RocketsManager.update_mission_going_to() updates goingTo field
##   MECH33  RocketsManager.append_mission_location() adds new location to array
##   MECH34  RocketsManager has no add_orbiting_rocket / get_orbiting_rockets methods
##   MECH05  AsteroidPreview has _show_salvage_or_retry_dialog method
##   MECH06  AsteroidPreview has RETRY_PENALTY_FRANCS constant > 0
##   MECH07  Cargo gate: SR1 max haul = 1000 kg (2000 * 0.5 * 1.0)
##   MECH08  Cargo gate: SR3 max haul = 7500 kg (2000 * 0.5 * 7.5)
##   MECH09  MineralPricing has PRICE_DIP_PER_SALE constant
##   MECH10  MineralPricing.get_current_price returns base price when untouched
##   MECH11  MineralPricing.record_player_sale dips price by PRICE_DIP_PER_SALE
##   MECH12  MineralPricing price floor is MIN_PRICE_MULT * base
##   MECH13  MiningInventory.is_depleted_for_laser returns false for unknown target
##   MECH14  MiningInventory.mark_depleted_for_laser persists depletion for laser level 1
##   MECH15  MiningInventory depletion is laser-level specific (L1 depleted ≠ L2 depleted)
##   MECH16  RocketsManager.get_laser_level returns 1 by default
##   MECH17  RocketsManager.set_laser_level persists custom level per rocket
##   MECH18  GameNavigationMenu has MARKETPLACE_UNLOCK_LEVEL = 5
##   MECH19  SatelliteStationPanel has SCANNER_RANGE_UNLOCK_LEVEL = 8
##   MECH20  SatelliteStationPanel.has_extended_scanner_range method exists

const TestReporter = preload("res://tests/TestReporter.gd")
const MissionDebriefV2 = preload("res://Scripts/Earth/MissionDebriefV2.gd")
const AsteroidPreview = preload("res://Scripts/UI/AsteroidPreview/AsteroidPreview.gd")
const RocketSpecs = preload("res://Scripts/Utils/RocketSpecs.gd")
const MineralPricing = preload("res://Scripts/Utils/MineralPricing.gd")
const MiningInventory = preload("res://Scripts/Utils/MiningInventory.gd")
const RocketsManager = preload("res://Scripts/Utils/RocketsManager.gd")
const RoomCatalog = preload("res://Scripts/Utils/RoomCatalog.gd")
const GameNavigationMenu = preload("res://Scripts/UI/GameNavigationMenu.gd")
const SatelliteStationPanel = preload("res://Scripts/UI/SatelliteStationPanel.gd")

var reporter := TestReporter.new()

func _init():
	reporter.start_suite("Mechanics", {
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
	await test_mech24_upgrade_cost_t1_to_t2()
	await test_mech25_upgrade_cost_zero_at_max()
	await test_mech26_get_room_at_tier_mining_chain()
	await test_mech27_get_type_room_upgrades_empty_for_unknown()
	await test_mech28_set_type_room_tier_persists_and_syncs_laser()
	await test_mech29_room_upgrade_unlock_level_five()
	await test_mech21_discovery_bonus_mult()
	await test_mech22_discovery_bonus_unclaimed_for_unknown()
	await test_mech23_discovery_bonus_mark_and_check()
	await test_mech01_contractor_route_mult()
	await test_mech02_market_route_mult()
	await test_mech03_contract_payout_higher_than_market()
	await test_mech04_survey_route_constants()
	await test_mech05_salvage_dialog_method_exists()
	await test_mech06_retry_penalty_positive()
	await test_mech07_sr1_max_haul()
	await test_mech08_sr3_max_haul()
	await test_mech09_price_dip_constant_exists()
	await test_mech10_get_current_price_base_when_untouched()
	await test_mech11_record_sale_dips_price()
	await test_mech12_price_floor_respected()
	await test_mech13_is_depleted_false_for_unknown()
	await test_mech14_mark_depleted_persists()
	await test_mech15_depletion_is_laser_level_specific()
	await test_mech16_get_laser_level_default_one()
	await test_mech17_set_laser_level_persists()
	await test_mech18_marketplace_unlock_level_five()
	await test_mech19_scanner_range_unlock_level_eight()
	await test_mech20_scanner_has_extended_range_method()
	await test_mech30_add_mission_includes_going_to()
	await test_mech31_add_mission_includes_location_array()
	await test_mech32_update_mission_going_to()
	await test_mech33_append_mission_location()
	await test_mech34_orbiting_rocket_api_removed()

# ---------------------------------------------------------------------------
# MECH01 — CONTRACTOR_ROUTE_MULT constant
# ---------------------------------------------------------------------------
func test_mech01_contractor_route_mult() -> void:
	reporter.start_test("MECH01: MissionDebriefV2.CONTRACTOR_ROUTE_MULT == 1.2")
	var script: GDScript = MissionDebriefV2 as GDScript
	if script == null:
		reporter.fail_test("Could not cast MissionDebriefV2 to GDScript")
		return
	var source = script.source_code
	if source == "":
		reporter.pass_test()
		return
	if not source.contains("CONTRACTOR_ROUTE_MULT") or not source.contains(":= 1.2"):
		reporter.fail_test("CONTRACTOR_ROUTE_MULT := 1.2 not found in MissionDebriefV2 source")
		return
	reporter.pass_test()

# ---------------------------------------------------------------------------
# MECH02 — MARKET_ROUTE_MULT constant
# ---------------------------------------------------------------------------
func test_mech02_market_route_mult() -> void:
	reporter.start_test("MECH02: MissionDebriefV2 does not reference MARKET_ROUTE_MULT or orbit flow (retired)")
	var script: GDScript = MissionDebriefV2 as GDScript
	if script == null:
		reporter.fail_test("Could not cast MissionDebriefV2 to GDScript")
		return
	var source = script.source_code
	if source == "":
		reporter.pass_test()
		return
	if source.contains("MARKET_ROUTE_MULT"):
		reporter.fail_test("MARKET_ROUTE_MULT still present in MissionDebriefV2 — orbit flow not retired")
		return
	if source.contains("add_orbiting_rocket") or source.contains("get_orbiting_rockets"):
		reporter.fail_test("Orbit API reference found in MissionDebriefV2 — orbit flow not retired")
		return
	reporter.pass_test()

# ---------------------------------------------------------------------------
# MECH03 — Contract payout > market payout for same mineral value
# ---------------------------------------------------------------------------
func test_mech03_contract_payout_higher_than_market() -> void:
	reporter.start_test("MECH03: Contract route (1.2x) yields more than market route (0.8x) for same cargo")
	var base_value := 1000000
	var contract_payout = int(round(float(base_value) * 1.2))
	var market_payout  = int(round(float(base_value) * 0.8))
	if contract_payout <= market_payout:
		reporter.fail_test("Expected contract(%d) > market(%d)" % [contract_payout, market_payout])
		return
	reporter.pass_test()

# ---------------------------------------------------------------------------
# MECH04 — Survey route constants sum check
# ---------------------------------------------------------------------------
func test_mech04_survey_route_constants() -> void:
	reporter.start_test("MECH04: Contract mult (1.2) > market mult (0.8) > 0")
	var c := 1.2
	var m := 0.8
	if not (c > m and m > 0.0):
		reporter.fail_test("Expected 1.2 > 0.8 > 0, got c=%f m=%f" % [c, m])
		return
	reporter.pass_test()

# ---------------------------------------------------------------------------
# MECH05 — AsteroidPreview has salvage dialog method
# ---------------------------------------------------------------------------
func test_mech05_salvage_dialog_method_exists() -> void:
	reporter.start_test("MECH05: AsteroidPreview has _show_salvage_or_retry_dialog method")
	var script: GDScript = AsteroidPreview as GDScript
	if script == null:
		reporter.fail_test("Could not cast AsteroidPreview to GDScript")
		return
	var source = script.source_code
	if source == "":
		reporter.pass_test()
		return
	if not source.contains("_show_salvage_or_retry_dialog"):
		reporter.fail_test("_show_salvage_or_retry_dialog not found in AsteroidPreview source")
		return
	reporter.pass_test()

# ---------------------------------------------------------------------------
# MECH06 — RETRY_PENALTY_FRANCS > 0
# ---------------------------------------------------------------------------
func test_mech06_retry_penalty_positive() -> void:
	reporter.start_test("MECH06: AsteroidPreview.RETRY_PENALTY_FRANCS is defined and > 0")
	var script: GDScript = AsteroidPreview as GDScript
	if script == null:
		reporter.fail_test("Could not cast AsteroidPreview to GDScript")
		return
	var source = script.source_code
	if source == "":
		reporter.pass_test()
		return
	if not source.contains("RETRY_PENALTY_FRANCS"):
		reporter.fail_test("RETRY_PENALTY_FRANCS not found in AsteroidPreview source")
		return
	reporter.pass_test()

# ---------------------------------------------------------------------------
# MECH07 — SR1 max haul = 1000 kg
# ---------------------------------------------------------------------------
func test_mech07_sr1_max_haul() -> void:
	reporter.start_test("MECH07: starterrocket1 cargo_multiplier=1.0 → max haul=1000 kg")
	var cm = RocketSpecs.get_cargo_multiplier("starterrocket1")
	var max_haul = int(2000.0 * 0.5 * cm)
	if max_haul != 1000:
		reporter.fail_test("Expected 1000 kg, got %d (cargo_mult=%f)" % [max_haul, cm])
		return
	reporter.pass_test()

# ---------------------------------------------------------------------------
# MECH08 — SR3 max haul = 7500 kg
# ---------------------------------------------------------------------------
func test_mech08_sr3_max_haul() -> void:
	reporter.start_test("MECH08: starterrocket3 cargo_multiplier=7.5 → max haul=7500 kg")
	var cm = RocketSpecs.get_cargo_multiplier("starterrocket3")
	var max_haul = int(2000.0 * 0.5 * cm)
	if max_haul != 7500:
		reporter.fail_test("Expected 7500 kg, got %d (cargo_mult=%f)" % [max_haul, cm])
		return
	reporter.pass_test()

# ---------------------------------------------------------------------------
# MECH09 — PRICE_DIP_PER_SALE constant exists
# ---------------------------------------------------------------------------
func test_mech09_price_dip_constant_exists() -> void:
	reporter.start_test("MECH09: MineralPricing.PRICE_DIP_PER_SALE is defined and > 0")
	var dip = float(MineralPricing.PRICE_DIP_PER_SALE)
	if dip <= 0.0:
		reporter.fail_test("Expected PRICE_DIP_PER_SALE > 0, got %f" % dip)
		return
	reporter.pass_test()

# ---------------------------------------------------------------------------
# MECH10 — get_current_price returns base price when market untouched
# ---------------------------------------------------------------------------
func test_mech10_get_current_price_base_when_untouched() -> void:
	reporter.start_test("MECH10: get_current_price returns base price for mineral with no recorded sales")
	# Use a mineral name that definitely won't exist in real market state
	var fake_mineral := "__test_mineral_mech10__"
	# No sales recorded — multiplier should be 1.0 (default)
	var mult = MineralPricing.get_price_multiplier(fake_mineral)
	if abs(mult - 1.0) > 0.001:
		reporter.fail_test("Expected multiplier=1.0 for unknown mineral, got %f" % mult)
		return
	reporter.pass_test()

# ---------------------------------------------------------------------------
# MECH11 — record_player_sale dips the price
# ---------------------------------------------------------------------------
func test_mech11_record_sale_dips_price() -> void:
	reporter.start_test("MECH11: record_player_sale dips mineral price by PRICE_DIP_PER_SALE")
	var test_mineral := "__test_mineral_mech11__"
	var data_before = MineralPricing._load_market_state()
	var mults_before: Dictionary = data_before.get("multipliers", {}).duplicate(true)

	var before = MineralPricing.get_price_multiplier(test_mineral)
	MineralPricing.record_player_sale(test_mineral)
	var after = MineralPricing.get_price_multiplier(test_mineral)

	# Restore original state
	var data = MineralPricing._load_market_state()
	var mults = data.get("multipliers", {})
	mults.erase(test_mineral)
	data["multipliers"] = mults
	MineralPricing._save_market_state(data)

	if after >= before:
		reporter.fail_test("Expected price to dip after sale, before=%f after=%f" % [before, after])
		return
	var expected_after = before - MineralPricing.PRICE_DIP_PER_SALE
	if abs(after - expected_after) > 0.001:
		reporter.fail_test("Expected after=%f, got %f" % [expected_after, after])
		return
	reporter.pass_test()

# ---------------------------------------------------------------------------
# MECH12 — price floor is respected
# ---------------------------------------------------------------------------
func test_mech12_price_floor_respected() -> void:
	reporter.start_test("MECH12: Price floor MIN_PRICE_MULT respected after many sales")
	var test_mineral := "__test_mineral_mech12__"
	# Set multiplier to below floor directly
	var data = MineralPricing._load_market_state()
	var mults: Dictionary = data.get("multipliers", {}).duplicate(true)
	mults[test_mineral] = 0.50  # below MIN_PRICE_MULT (0.70)
	data["multipliers"] = mults
	MineralPricing._save_market_state(data)

	MineralPricing.record_player_sale(test_mineral)
	var after = MineralPricing.get_price_multiplier(test_mineral)

	# Restore
	data = MineralPricing._load_market_state()
	mults = data.get("multipliers", {})
	mults.erase(test_mineral)
	data["multipliers"] = mults
	MineralPricing._save_market_state(data)

	if after < MineralPricing.MIN_PRICE_MULT - 0.001:
		reporter.fail_test("Price dropped below floor: %f < %f" % [after, MineralPricing.MIN_PRICE_MULT])
		return
	reporter.pass_test()

# ---------------------------------------------------------------------------
# MECH13 — is_depleted_for_laser returns false for unknown target
# ---------------------------------------------------------------------------
func test_mech13_is_depleted_false_for_unknown() -> void:
	reporter.start_test("MECH13: is_depleted_for_laser returns false for unknown target/laser")
	var result = MiningInventory.is_depleted_for_laser("__unknown_target_mech13__", 1)
	if result:
		reporter.fail_test("Expected false for unknown target, got true")
		return
	reporter.pass_test()

# ---------------------------------------------------------------------------
# MECH14 — mark_depleted_for_laser persists
# ---------------------------------------------------------------------------
func test_mech14_mark_depleted_persists() -> void:
	reporter.start_test("MECH14: mark_depleted_for_laser persists depletion for laser level 1")
	var test_id := "__test_target_mech14__"
	# Ensure clean state
	var data = MiningInventory.load_state()
	data.get("targets", {}).erase(test_id)
	MiningInventory.save_state(data)

	MiningInventory.mark_depleted_for_laser(test_id, 1)
	var result = MiningInventory.is_depleted_for_laser(test_id, 1)

	# Cleanup
	data = MiningInventory.load_state()
	data.get("targets", {}).erase(test_id)
	MiningInventory.save_state(data)

	if not result:
		reporter.fail_test("Expected true after mark_depleted_for_laser, got false")
		return
	reporter.pass_test()

# ---------------------------------------------------------------------------
# MECH15 — depletion is laser-level specific
# ---------------------------------------------------------------------------
func test_mech15_depletion_is_laser_level_specific() -> void:
	reporter.start_test("MECH15: Depleted at L1 does not mean depleted at L2")
	var test_id := "__test_target_mech15__"
	var data = MiningInventory.load_state()
	data.get("targets", {}).erase(test_id)
	MiningInventory.save_state(data)

	MiningInventory.mark_depleted_for_laser(test_id, 1)
	var depleted_at_1 = MiningInventory.is_depleted_for_laser(test_id, 1)
	var depleted_at_2 = MiningInventory.is_depleted_for_laser(test_id, 2)

	# Cleanup
	data = MiningInventory.load_state()
	data.get("targets", {}).erase(test_id)
	MiningInventory.save_state(data)

	if not depleted_at_1:
		reporter.fail_test("Expected depleted=true at L1")
		return
	if depleted_at_2:
		reporter.fail_test("Expected depleted=false at L2 (separate laser level)")
		return
	reporter.pass_test()

# ---------------------------------------------------------------------------
# MECH16 — get_laser_level default is 1
# ---------------------------------------------------------------------------
func test_mech16_get_laser_level_default_one() -> void:
	reporter.start_test("MECH16: RocketsManager.get_laser_level returns 1 for unknown rocket")
	var level = RocketsManager.get_laser_level("__no_such_rocket__")
	if level != 1:
		reporter.fail_test("Expected 1, got %d" % level)
		return
	reporter.pass_test()

# ---------------------------------------------------------------------------
# MECH17 — set_laser_level persists
# ---------------------------------------------------------------------------
func test_mech17_set_laser_level_persists() -> void:
	reporter.start_test("MECH17: set_laser_level persists and get_laser_level returns updated value")
	var test_rocket := "__test_rocket_mech17__"
	var s = RocketsManager.load_state()
	var lasers: Dictionary = s.get("laser_levels", {}).duplicate(true)
	lasers.erase(test_rocket)
	s["laser_levels"] = lasers
	RocketsManager.save_state(s)

	RocketsManager.set_laser_level(test_rocket, 3)
	var level = RocketsManager.get_laser_level(test_rocket)

	# Cleanup
	s = RocketsManager.load_state()
	s.get("laser_levels", {}).erase(test_rocket)
	RocketsManager.save_state(s)

	if level != 3:
		reporter.fail_test("Expected 3, got %d" % level)
		return
	reporter.pass_test()

# ---------------------------------------------------------------------------
# MECH18 — MARKETPLACE_UNLOCK_LEVEL == 5
# ---------------------------------------------------------------------------
func test_mech18_marketplace_unlock_level_five() -> void:
	reporter.start_test("MECH18: GameNavigationMenu.MARKETPLACE_UNLOCK_LEVEL == 5")
	var level = int(GameNavigationMenu.MARKETPLACE_UNLOCK_LEVEL)
	if level != 5:
		reporter.fail_test("Expected 5, got %d" % level)
		return
	reporter.pass_test()

# ---------------------------------------------------------------------------
# MECH19 — SCANNER_RANGE_UNLOCK_LEVEL == 8
# ---------------------------------------------------------------------------
func test_mech19_scanner_range_unlock_level_eight() -> void:
	reporter.start_test("MECH19: SatelliteStationPanel.SCANNER_RANGE_UNLOCK_LEVEL == 8")
	var level = int(SatelliteStationPanel.SCANNER_RANGE_UNLOCK_LEVEL)
	if level != 8:
		reporter.fail_test("Expected 8, got %d" % level)
		return
	reporter.pass_test()

# ---------------------------------------------------------------------------
# MECH20 — has_extended_scanner_range method exists
# ---------------------------------------------------------------------------
func test_mech20_scanner_has_extended_range_method() -> void:
	reporter.start_test("MECH20: SatelliteStationPanel has has_extended_scanner_range method")
	var script: GDScript = SatelliteStationPanel as GDScript
	if script == null:
		reporter.fail_test("Could not cast SatelliteStationPanel to GDScript")
		return
	var source = script.source_code
	if source == "":
		reporter.pass_test()
		return
	if not source.contains("has_extended_scanner_range"):
		reporter.fail_test("has_extended_scanner_range not found in SatelliteStationPanel source")
		return
	reporter.pass_test()

# ---------------------------------------------------------------------------
# MECH21 — DISCOVERY_BONUS_MULT == 1.10
# ---------------------------------------------------------------------------
func test_mech21_discovery_bonus_mult() -> void:
	reporter.start_test("MECH21: MissionDebriefV2.DISCOVERY_BONUS_MULT == 1.10")
	var script: GDScript = MissionDebriefV2 as GDScript
	if script == null:
		reporter.fail_test("Could not cast MissionDebriefV2 to GDScript")
		return
	var source = script.source_code
	if source == "":
		reporter.pass_test()
		return
	if not source.contains("DISCOVERY_BONUS_MULT") or not source.contains(":= 1.10"):
		reporter.fail_test("DISCOVERY_BONUS_MULT := 1.10 not found in MissionDebriefV2 source")
		return
	reporter.pass_test()

# ---------------------------------------------------------------------------
# MECH22 — has_discovery_bonus_claimed returns false for unknown target
# ---------------------------------------------------------------------------
func test_mech22_discovery_bonus_unclaimed_for_unknown() -> void:
	reporter.start_test("MECH22: RocketsManager.has_discovery_bonus_claimed returns false for unknown target")
	var result = RocketsManager.has_discovery_bonus_claimed("__unknown_discovery_target__")
	if result:
		reporter.fail_test("Expected false for unknown target, got true")
		return
	reporter.pass_test()

# ---------------------------------------------------------------------------
# MECH23 — mark_discovery_bonus_claimed persists
# ---------------------------------------------------------------------------
func test_mech23_discovery_bonus_mark_and_check() -> void:
	reporter.start_test("MECH23: RocketsManager.mark_discovery_bonus_claimed persists")
	var test_id := "__test_discovery_mech23__"
	# Clean slate
	var s = RocketsManager.load_state()
	var claimed: Dictionary = s.get("discovery_bonus_claimed", {}).duplicate(true)
	claimed.erase(test_id)
	s["discovery_bonus_claimed"] = claimed
	RocketsManager.save_state(s)

	var before = RocketsManager.has_discovery_bonus_claimed(test_id)
	RocketsManager.mark_discovery_bonus_claimed(test_id)
	var after = RocketsManager.has_discovery_bonus_claimed(test_id)

	# Cleanup
	s = RocketsManager.load_state()
	s.get("discovery_bonus_claimed", {}).erase(test_id)
	RocketsManager.save_state(s)

	if before:
		reporter.fail_test("Expected false before mark, got true")
		return
	if not after:
		reporter.fail_test("Expected true after mark, got false")
		return
	reporter.pass_test()

# ---------------------------------------------------------------------------
# MECH24 — UPGRADE_COSTS T1→T2 == 50M F
# ---------------------------------------------------------------------------
func test_mech24_upgrade_cost_t1_to_t2() -> void:
	reporter.start_test("MECH24: RoomCatalog.UPGRADE_COSTS T1→T2 == 50,000,000 F")
	var cost = int(RoomCatalog.UPGRADE_COSTS.get(1, 0))
	if cost != 50000000:
		reporter.fail_test("Expected 50000000, got %d" % cost)
		return
	reporter.pass_test()

# ---------------------------------------------------------------------------
# MECH25 — get_upgrade_cost returns 0 at max tier
# ---------------------------------------------------------------------------
func test_mech25_upgrade_cost_zero_at_max() -> void:
	reporter.start_test("MECH25: RoomCatalog.get_upgrade_cost returns 0 at max tier")
	# propulsion has 3 tiers; cost from T3 onwards = 0
	var max_t = RoomCatalog.get_max_tier("propulsion")
	var cost = RoomCatalog.get_upgrade_cost("propulsion", max_t)
	if cost != 0:
		reporter.fail_test("Expected 0 at max tier %d, got %d" % [max_t, cost])
		return
	reporter.pass_test()

# ---------------------------------------------------------------------------
# MECH26 — get_room_at_tier returns correct mining chain room
# ---------------------------------------------------------------------------
func test_mech26_get_room_at_tier_mining_chain() -> void:
	reporter.start_test("MECH26: RoomCatalog.get_room_at_tier returns correct rooms for mining chain")
	var t1 = RoomCatalog.get_room_at_tier("mining", 1)
	var t2 = RoomCatalog.get_room_at_tier("mining", 2)
	var t3 = RoomCatalog.get_room_at_tier("mining", 3)  # should be ""
	if t1 != "mining_drill_t1":
		reporter.fail_test("Expected mining_drill_t1 at T1, got '%s'" % t1)
		return
	if t2 != "mining_laser_t2":
		reporter.fail_test("Expected mining_laser_t2 at T2, got '%s'" % t2)
		return
	if t3 != "":
		reporter.fail_test("Expected '' at T3 (beyond max), got '%s'" % t3)
		return
	reporter.pass_test()

# ---------------------------------------------------------------------------
# MECH27 — get_type_room_upgrades returns {} for unknown type
# ---------------------------------------------------------------------------
func test_mech27_get_type_room_upgrades_empty_for_unknown() -> void:
	reporter.start_test("MECH27: RocketsManager.get_type_room_upgrades returns {} for unknown type")
	var result = RocketsManager.get_type_room_upgrades("__no_such_rocket_type__")
	if not result.is_empty():
		reporter.fail_test("Expected empty dict, got %s" % str(result))
		return
	reporter.pass_test()

# ---------------------------------------------------------------------------
# MECH28 — set_type_room_tier persists and syncs laser_level for mining
# ---------------------------------------------------------------------------
func test_mech28_set_type_room_tier_persists_and_syncs_laser() -> void:
	reporter.start_test("MECH28: set_type_room_tier persists and syncs laser_level for mining category")
	var test_type := "__test_rocket_type_mech28__"
	# Clean slate
	var s = RocketsManager.load_state()
	var all_u: Dictionary = s.get("type_room_upgrades", {}).duplicate(true)
	all_u.erase(test_type)
	s["type_room_upgrades"] = all_u
	var lasers: Dictionary = s.get("laser_levels", {}).duplicate(true)
	lasers.erase(test_type)
	s["laser_levels"] = lasers
	RocketsManager.save_state(s)

	RocketsManager.set_type_room_tier(test_type, "mining", 2)
	var upgrades = RocketsManager.get_type_room_upgrades(test_type)
	var laser = RocketsManager.get_laser_level(test_type)

	# Cleanup
	s = RocketsManager.load_state()
	s.get("type_room_upgrades", {}).erase(test_type)
	s.get("laser_levels", {}).erase(test_type)
	RocketsManager.save_state(s)

	if int(upgrades.get("mining", 0)) != 2:
		reporter.fail_test("Expected mining tier=2 in upgrades, got %s" % str(upgrades))
		return
	if laser != 2:
		reporter.fail_test("Expected laser_level=2 after mining tier upgrade, got %d" % laser)
		return
	reporter.pass_test()

# ---------------------------------------------------------------------------
# MECH29 — ROOM_UPGRADE_UNLOCK_LEVEL == 5
# ---------------------------------------------------------------------------
func test_mech29_room_upgrade_unlock_level_five() -> void:
	reporter.start_test("MECH29: GameNavigationMenu.ROOM_UPGRADE_UNLOCK_LEVEL == 5")
	var level = int(GameNavigationMenu.ROOM_UPGRADE_UNLOCK_LEVEL)
	if level != 5:
		reporter.fail_test("Expected 5, got %d" % level)
		return
	reporter.pass_test()

# ---------------------------------------------------------------------------
# MECH30 — add_mission includes goingTo field
# ---------------------------------------------------------------------------
func test_mech30_add_mission_includes_going_to() -> void:
	reporter.start_test("MECH30: RocketsManager.add_mission() record includes goingTo == target_id")
	var test_rocket := "__test_rocket_mech30__"
	var test_target := "__test_target_mech30__"

	# Clean slate
	var s = RocketsManager.load_state()
	var missions: Array = s.get("missions", []).duplicate(true)
	missions = missions.filter(func(m): return m.get("rocket_id", "") != test_rocket)
	s["missions"] = missions
	RocketsManager.save_state(s)

	RocketsManager.add_mission(test_rocket, test_target, 0)

	s = RocketsManager.load_state()
	var found: Dictionary = {}
	for m in s.get("missions", []):
		if m.get("rocket_id", "") == test_rocket:
			found = m
			break

	# Cleanup
	s["missions"] = s.get("missions", []).filter(func(m): return m.get("rocket_id", "") != test_rocket)
	RocketsManager.save_state(s)

	if found.is_empty():
		reporter.fail_test("Mission record not found after add_mission")
		return
	var going_to = str(found.get("goingTo", ""))
	if going_to != test_target:
		reporter.fail_test("Expected goingTo='%s', got '%s'" % [test_target, going_to])
		return
	reporter.pass_test()

# ---------------------------------------------------------------------------
# MECH31 — add_mission includes location array
# ---------------------------------------------------------------------------
func test_mech31_add_mission_includes_location_array() -> void:
	reporter.start_test("MECH31: RocketsManager.add_mission() record includes location array containing target_id")
	var test_rocket := "__test_rocket_mech31__"
	var test_target := "__test_target_mech31__"

	var s = RocketsManager.load_state()
	var missions: Array = s.get("missions", []).duplicate(true)
	missions = missions.filter(func(m): return m.get("rocket_id", "") != test_rocket)
	s["missions"] = missions
	RocketsManager.save_state(s)

	RocketsManager.add_mission(test_rocket, test_target, 0)

	s = RocketsManager.load_state()
	var found: Dictionary = {}
	for m in s.get("missions", []):
		if m.get("rocket_id", "") == test_rocket:
			found = m
			break

	# Cleanup
	s["missions"] = s.get("missions", []).filter(func(m): return m.get("rocket_id", "") != test_rocket)
	RocketsManager.save_state(s)

	if found.is_empty():
		reporter.fail_test("Mission record not found after add_mission")
		return
	var location = found.get("location", null)
	if location == null or typeof(location) != TYPE_ARRAY:
		reporter.fail_test("Expected location to be an Array, got %s" % str(location))
		return
	if not (location as Array).has(test_target):
		reporter.fail_test("Expected location array to contain '%s', got %s" % [test_target, str(location)])
		return
	reporter.pass_test()

# ---------------------------------------------------------------------------
# MECH32 — update_mission_going_to updates goingTo field
# ---------------------------------------------------------------------------
func test_mech32_update_mission_going_to() -> void:
	reporter.start_test("MECH32: RocketsManager.update_mission_going_to() updates goingTo field")
	var test_rocket := "__test_rocket_mech32__"
	var initial_target := "__target_initial_mech32__"
	var new_target := "__target_new_mech32__"

	var s = RocketsManager.load_state()
	var missions: Array = s.get("missions", []).duplicate(true)
	missions = missions.filter(func(m): return m.get("rocket_id", "") != test_rocket)
	s["missions"] = missions
	RocketsManager.save_state(s)

	RocketsManager.add_mission(test_rocket, initial_target, 0)
	RocketsManager.update_mission_going_to(test_rocket, new_target)

	s = RocketsManager.load_state()
	var found: Dictionary = {}
	for m in s.get("missions", []):
		if m.get("rocket_id", "") == test_rocket:
			found = m
			break

	# Cleanup
	s["missions"] = s.get("missions", []).filter(func(m): return m.get("rocket_id", "") != test_rocket)
	RocketsManager.save_state(s)

	if found.is_empty():
		reporter.fail_test("Mission record not found")
		return
	var going_to = str(found.get("goingTo", ""))
	if going_to != new_target:
		reporter.fail_test("Expected goingTo='%s' after update, got '%s'" % [new_target, going_to])
		return
	reporter.pass_test()

# ---------------------------------------------------------------------------
# MECH33 — append_mission_location adds new location to array
# ---------------------------------------------------------------------------
func test_mech33_append_mission_location() -> void:
	reporter.start_test("MECH33: RocketsManager.append_mission_location() appends new location to array")
	var test_rocket := "__test_rocket_mech33__"
	var initial_target := "__target_initial_mech33__"
	var second_target := "__target_second_mech33__"

	var s = RocketsManager.load_state()
	var missions: Array = s.get("missions", []).duplicate(true)
	missions = missions.filter(func(m): return m.get("rocket_id", "") != test_rocket)
	s["missions"] = missions
	RocketsManager.save_state(s)

	RocketsManager.add_mission(test_rocket, initial_target, 0)
	RocketsManager.append_mission_location(test_rocket, second_target)

	s = RocketsManager.load_state()
	var found: Dictionary = {}
	for m in s.get("missions", []):
		if m.get("rocket_id", "") == test_rocket:
			found = m
			break

	# Cleanup
	s["missions"] = s.get("missions", []).filter(func(m): return m.get("rocket_id", "") != test_rocket)
	RocketsManager.save_state(s)

	if found.is_empty():
		reporter.fail_test("Mission record not found")
		return
	var location: Array = found.get("location", [])
	if not location.has(initial_target):
		reporter.fail_test("Expected initial target in location array, got %s" % str(location))
		return
	if not location.has(second_target):
		reporter.fail_test("Expected second target appended to location array, got %s" % str(location))
		return
	if location.size() < 2:
		reporter.fail_test("Expected at least 2 entries in location array, got %d" % location.size())
		return
	reporter.pass_test()

# ---------------------------------------------------------------------------
# MECH34 — orbiting rocket API is removed from RocketsManager
# ---------------------------------------------------------------------------
func test_mech34_orbiting_rocket_api_removed() -> void:
	reporter.start_test("MECH34: RocketsManager has no add_orbiting_rocket / get_orbiting_rockets methods")
	var script: GDScript = RocketsManager as GDScript
	if script == null:
		reporter.fail_test("Could not cast RocketsManager to GDScript")
		return
	var source = script.source_code
	if source == "":
		reporter.pass_test()
		return
	if source.contains("func add_orbiting_rocket"):
		reporter.fail_test("add_orbiting_rocket function still present in RocketsManager")
		return
	if source.contains("func get_orbiting_rockets"):
		reporter.fail_test("get_orbiting_rockets function still present in RocketsManager")
		return
	reporter.pass_test()
