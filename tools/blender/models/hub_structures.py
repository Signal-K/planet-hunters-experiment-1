"""Earth Base structure props.

These fill the six texture slots `hubScene.ts` already declares and currently
passes as null — `HubTextures.pad_base`, `pad_tower`, `pad_gantry`,
`depot_tank`, `scan_dish`, `cmd_building`. When a slot is null the scene falls
back to its inline `Graphics` version, so this is a straight upgrade path: the
layout, sizes and anchors are already fixed by the scene and are mirrored here.

Sizes below are the layout sizes `makeSprite` is called with. Do not change one
without the other — a mismatch shows up as a squashed sprite, not an error.
"""

import landnam_kit as kit

T = kit.TOKENS


def pad_base():
    """48x12 — the launchpad slab the tower stands on."""
    slab = kit.box("slab", (2.6, 1.5, 0.42), bevel=0.04)
    kit.solid("slab", slab, T["hull"], "hull")
    for sx in (-1.55, 1.55):
        foot = kit.box("foot", (0.7, 0.9, 0.26), location=(sx, 0, 0))
        kit.solid("foot", foot, T["hull_dark"], "hulldark")
    return dict(layout=(48, 12), ortho=3.6, mode="flat", target=(0, 0, 0.2))


def pad_tower():
    """8x80 — the service tower. Tall and narrow, so the ortho box is tall too."""
    mast = kit.box("mast", (0.42, 0.42, 4.4), bevel=0.03)
    kit.solid("mast", mast, T["hull"], "hull", outline=0.02)
    # Window strips, matching the six cyan bands the Graphics fallback draws.
    for i in range(6):
        z = 0.75 + i * 0.62
        strip = kit.box("strip", (0.18, 0.06, 0.26), location=(0, -0.21, z))
        kit.solid("strip", strip, T["cyan"], "cyan", outline=0)
    return dict(layout=(8, 80), ortho=4.7, mode="flat", target=(0, 0, 2.2))


def pad_gantry():
    """40x6 — the crossarm."""
    arm = kit.box("arm", (2.2, 0.34, 0.3), bevel=0.03)
    kit.solid("arm", arm, T["hull_dark"], "hulldark")
    for sx in (-0.95, 0.95):
        clamp = kit.box("clamp", (0.22, 0.42, 0.42), location=(sx, 0, 0.24))
        kit.solid("clamp", clamp, T["steel"], "steel")
    return dict(layout=(40, 6), ortho=2.9, mode="flat", target=(0, 0, 0.22))


def depot_tank():
    """56x44 — the refinery/depot vessel."""
    tank = kit.cylinder("tank", 0.95, 1.9, verts=10)
    kit.solid("tank", tank, T["steel"], "steel")
    band = kit.cylinder("band", 1.02, 0.2, location=(0, 0, 0.85), verts=10)
    kit.solid("band", band, T["hull_dark"], "hulldark", outline=0)
    cap = kit.cone("cap", 0.95, 0.5, location=(0, 0, 1.9), verts=10)
    kit.solid("cap", cap, T["hull"], "hull")
    for sx in (-1.15, 1.15):
        leg = kit.box("leg", (0.2, 0.2, 0.55), location=(sx, 0, 0))
        kit.solid("leg", leg, T["hull_dark"], "hulldark")
    pipe = kit.cylinder("pipe", 0.14, 1.3, location=(1.15, 0, 0.55),
                        rotation=(0, 1.5708, 0), verts=6)
    kit.solid("pipe", pipe, T["rust"], "rust")
    return dict(layout=(56, 44), ortho=3.1, mode="flat", target=(0, 0, 1.15))


def scan_dish():
    """46x30 — the scan station dish and its tripod."""
    for sx, sy in ((-0.55, 0.2), (0.55, 0.2), (0.0, -0.45)):
        leg = kit.box("leg", (0.14, 0.14, 0.85), location=(sx, sy, 0))
        kit.solid("leg", leg, T["hull_dark"], "hulldark")
    hub = kit.box("hub", (0.44, 0.44, 0.3), location=(0, 0, 0.85))
    kit.solid("hub", hub, T["hull"], "hull")
    # The dish. A cone alone renders as an octagonal blob at this size — the
    # parabola only reads once there is a darker rim ring behind a brighter
    # inner face, so it is built as two stacked discs plus a feed arm.
    rim = kit.cylinder("rim", 1.08, 0.1, location=(0, 0, 1.1), verts=10)
    rim.rotation_euler = (-0.85, 0, 0)
    kit.solid("rim", rim, T["hull_dark"], "hulldark", outline=0.01)
    face = kit.cone("face", 1.0, 0.34, location=(0, 0, 1.13), verts=10)
    face.rotation_euler = (-0.85 + 3.14159, 0, 0)  # opening toward the camera
    kit.solid("face", face, T["cyan_bright"], "cyanbright", outline=0)
    feed = kit.box("feed", (0.09, 0.09, 0.5), location=(0, -0.34, 1.28))
    feed.rotation_euler = (-0.85, 0, 0)
    kit.solid("feed", feed, T["steel"], "steel", outline=0.008)
    return dict(layout=(46, 30), ortho=2.9, mode="flat", target=(0, 0, 1.0))


def cmd_building():
    """56x56 — the command structure. Rendered at the larger of its two call
    sites (52x36 and 56x56) so the smaller one downsamples rather than blurs."""
    body = kit.box("body", (1.9, 1.5, 1.5), bevel=0.05)
    kit.solid("body", body, T["surface_3"], "surface3")
    roof = kit.box("roof", (2.1, 1.7, 0.22), location=(0, 0, 1.5))
    kit.solid("roof", roof, T["hull_dark"], "hulldark")
    for i in range(3):
        win = kit.box("win", (0.34, 0.06, 0.34), location=(-0.6 + i * 0.6, -0.76, 0.55))
        kit.solid("win", win, T["cyan"], "cyan", outline=0)
    mast = kit.box("mast", (0.12, 0.12, 1.0), location=(0.7, 0.4, 1.72))
    kit.solid("mast", mast, T["steel"], "steel", outline=0.01)
    beacon = kit.box("beacon", (0.2, 0.2, 0.2), location=(0.7, 0.4, 2.72))
    kit.solid("beacon", beacon, T["amber"], "amber", outline=0)
    return dict(layout=(56, 56), ortho=3.4, mode="flat", target=(0, 0, 1.3))


BUILDS = {
    "hub/pad_base": pad_base,
    "hub/pad_tower": pad_tower,
    "hub/pad_gantry": pad_gantry,
    "hub/depot_tank": depot_tank,
    "hub/scan_dish": scan_dish,
    "hub/cmd_building": cmd_building,
}
