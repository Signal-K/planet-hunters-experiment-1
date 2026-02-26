extends Control

const FEEDBACK_BEACON_SCENE = preload("res://Scenes/UI/FeedbackBeacon.tscn")
const GameplayAnalytics = preload("res://Scripts/Systems/GameplayAnalytics.gd")

@onready var feedback_button: Button = $Overlay/Panel/VBox/ButtonGrid/FeedbackButton
@onready var first_mission_button: Button = $Overlay/Panel/VBox/ButtonGrid/FirstMissionButton
@onready var debrief_button: Button = $Overlay/Panel/VBox/ButtonGrid/DebriefButton
@onready var planet_pref_button: Button = $Overlay/Panel/VBox/ButtonGrid/PlanetPreferenceButton
@onready var asteroid_pref_button: Button = $Overlay/Panel/VBox/ButtonGrid/AsteroidPreferenceButton
@onready var launch_button: Button = $Overlay/Panel/VBox/ButtonGrid/LaunchButton
@onready var status_label: Label = $Overlay/Panel/VBox/StatusLabel
@onready var output_label: RichTextLabel = $Overlay/Panel/VBox/OutputLabel

var _event_count := 0

func _ready() -> void:
	_attach_feedback_beacon()
	feedback_button.pressed.connect(_on_feedback_pressed)
	first_mission_button.pressed.connect(_on_first_mission_pressed)
	debrief_button.pressed.connect(_on_debrief_pressed)
	planet_pref_button.pressed.connect(_on_planet_preference_pressed)
	asteroid_pref_button.pressed.connect(_on_asteroid_preference_pressed)
	launch_button.pressed.connect(_on_launch_pressed)
	status_label.text = "Ready. Use the buttons or the floating feedback beacon."
	_append_log("Analytics harness ready.")

func _attach_feedback_beacon() -> void:
	if get_node_or_null("FeedbackBeacon") != null:
		return
	var beacon = FEEDBACK_BEACON_SCENE.instantiate()
	beacon.name = "FeedbackBeacon"
	add_child(beacon)

func _on_feedback_pressed() -> void:
	var payload := {
		"context": "analytics_harness_manual_feedback",
		"harness_scene": "AnalyticsHarness"
	}
	GameplayAnalytics.emit_feedback_requested("analytics_harness_button", payload)
	_record_event("feedback_requested", payload)

func _on_first_mission_pressed() -> void:
	var payload := {
		"action": "sell_orbit",
		"badge": "analytics-harness-first-mission",
		"mission_count": 1,
		"target_id": "harness-target-001",
		"target_type": "asteroid",
		"label": "Harness Target Alpha"
	}
	GameplayAnalytics.emit_event("first_mission_completed", payload)
	_record_event("first_mission_completed", payload)

func _on_debrief_pressed() -> void:
	var payload := {
		"action": "sell_earth",
		"badge": "analytics-harness-debrief",
		"mission_count": 1,
		"target_id": "harness-target-002",
		"target_type": "planet",
		"label": "Harness Target Beta",
		"cargo_units": 12,
		"cargo_types": 3
	}
	GameplayAnalytics.emit_event("mission_debrief_resolved", payload)
	_record_event("mission_debrief_resolved", payload)

func _on_planet_preference_pressed() -> void:
	var payload := {
		"target_label": "Harness Planet",
		"harness_scene": "AnalyticsHarness"
	}
	GameplayAnalytics.emit_target_selected("harness-planet", "planet", "analytics_harness", payload)
	_record_event("launch_target_selected", payload)

func _on_asteroid_preference_pressed() -> void:
	var payload := {
		"target_label": "Harness Asteroid",
		"harness_scene": "AnalyticsHarness"
	}
	GameplayAnalytics.emit_target_selected("harness-asteroid", "asteroid", "analytics_harness", payload)
	_record_event("launch_target_selected", payload)

func _on_launch_pressed() -> void:
	var payload := {
		"target_label": "Harness Launch Target",
		"harness_scene": "AnalyticsHarness"
	}
	GameplayAnalytics.emit_launch_started("starterrocket3-harness", "harness-launch-target", "planet", payload)
	_record_event("mission_launch_started", payload)

func _record_event(event_name: String, payload: Dictionary) -> void:
	_event_count += 1
	status_label.text = "Last emitted: %s" % event_name
	_append_log("[%02d] %s\n%s" % [_event_count, event_name, JSON.stringify(payload)])

func _append_log(message: String) -> void:
	output_label.text = "%s\n%s" % [message, output_label.text]
