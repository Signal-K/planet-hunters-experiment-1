extends Node

const SCREENSHOT_DIR := "user://wizard_screenshots"

func _ready() -> void:
	DirAccess.make_dir_absolute(SCREENSHOT_DIR)
	call_deferred("_run")

func _run() -> void:
	await _load_and_snap("res://Scenes/Earth/earth_launchpad.tscn", "01_launchpad_contractor")
	print("Wizard tour complete.")
	get_tree().quit()

func _load_and_snap(scene_path: String, name: String) -> void:
	var packed = load(scene_path)
	if not packed:
		printerr("Failed to load: ", scene_path)
		return
	var inst = packed.instantiate()
	get_tree().root.add_child(inst)
	await get_tree().create_timer(2.0).timeout
	_snap(name)
	inst.queue_free()
	await get_tree().create_timer(0.3).timeout

func _snap(name: String) -> void:
	var img := get_viewport().get_texture().get_image()
	var path := SCREENSHOT_DIR + "/" + name + ".png"
	img.save_png(path)
	print("Saved: ", path)
