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
