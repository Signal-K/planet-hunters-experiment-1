extends Node
## Autoload. Owns the canonical PlayerProfile resource.
## During Phase 1 migration, mirrors AppController state and re-emits via EventBus.
## Future phases will make AppController read from this instead.

var profile := PlayerProfile.new()

func _ready() -> void:
	_mirror_from_app_controller()
	_connect_app_controller_signals()
	print("[PlayerManager] Ready")

func _get_app_controller() -> Node:
	return get_node_or_null("/root/AppController")

func _mirror_from_app_controller() -> void:
	var app := _get_app_controller()
	if app and app.has_method("get_player_state_snapshot"):
		profile.apply_snapshot(app.get_player_state_snapshot("player_manager_init"))

func _connect_app_controller_signals() -> void:
	var app := _get_app_controller()
	if not app:
		return
	if app.has_signal("player_state_snapshot_updated"):
		app.player_state_snapshot_updated.connect(_on_snapshot_updated)
	if app.has_signal("franc_balance_updated"):
		app.franc_balance_updated.connect(_on_franc_balance_updated)
	if app.has_signal("counter_updated"):
		app.counter_updated.connect(_on_counter_updated)

func _on_snapshot_updated(snapshot: Dictionary) -> void:
	profile.apply_snapshot(snapshot)
	EventBus.player_state_changed.emit(profile.to_snapshot())

func _on_franc_balance_updated(new_balance: int) -> void:
	profile.franc_balance = new_balance
	EventBus.franc_balance_changed.emit(new_balance)

func _on_counter_updated(new_value: int) -> void:
	profile.counter = new_value
	EventBus.counter_changed.emit(new_value)

func get_snapshot() -> Dictionary:
	return profile.to_snapshot()
