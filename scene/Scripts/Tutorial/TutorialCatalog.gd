extends RefCounted
class_name TutorialCatalog

const MAX_MISSION_STAGE := 4

# valid_scenes: scene file basenames where this step is actionable.
# Empty array = valid everywhere (e.g. mid-flight / mining steps).
# When the player is in any other scene, the tutorial overlay shows an
# "off-course" nudge instead of the normal step instructions.
const BASE_ONLY_SCENES := ["earth_base_1"]
const BASE_SCENES   := ["earth_base_1", "earth_launchpad"]
# Steps that are valid anywhere in the LaunchWizard flow (launchpad + map for target selection)
const LAUNCHPAD_SCENES := ["earth_launchpad", "space_map", "galaxy_map"]
# Steps that only make sense on the launchpad itself — map is off-course for these
const LAUNCHPAD_ONLY_SCENES := ["earth_launchpad"]
const MINING_SCENES := ["SidescrollMining"]
const DEBRIEF_SCENES := ["earth_base_1", "mission_debrief_v2"]

const STEPS_BY_MISSION := {
	1: [
		{"id": "m1_welcome", "action_key": "open_launchpad", "title": "Mission 1 — First launch", "message": "Open the Launchpad to pick up your first contract and build your rocket.", "mechanic": "intro", "valid_scenes": BASE_SCENES},
		{"id": "m1_pick_contractor", "action_key": "accept_contractor_offer", "title": "Accept a contract", "message": "Pick a contractor — they set the minerals you need to mine and pay a bonus on delivery.", "mechanic": "contractor", "valid_scenes": LAUNCHPAD_SCENES},
		{"id": "m1_select_target", "action_key": "select_launch_target", "title": "Set your destination", "message": "Tap an asteroid on the map to set your target, then tap CONFIRM.", "mechanic": "targeting", "valid_scenes": LAUNCHPAD_SCENES},
		{"id": "m1_create_rocket", "action_key": "create_rocket", "title": "Assemble your rocket", "message": "In the Fabrication Bay, select your rocket and confirm the build. Then hit Launch.", "mechanic": "economy", "valid_scenes": LAUNCHPAD_ONLY_SCENES},
		{"id": "m1_launch", "action_key": "launch_rocket_from_earth", "title": "Launch", "message": "Rocket assembled and target locked. Hit Launch to depart.", "mechanic": "launch", "valid_scenes": LAUNCHPAD_ONLY_SCENES},
		{"id": "m1_mine_intro", "action_key": "arrived_at_mining_site", "title": "Start mining", "message": "You've arrived. Hold FIRE to deploy your mining laser.", "mechanic": "mining-intro", "valid_scenes": MINING_SCENES},
		{"id": "m1_mine", "action_key": "mine_target", "title": "Fill the order", "message": "Mine the minerals listed in your order panel. Hit the required quantities to complete delivery.", "mechanic": "mining", "valid_scenes": MINING_SCENES},
		{"id": "m1_return", "action_key": "return_rocket_home", "title": "Return to base", "message": "Order filled. Press Return Home to head back to Earth.", "mechanic": "return", "valid_scenes": MINING_SCENES},
		{"id": "m1_debrief", "action_key": "resolve_mission_debrief", "title": "Collect your payout", "message": "Sell your cargo and resolve the debrief to close out Mission 1.", "mechanic": "debrief", "valid_scenes": DEBRIEF_SCENES}
	],
	2: [
		{"id": "m2_build_control_station", "action_key": "build_control_station", "title": "Build Control Station", "message": "Construct the Control Station to manage your fleet.", "mechanic": "progression", "valid_scenes": BASE_ONLY_SCENES}
	],
	3: [
		{"id": "m3_pick_contractor", "action_key": "accept_contractor_offer", "title": "New contract", "message": "Choose a contractor for your next mission.", "mechanic": "contractor", "valid_scenes": LAUNCHPAD_SCENES},
		{"id": "m3_classify", "action_key": "classify_candidate", "title": "Review the candidate", "message": "Classify the TESS lightcurve before launch.", "mechanic": "classification", "valid_scenes": LAUNCHPAD_SCENES},
		{"id": "m3_select", "action_key": "select_launch_target", "title": "Set destination", "message": "Confirm your destination on the map.", "mechanic": "targeting", "valid_scenes": LAUNCHPAD_SCENES},
		{"id": "m3_launch", "action_key": "launch_rocket_from_earth", "title": "Launch", "message": "Course confirmed. Hit Launch.", "mechanic": "launch", "valid_scenes": LAUNCHPAD_ONLY_SCENES},
		{"id": "m3_mine", "action_key": "mine_target", "title": "Extract samples", "message": "Extract resources from the candidate world.", "mechanic": "mining", "valid_scenes": MINING_SCENES},
		{"id": "m3_return", "action_key": "return_rocket_home", "title": "Return home", "message": "Samples secured. Return to Earth base.", "mechanic": "return", "valid_scenes": MINING_SCENES},
		{"id": "m3_debrief", "action_key": "resolve_mission_debrief", "title": "Debrief", "message": "Review your mission and collect payment.", "mechanic": "debrief", "valid_scenes": DEBRIEF_SCENES}
	],
	4: [
		{"id": "m4_open_launchpad", "action_key": "open_launchpad", "title": "Free operations", "message": "You're in command. Open the Launchpad to plan your next run.", "mechanic": "free-ops", "valid_scenes": BASE_ONLY_SCENES},
		{"id": "m4_select", "action_key": "select_launch_target", "title": "Pick your target", "message": "Any reachable destination is valid.", "mechanic": "targeting", "valid_scenes": LAUNCHPAD_SCENES},
		{"id": "m4_launch", "action_key": "launch_rocket_from_earth", "title": "Launch", "message": "Your call. Hit Launch.", "mechanic": "launch", "valid_scenes": LAUNCHPAD_ONLY_SCENES},
		{"id": "m4_mine", "action_key": "mine_target", "title": "Mine", "message": "Fill your order — mine the minerals listed in the order panel.", "mechanic": "mining", "valid_scenes": MINING_SCENES},
		{"id": "m4_debrief", "action_key": "resolve_mission_debrief", "title": "Debrief", "message": "Review your haul and collect payment.", "mechanic": "debrief", "valid_scenes": DEBRIEF_SCENES}
	]
}

func get_mission_steps(stage: int) -> Array:
	var normalized = clamp(stage, 1, MAX_MISSION_STAGE)
	var steps = STEPS_BY_MISSION.get(normalized, [])
	if typeof(steps) != TYPE_ARRAY:
		return []
	return steps.duplicate(true)

func get_step(stage: int, index: int) -> Dictionary:
	var steps = get_mission_steps(stage)
	if index < 0 or index >= steps.size():
		return {}
	return steps[index].duplicate(true)

func get_total_steps(stage: int) -> int:
	return get_mission_steps(stage).size()
