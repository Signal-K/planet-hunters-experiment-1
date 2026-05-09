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
const DEBRIEF_SCENES := ["earth_base_1", "mission_debrief_v2"]

const STEPS_BY_MISSION := {
	1: [
		{"id": "m1_open_launchpad", "action_key": "open_launchpad", "title": "Start Mission 1", "message": "Welcome to Distant Signals. Tap New Mission to open the Launchpad and begin your first asteroid mining run.", "mechanic": "start", "valid_scenes": BASE_ONLY_SCENES},
		{"id": "m1_pick_contractor", "action_key": "accept_contractor_offer", "title": "Pick Contractor", "message": "Contractors pay a bonus when you deliver their requested minerals. Pick one before building your rocket.", "mechanic": "contractor", "valid_scenes": LAUNCHPAD_SCENES},
		{"id": "m1_create_rocket", "action_key": "create_rocket", "title": "Build Rocket", "message": "Build your first rocket here in the Launchpad. Starter Rocket 1 is ready to kit out.", "mechanic": "economy", "valid_scenes": LAUNCHPAD_SCENES},
		{"id": "m1_select_target", "action_key": "select_launch_target", "title": "Select Target", "message": "Select the Mission 1 asteroid as your destination.", "mechanic": "targeting", "valid_scenes": LAUNCHPAD_SCENES},
		{"id": "m1_launch", "action_key": "launch_rocket_from_earth", "title": "Launch", "message": "Everything's ready. Press Launch to leave Earth orbit.", "mechanic": "launch", "valid_scenes": LAUNCHPAD_SCENES},
		{"id": "m1_mine_intro", "action_key": "arrived_at_mining_site", "title": "Arrived", "message": "You're at the asteroid. Hold FIRE to activate your mining laser.", "mechanic": "mining-intro", "valid_scenes": MINING_SCENES},
		{"id": "m1_mine", "action_key": "mine_target", "title": "Mine", "message": "Mine the minerals your contractor ordered. Check the delivery panel on screen to track your progress.", "mechanic": "mining", "valid_scenes": MINING_SCENES},
		{"id": "m1_return", "action_key": "return_rocket_home", "title": "Return", "message": "Cargo hold loaded. Press Return to head back to Earth with your haul.", "mechanic": "return", "valid_scenes": MINING_SCENES},
		{"id": "m1_debrief", "action_key": "resolve_mission_debrief", "title": "Debrief", "message": "Sell your cargo and complete the debrief. Mission 2 unlocks when you're done.", "mechanic": "debrief", "valid_scenes": DEBRIEF_SCENES}
	],
	2: [
		{"id": "m2_build_control_station", "action_key": "build_control_station", "title": "Control Station", "message": "Build the Control Station before starting Mission 2. This unlocks the fleet hub, Starter Rocket 2 planning, and a structured contractor route.", "mechanic": "progression", "valid_scenes": BASE_ONLY_SCENES}
	],
	3: [
		{"id": "m3_pick_contractor", "action_key": "accept_contractor_offer", "title": "Pick Contractor", "message": "Choose a contractor for a delivery bonus on your haul.", "mechanic": "contractor", "valid_scenes": LAUNCHPAD_SCENES},
		{"id": "m3_classify", "action_key": "classify_candidate", "title": "Classify Candidate", "message": "Review the TESS lightcurve before choosing a target. Confirmed planet candidates can be routed; false positives still grant the classification reward.", "mechanic": "classification", "valid_scenes": LAUNCHPAD_SCENES},
		{"id": "m3_select", "action_key": "select_launch_target", "title": "Target Routed", "message": "Once a TESS candidate is confirmed, mission control routes it directly into launch setup so you can finish planning the rocket.", "mechanic": "targeting", "valid_scenes": LAUNCHPAD_SCENES},
		{"id": "m3_launch", "action_key": "launch_rocket_from_earth", "title": "Launch", "message": "Heading out to a real world. Press Launch.", "mechanic": "launch", "valid_scenes": LAUNCHPAD_SCENES},
		{"id": "m3_mine", "action_key": "mine_target", "title": "Mine", "message": "Mine what you can from the planet's surface.", "mechanic": "mining", "valid_scenes": MINING_SCENES},
		{"id": "m3_return", "action_key": "return_rocket_home", "title": "Return", "message": "Cargo secured. Return to Earth.", "mechanic": "return", "valid_scenes": MINING_SCENES},
		{"id": "m3_debrief", "action_key": "resolve_mission_debrief", "title": "Debrief", "message": "Deliver and debrief. You're building operational range.", "mechanic": "debrief", "valid_scenes": DEBRIEF_SCENES}
	],
	4: [
		{"id": "m4_open_launchpad", "action_key": "open_launchpad", "title": "Mission 4", "message": "Mission 4 is the handoff out of the strict tutorial rail. Open the Launchpad and decide how you want to run the next trip.", "mechanic": "free-ops", "valid_scenes": BASE_ONLY_SCENES},
		{"id": "m4_select", "action_key": "select_launch_target", "title": "Choose Route", "message": "You can take a contractor order for a payout bonus or line up your own survey run. Pick any reachable target from the Launchpad.", "mechanic": "targeting", "valid_scenes": LAUNCHPAD_SCENES},
		{"id": "m4_launch", "action_key": "launch_rocket_from_earth", "title": "Launch", "message": "Press Launch when the run looks right. From here the game starts giving you room to operate on your own terms.", "mechanic": "launch", "valid_scenes": LAUNCHPAD_SCENES},
		{"id": "m4_mine", "action_key": "mine_target", "title": "Run the Mission", "message": "Fly the mission the way you want. Contractor work pays cleanly; survey runs are there for your own goals and discoveries.", "mechanic": "mining", "valid_scenes": MINING_SCENES},
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
