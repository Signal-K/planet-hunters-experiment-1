extends RefCounted
class_name TutorialController

# Screen-driven M1 tutorial controller.
# Steps surface based on current screen — the coach never fights real buttons.

const SAVE_PATH := "user://tutorial_state.cfg"

var M1_STEPS: Array = []
var completed_steps: Array = []
var tutorial_active := true
var m1_complete := false
var free_ops_unlocked := false

func _init() -> void:
	M1_STEPS = [
		{
			"id": 0, "screen": "build", "title": "Build a Launchpad",
			"body": "Every base starts here. Select the Launchpad, then tap a plot to place it on your land.",
			"action": "Tap SELECT A PLOT, then a pad",
			"anchor": "bottom", "spot": null, "cta": "Build Launchpad", "manual": false
		},
		{
			"id": 1, "screen": "hub", "title": "Open a Mission",
			"body": "Open the radial menu, then choose MISSIONS to see the contract board.",
			"action": "Tap menu, then MISSIONS",
			"anchor": "top",
			"spot": {"x": 169.0, "y": 786.0, "w": 64.0, "h": 64.0},
			"cta": "the menu", "manual": false
		},
		{
			"id": 2, "screen": "missions", "title": "Lock a Contract",
			"body": "Pick a mining company. They name the minerals they want and pay a bonus on delivery.",
			"action": "Tap a contract card",
			"anchor": "bottom",
			"spot": {"x": 14.0, "y": 150.0, "w": 374.0, "h": 168.0},
			"cta": "a contract", "manual": false
		},
		{
			"id": 3, "screen": "targets", "title": "Choose a Destination",
			"body": "Tap a highlighted body on the map — only compatible targets are selectable.",
			"action": "Tap a target, then Continue",
			"anchor": "bottom",
			"spot": {"x": 20.0, "y": 150.0, "w": 362.0, "h": 360.0},
			"cta": "a target", "manual": false
		},
		{
			"id": 4, "screen": "fab", "title": "Assemble the Rocket",
			"body": "Your Starter Rocket is pre-loaded with compatible parts. Swap any slot to experiment, or keep the suggested build.",
			"action": "",
			"anchor": "top",
			"spot": {"x": 14.0, "y": 150.0, "w": 374.0, "h": 250.0},
			"cta": "Got it", "manual": true
		},
		{
			"id": 5, "screen": "fab", "title": "Launch",
			"body": "Everything checks out.",
			"action": "Tap CONFIRM LAUNCH",
			"anchor": "top",
			"spot": {"x": 14.0, "y": 786.0, "w": 374.0, "h": 64.0},
			"cta": "Confirm Launch", "manual": false
		},
		{
			"id": 6, "screen": "mining", "title": "Mine the Asteroid",
			"body": "Tap the glowing ore deposits to fire your laser. Fill your contract order, then tap RETURN when you're ready to fly home.",
			"action": "Tap ore to mine · then Return",
			"anchor": "center", "spot": null, "cta": "mine", "manual": false
		},
		{
			"id": 9, "screen": "debrief", "title": "Debrief",
			"body": "Sell your cargo and collect the contractor bonus.",
			"action": "Tap to collect your reward",
			"anchor": "top",
			"spot": {"x": 14.0, "y": 786.0, "w": 374.0, "h": 64.0},
			"cta": "Collect", "manual": false
		},
	]
	load_state()

# Returns the first incomplete step for the given screen, or empty dict.
func current_step(current_screen: String) -> Dictionary:
	if not tutorial_active:
		return {}
	for step in M1_STEPS:
		if step.screen == current_screen and not completed_steps.has(step.id):
			return step
	return {}

func step_index_of(step_id: int) -> int:
	for i in M1_STEPS.size():
		if M1_STEPS[i].id == step_id:
			return i
	return 0

func total_steps() -> int:
	return M1_STEPS.size()

func mark_complete(step_id: int) -> void:
	if not completed_steps.has(step_id):
		completed_steps.append(step_id)
	_check_m1_complete()
	_save()

func skip_all() -> void:
	tutorial_active = false
	_save()

func is_m1_complete() -> bool:
	return m1_complete

func _check_m1_complete() -> void:
	if m1_complete:
		return
	for step in M1_STEPS:
		if not completed_steps.has(step.id):
			return
	m1_complete = true

func _save() -> void:
	var cfg := ConfigFile.new()
	cfg.set_value("tutorial", "active", tutorial_active)
	cfg.set_value("tutorial", "completed", completed_steps)
	cfg.set_value("tutorial", "m1_complete", m1_complete)
	cfg.set_value("tutorial", "free_ops_unlocked", free_ops_unlocked)
	cfg.save(SAVE_PATH)

func load_state() -> void:
	var cfg := ConfigFile.new()
	if cfg.load(SAVE_PATH) != OK:
		return
	tutorial_active = cfg.get_value("tutorial", "active", true)
	completed_steps = cfg.get_value("tutorial", "completed", [])
	m1_complete = cfg.get_value("tutorial", "m1_complete", false)
	free_ops_unlocked = cfg.get_value("tutorial", "free_ops_unlocked", false)

func reset() -> void:
	completed_steps = []
	tutorial_active = true
	m1_complete = false
	free_ops_unlocked = false
	_save()
