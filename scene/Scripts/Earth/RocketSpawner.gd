extends RefCounted
class_name RocketSpawner
const STARTERROCKET1_LAUNCHPAD_POS := Vector2(-110.0, -178.0)
const Logger = preload("res://Scripts/Utils/Logger.gd")

static func spawn(launchpad_node: Node, rocket_id: String) -> bool:
    if not launchpad_node:
        Logger.w("RocketSpawner: launchpad_node is null")
        return false
    Logger.d("Launchpad: spawn_rocket called for %s" % rocket_id)
    # Enforce only one awaitingLaunch rocket at a time
    var existing_nodes = launchpad_node.get_tree().get_nodes_in_group("rocket")
    if existing_nodes.size() > 0:
        Logger.w("Launchpad: a rocket node already exists in scene; cannot create another")
        return false
    var rm_check = preload("res://Scripts/Utils/RocketsManager.gd")
    if rm_check:
        var placed_check = rm_check.get_placed()
        for it in placed_check:
            if it.get("status", "") == "awaitingLaunch":
                Logger.w("Launchpad: an awaitingLaunch rocket already exists in saved state; cannot create another")
                return false

    var mapping = {
        "starterrocket1": "res://Scenes/Vehicles/StarterRocket1.tscn",
        "starterrocket2": "res://Scenes/Vehicles/StarterRocket2.tscn",
        "starterrocket3": "res://Scenes/Vehicles/StarterRocket3.tscn"
    }
    var path = mapping.get(rocket_id, "")
    if path == "":
        Logger.w("Launchpad: unknown rocket id: %s" % rocket_id)
        return false
    var packed = load(path)
    if not packed:
        Logger.w("Launchpad: failed to load rocket scene: %s" % path)
        return false
    var inst = packed.instantiate()
    inst.add_to_group("rocket")
    inst.scale = Vector2(0.4, 0.4)
    inst.position = STARTERROCKET1_LAUNCHPAD_POS
    
    # Rockets are Node2D, they don't block input by default
    # The InteractionArea should be on a higher z-index
    inst.z_index = -1  # Put rocket behind interaction area
    
    launchpad_node.add_child(inst)
    var rm = preload("res://Scripts/Utils/RocketsManager.gd")
    if rm:
        var new_id = rm.add_placed(rocket_id, inst.position)
        if typeof(new_id) == TYPE_STRING and new_id != "":
            inst.name = new_id
        Logger.d("Launchpad: rocket persisted to state")

    # Hide creation UI (RocketSelector) but keep selector panel visible
    var root_scene = launchpad_node.get_tree().current_scene
    if root_scene:
        var stack = [root_scene]
        while stack.size() > 0:
            var node = stack.pop_back()
            if node.name == "RocketSelector" and node is Control:
                node.visible = false
            for child in node.get_children():
                stack.append(child)
        Logger.d("Launchpad: hid RocketSelector (creation UI) after spawn")
        # Ensure targets are populated
        if launchpad_node.has_method("_populate_targets"):
            launchpad_node._populate_targets()

    # Show the launch button
    var root = launchpad_node.get_tree().current_scene
    var vs = launchpad_node.get_viewport().get_visible_rect().size
    var shown = false
    if root:
        var lb = root.get_node_or_null("UILayer/LaunchButton")
        if lb:
            lb.position = vs - Vector2(180, 100)
            lb.visible = true
            lb.z_index = 1000
            Logger.d("Launchpad: showing standalone LaunchButton at %s" % [lb.position])
            shown = true
        else:
            var hud = root.get_node_or_null("LaunchHUD")
            if hud:
                for c in hud.get_children():
                    if c is Button or c.name.ends_with("LaunchButton"):
                        c.position = vs - Vector2(180, 100)
                        c.visible = true
                        c.z_index = 1000
                        Logger.d("Launchpad: showing LaunchHUD's LaunchButton (node=%s) at %s" % [c.get_path(), c.position])
                        shown = true
                        break
    if not shown:
        Logger.w("Launchpad: could not find a LaunchButton to show after spawn")
    return true
