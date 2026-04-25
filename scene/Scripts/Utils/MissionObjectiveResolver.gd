extends RefCounted
class_name MissionObjectiveResolver

const SCHEMA_VERSION := 1
const TYPE_MINING_ORDER := "mining_order"
const TYPE_CARGO_COLLECTION := "cargo_collection"
const TYPE_NO_CARGO := "no_cargo"

static func build_objective(context: Dictionary) -> Dictionary:
	var requested := _clean_minerals(context.get("requested_minerals", {}))
	var contractor := _clean_contractor(context.get("contractor", {}))
	var target_type := str(context.get("target_type", "asteroid"))
	var objective_type := TYPE_MINING_ORDER if not requested.is_empty() else str(context.get("objective_type", ""))
	if objective_type == "":
		objective_type = TYPE_CARGO_COLLECTION if _target_type_supports_cargo(target_type) else TYPE_NO_CARGO
	return {
		"schema_version": SCHEMA_VERSION,
		"type": objective_type,
		"stage": int(context.get("stage", 0)),
		"target_id": str(context.get("target_id", "")),
		"target_label": str(context.get("target_label", "")),
		"target_type": target_type,
		"operation_mode": str(context.get("operation_mode", "contract")),
		"requirements": {
			"minerals": requested
		},
		"contractor": contractor,
		"source": str(context.get("source", "mission"))
	}

static func completion_payload(objective: Dictionary, debug: bool = false) -> Dictionary:
	var objective_type := str(objective.get("type", TYPE_NO_CARGO))
	var requested := _clean_minerals(objective.get("requirements", {}).get("minerals", {}))
	var contractor := _clean_contractor(objective.get("contractor", {}))
	var collected := {}
	if objective_type == TYPE_MINING_ORDER:
		collected = requested.duplicate(true)
	elif objective_type == TYPE_CARGO_COLLECTION:
		collected = _clean_minerals(objective.get("debug_cargo", {}))
	var report := {
		"reason": "debug_completed" if debug else "objective_completed",
		"objective_type": objective_type,
		"objective_complete": true,
		"debug_completed": debug,
		"starter_contract_active": false,
		"starter_contract_complete": true,
		"starter_order": requested.duplicate(true),
		"collected": collected.duplicate(true),
		"accuracy": {
			"starter_order_active": not requested.is_empty(),
			"order_match_count": _sum_minerals(requested),
			"non_order_count": 0,
			"order_precision_pct": 100.0
		}
	}
	var payload := {
		"mission_objective": objective.duplicate(true),
		"objective_result": {
			"type": objective_type,
			"complete": true,
			"debug_completed": debug
		},
		"mining_run_collected": collected.duplicate(true),
		"mining_report": report
	}
	if objective_type == TYPE_MINING_ORDER and not requested.is_empty():
		if bool(contractor.get("starter", false)):
			payload["starter_contract_context"] = {
				"active": true,
				"id": str(contractor.get("id", "")),
				"name": str(contractor.get("name", "Contractor")),
				"requested_minerals": requested.duplicate(true)
			}
			payload["starter_contract_complete"] = true
		else:
			payload["trip_contractor_id"] = str(contractor.get("id", ""))
			payload["trip_contractor_name"] = str(contractor.get("name", ""))
			payload["trip_contractor_effect"] = str(contractor.get("effect", ""))
			payload["trip_requested_minerals"] = requested.duplicate(true)
	return payload

static func is_complete(objective: Dictionary, result: Dictionary) -> bool:
	var requested := _clean_minerals(objective.get("requirements", {}).get("minerals", {}))
	if requested.is_empty():
		return bool(result.get("complete", true))
	var collected := _clean_minerals(result.get("minerals", result.get("mining_run_collected", {})))
	for mineral in requested.keys():
		if int(collected.get(mineral, 0)) < int(requested.get(mineral, 0)):
			return false
	return true

static func _clean_minerals(value) -> Dictionary:
	if typeof(value) != TYPE_DICTIONARY:
		return {}
	var out := {}
	for key in value.keys():
		var amount: int = max(int(value.get(key, 0)), 0)
		if amount > 0:
			out[str(key)] = amount
	return out

static func _clean_contractor(value) -> Dictionary:
	if typeof(value) != TYPE_DICTIONARY:
		return {}
	var out := {}
	for key in value.keys():
		var v = value.get(key)
		if typeof(v) in [TYPE_STRING, TYPE_BOOL, TYPE_INT, TYPE_FLOAT]:
			out[str(key)] = v
	return out

static func _sum_minerals(minerals: Dictionary) -> int:
	var total := 0
	for key in minerals.keys():
		total += int(minerals.get(key, 0))
	return total

static func _target_type_supports_cargo(target_type: String) -> bool:
	return target_type in ["asteroid", "planet"]
