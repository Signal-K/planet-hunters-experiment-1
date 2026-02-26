extends RefCounted
class_name LaunchpadRestorer
const STARTERROCKET1_LAUNCHPAD_POS := Vector2(-110.0, -178.0)
const Logger = preload("res://Scripts/Utils/Logger.gd")

func restore_if_needed(launchpad: Node, selector_panel: Object, launch_button: Object) -> void:
	# Clear any existing rockets from the "rocket" group (cleanup baked-in or leftover nodes)
	var existing_rockets = launchpad.get_tree().get_nodes_in_group("rocket")
	if existing_rockets.size() > 0:
		Logger.d("Launchpad: found %d existing rockets at startup, clearing them" % existing_rockets.size())
		for rocket in existing_rockets:
			if is_instance_valid(rocket) and rocket.is_ancestor_of(launchpad) or rocket.get_parent() == launchpad:
				rocket.queue_free()

	# Restore any previously placed rockets from persistent storage
	var current_scene_path = launchpad.get_tree().current_scene.scene_file_path
	var is_launchpad_scene = current_scene_path.ends_with("earth_launchpad.tscn")
	var is_base_scene = current_scene_path.ends_with("earth_base_1.tscn")
	var should_restore_rockets = is_launchpad_scene or is_base_scene
	Logger.d("Launchpad: current scene=%s, should_restore=%s" % [current_scene_path, should_restore_rockets])

	if should_restore_rockets:
		var rm = preload("res://Scripts/Utils/RocketsManager.gd")
		var placed = rm.get_placed()
		Logger.d("Launchpad: get_placed() returned %d items" % placed.size())
		for i in range(placed.size()):
			Logger.d("  [%d] id=%s, x=%s, y=%s, status=%s" % [i, placed[i].get("id"), placed[i].get("x"), placed[i].get("y"), placed[i].get("status", "")])
		# Build list of placed items that should actually be restored (status empty/building/awaitingLaunch)
		# Limit to at most one awaitingLaunch rocket to enforce single awaiting rocket rule
		var restore_items = []
		var awaiting_found := false
		for item in placed:
			var rstatus = item.get("status", "")
			if rstatus == "awaitingLaunch":
				if not awaiting_found:
					restore_items.append(item)
					awaiting_found = true
				else:
					# skip additional awaitingLaunch entries
					continue
			elif rstatus == "" or rstatus == "building":
				restore_items.append(item)
		var restored_count := 0
		if restore_items.size() > 0:
			Logger.d("Launchpad: restoring %d placed rockets" % restore_items.size())
			var mapping = {
				"starterrocket1": "res://Scenes/Vehicles/StarterRocket1.tscn",
				"starterrocket2": "res://Scenes/Vehicles/StarterRocket2.tscn",
				"starterrocket3": "res://Scenes/Vehicles/StarterRocket3.tscn"
			}
			for item in restore_items:
				var rid = item.get("id", "")
				var rtype = item.get("type", "")
				var path = mapping.get(rtype, "")
				if path == "":
					Logger.w("Launchpad: unknown placed rocket type: %s" % rtype)
					continue
				var packed = load(path)
				if not packed:
					Logger.w("Launchpad: failed to load placed rocket scene: %s" % path)
					continue
				var inst = packed.instantiate()
				# Ensure the instance has the canonical rocket id as its name (id is unique)
				var iid = item.get("id", rid)
				inst.name = iid
				launchpad.add_child(inst)
				# Mark instantiated rockets so they can be cleared on reset
				inst.add_to_group("rocket")
				if is_base_scene:
					var pad_sprite: Sprite2D = launchpad.get_node_or_null("Sprite2D")
					inst.scale = Vector2(0.2, 0.2)
					if pad_sprite and pad_sprite.texture:
						var pad_height = pad_sprite.texture.get_size().y * pad_sprite.scale.y
						inst.position = pad_sprite.position + Vector2(0, -pad_height * 0.05)
					else:
						inst.position = Vector2(item.get("x", -110.0), item.get("y", -170.0))
				else:
					inst.scale = Vector2(0.4, 0.4)  # Scale down to fit on launchpad
					if rtype == "starterrocket1" or rtype == "starterrocket2" or rtype == "starterrocket3":
						# Keep launchpad alignment stable even for previously persisted coordinates.
						inst.position = STARTERROCKET1_LAUNCHPAD_POS
					else:
						inst.position = Vector2(item.get("x", -110.0), item.get("y", -170.0))
				Logger.d("Launchpad: restored rocket type=%s id=%s" % [rtype, rid])
				restored_count += 1
		Logger.d("Launchpad: rocket restoration complete")
		# Hide selector panel after restoration if rockets exist (launchpad scene only)
		if restored_count > 0 and is_launchpad_scene:
			# Hide only the rocket-creation area (RocketSelector) so the player cannot create
			# another rocket, but keep the SelectorPanel visible so they can select a target
			# for the restored awaiting rocket.
			var rs = launchpad.get_tree().current_scene.get_node_or_null("UILayer/SelectorPanel/VBox/RocketSelector")
			if rs:
				rs.visible = false
				Logger.d("Launchpad: hid RocketSelector (creation UI) to prevent creating more rockets")
			# Populate targets so the player can choose a detected target for the restored rocket
			if selector_panel:
				selector_panel.populate_targets()
			# show standalone launch button if present so user can launch restored rocket
			if launch_button:
				launch_button.show_standalone_launch_button()
	else:
		Logger.d("Launchpad: skipping rocket restoration (unsupported scene)")
