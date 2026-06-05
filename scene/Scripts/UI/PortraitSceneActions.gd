extends Control

@export var screen_type := ""

const BASE_SCENE := "res://Scenes/Earth/earth_base_1.tscn"
const MISSIONS_SCENE := "res://Scenes/UI/LaunchWizard.tscn"
const TARGETS_SCENE := "res://Scenes/UI/SpaceMap/space_map.tscn"
const GALAXY_SCENE := "res://Scenes/UI/SpaceMap/galaxy_map.tscn"
const FAB_SCENE := "res://Scenes/Transitions/rocket_ascent.tscn"
const TRANSIT_SCENE := "res://Scenes/Transitions/rocket_transit.tscn"
const MINING_SCENE := "res://Scenes/UI/SidescrollMining.tscn"
const DEBRIEF_SCENE := "res://Scenes/Earth/mission_debrief_v2.tscn"

signal back_pressed
signal launched(rocket_id: String, target_id: String)

func _ready() -> void:
	_connect("BackButton", _go_back)
	_connect("BaseButton", func(): _go(BASE_SCENE))
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
