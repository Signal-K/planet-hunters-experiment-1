extends Control

const RocketsManager = preload("res://Scripts/Utils/RocketsManager.gd")

@export var screen_type := ""

const BASE_SCENE := "res://Scenes/Earth/earth_base_1.tscn"
const MISSIONS_SCENE := "res://Scenes/UI/LaunchWizard.tscn"
const TARGETS_SCENE := "res://Scenes/UI/SpaceMap/space_map.tscn"
const GALAXY_SCENE := "res://Scenes/UI/SpaceMap/galaxy_map.tscn"
const FAB_SCENE := "res://Scenes/Transitions/rocket_ascent.tscn"
const TRANSIT_SCENE := "res://Scenes/Transitions/rocket_transit.tscn"
const MINING_SCENE := "res://Scenes/UI/SidescrollMining.tscn"
const DEBRIEF_SCENE := "res://Scenes/Earth/mission_debrief_v2.tscn"

# Hub layout: x ranges for each of the 3 surface plots [left, right]
const _SLOT_X := [[40.0, 360.0], [380.0, 700.0], [720.0, 1040.0]]
const _ART_Y := [980.0, 1340.0]   # top, bottom for structure art
const _BTN_Y := [1345.0, 1415.0]  # top, bottom for label button

signal back_pressed
signal launched(rocket_id: String, target_id: String)

func _ready() -> void:
	_connect("BackButton", _go_back)
	_connect("BaseButton", func(): _go(BASE_SCENE))
	_connect("MenuButton", func(): _go(MISSIONS_SCENE))
	_connect("LaunchpadButton", func(): _go(MISSIONS_SCENE))
	_connect("MissionsButton", func(): _go(MISSIONS_SCENE))
	_connect("GalaxyButton", func(): _go(GALAXY_SCENE))
	_connect("FabButton", func(): _go(MISSIONS_SCENE))
	_connect("Contract1Button", func(): _go(TARGETS_SCENE))
	_connect("Contract2Button", func(): _go(TARGETS_SCENE))
	_connect("Contract3Button", func(): _go(TARGETS_SCENE))
	_connect("TargetMarsButton", func(): _go(FAB_SCENE))
	_connect("TargetBeltButton", func(): _go(FAB_SCENE))
	_connect("LaunchButton", func():
		launched.emit("starter_rocket_1", "mars")
		_go(TRANSIT_SCENE)
	)
	_connect("ArriveButton", func(): _go(MINING_SCENE))
	_connect("CompleteMiningButton", func(): _go(DEBRIEF_SCENE))
	_connect("SellCargoButton", func(): _go(BASE_SCENE))
	if screen_type == "hub":
		_connect("BuildLeftButton", func():
			RocketsManager.set_launchpad_plot(0)
			_go(BASE_SCENE)
		)
		_connect("BuildRightButton", func():
			RocketsManager.set_launchpad_plot(2)
			_go(BASE_SCENE)
		)
		_refresh_hub_layout()

func _refresh_hub_layout() -> void:
	var plot := RocketsManager.get_launchpad_plot()
	_set_slot("LaunchpadArt", plot, true)
	_set_slot("LaunchpadButton", plot, false)
	# Hide build-slot nodes that overlap with the launchpad's chosen plot
	_show_node("ControlStationArt", plot != 0)
	_show_node("BuildLeftButton", plot != 0)
	_show_node("SatelliteArt", plot != 2)
	_show_node("BuildRightButton", plot != 2)

func _set_slot(node_name: String, slot: int, is_art: bool) -> void:
	var node := find_child(node_name, true, false) as Control
	if node == null:
		return
	node.offset_left = _SLOT_X[slot][0]
	node.offset_right = _SLOT_X[slot][1]
	node.offset_top = _ART_Y[0] if is_art else _BTN_Y[0]
	node.offset_bottom = _ART_Y[1] if is_art else _BTN_Y[1]

func _show_node(node_name: String, shown: bool) -> void:
	var node := find_child(node_name, true, false)
	if node:
		node.visible = shown

func _connect(node_name: String, action: Callable) -> void:
	var node := find_child(node_name, true, false)
	if node is BaseButton and not (node as BaseButton).pressed.is_connected(action):
		(node as BaseButton).pressed.connect(action)

func _go_back() -> void:
	match screen_type:
		"missions", "galaxy", "debrief":
			_go(BASE_SCENE)
		"targets":
			_go(MISSIONS_SCENE)
		"fab":
			_go(TARGETS_SCENE)
		"transit":
			_go(FAB_SCENE)
		"mining":
			_go(BASE_SCENE)
		_:
			back_pressed.emit()

func _go(path: String) -> void:
	var tree := get_tree()
	if tree:
		tree.change_scene_to_file(path)
