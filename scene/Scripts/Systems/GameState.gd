extends Node

const SAVE_PATH := "user://game_state.json"

var launchpad_plot: int = 0       # 0-3, set during onboarding
var franc_balance: int = 10_000_000_000

func _ready() -> void:
	_load_data()

func set_launchpad_plot(plot: int) -> void:
	launchpad_plot = clampi(plot, 0, 3)
	_save_data()

func set_franc_balance(amount: int) -> void:
	franc_balance = max(0, amount)
	_save_data()

func full_reset() -> void:
	launchpad_plot = 0
	franc_balance = 10_000_000_000
	_save_data()

func _save_data() -> void:
	var f := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if f:
		f.store_string(JSON.stringify({
			"launchpad_plot": launchpad_plot,
			"franc_balance": franc_balance,
		}))
		f.close()

func _load_data() -> void:
	if not FileAccess.file_exists(SAVE_PATH):
		return
	var f := FileAccess.open(SAVE_PATH, FileAccess.READ)
	if not f:
		return
	var data = JSON.parse_string(f.get_as_text())
	if data is Dictionary:
		launchpad_plot = clampi(int(data.get("launchpad_plot", 0)), 0, 3)
		franc_balance = int(data.get("franc_balance", 10_000_000_000))
