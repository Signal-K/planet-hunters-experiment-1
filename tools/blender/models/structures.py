"""Earth Base hero structures — launchpad and hangar, single-mass sprites.

Supersedes `world_modules.py`'s composited-fragment kit (KES-260/KES-277). That
kit rendered ~9 pieces separately and absolute-positioned them in CSS; each
piece in isolation was a sparse skeleton of thin rods over empty transparent
space, and the composited result read as debris rather than a building — the
"massive regression" feedback that ended that experiment.

Every structure here is ONE Blender scene, ONE render, same pattern as
`ships.py`/`rooms.py` (already a proven quality bar in this pipeline — a ship
renders as one dense, cohesive mass with no gaps). Parts must touch or overlap
their neighbours; nothing floats in isolation. See the ZenNotes decision
"Landnam Earth Base structure art — single-mass render standard" for the full
reference synthesis (Out There: Omega staging, Take On Mars industrial tone,
Crashlands silhouette density, Pixel Starships panel-block surface language).

Ground contact rule (the original KES-260 bug): every structure sits on a flat
or evenly-tapered footing at its own z=0. No rock/grass/soil geometry here —
that is the scene terrain's job, never the structure's.
"""

import landnam_kit as kit

T = kit.TOKENS
INK = T["hull_dark"]
STEEL = kit.tint(T["hull"], 0.88)
STEEL_DARK = kit.tint(T["hull_dark"], 0.92)
RUST = T["rust"]
SAFETY = kit.tint(T["amber"], 0.78)
GLASS = T["cyan"]
GLASS_LIT = T["cyan_bright"]
PLATE = kit.tint(T["hull"], 0.78)
PLATE_DARK = kit.tint(T["hull_dark"], 0.84)
OUTLINE = 0.014
FINE = 0.007


def spec(w, h, target_z=None):
    return dict(layout=(round(w * 30), round(h * 30)), ortho=max(w, h), mode="side",
                target=(0, 0, target_z if target_z is not None else h * 0.42))


def solid(name, obj, color, key="site", outline=OUTLINE):
    return kit.solid(name, obj, color, key, outline=outline)


def box(name, size, location, color, key="site", rotation=(0, 0, 0), bevel=0.05, outline=OUTLINE):
    return solid(name, kit.box(name, size, location=location, rotation=rotation, bevel=bevel), color, key, outline)


def beam(name, x, z, length, angle, thickness=0.16, color=INK, key="ink"):
    return box(name, (length, 0.20, thickness), (x, -0.09, z), color, key,
               rotation=(0, angle, 0), bevel=thickness * 0.2, outline=FINE)


def cylinder(name, radius, height, location, color, key="site", outline=OUTLINE, verts=9):
    return solid(name, kit.cylinder(name, radius, height, location=location, verts=verts), color, key, outline)


def launchpad():
    """Solid tapered launch tower fused to a wide flat hardstand. One mass —
    the deck, the tower and the fuel tanks all touch or overlap each other so
    the render has no dead transparent gaps between them."""
    w, h = 6.4, 8.2

    # Hardstand: one flat slab, dead-flat bottom edge, no terrain baked in.
    box("pad_deck", (6.0, 2.0, 0.34), (0, 0.0, 0.0), PLATE_DARK, "steel", bevel=0.10)
    box("pad_deck_lip", (5.5, 1.7, 0.10), (0, -0.16, 0.34), INK, "ink", bevel=0.03, outline=FINE)
    for x in (-2.1, -1.15, 1.05, 2.0):
        box("pad_mark", (0.55, 0.08, 0.05), (x, -0.55, 0.45), SAFETY, "safety", bevel=0.01, outline=0)

    # Tower core: three overlapping tapering blocks fused into the deck — no
    # gap between deck top (z=0.44) and tower base.
    box("tower_base", (2.3, 1.55, 2.05), (-0.55, 0.05, 0.44), INK, "ink", bevel=0.10)
    box("tower_mid", (1.75, 1.25, 2.55), (-0.45, 0.06, 2.35), STEEL_DARK, "steel", bevel=0.09)
    box("tower_upper", (1.30, 1.00, 2.15), (-0.35, 0.05, 4.75), INK, "ink", bevel=0.08)

    # Service ring wraps the base/mid seam — wide flat platform overlapping
    # both blocks, plus solid rail panels (not free rods) so the silhouette
    # stays chunky instead of skeletal.
    box("tower_ring", (2.7, 1.65, 0.30), (-0.50, -0.04, 2.35), PLATE, "steel", bevel=0.06)
    for x in (-1.55, -0.55, 0.35):
        box("tower_rail", (0.85, 0.20, 0.55), (x, -0.78, 2.80), SAFETY, "safety", bevel=0.06)

    # Diagonal braces run against the core mass, not through open air.
    for x, z, length, angle in ((-1.35, 1.35, 2.35, 0.52), (0.35, 1.35, 2.35, -0.52)):
        beam("tower_brace", x, z, length, angle, 0.16, STEEL, "steel")

    # Upper cabin, chunky, overlapping the top of tower_upper.
    box("tower_cabin", (1.55, 1.05, 1.05), (-0.35, 0.04, 5.95), RUST, "rust", bevel=0.10)
    for x in (-0.85, -0.35, 0.15):
        box("tower_window", (0.26, 0.06, 0.30), (x, -0.58, 6.22), GLASS_LIT, "glass", outline=FINE, bevel=0.02)
    box("tower_crown", (1.05, 0.75, 0.35), (-0.35, 0.03, 6.75), STEEL_DARK, "steel", bevel=0.07)
    beam("tower_aerial", -0.05, 7.35, 0.85, 0.16, 0.07, STEEL, "steel")
    beacon = kit.cylinder("tower_beacon", 0.09, 0.16, location=(0.30, 0.03, 7.55), verts=8)
    solid("tower_beacon", beacon, SAFETY, "safety", FINE)

    # Fuel tanks: overlap the deck edge and sit flush against tower_base so
    # there is no gap between "the tower" and "the tanks".
    for x, radius, height in ((1.55, 0.62, 1.95), (2.55, 0.46, 1.45)):
        cylinder("pad_tank", radius, height, (x, 0.10, 0.44), STEEL, "steel")
        dome = kit.cone("pad_tank_dome", radius, radius * 0.55, location=(x, 0.10, 0.44 + height), verts=9, radius2=radius * 0.3)
        solid("pad_tank_dome", dome, STEEL_DARK, "steel")
        cylinder("pad_tank_band", radius * 1.03, 0.12, (x, 0.10, 0.44 + height * 0.55), RUST, "rust", outline=0)
    beam("pad_tank_pipe", 1.10, 0.85, 0.95, -0.05, 0.13, SAFETY, "safety")

    return spec(w, h, 3.3)


def hangar():
    """One continuous hangar volume: solid main bay fused to a lower roof
    plane and a workshop annex, all overlapping — no isolated corner posts."""
    w, h = 10.6, 6.4

    # Foundation: flat apron, dead-flat bottom, no terrain baked in.
    box("hangar_apron", (10.0, 2.2, 0.34), (0, 0.0, 0.0), PLATE_DARK, "steel", bevel=0.10)
    box("hangar_apron_lip", (9.4, 1.85, 0.10), (0, -0.16, 0.34), INK, "ink", bevel=0.03, outline=FINE)
    for x in (-3.6, -2.9, 2.6, 3.3):
        box("hangar_mark", (0.55, 0.08, 0.05), (x, -0.6, 0.45), SAFETY, "safety", bevel=0.01, outline=0)

    # Main bay: one solid bunker mass, overlapping the apron.
    box("hangar_bay", (7.4, 2.0, 3.6), (-0.6, 0.02, 0.40), INK, "ink", bevel=0.11)
    # Recessed door panel — a darker inset block set INTO the bay face, not a
    # gap, so the opening reads without punching a hole in the silhouette.
    box("hangar_door", (4.6, 0.30, 2.9), (-0.9, -0.86, 0.44), STEEL_DARK, "steel", bevel=0.07)
    for i, z in enumerate((0.95, 1.75, 2.55)):
        box("hangar_door_seam", (4.5, 0.06, 0.10), (-0.9, -1.0, z), INK, "ink", bevel=0.01, outline=FINE)

    # Right annex: overlaps the main bay directly, taller half-step massing
    # (Pixel Starships block language) instead of a floating extra box.
    box("hangar_annex", (2.5, 1.9, 2.5), (3.55, 0.03, 0.40), STEEL_DARK, "steel", bevel=0.10)
    for x in (3.05, 3.55, 4.05):
        box("hangar_annex_window", (0.32, 0.06, 0.34), (x, -0.55, 1.55), GLASS_LIT, "glass", bevel=0.02, outline=FINE)

    # Roof: two overlapping planes fused directly onto the bay/annex tops —
    # no gap between wall-top and roof-bottom.
    box("hangar_roof_main", (7.9, 2.15, 0.32), (-0.6, 0.0, 3.90), RUST, "rust", rotation=(0, -0.05, 0), bevel=0.07)
    box("hangar_roof_annex", (2.85, 2.05, 0.30), (3.55, 0.01, 3.15), RUST, "rust", rotation=(0, 0.06, 0), bevel=0.07)
    box("hangar_ridge", (0.85, 2.20, 0.55), (-0.6, -0.02, 4.15), STEEL_DARK, "steel", bevel=0.08)
    for x in (-2.9, -1.5, 0.7, 2.05):
        beam("roof_rib", x, 3.75, 0.75, 0, 0.09, STEEL, "steel")

    # Roof vent stack, fused to the roof plane — a small silhouette break
    # instead of the crane, which read as a stray plank at this camera angle.
    box("hangar_vent", (0.55, 0.55, 0.65), (-2.0, 0.0, 4.20), STEEL_DARK, "steel", bevel=0.06)
    cyl = kit.cylinder("hangar_vent_pipe", 0.12, 0.55, (-2.0, 0.0, 4.85), verts=8)
    solid("hangar_vent_pipe", cyl, SAFETY, "safety", FINE)

    # Workshop bench block, fused against the annex base.
    box("hangar_bench", (1.6, 0.5, 0.55), (3.15, -0.30, 0.62), RUST, "rust", bevel=0.06)
    for x in (2.65, 3.15, 3.65):
        box("hangar_light", (0.34, 0.08, 0.14), (x, -0.5, 3.55), GLASS_LIT, "glass", outline=0, bevel=0.02)

    return spec(w, h, 2.55)


BUILDS = {
    "base/launchpad_flat": launchpad,
    "base/hangar_flat": hangar,
}
