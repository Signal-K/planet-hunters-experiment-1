extends RefCounted
class_name ResearchManager

const AppControllerHelper = preload("res://Scripts/Utils/AppControllerHelper.gd")

const RocketsManager = preload("res://Scripts/Utils/RocketsManager.gd")

const RESEARCH_NODES := {
	"reusable_1": {
		"name": "Reusable Stage I",
		"description": "Increases rocket salvage refund to 25%.",
		"cost_francs": 500000000,
		"cost_science_xp": 10,
		"bonus": "salvage_refund_bonus",
		"bonus_value": 0.05
	},
	"reusable_2": {
		"name": "Reusable Stage II",
		"description": "Increases rocket salvage refund to 40%.",
		"cost_francs": 2000000000,
		"cost_science_xp": 25,
		"prereq": "reusable_1",
		"bonus": "salvage_refund_bonus",
		"bonus_value": 0.15
	},
	"deep_scan_1": {
		"name": "Deep Space Signal Processing",
		"description": "Unlocks detection of high-value distant asteroids.",
		"cost_francs": 1000000000,
		"cost_science_xp": 15,
		"bonus": "distant_asteroid_unlock",
		"bonus_value": 1.0
	}
}

static func get_available_research() -> Array:
	var list = []
	var s = RocketsManager.load_state()
	var completed = s.get("completed_research", [])
	
	for id in RESEARCH_NODES.keys():
		var node = RESEARCH_NODES[id].duplicate()
		node["id"] = id
		node["completed"] = completed.has(id)
		
		# Check prereqs
		var prereq = str(node.get("prereq", ""))
		node["locked"] = prereq != "" and not completed.has(prereq)
		
		list.append(node)
	return list

static func purchase_research(node_id: String) -> bool:
	if not RESEARCH_NODES.has(node_id):
		return false
		
	var node = RESEARCH_NODES[node_id]
	var s = RocketsManager.load_state()
	var completed = s.get("completed_research", [])
	
	if completed.has(node_id):
		return false
		
	# Check prereqs
	var prereq = str(node.get("prereq", ""))
	if prereq != "" and not completed.has(prereq):
		return false
		
	# Check costs (Science XP is just a check for now, Francs are consumed)
	var app = AppControllerHelper.get_instance()
	if app == null:
		return false
		
	var balance = int(app.get_franc_balance())
	if balance < int(node.cost_francs):
		return false
		
	# Consume francs
	app.add_franc_balance(-int(node.cost_francs), "research_purchase")
	
	# Mark as completed
	completed.append(node_id)
	s["completed_research"] = completed
	RocketsManager.save_state(s)
	return true

static func get_salvage_refund_multiplier() -> float:
	var total_bonus = 0.0
	var s = RocketsManager.load_state()
	var completed = s.get("completed_research", [])
	
	for id in completed:
		var node = RESEARCH_NODES.get(id, {})
		if str(node.get("bonus", "")) == "salvage_refund_bonus":
			total_bonus += float(node.get("bonus_value", 0.0))
			
	return 0.20 + total_bonus # Base 20% + research bonuses