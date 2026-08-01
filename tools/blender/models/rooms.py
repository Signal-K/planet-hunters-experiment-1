"""Ship customiser room-slot icons: cockpit, engine, cargo bay, mining/booster.

These are stretched to each slot's own rectangle by `ShipCustomizerCanvas`
(`partSprite.width = pw; partSprite.height = ph`, non-uniform, no aspect
preservation), and slots run as narrow as ~100x213px on screen — so unlike the
ship hulls, exact silhouette fidelity to the original hand-drawn art doesn't
matter here. What matters is one big, unambiguous, colour-coded shape per
room, since anything with multiple same-size details would blur together at
that stretch. Square (64x64) layout throughout; the canvas will distort it to
whatever the slot's aspect actually is.
"""

import landnam_kit as kit

T = kit.TOKENS

LAYOUT = (64, 64)
ORTHO = 2.3


def _frame(hex_str):
    frame = kit.box("frame", (2.0, 0.06, 2.0), location=(0, 0.06, -1.0), bevel=0.08)
    kit.solid("frame", frame, hex_str, "frame", outline=0.02)


def cockpit_t1():
    """Command seat + console — the dominant "pilot" read."""
    _frame(T["surface_3"])
    console = kit.box("console", (1.3, 0.4, 0.55), location=(0, -0.05, -0.55), bevel=0.04)
    kit.solid("console", console, T["hull"], "hull")
    screen = kit.box("screen", (0.85, 0.02, 0.34), location=(0, -0.22, 0.05))
    kit.solid("screen", screen, T["cyan_bright"], "cyanbright", outline=0)
    for i in range(3):
        btn = kit.box("btn", (0.14, 0.02, 0.1), location=(-0.34 + i * 0.34, -0.22, -0.42))
        kit.solid("btn", btn, T["amber"], "amber", outline=0)
    seat = kit.box("seat", (0.55, 0.5, 0.7), location=(0, 0.35, -1.0), bevel=0.05)
    kit.solid("seat", seat, T["steel"], "steel")
    return dict(layout=LAYOUT, ortho=ORTHO, mode="flat", target=(0, 0, -0.3))


def engine_room_t1():
    """Glowing turbine cone — the dominant "propulsion" read."""
    _frame(T["hull_dark"])
    housing = kit.cylinder("housing", 0.62, 0.6, location=(-0.5, 0, -0.55),
                           rotation=(0, 1.5708, 0), verts=10)
    kit.solid("housing", housing, T["steel"], "steel")
    turbine = kit.cone("turbine", radius=0.58, depth=1.1, location=(-0.1, 0, -0.55),
                       rotation=(0, 1.5708, 0), radius2=0.16)
    kit.solid("turbine", turbine, T["cyan_bright"], "cyanbright", outline=0.015)
    for i, z in enumerate((-0.15, 0.55)):
        vent = kit.box("vent", (1.5, 0.04, 0.12), location=(0, -0.65, z))
        kit.solid("vent", vent, T["amber"], "amber", outline=0)
    return dict(layout=LAYOUT, ortho=ORTHO, mode="flat", target=(0, 0, -0.3))


def cargo_bay_t1():
    """Stacked crates — the dominant "storage" read."""
    _frame(T["surface_3"])
    for i, (sx, h) in enumerate(((-0.55, 0.7), (0.0, 0.95), (0.55, 0.6))):
        crate = kit.box("crate", (0.5, 0.5, h), location=(sx, 0, -1.0), bevel=0.03)
        kit.solid("crate", crate, T["rust"], "rust")
        band = kit.box("band", (0.5, 0.51, 0.07), location=(sx, 0, -1.0 + h * 0.55))
        kit.solid("band", band, T["hull_dark"], "hulldark", outline=0)
    return dict(layout=LAYOUT, ortho=ORTHO, mode="flat", target=(0, 0, -0.3))


def mining_room_t1():
    """Drill auger — reused for the booster and heat-shield slot kinds
    (no dedicated art for those yet, see SHIP_ROOM_ASSETS)."""
    _frame(T["hull_dark"])
    shaft = kit.cylinder("shaft", 0.3, 1.3, location=(-0.65, 0, -0.6),
                         rotation=(0, 1.5708, 0), verts=8)
    kit.solid("shaft", shaft, T["steel"], "steel")
    bit = kit.cone("bit", radius=0.42, depth=0.6, location=(0.65, 0, -0.6),
                  rotation=(0, 1.5708, 0), radius2=0.08)
    kit.solid("bit", bit, T["amber"], "amber", outline=0.012)
    for z in (-0.95, -0.25):
        thread = kit.cylinder("thread", 0.34, 0.06, location=(-0.3, 0, z),
                              rotation=(0, 1.5708, 0), verts=8)
        kit.solid("thread", thread, T["hull_dark"], "hulldark", outline=0)
    return dict(layout=LAYOUT, ortho=ORTHO, mode="flat", target=(0, 0, -0.3))


BUILDS = {
    "rooms/cockpit_t1": cockpit_t1,
    "rooms/engine_room_t1": engine_room_t1,
    "rooms/cargo_bay_t1": cargo_bay_t1,
    "rooms/mining_room_t1": mining_room_t1,
}
