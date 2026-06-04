extends SceneTree
## Capture screenshots of the three redesigned scenes for review.
## Run: DISPLAY=:99 godot --path scene --script tests/run_scene_screenshots.gd

const OUT_DIR := "/tmp/scene-screenshots"
const GODOT_USER_DIR := "user://scene_screenshots"

const SCENES := [
	{"name": "FreeOpsUnlockOverlay", "path": "res://Scenes/UI/FreeOpsUnlockOverlay.tscn"},
	{"name": "TutorialCoachOverlay_PointBar", "path": "res://Scenes/UI/TutorialCoachOverlay.tscn"},
	{"name": "MissionDebriefV2", "path": "res://Scenes/Earth/mission_debrief_v2.tscn"},
]

func _initialize() -> void:
	DirAccess.make_dir_recursive_absolute(GODOT_USER_DIR)
	_run()

func _run() -> void:
	for scene_info in SCENES:
		print("Loading: ", scene_info["name"])
		var packed := load(scene_info["path"]) as PackedScene
		if packed == null:
			print("  FAILED to load: ", scene_info["path"])
			continue
		var node := packed.instantiate()
		root.add_child(node)
		# Wait two frames for layout to settle
		await process_frame
		await process_frame
		# Capture
		var img := root.get_viewport().get_texture().get_image()
		if img:
			var out_path := "%s/%s.png" % [GODOT_USER_DIR, scene_info["name"]]
			var result := img.save_png(out_path)
			if result == OK:
				print("  Saved: ", out_path)
			else:
				print("  SAVE FAILED: ", out_path)
		else:
			print("  No image captured for: ", scene_info["name"])
		node.queue_free()
		await process_frame
	print("Done.")
	quit()
