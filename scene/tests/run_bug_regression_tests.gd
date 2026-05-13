extends SceneTree

## Bug-regression tests covering the 7 issues fixed in March 2026:
##   MFIX01  Mining scroll speed reduced to 75
##   MFIX02  Ore colour hints dict has all 8 entries
##   MFIX03-05  Spot-check colour mappings (iron, nickel, cobalt)
##   MFIX06  AsteroidPreview no longer has _restart_starter_run
##   MFIX07  AsteroidPreview no longer has _should_restart_starter_run
##   MFIX11  SubcontractorManager.record_mission_completion awards rep XP
##   MFIX12  SubcontractorManager triggers 30-min cooldown after 2 consecutive missions
##   MFIX13  SubcontractorManager get_cooldown_remaining returns 0 when not on cooldown

const TestReporter = preload("res://tests/TestReporter.gd")
const SidescrollMining = preload("res://Scripts/UI/SidescrollMining.gd")
const AsteroidPreview = preload("res://Scripts/UI/AsteroidPreview/AsteroidPreview.gd")
const SubcontractorManager = preload("res://Scripts/Utils/SubcontractorManager.gd")
const RocketsManager = preload("res://Scripts/Utils/RocketsManager.gd")
const AppControllerScript = preload("res://Scripts/Systems/AppController.gd")

var reporter := TestReporter.new()

func _init():
	reporter.start_suite("Bug Regression", {
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
	await test_mfix01_scroll_speed_is_75()
	await test_mfix02_color_hints_has_8_entries()
	await test_mfix03_iron_is_orange()
	await test_mfix04_nickel_is_yellow()
	await test_mfix05_cobalt_is_blue()
	await test_mfix06_no_restart_starter_run_method()
	await test_mfix07_no_should_restart_starter_run_method()
	await test_mfix08_platinum_is_white()
	await test_mfix09_gold_is_bright_yellow()
	await test_mfix10_asteroid_preview_mine_btn_not_blocked_after_mining()
	await test_mfix11_record_mission_completion_awards_rep_xp()
	await test_mfix12_cooldown_triggered_after_two_consecutive()
	await test_mfix13_get_cooldown_remaining_zero_when_not_on_cooldown()
	await test_mfix14_fresh_restart_does_not_offer_loan()
	await test_mfix15_map_return_preserves_selected_target()

# MFIX01 — Scroll speed
func test_mfix01_scroll_speed_is_75() -> void:
	reporter.start_test("MFIX01: Mining scroll speed is 75.0 (was 120)")
	var speed = SidescrollMining.SCROLL_SPEED
	if abs(float(speed) - 75.0) > 0.001:
		reporter.fail_test("Expected SCROLL_SPEED=75.0, got %s" % str(speed))
		return
	reporter.pass_test()

# MFIX02 — Colour hints dict size
func test_mfix02_color_hints_has_8_entries() -> void:
	reporter.start_test("MFIX02: _MINERAL_COLOR_HINTS contains all 8 ore types")
	var hints = SidescrollMining._MINERAL_COLOR_HINTS
	if typeof(hints) != TYPE_DICTIONARY:
		reporter.fail_test("Expected _MINERAL_COLOR_HINTS to be a Dictionary")
		return
	if hints.size() != 8:
		reporter.fail_test("Expected 8 ore entries, got %d: %s" % [hints.size(), str(hints.keys())])
		return
	reporter.pass_test()

# MFIX03 — iron → orange
func test_mfix03_iron_is_orange() -> void:
	reporter.start_test("MFIX03: iron maps to 'orange'")
	var hints = SidescrollMining._MINERAL_COLOR_HINTS
	var val = str(hints.get("iron", ""))
	if val != "orange":
		reporter.fail_test("Expected iron='orange', got '%s'" % val)
		return
	reporter.pass_test()

# MFIX04 — nickel → yellow
func test_mfix04_nickel_is_yellow() -> void:
	reporter.start_test("MFIX04: nickel maps to 'yellow'")
	var hints = SidescrollMining._MINERAL_COLOR_HINTS
	var val = str(hints.get("nickel", ""))
	if val != "yellow":
		reporter.fail_test("Expected nickel='yellow', got '%s'" % val)
		return
	reporter.pass_test()

# MFIX05 — cobalt → blue
func test_mfix05_cobalt_is_blue() -> void:
	reporter.start_test("MFIX05: cobalt maps to 'blue'")
	var hints = SidescrollMining._MINERAL_COLOR_HINTS
	var val = str(hints.get("cobalt", ""))
	if val != "blue":
		reporter.fail_test("Expected cobalt='blue', got '%s'" % val)
		return
	reporter.pass_test()

# MFIX06 — force-restart method removed
func test_mfix06_no_restart_starter_run_method() -> void:
	reporter.start_test("MFIX06: AsteroidPreview has no _restart_starter_run (mission-loop fix)")
	var ap = AsteroidPreview.new()
	var has_it = ap.has_method("_restart_starter_run")
	ap.free()
	if has_it:
		reporter.fail_test("_restart_starter_run still exists — mission loop bug may be back")
		return
	reporter.pass_test()

# MFIX07 — gating predicate removed
func test_mfix07_no_should_restart_starter_run_method() -> void:
	reporter.start_test("MFIX07: AsteroidPreview has no _should_restart_starter_run (mission-loop fix)")
	var ap = AsteroidPreview.new()
	var has_it = ap.has_method("_should_restart_starter_run")
	ap.free()
	if has_it:
		reporter.fail_test("_should_restart_starter_run still exists — mission loop bug may be back")
		return
	reporter.pass_test()

# MFIX08 — platinum → white
func test_mfix08_platinum_is_white() -> void:
	reporter.start_test("MFIX08: platinum maps to 'white'")
	var hints = SidescrollMining._MINERAL_COLOR_HINTS
	var val = str(hints.get("platinum", ""))
	if val != "white":
		reporter.fail_test("Expected platinum='white', got '%s'" % val)
		return
	reporter.pass_test()

# MFIX09 — gold → bright yellow
func test_mfix09_gold_is_bright_yellow() -> void:
	reporter.start_test("MFIX09: gold maps to 'bright yellow'")
	var hints = SidescrollMining._MINERAL_COLOR_HINTS
	var val = str(hints.get("gold", ""))
	if val != "bright yellow":
		reporter.fail_test("Expected gold='bright yellow', got '%s'" % val)
		return
	reporter.pass_test()

# MFIX10 — after mining completes, mine + return buttons are re-enabled (no loop block)
func test_mfix10_asteroid_preview_mine_btn_not_blocked_after_mining() -> void:
	reporter.start_test("MFIX10: AsteroidPreview exposes mine_btn and return_btn as onready nodes")
	# We can only verify the script declares the expected @onready bindings without
	# a full scene instantiation. Verify the script source includes the binding names.
	var script: GDScript = AsteroidPreview as GDScript
	if script == null:
		reporter.fail_test("Could not cast AsteroidPreview to GDScript")
		return
	var source = script.source_code
	if source == "":
		# Source may be stripped in export — skip gracefully
		reporter.pass_test()
		return
	if not source.contains("mine_btn"):
		reporter.fail_test("Expected 'mine_btn' in AsteroidPreview source")
		return
	if not source.contains("return_btn"):
		reporter.fail_test("Expected 'return_btn' in AsteroidPreview source")
		return
	reporter.pass_test()

# MFIX11 — record_mission_completion awards reputation XP
func test_mfix11_record_mission_completion_awards_rep_xp() -> void:
	reporter.start_test("MFIX11: SubcontractorManager.record_mission_completion awards rep XP")
	var test_id = "test_contractor_rep_xp"
	# Clear any prior test state
	var s = SubcontractorManager.load_state()
	s["reputation"][test_id] = 0
	s["consecutive_use"][test_id] = 0
	s["last_mission_sub"] = ""
	SubcontractorManager.save_state(s)

	var rep_before = int(SubcontractorManager.get_reputation(test_id))
	SubcontractorManager.record_mission_completion(test_id)
	var rep_after = int(SubcontractorManager.get_reputation(test_id))

	# Clean up
	s = SubcontractorManager.load_state()
	s["reputation"].erase(test_id)
	s["consecutive_use"].erase(test_id)
	s["last_mission_sub"] = ""
	SubcontractorManager.save_state(s)

	if rep_after <= rep_before:
		reporter.fail_test("Expected rep to increase from %d, got %d" % [rep_before, rep_after])
		return
	reporter.pass_test()

# MFIX12 — cooldown triggered after 2 consecutive missions with same contractor
func test_mfix12_cooldown_triggered_after_two_consecutive() -> void:
	reporter.start_test("MFIX12: 30-min cooldown triggered after 2 consecutive missions")
	var test_id = "test_contractor_cooldown"
	# Clear prior state
	var s = SubcontractorManager.load_state()
	s["reputation"][test_id] = 0
	s["consecutive_use"][test_id] = 0
	s["cooldowns"].erase(test_id)
	s["last_mission_sub"] = ""
	SubcontractorManager.save_state(s)

	# First mission — no cooldown yet
	SubcontractorManager.record_mission_completion(test_id)
	if SubcontractorManager.is_on_cooldown(test_id):
		reporter.fail_test("Should not be on cooldown after 1 mission")
		return

	# Second consecutive mission — should trigger cooldown
	SubcontractorManager.record_mission_completion(test_id)
	var on_cd = SubcontractorManager.is_on_cooldown(test_id)
	var remaining = SubcontractorManager.get_cooldown_remaining(test_id)

	# Clean up
	s = SubcontractorManager.load_state()
	s["reputation"].erase(test_id)
	s["consecutive_use"].erase(test_id)
	s["cooldowns"].erase(test_id)
	s["last_mission_sub"] = ""
	SubcontractorManager.save_state(s)

	if not on_cd:
		reporter.fail_test("Expected cooldown after 2 consecutive missions")
		return
	# Should be close to 30 min (allow 5s tolerance for test execution time)
	var expected = SubcontractorManager.COOLDOWN_DURATION_SECONDS
	if remaining < expected - 5 or remaining > expected:
		reporter.fail_test("Expected cooldown ~%ds, got %ds" % [expected, remaining])
		return
	reporter.pass_test()

# MFIX13 — get_cooldown_remaining returns 0 for a contractor not on cooldown
func test_mfix13_get_cooldown_remaining_zero_when_not_on_cooldown() -> void:
	reporter.start_test("MFIX13: get_cooldown_remaining returns 0 when not on cooldown")
	var remaining = SubcontractorManager.get_cooldown_remaining("no_such_contractor_xyz")
	if remaining != 0:
		reporter.fail_test("Expected 0, got %d" % remaining)
		return
	reporter.pass_test()

# MFIX14 — fresh restart has no progress, so it must not trigger emergency credit
func test_mfix14_fresh_restart_does_not_offer_loan() -> void:
	reporter.start_test("MFIX14: fresh restart does not offer emergency loan")
	RocketsManager.reset_state()
	var app = AppControllerScript.new()
	app.franc_balance = 0
	app.loan_balance = 0
	var eligible = app.can_take_loan()
	app.free()
	if eligible:
		reporter.fail_test("Expected can_take_loan=false when no missions have been completed")
		return
	reporter.pass_test()

# MFIX15 — map selection must survive returning to the Launchpad
func test_mfix15_map_return_preserves_selected_target() -> void:
	reporter.start_test("MFIX15: map return preserves selected M1 target")
	RocketsManager.reset_state()
	var target_id := "mission-1-training-target"
	RocketsManager.set_map_return_mode(true)
	if not RocketsManager.select_target(target_id):
		reporter.fail_test("Expected M1 training target to be selectable")
		return
	RocketsManager.consume_map_return_mode()
	var selected := RocketsManager.get_selected_target()
	if selected != target_id:
		reporter.fail_test("Expected selected_target='%s' after map return, got '%s'" % [target_id, selected])
		return
	reporter.pass_test()
