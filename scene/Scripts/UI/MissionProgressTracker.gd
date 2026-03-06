extends CanvasLayer

const PanelStyle = preload("res://Scripts/UI/PanelStyle.gd")
const ROCKETS_MANAGER = preload("res://Scripts/Utils/RocketsManager.gd")
const MISSION_OBJECTIVES := {
	1: "Complete base tour, sign a contractor, and deliver the starter order.",
	2: "Repeat loop with upgraded rocket.",
	3: "Build scanner and launch from scanned targets.",
	4: "Switch to planetary targets and complete mission.",
	5: "Accept contractor request and complete contract mission."
}
const MISSION_STEP_KEYS := {
	1: ["tour_open_control_station", "tour_close_control_station", "accept_starter_contractor", "create_rocket", "launch_rocket_from_earth", "mine_target", "return_rocket_home", "resolve_mission_debrief"],
	2: ["launch_rocket_from_earth", "mine_target", "return_rocket_home", "resolve_mission_debrief"],
	3: ["build_scanner_station", "scan_targets", "select_launch_target"],
	4: ["scan_targets", "select_launch_target", "mine_target", "return_rocket_home", "resolve_mission_debrief"],
	5: ["select_launch_target", "mine_target", "return_rocket_home", "resolve_mission_debrief"]
}

@onready var panel: PanelContainer = $Panel
@onready var toggle_button: Button = $Panel/Margin/VBox/Header/ToggleButton
@onready var title_label: Label = $Panel/Margin/VBox/Header/TitleLabel
@onready var details: VBoxContainer = $Panel/Margin/VBox/Details
@onready var objective_label: Label = $Panel/Margin/VBox/Details/ObjectiveLabel
@onready var progress_label: Label = $Panel/Margin/VBox/Details/ProgressLabel
@onready var checklist_label: Label = $Panel/Margin/VBox/Details/ChecklistLabel

var _collapsed := false
var _accumulated_time := 0.0
var _tutorial_active := false

func _ready() -> void:
	layer = 50
	if panel:
		PanelStyle.apply_panel(panel)
	if title_label:
		PanelStyle.apply_body(title_label)
		title_label.add_theme_font_size_override("font_size", 16)
	if objective_label:
		PanelStyle.apply_muted(objective_label)
	if progress_label:
		PanelStyle.apply_muted(progress_label)
	if checklist_label:
		PanelStyle.apply_muted(checklist_label)
	if toggle_button:
		PanelStyle.apply_button(toggle_button, false)
		toggle_button.text = "Hide"
		toggle_button.pressed.connect(_on_toggle_pressed)
	var app = get_node_or_null("/root/AppController")
	if app and app.has_signal("tutorial_state_updated"):
		app.tutorial_state_updated.connect(_on_tutorial_state_updated)
		if app.has_method("get_tutorial_state"):
			_on_tutorial_state_updated(app.get_tutorial_state())
	_refresh()

func _process(delta: float) -> void:
	if _tutorial_active:
		return
	_accumulated_time += delta
	if _accumulated_time < 0.5:
		return
	_accumulated_time = 0.0
	_refresh()

func _on_toggle_pressed() -> void:
	_collapsed = not _collapsed
	if details:
		details.visible = not _collapsed
	if toggle_button:
		toggle_button.text = "Show" if _collapsed else "Hide"

func _refresh() -> void:
	if _tutorial_active:
		visible = false
		return
	visible = true
	var stage = int(ROCKETS_MANAGER.get_mission_stage())
	var objective = str(MISSION_OBJECTIVES.get(stage, "Complete current mission objectives."))
	var keys: Array = MISSION_STEP_KEYS.get(stage, [])
	var seen_count := 0
	var checklist_lines := []
	for key_any in keys:
		var key = str(key_any)
		var seen = _has_seen_guide_action(key)
		if seen:
			seen_count += 1
		checklist_lines.append("%s %s" % ["[x]" if seen else "[ ]", _label_for_action(key)])
	var percent := 100
	if keys.size() > 0:
		percent = int(round(float(seen_count) / float(keys.size()) * 100.0))
	if title_label:
		title_label.text = "Mission %d Tracker" % stage
	if objective_label:
		objective_label.text = "Objective: %s" % objective
	if progress_label:
		progress_label.text = "Progress: %d%% (%d/%d)" % [percent, seen_count, keys.size()]
	if checklist_label:
		checklist_label.text = "\n".join(checklist_lines)

func _on_tutorial_state_updated(state: Dictionary) -> void:
	var skipped = bool(state.get("skipped", false))
	var step: Dictionary = state.get("current_step", {})
	_tutorial_active = not skipped and not step.is_empty()
	visible = not _tutorial_active

func _has_seen_guide_action(action_key: String) -> bool:
	var app = get_node_or_null("/root/AppController")
	if app and app.has_method("has_seen_guide_action"):
		return bool(app.has_seen_guide_action(action_key))
	return false

func _label_for_action(action_key: String) -> String:
	match action_key:
		"tour_open_control_station":
			return "Open control station"
		"tour_close_control_station":
			return "Close control station panel"
		"open_launchpad":
			return "Open launchpad"
		"accept_starter_contractor":
			return "Sign starter contractor"
		"create_rocket":
			return "Create rocket"
		"launch_rocket_from_earth":
			return "Launch mission"
		"mine_target":
			return "Mine target"
		"return_rocket_home":
			return "Return to Earth"
		"resolve_mission_debrief":
			return "Complete debrief"
		"build_scanner_station":
			return "Build scanner station"
		"scan_targets":
			return "Scan targets"
		"select_launch_target":
			return "Select launch target"
	return action_key
