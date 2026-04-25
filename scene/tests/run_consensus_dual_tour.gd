extends Node
## ConsensusDualTour
## Simulates one of two simultaneous players receiving the ClassificationConsensus
## notification for anomaly TIC-4501 (both classified as "planet", consensus = planet).
##
## Usage (two instances in parallel):
##   DISPLAY=:95 godot --path ./scene --user-data-dir /tmp/phtest_alpha \
##       res://tests/ConsensusDualTour.tscn -- --player PILOT_ALPHA
##   DISPLAY=:96 godot --path ./scene --user-data-dir /tmp/phtest_beta  \
##       res://tests/ConsensusDualTour.tscn -- --player PILOT_BETA
##
## Each instance seeds its own user://classification_consensus.json,
## reads it back via ClassificationConsensus.get_new_notifications(), and
## shows the redesigned ClassificationConsensusNotification dialog.

const SCREENSHOT_BASE_DIR := "user://ux_screenshots/consensus_dual"
const REPORT_BASE_PATH    := "user://consensus_dual_report"

const ClassificationConsensusNotificationScene = \
	preload("res://Scenes/UI/ClassificationConsensusNotification.tscn")
const ClassificationConsensus = \
	preload("res://Scripts/Utils/ClassificationConsensus.gd")

## Shared planet candidate both players classified the same way.
const ANOMALY_ID       := "TIC-4501"
const PLANET_COUNT     := 3   # total "planet" votes across all players
const NOT_PLANET_COUNT := 1   # total "not_planet" votes

const SETTLE := 0.5   # settle time before screenshot

var _player_name : String        = "PILOT_UNKNOWN"
var _report_lines: Array[String] = []
var _issues      : Array[String] = []
var _screenshot_dir: String      = SCREENSHOT_BASE_DIR
var _report_path: String         = REPORT_BASE_PATH + ".md"
var _active: Node = null   # panel being tested — excluded from screenshot blanking

func _ready() -> void:
	# Parse --player <name> from user args (args after "--" separator)
	var user_args := OS.get_cmdline_user_args()
	for i in range(user_args.size() - 1):
		if user_args[i] == "--player":
			_player_name = user_args[i + 1]
			break

	# Make paths player-specific so two parallel instances don't collide
	var slug := _player_name.to_lower().replace(" ", "_")
	_screenshot_dir = SCREENSHOT_BASE_DIR + "/" + slug
	_report_path    = REPORT_BASE_PATH + "_" + slug + ".md"
	DirAccess.make_dir_recursive_absolute(_screenshot_dir)
	_run_tour.call_deferred()

func _run_tour() -> void:
	_report("# Consensus Dual Tour — %s" % _player_name)
	_report("Anomaly: %s  |  Verdict: planet  |  Consensus: planet (%d vs %d)" \
		% [ANOMALY_ID, PLANET_COUNT, NOT_PLANET_COUNT])
	_report("")

	# Suppress game autoload overlays so only our panel is visible
	for child in get_tree().root.get_children():
		if child != self and child is CanvasLayer:
			(child as CanvasLayer).visible = false
	await get_tree().process_frame

	# ── Seed local consensus state (bypasses Supabase) ────────────────────────
	_seed_consensus_state()

	# ── Verify state was written correctly ────────────────────────────────────
	var notifications := ClassificationConsensus.get_new_notifications()
	_report("Pending notifications after seeding: %d" % notifications.size())
	if notifications.is_empty():
		_issue("get_new_notifications() returned empty after seeding state.")
		# Fall back to mock data so the screenshot is still useful
		notifications = _mock_entries()

	# ── Show the notification panel ───────────────────────────────────────────
	var notify = ClassificationConsensusNotificationScene.instantiate()
	get_tree().root.add_child(notify)
	_active = notify
	await get_tree().create_timer(SETTLE).timeout

	# EXP reward differs slightly per player to show independent reward tracking
	var exp_gained := 840 if "ALPHA" in _player_name else 720
	if notify.has_method("show_results"):
		notify.show_results(notifications, exp_gained, _player_name)
		await get_tree().create_timer(SETTLE).timeout

	# ── Assertions ────────────────────────────────────────────────────────────
	var found_title := _find_label_with_text(get_tree().root, "CLASSIFICATION RESULTS") != null
	if found_title:
		_report("  ✓ Dialog title 'CLASSIFICATION RESULTS' visible.")
	else:
		_issue("Dialog title 'CLASSIFICATION RESULTS' not found.")

	var found_agreement := _find_label_with_text(get_tree().root, "Agreement") != null
	if found_agreement:
		_report("  ✓ 'Agreement' verdict shown (player_verdict == consensus_verdict).")
	else:
		_issue("'Agreement' verdict label not found.")

	var found_anomaly := _find_label_with_text(get_tree().root, "TIC-4501") != null
	if found_anomaly:
		_report("  ✓ Anomaly ID 'TIC-4501' visible in a target card.")
	else:
		_issue("Anomaly ID 'TIC-4501' not found in dialog.")

	# ── Screenshot ────────────────────────────────────────────────────────────
	await _screenshot("consensus_%s" % _player_name.to_lower())

	_finish()

## Write a pre-built consensus entry directly to user://classification_consensus.json.
## This bypasses the Supabase fetch and simulates what check_for_updates() stores
## after seeing 3 "planet" + 1 "not_planet" votes from the community.
func _seed_consensus_state() -> void:
	var entry := {
		"anomaly_id"       : ANOMALY_ID,
		"player_verdict"   : "planet",
		"consensus_verdict": "planet",
		"planet_count"     : PLANET_COUNT,
		"not_planet_count" : NOT_PLANET_COUNT,
		"last_checked"     : int(Time.get_unix_time_from_system()),
		"notified"         : false,
	}
	var state := { ANOMALY_ID: entry }
	var f := FileAccess.open("user://classification_consensus.json", FileAccess.WRITE)
	if f:
		f.store_string(JSON.stringify(state))
		f.close()
		_report("  ✓ Seeded user://classification_consensus.json")
	else:
		_issue("Could not write user://classification_consensus.json")

## Fallback mock data if seeding failed.
func _mock_entries() -> Array:
	return [{
		"anomaly_id"       : ANOMALY_ID,
		"consensus_verdict": "planet",
		"active_mission"   : false,
	}]

# ── Helpers ───────────────────────────────────────────────────────────────────

func _find_label_with_text(root: Node, search: String) -> Label:
	if not root: return null
	if root is Label and search.to_lower() in (root as Label).text.to_lower():
		return root as Label
	for child in root.get_children():
		var found := _find_label_with_text(child, search)
		if found: return found
	return null

func _screenshot(label: String) -> void:
	for child in get_tree().root.get_children():
		if child == self or child == _active: continue
		if child is CanvasLayer:
			(child as CanvasLayer).visible = false
		elif child is Control:
			(child as Control).visible = false
	var renderer_name := DisplayServer.get_name().to_lower()
	if renderer_name.find("headless") != -1:
		_issue("Screenshot capture unavailable under headless renderer for '%s'." % label)
		return
	for _i in range(3):
		await get_tree().process_frame
	RenderingServer.force_draw(false)
	var texture := get_viewport().get_texture()
	if texture == null:
		return
	var image := texture.get_image()
	var attempts := 0
	while (image == null or image.get_width() <= 0 or image.get_height() <= 0) and attempts < 6:
		await get_tree().create_timer(0.05).timeout
		await get_tree().process_frame
		RenderingServer.force_draw(false)
		texture = get_viewport().get_texture()
		if texture == null:
			return
		image = texture.get_image()
		attempts += 1
	if not image:
		_issue("Failed to capture viewport for '%s'." % label)
		return
	var filename := "%s/%s.png" % [_screenshot_dir, label]
	if image.save_png(filename) == OK:
		_report("  📸 %s.png" % label)
	else:
		_issue("Failed to save screenshot: %s" % filename)

func _report(line: String) -> void:
	print(line)
	_report_lines.append(line)

func _issue(msg: String) -> void:
	var line := "  ⚠ ISSUE: %s" % msg
	print(line)
	_report_lines.append(line)
	_issues.append(msg)

func _finish() -> void:
	_report("\n---")
	_report("## Summary — %s" % _player_name)
	_report("Issues: %d" % _issues.size())
	for issue in _issues:
		_report("  - %s" % issue)

	var file := FileAccess.open(_report_path, FileAccess.WRITE)
	if file:
		file.store_string("\n".join(_report_lines))
		file.close()
		print("Report: %s" % _report_path)

	get_tree().quit(0 if _issues.is_empty() else 1)
