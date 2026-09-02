"""Earth Base module kit — small composable Blender sprites, not building stickers.

KES-260 follow-up. The previous structures renderer produced a complete launch
complex and a complete hangar as two large transparent PNGs. Even with a shared
camera, that made them read like objects placed in front of the landscape.

This file deliberately emits the components of a site separately: foundations,
tower, cradle, service yard, hangar shell, roof and workshop. React composes
them at the same baseline as the terrain bricks. That lets the Hub's wide view
and the Launchpad's close view use the same physical pieces at different scales
instead of swapping between unrelated illustrations.

Art rules: side-on 2.5D camera, chunky faceted volume, hard outlines, irregular
Crashlands-inspired silhouettes, and visible utility details. There are no white
rectangular rafts, suspended cutaways, or decorative blur shadows.
"""

import math

import landnam_kit as kit

T = kit.TOKENS
INK = T["hull_dark"]
# The hub_light palette's `steel` token is intentionally chalk-white for UI
# accents. It is the wrong material for a building: using it made every deck
# look like the old white launchpad sticker. Structural steel stays in the
# terrain's blue-gray hull range; only tiny safety marks use the amber token.
STEEL = kit.tint(T["hull"], 0.88)
STEEL_DARK = kit.tint(T["hull_dark"], 0.92)
RUST = T["rust"]
SAFETY = kit.tint(T["amber"], 0.78)
GLASS = T["cyan"]
GLASS_LIT = T["cyan_bright"]
ROCK = kit.tint(T["hull"], 0.68)
ROCK_DARK = kit.tint(T["hull_dark"], 0.76)
OUTLINE = 0.012
FINE = 0.006


def spec(w, h, target_z=None):
    return dict(layout=(round(w * 30), round(h * 30)), ortho=max(w, h), mode="side",
                target=(0, 0, target_z if target_z is not None else h * 0.42))


def solid(name, obj, color, key="site", outline=OUTLINE):
    return kit.solid(name, obj, color, key, outline=outline)


def box(name, size, location, color, key="site", rotation=(0, 0, 0), bevel=0.04, outline=OUTLINE):
    return solid(name, kit.box(name, size, location=location, rotation=rotation, bevel=bevel), color, key, outline)


def beam(name, x, z, length, angle, thickness=0.13, color=INK, key="ink"):
    return box(name, (length, 0.16, thickness), (x, -0.08, z), color, key,
               rotation=(0, angle, 0), bevel=thickness * 0.18, outline=FINE)


def cylinder(name, radius, height, location, color, key="site", outline=OUTLINE, verts=8):
    return solid(name, kit.cylinder(name, radius, height, location=location, verts=verts), color, key, outline)


def slab(name, w, x=0, z=0, depth=0.9, color=ROCK):
    # The first pass used a pale concrete slab and read as a white sticker.
    # Foundations are now dark basalt/steel so the terrain remains the visual
    # parent and the structure grows out of it.
    box(name, (w, depth, 0.20), (x, 0.04, z), INK, "ground", bevel=0.08)
    box(f"{name}_lip", (w * 0.90, depth * 0.72, 0.06), (x, -0.18, z + 0.20), INK, "ink", bevel=0.02, outline=FINE)


def pad_foundation():
    """Low, broken concrete hardstand with a flame trench and approach road."""
    w, h = 11.0, 1.8
    slab("pad_hardstand", 9.7, x=-0.35, z=0.12, depth=1.3, color=STEEL_DARK)
    # Stepped berms make contact with the landscape rather than a floating card.
    for i, (x, width, rise) in enumerate(((-4.65, 1.5, 0.05), (-2.9, 2.1, 0.0), (2.6, 2.5, 0.03), (4.8, 1.3, 0.08))):
        box(f"berm_{i}", (width, 0.75, 0.18), (x, 0.12, rise), ROCK, "ground", bevel=0.09)
    box("flame_trench", (2.1, 0.72, 0.30), (0.15, -0.12, 0.34), INK, "ink", bevel=0.09)
    for x in (-0.55, 0.0, 0.55):
        beam("trench_grate", x, 0.57, 0.42, 0.0, 0.06, STEEL, "steel")
    # Short, non-continuous safety marks: legible at game scale, not a white deck.
    for x in (-3.8, -3.15, 3.0, 3.65):
        beam("safety_mark", x, 0.49, 0.34, 0.0, 0.06, SAFETY, "safety")
    return spec(w, h, 0.65)


def pad_tower():
    """Asymmetric launch gantry with a single service deck, not a stack of white shelves."""
    w, h = 5.6, 7.5
    for x, lean in ((-1.55, -0.08), (1.28, 0.06)):
        box("gantry_leg", (0.30, 0.34, 6.05), (x, 0.06, 0.24), INK, "ink", rotation=(0, lean, 0), bevel=0.06, outline=FINE)
    # One offset deck and a heavy upper service bridge establish the silhouette.
    box("gantry_deck", (3.15, 0.70, 0.22), (-0.04, -0.06, 1.42), ROCK_DARK, "steel", bevel=0.06)
    box("gantry_bridge", (2.65, 0.62, 0.24), (0.18, -0.03, 4.92), STEEL_DARK, "steel", bevel=0.06)
    for x in (-1.1, -0.05, 1.02):
        beam("gantry_guard", x, 1.78, 0.66, 0, 0.07, SAFETY, "safety")
    for level, z in enumerate((0.72, 2.62, 3.78, 5.18)):
        beam("gantry_cross", -0.12, z, 2.34 if level % 2 else 2.12, 0.60 if level % 2 else -0.60, 0.12, STEEL, "steel")
    box("gantry_control", (1.02, 0.70, 0.88), (-0.20, 0.01, 5.72), RUST, "rust", bevel=0.10)
    for x in (-0.55, -0.16, 0.23):
        box("gantry_window", (0.20, 0.06, 0.22), (x, -0.42, 6.03), GLASS_LIT, "glass", bevel=0.02, outline=FINE)
    box("gantry_crown", (1.85, 0.78, 0.26), (0.02, 0.04, 6.84), RUST, "rust", rotation=(0, -0.04, 0), bevel=0.08)
    beam("gantry_aerial", 1.04, 7.18, 0.62, 0.18, 0.06, STEEL, "steel")
    return spec(w, h, 3.35)


def pad_cradle():
    """Stowed strongback and umbilicals. Its empty centre is intentional."""
    w, h = 5.2, 5.3
    box("strongback_low", (0.54, 0.74, 2.4), (1.45, 0.08, 0.24), INK, "ink", rotation=(0, -0.10, 0), bevel=0.08)
    box("strongback_high", (0.44, 0.68, 2.25), (1.17, 0.08, 2.55), RUST, "rust", rotation=(0, -0.17, 0), bevel=0.08)
    beam("umbilical_upper", -0.45, 3.45, 2.85, 0.08, 0.22, RUST, "rust")
    box("umbilical_upper_head", (0.42, 0.52, 0.54), (-1.82, -0.10, 3.18), SAFETY, "safety", rotation=(0, 0.08, 0), bevel=0.07)
    beam("umbilical_lower", -0.25, 2.12, 2.30, -0.10, 0.18, RUST, "rust")
    box("umbilical_lower_head", (0.46, 0.48, 0.44), (-1.36, -0.10, 1.92), SAFETY, "safety", rotation=(0, -0.10, 0), bevel=0.07)
    for x, z, angle in ((0.1, 1.38, 0.22), (0.60, 1.20, -0.18), (-0.85, 1.05, 0.08)):
        beam("umbilical_hose", x, z, 0.95, angle, 0.07, GLASS, "glass")
    for x, lean in ((-0.54, -0.24), (0.58, 0.24)):
        box("hold_down", (0.28, 0.42, 0.78), (x, -0.22, 0.48), STEEL_DARK, "steel", rotation=(0, lean, 0), bevel=0.05)
    return spec(w, h, 2.4)


def pad_service():
    """Propellant tanks, cable mast and service cart—not a second building."""
    w, h = 5.8, 5.7
    for x, radius, height in ((-1.35, 0.56, 1.85), (0.05, 0.74, 2.65), (1.52, 0.42, 1.40)):
        cylinder("service_tank", radius, height, (x, 0.10, 0.24), STEEL, "steel", verts=9)
        dome = kit.cone("service_tank_dome", radius, radius * 0.55, location=(x, 0.10, 0.24 + height), verts=9, radius2=radius * 0.35)
        solid("service_tank_dome", dome, STEEL_DARK, "steel")
        cylinder("service_tank_band", radius * 1.03, 0.11, (x, 0.10, 0.24 + height * 0.55), RUST, "rust", outline=0, verts=9)
    beam("service_pipe", -0.55, 1.20, 2.45, 0, 0.12, SAFETY, "safety")
    beam("service_pipe", -1.65, 0.98, 1.10, -0.35, 0.10, SAFETY, "safety")
    box("service_mast", (0.16, 0.20, 4.25), (2.36, 0.10, 0.24), INK, "ink", rotation=(0, -0.04, 0), bevel=0.02, outline=FINE)
    tip = kit.cone("service_mast_tip", 0.16, 0.48, location=(2.18, 0.10, 4.54), verts=6, radius2=0.02)
    solid("service_mast_tip", tip, SAFETY, "safety", FINE)
    box("service_cart", (0.74, 0.52, 0.38), (-2.35, -0.20, 0.45), RUST, "rust", bevel=0.08)
    for x in (-2.58, -2.12):
        cylinder("cart_wheel", 0.14, 0.12, (x, -0.46, 0.28), INK, "ink", FINE, verts=8)
    return spec(w, h, 2.25)


def hangar_foundation():
    w, h = 11.0, 1.7
    slab("hangar_apron", 10.1, x=0, z=0.12, depth=1.35, color=STEEL_DARK)
    box("hangar_entry_ramp", (3.1, 1.0, 0.16), (-1.1, -0.15, 0.34), ROCK, "ground", bevel=0.07)
    for x in (-3.8, -3.1, 2.85, 3.55):
        beam("hangar_mark", x, 0.51, 0.34, 0, 0.06, SAFETY, "safety")
    return spec(w, h, 0.62)


def hangar_shell():
    """A low, stepped hangar bunker with an open service mouth."""
    w, h = 10.2, 7.4
    box("hangar_spine", (0.86, 0.95, 5.4), (-4.25, 0.06, 0.24), RUST, "rust", bevel=0.08)
    box("hangar_left_jamb", (0.55, 0.82, 4.55), (-3.22, 0.05, 0.24), INK, "ink", bevel=0.07)
    box("hangar_right_jamb", (0.58, 0.84, 4.15), (2.62, 0.05, 0.24), INK, "ink", bevel=0.07)
    box("hangar_right_annex", (2.10, 0.90, 2.65), (3.88, 0.06, 0.24), INK, "ink", bevel=0.08)
    box("hangar_annex_roof", (2.40, 1.02, 0.26), (3.80, 0.06, 2.96), INK, "ink", rotation=(0, 0.09, 0), bevel=0.05)
    for x in (3.18, 3.80, 4.42):
        box("hangar_annex_window", (0.27, 0.06, 0.30), (x, -0.46, 1.45), GLASS_LIT, "glass", bevel=0.02, outline=FINE)
    # Overhead segmented door stops short of the floor so the bay has a readable opening.
    for i, (z, width) in enumerate(((4.30, 5.85), (4.62, 5.55), (4.94, 5.16))):
        box("hangar_door", (width, 0.20, 0.24), (-0.28 + i * 0.05, -0.42, z), INK if i != 1 else RUST, "rust" if i == 1 else "ink", bevel=0.04, outline=FINE)
    return spec(w, h, 3.05)


def hangar_roof():
    w, h = 10.8, 4.4
    # Two mis-matched roof planes make a workshop compound rather than an icon.
    box("hangar_roof_left", (5.25, 1.06, 0.28), (-2.10, 0.04, 3.25), INK, "ink", rotation=(0, -0.24, 0), bevel=0.06)
    box("hangar_roof_right", (4.55, 1.06, 0.28), (2.45, 0.04, 3.10), INK, "ink", rotation=(0, 0.19, 0), bevel=0.06)
    box("hangar_ridge", (0.66, 1.10, 0.56), (0.28, 0.05, 3.64), RUST, "rust", rotation=(0, -0.05, 0), bevel=0.08)
    for x in (-2.8, -1.65, 1.20, 2.55):
        beam("roof_rib", x, 3.14, 0.62, -0.24 if x < 0 else 0.19, 0.07, STEEL, "steel")
    return spec(w, h, 2.1)


def hangar_workshop():
    """The visible machinery that makes the open bay legible as a hangar."""
    w, h = 7.0, 5.1
    beam("workshop_crane", -0.30, 3.42, 5.35, 0, 0.28, SAFETY, "safety")
    box("workshop_trolley", (0.74, 0.44, 0.46), (0.42, -0.22, 2.98), RUST, "rust", bevel=0.07)
    beam("workshop_hook_line", 0.42, 2.30, 1.15, 1.5708, 0.05, GLASS, "glass")
    box("workshop_hook", (0.24, 0.20, 0.30), (0.42, -0.24, 1.76), STEEL_DARK, "steel", bevel=0.04, outline=FINE)
    for x, width in ((-2.05, 1.15), (-0.55, 1.25), (1.32, 1.05)):
        box("workshop_bench", (width, 0.36, 0.22), (x, -0.28, 0.62), RUST, "rust", bevel=0.04, outline=FINE)
        box("workshop_toolbox", (0.42, 0.22, 0.30), (x + width * 0.17, -0.42, 0.83), GLASS, "glass", bevel=0.03, outline=FINE)
    for x in (-2.55, -1.16, 0.28, 1.72):
        box("workshop_light", (0.40, 0.10, 0.16), (x, -0.48, 2.73), GLASS_LIT, "glass", bevel=0.02, outline=0)
    return spec(w, h, 2.1)


def outpost():
    """Small support facility used for non-launchpad buildings in the Hub."""
    w, h = 5.1, 4.6
    slab("outpost_footing", 4.6, z=0.12, depth=1.05, color=STEEL_DARK)
    box("outpost_body", (2.85, 0.92, 1.70), (-0.45, 0.06, 0.34), STEEL, "steel", bevel=0.08)
    box("outpost_roof", (3.18, 1.02, 0.28), (-0.45, 0.06, 2.10), INK, "ink", rotation=(0, -0.08, 0), bevel=0.05)
    cylinder("outpost_stack", 0.28, 2.85, (1.60, 0.08, 0.34), RUST, "rust", verts=8)
    beam("outpost_conveyor", -2.15, 0.95, 1.95, 0.25, 0.17, INK, "ink")
    for x in (-1.25, -0.62, 0.01):
        box("outpost_window", (0.28, 0.06, 0.28), (x, -0.45, 1.18), GLASS_LIT, "glass", bevel=0.02, outline=FINE)
    return spec(w, h, 1.8)


BUILDS = {
    "base/pad_foundation": pad_foundation,
    "base/pad_tower": pad_tower,
    "base/pad_cradle": pad_cradle,
    "base/pad_service": pad_service,
    "base/hangar_foundation": hangar_foundation,
    "base/hangar_shell": hangar_shell,
    "base/hangar_roof": hangar_roof,
    "base/hangar_workshop": hangar_workshop,
    "base/outpost": outpost,
}
