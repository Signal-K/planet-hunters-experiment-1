extends RefCounted
class_name RocketsManager
const AppLogger = preload("res://Scripts/Utils/Logger.gd")
const MissionLogManager = preload("res://Scripts/Utils/MissionLogManager.gd")

const STATE_PATH := "user://rockets_state.json"
const DEFAULT_STATE_PATH := "res://rockets_state.json"
const RETURN_DURATION_SECONDS := 60
const MISSION_DURATION_SECONDS := 60
const RocketSpecs = preload("res://Scripts/Utils/RocketSpecs.gd")
const HashUtils = preload("res://Scripts/Utils/HashUtils.gd")
const RocketsStateAccess = preload("res://Scripts/Utils/RocketsStateAccess.gd")
const RocketsMissionProgress = preload("res://Scripts/Utils/RocketsMissionProgress.gd")
const RocketsTargeting = preload("res://Scripts/Utils/RocketsTargeting.gd")
const RocketsMissionData = preload("res://Scripts/Utils/RocketsMissionData.gd")
const MissionObjectiveResolver = preload("res://Scripts/Utils/MissionObjectiveResolver.gd")
const AppControllerHelper = preload("res://Scripts/Utils/AppControllerHelper.gd")
const SubcontractorManager = preload("res://Scripts/Utils/SubcontractorManager.gd")
const KNOWN_ROCKET_TYPES := ["starterrocket1", "starterrocket2", "starterrocket3"]
## Missions completed required to unlock each rocket (0 = always available)
const ROCKET_UNLOCK_MISSIONS := {
	"starterrocket1": 0,
	"starterrocket2": 1,
	"starterrocket3": 2
}
const AU_IN_KM := 149597870.7
const ASTEROID_DISTANCE_BANDS_AU := [3.0, 24.0]
const ASTEROID_REQUIRED_LEVEL_BY_BAND := [1, 2]
const PLANET_DISTANCE_BANDS_AU := [120.0, 220.0, 340.0]
const PLANET_REQUIRED_LEVEL_BY_BAND := [3, 3, 3]
const MISSION_PROGRESS_SCHEMA_VERSION := 2
const SCANNER_UNLOCK_COMPLETED_MISSIONS := 3  # Scanner loop becomes active after the 3-mission onboarding arc

## Mission System Constants
## See: @doc/specs/mission-system-specification for complete mission design

# Control Station build cost (Mission 2 gate)
const CONTROL_STATION_BUILD_COST := 500000000

# Scanner Station build cost (Mission 3 unlock)
# Spec: M3 requires 2B F scanner construction before first scan
const SCANNER_BUILD_COST := 2000000000
const SCANNER_SOFT_COOLDOWN_SECONDS := 120

const PREDEFINED_MISSION_TARGETS  := RocketsMissionData.PREDEFINED_MISSION_TARGETS
const MISSION2_FALLBACK_TARGETS   := RocketsMissionData.MISSION2_FALLBACK_TARGETS
const MISSION3_FALLBACK_TARGETS   := RocketsMissionData.MISSION3_FALLBACK_TARGETS
const FREE_OPS_CONTRACTOR_OFFERS  := RocketsMissionData.FREE_OPS_CONTRACTOR_OFFERS
const STARTER_CONTRACTOR_OFFERS   := RocketsMissionData.STARTER_CONTRACTOR_OFFERS
const MISSION2_VISIBLE_TARGET_COUNT := RocketsMissionData.MISSION2_VISIBLE_TARGET_COUNT
const MISSION3_VISIBLE_TARGET_COUNT := RocketsMissionData.MISSION3_VISIBLE_TARGET_COUNT
const MISSION4_VISIBLE_TARGET_COUNT := RocketsMissionData.MISSION4_VISIBLE_TARGET_COUNT
const FREE_OPS_VISIBLE_TARGET_COUNT := RocketsMissionData.FREE_OPS_VISIBLE_TARGET_COUNT
const OPEN_OPERATION_MODES        := RocketsMissionData.OPEN_OPERATION_MODES
const FREE_OPS_PAYOUT_CAP         := RocketsMissionData.FREE_OPS_PAYOUT_CAP
const FIRST_MISSION_PAYOUT_MULT   := RocketsMissionData.FIRST_MISSION_PAYOUT_MULT
const EARLY_MISSION_PAYOUT_TARGET_MULT := RocketsMissionData.EARLY_MISSION_PAYOUT_TARGET_MULT
const ROCKET_FLAG_OPTIONS := ["Earth Union", "Signal-K", "Open Science", "Frontier Guild"]
const ROCKET_LOGO_OPTIONS := ["Star", "Wave", "Miner", "Pulse"]

static var _preview_target: Dictionary = {}
static var _return_to_new_mission_panel: bool = false
static var _map_return_mode: bool = false  # true = space map was opened from launchpad for target selection
static var _preview_index: int = 0
static var _override_state: Dictionary = {}
static var _returned_mission: Dictionary = {}
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
	var log = MissionLogManager
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

static func is_free_operations_unlocked() -> bool:
	return get_completed_mission_count() >= 4

static func get_control_station_build_cost() -> int:
	return CONTROL_STATION_BUILD_COST

static func can_afford_control_station_build(balance: int) -> bool:
	return balance >= CONTROL_STATION_BUILD_COST

static func get_scanner_build_cost() -> int:
	return SCANNER_BUILD_COST

static func is_scanner_unlocked() -> bool:
	return false  # Scanner deferred from v1 — always locked

static func is_control_station_built() -> bool:
	var s = load_state()
	return bool(s.get("control_station_built", false))

static func set_control_station_built(built: bool) -> bool:
	var s = load_state()
	s["control_station_built"] = built
	return save_state(s)

static func is_scanner_station_built() -> bool:
	return false  # Scanner deferred from v1 — always returns false

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

static func get_launchpad_plot() -> int:
	var s = load_state()
	return clampi(int(s.get("launchpad_plot", 1)), 0, 2)

static func set_launchpad_plot(plot: int) -> void:
	var s = load_state()
	s["launchpad_plot"] = clampi(plot, 0, 2)
	save_state(s)

static func can_afford_scanner_build(balance: int) -> bool:
	return balance >= SCANNER_BUILD_COST

static func get_scanner_soft_cooldown_seconds() -> int:
	return SCANNER_SOFT_COOLDOWN_SECONDS

static func get_scanner_next_scan_at() -> int:
	var s = load_state()
	return max(int(s.get("scanner_next_scan_at", 0)), 0)

static func set_scanner_next_scan_at(epoch_seconds: int) -> bool:
	var s = load_state()
	s["scanner_next_scan_at"] = epoch_seconds
	return save_state(s)

## Inventory Management
static func get_inventory() -> Dictionary:
	var s = load_state()
	var inv = s.get("inventory", {})
	if typeof(inv) != TYPE_DICTIONARY:
		return {}
	return inv.duplicate(true)

static func add_to_inventory(minerals: Dictionary) -> bool:
	var s = load_state()
	var inv = s.get("inventory", {})
	if typeof(inv) != TYPE_DICTIONARY:
		inv = {}

	for mineral in minerals.keys():
		var amount = int(minerals[mineral])
		inv[mineral] = int(inv.get(mineral, 0)) + amount

	s["inventory"] = inv
	return save_state(s)

static func consume_from_inventory(requirements: Dictionary) -> bool:
	var s = load_state()
	var inv = s.get("inventory", {})
	if typeof(inv) != TYPE_DICTIONARY:
		return false

	# Verify we have enough of everything first
	for mineral in requirements.keys():
		var required = int(requirements[mineral])
		var available = int(inv.get(mineral, 0))
		if available < required:
			return false

	# Consume
	for mineral in requirements.keys():
		var required = int(requirements[mineral])
		inv[mineral] = int(inv.get(mineral, 0)) - required

	s["inventory"] = inv
	return save_state(s)


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
	for list_any in [MISSION2_FALLBACK_TARGETS, MISSION3_FALLBACK_TARGETS]:
		for item_any in list_any:
			if typeof(item_any) != TYPE_DICTIONARY:
				continue
			var item: Dictionary = item_any
			if str(item.get("id", "")) == target_id:
				return max(float(item.get("reward_ratio", 1.2)), 0.0)
	return 0.0

static func get_targeted_target_ids() -> Dictionary:
	var targeted := {}
	var mission_log = MissionLogManager
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
	var source: Array = detected_targets.duplicate(true)
	if source.is_empty():
		source = get_detected_targets()
	var ids := {}
	for item_any in source:
		if typeof(item_any) != TYPE_DICTIONARY:
			continue
		var item: Dictionary = item_any
		var tid := str(item.get("id", ""))
		if tid != "":
			ids[tid] = true
	for fallback_any in MISSION3_FALLBACK_TARGETS:
		if typeof(fallback_any) != TYPE_DICTIONARY:
			continue
		var fallback: Dictionary = fallback_any
		var fallback_id := str(fallback.get("id", ""))
		if fallback_id == "" or ids.has(fallback_id):
			continue
		source.append(fallback.duplicate(true))
		ids[fallback_id] = true
	var targeted_ids := get_targeted_target_ids()
	var out := []
	for target_any in source:
		if typeof(target_any) != TYPE_DICTIONARY:
			continue
		var target: Dictionary = target_any
		var tid := str(target.get("id", ""))
		if tid == "" or targeted_ids.has(tid):
			continue
		if _normalize_target_type(str(target.get("type", ""))) != "planet":
			continue
		if is_candidate_visit_blocked(tid):
			continue
		out.append(target)
		if out.size() >= MISSION3_VISIBLE_TARGET_COUNT:
			break
	return out

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

static func get_free_ops_targets(detected_targets: Array = []) -> Array:
	var source = detected_targets
	if source.is_empty():
		source = get_detected_targets()
	return RocketsTargeting.select_visible_targets(
		source,
		get_targeted_target_ids(),
		"asteroid",
		FREE_OPS_VISIBLE_TARGET_COUNT,
		{}
	)

static func get_free_ops_payout_cap() -> int:
	return FREE_OPS_PAYOUT_CAP

static func get_trip_contractors() -> Array:
	var available = []
	var completed := get_completed_mission_count()
	for contractor in FREE_OPS_CONTRACTOR_OFFERS:
		var id = str(contractor.get("id", ""))
		if not SubcontractorManager.is_on_cooldown(id):
			var c: Dictionary = contractor.duplicate(true)
			c["mineral_ranges"] = _scale_mineral_ranges_for_stage(c.get("mineral_ranges", {}), completed)
			available.append(c)
	return available

# Scale mineral order ranges down for early missions so they're achievable in one trip.
# M2 (completed=1): ~35%,  M3 (completed=2): ~60%,  M4 (completed=3): ~80%,  Free ops: 100%
# M2/M3 are additionally capped at 10 total minerals across all types.
static func _scale_mineral_ranges_for_stage(ranges: Dictionary, completed_count: int) -> Dictionary:
	if completed_count >= 4:
		return ranges.duplicate(true)
	var t := clampf(float(completed_count - 1) / 2.0, 0.0, 1.0)
	var scale := lerpf(0.35, 0.80, t)
	var scaled := {}
	for mineral in ranges.keys():
		var r = ranges[mineral]
		if typeof(r) == TYPE_ARRAY and r.size() >= 2:
			scaled[mineral] = [maxi(4, int(float(r[0]) * scale)), maxi(8, int(float(r[1]) * scale))]
		else:
			scaled[mineral] = r
	if completed_count <= 2:
		scaled = _cap_total_minerals(scaled, 10)
	return scaled

static func _cap_total_minerals(ranges: Dictionary, cap: int) -> Dictionary:
	var total_max := 0
	for r in ranges.values():
		if typeof(r) == TYPE_ARRAY and r.size() >= 2:
			total_max += int(r[1])
	if total_max <= cap:
		return ranges
	var ratio := float(cap) / float(total_max)
	var capped := {}
	for mineral in ranges.keys():
		var r = ranges[mineral]
		if typeof(r) == TYPE_ARRAY and r.size() >= 2:
			capped[mineral] = [maxi(1, int(float(r[0]) * ratio)), maxi(2, int(float(r[1]) * ratio))]
		else:
			capped[mineral] = r
	return capped

static func get_starter_contractors() -> Array:
	return STARTER_CONTRACTOR_OFFERS.duplicate(true)

static func ensure_starter_contract_offer() -> Dictionary:
	if get_mission_stage() > 1 and not _is_tutorial_stage_one_active():
		return {}
	var s = load_state()
	var existing = s.get("starter_contract_offer", {})
	if typeof(existing) == TYPE_DICTIONARY and not existing.is_empty():
		var selected_contractor = str(existing.get("selected_contractor", ""))
		var has_valid_selected = selected_contractor == "" or _find_starter_contractor(selected_contractor).size() > 0
		if has_valid_selected:
			return existing.duplicate(true)
	var offer = _build_starter_contract_offer()
	s["starter_contract_offer"] = offer.duplicate(true)
	save_state(s)
	return offer

static func get_starter_contract_offer() -> Dictionary:
	var s = load_state()
	var offer = s.get("starter_contract_offer", {})
	if typeof(offer) != TYPE_DICTIONARY:
		return {}
	return offer.duplicate(true)

static func clear_starter_contract_offer() -> bool:
	var s = load_state()
	s["starter_contract_offer"] = {}
	return save_state(s)

static func select_starter_contractor(contractor_id: String) -> bool:
	if contractor_id == "":
		return false
	if get_mission_stage() > 1 and not _is_tutorial_stage_one_active():
		return false
	if _find_starter_contractor(contractor_id).is_empty():
		return false
	var offer = ensure_starter_contract_offer()
	if offer.is_empty():
		return false
	offer["selected_contractor"] = contractor_id
	var s = load_state()
	s["starter_contract_offer"] = offer
	return save_state(s)

static func get_starter_selected_contractor() -> Dictionary:
	var offer = get_starter_contract_offer()
	if offer.is_empty():
		return {}
	var selected = str(offer.get("selected_contractor", ""))
	if selected == "":
		return {}
	return _find_starter_contractor(selected).duplicate(true)

static func get_starter_requested_minerals(contractor_id: String = "") -> Dictionary:
	var selected := {}
	if contractor_id != "":
		selected = _find_starter_contractor(contractor_id)
	else:
		selected = get_starter_selected_contractor()
	if selected.is_empty():
		return {}
	var requested = selected.get("requested_minerals", {})
	if typeof(requested) != TYPE_DICTIONARY:
		return {}
	return requested.duplicate(true)

static func ensure_trip_contract_offer(detected_targets: Array = []) -> Dictionary:
	var s = load_state()
	var existing = s.get("trip_contract_offer", {})
	if typeof(existing) == TYPE_DICTIONARY and not existing.is_empty():
		var recommended_id = str(existing.get("recommended_target_id", ""))
		var selected_contractor = str(existing.get("selected_contractor", ""))
		var selection_required = bool(existing.get("selection_required", true))
		var has_recommended = recommended_id != ""
		var has_valid_selected = selected_contractor == "" or _find_trip_contractor(selected_contractor).size() > 0
		if has_recommended and has_valid_selected and not _trip_offer_quantities_too_high(existing):
			if not existing.has("selection_required"):
				existing["selection_required"] = selected_contractor == ""
				s["trip_contract_offer"] = existing
				save_state(s)
			elif selection_required and selected_contractor != "":
				existing["selection_required"] = false
				s["trip_contract_offer"] = existing
				save_state(s)
			return existing.duplicate(true)
	var offer = _build_trip_contract_offer(detected_targets)
	s["trip_contract_offer"] = offer.duplicate(true)
	save_state(s)
	return offer

# Returns true if a cached trip offer has quantities that exceed what's achievable
# for the current mission stage, forcing a regeneration with correct scaled amounts.
static func _trip_offer_quantities_too_high(offer: Dictionary) -> bool:
	var completed := get_completed_mission_count()
	# Per-stage max: what a single good mining run can realistically yield
	var max_qty := 90 if completed >= 4 else (55 if completed >= 3 else (35 if completed >= 2 else 20))
	var contractors_any = offer.get("contractors", [])
	if typeof(contractors_any) != TYPE_ARRAY:
		return false
	for c_any in contractors_any:
		if typeof(c_any) != TYPE_DICTIONARY:
			continue
		var requested = c_any.get("requested_minerals", {})
		for mineral in requested.keys():
			if int(requested[mineral]) > max_qty:
				return true
	return false

static func get_trip_contract_offer() -> Dictionary:
	var s = load_state()
	var offer = s.get("trip_contract_offer", {})
	if typeof(offer) != TYPE_DICTIONARY:
		return {}
	return offer.duplicate(true)

static func clear_trip_contract_offer() -> bool:
	var s = load_state()
	s["trip_contract_offer"] = {}
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

static func select_trip_contractor(contractor_id: String) -> bool:
	if contractor_id == "":
		return false
	if _find_trip_contractor(contractor_id).is_empty():
		return false
	var offer = ensure_trip_contract_offer()
	if offer.is_empty():
		return false
	offer["selected_contractor"] = contractor_id
	offer["selection_required"] = false
	var s = load_state()
	s["trip_contract_offer"] = offer
	return save_state(s)

static func get_trip_selected_contractor() -> Dictionary:
	var selected_from_offer := _get_selected_trip_contractor_from_offer()
	if not selected_from_offer.is_empty():
		return selected_from_offer.duplicate(true)
	var offer = get_trip_contract_offer()
	if offer.is_empty() or bool(offer.get("selection_required", true)):
		return {}
	var selected = str(offer.get("selected_contractor", ""))
	if selected == "":
		return {}
	return _find_trip_contractor(selected).duplicate(true)

static func get_current_requested_minerals() -> Dictionary:
	var mission := _get_latest_active_mission()
	if not mission.is_empty():
		var objective_any = mission.get("objective", {})
		if typeof(objective_any) == TYPE_DICTIONARY:
			var objective: Dictionary = objective_any
			var requirements_any = objective.get("requirements", {})
			if typeof(requirements_any) == TYPE_DICTIONARY:
				var requested_any = requirements_any.get("minerals", {})
				if typeof(requested_any) == TYPE_DICTIONARY and not requested_any.is_empty():
					return (requested_any as Dictionary).duplicate(true)
	var trip_selected := get_trip_selected_contractor()
	if not trip_selected.is_empty():
		var trip_requested_any = trip_selected.get("requested_minerals", {})
		if typeof(trip_requested_any) == TYPE_DICTIONARY and not trip_requested_any.is_empty():
			return (trip_requested_any as Dictionary).duplicate(true)
	return get_starter_requested_minerals()

## Reusable Rockets Research tier (0 = none, 1–3 = progressively cheaper launches).
static func get_reusable_research_tier() -> int:
	var s = load_state()
	return clamp(int(s.get("reusable_research_tier", 0)), 0, 3)

static func set_reusable_research_tier(tier: int) -> bool:
	var s = load_state()
	s["reusable_research_tier"] = clamp(tier, 0, 3)
	return save_state(s)

## Discount per research tier: tier 1=10%, 2=20%, 3=30%.
static func get_reusable_research_cost_mult() -> float:
	var tier := get_reusable_research_tier()
	match tier:
		1: return 0.90
		2: return 0.80
		3: return 0.70
		_: return 1.0

## Cost to upgrade to each research tier.
const REUSABLE_RESEARCH_UPGRADE_COSTS := {1: 500_000_000, 2: 2_000_000_000, 3: 5_000_000_000}

static func get_trip_purchase_cost(rocket_id_or_type: String) -> int:
	var base_cost = RocketSpecs.get_cost(rocket_id_or_type)
	# Apply reusable research discount first
	var research_mult = get_reusable_research_cost_mult()
	var after_research = int(round(float(base_cost) * research_mult))
	var selected = get_trip_selected_contractor()
	if get_operation_mode() != "contract":
		return after_research
	if str(selected.get("effect", "")) != "build_discount":
		return after_research
	var discount_pct = clamp(float(selected.get("build_discount_pct", 0.0)), 0.0, 0.95)
	return int(round(float(after_research) * (1.0 - discount_pct)))

static func apply_trip_payout_terms(base_payout: int, contractor_id: String = "") -> int:
	var payout = max(base_payout, 0)
	if get_operation_mode() != "contract":
		return payout
	var selected := {}
	if contractor_id != "":
		selected = _find_trip_contractor(contractor_id)
	if selected.is_empty():
		selected = get_trip_selected_contractor()
	if str(selected.get("effect", "")) == "payout_bonus":
		var bonus_mult = max(float(selected.get("payout_bonus_mult", 1.0)), 1.0)
		payout = int(round(float(payout) * bonus_mult))
	return min(payout, FREE_OPS_PAYOUT_CAP)

static func debug_complete_mission_for_progression() -> bool:
	var mission_log = MissionLogManager
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
	if s["scanner_unlocked"]:
		# Ensure we have at least some detected targets so annotation station works
		var current_targets = s.get("detected_targets", [])
		if typeof(current_targets) != TYPE_ARRAY or current_targets.is_empty():
			var fallback = []
			for i in range(MISSION4_VISIBLE_TARGET_COUNT):
				var target = MISSION3_FALLBACK_TARGETS[i % MISSION3_FALLBACK_TARGETS.size()].duplicate(true)
				target["id"] = "init-planet-%d" % i
				target["anomalySet"] = "telescope-tess"
				target["tess_disposition"] = "PC" # Force to Candidate
				fallback.append(target)
			s["detected_targets"] = fallback

	var completed = int(s.get("mission_progress_completed", 0))
	if completed >= 1:
		var unlocked = s.get("unlocked", [])
		if typeof(unlocked) != TYPE_ARRAY:
			unlocked = []
		if not unlocked.has("starterrocket2"):
			unlocked.append("starterrocket2")
		if completed >= 2 and not unlocked.has("starterrocket3"):
			unlocked.append("starterrocket3")
		s["unlocked"] = unlocked
	return save_state(s)

static func get_rocket_unlock_missions(rocket_id_or_type: String) -> int:
	var rocket_type = RocketSpecs.rocket_type_from_id(rocket_id_or_type)
	return int(ROCKET_UNLOCK_MISSIONS.get(rocket_type, 0))

## Returns the mining laser level for a rocket.
## Currently always 1 until room-upgrade system is implemented (L5+).
## When room upgrades land, this should read laser_level from rocket state.
static func get_laser_level(_rocket_id: String = "") -> int:
	var s = load_state()
	var laser_levels: Dictionary = s.get("laser_levels", {})
	if _rocket_id != "" and laser_levels.has(_rocket_id):
		return max(int(laser_levels.get(_rocket_id, 1)), 1)
	return 1

## Sets the mining laser level for a specific rocket (used by room upgrade system).
static func set_laser_level(rocket_id: String, level: int) -> bool:
	if rocket_id == "" or level < 1:
		return false
	var s = load_state()
	var laser_levels: Dictionary = s.get("laser_levels", {}).duplicate(true)
	laser_levels[rocket_id] = max(level, 1)
	s["laser_levels"] = laser_levels
	return save_state(s)

## Returns the room upgrade tiers for a rocket type (keyed by category).
## e.g. {"mining": 2, "cargo": 1, "propulsion": 1, ...}
static func get_type_room_upgrades(rocket_type: String) -> Dictionary:
	var s = load_state()
	var all_upgrades: Dictionary = s.get("type_room_upgrades", {})
	return all_upgrades.get(rocket_type, {}).duplicate(true)

## Sets a single category's tier for a rocket type and persists.
## Returns true on success.
static func set_type_room_tier(rocket_type: String, category: String, tier: int) -> bool:
	if rocket_type == "" or category == "" or tier < 1:
		return false
	var s = load_state()
	var all_upgrades: Dictionary = s.get("type_room_upgrades", {}).duplicate(true)
	var type_upgrades: Dictionary = all_upgrades.get(rocket_type, {}).duplicate(true)
	type_upgrades[category] = max(tier, 1)
	all_upgrades[rocket_type] = type_upgrades
	s["type_room_upgrades"] = all_upgrades
	# Sync laser level if mining tier changed
	if category == "mining":
		var laser_levels: Dictionary = s.get("laser_levels", {}).duplicate(true)
		laser_levels[rocket_type] = max(tier, 1)
		s["laser_levels"] = laser_levels
	return save_state(s)

static func get_primary_awaiting_rocket_id() -> String:
	var s = load_state()
	var placed: Array = s.get("placed", [])
	var missions: Array = s.get("missions", [])
	var launched_ids := {}
	for m in missions:
		launched_ids[str(m.get("rocket_id", ""))] = true
	for item in placed:
		if str(item.get("status", "")) == "awaitingLaunch":
			var rid := str(item.get("id", ""))
			if not launched_ids.has(rid):
				return rid
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
	if get_mission_stage() == 3 and normalized_type == "planet":
		var mission3_targets = get_mission3_targets()
		for i in range(mission3_targets.size()):
			var item = mission3_targets[i]
			if str(item.get("id", "")) != target_id:
				continue
			var dist_au = float(item.get("distance_au", 12.0))
			return {
				"distance_au": dist_au,
				"distance_km": dist_au * AU_IN_KM,
				"required_level": int(item.get("required_level", 2)),
				"type": str(item.get("type", "planet"))
			}
	if get_mission_stage() == 4 and normalized_type == "planet":
		var mission4_targets = get_mission3_targets()
		for item_any in mission4_targets:
			if typeof(item_any) != TYPE_DICTIONARY:
				continue
			var item: Dictionary = item_any
			if str(item.get("id", "")) != target_id:
				continue
			var distance_au_stage4 = float(item.get("distance_au", 120.0))
			return {
				"distance_au": distance_au_stage4,
				"distance_km": distance_au_stage4 * AU_IN_KM,
				"required_level": int(item.get("required_level", 3)),
				"type": "planet"
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

static func unlock_for_mission_stage(completed_missions: int) -> Array:
	var newly_unlocked := []
	for rocket_id in ROCKET_UNLOCK_MISSIONS.keys():
		var required = int(ROCKET_UNLOCK_MISSIONS[rocket_id])
		if completed_missions >= required:
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
	if _requires_trip_contractor_for_selection() and get_trip_selected_contractor().is_empty():
		set_launch_guidance_notice("Select a contractor first, then pick a mission target.")
		return false
	if is_candidate_visit_blocked(target_id):
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

static func get_planning_rocket_type() -> String:
	var s = load_state()
	return str(s.get("planning_rocket_type", ""))

static func set_planning_rocket_type(rtype: String) -> bool:
	var s = load_state()
	s["planning_rocket_type"] = rtype
	return save_state(s)

static func get_planning_step() -> int:
	var s = load_state()
	return int(s.get("planning_step", 0))

static func set_planning_step(step: int) -> bool:
	var s = load_state()
	s["planning_step"] = step
	return save_state(s)

static func clear_planning_state() -> bool:
	var s = load_state()
	s.erase("planning_rocket_type")
	s.erase("planning_step")
	s.erase("selected_target")
	# We also need to clear selected contractor from the offer
	var offer = s.get("trip_contract_offer", {})
	if typeof(offer) == TYPE_DICTIONARY:
		offer.erase("selected_contractor")
		offer["selection_required"] = true
		s["trip_contract_offer"] = offer
	var starter = s.get("starter_contract_offer", {})
	if typeof(starter) == TYPE_DICTIONARY:
		starter.erase("selected_contractor")
		s["starter_contract_offer"] = starter
	return save_state(s)

static func is_target_selectable_for_current_stage(target_id: String) -> bool:
	if target_id == "":
		return false
	if _requires_trip_contractor_for_selection() and get_trip_selected_contractor().is_empty():
		return false
	if is_candidate_visit_blocked(target_id):
		return false
	var selectable = get_selectable_targets_for_stage(_effective_stage_for_target_selection())
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
		if is_free_operations_unlocked():
			var free_ops_targets := []
			for target_any in get_detected_targets():
				if typeof(target_any) != TYPE_DICTIONARY:
					continue
				var target: Dictionary = target_any
				if _normalize_target_type(str(target.get("type", ""))) != "planet":
					continue
				free_ops_targets.append(target)
			return free_ops_targets
		return get_mission3_targets()
	return get_detected_targets()

static func ensure_selected_target_for_launch(rocket_id: String = "") -> Dictionary:
	if _requires_trip_contractor_for_selection() and get_trip_selected_contractor().is_empty():
		return {
			"ok": false,
			"target_id": "",
			"fallback_used": false,
			"reason": "Select a contractor first"
		}
	var existing_target_id = get_selected_target()
	if existing_target_id != "" and not is_candidate_visit_blocked(existing_target_id) and is_target_selectable_for_current_stage(existing_target_id):
		var existing_details = get_target_details(existing_target_id)
		return {
			"ok": true,
			"target_id": existing_target_id,
			"target_type": str(existing_details.get("type", "asteroid")),
			"target_label": str(existing_details.get("label", existing_target_id)),
			"fallback_used": false
		}

	var mission_stage = _effective_stage_for_target_selection()
	var selectable = get_selectable_targets_for_stage(mission_stage)
	if selectable.is_empty():
		_ensure_stage_fallback_targets(mission_stage)
		selectable = get_selectable_targets_for_stage(mission_stage)

	var selected_row := {}
	for item_any in selectable:
		if typeof(item_any) != TYPE_DICTIONARY:
			continue
		var item: Dictionary = item_any
		var tid = str(item.get("id", ""))
		if tid == "":
			continue
		if is_candidate_visit_blocked(tid):
			continue
		var profile = build_target_profile(tid, str(item.get("type", "asteroid")))
		if int(profile.get("required_level", 1)) <= mission_stage:
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
	var persisted := load_state()
	persisted["selected_target"] = selected_id
	if not save_state(persisted):
		return {
			"ok": false,
			"target_id": "",
			"fallback_used": false,
			"reason": "Failed to persist fallback target selection"
		}
	var selected_type = str(selected_row.get("type", "asteroid"))
	var selected_label = str(selected_row.get("label", selected_id))
	var notice = "No target was selected, so mission control auto-selected %s for this launch." % selected_label
	set_launch_fallback_notice(notice)
	return {
		"ok": true,
		"target_id": selected_id,
		"target_type": selected_type,
		"target_label": selected_label,
		"fallback_used": true,
		"notice": notice
	}

static func get_mission_exposure_reward(_stage: int) -> int:
	# Flat rate: M1 gives exactly 11 XP (5 launch + 4 exposure + 1 completion + 1 affinity)
	# to reach Level 2. Subsequent missions give the same 11 XP, which falls short of the
	# increasing level thresholds (L2→L3 needs 12, L3→L4 needs 13, etc.).
	return 4

static func get_target_details(target_id: String) -> Dictionary:
	if target_id == "":
		return {}
	for stage in PREDEFINED_MISSION_TARGETS.keys():
		var item = PREDEFINED_MISSION_TARGETS[stage]
		if str(item.get("id", "")) == target_id:
			return item.duplicate(true)
	for list_any in [MISSION2_FALLBACK_TARGETS, MISSION3_FALLBACK_TARGETS]:
		for item_any in list_any:
			if typeof(item_any) != TYPE_DICTIONARY:
				continue
			var item: Dictionary = item_any
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
	var target_details = get_target_details(target_id)
	var target_label = str(target_details.get("label", target_details.get("name", target_id)))
	var target_type = str(target_details.get("type", "asteroid"))
	var operation_mode = get_operation_mode()
	var record = {
		"rocket_id": rocket_id,
		"target": target_id,
		"launch_time": launch_time_epoch,
		"arrival_time": arrival,
		"operation_mode": operation_mode,
		"goingTo": target_id,
		"location": [target_id],
		"objective": _build_mission_objective(rocket_id, target_id, target_label, target_type, operation_mode)
	}
	missions.append(record)
	s["missions"] = missions
	_set_status_changed_at_in_state(s, rocket_id, "launched", launch_time_epoch)
	# Clear awaitingLaunch so get_primary_awaiting_rocket_id() doesn't persist after launch
	var placed_arr = s.get("placed", [])
	for i in range(placed_arr.size()):
		if str(placed_arr[i].get("id", "")) == rocket_id:
			placed_arr[i]["status"] = "launched"
	s["placed"] = placed_arr
	# Reset arrival flag for new mission
	var arrived = s.get("arrived", {})
	if arrived.has(rocket_id):
		arrived.erase(rocket_id)
		s["arrived"] = arrived
	
	# Proactively set preview target for better state persistence across refreshes
	if target_label == "":
		target_label = target_id
	var targets = s.get("detected_targets", [])
	for t in targets:
		if str(t.get("id", "")) == target_id:
			target_label = str(t.get("label", t.get("name", "")))
			target_type = str(t.get("type", "asteroid"))
			break
	_preview_target = {
		"id": target_id,
		"label": target_label,
		"type": target_type,
		"rocket_id": rocket_id
	}
	s["preview_target"] = _preview_target.duplicate(true)
	
	return save_state(s)

static func get_missions() -> Array:
	var s = load_state()
	return s.get("missions", [])

static func debug_complete_active_mission_to_debrief() -> Dictionary:
	var mission = _get_latest_active_mission()
	if mission.is_empty():
		return {"ok": false, "reason": "no_active_mission"}
	var rocket_id = str(mission.get("rocket_id", ""))
	var target_id = str(mission.get("target", mission.get("target_id", "")))
	if rocket_id == "" or target_id == "":
		return {"ok": false, "reason": "invalid_mission"}
	var target_details = get_target_details(target_id)
	var target_label = str(target_details.get("label", target_details.get("name", target_id)))
	var target_type = str(target_details.get("type", "asteroid"))
	var operation_mode = str(mission.get("operation_mode", "")).strip_edges().to_lower()
	if not OPEN_OPERATION_MODES.has(operation_mode):
		operation_mode = get_operation_mode_for_rocket(rocket_id)
	var objective = mission.get("objective", {})
	if typeof(objective) != TYPE_DICTIONARY or objective.is_empty():
		objective = _build_mission_objective(rocket_id, target_id, target_label, target_type, operation_mode)
	var extra = MissionObjectiveResolver.completion_payload(objective, true)
	mark_arrived(rocket_id, target_id)
	set_returned_mission(rocket_id, target_id, target_label, target_type, operation_mode, extra)
	return_home(rocket_id)
	clear_preview_target()
	return {
		"ok": true,
		"rocket_id": rocket_id,
		"target_id": target_id,
		"objective": objective.duplicate(true)
	}

## Update the current destination for an in-flight mission.
static func update_mission_going_to(rocket_id: String, going_to: String) -> void:
	var s = load_state()
	var missions: Array = s.get("missions", [])
	for i in range(missions.size()):
		if str(missions[i].get("rocket_id", "")) == rocket_id:
			missions[i]["goingTo"] = going_to
			break
	s["missions"] = missions
	save_state(s)

## Append a visited location to a mission's location array.
static func append_mission_location(rocket_id: String, location_id: String) -> void:
	var s = load_state()
	var missions: Array = s.get("missions", [])
	for i in range(missions.size()):
		if str(missions[i].get("rocket_id", "")) == rocket_id:
			var locs: Array = missions[i].get("location", [])
			if not locs.has(location_id):
				locs.append(location_id)
			missions[i]["location"] = locs
			break
	s["missions"] = missions
	save_state(s)

static func set_detected_targets(targets: Array) -> bool:
	var s = load_state()
	var previous_targets: Array = s.get("detected_targets", [])
	var targets_changed := _target_roster_signature(previous_targets) != _target_roster_signature(targets)
	# store simplified detected targets array (array of dictionaries)
	s["detected_targets"] = targets
	var offer = s.get("trip_contract_offer", {})
	if targets_changed and typeof(offer) == TYPE_DICTIONARY and not offer.is_empty():
		offer["selected_contractor"] = ""
		offer["selection_required"] = true
		s["trip_contract_offer"] = offer
	return save_state(s)

static func get_detected_targets() -> Array:
	var s = load_state()
	var targets = s.get("detected_targets", [])
	AppLogger.d("RocketsManager: get_detected_targets -> count=" + str(targets.size()))
	return targets

static func _target_roster_signature(targets: Array) -> Array[String]:
	var ids: Array[String] = []
	for item_any in targets:
		if typeof(item_any) != TYPE_DICTIONARY:
			continue
		var item: Dictionary = item_any
		var target_id := str(item.get("id", "")).strip_edges()
		if target_id != "":
			ids.append(target_id)
	ids.sort()
	return ids

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

static func set_launch_guidance_notice(message: String) -> bool:
	var s = load_state()
	s["launch_guidance_notice"] = message.strip_edges()
	return save_state(s)

static func consume_launch_guidance_notice() -> String:
	var s = load_state()
	var message = str(s.get("launch_guidance_notice", ""))
	s["launch_guidance_notice"] = ""
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
	var blocks = s.get("candidate_visit_blocks", {})
	if typeof(blocks) != TYPE_DICTIONARY:
		blocks = {}
	for target in targets:
		var target_id = str(target.get("id", ""))
		if target_id == "":
			continue
		var key = _scan_count_key(target_id, str(target.get("type", "asteroid")))
		counts[key] = int(counts.get(key, 0)) + 1
		if blocks.has(target_id):
			blocks.erase(target_id)
		changed = true
	if not changed:
		return false
	s["scan_counts"] = counts
	s["candidate_visit_blocks"] = blocks
	return save_state(s)

static func set_target_annotation_level(target_id: String, level: int) -> bool:
	if target_id == "":
		return false
	var s = load_state()
	var levels = s.get("target_annotation_levels", {})
	if typeof(levels) != TYPE_DICTIONARY:
		levels = {}
	levels[target_id] = max(level, 0)
	s["target_annotation_levels"] = levels
	return save_state(s)

static func get_target_annotation_level(target_id: String) -> int:
	if target_id == "":
		return 0
	var s = load_state()
	var levels = s.get("target_annotation_levels", {})
	if typeof(levels) != TYPE_DICTIONARY:
		return 0
	return max(int(levels.get(target_id, 0)), 0)

static func add_rocket_wear(rocket_id: String, amount: int = 1) -> int:
	if rocket_id == "":
		return 0
	var s = load_state()
	var wear = s.get("rocket_wear", {})
	if typeof(wear) != TYPE_DICTIONARY:
		wear = {}
	var next_value = max(int(wear.get(rocket_id, 0)) + max(amount, 1), 0)
	wear[rocket_id] = next_value
	s["rocket_wear"] = wear
	save_state(s)
	return next_value

static func get_rocket_wear(rocket_id: String) -> int:
	if rocket_id == "":
		return 0
	var s = load_state()
	var wear = s.get("rocket_wear", {})
	if typeof(wear) != TYPE_DICTIONARY:
		return 0
	return max(int(wear.get(rocket_id, 0)), 0)

static func get_rocket_wear_tier(rocket_id: String) -> int:
	var points = get_rocket_wear(rocket_id)
	if points >= 12:
		return 3
	if points >= 8:
		return 2
	if points >= 4:
		return 1
	return 0

static func get_archived_rocket_wear(rocket_id: String) -> Dictionary:
	if rocket_id == "":
		return {}
	var s = load_state()
	var archived = s.get("archived_rocket_wear", {})
	if typeof(archived) != TYPE_DICTIONARY:
		return {}
	var entry = archived.get(rocket_id, {})
	return entry.duplicate(true) if typeof(entry) == TYPE_DICTIONARY else {}

static func mark_candidate_visit_blocked(target_id: String) -> bool:
	if target_id == "":
		return false
	var s = load_state()
	var blocks = s.get("candidate_visit_blocks", {})
	if typeof(blocks) != TYPE_DICTIONARY:
		blocks = {}
	blocks[target_id] = true
	s["candidate_visit_blocks"] = blocks
	return save_state(s)

static func clear_candidate_visit_block(target_id: String) -> bool:
	if target_id == "":
		return false
	var s = load_state()
	var blocks = s.get("candidate_visit_blocks", {})
	if typeof(blocks) != TYPE_DICTIONARY:
		blocks = {}
	if not blocks.has(target_id):
		return true
	blocks.erase(target_id)
	s["candidate_visit_blocks"] = blocks
	return save_state(s)

static func is_candidate_visit_blocked(target_id: String) -> bool:
	if target_id == "":
		return false
	var s = load_state()
	var blocks = s.get("candidate_visit_blocks", {})
	if typeof(blocks) != TYPE_DICTIONARY:
		return false
	return bool(blocks.get(target_id, false))

static func classify_candidate_target(target_id: String, verdict: String, annotation_level: int = 1) -> Dictionary:
	var normalized := verdict.strip_edges().to_lower()
	if target_id == "" or not ["planet", "not_planet", "dip"].has(normalized):
		return {"ok": false, "target_id": target_id, "verdict": normalized, "confirmed": false}
	set_tess_classification(target_id, normalized)
	set_target_annotation_level(target_id, max(annotation_level, 1))
	var confirmed := normalized == "planet"
	if confirmed:
		clear_candidate_visit_block(target_id)
	else:
		mark_candidate_visit_blocked(target_id)
		if get_selected_target() == target_id:
			clear_selected_target()
		set_launch_guidance_notice("Candidate %s needs more review. Reward granted; choose another confirmed target." % target_id)
	return {
		"ok": true,
		"target_id": target_id,
		"verdict": normalized,
		"confirmed": confirmed,
		"blocked": not confirmed
	}

static func has_discovery_bonus_claimed(target_id: String) -> bool:
	if target_id == "":
		return false
	var s = load_state()
	var claimed = s.get("discovery_bonus_claimed", {})
	if typeof(claimed) != TYPE_DICTIONARY:
		return false
	return bool(claimed.get(target_id, false))

static func mark_discovery_bonus_claimed(target_id: String) -> bool:
	if target_id == "":
		return false
	var s = load_state()
	var claimed = s.get("discovery_bonus_claimed", {})
	if typeof(claimed) != TYPE_DICTIONARY:
		claimed = {}
	claimed[target_id] = true
	s["discovery_bonus_claimed"] = claimed
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

static func calibrate_onboarding_payout(raw_net: int, rocket_id: String) -> int:
	var base = max(int(raw_net), 0)
	var completed = get_completed_mission_count()
	var rocket_cost = max(RocketSpecs.get_cost(rocket_id), 0)
	if rocket_cost <= 0:
		return base
	if completed <= 0:
		var first_floor = int(round(float(rocket_cost) * FIRST_MISSION_PAYOUT_MULT))
		return max(base, first_floor)
	var target = int(round(float(rocket_cost) * EARLY_MISSION_PAYOUT_TARGET_MULT))
	# Softly nudge early repeat runs back toward normal economy.
	return int(round(lerp(float(base), float(target), 0.35)))

static func set_destroyed(rocket_id: String, reason: String = "destroyed") -> bool:
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
	if _archive_rocket_wear_in_state(s, rocket_id, reason):
		changed = true
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

static func _apply_contractor_consequences(state: Dictionary) -> bool:
	var offer = state.get("trip_contract_offer", {})
	if typeof(offer) != TYPE_DICTIONARY or offer.is_empty():
		return false
	
	var contractor_id = str(offer.get("selected_contractor", ""))
	if contractor_id == "":
		return false
	
	# Apply 5 minute cooldown
	SubcontractorManager.set_cooldown(contractor_id, 300)
	
	# Award reputation XP (base 100 per successful trip)
	SubcontractorManager.add_reputation(contractor_id, 100)
	
	# Clear the offer so they must pick a new one (or same one after cooldown)
	state["trip_contract_offer"] = {}
	return true

static func finalize_return(rocket_id: String) -> bool:
	if rocket_id == "":
		return false
	var s = load_state()
	var changed = false
	var now = int(Time.get_unix_time_from_system())
	
	# Handle contractor rewards and cooldowns
	if _apply_contractor_consequences(s):
		changed = true
		
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
	
	# Handle contractor rewards and cooldowns
	if _apply_contractor_consequences(s):
		changed = true
		
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

static func remove_awaiting_rocket() -> bool:
	var s = load_state()
	var placed: Array = s.get("placed", [])
	var new_placed := []
	var removed := false
	for item in placed:
		if str(item.get("status", "")) == "awaitingLaunch":
			removed = true
		else:
			new_placed.append(item)
	if not removed:
		return false
	s["placed"] = new_placed
	return save_state(s)

static func reset_state() -> bool:
	# Reset rockets state to defaults: only starter rocket unlocked, no placed rockets
	var data = RocketsStateAccess.build_default_state(MISSION_PROGRESS_SCHEMA_VERSION)
	_preview_target = {}
	_return_to_new_mission_panel = false
	_preview_index = 0
	_returned_mission = {}
	_pending_mission_guidance_id = 0
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
		AppLogger.d("RocketsManager: reset_state verified via load_state fallback")
		return true
	push_error("RocketsManager: reset_state failed to persist user state; using in-memory override")
	_override_state = data.duplicate(true)
	return true

static func _write_state_direct(data: Dictionary) -> bool:
	var ok = RocketsStateAccess.write_state_direct(data, STATE_PATH)
	if ok:
		AppLogger.d("RocketsManager: direct state write succeeded: " + str(STATE_PATH))
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

static func set_tess_classification(target_id: String, verdict: String) -> void:
	var s = load_state()
	var map: Dictionary = s.get("tess_classifications", {})
	map[target_id] = verdict
	s["tess_classifications"] = map
	save_state(s)

static func get_tess_classification(target_id: String) -> String:
	var s = load_state()
	return str(s.get("tess_classifications", {}).get(target_id, ""))

static func clear_tess_classification(target_id: String) -> void:
	var s = load_state()
	var map: Dictionary = s.get("tess_classifications", {})
	map.erase(target_id)
	s["tess_classifications"] = map
	save_state(s)

## Returns all targets the player has classified, as { anomaly_id: verdict }.
static func get_all_tess_classifications() -> Dictionary:
	var s = load_state()
	return s.get("tess_classifications", {}).duplicate(true)

static func set_returned_mission(rocket_id: String, target_id: String, target_label: String, target_type: String, operation_mode: String = "", extra: Dictionary = {}) -> void:
	var wear_points = add_rocket_wear(rocket_id, 1)
	var resolved_mode = operation_mode.strip_edges().to_lower()
	if not OPEN_OPERATION_MODES.has(resolved_mode):
		resolved_mode = get_operation_mode_for_rocket(rocket_id)
	_returned_mission = {
		"rocket_id": rocket_id,
		"target_id": target_id,
		"label": target_label,
		"type": target_type,
		"operation_mode": resolved_mode,
		"rocket_customization": get_rocket_customization(rocket_id),
		"rocket_wear_points": wear_points,
		"rocket_wear_tier": get_rocket_wear_tier(rocket_id)
	}
	for key in extra.keys():
		_returned_mission[key] = extra[key]
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

## Orbiting rocket functions removed — orbit flow retired in favour of the new debrief.

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

static func set_map_return_mode(enabled: bool) -> void:
	_map_return_mode = enabled

static func consume_map_return_mode() -> bool:
	var flag := _map_return_mode
	_map_return_mode = false
	return flag

static func is_map_return_mode() -> bool:
	return _map_return_mode

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

static func _archive_rocket_wear_in_state(state: Dictionary, rocket_id: String, reason: String = "retired") -> bool:
	if rocket_id == "":
		return false
	var wear_map = state.get("rocket_wear", {})
	if typeof(wear_map) != TYPE_DICTIONARY:
		wear_map = {}
	var wear_points = max(int(wear_map.get(rocket_id, 0)), 0)
	var archived = state.get("archived_rocket_wear", {})
	if typeof(archived) != TYPE_DICTIONARY:
		archived = {}
	archived[rocket_id] = {
		"wear_points": wear_points,
		"wear_tier": 3 if wear_points >= 12 else 2 if wear_points >= 8 else 1 if wear_points >= 4 else 0,
		"archived_at": int(Time.get_unix_time_from_system()),
		"reason": reason.strip_edges().to_lower()
	}
	if wear_map.has(rocket_id):
		wear_map.erase(rocket_id)
	state["rocket_wear"] = wear_map
	state["archived_rocket_wear"] = archived
	return true

static func _find_trip_contractor(contractor_id: String) -> Dictionary:
	return RocketsMissionProgress.find_trip_contractor(contractor_id, FREE_OPS_CONTRACTOR_OFFERS)

static func _find_starter_contractor(contractor_id: String) -> Dictionary:
	return RocketsMissionProgress.find_trip_contractor(contractor_id, STARTER_CONTRACTOR_OFFERS)

static func _get_latest_active_mission() -> Dictionary:
	var missions = get_missions()
	if missions.is_empty():
		return {}
	var latest := {}
	var latest_launch := -1.0
	for item_any in missions:
		if typeof(item_any) != TYPE_DICTIONARY:
			continue
		var item: Dictionary = item_any
		var launch = float(item.get("launch_time", 0))
		if launch >= latest_launch:
			latest_launch = launch
			latest = item
	return latest.duplicate(true)

static func _build_mission_objective(rocket_id: String, target_id: String, target_label: String, target_type: String, operation_mode: String) -> Dictionary:
	var stage = _effective_stage_for_target_selection()
	var contractor_context = _objective_contractor_context(stage, operation_mode)
	return MissionObjectiveResolver.build_objective({
		"stage": stage,
		"target_id": target_id,
		"target_label": target_label,
		"target_type": target_type,
		"operation_mode": operation_mode,
		"contractor": contractor_context.get("contractor", {}),
		"requested_minerals": contractor_context.get("requested_minerals", {}),
		"source": "launch:%s" % rocket_id
	})

static func _objective_contractor_context(stage: int, operation_mode: String) -> Dictionary:
	if operation_mode != "contract":
		return {}
	if stage <= 1:
		var starter = get_starter_selected_contractor()
		if starter.is_empty():
			var starters = get_starter_contractors()
			if not starters.is_empty() and typeof(starters[0]) == TYPE_DICTIONARY:
				starter = starters[0]
		if starter.is_empty():
			return {}
		return {
			"contractor": {
				"id": str(starter.get("id", "")),
				"name": str(starter.get("name", "")),
				"effect": str(starter.get("effect", "")),
				"starter": true
			},
			"requested_minerals": get_starter_requested_minerals(str(starter.get("id", "")))
		}
	var trip = _get_selected_trip_contractor_from_offer()
	if trip.is_empty():
		trip = get_trip_selected_contractor()
	if trip.is_empty():
		return {}
	return {
		"contractor": {
			"id": str(trip.get("id", "")),
			"name": str(trip.get("name", "")),
			"effect": str(trip.get("effect", "")),
			"starter": false
		},
		"requested_minerals": trip.get("requested_minerals", {})
	}

static func _get_selected_trip_contractor_from_offer() -> Dictionary:
	var offer = get_trip_contract_offer()
	if offer.is_empty() or bool(offer.get("selection_required", true)):
		return {}
	var selected_id = str(offer.get("selected_contractor", ""))
	if selected_id == "":
		return {}
	var contractors = offer.get("contractors", [])
	if typeof(contractors) != TYPE_ARRAY:
		return {}
	for item_any in contractors:
		if typeof(item_any) != TYPE_DICTIONARY:
			continue
		var item: Dictionary = item_any
		if str(item.get("id", "")) == selected_id:
			return item.duplicate(true)
	return {}

static func _build_starter_contract_offer() -> Dictionary:
	return {
		"contractors": get_starter_contractors(),
		"selected_contractor": ""
	}

static func _is_tutorial_stage_one_active() -> bool:
	if get_mission_stage() > 1:
		return false
	var app = AppControllerHelper.get_instance()
	if app and app.has_method("get_tutorial_state"):
		var state = app.get_tutorial_state()
		if typeof(state) == TYPE_DICTIONARY:
			if bool(state.get("skipped", false)):
				return false
			return int(state.get("current_stage", 0)) == 1
	return false

static func _effective_stage_for_target_selection() -> int:
	if _is_tutorial_stage_one_active():
		return 1
	return get_mission_stage()

static func _requires_trip_contractor_for_selection() -> bool:
	var stage = _effective_stage_for_target_selection()
	return stage >= 4 and is_free_operations_unlocked()

static func _build_trip_contract_offer(detected_targets: Array = []) -> Dictionary:
	return RocketsMissionProgress.build_trip_contract_offer(
		get_detected_targets() if detected_targets.is_empty() else detected_targets,
		get_trip_contractors(),
		FREE_OPS_PAYOUT_CAP
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
		var merged_row := row.duplicate(true)
		merged_row["id"] = tid
		merged_row["label"] = str(row.get("label", tid))
		merged_row["type"] = _normalize_target_type(str(row.get("type", "asteroid")))
		merged.append(merged_row)
		ids[tid] = true
		changed = true
	if not changed:
		return false
	return set_detected_targets(merged)

static func get_unlocked_star_systems(stage: int = -1) -> Array:
	var mission_stage := stage if stage > 0 else get_mission_stage()
	var source := get_selectable_targets_for_stage(mission_stage)
	var seen := {}
	var out := []
	for target_any in source:
		if typeof(target_any) != TYPE_DICTIONARY:
			continue
		var target: Dictionary = target_any
		var system_id := str(target.get("star_system_id", target.get("parent_star", ""))).strip_edges()
		if system_id == "":
			continue
		if seen.has(system_id):
			continue
		seen[system_id] = true
		out.append({
			"id": system_id,
			"name": str(target.get("star_system_name", target.get("parent_star", system_id))),
			"parent_star": str(target.get("parent_star", "")),
			"target_count": 1
		})
	return out
