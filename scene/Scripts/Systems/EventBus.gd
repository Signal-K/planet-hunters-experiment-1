extends Node
## Global EventBus for cross-domain decoupled signaling.
## Add to project autoloads as "EventBus".

# Player / economy
signal player_state_changed(snapshot: Dictionary)
signal franc_balance_changed(new_balance: int)
signal counter_changed(new_value: int)

# Mission / progression
signal mission_completed(mission_data: Dictionary)
signal mission_stage_changed(new_stage: int)

# Sync / bridge
signal pwa_state_received(payload: Dictionary)
signal pwa_sync_requested()
