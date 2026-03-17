extends Control

const GameplayAnalytics = preload("res://Scripts/Systems/GameplayAnalytics.gd")
const MiningScene = preload("res://Scenes/UI/SidescrollMining.tscn")
const PanelStyle = preload("res://Scripts/UI/PanelStyle.gd")
const RocketsManager = preload("res://Scripts/Utils/RocketsManager.gd")
const AppControllerHelper = preload("res://Scripts/Utils/AppControllerHelper.gd")

const PRACTICE_PRESETS := {
	"warmup_asteroid": {
		"title": "Warm-Up Asteroid",
		"description": "Large surface deposits and forgiving terrain. Good for learning beam timing and route discipline.",
		"is_planet": false,
		"difficulty": 1,
		"target_id": "practice-asteroid-warmup",
		"target_label": "Academy Warm-Up Asteroid",
		"mineable_pct": 0.78,
		"minerals": {"Iron": 10, "Nickel": 8, "Cobalt": 4}
	},
	"survey_drill": {
		"title": "Prospector Drill",
		"description": "Balanced asteroid route with more subsurface deposits. Practice drone deployment and repeat loops.",
		"is_planet": false,
		"difficulty": 3,
		"target_id": "practice-asteroid-drill",
		"target_label": "Academy Prospecting Course",
		"mineable_pct": 0.46,
		"minerals": {"Nickel": 12, "Cobalt": 7, "Copper": 5}
	},
	"planet_endurance": {
		"title": "Planet Endurance",
		"description": "Longer route with tighter resource access. Designed to rehearse patience, heat management, and early-return decisions.",
		"is_planet": true,
		"difficulty": 5,
		"target_id": "practice-planet-endurance",
		"target_label": "Academy Endurance Planet",
		"mineable_pct": 0.28,
		"minerals": {"Platinum": 10, "Gold": 6, "Cobalt": 8}
	}
}

@onready var panel: PanelContainer = $Dock/Panel
@onready var title_label: Label = $Dock/Panel/VBox/TitleLabel
@onready var subtitle_label: Label = $Dock/Panel/VBox/SubtitleLabel
@onready var warmup_button: Button = $Dock/Panel/VBox/PresetButtons/WarmupButton
@onready var drill_button: Button = $Dock/Panel/VBox/PresetButtons/DrillButton
@onready var endurance_button: Button = $Dock/Panel/VBox/PresetButtons/EnduranceButton
@onready var status_label: Label = $Dock/Panel/VBox/StatusLabel
@onready var summary_label: RichTextLabel = $Dock/Panel/VBox/SummaryLabel
@onready var close_button: Button = $Dock/Panel/VBox/FooterButtons/CloseButton
@onready var dock: Control = $Dock
@onready var mining_container: Control = $MiningContainer

var _mining_instance: Control = null
var _current_preset_key := ""
var _previous_preview_target: Dictionary = {}
var _tutorial_overlay_was_visible: bool = false

func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_STOP
	_previous_preview_target = RocketsManager.get_preview_target().duplicate(true)
	_suspend_tutorial_overlay()
	_apply_style()
	_connect_buttons()
	_set_idle_copy()
	AppControllerHelper.record_tutorial_action("open_mining_practice", {
		"source": "menu_panel"
	})
	GameplayAnalytics.emit_event("mining_practice_panel_opened", {
		"entry_point": "menu_panel"
	})
	_maybe_auto_start_when_no_rocket_in_play()

func _apply_style() -> void:
	PanelStyle.apply_panel(panel)
	PanelStyle.apply_title(title_label)
	PanelStyle.apply_muted(subtitle_label)
	PanelStyle.apply_button(warmup_button, true)
	PanelStyle.apply_button(drill_button, false)
	PanelStyle.apply_button(endurance_button, false)
	PanelStyle.apply_muted(status_label)
	PanelStyle.apply_richtext(summary_label)
	PanelStyle.apply_button(close_button, false)

func _connect_buttons() -> void:
	warmup_button.pressed.connect(func(): _start_preset("warmup_asteroid"))
	drill_button.pressed.connect(func(): _start_preset("survey_drill"))
	endurance_button.pressed.connect(func(): _start_preset("planet_endurance"))
	close_button.pressed.connect(_on_close_pressed)

func _set_idle_copy() -> void:
	title_label.text = "Mining Academy"
	subtitle_label.text = "Train the mining loop with no mission risk. Practice runs do not affect economy or progression."
	status_label.text = "Select a drill to begin."
	summary_label.text = "Controls\n- Hold SPACE to mine\n- Press D to deploy drones\n- Use the in-run RETURN button to end early\n\nDrills\n- Warm-Up Asteroid: easiest entry point\n- Prospector Drill: balanced drone practice\n- Planet Endurance: hardest route"

func _start_preset(preset_key: String) -> void:
	if not PRACTICE_PRESETS.has(preset_key):
		return
	var preset: Dictionary = PRACTICE_PRESETS[preset_key]
	_clear_active_run()
	_current_preset_key = preset_key
	var target_type = "planet" if bool(preset.get("is_planet", false)) else "asteroid"
	var target_id = str(preset.get("target_id", preset_key))
	var target_label = str(preset.get("target_label", preset.get("title", preset_key)))
	RocketsManager.set_preview_target(target_id, target_label, target_type, "")
	dock.visible = false
	_mining_instance = MiningScene.instantiate()
	mining_container.add_child(_mining_instance)
	_mining_instance.mining_completed.connect(_on_mining_completed)
	var session_context := {
		"mode": "practice",
		"practice_preset": preset_key,
		"practice_label": str(preset.get("title", preset_key))
	}
	_mining_instance.start_mining(
		bool(preset.get("is_planet", false)),
		int(preset.get("difficulty", 1)),
		target_id,
		preset.get("minerals", {}),
		float(preset.get("mineable_pct", 0.5)),
		session_context
	)
	status_label.text = "Running %s." % str(preset.get("title", preset_key))
	summary_label.text = "%s\n\n%s" % [
		str(preset.get("title", preset_key)),
		str(preset.get("description", ""))
	]
	GameplayAnalytics.emit_event("mining_practice_preset_selected", {
		"mode": "practice",
		"practice_preset": preset_key,
		"practice_label": str(preset.get("title", preset_key)),
		"target_id": target_id,
		"target_type": target_type,
		"difficulty": int(preset.get("difficulty", 1)),
		"mineable_pct": float(preset.get("mineable_pct", 0.5))
	})

func _on_mining_completed(minerals: Dictionary, score: int) -> void:
	dock.visible = true
	var mineral_lines := []
	for key in minerals.keys():
		mineral_lines.append("%s x%s" % [str(key), str(minerals.get(key, 0))])
	mineral_lines.sort()
	status_label.text = "Practice complete."
	summary_label.text = "Run complete\n- Preset: %s\n- Score: %s\n- Minerals: %s\n\nPick another drill or rerun the same one." % [
		_current_preset_key,
		str(score),
		", ".join(mineral_lines) if not mineral_lines.is_empty() else "none collected"
	]
	GameplayAnalytics.emit_event("mining_practice_summary_shown", {
		"mode": "practice",
		"practice_preset": _current_preset_key,
		"score": score,
		"minerals": minerals
	})

func _on_close_pressed() -> void:
	AppControllerHelper.record_tutorial_action("close_mining_practice", {
		"practice_preset": _current_preset_key
	})
	GameplayAnalytics.emit_event("mining_practice_panel_closed", {
		"mode": "practice",
		"practice_preset": _current_preset_key
	})
	_clear_active_run()
	_restore_previous_preview_target()
	_restore_tutorial_overlay()
	var parent_canvas = get_parent() as CanvasLayer
	var should_free_parent_layer = parent_canvas != null and parent_canvas.name == "MiningPracticeOverlayLayer"
	queue_free()
	if should_free_parent_layer:
		parent_canvas.queue_free()

func _clear_active_run() -> void:
	if _mining_instance and is_instance_valid(_mining_instance):
		_mining_instance.queue_free()
	_mining_instance = null
	if dock and is_instance_valid(dock):
		dock.visible = true

func _restore_previous_preview_target() -> void:
	if _previous_preview_target.is_empty():
		RocketsManager.clear_preview_target()
		return
	RocketsManager.set_preview_target(
		str(_previous_preview_target.get("id", "")),
		str(_previous_preview_target.get("label", "")),
		str(_previous_preview_target.get("type", "asteroid")),
		str(_previous_preview_target.get("rocket_id", ""))
	)

func _maybe_auto_start_when_no_rocket_in_play() -> void:
	var has_active_rocket = RocketsManager.get_primary_awaiting_rocket_id() != ""
	if not has_active_rocket:
		# Smart skip-ahead: if player has no rocket staged, jump directly into
		# a forgiving drill so test/sandbox flow is immediately usable.
		print("MiningPracticePanel: no rocket in play, auto-starting warm-up drill")
		_start_preset("warmup_asteroid")

func _suspend_tutorial_overlay() -> void:
	var root = get_tree().root if get_tree() else null
	if root == null:
		return
	var overlay = root.get_node_or_null("TutorialCoachOverlay")
	if overlay == null:
		return
	_tutorial_overlay_was_visible = bool(overlay.visible)
	overlay.visible = false
	overlay.process_mode = Node.PROCESS_MODE_DISABLED

func _restore_tutorial_overlay() -> void:
	var root = get_tree().root if get_tree() else null
	if root == null:
		return
	var overlay = root.get_node_or_null("TutorialCoachOverlay")
	if overlay == null:
		return
	overlay.process_mode = Node.PROCESS_MODE_INHERIT
	overlay.visible = _tutorial_overlay_was_visible
	if overlay.has_method("_refresh"):
		overlay.call_deferred("_refresh")
