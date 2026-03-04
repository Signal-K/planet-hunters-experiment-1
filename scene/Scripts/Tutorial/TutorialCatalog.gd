extends RefCounted
class_name TutorialCatalog

const MAX_MISSION_STAGE := 5

# valid_scenes: scene file basenames where this step is actionable.
# Empty array = valid everywhere (e.g. mid-flight / mining steps).
# When the player is in any other scene, the tutorial overlay shows an
# "off-course" nudge instead of the normal step instructions.
const BASE_ONLY_SCENES := ["earth_base_1"]
const BASE_SCENES   := ["earth_base_1", "earth_launchpad"]
const MINING_SCENES := ["SidescrollMining"]
const DEBRIEF_SCENES := ["earth_base_1", "mission_debrief"]

const STEPS_BY_MISSION := {
	1: [
		{"id": "m1_tour_control_station", "action_key": "tour_open_control_station", "title": "Quick Base Tour", "message": "Start with a quick orientation. Open the Control Station to review your core command tools.", "mechanic": "navigation", "valid_scenes": BASE_ONLY_SCENES},
		{"id": "m1_tour_close_control_station", "action_key": "tour_close_control_station", "title": "Finish Tour", "message": "Close the Control Station panel to continue to mission setup.", "mechanic": "navigation", "valid_scenes": BASE_ONLY_SCENES},
		{"id": "m1_pick_contractor", "action_key": "accept_starter_contractor", "title": "Sign Your Contractor", "message": "Open Launchpad and sign one contractor for Mission 1. Each offers a slightly different starter mineral order.", "mechanic": "contractor", "valid_scenes": BASE_SCENES},
		{"id": "m1_create_rocket", "action_key": "create_rocket", "title": "Create Rocket", "message": "Build Starter Rocket 1 to unlock target selection.", "mechanic": "economy", "valid_scenes": BASE_SCENES},
		{"id": "m1_select_target", "action_key": "select_launch_target", "title": "Select Target", "message": "Select the guided Mission 1 target to lock your flight path.", "mechanic": "targeting", "valid_scenes": BASE_SCENES},
		{"id": "m1_launch", "action_key": "launch_rocket_from_earth", "title": "Launch Mission", "message": "Launch to begin the outbound mission phase.", "mechanic": "launch", "valid_scenes": BASE_SCENES},
		{"id": "m1_mine_intro", "action_key": "arrived_at_mining_site", "title": "You've Arrived!", "message": "Your rocket is now over the target. Hold the FIRE button (or SPACE on keyboard) to fire the mining laser. The laser shoots straight down — position your rocket over a resource deposit to extract minerals.", "mechanic": "mining-intro", "valid_scenes": MINING_SCENES},
		{"id": "m1_mine", "action_key": "mine_target", "title": "Mine Resources", "message": "Hold FIRE over a glowing deposit to mine it. Orange = Iron, Yellow = Nickel. Watch your Fuel and Heat gauges — return home before they run out.", "mechanic": "mining", "valid_scenes": MINING_SCENES},
		{"id": "m1_return", "action_key": "return_rocket_home", "title": "Return Home", "message": "Bring your rocket and cargo back for debrief.", "mechanic": "return", "valid_scenes": MINING_SCENES},
		{"id": "m1_debrief", "action_key": "resolve_mission_debrief", "title": "Complete Debrief", "message": "Review your contractor order recap to earn Exposure and unlock Mission 2.", "mechanic": "debrief", "valid_scenes": DEBRIEF_SCENES}
	],
	2: [
		{"id": "m2_create_rocket", "action_key": "create_rocket", "title": "Build Upgraded Rocket", "message": "Drag or create Starter Rocket 2 to begin semi-open mission routing.", "mechanic": "progression", "valid_scenes": BASE_SCENES},
		{"id": "m2_select_target", "action_key": "select_launch_target", "title": "Select Mission Variant", "message": "Choose one of the available mission variants for this run.", "mechanic": "targeting", "valid_scenes": BASE_SCENES},
		{"id": "m2_launch", "action_key": "launch_rocket_from_earth", "title": "Launch Upgraded Mission", "message": "Start mission 2 and compare performance.", "mechanic": "launch", "valid_scenes": BASE_SCENES},
		{"id": "m2_mine", "action_key": "mine_target", "title": "Mine With Better Equipment", "message": "Use improved equipment to increase yield.", "mechanic": "mining", "valid_scenes": MINING_SCENES},
		{"id": "m2_return", "action_key": "return_rocket_home", "title": "Return To Debrief", "message": "Return with cargo to finish mission 2.", "mechanic": "return", "valid_scenes": MINING_SCENES},
		{"id": "m2_debrief", "action_key": "resolve_mission_debrief", "title": "Finalize Mission 2", "message": "Complete debrief to unlock scanner-driven flow.", "mechanic": "debrief", "valid_scenes": DEBRIEF_SCENES}
	],
	3: [
		{"id": "m3_build_scanner", "action_key": "build_scanner_station", "title": "Build Scanner", "message": "Construct the scanner station to enable discovery.", "mechanic": "scanner", "valid_scenes": BASE_SCENES},
		{"id": "m3_scan", "action_key": "scan_targets", "title": "Run Scan", "message": "Scan space to produce mission targets.", "mechanic": "scanner", "valid_scenes": BASE_SCENES},
		{"id": "m3_select", "action_key": "select_launch_target", "title": "Choose Scanned Target", "message": "Select a scanned target that matches your rocket capability.", "mechanic": "targeting", "valid_scenes": BASE_SCENES},
		{"id": "m3_launch", "action_key": "launch_rocket_from_earth", "title": "Launch Scanned Mission", "message": "Launch the scanner-selected mission.", "mechanic": "launch", "valid_scenes": BASE_SCENES},
		{"id": "m3_debrief", "action_key": "resolve_mission_debrief", "title": "Complete Scanner Mission", "message": "Debrief to advance into planetary exploration.", "mechanic": "debrief", "valid_scenes": DEBRIEF_SCENES}
	],
	4: [
		{"id": "m4_planet_toggle", "action_key": "toggle_planet_scanner", "title": "Switch To Planet Mode", "message": "Toggle scanner mode from asteroids to planets.", "mechanic": "scanner-mode", "valid_scenes": BASE_SCENES},
		{"id": "m4_select", "action_key": "select_launch_target", "title": "Select Planetary Target", "message": "Pick a planetary destination within your unlock range.", "mechanic": "targeting", "valid_scenes": BASE_SCENES},
		{"id": "m4_launch", "action_key": "launch_rocket_from_earth", "title": "Launch Planetary Mission", "message": "Begin long-range exploration.", "mechanic": "launch", "valid_scenes": BASE_SCENES},
		{"id": "m4_mine", "action_key": "mine_target", "title": "Mine Advanced Resources", "message": "Extract high-value resources from planetary targets.", "mechanic": "mining", "valid_scenes": MINING_SCENES},
		{"id": "m4_debrief", "action_key": "resolve_mission_debrief", "title": "Complete Planetary Debrief", "message": "Finalize mission 4 to unlock contractor flow.", "mechanic": "debrief", "valid_scenes": DEBRIEF_SCENES}
	],
	5: [
		{"id": "m5_accept_contract", "action_key": "accept_contractor_offer", "title": "Accept Contractor", "message": "Pick a contractor offer to activate mission modifiers.", "mechanic": "contractor", "valid_scenes": BASE_SCENES},
		{"id": "m5_select", "action_key": "select_launch_target", "title": "Select Contract Target", "message": "Choose a target aligned with the contract.", "mechanic": "targeting", "valid_scenes": BASE_SCENES},
		{"id": "m5_launch", "action_key": "launch_rocket_from_earth", "title": "Launch Contract Mission", "message": "Start the contractor mission.", "mechanic": "launch", "valid_scenes": BASE_SCENES},
		{"id": "m5_complete_contract", "action_key": "complete_contractor_mission", "title": "Resolve Contract", "message": "Finish debrief to complete contract execution.", "mechanic": "contractor", "valid_scenes": DEBRIEF_SCENES}
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
