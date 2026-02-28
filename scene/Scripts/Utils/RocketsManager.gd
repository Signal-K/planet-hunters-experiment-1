extends RefCounted
class_name RocketsManager

const STATE_PATH := "user://rockets_state.json"
const DEFAULT_STATE_PATH := "res://rockets_state.json"
const RETURN_DURATION_SECONDS := 60
const MISSION_DURATION_SECONDS := 60
const RocketSpecs = preload("res://Scripts/Utils/RocketSpecs.gd")
const HashUtils = preload("res://Scripts/Utils/HashUtils.gd")
const RocketsStateAccess = preload("res://Scripts/Utils/RocketsStateAccess.gd")
const RocketsMissionProgress = preload("res://Scripts/Utils/RocketsMissionProgress.gd")
const RocketsTargeting = preload("res://Scripts/Utils/RocketsTargeting.gd")
const KNOWN_ROCKET_TYPES := ["starterrocket1", "starterrocket2", "starterrocket3"]
const ROCKET_UNLOCK_LEVELS := {
    "starterrocket1": 1,
    "starterrocket2": 2,
    "starterrocket3": 3
}
const AU_IN_KM := 149597870.7
const ASTEROID_DISTANCE_BANDS_AU := [3.0, 24.0]
const ASTEROID_REQUIRED_LEVEL_BY_BAND := [1, 2]
const PLANET_DISTANCE_BANDS_AU := [120.0, 220.0, 340.0]
const PLANET_REQUIRED_LEVEL_BY_BAND := [3, 3, 3]
const MISSION_PROGRESS_SCHEMA_VERSION := 2
const SCANNER_UNLOCK_COMPLETED_MISSIONS := 2

## Mission System Constants
## See: @doc/specs/mission-system-specification for complete mission design

# Scanner Station build cost (Mission 3 unlock)
# Spec: M3 requires 2B F scanner construction before first scan
const SCANNER_BUILD_COST := 2000000000

# Predefined mission targets with reward ratios
# Spec: M1=1.2x, M2=1.3x, M4=1.4x, M5=1.1x base
const PREDEFINED_MISSION_TARGETS := {
    1: {
        "id": "mission-1-training-target",
        "label": "Training Asteroid A",
        "type": "asteroid",
        "distance_au": 3.0,
        "required_level": 1,
        "reward_ratio": 1.2  # Spec: M1 gentle introduction, guaranteed profit
    },
    2: {
        "id": "mission-2-upgrade-target",
        "label": "Training Asteroid B",
        "type": "asteroid",
        "distance_au": 12.0,
        "required_level": 2,
        "reward_ratio": 1.3  # Spec: M2 reward upgrade investment
    },
    4: {
        "id": "mission-4-exoplanet-target",
        "label": "Exoplanet Kepler-442b Proxy",
        "type": "planet",
        "distance_au": 120.0,
        "required_level": 3,
        "reward_ratio": 1.4  # Spec: M4 reward planetary exploration
    },
    5: {
        "id": "mission-5-contractor-target",
        "label": "Contract Asteroid C",
        "type": "asteroid",
        "distance_au": 8.0,
        "required_level": 1,
        "reward_ratio": 1.1  # Spec: M5 base ratio, contractor effects provide value
    }
}

# Mission 3: Scanner-driven target selection
# Spec: Shows 5 untargeted asteroids, 1 reachable by SR2
const MISSION3_VISIBLE_TARGET_COUNT := 5
const MISSION2_VISIBLE_TARGET_COUNT := 3
const MISSION2_FALLBACK_TARGETS := [
    {
        "id": "mission-2-upgrade-target",
        "label": "Training Asteroid B",
        "type": "asteroid",
        "distance_au": 12.0,
        "required_level": 2
    },
    {
        "id": "mission-2-variant-near",
        "label": "Survey Asteroid Delta",
        "type": "asteroid",
        "distance_au": 8.0,
        "required_level": 2
    },
    {
        "id": "mission-2-variant-mid",
        "label": "Survey Asteroid Epsilon",
        "type": "asteroid",
        "distance_au": 18.0,
        "required_level": 2
    }
]
const MISSION3_FALLBACK_TARGETS := [
    {
        "id": "mission-3-scanner-fallback-primary",
        "label": "Fallback Scan Asteroid Alpha",
        "type": "asteroid",
        "distance_au": 12.0,
        "required_level": 2
    },
    {
        "id": "mission-3-scanner-fallback-delta",
        "label": "Fallback Scan Asteroid Delta",
        "type": "asteroid",
        "distance_au": 24.0,
        "required_level": 2
    },
    {
        "id": "mission-3-scanner-fallback-epsilon",
        "label": "Fallback Scan Asteroid Epsilon",
        "type": "asteroid",
        "distance_au": 24.0,
        "required_level": 2
    }
]

# Mission 4: Planetary exploration
# Spec: Shows 5 untargeted planets, requires SR3
const MISSION4_VISIBLE_TARGET_COUNT := 5

# Mission 5: Contractor missions
# Spec: Shows 5 asteroid targets matching contractor mineral requests
const MISSION5_VISIBLE_TARGET_COUNT := 5
const OPEN_OPERATION_MODES := ["contract", "survey"]
const ROCKET_FLAG_OPTIONS := ["Earth Union", "Signal-K", "Open Science", "Frontier Guild"]
const ROCKET_LOGO_OPTIONS := ["Star", "Wave", "Miner", "Pulse"]

# Mission 5 payout cap
# Spec: Maximum 1.4B F payout to prevent over-earning
const MISSION5_PAYOUT_CAP := 1400000000

# Mission 5 contractor offers
# Spec: Rocketlab (20% build discount) vs Astroforge (1.15x payout bonus)
const MISSION5_CONTRACTOR_OFFERS := [
    {
        "id": "rocketlab",
        "name": "Rocketlab",
        "effect": "build_discount",
        "build_discount_pct": 0.20  # Spec: 20% off rocket purchase
    },
    {
        "id": "astroforge",
        "name": "Astroforge",
        "effect": "payout_bonus",
        "payout_bonus_mult": 1.15  # Spec: 1.15x payout (capped at 1.4B)
    }
]

static var _preview_target: Dictionary = {}
static var _return_to_new_mission_panel: bool = false
static var _preview_index: int = 0
static var _override_state: Dictionary = {}
static var _returned_mission: Dictionary = {}
static var _orbiting_rockets: Dictionary = {}
static var _pending_mission_guidance_id: int = 0

static func load_state() -> Dictionary:
    return RocketsStateAccess.load_state(
        STATE_PATH,
        DEFAULT_STATE_PATH,
        _override_state,
        SCANNER_UNLOCK_COMPLETED_MISSIONS,
        Callable(RocketsManager, "_migrate_mission_progress_schema"),
        Callable(RocketsManager, "_sanitize_completed_badges"),
        Callable(RocketsManager, "save_state")
    )

static func save_state(data: Dictionary) -> bool:
    var ok = RocketsStateAccess.save_state(
        data,
        STATE_PATH,
        DEFAULT_STATE_PATH,
        MISSION_PROGRESS_SCHEMA_VERSION
    )
    if ok:
        _override_state = {}
    return ok

static func set_override_state(data: Dictionary) -> void:
    _override_state = data.duplicate(true)

static func clear_override_state() -> void:
    _override_state = {}

static func get_unlocked() -> Array:
    var s = load_state()
    return s.get("unlocked", [])

static func is_unlocked(rocket_id: String) -> bool:
    return get_unlocked().has(rocket_id)

static func unlock(rocket_id: String) -> bool:
    var s = load_state()
    var arr = s.get("unlocked", [])
    if not arr.has(rocket_id):
        arr.append(rocket_id)
        s["unlocked"] = arr
        return save_state(s)
    return true

static func get_completed_mission_count() -> int:
    var s = load_state()
    return RocketsMissionProgress.completed_mission_count_from_state(s)

static func get_last_completed_target_id() -> String:
    var log = preload("res://Scripts/Utils/MissionLogManager.gd")
    if not log:
        return ""
    var rows = log.get_missions()
    if rows.is_empty():
        return ""
    var latest_row := {}
    var latest_epoch := 0
    for row in rows:
        var ts = str(row.get("timestamp", ""))
        var epoch = Time.get_unix_time_from_datetime_string(ts) if ts != "" else 0
        if epoch >= latest_epoch:
            latest_epoch = epoch
            latest_row = row
    return str(latest_row.get("target_id", ""))

static func get_mission_stage() -> int:
    return RocketsMissionProgress.mission_stage_from_completed(get_completed_mission_count())

static func get_scanner_build_cost() -> int:
    return SCANNER_BUILD_COST

static func is_scanner_unlocked() -> bool:
    var s = load_state()
    var progress_unlock = max(int(s.get("mission_progress_completed", 0)), 0) >= SCANNER_UNLOCK_COMPLETED_MISSIONS
    return bool(s.get("scanner_unlocked", false)) or progress_unlock

static func is_scanner_station_built() -> bool:
    var s = load_state()
    return bool(s.get("scanner_station_built", false))

static func set_scanner_station_built(built: bool) -> bool:
    var s = load_state()
    s["scanner_station_built"] = built
    return save_state(s)

static func is_scanner_unlock_dialog_seen() -> bool:
    var s = load_state()
    return bool(s.get("scanner_unlock_dialog_seen", false))

static func set_scanner_unlock_dialog_seen(seen: bool) -> bool:
    var s = load_state()
    s["scanner_unlock_dialog_seen"] = seen
    return save_state(s)

static func can_afford_scanner_build(balance: int) -> bool:
    return balance >= SCANNER_BUILD_COST

static func get_predefined_mission_target(stage: int) -> Dictionary:
    if PREDEFINED_MISSION_TARGETS.has(stage):
        return PREDEFINED_MISSION_TARGETS[stage].duplicate(true)
    return {}

static func get_target_reward_ratio(target_id: String) -> float:
    if target_id == "":
        return 0.0
    for stage in PREDEFINED_MISSION_TARGETS.keys():
        var item = PREDEFINED_MISSION_TARGETS[stage]
        if str(item.get("id", "")) != target_id:
            continue
        return max(float(item.get("reward_ratio", 0.0)), 0.0)
    return 0.0

static func get_targeted_target_ids() -> Dictionary:
    var targeted := {}
    var mission_log = preload("res://Scripts/Utils/MissionLogManager.gd")
    if mission_log:
        var rows = mission_log.get_missions()
        for row in rows:
            var tid = str(row.get("target_id", ""))
            if tid != "":
                targeted[tid] = true
    var missions = get_missions()
    for mission in missions:
        var mission_target = str(mission.get("target", ""))
        if mission_target != "":
            targeted[mission_target] = true
    return targeted

static func get_mission3_targets(detected_targets: Array = []) -> Array:
    var source = detected_targets
    if source.is_empty():
        source = get_detected_targets()
    return RocketsTargeting.select_visible_targets(
        source,
        get_targeted_target_ids(),
        "asteroid",
        MISSION3_VISIBLE_TARGET_COUNT,
        _primary_fallback_target_for_stage(3)
    )

static func get_mission2_targets(detected_targets: Array = []) -> Array:
    var source = detected_targets
    if source.is_empty():
        source = get_detected_targets()
    var targeted = get_targeted_target_ids()
    var selected: Array = []
    for target_any in source:
        if typeof(target_any) != TYPE_DICTIONARY:
            continue
        var target: Dictionary = target_any
        var target_id = str(target.get("id", ""))
        if target_id == "" or targeted.has(target_id):
            continue
        if _normalize_target_type(str(target.get("type", "asteroid"))) != "asteroid":
            continue
        selected.append(target.duplicate(true))
        if selected.size() >= MISSION2_VISIBLE_TARGET_COUNT:
            break
    for fallback_any in MISSION2_FALLBACK_TARGETS:
        if selected.size() >= MISSION2_VISIBLE_TARGET_COUNT:
            break
        if typeof(fallback_any) != TYPE_DICTIONARY:
            continue
        var fallback: Dictionary = fallback_any
        var fallback_id = str(fallback.get("id", ""))
        if fallback_id == "" or targeted.has(fallback_id):
            continue
        var exists := false
        for row_any in selected:
            if typeof(row_any) != TYPE_DICTIONARY:
                continue
            if str(row_any.get("id", "")) == fallback_id:
                exists = true
                break
        if exists:
            continue
        selected.append(fallback.duplicate(true))
    return selected

static func get_mission4_targets(detected_targets: Array = []) -> Array:
    var source = detected_targets
    if source.is_empty():
        source = get_detected_targets()
    return RocketsTargeting.select_visible_targets(
        source,
        get_targeted_target_ids(),
        "planet",
        MISSION4_VISIBLE_TARGET_COUNT,
        get_predefined_mission_target(4)
    )

static func get_mission5_targets(detected_targets: Array = []) -> Array:
    var source = detected_targets
    if source.is_empty():
        source = get_detected_targets()
    return RocketsTargeting.select_visible_targets(
        source,
        get_targeted_target_ids(),
        "asteroid",
        MISSION5_VISIBLE_TARGET_COUNT,
        get_predefined_mission_target(5)
    )

static func get_mission5_payout_cap() -> int:
    return MISSION5_PAYOUT_CAP

static func get_mission5_contractors() -> Array:
    return MISSION5_CONTRACTOR_OFFERS.duplicate(true)

static func ensure_mission5_contract_offer(detected_targets: Array = []) -> Dictionary:
    if get_mission_stage() < 5:
        return {}
    var s = load_state()
    var existing = s.get("mission5_contract_offer", {})
    if typeof(existing) == TYPE_DICTIONARY and not existing.is_empty():
        var recommended_id = str(existing.get("recommended_target_id", ""))
        var selected_contractor = str(existing.get("selected_contractor", ""))
        var has_recommended = recommended_id != ""
        var has_valid_selected = selected_contractor == "" or _find_mission5_contractor(selected_contractor).size() > 0
        if has_recommended and has_valid_selected:
            return existing.duplicate(true)
    var offer = _build_mission5_contract_offer(detected_targets)
    s["mission5_contract_offer"] = offer.duplicate(true)
    save_state(s)
    return offer

static func get_mission5_contract_offer() -> Dictionary:
    var s = load_state()
    var offer = s.get("mission5_contract_offer", {})
    if typeof(offer) != TYPE_DICTIONARY:
        return {}
    return offer.duplicate(true)

static func clear_mission5_contract_offer() -> bool:
    var s = load_state()
    s["mission5_contract_offer"] = {}
    return save_state(s)

static func is_mission_briefing_seen(stage: int) -> bool:
    if stage <= 0:
        return false
    var s = load_state()
    var seen = s.get("mission_briefings_seen", {})
    if typeof(seen) != TYPE_DICTIONARY:
        return false
    return bool(seen.get(str(stage), false))

static func mark_mission_briefing_seen(stage: int) -> bool:
    if stage <= 0:
        return false
    var s = load_state()
    var seen = s.get("mission_briefings_seen", {})
    if typeof(seen) != TYPE_DICTIONARY:
        seen = {}
    seen[str(stage)] = true
    s["mission_briefings_seen"] = seen
    return save_state(s)

static func select_mission5_contractor(contractor_id: String) -> bool:
    if contractor_id == "":
        return false
    if _find_mission5_contractor(contractor_id).is_empty():
        return false
    var offer = ensure_mission5_contract_offer()
    if offer.is_empty():
        return false
    offer["selected_contractor"] = contractor_id
    var s = load_state()
    s["mission5_contract_offer"] = offer
    return save_state(s)

static func get_mission5_selected_contractor() -> Dictionary:
    var offer = get_mission5_contract_offer()
    if offer.is_empty():
        return {}
    var selected = str(offer.get("selected_contractor", ""))
    if selected == "":
        return {}
    return _find_mission5_contractor(selected).duplicate(true)

static func get_mission5_purchase_cost(rocket_id_or_type: String) -> int:
    var base_cost = RocketSpecs.get_cost(rocket_id_or_type)
    if get_mission_stage() < 5:
        return base_cost
    var selected = get_mission5_selected_contractor()
    if get_operation_mode() != "contract":
        return base_cost
    if str(selected.get("effect", "")) != "build_discount":
        return base_cost
    var discount_pct = clamp(float(selected.get("build_discount_pct", 0.0)), 0.0, 0.95)
    return int(round(float(base_cost) * (1.0 - discount_pct)))

static func apply_mission5_payout_terms(base_payout: int, contractor_id: String = "") -> int:
    var payout = max(base_payout, 0)
    if get_mission_stage() < 5:
        return payout
    if get_operation_mode() != "contract":
        return payout
    var selected := {}
    if contractor_id != "":
        selected = _find_mission5_contractor(contractor_id)
    if selected.is_empty():
        selected = get_mission5_selected_contractor()
    if str(selected.get("effect", "")) == "payout_bonus":
        var bonus_mult = max(float(selected.get("payout_bonus_mult", 1.0)), 1.0)
        payout = int(round(float(payout) * bonus_mult))
    return min(payout, MISSION5_PAYOUT_CAP)

static func debug_complete_mission_for_progression() -> bool:
    var mission_log = preload("res://Scripts/Utils/MissionLogManager.gd")
    if not mission_log:
        return false
    var now = int(Time.get_unix_time_from_system())
    var completed = get_completed_mission_count()
    var idx = completed + 1
    var target_id = "debug-target-%d" % idx
    var rocket_type = "starterrocket1"
    var rocket_id = "%s-debug-%d" % [rocket_type, now]
    if completed >= 2:
        rocket_type = "starterrocket3"
        rocket_id = "%s-debug-%d" % [rocket_type, now]
    elif completed >= 1:
        rocket_type = "starterrocket2"
        rocket_id = "%s-debug-%d" % [rocket_type, now]
    var entry = {
        "timestamp": Time.get_datetime_string_from_system(),
        "rocket_id": rocket_id,
        "target_id": target_id,
        "label": "Debug Target %d" % idx,
        "action": "debug_skip_mission",
        "payout": 0,
        "cargo": {},
        "badge": "debug-skip-%d" % now
    }
    var ok = mission_log.add_mission(entry)
    if not ok:
        return false
    mark_mission_completed(str(entry.get("badge", "")))
    if completed == 0:
        unlock("starterrocket2")
    return true

static func debug_launch_mining_test() -> bool:
    var s = load_state()
    var rng = RandomNumberGenerator.new()
    rng.randomize()
    
    var unlocked = s.get("unlocked", ["starterrocket1"])
    var rocket_type = unlocked[rng.randi() % unlocked.size()]
    var rocket_id = "%s-test-%d" % [rocket_type, Time.get_ticks_msec()]
    
    var target_id = "test-asteroid-%d" % rng.randi()
    var target_label = "Test Asteroid %d" % (rng.randi() % 999 + 1)
    
    var placed = s.get("placed", [])
    placed.append({
        "id": rocket_id,
        "type": rocket_type,
        "status": "inTransit",
        "target": target_id,
        "label": target_label,
        "launch_time": 0,
        "arrival_time": 0
    })
    s["placed"] = placed
    save_state(s)
    
    set_preview_target(target_id, target_label, "asteroid", rocket_id)
    mark_arrived(rocket_id, target_id)
    
    return true

static func mark_mission_completed(badge: String = "") -> bool:
    var s = load_state()
    var badges = s.get("completed_mission_badges", [])
    if typeof(badges) != TYPE_ARRAY:
        badges = []
    var normalized_badge = badge.strip_edges()
    if normalized_badge != "":
        if badges.has(normalized_badge):
            return true
        badges.append(normalized_badge)
    s["completed_mission_badges"] = badges
    _sanitize_completed_badges(s)
    s["mission_progress_completed"] = s.get("completed_mission_badges", []).size()
    s["scanner_unlocked"] = int(s.get("mission_progress_completed", 0)) >= SCANNER_UNLOCK_COMPLETED_MISSIONS
    if int(s.get("mission_progress_completed", 0)) >= 1:
        var unlocked = s.get("unlocked", [])
        if typeof(unlocked) != TYPE_ARRAY:
            unlocked = []
        if not unlocked.has("starterrocket2"):
            unlocked.append("starterrocket2")
        if int(s.get("mission_progress_completed", 0)) >= 3 and not unlocked.has("starterrocket3"):
            unlocked.append("starterrocket3")
        s["unlocked"] = unlocked
    return save_state(s)

static func get_rocket_level(rocket_id_or_type: String) -> int:
    var rocket_type = RocketSpecs.rocket_type_from_id(rocket_id_or_type)
    return int(ROCKET_UNLOCK_LEVELS.get(rocket_type, 1))

static func get_primary_awaiting_rocket_id() -> String:
    var placed = get_placed()
    for item in placed:
        if str(item.get("status", "")) == "awaitingLaunch":
            return str(item.get("id", ""))
    return ""

static func build_target_profile(target_id: String, target_type: String = "asteroid") -> Dictionary:
    var normalized_type = _normalize_target_type(target_type)
    var predefined = get_predefined_target_profile(target_id)
    if not predefined.is_empty():
        return predefined
    if get_mission_stage() == 2 and normalized_type == "asteroid":
        for variant_any in MISSION2_FALLBACK_TARGETS:
            if typeof(variant_any) != TYPE_DICTIONARY:
                continue
            var variant: Dictionary = variant_any
            if str(variant.get("id", "")) != target_id:
                continue
            var distance = float(variant.get("distance_au", 12.0))
            return {
                "distance_au": distance,
                "distance_km": distance * AU_IN_KM,
                "required_level": int(variant.get("required_level", 2)),
                "type": "asteroid"
            }
    if get_mission_stage() == 3 and normalized_type == "asteroid":
        var mission3_targets = get_mission3_targets()
        for i in range(mission3_targets.size()):
            var item = mission3_targets[i]
            if str(item.get("id", "")) != target_id:
                continue
            if i == 0:
                return {
                    "distance_au": 12.0,
                    "distance_km": 12.0 * AU_IN_KM,
                    "required_level": 2,
                    "type": "asteroid"
                }
            return {
                "distance_au": 24.0,
                "distance_km": 24.0 * AU_IN_KM,
                "required_level": 2,
                "type": "asteroid"
            }
    if get_mission_stage() == 4 and normalized_type == "planet":
        var mission4_targets = get_mission4_targets()
        for i in range(mission4_targets.size()):
            var item = mission4_targets[i]
            if str(item.get("id", "")) != target_id:
                continue
            if i == 0:
                return {
                    "distance_au": 120.0,
                    "distance_km": 120.0 * AU_IN_KM,
                    "required_level": 3,
                    "type": "planet"
                }
            return {
                "distance_au": 220.0,
                "distance_km": 220.0 * AU_IN_KM,
                "required_level": 3,
                "type": "planet"
            }
    if get_mission_stage() >= 5 and normalized_type == "asteroid":
        var mission5_targets = get_mission5_targets()
        for i in range(mission5_targets.size()):
            var item = mission5_targets[i]
            if str(item.get("id", "")) != target_id:
                continue
            var distance_au = 8.0 if i == 0 else 24.0
            return {
                "distance_au": distance_au,
                "distance_km": distance_au * AU_IN_KM,
                "required_level": 1 if i == 0 else 2,
                "type": "asteroid"
            }
    if target_id == "":
        if normalized_type == "planet":
            return {
                "distance_au": 120.0,
                "distance_km": 120.0 * AU_IN_KM,
                "required_level": 3,
                "type": "planet"
            }
        return {
            "distance_au": 0.0,
            "distance_km": 0.0,
            "required_level": 1,
            "type": "asteroid"
        }
    var seed = HashUtils.simple_hash("%s:%s" % [target_id, normalized_type])
    var distance_bands = PLANET_DISTANCE_BANDS_AU if normalized_type == "planet" else ASTEROID_DISTANCE_BANDS_AU
    var required_bands = PLANET_REQUIRED_LEVEL_BY_BAND if normalized_type == "planet" else ASTEROID_REQUIRED_LEVEL_BY_BAND
    var bucket = int(seed % distance_bands.size())
    var distance_au = float(distance_bands[bucket])
    var required_level = int(required_bands[min(bucket, required_bands.size() - 1)])
    return {
        "distance_au": distance_au,
        "distance_km": distance_au * AU_IN_KM,
        "required_level": required_level,
        "type": normalized_type
    }

static func unlock_for_level(level: int) -> Array:
    var newly_unlocked := []
    if level < 1:
        return newly_unlocked
    for rocket_id in ROCKET_UNLOCK_LEVELS.keys():
        var required_level = int(ROCKET_UNLOCK_LEVELS[rocket_id])
        if level >= required_level:
            if unlock(rocket_id):
                newly_unlocked.append(rocket_id)
    return newly_unlocked

static func get_placed() -> Array:
    var s = load_state()
    return s.get("placed", [])

static func get_rocket_customization_options() -> Dictionary:
    return {
        "flags": ROCKET_FLAG_OPTIONS.duplicate(),
        "logos": ROCKET_LOGO_OPTIONS.duplicate()
    }

static func get_rocket_customization(rocket_id: String) -> Dictionary:
    if rocket_id == "":
        return {}
    var s = load_state()
    var all = s.get("rocket_customizations", {})
    if typeof(all) != TYPE_DICTIONARY:
        all = {}
    var existing = all.get(rocket_id, {})
    if typeof(existing) != TYPE_DICTIONARY:
        existing = {}
    var rocket_type = RocketSpecs.rocket_type_from_id(rocket_id)
    return {
        "flag": str(existing.get("flag", ROCKET_FLAG_OPTIONS[0])),
        "logo": str(existing.get("logo", ROCKET_LOGO_OPTIONS[0])),
        "rocket_type": rocket_type
    }

static func set_rocket_customization(rocket_id: String, customization: Dictionary) -> bool:
    if rocket_id == "":
        return false
    var s = load_state()
    var all = s.get("rocket_customizations", {})
    if typeof(all) != TYPE_DICTIONARY:
        all = {}
    var current = get_rocket_customization(rocket_id)
    current["flag"] = str(customization.get("flag", current.get("flag", ROCKET_FLAG_OPTIONS[0])))
    current["logo"] = str(customization.get("logo", current.get("logo", ROCKET_LOGO_OPTIONS[0])))
    all[rocket_id] = current
    s["rocket_customizations"] = all
    return save_state(s)

static func get_launched() -> Array:
    var s = load_state()
    return s.get("launched", [])

static func get_destroyed() -> Array:
    var s = load_state()
    return s.get("destroyed", [])

static func is_launched(rocket_id: String) -> bool:
    return get_launched().has(rocket_id)

static func set_launched(rocket_id: String) -> bool:
    var s = load_state()
    var arr = s.get("launched", [])
    var changed = false
    if not arr.has(rocket_id):
        arr.append(rocket_id)
        s["launched"] = arr
        changed = true
    # mark matching placed entries with status = "launched" so restore logic can skip them
    var placed = s.get("placed", [])
    for i in range(placed.size() - 1, -1, -1):
        if placed[i].get("id", "") == rocket_id:
            placed[i]["status"] = "launched"
            changed = true
    s["placed"] = placed
    _set_status_changed_at_in_state(s, rocket_id, "launched")
    if changed:
        return save_state(s)
    return true

static func select_target(target_id: String) -> bool:
    if target_id == "":
        return false
    if not is_target_selectable_for_current_stage(target_id):
        return false
    var s = load_state()
    if typeof(target_id) != TYPE_STRING:
        return false
    s["selected_target"] = target_id
    return save_state(s)

static func force_select_detected_target(target_id: String) -> bool:
    if target_id == "":
        return false
    var detected = get_detected_targets()
    var exists = false
    for item_any in detected:
        if typeof(item_any) != TYPE_DICTIONARY:
            continue
        var item: Dictionary = item_any
        if str(item.get("id", "")) == target_id:
            exists = true
            break
    if not exists:
        return false
    var s = load_state()
    s["selected_target"] = target_id
    return save_state(s)

static func get_selected_target() -> String:
    var s = load_state()
    return str(s.get("selected_target", ""))

static func is_target_selectable_for_current_stage(target_id: String) -> bool:
    if target_id == "":
        return false
    var selectable = get_selectable_targets_for_stage()
    for target in selectable:
        if str(target.get("id", "")) == target_id:
            return true
    return false

static func get_selectable_targets_for_stage(stage: int = -1) -> Array:
    var mission_stage = stage if stage > 0 else get_mission_stage()
    if mission_stage == 1:
        var predefined = get_predefined_mission_target(mission_stage)
        return [predefined] if not predefined.is_empty() else []
    if mission_stage == 2:
        return get_mission2_targets()
    if mission_stage == 3:
        return get_mission3_targets()
    if mission_stage == 4:
        return get_mission4_targets()
    if mission_stage == 5:
        return get_mission5_targets()
    return get_detected_targets()

static func ensure_selected_target_for_launch(rocket_id: String = "") -> Dictionary:
    var existing_target_id = get_selected_target()
    if existing_target_id != "" and is_target_selectable_for_current_stage(existing_target_id):
        var existing_details = get_target_details(existing_target_id)
        return {
            "ok": true,
            "target_id": existing_target_id,
            "target_type": str(existing_details.get("type", "asteroid")),
            "target_label": str(existing_details.get("label", existing_target_id)),
            "fallback_used": false
        }

    var mission_stage = get_mission_stage()
    var selectable = get_selectable_targets_for_stage(mission_stage)
    if selectable.is_empty():
        _ensure_stage_fallback_targets(mission_stage)
        selectable = get_selectable_targets_for_stage(mission_stage)

    var rocket_level = get_rocket_level(rocket_id) if rocket_id != "" else 99
    var selected_row := {}
    for item_any in selectable:
        if typeof(item_any) != TYPE_DICTIONARY:
            continue
        var item: Dictionary = item_any
        var tid = str(item.get("id", ""))
        if tid == "":
            continue
        var profile = build_target_profile(tid, str(item.get("type", "asteroid")))
        if int(profile.get("required_level", 1)) <= rocket_level:
            selected_row = item
            break
    if selected_row.is_empty() and not selectable.is_empty():
        selected_row = selectable[0]
    if selected_row.is_empty():
        return {
            "ok": false,
            "target_id": "",
            "fallback_used": false,
            "reason": "No playable targets available"
        }

    var selected_id = str(selected_row.get("id", ""))
    if selected_id == "":
        return {
            "ok": false,
            "target_id": "",
            "fallback_used": false,
            "reason": "Resolved fallback target was invalid"
        }
    if not select_target(selected_id):
        return {
            "ok": false,
            "target_id": "",
            "fallback_used": false,
            "reason": "Failed to persist fallback target selection"
        }
    var selected_type = str(selected_row.get("type", "asteroid"))
    var selected_label = str(selected_row.get("label", selected_id))
    var notice = "Scan fallback engaged: proceeding to %s." % selected_label
    set_launch_fallback_notice(notice)
    return {
        "ok": true,
        "target_id": selected_id,
        "target_type": selected_type,
        "target_label": selected_label,
        "fallback_used": true,
        "notice": notice
    }

static func get_mission_exposure_reward(stage: int) -> int:
    var safe_stage = max(stage, 1)
    return 4 + (safe_stage - 1)

static func get_target_details(target_id: String) -> Dictionary:
    if target_id == "":
        return {}
    for stage in PREDEFINED_MISSION_TARGETS.keys():
        var item = PREDEFINED_MISSION_TARGETS[stage]
        if str(item.get("id", "")) == target_id:
            return item.duplicate(true)
    var detected = get_detected_targets()
    for target in detected:
        if str(target.get("id", "")) == target_id:
            return target.duplicate(true)
    var preview = get_preview_target()
    if str(preview.get("id", "")) == target_id:
        return preview.duplicate(true)
    var returned = get_returned_mission()
    if str(returned.get("target_id", "")) == target_id:
        return {
            "id": target_id,
            "label": str(returned.get("label", target_id)),
            "type": str(returned.get("type", "asteroid"))
        }
    return {
        "id": target_id,
        "label": target_id,
        "type": "asteroid"
    }

static func clear_selected_target() -> bool:
    var s = load_state()
    s["selected_target"] = ""
    return save_state(s)

static func add_mission(rocket_id: String, target_id: String, launch_time_epoch: int, travel_seconds: int = 0) -> bool:
    var s = load_state()
    var missions = s.get("missions", [])
    var effective_travel_seconds = travel_seconds
    if effective_travel_seconds <= 0:
        effective_travel_seconds = get_mission_duration_seconds_for_rocket(rocket_id)
    var arrival = launch_time_epoch + effective_travel_seconds
    var record = {
        "rocket_id": rocket_id,
        "target": target_id,
        "launch_time": launch_time_epoch,
        "arrival_time": arrival,
        "operation_mode": get_operation_mode()
    }
    missions.append(record)
    s["missions"] = missions
    _set_status_changed_at_in_state(s, rocket_id, "launched", launch_time_epoch)
    # Reset arrival flag for new mission
    var arrived = s.get("arrived", {})
    if arrived.has(rocket_id):
        arrived.erase(rocket_id)
        s["arrived"] = arrived
    return save_state(s)

static func get_missions() -> Array:
    var s = load_state()
    return s.get("missions", [])

static func set_detected_targets(targets: Array) -> bool:
    var s = load_state()
    # store simplified detected targets array (array of dictionaries)
    s["detected_targets"] = targets
    return save_state(s)

static func get_detected_targets() -> Array:
    var s = load_state()
    var targets = s.get("detected_targets", [])
    print("RocketsManager: get_detected_targets -> count=", targets.size())
    return targets

static func set_launch_fallback_notice(message: String) -> bool:
    var s = load_state()
    s["launch_fallback_notice"] = message.strip_edges()
    return save_state(s)

static func consume_launch_fallback_notice() -> String:
    var s = load_state()
    var message = str(s.get("launch_fallback_notice", ""))
    s["launch_fallback_notice"] = ""
    save_state(s)
    return message

static func register_target_interaction(target_id: String, target_type: String) -> int:
    if target_id == "":
        return 0
    var s = load_state()
    var normalized_type = _normalize_target_type(target_type)
    var key = "seen_planets" if normalized_type == "planet" else "seen_asteroids"
    var list = s.get(key, [])
    for i in range(list.size()):
        if str(list[i]) == target_id:
            return i + 1
    list.append(target_id)
    s[key] = list
    save_state(s)
    return list.size()

static func increment_target_scan_count(target_id: String, target_type: String, amount: int = 1) -> int:
    if target_id == "":
        return 0
    var s = load_state()
    var counts = s.get("scan_counts", {})
    if typeof(counts) != TYPE_DICTIONARY:
        counts = {}
    var key = _scan_count_key(target_id, target_type)
    var next_count = max(int(counts.get(key, 0)) + max(amount, 1), 1)
    counts[key] = next_count
    s["scan_counts"] = counts
    save_state(s)
    return next_count

static func get_target_scan_count(target_id: String, target_type: String) -> int:
    if target_id == "":
        return 0
    var s = load_state()
    var counts = s.get("scan_counts", {})
    if typeof(counts) != TYPE_DICTIONARY:
        return 0
    return int(counts.get(_scan_count_key(target_id, target_type), 0))

static func record_scan_pass(targets: Array) -> bool:
    if targets.is_empty():
        return false
    var s = load_state()
    var counts = s.get("scan_counts", {})
    if typeof(counts) != TYPE_DICTIONARY:
        counts = {}
    var changed := false
    for target in targets:
        var target_id = str(target.get("id", ""))
        if target_id == "":
            continue
        var key = _scan_count_key(target_id, str(target.get("type", "asteroid")))
        counts[key] = int(counts.get(key, 0)) + 1
        changed = true
    if not changed:
        return false
    s["scan_counts"] = counts
    return save_state(s)

static func get_target_level(target_id: String, target_type: String) -> int:
    if target_id == "":
        return 0
    var s = load_state()
    var normalized_type = _normalize_target_type(target_type)
    var key = "seen_planets" if normalized_type == "planet" else "seen_asteroids"
    var list = s.get(key, [])
    for i in range(list.size()):
        if str(list[i]) == target_id:
            return i + 1
    return 0

static func set_destroyed(rocket_id: String) -> bool:
    var s = load_state()
    var changed = false
    # Ensure rocket_id is recorded in destroyed list
    var d = s.get("destroyed", [])
    if not d.has(rocket_id):
        d.append(rocket_id)
        s["destroyed"] = d
        changed = true
    # Remove from launched list if present
    var l = s.get("launched", [])
    if l.has(rocket_id):
        l.erase(rocket_id)
        s["launched"] = l
        changed = true
    # Mark matching placed entries with status = "Destroyed"
    var placed = s.get("placed", [])
    for i in range(placed.size() - 1, -1, -1):
        if placed[i].get("id", "") == rocket_id:
            placed[i]["status"] = "Destroyed"
            changed = true
    s["placed"] = placed
    _set_status_changed_at_in_state(s, rocket_id, "Destroyed")
    if changed:
        return save_state(s)
    return true

static func return_home(rocket_id: String) -> bool:
    if rocket_id == "":
        return false
    var s = load_state()
    var changed = false

    # Remove from launched list
    var launched = s.get("launched", [])
    if launched.has(rocket_id):
        launched.erase(rocket_id)
        s["launched"] = launched
        changed = true

    # Remove mission entries for this rocket
    var missions = s.get("missions", [])
    for i in range(missions.size() - 1, -1, -1):
        if str(missions[i].get("rocket_id", "")) == rocket_id:
            missions.remove_at(i)
            changed = true
    s["missions"] = missions

    # Update placed entry to returningHome or add a new one
    var placed = s.get("placed", [])
    var found = false
    for i in range(placed.size()):
        if str(placed[i].get("id", "")) == rocket_id:
            placed[i]["status"] = "returningHome"
            placed[i]["x"] = placed[i].get("x", -110.0)
            placed[i]["y"] = placed[i].get("y", -170.0)
            found = true
            changed = true
            break
    if not found:
        var rtype = _rocket_type_from_id(rocket_id)
        placed.append({"type": rtype, "id": rocket_id, "x": -110.0, "y": -170.0, "status": "returningHome"})
        changed = true
    s["placed"] = placed

    # Track returning rocket
    var returning = s.get("returning", [])
    var exists = false
    for entry in returning:
        if str(entry.get("rocket_id", "")) == rocket_id:
            exists = true
            break
    if not exists:
        returning.append({"rocket_id": rocket_id})
        s["returning"] = returning
        changed = true

    var returning_started = s.get("returning_started", {})
    var now = int(Time.get_unix_time_from_system())
    returning_started[rocket_id] = now
    s["returning_started"] = returning_started
    _set_status_changed_at_in_state(s, rocket_id, "returningHome", now)
    changed = true

    # Clear arrival flag when returning
    var arrived = s.get("arrived", {})
    if arrived.has(rocket_id):
        arrived.erase(rocket_id)
        s["arrived"] = arrived
        changed = true

    if changed:
        return save_state(s)
    return true

static func finalize_return(rocket_id: String) -> bool:
    if rocket_id == "":
        return false
    var s = load_state()
    var changed = false
    var now = int(Time.get_unix_time_from_system())
    var placed = s.get("placed", [])
    for i in range(placed.size()):
        if str(placed[i].get("id", "")) == rocket_id:
            placed[i]["status"] = "returned"
            changed = true
            break
    s["placed"] = placed
    var returning = s.get("returning", [])
    for i in range(returning.size() - 1, -1, -1):
        if str(returning[i].get("rocket_id", "")) == rocket_id:
            returning.remove_at(i)
            changed = true
    s["returning"] = returning
    var returning_started = s.get("returning_started", {})
    if returning_started.has(rocket_id):
        returning_started.erase(rocket_id)
        s["returning_started"] = returning_started
        changed = true
    var arrived = s.get("arrived", {})
    if arrived.has(rocket_id):
        arrived.erase(rocket_id)
        s["arrived"] = arrived
        changed = true
    _set_status_changed_at_in_state(s, rocket_id, "returned", now)
    if changed:
        return save_state(s)
    return true

static func get_return_started_at(rocket_id: String) -> int:
    if rocket_id == "":
        return 0
    var s = load_state()
    var returning_started = s.get("returning_started", {})
    return int(returning_started.get(rocket_id, 0))

static func has_return_completed(rocket_id: String) -> bool:
    if rocket_id == "":
        return false
    var started_at = get_return_started_at(rocket_id)
    if started_at <= 0:
        return false
    var now = int(Time.get_unix_time_from_system())
    return (now - started_at) >= get_return_duration_seconds_for_rocket(rocket_id)

static func mark_returned_if_due(rocket_id: String) -> bool:
    if rocket_id == "":
        return false
    if not has_return_completed(rocket_id):
        return false
    var s = load_state()
    var changed = false
    var now = int(Time.get_unix_time_from_system())
    var placed = s.get("placed", [])
    for i in range(placed.size()):
        if str(placed[i].get("id", "")) == rocket_id:
            if str(placed[i].get("status", "")) != "returned":
                placed[i]["status"] = "returned"
                changed = true
            break
    s["placed"] = placed
    var returning = s.get("returning", [])
    for i in range(returning.size() - 1, -1, -1):
        if str(returning[i].get("rocket_id", "")) == rocket_id:
            returning.remove_at(i)
            changed = true
    s["returning"] = returning
    var returning_started = s.get("returning_started", {})
    if returning_started.has(rocket_id):
        returning_started.erase(rocket_id)
        s["returning_started"] = returning_started
        changed = true
    _set_status_changed_at_in_state(s, rocket_id, "returned", now)
    if changed:
        return save_state(s)
    return true

static func mark_arrived(rocket_id: String, target_id: String) -> bool:
    if rocket_id == "" or target_id == "":
        return false
    var s = load_state()
    var arrived = s.get("arrived", {})
    arrived[rocket_id] = {"target_id": target_id, "arrived_at": Time.get_unix_time_from_system()}
    s["arrived"] = arrived
    return save_state(s)

static func has_arrived(rocket_id: String, target_id: String) -> bool:
    if rocket_id == "" or target_id == "":
        return false
    var s = load_state()
    var arrived = s.get("arrived", {})
    if not arrived.has(rocket_id):
        return false
    var entry = arrived.get(rocket_id, {})
    return str(entry.get("target_id", "")) == target_id

static func get_rocket_status(rocket_id: String) -> String:
    if rocket_id == "":
        return ""
    var s = load_state()
    var placed = s.get("placed", [])
    for item in placed:
        if str(item.get("id", "")) == rocket_id:
            return str(item.get("status", ""))
    return ""

static func _rocket_type_from_id(rocket_id: String) -> String:
    if rocket_id.find("-") != -1:
        var parts = rocket_id.split("-")
        if parts.size() > 0:
            return str(parts[0])
    return rocket_id

static func add_placed(rocket_type: String, position: Vector2) -> String:
    var s = load_state()
    var arr = s.get("placed", [])
    # Generate a unique id for this placed rocket
    # Generate a reasonably-unique id using a random number generator to avoid engine-specific time APIs
    var rng = RandomNumberGenerator.new()
    rng.randomize()
    var uid = "%s-%d" % [rocket_type, rng.randi()]
    arr.append({"type": rocket_type, "id": uid, "x": position.x, "y": position.y, "status": "awaitingLaunch"})
    s["placed"] = arr
    var customizations = s.get("rocket_customizations", {})
    if typeof(customizations) != TYPE_DICTIONARY:
        customizations = {}
    if not customizations.has(uid):
        customizations[uid] = {
            "flag": ROCKET_FLAG_OPTIONS[0],
            "logo": ROCKET_LOGO_OPTIONS[0],
            "rocket_type": rocket_type
        }
    s["rocket_customizations"] = customizations
    _set_status_changed_at_in_state(s, uid, "awaitingLaunch")
    save_state(s)
    return uid

static func reset_state() -> bool:
    # Reset rockets state to defaults: only starter rocket unlocked, no placed rockets
    var data = RocketsStateAccess.build_default_state(MISSION_PROGRESS_SCHEMA_VERSION)
    _override_state = data.duplicate(true)
    var ok = save_state(data)
    if ok:
        _override_state = {}
        return true
    # Fallback: write directly to user:// if JSONFileManager failed
    var direct_ok = _write_state_direct(data)
    if direct_ok:
        _override_state = {}
        return true
    var verify = load_state()
    var unlocked = verify.get("unlocked", [])
    var placed = verify.get("placed", [])
    if unlocked == ["starterrocket1"] and placed.is_empty():
        print("RocketsManager: reset_state verified via load_state fallback")
        return true
    print("RocketsManager: reset_state failed to persist user state; using in-memory override")
    _override_state = data.duplicate(true)
    return true

static func _write_state_direct(data: Dictionary) -> bool:
    var ok = RocketsStateAccess.write_state_direct(data, STATE_PATH)
    if ok:
        print("RocketsManager: direct state write succeeded: ", STATE_PATH)
    return ok

static func set_preview_target(target_id: String, target_label: String, target_type: String = "asteroid", rocket_id: String = "") -> void:
    _preview_target = {
        "id": target_id,
        "label": target_label,
        "type": target_type,
        "rocket_id": rocket_id
    }
    var s = load_state()
    s["preview_target"] = _preview_target.duplicate(true)
    save_state(s)

static func get_preview_target() -> Dictionary:
    var target = _preview_target.duplicate()
    if target.is_empty():
        var s = load_state()
        var stored = s.get("preview_target", {})
        if typeof(stored) == TYPE_DICTIONARY:
            target = stored.duplicate(true)
    if not target.has("type"):
        target["type"] = "asteroid"
    if not target.has("rocket_id"):
        target["rocket_id"] = ""
    if str(target.get("rocket_id", "")) == "":
        target["rocket_id"] = resolve_preview_rocket_id(str(target.get("id", "")))
    var preview_rocket_id = str(target.get("rocket_id", ""))
    if preview_rocket_id != "":
        target["rocket_customization"] = get_rocket_customization(preview_rocket_id)
    return target

static func clear_preview_target() -> void:
    _preview_target = {}
    var s = load_state()
    s["preview_target"] = {}
    save_state(s)

static func set_returned_mission(rocket_id: String, target_id: String, target_label: String, target_type: String, operation_mode: String = "") -> void:
    var resolved_mode = operation_mode.strip_edges().to_lower()
    if not OPEN_OPERATION_MODES.has(resolved_mode):
        resolved_mode = get_operation_mode_for_rocket(rocket_id)
    _returned_mission = {
        "rocket_id": rocket_id,
        "target_id": target_id,
        "label": target_label,
        "type": target_type,
        "operation_mode": resolved_mode,
        "rocket_customization": get_rocket_customization(rocket_id)
    }
    var s = load_state()
    s["returned_mission"] = _returned_mission.duplicate(true)
    save_state(s)

static func get_returned_mission() -> Dictionary:
    if _returned_mission.size() > 0:
        return _returned_mission.duplicate()
    var s = load_state()
    var stored = s.get("returned_mission", {})
    if typeof(stored) == TYPE_DICTIONARY:
        return stored.duplicate()
    return {}

static func clear_returned_mission() -> void:
    _returned_mission = {}
    var s = load_state()
    s["returned_mission"] = {}
    save_state(s)

static func add_orbiting_rocket(rocket_id: String, target_id: String, label: String, target_type: String) -> void:
    if rocket_id == "":
        return
    _orbiting_rockets[rocket_id] = {
        "rocket_id": rocket_id,
        "target_id": target_id,
        "label": label,
        "type": target_type
    }

static func remove_orbiting_rocket(rocket_id: String) -> void:
    if rocket_id == "":
        return
    if _orbiting_rockets.has(rocket_id):
        _orbiting_rockets.erase(rocket_id)

static func get_orbiting_rockets() -> Array:
    var out := []
    for key in _orbiting_rockets.keys():
        out.append(_orbiting_rockets[key])
    return out

static func get_returned_rockets() -> Array:
    var out := []
    var s = load_state()
    var placed = s.get("placed", [])
    for item in placed:
        if str(item.get("status", "")) != "returned":
            continue
        var rid = str(item.get("id", ""))
        if rid == "":
            continue
        out.append({
            "rocket_id": rid,
            "target_id": "",
            "label": "Returned to Earth",
            "type": "planet"
        })
    return out

static func set_return_to_new_mission_panel(enabled: bool) -> void:
    _return_to_new_mission_panel = enabled

static func consume_return_to_new_mission_panel() -> bool:
    var flag = _return_to_new_mission_panel
    _return_to_new_mission_panel = false
    return flag

static func set_pending_mission_guidance_id(mission_id: int) -> bool:
    var safe_id = max(mission_id, 0)
    _pending_mission_guidance_id = safe_id
    var s = load_state()
    s["pending_mission_guidance_id"] = safe_id
    return save_state(s)

static func get_pending_mission_guidance_id() -> int:
    if _pending_mission_guidance_id > 0:
        return _pending_mission_guidance_id
    var s = load_state()
    var stored = max(int(s.get("pending_mission_guidance_id", 0)), 0)
    _pending_mission_guidance_id = stored
    return stored

static func consume_pending_mission_guidance_id() -> int:
    var current = get_pending_mission_guidance_id()
    _pending_mission_guidance_id = 0
    var s = load_state()
    s["pending_mission_guidance_id"] = 0
    save_state(s)
    return current

static func get_preview_index() -> int:
    return _preview_index

static func set_preview_index(idx: int) -> void:
    _preview_index = max(idx, 0)

static func get_preview_candidates() -> Array:
    var missions = get_missions()
    var launched = get_launched()
    if missions.is_empty() or launched.is_empty():
        return []
    var target_map := {}
    var targets = get_detected_targets()
    for t in targets:
        var tid = str(t.get("id", ""))
        if tid == "":
            continue
        target_map[tid] = {
            "label": str(t.get("label", tid)),
            "type": str(t.get("type", "asteroid"))
        }
    missions.sort_custom(Callable(RocketsManager, "_sort_mission_by_launch_time"))
    var out := []
    for m in missions:
        var rocket_id = str(m.get("rocket_id", ""))
        var target_id = str(m.get("target", ""))
        if rocket_id == "" or target_id == "":
            continue
        if not launched.has(rocket_id):
            continue
        var entry = target_map.get(target_id, {})
        var label = str(entry.get("label", "Asteroid %s" % target_id))
        var ttype = str(entry.get("type", "asteroid"))
        out.append({
            "rocket_id": rocket_id,
            "target_id": target_id,
            "label": label,
            "type": ttype
        })
    return out

static func get_mission_for_rocket(rocket_id: String) -> Dictionary:
    if rocket_id == "":
        return {}
    var missions = get_missions()
    if missions.is_empty():
        return {}
    var latest := {}
    var latest_launch := -1.0
    for m in missions:
        if str(m.get("rocket_id", "")) != rocket_id:
            continue
        var launch = float(m.get("launch_time", 0))
        if launch >= latest_launch:
            latest_launch = launch
            latest = m
    return latest

static func get_operation_mode() -> String:
    var s = load_state()
    var mode = str(s.get("operation_mode", "contract")).strip_edges().to_lower()
    if not OPEN_OPERATION_MODES.has(mode):
        return "contract"
    return mode

static func set_operation_mode(mode: String) -> bool:
    var normalized = mode.strip_edges().to_lower()
    if not OPEN_OPERATION_MODES.has(normalized):
        return false
    var s = load_state()
    s["operation_mode"] = normalized
    return save_state(s)

static func get_open_operation_modes() -> Array:
    return OPEN_OPERATION_MODES.duplicate(true)

static func get_operation_mode_for_rocket(rocket_id: String) -> String:
    var mission = get_mission_for_rocket(rocket_id)
    var from_mission = str(mission.get("operation_mode", "")).strip_edges().to_lower()
    if OPEN_OPERATION_MODES.has(from_mission):
        return from_mission
    return get_operation_mode()

static func get_latest_mission_for_target(target_id: String) -> Dictionary:
    if target_id == "":
        return {}
    var missions = get_missions()
    if missions.is_empty():
        return {}
    var latest := {}
    var latest_launch := -1.0
    for m in missions:
        if str(m.get("target", "")) != target_id:
            continue
        var launch = float(m.get("launch_time", 0))
        if launch >= latest_launch:
            latest_launch = launch
            latest = m
    return latest

static func resolve_preview_rocket_id(target_id: String = "") -> String:
    var target := {}
    if _preview_target.size() > 0:
        target = _preview_target.duplicate(true)
    else:
        var s = load_state()
        var stored = s.get("preview_target", {})
        if typeof(stored) == TYPE_DICTIONARY:
            target = stored.duplicate(true)
    var rocket_id = str(target.get("rocket_id", ""))
    if rocket_id != "":
        return rocket_id
    var target_id_effective = target_id
    if target_id_effective == "":
        target_id_effective = str(target.get("id", ""))
    var launched = get_launched()
    if launched.is_empty():
        return ""
    if target_id_effective != "":
        var mission = get_latest_mission_for_target(target_id_effective)
        var mission_rocket = str(mission.get("rocket_id", ""))
        if mission_rocket != "" and launched.has(mission_rocket):
            return mission_rocket
    var fallback = str(launched[0])
    return fallback

static func get_outbound_progress(rocket_id: String) -> float:
    var effective_rocket_id = rocket_id
    if effective_rocket_id == "":
        effective_rocket_id = resolve_preview_rocket_id()
    var mission = get_mission_for_rocket(effective_rocket_id)
    if mission.is_empty():
        var launched_at = float(get_status_changed_at(effective_rocket_id, "launched"))
        if launched_at > 0:
            var now_fallback = float(Time.get_unix_time_from_system())
            var fallback_duration = float(max(get_mission_duration_seconds_for_rocket(effective_rocket_id), 1))
            return clamp((now_fallback - launched_at) / fallback_duration, 0.0, 1.0)
        return 0.0
    var launch = float(mission.get("launch_time", 0))
    var arrival = float(mission.get("arrival_time", 0))
    if launch <= 0:
        return 0.0
    if arrival <= launch:
        arrival = launch + get_mission_duration_seconds_for_rocket(effective_rocket_id)
    var now = float(Time.get_unix_time_from_system())
    return clamp((now - launch) / max(arrival - launch, 1.0), 0.0, 1.0)

static func get_return_progress(rocket_id: String) -> float:
    if rocket_id == "":
        return 0.0
    var started_at = get_return_started_at(rocket_id)
    if started_at <= 0:
        return 0.0
    var now = float(Time.get_unix_time_from_system())
    return clamp((now - float(started_at)) / float(max(get_return_duration_seconds_for_rocket(rocket_id), 1)), 0.0, 1.0)

static func get_mission_duration_seconds_for_rocket(rocket_id: String) -> int:
    if RocketSpecs:
        return RocketSpecs.get_mission_seconds(rocket_id, MISSION_DURATION_SECONDS)
    return MISSION_DURATION_SECONDS

static func get_return_duration_seconds_for_rocket(rocket_id: String) -> int:
    if RocketSpecs:
        return RocketSpecs.get_return_seconds(rocket_id, RETURN_DURATION_SECONDS)
    return RETURN_DURATION_SECONDS

static func get_status_changed_at(rocket_id: String, status: String) -> int:
    if rocket_id == "" or status == "":
        return 0
    var s = load_state()
    var all_changes = s.get("status_changed_at", {})
    if typeof(all_changes) != TYPE_DICTIONARY:
        return 0
    var per_rocket = all_changes.get(rocket_id, {})
    if typeof(per_rocket) != TYPE_DICTIONARY:
        return 0
    return int(per_rocket.get(status, 0))

static func _sort_mission_by_launch_time(a: Dictionary, b: Dictionary) -> bool:
    return float(a.get("launch_time", 0)) < float(b.get("launch_time", 0))

static func _normalize_target_type(value: String) -> String:
    return RocketsTargeting.normalize_target_type(value)

static func _scan_count_key(target_id: String, target_type: String) -> String:
    return "%s:%s" % [_normalize_target_type(target_type), target_id]

static func _set_status_changed_at_in_state(state: Dictionary, rocket_id: String, status: String, timestamp: int = 0) -> void:
    if rocket_id == "" or status == "":
        return
    var when = timestamp
    if when <= 0:
        when = int(Time.get_unix_time_from_system())
    var all_changes = state.get("status_changed_at", {})
    if typeof(all_changes) != TYPE_DICTIONARY:
        all_changes = {}
    var per_rocket = all_changes.get(rocket_id, {})
    if typeof(per_rocket) != TYPE_DICTIONARY:
        per_rocket = {}
    per_rocket[status] = when
    all_changes[rocket_id] = per_rocket
    state["status_changed_at"] = all_changes

static func _find_mission5_contractor(contractor_id: String) -> Dictionary:
    return RocketsMissionProgress.find_mission5_contractor(contractor_id, MISSION5_CONTRACTOR_OFFERS)

static func _build_mission5_contract_offer(detected_targets: Array = []) -> Dictionary:
    return RocketsMissionProgress.build_mission5_contract_offer(
        get_mission5_targets(detected_targets),
        get_mission5_contractors(),
        MISSION5_PAYOUT_CAP
    )

static func _sanitize_completed_badges(state: Dictionary) -> bool:
    return RocketsMissionProgress.sanitize_completed_badges(
        state,
        SCANNER_UNLOCK_COMPLETED_MISSIONS
    )

static func _migrate_mission_progress_schema(state: Dictionary) -> bool:
    return RocketsMissionProgress.migrate_mission_progress_schema(
        state,
        MISSION_PROGRESS_SCHEMA_VERSION
    )

static func _is_progress_badge_valid(badge: String) -> bool:
    return RocketsMissionProgress.is_progress_badge_valid(badge)

static func get_predefined_target_profile(target_id: String) -> Dictionary:
    if target_id == "":
        return {}
    for stage in PREDEFINED_MISSION_TARGETS.keys():
        var item = PREDEFINED_MISSION_TARGETS[stage]
        if str(item.get("id", "")) != target_id:
            continue
        var distance_au = float(item.get("distance_au", 0.0))
        var target_type = str(item.get("type", "asteroid"))
        return {
            "distance_au": distance_au,
            "distance_km": distance_au * AU_IN_KM,
            "required_level": int(item.get("required_level", 1)),
            "type": _normalize_target_type(target_type)
        }
    return {}

static func _ensure_stage_fallback_targets(stage: int) -> bool:
    var fallback_rows: Array = []
    if stage == 3:
        fallback_rows = MISSION3_FALLBACK_TARGETS
    elif stage == 2:
        fallback_rows = MISSION2_FALLBACK_TARGETS
    elif stage == 1:
        var m1 = get_predefined_mission_target(1)
        if not m1.is_empty():
            fallback_rows = [m1]
    elif stage == 4:
        var m4 = get_predefined_mission_target(4)
        if not m4.is_empty():
            fallback_rows = [m4]
    elif stage >= 5:
        var m5 = get_predefined_mission_target(5)
        if not m5.is_empty():
            fallback_rows = [m5]
    if fallback_rows.is_empty():
        return false

    var merged = get_detected_targets()
    var ids := {}
    for row_any in merged:
        if typeof(row_any) != TYPE_DICTIONARY:
            continue
        ids[str(row_any.get("id", ""))] = true
    var changed := false
    for row_any in fallback_rows:
        if typeof(row_any) != TYPE_DICTIONARY:
            continue
        var row: Dictionary = row_any
        var tid = str(row.get("id", ""))
        if tid == "" or ids.has(tid):
            continue
        merged.append({
            "id": tid,
            "label": str(row.get("label", tid)),
            "type": _normalize_target_type(str(row.get("type", "asteroid")))
        })
        ids[tid] = true
        changed = true
    if not changed:
        return false
    return set_detected_targets(merged)

static func _primary_fallback_target_for_stage(stage: int) -> Dictionary:
    if stage == 3:
        if not MISSION3_FALLBACK_TARGETS.is_empty():
            return MISSION3_FALLBACK_TARGETS[0].duplicate(true)
        return {}
    if stage == 2:
        if not MISSION2_FALLBACK_TARGETS.is_empty():
            return MISSION2_FALLBACK_TARGETS[0].duplicate(true)
        return {}
    if stage == 4:
        return get_predefined_mission_target(4)
    if stage >= 5:
        return get_predefined_mission_target(5)
    if stage == 1:
        return get_predefined_mission_target(1)
    return {}
