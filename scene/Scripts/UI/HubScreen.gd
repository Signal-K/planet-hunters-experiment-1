extends Control

signal action_requested(action: String)
signal menu_requested
signal progress_requested

@onready var backdrop: TextureRect = $Backdrop
@onready var soil_band: ColorRect = $SoilBand
@onready var hub_chrome = $HubChrome
@onready var control_tile = $ControlTile
@onready var launchpad_tile = $LaunchpadTile
@onready var satellite_tile = $SatelliteTile
@onready var marketplace_tile = $MarketplaceTile
@onready var tap_hint: Label = $TapHint
@onready var radial_menu = $RadialMenu

func _ready() -> void:
	_connect_children()

func set_state(state: Dictionary) -> void:
	var chrome_state: Dictionary = state.get("chrome", {})
	hub_chrome.set_state(chrome_state)
	radial_menu.set_state(bool(state.get("radial_open", false)), bool(state.get("allow_build", false)))
	_set_tile(control_tile, state, "control", "missions")
	_set_tile(launchpad_tile, state, "launchpad", "missions")
	_set_tile(satellite_tile, state, "satellite", "classify")
	_set_tile(marketplace_tile, state, "market", "")
	tap_hint.visible = bool(state.get("show_hint", true))
	queue_redraw()

func _connect_children() -> void:
	hub_chrome.action_requested.connect(func():
		progress_requested.emit()
	)
	hub_chrome.menu_requested.connect(func():
		menu_requested.emit()
	)
	control_tile.pressed.connect(func():
		action_requested.emit("missions")
	)
	launchpad_tile.pressed.connect(func():
		action_requested.emit("missions")
	)
	satellite_tile.pressed.connect(func():
		action_requested.emit("classify")
	)
	marketplace_tile.pressed.connect(func():
		action_requested.emit("market")
	)
	radial_menu.action_requested.connect(func(action: String):
		action_requested.emit(action)
	)

func _set_tile(tile: Button, state: Dictionary, key: String, default_action: String) -> void:
	var structures: Dictionary = state.get("placed_structures", {})
	var visible := key == "launchpad" or structures.has(key)
	tile.visible = visible
	if not visible:
		return
	var accent := Color("#5d7390")
	var active := true
	var title := ""
	var subtitle := ""
	var status := ""
	var texture_path := ""
	match key:
		"control":
			title = "Control Station"
			subtitle = "5 JOBS"
			status = "READY"
			accent = Color("#7ec8ff")
			texture_path = "res://design_system_source/assets/parts/comms_relay_t1.png"
		"launchpad":
			title = "Launchpad"
			subtitle = "OPERATIONAL"
			status = "READY"
			accent = Color("#f5a623")
			texture_path = "res://design_system_source/assets/parts/basic_thruster_t1.png"
		"satellite":
			title = "Satellite Station"
			subtitle = "L5 LOCKED"
			status = "LOCKED"
			accent = Color("#5d7390")
			texture_path = "res://design_system_source/assets/parts/scanner_array_t2.png"
		"market":
			title = "Marketplace"
			subtitle = "L5 LOCKED"
			status = "LOCKED"
			accent = Color("#5d7390")
			texture_path = "res://design_system_source/assets/parts/broadcast_array_t2.png"
	var texture := load(texture_path)
	tile.set_state({
		"title": title,
		"subtitle": subtitle,
		"status": status,
		"texture": texture,
		"accent": accent,
		"active": active,
		"size": tile.custom_minimum_size
	})
