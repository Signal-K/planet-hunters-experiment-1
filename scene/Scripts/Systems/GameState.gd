extends Node

const SAVE_PATH := "user://game_state.json"

var launchpad_plot: int = 1       # 0 = left, 1 = center, 2 = right
var franc_balance: int = 10_000_000_000

func _ready() -> void:
	_load()

func set_launchpad_plot(plot: int) -> void:
	launchpad_plot = clampi(plot, 0, 2)
	_save()

func set_franc_balance(amount: int) -> void:
	franc_balance = max(0, amount)
	_save()

func full_reset() -> void:
	launchpad_plot = 1
	franc_balance = 10_000_000_000
	_save()

func _save() -> void:
	var f := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if f:
		f.store_string(JSON.stringify({
			"launchpad_plot": launchpad_plot,
			"franc_balance": franc_balance,
		}))

func _load() -> void:
	if not FileAccess.file_exists(SAVE_PATH):
		return
	var f := FileAccess.open(SAVE_PATH, FileAccess.READ)
	if not f:
		return
	var data = JSON.parse_string(f.get_as_text())
	if data is Dictionary:
		launchpad_plot = clampi(int(data.get("launchpad_plot", 1)), 0, 2)
		franc_balance = int(data.get("franc_balance", 10_000_000_000))
