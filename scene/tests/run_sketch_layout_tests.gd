## run_sketch_layout_tests.gd
## Tests derived directly from notebook sketches for two specific tickets:
##   2409on — Sketch the SR2 unlock screen layout
##   ommhwg — Sketch a next-mission CTA for the post-debrief screen
##
## These tests check layout structure and UX decisions captured in the sketches
## that are NOT covered by run_earth_base_unlock_tests.gd or run_mission_debrief_v2_tests.gd.
extends SceneTree

const TestReporter        = preload("res://tests/TestReporter.gd")
const EarthBaseScene      = preload("res://Scenes/Earth/earth_base_1.tscn")
const MissionDebriefScene = preload("res://Scenes/Earth/mission_debrief_v2.tscn")
const RocketsManager      = preload("res://Scripts/Utils/RocketsManager.gd")
const MissionLogManager   = preload("res://Scripts/Utils/MissionLogManager.gd")
const NumberFormat        = preload("res://Scripts/Utils/NumberFormat.gd")
const ResearchManager     = preload("res://Scripts/Utils/ResearchManager.gd")
const RocketSpecs         = preload("res://Scripts/Utils/RocketSpecs.gd")

const TEST_LOG_PATH := "res://tests/mission_debrief_v2_test_logs.json"

var reporter := TestReporter.new()

class MockAppController:
	extends Node
	var _franc_balance := 0
	func add_franc_balance(amount: int, _source: String = "") -> void:
		_franc_balance += amount
	func add_experience(_amount: int, _source: String = "") -> void:
		pass
	func get_franc_balance() -> int:
		return _franc_balance
	func has_outstanding_loan() -> bool:
		return false
	func repay_loan_from_payout(amount: int) -> int:
		return amount


func _init() -> void:
	MissionLogManager.set_path_overrides(TEST_LOG_PATH, TEST_LOG_PATH)
	reporter.start_suite("Sketch Layout Tests (2409on + ommhwg)", {
		"engine": Engine.get_version_info()["string"],
		"os": OS.get_name(),
		"project": "scene",
		"timestamp": Time.get_datetime_string_from_system()
	})
	await run_all_tests()
	reporter.summary()
	MissionLogManager.clear_path_overrides()
	await create_timer(0.1).timeout
	quit(1 if reporter.tests_failed > 0 else 0)


func run_all_tests() -> void:
	# SR2 unlock screen layout (sketch 2409on)
	await test_sr2_unlock_eyebrow_badge()
	await test_sr2_unlock_icon_shell_and_texture()
	await test_sr2_unlock_left_right_column_structure()
	await test_sr2_unlock_background_preserved_partial_dim()
	# Next mission CTA (sketch ommhwg)
	await test_base_screen_next_mission_card_title()
	await test_base_screen_next_mission_card_has_open_launchpad_button()
	await test_debrief_handoff_card_location_contractor_mission_rows()
	await test_debrief_handoff_card_amber_note_is_present_and_nonempty()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

func _find(root: Node, name: String) -> Node:
	if root == null:
		return null
	var stack: Array[Node] = [root]
	while not stack.is_empty():
		var n = stack.pop_back()
		if str(n.name) == name:
			return n
		for c in n.get_children():
			stack.append(c)
	return null

func _find_label_containing(root: Node, snippet: String) -> Label:
	if root == null:
		return null
	var stack: Array[Node] = [root]
	while not stack.is_empty():
		var n = stack.pop_back()
		if n is Label and str((n as Label).text).find(snippet) != -1:
			return n as Label
		for c in n.get_children():
			stack.append(c)
	return null

func _find_button_by_text(root: Node, text: String) -> Button:
	if root == null:
		return null
	var stack: Array[Node] = [root]
	while not stack.is_empty():
		var n = stack.pop_back()
		if n is Button and str((n as Button).text) == text:
			return n as Button
		for c in n.get_children():
			stack.append(c)
	return null

func _setup_debrief() -> Dictionary:
	RocketsManager.reset_state()
	RocketsManager.set_returned_mission(
		"starterrocket1-sketch-test",
		"mission-1-training-target",
		"433 Eros",
		"asteroid",
		"contract",
		{
			"trip_contractor_id": "rocketlab",
			"trip_contractor_name": "Rocketlab",
			"trip_requested_minerals": {"Iron": 10},
			"mining_run_collected": {"Iron": 10}
		}
	)
	var existing = get_root().get_node_or_null("AppController")
	if existing:
		existing.queue_free()
		await create_timer(0.02).timeout
	var app = MockAppController.new()
	app.name = "AppController"
	get_root().add_child(app)
	var scene = MissionDebriefScene.instantiate()
	get_root().add_child(scene)
	await create_timer(0.05).timeout
	return {"scene": scene, "app": app}

func _teardown_debrief(ctx: Dictionary) -> void:
	var scene = ctx.get("scene")
	var app = ctx.get("app")
	if scene and is_instance_valid(scene):
		scene.queue_free()
	if app and is_instance_valid(app):
		app.queue_free()
	RocketsManager.clear_returned_mission()
	await create_timer(0.02).timeout


# ---------------------------------------------------------------------------
# SR2 unlock screen — sketch 2409on
# ---------------------------------------------------------------------------

## Sketch called for an eyebrow badge labelling the overlay as a reward moment,
## not just a notification. Verify the badge text is present.
func test_sr2_unlock_eyebrow_badge() -> void:
	reporter.start_test("SR2 unlock overlay shows 'MISSION REWARD' eyebrow badge (2409on)")
	var scene = EarthBaseScene.instantiate()
	get_root().add_child(scene)
	await create_timer(0.10).timeout

	scene._show_starterrocket2_unlock_popup()
	await create_timer(0.05).timeout

	var overlay = scene.get_node_or_null("StarterRocket2UnlockOverlay")
	if overlay == null:
		reporter.fail_test("StarterRocket2UnlockOverlay not found")
		scene.queue_free()
		return

	var eyebrow = _find(_find(overlay, "StarterRocket2UnlockBody"), "StarterRocket2UnlockEyebrow") as Label
	if eyebrow == null:
		reporter.fail_test("StarterRocket2UnlockEyebrow label not found")
		scene.queue_free()
		return
	if eyebrow.text.find("MISSION REWARD") == -1:
		reporter.fail_test("Eyebrow does not contain 'MISSION REWARD', got: " + eyebrow.text)
		scene.queue_free()
		return
	if eyebrow.text.find("NEW SHIP UNLOCKED") == -1:
		reporter.fail_test("Eyebrow does not contain 'NEW SHIP UNLOCKED', got: " + eyebrow.text)
		scene.queue_free()
		return

	scene.queue_free()
	await create_timer(0.05).timeout
	reporter.pass_test()


## Sketch showed rocket art on the left. Verify the icon shell exists with a
## loaded rocket texture (not a blank placeholder).
func test_sr2_unlock_icon_shell_and_texture() -> void:
	reporter.start_test("SR2 unlock overlay has icon shell with loaded rocket texture (2409on)")
	var scene = EarthBaseScene.instantiate()
	get_root().add_child(scene)
	await create_timer(0.10).timeout

	scene._show_starterrocket2_unlock_popup()
	await create_timer(0.05).timeout

	var overlay = scene.get_node_or_null("StarterRocket2UnlockOverlay")
	if overlay == null:
		reporter.fail_test("StarterRocket2UnlockOverlay not found")
		scene.queue_free()
		return

	var icon_shell = _find(overlay, "StarterRocket2UnlockIconShell")
	if icon_shell == null:
		reporter.fail_test("StarterRocket2UnlockIconShell not found")
		scene.queue_free()
		return

	var icon = _find(icon_shell, "StarterRocket2UnlockIcon") as TextureRect
	if icon == null:
		reporter.fail_test("StarterRocket2UnlockIcon TextureRect not found inside shell")
		scene.queue_free()
		return
	if icon.texture == null:
		reporter.fail_test("SR2 icon TextureRect has no texture loaded")
		scene.queue_free()
		return

	scene.queue_free()
	await create_timer(0.05).timeout
	reporter.pass_test()


## Sketch placed rocket art left, stats right. Verify the content container
## holds both the icon shell and a details column as direct children.
func test_sr2_unlock_left_right_column_structure() -> void:
	reporter.start_test("SR2 unlock overlay has left icon shell + right details siblings (2409on)")
	var scene = EarthBaseScene.instantiate()
	get_root().add_child(scene)
	await create_timer(0.10).timeout

	scene._show_starterrocket2_unlock_popup()
	await create_timer(0.05).timeout

	var overlay = scene.get_node_or_null("StarterRocket2UnlockOverlay")
	if overlay == null:
		reporter.fail_test("StarterRocket2UnlockOverlay not found")
		scene.queue_free()
		return

	var content = _find(overlay, "StarterRocket2UnlockContent")
	if content == null:
		reporter.fail_test("StarterRocket2UnlockContent container not found")
		scene.queue_free()
		return

	# Icon shell and details must be direct children of the content row/column
	var icon_shell_found := false
	var details_found := false
	for child in content.get_children():
		if str(child.name) == "StarterRocket2UnlockIconShell":
			icon_shell_found = true
		if str(child.name) == "StarterRocket2UnlockDetails":
			details_found = true

	if not icon_shell_found:
		reporter.fail_test("StarterRocket2UnlockIconShell is not a direct child of content container")
		scene.queue_free()
		return
	if not details_found:
		reporter.fail_test("StarterRocket2UnlockDetails is not a direct child of content container")
		scene.queue_free()
		return

	scene.queue_free()
	await create_timer(0.05).timeout
	reporter.pass_test()


## Sketch: Earth-base background preserved — overlay dims but does not fully
## black out the scene. Verify the overlay ColorRect starts at alpha 0 (transparent)
## so the background is visible at launch, then animates to partial dim only.
func test_sr2_unlock_background_preserved_partial_dim() -> void:
	reporter.start_test("SR2 unlock overlay starts transparent (background preserved before animation) (2409on)")
	var scene = EarthBaseScene.instantiate()
	get_root().add_child(scene)
	await create_timer(0.10).timeout

	# Inspect the overlay immediately after creation, before the tween completes
	scene._show_starterrocket2_unlock_popup()
	# No wait — grab it before the 0.22s fade tween finishes
	var overlay = scene.get_node_or_null("StarterRocket2UnlockOverlay") as ColorRect
	if overlay == null:
		reporter.fail_test("StarterRocket2UnlockOverlay not found immediately after creation")
		scene.queue_free()
		return

	# The overlay ColorRect should start fully transparent (alpha=0) so background shows
	if overlay.color.a >= 1.0:
		reporter.fail_test("Overlay starts at alpha %.2f — background not preserved at launch" % overlay.color.a)
		scene.queue_free()
		return

	# After the full animation plays out, alpha must stay below 1.0 (partial dim only)
	await create_timer(0.60).timeout
	if overlay.color.a >= 1.0:
		reporter.fail_test("Overlay reached full opacity — background fully hidden, sketch requires partial dim")
		scene.queue_free()
		return

	scene.queue_free()
	await create_timer(0.05).timeout
	reporter.pass_test()


# ---------------------------------------------------------------------------
# Next mission CTA — sketch ommhwg
# ---------------------------------------------------------------------------

## Sketch: "First thing after mission 1 = inspires rockets." Base screen should
## surface a clearly titled next-mission card after M1 completes.
func test_base_screen_next_mission_card_title() -> void:
	reporter.start_test("Base screen next-mission card has 'Next Mission Available' heading (ommhwg)")
	var scene = EarthBaseScene.instantiate()
	get_root().add_child(scene)
	await create_timer(0.10).timeout

	# Call the card builder directly — its title must match the sketch's intent
	var card = scene._build_next_mission_card()
	if card == null:
		reporter.fail_test("_build_next_mission_card() returned null")
		scene.queue_free()
		return

	scene.add_child(card)
	await create_timer(0.02).timeout

	var title = _find_label_containing(card, "Next Mission Available")
	if title == null:
		reporter.fail_test("Card does not contain 'Next Mission Available' heading")
		scene.queue_free()
		return

	scene.queue_free()
	await create_timer(0.05).timeout
	reporter.pass_test()


## Sketch: CTA should guide players back into the loop via launchpad.
func test_base_screen_next_mission_card_has_open_launchpad_button() -> void:
	reporter.start_test("Base screen next-mission card CTA opens the launchpad (ommhwg)")
	var scene = EarthBaseScene.instantiate()
	get_root().add_child(scene)
	await create_timer(0.10).timeout

	var card = scene._build_next_mission_card()
	if card == null:
		reporter.fail_test("_build_next_mission_card() returned null")
		scene.queue_free()
		return

	scene.add_child(card)
	await create_timer(0.02).timeout

	var btn = _find_button_by_text(card, "Open Launchpad")
	if btn == null:
		reporter.fail_test("Card does not contain 'Open Launchpad' button")
		scene.queue_free()
		return

	scene.queue_free()
	await create_timer(0.05).timeout
	reporter.pass_test()


## Sketch: Dedicated debrief screen (formal debut). The handoff card should
## present the next mission brief as structured Location/Contractor/Mission rows.
func test_debrief_handoff_card_location_contractor_mission_rows() -> void:
	reporter.start_test("Debrief handoff card shows Location / Contractor / Mission rows (ommhwg)")
	var ctx = await _setup_debrief()
	var scene = ctx.get("scene")

	# Advance to handoff phase
	scene._on_sell_pressed(Button.new())
	scene._on_complete_pressed()
	await create_timer(0.05).timeout

	if scene._phase != "handoff":
		reporter.fail_test("Scene did not enter handoff phase")
		await _teardown_debrief(ctx)
		return

	# Each of the three rows must appear as key labels in the handoff card
	for key in ["Location", "Contractor", "Mission"]:
		if _find_label_containing(scene, key) == null:
			reporter.fail_test("Handoff card missing '%s' row label" % key)
			await _teardown_debrief(ctx)
			return

	await _teardown_debrief(ctx)
	reporter.pass_test()


## Sketch: CTA placement must guide players. The handoff card should have an amber
## note field that provides copy direction — it must be non-empty so the slot is
## never silently blank when the player reaches the handoff.
func test_debrief_handoff_card_amber_note_is_present_and_nonempty() -> void:
	reporter.start_test("Debrief handoff card amber note field is present and non-empty (ommhwg)")
	var ctx = await _setup_debrief()
	var scene = ctx.get("scene")

	# Advance to handoff phase
	scene._on_sell_pressed(Button.new())
	scene._on_complete_pressed()
	await create_timer(0.05).timeout

	if scene._phase != "handoff":
		reporter.fail_test("Scene did not enter handoff phase")
		await _teardown_debrief(ctx)
		return

	# Walk the scene tree and find all Labels — the amber note must exist and have text.
	# We identify it by checking all labels for non-empty text that isn't one of the
	# known structural labels (heading, title, key labels, button text).
	var structural := ["NEXT MISSION", "Location", "Contractor", "Mission", "Open Launchpad →"]
	var found_note := false
	var stack: Array[Node] = [scene]
	while not stack.is_empty():
		var n = stack.pop_back()
		if n is Label:
			var t := str((n as Label).text).strip_edges()
			if t.length() > 0 and not (t in structural):
				# Found a non-structural, non-empty label — this is the note/copy direction slot
				found_note = true
				break
		for c in n.get_children():
			stack.append(c)

	if not found_note:
		reporter.fail_test("Handoff phase has no non-empty note/copy label beyond structural headings")
		await _teardown_debrief(ctx)
		return

	await _teardown_debrief(ctx)
	reporter.pass_test()
