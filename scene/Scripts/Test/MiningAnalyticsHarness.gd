extends Control

const FEEDBACK_BEACON_SCENE = preload("res://Scenes/UI/FeedbackBeacon.tscn")
const GameplayAnalytics = preload("res://Scripts/Systems/GameplayAnalytics.gd")
const MiningScene = preload("res://Scenes/UI/SidescrollMining.tscn")
const RocketsManager = preload("res://Scripts/Utils/RocketsManager.gd")

@onready var easy_asteroid_button: Button = $Overlay/Panel/VBox/ButtonRow/EasyAsteroidButton
@onready var hard_planet_button: Button = $Overlay/Panel/VBox/ButtonRow/HardPlanetButton
@onready var first_mission_button: Button = $Overlay/Panel/VBox/ButtonRow/FirstMissionButton
@onready var feedback_button: Button = $Overlay/Panel/VBox/ButtonRow/FeedbackButton
@onready var reset_button: Button = $Overlay/Panel/VBox/ButtonRow/ResetButton
@onready var status_label: Label = $Overlay/Panel/VBox/StatusLabel
@onready var output_label: RichTextLabel = $Overlay/Panel/VBox/OutputLabel
@onready var mining_container: Control = $MiningContainer

var _mining_instance: Control = null
var _run_count := 0

func _ready() -> void:
	_attach_feedback_beacon()
	easy_asteroid_button.pressed.connect(_on_easy_asteroid_pressed)
	hard_planet_button.pressed.connect(_on_hard_planet_pressed)
	first_mission_button.pressed.connect(_on_first_mission_pressed)
	feedback_button.pressed.connect(_on_feedback_pressed)
	reset_button.pressed.connect(_on_reset_pressed)
	status_label.text = "Ready. Start a mining run or trigger a survey directly."
	_append_log("Mining analytics harness ready.\nControls: hold SPACE to mine, press D for drones, use RETURN to end early.")

func _attach_feedback_beacon() -> void:
	if get_node_or_null("FeedbackBeacon") != null:
		return
	var beacon = FEEDBACK_BEACON_SCENE.instantiate()
	beacon.name = "FeedbackBeacon"
	add_child(beacon)

func _on_easy_asteroid_pressed() -> void:
	_start_run(
		"Easy Asteroid",
		false,
		1,
		"harness-asteroid-run",
		"Harness Asteroid Run",
		{"Iron": 10, "Nickel": 8, "Cobalt": 3},
		0.72
	)

func _on_hard_planet_pressed() -> void:
	_start_run(
		"Hard Planet",
		true,
		5,
		"harness-planet-run",
		"Harness Planet Run",
		{"Platinum": 12, "Gold": 6, "Cobalt": 9},
		0.28
	)

func _on_first_mission_pressed() -> void:
	var payload := {
		"action": "sell_orbit",
		"badge": "mining-harness-first-mission",
		"mission_count": 1,
		"target_id": "harness-mining-survey-target",
		"target_type": "asteroid",
		"label": "Mining Harness Survey Target"
	}
	GameplayAnalytics.emit_event("first_mission_completed", payload)
	_append_log("Triggered first mission survey event.\n%s" % JSON.stringify(payload))

func _on_feedback_pressed() -> void:
	var payload := {
		"context": "mining_harness_manual_feedback",
		"harness_scene": "MiningAnalyticsHarness"
	}
	GameplayAnalytics.emit_feedback_requested("mining_analytics_harness_button", payload)
	_append_log("Triggered feedback popup.\n%s" % JSON.stringify(payload))

func _on_reset_pressed() -> void:
	if _mining_instance and is_instance_valid(_mining_instance):
		_mining_instance.queue_free()
		_mining_instance = null
	RocketsManager.clear_preview_target()
	status_label.text = "Harness reset."
	_append_log("Reset harness state and cleared active mining scene.")

func _start_run(
	run_name: String,
	is_planet: bool,
	difficulty: int,
	target_id: String,
	target_label: String,
	minerals: Dictionary,
	mineable_pct: float
) -> void:
	if _mining_instance and is_instance_valid(_mining_instance):
		_mining_instance.queue_free()
	var target_type = "planet" if is_planet else "asteroid"
	RocketsManager.set_preview_target(target_id, target_label, target_type, "")
	_mining_instance = MiningScene.instantiate()
	mining_container.add_child(_mining_instance)
	_mining_instance.mining_completed.connect(_on_mining_completed)
	_mining_instance.start_mining(is_planet, difficulty, target_id, minerals, mineable_pct)
	_run_count += 1
	status_label.text = "Running %s (run %d)" % [run_name, _run_count]
	_append_log(
		"Started %s.\n%s" % [
			run_name,
			JSON.stringify({
				"target_id": target_id,
				"target_type": target_type,
				"difficulty": difficulty,
				"mineable_pct": mineable_pct,
				"minerals": minerals
			})
		]
	)

func _on_mining_completed(minerals: Dictionary, score: int) -> void:
	status_label.text = "Mining completed. Score %d." % score
	_append_log("Mining finished.\n%s" % JSON.stringify({
		"score": score,
		"minerals": minerals
	}))

func _append_log(message: String) -> void:
	output_label.text = "%s\n\n%s" % [message, output_label.text]
