extends RefCounted
class_name RocketSpawner
const STARTERROCKET1_LAUNCHPAD_POS := Vector2(-110.0, -178.0)

static func spawn(launchpad_node: Node, rocket_id: String) -> bool:
    if not launchpad_node:
        print("RocketSpawner: launchpad_node is null")
        return false
    print("Launchpad: spawn_rocket called for", rocket_id)
    # Enforce only one awaitingLaunch rocket at a time
    var existing_nodes = launchpad_node.get_tree().get_nodes_in_group("rocket")
    if existing_nodes.size() > 0:
        print("Launchpad: a rocket node already exists in scene; cannot create another")
        return false
    var rm_check = preload("res://Scripts/Utils/RocketsManager.gd")
    if rm_check:
        var placed_check = rm_check.get_placed()
        for it in placed_check:
            if it.get("status", "") == "awaitingLaunch":
                print("Launchpad: an awaitingLaunch rocket already exists in saved state; cannot create another")
                return false

    var mapping = {
        "starterrocket1": "res://Scenes/Vehicles/StarterRocket1.tscn",
        "starterrocket2": "res://Scenes/Vehicles/StarterRocket2.tscn"
    }
    var path = mapping.get(rocket_id, "")
    if path == "":
        print("Launchpad: unknown rocket id:", rocket_id)
        return false
    var packed = load(path)
    if not packed:
        print("Launchpad: failed to load rocket scene:", path)
        return false
    var inst = packed.instantiate()
    inst.add_to_group("rocket")
    inst.scale = Vector2(0.4, 0.4)
    inst.position = STARTERROCKET1_LAUNCHPAD_POS
    launchpad_node.add_child(inst)
    var rm = preload("res://Scripts/Utils/RocketsManager.gd")
    if rm:
        var new_id = rm.add_placed(rocket_id, inst.position)
        if typeof(new_id) == TYPE_STRING and new_id != "":
            inst.name = new_id
        print("Launchpad: rocket persisted to state")

    # Hide creation UI (RocketSelector) but keep selector panel visible
    var root_scene = launchpad_node.get_tree().current_scene
    if root_scene:
        var rocket_selector = root_scene.get_node_or_null("UILayer/SelectorPanel/VBox/RocketSelector")
        if rocket_selector:
            rocket_selector.visible = false
            print("Launchpad: hid RocketSelector (creation UI) after spawn")
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
            print("Launchpad: showing standalone LaunchButton at", lb.position)
            shown = true
        else:
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
    if not shown:
        print("Launchpad: could not find a LaunchButton to show after spawn")
    return true
