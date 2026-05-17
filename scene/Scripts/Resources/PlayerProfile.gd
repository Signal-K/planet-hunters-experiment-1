extends Resource
class_name PlayerProfile
## Canonical player state resource. Source of truth for in-session Godot state.
## AppController remains the write authority during the Phase 1 migration;
## this resource is kept in sync by PlayerManager.

@export var counter: int = 0
@export var franc_balance: int = 10000000000
@export var loan_balance: int = 0
@export var mission_stage: int = 1
@export var completed_missions: int = 0
@export var control_station_built: bool = false
@export var scanner_station_built: bool = false
@export var scanner_unlocked: bool = false
@export var operation_mode: String = "contract"
@export var free_operations_unlocked: bool = false
@export var active_missions_count: int = 0
@export var has_returned_mission: bool = false
@export var pending_mission_guidance_id: int = 0
@export var unlocked_rockets: Array = []

func to_snapshot() -> Dictionary:
	return {
		"schema_version": 1,
		"counter": counter,
		"franc_balance": franc_balance,
		"loan_balance": loan_balance,
		"mission_stage": mission_stage,
		"completed_missions": completed_missions,
		"control_station_built": control_station_built,
		"scanner_station_built": scanner_station_built,
		"scanner_unlocked": scanner_unlocked,
		"operation_mode": operation_mode,
		"free_operations_unlocked": free_operations_unlocked,
		"active_missions_count": active_missions_count,
		"has_returned_mission": has_returned_mission,
		"pending_mission_guidance_id": pending_mission_guidance_id,
		"unlocked_rockets": unlocked_rockets.duplicate()
	}

func apply_snapshot(snapshot: Dictionary) -> void:
	if snapshot.has("counter"): counter = int(snapshot["counter"])
	if snapshot.has("franc_balance"): franc_balance = int(snapshot["franc_balance"])
	if snapshot.has("loan_balance"): loan_balance = int(snapshot["loan_balance"])
	if snapshot.has("mission_stage"): mission_stage = int(snapshot["mission_stage"])
	if snapshot.has("completed_missions"): completed_missions = int(snapshot["completed_missions"])
	if snapshot.has("control_station_built"): control_station_built = bool(snapshot["control_station_built"])
	if snapshot.has("scanner_station_built"): scanner_station_built = bool(snapshot["scanner_station_built"])
	if snapshot.has("scanner_unlocked"): scanner_unlocked = bool(snapshot["scanner_unlocked"])
	if snapshot.has("operation_mode"): operation_mode = str(snapshot["operation_mode"])
	if snapshot.has("free_operations_unlocked"): free_operations_unlocked = bool(snapshot["free_operations_unlocked"])
	if snapshot.has("active_missions_count"): active_missions_count = int(snapshot["active_missions_count"])
	if snapshot.has("has_returned_mission"): has_returned_mission = bool(snapshot["has_returned_mission"])
	if snapshot.has("pending_mission_guidance_id"): pending_mission_guidance_id = int(snapshot["pending_mission_guidance_id"])
	if snapshot.has("unlocked_rockets"): unlocked_rockets = snapshot["unlocked_rockets"].duplicate()
