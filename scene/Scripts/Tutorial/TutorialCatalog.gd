extends RefCounted
class_name TutorialCatalog

const MAX_MISSION_STAGE := 4

# valid_scenes: scene file basenames where this step is actionable.
# Empty array = valid everywhere.
# When the player is in any other scene the overlay shows a holding message.
const BASE_ONLY_SCENES  := ["earth_base_1"]
const BASE_SCENES       := ["earth_base_1", "earth_launchpad"]
const LAUNCHPAD_SCENES  := ["earth_launchpad", "space_map", "galaxy_map"]
const LAUNCHPAD_ONLY    := ["earth_launchpad"]
const MINING_SCENES     := ["SidescrollMining"]
const DEBRIEF_SCENES    := ["earth_base_1", "mission_debrief_v2"]

const STEPS_BY_MISSION := {
	1: [
		{
			"id": "m1_welcome",
			"action_key": "open_launchpad",
			"title": "Get started",
			"message": "You run a space mining operation. Tap New Mission — pick a buyer, choose an asteroid, and launch your first rocket.",
			"mechanic": "intro",
			"valid_scenes": BASE_SCENES
		},
		{
			"id": "m1_pick_contractor",
			"action_key": "accept_contractor_offer",
			"title": "Lock a contract",
			"message": "Mining companies pay for specific minerals. Pick one — they'll tell you exactly what to collect and pay a bonus on delivery.",
			"mechanic": "contractor",
			"valid_scenes": LAUNCHPAD_SCENES
		},
		{
			"id": "m1_select_target",
			"action_key": "select_launch_target",
			"title": "Choose a destination",
			"message": "Tap an asteroid on the map. Closer ones are faster; composition affects your haul.",
			"mechanic": "targeting",
			"valid_scenes": LAUNCHPAD_SCENES
		},
		{
			"id": "m1_create_rocket",
			"action_key": "create_rocket",
			"title": "Assemble your rocket",
			"message": "Your Starter Rocket is loaded and ready. Tap Proceed to confirm the build.",
			"mechanic": "economy",
			"valid_scenes": LAUNCHPAD_ONLY
		},
		{
			"id": "m1_launch",
			"action_key": "launch_rocket_from_earth",
			"title": "Launch",
			"message": "Rocket assembled, target locked, contract active. Tap Launch Mission — your rocket departs immediately.",
			"mechanic": "launch",
			"valid_scenes": LAUNCHPAD_ONLY
		},
		{
			"id": "m1_mine_intro",
			"action_key": "arrived_at_mining_site",
			"title": "Arrival",
			"message": "You've reached the asteroid. Hold FIRE to deploy your mining laser and start extracting.",
			"mechanic": "mining-intro",
			"valid_scenes": MINING_SCENES
		},
		{
			"id": "m1_mine",
			"action_key": "mine_target",
			"title": "Fill the order",
			"message": "Mine the minerals listed in the Order panel on the right. Hit the required quantities to complete your contract.",
			"mechanic": "mining",
			"valid_scenes": MINING_SCENES
		},
		{
			"id": "m1_return",
			"action_key": "return_rocket_home",
			"title": "Head back",
			"message": "Order filled. Tap Return Home to fly back to Earth base.",
			"mechanic": "return",
			"valid_scenes": MINING_SCENES
		},
		{
			"id": "m1_debrief",
			"action_key": "resolve_mission_debrief",
			"title": "Collect your payout",
			"message": "Your rocket has returned. Open the Debrief to sell cargo and receive your contract bonus.",
			"mechanic": "debrief",
			"valid_scenes": DEBRIEF_SCENES
		}
	],
	2: [
		{
			"id": "m2_build_control_station",
			"action_key": "build_control_station",
			"title": "Build the Control Station",
			"message": "Tap Build, select Earth Base, then place the Control Station to unlock mission planning.",
			"mechanic": "progression",
			"valid_scenes": BASE_ONLY_SCENES
		}
	],
	3: [
		{
			"id": "m3_pick_contractor",
			"action_key": "accept_contractor_offer",
			"title": "Lock a contract",
			"message": "Pick a buyer and lock in a contract before you launch.",
			"mechanic": "contractor",
			"valid_scenes": LAUNCHPAD_SCENES
		},
		{
			"id": "m3_select",
			"action_key": "select_launch_target",
			"title": "Choose a destination",
			"message": "Tap an asteroid on the map and confirm the route.",
			"mechanic": "targeting",
			"valid_scenes": LAUNCHPAD_SCENES
		},
		{
			"id": "m3_launch",
			"action_key": "launch_rocket_from_earth",
			"title": "Launch",
			"message": "All systems ready. Tap Launch Mission.",
			"mechanic": "launch",
			"valid_scenes": LAUNCHPAD_ONLY
		},
		{
			"id": "m3_mine",
			"action_key": "mine_target",
			"title": "Extract samples",
			"message": "Collect the minerals listed in your contract order.",
			"mechanic": "mining",
			"valid_scenes": MINING_SCENES
		},
		{
			"id": "m3_return",
			"action_key": "return_rocket_home",
			"title": "Return home",
			"message": "Cargo secured. Tap Return Home.",
			"mechanic": "return",
			"valid_scenes": MINING_SCENES
		},
		{
			"id": "m3_debrief",
			"action_key": "resolve_mission_debrief",
			"title": "Debrief",
			"message": "Review your mission results and collect payment.",
			"mechanic": "debrief",
			"valid_scenes": DEBRIEF_SCENES
		}
	],
	4: [
		{
			"id": "m4_open_launchpad",
			"action_key": "open_launchpad",
			"title": "Free operations",
			"message": "You're in command now. Open New Mission to plan your next run — any reachable destination is yours.",
			"mechanic": "free-ops",
			"valid_scenes": BASE_ONLY_SCENES
		},
		{
			"id": "m4_select",
			"action_key": "select_launch_target",
			"title": "Pick your target",
			"message": "Any asteroid or confirmed candidate in range is valid.",
			"mechanic": "targeting",
			"valid_scenes": LAUNCHPAD_SCENES
		},
		{
			"id": "m4_launch",
			"action_key": "launch_rocket_from_earth",
			"title": "Launch",
			"message": "Your call. Tap Launch Mission.",
			"mechanic": "launch",
			"valid_scenes": LAUNCHPAD_ONLY
		},
		{
			"id": "m4_mine",
			"action_key": "mine_target",
			"title": "Mine",
			"message": "Fill your order — mine the minerals listed in the Order panel.",
			"mechanic": "mining",
			"valid_scenes": MINING_SCENES
		},
		{
			"id": "m4_debrief",
			"action_key": "resolve_mission_debrief",
			"title": "Debrief",
			"message": "Review your haul and collect payment.",
			"mechanic": "debrief",
			"valid_scenes": DEBRIEF_SCENES
		}
	]
}

func get_mission_steps(stage: int) -> Array:
	var normalized: int = clamp(stage, 1, MAX_MISSION_STAGE)
	var steps: Array = STEPS_BY_MISSION.get(normalized, [])
	return steps.duplicate(true)

func get_step(stage: int, index: int) -> Dictionary:
	var steps: Array = get_mission_steps(stage)
	if index < 0 or index >= steps.size():
		return {}
	return steps[index].duplicate(true)

func get_total_steps(stage: int) -> int:
	return get_mission_steps(stage).size()
