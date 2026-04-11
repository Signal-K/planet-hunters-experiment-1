extends Node
## PanelRedesignTour
## Standalone tour that instantiates each redesigned UI panel, takes a screenshot,
## and records a report. No real game state needed — uses static mock data.
##
## Run via:
##   DISPLAY=:99 godot --path ./scene res://tests/PanelRedesignTour.tscn
##
## Produces:
##   user://ux_screenshots/panel_redesign/*.png
##   user://panel_redesign_report.md

const SCREENSHOT_DIR := "user://ux_screenshots/panel_redesign"
const REPORT_PATH    := "user://panel_redesign_report.md"

const ClassificationConsensusScene = preload("res://Scenes/UI/ClassificationConsensusNotification.tscn")
const MiningAcademyScene           = preload("res://Scenes/UI/MiningAcademyDialog.tscn")
const MechanicIntroScene           = preload("res://Scenes/UI/MechanicIntroOverlay.tscn")
const ControlStationScene          = preload("res://Scenes/UI/ControlStationPanel.tscn")
const FreeOpsScene                 = preload("res://Scenes/UI/FreeOpsUnlockOverlay.tscn")

const SETTLE    := 0.5   # seconds to settle before screenshot
const ANIM      := 0.3   # post-dismiss settle

var _report_lines: Array[String] = []
var _issues: Array[String] = []
var _screenshot_index := 0
var _active: Node = null

func _ready() -> void:
	DirAccess.make_dir_recursive_absolute(SCREENSHOT_DIR)
	_run_tour.call_deferred()

func _run_tour() -> void:
	_report("# Panel Redesign Tour")
	_report("Screenshots of all five redesigned UI panels with mock data.\n")

	# Suppress all existing CanvasLayer overlays (game autoloads) before tour starts
	for child in get_tree().root.get_children():
		if child != self and child is CanvasLayer:
			(child as CanvasLayer).visible = false
	await get_tree().process_frame

	# ── 1. Classification Consensus Notification ──────────────────────────────
	_report("## Panel 1 — ClassificationConsensusNotification")
	var classify = ClassificationConsensusScene.instantiate()
	get_tree().root.add_child(classify)
	_active = classify
	await get_tree().create_timer(SETTLE).timeout

	var entries := [
		{"anomaly_id": "TIC-4501", "consensus_verdict": "planet",     "active_mission": false},
		{"anomaly_id": "TIC-2289", "consensus_verdict": "planet",     "active_mission": true},
		{"anomaly_id": "TIC-8812", "consensus_verdict": "not_planet", "active_mission": false},
		{"anomaly_id": "TIC-9994", "consensus_verdict": "planet",     "active_mission": false},
	]
	if classify.has_method("show_results"):
		classify.show_results(entries, 1240, "Expert_IV")
		await get_tree().create_timer(SETTLE).timeout

	var dialog_present := _find_label_with_text(get_tree().root, "CLASSIFICATION RESULTS") != null
	if dialog_present:
		_report("  ✓ ClassificationConsensusNotification rendered.")
	else:
		_issue("ClassificationConsensusNotification title not found.")

	await _screenshot("01_classification_results")
	_dismiss_active(classify)
	await get_tree().create_timer(ANIM).timeout

	# ── 2. Mining Academy Dialog ───────────────────────────────────────────────
	_report("\n## Panel 2 — MiningAcademyDialog")
	var academy = MiningAcademyScene.instantiate()
	get_tree().root.add_child(academy)
	_active = academy
	await get_tree().create_timer(SETTLE).timeout

	if academy.has_method("show_results"):
		academy.show_results({
			"accuracy": 94.2, "resources": "12.4k", "last_score": 8240,
			"pilot_rank": "SENIOR PROSPECTOR",
			"debrief": "Post-mission debrief complete. Neural link stability nominal at 98.4%.",
			"uptime": "14:02:55"
		})
		await get_tree().create_timer(SETTLE).timeout

	var academy_present := _find_label_with_text(get_tree().root, "Mining Academy") != null
	if academy_present:
		_report("  ✓ MiningAcademyDialog rendered.")
	else:
		_issue("MiningAcademyDialog 'Mining Academy' label not found.")

	await _screenshot("02_mining_academy")
	_dismiss_active(academy)
	await get_tree().create_timer(ANIM).timeout

	# ── 3. Mechanic Intro Overlay ─────────────────────────────────────────────
	_report("\n## Panel 3 — MechanicIntroOverlay")
	var mechanic = MechanicIntroScene.instantiate()
	get_tree().root.add_child(mechanic)
	_active = mechanic
	await get_tree().create_timer(SETTLE).timeout

	if mechanic.has_method("show_intro"):
		mechanic.show_intro({
			"title":          "MECHANIC UNLOCKED:",
			"mechanic_name":  "OFF-WORLD REFINERIES",
			"protocol":       "MISSION PROTOCOL // INDUSTRIAL_EXP",
			"overview":       "Deploy autonomous isotope harvesters to asteroid clusters. Transitions colony focus from atmospheric survival to deep-space industrial hegemony.",
			"targeting":      "Asteroid Clusters",
			"efficiency":     "+14.2% Fleet Yield",
			"schematic_label": "REFINERY_V4_SCHEMATIC",
			"stability":      88.0,
			"thermal":        42.0,
			"steps":          [
				"Survey celestial bodies on orbital map",
				"Allocate Refinery Kit to isotope deposits",
				"Initiate drone transport cycles",
			],
			"auth":           "LINK_STATE: 100%  AUTH: CMD_07",
		})
		await get_tree().create_timer(SETTLE).timeout

	var mechanic_present := _find_label_with_text(get_tree().root, "MECHANIC UNLOCKED") != null \
		or _find_label_with_text(get_tree().root, "OFF-WORLD REFINERIES") != null
	if mechanic_present:
		_report("  ✓ MechanicIntroOverlay rendered.")
	else:
		_issue("MechanicIntroOverlay title labels not found.")

	await _screenshot("03_mechanic_intro")
	_dismiss_active(mechanic)
	await get_tree().create_timer(ANIM).timeout

	# ── 4. Control Station Panel ──────────────────────────────────────────────
	_report("\n## Panel 4 — ControlStationPanel")
	var ctrl = ControlStationScene.instantiate()
	get_tree().root.add_child(ctrl)
	_active = ctrl
	await get_tree().create_timer(SETTLE).timeout

	var ctrl_present := _find_label_with_text(get_tree().root, "CONTROL PANEL") != null
	if ctrl_present:
		_report("  ✓ ControlStationPanel rendered.")
	else:
		_issue("ControlStationPanel title not found.")

	await _screenshot("04_control_station")
	_dismiss_active(ctrl)
	await get_tree().create_timer(ANIM).timeout

	# ── 5. Free Operations Overlay ────────────────────────────────────────────
	_report("\n## Panel 5 — FreeOpsUnlockOverlay")
	var freeops = FreeOpsScene.instantiate()
	get_tree().root.add_child(freeops)
	_active = freeops
	await get_tree().create_timer(SETTLE).timeout

	var freeops_present := _find_label_with_text(get_tree().root, "FREE OPERATIONS") != null
	if freeops_present:
		_report("  ✓ FreeOpsUnlockOverlay rendered.")
	else:
		_issue("FreeOpsUnlockOverlay title not found.")

	await _screenshot("05_free_operations")
	_dismiss_active(freeops)
	await get_tree().create_timer(ANIM).timeout

	_finish()

# ── Helpers ────────────────────────────────────────────────────────────────

func _dismiss_active(node: Node) -> void:
	if node and is_instance_valid(node):
		if node.get_parent():
			node.get_parent().remove_child(node)
		node.queue_free()
	_active = null

func _find_label_with_text(root: Node, search: String) -> Label:
	if not root: return null
	if root is Label and search.to_lower() in (root as Label).text.to_lower():
		return root as Label
	for child in root.get_children():
		var found := _find_label_with_text(child, search)
		if found: return found
	return null

func _screenshot(label: String) -> void:
	# Suppress all game UI except our active panel (CanvasLayer + Control overlays)
	for child in get_tree().root.get_children():
		if child == self or child == _active:
			continue
		if child is CanvasLayer:
			(child as CanvasLayer).visible = false
		elif child is Control:
			(child as Control).visible = false
	await get_tree().process_frame
	await get_tree().process_frame
	RenderingServer.force_draw(false)
	await RenderingServer.frame_post_draw
	var image := get_viewport().get_texture().get_image()
	if not image:
		_issue("Failed to capture viewport for '%s'." % label)
		return
	_screenshot_index += 1
	var filename := "%s/%02d_%s.png" % [SCREENSHOT_DIR, _screenshot_index, label]
	if image.save_png(filename) == OK:
		_report("  📸 %02d_%s.png" % [_screenshot_index, label])
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
	_report("## Summary")
	_report("Screenshots: %d" % _screenshot_index)
	_report("Issues: %d" % _issues.size())
	for issue in _issues:
		_report("  - %s" % issue)

	var file := FileAccess.open(REPORT_PATH, FileAccess.WRITE)
	if file:
		file.store_string("\n".join(_report_lines))
		file.close()
		print("Report saved: %s" % REPORT_PATH)

	get_tree().quit(0)
