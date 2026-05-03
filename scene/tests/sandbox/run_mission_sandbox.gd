extends Node
## MissionSandbox — drives a fresh game session through M1 → M2 → M3,
## including asteroid and planet candidate annotation/classification,
## finishing with the post-M3 Free Operations handoff overlay.
##
## Outputs to user:// (Docker maps this to /output via GODOT_USER_DIR):
##   sandbox_screenshots/NNN_step.png   — ordered screenshots of every major step
##   sandbox_report.md                  — human-readable step log + issue list
##   sandbox_manifest.json              — per-screenshot metadata for AI review
##   sandbox_issues.json                — machine-readable CRITICAL/WARNING list
##
## Usage:
##   godot --path /app/scene res://tests/sandbox/MissionSandbox.tscn
##   godot --path /app/scene res://tests/sandbox/MissionSandbox.tscn -- --fast

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
const SCREENSHOT_DIR := "user://sandbox_screenshots"
const REPORT_PATH    := "user://sandbox_report.md"
const MANIFEST_PATH  := "user://sandbox_manifest.json"
const ISSUES_PATH    := "user://sandbox_issues.json"

const EARTH_SCENE     := "res://Scenes/Earth/earth_base_1.tscn"
const LAUNCHPAD_SCENE := "res://Scenes/Earth/earth_launchpad.tscn"
const DEBRIEF_SCENE   := "res://Scenes/Earth/mission_debrief_v2.tscn"
const TRANSIT_SCENE   := "res://Scenes/Transitions/rocket_transit.tscn"
const ASCENT_SCENE    := "res://Scenes/Transitions/rocket_ascent.tscn"
const RETURN_SCENE    := "res://Scenes/Transitions/rocket_return.tscn"
const MINING_SCENE    := "res://Scenes/UI/SidescrollMining.tscn"
const WIZARD_SCENE    := "res://Scenes/UI/LaunchWizard.tscn"
const SATELLITE_SCENE := "res://Scenes/UI/SatelliteStationPanel.tscn"
const ASTEROID_DETAIL := "res://Scenes/UI/AsteroidDetail/asteroid_detail_view.tscn"
const CONTROL_STATION := "res://Scenes/UI/ControlStationPanel.tscn"

const RocketsManager           := preload("res://Scripts/Utils/RocketsManager.gd")
const FirstTimeMechanicTracker := preload("res://Scripts/Utils/FirstTimeMechanicTracker.gd")

# ---------------------------------------------------------------------------
# Timing — halved in --fast mode
# ---------------------------------------------------------------------------
var SETTLE_SCENE  := 2.5
var SETTLE_PANEL  := 1.8
var SETTLE_ANIM   := 1.0
var MINING_TIME   := 10.0

const STUCK_THRESHOLD_MS := 45_000

# ---------------------------------------------------------------------------
# State
# ---------------------------------------------------------------------------
var _screenshot_index := 0
var _active_scene: Node = null
var _report_lines : Array[String] = []
var _manifest     : Array          = []
var _issues       : Array          = []
var _step_start   := 0

# ---------------------------------------------------------------------------
# Entry
# ---------------------------------------------------------------------------
func _ready() -> void:
	for arg in OS.get_cmdline_user_args():
		if arg == "--fast":
			SETTLE_SCENE = 1.0
			SETTLE_PANEL = 0.8
			SETTLE_ANIM  = 0.4
			MINING_TIME  = 4.0

	DirAccess.make_dir_recursive_absolute(
		ProjectSettings.globalize_path(SCREENSHOT_DIR)
	)
	_report("# Mission Sandbox Run — %s" % Time.get_datetime_string_from_system())
	_report("")
	_run_flow.call_deferred()

# ---------------------------------------------------------------------------
# Main flow
# ---------------------------------------------------------------------------
func _run_flow() -> void:
	# ── Setup ──────────────────────────────────────────────────────────────
	_begin_step("setup")
	_inject_mission_progress(0)
	_inject_tutorial_state(1, 0, false)
	await _wait(0.5)

	# ── M1: Basic loop ─────────────────────────────────────────────────────
	_report("\n## Mission 1 — Basic Loop")
	await _phase_earth_base(1, "earth_base_m1")
	await _phase_launchpad(1, "launchpad_m1")
	await _phase_transit("transit_m1")
	await _phase_mining("mining_m1")
	await _phase_return("return_m1")
	await _phase_debrief(1, "debrief_m1")
	_inject_mission_progress(1)
	_inject_tutorial_state(2, 0, false)

	# ── M2: Control Station + contractor ──────────────────────────────────
	_report("\n## Mission 2 — Control Station")
	await _phase_earth_base(2, "earth_base_m2")
	await _phase_control_station("control_station_m2")
	await _phase_launchpad(2, "launchpad_m2")
	await _phase_transit("transit_m2")
	await _phase_mining("mining_m2")
	await _phase_return("return_m2")
	await _phase_debrief(2, "debrief_m2")
	_inject_mission_progress(2)
	_inject_tutorial_state(3, 0, false)

	# ── M3: Scanner + asteroid annotation ─────────────────────────────────
	_report("\n## Mission 3 — Citizen Science / Annotation")
	await _phase_earth_base(3, "earth_base_m3")
	await _phase_satellite_station(false, "scanner_asteroids")
	await _phase_annotation("asteroid", "annotation_asteroid")
	await _phase_satellite_station(true, "scanner_planets")
	await _phase_annotation("planet", "annotation_planet")
	await _phase_launchpad(3, "launchpad_m3")
	await _phase_transit("transit_m3")
	await _phase_mining("mining_m3")
	await _phase_return("return_m3")
	await _phase_debrief(3, "debrief_m3")
	_inject_mission_progress(3)
	_inject_tutorial_state(4, 0, false)

	# ── Post-M3: Free Operations handoff ──────────────────────────────────
	_report("\n## Post-M3 — Free Operations Handoff")
	await _phase_free_ops()

	_finalize()
	get_tree().quit(0)

# ---------------------------------------------------------------------------
# Phase helpers
# ---------------------------------------------------------------------------
func _phase_earth_base(mission: int, tag: String) -> void:
	_begin_step("earth_base_m%d" % mission)
	var scene := await _load_scene(EARTH_SCENE)
	if not scene:
		return
	await _wait(SETTLE_SCENE)
	_screenshot(tag, {
		"phase": "earth_base",
		"mission": mission,
		"description": "Earth base hub, M%d tutorial prompt visible" % mission,
	})
	_check_overlaps(scene, tag)
	_check_stuck("earth_base_m%d" % mission)


func _phase_control_station(tag: String) -> void:
	_begin_step("control_station")
	var scene := await _load_scene(CONTROL_STATION)
	if not scene:
		return
	await _wait(SETTLE_PANEL)
	_screenshot(tag, {
		"phase": "control_station",
		"description": "Control Station panel — mission command interface",
	})
	_check_overlaps(scene, tag)
	_advance_panel(scene)
	await _wait(SETTLE_ANIM)


func _phase_launchpad(mission: int, tag: String) -> void:
	_begin_step("launchpad_m%d" % mission)
	_inject_rocket_state(mission)
	var scene := await _load_scene(LAUNCHPAD_SCENE)
	if not scene:
		return
	await _wait(SETTLE_SCENE)
	_screenshot(tag, {
		"phase": "launchpad",
		"mission": mission,
		"description": "Launchpad — rocket, contractor, and target selection for M%d" % mission,
	})
	_check_overlaps(scene, tag)

	# Screenshot the LaunchWizard if it auto-opens
	var wizard := _find_child_by_class(scene, "LaunchWizard")
	if not wizard:
		wizard = await _load_scene(WIZARD_SCENE)
		await _wait(SETTLE_PANEL)
	if wizard:
		_screenshot(tag + "_wizard", {
			"phase": "launch_wizard",
			"mission": mission,
			"description": "Launch wizard — rocket/contractor/target steps",
		})
		_check_overlaps(wizard, tag + "_wizard")
	_check_stuck("launchpad_m%d" % mission)


func _phase_transit(tag: String) -> void:
	_begin_step("transit")
	var scene := await _load_scene(ASCENT_SCENE)
	if not scene:
		scene = await _load_scene(TRANSIT_SCENE)
	if not scene:
		return
	await _wait(SETTLE_ANIM * 2.0)
	_screenshot(tag, {
		"phase": "transit",
		"description": "Rocket in transit to target",
	})
	_check_overlaps(scene, tag)


func _phase_mining(tag: String) -> void:
	_begin_step("mining")
	var scene := await _load_scene(MINING_SCENE)
	if not scene:
		return
	await _wait(SETTLE_SCENE)
	_screenshot(tag + "_start", {
		"phase": "mining_start",
		"description": "Mining minigame — scene loaded, before firing",
	})
	_check_overlaps(scene, tag + "_start")

	# Let the mining run for a bit to show active state
	await _wait(min(MINING_TIME * 0.4, 3.0))
	_screenshot(tag + "_active", {
		"phase": "mining_active",
		"description": "Mining minigame — laser active, minerals depleting",
	})
	_check_overlaps(scene, tag + "_active")
	_check_stuck("mining")

	# Trigger return
	var return_btn := _find_button(scene, ["Return", "ReturnButton", "btn_return", "EndMission"])
	if return_btn:
		return_btn.pressed.emit()
		_record_action("Clicked return-home button in mining scene")
	await _wait(SETTLE_ANIM)


func _phase_return(tag: String) -> void:
	_begin_step("return")
	var scene := await _load_scene(RETURN_SCENE)
	if not scene:
		return
	await _wait(SETTLE_ANIM * 1.5)
	_screenshot(tag, {
		"phase": "return",
		"description": "Rocket returning to Earth",
	})
	_check_overlaps(scene, tag)


func _phase_debrief(mission: int, tag: String) -> void:
	_begin_step("debrief_m%d" % mission)
	var scene := await _load_scene(DEBRIEF_SCENE)
	if not scene:
		return
	await _wait(SETTLE_SCENE)
	_screenshot(tag, {
		"phase": "debrief",
		"mission": mission,
		"description": "Mission debrief — payout breakdown, resolve action",
	})
	_check_overlaps(scene, tag)

	# Advance debrief
	var resolve_btn := _find_button(scene, ["Resolve", "Collect", "Continue", "btn_resolve"])
	if resolve_btn:
		resolve_btn.pressed.emit()
		_record_action("Clicked resolve/collect on debrief screen")
	await _wait(SETTLE_ANIM)
	_check_stuck("debrief_m%d" % mission)


func _phase_satellite_station(planets_mode: bool, tag: String) -> void:
	_begin_step("satellite_station_%s" % ("planets" if planets_mode else "asteroids"))
	var scene := await _load_scene(SATELLITE_SCENE)
	if not scene:
		return
	await _wait(SETTLE_SCENE)

	if planets_mode:
		# Toggle to planet targets
		var toggle := _find_button(scene, ["PlanetToggle", "TogglePlanets", "planet_toggle", "btn_planets"])
		if toggle:
			toggle.pressed.emit()
			_record_action("Toggled scanner to planet targets")
		await _wait(SETTLE_ANIM)

	_screenshot(tag, {
		"phase": "satellite_station",
		"planets_mode": planets_mode,
		"description": "Satellite Station — %s scan results, candidate list" % ("planet" if planets_mode else "asteroid"),
	})
	_check_overlaps(scene, tag)

	# Screenshot a candidate row if visible
	var candidate := _find_child_containing(scene, ["CandidateRow", "TargetRow", "ScanResult"])
	if candidate and candidate is Control:
		(candidate as Control).emit_signal("gui_input",
			_make_click_event((candidate as Control).get_global_rect().get_center()))
		await _wait(SETTLE_ANIM)
		_screenshot(tag + "_selected", {
			"phase": "satellite_station_selected",
			"description": "A candidate selected in the scanner list",
		})


func _phase_annotation(target_type: String, tag: String) -> void:
	_begin_step("annotation_%s" % target_type)
	_inject_annotation_candidate(target_type)
	var scene := await _load_scene(ASTEROID_DETAIL)
	if not scene:
		return
	await _wait(SETTLE_SCENE)
	_screenshot(tag + "_detail", {
		"phase": "annotation_detail",
		"target_type": target_type,
		"description": "%s candidate detail — lightcurve / image view" % target_type.capitalize(),
	})
	_check_overlaps(scene, tag + "_detail")

	# Interact with annotation controls
	var annotate_btn := _find_button(scene, [
		"AnnotateButton", "ClassifyButton", "btn_annotate", "MarkTransit",
		"SubmitClassification", "Classify"
	])
	if annotate_btn:
		annotate_btn.pressed.emit()
		_record_action("Clicked classify/annotate on %s candidate" % target_type)
		await _wait(SETTLE_PANEL)
		_screenshot(tag + "_annotating", {
			"phase": "annotating",
			"target_type": target_type,
			"description": "Annotation interface open for %s candidate" % target_type,
		})
		_check_overlaps(scene, tag + "_annotating")

	# Submit
	var submit_btn := _find_button(scene, [
		"Submit", "SubmitBtn", "btn_submit", "Confirm", "IsPlanet", "NotPlanet"
	])
	if submit_btn:
		submit_btn.pressed.emit()
		_record_action("Submitted classification for %s candidate" % target_type)
		await _wait(SETTLE_ANIM)
		_screenshot(tag + "_submitted", {
			"phase": "classification_submitted",
			"target_type": target_type,
			"description": "Classification submitted — reward / confirmation shown",
		})


func _phase_free_ops() -> void:
	_begin_step("free_ops_handoff")
	_inject_tutorial_state(5, 0, true)
	_inject_mission_progress(3, 5_000_000_000.0, 3)
	var scene := await _load_scene(EARTH_SCENE)
	if not scene:
		return
	await _wait(SETTLE_SCENE)
	_screenshot("earth_base_post_m3", {
		"phase": "earth_base_post_m3",
		"description": "Earth base after M3 complete — soft guidance, no tutorial rail",
	})
	_check_overlaps(scene, "earth_base_post_m3")

	# Look for Free Ops unlock overlay / handoff dialogue
	await _wait(SETTLE_PANEL)
	var overlay := _find_child_containing(scene, [
		"FreeOpsUnlock", "FreeOperations", "HandoffDialogue", "FreeOpsOverlay",
		"UnrestrictedAccess", "SystemUnlocked"
	])
	if overlay:
		_record_action("Free Operations overlay appeared")
		_screenshot("free_ops_unlocked", {
			"phase": "free_ops_unlocked",
			"description": "Free Operations unlocked — handoff dialogue shown to player",
		})
		_check_overlaps(overlay, "free_ops_unlocked")
	else:
		_issue("WARNING", "Free Operations overlay/dialogue not found after post-M3 state injection — may need manual trigger or overlay is hidden")
		_screenshot("free_ops_state_check", {
			"phase": "free_ops_state_check",
			"description": "Post-M3 earth base — Free Ops overlay was not detected automatically",
		})


# ---------------------------------------------------------------------------
# State injection helpers
# ---------------------------------------------------------------------------
func _inject_tutorial_state(stage: int, step: int = 0, skipped: bool = false) -> void:
	var cfg := ConfigFile.new()
	cfg.set_value("state", "current_stage", stage)
	cfg.set_value("state", "current_step_index", step)
	cfg.set_value("state", "stage_lock", 0)
	cfg.set_value("state", "skipped", skipped)
	cfg.set_value("state", "completed_actions", {})
	cfg.set_value("state", "completed_actions_by_stage", {})
	cfg.set_value("state", "completed_steps_by_stage", {})
	cfg.save("user://tutorial_v2.cfg")


func _inject_mission_progress(
	completed: int,
	francs: float = 2_000_000_000.0,
	level: int = -1
) -> void:
	if level < 0:
		level = min(completed + 1, 3)
	var xp_table := [0, 80, 200, 360]
	var rockets_by_level := [["starterrocket1"], ["starterrocket1","starterrocket2"], ["starterrocket1","starterrocket2","starterrocket3"]]
	var progress := {
		"completed_mission_count": completed,
		"francs": francs,
		"experience_level": level,
		"experience_xp": xp_table[min(completed, 3)],
		"rocket_unlocks": rockets_by_level[min(level - 1, 2)],
		"structures_built": (["control_station"] if completed >= 1 else []),
		"scanner_station_built": completed >= 2,
		"free_ops_unlocked": completed >= 3,
	}
	var file := FileAccess.open("user://sandbox_progress.json", FileAccess.WRITE)
	if file:
		file.store_string(JSON.stringify(progress, "\t"))
		file.close()


func _inject_rocket_state(mission: int) -> void:
	# Write a minimal active-rocket config so the launchpad has something to show
	var rocket_id := "starterrocket%d" % min(mission, 3)
	var cfg := ConfigFile.new()
	cfg.set_value("active_rocket", "id", rocket_id)
	cfg.set_value("active_rocket", "mission_stage", mission)
	cfg.save("user://sandbox_rocket.cfg")


func _inject_annotation_candidate(target_type: String) -> void:
	# Seed a candidate into the scan results so the detail view has data
	var candidate := {}
	if target_type == "planet":
		var targets := RocketsManager.get_mission4_targets()
		candidate = targets[0] if targets.size() > 0 else {
			"id": "tess-toi-1234.01",
			"label": "TOI-1234.01",
			"type": "planet_candidate",
			"distance_au": 180.0,
			"science_blurb": "TESS planet candidate with transit signal.",
		}
	else:
		var targets := RocketsManager.get_mission3_targets()
		candidate = targets[0] if targets.size() > 0 else {
			"id": "asteroid-sandbox-01",
			"label": "2026 SB01",
			"type": "asteroid",
			"distance_au": 12.5,
			"science_blurb": "Unconfirmed near-Earth candidate.",
		}
	var file := FileAccess.open("user://sandbox_active_candidate.json", FileAccess.WRITE)
	if file:
		file.store_string(JSON.stringify(candidate, "\t"))
		file.close()


# ---------------------------------------------------------------------------
# Scene management
# ---------------------------------------------------------------------------
func _load_scene(path: String) -> Node:
	if not ResourceLoader.exists(path):
		_issue("CRITICAL", "Scene not found: %s" % path)
		return null

	# Clean up previous scene
	if _active_scene and is_instance_valid(_active_scene):
		if _active_scene.get_parent():
			_active_scene.get_parent().remove_child(_active_scene)
		_active_scene.queue_free()
		_active_scene = null
		get_tree().current_scene = self
		await _wait(0.3)

	# Remove stale CanvasLayer overlays
	for child in get_tree().root.get_children():
		if child is CanvasLayer and child != self and not child.is_ancestor_of(self):
			child.queue_free()

	var packed : PackedScene = load(path)
	if not packed:
		_issue("CRITICAL", "Failed to instantiate scene: %s" % path)
		return null

	var instance := packed.instantiate()
	get_tree().root.add_child(instance)
	get_tree().current_scene = instance

	if instance is Control:
		var vp := get_viewport().get_visible_rect()
		(instance as Control).set_deferred("position", vp.position)
		(instance as Control).set_deferred("size", vp.size)

	_active_scene = instance
	return instance


# ---------------------------------------------------------------------------
# Screenshot
# ---------------------------------------------------------------------------
func _screenshot(name: String, meta: Dictionary = {}) -> void:
	_screenshot_index += 1
	var filename := "%03d_%s.png" % [_screenshot_index, name]
	var full_path := "%s/%s" % [SCREENSHOT_DIR, filename]

	# One frame to ensure rendering is current
	await get_tree().process_frame
	await get_tree().process_frame

	var img := get_viewport().get_texture().get_image()
	img.save_png(full_path)

	var entry := meta.duplicate()
	entry["index"]    = _screenshot_index
	entry["filename"] = filename
	entry["step"]     = name
	entry["timestamp"] = Time.get_ticks_msec()
	_manifest.append(entry)

	print("[SANDBOX] 📸 %s" % filename)
	_report("- Screenshot: `%s`" % filename)

	if meta.get("description", "") != "":
		_report("  > %s" % meta["description"])


# ---------------------------------------------------------------------------
# Overlap detection
# ---------------------------------------------------------------------------
func _check_overlaps(root: Node, label: String) -> void:
	var rects : Array[Rect2] = []
	var names : Array[String] = []
	_collect_visible_controls(root, rects, names)

	for i in range(rects.size()):
		for j in range(i + 1, rects.size()):
			var intersection := rects[i].intersection(rects[j])
			if intersection.size.x > 6 and intersection.size.y > 6:
				var area := intersection.size.x * intersection.size.y
				if area > 300:
					_issue(
						"WARNING",
						"[%s] UI overlap: %s ↔ %s (%.0f px²)" % [
							label,
							names[i].get_file(),
							names[j].get_file(),
							area
						]
					)


func _collect_visible_controls(
	node: Node,
	rects: Array[Rect2],
	names: Array[String]
) -> void:
	if node is Control:
		var c := node as Control
		if c.visible and c.size.x > 12 and c.size.y > 12:
			var r := c.get_global_rect()
			if r.size.x > 0 and r.size.y > 0:
				rects.append(r)
				names.append(str(c.get_path()))
	for child in node.get_children():
		_collect_visible_controls(child, rects, names)


# ---------------------------------------------------------------------------
# Stuck detection
# ---------------------------------------------------------------------------
func _begin_step(label: String) -> void:
	_step_start = Time.get_ticks_msec()
	_report("\n### %s" % label)
	print("[SANDBOX] === %s ===" % label)


func _check_stuck(label: String) -> void:
	var elapsed := Time.get_ticks_msec() - _step_start
	if elapsed > STUCK_THRESHOLD_MS:
		_issue(
			"WARNING",
			"[STUCK] '%s' took %ds — a real player would likely be confused or lost at this step" % [
				label, elapsed / 1000
			]
		)


# ---------------------------------------------------------------------------
# UI helpers
# ---------------------------------------------------------------------------
func _find_button(root: Node, names: Array[String]) -> BaseButton:
	for name_hint in names:
		var found := _find_child_named(root, name_hint)
		if found and found is BaseButton:
			return found as BaseButton
		# Also search by text label for Label-in-button patterns
	return null


func _find_child_named(root: Node, name_hint: String) -> Node:
	for child in root.get_children():
		if name_hint.to_lower() in child.name.to_lower():
			return child
		var deep := _find_child_named(child, name_hint)
		if deep:
			return deep
	return null


func _find_child_by_class(root: Node, class_hint: String) -> Node:
	for child in root.get_children():
		if class_hint.to_lower() in child.get_class().to_lower():
			return child
		var deep := _find_child_by_class(child, class_hint)
		if deep:
			return deep
	return null


func _find_child_containing(root: Node, hints: Array[String]) -> Node:
	for hint in hints:
		var found := _find_child_named(root, hint)
		if found:
			return found
	return null


func _advance_panel(scene: Node) -> void:
	var close_btn := _find_button(scene, ["Close", "Back", "Done", "Continue", "btn_close"])
	if close_btn:
		close_btn.pressed.emit()
		_record_action("Advanced/closed panel via button")


func _make_click_event(pos: Vector2) -> InputEventMouseButton:
	var ev := InputEventMouseButton.new()
	ev.button_index = MOUSE_BUTTON_LEFT
	ev.pressed = true
	ev.position = pos
	return ev


# ---------------------------------------------------------------------------
# Logging helpers
# ---------------------------------------------------------------------------
func _report(line: String) -> void:
	_report_lines.append(line)
	print(line)


func _record_action(action: String) -> void:
	_report("  [ACTION] %s" % action)


func _issue(level: String, msg: String) -> void:
	var entry := {"level": level, "message": msg, "timestamp": Time.get_ticks_msec()}
	_issues.append(entry)
	_report("  [%s] %s" % [level, msg])
	print("[SANDBOX][%s] %s" % [level, msg])


# ---------------------------------------------------------------------------
# Output / finalize
# ---------------------------------------------------------------------------
func _finalize() -> void:
	var critical_count := 0
	for issue in _issues:
		if issue.get("level", "") == "CRITICAL":
			critical_count += 1

	_report("\n---")
	_report("## Summary")
	_report("- Screenshots taken: %d" % _screenshot_index)
	_report("- Issues found: %d (%d CRITICAL)" % [_issues.size(), critical_count])
	_report("")
	if _issues.size() > 0:
		_report("## Issues")
		for issue in _issues:
			_report("- **%s**: %s" % [issue.get("level","?"), issue.get("message","")])

	# Write report
	var report_file := FileAccess.open(REPORT_PATH, FileAccess.WRITE)
	if report_file:
		report_file.store_string("\n".join(_report_lines))
		report_file.close()

	# Write manifest
	var manifest_file := FileAccess.open(MANIFEST_PATH, FileAccess.WRITE)
	if manifest_file:
		manifest_file.store_string(JSON.stringify({
			"run_timestamp": Time.get_datetime_string_from_system(),
			"screenshot_count": _screenshot_index,
			"issue_count": _issues.size(),
			"critical_count": critical_count,
			"screenshots": _manifest,
		}, "\t"))
		manifest_file.close()

	# Write issues
	var issues_file := FileAccess.open(ISSUES_PATH, FileAccess.WRITE)
	if issues_file:
		issues_file.store_string(JSON.stringify(_issues, "\t"))
		issues_file.close()

	print("[SANDBOX] Done. %d screenshots, %d issues (%d CRITICAL)." % [
		_screenshot_index, _issues.size(), critical_count
	])
	if critical_count > 0:
		get_tree().quit(1)
		return


# ---------------------------------------------------------------------------
# Coroutine wait
# ---------------------------------------------------------------------------
func _wait(seconds: float) -> void:
	var tree := get_tree()
	if tree == null:
		return
	await tree.create_timer(seconds, true, false, true).timeout
