extends RefCounted
class_name ItemCatalog

# Item taxonomy from notebook page 120 (28.02.26).
# Items are either Consumable (depletes on use, can be restocked/recharged)
# or Component (craftable/upgradeable module installed on the rocket).
enum ItemClass {
	CONSUMABLE,  # Rechargeable or single-use, restocked between missions
	COMPONENT,   # Persistent module, craftable and upgradeable
}

const ITEMS := {
	# ── Consumables ──────────────────────────────────────────────────────────
	"fuel_cell": {
		"name": "Fuel Cell",
		"class": ItemClass.CONSUMABLE,
		"subtype": "recharge",
		"description": "Propulsion fuel calculated at orbit. Cannot be topped up mid-flight — fill before launch.",
	},
	"mining_charge": {
		"name": "Mining Charge",
		"class": ItemClass.CONSUMABLE,
		"subtype": "consumable",
		"description": "Explosive charge for breaking hard surface formations.",
	},
	"parachute": {
		"name": "Parachute",
		"class": ItemClass.CONSUMABLE,
		"subtype": "consumable",
		"description": "Single-use atmospheric braking chute. Depletes on atmospheric landing.",
	},
	# ── Components ───────────────────────────────────────────────────────────
	"backbone_pack": {
		"name": "Backbone Pack",
		"class": ItemClass.COMPONENT,
		"category": "storage",
		"description": "Core internal frame that expands cargo capacity — the rocket's backbone/backpack.",
	},
	"cargo_storage": {
		"name": "Cargo Storage",
		"class": ItemClass.COMPONENT,
		"category": "storage",
		"description": "Pressurised ore storage bay for collected minerals.",
	},
	"mining_drill": {
		"name": "Mining Drill",
		"class": ItemClass.COMPONENT,
		"category": "mining",
		"description": "Surface extraction drill powered by the reactor core.",
	},
	"mining_disc": {
		"name": "Mining Disc",
		"class": ItemClass.COMPONENT,
		"category": "mining",
		"description": "Rotating disc array for high-efficiency surface mining.",
	},
	"hull_plating": {
		"name": "Hull Plating",
		"class": ItemClass.COMPONENT,
		"category": "armor",
		"description": "Structural armour protecting the rocket from impact and atmospheric stress.",
	},
	"reactor_core": {
		"name": "Reactor Core",
		"class": ItemClass.COMPONENT,
		"category": "power",
		"description": "Primary power source driving active rooms and mining tools.",
	},
	"pulsar_pool": {
		"name": "Pulsar Pool",
		"class": ItemClass.COMPONENT,
		"category": "power",
		"description": "High-output energy reservoir for burst-power events during extraction.",
	},
	"cannon": {
		"name": "Mining Cannon",
		"class": ItemClass.COMPONENT,
		"category": "mining",
		"description": "Kinetic launcher for fracturing dense mineral formations.",
	},
	"wheel_treads": {
		"name": "Wheel Treads",
		"class": ItemClass.COMPONENT,
		"category": "mobility",
		"description": "Surface traversal system for low-gravity asteroid terrain.",
	},
}

# Items available in the early-game resource scaffold (page 120 notes).
const EARLY_GAME_ITEMS := [
	"wheel_treads",
	"mining_disc",
	"reactor_core",
	"pulsar_pool",
	"cannon",
]

static func get_item(item_id: String) -> Dictionary:
	return ITEMS.get(item_id, {})

static func get_items_by_class(item_class: int) -> Array:
	var result := []
	for id in ITEMS:
		var entry: Dictionary = ITEMS[id]
		if int(entry.get("class", -1)) == item_class:
			var copy: Dictionary = entry.duplicate()
			copy["id"] = id
			result.append(copy)
	return result

static func get_items_by_category(category: String) -> Array:
	var result := []
	for id in ITEMS:
		var entry: Dictionary = ITEMS[id]
		if str(entry.get("category", "")) == category:
			var copy = entry.duplicate()
			copy["id"] = id
			result.append(copy)
	return result

static func is_early_game_item(item_id: String) -> bool:
	return item_id in EARLY_GAME_ITEMS
