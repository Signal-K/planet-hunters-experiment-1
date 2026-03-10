extends RefCounted
class_name RocketsStateAccess

static func load_state(
    state_path: String,
    default_state_path: String,
    override_state: Dictionary,
    scanner_unlock_completed_missions: int,
    on_progress_migrate: Callable,
    on_badges_sanitize: Callable,
    on_save_state: Callable
) -> Dictionary:
    if override_state.size() > 0:
        return override_state.duplicate(true)
    var data = {}
    var json = preload("res://Scripts/Utils/JSONFileManager.gd")
    if not FileAccess.file_exists(state_path):
        # Seed user:// state from bundled res:// file if present
        data = json.load_json(default_state_path)
        if typeof(data) != TYPE_DICTIONARY:
            data = {}
        if data.size() > 0:
            json.save_json(state_path, data)
    if data.is_empty():
        data = json.load_json(state_path)
    if typeof(data) != TYPE_DICTIONARY:
        data = {}

    _apply_defaults(data, scanner_unlock_completed_missions)

    var progress_migrated = false
    if on_progress_migrate.is_valid():
        progress_migrated = bool(on_progress_migrate.call(data))
    var badge_sanitized = false
    if on_badges_sanitize.is_valid():
        badge_sanitized = bool(on_badges_sanitize.call(data))
    if (progress_migrated or badge_sanitized) and on_save_state.is_valid():
        on_save_state.call(data)

    var migrations = preload("res://Scripts/Utils/RocketsStateStore.gd")
    if migrations:
        migrations.apply_migrations(data, on_save_state)
    return data

static func save_state(
    data: Dictionary,
    state_path: String,
    default_state_path: String,
    mission_progress_schema_version: int
) -> bool:
    if not data.has("mission_progress_schema_version"):
        data["mission_progress_schema_version"] = mission_progress_schema_version
    var json = preload("res://Scripts/Utils/JSONFileManager.gd")
    var ok = json.save_json(state_path, data)
    # Best-effort dev sync: update res:// file when writable (editor)
    # Ignore failures since res:// can be read-only in tests/exports.
    json.save_json(default_state_path, data)
    return ok

static func build_default_state(mission_progress_schema_version: int) -> Dictionary:
    var data = {}
    data["unlocked"] = ["starterrocket1"]
    data["placed"] = []
    data["launched"] = []
    data["destroyed"] = []
    data["missions"] = []
    data["selected_target"] = ""
    data["preview_target"] = {}
    data["detected_targets"] = []
    data["seen_asteroids"] = []
    data["seen_planets"] = []
    data["scan_counts"] = {}
    data["status_changed_at"] = {}
    data["mission_progress_completed"] = 0
    data["completed_mission_badges"] = []
    data["scanner_station_built"] = false
    data["scanner_unlocked"] = false
    data["scanner_unlock_dialog_seen"] = false
    data["scanner_next_scan_at"] = 0
    data["trip_contract_offer"] = {}
    data["operation_mode"] = "contract"
    data["candidate_visit_blocks"] = {}
    data["target_annotation_levels"] = {}
    data["discovery_bonus_claimed"] = {}
    data["rocket_customizations"] = {}
    data["rocket_wear"] = {}
    data["archived_rocket_wear"] = {}
    data["mission_briefings_seen"] = {}
    data["mission_progress_schema_version"] = mission_progress_schema_version
    data["pending_mission_guidance_id"] = 0
    data["launch_fallback_notice"] = ""
    return data

static func write_state_direct(data: Dictionary, state_path: String) -> bool:
    var file = FileAccess.open(state_path, FileAccess.WRITE)
    if not file:
        return false
    var json_string = JSON.stringify(data, "  ")
    file.store_string(json_string + "\n")
    file.close()
    return true

static func _apply_defaults(data: Dictionary, scanner_unlock_completed_missions: int) -> void:
    if not data.has("unlocked"):
        data["unlocked"] = ["starterrocket1"]
    if not data.has("placed"):
        data["placed"] = []
    if not data.has("launched"):
        data["launched"] = []
    if not data.has("destroyed"):
        data["destroyed"] = []
    if not data.has("missions"):
        data["missions"] = []
    if not data.has("selected_target"):
        data["selected_target"] = ""
    if not data.has("detected_targets"):
        data["detected_targets"] = []
    if not data.has("seen_asteroids"):
        data["seen_asteroids"] = []
    if not data.has("seen_planets"):
        data["seen_planets"] = []
    if not data.has("scan_counts"):
        data["scan_counts"] = {}
    if not data.has("returning"):
        data["returning"] = []
    if not data.has("arrived"):
        data["arrived"] = {}
    if not data.has("returned_mission"):
        data["returned_mission"] = {}
    if not data.has("returning_started"):
        data["returning_started"] = {}
    if not data.has("preview_target"):
        data["preview_target"] = {}
    if not data.has("status_changed_at"):
        data["status_changed_at"] = {}
    if not data.has("mission_progress_completed"):
        data["mission_progress_completed"] = 0
    if not data.has("completed_mission_badges"):
        data["completed_mission_badges"] = []
    if not data.has("pending_mission_guidance_id"):
        data["pending_mission_guidance_id"] = 0
    if not data.has("scanner_station_built"):
        data["scanner_station_built"] = false
    if not data.has("scanner_unlocked"):
        data["scanner_unlocked"] = max(int(data.get("mission_progress_completed", 0)), 0) >= scanner_unlock_completed_missions
    if not data.has("scanner_unlock_dialog_seen"):
        data["scanner_unlock_dialog_seen"] = false
    if not data.has("scanner_next_scan_at"):
        data["scanner_next_scan_at"] = 0
    if not data.has("trip_contract_offer"):
        # Backward compatibility with pre-Free Ops naming.
        if data.has("mission5_contract_offer") and typeof(data.get("mission5_contract_offer")) == TYPE_DICTIONARY:
            data["trip_contract_offer"] = data.get("mission5_contract_offer", {}).duplicate(true)
        else:
            data["trip_contract_offer"] = {}
    if not data.has("operation_mode"):
        data["operation_mode"] = "contract"
    if not data.has("candidate_visit_blocks"):
        data["candidate_visit_blocks"] = {}
    if not data.has("target_annotation_levels"):
        data["target_annotation_levels"] = {}
    if not data.has("discovery_bonus_claimed"):
        data["discovery_bonus_claimed"] = {}
    if not data.has("rocket_customizations"):
        data["rocket_customizations"] = {}
    if not data.has("rocket_wear"):
        data["rocket_wear"] = {}
    if not data.has("archived_rocket_wear"):
        data["archived_rocket_wear"] = {}
    if not data.has("mission_briefings_seen"):
        data["mission_briefings_seen"] = {}
    if not data.has("launch_fallback_notice"):
        data["launch_fallback_notice"] = ""
    if not data.has("mission_progress_schema_version"):
        data["mission_progress_schema_version"] = 0
