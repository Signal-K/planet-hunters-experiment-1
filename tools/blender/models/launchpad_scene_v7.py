"""Launchpad scene sprites (v7): the launch complex with the hangar beside it, and the assembly scaffold.

Both sprites share one camera frame so the game stacks them at the same size and position:
complex (pad, gantry, rail, hangar) underneath, rocket revealed bottom-up on the mount, scaffold on top.

    exec(open(".../tools/blender/kit_v7.py").read())
    exec(open(".../tools/blender/models/base_v7.py").read())
    exec(open(".../tools/blender/models/launchpad_scene_v7.py").read())
    build_pad_complex(); render("pad-complex", "launchpad")
    build_pad_activity(); render("pad-activity", "launchpad")
    build_pad_scaffold(); render("pad-scaffold", "launchpad")
"""

HANGAR_X = PAD_W + 26.0
SCENE_X0 = -6.0
SCENE_X1 = HANGAR_X + HANGAR_W + 8.0
# Mount centre on the pad (kit x) and the deck height the rocket stands on.
MOUNT_X = 54.0
DECK_Z = 11.0


def _frame():
    camera_for(SCENE_X0, SCENE_X1, SHADOW_V0, screen_v(0, 148))


def build_pad_complex():
    """Pad and gantry on the left, the hangar on the right, a crawler rail between them."""
    reset_scene()
    build_launchpad(fresh=False, frame=False)
    # Rail from the hangar door to the pad slab: the rocket crawls out along it.
    box("rail_bed", PAD_W - 2, 0, HANGAR_X - PAD_W + 8, 2.2, d=14, y=STRUCT_Y + 2, colours=("concrete_lit", "concrete", "concrete_dark"), outline=0.7)
    for i in range(10):
        box(f"sleeper{i}", PAD_W + 2 + i * 2.6, 2.2, 1.2, 0.5, d=12, y=STRUCT_Y + 3, colours=("steel", "steel_dark", "steel_dark"), outline=0)
    box("rail_a", PAD_W - 2, 2.6, HANGAR_X - PAD_W + 8, 0.7, d=0.7, y=STRUCT_Y + 4, colours=("steel_lit", "steel_lit", "steel"), outline=0)
    box("rail_b", PAD_W - 2, 2.6, HANGAR_X - PAD_W + 8, 0.7, d=0.7, y=STRUCT_Y + 11, colours=("steel_lit", "steel_lit", "steel"), outline=0)
    before = {o.name for o in bpy.context.scene.objects}
    build_hangar(fresh=False, frame=False)
    _shift_new(before, HANGAR_X)
    _frame()
    return "pad-complex"


def build_pad_scaffold():
    """Assembly scaffold around the mount: two lattice columns, work decks, a crane jib. Drawn in front of the rocket."""
    reset_scene()
    y = 10.0
    left, right = MOUNT_X - 17.0, MOUNT_X + 13.0
    height = 100.0
    for name, x in (("col_l", left), ("col_r", right)):
        box(name, x, DECK_Z, 4.0, height, d=4.0, y=y, colours=("steel_lit", "steel", "steel_dark"), outline=0.8)
    bay = 20.0
    for i in range(int(height // bay)):
        z = DECK_Z + i * bay
        # Work deck spanning the columns, with a blue toe board.
        box(f"deck{i}", left, z + bay - 2.0, right - left + 4.0, 2.0, d=9.0, y=y - 2.0, colours=("steel_lit", "steel", "steel_dark"), outline=0.7)
        box(f"toe{i}", left, z + bay, right - left + 4.0, 1.0, d=0.6, y=y - 2.4, colours=("trim_blue", "trim_blue", "trim_blue_dark"), outline=0)
        for sgn in (1, -1):
            bpy.ops.mesh.primitive_cube_add(size=1)
            o = bpy.context.active_object
            o.name = f"cross{i}{sgn}"
            length = math.hypot(right - left, bay - 2.0)
            o.scale = (length, 0.7, 1.0)
            o.location = ((left + right + 4.0) / 2, y - 0.4, z + bay / 2 - 1.0)
            o.rotation_euler = (0, sgn * math.atan2(bay - 2.0, right - left), 0)
            bpy.ops.object.transform_apply(scale=True, rotation=True)
            faceted(o, "steel_lit", "steel_lit", "steel")
            ink(o, 0.4)
    top = DECK_Z + height
    # Crane jib out over the stack, with a hook line and a teal beacon.
    box("jib", left - 8.0, top, right - left + 34.0, 3.0, d=4.0, y=y, colours=("hull_lit", "hull", "hull_shade"), outline=0.8)
    box("jib_cab", right - 2.0, top + 3.0, 8.0, 6.0, d=6.0, y=y - 1.0, colours=("hull_lit", "hull", "hull_shade"), outline=0.8)
    box("jib_band", right - 2.0, top + 4.5, 8.0, 1.4, d=0.6, y=y - 1.4, colours=("trim_blue", "trim_blue", "trim_blue_dark"), outline=0)
    box("hook_line", MOUNT_X - 2.0, top - 24.0, 0.8, 24.0, d=0.8, y=y + 1.0, colours=("steel_lit", "steel", "steel_dark"), outline=0.3)
    box("hook", MOUNT_X - 3.2, top - 27.0, 3.2, 3.0, d=3.0, y=y + 0.6, colours=("trim_blue", "trim_blue", "trim_blue_dark"), outline=0.5)
    box("beacon", left - 8.0, top + 3.0, 2.6, 2.2, d=2.6, y=y + 0.6, colours=("trim_teal", "trim_teal", "trim_blue_dark"), outline=0.4)
    _frame()
    return "pad-scaffold"


def build_pad_activity():
    """A transparent, animated service pass for the launch complex.

    The base sprite carries the permanent architecture. This pass carries the
    things that make the site feel staffed: a trolley travelling on the tower
    rail, its cable and hook, a service arm, and a live beacon. Keeping it
    separate means the game can give it a small, readable motion loop without
    wobbling the pad or hangar underneath.
    """
    reset_scene()
    tower_x = 31.0
    rail_z = 74.0
    # Horizontal rail and travelling hoist on the tower face.
    box("service_rail", tower_x, rail_z, 29.0, 1.4, d=2.4, y=7.0,
        colours=("steel_lit", "steel", "steel_dark"), outline=0.45)
    box("service_trolley", tower_x + 10.0, rail_z - 3.0, 7.0, 5.2, d=5.0, y=5.7,
        colours=("hull_lit", "hull", "hull_shade"), outline=0.65)
    box("service_trolley_band", tower_x + 10.0, rail_z - 1.4, 7.0, 1.25, d=0.7, y=5.15,
        colours=("trim_blue", "trim_blue", "trim_blue_dark"), outline=0)
    box("service_cable", tower_x + 13.1, rail_z - 22.0, 0.8, 19.5, d=0.8, y=5.0,
        colours=("steel_lit", "steel", "steel_dark"), outline=0.25)
    box("service_hook", tower_x + 11.6, rail_z - 24.6, 3.6, 3.2, d=2.8, y=4.8,
        colours=("trim_teal", "trim_teal", "trim_blue_dark"), outline=0.45)
    # A telescoping arm reaches toward the rocket position, suggesting active checks.
    box("service_arm", tower_x + 16.0, 50.0, 17.0, 2.4, d=3.4, y=6.0,
        colours=("steel_lit", "steel", "steel_dark"), outline=0.55)
    box("service_arm_cap", tower_x + 31.2, 48.0, 3.0, 6.4, d=5.0, y=5.3,
        colours=("hull_lit", "hull", "hull_shade"), outline=0.65)
    # The beacon is deliberately isolated in this pass so its pulse is legible at game scale.
    box("service_beacon", tower_x + 1.5, 103.0, 3.0, 3.0, d=3.0, y=6.2,
        colours=("trim_teal", "trim_teal", "trim_blue_dark"), outline=0.4)
    _frame()
    return "pad-activity"
