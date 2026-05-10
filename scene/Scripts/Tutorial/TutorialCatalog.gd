extends RefCounted
class_name TutorialCatalog

const MAX_MISSION_STAGE := 4

# valid_scenes: scene file basenames where this step is actionable.
# Empty array = valid everywhere (e.g. mid-flight / mining steps).
# When the player is in any other scene, the tutorial overlay shows an
# "off-course" nudge instead of the normal step instructions.
const BASE_ONLY_SCENES := ["earth_base_1"]
const BASE_SCENES   := ["earth_base_1", "earth_launchpad"]
const LAUNCHPAD_SCENES := ["earth_launchpad", "space_map"]
const MINING_SCENES := ["SidescrollMining"]
const DEBRIEF_SCENES := ["earth_base_1", "mission_debrief_v2"]

const STEPS_BY_MISSION := {
	1: [
		{"id": "m1_pick_contractor", "action_key": "accept_contractor_offer", "title": "Contractor Selection", "message": "Contractors pay a significant bonus when you deliver their requested minerals. Open the contractor list and accept your first job.", "mechanic": "contractor", "valid_scenes": LAUNCHPAD_SCENES},
		{"id": "m1_select_target", "action_key": "select_launch_target", "title": "Navigation: Select Target", "message": "Open the Space Map and select the highlighted Mission 1 asteroid. It contains the exact Iron and Nickel requested by your contractor.", "mechanic": "targeting", "valid_scenes": LAUNCHPAD_SCENES},
		{"id": "m1_create_rocket", "action_key": "create_rocket", "title": "Rocket Assembly", "message": "assemble your first vessel. Starter Rocket 1 is a reliable workhorse for inner belt missions.", "mechanic": "economy", "valid_scenes": LAUNCHPAD_SCENES},
		{"id": "m1_launch", "action_key": "launch_rocket_from_earth", "title": "Launch Sequence", "message": "Flight systems are green. Press Launch to leave Earth orbit and begin your transit to the asteroid belt.", "mechanic": "launch", "valid_scenes": LAUNCHPAD_SCENES},
		{"id": "m1_mine_intro", "action_key": "arrived_at_mining_site", "title": "Arrival: Orbital Insertion", "message": "You've reached the target. Hold the FIRE button to deploy your mining laser and begin cutting into the surface.", "mechanic": "mining-intro", "valid_scenes": MINING_SCENES},
		{"id": "m1_mine", "action_key": "mine_target", "title": "Active Mining Operations", "message": "Collect the Iron and Nickel required by your contract. Track your progress in the delivery panel on the right side of the screen.", "mechanic": "mining", "valid_scenes": MINING_SCENES},
		{"id": "m1_return", "action_key": "return_rocket_home", "title": "Payload Secured: Return", "message": "The cargo hold is full of high-grade minerals. Initiate the return sequence to head back to Earth base.", "mechanic": "return", "valid_scenes": MINING_SCENES},
		{"id": "m1_debrief", "action_key": "resolve_mission_debrief", "title": "Mission Debrief", "message": "Finalize your mission logs, sell your cargo, and collect your payout. Completing this debrief will unlock the next phase of operations.", "mechanic": "debrief", "valid_scenes": DEBRIEF_SCENES}
	],
	2: [
		{"id": "m2_build_control_station", "action_key": "build_control_station", "title": "Command Infrastructure", "message": "Construct the Control Station at Earth Base. This specialized facility allows you to manage multiple ships and coordinate more complex contractor routes.", "mechanic": "progression", "valid_scenes": BASE_ONLY_SCENES}
	],
	3: [
		{"id": "m3_pick_contractor", "action_key": "accept_contractor_offer", "title": "Advanced Contracts", "message": "Select a new contractor. Higher levels unlock more specialized jobs with greater payout potential.", "mechanic": "contractor", "valid_scenes": LAUNCHPAD_SCENES},
		{"id": "m3_classify", "action_key": "classify_candidate", "title": "Scientific Analysis", "message": "Before targeting a TESS candidate, review its lightcurve. Distinguishing real planets from false positives is key to scientific progress.", "mechanic": "classification", "valid_scenes": LAUNCHPAD_SCENES},
		{"id": "m3_select", "action_key": "select_launch_target", "title": "Course Plotting", "message": "Confirmed scientific candidates are automatically entered into the navigation computer. Select your destination from the map to proceed.", "mechanic": "targeting", "valid_scenes": LAUNCHPAD_SCENES},
		{"id": "m3_launch", "action_key": "launch_rocket_from_earth", "title": "Deep Space Launch", "message": "Course confirmed. Initiate the launch sequence for your deep space mission.", "mechanic": "launch", "valid_scenes": LAUNCHPAD_SCENES},
		{"id": "m3_mine", "action_key": "mine_target", "title": "Resource Extraction", "message": "Extract valuable resources from the candidate world. Every gram contributes to our scientific understanding of the system.", "mechanic": "mining", "valid_scenes": MINING_SCENES},
		{"id": "m3_return", "action_key": "return_rocket_home", "title": "Return to Base", "message": "All samples secured. Return to Earth base for full analysis and processing.", "mechanic": "return", "valid_scenes": MINING_SCENES},
		{"id": "m3_debrief", "action_key": "resolve_mission_debrief", "title": "Operations Summary", "message": "Complete the debrief to formalize your findings. You are expanding the reach of human exploration.", "mechanic": "debrief", "valid_scenes": DEBRIEF_SCENES}
	],
	4: [
		{"id": "m4_open_launchpad", "action_key": "open_launchpad", "title": "Full Autonomy", "message": "Mission 4 marks your transition to full autonomy. Open the Launchpad to decide the future direction of your mining company.", "mechanic": "free-ops", "valid_scenes": BASE_ONLY_SCENES},
		{"id": "m4_select", "action_key": "select_launch_target", "title": "Select Route & Target", "message": "You can now choose between contractor-driven profit missions or independent scientific survey runs. Any reachable target is valid.", "mechanic": "targeting", "valid_scenes": LAUNCHPAD_SCENES},
		{"id": "m4_launch", "action_key": "launch_rocket_from_earth", "title": "Independent Launch", "message": "Initiate launch on your own terms. Your decisions now shape the growth of the Planet Hunters fleet.", "mechanic": "launch", "valid_scenes": LAUNCHPAD_SCENES},
		{"id": "m4_mine", "action_key": "mine_target", "title": "Autonomous Operations", "message": "Execute your mission plan. Contractor work provides steady growth, while survey runs prioritize scientific discovery.", "mechanic": "mining", "valid_scenes": MINING_SCENES},
		{"id": "m4_debrief", "action_key": "resolve_mission_debrief", "title": "Expansion Complete", "message": "Finalize Mission 4 to fully unlock Free Operations, giving you total control over all future mission parameters.", "mechanic": "debrief", "valid_scenes": DEBRIEF_SCENES}
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
