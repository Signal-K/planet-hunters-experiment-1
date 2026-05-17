extends RefCounted
class_name RocketsStateAccess

const KNOWN_ROCKET_TYPES := ["starterrocket1", "starterrocket2", "starterrocket3"]
const VALID_OPERATION_MODES := ["contract", "survey"]
const MAX_PLANNING_STEP := 3
const INVENTORY_DEFAULTS := {
    "Iron": 0,
    "Nickel": 0,
    "Cobalt": 0,
    "Platinum": 0,
    "Silicates": 0
}

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
        var override_copy = override_state.duplicate(true)
        _apply_defaults(override_copy, scanner_unlock_completed_missions)
        _sync_legacy_progression_state(override_copy)
        _sync_legacy_scanner_station_state(override_copy)
        _reconcile_progression_floor(override_copy, scanner_unlock_completed_missions)
        _reconcile_state_invariants(override_copy, scanner_unlock_completed_missions)
        return override_copy
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
    var progression_state_migrated = _sync_legacy_progression_state(data)
    var scanner_state_migrated = _sync_legacy_scanner_station_state(data)

    var progress_migrated = false
    if on_progress_migrate.is_valid():
        progress_migrated = bool(on_progress_migrate.call(data))
    var badge_sanitized = false
    if on_badges_sanitize.is_valid():
        badge_sanitized = bool(on_badges_sanitize.call(data))
    var progression_floor_reconciled = _reconcile_progression_floor(data, scanner_unlock_completed_missions)
    var invariant_reconciled = _reconcile_state_invariants(data, scanner_unlock_completed_missions)
    if (progress_migrated or badge_sanitized or progression_state_migrated or scanner_state_migrated or progression_floor_reconciled or invariant_reconciled) and on_save_state.is_valid():
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
    return json.save_json(state_path, data)

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
    data["control_station_built"] = false
    data["scanner_station_built"] = false
    data["scanner_unlocked"] = false
    data["scanner_unlock_dialog_seen"] = false
    data["scanner_next_scan_at"] = 0
    data["trip_contract_offer"] = {}
    data["operation_mode"] = "contract"
    data["candidate_visit_blocks"] = {}
    data["target_annotation_levels"] = {}
    data["tess_classifications"] = {}
    data["discovery_bonus_claimed"] = {}
    data["rocket_customizations"] = {}
    data["rocket_wear"] = {}
    data["archived_rocket_wear"] = {}
    data["mission_briefings_seen"] = {}
    data["mission_progress_schema_version"] = mission_progress_schema_version
    data["pending_mission_guidance_id"] = 0
    data["launch_fallback_notice"] = ""
    data["inventory"] = {
        "Iron": 0,
        "Nickel": 0,
        "Cobalt": 0,
        "Platinum": 0,
        "Silicates": 0
    }
    return data

static func write_state_direct(data: Dictionary, state_path: String) -> bool:
    var json = preload("res://Scripts/Utils/JSONFileManager.gd")
    return json.save_json(state_path, data)

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
    if not data.has("control_station_built"):
        data["control_station_built"] = max(int(data.get("mission_progress_completed", 0)), 0) >= 1
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
    if not data.has("tess_classifications"):
        data["tess_classifications"] = {}
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
    if not data.has("inventory"):
        data["inventory"] = INVENTORY_DEFAULTS.duplicate(true)
    if not data.has("mission_progress_schema_version"):
        data["mission_progress_schema_version"] = 0

static func _sync_legacy_scanner_station_state(data: Dictionary) -> bool:
    var scanner_unlocked := bool(data.get("scanner_unlocked", false))
    var scanner_built := bool(data.get("scanner_station_built", false))
    var mutated := false
    if scanner_unlocked and not scanner_built:
        data["scanner_station_built"] = true
        mutated = true
    if bool(data.get("scanner_station_built", false)) and not bool(data.get("scanner_unlock_dialog_seen", false)):
        data["scanner_unlock_dialog_seen"] = true
        mutated = true
    return mutated

static func _sync_legacy_progression_state(data: Dictionary) -> bool:
    var completed := 0
    var badges = data.get("completed_mission_badges", [])
    if typeof(badges) == TYPE_ARRAY:
        completed = badges.size()
    else:
        completed = max(int(data.get("mission_progress_completed", 0)), 0)
    var mutated := false
    if completed >= 2 and not bool(data.get("control_station_built", false)):
        data["control_station_built"] = true
        mutated = true
    return mutated

static func _reconcile_progression_floor(data: Dictionary, scanner_unlock_completed_missions: int) -> bool:
    var mutated := false
    var raw_badges: Variant = data.get("completed_mission_badges", [])
    var badges: Array = raw_badges if typeof(raw_badges) == TYPE_ARRAY else []
    var completed: int = max(int(data.get("mission_progress_completed", 0)), 0)
    var minimum_completed: int = max(completed, badges.size())

    # Older/debug saves can carry later structure flags after authored mission
    # progress was reset back to zero. Keep the authored mission rail coherent by
    # backfilling the minimum completed-mission count implied by built structures.
    if bool(data.get("control_station_built", false)):
        minimum_completed = max(minimum_completed, 1)
    if bool(data.get("scanner_station_built", false)):
        minimum_completed = max(minimum_completed, 2)
        if not bool(data.get("control_station_built", false)):
            data["control_station_built"] = true
            mutated = true
    if bool(data.get("scanner_unlocked", false)):
        minimum_completed = max(minimum_completed, scanner_unlock_completed_missions)

    while badges.size() < minimum_completed:
        badges.append("mission-%d" % (badges.size() + 1))
        mutated = true

    if int(data.get("mission_progress_completed", 0)) != badges.size():
        data["mission_progress_completed"] = badges.size()
        mutated = true
    if typeof(raw_badges) != TYPE_ARRAY or raw_badges.size() != badges.size():
        data["completed_mission_badges"] = badges
        mutated = true
    if bool(data.get("scanner_station_built", false)) and not bool(data.get("scanner_unlocked", false)):
        data["scanner_unlocked"] = true
        mutated = true

    return mutated

static func _reconcile_state_invariants(data: Dictionary, scanner_unlock_completed_missions: int) -> bool:
    var mutated := false
    if _reconcile_unlocked_rockets(data, scanner_unlock_completed_missions):
        mutated = true
    if _reconcile_operation_mode(data, scanner_unlock_completed_missions):
        mutated = true
    if _reconcile_planning_state(data):
        mutated = true
    if _reconcile_contract_offer_selection(data, "starter_contract_offer", STARTER_CONTRACTOR_IDS):
        mutated = true
    if _reconcile_contract_offer_selection(data, "trip_contract_offer", _trip_contractor_ids(data)):
        mutated = true
    if _reconcile_inventory_shape(data):
        mutated = true
    if _reconcile_detected_targets(data):
        mutated = true
    if _reconcile_live_mission_payloads(data, scanner_unlock_completed_missions):
        mutated = true
    if _reconcile_seen_arrays(data):
        mutated = true
    if _reconcile_candidate_visit_blocks(data):
        mutated = true
    if _reconcile_transit_maps(data):
        mutated = true
    if _reconcile_selected_and_preview_targets(data):
        mutated = true
    return mutated

const STARTER_CONTRACTOR_IDS := ["aegis_defense", "lumen_consumer", "helion_orbital"]

static func _reconcile_unlocked_rockets(data: Dictionary, scanner_unlock_completed_missions: int) -> bool:
    var raw_unlocked = data.get("unlocked", [])
    var unlocked: Array = raw_unlocked if typeof(raw_unlocked) == TYPE_ARRAY else []
    var cleaned: Array = []
    var seen := {}
    for entry_any in unlocked:
        var rocket_type = str(entry_any).strip_edges().to_lower()
        if rocket_type == "" or not KNOWN_ROCKET_TYPES.has(rocket_type) or seen.has(rocket_type):
            continue
        seen[rocket_type] = true
        cleaned.append(rocket_type)

    if not cleaned.has("starterrocket1"):
        cleaned.append("starterrocket1")

    var completed: int = max(int(data.get("mission_progress_completed", 0)), 0)
    if completed >= 1 and not cleaned.has("starterrocket2"):
        cleaned.append("starterrocket2")
    if completed >= scanner_unlock_completed_missions and not cleaned.has("starterrocket3"):
        cleaned.append("starterrocket3")
    if cleaned.has("starterrocket3") and not cleaned.has("starterrocket2"):
        cleaned.append("starterrocket2")

    for rocket_type in _collect_referenced_rocket_types(data):
        if KNOWN_ROCKET_TYPES.has(rocket_type) and not cleaned.has(rocket_type):
            cleaned.append(rocket_type)
    if cleaned.has("starterrocket3") and not cleaned.has("starterrocket2"):
        cleaned.append("starterrocket2")

    if typeof(raw_unlocked) != TYPE_ARRAY or not _array_shallow_equal(raw_unlocked, cleaned):
        data["unlocked"] = cleaned
        return true
    return false

static func _reconcile_operation_mode(data: Dictionary, scanner_unlock_completed_missions: int) -> bool:
    var completed: int = max(int(data.get("mission_progress_completed", 0)), 0)
    var mode = str(data.get("operation_mode", "contract")).strip_edges().to_lower()
    if not VALID_OPERATION_MODES.has(mode):
        mode = "contract"
    if completed < scanner_unlock_completed_missions and mode != "contract":
        mode = "contract"
    if str(data.get("operation_mode", "contract")).strip_edges().to_lower() != mode:
        data["operation_mode"] = mode
        return true
    return false

static func _reconcile_planning_state(data: Dictionary) -> bool:
    var mutated := false
    var unlocked = data.get("unlocked", [])
    var planning_type = str(data.get("planning_rocket_type", "")).strip_edges().to_lower()
    if planning_type != "" and (not KNOWN_ROCKET_TYPES.has(planning_type) or (typeof(unlocked) == TYPE_ARRAY and not unlocked.has(planning_type))):
        data.erase("planning_rocket_type")
        mutated = true
    elif planning_type != "" and str(data.get("planning_rocket_type", "")) != planning_type:
        data["planning_rocket_type"] = planning_type
        mutated = true

    var step = int(data.get("planning_step", 0))
    var clamped = clampi(step, 0, MAX_PLANNING_STEP)
    if step != clamped:
        data["planning_step"] = clamped
        mutated = true
    return mutated

static func _reconcile_contract_offer_selection(data: Dictionary, key: String, valid_ids: Array) -> bool:
    var raw_offer = data.get(key, {})
    if typeof(raw_offer) != TYPE_DICTIONARY:
        if raw_offer != {}:
            data[key] = {}
            return true
        return false
    var offer: Dictionary = raw_offer.duplicate(true)
    var mutated := false
    var selected_id = str(offer.get("selected_contractor", "")).strip_edges()
    if selected_id != "" and not valid_ids.has(selected_id):
        offer["selected_contractor"] = ""
        selected_id = ""
        mutated = true
    if key == "trip_contract_offer":
        var selection_required = selected_id == ""
        if bool(offer.get("selection_required", true)) != selection_required:
            offer["selection_required"] = selection_required
            mutated = true
    if mutated:
        data[key] = offer
    return mutated

static func _reconcile_inventory_shape(data: Dictionary) -> bool:
    var raw_inventory = data.get("inventory", {})
    var inventory: Dictionary = raw_inventory if typeof(raw_inventory) == TYPE_DICTIONARY else {}
    var cleaned: Dictionary = {}
    for mineral in INVENTORY_DEFAULTS.keys():
        cleaned[mineral] = max(int(inventory.get(mineral, INVENTORY_DEFAULTS[mineral])), 0)
    for raw_key in inventory.keys():
        var mineral = str(raw_key).strip_edges()
        if mineral == "":
            continue
        cleaned[mineral] = max(int(inventory.get(raw_key, 0)), 0)
    if typeof(raw_inventory) != TYPE_DICTIONARY or not _dictionary_shallow_equal(raw_inventory, cleaned):
        data["inventory"] = cleaned
        return true
    return false

static func _reconcile_detected_targets(data: Dictionary) -> bool:
    var raw_targets = data.get("detected_targets", [])
    var targets: Array = raw_targets if typeof(raw_targets) == TYPE_ARRAY else []
    var cleaned: Array = []
    var seen_ids := {}
    var mutated := typeof(raw_targets) != TYPE_ARRAY
    for target_any in targets:
        if typeof(target_any) != TYPE_DICTIONARY:
            mutated = true
            continue
        var target: Dictionary = target_any.duplicate(true)
        var target_id = str(target.get("id", "")).strip_edges()
        if target_id == "" or seen_ids.has(target_id):
            mutated = true
            continue
        seen_ids[target_id] = true
        var normalized_type = _normalize_target_type(str(target.get("type", "")))
        if normalized_type != str(target.get("type", "")):
            target["type"] = normalized_type
            mutated = true
        cleaned.append(target)
    if mutated or not _array_of_dicts_equal_by_id(targets, cleaned):
        data["detected_targets"] = cleaned
        return true
    return false

static func _reconcile_live_mission_payloads(data: Dictionary, scanner_unlock_completed_missions: int) -> bool:
    var completed: int = max(int(data.get("mission_progress_completed", 0)), 0)
    var mutated := false
    var raw_missions: Variant = data.get("missions", [])
    var missions: Array = raw_missions if typeof(raw_missions) == TYPE_ARRAY else []
    var cleaned_missions: Array = []
    var mission_index_by_rocket := {}
    for mission_any in missions:
        var normalized: Dictionary = _normalize_live_mission_record(mission_any, completed, scanner_unlock_completed_missions)
        if normalized.is_empty():
            mutated = true
            continue
        var rocket_id = str(normalized.get("rocket_id", ""))
        if mission_index_by_rocket.has(rocket_id):
            var existing_index = int(mission_index_by_rocket[rocket_id])
            var existing_launch = int(cleaned_missions[existing_index].get("launch_time", 0))
            var current_launch = int(normalized.get("launch_time", 0))
            if current_launch >= existing_launch:
                cleaned_missions[existing_index] = normalized
            mutated = true
            continue
        mission_index_by_rocket[rocket_id] = cleaned_missions.size()
        cleaned_missions.append(normalized)
    if typeof(raw_missions) != TYPE_ARRAY or not _array_shallow_equal(missions, cleaned_missions):
        data["missions"] = cleaned_missions
        mutated = true

    var normalized_returned: Dictionary = _normalize_returned_mission_record(data.get("returned_mission", {}), completed, scanner_unlock_completed_missions)
    if typeof(data.get("returned_mission", {})) != TYPE_DICTIONARY or data.get("returned_mission", {}) != normalized_returned:
        data["returned_mission"] = normalized_returned
        mutated = true
    return mutated

static func _reconcile_seen_arrays(data: Dictionary) -> bool:
    var mutated := false
    for key in ["seen_asteroids", "seen_planets"]:
        var raw_seen = data.get(key, [])
        var seen: Array = raw_seen if typeof(raw_seen) == TYPE_ARRAY else []
        var cleaned: Array = []
        var seen_ids := {}
        for entry_any in seen:
            var entry = str(entry_any).strip_edges()
            if entry == "" or seen_ids.has(entry):
                continue
            seen_ids[entry] = true
            cleaned.append(entry)
        if typeof(raw_seen) != TYPE_ARRAY or not _array_shallow_equal(raw_seen, cleaned):
            data[key] = cleaned
            mutated = true
    return mutated

static func _reconcile_candidate_visit_blocks(data: Dictionary) -> bool:
    var raw_blocks = data.get("candidate_visit_blocks", {})
    if typeof(raw_blocks) != TYPE_DICTIONARY:
        data["candidate_visit_blocks"] = {}
        return true
    var cleaned := {}
    var mutated := false
    for raw_key in raw_blocks.keys():
        var key = str(raw_key).strip_edges()
        if key == "":
            mutated = true
            continue
        cleaned[key] = raw_blocks[raw_key]
    if mutated or not _dictionary_shallow_equal(raw_blocks, cleaned):
        data["candidate_visit_blocks"] = cleaned
        return true
    return false

static func _reconcile_transit_maps(data: Dictionary) -> bool:
    var valid_ids := _collect_valid_rocket_ids(data)
    var mutated := false

    var raw_returning = data.get("returning", [])
    var returning: Array = raw_returning if typeof(raw_returning) == TYPE_ARRAY else []
    var cleaned_returning: Array = []
    var seen_returning := {}
    for entry_any in returning:
        if typeof(entry_any) != TYPE_DICTIONARY:
            mutated = true
            continue
        var rocket_id = str(entry_any.get("rocket_id", entry_any.get("id", ""))).strip_edges()
        if rocket_id == "" or not valid_ids.has(rocket_id) or seen_returning.has(rocket_id):
            mutated = true
            continue
        seen_returning[rocket_id] = true
        var cleaned_entry: Dictionary = entry_any.duplicate(true)
        cleaned_entry["rocket_id"] = rocket_id
        cleaned_returning.append(cleaned_entry)
    if typeof(raw_returning) != TYPE_ARRAY or mutated or not _array_of_dicts_equal_by_rocket_id(returning, cleaned_returning):
        data["returning"] = cleaned_returning
        mutated = true

    if _prune_rocket_keyed_dictionary(data, "arrived", valid_ids):
        mutated = true
    if _prune_rocket_keyed_dictionary(data, "returned_mission", valid_ids, true):
        mutated = true
    if _prune_rocket_keyed_dictionary(data, "returning_started", valid_ids):
        mutated = true
    if _prune_status_changed_at(data, valid_ids):
        mutated = true

    return mutated

static func _reconcile_selected_and_preview_targets(data: Dictionary) -> bool:
    var mutated := false
    var selected = str(data.get("selected_target", "")).strip_edges()
    if str(data.get("selected_target", "")) != selected:
        data["selected_target"] = selected
        mutated = true
    var preview = data.get("preview_target", {})
    if typeof(preview) != TYPE_DICTIONARY:
        data["preview_target"] = {}
        return true
    if not preview.is_empty() and str(preview.get("target_id", preview.get("id", ""))).strip_edges() == "":
        data["preview_target"] = {}
        mutated = true
    return mutated

static func _normalize_live_mission_record(mission_any: Variant, completed: int, scanner_unlock_completed_missions: int) -> Dictionary:
    if typeof(mission_any) != TYPE_DICTIONARY:
        return {}
    var mission: Dictionary = mission_any.duplicate(true)
    var rocket_id = str(mission.get("rocket_id", mission.get("id", ""))).strip_edges()
    var target_id = str(mission.get("target", mission.get("target_id", ""))).strip_edges()
    if rocket_id == "" or target_id == "":
        return {}
    mission["rocket_id"] = rocket_id
    mission["target"] = target_id
    mission["target_id"] = target_id
    var target_type = _normalize_target_type(str(mission.get("target_type", "asteroid")))
    mission["target_type"] = target_type
    var operation_mode = _normalize_operation_mode_for_completed(str(mission.get("operation_mode", "contract")), completed, scanner_unlock_completed_missions)
    mission["operation_mode"] = operation_mode
    var going_to = str(mission.get("goingTo", "")).strip_edges()
    if going_to == "":
        going_to = target_id
    mission["goingTo"] = going_to
    mission["location"] = _normalize_location_array(mission.get("location", []), target_id)
    mission["objective"] = _normalize_mission_objective(mission.get("objective", {}), target_id, target_type, operation_mode, completed, "mission", str(mission.get("target_label", mission.get("label", target_id))))
    return mission

static func _normalize_returned_mission_record(returned_any: Variant, completed: int, scanner_unlock_completed_missions: int) -> Dictionary:
    if typeof(returned_any) != TYPE_DICTIONARY:
        return {}
    var returned: Dictionary = returned_any.duplicate(true)
    if returned.is_empty():
        return {}
    var rocket_id = str(returned.get("rocket_id", returned.get("id", ""))).strip_edges()
    var target_id = str(returned.get("target_id", returned.get("target", ""))).strip_edges()
    if rocket_id == "" or target_id == "":
        return {}
    returned["rocket_id"] = rocket_id
    returned["target_id"] = target_id
    returned["target"] = target_id
    returned["type"] = _normalize_target_type(str(returned.get("type", returned.get("target_type", "asteroid"))))
    returned["target_type"] = str(returned.get("type", "asteroid"))
    returned["label"] = str(returned.get("label", target_id)).strip_edges()
    if str(returned.get("label", "")).strip_edges() == "":
        returned["label"] = target_id
    var operation_mode = _normalize_operation_mode_for_completed(str(returned.get("operation_mode", "contract")), completed, scanner_unlock_completed_missions)
    returned["operation_mode"] = operation_mode
    returned["mission_objective"] = _normalize_mission_objective(returned.get("mission_objective", {}), target_id, str(returned.get("type", "asteroid")), operation_mode, completed, "returned_mission", str(returned.get("label", target_id)))
    return returned

static func _normalize_mission_objective(objective_any: Variant, target_id: String, target_type: String, operation_mode: String, completed: int, source: String, target_label: String) -> Dictionary:
    var MissionObjectiveResolver = preload("res://Scripts/Utils/MissionObjectiveResolver.gd")
    if typeof(objective_any) != TYPE_DICTIONARY:
        return MissionObjectiveResolver.build_objective({
            "stage": _mission_stage_from_completed(completed),
            "target_id": target_id,
            "target_label": target_label,
            "target_type": target_type,
            "operation_mode": operation_mode,
            "source": source
        })
    var objective: Dictionary = objective_any.duplicate(true)
    var requirements_any = objective.get("requirements", {})
    var requirements: Dictionary = requirements_any.duplicate(true) if typeof(requirements_any) == TYPE_DICTIONARY else {}
    var minerals_any = requirements.get("minerals", {})
    var minerals: Dictionary = minerals_any if typeof(minerals_any) == TYPE_DICTIONARY else {}
    requirements["minerals"] = _clean_non_negative_dictionary(minerals)
    objective["requirements"] = requirements
    objective["stage"] = _mission_stage_from_completed(completed)
    objective["target_id"] = target_id
    objective["target_label"] = target_label
    objective["target_type"] = target_type
    objective["operation_mode"] = operation_mode
    objective["source"] = str(objective.get("source", source))
    if str(objective.get("type", "")).strip_edges() == "":
        var rebuilt = MissionObjectiveResolver.build_objective({
            "stage": int(objective.get("stage", _mission_stage_from_completed(completed))),
            "target_id": target_id,
            "target_label": target_label,
            "target_type": target_type,
            "operation_mode": operation_mode,
            "requested_minerals": requirements.get("minerals", {}),
            "contractor": objective.get("contractor", {}),
            "source": objective.get("source", source)
        })
        for key in rebuilt.keys():
            objective[key] = rebuilt[key]
    return objective

static func _normalize_location_array(location_any: Variant, target_id: String) -> Array:
    var raw_location: Array = location_any if typeof(location_any) == TYPE_ARRAY else []
    var cleaned: Array = []
    var seen := {}
    for entry_any in raw_location:
        var entry = str(entry_any).strip_edges()
        if entry == "" or seen.has(entry):
            continue
        seen[entry] = true
        cleaned.append(entry)
    if cleaned.is_empty():
        cleaned.append(target_id)
    elif not seen.has(target_id):
        cleaned.append(target_id)
    return cleaned

static func _normalize_operation_mode_for_completed(mode: String, completed: int, scanner_unlock_completed_missions: int) -> String:
    var normalized = mode.strip_edges().to_lower()
    if not VALID_OPERATION_MODES.has(normalized):
        normalized = "contract"
    if completed < scanner_unlock_completed_missions and normalized != "contract":
        normalized = "contract"
    return normalized

static func _clean_non_negative_dictionary(value: Dictionary) -> Dictionary:
    var cleaned := {}
    for key in value.keys():
        var normalized_key = str(key).strip_edges()
        if normalized_key == "":
            continue
        cleaned[normalized_key] = max(int(value.get(key, 0)), 0)
    return cleaned

static func _mission_stage_from_completed(completed: int) -> int:
    if completed <= 0:
        return 1
    if completed == 1:
        return 2
    if completed == 2:
        return 3
    return 4

static func _trip_contractor_ids(data: Dictionary) -> Array:
    var out: Array = []
    var seen := {}
    var offer = data.get("trip_contract_offer", {})
    if typeof(offer) != TYPE_DICTIONARY:
        return out
    var contractors = offer.get("contractors", [])
    if typeof(contractors) != TYPE_ARRAY:
        return out
    for entry_any in contractors:
        if typeof(entry_any) != TYPE_DICTIONARY:
            continue
        var contractor_id = str(entry_any.get("id", "")).strip_edges()
        if contractor_id == "" or seen.has(contractor_id):
            continue
        seen[contractor_id] = true
        out.append(contractor_id)
    return out

static func _collect_referenced_rocket_types(data: Dictionary) -> Array:
    var types: Array = []
    var seen := {}
    for key in ["placed", "missions", "destroyed", "returned_mission"]:
        var value = data.get(key)
        if typeof(value) == TYPE_ARRAY:
            for entry_any in value:
                var rocket_type = _extract_rocket_type(entry_any)
                if rocket_type != "" and not seen.has(rocket_type):
                    seen[rocket_type] = true
                    types.append(rocket_type)
        elif typeof(value) == TYPE_DICTIONARY:
            var rocket_type = _extract_rocket_type(value)
            if rocket_type != "" and not seen.has(rocket_type):
                seen[rocket_type] = true
                types.append(rocket_type)
    return types

static func _collect_valid_rocket_ids(data: Dictionary) -> Array:
    var ids: Array = []
    var seen := {}
    for key in ["placed", "missions"]:
        var raw = data.get(key, [])
        if typeof(raw) != TYPE_ARRAY:
            continue
        for entry_any in raw:
            var rocket_id = _extract_rocket_id(entry_any)
            if rocket_id == "" or seen.has(rocket_id):
                continue
            seen[rocket_id] = true
            ids.append(rocket_id)
    var returned = data.get("returned_mission", {})
    if typeof(returned) == TYPE_DICTIONARY:
        var returned_id = _extract_rocket_id(returned)
        if returned_id != "" and not seen.has(returned_id):
            ids.append(returned_id)
    return ids

static func _prune_rocket_keyed_dictionary(data: Dictionary, key: String, valid_ids: Array, allow_single_record: bool = false) -> bool:
    var raw = data.get(key, {})
    if typeof(raw) != TYPE_DICTIONARY:
        if allow_single_record and raw == null:
            data[key] = {}
            return true
        if raw != {}:
            data[key] = {}
            return true
        return false
    if allow_single_record and raw.has("rocket_id"):
        var rocket_id = str(raw.get("rocket_id", "")).strip_edges()
        if rocket_id != "" and valid_ids.has(rocket_id):
            return false
        data[key] = {}
        return true
    var cleaned := {}
    var mutated := false
    for raw_key in raw.keys():
        var rocket_id = str(raw_key).strip_edges()
        if rocket_id == "" or not valid_ids.has(rocket_id):
            mutated = true
            continue
        cleaned[rocket_id] = raw[raw_key]
    if mutated or not _dictionary_shallow_equal(raw, cleaned):
        data[key] = cleaned
        return true
    return false

static func _prune_status_changed_at(data: Dictionary, valid_ids: Array) -> bool:
    var raw = data.get("status_changed_at", {})
    if typeof(raw) != TYPE_DICTIONARY:
        data["status_changed_at"] = {}
        return true
    var cleaned := {}
    var mutated := false
    for raw_key in raw.keys():
        var rocket_id = str(raw_key).strip_edges()
        if rocket_id == "" or not valid_ids.has(rocket_id):
            mutated = true
            continue
        var status_map = raw[raw_key]
        if typeof(status_map) != TYPE_DICTIONARY:
            mutated = true
            continue
        cleaned[rocket_id] = status_map
    if mutated or not _dictionary_shallow_equal(raw, cleaned):
        data["status_changed_at"] = cleaned
        return true
    return false

static func _extract_rocket_type(entry: Variant) -> String:
    if typeof(entry) != TYPE_DICTIONARY:
        return ""
    return str(entry.get("type", entry.get("rocket_type", ""))).strip_edges().to_lower()

static func _extract_rocket_id(entry: Variant) -> String:
    if typeof(entry) != TYPE_DICTIONARY:
        return ""
    return str(entry.get("rocket_id", entry.get("id", ""))).strip_edges()

static func _normalize_target_type(target_type: String) -> String:
    var normalized = target_type.strip_edges().to_lower()
    if normalized == "planet":
        return "planet"
    return "asteroid"

static func _array_shallow_equal(left: Array, right: Array) -> bool:
    if left.size() != right.size():
        return false
    for i in range(left.size()):
        if left[i] != right[i]:
            return false
    return true

static func _dictionary_shallow_equal(left: Dictionary, right: Dictionary) -> bool:
    if left.size() != right.size():
        return false
    for key in left.keys():
        if not right.has(key) or right[key] != left[key]:
            return false
    return true

static func _array_of_dicts_equal_by_id(left: Array, right: Array) -> bool:
    if left.size() != right.size():
        return false
    for i in range(left.size()):
        if typeof(left[i]) != TYPE_DICTIONARY or typeof(right[i]) != TYPE_DICTIONARY:
            return false
        if str(left[i].get("id", "")) != str(right[i].get("id", "")):
            return false
        if left[i] != right[i]:
            return false
    return true

static func _array_of_dicts_equal_by_rocket_id(left: Array, right: Array) -> bool:
    if left.size() != right.size():
        return false
    for i in range(left.size()):
        if typeof(left[i]) != TYPE_DICTIONARY or typeof(right[i]) != TYPE_DICTIONARY:
            return false
        if str(left[i].get("rocket_id", left[i].get("id", ""))) != str(right[i].get("rocket_id", right[i].get("id", ""))):
            return false
        if left[i] != right[i]:
            return false
    return true
