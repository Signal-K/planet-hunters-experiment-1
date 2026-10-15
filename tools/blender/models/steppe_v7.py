"""Steppe backdrop objects for the base world (Liam, 14 Oct: steppe and escarpments, every background piece a
game object). Each builder renders ONE object as its own sprite; the game places, layers, parallaxes and
animates them from shared/scenes/base-world.json. Nothing here is a whole scene.

Escarpments are low flat-topped tableland edges far across the steppe (Baikonur, not the Himalaya): a level
caprock, a banded cliff face, a talus skirt. Two haze levels per shape so depth reads without runtime tinting.

Run in Blender after kit_v7.py:
    exec(open(".../tools/blender/models/steppe_v7.py").read()); build_escarpment("a", "far")
"""

import math
import random

STEPPE = {
    "cap": "#b9a383", "cap_lit": "#cdb999", "face": "#a48b6c", "face_lit": "#b89f80", "face_shade": "#8b7459",
    "band": "#8f785e", "talus": "#9d8a70", "talus_shade": "#857359",
    "plain": "#b5a47f", "plain_lit": "#c7b792", "plain_shade": "#a3926d", "river": "#cfc4ab", "river_shade": "#b8ab8e",
    "grass": "#c9b88a", "grass_lit": "#ddcda0", "grass_shade": "#a8976c",
}
HAZE = {"near": ("#c9d6df", 0.0), "mid": ("#c9d6df", 0.28), "far": ("#c4d2de", 0.5)}

ESCARPMENTS = {
    # width, height, profile: list of (x fraction, height fraction) for the top edge, left to right
    "a": (220, 22, [(0.0, 0.0), (0.06, 0.55), (0.1, 0.95), (0.5, 1.0), (0.78, 0.97), (0.86, 0.6), (0.93, 0.5), (1.0, 0.0)]),
    "b": (150, 16, [(0.0, 0.0), (0.12, 0.7), (0.18, 1.0), (0.62, 1.0), (0.7, 0.72), (0.76, 0.7), (0.84, 0.35), (1.0, 0.0)]),
    "c": (300, 13, [(0.0, 0.0), (0.05, 0.8), (0.09, 1.0), (0.4, 0.98), (0.45, 0.82), (0.55, 0.8), (0.6, 0.95), (0.92, 1.0), (1.0, 0.0)]),
    "headland": (240, 20, [(0.0, 0.0), (0.1, 0.45), (0.22, 0.85), (0.3, 1.0), (0.78, 0.96), (0.86, 0.92), (0.9, 0.3), (0.96, 0.22), (1.0, 0.0)]),
    "butte": (60, 18, [(0.0, 0.0), (0.18, 0.75), (0.26, 1.0), (0.7, 1.0), (0.78, 0.7), (1.0, 0.0)]),
}


def _tone(name, depth):
    haze, k = HAZE[depth]
    PALETTE[f"st_{name}_{depth}"] = _mix_hex(STEPPE[name], haze, k)
    return f"st_{name}_{depth}"


def _mix_hex(a, b, k):
    pa = [int(a[i:i + 2], 16) for i in (1, 3, 5)]
    pb = [int(b[i:i + 2], 16) for i in (1, 3, 5)]
    return "#" + "".join(f"{round(x + (y - x) * k):02x}" for x, y in zip(pa, pb))


def build_escarpment(shape="a", depth="far", seed=4):
    """Low tableland edge: talus skirt, cliff face with strata bands, a level caprock seen from slightly above."""
    reset_scene()
    rng = random.Random(seed + ord(shape[0]))
    w, h, profile = ESCARPMENTS[shape]
    # Densify the profile and roughen it: an eroded caprock edge, never a ruler line.
    top = []
    for (ax, az), (bx, bz) in zip(profile, profile[1:]):
        steps = max(1, int((bx - ax) * w / 6))
        for k in range(steps):
            t = k / steps
            x = (ax + (bx - ax) * t) * w
            z = (az + (bz - az) * t) * h
            if 0 < z < h * 1.01 and k:
                z += rng.uniform(-0.035, 0.02) * h
            top.append((x, max(0.0, z)))
    top.append((profile[-1][0] * w, 0.0))
    d = 10.0
    # Cliff body: the profile extruded back; the tilted camera shows its flat top as the caprock.
    prism("body", top, d, y=0, colours=(_tone("cap", depth), _tone("face", depth), _tone("face_shade", depth)), outline=0)
    # Lit caprock edge along the level top.
    flats = [(a, b) for a, b in zip(top, top[1:]) if abs(a[1] - b[1]) < 0.06 * h and a[1] > 0.6 * h]
    for i, (a, b) in enumerate(flats):
        prism(f"cap{i}", [(a[0], a[1] - 1.4), (b[0], b[1] - 1.4), (b[0], b[1]), (a[0], a[1])], 0.3, y=-0.2, colours=(_tone("cap_lit", depth),) * 3, outline=0)
    # Strata: two or three bands across the face, following the profile down from the top.
    for k, frac in enumerate((0.55, 0.72, 0.86)[: 2 + (shape != "butte")]):
        z0 = h * frac
        pts = []
        for x, z in top:
            if z >= z0 + 1:
                pts.append((x, z0 + rng.uniform(-0.6, 0.6)))
        if len(pts) >= 2:
            band = pts + [(x, z - 1.3) for x, z in reversed(pts)]
            prism(f"band{k}", band, 0.3, y=-0.25, colours=(_tone("band", depth),) * 3, outline=0)
    # Lit left flanks: where the profile rises, a lit facet.
    for i, (a, b) in enumerate(zip(top, top[1:])):
        if b[1] > a[1] + 0.2 * h:
            prism(f"lit{i}", [a, b, (b[0], 0), (a[0], 0)], 0.3, y=-0.3, colours=(_tone("face_lit", depth),) * 3, outline=0)
    # Gullies: erosion notches running down the face from the caprock, darker than the face.
    for g in range(int(w / 26)):
        gx = rng.uniform(w * 0.12, w * 0.88)
        gtop = next((z for x, z in top if x >= gx), h) * rng.uniform(0.82, 0.95)
        gw = rng.uniform(1.2, 2.6)
        prism(f"gully{g}", [(gx - 0.3, h * 0.22), (gx + 0.5, h * 0.22), (gx + gw, gtop), (gx - gw * 0.8, gtop)], 0.3, y=-0.35, colours=(_tone("band", depth),) * 3, outline=0)
    # Talus skirt: a lumpy scree apron along the foot, lit and shaded halves.
    skirt = [(-6, 0), (w + 6, 0)]
    for k in range(18, -1, -1):
        x = w * (0.04 + 0.92 * k / 18)
        skirt.append((x, h * rng.uniform(0.14, 0.28)))
    prism("talus", skirt, 6, y=-1.5, colours=(_tone("talus", depth), _tone("talus", depth), _tone("talus_shade", depth)), outline=0)
    camera_for(-8, w + 8, -0.5)
    return f"escarpment-{shape}-{depth}"


def build_tussock(variant=0):
    """Steppe grass tussock: a clump of straw blades, lit left, the commonest thing on the steppe."""
    reset_scene()
    rng = random.Random(70 + variant)
    n = (7, 5, 9)[variant]
    width = (10, 7, 14)[variant]
    for i in range(n):
        x = (i - n / 2) * width / n + rng.uniform(-0.4, 0.4)
        hgt = rng.uniform(4, 7.5) * (1.2 if abs(i - n / 2) < 2 else 0.8)
        lean = rng.uniform(-2.2, 2.2)
        tone = "st_grass" if i % 3 else ("st_grass_lit" if x < 0 else "st_grass_shade")
        PALETTE["st_grass"], PALETTE["st_grass_lit"], PALETTE["st_grass_shade"] = STEPPE["grass"], STEPPE["grass_lit"], STEPPE["grass_shade"]
        prism(f"blade{i}", [(x - 0.7, 0), (x + 0.7, 0), (x + lean, hgt)], 0.4, y=STRUCT_Y + 2 + i * 0.05, colours=(tone,) * 3, outline=0.35)
    camera_for(-width / 2 - 4, width / 2 + 4, screen_v(STRUCT_Y + 2, 0) - 0.3)
    return f"tussock-{variant}"


def build_balloon():
    """Weather balloon: pale envelope, a thin line and a small instrument box. It rises and drifts in game."""
    reset_scene()
    import bpy as _b
    _b.ops.mesh.primitive_uv_sphere_add(radius=5, location=(0, 10, 18), segments=24, ring_count=12)
    env = _b.context.active_object
    env.scale = (1, 1, 1.15)
    faceted(env, "hull_lit", "hull", "hull_shade")
    ink(env, 0.5)
    box("line", -0.15, 2.4, 0.3, 10, d=0.3, y=10, colours=("steel",) * 3, outline=0)
    box("sonde", -1.2, 0, 2.4, 2.4, d=2.4, y=9, colours=("trim_blue", "trim_blue", "trim_blue_dark"), outline=0.4)
    camera_for(-7, 7, screen_v(9, 0) - 0.5)
    return "balloon"


def build_far_rocket():
    """Another agency's rocket, seen tiny on the horizon: white body, dark interstage. The game adds the plume."""
    reset_scene()
    cylinder("body", 0, 0, 1.2, 14, y=5, colours=("hull_lit", "hull", "hull_shade"), outline=0.3, verts=10)
    box("stage", -1.25, 6, 2.5, 1.2, d=2.5, y=3.8, colours=("steel_dark",) * 3, outline=0)
    prism("nose", [(-1.2, 14), (1.2, 14), (0, 17)], 2.4, y=3.8, colours=("hull_lit", "hull", "hull_shade"), outline=0.3)
    camera_for(-3, 3, screen_v(5, 0) - 0.5)
    return "far-rocket"


# ---------------------------------------------------------------- biome variants (Liam, 14 Oct: "Real variants")
# Every landscape is flat launch-range land. Only the horizon objects, the ground details and the weather change.

LAND = {
    # Sandstone buttes and dunes of a Gobi range (Jiuquan): muted rose-tan, never orange.
    "desert": {"cap": "#c8a892", "cap_lit": "#dcc0ac", "face": "#b08f7c", "face_lit": "#c3a28e", "face_shade": "#94766a",
               "band": "#9a7b6d", "talus": "#c2ab8e", "talus_shade": "#a69174",
               "sand": "#dcc8a2", "sand_lit": "#ebdcbc", "sand_shade": "#c1a983"},
    # Snow ridges of a northern range (Plesetsk, Andoya).
    "tundra": {"snow": "#eef3f8", "snow_lit": "#fbfdff", "snow_shade": "#c8d6e4", "ice": "#a9c8dd", "rock": "#7f8a96"},
    # Headland and dunes of a coastal range (Canaveral, Kourou).
    "coast": {"cliff": "#8e9aa6", "cliff_lit": "#aeb8c2", "cliff_shade": "#6f7b88", "top": "#bfb38f", "sand": "#e2d6b6", "sand_lit": "#efe6cf", "sand_shade": "#c9ba94"},
}


def _haze_tone(hex_value, depth):
    haze, k = HAZE[depth]
    return _mix_hex(hex_value, haze, k)


def _p(name, hex_value):
    PALETTE[name] = hex_value
    return name


def build_butte(shape="a", depth="far", seed=4):
    """Desert buttes: the escarpment build with sandstone tones."""
    saved = dict(STEPPE)
    for k, v in LAND["desert"].items():
        if k in STEPPE:
            STEPPE[k] = v
    try:
        name = build_escarpment(shape, depth, seed)
    finally:
        STEPPE.clear(); STEPPE.update(saved)
    return name.replace("escarpment", "butte")


def _dune_height(x, dunes):
    """Upper envelope of dunes: each a convex windward rise (left) and a steep lee drop (right)."""
    best = 0.0
    for cx, h, wl, wr in dunes:
        if cx - wl <= x <= cx:
            t = (x - (cx - wl)) / wl
            best = max(best, h * math.sin(t * math.pi / 2) ** 1.3)
        elif cx < x <= cx + wr:
            t = (x - cx) / wr
            best = max(best, h * (1 - t) ** 2.2)
    return best


def _dune_row(rng, width, height, n):
    dunes = []
    for i in range(n):
        cx = (i + rng.uniform(0.25, 0.85)) * width / n
        h = height * rng.uniform(0.45, 1.0)
        dunes.append((cx, h, rng.uniform(0.7, 1.2) * width / n, rng.uniform(0.18, 0.32) * width / n))
    return dunes


def snow_or_sand_soft(kind):
    return kind == "snow"


def build_ridge(kind="dune", depth="mid", seed=9):
    """Long low ridge (desert dune, coastal dune or snow pressure ridge): lit windward faces, shaded lee faces."""
    reset_scene()
    rng = random.Random(seed + len(kind) * 7 + (0 if depth == "mid" else 3))
    width, height, n = (300.0, 14.0, 4) if depth == "mid" else (360.0, 10.0, 6)
    if kind == "snow":
        lit, mid, shade = LAND["tundra"]["snow_lit"], LAND["tundra"]["snow"], LAND["tundra"]["snow_shade"]
    elif kind == "coast-dune":
        lit, mid, shade = LAND["coast"]["sand_lit"], LAND["coast"]["sand"], LAND["coast"]["sand_shade"]
    else:
        lit, mid, shade = LAND["desert"]["sand_lit"], LAND["desert"]["sand"], LAND["desert"]["sand_shade"]
    lit_t, mid_t, shade_t = (_p(f"r_lit_{depth}", _haze_tone(lit, depth)), _p(f"r_mid_{depth}", _haze_tone(mid, depth)), _p(f"r_shade_{depth}", _haze_tone(shade, depth)))
    back_t = _p(f"r_back_{depth}", _haze_tone(_mix_hex(mid, HAZE["far"][0], 0.25), depth))
    prism("base", [(0, 0), (width, 0), (width, height * 0.25), (0, height * 0.25)], 0.2, y=0.4, colours=(mid_t,) * 3, outline=0)
    pts = []
    # Two rows: a taller hazier row behind, a nearer row in front; each sampled every 2 units.
    for row, (scale, yoff, ndunes) in enumerate(((1.0, 0.3, n), (0.6, -0.1, n + 2))):
        dunes = _dune_row(rng, width, height * scale, ndunes)
        samples = [(x, _dune_height(x, dunes) + (height * 0.12 if snow_or_sand_soft(kind) else 0)) for x in [k * 2.0 for k in range(int(width / 2) + 1)]]
        if row == 1:
            pts = samples
        for k, (a, b) in enumerate(zip(samples, samples[1:])):
            slope = (b[1] - a[1]) / 2.0
            if row == 0:
                tone = back_t
            else:
                tone = lit_t if slope > 0.05 else (shade_t if slope < -0.35 else mid_t)
            prism(f"r{row}f{k}", [(a[0], 0), (b[0], 0), b, a], 0.2, y=yoff - 0.001 * k, colours=(tone,) * 3, outline=0)
    if kind == "snow":
        # Sastrugi: thin wind-cut lines across the lit faces.
        for i in range(int(width / 18)):
            x = rng.uniform(4, width - 4)
            z = rng.uniform(height * 0.15, height * 0.5)
            prism(f"sas{i}", [(x, z), (x + rng.uniform(5, 10), z + 0.3), (x + rng.uniform(5, 10), z + 0.7), (x, z + 0.5)], 0.2, y=-0.3, colours=(shade_t,) * 3, outline=0)
    if kind == "coast-dune":
        for i in range(int(width / 9)):
            x = rng.uniform(2, width - 2)
            crest = next((z for px, z in pts if px >= x), height * 0.4)
            prism(f"marram{i}", _spikes(x, crest * rng.uniform(0.5, 0.9), 1.6, 2.4), 0.2, y=-0.4, colours=(_p(f"marram_{depth}", _haze_tone("#c4b98a", depth)),) * 3, outline=0)
    camera_for(-4, width + 4, -0.5)
    return f"{kind}-ridge-{depth}"


def build_headland(depth="far", seed=12):
    """Coastal headland: the escarpment build in grey cliff rock with a straw-grass top, dropping to the sea on
    its right. No lighthouse: nothing built stands in the background."""
    c = LAND["coast"]
    swap = {"cap": c["top"], "cap_lit": "#d3c9a4", "face": c["cliff"], "face_lit": c["cliff_lit"], "face_shade": c["cliff_shade"],
            "band": "#7d8995", "talus": "#9aa3ab", "talus_shade": "#7f8891"}
    saved = dict(STEPPE)
    STEPPE.update(swap)
    try:
        build_escarpment("headland", depth, seed)
    finally:
        STEPPE.clear(); STEPPE.update(saved)
    return f"headland-{depth}"


def build_drift(kind="sand", variant=0):
    """A low drift lying on the paving: sand or snow blown against the apron."""
    reset_scene()
    rng = random.Random(30 + variant + (7 if kind == "snow" else 0))
    w = (26.0, 18.0)[variant]
    if kind == "snow":
        lit, mid, shade = LAND["tundra"]["snow_lit"], LAND["tundra"]["snow"], LAND["tundra"]["snow_shade"]
    else:
        lit, mid, shade = LAND["desert"]["sand_lit"], LAND["desert"]["sand"], LAND["desert"]["sand_shade"]
    pts = [(-w / 2, 0)]
    for k in range(1, 8):
        x = -w / 2 + w * k / 8
        pts.append((x, (1 - abs(x) / (w / 2)) ** 0.7 * rng.uniform(1.2, 2.2)))
    pts.append((w / 2, 0))
    prism("drift", pts, 10, y=STRUCT_Y - 2, colours=(_p("dr_lit", lit), _p("dr_mid", mid), _p("dr_shade", shade)), outline=0.35)
    camera_for(-w / 2 - 2, w / 2 + 2, screen_v(STRUCT_Y - 2, 0) - 0.3)
    return f"{kind}-drift-{variant}"


def build_scrub(kind="saxaul"):
    """Ground-level plant for a landscape: saxaul (desert), dune grass (coast), snow tuft (tundra)."""
    reset_scene()
    rng = random.Random(len(kind))
    if kind == "saxaul":
        colours = (_p("sx_lit", "#b8ad8c"), _p("sx_mid", "#9b9174"), _p("sx_dark", "#7a725b"))
        for i in range(5):
            x = rng.uniform(-4, 4)
            r = rng.uniform(2.2, 3.4)
            top = [(x + r * math.cos(a), r * 0.6 + r * 0.5 * math.sin(a)) for a in [t * math.pi / 8 for t in range(9)]]
            prism(f"clump{i}", [(x + r, 0.4)] + top + [(x - r, 0.4)], r, y=STRUCT_Y + 2 + i * 0.1, colours=colours, outline=0.4)
        prism("trunk", [(-0.5, 0), (0.5, 0), (0.3, 1.5), (-0.3, 1.5)], 0.6, y=STRUCT_Y + 1.9, colours=("soil_dark",) * 3, outline=0.3)
        half = 8
    elif kind == "dune-grass":
        saved = dict(STEPPE)
        STEPPE.update({"grass": "#cfc597", "grass_lit": "#e0d8ae", "grass_shade": "#ada476"})
        try:
            build_tussock(2)
        finally:
            STEPPE.clear(); STEPPE.update(saved)
        return "dune-grass"
    else:
        colours = (_p("ib_lit", LAND["tundra"]["snow_lit"]), _p("ib_mid", LAND["tundra"]["ice"]), _p("ib_dark", "#88aac2"))
        prism("ice", _chunk(0, 0, 6, 6, 0.6), 6, y=STRUCT_Y + 2, colours=colours, outline=0.4)
        prism("cap", [(-5.5, 3.5), (-2, 6), (2.5, 5.2), (5.6, 2.4), (4, 3.4), (-3, 4.6)], 0.4, y=STRUCT_Y + 1.6, colours=(_p("ib_snow", LAND["tundra"]["snow_lit"]),) * 3, outline=0)
        half = 8
    camera_for(-half, half, screen_v(STRUCT_Y + 2, 0) - 0.3)
    return kind
