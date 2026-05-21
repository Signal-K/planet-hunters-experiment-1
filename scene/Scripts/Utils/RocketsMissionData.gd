extends RefCounted
class_name RocketsMissionData

const PREDEFINED_MISSION_TARGETS := {
	1: {
		"id": "mission-1-training-target",
		"label": "433 Eros",
		"type": "asteroid",
		"distance_au": 3.0,
		"required_level": 1,
		"reward_ratio": 1.2
	},
	2: {
		"id": "mission-2-upgrade-target",
		"label": "Training Asteroid B",
		"type": "asteroid",
		"distance_au": 12.0,
		"required_level": 2,
		"reward_ratio": 1.2
	},
	4: {
		"id": "mission-4-autonomy-target",
		"label": "TOI-700 d",
		"type": "planet",
		"distance_au": 120.0,
		"required_level": 2,
		"reward_ratio": 1.4,
		"anomalySet": "telescope-tess",
		"tess_disposition": "PC",
		"classification_status": "candidate",
		"ticId": "TIC 150428135",
		"parent_star": "TOI-700",
		"star_system_id": "toi-700",
		"science_blurb": "Habitable zone candidate — first Free Operations target"
	}
}

const MISSION3_VISIBLE_TARGET_COUNT := 5
const MISSION2_VISIBLE_TARGET_COUNT := 3
const MISSION4_VISIBLE_TARGET_COUNT := 5
const FREE_OPS_VISIBLE_TARGET_COUNT := 5

const MISSION2_FALLBACK_TARGETS := [
	{
		"id": "mission-2-active-asteroid-133p",
		"label": "133P/Elst-Pizarro",
		"type": "asteroid",
		"distance_au": 3.2,
		"required_level": 2,
		"science_source": "Active Asteroids Programme",
		"science_blurb": "First known main-belt comet",
		"anomalySet": "active-asteroids",
		"classification_status": "candidate"
	},
	{
		"id": "mission-2-active-asteroid-238p",
		"label": "238P/Read",
		"type": "asteroid",
		"distance_au": 8.4,
		"required_level": 2,
		"science_source": "Active Asteroids Programme",
		"science_blurb": "Confirmed water-ice sublimation",
		"anomalySet": "active-asteroids",
		"classification_status": "candidate"
	},
	{
		"id": "mission-2-active-asteroid-259p",
		"label": "259P/Garradd",
		"type": "asteroid",
		"distance_au": 15.7,
		"required_level": 2,
		"science_source": "Active Asteroids Programme",
		"science_blurb": "Main-belt comet with recurrent activity",
		"anomalySet": "active-asteroids",
		"classification_status": "candidate"
	}
]

const MISSION3_FALLBACK_TARGETS := [
	{
		"id": "mission-3-tess-candidate-alpha",
		"label": "TOI-700 d",
		"type": "planet",
		"distance_au": 120.0,
		"required_level": 2,
		"reward_ratio": 1.25,
		"anomalySet": "telescope-tess",
		"tess_disposition": "PC",
		"classification_status": "candidate",
		"ticId": "TIC 150428135",
		"period_days": 37.43,
		"parent_star": "TOI-700",
		"star_system_id": "toi-700",
		"star_system_name": "TOI-700 System",
		"science_source": "NASA TESS",
		"science_blurb": "Lightcurve candidate near the habitable zone"
	},
	{
		"id": "mission-3-tess-candidate-beta",
		"label": "TOI-1452 b",
		"type": "planet",
		"distance_au": 174.0,
		"required_level": 2,
		"reward_ratio": 1.28,
		"anomalySet": "telescope-tess",
		"tess_disposition": "PC",
		"classification_status": "candidate",
		"ticId": "TIC 420112587",
		"period_days": 11.06,
		"parent_star": "TOI-1452",
		"star_system_id": "toi-1452",
		"star_system_name": "TOI-1452 System",
		"science_source": "NASA TESS",
		"science_blurb": "Water-world style transit signal"
	},
	{
		"id": "mission-3-tess-candidate-gamma",
		"label": "TOI-561 b",
		"type": "planet",
		"distance_au": 224.0,
		"required_level": 2,
		"reward_ratio": 1.30,
		"anomalySet": "telescope-tess",
		"tess_disposition": "PC",
		"classification_status": "candidate",
		"ticId": "TIC 377064495",
		"period_days": 0.45,
		"parent_star": "TOI-561",
		"star_system_id": "toi-561",
		"star_system_name": "TOI-561 System",
		"science_source": "NASA TESS",
		"science_blurb": "Ultra-short period planet"
	}
]

const OPEN_OPERATION_MODES := ["contract", "survey"]
const FREE_OPS_PAYOUT_CAP := 1400000000
const FIRST_MISSION_PAYOUT_MULT := 1.2
const EARLY_MISSION_PAYOUT_TARGET_MULT := 1.2

const FREE_OPS_CONTRACTOR_OFFERS := [
	{
		"id": "rocketlab",
		"name": "Rocketlab",
		"role": "Small satellite launch systems — common ore feedstock",
		"mineral_ranges": {"Iron": [40, 70], "Nickel": [25, 50]}
	},
	{
		"id": "astroforge",
		"name": "Astroforge",
		"role": "In-space smelting and refining — specialist materials",
		"mineral_ranges": {"Cobalt": [12, 28], "Silicates": [20, 45]}
	},
	{
		"id": "spacex",
		"name": "SpaceX",
		"role": "Heavy lift launch systems — structural metals",
		"mineral_ranges": {"Iron": [35, 60], "Nickel": [20, 40]}
	}
]

const STARTER_CONTRACTOR_OFFERS := [
	{
		"id": "aegis_defense",
		"name": "Aegis Defense Systems",
		"focus": "Defense-grade avionics and hardened military systems",
		"requested_minerals": {
			"Iron": 6,
			"Nickel": 4
		}
	},
	{
		"id": "lumen_consumer",
		"name": "Lumen Consumer Labs",
		"focus": "High-volume consumer electronics and smart devices",
		"requested_minerals": {
			"Iron": 5,
			"Nickel": 5
		}
	},
	{
		"id": "helion_orbital",
		"name": "Helion Orbital Works",
		"focus": "Next-gen propulsion and frontier space innovation",
		"requested_minerals": {
			"Iron": 4,
			"Nickel": 6
		}
	}
]
