extends SceneTree

const SCENES := [
	{"path": "res://Scenes/Earth/earth_base_1.tscn", "root": "LandnamPortraitFlow", "screen": "HubScreen"},
	{"path": "res://Scenes/UI/LaunchWizard.tscn", "root": "LandnamMissionBoard", "screen": "MissionsScreen"},
	{"path": "res://Scenes/UI/SpaceMap/space_map.tscn", "root": "LandnamTargets", "screen": "TargetsScreen"},
	{"path": "res://Scenes/UI/SpaceMap/galaxy_map.tscn", "root": "LandnamGalaxy", "screen": "GalaxyScreen"},
	{"path": "res://Scenes/Earth/mission_debrief_v2.tscn", "root": "LandnamDebrief", "screen": "DebriefScreen"},
]

var _passed := 0
var _failed := 0

func _init() -> void:
	print("\n========================================================================")
	print("Portrait Flow Scenes")
	print("========================================================================")
	for entry in SCENES:
		await _test_scene(entry)
	print("------------------------------------------------------------------------")
	print("Passed: %d  Failed: %d" % [_passed, _failed])
	quit(1 if _failed > 0 else 0)

func _test_scene(entry: Dictionary) -> void:
	var label := str(entry.path)
	var scene: PackedScene = load(label)
	if scene == null:
		_fail(label, "Scene failed to load")
		return
	var node := scene.instantiate()
	if node == null:
		_fail(label, "Scene failed to instantiate")
		return
	get_root().add_child(node)
	await create_timer(0.25).timeout
	if str(node.name) != str(entry.root):
		_fail(label, "Expected root '%s', got '%s'" % [str(entry.root), str(node.name)])
		node.queue_free()
		return
	var screen := node.find_child(str(entry.screen), true, false)
	if screen == null:
		_fail(label, "Expected generated screen node '%s'" % str(entry.screen))
		node.queue_free()
		return
	if node.find_child("TopBar", true, false) == null and str(entry.screen) != "BuildScreen":
		_fail(label, "Expected portrait TopBar")
		node.queue_free()
		return
	node.queue_free()
	_pass(label)

func _pass(label: String) -> void:
	_passed += 1
	print("PASS ", label)

func _fail(label: String, reason: String) -> void:
	_failed += 1
	push_error("%s: %s" % [label, reason])
