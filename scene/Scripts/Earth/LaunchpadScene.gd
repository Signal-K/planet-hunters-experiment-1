extends "res://Scenes/Earth/earth_scene_base.gd"

func _ready():
	var back_btn = $UILayer/SelectorPanel/VBox/BackButton
	if back_btn:
		back_btn.pressed.connect(_on_back_button_pressed)
	var selector_panel = $UILayer/SelectorPanel
	if selector_panel:
		selector_panel.offset_left = 24
		selector_panel.offset_top = 24
		selector_panel.offset_right = 24
		selector_panel.offset_bottom = 24
		selector_panel.custom_minimum_size = Vector2(1120, 720)

	# Auto-instance the external Launch HUD so the Launch button is available
	# when this scene is loaded. Avoid creating duplicate instances.
	var root_scene = get_tree().current_scene
	if root_scene:
		if not root_scene.get_node_or_null("LaunchHUD"):
			var hud_packed = load("res://Scenes/UI/launch_hud.tscn")
			if hud_packed:
				var hud_inst = hud_packed.instantiate()
				root_scene.add_child(hud_inst)
				print("LaunchpadScene: instanced LaunchHUD")
				# If a Launchpad node exists in this scene, ask it to connect to the HUD button
				var lp = root_scene.get_node_or_null("StructuresLayer/Launchpad")
				if lp and lp.has_method("connect_launch_button"):
					lp.connect_launch_button()
			else:
				print("LaunchpadScene: failed to load launch_hud.tscn")
		else:
			print("LaunchpadScene: LaunchHUD already present, skipping instancing")

## Earth Launchpad Scene
##
## This scene shows the launchpad area and overrides navigation behavior
## to return to the earth base scene when the back button is pressed.

func _on_back_button_pressed() -> void:
	print("Launchpad back button pressed - returning to earth base")
	# Navigate specifically back to the earth base scene
	var scene_manager = null
	# 1) Group lookup
	scene_manager = get_tree().get_first_node_in_group("scene_manager")
	# 2) Check current_scene children for a SceneManager instance or a node exposing change_to_scene()
	if scene_manager == null:
		var main = get_tree().current_scene
		if main:
			for c in main.get_children():
				if c is SceneManager:
					scene_manager = c
					break
				if c.has_method("change_to_scene"):
					scene_manager = c
					break
	# 3) Fallback: search the current scene by node name using a safe recursive finder
	if scene_manager == null:
		var root_scene = get_tree().current_scene
		if root_scene:
			scene_manager = _recursive_find_by_name(root_scene, "SceneManager")
	# 4) Last resort: try a global singleton or root child named "SceneManager"
	if scene_manager == null:
		# Check current_scene exists and look for a SceneManager child named 'SceneManager'
		if get_tree().current_scene != null:
			var root_child = get_tree().current_scene.get_node_or_null("SceneManager")
			if root_child:
				scene_manager = root_child
	# Execute navigation if found
	if scene_manager and scene_manager.has_method("change_to_scene"):
		print("LaunchpadScene: navigating back via SceneManager (node=", scene_manager.get_path(), ")")
		scene_manager.change_to_scene("res://Scenes/Earth/earth_base_1.tscn")
	else:
		print("LaunchpadScene: SceneManager not found; falling back to direct scene change")
		# Fallback: directly change the scene file
		if get_tree().has_method("change_scene_to_file"):
			get_tree().change_scene_to_file("res://Scenes/Earth/earth_base_1.tscn")
		else:
			# Older API fallback
			get_tree().change_scene("res://Scenes/Earth/earth_base_1.tscn")

func _recursive_find_by_name(node: Node, target_name: String) -> Node:
	if node.name == target_name:
		return node
	for child in node.get_children():
		var found = _recursive_find_by_name(child, target_name)
		if found:
			return found
	return null
