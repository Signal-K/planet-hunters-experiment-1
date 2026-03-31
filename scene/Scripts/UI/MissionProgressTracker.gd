extends CanvasLayer

const PanelStyle = preload("res://Scripts/UI/PanelStyle.gd")
const ROCKETS_MANAGER = preload("res://Scripts/Utils/RocketsManager.gd")
const UILayout = preload("res://Scripts/UI/UILayout.gd")
const MISSION_OBJECTIVES := {
	1: "Pick a contractor, launch the starter rocket, and deliver the first order.",
	2: "Build the Control Station, then prep Starter Rocket 2 and complete the delivery loop.",
	3: "Pick a contractor, fly to a NASA TESS planet candidate, and complete the run.",
	4: "Build the Scanner Station, scan for targets, then mine with drone assistance."
}
const MISSION_STEP_KEYS := {
	1: ["accept_contractor_offer", "create_rocket", "select_launch_target", "launch_rocket_from_earth", "mine_target", "return_rocket_home", "resolve_mission_debrief"],
	2: ["build_control_station", "accept_contractor_offer", "create_rocket", "select_launch_target", "launch_rocket_from_earth", "mine_target", "return_rocket_home", "resolve_mission_debrief"],
	3: ["accept_contractor_offer", "select_launch_target", "launch_rocket_from_earth", "mine_target", "return_rocket_home", "resolve_mission_debrief"],
	4: ["build_scanner_station", "scan_targets", "select_launch_target", "launch_rocket_from_earth", "mine_target", "return_rocket_home", "resolve_mission_debrief"]
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
var _tutorial_skipped := false

func _apply_layout() -> void:
	var vp := get_viewport()
	if vp == null or panel == null:
		return
	var r := UILayout.zone(UILayout.Zone.TUTORIAL_COACH, vp.get_visible_rect().size)
	panel.position = r.position
	panel.size = r.size

func _ready() -> void:
	layer = 50
	if panel:
		panel.add_theme_stylebox_override(
			"panel",
			PanelStyle.create_glass_panel_style(Color(0.05, 0.09, 0.14, 0.94), 0.64, 18, 20, 16)
		)
	if title_label:
		PanelStyle.apply_body_on_dark(title_label)
		title_label.add_theme_font_size_override("font_size", 16)
	if objective_label:
		PanelStyle.apply_muted_on_dark(objective_label)
	if progress_label:
		PanelStyle.apply_muted_on_dark(progress_label)
	if checklist_label:
		PanelStyle.apply_muted_on_dark(checklist_label)
	if toggle_button:
		PanelStyle.apply_outline_button(toggle_button)
		toggle_button.text = "Hide"
		toggle_button.pressed.connect(_on_toggle_pressed)
	var app = get_node_or_null("/root/AppController")
	if app and app.has_signal("tutorial_state_updated"):
		app.tutorial_state_updated.connect(_on_tutorial_state_updated)
		if app.has_method("get_tutorial_state"):
			_on_tutorial_state_updated(app.get_tutorial_state())
	_apply_layout()
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

const HIDE_SCENES := ["rocket_ascent", "rocket_transit", "rocket_return", "asteroid_preview", "SidescrollMining"]

func _get_current_scene_basename() -> String:
	var tree = get_tree()
	if tree and tree.current_scene:
		return tree.current_scene.scene_file_path.get_file().get_basename()
	return ""

func _refresh() -> void:
	if _tutorial_active:
		visible = false
		return
	# This tracker is an auxiliary helper and should not compete with the
	# authored linear tutorial. Only show it after tutorial is skipped or
	# when free-operations has been unlocked.
	if not _tutorial_skipped and not ROCKETS_MANAGER.is_free_operations_unlocked():
		visible = false
		return
	var basename := _get_current_scene_basename()
	# Always hide in transit/cinematic/gameplay scenes.
	if basename in HIDE_SCENES:
		visible = false
		return
	# Hide when the player is already in the right scene to complete the next step.
	var app = get_node_or_null("/root/AppController")
	if app and app.has_method("get_tutorial_state"):
		var tstate: Dictionary = app.get_tutorial_state()
		var step: Dictionary = tstate.get("current_step", {})
		var valid_scenes: Array = step.get("valid_scenes", [])
		if not valid_scenes.is_empty() and basename in valid_scenes:
			visible = false
			return
	visible = true
	_apply_layout()
	var stage = int(ROCKETS_MANAGER.get_mission_stage())
	var objective = str(MISSION_OBJECTIVES.get(stage, "Complete current mission objectives."))
	var keys: Array = MISSION_STEP_KEYS.get(stage, [])
	var seen_count := 0
	var checklist_lines := []
	for key_any in keys:
		var key = str(key_any)
		var seen = _has_seen_guide_action_for_stage(key, stage)
		if seen:
			seen_count += 1
		checklist_lines.append("%s %s" % ["[x]" if seen else "[ ]", _label_for_action(key)])
	var percent := 100
	if keys.size() > 0:
		percent = int(round(float(seen_count) / float(keys.size()) * 100.0))
	if title_label:
		title_label.text = "Free Operations Tracker" if ROCKETS_MANAGER.is_free_operations_unlocked() else "Mission %d Tracker" % stage
	if objective_label:
		objective_label.text = "Objective: %s" % objective
	if progress_label:
		progress_label.text = "Progress: %d%% (%d/%d)" % [percent, seen_count, keys.size()]
	if checklist_label:
		checklist_label.text = "\n".join(checklist_lines)

func _on_tutorial_state_updated(state: Dictionary) -> void:
	var skipped = bool(state.get("skipped", false))
	var step: Dictionary = state.get("current_step", {})
	_tutorial_skipped = skipped
	_tutorial_active = not skipped and not step.is_empty()
	visible = not _tutorial_active and (_tutorial_skipped or ROCKETS_MANAGER.is_free_operations_unlocked())

func _has_seen_guide_action(action_key: String) -> bool:
	var app = get_node_or_null("/root/AppController")
	if app and app.has_method("has_seen_guide_action"):
		return bool(app.has_seen_guide_action(action_key))
	return false

func _has_seen_guide_action_for_stage(action_key: String, stage: int) -> bool:
	var app = get_node_or_null("/root/AppController")
	if app and app.has_method("has_seen_guide_action_for_stage"):
		if bool(app.has_seen_guide_action_for_stage(action_key, stage)):
			return true
		# When tutorial is skipped, actions are recorded globally but never advance
		# steps, so completed_actions_by_stage stays empty. Fall back to global.
		if _tutorial_skipped and app.has_method("has_seen_guide_action"):
			return bool(app.has_seen_guide_action(action_key))
	return false

func _label_for_action(action_key: String) -> String:
	match action_key:
		"build_control_station":
			return "Build control station"
		"open_launchpad":
			return "Open launchpad"
		"accept_starter_contractor":
			return "Pick a contractor"
		"accept_contractor_offer":
			return "Pick a contractor"
		"create_rocket":
			return "Build rocket"
		"launch_rocket_from_earth":
			return "Launch mission"
		"mine_target":
			return "Mine the target"
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
