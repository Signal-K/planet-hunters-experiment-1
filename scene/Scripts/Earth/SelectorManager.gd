extends RefCounted
class_name SelectorManager

static func hide_selector_panel(root_scene: Node, hide_primary: bool = false) -> void:
    if not root_scene:
        return
    var primary = root_scene.get_node_or_null("UILayer/SelectorPanel")
    var hidden_count = 0
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

static func populate_targets(root_scene: Node) -> void:
    if not root_scene:
        return
    var panel = root_scene.get_node_or_null("UILayer/SelectorPanel")
    if not panel:
        return
    var vbox = panel.get_node_or_null("VBox")
    if not vbox:
        return
    for child in vbox.get_children():
        if child.name in ["Title", "BackButton", "RocketSelector", "LaunchedList"]:
            continue
        child.queue_free()

    var rm = preload("res://Scripts/Utils/RocketsManager.gd")
    if not rm:
        return
    var targets = rm.get_detected_targets()
    if targets.size() == 0:
        var lbl = Label.new()
        lbl.text = "No detected targets available."
        lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
        vbox.add_child(lbl)
        return

    for t in targets:
        var entry = HBoxContainer.new()
        entry.custom_minimum_size = Vector2(0, 40)
        var name_lbl = Label.new()
        name_lbl.text = str(t.get("label", t.get("id")))
        name_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
        entry.add_child(name_lbl)
        var btn = Button.new()
        btn.text = "Select"
        btn.focus_mode = Control.FOCUS_NONE
        # Connection to selection handler is done by the UI owner (Launchpad) so
        # we don't bind callbacks here to avoid cross-script coupling.
        entry.add_child(btn)
        vbox.add_child(entry)

static func show_selector_panel(root_scene: Node) -> void:
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
        populate_targets(root_scene)
        # Restore RocketSelector if no awaiting rockets
        var rm = preload("res://Scripts/Utils/RocketsManager.gd")
        var has_awaiting := false
        if rm:
            var placed = rm.get_placed()
            for p in placed:
                if p.get("status", "") == "awaitingLaunch":
                    has_awaiting = true
                    break
        if not has_awaiting:
            var rocket_selector = root_scene.get_node_or_null("UILayer/SelectorPanel/VBox/RocketSelector")
            if rocket_selector:
                rocket_selector.visible = true
                var node_stack = [rocket_selector]
                while node_stack.size() > 0:
                    var node = node_stack.pop_back()
                    for c in node.get_children():
                        if c is Button:
                            c.disabled = false
                        node_stack.append(c)
                print("Launchpad: RocketSelector restored and Create buttons enabled (no awaiting rockets)")
    else:
        print("Launchpad: no SelectorPanel found to show")
