extends Node
class_name TutorialController

signal tutorial_state_updated(state: Dictionary)

const SAVE_PATH := "user://tutorial_state.json"

# M1 coach steps — terse command-deck voice, no second person (no "you/your")
# Titles: UPPERCASE instrument style. Body: imperative or factual, no "you/your".
# Steps 1-2: Build Mode onboarding (place the Launchpad)
# Steps 3-11: Core mission loop (M1)
const M1_STEPS := [
	{"id":1,"screen":"hub","title":"BUILD MODE","body":"Open the radial nav and tap BUILD to set up the base.","anchor":"bottom","spot":{"x":169,"y":786,"w":64,"h":64},"cta":"Build"},
	{"id":2,"screen":"build_mode","title":"PLACE LAUNCHPAD","body":"The Launchpad is needed to launch missions. Tap the center slot to place it.","anchor":"top","spot":{"x":371,"y":530,"w":310,"h":290},"cta":"Place Launchpad"},
	{"id":3,"screen":"hub","title":"OPERATIONS ONLINE","body":"Launchpad placed. Open the radial nav and tap NEW MISSION to begin.","anchor":"bottom","spot":{"x":169,"y":786,"w":64,"h":64},"cta":"New Mission"},
	{"id":4,"screen":"missions","title":"LOCK A CONTRACT","body":"Select a mining contractor. The buyer sets the mineral order and pays a delivery bonus.","anchor":"top","spot":{"x":14,"y":150,"w":374,"h":150},"cta":"Choose a buyer"},
	{"id":5,"screen":"targets","title":"SET DESTINATION","body":"Tap an asteroid on the map. Closer targets = shorter transit. Composition determines the haul.","anchor":"bottom","spot":{"x":20,"y":150,"w":362,"h":360},"cta":"Tap a target"},
	{"id":6,"screen":"fab","title":"ASSEMBLE ROCKET","body":"Starter Rocket SR1 is pre-loaded. Tap PROCEED to confirm the build.","anchor":"top","spot":{"x":14,"y":150,"w":374,"h":250},"cta":"Proceed"},
	{"id":7,"screen":"fab","title":"LAUNCH","body":"Build complete. Tap CONFIRM LAUNCH — the rocket departs immediately.","anchor":"bottom","spot":{"x":14,"y":760,"w":374,"h":70},"cta":"Confirm Launch"},
	{"id":8,"screen":"mining","title":"ARRIVAL","body":"Target reached. Tap ore deposits to fire the mining laser.","anchor":"center","spot":null,"cta":"Tap ore"},
	{"id":9,"screen":"mining","title":"FILL THE ORDER","body":"Mine the quantities listed on the contract. Watch the order panel fill.","anchor":"bottom","spot":{"x":14,"y":470,"w":374,"h":150},"cta":"Fill the order"},
	{"id":10,"screen":"mining","title":"RETURN","body":"Order complete. Tap RETURN to bring the haul back to Earth Base.","anchor":"bottom","spot":{"x":14,"y":760,"w":374,"h":70},"cta":"Return"},
	{"id":11,"screen":"debrief","title":"DEBRIEF","body":"Sell the cargo and collect the contractor bonus. Mission complete.","anchor":"bottom","spot":{"x":14,"y":760,"w":374,"h":70},"cta":"Collect"},
]

var tutorial_active: bool = true
var completed_steps: Array = []
var current_screen: String = "hub"

func _ready() -> void:
	_load()
	# Emit initial state one frame after _ready() so any overlay that just
	# connected to this signal gets the first step immediately.
	call_deferred("_emit_initial_state")

func _emit_initial_state() -> void:
	emit_signal("tutorial_state_updated", _state())

func current_step() -> Dictionary:
	for step in M1_STEPS:
		if step.screen == current_screen and not (step.id in completed_steps):
			return step
	return {}

func set_screen(s: String) -> void:
	current_screen = s
	emit_signal("tutorial_state_updated", _state())

func complete_step(step_id: int) -> void:
	# Complete all steps UP TO AND INCLUDING step_id — ensures order is
	# never violated when the player performs actions out of sequence.
	var changed := false
	for step in M1_STEPS:
		if step.id <= step_id and not (step.id in completed_steps):
			completed_steps.append(step.id)
			changed = true
	if changed:
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
	var parsed: Variant = JSON.parse_string(f.get_as_text())
	if parsed is Dictionary:
		tutorial_active = parsed.get("tutorial_active", true)
		completed_steps = parsed.get("completed_steps", [])
