class_name Launchpad extends Structure

func _ready():
	super._ready()
	structure_name = "Launchpad"
	
	print("Launchpad initialized: " + structure_name)

func on_interact():
	super.on_interact()
	print("Launchpad clicked: " + structure_name)
	
	# Get the SceneManager from the scene tree
	var scene_manager = get_tree().get_first_node_in_group("scene_manager")
	print("Found SceneManager in group: ", scene_manager != null)
	
	if not scene_manager:
		# Try to get from main scene
		var main_scene = get_tree().current_scene
		for child in main_scene.get_children():
			if child is SceneManager:
				scene_manager = child
				break
		print("Found SceneManager as child: ", scene_manager != null)
	
	if scene_manager:
		print("Transitioning to earth_launchpad scene...")
		scene_manager.change_to_scene("res://Scenes/Earth/earth_launchpad.tscn")
	else:
		print("ERROR: SceneManager not found for Launchpad")

func spawn_rocket(rocket_id: String) -> void:
	print("Launchpad: spawn_rocket called for", rocket_id)
	var mapping = {
		"starterrocket1": "res://Scenes/Vehicles/StarterRocket1.tscn"
	}
	var path = mapping.get(rocket_id, "")
	if path == "":
		print("Launchpad: unknown rocket id:", rocket_id)
		return
	var packed = load(path)
	if not packed:
		print("Launchpad: failed to load rocket scene:", path)
		return
	var inst = packed.instantiate()
	add_child(inst)
	# place rocket visually above the pad
	inst.position = Vector2(0, -520)
	print("Launchpad: rocket instantiated")
