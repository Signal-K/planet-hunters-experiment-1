"""Base kit v7 builders: ground strips, launch complex, hangar, props and backdrop ridges.

Each builder clears the scene, builds one asset, frames the camera and returns the
names it rendered under. Run inside Blender after `kit_v7.py` is loaded, e.g.

    exec(open(".../tools/blender/kit_v7.py").read())
    exec(open(".../tools/blender/models/base_v7.py").read())
    build_ground("mountains"); render("ground-mountains", "ground")
"""

import random

TILE_W = 160.0
# Ground plane depth the tilted camera shows as the top surface, and the soil face below it.
TOP_DEPTH = 44.0
SOIL_H = 40.0

GROUND_STYLES = {
    # top, top lip, soil front, strata, scatter (colour, count)
    "mountains": {"top": ("gravel_lit", "gravel", "rock_dark"), "soil": ("soil", "soil", "soil_dark"), "strata": "soil_dark", "pebble": ("rock_lit", "rock", "rock_dark"), "tuft": ("frost", "snow_shade", "rock")},
    "tundra": {"top": ("snow", "snow_shade", "ice"), "soil": ("rock", "rock", "rock_dark"), "strata": "rock_dark", "pebble": ("rock_lit", "rock", "rock_dark"), "tuft": ("snow", "snow_shade", "ice")},
    "desert": {"top": ("sand_lit", "sand", "sand_dark"), "soil": ("mesa", "mesa", "mesa_dark"), "strata": "mesa_dark", "pebble": ("mesa_lit", "mesa", "mesa_dark"), "tuft": ("sand_lit", "sand_dark", "mesa_dark")},
    "coast": {"top": ("sand_lit", "sand", "sand_dark"), "soil": ("rock", "rock", "rock_dark"), "strata": "rock_dark", "pebble": ("rock_lit", "rock", "rock_dark"), "tuft": ("sand_lit", "sand_dark", "rock")},
    "apron": {"top": ("concrete_lit", "concrete", "concrete_dark"), "soil": ("soil", "soil", "soil_dark"), "strata": "soil_dark", "pebble": None, "tuft": None},
}


def _wrap_positions(rng, count, margin=6.0):
    return [rng.uniform(margin, TILE_W - margin) for _ in range(count)]


def build_ground(style="mountains", seed=7, fresh=True, frame=True):
    """One seamless 160-unit ground tile: lit top surface (seen through the tilt) over a soil face."""
    if fresh:
        reset_scene()
    s = GROUND_STYLES[style]
    rng = random.Random(seed)
    # Wider than the tile so no outline stroke lands on the tile's left or right edge.
    box("ground", -40, -SOIL_H, TILE_W + 80, SOIL_H, d=TOP_DEPTH, colours=(s["top"][0], s["soil"][1], s["soil"][2]))
    # Front lip: a wavy overhang along the front edge, the chunky tile-top read of Starbound and Crashlands.
    lip = []
    steps = 32
    for i in range(steps + 1):
        x = -40 + (TILE_W + 80) * i / steps
        lip.append((x, 0.6))
    for i in range(steps, -1, -1):
        x = -40 + (TILE_W + 80) * i / steps
        # Period divides the tile width so the lip wraps seamlessly.
        lip.append((x, -3.2 - 1.6 * math_sin(x * 2 * 3.14159 / 40) - 0.8 * math_sin(x * 2 * 3.14159 / 16)))
    prism("lip", lip, 3.0, y=-1.0, colours=(s["top"][0], s["top"][1], s["top"][2]), outline=0.9)
    # Patches on the top surface: flat shapes in the lit and shade tones, so the plane reads as gravel, snow or sand.
    for i, x in enumerate(_wrap_positions(rng, 8)):
        y = rng.uniform(5, TOP_DEPTH - 4)
        r = rng.uniform(5, 11)
        tone = s["top"][1] if i % 2 else (s["tuft"] or s["top"])[0]
        for shift in (-TILE_W, 0, TILE_W):
            flat_patch(f"patch{i}_{shift}", [(px + x + shift, py * 0.45 + y) for px, py in _blob(0, 0, r, rng.random(), n=9)], 0.05, tone)
    # Strata: thin irregular bands pressed into the soil face, wrapped across the tile edge.
    for band, z in enumerate((-12, -24, -33)):
        pts = []
        steps = 16
        for i in range(steps + 1):
            x = -40 + (TILE_W + 80) * i / steps
            pts.append((x, z + 1.6 * math_sin(i * 1.7 + band)))
        for i in range(steps, -1, -1):
            x = -40 + (TILE_W + 80) * i / steps
            pts.append((x, z - 2.2 + 1.2 * math_sin(i * 2.3 + band * 2)))
        prism(f"strata{band}", pts, 0.4, y=-0.5, colours=(s["strata"], s["strata"], s["strata"]), outline=0)
    # Pebbles in the soil face, repeated at +/-TILE_W so they wrap seamlessly.
    if s["pebble"]:
        for i, x in enumerate(_wrap_positions(rng, 7)):
            z = rng.uniform(-34, -6)
            r = rng.uniform(1.6, 3.2)
            for shift in (-TILE_W, 0, TILE_W):
                prism(f"pebble{i}_{shift}", _blob(x + shift, z, r, rng.random()), 1.0, y=-1.2, colours=s["pebble"], outline=0.5)
    # Scatter on the top surface: small rocks and tufts, kept behind the front lip.
    if s["tuft"]:
        for i, x in enumerate(_wrap_positions(rng, 9)):
            y = rng.uniform(6, TOP_DEPTH - 6)
            r = rng.uniform(1.2, 2.6)
            for shift in (-TILE_W, 0, TILE_W):
                if i % 3 == 0:
                    prism(f"tuft{i}_{shift}", _spikes(x + shift, 0, r * 1.6, r * 1.5), 0.8, y=y, colours=s["tuft"], outline=0.5)
                else:
                    prism(f"rock{i}_{shift}", _chunk(x + shift, 0, r * 1.5, r * 1.1, rng.random()), r * 1.3, y=y, colours=s["pebble"] or s["tuft"], outline=0.6)
    if frame:
        camera_for(0, TILE_W, screen_v(0, -SOIL_H) + 0.5)
    return f"ground-{style}"


def math_sin(v):
    import math
    return math.sin(v)


def _blob(cx, cz, r, phase, n=7):
    import math
    return [(cx + r * (1 + 0.18 * math.sin(i * 2.1 + phase * 6)) * math.cos(2 * math.pi * i / n),
             cz + r * 0.8 * (1 + 0.18 * math.cos(i * 1.7 + phase * 5)) * math.sin(2 * math.pi * i / n)) for i in range(n)]


def _mound(cx, z, half, h):
    return [(cx - half, z), (cx - half * 0.55, z + h * 0.8), (cx, z + h), (cx + half * 0.6, z + h * 0.7), (cx + half, z)]


def _chunk(cx, z, half, h, phase):
    """Angular rock: flat base, faceted top, leaning a little."""
    lean = (phase - 0.5) * half * 0.4
    return [(cx - half, z), (cx - half * 0.8, z + h * 0.55), (cx - half * 0.2 + lean, z + h), (cx + half * 0.45 + lean, z + h * 0.82), (cx + half, z + h * 0.3), (cx + half * 0.9, z)]


def _spikes(cx, z, half, h):
    """Frost grass or dry grass clump: five blades."""
    pts = [(cx - half, z)]
    for i, (fx, fh) in enumerate(((-0.7, 0.6), (-0.35, 1.0), (0.0, 0.75), (0.35, 0.95), (0.7, 0.55))):
        pts.append((cx + half * (fx - 0.12), z + h * 0.2))
        pts.append((cx + half * fx, z + h * fh))
    pts.append((cx + half, z))
    return pts


def flat_patch(name, points_xy, z, colour):
    """Flat shape lying on the ground plane (top view points), no outline."""
    import bmesh as _bm
    me = bpy.data.meshes.new(name)
    bm = _bm.new()
    verts = [bm.verts.new((x, y, z)) for x, y in points_xy]
    face = bm.faces.new(verts)
    if face.normal.z < 0:
        face.normal_flip()
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(o)
    o.data.materials.append(mat(colour))
    return o


# ---------------------------------------------------------------- launch complex

PAD_W = 92.0  # kit units; narrowed from 120 so three or four structures fit in view (the gantry keeps its height)
# Every structure's front face stands this far behind the ground front edge; its sprite starts at that foot.
STRUCT_Y = 4.0
# Structure sprites start a little below their foot so the baked shadow in front of them is not cut off.
SHADOW_V0 = screen_v(STRUCT_Y - 6, 0)


def build_launchpad(with_gantry=True, fresh=True, frame=True):
    """Launch complex: slab with flame trench, steel gantry with service arms.
    It stands on the ground strip's apron segment; the sprite's bottom row is the slab foot (screen_v(STRUCT_Y, 0))."""
    if fresh:
        reset_scene()
    # Slab: two steps, the upper one carrying the launch mount over a trench.
    box("slab", 0, 0, PAD_W, 7, d=34, y=STRUCT_Y, colours=("concrete_lit", "concrete", "concrete_dark"))
    box("slab_top", 30, 7, 54, 4, d=26, y=9, colours=("hull_lit", "hull", "hull_shade"))
    # Flame trench: dark cut in the slab face under the mount.
    box("trench", 40, 0.5, 26, 6, d=2, y=STRUCT_Y - 0.5, colours=("steel_dark", "steel_dark", "steel_dark"), outline=0.6)
    # Blue trim band and service hatches along the slab face.
    box("trim", 0, 4.2, PAD_W, 1.4, d=0.6, y=STRUCT_Y - 0.4, colours=("trim_blue", "trim_blue", "trim_blue_dark"), outline=0)
    for i, x in enumerate((8, 22, 68, 80)):
        box(f"hatch{i}", x, 1.2, 8, 2.4, d=0.6, y=STRUCT_Y - 0.5, colours=("steel_lit", "steel", "steel_dark"), outline=0.5)
    # Launch mount ring: the rocket stands here (drawn by the game only while a mission is in progress).
    cylinder("mount", 54, 11, 9, 2.5, y=22, colours=("steel_lit", "steel", "steel_dark"), verts=20)
    for x in (44, 64):
        box(f"clamp{x}", x - 1.5, 11, 3, 5, d=3, y=12, colours=("trim_blue", "trim_blue", "trim_blue_dark"), outline=0.6)
    if with_gantry:
        _gantry(x=20, base_z=7, height=104, width=17.0)
    # Service hut at the gantry foot: hull-white panels, a blue door, a teal status strip.
    box("hut", 2, 7, 17, 13, d=16, y=STRUCT_Y + 3, colours=("hull_lit", "hull", "hull_shade"))
    box("hut_door", 7, 7, 6, 8, d=0.6, y=STRUCT_Y + 2.6, colours=("trim_blue", "trim_blue", "trim_blue_dark"), outline=0.5)
    box("hut_strip", 2, 17, 17, 1.2, d=0.6, y=STRUCT_Y + 2.6, colours=("trim_teal", "trim_teal", "trim_teal"), outline=0)
    box("hut_vent", 13, 20, 4, 3, d=4, y=STRUCT_Y + 8, colours=("steel_lit", "steel", "steel_dark"), outline=0.5)
    # Hazard chevrons along the mount deck edge, blue on white (no orange).
    for i in range(7):
        if i % 2 == 0:
            box(f"chev{i}", 31 + i * 7.6, 7.4, 7.6, 2.0, d=0.5, y=STRUCT_Y + 4.6, colours=("trim_blue", "trim_blue", "trim_blue_dark"), outline=0)
    # Fuel line from the gantry foot to the mount.
    box("fuel", 37, 8.5, 12, 1.6, d=1.6, y=14, colours=("trim_teal", "trim_teal", "trim_blue_dark"), outline=0.5)
    cast_shadow("pad_shadow", 0, PAD_W, STRUCT_Y, STRUCT_Y + 34, 10)
    if frame:
        camera_for(-6, PAD_W + 14, SHADOW_V0)
    return "launchpad"


def _gantry(x, base_z, height, width=14.0):
    """Square steel lattice tower: four legs, cross braces on the front face, three service arms to the right."""
    d = 12.0
    y0 = 10.0
    for lx in (x, x + width - 2.4):
        box(f"leg_{lx}", lx, base_z, 2.4, height, d=2.4, y=y0, colours=("steel_lit", "steel", "steel_dark"), outline=0.7)
        box(f"legb_{lx}", lx, base_z, 2.4, height, d=2.4, y=y0 + d - 2.4, colours=("steel_lit", "steel", "steel_dark"), outline=0.7)
    bay = 13.0
    n = int(height // bay)
    import math as _m
    for i in range(n):
        z = base_z + i * bay
        box(f"rung{i}", x, z + bay - 1.6, width, 1.6, d=d, y=y0, colours=("steel_lit", "steel", "steel_dark"), outline=0.6)
        # X brace on the front face as two thin rotated bars.
        for sgn in (1, -1):
            bpy.ops.mesh.primitive_cube_add(size=1)
            o = bpy.context.active_object
            o.name = f"brace{i}{sgn}"
            length = _m.hypot(width - 2.4, bay - 1.6)
            o.scale = (length, 0.8, 1.0)
            o.location = (x + width / 2, y0 - 0.2, z + bay / 2 - 0.4)
            o.rotation_euler = (0, sgn * _m.atan2(bay - 1.6, width - 2.4), 0)
            bpy.ops.object.transform_apply(scale=True, rotation=True)
            faceted(o, "steel_lit", "steel_lit", "steel")
            ink(o, 0.4)
    # Hull-white cab at the top with a blue band, then a lightning mast.
    top = base_z + n * bay
    box("cab", x - 1, top, width + 2, 8, d=d + 2, y=y0 - 1, colours=("hull_lit", "hull", "hull_shade"))
    box("cab_band", x - 1, top + 2.5, width + 2, 2, d=0.6, y=y0 - 1.5, colours=("trim_blue", "trim_blue", "trim_blue_dark"), outline=0)
    box("mast", x + width / 2 - 0.8, top + 8, 1.6, 12, d=1.6, y=y0 + d / 2, colours=("steel_lit", "steel", "steel_dark"), outline=0.5)
    box("beacon", x + width / 2 - 1.4, top + 20, 2.8, 2.2, d=2.8, y=y0 + d / 2 - 0.6, colours=("trim_teal", "trim_teal", "trim_blue_dark"), outline=0.5)
    # Service arms reaching toward the mount, at three heights.
    for i, frac in enumerate((0.42, 0.62, 0.82)):
        z = base_z + height * frac
        reach = 17 - i * 3
        box(f"arm{i}", x + width, z, reach, 2.4, d=4, y=y0 + 4, colours=("hull_lit", "hull", "hull_shade"), outline=0.7)
        box(f"armtip{i}", x + width + reach - 3, z - 2.2, 3, 2.2, d=4, y=y0 + 4, colours=("trim_blue", "trim_blue", "trim_blue_dark"), outline=0.6)


def _shift_new(before, dx):
    for o in bpy.context.scene.objects:
        if o.name not in before:
            o.location.x += dx


def build_preview(style="mountains", pad_x=150.0, width=402.0):
    """Whole base strip at the 402 authoring width: ground tiles, an apron segment under the pad, the pad.
    Only for looking; the game composes the same pieces from base-site.json."""
    reset_scene()
    x = -TILE_W
    while x < width + TILE_W:
        before = {o.name for o in bpy.context.scene.objects}
        build_ground(style, fresh=False, frame=False)
        _shift_new(before, x)
        x += TILE_W
    before = {o.name for o in bpy.context.scene.objects}
    build_launchpad(fresh=False, frame=False)
    _shift_new(before, pad_x)
    camera_for(0, width, screen_v(0, -SOIL_H) + 0.5)


# ---------------------------------------------------------------- hangar

HANGAR_W = 52.0


def build_hangar(fresh=True, frame=True):
    """Assembly hall: white panelled walls, angled roof, a big blue-framed door, a glazed clerestory."""
    if fresh:
        reset_scene()
    d = 30.0
    y = STRUCT_Y
    box("hall", 0, 0, HANGAR_W, 30, d=d, y=y, colours=("hull_lit", "hull", "hull_shade"))
    # Angled roof: a prism along x whose ridge sits toward the back.
    roof = [(0, 30), (HANGAR_W, 30), (HANGAR_W - 4, 38), (4, 38)]
    prism("roof", roof, d, y=y, colours=("hull_lit", "hull_shade", "hull_shade"))
    box("roof_band", 0, 29, HANGAR_W, 2, d=0.6, y=y - 0.4, colours=("trim_blue", "trim_blue", "trim_blue_dark"), outline=0)
    # Panel seams: thin vertical recesses on the front wall.
    for i in range(1, 5):
        x = i * HANGAR_W / 5
        box(f"seam{i}", x - 0.3, 1, 0.6, 27, d=0.3, y=y - 0.2, colours=("seam", "seam", "seam"), outline=0)
    # Big door: blue frame, segmented shutter.
    box("door_frame", 5, 0, 24, 22, d=0.8, y=y - 0.6, colours=("trim_blue", "trim_blue", "trim_blue_dark"), outline=0.7)
    for i in range(6):
        box(f"shutter{i}", 7, 0.4 + i * 3.4, 20, 2.8, d=0.5, y=y - 0.9, colours=("steel_lit", "steel_lit", "steel"), outline=0)
    # Clerestory glazing and a side window block.
    box("glass", 33, 14, 14, 8, d=0.6, y=y - 0.6, colours=("glass", "glass", "glass_dark"), outline=0.6)
    for i in range(1, 3):
        box(f"mullion{i}", 33 + i * 4.7 - 0.4, 14, 0.8, 8, d=0.4, y=y - 0.9, colours=("hull_lit", "hull_lit", "hull_lit"), outline=0)
    box("side_door", 38, 0, 6, 9, d=0.6, y=y - 0.6, colours=("trim_teal", "trim_teal", "trim_blue_dark"), outline=0.5)
    # Roof kit: two vents and an antenna mast with a teal beacon.
    for x in (8, 16):
        box(f"vent{x}", x, 37, 5, 3.5, d=5, y=y + 14, colours=("steel_lit", "steel", "steel_dark"), outline=0.5)
    box("antenna", 44, 37, 1.2, 12, d=1.2, y=y + 14, colours=("steel_lit", "steel", "steel_dark"), outline=0.4)
    box("antenna_tip", 43.4, 49, 2.4, 1.8, d=2.4, y=y + 13.4, colours=("trim_teal", "trim_teal", "trim_blue_dark"), outline=0.4)
    cast_shadow("hangar_shadow", 0, HANGAR_W, STRUCT_Y, STRUCT_Y + 30, 10)
    if frame:
        camera_for(-3, HANGAR_W + 13, SHADOW_V0)
    return "hangar"


# ---------------------------------------------------------------- control station (SSL-611)

STATION_W = 60.0


def build_control_station(fresh=True, frame=True):
    """Control station: a white operations block under a glazed control room, a dish on the roof and a lattice
    mast with a teal beacon. The hub for satellites and telescopes."""
    if fresh:
        reset_scene()
    y = STRUCT_Y
    # Ground block: white panels, blue base band, a teal side door.
    box("block", 0, 0, STATION_W, 18, d=26, y=y, colours=("hull_lit", "hull", "hull_shade"))
    box("block_band", 0, 1.2, STATION_W, 1.6, d=0.6, y=y - 0.4, colours=("trim_blue", "trim_blue", "trim_blue_dark"), outline=0)
    for i in range(1, 5):
        x = i * STATION_W / 5
        box(f"seam{i}", x - 0.3, 4, 0.6, 12, d=0.3, y=y - 0.2, colours=("seam", "seam", "seam"), outline=0.0)
    box("door", 6, 0, 8, 11, d=0.6, y=y - 0.6, colours=("trim_teal", "trim_teal", "trim_blue_dark"), outline=0.6)
    box("block_glass", 20, 6, 24, 6, d=0.6, y=y - 0.6, colours=("glass", "glass", "glass_dark"), outline=0.6)
    # Control room: a narrower upper floor with a long glazed band and a blue roof edge.
    box("room", 4, 18, 36, 12, d=20, y=y + 3, colours=("hull_lit", "hull", "hull_shade"))
    box("room_glass", 7, 21, 30, 6, d=0.6, y=y + 2.4, colours=("glass", "glass", "glass_dark"), outline=0.6)
    for i in range(1, 6):
        box(f"room_mullion{i}", 7 + i * 5 - 0.4, 21, 0.8, 6, d=0.4, y=y + 2.1, colours=("hull_lit", "hull_lit", "hull_lit"), outline=0)
    box("room_cap", 3, 29.4, 38, 2, d=22, y=y + 2.5, colours=("trim_blue", "trim_blue", "trim_blue_dark"), outline=0.7)
    # Roof dish: a shallow bowl on a short stem, tilted toward the sky.
    box("dish_stem", 19.2, 31.4, 1.6, 5, d=1.6, y=y + 11, colours=("steel_lit", "steel", "steel_dark"), outline=0.5)
    prism("dish", [(8, 40), (31, 40), (26, 36.4), (13, 36.4)], 3, y=y + 10, colours=("steel_lit", "steel", "steel_dark"), outline=0.7)
    box("dish_feed", 19.4, 40, 1.2, 4, d=1.2, y=y + 10.9, colours=("trim_teal", "trim_teal", "trim_blue_dark"), outline=0.4)
    # Lattice mast on the right, with cross rungs and a teal beacon.
    for lx in (46, 51.6):
        box(f"mast_leg{lx}", lx, 18, 1.4, 38, d=1.4, y=y + 8, colours=("steel_lit", "steel", "steel_dark"), outline=0.5)
    for i in range(7):
        box(f"mast_rung{i}", 46, 20 + i * 5, 7, 1.0, d=1.2, y=y + 8, colours=("steel_lit", "steel", "steel_dark"), outline=0.3)
    box("mast_beacon", 47.2, 56, 3.6, 2.4, d=3.6, y=y + 7.6, colours=("trim_teal", "trim_teal", "trim_blue_dark"), outline=0.5)
    box("mast_mount", 44, 16, 11, 3, d=12, y=y + 4, colours=("hull_lit", "hull", "hull_shade"), outline=0.6)
    cast_shadow("station_shadow", 0, STATION_W, STRUCT_Y, STRUCT_Y + 26, 8)
    if frame:
        camera_for(-3, STATION_W + 11, SHADOW_V0)
    return "control-station"


# ---------------------------------------------------------------- backdrop bands

BAND_W = 480.0

# Each band: colours (lit, shade), peak count, height range, snowcap colours or None, optional treeline.
BACKDROPS = {
    "mountains": [
        {"id": "far", "lit": "slate_far_lit", "shade": "slate_far", "peaks": 7, "h": (46, 86), "cap": ("snow", "snow_shade"), "cap_at": 60, "jag": 0.25},
        {"id": "near", "lit": "slate_mid_lit", "shade": "slate_mid", "peaks": 6, "h": (14, 30), "cap": None, "jag": 0.1, "wide": 2.4, "rocks": ("slate_far_lit", "slate_mid_lit", "slate_mid"), "sparse_trees": ("pine_lit", "pine", "pine_dark")},
    ],
    "tundra": [
        {"id": "far", "lit": "snow", "shade": "snow_shade", "peaks": 6, "h": (36, 64), "cap": None, "jag": 0.1},
        {"id": "near", "lit": "frost", "shade": "ice", "peaks": 8, "h": (16, 30), "cap": None, "jag": 0.15, "rocks": ("rock_lit", "rock", "rock_dark")},
    ],
    "desert": [
        {"id": "far", "lit": "mesa_lit", "shade": "mesa", "peaks": 5, "h": (34, 58), "cap": None, "jag": 0.0, "mesa": True},
        {"id": "near", "lit": "sand_lit", "shade": "sand_dark", "peaks": 7, "h": (10, 22), "cap": None, "jag": 0.05},
    ],
    "coast": [
        {"id": "far", "lit": "slate_far_lit", "shade": "slate_far", "peaks": 3, "h": (18, 44), "cap": None, "jag": 0.2},
        {"id": "near", "sea": True},
    ],
}


def _mountains(rng, peaks, h_range, jag, wide=1.0):
    """Overlapping mountains of varied size, spread periodically over the band."""
    out = []
    for i in range(peaks * 2):
        big = i < peaks
        h = rng.uniform(*h_range) if big else rng.uniform(h_range[0] * 0.55, h_range[0] * 1.0)
        x = (i + rng.uniform(-0.3, 0.3)) * BAND_W / peaks if big else rng.uniform(0, BAND_W)
        out.append({"x": x, "h": h, "l": h * wide * rng.uniform(0.9, 1.6), "r": h * wide * rng.uniform(0.9, 1.6),
                    "knee": rng.uniform(0.35, 0.6), "kink": rng.uniform(0.1, 0.25 + jag), "spine": rng.uniform(-0.15, 0.2)})
    # Tall ones first so smaller ones stand in front of them.
    return sorted(out, key=lambda m: -m["h"])


def _mountain_faces(m):
    """Left (lit) and right (shade) faces of one mountain, split along a spine from the peak to the foot."""
    x, h = m["x"], m["h"]
    kl = (x - m["l"] * m["knee"], h * (1 - m["knee"]) + h * m["kink"] * m["knee"])
    kr = (x + m["r"] * m["knee"], h * (1 - m["knee"]) + h * m["kink"] * m["knee"] * 0.6)
    foot = (x + m["spine"] * m["l"], 0)
    left = [(x - m["l"], 0), kl, (x, h), foot]
    right = [foot, (x, h), kr, (x + m["r"], 0)]
    return left, right, kl, kr


def _ridge_points(rng, peaks, h_range, jag, mesa=False, step=3.0):
    """Mesa ridgeline: flat-topped buttes, sampled every `step` units, periodic over the band."""
    buttes = [((i + rng.uniform(-0.25, 0.25)) * BAND_W / peaks, rng.uniform(*h_range), rng.uniform(14, 30)) for i in range(peaks)]
    def height(x):
        best = h_range[0] * 0.25
        for bx, bh, half in buttes:
            for shift in (-BAND_W, 0, BAND_W):
                d = abs(x - bx - shift)
                best = max(best, bh if d < half else bh - (d - half) * 2.2)
        return best
    n = int(BAND_W / step)
    return [(i * step, height(i * step)) for i in range(n + 1)]


def build_band(biome="mountains", band_id="far", seed=11):
    reset_scene()
    spec = next(b for b in BACKDROPS[biome] if b["id"] == band_id)
    rng = random.Random(seed * 1000 + sum(ord(c) for c in biome + band_id))
    if spec.get("sea"):
        _sea_band(rng)
        camera_for(0, BAND_W, 0, 30)
        return f"band-{biome}-{band_id}"
    mesa = spec.get("mesa", False)
    ridge = _ridge_points(rng, spec["peaks"], spec["h"], spec["jag"], True) if mesa else None
    mountains = None if mesa else _mountains(rng, spec["peaks"], spec["h"], spec["jag"], spec.get("wide", 1.0))
    for shift in (-BAND_W, 0, BAND_W):
        if mesa:
            for i in range(len(ridge) - 1):
                (ax, ah), (bx, bh) = ridge[i], ridge[i + 1]
                colour = spec["lit"] if bh >= ah else spec["shade"]
                prism(f"facet{i}_{shift}", [(ax + shift, 0), (bx + shift, 0), (bx + shift, bh), (ax + shift, ah)], 0.2, colours=(colour, colour, colour), outline=0)
                if bh == ah:
                    prism(f"mesa_cap{i}_{shift}", [(ax + shift, ah - 3), (bx + shift, bh - 3), (bx + shift, bh), (ax + shift, ah)], 0.2, y=-0.1, colours=("mesa_lit",) * 3, outline=0)
                    prism(f"mesa_band{i}_{shift}", [(ax + shift, ah - 11), (bx + shift, bh - 11), (bx + shift, bh - 9), (ax + shift, ah - 9)], 0.2, y=-0.1, colours=("mesa_dark",) * 3, outline=0)
            continue
        prism(f"base_{shift}", [(shift, 0), (shift + BAND_W, 0), (shift + BAND_W, spec["h"][0] * 0.3), (shift, spec["h"][0] * 0.3)], 0.2, y=0.4, colours=(spec["shade"],) * 3, outline=0)
        for k, m in enumerate(mountains):
            left, right, kl, kr = _mountain_faces(m)
            y = -0.02 * k
            prism(f"mL{k}_{shift}", [(px + shift, pz) for px, pz in left], 0.2, y=y, colours=(spec["lit"],) * 3, outline=0)
            prism(f"mR{k}_{shift}", [(px + shift, pz) for px, pz in right], 0.2, y=y, colours=(spec["shade"],) * 3, outline=0)
            if spec.get("cap") and m["h"] >= spec["cap_at"]:
                lit, shade = spec["cap"]
                t = min(0.85, (m["h"] - spec["cap_at"]) / m["h"] * 1.3 + 0.12)
                px, ph = m["x"], m["h"]
                lp = (px + (kl[0] - px) * t, ph + (kl[1] - ph) * t)
                rp = (px + (kr[0] - px) * t, ph + (kr[1] - ph) * t)
                sp = (px + m["spine"] * m["l"] * t, ph * (1 - t))
                # Jagged lower edge: two teeth per side.
                l_teeth = [lp, ((lp[0] * 2 + sp[0]) / 3, (lp[1] * 2 + sp[1]) / 3 + 3), ((lp[0] + sp[0] * 2) / 3, (lp[1] + sp[1] * 2) / 3 - 1), sp]
                r_teeth = [sp, ((rp[0] + sp[0] * 2) / 3, (rp[1] + sp[1] * 2) / 3 + 2), ((rp[0] * 2 + sp[0]) / 3, (rp[1] * 2 + sp[1]) / 3 - 2), rp]
                prism(f"capL{k}_{shift}", [(qx + shift, qz) for qx, qz in [(px, ph)] + l_teeth], 0.2, y=y - 0.01, colours=(lit,) * 3, outline=0)
                prism(f"capR{k}_{shift}", [(qx + shift, qz) for qx, qz in r_teeth + [(px, ph)]], 0.2, y=y - 0.01, colours=(shade,) * 3, outline=0)
    if spec.get("trees"):
        for i in range(34):
            x = rng.uniform(0, BAND_W)
            h = rng.uniform(9, 16)
            for shift in (-BAND_W, 0, BAND_W):
                _pine(f"bpine{i}_{shift}", x + shift, rng.uniform(-1, 3), h, spec["trees"], outline=0, y=-0.3)
    if spec.get("sparse_trees"):
        # Liam, 14 Oct: an agency site, not a forest. A few lone pines, never a treeline.
        for i, x in enumerate((70, 255, 410)):
            for shift in (-BAND_W, 0, BAND_W):
                _pine(f"lone{i}_{shift}", x + shift, 0, rng.uniform(8, 12), spec["sparse_trees"], outline=0, y=-0.3)
    if spec.get("rocks"):
        for i in range(10):
            x = rng.uniform(0, BAND_W)
            for shift in (-BAND_W, 0, BAND_W):
                prism(f"brock{i}_{shift}", _chunk(x + shift, 0, rng.uniform(4, 8), rng.uniform(3, 6), rng.random()), 0.2, y=-0.3, colours=spec["rocks"], outline=0)
    camera_for(0, BAND_W, 0)
    return f"band-{biome}-{band_id}"


def _sea_band(rng):
    """Coast backdrop: open sea with lit swell lines, a headland skerry and a pale shore line at the bottom."""
    prism("sea", [(-BAND_W, 0), (2 * BAND_W, 0), (2 * BAND_W, 26), (-BAND_W, 26)], 0.2, colours=("water",) * 3, outline=0)
    prism("sea_far", [(-BAND_W, 20), (2 * BAND_W, 20), (2 * BAND_W, 26), (-BAND_W, 26)], 0.2, y=-0.05, colours=("water_lit",) * 3, outline=0)
    for i in range(18):
        x = rng.uniform(0, BAND_W)
        z = rng.uniform(4, 18)
        w = rng.uniform(10, 26)
        for shift in (-BAND_W, 0, BAND_W):
            prism(f"swell{i}_{shift}", [(x + shift, z), (x + w + shift, z), (x + w - 2 + shift, z + 0.9), (x + 2 + shift, z + 0.9)], 0.2, y=-0.1, colours=("water_lit",) * 3, outline=0)
    for i, (x, w, h) in enumerate(((120, 26, 9), (300, 14, 6), (330, 8, 4))):
        for shift in (-BAND_W, 0, BAND_W):
            prism(f"skerry{i}_{shift}", _chunk(x + shift, 18, w, h, 0.4), 0.2, y=-0.2, colours=("rock_lit", "rock", "rock_dark"), outline=0)
    prism("shore", [(-BAND_W, 0), (2 * BAND_W, 0), (2 * BAND_W, 2.2), (-BAND_W, 2.2)], 0.2, y=-0.3, colours=("sand_lit",) * 3, outline=0)


def _pine(name, x, z, h, colours, outline=0.6, y=0.0):
    """Stacked-triangle pine with a lit left side: three tiers on a short trunk."""
    lit, mid, dark = colours
    prism(f"{name}_trunk", [(x - h * 0.05, z), (x + h * 0.05, z), (x + h * 0.05, z + h * 0.2), (x - h * 0.05, z + h * 0.2)], 0.4 if outline else 0.2, y=y, colours=("soil_dark",) * 3, outline=outline)
    for t, (base, top, half) in enumerate(((0.15, 0.6, 0.34), (0.38, 0.82, 0.26), (0.6, 1.0, 0.18))):
        zb, zt = z + h * base, z + h * top
        prism(f"{name}_tierL{t}", [(x - h * half, zb), (x, zb), (x, zt)], 0.4 if outline else 0.2, y=y - 0.01 * t, colours=(lit,) * 3, outline=outline)
        prism(f"{name}_tierR{t}", [(x, zb), (x + h * half, zb), (x, zt)], 0.4 if outline else 0.2, y=y - 0.01 * t, colours=(dark if t == 0 else mid,) * 3, outline=outline)


# ---------------------------------------------------------------- strip props

PROPS = {
    "pine-tall": lambda: _pine("p", 0, 0, 30, ("pine_lit", "pine", "pine_dark"), outline=0.6, y=STRUCT_Y + 4),
    "pine-short": lambda: _pine("p", 0, 0, 19, ("pine_lit", "pine", "pine_dark"), outline=0.6, y=STRUCT_Y + 4),
    "pine-snow": lambda: _pine("p", 0, 0, 24, ("snow", "snow_shade", "pine_dark"), outline=0.6, y=STRUCT_Y + 4),
    "rock": lambda: prism("r", _chunk(0, 0, 7, 6, 0.3), 8, y=STRUCT_Y, colours=("rock_lit", "rock", "rock_dark"), outline=0.6),
    "rock-sand": lambda: prism("r", _chunk(0, 0, 7, 5, 0.7), 8, y=STRUCT_Y, colours=("mesa_lit", "mesa", "mesa_dark"), outline=0.6),
    "boulder": lambda: [prism("b1", _chunk(-3, 0, 8, 9, 0.6), 9, y=STRUCT_Y, colours=("rock_lit", "rock", "rock_dark"), outline=0.6),
                        prism("b2", _chunk(6, 0, 5, 5, 0.2), 6, y=STRUCT_Y - 1, colours=("rock_lit", "rock", "rock_dark"), outline=0.6)],
    "snow-rock": lambda: prism("r", _chunk(0, 0, 7, 6, 0.4), 8, y=STRUCT_Y, colours=("snow", "snow_shade", "rock_dark"), outline=0.6),
}


def build_prop(name):
    reset_scene()
    PROPS[name]()
    xs = []
    deps = bpy.context.evaluated_depsgraph_get()
    for o in bpy.context.scene.objects:
        if o.type == "MESH":
            ev = o.evaluated_get(deps)
            xs += [(ev.matrix_world @ Vector(c)).x for c in ev.bound_box]
    half = max(abs(min(xs)), abs(max(xs))) + 1
    camera_for(-half, half, screen_v(STRUCT_Y, 0) - 0.5)
    return name


# ---------------------------------------------------------------- exchange (cargo dock, SSL-568)

EXCHANGE_W = 110.0


def build_exchange(fresh=True, frame=True):
    """Cargo dock: a sell pad, a conveyor carrying crates into a white dock shed, a price board on a mast."""
    if fresh:
        reset_scene()
    y = STRUCT_Y
    # Sell pad: low concrete platform with a blue edge band.
    box("sellpad", 0, 0, 34, 4, d=26, y=y + 2, colours=("concrete_lit", "concrete", "concrete_dark"))
    box("sellpad_band", 0, 1.4, 34, 1.2, d=0.6, y=y + 1.6, colours=("trim_blue", "trim_blue", "trim_blue_dark"), outline=0)
    # Conveyor from the pad to the shed: belt on legs, rollers along the face.
    box("belt", 30, 9, 44, 2.4, d=8, y=y + 9, colours=("steel_lit", "steel", "steel_dark"), outline=0.7)
    for lx in (34, 50, 66):
        box(f"leg{lx}", lx, 0, 2, 9, d=2, y=y + 12, colours=("steel_lit", "steel", "steel_dark"), outline=0.5)
    for i in range(10):
        cylinder(f"roller{i}", 32 + i * 4.2, 9.2, 0.9, 1.6, y=y + 8.6, colours=("steel_dark",) * 3, outline=0, verts=8)
    # Crates riding the belt and stacked on the pad.
    crates = [(36, 11.4, 6, 5, "hull"), (47, 11.4, 5, 5, "trim_blue"), (57, 11.4, 6, 6, "hull"), (4, 4, 8, 7, "trim_teal"), (13, 4, 7, 6, "hull"), (6, 11, 6, 5, "hull")]
    for i, (cx, cz, w, h, c) in enumerate(crates):
        shade = {"hull": ("hull_lit", "hull", "hull_shade"), "trim_blue": ("trim_blue", "trim_blue", "trim_blue_dark"), "trim_teal": ("trim_teal", "trim_teal", "trim_blue_dark")}[c]
        box(f"crate{i}", cx, cz, w, h, d=w, y=y + 10 if cz > 10 and cx > 30 else y + 6, colours=shade, outline=0.6)
    # Dock shed the belt runs into.
    box("shed", 72, 0, 38, 24, d=26, y=y, colours=("hull_lit", "hull", "hull_shade"))
    prism("shed_roof", [(72, 24), (110, 24), (107, 29), (75, 29)], 26, y=y, colours=("hull_lit", "hull_shade", "hull_shade"))
    box("shed_band", 72, 22, 38, 2, d=0.6, y=y - 0.4, colours=("trim_blue", "trim_blue", "trim_blue_dark"), outline=0)
    box("shed_door", 74, 8, 12, 9, d=0.6, y=y - 0.6, colours=("steel_dark", "steel_dark", "steel_dark"), outline=0.6)
    box("shed_window", 92, 10, 14, 6, d=0.6, y=y - 0.6, colours=("glass", "glass", "glass_dark"), outline=0.6)
    # Price board on a mast: dark panel with three teal price rows.
    box("mast", 22, 4, 1.6, 30, d=1.6, y=y + 14, colours=("steel_lit", "steel", "steel_dark"), outline=0.5)
    box("board", 12, 30, 22, 13, d=1.6, y=y + 12, colours=("trim_blue_dark", "trim_blue_dark", "outline"), outline=0.7)
    for r in range(3):
        box(f"row{r}", 14, 32 + r * 3.6, 18 - r * 4, 1.6, d=0.4, y=y + 11.7, colours=("trim_teal", "trim_teal", "trim_teal"), outline=0)
    cast_shadow("exchange_shadow", 0, EXCHANGE_W, STRUCT_Y, STRUCT_Y + 26, 8)
    if frame:
        camera_for(-3, EXCHANGE_W + 11, SHADOW_V0)
    return "exchange"


# ---------------------------------------------------------------- clouds

PALETTE.setdefault("cloud_lit", "#fbfcfd")
PALETTE.setdefault("cloud", "#e8eef4")
PALETTE.setdefault("cloud_shade", "#c9d6e3")


def build_cloud(variant=0):
    """Flat cloud: overlapping puffs with a lit cap and a shaded flat base, no outline (sky layer)."""
    reset_scene()
    rng = random.Random(40 + variant)
    import math as _m
    width = (60, 44, 80)[variant]
    puffs = []
    n = (5, 4, 7)[variant]
    for i in range(n):
        x = width * (i + 0.5) / n + rng.uniform(-3, 3)
        r = rng.uniform(6, 10) * (1.25 if 0 < i < n - 1 else 0.85)
        puffs.append((x, r))
    for i, (x, r) in enumerate(puffs):
        pts = [(x + r * _m.cos(a), max(0.0, r * 0.7 + r * _m.sin(a))) for a in [k * 2 * _m.pi / 20 for k in range(20)]]
        prism(f"puff{i}", pts, 0.2, y=-0.01 * i, colours=("cloud",) * 3, outline=0)
        lit = [(x + r * 0.8 * _m.cos(a) - r * 0.15, r * 0.7 + r * 0.8 * _m.sin(a) + r * 0.12) for a in [k * 2 * _m.pi / 20 for k in range(2, 9)]]
        lit = [(lx, ly) for lx, ly in lit] + [(x - r * 0.2, r * 0.9)]
        prism(f"lit{i}", lit, 0.2, y=-0.2 - 0.01 * i, colours=("cloud_lit",) * 3, outline=0)
    prism("base", [(puffs[0][0] - puffs[0][1] * 0.8, 0), (puffs[-1][0] + puffs[-1][1] * 0.8, 0), (puffs[-1][0] + puffs[-1][1] * 0.6, 3), (puffs[0][0] - puffs[0][1] * 0.6, 3)], 0.2, y=-0.5, colours=("cloud_shade",) * 3, outline=0)
    camera_for(-12, width + 12, -1)
    return f"cloud-{variant}"
