"""Subsurface cutaway hero asset.

This is intentionally one dense Blender-authored structure rather than a set
of UI fragments. The PNG is a visual anchor for the subsurface overlay: the
surface opening, lift shaft, transfer line, storage tanks, and crafting bay
all belong to the same cutaway mass.
"""

import math

import landnam_kit as kit

T = kit.TOKENS
INK = T["hull_dark"]
SOIL = kit.tint(T["rust"], 0.82)
SOIL_LIT = kit.tint(T["rust"], 1.12)
WALL = T["hull"]
WALL_LIT = T["steel"]
STEEL = kit.tint(T["steel"], 0.82)
STEEL_DARK = kit.tint(T["hull_dark"], 1.08)
CYAN = T["cyan"]
CYAN_BRIGHT = T["cyan_bright"]
AMBER = T["amber"]
CRIMSON = T["crimson"]


def box(name, size, location, color, key, bevel=0.05, outline=0.014, rotation=(0, 0, 0)):
    obj = kit.box(name, size, location=location, rotation=rotation, bevel=bevel)
    return kit.solid(name, obj, color, key, outline=outline)


def cylinder(name, radius, depth, location, color, key, verts=10, outline=0.014):
    obj = kit.cylinder(name, radius, depth, location=location, verts=verts)
    return kit.solid(name, obj, color, key, outline=outline)


def cone(name, radius, depth, location, color, key, radius2=0.0, verts=10, outline=0.014):
    obj = kit.cone(name, radius, depth, location=location, radius2=radius2, verts=verts)
    return kit.solid(name, obj, color, key, outline=outline)


def _silo(x, name, fill_color, fill_height):
    """Chunky storage vessel with a visible material band and loading neck."""
    cylinder(f"{name}_body", 0.68, 2.45, (x, -0.34, 1.55), STEEL, f"{name}_steel", verts=12)
    cone(f"{name}_dome", 0.68, 0.40, (x, -0.34, 2.98), STEEL_DARK, f"{name}_dome", radius2=0.22, verts=12)
    cylinder(f"{name}_collar", 0.74, 0.12, (x, -0.34, 1.80), CRIMSON, f"{name}_collar", verts=12, outline=0)
    cylinder(f"{name}_neck", 0.18, 0.26, (x, -0.34, 3.26), WALL_LIT, f"{name}_neck", verts=8)
    # Front-facing fill window. It is a solid inset panel, not a CSS meter.
    box(f"{name}_window", (0.48, 0.045, 1.62), (x, -1.02, 1.48), INK, f"{name}_window", bevel=0.03, outline=0)
    box(f"{name}_fill", (0.36, 0.055, fill_height), (x, -1.055, 0.70 + fill_height / 2), fill_color, f"{name}_fill", bevel=0.018, outline=0)
    box(f"{name}_cap", (0.52, 0.07, 0.07), (x, -1.075, 0.70 + fill_height), CYAN_BRIGHT, f"{name}_cap", bevel=0.01, outline=0)


def subsurface_cutaway():
    # The frame is a compact cutaway card, but its interior is a single joined
    # industrial structure with no isolated decorative fragments.
    box("cutaway_mass", (5.80, 0.70, 4.15), (0, 0.25, 2.15), WALL, "cutaway_wall", bevel=0.10)
    box("cutaway_shadow", (5.20, 0.08, 3.45), (0, -0.17, 2.00), INK, "cutaway_shadow", bevel=0.04, outline=0)

    # Soil and surface continuation. The central opening is carried by the
    # dark shaft and rim, which makes the excavation legible at sprite size.
    box("surface_soil", (6.10, 0.90, 0.48), (0, 0.12, 4.15), SOIL_LIT, "surface_soil", bevel=0.05)
    box("surface_rim", (2.20, 0.98, 0.18), (0, -0.12, 4.40), STEEL_DARK, "surface_rim", bevel=0.03)
    box("surface_opening", (1.38, 0.11, 0.22), (0, -0.67, 4.31), INK, "surface_opening", bevel=0.02, outline=0)
    box("surface_marker", (0.72, 0.06, 0.10), (-2.05, -0.71, 4.43), AMBER, "surface_marker", bevel=0.01, outline=0)

    # Central lift and transfer spine connect the surface to both tanks.
    box("lift_shaft", (0.76, 0.62, 3.25), (0, -0.42, 2.38), STEEL_DARK, "lift_shaft", bevel=0.06)
    box("lift_face", (0.48, 0.05, 2.62), (0, -0.76, 2.38), CYAN, "lift_face", bevel=0.025, outline=0)
    box("lift_door", (0.34, 0.06, 0.88), (0, -0.80, 2.18), WALL_LIT, "lift_door", bevel=0.02, outline=0)
    box("transfer_pipe", (3.80, 0.26, 0.28), (0, -0.70, 3.42), WALL_LIT, "transfer_pipe", bevel=0.08)
    box("transfer_glow", (3.25, 0.04, 0.08), (0, -0.88, 3.42), CYAN_BRIGHT, "transfer_glow", bevel=0.01, outline=0)
    for x in (-1.82, 1.82):
        box("pipe_drop", (0.20, 0.24, 0.74), (x, -0.70, 3.02), WALL_LIT, "pipe_drop", bevel=0.04)

    _silo(-1.50, "left_silo", CYAN, 1.22)
    _silo(1.50, "right_silo", AMBER, 0.76)

    # One broad lower service deck gives the tanks and console a shared base.
    box("service_deck", (4.95, 0.82, 0.30), (0, -0.03, 0.38), STEEL_DARK, "service_deck", bevel=0.06)
    box("service_edge", (4.65, 0.06, 0.10), (0, -0.58, 0.55), CRIMSON, "service_edge", bevel=0.01, outline=0)
    box("crafting_bay", (1.10, 0.72, 0.70), (0, -0.38, 0.92), WALL_LIT, "crafting_bay", bevel=0.08)
    box("crafting_screen", (0.55, 0.04, 0.28), (0, -0.77, 1.04), CYAN_BRIGHT, "crafting_screen", bevel=0.02, outline=0)
    box("crafting_glow", (0.78, 0.05, 0.08), (0, -0.80, 0.70), AMBER, "crafting_glow", bevel=0.01, outline=0)

    # Small chunky braces make the cutaway read as excavated architecture.
    for x in (-2.45, 2.45):
        box("wall_brace", (0.34, 0.36, 2.65), (x, -0.43, 2.25), STEEL_DARK, "wall_brace", bevel=0.04)
        box("wall_light", (0.10, 0.05, 1.65), (x, -0.65, 2.28), AMBER, "wall_light", bevel=0.01, outline=0)

    return dict(layout=(230, 166), ortho=6.5, mode="flat", target=(0, 0, 2.25))


BUILDS = {
    "base/subsurface_cutaway": subsurface_cutaway,
}
