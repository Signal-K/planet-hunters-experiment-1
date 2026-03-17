extends RefCounted
## MineralCatalog.gd
## Full mineral taxonomy — the single source of truth for all mineral types
## in the game. Defines tiers, rarity, pricing, colours, economic roles,
## and unlock levels for every mineral.
##
## Usage:
##   MineralCatalog.get_mineral("Iron")      → Dictionary
##   MineralCatalog.get_color("Cobalt")      → Color
##   MineralCatalog.get_tier("Platinum")     → int (1-4)
##   MineralCatalog.get_all_by_tier(2)       → Array[Dictionary]
##   MineralCatalog.get_spawn_weight("Iron") → float
##   MineralCatalog.get_base_price("Iron")   → int (F per kg)
##   MineralCatalog.all_names()              → Array[String]

## ─────────────────────────────────────────────────────────────────────────────
## Tier definitions
## ─────────────────────────────────────────────────────────────────────────────
## Tier 1 — Common      spawn weight ≈ 40–60 %  unlock: Level 1
## Tier 2 — Uncommon    spawn weight ≈ 20–30 %  unlock: Level 2
## Tier 3 — Rare        spawn weight ≈  8–15 %  unlock: Level 4
## Tier 4 — Ultra-rare  spawn weight ≈  2– 6 %  unlock: Level 6
## ─────────────────────────────────────────────────────────────────────────────

const MINERALS: Array = [
	## ── Tier 1 — Common ────────────────────────────────────────────────────
	{
		"id": "Iron",
		"symbol": "Fe",
		"name": "Iron",
		"tier": 1,
		"rarity": "common",
		"base_price": 5900000,       # F per kg
		"spawn_weight": 55.0,
		"color": Color(0.85, 0.38, 0.18, 1.0),   # rust-orange
		"unlock_level": 1,
		"primary_use": "Structural alloys, construction base material",
		"contractor_demand": "high",  # contractors frequently request this
		"description": "The backbone of space construction. Abundant on S-type asteroids.",
		"in_economy": true,           # currently tradable in-game
	},
	{
		"id": "Nickel",
		"symbol": "Ni",
		"name": "Nickel",
		"tier": 1,
		"rarity": "common",
		"base_price": 6000000,
		"spawn_weight": 48.0,
		"color": Color(0.68, 0.68, 0.48, 1.0),   # olive-silver
		"unlock_level": 1,
		"primary_use": "Stainless steel, battery cathodes, anti-corrosion coatings",
		"contractor_demand": "high",
		"description": "Pairs with Iron in most industrial alloys. Highly sought by early-tier contractors.",
		"in_economy": true,
	},
	{
		"id": "Silicates",
		"symbol": "SiO₂",
		"name": "Silicates",
		"tier": 1,
		"rarity": "common",
		"base_price": 5700000,
		"spawn_weight": 42.0,
		"color": Color(0.62, 0.58, 0.50, 1.0),   # dusty grey-brown
		"unlock_level": 1,
		"primary_use": "Insulation panels, glass, construction substrate, radiation shielding",
		"contractor_demand": "medium",
		"description": "The most common asteroid surface material. Low value individually, essential in bulk.",
		"in_economy": true,
	},

	## ── Tier 2 — Uncommon ──────────────────────────────────────────────────
	{
		"id": "Cobalt",
		"symbol": "Co",
		"name": "Cobalt",
		"tier": 2,
		"rarity": "uncommon",
		"base_price": 6100000,
		"spawn_weight": 28.0,
		"color": Color(0.28, 0.48, 0.95, 1.0),   # cobalt blue
		"unlock_level": 2,
		"primary_use": "Lithium-ion battery cathodes, superalloys for rocket turbines",
		"contractor_demand": "high",
		"description": "Critical for energy storage and high-temperature components. Astroforge demand is nearly insatiable.",
		"in_economy": true,
	},
	{
		"id": "Titanium",
		"symbol": "Ti",
		"name": "Titanium",
		"tier": 2,
		"rarity": "uncommon",
		"base_price": 7200000,
		"spawn_weight": 22.0,
		"color": Color(0.48, 0.52, 0.65, 1.0),   # steel-blue
		"unlock_level": 2,
		"primary_use": "Aerospace-grade structural frames, pressure vessels, biomedical implants",
		"contractor_demand": "medium",
		"description": "Exceptional strength-to-weight ratio. Required for building anything that has to survive launch.",
		"in_economy": false,  # unlocked at higher game stage
	},
	{
		"id": "Magnesium",
		"symbol": "Mg",
		"name": "Magnesium",
		"tier": 2,
		"rarity": "uncommon",
		"base_price": 6800000,
		"spawn_weight": 20.0,
		"color": Color(0.82, 0.88, 0.90, 1.0),   # pale blue-white
		"unlock_level": 3,
		"primary_use": "Lightweight alloy frames, flares, emergency oxygen supply",
		"contractor_demand": "medium",
		"description": "One-third lighter than aluminium. Increasingly important in deep-space habitat construction.",
		"in_economy": false,
	},

	## ── Tier 3 — Rare ──────────────────────────────────────────────────────
	{
		"id": "Platinum",
		"symbol": "Pt",
		"name": "Platinum",
		"tier": 3,
		"rarity": "rare",
		"base_price": 6200000,  # kept for backward compat; real economic premium via contractor bonus
		"spawn_weight": 12.0,
		"color": Color(0.95, 0.95, 0.82, 1.0),   # cream-white
		"unlock_level": 1,  # early unlock; low spawn weight keeps it rare in practice
		"primary_use": "Catalytic converters, hydrogen fuel cells, precision electronics",
		"contractor_demand": "very_high",
		"description": "The prize of asteroid mining. Karman+ pays a 22% premium above base for any quantity.",
		"in_economy": true,
	},
	{
		"id": "Palladium",
		"symbol": "Pd",
		"name": "Palladium",
		"tier": 3,
		"rarity": "rare",
		"base_price": 9500000,
		"spawn_weight": 9.0,
		"color": Color(0.78, 0.78, 0.85, 1.0),   # grey-silver
		"unlock_level": 4,
		"primary_use": "Hydrogen storage membranes, electronics contacts, catalytic cracking",
		"contractor_demand": "high",
		"description": "Rarer than Platinum per deposit. Essential for next-generation fuel cell arrays.",
		"in_economy": false,
	},
	{
		"id": "Gold",
		"symbol": "Au",
		"name": "Gold",
		"tier": 3,
		"rarity": "rare",
		"base_price": 11000000,
		"spawn_weight": 8.0,
		"color": Color(1.0, 0.84, 0.0, 1.0),     # gold
		"unlock_level": 4,
		"primary_use": "Precision electronics, corrosion-proof connectors, radiation shielding",
		"contractor_demand": "medium",
		"description": "Unmatched conductivity and corrosion resistance. Spacecraft electronics demand it.",
		"in_economy": false,
	},

	## ── Tier 4 — Ultra-rare ────────────────────────────────────────────────
	{
		"id": "Iridium",
		"symbol": "Ir",
		"name": "Iridium",
		"tier": 4,
		"rarity": "ultra_rare",
		"base_price": 18000000,
		"spawn_weight": 4.0,
		"color": Color(0.55, 0.62, 0.78, 1.0),   # slate blue-grey
		"unlock_level": 6,
		"primary_use": "Rocket nozzle liners, extreme-heat spacecraft components, spark plugs",
		"contractor_demand": "high",
		"description": "The densest naturally occurring element. Survives temperatures that destroy everything else.",
		"in_economy": false,
	},
	{
		"id": "Osmium",
		"symbol": "Os",
		"name": "Osmium",
		"tier": 4,
		"rarity": "ultra_rare",
		"base_price": 20000000,
		"spawn_weight": 3.0,
		"color": Color(0.42, 0.48, 0.55, 1.0),   # dark blue-grey
		"unlock_level": 6,
		"primary_use": "Ballistic shielding, hardening alloys, fountain pen nibs (legacy)",
		"contractor_demand": "medium",
		"description": "The densest element in existence. Found only in deep metallic asteroid cores.",
		"in_economy": false,
	},
	{
		"id": "Rhenium",
		"symbol": "Re",
		"name": "Rhenium",
		"tier": 4,
		"rarity": "ultra_rare",
		"base_price": 24000000,
		"spawn_weight": 2.0,
		"color": Color(0.58, 0.55, 0.52, 1.0),   # warm grey
		"unlock_level": 7,
		"primary_use": "Single-crystal turbine blades, high-temperature resistors, nuclear reactors",
		"contractor_demand": "high",
		"description": "One of the rarest elements in Earth's crust — but the asteroid belt is generous.",
		"in_economy": false,
	},
]

## ─────────────────────────────────────────────────────────────────────────────
## Lookup helpers
## ─────────────────────────────────────────────────────────────────────────────

## Internal lookup dict, built once on first access.
static var _by_id: Dictionary = {}

static func _ensure_index() -> void:
	if not _by_id.is_empty():
		return
	for entry in MINERALS:
		_by_id[str(entry.get("id", ""))] = entry

static func get_mineral(mineral_id: String) -> Dictionary:
	_ensure_index()
	return _by_id.get(mineral_id, {}).duplicate(true)

static func get_color(mineral_id: String) -> Color:
	var m := get_mineral(mineral_id)
	if m.is_empty():
		return Color(0.6, 0.6, 0.6, 1.0)
	return m.get("color", Color(0.6, 0.6, 0.6, 1.0))

static func get_tier(mineral_id: String) -> int:
	return int(get_mineral(mineral_id).get("tier", 1))

static func get_rarity(mineral_id: String) -> String:
	return str(get_mineral(mineral_id).get("rarity", "common"))

static func get_base_price(mineral_id: String) -> int:
	return int(get_mineral(mineral_id).get("base_price", 5000000))

static func get_spawn_weight(mineral_id: String) -> float:
	return float(get_mineral(mineral_id).get("spawn_weight", 30.0))

static func get_unlock_level(mineral_id: String) -> int:
	return int(get_mineral(mineral_id).get("unlock_level", 1))

static func is_in_economy(mineral_id: String) -> bool:
	return bool(get_mineral(mineral_id).get("in_economy", false))

static func get_primary_use(mineral_id: String) -> String:
	return str(get_mineral(mineral_id).get("primary_use", ""))

static func get_description(mineral_id: String) -> String:
	return str(get_mineral(mineral_id).get("description", ""))

## All minerals in the full taxonomy.
static func all_names() -> Array:
	var result: Array = []
	for m in MINERALS:
		result.append(str(m.get("id", "")))
	return result

## Minerals currently tradable in the game economy.
static func economy_names() -> Array:
	var result: Array = []
	for m in MINERALS:
		if bool(m.get("in_economy", false)):
			result.append(str(m.get("id", "")))
	return result

## All minerals of a given tier (1–4).
static func get_all_by_tier(tier: int) -> Array:
	var result: Array = []
	for m in MINERALS:
		if int(m.get("tier", 1)) == tier:
			result.append(m.duplicate(true))
	return result

## Minerals available at a given player level (spawn_weight > 0 and unlock_level ≤ level).
static func available_at_level(level: int) -> Array:
	var result: Array = []
	for m in MINERALS:
		if int(m.get("unlock_level", 1)) <= level:
			result.append(m.duplicate(true))
	return result

## Build a weighted spawn pool for a given player level.
## Returns Array of { id, weight } suitable for a weighted random picker.
static func spawn_pool_for_level(level: int) -> Array:
	var result: Array = []
	for m in MINERALS:
		if int(m.get("unlock_level", 1)) <= level:
			result.append({
				"id": str(m.get("id", "")),
				"weight": float(m.get("spawn_weight", 0.0)),
			})
	return result

## Rarity tier display names.
static func tier_label(tier: int) -> String:
	match tier:
		1: return "Common"
		2: return "Uncommon"
		3: return "Rare"
		4: return "Ultra-rare"
	return "Unknown"

## Rarity colour for UI (matches tier colour convention).
static func tier_color(tier: int) -> Color:
	match tier:
		1: return Color(0.70, 0.70, 0.70, 1.0)  # grey
		2: return Color(0.35, 0.75, 0.35, 1.0)  # green
		3: return Color(0.40, 0.60, 1.00, 1.0)  # blue
		4: return Color(0.85, 0.55, 1.00, 1.0)  # purple
	return Color(1.0, 1.0, 1.0, 1.0)
