"""Launchpad scene sprites (v7): the launch complex with the hangar beside it, and the assembly scaffold.

Both sprites share one camera frame so the game stacks them at the same size and position:
complex (pad, gantry, rail, hangar) underneath, rocket revealed bottom-up on the mount, scaffold on top.

    exec(open(".../tools/blender/kit_v7.py").read())
    exec(open(".../tools/blender/models/base_v7.py").read())
    exec(open(".../tools/blender/models/launchpad_scene_v7.py").read())
    build_pad_complex(); render("pad-complex", "launchpad")
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
