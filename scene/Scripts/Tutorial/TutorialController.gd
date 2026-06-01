extends Node
class_name TutorialController

signal tutorial_state_updated(state: Dictionary)

const SAVE_PATH := "user://tutorial_state.json"

const M1_STEPS := [
	{"id":1,"screen":"hub","title":"Welcome, Commander","body":"Your first contract is waiting. Open the radial menu and tap NEW MISSION to begin.","anchor":"bottom","spot":{"x":169,"y":786,"w":64,"h":64},"cta":"New Mission"},
	{"id":2,"screen":"missions","title":"Lock a Contract","body":"Pick a mining company. They name the minerals they want and pay a bonus on delivery.","anchor":"top","spot":{"x":14,"y":150,"w":374,"h":150},"cta":"Choose a buyer"},
	{"id":3,"screen":"targets","title":"Choose a Destination","body":"Tap an asteroid on the map. Closer = faster trip; its composition decides your haul.","anchor":"bottom","spot":{"x":20,"y":150,"w":362,"h":360},"cta":"Tap a target"},
	{"id":4,"screen":"fab","title":"Assemble the Rocket","body":"Your Starter Rocket SR1 is pre-loaded. Tap PROCEED to confirm the build.","anchor":"top","spot":{"x":14,"y":150,"w":374,"h":250},"cta":"Proceed"},
	{"id":5,"screen":"fab","title":"Launch","body":"Everything checks out. Tap CONFIRM LAUNCH — the rocket departs immediately.","anchor":"bottom","spot":{"x":14,"y":760,"w":374,"h":70},"cta":"Confirm Launch"},
	{"id":6,"screen":"mining","title":"Arrival","body":"You've reached the asteroid. Tap ore deposits to fire the mining laser.","anchor":"center","spot":null,"cta":"Tap ore"},
	{"id":7,"screen":"mining","title":"Fill the Order","body":"Mine the exact quantities your contract asked for. Watch the order panel fill up.","anchor":"bottom","spot":{"x":14,"y":470,"w":374,"h":150},"cta":"Fill the order"},
	{"id":8,"screen":"mining","title":"Return Home","body":"Order complete. Tap RETURN to bring your haul back to Earth Base.","anchor":"bottom","spot":{"x":14,"y":760,"w":374,"h":70},"cta":"Return"},
	{"id":9,"screen":"debrief","title":"Debrief","body":"Sell your cargo and collect the contractor bonus. That's one mission in the books!","anchor":"bottom","spot":{"x":14,"y":760,"w":374,"h":70},"cta":"Collect"},
]

var tutorial_active: bool = true
var completed_steps: Array = []
var current_screen: String = "hub"

func _ready() -> void:
	_load()

func current_step() -> Dictionary:
	for step in M1_STEPS:
		if step.screen == current_screen and not (step.id in completed_steps):
			return step
	return {}

func set_screen(s: String) -> void:
	current_screen = s
	emit_signal("tutorial_state_updated", _state())

func complete_step(step_id: int) -> void:
	if not (step_id in completed_steps):
		completed_steps.append(step_id)
	_save()
	emit_signal("tutorial_state_updated", _state())

func skip_tutorial() -> void:
	tutorial_active = false
	_save()
	emit_signal("tutorial_state_updated", _state())

func _state() -> Dictionary:
	return {
		"tutorial_active": tutorial_active,
		"completed_steps": completed_steps,
		"current_screen": current_screen
	}

func _save() -> void:
	var f := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if f:
		f.store_string(JSON.stringify(_state()))

func _load() -> void:
	if not FileAccess.file_exists(SAVE_PATH):
		return
	var f := FileAccess.open(SAVE_PATH, FileAccess.READ)
	if not f:
		return
	var parsed := JSON.parse_string(f.get_as_text())
	if parsed is Dictionary:
		tutorial_active = parsed.get("tutorial_active", true)
		completed_steps = parsed.get("completed_steps", [])
