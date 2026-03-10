extends RefCounted
class_name TutorialCatalog

const MAX_MISSION_STAGE := 4

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
		{"id": "m1_tour_control_station", "action_key": "tour_open_control_station", "title": "Base Tour", "message": "Open Control Station.", "mechanic": "navigation", "valid_scenes": BASE_ONLY_SCENES},
		{"id": "m1_tour_close_control_station", "action_key": "tour_close_control_station", "title": "Close Panel", "message": "Close Control Station.", "mechanic": "navigation", "valid_scenes": BASE_ONLY_SCENES},
		{"id": "m1_pick_contractor", "action_key": "accept_contractor_offer", "title": "Sign Contractor", "message": "Pick a contractor in Launchpad.", "mechanic": "contractor", "valid_scenes": BASE_SCENES},
		{"id": "m1_create_rocket", "action_key": "create_rocket", "title": "Build Rocket", "message": "Build Starter Rocket 1.", "mechanic": "economy", "valid_scenes": BASE_SCENES},
		{"id": "m1_select_target", "action_key": "select_launch_target", "title": "Select Target", "message": "Select the Mission 1 target.", "mechanic": "targeting", "valid_scenes": BASE_SCENES},
		{"id": "m1_launch", "action_key": "launch_rocket_from_earth", "title": "Launch", "message": "Press Launch.", "mechanic": "launch", "valid_scenes": BASE_SCENES},
		{"id": "m1_mine_intro", "action_key": "arrived_at_mining_site", "title": "Arrived!", "message": "Hold FIRE to mine requested minerals.", "mechanic": "mining-intro", "valid_scenes": MINING_SCENES},
		{"id": "m1_mine", "action_key": "mine_target", "title": "Mine", "message": "Mine minerals. Return before Fuel or Heat critical.", "mechanic": "mining", "valid_scenes": MINING_SCENES},
		{"id": "m1_return", "action_key": "return_rocket_home", "title": "Return Home", "message": "Return with cargo for debrief.", "mechanic": "return", "valid_scenes": MINING_SCENES},
		{"id": "m1_debrief", "action_key": "resolve_mission_debrief", "title": "Debrief", "message": "Sell cargo. Scrap ship to unlock Mission 2.", "mechanic": "debrief", "valid_scenes": DEBRIEF_SCENES}
	],
	2: [
		{"id": "m2_create_rocket", "action_key": "create_rocket", "title": "Build SR2", "message": "Build Starter Rocket 2.", "mechanic": "progression", "valid_scenes": BASE_SCENES},
		{"id": "m2_select_target", "action_key": "select_launch_target", "title": "Select Target", "message": "Choose a mission variant.", "mechanic": "targeting", "valid_scenes": BASE_SCENES},
		{"id": "m2_launch", "action_key": "launch_rocket_from_earth", "title": "Launch", "message": "Press Launch.", "mechanic": "launch", "valid_scenes": BASE_SCENES},
		{"id": "m2_mine", "action_key": "mine_target", "title": "Mine", "message": "Mine with improved yield.", "mechanic": "mining", "valid_scenes": MINING_SCENES},
		{"id": "m2_return", "action_key": "return_rocket_home", "title": "Return Home", "message": "Return with cargo.", "mechanic": "return", "valid_scenes": MINING_SCENES},
		{"id": "m2_debrief", "action_key": "resolve_mission_debrief", "title": "Debrief", "message": "Sell cargo. Scrap ship to unlock Mission 3.", "mechanic": "debrief", "valid_scenes": DEBRIEF_SCENES}
	],
		3: [
			{"id": "m3_select", "action_key": "select_launch_target", "title": "Select Planet Target", "message": "Pick a likely planet target.", "mechanic": "targeting", "valid_scenes": BASE_SCENES},
			{"id": "m3_launch", "action_key": "launch_rocket_from_earth", "title": "Launch", "message": "Press Launch.", "mechanic": "launch", "valid_scenes": BASE_SCENES},
			{"id": "m3_mine", "action_key": "mine_target", "title": "Mine", "message": "Mine resources from the selected planet target.", "mechanic": "mining", "valid_scenes": MINING_SCENES},
		{"id": "m3_return", "action_key": "return_rocket_home", "title": "Return Home", "message": "Return with cargo.", "mechanic": "return", "valid_scenes": MINING_SCENES},
		{"id": "m3_debrief", "action_key": "resolve_mission_debrief", "title": "Debrief", "message": "Sell cargo. Scrap ship to complete Mission 3.", "mechanic": "debrief", "valid_scenes": DEBRIEF_SCENES}
	],
	4: [
		{"id": "m4_build_scanner", "action_key": "build_scanner_station", "title": "Build Scanner", "message": "Build the Scanner Station.", "mechanic": "scanner", "valid_scenes": BASE_SCENES},
		{"id": "m4_scan", "action_key": "scan_targets", "title": "Scan", "message": "Run a scan to discover targets.", "mechanic": "scanner", "valid_scenes": BASE_SCENES},
		{"id": "m4_select", "action_key": "select_launch_target", "title": "Select Target", "message": "Pick a scanned target.", "mechanic": "targeting", "valid_scenes": BASE_SCENES},
		{"id": "m4_launch", "action_key": "launch_rocket_from_earth", "title": "Launch", "message": "Press Launch.", "mechanic": "launch", "valid_scenes": BASE_SCENES},
		{"id": "m4_mine", "action_key": "mine_target", "title": "Mine", "message": "Mine resources.", "mechanic": "mining", "valid_scenes": MINING_SCENES},
		{"id": "m4_debrief", "action_key": "resolve_mission_debrief", "title": "Debrief", "message": "Sell cargo. Scrap ship to unlock Free Operations.", "mechanic": "debrief", "valid_scenes": DEBRIEF_SCENES}
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
