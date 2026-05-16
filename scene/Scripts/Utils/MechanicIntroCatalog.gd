extends RefCounted
## MechanicIntroCatalog.gd
## Content registry for all first-time mechanic introductions.
##
## Add a new entry here when a new game mechanic is introduced.
## Each entry is shown exactly once per player via FirstTimeMechanicTracker.

const ENTRIES: Dictionary = {
	## ── Construction ─────────────────────────────────────────────────────────
	"construction": {
		"title": "Structure Construction",
		"icon": "🏗️",
		"what": "At Level 5+, you can commission structures at Earth and on explored targets. Structures persist and generate ongoing bonuses.",
		"how": "Open the Construction panel from the Earth base menu. Select a structure type, provide the required minerals and Francs, and confirm. Construction completes over time.",
		"expect": "Structures unlock new capabilities (refineries, relay stations, habitats). Each one requires specific minerals — check the bill of materials before starting.",
	},

	## ── Mineral Refining ─────────────────────────────────────────────────────
	"refining": {
		"title": "Mineral Refining",
		"icon": "⚗️",
		"what": "Raw minerals sell at ~80% of market price. Refining them before selling yields significantly more Francs per kg.",
		"how": "Build an Earth-based Refinery (unlocks at Level 6). Send minerals to the refinery and wait for processing. Refined minerals appear in your inventory ready to sell.",
		"expect": "Refined minerals sell at full market price or above. Refining takes time, so plan ahead if you're running low on Francs. Contractors pay a further 20% on top for refined minerals that match their order.",
	},

	## ── Off-World Refinery ───────────────────────────────────────────────────
	"off_world_refinery": {
		"title": "Off-World Refinery",
		"icon": "🪐",
		"what": "Off-world refineries process minerals at the source — eliminating transport overhead and multiplying your net yield.",
		"how": "Build a refinery at an asteroid or planet target (unlocks at Level 7). Send a rocket to visit the refinery and collect the processed output. At Level 8 you get a dedicated mission slot for refinery runs.",
		"expect": "Off-world refineries have limited capacity per visit. At Level 8 a dedicated slot means refinery runs don't compete with your active contractor missions.",
	},

	## ── Free Operations ───────────────────────────────────────────────────────
	"free_operations": {
		"title": "Free Operations Unlocked!",
		"icon": "🚀",
		"what": "You've completed the guided mission path. You're now in Free Operations — choose your own targets, contractors, and strategies.",
		"how": "Open the Launchpad, pick any available target (asteroid or planet), select a contractor or sell on the open market, and launch. The universe is yours to explore.",
		"expect": "In Free Operations: contract payouts are 120% of base, market sales are 80%. Scanning reveals more targets. Reputation with contractors grows and unlocks better bonus multipliers.",
	},

	## ── Scanner Station ───────────────────────────────────────────────────────
	"scanner_station": {
		"title": "Scanner Station",
		"icon": "📡",
		"what": "The Scanner Station reveals new asteroid and planet targets within a certain range. It's your primary tool for finding new mining opportunities.",
		"how": "Open the Scanner from the Earth base. Each scan costs a small Franc fee and covers the current scanner range. Upgrade your scanner room to extend the range and reveal rarer targets.",
		"expect": "Newly revealed targets appear in the Launchpad. Planet targets take longer to reach but yield much higher quantities. Some targets may have already been partially mined by your previous missions.",
	},

	## ── Reusable Rockets Research ─────────────────────────────────────────────
	"reusable_research": {
		"title": "Reusable Rockets Research",
		"icon": "🔬",
		"what": "Investing in rocket reusability research permanently reduces the cost of every mission launch. Each research tier makes your fleet more economical.",
		"how": "Open the Menu → Rocket Research section (unlocks at Level 5). Purchase research tiers with Francs. Each tier reduces launch costs by 10%, up to 30% at maximum tier.",
		"expect": "Research is permanent and applies to all future rocket launches. Tier 1 is a solid early investment. Tier 3 pays off quickly at high mission volumes.",
	},
}

static func get_entry(mechanic_key: String) -> Dictionary:
	return ENTRIES.get(mechanic_key, {}).duplicate(true)

static func has_entry(mechanic_key: String) -> bool:
	return ENTRIES.has(mechanic_key)

static func all_keys() -> Array:
	return ENTRIES.keys()
