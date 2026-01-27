
class_name Launchpad extends Structure

func _ready():
	super._ready()
	structure_name = "Launchpad"
	print("Launchpad initialized: " + structure_name)
	set_process_unhandled_input(true)
	
	# Debug: List all children at startup
	print("Launchpad children at startup:")
	for child in get_children():
		print("  - " + child.name + " (" + child.get_class() + ")")
	
	# Clear any existing rockets from the "rocket" group (cleanup baked-in or leftover nodes)
	var existing_rockets = get_tree().get_nodes_in_group("rocket")
	if existing_rockets.size() > 0:
		print("Launchpad: found %d existing rockets at startup, clearing them" % existing_rockets.size())
		for rocket in existing_rockets:
			if is_instance_valid(rocket) and rocket.is_ancestor_of(self) or rocket.get_parent() == self:
				rocket.queue_free()

	# Restore any previously placed rockets from persistent storage
	# Only restore in the earth_launchpad scene, not in earth_base_1
	var current_scene_path = get_tree().current_scene.scene_file_path
	var should_restore_rockets = current_scene_path.ends_with("earth_launchpad.tscn")
	print("Launchpad: current scene=", current_scene_path, ", should_restore=", should_restore_rockets)
	
	if should_restore_rockets:
		var rm = preload("res://Scripts/Utils/RocketsManager.gd")
		var placed = rm.get_placed()
		print("Launchpad: get_placed() returned %d items" % placed.size())
		for i in range(placed.size()):
			print("  [%d] id=%s, x=%s, y=%s, status=%s" % [i, placed[i].get("id"), placed[i].get("x"), placed[i].get("y"), placed[i].get("status", "")])
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
		if restore_items.size() > 0:
			print("Launchpad: restoring %d placed rockets" % restore_items.size())
			var mapping = {
				"starterrocket1": "res://Scenes/Vehicles/StarterRocket1.tscn"
			}
			for item in restore_items:
				var rid = item.get("id", "")
				var rtype = item.get("type", "")
				var path = mapping.get(rtype, "")
				if path == "":
					print("Launchpad: unknown placed rocket type:", rtype)
					continue
				var packed = load(path)
				if not packed:
					print("Launchpad: failed to load placed rocket scene:", path)
					continue
				var inst = packed.instantiate()
				# Ensure the instance has the canonical rocket id as its name (id is unique)
				var iid = item.get("id", rid)
				inst.name = iid
				add_child(inst)
				# Mark instantiated rockets so they can be cleared on reset
				inst.add_to_group("rocket")
				inst.scale = Vector2(0.4, 0.4)  # Scale down to fit on launchpad
				inst.position = Vector2(item.get("x", -110.0), item.get("y", -170.0))
				print("Launchpad: restored rocket type=%s id=%s" % [rtype, rid])
		print("Launchpad: rocket restoration complete")
		# Hide selector panel after restoration if rockets exist
		if restore_items.size() > 0:
			_hide_selector_panel()
			# show standalone launch button if present so user can launch restored rocket
			var lb = get_tree().current_scene.get_node_or_null("UILayer/LaunchButton")
			if lb:
				var vs = get_viewport().get_visible_rect().size
				lb.position = vs - Vector2(180, 100)
				lb.visible = true
				lb.z_index = 1000
				print("Launchpad: showing standalone LaunchButton at", lb.position)
	else:
		print("Launchpad: skipping rocket restoration (not in earth_launchpad scene)")

	# Connect to AppController to respond to rockets reset events
	var root = get_tree().root
	var app_controller = root.find_child("AppController", true, false)
	if app_controller and app_controller.has_signal("rockets_reset"):
		app_controller.rockets_reset.connect(Callable(self, "_on_rockets_reset"))
		print("Launchpad: connected to AppController rockets_reset signal")
	else:
		print("Launchpad: AppController not found or missing rockets_reset signal")

	# Try to connect the Launch button; primary location: separate LaunchHUD scene.
	# If the HUD hasn't been instanced yet (by LaunchpadScene), this can be called
	# again later via `connect_launch_button()` which is public.
	connect_launch_button()

var _launch_btn_connected: bool = false

func connect_launch_button() -> void:
	if _launch_btn_connected:
		return
	var root = get_tree().current_scene
	print("Launchpad: connect_launch_button called, root scene=" + root.name)
	var children_names = []
	for c in root.get_children():
		children_names.append(c.name)
	print("Launchpad: root scene children: ", children_names)
	
	# Check if LaunchHUD exists and what's inside it
	var launch_hud = root.get_node_or_null("LaunchHUD")
	if launch_hud:
		var hud_child_names = []
		for _c in launch_hud.get_children():
			hud_child_names.append(_c.name)
		print("Launchpad: LaunchHUD found, children: ", hud_child_names)
	else:
		print("Launchpad: LaunchHUD not found in root")
	
	# Try to find LaunchButton under LaunchHUD first (be tolerant of instance renaming)
	var btn = null
	var launch_hud_node = root.get_node_or_null("LaunchHUD")
	if launch_hud_node:
		for child_node in launch_hud_node.get_children():
			if child_node is Button or child_node.name.ends_with("LaunchButton"):
				btn = child_node
				break
		if btn:
			print("Launchpad: found LaunchButton under LaunchHUD (child name=", btn.name, ")")
		else:
			print("Launchpad: LaunchButton NOT found under LaunchHUD")
	# fallback locations
	if not btn:
		btn = root.get_node_or_null("UILayer/LaunchButton")
		if btn:
			print("Launchpad: found LaunchButton at UILayer/LaunchButton")
		else:
			btn = root.get_node_or_null("UILayer/SelectorPanel/VBox/LaunchButton")
			if btn:
				print("Launchpad: found LaunchButton at UILayer/SelectorPanel/VBox/LaunchButton")
	if not btn:
		print("Launchpad: LaunchButton not found when attempting to connect")
		return
	# Always connect the pressed signal to ensure handler is wired (avoid fragile is_connected checks)
	btn.pressed.connect(Callable(self, "_on_launch_button_pressed"))
	_launch_btn_connected = true
	# set visibility based on rocket presence
	var nodes = get_tree().get_nodes_in_group("rocket")
	if nodes.size() > 0:
		var vs = get_viewport().get_visible_rect().size
		btn.position = vs - Vector2(180, 100)
		btn.visible = true
		btn.z_index = 1000
	else:
		btn.visible = false
	print("Launchpad: connected LaunchButton pressed signal (node=", btn.get_path(), ")")
	
	# Debug: Final count of what's actually in scene
	var all_rockets = get_tree().get_nodes_in_group("rocket")
	print("Launchpad: FINAL rocket count in scene: %d total rockets in 'rocket' group" % all_rockets.size())
	for r in all_rockets:
		print("  - Rocket node: %s at position %s" % [r.name, r.global_position])

func _can_drop_data(_pos, data):
	return data.has("rocket_id")

func _drop_data(pos, data):
	if data.has("rocket_id"):
		var rocket = Node2D.new()
		rocket.position = to_local(pos)
		rocket.name = data["rocket_id"]
		add_child(rocket)
		rocket.add_to_group("rocket")
		print("Rocket dropped and instantiated at ", rocket.position)

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
	# Enforce only one awaitingLaunch rocket at a time
	# 1) If there is already a rocket node in the scene, prevent creating another.
	var existing_nodes = get_tree().get_nodes_in_group("rocket")
	if existing_nodes.size() > 0:
		print("Launchpad: a rocket node already exists in scene; cannot create another")
		return
	# 2) Also check persisted state for any awaitingLaunch entries (in case a node isn't present yet)
	var rm_check = preload("res://Scripts/Utils/RocketsManager.gd")
	if rm_check:
		var placed_check = rm_check.get_placed()
		for it in placed_check:
			if it.get("status", "") == "awaitingLaunch":
				print("Launchpad: an awaitingLaunch rocket already exists in saved state; cannot create another")
				return
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
	inst.add_to_group("rocket")
	# Scale down to fit on launchpad
	inst.scale = Vector2(0.4, 0.4)
	# place rocket visually ON the launchpad (default placement)
	inst.position = Vector2(-110.0, -170.0)
	add_child(inst)
	# Persist placed rocket via RocketsManager if available and name instance with returned unique id
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if rm:
		var new_id = rm.add_placed(rocket_id, inst.position)
		if typeof(new_id) == TYPE_STRING and new_id != "":
			inst.name = new_id
		print("Launchpad: rocket persisted to state")
	# Hide selector panel after rocket is created (hide primary too)
	_hide_selector_panel(true)
	# Show the launch button so user can launch the placed rocket.
	# Prefer a standalone `UILayer/LaunchButton` if present, otherwise show the HUD button under `LaunchHUD`.
	var root = get_tree().current_scene
	var vs = get_viewport().get_visible_rect().size
	var shown = false
	var lb = null
	if root:
		lb = root.get_node_or_null("UILayer/LaunchButton")
		if lb:
			lb.position = vs - Vector2(180, 100)
			lb.visible = true
			lb.z_index = 1000
			print("Launchpad: showing standalone LaunchButton at", lb.position)
			shown = true
		else:
			# Try LaunchHUD -> LaunchButton (tolerant of instance renaming)
			var hud = root.get_node_or_null("LaunchHUD")
			if hud:
				for c in hud.get_children():
					if c is Button or c.name.ends_with("LaunchButton"):
						c.position = vs - Vector2(180, 100)
						c.visible = true
						c.z_index = 1000
						print("Launchpad: showing LaunchHUD's LaunchButton (node=", c.get_path(), ") at", c.position)
						shown = true
						break
					# end for
			# end if hud
	# end if root
	if not shown:
		print("Launchpad: could not find a LaunchButton to show after spawn")


func _hide_selector_panel(hide_primary: bool = false) -> void:
	# Hide SelectorPanel nodes. By default hide duplicates only; if hide_primary is true hide the primary too.
	var root_scene = get_tree().current_scene
	if not root_scene:
		return
	var primary = root_scene.get_node_or_null("UILayer/SelectorPanel")
	var hidden_count = 0
	# Traverse and hide any SelectorPanel nodes according to hide_primary
	var stack = [root_scene]
	while stack.size() > 0:
		var node = stack.pop_back()
		for child in node.get_children():
			if child.name == "SelectorPanel":
				if hide_primary:
					child.visible = false
					hidden_count += 1
				else:
					if primary == null or child.get_path() != primary.get_path():
						child.visible = false
						hidden_count += 1
			stack.append(child)
	if hidden_count > 0:
		if hide_primary:
			print("Launchpad: selector panel hidden (all instances), count=", hidden_count)
		else:
			print("Launchpad: selector panel hidden (duplicates only), count=", hidden_count)

func _show_selector_panel() -> void:
	# Show the first SelectorPanel found and hide any duplicates to prevent overlap
	var root_scene = get_tree().current_scene
	if not root_scene:
		return
	var first_shown = false
	var stack = [root_scene]
	while stack.size() > 0:
		var node = stack.pop_back()
		for child in node.get_children():
			if child.name == "SelectorPanel":
				if not first_shown:
					child.visible = true
					first_shown = true
				else:
					child.visible = false
			stack.append(child)
	if first_shown:
		print("Launchpad: selector panel shown (primary instance)")
	else:
		print("Launchpad: no SelectorPanel found to show")

	# Debug: print UI visibility summary
	var root = get_tree().current_scene
	if root:
		var s = root.get_node_or_null("UILayer/SelectorPanel")
		var hud = root.get_node_or_null("LaunchHUD")
		var lb = null
		if hud:
			for c in hud.get_children():
				if c.name.ends_with("LaunchButton"):
					lb = c
		print("Launchpad: UI visibility summary -> UILayer/SelectorPanel=", s != null and s.visible or false, ", LaunchHUD=", hud != null and hud.visible or false, ", LaunchButton=", lb != null and lb.visible or false)

func _on_rockets_reset() -> void:
	print("Launchpad: rockets reset event received, clearing rockets")
	clear_rockets()
	# Show selector panel again after reset so user can create new rockets
	_show_selector_panel()

func clear_rockets() -> void:
	var nodes = get_tree().get_nodes_in_group("rocket")
	for n in nodes:
		if is_instance_valid(n):
			n.queue_free()
	print("Launchpad: cleared rockets from scene")
	# hide standalone launch button when rockets are cleared
	var lb = get_tree().current_scene.get_node_or_null("UILayer/LaunchButton")
	if lb:
		lb.visible = false

func _on_launch_button_pressed() -> void:
	print("Launchpad: Launch button pressed")
	var nodes = get_tree().get_nodes_in_group("rocket")
	if nodes.size() == 0:
		print("Launchpad: no rockets to launch")
		return
	var rocket = nodes[0]
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if rm:
		rm.set_launched(rocket.name)
		print("Launchpad: marked rocket %s as launched" % rocket.name)
	else:
		print("Launchpad: RocketsManager not available")
	# Remove the rocket from the scene after launching
	if is_instance_valid(rocket):
		rocket.queue_free()
	# hide launch button and show selector so player can choose a new rocket
	var lb = get_tree().current_scene.get_node_or_null("UILayer/LaunchButton")
	if lb:
		lb.visible = false
	_show_selector_panel()
