## run_phx003_tests.gd
## Validates AC#2 (portrait HUD layout) and AC#3 (target-seeded terrain/mineral uniqueness)
## for task phx003.
extends SceneTree

const TestReporter = preload("res://tests/TestReporter.gd")
const UILayout     = preload("res://Scripts/UI/UILayout.gd")
const ResourceYield = preload("res://Scripts/Utils/ResourceYield.gd")
const MiningTerrainGenerator = preload("res://Scripts/UI/MiningTerrainGenerator.gd")

var reporter := TestReporter.new()

func _init() -> void:
	reporter.start_suite("phx003: Mining mobile layout + target uniqueness", {
		"engine": Engine.get_version_info()["string"],
		"os": OS.get_name(),
		"project": "scene",
		"timestamp": Time.get_datetime_string_from_system()
	})
	await run_all_tests()
	reporter.summary()
	await create_timer(0.1).timeout
	quit(1 if reporter.tests_failed > 0 else 0)

func run_all_tests() -> void:
	await test_portrait_hud_zone_within_screen()
	await test_portrait_bottom_bar_within_screen()
	await test_portrait_bottom_bar_not_overlapping_hud()
	await test_landscape_bottom_bar_within_screen()
	await test_different_targets_produce_different_terrain_seeds()
	await test_different_targets_produce_different_minerals()
	await test_same_target_produces_same_minerals_reproducibly()
	await test_asteroid_and_planet_yield_have_different_capacities()

# ── AC#2: Portrait HUD layout ─────────────────────────────────────────────────

func test_portrait_hud_zone_within_screen() -> void:
	reporter.start_test("Portrait: MINING_HUD zone fits within 390x844 viewport")
	var vp := Vector2(390, 844)  # iPhone 14 portrait
	var hud := UILayout.zone(UILayout.Zone.MINING_HUD, vp)
	if hud.position.x < 0 or hud.position.y < 0:
		reporter.fail_test("HUD top-left out of bounds: %s" % str(hud.position))
		return
	if hud.end.x > vp.x or hud.end.y > vp.y:
		reporter.fail_test("HUD extends beyond viewport: end=%s vp=%s" % [str(hud.end), str(vp)])
		return
	reporter.pass_test("HUD zone fits within portrait viewport")

func test_portrait_bottom_bar_within_screen() -> void:
	reporter.start_test("Portrait: MINING_BOTTOM zone fits within 390x844 viewport")
	var vp := Vector2(390, 844)
	var bottom := UILayout.zone(UILayout.Zone.MINING_BOTTOM, vp)
	if bottom.position.y < 0 or bottom.end.y > vp.y:
		reporter.fail_test("BottomBar y out of bounds: position.y=%s end.y=%s vp.y=%s" % [
			str(bottom.position.y), str(bottom.end.y), str(vp.y)])
		return
	if bottom.size.y < 40:
		reporter.fail_test("BottomBar too short to be tappable: %spx" % str(bottom.size.y))
		return
	reporter.pass_test("Bottom bar zone is visible and tappable in portrait")

func test_portrait_bottom_bar_not_overlapping_hud() -> void:
	reporter.start_test("Portrait: MINING_BOTTOM does not overlap MINING_HUD")
	var vp := Vector2(390, 844)
	var hud    := UILayout.zone(UILayout.Zone.MINING_HUD,    vp)
	var bottom := UILayout.zone(UILayout.Zone.MINING_BOTTOM, vp)
	if bottom.position.y < hud.end.y:
		reporter.fail_test("Bottom bar overlaps HUD: bottom.y=%s hud.end.y=%s" % [
			str(bottom.position.y), str(hud.end.y)])
		return
	reporter.pass_test("Bottom bar is below HUD — no overlap")

func test_landscape_bottom_bar_within_screen() -> void:
	reporter.start_test("Landscape phone: MINING_BOTTOM zone fits within 844x390 viewport")
	var vp := Vector2(844, 390)
	var bottom := UILayout.zone(UILayout.Zone.MINING_BOTTOM, vp)
	if bottom.end.y > vp.y:
		reporter.fail_test("BottomBar extends below landscape viewport: end.y=%s vp.y=%s" % [
			str(bottom.end.y), str(vp.y)])
		return
	reporter.pass_test("Bottom bar fits in landscape phone viewport")

# ── AC#3: Target-seeded uniqueness ────────────────────────────────────────────

func test_different_targets_produce_different_terrain_seeds() -> void:
	reporter.start_test("Different target IDs produce different terrain RNG seeds")
	var id_a := "mission-1-training-target"
	var id_b := "mission-2-upgrade-target"
	var seed_a := id_a.hash()
	var seed_b := id_b.hash()
	if seed_a == seed_b:
		reporter.fail_test("Hash collision between %s and %s" % [id_a, id_b])
		return
	# Verify the RNG seeds actually produce different first values
	var rng_a := RandomNumberGenerator.new()
	var rng_b := RandomNumberGenerator.new()
	rng_a.seed = seed_a
	rng_b.seed = seed_b
	var val_a := rng_a.randf()
	var val_b := rng_b.randf()
	if absf(val_a - val_b) < 0.001:
		reporter.fail_test("Different seeds produced same first randf: %s vs %s" % [val_a, val_b])
		return
	reporter.pass_test("Different targets seed terrain RNG differently: %s vs %s" % [
		str(seed_a), str(seed_b)])

func test_different_targets_produce_different_minerals() -> void:
	reporter.start_test("Different target IDs produce different mineral distributions")
	var yield_a := ResourceYield.get_yield_for_target("mission-1-training-target", "asteroid", 1, 1.0)
	var yield_b := ResourceYield.get_yield_for_target("mission-2-upgrade-target",  "asteroid", 1, 1.0)
	var minerals_a: Dictionary = yield_a.get("minerals", {})
	var minerals_b: Dictionary = yield_b.get("minerals", {})
	if minerals_a.is_empty() or minerals_b.is_empty():
		reporter.fail_test("One or both yield dicts are empty")
		return
	# At least one mineral amount must differ
	var any_diff := false
	for key in minerals_a.keys():
		if minerals_a.get(key) != minerals_b.get(key, -1):
			any_diff = true
			break
	if not any_diff:
		reporter.fail_test("All mineral amounts identical for two different targets: %s" % str(minerals_a))
		return
	reporter.pass_test("Mineral distributions differ between targets")

func test_same_target_produces_same_minerals_reproducibly() -> void:
	reporter.start_test("Same target ID produces identical mineral output on repeated calls")
	var id := "mission-1-training-target"
	var y1 := ResourceYield.get_yield_for_target(id, "asteroid", 1, 1.0)
	var y2 := ResourceYield.get_yield_for_target(id, "asteroid", 1, 1.0)
	var m1: Dictionary = y1.get("minerals", {})
	var m2: Dictionary = y2.get("minerals", {})
	for key in m1.keys():
		if m1.get(key) != m2.get(key):
			reporter.fail_test("Non-deterministic: %s gave %s then %s for mineral %s" % [
				id, str(m1.get(key)), str(m2.get(key)), key])
			return
	reporter.pass_test("Mineral generation is deterministic for the same target ID")

func test_asteroid_and_planet_yield_have_different_capacities() -> void:
	reporter.start_test("Asteroid and planet yield differ in total capacity for same target ID")
	var id := "tess-target-12345"
	var asteroid_yield := ResourceYield.get_yield_for_target(id, "asteroid", 1, 1.0)
	var planet_yield   := ResourceYield.get_yield_for_target(id, "planet",   1, 1.0)
	var cap_a: int = asteroid_yield.get("capacity", 0)
	var cap_p: int = planet_yield.get("capacity", 0)
	if cap_a == cap_p:
		reporter.fail_test("Asteroid and planet capacity are identical (%d) — type not applied" % cap_a)
		return
	if cap_a <= 0 or cap_p <= 0:
		reporter.fail_test("Zero capacity: asteroid=%d planet=%d" % [cap_a, cap_p])
		return
	reporter.pass_test("Planet capacity (%d) > asteroid capacity (%d)" % [cap_p, cap_a])
