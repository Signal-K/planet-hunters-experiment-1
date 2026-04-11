extends Node

const REPORT_PATH := "user://live_consensus_verify_report.md"
const RocketsManager = preload("res://Scripts/Utils/RocketsManager.gd")
const ClassificationConsensus = preload("res://Scripts/Utils/ClassificationConsensus.gd")
const ClassificationConsensusNotificationScene = preload("res://Scenes/UI/ClassificationConsensusNotification.tscn")

const ANOMALY_ID := "101445733"
const VERDICT := "planet"

var _report_lines: Array[String] = []
var _issues: Array[String] = []

func _ready() -> void:
	_run.call_deferred()

func _run() -> void:
	_report("# Live Consensus Verify")
	_report("Anomaly: %s" % ANOMALY_ID)
	RocketsManager.set_tess_classification(ANOMALY_ID, VERDICT)
	_report("Seeded local player classification state. ✓")

	var state := {"done": false, "updated": []}
	ClassificationConsensus.check_for_updates(get_tree(), func(updated: Array) -> void:
		state["done"] = true
		state["updated"] = updated
	)

	var waited := 0.0
	while not bool(state.get("done", false)) and waited < 15.0:
		await get_tree().create_timer(0.25).timeout
		waited += 0.25

	if not bool(state.get("done", false)):
		_issue("Consensus check timed out after 15s.")
		_finish(1)
		return

	var updated: Array = state.get("updated", [])
	var entry := ClassificationConsensus.get_stored(ANOMALY_ID)
	if entry.is_empty():
		_issue("No stored consensus entry found for anomaly %s." % ANOMALY_ID)
		_finish(1)
		return

	_report("Stored consensus entry found. ✓")
	_report("planet_count=%s not_planet_count=%s consensus=%s" % [
		str(entry.get("planet_count", 0)),
		str(entry.get("not_planet_count", 0)),
		str(entry.get("consensus_verdict", "")),
	])

	if str(entry.get("consensus_verdict", "")) != VERDICT:
		_issue("Consensus verdict did not resolve to '%s'." % VERDICT)
	if int(entry.get("planet_count", 0)) < 3:
		_issue("Expected at least 3 planet votes for live consensus.")

	var pending := ClassificationConsensus.get_new_notifications()
	if pending.is_empty():
		_issue("No pending consensus notification generated from live data.")
	else:
		_report("Pending notification generated from live data. ✓")

	var notify := ClassificationConsensusNotificationScene.instantiate()
	get_tree().root.add_child(notify)
	if notify.has_method("show_results"):
		notify.show_results(updated if not updated.is_empty() else pending, 720, "LIVE VERIFY")
		await get_tree().process_frame
		await get_tree().process_frame
		var title := _find_label_with_text(notify, "CLASSIFICATION RESULTS")
		if title == null:
			_issue("Consensus notification failed to render expected title.")
		else:
			_report("Consensus notification rendered. ✓")
	notify.queue_free()

	_finish(0 if _issues.is_empty() else 1)

func _find_label_with_text(root: Node, search: String) -> Label:
	if root == null:
		return null
	if root is Label and search.to_lower() in (root as Label).text.to_lower():
		return root as Label
	for child in root.get_children():
		var found := _find_label_with_text(child, search)
		if found:
			return found
	return null

func _report(line: String) -> void:
	print(line)
	_report_lines.append(line)

func _issue(line: String) -> void:
	print("ISSUE: " + line)
	_report_lines.append("ISSUE: " + line)
	_issues.append(line)

func _finish(code: int) -> void:
	var file := FileAccess.open(REPORT_PATH, FileAccess.WRITE)
	if file:
		file.store_string("\n".join(_report_lines))
		file.close()
	print("Report: %s" % REPORT_PATH)
	get_tree().quit(code)
