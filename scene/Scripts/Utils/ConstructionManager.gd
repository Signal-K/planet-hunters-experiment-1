extends RefCounted
class_name ConstructionManager

const RocketsManager = preload("res://Scripts/Utils/RocketsManager.gd")
const PushNotificationHelper = preload("res://Scripts/Utils/PushNotificationHelper.gd")

const PROJECTS := {
	"relay_1": {
		"name": "Scanning Relay Alpha",
		"description": "Increases scanner range and finding speed.",
		"requirements": {"Iron": 500, "Nickel": 200},
		"bonus": "scanner_cooldown_reduction",
		"bonus_value": 0.2
	},
	"refinery_1": {
		"name": "Refinery Outpost",
		"description": "Converts raw minerals into higher value exports.",
		"requirements": {"Iron": 1000, "Cobalt": 400},
		"bonus": "mineral_value_bonus",
		"bonus_value": 0.15
	},
	"settlement_1": {
		"name": "Frontier Settlement",
		"description": "Permanent base on an exoplanet. Unlocks new mission types.",
		"requirements": {"Iron": 2000, "Nickel": 1000, "Cobalt": 500, "Platinum": 100},
		"bonus": "unlock_mission_5",
		"bonus_value": 1.0
	}
}

static func get_available_projects() -> Array:
	var list = []
	var s = RocketsManager.load_state()
	var completed = s.get("completed_projects", [])
	
	for id in PROJECTS.keys():
		var p = PROJECTS[id].duplicate()
		p["id"] = id
		p["completed"] = completed.has(id)
		p["progress"] = get_project_progress(id)
		list.append(p)
	return list

static func get_project_progress(project_id: String) -> Dictionary:
	var s = RocketsManager.load_state()
	var progress = s.get("construction_progress", {})
	if typeof(progress) != TYPE_DICTIONARY:
		progress = {}
	return progress.get(project_id, {}).duplicate(true)

static func add_contribution(project_id: String, minerals: Dictionary) -> bool:
	if not PROJECTS.has(project_id):
		return false
		
	var reqs = PROJECTS[project_id].requirements
	var s = RocketsManager.load_state()
	var progress = s.get("construction_progress", {})
	if typeof(progress) != TYPE_DICTIONARY:
		progress = {}
		
	var current = progress.get(project_id, {})
	if typeof(current) != TYPE_DICTIONARY:
		current = {}
		
	# Check if we have the minerals in inventory first
	if not RocketsManager.consume_from_inventory(minerals):
		return false
		
	# Apply to project
	for m in minerals.keys():
		if reqs.has(m):
			current[m] = int(current.get(m, 0)) + int(minerals[m])
			
	progress[project_id] = current
	s["construction_progress"] = progress
	
	# Check if project completed
	var is_done = true
	for m in reqs.keys():
		if int(current.get(m, 0)) < int(reqs[m]):
			is_done = false
			break
			
	if is_done:
		var completed = s.get("completed_projects", [])
		if not completed.has(project_id):
			completed.append(project_id)
			s["completed_projects"] = completed
			PushNotificationHelper.schedule_construction_complete(project_id, 0.0)
			
	RocketsManager.save_state(s)
	return true

static func is_project_completed(project_id: String) -> bool:
	var s = RocketsManager.load_state()
	var completed = s.get("completed_projects", [])
	return completed.has(project_id)
