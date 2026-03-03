extends "res://Scenes/Earth/earth_scene_base.gd"

const MissionGuidanceOverlayScene = preload("res://Scenes/UI/Templates/LaunchpadMissionGuidanceOverlay.tscn")

var _mission_guidance_id: int = 0
var _mission_guidance_layer: CanvasLayer = null
var _mission_guidance_label: Label = null
var _mission_guidance_pointer: Label = null
var _mission_guidance_active: bool = false

func _ready():
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
	_setup_mission_guidance()

func _process(_delta: float) -> void:
	_update_mission_guidance()

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

func _setup_mission_guidance() -> void:
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if not rm:
		return
	_mission_guidance_id = int(rm.consume_pending_mission_guidance_id())
	if _mission_guidance_id <= 0:
		return
	_mission_guidance_active = true
	set_process(true)
	_mission_guidance_layer = MissionGuidanceOverlayScene.instantiate()
	if _mission_guidance_layer == null:
		return
	add_child(_mission_guidance_layer)
	var mission_panel: PanelContainer = _mission_guidance_layer.get_node_or_null("Panel")
	_mission_guidance_label = _mission_guidance_layer.get_node_or_null("Panel/Margin/MessageLabel")
	_mission_guidance_pointer = _mission_guidance_layer.get_node_or_null("PointerLabel")
	var panel_style = preload("res://Scripts/UI/PanelStyle.gd")
	if mission_panel:
		panel_style.apply_panel(mission_panel)
	if _mission_guidance_label:
		panel_style.apply_body(_mission_guidance_label)

func _update_mission_guidance() -> void:
	if not _mission_guidance_active:
		return
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if not rm:
		return
	if rm.get_launched().size() > 0:
		_clear_mission_guidance()
		return

	var launchpad_root = get_tree().current_scene
	if launchpad_root == null:
		return
	var target_button: Control = null
	var selected_target = str(rm.get_selected_target())
	var rockets = get_tree().get_nodes_in_group("rocket")
	if rockets.is_empty():
		target_button = _find_button_by_text(launchpad_root, "Create")
		_mission_guidance_label.text = "Mission %d: Create a rocket to begin." % _mission_guidance_id
	elif selected_target == "":
		target_button = _find_button_by_text(launchpad_root, "Select")
		_mission_guidance_label.text = "Mission %d: Select a mission target before launch." % _mission_guidance_id
	else:
		target_button = _find_button_by_text(launchpad_root, "Launch")
		_mission_guidance_label.text = "Mission %d: Press Launch to start the mission." % _mission_guidance_id
	_position_mission_pointer(target_button)

func _position_mission_pointer(target_button: Control) -> void:
	if _mission_guidance_pointer == null:
		return
	if target_button == null:
		_mission_guidance_pointer.visible = false
		return
	var rect = target_button.get_global_rect()
	_mission_guidance_pointer.position = Vector2(rect.position.x + rect.size.x * 0.5 - 8.0, rect.position.y - 34.0)
	_mission_guidance_pointer.visible = true

func _find_button_by_text(root: Node, expected_text: String) -> Button:
	if root == null:
		return null
	var expected = expected_text.strip_edges().to_lower()
	var stack := [root]
	while not stack.is_empty():
		var node = stack.pop_back()
		for child in node.get_children():
			if child is Button:
				var txt = str(child.text).strip_edges().to_lower()
				if txt.begins_with(expected):
					return child
			stack.append(child)
	return null

func _clear_mission_guidance() -> void:
	_mission_guidance_active = false
	_mission_guidance_id = 0
	if _mission_guidance_layer and is_instance_valid(_mission_guidance_layer):
		_mission_guidance_layer.queue_free()
	_mission_guidance_layer = null
	_mission_guidance_label = null
	_mission_guidance_pointer = null
