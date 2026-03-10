extends RefCounted
class_name RocketsMissionProgress

static func completed_mission_count_from_state(state: Dictionary) -> int:
    var badges = state.get("completed_mission_badges", [])
    if typeof(badges) == TYPE_ARRAY:
        return badges.size()
    return max(int(state.get("mission_progress_completed", 0)), 0)

static func mission_stage_from_completed(completed: int) -> int:
    if completed <= 0:
        return 1
    if completed == 1:
        return 2
    if completed == 2:
        return 3
    if completed == 3:
        return 4
    # Authored mission progression stops at Mission 4.
    # Post-M4 gameplay is Free Operations while keeping stage 4 compatibility.
    return 4

static func sanitize_completed_badges(state: Dictionary, scanner_unlock_completed_missions: int) -> bool:
    var raw = state.get("completed_mission_badges", [])
    if typeof(raw) != TYPE_ARRAY:
        state["completed_mission_badges"] = []
        state["mission_progress_completed"] = 0
        return true
    var cleaned := []
    var seen := {}
    for badge_any in raw:
        var badge = str(badge_any).strip_edges()
        if badge == "":
            continue
        var lower = badge.to_lower()
        # Ignore test-only badges so local/headless test runs don't pollute progression.
        if lower.find("test") != -1:
            continue
        if not is_progress_badge_valid(badge):
            continue
        if seen.has(badge):
            continue
        seen[badge] = true
        cleaned.append(badge)
    var prior_count = max(int(state.get("mission_progress_completed", 0)), 0)
    var changed = cleaned.size() != raw.size() or prior_count != cleaned.size()
    state["completed_mission_badges"] = cleaned
    state["mission_progress_completed"] = cleaned.size()
    state["scanner_unlocked"] = cleaned.size() >= scanner_unlock_completed_missions
    return changed

static func migrate_mission_progress_schema(state: Dictionary, mission_progress_schema_version: int) -> bool:
    var current_version = int(state.get("mission_progress_schema_version", 0))
    if current_version >= mission_progress_schema_version:
        return false
    # Reset stale progression to avoid legacy saves marking mission roadmap as completed.
    state["mission_progress_completed"] = 0
    state["completed_mission_badges"] = []
    state["scanner_unlocked"] = false
    state["mission_progress_schema_version"] = mission_progress_schema_version
    return true

static func is_progress_badge_valid(badge: String) -> bool:
    var lower = badge.to_lower()
    if lower.begins_with("mission-"):
        return true
    if lower.begins_with("debug-skip-"):
        return true
    var parts = badge.split("-")
    if parts.size() < 3:
        return false
    var stamp = str(parts[parts.size() - 1]).strip_edges()
    return stamp.is_valid_int()

static func find_mission5_contractor(contractor_id: String, contractor_offers: Array) -> Dictionary:
    if contractor_id == "":
        return {}
    for entry in contractor_offers:
        if str(entry.get("id", "")) == contractor_id:
            return entry.duplicate(true)
    return {}

static func build_mission5_contract_offer(
    mission5_targets: Array,
    contractor_offers: Array,
    payout_cap: int
) -> Dictionary:
    var recommended_target := {}
    if not mission5_targets.is_empty():
        recommended_target = mission5_targets[0]
    var recommended_target_id = str(recommended_target.get("id", ""))
    var recommended_target_label = str(recommended_target.get("label", recommended_target_id))
    var hash_utils = preload("res://Scripts/Utils/HashUtils.gd")
    var hash_seed = hash_utils.simple_hash("%s:%d" % [recommended_target_id, int(Time.get_unix_time_from_system())])
    var rng = RandomNumberGenerator.new()
    rng.seed = hash_seed
    var requested_minerals := {
        "Iron": rng.randi_range(80, 220),
        "Nickel": rng.randi_range(60, 180)
    }
    return {
        "contractors": contractor_offers.duplicate(true),
        "selected_contractor": "",
        "requested_minerals": requested_minerals,
        "recommended_target_id": recommended_target_id,
        "recommended_target_label": recommended_target_label,
        "recommended_rocket": "starterrocket1",
        "payout_cap": payout_cap
    }
