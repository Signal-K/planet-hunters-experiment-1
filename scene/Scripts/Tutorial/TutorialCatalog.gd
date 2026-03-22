extends RefCounted
class_name TutorialCatalog

const MAX_MISSION_STAGE := 4

# valid_scenes: scene file basenames where this step is actionable.
# Empty array = valid everywhere (e.g. mid-flight / mining steps).
# When the player is in any other scene, the tutorial overlay shows an
# "off-course" nudge instead of the normal step instructions.
const BASE_ONLY_SCENES := ["earth_base_1"]
const BASE_SCENES   := ["earth_base_1", "earth_launchpad"]
const LAUNCHPAD_SCENES := ["earth_launchpad"]
const MINING_SCENES := ["SidescrollMining"]
const DEBRIEF_SCENES := ["earth_base_1", "mission_debrief"]

const STEPS_BY_MISSION := {
	1: [
		{"id": "m1_tour_control_station", "action_key": "tour_open_control_station", "title": "Base Tour", "message": "Check the Control Station — it shows active missions and your fleet status.", "mechanic": "navigation", "valid_scenes": BASE_ONLY_SCENES},
		{"id": "m1_tour_close_control_station", "action_key": "tour_close_control_station", "title": "Close Panel", "message": "Good. Close the panel — the Launchpad is your next stop.", "mechanic": "navigation", "valid_scenes": BASE_ONLY_SCENES},
		{"id": "m1_pick_contractor", "action_key": "accept_contractor_offer", "title": "Pick Contractor", "message": "Contractors pay a bonus when you deliver their requested minerals. Pick one before building your rocket.", "mechanic": "contractor", "valid_scenes": LAUNCHPAD_SCENES},
		{"id": "m1_create_rocket", "action_key": "create_rocket", "title": "Build Rocket", "message": "Build your first rocket here in the Launchpad. Starter Rocket 1 is ready to kit out.", "mechanic": "economy", "valid_scenes": LAUNCHPAD_SCENES},
		{"id": "m1_select_target", "action_key": "select_launch_target", "title": "Select Target", "message": "Select the Mission 1 asteroid as your destination. It's a short hop from Earth.", "mechanic": "targeting", "valid_scenes": LAUNCHPAD_SCENES},
		{"id": "m1_launch", "action_key": "launch_rocket_from_earth", "title": "Launch", "message": "Everything's ready. Press Launch to leave Earth orbit.", "mechanic": "launch", "valid_scenes": LAUNCHPAD_SCENES},
		{"id": "m1_mine_intro", "action_key": "arrived_at_mining_site", "title": "Arrived", "message": "You're at the asteroid. Hold FIRE to activate your mining laser.", "mechanic": "mining-intro", "valid_scenes": MINING_SCENES},
		{"id": "m1_mine", "action_key": "mine_target", "title": "Mine", "message": "Mine the minerals your contractor ordered. Check the delivery panel on screen to track your progress.", "mechanic": "mining", "valid_scenes": MINING_SCENES},
		{"id": "m1_return", "action_key": "return_rocket_home", "title": "Return", "message": "Cargo hold loaded. Press Return to head back to Earth with your haul.", "mechanic": "return", "valid_scenes": MINING_SCENES},
		{"id": "m1_debrief", "action_key": "resolve_mission_debrief", "title": "Debrief", "message": "Deliver your cargo and scrap the rocket. Mission 2 unlocks when you're done.", "mechanic": "debrief", "valid_scenes": DEBRIEF_SCENES}
	],
	2: [
		{"id": "m2_pick_contractor", "action_key": "accept_contractor_offer", "title": "Pick Contractor", "message": "Pick a contractor — their delivery order gives you a bonus payout on top of the standard haul price.", "mechanic": "contractor", "valid_scenes": LAUNCHPAD_SCENES},
		{"id": "m2_create_rocket", "action_key": "create_rocket", "title": "Build Rocket 2", "message": "Starter Rocket 2 has better range and cargo capacity. Build it in the Launchpad.", "mechanic": "progression", "valid_scenes": LAUNCHPAD_SCENES},
		{"id": "m2_select_target", "action_key": "select_launch_target", "title": "Target", "message": "Choose your mission target from the list.", "mechanic": "targeting", "valid_scenes": LAUNCHPAD_SCENES},
		{"id": "m2_launch", "action_key": "launch_rocket_from_earth", "title": "Launch", "message": "Press Launch when ready.", "mechanic": "launch", "valid_scenes": LAUNCHPAD_SCENES},
		{"id": "m2_mine", "action_key": "mine_target", "title": "Mine", "message": "Fill the contractor's order for the bonus payout. The delivery panel shows what you still need.", "mechanic": "mining", "valid_scenes": MINING_SCENES},
		{"id": "m2_return", "action_key": "return_rocket_home", "title": "Return", "message": "Good haul. Press Return to head home.", "mechanic": "return", "valid_scenes": MINING_SCENES},
		{"id": "m2_debrief", "action_key": "resolve_mission_debrief", "title": "Debrief", "message": "Deliver your cargo and scrap to unlock Mission 3.", "mechanic": "debrief", "valid_scenes": DEBRIEF_SCENES}
	],
	3: [
		{"id": "m3_pick_contractor", "action_key": "accept_contractor_offer", "title": "Pick Contractor", "message": "Choose a contractor for a delivery bonus on your haul.", "mechanic": "contractor", "valid_scenes": LAUNCHPAD_SCENES},
		{"id": "m3_select", "action_key": "select_launch_target", "title": "Target", "message": "Pick a TESS planet candidate as your target. These are real exoplanet candidates from NASA data.", "mechanic": "targeting", "valid_scenes": LAUNCHPAD_SCENES},
		{"id": "m3_launch", "action_key": "launch_rocket_from_earth", "title": "Launch", "message": "Heading out to a real world. Press Launch.", "mechanic": "launch", "valid_scenes": LAUNCHPAD_SCENES},
		{"id": "m3_mine", "action_key": "mine_target", "title": "Mine", "message": "Mine what you can from the planet's surface.", "mechanic": "mining", "valid_scenes": MINING_SCENES},
		{"id": "m3_return", "action_key": "return_rocket_home", "title": "Return", "message": "Cargo secured. Return to Earth.", "mechanic": "return", "valid_scenes": MINING_SCENES},
		{"id": "m3_debrief", "action_key": "resolve_mission_debrief", "title": "Debrief", "message": "Deliver and debrief. You're building operational range.", "mechanic": "debrief", "valid_scenes": DEBRIEF_SCENES}
	],
	4: [
		{"id": "m4_build_scanner", "action_key": "build_scanner_station", "title": "Scanner", "message": "Build the Scanner Station at your base — it will reveal new targets across your operational zone.", "mechanic": "scanner", "valid_scenes": BASE_SCENES},
		{"id": "m4_scan", "action_key": "scan_targets", "title": "Scan", "message": "Activate the scanner. It will map asteroid fields and flag high-value planet candidates.", "mechanic": "scanner", "valid_scenes": BASE_SCENES},
		{"id": "m4_select", "action_key": "select_launch_target", "title": "Target", "message": "Select a scanned target from the Launchpad list.", "mechanic": "targeting", "valid_scenes": LAUNCHPAD_SCENES},
		{"id": "m4_launch", "action_key": "launch_rocket_from_earth", "title": "Launch", "message": "Press Launch to begin the mission.", "mechanic": "launch", "valid_scenes": LAUNCHPAD_SCENES},
		{"id": "m4_mine", "action_key": "mine_target", "title": "Mine + Drones", "message": "Drones are unlocked. Press DRONE (or D) to target dark subsurface deposits for bonus yield on top of your surface haul.", "mechanic": "mining", "valid_scenes": MINING_SCENES},
		{"id": "m4_debrief", "action_key": "resolve_mission_debrief", "title": "Debrief", "message": "Complete Mission 4 to unlock Free Operations — run missions on your own terms.", "mechanic": "debrief", "valid_scenes": DEBRIEF_SCENES}
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
