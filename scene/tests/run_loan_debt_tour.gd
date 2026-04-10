extends Node
## Loan Debt Tour
## Standalone UX tour that walks through the full zero-balance → emergency loan
## → debt recovery scenario, independent of the main UX tour.
##
## Simulates:
##   1. Player finishes two missions and exhausts their balance
##   2. Earth base opens → EmergencyLoanOfferDialog auto-fires
##   3. Tour screenshots the dialog (header, credit card, warning, guidance)
##   4. User accepts the loan
##   5. Tour screenshots earth base after acceptance (dialog dismissed)
##   6. Tour screenshots the NO THANKS path (decline + guidance remains on screen)
##
## Produces:
##   user://ux_screenshots/loan_debt_tour/*.png
##   user://loan_debt_report.md
##
## Run via:
##   DISPLAY=:99 godot --path ./scene res://tests/LoanDebtTour.tscn

const SCREENSHOT_DIR := "user://ux_screenshots/loan_debt_tour"
const REPORT_PATH    := "user://loan_debt_report.md"

const RocketsManager := preload("res://Scripts/Utils/RocketsManager.gd")
const AppControllerHelper := preload("res://Scripts/Utils/AppControllerHelper.gd")

const EARTH_MAIN_SCENE := "res://Scenes/Earth/earth_base_1.tscn"

const SCENE_SETTLE := 2.5
const ANIM_SETTLE  := 1.0

var _report_lines: Array[String] = []
var _issues: Array[String] = []
var _active_scene: Node = null
var _screenshot_index := 0

# ---------------------------------------------------------------------------
# Entry
# ---------------------------------------------------------------------------
func _ready() -> void:
	DirAccess.make_dir_recursive_absolute(SCREENSHOT_DIR)
	_run_tour.call_deferred()

# ---------------------------------------------------------------------------
# Tour
# ---------------------------------------------------------------------------
func _run_tour() -> void:
	_report("# Loan Debt Tour")
	_report("Simulates running out of money → loan dialog → accept → decline paths.\n")

	# ==================================================================
	# Phase 1 — Set up two-mission-complete state with zero balance
	# Represents a player who has spent everything and can't afford a rocket.
	# ==================================================================
	_report("## Phase 1 — Earth base, balance exhausted (dialog should auto-appear)")
	_setup_broke_state()
	var earth := await _load_scene(EARTH_MAIN_SCENE)
	if earth == null:
		_issue("CRITICAL: Could not load earth_base_1 — aborting.")
		_finish()
		return

	await get_tree().create_timer(SCENE_SETTLE).timeout

	# Verify loan dialog appeared
	var root := get_tree().root
	var dialog_visible := _find_label_with_text(root, "EMERGENCY_LOAN_AVAILABLE") != null
	if dialog_visible:
		_report("  ✓ EmergencyLoanOfferDialog auto-appeared (balance < rocket cost).")
	else:
		_issue("EmergencyLoanOfferDialog did NOT appear — _maybe_offer_loan() may not have fired.")

	# Screenshot: dialog over earth base
	await _screenshot("01_loan_dialog_appears")

	# -------------------------------------------------------------------
	# Verify each section of the dialog
	# -------------------------------------------------------------------
	_report("  Checking dialog sections...")

	if _find_label_with_text(root, "EMERGENCY_LOAN_AVAILABLE"):
		_report("  ✓ Header: EMERGENCY_LOAN_AVAILABLE visible (green).")
	else:
		_issue("Dialog missing EMERGENCY_LOAN_AVAILABLE header.")

	if _find_label_with_text(root, "AUTH_REF"):
		_report("  ✓ Sidebar: AUTH_REF label visible.")
	else:
		_issue("Dialog sidebar missing AUTH_REF — terminal identity not shown.")

	if _find_label_with_text(root, "TERMINAL_STATION"):
		_report("  ✓ Sidebar: TERMINAL_STATION label visible.")
	else:
		_issue("Dialog sidebar missing TERMINAL_STATION label.")

	if _find_label_with_text(root, "CREDIT_LINE_STATION_OMEGA"):
		_report("  ✓ Credit card: CREDIT_LINE_STATION_OMEGA label visible.")
	else:
		_issue("Dialog credit card missing CREDIT_LINE_STATION_OMEGA label.")

	if _find_label_with_text(root, "1,500,000,000"):
		_report("  ✓ Credit card: Loan amount 1,500,000,000 F visible.")
	else:
		_issue("Dialog credit card missing loan amount — player can't see what they're borrowing.")

	if _find_label_with_text(root, "DEDUCTED FROM YOUR NEXT MISSION PAYOUT"):
		_report("  ✓ Credit card: Repayment note visible.")
	else:
		_issue("Dialog credit card missing repayment note.")

	if _find_label_with_text(root, "asset seizure"):
		_report("  ✓ Warning card: asset seizure consequence visible (red).")
	else:
		_issue("Dialog missing asset seizure warning — player doesn't know the stakes.")

	if _find_label_with_text(root, "How to recover"):
		_report("  ✓ Guidance card: 'How to recover' section visible.")
	else:
		_issue("Dialog missing debt-recovery guidance — player has no path forward.")

	var accept_btn := _find_button_with_text(root, "ACCEPT LOAN")
	var decline_btn := _find_button_with_text(root, "NO THANKS")

	if accept_btn:
		_report("  ✓ ACCEPT LOAN button present.")
	else:
		_issue("Dialog missing ACCEPT LOAN button.")

	if decline_btn:
		_report("  ✓ NO THANKS button present.")
	else:
		_issue("Dialog missing NO THANKS button.")

	# ==================================================================
	# Phase 2 — Zoom in on dialog (closer crop feel via same screenshot)
	# ==================================================================
	_report("\n## Phase 2 — Dialog detail (credit card + warning + guidance)")
	await _screenshot("02_loan_dialog_detail")

	# ==================================================================
	# Phase 3 — Accept loan path
	# ==================================================================
	_report("\n## Phase 3 — Accept loan → earth base restored")
	if accept_btn and is_instance_valid(accept_btn):
		_click(accept_btn)
		await get_tree().create_timer(ANIM_SETTLE).timeout
		# Verify dialog is gone
		if _find_label_with_text(get_tree().root, "EMERGENCY_LOAN_AVAILABLE") == null:
			_report("  ✓ Dialog dismissed after ACCEPT LOAN.")
		else:
			_issue("Dialog still visible after accepting — close() may not have fired.")
		# Verify balance increased (AppController should have loan_balance > 0)
		var app := AppControllerHelper.get_instance()
		if app and app.has_method("has_outstanding_loan") and app.has_outstanding_loan():
			_report("  ✓ Outstanding loan recorded in AppController.")
		else:
			_issue("AppController shows no outstanding loan after accept — take_loan() may not have run.")
		await _screenshot("03_earth_base_after_accept")
	else:
		_report("  [skip] ACCEPT LOAN button not available — skipping accept path.")

	# ==================================================================
	# Phase 4 — Decline path: re-load with zero balance, click NO THANKS
	# ==================================================================
	_report("\n## Phase 4 — Decline loan → dialog dismissed, balance still zero")
	_setup_broke_state()
	var earth2 := await _load_scene(EARTH_MAIN_SCENE)
	if earth2:
		await get_tree().create_timer(SCENE_SETTLE).timeout
		await _screenshot("04_loan_dialog_decline_view")
		var decline := _find_button_with_text(get_tree().root, "NO THANKS")
		if decline and is_instance_valid(decline):
			_click(decline)
			await get_tree().create_timer(ANIM_SETTLE).timeout
			if _find_label_with_text(get_tree().root, "EMERGENCY_LOAN_AVAILABLE") == null:
				_report("  ✓ Dialog dismissed after NO THANKS.")
			else:
				_issue("Dialog still visible after NO THANKS — decline handler broken.")
			await _screenshot("05_earth_base_after_decline")
		else:
			_report("  [skip] NO THANKS button not found in reload.")

	_finish()

# ---------------------------------------------------------------------------
# State injection
# ---------------------------------------------------------------------------
func _setup_broke_state() -> void:
	## Inject: 2 missions complete, zero franc balance, no outstanding loan.
	## Causes _maybe_offer_loan() to trigger on next earth base load.
	RocketsManager.reset_state()
	RocketsManager.clear_returned_mission()
	RocketsManager.clear_preview_target()
	var state := RocketsManager.load_state()
	state["completed_mission_badges"] = ["mission_1", "mission_2"]
	state["mission_progress_completed"] = 2
	state["scanner_unlocked"] = false
	state["scanner_station_built"] = false
	state["operation_mode"] = "contract"
	state["unlocked"] = ["starterrocket1", "starterrocket2"]
	state["detected_targets"] = []
	state["selected_target"] = ""
	state["trip_contract_offer"] = {}
	state["placed"] = []
	RocketsManager.save_state(state)

	# Tutorial: stage 2, skipped (no overlay blocking the dialog)
	var tut := ConfigFile.new()
	tut.set_value("state", "current_stage", 2)
	tut.set_value("state", "current_step_index", 0)
	tut.set_value("state", "skipped", true)
	tut.set_value("state", "stage_lock", 0)
	tut.set_value("state", "completed_actions", {})
	tut.set_value("state", "completed_actions_by_stage", {})
	tut.set_value("state", "completed_steps_by_stage", {})
	tut.save("user://tutorial_v2.cfg")

	# Zero balance, no loan — triggers can_take_loan()
	var app := AppControllerHelper.get_instance()
	if app and app.has_method("set_franc_balance_from_react"):
		app.set_franc_balance_from_react(0)
	if app and "loan_balance" in app:
		app.loan_balance = 0
	var cfg := ConfigFile.new()
	cfg.set_value("currency", "balance", 0)
	cfg.set_value("currency", "loan_balance", 0)
	cfg.save("user://franc_balance.cfg")

	# Clear tutorial runtime nodes that might block the dialog
	for node_name in ["TutorialCoachOverlay", "TutorialController"]:
		var node = get_tree().root.get_node_or_null(node_name)
		if node:
			node.queue_free()
	await get_tree().process_frame
	await get_tree().process_frame

# ---------------------------------------------------------------------------
# Scene loading
# ---------------------------------------------------------------------------
func _load_scene(path: String) -> Node:
	if _active_scene and is_instance_valid(_active_scene):
		if _active_scene.get_parent():
			_active_scene.get_parent().remove_child(_active_scene)
		_active_scene.queue_free()
		_active_scene = null
		get_tree().current_scene = self
		await get_tree().create_timer(0.3).timeout
	# Remove stale CanvasLayer overlays from previous scenes
	for child in get_tree().root.get_children():
		if child is CanvasLayer and child != self and not child.is_ancestor_of(self):
			child.queue_free()
	var packed: PackedScene = load(path)
	if not packed:
		_issue("CRITICAL: Could not load scene: %s" % path)
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
# Interaction helpers
# ---------------------------------------------------------------------------
func _click(btn: Button) -> void:
	if not btn or not is_instance_valid(btn):
		return
	btn.grab_focus()
	btn.emit_signal("pressed")

func _find_button_with_text(root: Node, search_text: String) -> Button:
	if not root:
		return null
	if root is Button and search_text.to_lower() in (root as Button).text.to_lower():
		return root as Button
	for child in root.get_children():
		var found := _find_button_with_text(child, search_text)
		if found:
			return found
	return null

func _find_label_with_text(root: Node, search_text: String) -> Label:
	if not root:
		return null
	if root is Label and search_text.to_lower() in (root as Label).text.to_lower():
		return root as Label
	for child in root.get_children():
		var found := _find_label_with_text(child, search_text)
		if found:
			return found
	return null

# ---------------------------------------------------------------------------
# Screenshot
# ---------------------------------------------------------------------------
func _screenshot(label: String) -> void:
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

# ---------------------------------------------------------------------------
# Reporting
# ---------------------------------------------------------------------------
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
