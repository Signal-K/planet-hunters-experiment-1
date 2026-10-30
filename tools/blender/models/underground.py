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
    cylinder(f"{name}_body", 0.82, 2.55, (x, -0.78, 1.72), STEEL, f"{name}_steel", verts=12)
    cone(f"{name}_dome", 0.82, 0.48, (x, -0.78, 3.24), STEEL_DARK, f"{name}_dome", radius2=0.24, verts=12)
    cylinder(f"{name}_collar", 0.89, 0.14, (x, -0.78, 1.88), CRIMSON, f"{name}_collar", verts=12, outline=0)
    cylinder(f"{name}_neck", 0.20, 0.30, (x, -0.78, 3.63), WALL_LIT, f"{name}_neck", verts=8)
    # Front-facing fill window. It is a solid inset panel, not a CSS meter.
    box(f"{name}_window", (0.56, 0.045, 1.72), (x, -1.53, 1.58), INK, f"{name}_window", bevel=0.03, outline=0)
    box(f"{name}_fill", (0.42, 0.055, fill_height), (x, -1.565, 0.72 + fill_height / 2), fill_color, f"{name}_fill", bevel=0.018, outline=0)
    box(f"{name}_cap", (0.60, 0.07, 0.07), (x, -1.585, 0.72 + fill_height), CYAN_BRIGHT, f"{name}_cap", bevel=0.01, outline=0)


def subsurface_cutaway():
    # The frame is a compact cutaway card, but its interior is a single joined
    # industrial structure with no isolated decorative fragments.
    box("cutaway_mass", (5.80, 0.70, 3.80), (0, 0.25, 2.02), WALL, "cutaway_wall", bevel=0.10)
    box("cutaway_shadow", (5.20, 0.08, 2.72), (0, -0.17, 1.70), INK, "cutaway_shadow", bevel=0.04, outline=0)

    # Soil and surface continuation. The central opening is carried by the
    # dark shaft and rim, which makes the excavation legible at sprite size.
    box("surface_soil", (6.10, 0.90, 0.34), (0, 0.12, 3.88), SOIL_LIT, "surface_soil", bevel=0.05)
    box("surface_rim", (2.20, 0.98, 0.18), (0, -0.12, 4.10), STEEL_DARK, "surface_rim", bevel=0.03)
    box("surface_opening", (1.38, 0.11, 0.22), (0, -0.67, 4.01), INK, "surface_opening", bevel=0.02, outline=0)
    box("surface_marker", (0.72, 0.06, 0.10), (-2.05, -0.71, 4.13), AMBER, "surface_marker", bevel=0.01, outline=0)

    # Central lift and transfer spine connect the surface to both tanks.
    box("lift_shaft", (0.72, 0.62, 2.98), (0, -0.42, 2.32), STEEL_DARK, "lift_shaft", bevel=0.06)
    box("lift_face", (0.44, 0.05, 2.38), (0, -0.76, 2.32), CYAN, "lift_face", bevel=0.025, outline=0)
    box("lift_door", (0.34, 0.06, 0.82), (0, -0.80, 2.08), WALL_LIT, "lift_door", bevel=0.02, outline=0)
    box("transfer_pipe", (3.80, 0.26, 0.24), (0, -0.70, 3.32), WALL_LIT, "transfer_pipe", bevel=0.08)
    box("transfer_glow", (3.25, 0.04, 0.07), (0, -0.88, 3.32), CYAN_BRIGHT, "transfer_glow", bevel=0.01, outline=0)
    for x in (-1.82, 1.82):
        box("pipe_drop", (0.20, 0.24, 0.54), (x, -0.70, 3.08), WALL_LIT, "pipe_drop", bevel=0.04)

    _silo(-1.50, "left_silo", CYAN, 1.22)
    _silo(1.50, "right_silo", AMBER, 0.76)

    # One broad lower service deck gives the tanks and console a shared base.
    box("service_deck", (4.95, 0.82, 0.26), (0, -0.03, 0.28), STEEL_DARK, "service_deck", bevel=0.06)
    box("service_edge", (4.65, 0.06, 0.08), (0, -0.58, 0.43), CRIMSON, "service_edge", bevel=0.01, outline=0)
    box("crafting_bay", (0.92, 0.72, 0.54), (0, -0.38, 0.76), WALL_LIT, "crafting_bay", bevel=0.08)
    box("crafting_screen", (0.48, 0.04, 0.22), (0, -0.77, 0.84), CYAN_BRIGHT, "crafting_screen", bevel=0.02, outline=0)
    box("crafting_glow", (0.68, 0.05, 0.07), (0, -0.80, 0.52), AMBER, "crafting_glow", bevel=0.01, outline=0)

    # Small chunky braces make the cutaway read as excavated architecture.
    for x in (-2.45, 2.45):
        box("wall_brace", (0.34, 0.36, 2.20), (x, -0.43, 2.05), STEEL_DARK, "wall_brace", bevel=0.04)
        box("wall_light", (0.10, 0.05, 1.40), (x, -0.65, 2.08), AMBER, "wall_light", bevel=0.01, outline=0)

    return dict(layout=(230, 166), ortho=6.2, mode="iso", target=(0, 0, 2.15))


def subsurface_shaft():
    """Lift shaft cap and car, designed to bridge surface and cavern."""
    box("shaft_back", (1.50, 0.48, 4.60), (0, 0.30, 2.30), INK, "shaft_back", bevel=0.08)
    box("shaft_left_rail", (0.14, 0.52, 4.46), (-0.54, -0.02, 2.24), WALL_LIT, "shaft_left_rail", bevel=0.025)
    box("shaft_right_rail", (0.14, 0.52, 4.46), (0.54, -0.02, 2.24), WALL_LIT, "shaft_right_rail", bevel=0.025)
    box("shaft_crossbar", (1.52, 0.58, 0.24), (0, -0.03, 4.33), STEEL_DARK, "shaft_crossbar", bevel=0.05)
    box("shaft_car", (1.06, 0.62, 0.68), (0, -0.28, 2.02), WALL_LIT, "shaft_car", bevel=0.08)
    box("shaft_window", (0.62, 0.04, 0.25), (0, -0.62, 2.12), CYAN_BRIGHT, "shaft_window", bevel=0.02, outline=0)
    box("shaft_door", (0.26, 0.05, 0.37), (0, -0.64, 1.86), STEEL_DARK, "shaft_door", bevel=0.01, outline=0)
    box("shaft_pipe", (0.13, 0.18, 3.70), (0.85, -0.18, 2.34), CYAN, "shaft_pipe", bevel=0.04)
    box("shaft_pipe_cap", (0.36, 0.20, 0.16), (0.85, -0.18, 4.19), AMBER, "shaft_pipe_cap", bevel=0.03)
    box("shaft_lamp", (0.62, 0.06, 0.09), (0, -0.66, 3.36), AMBER, "shaft_lamp", bevel=0.01, outline=0)
    return dict(layout=(86, 204), ortho=5.25, mode="side", target=(0, 0, 2.35))


def _vault_room(name, deep=False):
    """A complete single-mass storage room, with no UI fragments required."""
    width = 4.80 if deep else 4.10
    box(f"{name}_back", (width, 0.56, 2.75), (0, 0.38, 1.55), WALL, f"{name}_back", bevel=0.10)
    box(f"{name}_floor", (width + 0.18, 1.02, 0.28), (0, -0.04, 0.20), STEEL_DARK, f"{name}_floor", bevel=0.06)
    box(f"{name}_header", (width - 0.25, 0.36, 0.22), (0, -0.13, 2.92), WALL_LIT, f"{name}_header", bevel=0.04)
    for x in (-width / 2 + 0.34, width / 2 - 0.34):
        box(f"{name}_support", (0.22, 0.48, 2.52), (x, -0.08, 1.52), STEEL_DARK, f"{name}_support", bevel=0.04)
        box(f"{name}_lamp", (0.12, 0.05, 1.54), (x * 0.93, -0.54, 1.70), AMBER, f"{name}_lamp", bevel=0.01, outline=0)
    tank_xs = (-1.05, 1.05) if not deep else (-1.45, 0, 1.45)
    fill_colours = (CYAN, AMBER, CYAN_BRIGHT)
    for i, x in enumerate(tank_xs):
        radius = 0.55 if deep else 0.65
        cylinder(f"{name}_tank_{i}", radius, 1.70, (x, -0.46, 1.18), STEEL, f"{name}_tank_{i}", verts=10)
        cone(f"{name}_dome_{i}", radius, 0.30, (x, -0.46, 2.18), STEEL_DARK, f"{name}_dome_{i}", radius2=radius * .35, verts=10)
        cylinder(f"{name}_band_{i}", radius * 1.05, 0.10, (x, -0.46, 1.30), CRIMSON, f"{name}_band_{i}", verts=10, outline=0)
        box(f"{name}_level_{i}", (radius * 0.72, 0.05, 0.72 + i * .20), (x, -1.02, 0.75 + (0.72 + i * .20) / 2), fill_colours[i], f"{name}_level_{i}", bevel=0.02, outline=0)
    box(f"{name}_pipe", (width - 0.88, 0.20, 0.18), (0, -0.68, 2.55), WALL_LIT, f"{name}_pipe", bevel=0.06)
    box(f"{name}_flow", (width - 1.20, 0.04, 0.06), (0, -0.82, 2.55), CYAN_BRIGHT, f"{name}_flow", bevel=0.01, outline=0)
    return dict(layout=(166 if deep else 148, 118), ortho=5.35 if deep else 4.75, mode="room", target=(0, 0, 1.58))


def subsurface_vault():
    return _vault_room("vault", deep=False)


def subsurface_deep_vault():
    return _vault_room("deep_vault", deep=True)


def subsurface_parts_locker():
    box("locker_back", (3.80, 0.56, 2.70), (0, 0.38, 1.52), WALL, "locker_back", bevel=0.10)
    box("locker_floor", (4.05, 1.00, 0.28), (0, -0.04, 0.20), STEEL_DARK, "locker_floor", bevel=0.06)
    box("locker_header", (3.48, 0.34, 0.22), (0, -0.12, 2.84), WALL_LIT, "locker_header", bevel=0.04)
    for column, x in enumerate((-1.16, 0, 1.16)):
        box(f"locker_rack_{column}", (0.84, 0.46, 1.90), (x, -0.30, 1.26), STEEL_DARK, f"locker_rack_{column}", bevel=0.03)
        for row, z in enumerate((0.78, 1.35, 1.92)):
            box(f"locker_crate_{column}_{row}", (0.57, 0.42, 0.38), (x, -0.62, z), WALL_LIT if (column + row) % 2 else STEEL, f"locker_crate_{column}_{row}", bevel=0.035)
            box(f"locker_mark_{column}_{row}", (0.20, 0.03, 0.08), (x, -0.85, z), CYAN if row != 1 else AMBER, f"locker_mark_{column}_{row}", bevel=0.01, outline=0)
    box("locker_console", (0.84, 0.62, 0.54), (0, -0.44, 0.74), WALL_LIT, "locker_console", bevel=0.06)
    box("locker_screen", (0.42, 0.04, 0.20), (0, -0.78, 0.85), CYAN_BRIGHT, "locker_screen", bevel=0.02, outline=0)
    box("locker_pipe", (3.10, 0.20, 0.16), (0, -0.68, 2.48), WALL_LIT, "locker_pipe", bevel=0.06)
    return dict(layout=(132, 114), ortho=4.35, mode="room", target=(0, 0, 1.50))


BUILDS = {
    "base/subsurface_cutaway": subsurface_cutaway,
    "base/subsurface_shaft": subsurface_shaft,
    "base/subsurface_vault": subsurface_vault,
    "base/subsurface_deep_vault": subsurface_deep_vault,
    "base/subsurface_parts_locker": subsurface_parts_locker,
}
