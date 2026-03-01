extends RefCounted
class_name TutorialCatalog

const MAX_MISSION_STAGE := 5

const STEPS_BY_MISSION := {
	1: [
		{"id": "m1_open_launchpad", "action_key": "open_launchpad", "title": "Open Launchpad", "message": "Mission 1 briefing starts at the Launchpad. Follow the guided route.", "mechanic": "navigation"},
		{"id": "m1_create_rocket", "action_key": "create_rocket", "title": "Create Rocket", "message": "Build Starter Rocket 1 to unlock the mission target step.", "mechanic": "economy"},
		{"id": "m1_select_target", "action_key": "select_launch_target", "title": "Select Target", "message": "Select the guided Mission 1 target to lock your flight path.", "mechanic": "targeting"},
		{"id": "m1_launch", "action_key": "launch_rocket_from_earth", "title": "Launch Mission", "message": "Launch to begin the outbound mission phase.", "mechanic": "launch"},
		{"id": "m1_mine_intro", "action_key": "arrived_at_mining_site", "title": "You've Arrived!", "message": "Your rocket is now over the target. Hold the FIRE button (or SPACE on keyboard) to fire the mining laser. The laser shoots straight down — position your rocket over a resource deposit to extract minerals.", "mechanic": "mining-intro"},
		{"id": "m1_mine", "action_key": "mine_target", "title": "Mine Resources", "message": "Hold FIRE over a glowing deposit to mine it. Orange = Iron, Yellow = Nickel. Watch your Fuel and Heat gauges — return home before they run out.", "mechanic": "mining"},
		{"id": "m1_return", "action_key": "return_rocket_home", "title": "Return Home", "message": "Bring your rocket and cargo back for debrief.", "mechanic": "return"},
		{"id": "m1_debrief", "action_key": "resolve_mission_debrief", "title": "Complete Debrief", "message": "Resolve debrief to earn Exposure Points and unlock Level 2.", "mechanic": "debrief"}
	],
	2: [
		{"id": "m2_create_rocket", "action_key": "create_rocket", "title": "Build Upgraded Rocket", "message": "Drag or create Starter Rocket 2 to begin semi-open mission routing.", "mechanic": "progression"},
		{"id": "m2_select_target", "action_key": "select_launch_target", "title": "Select Mission Variant", "message": "Choose one of the available mission variants for this run.", "mechanic": "targeting"},
		{"id": "m2_launch", "action_key": "launch_rocket_from_earth", "title": "Launch Upgraded Mission", "message": "Start mission 2 and compare performance.", "mechanic": "launch"},
		{"id": "m2_mine", "action_key": "mine_target", "title": "Mine With Better Equipment", "message": "Use improved equipment to increase yield.", "mechanic": "mining"},
		{"id": "m2_return", "action_key": "return_rocket_home", "title": "Return To Debrief", "message": "Return with cargo to finish mission 2.", "mechanic": "return"},
		{"id": "m2_debrief", "action_key": "resolve_mission_debrief", "title": "Finalize Mission 2", "message": "Complete debrief to unlock scanner-driven flow.", "mechanic": "debrief"}
	],
	3: [
		{"id": "m3_build_scanner", "action_key": "build_scanner_station", "title": "Build Scanner", "message": "Construct the scanner station to enable discovery.", "mechanic": "scanner"},
		{"id": "m3_scan", "action_key": "scan_targets", "title": "Run Scan", "message": "Scan space to produce mission targets.", "mechanic": "scanner"},
		{"id": "m3_select", "action_key": "select_launch_target", "title": "Choose Scanned Target", "message": "Select a scanned target that matches your rocket capability.", "mechanic": "targeting"},
		{"id": "m3_launch", "action_key": "launch_rocket_from_earth", "title": "Launch Scanned Mission", "message": "Launch the scanner-selected mission.", "mechanic": "launch"},
		{"id": "m3_debrief", "action_key": "resolve_mission_debrief", "title": "Complete Scanner Mission", "message": "Debrief to advance into planetary exploration.", "mechanic": "debrief"}
	],
	4: [
		{"id": "m4_planet_toggle", "action_key": "toggle_planet_scanner", "title": "Switch To Planet Mode", "message": "Toggle scanner mode from asteroids to planets.", "mechanic": "scanner-mode"},
		{"id": "m4_select", "action_key": "select_launch_target", "title": "Select Planetary Target", "message": "Pick a planetary destination within your unlock range.", "mechanic": "targeting"},
		{"id": "m4_launch", "action_key": "launch_rocket_from_earth", "title": "Launch Planetary Mission", "message": "Begin long-range exploration.", "mechanic": "launch"},
		{"id": "m4_mine", "action_key": "mine_target", "title": "Mine Advanced Resources", "message": "Extract high-value resources from planetary targets.", "mechanic": "mining"},
		{"id": "m4_debrief", "action_key": "resolve_mission_debrief", "title": "Complete Planetary Debrief", "message": "Finalize mission 4 to unlock contractor flow.", "mechanic": "debrief"}
	],
	5: [
		{"id": "m5_accept_contract", "action_key": "accept_contractor_offer", "title": "Accept Contractor", "message": "Pick a contractor offer to activate mission modifiers.", "mechanic": "contractor"},
		{"id": "m5_select", "action_key": "select_launch_target", "title": "Select Contract Target", "message": "Choose a target aligned with the contract.", "mechanic": "targeting"},
		{"id": "m5_launch", "action_key": "launch_rocket_from_earth", "title": "Launch Contract Mission", "message": "Start the contractor mission.", "mechanic": "launch"},
		{"id": "m5_complete_contract", "action_key": "complete_contractor_mission", "title": "Resolve Contract", "message": "Finish debrief to complete contract execution.", "mechanic": "contractor"}
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
